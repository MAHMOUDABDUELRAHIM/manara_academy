import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TEACHER_FEATURES, getFeatureIdByPath } from '@/constants/teacherFeatures';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  loginPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, loginPath }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Initialize approval from localStorage synchronously to avoid one-render redirect race
  const initialApproved = (() => {
    try { return localStorage.getItem('isSubscriptionApproved') === 'true'; } catch { return false; }
  })();
  const isTeacherRouteInitial = location.pathname.startsWith('/teacher-dashboard');
  const [isSubApproved, setIsSubApproved] = React.useState<boolean>(initialApproved);
  const [subLoading, setSubLoading] = React.useState<boolean>(isTeacherRouteInitial && !initialApproved);
  // When subscription is approved, we load allowedSections (featureId -> [sectionId])
  const [allowedSections, setAllowedSections] = React.useState<Record<string, string[]> | null>(null);

  // Load trial duration from admin settings at top-level (hooks must not be conditional)
  const [trialMsFromSettings, setTrialMsFromSettings] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'trial'));
        if (snap.exists()) {
          const data: any = snap.data();
          const unit = data?.unit === 'minutes' ? 'minutes' : 'days';
          const value = typeof data?.value === 'number' && data.value > 0 ? data.value : 1;
          const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
          if (!cancelled) setTrialMsFromSettings(ms);
        } else {
          try {
            const cached = localStorage.getItem('trialSettings');
            if (cached) {
              const parsed = JSON.parse(cached);
              const unit = parsed?.unit === 'minutes' ? 'minutes' : 'days';
              const value = typeof parsed?.value === 'number' && parsed.value > 0 ? parsed.value : 1;
              const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
              if (!cancelled) setTrialMsFromSettings(ms);
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Trial settings load failed, defaulting to 24h', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);
  const trialMs = trialMsFromSettings ?? 24 * 60 * 60 * 1000; // default 24 hours

  // Top-level subscription approval check (must not be conditional)
  React.useEffect(() => {
    let cancelled = false;
    const checkSubscription = async () => {
      try {
        const isTeacherRouteLocal = location.pathname.startsWith('/teacher-dashboard');
        const isVerifyRouteLocal = location.pathname.startsWith('/verify-teacher-email');
        if (!(user?.role === 'teacher') || !isTeacherRouteLocal || isVerifyRouteLocal) {
          if (!cancelled) {
            setIsSubApproved(false);
            setSubLoading(false);
          }
          return;
        }

        // Local fallback first: honor approval flag from dashboard listener to avoid race conditions
        try {
          const fromLocal = localStorage.getItem('isSubscriptionApproved') === 'true';
          if (fromLocal && !cancelled) {
            setIsSubApproved(true);
            setSubLoading(false);
            return;
          } else {
            setSubLoading(true);
          }
        } catch {
          setSubLoading(true);
        }
        let effectiveTeacherId = user.uid;
        try {
          const tSnap = await getDoc(doc(db, 'teachers', user.uid));
          const data: any = tSnap.exists() ? tSnap.data() : null;
          const proxyOf = typeof data?.proxyOf === 'string' && data.proxyOf.length > 0 ? data.proxyOf : null;
          effectiveTeacherId = proxyOf || user.uid;
        } catch {}

        // Primary: check payments linked to effectiveTeacherId (supports proxyOf)
        const qPayments = query(
          collection(db, 'payments'),
          where('teacherId', '==', effectiveTeacherId),
          where('status', '==', 'approved')
        );
        let snap = await getDocs(qPayments);
        // Fallback: if none found, also check by the current user's uid to support
        // historic payments created before proxyOf alignment.
        if (snap.size === 0 && user?.uid && user.uid !== effectiveTeacherId) {
          const qByUser = query(
            collection(db, 'payments'),
            where('teacherId', '==', user.uid),
            where('status', '==', 'approved')
          );
          const snapUser = await getDocs(qByUser);
          if (snapUser.size > 0) snap = snapUser;
        }
        const approved = snap.size > 0;
        // Determine expiry of the latest approved payment (if any)
        let validApproved = approved;
        let latestData: any = null;
        if (approved) {
          const docs = snap.docs.map(d => ({ id: d.id, data: d.data() as any }));
          docs.sort((a, b) => {
            const aApproved = a.data.approvedAt?.seconds || 0;
            const bApproved = b.data.approvedAt?.seconds || 0;
            const aCreated = a.data.createdAt?.seconds || 0;
            const bCreated = b.data.createdAt?.seconds || 0;
            if (aApproved !== bApproved) return bApproved - aApproved;
            return bCreated - aCreated;
          });
          latestData = docs[0]?.data;
          const expiresAt = latestData?.expiresAt?.toDate?.() || latestData?.expiresAt || null;
          if (expiresAt instanceof Date) {
            validApproved = Date.now() < expiresAt.getTime();
          }
        }
        // If not approved (or expired), also consider active pending subscription
        let validPending = false;
        if (!validApproved) {
          try {
            const qPending = query(
              collection(db, 'payments'),
              where('teacherId', '==', effectiveTeacherId),
              where('status', '==', 'pending')
            );
            let pendingSnap = await getDocs(qPending);
            if (pendingSnap.size === 0 && user?.uid && user.uid !== effectiveTeacherId) {
              const qPendingByUser = query(
                collection(db, 'payments'),
                where('teacherId', '==', user.uid),
                where('status', '==', 'pending')
              );
              const snapPUser = await getDocs(qPendingByUser);
              if (snapPUser.size > 0) pendingSnap = snapPUser;
            }
            if (pendingSnap.size > 0) {
              // Use latest pending by createdAt
              const docs = pendingSnap.docs.map(d => ({ id: d.id, data: d.data() as any }));
              docs.sort((a, b) => ((b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0)));
              const pData = docs[0]?.data || null;
              const created = pData?.createdAt?.toDate?.() || pData?.createdAt || null;
              const rawPeriod: string = (pData?.period || '').toString().toLowerCase();
              let periodDays = 30;
              const isYear = (
                rawPeriod.includes('year') || rawPeriod.includes('annual') || rawPeriod.includes('سنوي') || rawPeriod.includes('سنة')
              );
              const isHalfYear = (
                rawPeriod.includes('half') || rawPeriod.includes('semi') || rawPeriod.includes('semiannual') || rawPeriod.includes('semi-annual') ||
                rawPeriod.includes('نصف') || rawPeriod.includes('نصف سنوي') || rawPeriod.includes('ستة أشهر') || rawPeriod.includes('6 اشهر') || rawPeriod.includes('6 أشهر')
              );
              const isMonth = (
                rawPeriod.includes('month') || rawPeriod.includes('monthly') || rawPeriod.includes('شهري') || rawPeriod.includes('شهر')
              );
              if (isYear) periodDays = 365; else if (isHalfYear) periodDays = 180; else if (isMonth) periodDays = 30;
              if (created instanceof Date) {
                const expires = created.getTime() + periodDays * 24 * 60 * 60 * 1000;
                validPending = Date.now() < expires;
              }
            }
          } catch {}
        }

        const hasActiveSub = !!validApproved;
        if (!cancelled) setIsSubApproved(hasActiveSub);
        try { localStorage.setItem('hasActiveSubscription', hasActiveSub ? 'true' : 'false'); } catch {}

        // If approved, resolve plan's allowedSections to enforce feature/section-level access
        if (validApproved) {
          try {
            // Use the latestData resolved above
            const latest = latestData;
            let planDoc: any = null;
            if (latest?.planId) {
              const pSnap = await getDoc(doc(db, 'pricingPlans', latest.planId));
              planDoc = pSnap.exists() ? pSnap.data() : null;
            }
            if (!planDoc && latest?.planName) {
              const qByName = query(collection(db, 'pricingPlans'), where('name', '==', latest.planName));
              const s2 = await getDocs(qByName);
              planDoc = s2.docs[0]?.data() || null;
            }
            const sectionsObj: any = planDoc?.allowedSections || {};
            const normalized: Record<string, string[]> = {};
            if (sectionsObj && typeof sectionsObj === 'object') {
              Object.keys(sectionsObj).forEach((k) => {
                const arr = sectionsObj[k];
                if (Array.isArray(arr)) {
                  normalized[k] = arr.filter((x: any) => typeof x === 'string');
                }
              });
            }
            if (!cancelled) setAllowedSections(normalized);
            try { localStorage.setItem('allowedSections', JSON.stringify(normalized)); } catch {}
          } catch {
            if (!cancelled) setAllowedSections({});
            try { localStorage.setItem('allowedSections', JSON.stringify({})); } catch {}
          }
        } else {
          if (!cancelled) setAllowedSections(null);
          try { localStorage.removeItem('allowedSections'); } catch {}
        }
      } catch (e) {
        if (!cancelled) setIsSubApproved(false);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    };
    checkSubscription();
    return () => { cancelled = true; };
  }, [user?.uid, user?.role, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    const targetLogin = loginPath || '/login';
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${targetLogin}?redirect=${redirectParam}`} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Honor pending role hint ONLY for teacher dashboard pages to avoid student bypass
    let pendingRole: string | null = null;
    try { pendingRole = localStorage.getItem('pendingRole'); } catch {}
    const isTeacherRoute = location.pathname.startsWith('/teacher-dashboard');
    if (pendingRole === 'teacher' && requiredRole === 'teacher' && isTeacherRoute) {
      return <>{children}</>;
    }
    const redirectPath = user.role === 'teacher' ? '/teacher-dashboard' :
                        user.role === 'admin' ? '/admin-dashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Additional teacher guard: require verified email before accessing teacher dashboard routes
  const isTeacherRoute = location.pathname.startsWith('/teacher-dashboard');
  const isVerifyRoute = location.pathname.startsWith('/verify-teacher-email');
  if (user.role === 'teacher' && isTeacherRoute && !isVerifyRoute) {
    const emailVerified = !!(auth.currentUser?.emailVerified) || !!user.profile?.emailVerified;
    if (!emailVerified) {
      return <Navigate to="/verify-teacher-email" replace />;
    }

    // Trial restriction: block access to specific teacher pages after configured trial duration
    const createdRaw: any = user.profile?.createdAt as any;
    if (createdRaw) {
      const createdMs = typeof createdRaw === 'string'
        ? new Date(createdRaw).getTime()
        : (createdRaw?.seconds ? createdRaw.seconds * 1000 : (createdRaw instanceof Date ? createdRaw.getTime() : NaN));
      const expired = Date.now() - createdMs >= trialMs;
      // Sync trial status for UI (e.g., sidebar lock state)
      try {
        localStorage.setItem('trialExpired', expired ? 'true' : 'false');
        localStorage.setItem('trialActive', (!expired) ? 'true' : 'false');
      } catch {}
      // Only block by trial if no approved subscription
      if (expired && !isSubApproved) {
        const restrictedPaths = [
          '/teacher-dashboard/courses',
          '/teacher-dashboard/create-course',
          '/teacher-dashboard/invite-students',
          '/teacher-dashboard/payouts',
          '/teacher-dashboard/assessments',
        ];
        const tryingRestricted = restrictedPaths.some((p) => location.pathname.startsWith(p));
        if (tryingRestricted) {
          // Redirect to teacher dashboard and focus pricing section
          return <Navigate to={`/teacher-dashboard?blocked=trial#pricing`} replace />;
        }
      }
    }

    // If not approved subscription, block restricted teacher pages
    const subscriptionRestrictedPaths = [
      '/teacher-dashboard/courses',
      '/teacher-dashboard/create-course',
      '/teacher-dashboard/invite-students',
      '/teacher-dashboard/payouts',
      '/teacher-dashboard/assessments',
    ];
  const tryingSubRestricted = subscriptionRestrictedPaths.some((p) => location.pathname.startsWith(p));
  if (tryingSubRestricted) {
    if (subLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
          </div>
        );
      }
      // During active trial, allow access even if not approved
      let trialActive = false;
      try { trialActive = localStorage.getItem('trialActive') === 'true'; } catch {}
      if (!isSubApproved && !trialActive) {
        let allowDueToStorageWarning = false;
        try {
          const storageWarn = localStorage.getItem('storageWarningOnly') === 'true';
          const hadApproved = localStorage.getItem('hadApprovedSubscription') === 'true';
          allowDueToStorageWarning = !!storageWarn && !!hadApproved;
        } catch {}
        if (!allowDueToStorageWarning) {
          return <Navigate to={`/teacher-dashboard?blocked=subscription#pricing`} replace />;
        }
      }

      // Treat approved subscription like active trial: allow all teacher pages
      // without enforcing per-plan section configuration.
      // Deactivation is governed by payment expiry handled above.
      if (isSubApproved && !trialActive) {
        // No extra gating; proceed to render children
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;