import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import FloatingSupportChat from '@/components/FloatingSupportChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CourseService } from '@/services/courseService';
import { StudentService } from '@/services/studentService';
import { TeacherService } from '@/services/teacherService';
import { SubscriptionRequestService } from '@/services/subscriptionRequestService';
import { NotificationService } from '@/services/notificationService';
import { Course } from '@/types/course';
import { 
  BookOpen, 
  Star, 
  Clock, 
  Users, 
  Play, 
  ArrowLeft,
  CheckCircle,
  Award,
  Download,
  Loader2
} from 'lucide-react';
import { Upload } from 'lucide-react';
// تم الاستغناء عن Firebase Storage وحفظ الصورة كـ Base64 في Firestore
import { toast } from 'sonner';
import InviteHeader from '@/components/InviteHeader';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
}

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuthContext();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentSection, setShowPaymentSection] = useState<boolean>(false);
  const [teacherPaymentNumber, setTeacherPaymentNumber] = useState<string | null>(null);
  const [loadingTeacherPayment, setLoadingTeacherPayment] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // NEW: Track if student is already enrolled in this course
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // تحويل صورة إلى Base64 مع ضغط بسيط لتقليل الحجم
  const compressImageToBase64 = (file: File, maxWidth = 1280, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('فشل إنشاء السياق الرسومي'));
            return;
          }

          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // نحفظ دائماً بصيغة JPEG لضغط أفضل
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('فشل تحميل الصورة للتحويل'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const courseData = await CourseService.getCourseById(courseId);
        
        if (!courseData) {
          setError(language === 'ar' ? 'لم يتم العثور على الدورة' : 'Course not found');
          return;
        }
        
        setCourse(courseData);
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(language === 'ar' ? 'خطأ في تحميل بيانات الدورة' : 'Error loading course data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, language]);

  // NEW: Check enrollment state for current user and course
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (!user?.uid || !courseId) return;
        const enrolledCourseIds = await StudentService.getEnrolledCourses(user.uid);
        setIsEnrolled(enrolledCourseIds.includes(String(courseId)));
      } catch (e) {
        console.error('Error checking enrollment state:', e);
      }
    };
    checkEnrollment();
  }, [user?.uid, courseId]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!user?.uid) return;
        const userNotifications = await NotificationService.getUserNotifications(user.uid);
        setNotifications(userNotifications);
        
        const unreadCount = await NotificationService.getUnreadCount(user.uid);
        setUnreadNotifications(unreadCount);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid]);

  // Handle notification item click
  const handleNotificationItemClick = (n: any) => {
    try {
      if (n?.courseId) {
        navigate(`/course/${n.courseId}/details`);
      } else if (n?.teacherId) {
        navigate(`/teacher/${n.teacherId}`);
      } else if (n?.link) {
        navigate(String(n.link));
      } else {
        navigate('/notifications');
      }
    } catch {}
    setShowNotificationsPanel(false);
  };

  const formatPrice = (price: number) => {
    return language === 'ar' ? `${price} ج.م` : `${price} EGP`;
  };

  const getLevelBadge = (level: string) => {
    const levelColors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    
    const levelLabels = {
      beginner: language === 'ar' ? 'مبتدئ' : 'Beginner',
      intermediate: language === 'ar' ? 'متوسط' : 'Intermediate',
      advanced: language === 'ar' ? 'متقدم' : 'Advanced'
    };

    return (
      <Badge className={levelColors[level as keyof typeof levelColors] || ''}>
        {levelLabels[level as keyof typeof levelLabels] || level}
      </Badge>
    );
  };

  const handleSubscribe = async () => {
    if (!user?.uid || !course) return;

    // إذا كانت الدورة مجانية، سجل مباشرة
    if (course.price === 0) {
      try {
        setIsEnrolling(true);
        await StudentService.enrollInCourse(user.uid, course.id);
        navigate(`/course/${course.id}`);
      } catch (error) {
        console.error('Error enrolling in course:', error);
        alert(language === 'ar' ? 'حدث خطأ أثناء التسجيل في الدورة. يرجى المحاولة مرة أخرى.' : 'An error occurred while enrolling in the course. Please try again.');
      } finally {
        setIsEnrolling(false);
      }
      return;
    }

    // دورة مدفوعة: إظهار قسم الدفع وجلب رقم محفظة المدرس
    try {
      setShowPaymentSection(true);
      if (teacherPaymentNumber == null) {
        setLoadingTeacherPayment(true);
        const teacher = await TeacherService.getTeacherProfile(course.instructorId);
        setTeacherPaymentNumber(teacher?.paymentNumber || null);
      }
    } catch (e) {
      // سيتم عرض رسالة لاحقاً إذا لم يتوفر الرقم
    } finally {
      setLoadingTeacherPayment(false);
    }
  };

  const handleSendPayment = async () => {
    if (!user?.uid || !course) return;

    if (!paymentScreenshot) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة لإيصال الدفع' : 'Please select a payment receipt image');
      return;
    }

    try {
      setIsUploading(true);
      // تحويل الصورة إلى Base64
      const base64Image = await compressImageToBase64(paymentScreenshot);

      // إرسال طلب الاشتراك
      await SubscriptionRequestService.createRequest({
        studentId: user.uid,
        studentName: user.displayName || undefined,
        studentEmail: user.email || undefined,
        courseId: course.id,
        courseTitle: (language === 'ar' ? (course.titleAr || course.title) : course.title),
        teacherId: course.instructorId,
        screenshotUrl: base64Image,
        amount: typeof course.price === 'number' ? course.price : undefined,
      });

      toast.success(language === 'ar' ? 'تم إرسال طلب الاشتراك بنجاح. سيتم مراجعة الطلب قريباً.' : 'Subscription request sent successfully. It will be reviewed soon.');
      setPaymentScreenshot(null);
    } catch (error) {
      console.error('Error sending subscription request:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'An error occurred while sending the request');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {language === 'ar' ? 'خطأ' : 'Error'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || (language === 'ar' ? 'لم يتم العثور على الدورة' : 'Course not found')}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'العودة' : 'Go Back'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <InviteHeader 
        teacherName={course?.instructorName}
        unreadCount={unreadNotifications}
        onNotificationsClick={async () => {
          try {
            if (user?.uid) {
              await NotificationService.markAllAsRead(user.uid);
            }
          } catch {}
          setShowNotificationsPanel((prev) => !prev);
          setUnreadNotifications(0);
        }}
        showNotifications={showNotificationsPanel}
        notifications={notifications}
        onNotificationItemClick={handleNotificationItemClick}
      />

      {/* Sticky ribbon under header */}
      <div className="sticky top-16 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => navigate('/dashboard?section=home')}
            >
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => navigate('/dashboard?section=home')}
            >
              {language === 'ar' ? 'كورساتي' : 'My Courses'}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => navigate('/dashboard?section=activities')}
            >
              {language === 'ar' ? 'الأنشطة الجديدة' : 'New Activities'}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => navigate('/dashboard?section=results')}
            >
              {language === 'ar' ? 'النتائج' : 'Results'}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => navigate('/dashboard?section=messages')}
            >
              {language === 'ar' ? 'الرسائل' : 'Messages'}
            </Button>
          </div>
        </div>
      </div>
      


      <main className="flex-1 p-6 overflow-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>


          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Main Grid */}
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Course Header */}
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="font-semibold">
                      {language === 'ar' ? course.titleAr || course.title : course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                      {language === 'ar' ? course.descriptionAr || course.description : course.description}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        {language === 'ar' ? course.categoryAr || course.category : course.category}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        {language === 'ar' ? (course.level === 'beginner' ? 'مبتدئ' : course.level === 'intermediate' ? 'متوسط' : 'متقدم') : course.level}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        {language === 'ar' ? `${course.duration || '—'} ساعة` : `${course.duration || '—'} hrs`}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                        {language === 'ar' ? `${course.lessons?.length || 0} درس` : `${course.lessons?.length || 0} lessons`}
                      </span>
                    </div>
                    {/* Action Button */}
                    <div className="flex gap-4">
                      {isEnrolled ? (
                        <Button onClick={() => navigate(`/course/${course.id}`)} className="bg-blue-600 hover:bg-blue-700">
                          {language === 'ar' ? 'عرض الدروس' : 'View Lessons'}
                        </Button>
                      ) : (
                        <Button onClick={handleSubscribe} className="bg-green-600 hover:bg-green-700">
                          {language === 'ar' ? 'الاشتراك في الدورة' : 'Subscribe to Course'}
                        </Button>
                      )}
                      {course.price === 0 && (
                        <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-1">
                          {language === 'ar' ? 'مجاناً' : 'Free'}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
  
                {/* Course Objectives */}
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="font-semibold">
                      {language === 'ar' ? 'أهداف الدورة' : 'Course Objectives'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                      {course.objectives && course.objectives.length ? (
                        course.objectives.map((objective, idx) => (
                          <li key={idx}>{typeof objective === 'string' ? objective : (language === 'ar' ? (objective as any).titleAr || (objective as any).title : (objective as any).title)}</li>
                        ))
                      ) : (
                        <li>{language === 'ar' ? 'لا توجد أهداف محددة' : 'No specific objectives listed'}</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
  
                {/* Course Curriculum */}
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="font-semibold">
                      {language === 'ar' ? 'منهج الدورة' : 'Course Curriculum'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.lessons && course.lessons.length ? (
                      <div className="space-y-4">
                        {course.lessons.map((lesson, index) => (
                          <div key={lesson.id || index} className="flex items-start justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                {language === 'ar' ? lesson.titleAr || lesson.title : lesson.title}
                              </h3>
                              {lesson.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {language === 'ar' ? lesson.descriptionAr || lesson.description : lesson.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{lesson.duration || '15 min'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">
                        {language === 'ar' ? 'لا توجد دروس بعد' : 'No lessons available yet'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
  
              {/* Right Column - Sidebar */}
              <div className="space-y-6 lg:sticky lg:top-24">
                {/* Course Image */}
                <Card className="rounded-2xl border-0 shadow-md ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardContent className="p-0">
                    <img
                      src={course.thumbnail || '/api/placeholder/600/300'}
                      alt={language === 'ar' ? course.titleAr || course.title : course.title}
                      className="w-full h-48 object-cover"
                    />
                  </CardContent>
                </Card>
  
                {/* Price + Action (merged) */}
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {isEnrolled 
                          ? (language === 'ar' ? 'حالة الاشتراك' : 'Enrollment Status')
                          : (language === 'ar' ? 'السعر' : 'Price')
                        }
                      </span>
                      <span className={`px-3 py-1 rounded-full ${
                        isEnrolled 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {isEnrolled 
                          ? (language === 'ar' ? 'أنت مشترك الآن' : 'You are enrolled')
                          : course.price === 0
                            ? (language === 'ar' ? 'مجاني' : 'Free')
                            : (language === 'ar' ? `${course.price} ج.م` : formatPrice(course.price))
                        }
                      </span>
                    </div>
                    <div>
                      {isEnrolled ? (
                        <Button onClick={() => navigate(`/course/${course.id}`)} className="w-full bg-blue-600 hover:bg-blue-700">
                          {language === 'ar' ? 'اذهب إلى الدروس' : 'Go to Lessons'}
                        </Button>
                      ) : (
                        <Button onClick={handleSubscribe} className="w-full bg-green-600 hover:bg-green-700">
                          {language === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}
                        </Button>
                      )}
                    </div>
                    {course.price === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {language === 'ar' ? 'هذه الدورة مجانية تمامًا' : 'This course is completely free'}
                      </p>
                    )}
                  </CardContent>
                </Card>
  
                {showPaymentSection && (
                  <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="font-semibold">
                        {language === 'ar' ? 'الدفع للاشتراك' : 'Payment to Subscribe'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {language === 'ar' ? 'رقم محفظة المدرس' : 'Teacher Wallet Number'}
                        </span>
                        {loadingTeacherPayment ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {language === 'ar' ? 'جارِ التحميل...' : 'Loading...'}
                          </div>
                        ) : teacherPaymentNumber ? (
                          <Input readOnly value={teacherPaymentNumber} />
                        ) : (
                          <p className="text-xs text-red-600">
                            {language === 'ar' ? 'رقم المحفظة غير متوفر حالياً' : 'Wallet number not available yet.'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {language === 'ar' ? 'أرفق إيصال الدفع' : 'Attach payment receipt'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {language === 'ar' ? 'رفع الصورة' : 'Upload Image'}
                          </Button>
                          {paymentScreenshot && (
                            <span className="text-xs text-muted-foreground">{paymentScreenshot.name}</span>
                          )}
                        </div>
                      </div>

                      {paymentScreenshot && (
                        <img
                          src={URL.createObjectURL(paymentScreenshot)}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-md border"
                        />
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSendPayment}
                          disabled={isUploading || !paymentScreenshot}
                          className="bg-[#2c8a4f] hover:bg-[#257a46] text-white"
                        >
                          {isUploading
                            ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                            : (language === 'ar' ? 'لقد قمت بالدفع' : 'I have paid')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPaymentSection(false)}
                          disabled={isUploading}
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
  
                {/* Removed separate action card per الطلب: الدمج داخل بطاقة السعر */}
              </div>
            </div>
          </div>
      </main>

      {/* Footer aligned with StudentDashboard */}
      <footer className="bg-card border-t border-border text-center text-sm text-muted-foreground">
        <div className="py-4">
          © Manara Academy 2025 - جميع الحقوق محفوظة
        </div>
      </footer>
      
      <FloatingSupportChat />
    </div>
  );
};

export default CourseDetails;