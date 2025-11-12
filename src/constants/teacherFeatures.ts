export interface TeacherFeatureSection {
  id: string;
  labelAr: string;
  labelEn: string;
}

export interface TeacherFeature {
  id: string;
  labelAr: string;
  labelEn: string;
  paths: string[];
  sections: TeacherFeatureSection[];
}

// Central catalog of teacher dashboard features/pages
export const TEACHER_FEATURES: TeacherFeature[] = [
  {
    id: 'dashboard',
    labelAr: 'لوحة التحكم',
    labelEn: 'Dashboard',
    paths: ['/teacher', '/teacher-dashboard'],
    sections: [
      { id: 'stats', labelAr: 'إحصائيات', labelEn: 'Stats' },
      { id: 'welcome', labelAr: 'ترحيب', labelEn: 'Welcome' },
      { id: 'quick-actions', labelAr: 'إجراءات سريعة', labelEn: 'Quick Actions' },
      { id: 'courses-preview', labelAr: 'معاينة الدورات', labelEn: 'Courses Preview' }
    ]
  },
  {
    id: 'my-courses',
    labelAr: 'دوراتي',
    labelEn: 'My Courses',
    paths: ['/teacher/courses', '/teacher-dashboard/courses'],
    sections: [
      { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
      { id: 'stats-cards', labelAr: 'بطاقات الإحصائيات', labelEn: 'Stats Cards' },
      { id: 'courses-list', labelAr: 'قائمة الدورات', labelEn: 'Courses List' },
      { id: 'create-button', labelAr: 'زر إنشاء دورة', labelEn: 'Create Button' }
    ]
  },
  {
    id: 'create-course',
    labelAr: 'إنشاء كورس',
    labelEn: 'Create Course',
    paths: ['/teacher/create-course', '/teacher-dashboard/create-course'],
    sections: [
      { id: 'basic-info', labelAr: 'معلومات أساسية', labelEn: 'Basic Info' },
      { id: 'content-builder', labelAr: 'بناء المحتوى', labelEn: 'Content Builder' },
      { id: 'publish-controls', labelAr: 'نشر وحفظ', labelEn: 'Publish & Save' }
    ]
  },
  {
    id: 'invite-students',
    labelAr: 'ادارة وتخصيص المنصة',
    labelEn: 'Platform Management and Customization',
    paths: ['/teacher/invite-students', '/teacher-dashboard/invite-students'],
    sections: [
      { id: 'invitation-link', labelAr: 'رابط الدعوة', labelEn: 'Invitation Link' },
      { id: 'copy-actions', labelAr: 'نسخ ومشاركة', labelEn: 'Copy & Share' },
      { id: 'customization', labelAr: 'تخصيص المنصة', labelEn: 'Platform Customization' }
    ]
  },
  {
    id: 'payouts',
    labelAr: 'المدفوعات',
    labelEn: 'Payouts',
    paths: ['/teacher/payouts', '/teacher-dashboard/payouts'],
    sections: [
      { id: 'summary', labelAr: 'ملخص الأرباح', labelEn: 'Earnings Summary' },
      { id: 'transactions', labelAr: 'المعاملات', labelEn: 'Transactions' },
      { id: 'withdraw', labelAr: 'السحب', labelEn: 'Withdraw' }
    ]
  },
  {
    id: 'assessments',
    labelAr: 'الامتحانات والواجبات',
    labelEn: 'Assessments',
    paths: ['/teacher/assessments', '/teacher-dashboard/assessments'],
    sections: [
      { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
      { id: 'create', labelAr: 'إنشاء تقييم', labelEn: 'Create Assessment' },
      { id: 'grading', labelAr: 'تصحيح وتقييم', labelEn: 'Grading' }
    ]
  }
];

// Helper to resolve current feature id by pathname
export function getFeatureIdByPath(pathname: string): string | null {
  // Normalize trailing slash
  const p = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  for (const f of TEACHER_FEATURES) {
    if (f.paths.some((x) => p === x || p.startsWith(x + '/'))) {
      return f.id;
    }
  }
  return null;
}