import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Camera, 
  Mail, 
  Lock, 
  CreditCard,
  ChevronDown,
  Upload,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  Phone,
  Receipt,
  Wallet,
  Loader2
} from "lucide-react";
import { auth } from "@/firebase/config";
import { updateProfile, updatePassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { toast } from "sonner";
import { StudentService } from "@/services/studentService";
import { TeacherService } from "@/services/teacherService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProfileDropdownProps {
  studentName: string;
  studentAvatar?: string;
  teacherId?: string;
}

interface Payment {
  id: string;
  courseTitle: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export const ProfileDropdown = ({ studentName, studentAvatar, teacherId }: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRTL, setIsRTL] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Detect document direction to position dropdown correctly within viewport
    if (typeof document !== 'undefined') {
      const dir = document.documentElement.getAttribute('dir') || 'ltr';
      setIsRTL(dir.toLowerCase() === 'rtl');
    }
  }, []);

  // Fetch student's phone from Firestore
  useEffect(() => {
    const fetchStudentPhone = async () => {
      const uid = user?.uid || auth.currentUser?.uid;
      if (!uid) return;
      try {
        const student = await StudentService.getStudentByUid(uid);
        if (student && student.studentPhone) {
          setProfileForm(prev => ({ ...prev, phone: student.studentPhone || '' }));
        }
      } catch (error) {
        console.error('Failed to fetch student phone', error);
      }
    };
    fetchStudentPhone();
  }, [user?.uid]);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: studentName,
    email: auth.currentUser?.email || '',
    phone: '', // Student's own phone number
    avatar: studentAvatar || ''
  });

  // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState(studentName);
  const [tempPhone, setTempPhone] = useState('');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Mock payments data
  const [payments] = useState<Payment[]>([
    {
      id: '1',
      courseTitle: 'دورة البرمجة الأساسية',
      amount: 299,
      date: '2024-01-15',
      status: 'completed'
    },
    {
      id: '2',
      courseTitle: 'دورة التصميم الجرافيكي',
      amount: 399,
      date: '2024-01-10',
      status: 'completed'
    },
    {
      id: '3',
      courseTitle: 'دورة التسويق الرقمي',
      amount: 199,
      date: '2024-01-05',
      status: 'pending'
    }
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileForm(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Update Auth profile
        await updateProfile(user, {
          displayName: profileForm.displayName,
          photoURL: profileForm.avatar
        });
        // Update Firestore student profile
        await StudentService.updateStudentProfile(user.uid, {
          fullName: profileForm.displayName,
          studentPhone: profileForm.phone,
          photoURL: profileForm.avatar
        });
        toast.success('تم تحديث الملف الشخصي بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ في تحديث الملف الشخصي');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEditName = () => {
    setTempDisplayName(profileForm.displayName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    setProfileForm(prev => ({ ...prev, displayName: tempDisplayName }));
    setIsEditingName(false);
    toast.success('تم تحديث اسم المستخدم');
  };

  const handleCancelEditName = () => {
    setTempDisplayName(profileForm.displayName);
    setIsEditingName(false);
  };

  const handleEditPhone = () => {
    setTempPhone(profileForm.phone);
    setIsEditingPhone(true);
  };

  const handleSavePhone = () => {
    setProfileForm(prev => ({ ...prev, phone: tempPhone }));
    setIsEditingPhone(false);
    toast.success('تم تحديث رقم الهاتف');
  };

  const handleCancelEditPhone = () => {
    setTempPhone(profileForm.phone);
    setIsEditingPhone(false);
  };

  const handlePasswordReset = async () => {
    setIsSendingReset(true);
    setResetSent(false);
    try {
      const user = auth.currentUser;
      if (user?.email) {
        await sendPasswordResetEmail(auth, user.email);
        setResetSent(true);
        toast.success('تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني');
      }
    } catch (error) {
      toast.error('حدث خطأ في إرسال رابط تغيير كلمة المرور');
    } finally {
      setIsSendingReset(false);
    }
  };

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">فاشل</Badge>;
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    try {
      const currentUid = auth.currentUser?.uid || null;
      let teacherId: string | null = null;
      if (currentUid) {
        try {
          const teacher = await TeacherService.getTeacherForStudent(currentUid);
          teacherId = teacher?.id || null;
        } catch (e) {
          // ignore linking errors
        }
      }
      await signOut(auth);
      if (teacherId) {
        navigate(`/invite/${teacherId}`);
      } else {
        navigate('/student-login');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  // زر الانتقال إلى صفحة الدعوة (الصفحة الرئيسية)
  const handleGoToInvite = () => {
    try {
      const id = teacherId || localStorage.getItem('teacherId') || '';
      if (id) {
        navigate(`/invite/${id}`);
        setIsOpen(false);
      } else {
        toast.error('لا يوجد معرف معلم للتوجيه');
      }
    } catch (e) {
      toast.error('فشل التوجيه إلى الصفحة الرئيسية');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
          {profileForm.avatar ? (
            <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-gray-600" />
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} mt-2 w-96 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50`}>
          <div className="p-4">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'profile' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                الملف الشخصي
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'payments' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="h-4 w-4 inline mr-2" />
                المدفوعات
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mx-auto">
                      {profileForm.avatar ? (
                        <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-gray-600" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Profile Form */}
                <div className="space-y-4">
                  {/* Username Field */}
                  <div>
                    <Label htmlFor="displayName" className="text-sm font-medium">اسم المستخدم</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingName ? (
                        <>
                          <Input
                            value={tempDisplayName}
                            onChange={(e) => setTempDisplayName(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveName}
                            className="p-2"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditName}
                            className="p-2"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            value={profileForm.displayName}
                            disabled
                            className="flex-1 bg-gray-50"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditName}
                            className="p-2"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                  </div>

                  {/* Phone Field */}
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">رقم الهاتف</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingPhone ? (
                        <>
                          <Input
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            placeholder="أدخل رقم هاتفك"
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSavePhone}
                            className="p-2"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditPhone}
                            className="p-2"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            value={profileForm.phone || 'لم يتم إضافة رقم هاتف'}
                            disabled
                            className="flex-1 bg-gray-50"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditPhone}
                            className="p-2"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                 {/* Actions */}
                 <div className="mt-6 space-y-2">
                   <Button onClick={handleGoToInvite} variant="outline" className="w-full">
                     الصفحة الرئيسية
                   </Button>
                   <Button onClick={handleProfileUpdate} className="w-full" disabled={isSavingProfile}>
                     {isSavingProfile ? (
                       <span className="inline-flex items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> جاري حفظ التغييرات
                       </span>
                     ) : (
                       'حفظ التغييرات'
                     )}
                   </Button>
                   <Button onClick={handlePasswordReset} variant="outline" className="w-full" disabled={isSendingReset}>
                     {isSendingReset ? (
                       <span className="inline-flex items-center gap-2">
                         <Loader2 className="h-4 w-4 animate-spin" /> جاري إرسال رابط تغيير كلمة السر
                       </span>
                     ) : (
                       'تغيير كلمة السر'
                     )}
                   </Button>
                   {resetSent && (
                     <p className="text-green-600 text-sm text-center">تم إرسال رابط تغيير كلمة السر إلى بريدك</p>
                   )}
                   <Button onClick={handleLogout} variant="destructive" className="w-full">
                     تسجيل الخروج
                   </Button>
                 </div>
               </div>
             )}

             {/* Payments Tab */}
             {activeTab === 'payments' && (
               <div className="space-y-4">
                 {payments.length > 0 ? (
                   <>
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-semibold text-gray-900">سجل المدفوعات</h3>
                       <Receipt className="h-5 w-5 text-gray-500" />
                     </div>
                     <div className="space-y-3 max-h-64 overflow-y-auto">
                       {payments.map((payment) => (
                         <div key={payment.id} className="bg-gray-50 rounded-lg p-3 border">
                           <div className="flex items-center justify-between mb-2">
                             <h4 className="font-medium text-gray-900 text-sm">{payment.courseTitle}</h4>
                             {getStatusBadge(payment.status)}
                           </div>
                           <div className="flex items-center justify-between text-sm text-gray-600">
                             <span className="flex items-center gap-1">
                               <CreditCard className="h-4 w-4" />
                               {payment.amount} ريال
                             </span>
                             <span>{new Date(payment.date).toLocaleDateString('ar-SA')}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                     <div className="pt-3 border-t">
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-gray-600">إجمالي المدفوعات:</span>
                         <span className="font-semibold text-gray-900">
                           {payments.reduce((total, payment) => total + payment.amount, 0)} ريال
                         </span>
                       </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-center py-8">
                     <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                       <Wallet className="h-8 w-8 text-gray-400" />
                     </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مدفوعات</h3>
                     <p className="text-gray-500 text-sm">خزينة المدفوعات فارغة</p>
                     <p className="text-gray-400 text-xs mt-1">ستظهر هنا مدفوعاتك عند شراء الكورسات</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;

// إزالة الدالة العالمية الخاطئة وإبقاء التصدير فقط