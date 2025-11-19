import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, CheckCircle, Globe, BookOpen, Users, Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { language, t } = useLanguage();
  const { resetPassword, loading } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(t('emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('invalidEmail'));
      return;
    }

    try {
       await resetPassword(email);
       setIsSubmitted(true);
       toast.success(language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور' : 'Password reset link sent');
     } catch (error: any) {
       setError(language === 'ar' ? 'خطأ في إرسال رابط إعادة التعيين' : 'Failed to send reset link');
       toast.error(language === 'ar' ? 'خطأ في إرسال رابط إعادة التعيين' : 'Failed to send reset link');
     }
   };

  const handleBackToLogin = () => {
    setIsSubmitted(false);
    setEmail("");
    setError("");
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
              {language === 'ar' ? 'أعد ضبط كلمة مرورك واستعد للوصول إلى حسابك.' : 'Reset your password and regain access to your account.'}
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
                {t('resetPasswordTitle')}
              </CardTitle>
              <CardDescription className="text-center">
                {isSubmitted ? t('resetPasswordSuccessDescription') : t('resetPasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('enterEmail')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={error ? "border-destructive" : ""}
                    />
                    {error && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90" size="lg" disabled={loading}>
                    {loading ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : t('sendResetLink')}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                  <p className="text-green-600 font-medium">
                    {t('resetLinkSent')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('checkEmailInstructions')}
                  </p>
                  <Button
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="w-full"
                  >
                    {t('sendAnotherLink')}
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="text-sm text-center text-muted-foreground">
                {t('rememberPassword')}{" "}
                <Link to="/login" className="text-accent hover:underline font-medium">
                  {t('backToLogin')}
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;