import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Globe, BookOpen, Users, Award, TrendingUp } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { auth } from '@/firebase/config';
import { sendEmailVerification } from 'firebase/auth';

const TeacherRegister = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { register, loading, registerTeacherWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = language === 'ar' ? 'البريد الإلكتروني مطلوب' : "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = language === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح' : "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = language === 'ar' ? 'كلمة المرور مطلوبة' : "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = language === 'ar' ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' : "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = language === 'ar' ? 'يرجى تأكيد كلمة المرور' : "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = language === 'ar' ? 'كلمتا المرور غير متطابقتين' : "Passwords do not match";
    }

    if (!agree) {
      newErrors.agree = language === 'ar' ? 'يجب الموافقة على الشروط والسياسة' : "You must agree to the terms and privacy policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        try { localStorage.setItem('pendingRole', 'teacher'); } catch {}
        await register(formData.email, formData.password, {
          role: 'teacher',
        });
        
        toast.success(language === 'ar' ? 'تم إنشاء الحساب وتم تسجيل الدخول تلقائيًا' : 'Account created and logged in automatically');

        // Send Firebase verification email and navigate to verify page
        try {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
          }
        } catch (sendErr: any) {
          console.warn('Failed to send Firebase verification email. User can retry on verify page:', sendErr);
          if (sendErr?.code === 'auth/too-many-requests') {
            toast.error(language === 'ar' ? 'طلبات كثيرة. حاول لاحقاً.' : 'Too many requests. Try again later.');
          }
        }
        navigate('/verify-teacher-email');
      } catch (error: any) {
        console.error('Teacher registration error:', error);
        
        let errorMessage = language === 'ar' 
          ? 'فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.' 
          : 'Failed to create account. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = language === 'ar' 
            ? 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.' 
            : 'Email is already in use. Please use a different email or sign in.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = language === 'ar' 
            ? 'كلمة المرور ضعيفة جداً. يرجى استخدام كلمة مرور أقوى.' 
            : 'Password is too weak. Please use a stronger password.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = language === 'ar' 
            ? 'البريد الإلكتروني غير صحيح.' 
            : 'Invalid email address.';
        }
        
        toast.error(errorMessage);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = value;
    setFormData({
      ...formData,
      [name]: nextValue,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const Feature = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
    <div className="flex items-start gap-3 text-white">
      <Icon className="h-5 w-5 text-[#F59E0B]" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-white/80 text-sm">{desc}</div>
      </div>
    </div>
  );

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
              {language === 'ar' ? 'منصتك التعليمية في دقائق' : 'Your teaching platform in minutes'}
            </h2>
            <p className="text-white/80">
              {language === 'ar' ? 'أنشئ دوراتك، ادعُ طلابك، واعرض تقدمهم بسهولة.' : 'Create courses, invite students, and track progress effortlessly.'}
            </p>
            <div className="space-y-4">
              <Feature icon={BookOpen} title={language === 'ar' ? 'إنشاء الدورات' : 'Course Creation'} desc={language === 'ar' ? 'صمم دروسًا تفاعلية بمحتوى متنوع.' : 'Design interactive lessons with rich content.'} />
              <Feature icon={Users} title={language === 'ar' ? 'إدارة الطلاب' : 'Student Management'} desc={language === 'ar' ? 'ادعُ واربِط الطلاب وتابع مشاركتهم.' : 'Invite and link students, track engagement.'} />
              <Feature icon={Award} title={language === 'ar' ? 'الشهادات' : 'Certificates'} desc={language === 'ar' ? 'امنح الطلاب شهادات بعد إتمام الدورات.' : 'Award certificates upon course completion.'} />
              <Feature icon={TrendingUp} title={language === 'ar' ? 'تحليلات التقدم' : 'Progress Analytics'} desc={language === 'ar' ? 'راقب أداء طلابك عبر لوحة واضحة.' : 'Monitor student performance with clear dashboards.'} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold mb-2">{t('teacherRegisterTitle')}</h2>
            <p className="text-gray-500 mb-6">{t('teacherRegisterDescription')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder={t('enterEmail')} className={`h-12 rounded-lg shadow-sm ${errors.email ? 'border-destructive' : 'border-gray-200'} bg-white`} />
                {errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-4 w-4" />{errors.email}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} className={`h-12 rounded-lg shadow-sm ${errors.password ? 'border-destructive pr-10' : 'border-gray-200 pr-10'} bg-white`} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-4 w-4" />{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} className={`h-12 rounded-lg shadow-sm ${errors.confirmPassword ? 'border-destructive pr-10' : 'border-gray-200 pr-10'} bg-white`} />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-4 w-4" />{errors.confirmPassword}</p>
                )}
              </div>
              
              <div className="flex items-start gap-2">
                <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                <label htmlFor="agree" className="text-sm text-gray-600">
                  {language === 'ar' ? 'أوافق على ' : 'I agree to '} 
                  <a href="#" className="underline">{language === 'ar' ? 'الشروط والأحكام' : "Terms & Conditions"}</a>
                  {language === 'ar' ? ' و' : ' and '} 
                  <a href="#" className="underline">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</a>
                </label>
              </div>
              {errors.agree && (
                <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.agree}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-white">
                {t('registerAsTeacher')}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-600">
              {language === 'ar' ? 'يمكنك التسجيل أيضًا باستخدام:' : 'You can also sign up with:'}
              <div className="mt-3">
                <Button type="button" variant="outline" className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50" onClick={async () => { try { await registerTeacherWithGoogle(); toast.success(language === 'ar' ? 'تم إنشاء الحساب عبر جوجل' : 'Account created via Google'); navigate('/teacher-onboarding'); } catch (e: any) { let msg = language === 'ar' ? 'فشل التسجيل عبر جوجل' : 'Google sign-up failed'; const code = e?.code || e?.message; if (code === 'auth/operation-not-allowed') { msg = language === 'ar' ? 'مزود جوجل غير مفعّل في Firebase' : 'Google provider not enabled in Firebase'; } else if (code === 'auth/unauthorized-domain') { msg = language === 'ar' ? 'النطاق غير مصرّح به في Firebase' : 'Unauthorized domain in Firebase'; } else if (code === 'auth/popup-blocked') { msg = language === 'ar' ? 'تم حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة' : 'Popup blocked. Please allow popups'; } else if (code === 'auth/popup-closed-by-user') { msg = language === 'ar' ? 'أُغلِقت النافذة قبل الإتمام' : 'Popup closed before completing'; } else if (code === 'account_suspended') { msg = language === 'ar' ? 'تم تعليق الحساب' : 'Account suspended'; } toast.error(msg); }}}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t('google')}
                </Button>
              </div>
              <div className="mt-6">
                <Link to="/login" className="text-blue-600 hover:underline">{language === 'ar' ? 'تسجيل الدخول' : 'Log In'}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegister;