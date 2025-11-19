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
  const { register, loading, loginWithFacebook } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    website: "",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = language === 'ar' ? 'الاسم مطلوب' : 'Full name is required';
    }

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
        // Hint auth flow about intended role to avoid race with profile write
        try {
          localStorage.setItem('pendingRole', 'teacher');
        } catch {}

        // Register teacher with Firebase
        await register(formData.email, formData.password, {
          fullName: formData.fullName.trim(),
          role: 'teacher',
          phoneNumber: formData.phoneNumber,
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
    const nextValue = name === 'phoneNumber' ? value.replace(/[^0-9]/g, '') : value;
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
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleChange} placeholder={t('enterFullName')} className={`h-12 rounded-lg shadow-sm ${errors.fullName ? 'border-destructive' : 'border-gray-200'} bg-white`} />
                {errors.fullName && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-4 w-4" />{errors.fullName}</p>
                )}
              </div>
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
              <div>
                <Label htmlFor="phoneNumber">{t('teacherPhone')}</Label>
                <Input id="phoneNumber" name="phoneNumber" type="tel" inputMode="numeric" pattern="[0-9]*" value={formData.phoneNumber} onChange={handleChange} placeholder={t('enterTeacherPhone')} className="h-12 rounded-lg shadow-sm border-gray-200 bg-white" />
              </div>
              <div>
                <Label htmlFor="website">{language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</Label>
                <Input id="website" name="website" type="text" value={formData.website} onChange={handleChange} placeholder={language === 'ar' ? 'اختياري' : 'Optional'} className="h-12 rounded-lg shadow-sm border-gray-200 bg-white" />
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
              <div className="mt-3 flex justify-center">
                <Button type="button" variant="outline" onClick={async () => { try { await loginWithFacebook(); } catch (e) { toast.error(language === 'ar' ? 'فشل تسجيل فيسبوك' : 'Facebook sign-in failed'); }}}>
                  Facebook
                </Button>
              </div>
              <div className="mt-6">
                {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
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