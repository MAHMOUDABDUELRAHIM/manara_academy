import React, { useEffect, useState } from 'react';
import { Search, Sun, Moon, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { auth } from '@/firebase/config';
import { ProfileDropdown } from '@/components/ProfileDropdown';

interface InviteHeaderProps {
  teacherName?: string;
  teacherPhotoURL?: string;
  showProfileAvatar?: boolean;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  notifications?: any[];
  showNotifications?: boolean;
  onNotificationItemClick?: (n: any) => void;
  // added: teacherId to build invite link from dropdown
  teacherId?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function InviteHeader({ teacherName, teacherPhotoURL, showProfileAvatar = true, unreadCount = 0, onNotificationsClick, notifications = [], showNotifications = false, onNotificationItemClick, teacherId }: InviteHeaderProps) {
  const { language, setLanguage } = useLanguage();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => setIsDark((v) => !v);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const displayName = teacherName || (language === 'ar' ? 'الأستاذ' : 'Teacher');

  const studentName = auth.currentUser?.displayName
    || (auth.currentUser?.email ? String(auth.currentUser.email).split('@')[0] : (language === 'ar' ? 'الطالب' : 'Student'));
  const studentAvatar = auth.currentUser?.photoURL || '';

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Left: Teacher avatar + name */}
        <div className="flex items-center gap-3">
          {teacherPhotoURL ? (
            <img src={teacherPhotoURL} alt={displayName} className="w-10 h-10 rounded-full object-cover border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              {getInitials(displayName)}
            </div>
          )}
          <div className="leading-tight">
            <div className="font-semibold text-gray-900 dark:text-white">{displayName}</div>
          </div>
        </div>

        {/* Middle: search */}
        <div className="flex-1 hidden md:block">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              placeholder={language === 'ar' ? 'ابحث عن الدورات...' : 'Search courses...'}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right: language + theme toggle + profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label={language === 'ar' ? (isDark ? 'الوضع الفاتح' : 'الوضع الداكن') : (isDark ? 'Light mode' : 'Dark mode')}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
          >
            {isDark ? <Sun className="w-5 h-5 text-gray-700 dark:text-gray-200" /> : <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200" />}
          </button>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">🌐</span>
          </div>
          <div className="relative">
            <button
              onClick={onNotificationsClick}
              aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
            >
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {Math.min(unreadCount, 99)}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className={`absolute top-full mt-2 ${language === 'ar' ? 'left-0' : 'right-0'} w-80 max-h-[60vh] overflow-auto rounded-xl border shadow-lg bg-white dark:bg-gray-900 z-50`}>
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                    </span>
                    <button
                      className="text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={onNotificationsClick}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {(notifications || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2">
                      {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </div>
                  ) : (
                    (notifications || []).map((n: any) => (
                      <div key={n.id || `${n.title}-${n.time}`} className="p-2 rounded-lg border bg-white dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{n.title}</div>
                            <div className="text-xs text-muted-foreground">{n.message}</div>
                            {n.createdAt && (
                              <div className="text-[10px] text-gray-400 mt-1">{String(n.createdAt)}</div>
                            )}
                          </div>
                          <button
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => onNotificationItemClick && onNotificationItemClick(n)}
                          >
                            {language === 'ar' ? 'فتح' : 'Open'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {showProfileAvatar && (
            <ProfileDropdown studentName={studentName} studentAvatar={studentAvatar} teacherId={teacherId} />
          )}
        </div>
      </div>
    </header>
  );
}