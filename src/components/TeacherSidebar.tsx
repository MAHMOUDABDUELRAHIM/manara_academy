import { useState } from "react";
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
  CheckSquare
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface TeacherSidebarProps {
  className?: string;
}

export const TeacherSidebar = ({ className }: TeacherSidebarProps) => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      icon: Home,
      href: '/teacher'
    },
    {
      id: 'my-courses',
      label: language === 'ar' ? 'دوراتي' : 'My Courses',
      icon: BookOpen,
      href: '/teacher/courses'
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
      href: '/teacher/create-course'
    },
    {
      id: 'invite-students',
      label: language === 'ar' ? 'ادارة وتخصيص المنصة' : 'Invite Students',
      icon: UserPlus,
      href: '/teacher/invite-students'
    },
    {
      id: 'payouts',
      label: language === 'ar' ? 'المدفوعات' : 'Payouts',
      icon: DollarSign,
      href: '/teacher/payouts'
    },
    {
      id: 'profile',
      label: language === 'ar' ? 'الملف الشخصي' : 'Profile',
      icon: User,
      href: '/teacher/profile'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/teacher') {
      return location.pathname === '/teacher' || location.pathname === '/teacher/';
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
          "fixed left-0 top-0 bottom-16 bg-white border-r border-gray-200 transition-all duration-300 z-40",
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
              
              return (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      "hover:bg-gray-100 hover:text-[#2c4656]",
                      active && "bg-[#2c4656] text-white hover:bg-[#1e3240]",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0")} />
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