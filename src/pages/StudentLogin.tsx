import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { TeacherService } from "@/services/teacherService";
import { StudentService } from "@/services/studentService";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

const StudentLogin = () => {
  const [isSuspended, setIsSuspended] = useState(false);
  const { language, t } = useLanguage();
  const { login, loginWithGoogle, loginWithFacebook, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  // Theme state loaded from teacher settings
  const [dashboardTheme, setDashboardTheme] = useState<'proA' | 'proB'>('proA');
  // WhatsApp settings
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [showWhatsappFloat, setShowWhatsappFloat] = useState<boolean>(false);

  // استخراج معرف المعلم من الرابط
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const teacherIdFromUrl = urlParams.get('teacherId');
    
    if (teacherIdFromUrl) {
      setTeacherId(teacherIdFromUrl);
      // حفظ معرف المعلم في localStorage للاستخدام لاحقاً
      localStorage.setItem('teacherId', teacherIdFromUrl);
      
      // تحميل معلومات المعلم
      loadTeacherInfo(teacherIdFromUrl);
    } else {
      // التحقق من وجود معرف المعلم في localStorage
      const savedTeacherId = localStorage.getItem('teacherId');
      if (savedTeacherId) {
        setTeacherId(savedTeacherId);
        loadTeacherInfo(savedTeacherId);
      }
    }
  }, [location]);

  const loadTeacherInfo = async (teacherIdParam: string) => {
    try {
      const teacher = await TeacherService.getTeacherByUid(teacherIdParam);
      if (teacher) {
        setTeacherInfo(teacher);
        // WhatsApp from public teacher profile (mirrored)
        if (typeof teacher.whatsappNumber === 'string' && teacher.whatsappNumber.trim()) {
          setWhatsappNumber(teacher.whatsappNumber);
        }
        if (typeof teacher.showWhatsappFloat === 'boolean') {
          setShowWhatsappFloat(teacher.showWhatsappFloat);
        }
        // Load theme from teacherSettings
        try {
          const settingsDoc = await getDoc(doc(db, 'teacherSettings', teacherIdParam));
          if (settingsDoc.exists()) {
            const theme = settingsDoc.data().studentDashboardTheme as 'proA' | 'proB' | undefined;
            if (theme === 'proA' || theme === 'proB') {
              setDashboardTheme(theme);
            }
            // Fallback: WhatsApp from teacherSettings if not present publicly
            const sd = settingsDoc.data() as any;
            if ((!whatsappNumber || !whatsappNumber.trim()) && typeof sd?.whatsappNumber === 'string' && sd.whatsappNumber.trim()) {
              setWhatsappNumber(sd.whatsappNumber);
            }
            if (typeof sd?.showWhatsappFloat === 'boolean') {
              setShowWhatsappFloat(sd.showWhatsappFloat);
            }
          }
        } catch (e) {
          console.warn('Failed to load teacher theme for login page', e);
        }
      } else {
        toast.error(language === 'ar' ? 'المعلم غير موجود' : 'Teacher not found');
      }
    } catch (error) {
      console.error('Error loading teacher info:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل معلومات المعلم' : 'Error loading teacher info');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherId) {
      toast.error(language === 'ar' ? 'رابط الدعوة غير صحيح' : 'Invalid invitation link');
      return;
    }

    if (!formData.email.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email');
      return;
    }

    if (!formData.password.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter password');
      return;
    }

    setIsSubmitting(true);

    try {
      // تسجيل الدخول باستخدام الإيميل وكلمة المرور
      const user = await login(formData.email, formData.password);
      
      if (user && teacherId) {
        try {
          // التحقق من المدرس المرتبط حالياً بالطالب
          const existingTeacher = await TeacherService.getTeacherForStudent(user.uid);
          if (existingTeacher && existingTeacher.id !== teacherId) {
            // الطالب مرتبط بمدرس آخر: منع الدخول تماماً بدون إظهار رسالة
            try {
              await signOut(auth);
            } catch {}
            navigate('/login/student');
            return;
          }

          // الربط فقط إذا لم يكن هناك ربط سابق
          if (!existingTeacher) {
            await TeacherService.linkStudentToTeacher(user.uid, teacherId);
          }
        } catch (linkError) {
          console.error('Error linking student to teacher:', linkError);
          // تجاهل خطأ الربط لأن تسجيل الدخول نجح، مع منع أي ربط متقاطع
        }
      }

      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      navigate(redirect || '/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found') {
        toast.error(
          language === 'ar'
            ? 'لا يوجد حساب مرتبط بهذا البريد. يمكنك إنشاء حساب جديد.'
            : 'No account found for this email. You can create a new one.'
        );
      } else if (error.code === 'auth/wrong-password') {
        toast.error(language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password');
      } else if (error.code === 'auth/invalid-email') {
        toast.error(language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email');
      } else if (error.code === 'auth/user-disabled') {
        toast.error(language === 'ar' ? 'تم تعطيل هذا الحساب' : 'This account has been disabled');
      } else {
        toast.error(language === 'ar' ? 'حدث خطأ في تسجيل الدخول' : 'Login error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (!teacherId) {
      toast.error(language === 'ar' ? 'رابط الدعوة غير صحيح' : 'Invalid invitation link');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. الحصول على معلومات المعلم
      const teacher = await TeacherService.getTeacherByUid(teacherId);
      if (!teacher) {
        toast.error(language === 'ar' ? 'المعلم غير موجود' : 'Teacher not found');
        return;
      }

      // 2. تسجيل الدخول باستخدام الشبكة الاجتماعية
      let result;
      if (provider === 'google') {
        result = await loginWithGoogle();
      } else {
        result = await loginWithFacebook();
      }

      if (result) {
        // 3. التحقق من وجود ملف تعريف الطالب أو إنشاؤه
        let student = await StudentService.getStudentByUid(result.uid);
        if (!student) {
          student = await StudentService.createStudentProfile(
            result.uid,
            result.displayName || '',
            result.email || '',
            result.photoURL
          );
        }

        // 4. التحقق من الربط الحالي ومنع الربط المتقاطع
        const existingTeacher = await TeacherService.getTeacherForStudent(student.id);
        if (existingTeacher && existingTeacher.id !== teacher.id) {
          // الطالب مرتبط بمدرس آخر: منع الدخول تماماً بدون إظهار رسالة
          try {
            await signOut(auth);
          } catch {}
          navigate('/login/student');
          return;
        }

        // 5. إتمام الربط فقط إذا لم يكن هناك ربط سابق
        if (!existingTeacher) {
          await TeacherService.linkStudentToTeacher(student.id, teacherId);
        }

        toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect');
        navigate(redirect || '/dashboard');
      }

    } catch (error: any) {
      console.error('Social login error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في تسجيل الدخول' : 'Login error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeAccent = dashboardTheme === 'proA' ? '#3b82f6' : '#10b981';
  const normalizedWhatsapp = (whatsappNumber || '').replace(/[^+\d]/g, '');
  const shouldShowWhatsapp = !!showWhatsappFloat && !!normalizedWhatsapp;

  return (
    <>
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen flex items-center justify-center p-4 ${dashboardTheme === 'proA' ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : 'bg-gradient-to-br from-emerald-50 to-green-100'}`}>
      <div className="w-full max-w-md">
        {/* Teacher Branding Section */}
        {teacherInfo && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4" style={{ boxShadow: `0 0 0 6px ${themeAccent}20` }}>
              {teacherInfo.photoURL ? (
                <img 
                  src={teacherInfo.photoURL} 
                  alt={teacherInfo.fullName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${themeAccent}20` }}>
                  <span className="text-2xl font-bold" style={{ color: themeAccent }}>
                    {teacherInfo.fullName?.charAt(0) || 'T'}
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'ar' ? `فصل ${teacherInfo.fullName}` : `${teacherInfo.fullName}'s Class`}
            </h1>
            <p className="text-gray-600">
              {language === 'ar' ? 'سجل دخولك للوصول إلى المحتوى التعليمي' : 'Sign in to access your learning content'}
            </p>
          </div>
        )}
        
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {language === 'ar' ? 'تسجيل دخول الطلاب' : 'Student Login'}
            </CardTitle>
            <CardDescription className="text-center">
              {teacherInfo ? (
                <div className="space-y-2">
                  <p>{language === 'ar' ? 'مرحباً بك في فصل' : 'Welcome to'}</p>
                  <p className="font-semibold" style={{ color: themeAccent }}>{teacherInfo.fullName}</p>
                </div>
              ) : (
                language === 'ar' 
                  ? 'أدخل بياناتك للوصول إلى حسابك' 
                  : 'Enter your credentials to access your account'
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isSuspended && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">
                    {language === 'ar' 
                      ? 'تم تعليق حسابك' 
                      : 'Your account has been suspended'}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {language === 'ar' 
                    ? 'لا يمكنك تسجيل الدخول حاليًا. يرجى التواصل مع الدعم الفني للمساعدة.' 
                    : 'You cannot log in at this time. Please contact support for assistance.'}
                </p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('enterEmail')}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('enterPassword')}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: themeAccent }}>
                  {t('forgotPassword')}
                </Link>
              </div>
              
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} style={{ backgroundColor: themeAccent }}>
                {isSubmitting ? (language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...') : t('loginButton')}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isSubmitting}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('google')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isSubmitting}
              >
                <svg className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t('facebook')}
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}
              </span>
              <Link 
                to={`/register/student${teacherId ? `?teacherId=${teacherId}` : ''}${new URLSearchParams(location.search).get('redirect') ? `${teacherId ? '&' : '?'}redirect=${new URLSearchParams(location.search).get('redirect')}` : ''}`}
                className="ml-1 text-sm hover:underline" style={{ color: themeAccent }}
              >
                {language === 'ar' ? 'إنشاء حساب جديد' : 'Create new account'}
              </Link>
            </div>
          </CardFooter>
        </Card>
        
        {/* Custom Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 منارة الأكاديمية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
      {shouldShowWhatsapp && (
        <a
          href={`https://wa.me/${normalizedWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg text-white"
          aria-label={language === 'ar' ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}
    </div>
    </>
  );
};

export default StudentLogin;