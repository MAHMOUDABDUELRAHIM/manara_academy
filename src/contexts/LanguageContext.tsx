import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation object
const translations = {
  ar: {
    // Header
    home: 'الرئيسية',
    login: 'تسجيل الدخول',
    
    // Login Page
    loginTitle: 'تسجيل الدخول إلى حسابك',
    loginDescription: 'أدخل بياناتك للوصول إلى حسابك',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginButton: 'تسجيل الدخول',
    orContinueWith: 'أو تابع مع',
    google: 'جوجل',
    facebook: 'فيسبوك',
    dontHaveAccount: 'ليس لديك حساب؟',
    registerAsStudent: 'التسجيل كطالب',
    registerAsTeacher: 'التسجيل كمعلم',
    
    // Student Registration
    studentRegisterTitle: 'التسجيل كطالب',
    studentRegisterDescription: 'أنشئ حساب الطالب الخاص بك لبدء التعلم',
    fullName: 'الاسم الكامل',
    confirmPassword: 'تأكيد كلمة المرور',
    teacherId: 'معرف المعلم',
    teacherIdRequired: 'مطلوب للربط مع المعلم',
    register: 'تسجيل',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    
    // Teacher Registration
    teacherRegisterTitle: 'التسجيل كمعلم',
    teacherRegisterDescription: 'انضم إلى مجتمع المعلمين وابدأ في مشاركة معرفتك',
    subjectSpecialization: 'التخصص الموضوعي',
    paymentEmail: 'بريد الدفع (PayPal)',
    selectSubject: 'اختر تخصصك الموضوعي',
    enterPaypalEmail: 'أدخل بريد PayPal الخاص بك',
    teacherSubscriptionNote: 'يجب على المعلمين الاشتراك لتفعيل نشر الدورات. ستتمكن من إعداد اشتراكك بعد إكمال التسجيل',
    
    // Subject Specializations
    mathematics: 'الرياضيات',
    physics: 'الفيزياء',
    chemistry: 'الكيمياء',
    biology: 'الأحياء',
    computerScience: 'علوم الحاسوب',
    englishLanguage: 'اللغة الإنجليزية',
    arabicLanguage: 'اللغة العربية',
    history: 'التاريخ',
    geography: 'الجغرافيا',
    economics: 'الاقتصاد',
    philosophy: 'الفلسفة',
    psychology: 'علم النفس',
    artDesign: 'الفن والتصميم',
    music: 'الموسيقى',
    physicalEducation: 'التربية البدنية',
    other: 'أخرى',
    
    // Password Strength Indicator
    passwordStrength: 'قوة كلمة المرور',
    passwordStrengthVeryWeak: 'ضعيفة جداً',
    passwordStrengthWeak: 'ضعيفة',
    passwordStrengthFair: 'متوسطة',
    passwordStrengthGood: 'جيدة',
    passwordStrengthStrong: 'قوية',
    passwordRequirements: 'متطلبات كلمة المرور:',
    passwordRequirementMinLength: 'على الأقل 8 أحرف',
    passwordRequirementHasUppercase: 'حرف كبير واحد على الأقل',
    passwordRequirementHasLowercase: 'حرف صغير واحد على الأقل',
    passwordRequirementHasNumber: 'رقم واحد على الأقل',
    passwordRequirementHasSpecialChar: 'رمز خاص واحد على الأقل (!@#$%^&*)',
    registerAsTeacherButton: 'التسجيل كمعلم',
    
    // Forgot Password
    resetPasswordTitle: 'إعادة تعيين كلمة المرور',
    resetPasswordDescription: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور',
    resetPasswordSuccessDescription: 'تم إرسال رابط إعادة التعيين بنجاح',
    sendResetLink: 'إرسال رابط الإعادة',
    resetLinkSent: 'تم إرسال رابط إعادة تعيين كلمة المرور!',
    checkEmailInstructions: 'تحقق من بريدك الإلكتروني واتبع التعليمات لإعادة تعيين كلمة المرور',
    sendAnotherLink: 'إرسال رابط آخر',
    rememberPassword: 'تذكرت كلمة المرور؟',
    backToLogin: 'العودة لتسجيل الدخول',
    emailRequired: 'البريد الإلكتروني مطلوب',
    invalidEmail: 'البريد الإلكتروني غير صحيح',
    
    // Form Placeholders
    enterFullName: 'أدخل اسمك الكامل',
    enterEmail: 'أدخل بريدك الإلكتروني',
    enterPassword: 'أدخل كلمة المرور',
    createPassword: 'أنشئ كلمة مرور',
    confirmYourPassword: 'أكد كلمة المرور',
    createStrongPassword: 'أنشئ كلمة مرور قوية',
    enterTeacherId: 'أدخل معرف المعلم',
    
    // Hero Section
    heroTitle: 'حوّل تجربة التعلم الخاصة بك',
    heroDescription: 'تواصل مع المعلمين الخبراء واكتشف الدورات التي تناسب شغفك. ابدأ رحلتك اليوم.',
    registerStudent: 'التسجيل كطالب',
    registerTeacher: 'التسجيل كمعلم',
    
    // Features Section
    featuresTitle: 'لماذا تختار منارة الأكاديمية؟',
    featuresDescription: 'اكتشف الميزات التي تجعلنا المنصة التعليمية الرائدة',
    interactiveLearning: 'التعلم التفاعلي',
    interactiveLearningDesc: 'تفاعل مع الدورات الديناميكية المصممة لجميع أساليب التعلم',
    expertTeachers: 'معلمون خبراء',
    expertTeachersDesc: 'تعلم من المعلمين المعتمدين ذوي سنوات من الخبرة',
    certifications: 'الشهادات',
    certificationsDesc: 'احصل على شهادات معترف بها عند إكمال الدورة',
    trackProgress: 'تتبع التقدم',
    trackProgressDesc: 'راقب رحلة التعلم الخاصة بك مع التحليلات التفصيلية',
    
    // How It Works Section
    howItWorksTitle: 'كيف يعمل',
    howItWorksDescription: 'ابدأ في أربع خطوات بسيطة',
    createAccount: 'إنشاء حساب',
    createAccountDesc: 'سجل كطالب أو معلم في ثوانٍ',
    choosePath: 'اختر مسارك',
    choosePathDesc: 'تصفح الدورات أو أنشئ المحتوى الخاص بك',
    startLearning: 'ابدأ التعلم',
    startLearningDesc: 'تفاعل مع الدروس والمواد التفاعلية',
    achieveGoals: 'حقق أهدافك',
    achieveGoalsDesc: 'أكمل الدورات واحصل على الشهادات',
    
    // Testimonials Section
    testimonialsTitle: 'ما يقوله مجتمعنا',
    testimonialsDescription: 'قصص حقيقية من الطلاب والمعلمين',
    
    // Pricing Section
    pricingTitle: 'خطط أسعار المعلمين',
    pricingDescription: 'اختر الخطة المثالية لرحلة التدريس الخاصة بك',
    mostPopular: 'الأكثر شعبية',
    getStarted: 'ابدأ الآن',
    
    // Plan Features
    upTo3Courses: 'حتى 3 دورات',
    basicAnalytics: 'تحليلات أساسية',
    
    // Dashboard
    dashboard: 'لوحة التحكم',
    welcomeBack: 'مرحباً بعودتك',
    myCourses: 'دوراتي',
    catalog: 'الكتالوج',
    profileSettings: 'إعدادات الملف الشخصي',
    support: 'الدعم',
    navigation: 'التنقل',
    notifications: 'الإشعارات',
    student: 'طالب',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    
    // Dashboard Stats
    totalCoursesEnrolled: 'إجمالي الدورات المسجلة',
    coursesInProgress: 'الدورات قيد التقدم',
    completedCourses: 'الدورات المكتملة',
    
    // Course Actions
    continue: 'متابعة',
    exploreCatalog: 'استكشف الكتالوج',
    
    // Notifications
    newCourseAvailable: 'دورة جديدة متاحة',
    checkOutNewCourse: 'تحقق من الدورة الجديدة في الرياضيات',
    assignmentDue: 'موعد تسليم الواجب',
    mathAssignmentDue: 'واجب الرياضيات مستحق غداً',
    courseCompleted: 'تم إكمال الدورة',
    congratulationsPhysics: 'تهانينا! لقد أكملت دورة الفيزياء',
    viewAllNotifications: 'عرض جميع الإشعارات',
    hoursAgo: 'ساعات مضت',
    dayAgo: 'يوم مضى',
    daysAgo: 'أيام مضت',
    
    // Course Progress
    progress: 'التقدم',
    completed: 'مكتمل',
    emailSupport: 'دعم البريد الإلكتروني',
    certificateCompletion: 'شهادة إتمام',
    unlimitedCourses: 'دورات غير محدودة',
    advancedAnalytics: 'تحليلات متقدمة',
    prioritySupport: 'دعم أولوية',
    customBranding: 'علامة تجارية مخصصة',
    studentManagement: 'إدارة الطلاب',
    everythingInPro: 'كل شيء في البرو',
    apiAccess: 'وصول API',
    dedicatedSupport: 'دعم مخصص',
    customIntegrations: 'تكاملات مخصصة',
    whiteLabelSolution: 'حل العلامة البيضاء'
  },
  en: {
    // Header
    home: 'Home',
    login: 'Login',
    
    // Login Page
    loginTitle: 'Login to your account',
    loginDescription: 'Enter your credentials to access your account',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    loginButton: 'Login',
    orContinueWith: 'Or continue with',
    google: 'Google',
    facebook: 'Facebook',
    dontHaveAccount: "Don't have an account?",
    registerAsStudent: 'Register as Student',
    registerAsTeacher: 'Register as Teacher',
    
    // Student Registration
    studentRegisterTitle: 'Register as a Student',
    studentRegisterDescription: 'Create your student account to start learning',
    fullName: 'Full Name',
    confirmPassword: 'Confirm Password',
    teacherId: 'Teacher ID',
    teacherIdRequired: 'Required to link with teacher',
    register: 'Register',
    alreadyHaveAccount: 'Already have an account?',
    
    // Teacher Registration
    teacherRegisterTitle: 'Register as a Teacher',
    teacherRegisterDescription: 'Join our community of educators and start sharing your knowledge',
    subjectSpecialization: 'Subject Specialization',
    paymentEmail: 'Payment Email (PayPal)',
    selectSubject: 'Select your subject specialization',
    enterPaypalEmail: 'Enter your PayPal email',
    teacherSubscriptionNote: 'Important: Teachers must subscribe to activate course publishing. You\'ll be able to set up your subscription after completing registration.',
    registerAsTeacherButton: 'Register as Teacher',
    
    // Subject Specializations
    mathematics: 'Mathematics',
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
    computerScience: 'Computer Science',
    englishLanguage: 'English Language',
    arabicLanguage: 'Arabic Language',
    history: 'History',
    geography: 'Geography',
    economics: 'Economics',
    philosophy: 'Philosophy',
    psychology: 'Psychology',
    artDesign: 'Art & Design',
    music: 'Music',
    physicalEducation: 'Physical Education',
    other: 'Other',
    
    // Password Strength Indicator
    passwordStrength: 'Password Strength',
    passwordStrengthVeryWeak: 'Very Weak',
    passwordStrengthWeak: 'Weak',
    passwordStrengthFair: 'Fair',
    passwordStrengthGood: 'Good',
    passwordStrengthStrong: 'Strong',
    passwordRequirements: 'Password Requirements:',
    passwordRequirementMinLength: 'At least 8 characters',
    passwordRequirementHasUppercase: 'At least one uppercase letter',
    passwordRequirementHasLowercase: 'At least one lowercase letter',
    passwordRequirementHasNumber: 'At least one number',
    passwordRequirementHasSpecialChar: 'At least one special character (!@#$%^&*)',
    
    // Forgot Password
    resetPasswordTitle: 'Reset your password',
    resetPasswordDescription: 'Enter your email and we\'ll send you a password reset link',
    resetPasswordSuccessDescription: 'Password reset link has been sent successfully',
    sendResetLink: 'Send Reset Link',
    resetLinkSent: 'Password reset link has been sent!',
    checkEmailInstructions: 'Check your email and follow the instructions to reset your password',
    sendAnotherLink: 'Send Another Link',
    rememberPassword: 'Remember your password?',
    backToLogin: 'Back to Login',
    emailRequired: 'Email is required',
    invalidEmail: 'Invalid email address',
    
    // Form Placeholders
    enterFullName: 'Enter your full name',
    enterEmail: 'Enter your email',
    enterPassword: 'Enter your password',
    createPassword: 'Create a password',
    confirmYourPassword: 'Confirm your password',
    createStrongPassword: 'Create a strong password',
    enterTeacherId: 'Enter teacher ID',
    
    // Hero Section
    heroTitle: 'Transform Your Learning Experience',
    heroDescription: 'Connect with expert teachers and discover courses that match your passion. Start your journey today.',
    registerStudent: 'Register as Student',
    registerTeacher: 'Register as Teacher',
    
    // Features Section
    featuresTitle: 'Why Choose Manara Academy?',
    featuresDescription: 'Discover the features that make us the leading educational platform',
    interactiveLearning: 'Interactive Learning',
    interactiveLearningDesc: 'Engage with dynamic courses designed for all learning styles',
    expertTeachers: 'Expert Teachers',
    expertTeachersDesc: 'Learn from certified educators with years of experience',
    certifications: 'Certifications',
    certificationsDesc: 'Earn recognized certificates upon course completion',
    trackProgress: 'Track Progress',
    trackProgressDesc: 'Monitor your learning journey with detailed analytics',
    
    // How It Works Section
    howItWorksTitle: 'How It Works',
    howItWorksDescription: 'Get started in four simple steps',
    createAccount: 'Create Account',
    createAccountDesc: 'Sign up as a student or teacher in seconds',
    choosePath: 'Choose Your Path',
    choosePathDesc: 'Browse courses or create your own content',
    startLearning: 'Start Learning',
    startLearningDesc: 'Engage with interactive lessons and materials',
    achieveGoals: 'Achieve Goals',
    achieveGoalsDesc: 'Complete courses and earn certificates',
    
    // Testimonials Section
    testimonialsTitle: 'What Our Community Says',
    testimonialsDescription: 'Real stories from students and teachers',
    
    // Pricing Section
    pricingTitle: 'Teacher Pricing Plans',
    pricingDescription: 'Choose the perfect plan for your teaching journey',
    mostPopular: 'Most Popular',
    getStarted: 'Get Started',
    
    // Plan Features
    upTo3Courses: 'Up to 3 courses',
    basicAnalytics: 'Basic analytics',
    
    // Dashboard
    dashboard: 'Dashboard',
    welcomeBack: 'Welcome back',
    myCourses: 'My Courses',
    catalog: 'Catalog',
    profileSettings: 'Profile Settings',
    support: 'Support',
    navigation: 'Navigation',
    notifications: 'Notifications',
    student: 'Student',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    
    // Dashboard Stats
    totalCoursesEnrolled: 'Total Courses Enrolled',
    coursesInProgress: 'Courses in Progress',
    completedCourses: 'Completed Courses',
    
    // Course Actions
    continue: 'Continue',
    exploreCatalog: 'Explore Catalog',
    
    // Notifications
    newCourseAvailable: 'New Course Available',
    checkOutNewCourse: 'Check out the new Mathematics course',
    assignmentDue: 'Assignment Due',
    mathAssignmentDue: 'Math assignment is due tomorrow',
    courseCompleted: 'Course Completed',
    congratulationsPhysics: 'Congratulations! You completed Physics course',
    viewAllNotifications: 'View All Notifications',
    hoursAgo: 'hours ago',
    dayAgo: 'day ago',
    daysAgo: 'days ago',
    
    // Course Progress
    progress: 'Progress',
    completed: 'Completed',
    emailSupport: 'Email support',
    certificateCompletion: 'Certificate of completion',
    unlimitedCourses: 'Unlimited courses',
    advancedAnalytics: 'Advanced analytics',
    prioritySupport: 'Priority support',
    customBranding: 'Custom branding',
    studentManagement: 'Student management',
    everythingInPro: 'Everything in Pro',
    apiAccess: 'API access',
    dedicatedSupport: 'Dedicated support',
    customIntegrations: 'Custom integrations',
    whiteLabelSolution: 'White-label solution'
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ar' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Update document direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  useEffect(() => {
    // Set initial direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}