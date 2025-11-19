import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { TeacherService } from "@/services/teacherService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Globe, BookOpen, Users, Award, TrendingUp } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const { language, t } = useLanguage();
  const { login, loginWithGoogle, loginWithFacebook, registerTeacherWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      
      // Main login is for teachers/admins; students should use student-login via invite
      if (user?.role === 'teacher') {
        try {
          const t = await TeacherService.getTeacherByUid(user.uid);
          const completed = !!(t as any)?.onboardingCompleted;
          if (!completed) {
            navigate('/teacher-onboarding');
          } else {
            navigate('/teacher-dashboard');
          }
        } catch {
          navigate('/teacher-dashboard');
        }
      } else if (user?.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        // Redirect students to dedicated student login page
        navigate('/student-login?redirect=/dashboard');
      }
    } catch (error: any) {
      if (error.message === 'account_suspended') {
        setIsSuspended(true);
        toast.error(
          language === 'ar' 
            ? 'تم تعليق حسابك. يرجى التواصل مع الدعم الفني للمساعدة.' 
            : 'Your account has been suspended. Please contact support for assistance.'
        );
      } else if (error.message === 'account_not_available') {
        setIsUnavailable(true);
        toast.error(
          language === 'ar' 
            ? 'هذا الحساب غير متوفر. يرجى التواصل مع الدعم الفني.' 
            : 'This account is not available. Please contact support.'
        );
      } else {
        toast.error(language === 'ar' ? 'خطأ في تسجيل الدخول' : 'Login failed');
      }
    }
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      let user;
      if (provider === 'google') {
        try {
          user = await loginWithGoogle();
        } catch (err: any) {
          if (err?.message === 'account_not_available') {
            toast.error(language === 'ar' ? 'هذا الحساب غير موجود، قم بإنشاء حسابك' : 'This account does not exist, please create your account');
            return;
          } else {
            throw err;
          }
        }
      } else if (provider === 'facebook') {
        user = await loginWithFacebook();
      }
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      
      // Main login social is for teachers; students use student-login
      if (user?.role === 'teacher') {
        try {
          const t = await TeacherService.getTeacherByUid(user.uid);
          const completed = !!(t as any)?.onboardingCompleted;
          if (!completed) {
            navigate('/teacher-onboarding');
          } else {
            navigate('/teacher-dashboard');
          }
        } catch {
          navigate('/teacher-dashboard');
        }
      } else if (user?.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/student-login?redirect=/dashboard');
      }
    } catch (error: any) {
      if (error.message === 'account_suspended') {
        toast.error(
          language === 'ar' 
            ? 'تم تعليق حسابك. يرجى التواصل مع الدعم الفني للمساعدة.' 
            : 'Your account has been suspended. Please contact support for assistance.'
        );
      } else if (error.message === 'account_not_available') {
        toast.error(
          language === 'ar' 
            ? 'هذا الحساب غير موجود، قم بإنشاء حسابك' 
            : 'This account does not exist, please create your account'
        );
      } else {
        toast.error(language === 'ar' ? 'خطأ في تسجيل الدخول' : 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = language === 'ar' ? 'en' : 'ar';
            try { localStorage.setItem('language', next as any); } catch {}
            window.location.reload();
          }}
          className="flex items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          {language === 'ar' ? 'EN' : 'AR'}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        <div className="relative bg-[#0b2a56] text-white p-8 flex items-center">
          <div className="max-w-lg space-y-6">
            <h2 className="text-2xl font-bold">
              {language === 'ar' ? 'مرحباً بك في منارتك التعليمية' : 'Welcome to your teaching hub'}
            </h2>
            <p className="text-white/80">
              {language === 'ar' ? 'سجّل دخولك لتتابع طلابك ودوراتك بسهولة.' : 'Sign in to manage your students and courses easily.'}
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-[#F59E0B]" />
                <div>
                  <div className="font-semibold">{language === 'ar' ? 'دورات منظمة' : 'Organized Courses'}</div>
                  <div className="text-white/80 text-sm">{language === 'ar' ? 'إدارة الدروس والمواد بكل سهولة.' : 'Manage lessons and materials with ease.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[#F59E0B]" />
                <div>
                  <div className="font-semibold">{language === 'ar' ? 'طلابك' : 'Your Students'}</div>
                  <div className="text-white/80 text-sm">{language === 'ar' ? 'دعوة وربط وتتبع تفاعل الطلاب.' : 'Invite, link, and track student engagement.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-[#F59E0B]" />
                <div>
                  <div className="font-semibold">{language === 'ar' ? 'إنجازات وشهادات' : 'Achievements & Certificates'}</div>
                  <div className="text-white/80 text-sm">{language === 'ar' ? 'إبراز التميز ومنح شهادات الإكمال.' : 'Highlight excellence and award certificates.'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-[#F59E0B]" />
                <div>
                  <div className="font-semibold">{language === 'ar' ? 'إحصائيات مفيدة' : 'Useful Stats'}</div>
                  <div className="text-white/80 text-sm">{language === 'ar' ? 'لوحات تعرض التقدم والأداء.' : 'Dashboards showing progress and performance.'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center bg-white p-8">
          <Card className="w-full max-w-md shadow-none border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-heading font-bold text-center">
                {t('loginTitle')}
              </CardTitle>
              <CardDescription className="text-center">
                {t('loginDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {isSuspended && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd"></path>
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
            {isUnavailable && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative" role="alert">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd"></path>
                  </svg>
                  <span className="font-medium">
                    {language === 'ar' 
                      ? 'هذا الحساب غير متوفر' 
                      : 'This account is not available'}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {language === 'ar' 
                    ? 'يرجى التواصل مع الدعم الفني للمساعدة.' 
                    : 'Please contact support for assistance.'}
                </p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                 <Input
                   id="email"
                   type="email"
                   placeholder={t('enterEmail')}
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   className="h-12 rounded-lg shadow-sm border-gray-200 bg-white"
                 />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                 <Input
                   id="password"
                   type="password"
                   placeholder={t('enterPassword')}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   className="h-12 rounded-lg shadow-sm border-gray-200 bg-white"
                 />
              </div>
              
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-accent hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" size="lg" disabled={loading}>
                {loading ? (language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...') : t('loginButton')}
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
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('google')}
              </Button>
            </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-center text-muted-foreground">
                <Link to="/register/teacher" className="text-accent hover:underline font-medium">
                  {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
