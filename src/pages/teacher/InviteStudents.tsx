import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  RefreshCw, 
  Mail, 
  Users, 
  Palette, 
  Check,
  AlertCircle,
  Edit,
  X,
  UserPlus
} from 'lucide-react';
import { sendEmailVerification, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { toast } from 'sonner';


interface Student {
  id: string;
  name: string;
  email: string;
  signupDate: Date;
  lastLogin: Date;
}

export default function InviteStudents() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCustomCodeMode, setIsCustomCodeMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // New theme selection state
  const [selectedTheme, setSelectedTheme] = useState<'proA' | 'proB'>('proA');
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // Check email verification status with real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest email verification status
        await currentUser.reload();
        const updatedUser = auth.currentUser;
        
        if (updatedUser) {
          setIsEmailVerified(updatedUser.emailVerified);
          
          // If email is verified, save this status to Firestore for persistence
          if (updatedUser.emailVerified) {
            try {
              const userDocRef = doc(db, 'teachers', updatedUser.uid);
              await updateDoc(userDocRef, {
                emailVerified: true,
                emailVerifiedAt: new Date()
              });
            } catch (error) {
              console.error('Error updating email verification status:', error);
            }
          }
        }
      }
    });

    // Also check Firestore for persistent verification status
    const checkFirestoreVerification = async () => {
      try {
        const userDocRef = doc(db, 'teachers', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.emailVerified) {
            setIsEmailVerified(true);
          }
        }
      } catch (error) {
        console.error('Error checking Firestore verification:', error);
      }
    };

    checkFirestoreVerification();
    loadInvitationCode();
    // Replace old dashboard settings loader with theme loader
    loadTheme();
    loadStudents();

    return () => unsubscribe();
  }, [user]);

  // Generate unique 6-character invitation code
  const generateUniqueCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code is unique in Firestore
      try {
        const codesQuery = query(
          collection(db, 'invitationCodes'),
          where('code', '==', code)
        );
        const querySnapshot = await getDocs(codesQuery);
        isUnique = querySnapshot.empty;
      } catch (error) {
        console.error('Error checking code uniqueness:', error);
        break;
      }
    }
    
    return code;
  };

  const loadInvitationCode = async () => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'teachers', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.invitationCode) {
          setInvitationCode(userData.invitationCode);
        } else {
          // Generate new unique code for new teacher
          const newCode = await generateUniqueCode();
          setInvitationCode(newCode);
          
          // Save to user document and invitation codes collection
          await updateDoc(userDocRef, { invitationCode: newCode });
          await setDoc(doc(db, 'invitationCodes', newCode), {
            code: newCode,
            teacherId: user.uid,
            teacherName: user.displayName || user.email,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error loading invitation code:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل رمز الدعوة' : 'Error loading invitation code');
    } finally {
      setIsLoadingCode(false);
    }
  };

  // New: load theme selection from Firestore
  const loadTheme = async () => {
    if (!user) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', user.uid));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const theme = data.studentDashboardTheme as 'proA' | 'proB' | undefined;
        if (theme === 'proA' || theme === 'proB') {
          setSelectedTheme(theme);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل الثيم:', error);
    }
  };

  // New: save theme selection to Firestore
  const saveTheme = async (theme: 'proA' | 'proB') => {
    if (!user) return;
    try {
      setIsSavingTheme(true);
      setSelectedTheme(theme);
      await setDoc(
        doc(db, 'teacherSettings', user.uid),
        {
          studentDashboardTheme: theme,
          updatedAt: new Date()
        },
        { merge: true }
      );
      toast.success(language === 'ar' ? 'تم حفظ الثيم' : 'Theme saved');
    } catch (error) {
      console.error('خطأ في حفظ الثيم:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ الثيم' : 'Failed to save theme');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const loadDashboardSettings = async () => {
    if (!user) return;
    
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', user.uid));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data().studentDashboardSettings;
        if (data) {
          setDashboardSettings(data);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات لوحة التحكم:', error);
    }
  };

  const loadStudents = async () => {
    console.log('🔍 بدء تحميل الطلاب...');
    console.log('👤 المستخدم الحالي:', user);
    
    if (!user) {
      console.log('❌ لا يوجد مستخدم مسجل دخول');
      setIsLoadingStudents(false);
      return;
    }
    
    console.log('🔑 معرف المعلم:', user.uid);
    
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacherId', '==', user.uid)
      );
      
      console.log('📊 تنفيذ استعلام الطلاب...');
      const querySnapshot = await getDocs(studentsQuery);
      console.log('📋 عدد الوثائق المسترجعة:', querySnapshot.size);
      
      const studentsData: Student[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 بيانات الطالب:', doc.id, data);
        
        // التعامل مع التواريخ بطريقة آمنة
        let signupDate = new Date();
        let lastLogin = new Date();
        
        // إذا كان createdAt من نوع Timestamp
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          signupDate = data.createdAt.toDate();
        } 
        // إذا كان createdAt من نوع string
        else if (data.createdAt && typeof data.createdAt === 'string') {
          signupDate = new Date(data.createdAt);
        }
        
        // إذا كان lastLogin من نوع Timestamp
        if (data.lastLogin && typeof data.lastLogin.toDate === 'function') {
          lastLogin = data.lastLogin.toDate();
        } 
        // إذا كان lastLogin من نوع string
        else if (data.lastLogin && typeof data.lastLogin === 'string') {
          lastLogin = new Date(data.lastLogin);
        }
        // إذا كان lastActivity موجود كبديل
        else if (data.lastActivity && typeof data.lastActivity === 'string') {
          lastLogin = new Date(data.lastActivity);
        }
        
        studentsData.push({
          id: doc.id,
          name: data.displayName || data.fullName || data.name || 'غير محدد',
          email: data.email,
          signupDate,
          lastLogin
        });
      });
      
      console.log('✅ تم تحميل الطلاب بنجاح:', studentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('❌ خطأ في تحميل قائمة الطلاب:', error);
    } finally {
      setIsLoadingStudents(false);
      console.log('🏁 انتهاء تحميل الطلاب');
    }
  };

  // Save custom invitation code
  const saveCustomCode = async () => {
    if (!user || !customCode.trim()) return;
    
    // Validate code format (6 characters, alphanumeric)
    const codeRegex = /^[A-Z0-9]{6}$/;
    if (!codeRegex.test(customCode.toUpperCase())) {
      toast.error(language === 'ar' ? 'الرمز يجب أن يكون 6 أحرف أو أرقام' : 'Code must be 6 alphanumeric characters');
      return;
    }
    
    const upperCode = customCode.toUpperCase();
    
    try {
      // Check if code is already taken by another teacher
      const codesQuery = query(
        collection(db, 'invitationCodes'),
        where('code', '==', upperCode)
      );
      const querySnapshot = await getDocs(codesQuery);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        if (existingDoc.data().teacherId !== user.uid) {
          toast.error(language === 'ar' ? 'هذا الرمز مستخدم بالفعل' : 'This code is already taken');
          return;
        }
      }
      
      // Remove old code from invitation codes collection
      if (invitationCode) {
        const oldCodeDoc = doc(db, 'invitationCodes', invitationCode);
        await deleteDoc(oldCodeDoc);
      }
      
      // Save new code
      const userDocRef = doc(db, 'teachers', user.uid);
      await updateDoc(userDocRef, { invitationCode: upperCode });
      
      await setDoc(doc(db, 'invitationCodes', upperCode), {
        code: upperCode,
        teacherId: user.uid,
        teacherName: user.displayName || user.email,
        createdAt: new Date()
      });
      
      setInvitationCode(upperCode);
      setCustomCode('');
      setIsCustomCodeMode(false);
      toast.success(language === 'ar' ? 'تم حفظ الرمز بنجاح' : 'Code saved successfully');
      
    } catch (error) {
      console.error('Error saving custom code:', error);
      toast.error(language === 'ar' ? 'خطأ في حفظ الرمز' : 'Error saving code');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success(language === 'ar' ? 'تم نسخ الرمز' : 'Code copied');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في نسخ الرمز' : 'Failed to copy code');
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) return;
    
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      toast.success(language === 'ar' ? 'تم إرسال رسالة التحقق' : 'Verification email sent');
    } catch (error) {
      console.error('خطأ في إرسال رسالة التحقق:', error);
      toast.error(language === 'ar' ? 'فشل في إرسال رسالة التحقق' : 'Failed to send verification email');
    } finally {
      setIsSendingVerification(false);
    }
  };

  
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={user.displayName || 'المدرس'} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#2c4656] rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {language === 'ar' ? 'دعوة الطلاب' : 'Invite Students'}
                </h1>
                <p className="text-gray-600">
                  {language === 'ar' 
                    ? 'قم بدعوة الطلاب واختر ثيم لوحة الطالب' 
                    : 'Invite students and choose the student dashboard theme'
                  }
                </p>
              </div>
            </div>

            {/* Email Verification Message */}
            {!isEmailVerified && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">
                      {language === 'ar' 
                        ? 'تحقق من بريدك الإلكتروني لتفعيل هذه الميزة'
                        : 'Verify your email to activate this feature'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content with Disabled Effect */}
            <div className={!isEmailVerified ? 'opacity-50 pointer-events-none select-none' : ''}>
              
              {/* Invitation Code Section */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'رمز الدعوة' : 'Invitation Code'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'رابط الدعوة الخاص بك' : 'Your Invitation Link'}
                    </Label>
                    
                    {/* Enhanced Link Display Section */}
                    <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1">
                            {language === 'ar' ? 'رابط دعوة الطلاب' : 'Student Invitation Link'}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-blue-700 bg-white px-3 py-2 rounded border break-all">
                              {`${window.location.origin}/invite/${user?.uid}`}
                            </span>
                            <Button
                              onClick={() => {
                                const inviteLink = `${window.location.origin}/invite/${user?.uid}`;
                                navigator.clipboard.writeText(inviteLink);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                                toast.success(language === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
                              }}
                              variant="outline"
                              size="sm"
                              className={`transition-all duration-200 ${
                                copiedCode 
                                  ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-100' 
                                  : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              {copiedCode ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        {language === 'ar' 
                          ? 'شارك هذا الرابط مع الطلاب للانضمام إلى دوراتك مباشرة'
                          : 'Share this link with students to join your courses directly'
                        }
                      </p>
                    </div>

                    {/* Custom Code Input Section */}
                    {!isCustomCodeMode ? (
                      <Button 
                        onClick={() => setIsCustomCodeMode(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d] hover:text-white"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'تخصيص الرمز' : 'Customize Code'}
                      </Button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            placeholder={language === 'ar' ? 'أدخل رمز مخصص (6 أحرف)' : 'Enter custom code (6 chars)'}
                            maxLength={6}
                            className="font-mono text-center"
                          />
                          <Button 
                            onClick={saveCustomCode}
                            size="sm"
                            className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              setIsCustomCodeMode(false);
                              setCustomCode('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === 'ar' 
                            ? 'يجب أن يكون الرمز 6 أحرف أو أرقام باللغة الإنجليزية'
                            : 'Code must be 6 alphanumeric characters'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {language === 'ar' 
                      ? 'شارك هذا الرمز مع الطلاب ليتمكنوا من التسجيل في دوراتك'
                      : 'Share this code with students so they can register for your courses'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Theme Selection Section */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'اختيار ثيم لوحة الطالب' : 'Student Dashboard Theme'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`border rounded-lg p-4 transition-all ${selectedTheme === 'proA' ? 'ring-2 ring-blue-600' : 'hover:border-blue-300'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{language === 'ar' ? 'ثيم احترافي A' : 'Professional Theme A'}</h3>
                          <p className="text-sm text-gray-600">
                            {language === 'ar' ? 'تصميم حديث بأيقونات واضحة وتنظيم مباشر' : 'Modern layout with clear icons and direct organization'}
                          </p>
                        </div>
                        {selectedTheme === 'proA' && <Badge className="bg-blue-600 text-white">{language === 'ar' ? 'محدد' : 'Selected'}</Badge>}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Button disabled={isSavingTheme} className="bg-[#2c4656] hover:bg-[#1e3240]" onClick={() => saveTheme('proA')}>
                          {isSavingTheme ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'اختر هذا الثيم' : 'Choose this theme')}
                        </Button>
                      </div>
                    </div>

                    <div className={`border rounded-lg p-4 transition-all ${selectedTheme === 'proB' ? 'ring-2 ring-purple-600' : 'hover:border-purple-300'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{language === 'ar' ? 'ثيم احترافي B' : 'Professional Theme B'}</h3>
                          <p className="text-sm text-gray-600">
                            {language === 'ar' ? 'ثيم عصري بألوان متدرجة وترتيب الأقسام بأسلوب أنيق' : 'Contemporary theme with gradients and elegant section order'}
                          </p>
                        </div>
                        {selectedTheme === 'proB' && <Badge className="bg-purple-600 text-white">{language === 'ar' ? 'محدد' : 'Selected'}</Badge>}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Button disabled={isSavingTheme} className="bg-purple-600 hover:bg-purple-700" onClick={() => saveTheme('proB')}>
                          {isSavingTheme ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'اختر هذا الثيم' : 'Choose this theme')}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {language === 'ar' ? 'اختيار الثيم يؤثر على لوحة الطالب التابعة لك فقط' : 'Theme selection affects only your students’ dashboard'}
                  </p>
                </CardContent>
              </Card>

              {/* Student List Section */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'قائمة الطلاب المسجلين' : 'Registered Students'}
                    <Badge variant="secondary" className="ml-2">
                      {students.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingStudents ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c4656]"></div>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        {language === 'ar' ? 'لا يوجد طلاب مسجلين' : 'No registered students'}
                      </h3>
                      <p className="text-gray-500">
                        {language === 'ar' 
                          ? 'شارك رمز الدعوة مع الطلاب للبدء'
                          : 'Share your invitation code with students to get started'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-right py-3 px-4 font-medium">
                              {language === 'ar' ? 'اسم الطالب' : 'Student Name'}
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              {language === 'ar' ? 'تاريخ التسجيل' : 'Signup Date'}
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              {language === 'ar' ? 'آخر دخول' : 'Last Login'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{student.name}</td>
                              <td className="py-3 px-4 text-gray-600">{student.email}</td>
                              <td className="py-3 px-4 text-gray-600">
                                {student.signupDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {student.lastLogin.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
}