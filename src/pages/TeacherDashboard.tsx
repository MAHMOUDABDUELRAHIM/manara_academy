import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/firebase/config";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { toast } from 'sonner';
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { CourseService } from "@/services/courseService";
import { TeacherService } from "@/services/teacherService";
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp,
  Bell,
  ExternalLink,
  Play,
  Edit,
  Clock,
  Plus,
  GraduationCap,
  Mail,
  AlertTriangle,
  Copy,
  RefreshCw
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  enrolledStudents: number;
  status: 'active' | 'draft' | 'archived';
  category: string;
  price: number;
}

interface TeacherStats {
  totalCourses: number;
  activeStudents: number;
  monthlyEarnings: number;
  totalEarnings: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
}

export const TeacherDashboard = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  
  // Empty state for new teachers - all data will come from backend later
  const teacherName = user?.profile?.fullName || user?.displayName || (language === 'ar' ? 'مدرس جديد' : 'New Teacher');
  
  // Email verification state
  const [showEmailVerification, setShowEmailVerification] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications] = useState<Notification[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  // إدارة كود الدعوة المخصص
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(true);
  const [isCustomCodeMode, setIsCustomCodeMode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  
  const [stats, setStats] = useState<TeacherStats>({
    totalCourses: 0,
    activeStudents: 0,
    monthlyEarnings: 0,
    totalEarnings: 0
  });

  // تحديث الإحصائيات عند تغيير الدورات
  useEffect(() => {
    if (courses.length > 0) {
      const totalStudents = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);
      const totalEarnings = courses.reduce((sum, course) => sum + (course.price * course.enrolledStudents), 0);
      
      setStats({
        totalCourses: courses.length,
        activeStudents: totalStudents,
        monthlyEarnings: totalEarnings * 0.1, // افتراض 10% من الأرباح الشهرية
        totalEarnings: totalEarnings
      });
    }
  }, [courses]);

  // جلب دورات المدرس
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingCourses(true);
        const instructorCourses = await CourseService.getInstructorCourses(user.uid);
        setCourses(instructorCourses);
      } catch (error) {
        console.error('خطأ في جلب الدورات:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [user?.uid]);

  // جلب الطلاب المرتبطين
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user?.uid) return;
      
      try {
        // جلب أو إنشاء ملف تعريف المدرس
        let teacherProfile = await TeacherService.getTeacherByUid(user.uid);
        if (!teacherProfile) {
          teacherProfile = await TeacherService.createTeacherProfile(
            user.uid,
            teacherName,
            user.email || ''
          );
        }
        
        if (teacherProfile) {
          setTeacherProfile(teacherProfile);
          
          // جلب الطلاب المرتبطين
          const students = await TeacherService.getStudentsForTeacher(user.uid);
          setLinkedStudents(students);
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات المدرس:', error);
      }
    };

    fetchTeacherData();
  }, [user?.uid, teacherName]);

  const getStatusBadge = (status: Course['status'] | null | undefined) => {
    const statusConfig = {
      active: { 
        label: language === 'ar' ? 'نشط' : 'Active', 
        variant: 'default' as const 
      },
      draft: { 
        label: language === 'ar' ? 'مسودة' : 'Draft', 
        variant: 'secondary' as const 
      },
      archived: { 
        label: language === 'ar' ? 'مؤرشف' : 'Archived', 
        variant: 'outline' as const 
      }
    } as const;

    const key = (status ?? 'draft') as keyof typeof statusConfig;
    return statusConfig[key] ?? { 
      label: language === 'ar' ? 'غير محدد' : 'Unknown', 
      variant: 'secondary' as const 
    };
  };

  // نسخ رابط الدعوة
  const copyInviteLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/invite/${user?.uid}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success(language === 'ar' ? 'تم نسخ الرابط بنجاح!' : 'Link copied successfully!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };



  // Handle sending verification email using Firebase Auth
  const handleSendVerificationEmail = async () => {
    if (!auth.currentUser) {
      console.error('No authenticated user found');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      console.log('Verification email sent successfully via Firebase Auth');
      // Show success message
      alert(language === 'ar' ? 'تم إرسال بريد التحقق بنجاح!' : 'Verification email sent successfully!');
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      
      // Handle specific Firebase errors
      let errorMessage = '';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = language === 'ar' 
          ? 'تم إرسال عدد كبير من الطلبات. يرجى المحاولة مرة أخرى بعد قليل.' 
          : 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = language === 'ar' 
          ? 'المستخدم غير موجود.' 
          : 'User not found.';
      } else {
        errorMessage = language === 'ar' 
          ? 'فشل في إرسال بريد التحقق. يرجى المحاولة مرة أخرى.' 
          : 'Failed to send verification email. Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Check email verification status on component mount and listen for changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest email verification status
        await currentUser.reload();
        const updatedUser = auth.currentUser;
        
        if (updatedUser) {
          const isVerified = updatedUser.emailVerified;
          setIsEmailVerified(isVerified);
          setShowEmailVerification(!isVerified);
          
          // If email is verified, save this status to Firestore for persistence
          if (isVerified) {
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
            setShowEmailVerification(false);
          }
        }
      } catch (error) {
        console.error('Error checking Firestore verification:', error);
      }
    };

    checkFirestoreVerification();

    return () => unsubscribe();
  }, [user]);

  // توليد كود فريد من 6 أحرف/أرقام
  const generateUniqueCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
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

  // تحميل كود الدعوة الحالي أو إنشاؤه للمدرس
  const loadInvitationCode = async () => {
    if (!user?.uid) return;
    try {
      const userDocRef = doc(db, 'teachers', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.invitationCode) {
          setInvitationCode(userData.invitationCode);
        } else {
          const newCode = await generateUniqueCode();
          setInvitationCode(newCode);
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

  useEffect(() => {
    if (!user?.uid) return;
    loadInvitationCode();
  }, [user?.uid]);

  // حفظ كود مخصص واستبدال القديم
  const saveCustomCode = async () => {
    if (!user?.uid || !customCode.trim()) return;
    const codeRegex = /^[A-Z0-9]{6}$/;
    const upperCode = customCode.toUpperCase();
    if (!codeRegex.test(upperCode)) {
      toast.error(language === 'ar' ? 'الرمز يجب أن يكون 6 أحرف أو أرقام' : 'Code must be 6 alphanumeric characters');
      return;
    }
    try {
      // تحقق من أن الكود غير مستخدم لدى مدرس آخر
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
      // حذف الكود القديم إن وجد
      if (invitationCode) {
        const oldCodeDoc = doc(db, 'invitationCodes', invitationCode);
        await deleteDoc(oldCodeDoc);
      }
      // حفظ الكود الجديد في مستند المدرس ومجموعة الأكواد
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

  // Empty state components
  const EmptyCoursesState = () => (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {language === 'ar' ? 'لا توجد دورات بعد' : 'No courses yet'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {language === 'ar' 
          ? 'ابدأ رحلتك التعليمية بإنشاء دورتك الأولى وشارف معرفتك مع الطلاب'
          : 'Start your teaching journey by creating your first course and share your knowledge with students'
        }
      </p>
      <Link to="/teacher-dashboard/create-course">
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {language === 'ar' ? 'إنشاء دورة جديدة' : 'Create New Course'}
        </Button>
      </Link>
    </div>
  );

  const EmptyNotificationsState = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium mb-2">
        {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
      </h4>
      <p className="text-xs text-muted-foreground">
        {language === 'ar' 
          ? 'ستظهر الإشعارات هنا عند وجود تحديثات'
          : 'Notifications will appear here when there are updates'
        }
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={teacherName} notificationCount={0} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {language === 'ar' ? 'مرحباً' : 'Welcome'}, {teacherName}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'ابدأ رحلتك التعليمية وشارف معرفتك مع الطلاب حول العالم'
                : 'Start your teaching journey and share your knowledge with students worldwide'
              }
            </p>
          </div>

          {/* Email Verification Alert */}
          {showEmailVerification && !isEmailVerified && (
            <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-orange-800 dark:text-orange-200">
                  {language === 'ar' 
                    ? 'نرجو تنشيط بريدك الإلكتروني لمنع تعطيل حسابك في المستقبل.'
                    : 'Please activate your email to prevent account suspension in the future.'
                  }
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendVerificationEmail}
                  disabled={isSendingEmail}
                  className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-2"></div>
                      {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-2" />
                      {language === 'ar' ? 'إرسال تأكيد البريد' : 'Send Email Confirmation'}
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'ابدأ بإنشاء دورتك الأولى' : 'Start by creating your first course'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'الطلاب المرتبطون' : 'Linked Students'}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{linkedStudents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الطلاب المسجلون بكودك' : 'Students registered with your code'}
                </p>
              </CardContent>
            </Card>

            {/* تمت إزالة بطاقتي الأرباح الشهرية وإجمالي الأرباح */}
          </div>

          {/* Invitation Link Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2c4656]" />
                {language === 'ar' ? 'رابط دعوة الطلاب' : 'Student Invitation Link'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-mono text-[#2c4656] break-all bg-white p-3 rounded border">
                      {`${window.location.origin}/invite/${user?.uid || 'teacher-id'}`}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === 'ar' 
                        ? 'شارك هذا الرابط مع الطلاب للتسجيل في دوراتك'
                        : 'Share this link with students to register for your courses'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink()}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {language === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
                
                {/* Custom Invitation Code Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">
                    {language === 'ar' ? 'تخصيص رمز الدعوة (اختياري)' : 'Customize Invitation Code (Optional)'}
                  </h4>
                  {!isCustomCodeMode ? (
                    <Button 
                      onClick={() => setIsCustomCodeMode(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d] hover:text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تخصيص الرمز' : 'Customize Code'}
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          placeholder={language === 'ar' ? 'أدخل رمز مخصص (6 أحرف)' : 'Enter custom code (6 chars)'}
                          maxLength={6}
                          className="font-mono text-center px-3 py-2 border rounded-md text-sm"
                        />
                        <Button 
                          onClick={saveCustomCode}
                          size="sm"
                          className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => { setIsCustomCodeMode(false); setCustomCode(''); }}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' 
                          ? 'يجب أن يكون الرمز 6 أحرف أو أرقام باللغة الإنجليزية'
                          : 'Code must be 6 alphanumeric characters'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* تم إلغاء سيشن الطلاب المرتبطون */}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Courses Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{language === 'ar' ? 'دوراتي' : 'My Courses'}</span>
                    {courses.length > 0 && (
                      <Link to="/teacher-dashboard/courses">
                        <Button variant="ghost" size="sm">
                          {language === 'ar' ? 'عرض الكل' : 'View All'}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCourses ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">
                        {language === 'ar' ? 'جاري تحميل الدورات...' : 'Loading courses...'}
                      </p>
                    </div>
                  ) : courses.length === 0 ? (
                    <EmptyCoursesState />
                  ) : (
                    <div className="space-y-4">
                      {courses.slice(0, 3).map((course) => (
                        <div key={course.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {course.thumbnail ? (
                              <img 
                                src={course.thumbnail} 
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookOpen className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">{course.enrolledStudents} {language === 'ar' ? 'طالب' : 'students'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={getStatusBadge(course.status).variant}>
                                {getStatusBadge(course.status).label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {course.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>
                          <Link to={`/teacher-dashboard/courses/${course.id}/add-lesson`}>
                            <Button size="sm" className="flex-shrink-0">
                              <Plus className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'إضافة درس' : 'Add Lesson'}
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notifications Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <EmptyNotificationsState />
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {notification.time}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                notification.type === 'success' ? 'default' :
                                notification.type === 'warning' ? 'destructive' : 'secondary'
                              }
                              className="ml-2"
                            >
                              {notification.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Getting Started Section for New Teachers */}
          {courses.length === 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {language === 'ar' ? 'ابدأ رحلتك التعليمية' : 'Start Your Teaching Journey'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'إنشاء دورة' : 'Create Course'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'ابدأ بإنشاء دورتك الأولى وشارف خبرتك'
                        : 'Start by creating your first course and share your expertise'
                      }
                    </p>
                    <Link to="/teacher-dashboard/create-course">
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'إنشاء الآن' : 'Create Now'}
                      </Button>
                    </Link>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'جذب الطلاب' : 'Attract Students'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'اجعل دورتك جذابة لتحصل على المزيد من الطلاب'
                        : 'Make your course attractive to get more students'
                      }
                    </p>
                    <Button size="sm" variant="outline" disabled>
                      {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                    </Button>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'تحقيق الأرباح' : 'Earn Money'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'احصل على أرباح من دوراتك وخبرتك'
                        : 'Earn money from your courses and expertise'
                      }
                    </p>
                    <Link to="/teacher-dashboard/payouts">
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'عرض الأرباح' : 'View Payouts'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Floating Support Chat */}
      <FloatingSupportChat />
    </div>
  );
};

export default TeacherDashboard;