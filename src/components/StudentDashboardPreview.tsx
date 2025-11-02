import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  BookOpen, 
  TrendingUp, 
  CheckCircle, 
  Bell
} from "lucide-react";

interface StudentDashboardPreviewProps {
  title?: string;
  accentColor?: string;
  logo?: string;
  brandLogoScale?: number;
  brandNameScale?: number;
}

export const StudentDashboardPreview: React.FC<StudentDashboardPreviewProps> = ({
  title = 'منصة منارة التعليمية',
  accentColor = '#3B82F6',
  logo,
  brandLogoScale = 1,
  brandNameScale = 1
}) => {
  const { language } = useLanguage();
  
  // Calculate dynamic sizes based on scale values
  const computedLogoSize = Math.round(24 * brandLogoScale); // Base size 24px (w-6 h-6)
  const computedTitleSize = Math.round(12 * brandNameScale); // Base size 12px (text-xs)
  
  const stats = {
    totalEnrolled: 8,
    inProgress: 3,
    completed: 5
  };

  const courses = [
    {
      id: '1',
      title: 'الرياضيات المتقدمة',
      progress: 75,
      totalLessons: 20,
      completedLessons: 15,
      instructor: 'د. سارة أحمد',
      category: 'رياضيات'
    },
    {
      id: '2',
      title: 'الفيزياء الحديثة',
      progress: 45,
      totalLessons: 18,
      completedLessons: 8,
      instructor: 'د. محمد علي',
      category: 'فيزياء'
    }
  ];

  const notifications = [
    {
      id: '1',
      title: 'دورة جديدة متاحة',
      message: 'تحقق من دورة البرمجة الجديدة',
      time: '2 ساعات مضت',
      type: 'info' as const
    },
    {
      id: '2',
      title: 'تم إكمال الواجب',
      message: 'تم تقييم واجب الرياضيات',
      time: '1 يوم مضى',
      type: 'success' as const
    }
  ];

  return (
    <div 
      className="w-full h-96 bg-background border rounded-lg overflow-hidden relative"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontSize: '10px' }}
    >
      {/* Overlay to prevent interactions */}
      <div className="absolute inset-0 z-50 bg-transparent cursor-default" />
      
      {/* Header */}
      <div 
        className="h-12 flex items-center justify-between px-4 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          {logo ? (
            <img 
              src={logo} 
              alt="Logo" 
              className="rounded" 
              style={{ 
                width: `${computedLogoSize}px`, 
                height: `${computedLogoSize}px` 
              }}
            />
          ) : (
            <div 
              className="bg-white/20 rounded flex items-center justify-center"
              style={{ 
                width: `${computedLogoSize}px`, 
                height: `${computedLogoSize}px` 
              }}
            >
              <BookOpen className="h-3 w-3" />
            </div>
          )}
          <span 
            className="font-bold"
            style={{ fontSize: `${computedTitleSize}px` }}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-3 w-3" />
          <div className="w-6 h-6 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto h-[calc(100%-3rem)]">
        {/* Welcome Section */}
        <div className="mb-4">
          <h1 className="text-sm font-bold text-foreground mb-1">
            {language === 'ar' ? 'مرحباً بك، أحمد محمد' : 'Welcome back, Ahmed Mohamed'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {language === 'ar' 
              ? 'استمر في رحلة التعلم واكتشف المزيد'
              : 'Continue your learning journey'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="p-2">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-xs flex items-center gap-1">
                <BookOpen className="h-2 w-2" />
                {language === 'ar' ? 'المقررات' : 'Courses'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {stats.totalEnrolled}
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-xs flex items-center gap-1">
                <TrendingUp className="h-2 w-2" />
                {language === 'ar' ? 'قيد التقدم' : 'In Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {stats.inProgress}
              </div>
            </CardContent>
          </Card>

          <Card className="p-2">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-xs flex items-center gap-1">
                <CheckCircle className="h-2 w-2" />
                {language === 'ar' ? 'مكتملة' : 'Completed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {stats.completed}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* My Courses Section */}
          <Card className="p-2">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs">
                {language === 'ar' ? 'مقرراتي' : 'My Courses'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {courses.map((course) => (
                  <div key={course.id} className="p-2 border rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-muted rounded flex items-center justify-center">
                        <BookOpen className="h-2 w-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{course.title}</h3>
                        <p className="text-xs text-muted-foreground">{course.instructor}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{course.completedLessons}/{course.totalLessons} دروس</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress 
                        value={course.progress} 
                        className="h-1"
                        style={{ 
                          '--progress-foreground': accentColor 
                        } as React.CSSProperties}
                      />
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs mt-1"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {course.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="p-2">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs flex items-center gap-1">
                <Bell className="h-2 w-2" />
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-2 border rounded text-xs">
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs truncate">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPreview;