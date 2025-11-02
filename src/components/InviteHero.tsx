import React from 'react';
import { Loader2 } from 'lucide-react';

interface InviteHeroProps {
  language: 'ar' | 'en';
  teacherFullName?: string;
  teacherPhotoURL?: string;
  teacherId?: string;
  isAuthenticated?: boolean;
  onSignOutClick?: () => void;
  heroTitleAr?: string;
  heroTitleEn?: string;
  heroDescAr?: string;
  heroDescEn?: string;
}

const getInitials = (name: string) => {
  if (!name) return 'T';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'T';
};

export const InviteHero: React.FC<InviteHeroProps> = ({
  language,
  teacherFullName,
  teacherPhotoURL,
  teacherId,
  isAuthenticated,
  onSignOutClick,
  heroTitleAr,
  heroTitleEn,
  heroDescAr,
  heroDescEn,
}) => {
  const titleArDefault = <>منصة <span className="text-blue-600">منارة</span> الأكاديمية</>;
  const titleEnDefault = <>Manara <span className="text-blue-600">Academy</span> Platform</>;
  const descArDefault = 'منصة متكاملة بها كل ما يحتاجه الطالب للتفوق';
  const descEnDefault = 'A complete platform with everything students need to excel';

  const titleNode = language === 'ar'
    ? (heroTitleAr ? <>{heroTitleAr}</> : titleArDefault)
    : (heroTitleEn ? <>{heroTitleEn}</> : titleEnDefault);

  const descText = language === 'ar'
    ? (heroDescAr || descArDefault)
    : (heroDescEn || descEnDefault);

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: illustration / photo */}
        <div className="order-2 md:order-1 flex justify-center md:justify-start">
          <div className="relative w-72 h-72 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-blue-200">
            {teacherPhotoURL ? (
              <img src={teacherPhotoURL} alt={teacherFullName || 'Teacher'} className="w-64 h-64 object-cover rounded-full" />
            ) : (
              <div className="w-64 h-64 rounded-full bg-blue-500 text-white flex items-center justify-center text-5xl font-extrabold">
                {getInitials(teacherFullName || (language === 'ar' ? 'الأستاذ' : 'Teacher'))}
              </div>
            )}
            <span className="absolute -top-2 -left-2 bg-white text-blue-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'دعوة' : 'Invite'}</span>
            <span className="absolute -bottom-2 -right-2 bg-white text-indigo-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'انضم' : 'Join'}</span>
          </div>
        </div>

        {/* Right: headline + description + CTAs */}
        <div className={`${language === 'ar' ? 'text-right' : 'text-left'} order-1 md:order-2`}>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            {titleNode}
          </h1>
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
            {descText}
          </p>
          <div className={`flex flex-col sm:flex-row ${language === 'ar' ? 'justify-end' : 'justify-start'} items-center gap-4`}>
            {/* Conditional CTA buttons based on login state */}
            {!isAuthenticated ? (
              <>
                <a
                  href={teacherId ? '/register/student?teacherId=' + teacherId : '/register/student'}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {language === 'ar' ? 'اعمل حساب جديد' : 'Create New Account'}
                </a>
                <a
                  href={teacherId ? '/student-login?teacherId=' + teacherId : '/student-login'}
                  className="inline-block bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {language === 'ar' ? 'سجل دخولك' : 'Sign In'}
                </a>
              </>
            ) : (
              <>
                <a
                  href={'/dashboard'}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {language === 'ar' ? 'تصفح كورساتك' : 'Browse Your Courses'}
                </a>
                <button
                  onClick={onSignOutClick}
                  className="inline-flex items-center bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Loader2 className="w-4 h-4 mr-2 hidden" />
                  {language === 'ar' ? 'تسجيل خروج' : 'Sign Out'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InviteHero;