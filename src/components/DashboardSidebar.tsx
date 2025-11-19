import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Home, 
  BookOpen, 
  Grid3X3, 
  User, 
  LifeBuoy, 
  ChevronLeft, 
  ChevronRight,
  Menu
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface DashboardSidebarProps {
  className?: string;
}

export const DashboardSidebar = ({ className }: DashboardSidebarProps) => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: Home,
      href: '/dashboard'
    },
    {
      id: 'courses',
      label: t('myCourses'),
      icon: BookOpen,
      href: '/dashboard/courses'
    },
    {
      id: 'catalog',
      label: t('catalog'),
      icon: Grid3X3,
      href: '/dashboard/catalog'
    },
    {
      id: 'profile',
      label: t('profileSettings'),
      icon: User,
      href: '/dashboard/profile'
    },
    {
      id: 'support',
      label: t('support'),
      icon: LifeBuoy,
      href: '/dashboard/support'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
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
          "fixed left-0 top-0 bottom-16 bg-card border-r border-border transition-all duration-300 z-40",
          "flex flex-col",
          isCollapsed ? "w-16" : "w-64",
          // Mobile styles
          "md:relative md:top-0 md:bottom-0 md:h-[calc(100vh-4rem)] md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
        dir="ltr"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-foreground">
                {t('navigation')}
              </h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="hidden md:flex h-8 w-8 p-0"
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
                      "hover:bg-accent hover:text-accent-foreground",
                      active && "bg-primary text-primary-foreground hover:bg-primary/90",
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
        <div className="p-3 border-t border-border flex-shrink-0">
          {!isCollapsed && (
            <div className="text-xs text-muted-foreground text-center">
              © Manara Academy 2025
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;