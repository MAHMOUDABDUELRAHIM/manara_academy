import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { auth } from '@/firebase/config';
import { sendEmailVerification } from 'firebase/auth';

const TeacherRegister = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    subjectSpecialization: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const subjects = [
    { key: "mathematics", value: "Mathematics" },
    { key: "physics", value: "Physics" },
    { key: "chemistry", value: "Chemistry" },
    { key: "biology", value: "Biology" },
    { key: "computerScience", value: "Computer Science" },
    { key: "englishLanguage", value: "English Language" },
    { key: "arabicLanguage", value: "Arabic Language" },
    { key: "history", value: "History" },
    { key: "geography", value: "Geography" },
    { key: "economics", value: "Economics" },
    { key: "philosophy", value: "Philosophy" },
    { key: "psychology", value: "Psychology" },
    { key: "artDesign", value: "Art & Design" },
    { key: "music", value: "Music" },
    { key: "physicalEducation", value: "Physical Education" },
    { key: "other", value: "Other" }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.subjectSpecialization) {
      newErrors.subjectSpecialization = "Please select your subject specialization";
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
          fullName: formData.fullName,
          role: 'teacher',
          subjectSpecialization: formData.subjectSpecialization,
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
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      subjectSpecialization: value,
    });
    
    // Clear error when user selects
    if (errors.subjectSpecialization) {
      setErrors({
        ...errors,
        subjectSpecialization: "",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-heading font-bold text-center text-foreground">
              {t('teacherRegisterTitle')}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {t('teacherRegisterDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  {t('fullName')}
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder={t('enterFullName')}
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('enterEmail')}
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('createStrongPassword')}
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-destructive" : ""}
                />
                <PasswordStrengthIndicator password={formData.password} />
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t('confirmPassword')}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('confirmYourPassword')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectSpecialization" className="text-sm font-medium">
                  {t('subjectSpecialization')}
                </Label>
                <Select onValueChange={handleSelectChange} value={formData.subjectSpecialization}>
                  <SelectTrigger className={errors.subjectSpecialization ? "border-destructive" : ""}>
                    <SelectValue placeholder={t('selectSubject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.key} value={subject.value}>
                        {t(subject.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subjectSpecialization && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.subjectSpecialization}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={loading}
              >
                {loading 
                  ? (language === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...') 
                  : t('registerAsTeacherButton')
                }
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {t('alreadyHaveAccount')}{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('loginButton')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default TeacherRegister;