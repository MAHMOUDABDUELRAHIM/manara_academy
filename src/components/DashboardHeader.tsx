import { useState, useEffect } from "react";
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
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

  const configuredMs = trialCfg?.ms ?? (24 * 60 * 60 * 1000);
  const trialEndsMs = createdMs ? (createdMs + configuredMs) : 0;
  const nowMs = Date.now();
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

          {/* Teacher trial badge / CTA */}
          {user?.role === 'teacher' && !!createdMs && (
            !trialExpired ? (
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
          )}

        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;