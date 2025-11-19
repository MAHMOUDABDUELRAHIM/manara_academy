import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import StudentDashboardPreview from '@/components/StudentDashboardPreview';

const StudentPreview: React.FC = () => {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir="ltr">
      <DashboardHeader fixed />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        <main className="md:ml-64 flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <StudentDashboardPreview title={language === 'ar' ? 'منصة الطالب (عرض)' : 'Student Platform (Preview)'} interactive />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentPreview;