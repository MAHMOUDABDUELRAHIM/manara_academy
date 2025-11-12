import { useState, useEffect } from "react";
import { db } from '@/firebase/config';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
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
import { Bell, LogOut, Settings, Crown } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { TeacherService } from "@/services/teacherService";
import { StorageService } from "@/services/storageService";

interface DashboardHeaderProps {
  studentName?: string;
  profileImage?: string;
  notificationCount?: number;
}

export const DashboardHeader = ({ 
  studentName = "أحمد محمد", 
  profileImage,
  notificationCount = 3 
}: DashboardHeaderProps) => {
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  // Ticking clock for live countdowns
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, []);
  // Subscription approval + storage usage state (teacher)
  const [approvedPlanName, setApprovedPlanName] = useState<string | null>(null);
  const [approvedStorageGB, setApprovedStorageGB] = useState<number | null>(null);
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(() => {
    try { return localStorage.getItem('hasActiveSubscription') === 'true'; } catch { return false; }
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
          // Latest approved (unexpired)
          const approvedList = payments
            .filter(p => p?.status === 'approved')
            .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)));
          const approvedP = approvedList[0];
          const expApproved = approvedP?.expiresAt?.toDate?.() || approvedP?.expiresAt || null;
          const validApproved = expApproved instanceof Date ? (Date.now() < expApproved.getTime()) : !!approvedP;

          // Latest pending considered active within its period
          const pendingList = payments
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
              rawPeriod.includes('year') || rawPeriod.includes('annual') || rawPeriod.includes('سنوي') || rawPeriod.includes('سنة')
            );
            const isHalfYear = (
              rawPeriod.includes('half') || rawPeriod.includes('semi') || rawPeriod.includes('semiannual') || rawPeriod.includes('semi-annual') ||
              rawPeriod.includes('نصف') || rawPeriod.includes('نصف سنوي') || rawPeriod.includes('ستة أشهر') || rawPeriod.includes('6 اشهر') || rawPeriod.includes('6 أشهر')
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

          const hasActive = !!validApproved;
          setHasActiveSubscription(hasActive);
          try { localStorage.setItem('hasActiveSubscription', hasActive ? 'true' : 'false'); } catch {}

          // Resolve plan name and expiry for countdown
          const activePayment = validApproved ? approvedP : null;
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
                // Try lookup by name if id missing
                // Note: we don't have query imported here, but above we already have in scope. Reuse if necessary.
              }
              const periodStr = (planDocData?.period || '').toString().toLowerCase();
              // Map to ms: month=30d, half-year=180d, year=365d, 5 minutes for testing
              const isYear = periodStr.includes('year') || periodStr.includes('annual') || periodStr.includes('سنوي') || periodStr.includes('سنة');
              const isHalfYear = periodStr.includes('half') || periodStr.includes('semi') || periodStr.includes('semiannual') || periodStr.includes('semi-annual') || periodStr.includes('نصف') || periodStr.includes('نصف سنوي');
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
            } catch {
              planPeriodMs = null;
            }
            // Compute expiry: prefer payment.expiresAt if set; otherwise derive from start time + planPeriodMs
            let expComputed: Date | null = null;
            const expFromPayment = validApproved ? (expApproved instanceof Date ? expApproved : null) : null;
            if (expFromPayment instanceof Date) {
              expComputed = expFromPayment;
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
            // Fetch storageGB only when planId present; else keep null
            if (planId) {
              try {
                const psnap = await getDoc(doc(db, 'pricingPlans', planId));
                const pdata: any = psnap.exists() ? psnap.data() : null;
                const sgb = typeof pdata?.storageGB === 'number' ? pdata.storageGB : undefined;
                setApprovedStorageGB(typeof sgb === 'number' ? sgb : null);
              } catch {
                setApprovedStorageGB(null);
              }
            } else {
              setApprovedStorageGB(null);
            }
            // Compute usage
            try {
              const used = await StorageService.getTeacherStorageUsageBytes(teacherId);
              if (!cancelled) setStorageUsedBytes(used);
            } catch {
              if (!cancelled) setStorageUsedBytes(0);
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
    <header className="bg-card border-b border-border relative z-50" dir={'ltr'}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img 
            src="/Header-Logo.png" 
            alt="Manara Academy Logo" 
            className="h-12 w-auto object-contain"
          />
        </Link>
        
        {/* Right side - Notifications and Profile */}
        <div className="flex flex-row-reverse items-center gap-4">
          {/* Profile Dropdown */}
          <div className="order-1">
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
          <div className="order-2">
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <h4 className="font-medium">{t('notifications')}</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm text-center">
                    {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                  </p>
                  <p className="text-xs mt-1 text-center">
                    {language === 'ar' ? 'ستظهر الإشعارات هنا' : 'Notifications will appear here'}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-3 text-center cursor-pointer">
                <span className="text-sm text-primary">{t('viewAllNotifications')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          {/* Teacher active subscription: show plan and optional storage usage */}
          {user?.role === 'teacher' && hasActiveSubscription ? (
            <div className="order-3 hidden md:flex flex-col gap-1 border px-4 py-2 whitespace-nowrap rounded-none bg-primary/5 ring-1 ring-primary/40 shadow-lg animate-pulse">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">
                  {language === 'ar' ? 'الخطة:' : 'Plan:'}
                </span>
                <Badge variant="outline" className="rounded-none">
                  {approvedPlanName || (language === 'ar' ? 'باقة نشطة' : 'Active Plan')}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {language === 'ar' ? 'استخدام التخزين' : 'Storage usage'}
                </span>
              </div>
              {subExpiresMs > 0 && (
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'ينتهي الاشتراك بعد: ' : 'Subscription ends in: '}
                  <span className="font-mono">
                    {subDays}d {subHours}h {subMinutes}m {subSeconds}s
                  </span>
                </div>
              )}
              {approvedStorageGB && approvedStorageGB > 0 && (() => {
                const usedGB = storageUsedBytes / (1024 * 1024 * 1024);
                const pct = Math.min(100, Math.max(0, (usedGB / approvedStorageGB) * 100));
                const label = `${usedGB.toFixed(2)} / ${approvedStorageGB} GB`;
                return (
                  <div className="flex items-center gap-3">
                    <div className="min-w-[160px] w-[200px]">
                      <Progress value={pct} className="rounded-none" />
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Teacher trial badge / CTA when not approved */
            user?.role === 'teacher' && !!createdMs && (
              (!trialExpired && !hasActiveSubscription) ? (
                <div className="order-3 hidden md:flex items-center border border-border rounded-md px-3 py-1 text-sm whitespace-nowrap">
                  {language === 'ar'
                    ? `انت علي الفترة التجريبية متبقي (${remainingCount}) ${trialCfg?.unit === 'minutes' ? 'دقيقة' : 'يوم'}`
                    : `You are on trial. (${remainingCount}) ${trialCfg?.unit === 'minutes' ? 'minute' : 'day'} left`}
                </div>
              ) : (
                <div className="order-3 hidden md:flex items-center gap-3 border border-border rounded-md px-3 py-1 text-sm whitespace-nowrap bg-accent/30">
                  <span>
                    {language === 'ar'
                      ? 'انتهت الفترة التجريبية — ارتقِ الآن واحصل على كل المزايا'
                      : 'Trial ended — Upgrade now to unlock all features'}
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2"
                    type="button"
                    onClick={handleUpgradeClick}
                  >
                    <Crown className="h-3.5 w-3.5 mr-1" />
                    {language === 'ar' ? 'الترقية الآن' : 'Upgrade now'}
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