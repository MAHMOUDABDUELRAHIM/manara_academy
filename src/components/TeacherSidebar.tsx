import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  BookOpen, 
  Plus,
  DollarSign,
  LifeBuoy, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  User,
  Settings,
  UserPlus,
  CheckSquare,
  Lock,
  ExternalLink
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface TeacherSidebarProps {
  className?: string;
  isSubscriptionApproved?: boolean;
}

export const TeacherSidebar = ({ className, isSubscriptionApproved = false }: TeacherSidebarProps) => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Effective approval status: prefer prop when provided, otherwise fall back to localStorage
  const [approved, setApproved] = useState<boolean>(() => {
    if (isSubscriptionApproved) return true;
    try {
      const active = localStorage.getItem('hasActiveSubscription') === 'true';
      const approvedLS = localStorage.getItem('isSubscriptionApproved') === 'true';
      return active || approvedLS;
    } catch { return false; }
  });
  const [trialExpired, setTrialExpired] = useState<boolean>(() => {
    try { return localStorage.getItem('trialExpired') === 'true'; } catch { return false; }
  });
  const [allowedSections, setAllowedSections] = useState<Record<string, string[]> | null>(() => {
    try {
      const raw = localStorage.getItem('allowedSections');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  useEffect(() => {
    let active = false;
    let approvedLS = false;
    try {
      active = localStorage.getItem('hasActiveSubscription') === 'true';
      approvedLS = localStorage.getItem('isSubscriptionApproved') === 'true';
    } catch {}
    setApproved(isSubscriptionApproved || active || approvedLS);
  }, [isSubscriptionApproved]);
  const mainLogoSrc = "/Header-Logo.png";
  const collapsedLogoSrc = "/socialMedia-logo - Copy.png";
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'isSubscriptionApproved') {
        const val = e.newValue === 'true';
        setApproved((prev) => (isSubscriptionApproved ? isSubscriptionApproved : (val || prev)));
      }
      if (e.key === 'hasActiveSubscription') {
        const val = e.newValue === 'true';
        setApproved((prev) => (isSubscriptionApproved ? isSubscriptionApproved : (val || prev)));
      }
      if (e.key === 'trialExpired') {
        setTrialExpired(e.newValue === 'true');
      }
      if (e.key === 'allowedSections') {
        try {
          setAllowedSections(e.newValue ? JSON.parse(e.newValue) : null);
        } catch { setAllowedSections(null); }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isSubscriptionApproved]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      icon: Home,
      href: '/teacher-dashboard'
    },
    {
      id: 'my-courses',
      label: language === 'ar' ? 'دوراتي' : 'My Courses',
      icon: BookOpen,
      href: '/teacher-dashboard/courses'
    },
    {
      id: 'assessments',
      label: language === 'ar' ? 'الامتحانات والواجبات' : 'Assessments',
      icon: CheckSquare,
      href: '/teacher-dashboard/assessments'
    },
    {
      id: 'create-course',
      label: language === 'ar' ? 'إنشاء كورس' : 'Create Course',
      icon: Plus,
      href: '/teacher-dashboard/create-course'
    },
    {
      id: 'invite-students',
      label: language === 'ar' ? 'ادارة وتخصيص المنصة' : 'Platform Management and Customization',
      icon: Settings,
      href: '/teacher-dashboard/invite-students'
    },
    {
      id: 'payouts',
      label: language === 'ar' ? 'المدفوعات' : 'Payouts',
      icon: DollarSign,
      href: '/teacher-dashboard/payouts'
    },
    
  ];

  const isActive = (href: string) => {
    if (href === '/teacher-dashboard') {
      return location.pathname === '/teacher-dashboard' || location.pathname === '/teacher-dashboard/';
    }
    return location.pathname.startsWith(href);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };
  const { user } = useAuth();
  const studentPlatformHref = user?.uid ? `/invite/${user.uid}` : '/invite/teacher-id';

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleMobile}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 left-0 transition-all duration-300 z-[60]",
          "flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          "md:fixed md:top-0 md:bottom-0 md:h-screen md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="px-4 py-3 border-b border-[#2a1f62] flex-shrink-0 bg-[#1d1442]">
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "gap-3")}
            >
              <img src={isCollapsed ? collapsedLogoSrc : mainLogoSrc} alt={"Manara Logo"} className={cn("object-contain", isCollapsed ? "h-8 w-8 rounded" : "h-10 w-auto")} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="hidden md:flex h-8 w-8 p-0 hover:bg-[#2a1f62] text-gray-200"
            >
              {language === 'ar' ? (
                isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              ) : (
                isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto min-h-0 bg-[#1d1442] text-gray-200">
          <div className="space-y-6">
            <ul className="space-y-2">
              <li>
                <Link
                  to={user?.uid ? `/invite/${user.uid}?teacherPreview=1` : '/invite/teacher-id?teacherPreview=1'}
                  onClick={() => { try { localStorage.setItem('studentPreview','true'); } catch {}; try { setIsMobileOpen(false); } catch {} }}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                    "hover:bg-[#2a1f62] hover:text-white",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <ExternalLink className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">
                      {language === 'ar' ? 'منصة الطالب' : 'Student Platform'}
                    </span>
                  )}
                </Link>
              </li>
            </ul>
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {language === 'ar' ? 'وصول البيانات' : 'Data Access'}
                </div>
              )}
              <ul className="space-y-2">
                {sidebarItems.filter(i => ['dashboard','my-courses','assessments','create-course'].includes(i.id)).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const expiredAndNotApproved = (!approved && trialExpired);
                  const locked = expiredAndNotApproved && item.id !== 'dashboard';
                  const targetHref = item.href;
                  return (
                    <li key={item.id}>
                      <Link
                        to={targetHref}
                        onClick={() => setIsMobileOpen(false)}
                        aria-disabled={locked}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                      "hover:bg-[#2a1f62] hover:text-white",
                      active && "bg-[#2a1f62] text-white",
                      isCollapsed && "justify-center px-2",
                      locked && "opacity-60 cursor-not-allowed"
                    )}
                      >
                        {locked ? (
                          <Lock className={cn("h-5 w-5 flex-shrink-0")} />
                        ) : (
                          <Icon className={cn("h-5 w-5 flex-shrink-0")} />
                        )}
                        {!isCollapsed && (
                          <span className="text-sm font-medium truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {language === 'ar' ? 'المستخدمون والمجموعات' : 'Users & Groups'}
                </div>
              )}
              <ul className="space-y-2">
                {sidebarItems.filter(i => ['invite-students'].includes(i.id)).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const expiredAndNotApproved = (!approved && trialExpired);
                  const locked = expiredAndNotApproved && item.id !== 'dashboard';
                  const targetHref = item.href;
                  return (
                    <li key={item.id}>
                      <Link
                        to={targetHref}
                        onClick={() => setIsMobileOpen(false)}
                        aria-disabled={locked}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                      "hover:bg-[#2a1f62] hover:text-white",
                      active && "bg-[#2a1f62] text-white",
                      isCollapsed && "justify-center px-2",
                      locked && "opacity-60 cursor-not-allowed"
                    )}
                      >
                        {locked ? (
                          <Lock className={cn("h-5 w-5 flex-shrink-0")} />
                        ) : (
                          <Icon className={cn("h-5 w-5 flex-shrink-0")} />
                        )}
                        {!isCollapsed && (
                          <span className="text-sm font-medium truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {language === 'ar' ? 'حسابك' : 'Your Account'}
                </div>
              )}
              <ul className="space-y-2">
                {sidebarItems.filter(i => i.id === 'payouts').map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const expiredAndNotApproved = (!approved && trialExpired);
                  const locked = expiredAndNotApproved && item.id !== 'dashboard';
                  const targetHref = item.href;
                  return (
                    <li key={item.id}>
                      <Link
                        to={targetHref}
                        onClick={() => setIsMobileOpen(false)}
                        aria-disabled={locked}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          "hover:bg-gray-100 hover:text-[#2c4656]",
                          active && "bg-[#2c4656] text-white hover:bg-[#1e3240]",
                          isCollapsed && "justify-center px-2",
                          locked && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {locked ? (
                          <Lock className={cn("h-5 w-5 flex-shrink-0")} />
                        ) : (
                          <Icon className={cn("h-5 w-5 flex-shrink-0")} />
                        )}
                        {!isCollapsed && (
                          <span className="text-sm font-medium truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#2a1f62] flex-shrink-0 bg-[#1d1442]">
          {!isCollapsed && (
            <div className="text-xs text-gray-400 text-center">
              © Manara Academy 2025
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default TeacherSidebar;