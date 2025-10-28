import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, CheckCircle } from "lucide-react";
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
    <div className="min-h-screen flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
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
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPassword;