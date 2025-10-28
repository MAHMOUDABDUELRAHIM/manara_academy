import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  BookOpen,
  Wallet,
  MessageCircle,
  Bell,
  BarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      icon: Home,
      href: '/admin-dashboard'
    },
    {
      id: 'users',
      label: language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      id: 'courses',
      label: language === 'ar' ? 'إدارة الدورات' : 'Manage Courses',
      icon: BookOpen,
      href: '/admin/courses'
    },
    {
      id: 'payments',
      label: language === 'ar' ? 'المدفوعات والأرباح' : 'Payments & Payouts',
      icon: Wallet,
      href: '/admin/payments'
    },
    {
      id: 'notifications',
      label: language === 'ar' ? 'الإشعارات' : 'Notifications',
      icon: Bell,
      href: '/admin/notifications'
    },
    {
      id: 'analytics',
      label: language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics',
      icon: BarChart,
      href: '/admin/analytics'
    },
    {
      id: 'settings',
      label: language === 'ar' ? 'الإعدادات' : 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin-dashboard') {
      return location.pathname === '/admin-dashboard';
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
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border border-border"
        onClick={toggleMobile}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r border-border transition-all duration-300 z-40",
        "lg:relative lg:top-0 lg:h-[calc(100vh-4rem)]",
        isCollapsed ? "w-16" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Collapse Toggle Button - Desktop Only */}
          <div className="hidden lg:flex justify-end p-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-8 w-8"
            >
              {isCollapsed ? 
                <ChevronRight className="h-4 w-4" /> : 
                <ChevronLeft className="h-4 w-4" />
              }
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-accent/50",
                    active && "bg-accent text-accent-foreground",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    active ? "text-accent-foreground" : "text-muted-foreground"
                  )} />
                  {!isCollapsed && (
                    <span className={cn(
                      "text-sm font-medium",
                      active ? "text-accent-foreground" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;