import { useState, useEffect, useRef } from "react";
import { db } from '@/firebase/config';
import { doc, getDoc, getDocs, collection, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, Settings, Crown, ChevronDown, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { TeacherService } from "@/services/teacherService";
import { StorageService } from "@/services/storageService";

interface DashboardHeaderProps {
  studentName?: string;
  profileImage?: string;
  notificationCount?: number;
  notifications?: { id: string; title: string; message: string; time: string; type: string; linkUrl?: string; linkText?: string; isRead?: boolean }[];
  onNotificationsOpen?: () => void;
  newNotificationPreview?: { title: string; message: string; type?: string } | null;
  onPreviewClear?: () => void;
  fixed?: boolean;
  defaultOpenNotifications?: boolean;
}

export const DashboardHeader = ({ 
  studentName = "أحمد محمد", 
  profileImage,
  notificationCount = 0,
  notifications = [],
  onNotificationsOpen,
  newNotificationPreview,
  onPreviewClear,
  fixed = false,
  defaultOpenNotifications = false
}: DashboardHeaderProps) => {
  const { language, t, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  // Ticking clock for live countdowns
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, []);
  useEffect(() => {
    try {
      if (defaultOpenNotifications) {
        setShowNotifications(true);
        if (onNotificationsOpen) onNotificationsOpen();
      }
    } catch {}
  }, [defaultOpenNotifications]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPreviewKeyRef = useRef<string | null>(null);
  const BROADCAST_TEACHERS = '__ALL_TEACHERS__';
  const [headerNotifications, setHeaderNotifications] = useState<{ id: string; title: string; message: string; time: string; type: string; linkText?: string; linkUrl?: string }[]>([]);
  const [headerNotificationCount, setHeaderNotificationCount] = useState<number>(0);
  const [newNotificationPreviewInternal, setNewNotificationPreviewInternal] = useState<{ title: string; message: string; type?: string } | null>(null);
  const initialLoadedRef = useRef<boolean>(false);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const syntheticNotifsRef = useRef<{ id: string; title: string; message: string; time: string; type: string; linkText?: string; linkUrl?: string }[]>([]);
  const isNotifRead = (uidVal: string, idVal: string) => {
    try { return localStorage.getItem(`notifRead:${uidVal}:${idVal}`) === 'true'; } catch { return false; }
  };
  const markNotifRead = (uidVal: string, idVal: string) => {
    try { localStorage.setItem(`notifRead:${uidVal}:${idVal}`, 'true'); } catch {}
  };
  const ensureAudioCtx = async () => {
    if (!audioCtxRef.current) {
      const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext || W.webkitAudioContext;
      audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };
  const playNotificationChime = async () => {
    const ctx = await ensureAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    gain.connect(ctx.destination);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(880, now);
    o1.connect(gain);
    o1.start(now);
    o1.stop(now + 0.35);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(1320, now + 0.18);
    o2.connect(gain);
    o2.start(now + 0.18);
    o2.stop(now + 0.6);
  };
  useEffect(() => {
    const src = newNotificationPreviewInternal;
    const key = src ? `${src.title}\n${src.message}\n${src.type || ''}` : '';
    const shouldPlay = !!src && !showNotifications && key && key !== lastPreviewKeyRef.current;
    if (shouldPlay) {
      lastPreviewKeyRef.current = key;
      playNotificationChime();
    }
  }, [newNotificationPreviewInternal, showNotifications]);
  const formatNotifTime = (iso?: string) => {
    try {
      const d = iso ? new Date(iso) : new Date();
      const now = new Date();
      const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
      const timeStr = d.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' });
      if (same) {
        return language === 'ar' ? `اليوم ${timeStr}` : `today ${timeStr}`;
      }
      if (isTomorrow) {
        return language === 'ar' ? `غداً ${timeStr}` : `tomorrow ${timeStr}`;
      }
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso || '';
    }
  };
  // Subscription approval + storage usage state (teacher)
  const [approvedPlanName, setApprovedPlanName] = useState<string | null>(null);
  const [approvedStorageGB, setApprovedStorageGB] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem('approvedStorageGB');
      const val = raw ? Number(raw) : null;
      return typeof val === 'number' && !isNaN(val) ? val : null;
    } catch {
      return null;
    }
  });
  const [extraStorageGB, setExtraStorageGB] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('extraStorageGB');
      const val = raw ? Number(raw) : 0;
      return isNaN(val) ? 0 : val;
    } catch {
      return 0;
    }
  });
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('lastStorageUsedBytes');
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(() => {
    try { return localStorage.getItem('hasActiveSubscription') === 'true'; } catch { return false; }
  });
  const [hadApprovedSubscription, setHadApprovedSubscription] = useState<boolean>(false);
  const [hasApprovedActiveSubscription, setHasApprovedActiveSubscription] = useState<boolean>(() => {
    try { return localStorage.getItem('hasApprovedActiveSubscription') === 'true'; } catch { return false; }
  });

  // Trial period logic for teachers: 24h countdown based on account creation
  const createdRaw: any = user?.profile?.createdAt as any;
  const createdMs = createdRaw
    ? (typeof createdRaw === 'string'
        ? new Date(createdRaw).getTime()
        : (createdRaw?.seconds ? createdRaw.seconds * 1000 : (createdRaw instanceof Date ? createdRaw.getTime() : NaN)))
    : 0;
  // Load admin-configured trial (days/minutes)
  const [trialCfg, setTrialCfg] = useState<{ unit: 'days' | 'minutes'; ms: number } | null>(null);
  
  // Fetch trial settings once
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'trial'));
        if (snap.exists()) {
          const data: any = snap.data();
          const unit = data?.unit === 'minutes' ? 'minutes' : 'days';
          const value = typeof data?.value === 'number' && data.value > 0 ? data.value : 1;
          const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
          if (!cancelled) setTrialCfg({ unit, ms });
        } else {
          try {
            const cached = localStorage.getItem('trialSettings');
            if (cached) {
              const parsed = JSON.parse(cached);
              const unit = parsed?.unit === 'minutes' ? 'minutes' : 'days';
              const value = typeof parsed?.value === 'number' && parsed.value > 0 ? parsed.value : 1;
              const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
              if (!cancelled) setTrialCfg({ unit, ms });
            }
          } catch {}
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    initialLoadedRef.current = false;
    const uid = user?.uid;
    if (!(user?.role === 'teacher') || !uid) {
      setHeaderNotifications([]);
      setHeaderNotificationCount(0);
      setNewNotificationPreviewInternal(null);
      return;
    }
    let personalDocs: any[] = [];
    let broadcastDocs: any[] = [];
    const qPersonal = query(collection(db, 'notifications'), where('userId', '==', uid));
    const qBroadcast = query(collection(db, 'notifications'), where('userId', '==', BROADCAST_TEACHERS));
    const updateCombined = () => {
      try {
        const listAll = [...personalDocs, ...broadcastDocs];
        const nowMs = Date.now();
        const visible = listAll.map((d: any) => {
          const data: any = d.data ? d.data() : d;
          const createdIso = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
          const ex = data.expiresAt;
          const exMs = ex?.toDate?.()?.getTime?.() || (typeof ex === 'string' ? new Date(ex).getTime() : undefined);
          const built = {
            id: String(d.id || data.id || ''),
            title: String(data.title || ''),
            message: String(data.message || ''),
            time: String(createdIso),
            type: (data.type as any) || 'info',
            _expiresMs: typeof exMs === 'number' ? exMs : undefined,
            linkText: data.linkText,
            linkUrl: data.linkUrl,
          } as any;
          (built as any).isRead = isNotifRead(user?.uid || 'anonymous', (built as any).id);
          return built;
        }).filter((n: any) => !n._expiresMs || nowMs < n._expiresMs);
        const synthetic = (syntheticNotifsRef.current || []).map((n) => ({
          ...n,
          isRead: isNotifRead(user?.uid || 'anonymous', n.id),
        }));
        const combined = [...synthetic, ...visible];
        const dedupMap = new Map<string, any>();
        for (const it of combined) {
          if (!dedupMap.has(it.id)) dedupMap.set(it.id, it);
        }
        const finalList = Array.from(dedupMap.values());
        setHeaderNotifications(finalList as any);
        setHeaderNotificationCount(finalList.filter((n: any) => !(n as any).isRead).length);
        const prev = prevNotifIdsRef.current;
        const currentIds = new Set((finalList as any).map((n: any) => n.id));
        if (initialLoadedRef.current) {
          for (const n of visible as any) {
            if (!prev.has(n.id)) {
              setNewNotificationPreviewInternal({ title: n.title, message: n.message, type: n.type });
              break;
            }
          }
        } else {
          initialLoadedRef.current = true;
        }
        prevNotifIdsRef.current = currentIds;
      } catch {}
    };
    const unsubPersonal = onSnapshot(qPersonal, (snap) => { personalDocs = snap.docs; updateCombined(); });
    const unsubBroadcast = onSnapshot(qBroadcast, (snap) => { broadcastDocs = snap.docs; updateCombined(); });
    return () => { try { unsubPersonal(); } catch {}; try { unsubBroadcast(); } catch {}; };
  }, [user?.uid, user?.role]);

  // When teacher: observe payments and compute active subscription (approved or pending), storage usage if available
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const run = async () => {
      try {
        if (user?.role !== 'teacher' || !user?.uid) return;
        const teacherId = await TeacherService.getTeacherByUid(user.uid).then((t: any) => t?.id || t?.teacherId || user.uid).catch(() => user.uid);
        const q = query(collection(db, 'payments'), where('teacherId', '==', teacherId));
        unsub = onSnapshot(q, async (snap) => {
          const payments = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          const basePayments = payments.filter(p => p?.type !== 'storage_addon');
          const approvedList = basePayments
            .filter(p => p?.status === 'approved')
            .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)));
          const approvedP = approvedList[0];
          try {
            const had = approvedList.length > 0;
            const cancelledList = basePayments.filter(p => p?.status === 'rejected' && (p?.cancelledAt?.toDate?.() || p?.cancelledAt));
            const hadCancelled = cancelledList.length > 0;
            const hadAny = had || hadCancelled;
            setHadApprovedSubscription(hadAny);
            try { localStorage.setItem('hadApprovedSubscription', hadAny ? 'true' : 'false'); } catch {}
          } catch {}
          const expApproved = approvedP?.expiresAt?.toDate?.() || approvedP?.expiresAt || null;
          const validApproved = expApproved instanceof Date ? (Date.now() < expApproved.getTime()) : !!approvedP;

          // Latest pending considered active within its period
          const pendingList = basePayments
            .filter(p => p?.status === 'pending')
            .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)));
          const pendingP = pendingList[0];
          let validPending = false;
          let pendingExpiresAt: Date | null = null;
          if (pendingP) {
            const created = pendingP?.createdAt?.toDate?.() || pendingP?.createdAt || null;
            const rawPeriod: string = (pendingP?.period || '').toString().toLowerCase();
            let expiresMsFromCreated: number | null = null;
            const isYear = (
              rawPeriod.includes('year') || rawPeriod.includes('annual') || rawPeriod.includes('سنوي') || rawPeriod.includes('سنة') || rawPeriod.includes('سنوية') || rawPeriod.includes('ثانوية')
            );
            const isHalfYear = (
              rawPeriod.includes('half') || rawPeriod.includes('semi') || rawPeriod.includes('semiannual') || rawPeriod.includes('semi-annual') ||
              rawPeriod.includes('نصف') || rawPeriod.includes('نصف سنوي') || rawPeriod.includes('نصف سنوية') || rawPeriod.includes('نصف ثانوية') || rawPeriod.includes('ستة أشهر') || rawPeriod.includes('6 اشهر') || rawPeriod.includes('6 أشهر')
            );
            const isMonth = (
              rawPeriod.includes('month') || rawPeriod.includes('monthly') || rawPeriod.includes('شهري') || rawPeriod.includes('شهر')
            );
            const isFiveMin = (
              rawPeriod.includes('5') && (rawPeriod.includes('minute') || rawPeriod.includes('minutes') || rawPeriod.includes('دقيقة') || rawPeriod.includes('دقائق'))
            );
            if (created instanceof Date) {
              if (isFiveMin) {
                expiresMsFromCreated = created.getTime() + 5 * 60 * 1000;
              } else if (isYear) {
                expiresMsFromCreated = created.getTime() + 365 * 24 * 60 * 60 * 1000;
              } else if (isHalfYear) {
                expiresMsFromCreated = created.getTime() + 180 * 24 * 60 * 60 * 1000;
              } else if (isMonth) {
                expiresMsFromCreated = created.getTime() + 30 * 24 * 60 * 60 * 1000;
              }
            }
            if (typeof expiresMsFromCreated === 'number') {
              pendingExpiresAt = new Date(expiresMsFromCreated);
              validPending = Date.now() < expiresMsFromCreated;
            }
          }

          const hasActive = !!validApproved || !!validPending;
          setHasActiveSubscription(hasActive);
          try { localStorage.setItem('hasActiveSubscription', hasActive ? 'true' : 'false'); } catch {}
          setHasApprovedActiveSubscription(!!validApproved);
          try { localStorage.setItem('hasApprovedActiveSubscription', validApproved ? 'true' : 'false'); } catch {}

          try {
            const latestApproved = approvedP;
            if (latestApproved && latestApproved.id) {
              const mk = `paymentNotified:${teacherId}:${latestApproved.id}:approved`;
              const done = localStorage.getItem(mk) === 'true';
              if (!done) {
                const title = language === 'ar' ? 'تمت الموافقة على اشتراكك' : 'Your subscription was approved';
                const message = language === 'ar'
                  ? 'تهانينا! تم تفعيل باقتك بنجاح، ويمكنك الآن استخدام جميع مزايا المنصة بدون قيود. لمزيد من التفاصيل حول الباقات وتجديد الاشتراك، انتقل إلى قسم الباقات في لوحة التحكم.'
                  : 'Congratulations! Your plan is now active and you can use all platform features without limits. For more details and renewal info, visit the Pricing section in your dashboard.';
                const n = {
                  id: `${latestApproved.id}:approved`,
                  title,
                  message,
                  time: new Date().toISOString(),
                  type: 'success',
                  actionsDisabled: true,
                } as any;
                syntheticNotifsRef.current = [n, ...syntheticNotifsRef.current.filter((x) => x.id !== n.id)];
                setHeaderNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
                setHeaderNotificationCount((c) => c + 1);
                setNewNotificationPreviewInternal({ title, message, type: 'success' });
                try { localStorage.setItem(mk, 'true'); } catch {}
              }
            }
            const rejectedList = basePayments
              .filter(p => p?.status === 'rejected')
              .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)));
            const latestRejected = rejectedList[0];
            if (latestRejected && latestRejected.id) {
              const mk = `paymentNotified:${teacherId}:${latestRejected.id}:rejected`;
              const done = localStorage.getItem(mk) === 'true';
              if (!done) {
                const title = language === 'ar' ? 'تم رفض طلب الاشتراك' : 'Subscription request rejected';
                const message = language === 'ar'
                  ? 'نعتذر، تم رفض طلب الاشتراك. يرجى مراجعة صورة إيصال الدفع ورقم المحفظة والتأكد من وضوح البيانات ثم إعادة إرسال الطلب من جديد. لمساعدتك، يمكنك فتح قسم الباقات من لوحة التحكم ومتابعة الإرشادات.'
                  : 'Sorry, your subscription request was rejected. Please review the payment screenshot and wallet number, make sure details are clear, and resubmit your request. For guidance, check the Pricing section in your dashboard.';
                const n = {
                  id: `${latestRejected.id}:rejected`,
                  title,
                  message,
                  time: new Date().toISOString(),
                  type: 'warning',
                  actionsDisabled: true,
                } as any;
                syntheticNotifsRef.current = [n, ...syntheticNotifsRef.current.filter((x) => x.id !== n.id)];
                setHeaderNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
                setHeaderNotificationCount((c) => c + 1);
                setNewNotificationPreviewInternal({ title, message, type: 'warning' });
                try { localStorage.setItem(mk, 'true'); } catch {}
              }
            }
          } catch {}

          // If subscription expired naturally (no pending and not valid approved), reset add-on storage once
          try {
            const expiredNaturally = !validApproved && !validPending && (expApproved instanceof Date) && (Date.now() >= expApproved.getTime());
            if (expiredNaturally) {
              const markerKey = `extraResetOnExpiry:${teacherId}:${expApproved.getTime()}`;
              const already = localStorage.getItem(markerKey) === 'done';
              if (!already) {
                await updateDoc(doc(db, 'teachers', teacherId), {
                  extraStorageGB: 0,
                  updatedAt: new Date().toISOString(),
                });
                try { localStorage.setItem(markerKey, 'done'); } catch {}
                try { localStorage.setItem('extraStorageGB', '0'); } catch {}
              }
            }
          } catch {}

          // Resolve plan name and expiry for countdown
          const activePayment = validApproved ? approvedP : (validPending ? pendingP : null);
          if (activePayment) {
            const planId: string | undefined = activePayment?.planId;
            const planName: string | undefined = activePayment?.planName;
            setApprovedPlanName(planName || null);
            // Determine plan period from plan document's `period` string (supports Arabic & English), with 5-min test option
            let planPeriodMs: number | null = null;
            try {
              let planDocData: any = null;
              if (planId) {
                const psnap = await getDoc(doc(db, 'pricingPlans', planId));
                planDocData = psnap.exists() ? psnap.data() : null;
              }
              if (!planDocData && planName) {
                const qByName = query(collection(db, 'pricingPlans'), where('name', '==', planName));
                const snaps = await getDocs(qByName);
                if (!snaps.empty) {
                  planDocData = snaps.docs[0].data();
                }
              }
              const periodStr = (planDocData?.period || '').toString().toLowerCase();
              const isYear = periodStr.includes('year') || periodStr.includes('annual') || periodStr.includes('سنوي') || periodStr.includes('سنة') || periodStr.includes('سنوية') || periodStr.includes('ثانوية');
              const isHalfYear = periodStr.includes('half') || periodStr.includes('semi') || periodStr.includes('semiannual') || periodStr.includes('semi-annual') || periodStr.includes('نصف') || periodStr.includes('نصف سنوي') || periodStr.includes('نصف سنوية') || periodStr.includes('نصف ثانوية');
              const isMonth = periodStr.includes('month') || periodStr.includes('monthly') || periodStr.includes('شهري') || periodStr.includes('شهر');
              const isFiveMin = (periodStr.includes('5') && (periodStr.includes('minute') || periodStr.includes('minutes') || periodStr.includes('دقيقة') || periodStr.includes('دقائق')));
              if (isFiveMin) {
                planPeriodMs = 5 * 60 * 1000;
              } else if (isYear) {
                planPeriodMs = 365 * 24 * 60 * 60 * 1000;
              } else if (isHalfYear) {
                planPeriodMs = 180 * 24 * 60 * 60 * 1000;
              } else if (isMonth) {
                planPeriodMs = 30 * 24 * 60 * 60 * 1000;
              }
              const sgb = (typeof approvedP?.planStorageGB === 'number' ? approvedP.planStorageGB : (typeof planDocData?.storageGB === 'number' ? planDocData.storageGB : undefined));
              if (typeof sgb === 'number') {
                setApprovedStorageGB(sgb);
                try { localStorage.setItem('approvedStorageGB', String(sgb)); } catch {}
              }
            } catch {
              planPeriodMs = null;
            }
            // Compute expiry: prefer payment.expiresAt if set; otherwise derive from start time + planPeriodMs
            let expComputed: Date | null = null;
            const expFromPayment = validApproved ? (expApproved instanceof Date ? expApproved : null) : null;
            if (expFromPayment instanceof Date) {
              expComputed = expFromPayment;
            } else if (validPending && pendingExpiresAt instanceof Date) {
              expComputed = pendingExpiresAt;
            } else if (planPeriodMs && planPeriodMs > 0) {
              const startDate = validApproved
                ? (approvedP?.approvedAt?.toDate?.() || approvedP?.approvedAt || approvedP?.createdAt?.toDate?.() || approvedP?.createdAt || null)
                : (pendingP?.createdAt?.toDate?.() || pendingP?.createdAt || null);
              if (startDate instanceof Date) {
                expComputed = new Date(startDate.getTime() + planPeriodMs);
              }
            }
            if (expComputed instanceof Date) {
              try { localStorage.setItem('subscriptionExpiresAt', expComputed.toISOString()); } catch {}
            } else {
              try { localStorage.removeItem('subscriptionExpiresAt'); } catch {}
            }
            // storageGB is already set above based on planDocData or cleared if not available
            try {
              const startMsImmediate = (() => {
                try {
                  if (validApproved && approvedP) {
                    const d = approvedP?.approvedAt?.toDate?.() || approvedP?.approvedAt || approvedP?.createdAt?.toDate?.() || approvedP?.createdAt || null;
                    return d instanceof Date ? d.getTime() : 0;
                  }
                  return 0;
                } catch { return 0; }
              })();
              const prevStartRawImmediate = localStorage.getItem('lastResetStartMs') || '';
              const prevStartMsImmediate = prevStartRawImmediate ? Number(prevStartRawImmediate) : 0;
              if (startMsImmediate > 0 && startMsImmediate !== prevStartMsImmediate) {
                localStorage.setItem('lastStorageUsedBytes', '0');
                localStorage.setItem('usageResetAt', new Date(startMsImmediate).toISOString());
                localStorage.setItem('lastResetStartMs', String(startMsImmediate));
                try {
                  await updateDoc(doc(db, 'teachers', teacherId), {
                    usageResetAt: new Date(startMsImmediate).toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                } catch {}
              }
            } catch {}
            try {
              const used = await StorageService.getTeacherStorageUsageBytes(teacherId);
              let offset = 0;
              let s3Local = 0;
              try {
                const raw = localStorage.getItem('teacherUploadOffsetBytes');
                offset = raw ? Number(raw) : 0;
              } catch {}
              try {
                const rawS3 = localStorage.getItem('teacherS3UsageBytes');
                s3Local = rawS3 ? Number(rawS3) : 0;
              } catch {}
              const s3PersistRaw = (teacher as any)?.s3UsageBytes;
              const s3Persist = typeof s3PersistRaw === 'number' ? s3PersistRaw : 0;
              const s3Add = s3Persist > 0 ? s3Persist : (isNaN(s3Local) ? 0 : s3Local);
              const extra = (isNaN(offset) ? 0 : offset) + s3Add;
              const baseRaw = localStorage.getItem('usageBaselineBytes');
              const base = baseRaw ? Number(baseRaw) : 0;
              const total = used + extra;
              try {
                const startMs = (() => {
                  try {
                    if (validApproved && approvedP) {
                      const d = approvedP?.approvedAt?.toDate?.() || approvedP?.approvedAt || approvedP?.createdAt?.toDate?.() || approvedP?.createdAt || null;
                      return d instanceof Date ? d.getTime() : 0;
                    }
                    return 0;
                  } catch { return 0; }
                })();
                const lastStartRaw = localStorage.getItem('lastResetStartMs') || '';
                const lastStartMs = lastStartRaw ? Number(lastStartRaw) : 0;
                if (startMs > 0 && startMs !== lastStartMs) {
                  localStorage.setItem('usageBaselineBytes', String(total));
                  localStorage.setItem('lastStorageUsedBytes', '0');
                  localStorage.setItem('usageResetAt', new Date(startMs).toISOString());
                  localStorage.setItem('lastResetStartMs', String(startMs));
                  try {
                    await updateDoc(doc(db, 'teachers', teacherId), {
                      usageBaselineBytes: total,
                      usageResetAt: new Date(startMs).toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  } catch {}
                }
              } catch {}
              const sinceReset = Math.max(0, total - (isNaN(base) ? 0 : base));
              const prevLocal = (() => { try { const raw = localStorage.getItem('lastStorageUsedBytes'); return raw ? Number(raw) : 0; } catch { return 0; } })();
              const nextUsed = Math.max(prevLocal, sinceReset);
              if (!cancelled) {
                setStorageUsedBytes(nextUsed);
                try { localStorage.setItem('lastStorageUsedBytes', String(nextUsed)); } catch {}
              }
            } catch {
              if (!cancelled) {
                let last = 0;
                try { const raw = localStorage.getItem('lastStorageUsedBytes'); last = raw ? Number(raw) : 0; } catch {}
                setStorageUsedBytes(last);
              }
            }
          } else {
            setApprovedPlanName(null);
            setApprovedStorageGB(null);
            try { localStorage.removeItem('subscriptionExpiresAt'); } catch {}
          }
        });
      } catch {}
    };
    run();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user?.role, user?.uid]);

  // Observe teacher document to get extraStorageGB
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const run = async () => {
      try {
        if (user?.role !== 'teacher' || !user?.uid) return;
        const teacher = await TeacherService.getTeacherByUid(user.uid).catch(() => null);
        const teacherId = (teacher as any)?.id || user.uid;
        unsub = onSnapshot(doc(db, 'teachers', teacherId), (snap) => {
          const data = snap.data() as any;
          const extra = typeof data?.extraStorageGB === 'number' ? data.extraStorageGB : 0;
          const baseline = typeof data?.usageBaselineBytes === 'number' ? data.usageBaselineBytes : 0;
          const resetAt = (data?.usageResetAt || '') as string;
          if (!cancelled) {
            setExtraStorageGB(extra);
            try { localStorage.setItem('extraStorageGB', String(extra)); } catch {}
            try { localStorage.setItem('usageBaselineBytes', String(baseline)); } catch {}
            try {
              const prevReset = localStorage.getItem('usageResetAt') || '';
              const prevExtraRaw = localStorage.getItem('lastExtraStorageGB') || '';
              const prevExtra = prevExtraRaw ? Number(prevExtraRaw) : 0;
              if (resetAt && resetAt !== prevReset) {
                localStorage.setItem('usageResetAt', resetAt);
                // لا نقوم بتصفير الاستخدام إلا إذا تمت زيادة ال add-on فعليًا
                if (extra > prevExtra) {
                  localStorage.setItem('teacherUploadOffsetBytes', '0');
                  localStorage.setItem('teacherS3UsageBytes', '0');
                  localStorage.setItem('lastStorageUsedBytes', '0');
                }
              }
              localStorage.setItem('lastExtraStorageGB', String(extra));
            } catch {}
          }
        });
      } catch {}
    };
    run();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [user?.role, user?.uid]);

  useEffect(() => {
    const onUpdate = (e: any) => {
      const delta = e?.detail?.addedBytes;
      const add = typeof delta === 'number' ? delta : 0;
      if (add > 0) {
        setStorageUsedBytes((prev) => {
          const next = prev + add;
          try { localStorage.setItem('lastStorageUsedBytes', String(next)); } catch {}
          return next;
        });
      }
      const run = async () => {
        try {
          if (!user?.uid) return;
          const teacher = await TeacherService.getTeacherByUid(user.uid).catch(() => null);
          const teacherId = (teacher as any)?.id || user.uid;
          const used = await StorageService.getTeacherStorageUsageBytes(teacherId);
          let offset = 0;
          let s3Local = 0;
          try {
            const raw = localStorage.getItem('teacherUploadOffsetBytes');
            offset = raw ? Number(raw) : 0;
          } catch {}
          try {
            const rawS3 = localStorage.getItem('teacherS3UsageBytes');
            s3Local = rawS3 ? Number(rawS3) : 0;
          } catch {}
          const s3PersistRaw = (teacher as any)?.s3UsageBytes;
          const s3Persist = typeof s3PersistRaw === 'number' ? s3PersistRaw : 0;
          const s3Add = s3Persist > 0 ? s3Persist : (isNaN(s3Local) ? 0 : s3Local);
          const extra = (isNaN(offset) ? 0 : offset) + s3Add;
          const baseRaw = localStorage.getItem('usageBaselineBytes');
          const base = baseRaw ? Number(baseRaw) : 0;
          const total = used + extra;
          const sinceReset = Math.max(0, total - (isNaN(base) ? 0 : base));
          const prevLocal = (() => { try { const raw = localStorage.getItem('lastStorageUsedBytes'); return raw ? Number(raw) : 0; } catch { return 0; } })();
          const nextUsed = Math.max(prevLocal, sinceReset);
          setStorageUsedBytes(nextUsed);
          try { localStorage.setItem('lastStorageUsedBytes', String(nextUsed)); } catch {}
        } catch {}
      };
      setTimeout(run, 0);
    };
    window.addEventListener('teacher-storage-updated', onUpdate);
    return () => {
      window.removeEventListener('teacher-storage-updated', onUpdate);
    };
  }, [user?.uid]);

  // Persist a flag when storage usage warning (80%+) is shown, for routing guard to avoid page lock due to storage only
  useEffect(() => {
    try {
      const capFromLocal = (() => { try { const raw = localStorage.getItem('approvedStorageGB'); return raw ? Number(raw) : null; } catch { return null; } })();
      const baseGB = (typeof approvedStorageGB === 'number' && approvedStorageGB > 0)
        ? approvedStorageGB
        : (typeof capFromLocal === 'number' && capFromLocal > 0 ? capFromLocal : 0);
      const capGB = baseGB + (extraStorageGB > 0 ? extraStorageGB : 0);
      const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
      const pct = capGB > 0 ? Math.min(100, Math.max(0, (usedGB / capGB) * 100)) : 0;
      const warnOnly = pct >= 80 && pct < 100;
      localStorage.setItem('storageWarningOnly', warnOnly ? 'true' : 'false');
      // Update teacher doc with storage cap flags
      (async () => {
        try {
          if (!user?.uid) return;
          const teacher = await TeacherService.getTeacherByUid(user.uid).catch(() => null);
          const teacherId = (teacher as any)?.id || user.uid;
          await updateDoc(doc(db, 'teachers', teacherId), { storageOver80Pct: pct >= 80, storageOver95Pct: pct >= 95, updatedAt: new Date().toISOString() });
        } catch {}
      })();
    } catch {}
  }, [storageUsedBytes, approvedStorageGB, extraStorageGB]);

  const configuredMs = trialCfg?.ms ?? (24 * 60 * 60 * 1000);
  const trialEndsMs = createdMs ? (createdMs + configuredMs) : 0;
  const nowMs = nowTick;
  // Subscription countdown
  let subExpiresIso: string | null = null;
  try { subExpiresIso = localStorage.getItem('subscriptionExpiresAt'); } catch {}
  const subExpiresMs = subExpiresIso ? new Date(subExpiresIso).getTime() : 0;
  const subRemainingMs = subExpiresMs > 0 ? Math.max(0, subExpiresMs - nowMs) : 0;
  const subDays = Math.floor(subRemainingMs / (24 * 60 * 60 * 1000));
  const subHours = Math.floor((subRemainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const subMinutes = Math.floor((subRemainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const subSeconds = Math.floor((subRemainingMs % (60 * 1000)) / 1000);
  const trialExpired = !!createdMs && nowMs >= trialEndsMs;
  const remainingCount = !!createdMs && !trialExpired
    ? (trialCfg?.unit === 'minutes'
        ? Math.max(0, Math.ceil((trialEndsMs - nowMs) / (60 * 1000)))
        : Math.max(0, Math.ceil((trialEndsMs - nowMs) / (24 * 60 * 60 * 1000))))
    : 0;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(language === 'ar' ? 'خطأ في تسجيل الخروج' : 'Logout failed');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Handle upgrade CTA: scroll to pricing if already on teacher dashboard, otherwise navigate
  const handleUpgradeClick = (e?: React.MouseEvent) => {
    try {
      const isTeacherDashboard = location.pathname.startsWith('/teacher-dashboard');
      if (isTeacherDashboard) {
        if (e) {
          e.preventDefault();
        }
        const target = document.getElementById('pricing');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          navigate('/teacher-dashboard#pricing');
        }
      } else {
        navigate('/teacher-dashboard#pricing');
      }
    } catch (err) {
      navigate('/teacher-dashboard#pricing');
    }
  };

  return (
    <header className={fixed ? "bg-card border-b border-border fixed top-0 left-0 right-0 z-50" : "bg-card border-b border-border relative z-50"} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={fixed ? "container mx-auto px-4 h-16 flex items-center justify-end" : "container mx-auto px-4 py-3 flex items-center justify-end"}>
        {/* Right side - Language, Notifications and Profile */}
        <div className="flex flex-row-reverse items-center gap-4">
          <div className="order-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[96px] justify-between">
                  <span>{language === 'ar' ? 'العربية' : 'English'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setLanguage('ar')}>{'العربية'}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>{'English'}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Profile Dropdown */}
          <div className="order-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profileImage} alt={studentName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(studentName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-3 border-b">
                <p className="text-sm font-medium">{studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'teacher'
                    ? (language === 'ar' ? 'المدرس' : 'Teacher')
                    : user?.role === 'admin'
                      ? (language === 'ar' ? 'المدير' : 'Admin')
                      : (language === 'ar' ? 'الطالب' : 'Student')}
                </p>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  to={
                    location.pathname.startsWith('/teacher-dashboard') || user?.role === 'teacher'
                      ? '/teacher-dashboard/settings'
                      : (location.pathname.startsWith('/admin') || user?.role === 'admin')
                        ? '/admin/settings'
                        : '/dashboard/settings'
                  }
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>{t('settings')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive">
                <LogOut className="h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
          {/* Notifications */}
          <div className="order-1 relative">
          <DropdownMenu open={showNotifications} onOpenChange={(v) => {
            setShowNotifications(v);
            try { if (v) { if (onNotificationsOpen) onNotificationsOpen(); if (onPreviewClear) onPreviewClear(); } } catch (e) { void e }
          }}>
            <DropdownMenuTrigger asChild>
              <Button ref={bellRef} variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {(((notificationCount && notificationCount > 0) ? notificationCount : headerNotificationCount) > 0) && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {(((notificationCount && notificationCount > 0) ? notificationCount : headerNotificationCount) > 9) ? '9+' : ((notificationCount && notificationCount > 0) ? notificationCount : headerNotificationCount)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            {!showNotifications && newNotificationPreviewInternal && previewPos && (
              <div
                className={`fixed z-50 w-[220px] max-w-[90vw] rounded-xl border border-border bg-card shadow-xl p-2 animate-in fade-in slide-in-from-top-2 ${language === 'ar' ? 'text-right' : 'text-left'} relative`}
                style={{ top: previewPos.top, left: previewPos.left, transform: 'translateX(-50%)' }}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border border-border rotate-45" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{newNotificationPreviewInternal?.type || 'info'}</span>
                </div>
                <div className="mt-1 text-xs font-medium truncate">{newNotificationPreviewInternal?.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 max-h-12 overflow-hidden">{newNotificationPreviewInternal?.message}</div>
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => {
                      try {
                        setShowNotifications(true);
                        if (onNotificationsOpen) onNotificationsOpen();
                        if (onPreviewClear) onPreviewClear();
                      } catch (e) { void e }
                    }}
                  >
                    {language === 'ar' ? 'قراءة الكل' : 'Read all'}
                  </button>
                </div>
              </div>
            )}
            <DropdownMenuContent
              align="end"
              className="w-[24rem] z-10"
              onPointerDownCapture={() => { try { onNotificationsOpen && onNotificationsOpen(); } catch {} }}
              style={{ fontFamily: language === 'ar' ? "'Noto Naskh Arabic','Cairo','Tajawal', system-ui, sans-serif" : undefined }}
            >
              <div className="p-3 border-b flex items-center justify-between">
                <h4 className="font-medium">{t('notifications')} ({headerNotificationCount})</h4>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    try {
                      const uidVal = user?.uid || 'anonymous';
                      const list = ((notifications && notifications.length > 0) ? notifications : headerNotifications);
                      list.forEach((n) => { try { localStorage.setItem(`notifRead:${uidVal}:${n.id}`, 'true'); } catch (e) { void e } });
                      try {
                        const next = new Set<string>(readIds);
                        list.forEach((n) => next.add(n.id));
                        setReadIds(next);
                      } catch {}
                      setHeaderNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      setHeaderNotificationCount(0);
                    } catch (e) { void e }
                  }}
                >
                  {language === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as seen'}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {(((notifications && notifications.length > 0) ? notifications : headerNotifications).length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm text-center">
                      {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </p>
                    <p className="text-xs mt-1 text-center">
                      {language === 'ar' ? 'ستظهر الإشعارات هنا' : 'Notifications will appear here'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {(() => {
                      const uidVal = user?.uid || 'anonymous';
                      const rawList = ((notifications && notifications.length > 0) ? notifications : headerNotifications);
                      const visibleList = rawList.filter((n) => {
                        const read = readIds.has(n.id) || (n as any).isRead === true || isNotifRead(uidVal, n.id);
                        return !read;
                      }).sort((a, b) => {
                        try {
                          const titleWelcome = language === 'ar' ? 'مرحبًا بك في منارة' : 'Welcome to Manara';
                          const titleGuide = language === 'ar' ? 'إرشادات البدء للمدرّس' : 'Getting Started Guide';
                          const aIsWelcome = a.title === titleWelcome;
                          const bIsWelcome = b.title === titleWelcome;
                          const aIsGuide = a.title === titleGuide;
                          const bIsGuide = b.title === titleGuide;
                          if (aIsWelcome && !bIsWelcome) return -1;
                          if (!aIsWelcome && bIsWelcome) return 1;
                          if (aIsGuide && !bIsGuide) return 1; // guide after welcome
                          if (!aIsGuide && bIsGuide) return -1;
                          const ta = new Date(a.time).getTime();
                          const tb = new Date(b.time).getTime();
                          return ta - tb; // older first
                        } catch {
                          return 0;
                        }
                      });
                      return visibleList.map((n) => (
                      <div key={n.id} className="p-3 rounded-md transition-colors hover:bg-[#ee7b3d]/10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className={`flex items-start justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                            <div className="text-sm font-medium">{n.title}</div>
                            <div className={`mt-1 text-xs text-muted-foreground whitespace-normal w-full break-words leading-6`}>{n.message}</div>
                            <div className="text-[11px] text-muted-foreground mt-2">{formatNotifTime(n.time)}</div>
                          </div>
                          <div className={`flex items-center gap-2`}>
                            {(!(n as any).actionsDisabled) && n.type && (
                              <Badge variant={n.type === 'success' ? 'default' : n.type === 'warning' ? 'destructive' : 'secondary'}>{n.type}</Badge>
                            )}
                            {(() => {
                              const uidVal = user?.uid || 'anonymous';
                              const read = readIds.has(n.id) || (n as any).isRead === true || isNotifRead(uidVal, n.id);
                              if (read) return null;
                              return (
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-md border hover:bg-muted flex items-center justify-center"
                                  onClick={() => {
                                    try {
                                      const idVal = n.id;
                                      const uid = user?.uid || 'anonymous';
                                      localStorage.setItem(`notifRead:${uid}:${idVal}`, 'true');
                                      setHeaderNotifications((prev) => prev.filter((x) => x.id !== idVal));
                                      setHeaderNotificationCount((c) => Math.max(0, c - 1));
                                      setReadIds((prev) => {
                                        const next = new Set<string>(prev);
                                        next.add(idVal);
                                        return next;
                                      });
                                    } catch (e) { void e }
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              );
                            })()}
                            {(!(n as any).actionsDisabled) && n.linkUrl && (
                              <button
                                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => {
                                  try {
                                    const url = n.linkUrl as string;
                                    if (url) window.open(url, '_blank');
                                  } catch (e) { void e }
                                }}
                              >
                                {(n.linkText as string) || (language === 'ar' ? 'فتح' : 'Open')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
              
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          {/* Teacher active subscription: show plan and optional storage usage */}
          {user?.role === 'teacher' && hasApprovedActiveSubscription ? (
            <div className="order-3 hidden md:flex relative items-center gap-3 premium-gradient-frame rounded-full px-4 py-2 text-base whitespace-nowrap bg-transparent dir-rtl">
              <div className="relative z-10 flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {language === 'ar' ? 'باقة ' : 'Plan '}
                  {approvedPlanName || (language === 'ar' ? 'نشطة' : 'Active')}
                </span>
                {(() => {
                  const baseGB = (typeof approvedStorageGB === 'number' && approvedStorageGB > 0) ? approvedStorageGB : 0;
                  const capGB = baseGB + (extraStorageGB > 0 ? extraStorageGB : 0);
                  const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
                  const pct = capGB > 0 ? Math.min(100, Math.max(0, (usedGB / capGB) * 100)) : 0;
                  if (pct >= 80) {
                    return (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">{language === 'ar' ? 'استخدام مرتفع' : 'High usage'}</span>
                      </span>
                    );
                  }
                  return null;
                })()}
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-5 w-5 rounded-sm hover:bg-primary/10"
                  onClick={() => setPlanOpen((v) => !v)}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${planOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {planOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 border border-border rounded-md bg-card shadow-lg p-3 text-sm z-20 dir-rtl w-max">
                  {subExpiresMs > 0 && (() => {
                    try {
                      const locale = language === 'ar' ? 'ar-EG' : 'en-US';
                      const dateStr = new Date(subExpiresMs).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
                      return (
                        <div className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'التجديد القادم: ' : 'Next renewal: '}
                          <span className="font-semibold">{dateStr}</span>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  {(() => {
                    const baseGB = (typeof approvedStorageGB === 'number' && approvedStorageGB > 0) ? approvedStorageGB : 0;
                    if (baseGB <= 0) return null;
                    const capGB = baseGB + (extraStorageGB > 0 ? extraStorageGB : 0);
                    const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
                    const usedMB = storageUsedBytes / (1024 * 1024);
                    const pct = capGB > 0 ? Math.min(100, Math.max(0, (usedGB / capGB) * 100)) : 0;
                    const capText = (capGB % 1 === 0) ? `${capGB.toFixed(0)} GB` : `${capGB.toFixed(2)} GB`;
                    const usedText = usedGB < 1 ? `${usedMB.toFixed(2)} MB` : `${usedGB.toFixed(2)} GB`;
                    const label = `${usedText} / ${capText}`;
                    const suffix = language === 'ar' ? 'المساحة التخزينية للباقة' : 'Plan storage capacity';
                    const barColor = pct >= 80 ? 'bg-red-500' : (pct >= 50 ? 'bg-orange-500' : 'bg-green-500');
                    return (
                      <div className="mt-2">
                        <div className="text-[10px] text-muted-foreground mb-1 text-right">{label} • {suffix}</div>
                        <div className="min-w-[140px] w-[220px]">
                          <div className="w-full h-2 bg-muted rounded-none">
                            <div className={`h-2 ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        {pct >= 80 && (
                          <div className="mt-2 text-[11px] text-red-600 text-right">
                            {language === 'ar'
                              ? <>لقد اقتربت من الحد المسموح به للمساحة التخزينية (80%). <Link to="/teacher-dashboard/storage-addon" className="underline">شراء مساحة إضافية</Link></>
                              : <>You are nearing the storage limit (80%). <Link to="/teacher-dashboard/storage-addon" className="underline">Buy additional storage</Link></>}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* Teacher trial badge / CTA when not approved */
            user?.role === 'teacher' && !!createdMs && (
              (!trialExpired && !hasActiveSubscription && !hadApprovedSubscription) ? (
                <div className="order-3 hidden md:flex items-center border border-border rounded-md px-3 py-1 text-sm whitespace-nowrap">
                  {language === 'ar'
                    ? `انت علي الفترة التجريبية متبقي (${remainingCount}) ${trialCfg?.unit === 'minutes' ? 'دقيقة' : 'يوم'}`
                    : `You are on trial. (${remainingCount}) ${trialCfg?.unit === 'minutes' ? 'minute' : 'day'} left`}
                </div>
              ) : (
                <div className="order-3 hidden md:flex items-center gap-3 border border-border rounded-md px-3 py-1 text-sm whitespace-nowrap bg-accent/30">
                  <span>
                    {hadApprovedSubscription
                      ? (language === 'ar'
                        ? 'انتهى اشتراكك — جدّد الآن لاستعادة مزايا الباقة'
                        : 'Subscription expired — Renew now to regain plan features')
                      : (language === 'ar'
                        ? 'انتهت الفترة التجريبية — ارتقِ الآن واحصل على كل المزايا'
                        : 'Trial ended — Upgrade now to unlock all features')}
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2"
                    type="button"
                    onClick={handleUpgradeClick}
                  >
                    <Crown className="h-3.5 w-3.5 mr-1" />
                    {hadApprovedSubscription
                      ? (language === 'ar' ? 'التجديد الآن' : 'Renew now')
                      : (language === 'ar' ? 'الترقية الآن' : 'Upgrade now')}
                  </Button>
                </div>
              )
            )
          )}

        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;