import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { auth, db } from "@/firebase/config";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

const VerifyTeacherEmail: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const email = useMemo(() => auth.currentUser?.email || "", []);
  const name = useMemo(() => (user?.profile?.fullName || auth.currentUser?.displayName || ""), [user]);

  useEffect(() => {
    // On mount: if not verified, send Firebase verification email automatically
    const init = async () => {
      if (!auth.currentUser || !email) return;
      if (auth.currentUser.emailVerified) {
        navigate('/teacher-dashboard');
        return;
      }
      try {
        setSending(true);
        await sendEmailVerification(auth.currentUser);
        toast.success(language === 'ar' ? 'تم إرسال رسالة التحقق إلى بريدك' : 'Verification email sent to your inbox');
      } catch (error: any) {
        console.error('Failed to send Firebase verification email:', error);
        let msg = language === 'ar' ? 'فشل في إرسال رسالة التحقق. حاول لاحقاً.' : 'Failed to send verification email. Please try again later.';
        if (error.code === 'auth/too-many-requests') {
          msg = language === 'ar' ? 'طلبات كثيرة. الرجاء المحاولة لاحقاً.' : 'Too many requests. Please try again later.';
        }
        toast.error(msg);
      } finally {
        setSending(false);
      }
    };
    init();
  }, [email, navigate, language]);

  // Auto-check for verification: listen to auth changes AND poll periodically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          setChecking(true);
          await currentUser.reload();
          const updated = auth.currentUser;
          if (updated?.emailVerified) {
            try {
              await updateDoc(doc(db, 'teachers', updated.uid), {
                emailVerified: true,
                emailVerifiedAt: new Date()
              });
            } catch {}
            navigate('/teacher-dashboard');
          }
        } finally {
          setChecking(false);
        }
      }
    });

    // Poll every 2s to catch external verification without state change
    const interval = setInterval(async () => {
      try {
        setChecking(true);
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            try {
              await updateDoc(doc(db, 'teachers', auth.currentUser.uid), {
                emailVerified: true,
                emailVerifiedAt: new Date()
              });
            } catch {}
            clearInterval(interval);
            navigate('/teacher-dashboard');
          }
        }
      } finally {
        setChecking(false);
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [navigate, language]);

  const resendEmail = async () => {
    if (!auth.currentUser) return;
    try {
      setSending(true);
      await sendEmailVerification(auth.currentUser);
      toast.success(language === 'ar' ? 'تم إعادة إرسال رسالة التحقق' : 'Verification email resent');
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      toast.error(language === 'ar' ? 'تعذر إعادة الإرسال، حاول لاحقاً' : 'Failed to resend, try later');
    } finally {
      setSending(false);
    }
  };

  const iVerifiedNow = async () => {
    if (!auth.currentUser) return;
    try {
      setChecking(true);
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        try {
          await updateDoc(doc(db, 'teachers', auth.currentUser.uid), {
            emailVerified: true,
            emailVerifiedAt: new Date()
          });
        } catch {}
        navigate('/teacher-dashboard');
      } else {
        toast.info(language === 'ar' ? 'لم يتم التأكيد بعد. افحص بريدك.' : 'Not verified yet. Check your inbox.');
      }
    } finally {
      setChecking(false);
    }
  };

  const resendOtp = async () => {
    if (!email || !name) return;
    setResending(true);
    try {
      await EmailVerificationService.resendOtp(email, name);
      toast.success(language === 'ar' ? 'تم إرسال رمز جديد إلى بريدك' : 'New code sent to your email');
      setOtpDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
    } catch {
      toast.error(language === 'ar' ? 'تعذر إرسال الرمز، حاول لاحقاً' : 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify Your Email'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {language === 'ar' 
              ? 'تم إرسال رسالة تحقق إلى بريدك الإلكتروني. يرجى فتحها والضغط على رابط التأكيد.'
              : 'We’ve sent a verification email to your inbox. Please open it and click the confirmation link.'
            }
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button className="w-full" onClick={resendEmail} disabled={sending}>
              {sending
                ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                : (language === 'ar' ? 'إعادة إرسال البريد' : 'Resend Email')}
            </Button>
          </div>
          {/* يتم التحقق تلقائياً وإعادة التوجيه بمجرد تأكيد البريد */}
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <p className="text-xs text-muted-foreground text-center">
            {language === 'ar' 
              ? 'لن يتم تحويلك إلى لوحة التحكم إلا بعد التأكيد عبر رابط البريد.'
              : 'You will be redirected to the dashboard once your email is verified via the link.'}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyTeacherEmail;