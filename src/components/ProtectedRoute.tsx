import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

        const qPayments = query(
          collection(db, 'payments'),
          where('teacherId', '==', effectiveTeacherId),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(qPayments);
        const approved = snap.size > 0;
        if (!cancelled) setIsSubApproved(approved);
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
        return <Navigate to={`/teacher-dashboard?blocked=subscription#pricing`} replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;