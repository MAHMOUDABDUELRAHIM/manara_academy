import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { TeacherService } from "@/services/teacherService";
import { auth, db } from "@/firebase/config";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const StudentRegister = () => {
  const { language, t } = useLanguage();
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentPhone: '',
    parentPhone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [studentPhoneCountry, setStudentPhoneCountry] = useState<'SA' | 'EG'>('SA');
  const [parentPhoneCountry, setParentPhoneCountry] = useState<'SA' | 'EG'>('SA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  // Theme state loaded from teacher settings
  const [dashboardTheme, setDashboardTheme] = useState<'proA' | 'proB'>('proA');

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
        // Load theme from teacherSettings
        try {
          const settingsDoc = await getDoc(doc(db, 'teacherSettings', teacherIdParam));
          if (settingsDoc.exists()) {
            const theme = settingsDoc.data().studentDashboardTheme as 'proA' | 'proB' | undefined;
            if (theme === 'proA' || theme === 'proB') {
              setDashboardTheme(theme);
            }
          }
        } catch (e) {
          console.warn('Failed to load teacher theme for register page', e);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Normalize to E.164 based on country (moved to component scope)
  const normalizePhone = (country: 'SA' | 'EG', phone: string): string | null => {
    const raw = phone.trim().replace(/[\s-]/g, '');
    if (country === 'SA') {
      if (/^\+9665\d{8}$/.test(raw)) return raw;
      if (/^9665\d{8}$/.test(raw)) return `+${raw}`;
      if (/^05\d{8}$/.test(raw)) return `+966${raw.substring(1)}`;
      if (/^5\d{8}$/.test(raw)) return `+966${raw}`;
      return null;
    } else {
      if (/^\+201[0125]\d{8}$/.test(raw)) return raw;
      if (/^201[0125]\d{8}$/.test(raw)) return `+${raw}`;
      if (/^01[0125]\d{8}$/.test(raw)) return `+2${raw}`;
      if (/^1[0125]\d{8}$/.test(raw)) return `+201${raw}`;
      return null;
    }
  };

  const validateForm = () => {
    // Phone validation helper: Saudi and Egyptian formats
    const isValidPhone = (country: 'SA' | 'EG', phone: string) => {
      const normalized = phone.trim().replace(/[\s-]/g, '');
      if (country === 'SA') {
        // Saudi mobile: starts with 05 or +9665 followed by 8 digits
        return /^(?:\+?966|0)5\d{8}$/.test(normalized);
      } else {
        // Egyptian mobile: starts with 01 or +201 then 0/1/2/5 followed by 8 digits
        return /^(?:\+?20|0)1[0125]\d{8}$/.test(normalized);
      }
    };

    // normalizePhone moved to component scope above

    if (!formData.fullName.trim()) {
      toast.error(language === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error(language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return false;
    }
    if (!formData.studentPhone.trim()) {
      toast.error(language === 'ar' ? 'رقم هاتف الطالب مطلوب' : 'Student phone is required');
      return false;
    }
    if (!isValidPhone(studentPhoneCountry, formData.studentPhone)) {
      toast.error(language === 'ar' ? 'رقم هاتف الطالب غير صالح. استخدم صيغة السعودية أو مصر' : 'Invalid student phone number. Use Saudi or Egyptian format');
      return false;
    }
    if (!formData.parentPhone.trim()) {
      toast.error(language === 'ar' ? 'رقم هاتف ولي الأمر مطلوب' : 'Parent phone is required');
      return false;
    }
    if (!isValidPhone(parentPhoneCountry, formData.parentPhone)) {
      toast.error(language === 'ar' ? 'رقم هاتف ولي الأمر غير صالح. استخدم صيغة السعودية أو مصر' : 'Invalid parent phone number. Use Saudi or Egyptian format');
      return false;
    }
    if (!formData.password) {
      toast.error(language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // تسجيل الطالب
      // Normalize phone numbers before registering
      const normalizedStudentPhone = normalizePhone(studentPhoneCountry, formData.studentPhone);
      const normalizedParentPhone = normalizePhone(parentPhoneCountry, formData.parentPhone);
      if (!normalizedStudentPhone || !normalizedParentPhone) {
        toast.error(language === 'ar' ? 'تحقق من أرقام الهواتف' : 'Please validate phone numbers');
        setIsSubmitting(false);
        return;
      }
      const user = await register(formData.email, formData.password, {
        fullName: formData.fullName,
        role: 'student',
        studentPhone: normalizedStudentPhone,
        parentPhone: normalizedParentPhone
      });

      if (user) {
        // ربط الطالب بالمعلم إذا كان معرف المعلم متوفراً مع منع الربط المتقاطع
        if (teacherId) {
          try {
            const existingTeacher = await TeacherService.getTeacherForStudent(user.uid);
            if (existingTeacher && existingTeacher.id !== teacherId) {
              // الطالب مرتبط بمدرس آخر: منع الدخول تماماً بدون إظهار رسالة
              try {
                await signOut(auth);
              } catch {}
              navigate('/login/student');
              return;
            }
            if (!existingTeacher) {
              await TeacherService.linkStudentToTeacher(user.uid, teacherId);
              toast.success(
                language === 'ar'
                  ? `تم إنشاء الحساب بنجاح وربطه بالأستاذ ${teacherInfo?.fullName || ''}!`
                  : `Account created successfully and linked to ${teacherInfo?.fullName || 'teacher'}!`
              );
            } else {
              toast.success(
                language === 'ar'
                  ? 'تم إنشاء الحساب بنجاح!'
                  : 'Account created successfully!'
              );
            }
          } catch (linkError) {
            console.error('Error linking student to teacher:', linkError);
            toast.success(
              language === 'ar'
                ? 'تم إنشاء الحساب بنجاح!'
                : 'Account created successfully!'
            );
          }
        } else {
          toast.success(
            language === 'ar'
              ? 'تم إنشاء الحساب بنجاح!'
              : 'Account created successfully!'
          );
        }

        // الانتقال إلى داشبورد الطالب
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect');
        navigate(redirect || '/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = language === 'ar' 
        ? 'فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.' 
        : 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = language === 'ar' 
          ? 'هذا البريد مرتبط بحساب بالفعل. يرجى تسجيل الدخول.' 
          : 'This email is already registered. Please sign in instead';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = language === 'ar' 
          ? 'كلمة المرور ضعيفة جداً' 
          : 'Password is too weak';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeAccent = dashboardTheme === 'proA' ? '#3b82f6' : '#10b981';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${dashboardTheme === 'proA' ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : 'bg-gradient-to-br from-emerald-50 to-green-100'}`}>
      <div className="w-full max-w-md">
        {/* Teacher Branding Section */}
        {teacherInfo && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: `${themeAccent}20` }}>
              {teacherInfo.photoURL ? (
                <img 
                  src={teacherInfo.photoURL} 
                  alt={teacherInfo.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold" style={{ color: themeAccent }}>
                  {teacherInfo.fullName?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {teacherInfo.fullName}
            </h2>
            <p className="text-gray-600">
              {language === 'ar' 
                ? 'مرحباً بك في فصل الأستاذ' 
                : 'Welcome to the teacher\'s class'}
            </p>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {language === 'ar' ? 'إنشاء حساب طالب' : 'Create Student Account'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'أدخل بياناتك لإنشاء حسابك' 
                : 'Enter your credentials to create your account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder={language === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                  required
                />
              </div>

              {/* Student Phone */}
              <div className="space-y-2">
                <Label htmlFor="studentPhone">
                  {language === 'ar' ? 'رقم هاتف الطالب' : 'Student Phone'}
                </Label>
                <div className="flex gap-2">
                  <select
                    value={studentPhoneCountry}
                    onChange={(e) => setStudentPhoneCountry(e.target.value as 'SA' | 'EG')}
                    className="w-32 border border-gray-300 rounded-md px-2 py-2 bg-white"
                  >
                    <option value="SA">{language === 'ar' ? 'السعودية (+966)' : 'Saudi (+966)'}</option>
                    <option value="EG">{language === 'ar' ? 'مصر (+20)' : 'Egypt (+20)'}</option>
                  </select>
                  <Input
                    id="studentPhone"
                    name="studentPhone"
                    type="tel"
                    value={formData.studentPhone}
                    onChange={handleInputChange}
                    placeholder={language === 'ar' ? '05XXXXXXXX أو +9665XXXXXXXX' : '05XXXXXXXX or +9665XXXXXXXX'}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'سيتم حفظ الرقم بصيغة دولية E.164' : 'Number will be saved in E.164 international format'}
                </p>
              </div>

              {/* Parent Phone */}
              <div className="space-y-2">
                <Label htmlFor="parentPhone">
                  {language === 'ar' ? 'رقم هاتف ولي الأمر' : 'Parent Phone'}
                </Label>
                <div className="flex gap-2">
                  <select
                    value={parentPhoneCountry}
                    onChange={(e) => setParentPhoneCountry(e.target.value as 'SA' | 'EG')}
                    className="w-32 border border-gray-300 rounded-md px-2 py-2 bg-white"
                  >
                    <option value="SA">{language === 'ar' ? 'السعودية (+966)' : 'Saudi (+966)'}</option>
                    <option value="EG">{language === 'ar' ? 'مصر (+20)' : 'Egypt (+20)'}</option>
                  </select>
                  <Input
                    id="parentPhone"
                    name="parentPhone"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={handleInputChange}
                    placeholder={language === 'ar' ? '05XXXXXXXX أو +9665XXXXXXXX | 01XXXXXXXXX أو +201XXXXXXXXX' : '05XXXXXXXX or +9665XXXXXXXX | 01XXXXXXXXX or +201XXXXXXXXX'}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'حاليًا ندعم السعودية ومصر فقط' : 'Currently supporting Saudi and Egypt formats only'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || loading}
                style={{ backgroundColor: themeAccent }}
              >
                {isSubmitting || loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {language === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating Account...'}
                  </>
                ) : (
                  language === 'ar' ? 'إنشاء الحساب' : 'Create Account'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600">
              {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link
                to={`/student-login${teacherId ? `?teacherId=${teacherId}` : ''}${new URLSearchParams(location.search).get('redirect') ? `${teacherId ? '&' : '?'}redirect=${new URLSearchParams(location.search).get('redirect')}` : ''}`}
                className="hover:underline font-medium"
                style={{ color: themeAccent }}
              >
                 {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
               </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Custom Copyright Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {language === 'ar' 
              ? '© 2024 منارة الأكاديمية. جميع الحقوق محفوظة.' 
              : '© 2024 Manara Academy. All rights reserved.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;