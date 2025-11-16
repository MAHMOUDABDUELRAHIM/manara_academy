import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Lock
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
          "fixed left-0 top-0 bottom-16 bg-white transition-all duration-300 z-40",
          "flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          // Mobile styles
          "md:relative md:top-0 md:bottom-0 md:h-[calc(100vh-4rem)] md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-[#2c4656]">
                {language === 'ar' ? 'التنقل' : 'Navigation'}
              </h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="hidden md:flex h-8 w-8 p-0 hover:bg-gray-100"
            >
              {language === 'ar' ? (
                isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              ) : (
                isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              // Lock only when trial expired and subscription not approved.
              // With approved subscription, unlock all sidebar pages similar to trial.
              const expiredAndNotApproved = (!approved && trialExpired);
              const locked = expiredAndNotApproved && item.id !== 'dashboard';
              // Always navigate to intended href; rely on ProtectedRoute for gating/redirect
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
                        {locked && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {language === 'ar' ? 'مغلق حتى التفعيل' : 'Locked until activation'}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 text-center">
              © Manara Academy 2025
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default TeacherSidebar;