import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ExamService } from "@/services/examService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BookOpen, 
  TrendingUp, 
  CheckCircle, 
  ClipboardList, 
  MessageSquare, 
  Bell, 
  Clock, 
  FileText, 
  Award, 
  Play, 
  Home, 
  BookMarked, 
  LogOut, 
  GraduationCap,
  Copy,
  Check,
  Calendar,
  CreditCard
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";

import InviteHeader from '@/components/InviteHeader';
import { useLanguage } from "@/contexts/LanguageContext";
import { auth, db, storage } from "@/firebase/config";
import { doc, getDoc, query, collection, where, getDocs, setDoc } from "firebase/firestore";
import { signOut, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { TeacherService } from "@/services/teacherService";
import { CourseService } from "@/services/courseService";
import { StudentService } from "@/services/studentService";
import { NotificationService } from "@/services/notificationService";
import AssignmentService from "@/services/assignmentService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  instructor: string;
  category: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
}

interface Activity {
  id: string;
  title: string;
  type: 'quiz' | 'exam' | 'assignment';
  dueDate: string;
  course: string;
  status: 'pending' | 'completed' | 'overdue';
  openAtMs?: number;
  endAtMs?: number;
}

interface DashboardSettings {
  title: string;
  accentColor: string;
  logo: string;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  teacherId: string;
  teacherName: string;
}

export const StudentDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    title: 'منارة الأكاديمية',
    accentColor: '#3b82f6',
    logo: ''
  });
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [stats, setStats] = useState({
    totalEnrolled: 0,
    inProgress: 0,
    completed: 0
  });
  const [copiedTeacherId, setCopiedTeacherId] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // مزامنة القسم النشط مع بارامتر الرابط ?section=
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const section = params.get('section');
      const allowed = ['home', 'examResults', 'results', 'payments'];
      if (section && allowed.includes(section)) {
        setActiveSection(section);
      }
    } catch {}
  }, [location.search]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.uid) return;
      setLoadingPayments(true);
      try {
        const snapshot = await getDocs(collection(db, 'students', user.uid, 'subscriptionRequests'));
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPayments(items);
      } catch (e) {
        console.warn('Failed to load payments', e);
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
  }, [user?.uid]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [examMeta, setExamMeta] = useState<Record<string, any>>({});
  // حالة تفاصيل النتائج داخل نفس القسم
  const [resultsView, setResultsView] = useState<'list'|'detail'>('list');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  // حالات نتائج الواجبات
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState<any[]>([]);
  const [assignmentMeta, setAssignmentMeta] = useState<Record<string, any>>({});
  const [assignmentView, setAssignmentView] = useState<'list' | 'detail'>('list');
  const [selectedAssignmentResult, setSelectedAssignmentResult] = useState<any | null>(null);
const [dashboardTheme, setDashboardTheme] = useState<'proA' | 'proB' | 'modernLight'>('proA');
// إضافة حالة لأوقات محاولات الامتحان
const [examAttempts, setExamAttempts] = useState<Record<string, { startAt?: Date; submittedAt?: Date }>>({});
// دالة تنسيق مدة الزمن المستهلكة
const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} ساعة ${minutes} دقيقة ${seconds} ثانية`;
  }
  return `${minutes} دقيقة ${seconds} ثانية`;
};

  // Profile state
  const [profilePhotoURL, setProfilePhotoURL] = useState<string>('');
  const [profileFullName, setProfileFullName] = useState<string>('');
  const [profileStudentPhone, setProfileStudentPhone] = useState<string>('');
  const [profileParentPhone, setProfileParentPhone] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  useEffect(() => {
    const loadResults = async () => {
      if (!user?.uid) return;
      try {
        setResultsLoading(true);
        const results = await StudentService.getAllExamResults(user.uid);
        // عرض جميع النتائج بما فيها المعلقة
        setExamResults(results || []);
        const examIds = (results || []).map((r: any) => r.examId);
        // تحميل بيانات الامتحان بشكل متسامح: تجاهل الامتحانات التي لا يملك الطالب إذنًا لقراءتها
        const metasSettled = await Promise.allSettled(examIds.map((id: string) => ExamService.getExamById(id)));
        const metaMap: Record<string, any> = {};
        metasSettled.forEach((res: any) => {
          if (res.status === 'fulfilled' && res.value && res.value.id) {
            metaMap[res.value.id] = res.value;
          }
        });
        setExamMeta(metaMap);
        // تحميل أوقات محاولات الامتحان لحساب الوقت المستهلك
        const attemptsSettled = await Promise.allSettled(
          examIds.map((id: string) => StudentService.getExamAttempt(user.uid!, id))
        );
        const attemptsMap: Record<string, { startAt?: Date; submittedAt?: Date }> = {};
        attemptsSettled.forEach((r: any, idx: number) => {
          const id = examIds[idx];
          if (r.status === 'fulfilled' && r.value) {
            attemptsMap[id] = r.value;
          }
        });
        setExamAttempts(attemptsMap);
      } catch (error) {
        console.error('Error loading exam results:', error);
      } finally {
        setResultsLoading(false);
      }
    };
    loadResults();
  }, [user?.uid]);

  // تحميل نتائج الواجبات
  useEffect(() => {
    const loadAssignmentResults = async () => {
      if (!user?.uid) return;
      try {
        setAssignmentLoading(true);
        const attempts = await AssignmentService.getAssignmentAttemptsForStudent(user.uid);
        setAssignmentResults(attempts || []);
        const ids = (attempts || []).map((a: any) => a.assignmentId).filter(Boolean);
        const settled = await Promise.allSettled(ids.map((id: string) => AssignmentService.getAssignmentById(id)));
        const meta: Record<string, any> = {};
        for (const s of settled) {
          if (s.status === 'fulfilled' && s.value && s.value.id) {
            meta[s.value.id] = s.value;
          }
        }
        // محاولة إكمال أسماء الدورات إذا لم تكن موجودة
        await Promise.allSettled(Object.values(meta).map(async (m: any) => {
          if (!m.courseTitle && m.courseId) {
            try {
              const c = await CourseService.getCourseById(m.courseId);
              if (c) m.courseTitle = c.title;
            } catch {}
          }
        }));
        setAssignmentMeta(meta);
      } catch (error) {
        console.error('Error loading assignment results:', error);
      } finally {
        setAssignmentLoading(false);
      }
    };
    loadAssignmentResults();
  }, [user?.uid]);

  // Countdown ticker for exams
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load student profile details (name, phones, avatar)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) return;
      try {
        const profile = await StudentService.getStudentByUid(user.uid);
        if (profile) {
          setProfileFullName(profile.fullName || user?.displayName || '');
          setProfileStudentPhone(profile.studentPhone || '');
          setProfileParentPhone(profile.parentPhone || '');
          setProfilePhotoURL(profile.photoURL || user?.photoURL || '');
        } else {
          setProfileFullName(user?.displayName || '');
          setProfilePhotoURL(user?.photoURL || '');
        }
      } catch (e) {
        console.warn('Failed to load profile', e);
      }
    };
    loadProfile();
  }, [user?.uid]);

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return language === 'ar' ? 'انتهى الوقت' : 'Time is up';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Load dashboard customization and student info
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        if (!user) {
          setLoading(false);
          setDataLoaded(true);
          return;
        }

        // البحث عن المدرس المرتبط بالطالب باستخدام الطريقة المحدثة
        const teacher = await TeacherService.getTeacherForStudent(user.uid);

        // منع دخول الطالب للداشبورد إذا كان يحمل معرف معلم مختلف في التخزين المحلي
        const pendingTeacherId = localStorage.getItem('teacherId');
        if (pendingTeacherId && teacher && teacher.id !== pendingTeacherId) {
          try {
            await signOut(auth);
          } catch {}
          navigate('/login/student');
          return;
        }

        if (teacher) {
          setStudentInfo({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'الطالب',
            email: user.email || '',
            teacherId: teacher.id,
            teacherName: teacher.fullName || 'المدرس'
          });

          // تحميل إعدادات dashboard من المدرس
          if (teacher.dashboardSettings) {
            setDashboardSettings(teacher.dashboardSettings);
          }

          // تحميل ثيم لوحة التحكم للطالب من إعدادات المعلم
          try {
            const settingsDoc = await getDoc(doc(db, 'teacherSettings', teacher.id));
            if (settingsDoc.exists()) {
              const rawTheme = settingsDoc.data().studentDashboardTheme as 'proA' | 'proB' | 'modernLight' | undefined;
              if (rawTheme === 'proA') {
                setDashboardTheme('proA');
              } else if (rawTheme === 'proB' || rawTheme === 'modernLight') {
                // Map Professional Theme B to Modern Light
                setDashboardTheme('modernLight');
              }
            }
          } catch (e) {
            console.warn('Failed to load dashboard theme', e);
          }

          // تحميل دورات المدرس
          try {
            // التأكد من وجود مستند الطالب قبل محاولة الوصول للدورات
            const studentDoc = await getDoc(doc(db, 'students', user.uid));
            if (!studentDoc.exists()) {
              console.log('Student document not found, creating it...');
              // إنشاء مستند الطالب إذا لم يكن موجوداً
              const studentData = {
                uid: user.uid,
                fullName: user.displayName || 'طالب جديد',
                email: user.email || '',
                photoURL: user.photoURL || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                isActive: true,
                enrolledCourses: [],
                teacherId: teacher.id
              };
              
              await setDoc(doc(db, 'students', user.uid), studentData);
              console.log('Student document created successfully');
            }
            
            const courses = await CourseService.getInstructorCourses(teacher.id);
            setTeacherCourses(courses);
            
            // جلب الكورسات المسجل بها الطالب فقط
            const studentEnrolledCourses = await StudentService.getEnrolledCourses(user.uid);
            const enrolledCoursesWithDetails = await Promise.all(
              studentEnrolledCourses.map(async (courseId) => {
                try {
                  const courseDetails = await CourseService.getCourseById(courseId);
                  return courseDetails;
                } catch (error) {
                  console.error(`Error loading course ${courseId}:`, error);
                  return null;
                }
              })
            );

            // تصفية الكورسات الصحيحة فقط
            const validEnrolledCourses = enrolledCoursesWithDetails.filter(course => course !== null);
            
            // تصفية الكورسات حسب المدرس المرتبط بالطالب لضمان التوافق
            const filteredByTeacher = validEnrolledCourses.filter((course: any) => {
              const instructorId = course?.instructorId || course?.instructor || '';
              return instructorId === teacher.id;
            });

            setEnrolledCourses(filteredByTeacher);
            // تحديث الإحصائيات بناءً على الكورسات بعد التصفية
            setStats(prev => ({
              ...prev,
              totalEnrolled: filteredByTeacher.length
            }));

            // جلب الامتحانات المتاحة للطالب وتحويلها لأنشطة
            try {
              const scheduledExams = await ExamService.getScheduledExamsForStudent(user.uid);
              const rawActivities = await Promise.all(scheduledExams.map(async (exam) => {
                const openAt = new Date(exam.scheduledAt as any);
                const openAtMs = openAt.getTime();
                const tl = exam.settings?.timeLimitMinutes ?? null;
                const windowEnd = exam.settings?.windowEndAt ? new Date(exam.settings.windowEndAt as any) : null;
                const endAtMs = windowEnd
                  ? windowEnd.getTime()
                  : (tl ? openAtMs + tl * 60000 : null);
                let status: 'pending' | 'completed' | 'overdue' = 'pending';
                try {
                  const attempt = await StudentService.getExamAttempt(user.uid, exam.id!);
                  if (attempt?.submittedAt) {
                    status = 'completed';
                  } else if (endAtMs !== null && Date.now() > endAtMs && !attempt?.startAt) {
                    status = 'overdue';
                  }
                } catch {}
                // لا نخفي الامتحان مباشرة بعد انتهاء نافذة الدخول؛ سنعرضه لساعتين برسالة مناسبة في الواجهة
                return {
                  id: exam.id!,
                  title: exam.title,
                  type: 'exam' as const,
                  dueDate: openAt.toLocaleString(),
                  course: exam.courseTitle || '',
                  status,
                  openAtMs,
                  endAtMs: endAtMs ?? undefined,
                };
              }));
              const examActivities = rawActivities.filter(Boolean) as Activity[];
              // جلب الواجبات المنشورة وتحويلها لأنشطة
              let assignmentActivities: Activity[] = [];
              try {
                const assignments = await AssignmentService.getPublishedAssignmentsForStudent(user.uid);
                assignmentActivities = await Promise.all(assignments.map(async (asg) => {
                  let st: 'pending' | 'completed' = 'pending';
                  try {
                    const att = await AssignmentService.getAssignmentAttempt(user.uid, asg.id!);
                    if (att) st = 'completed';
                  } catch {}
                  return {
                    id: asg.id!,
                    title: asg.title,
                    type: 'assignment',
                    dueDate: (asg.createdAt as Date)?.toLocaleString?.() || new Date().toLocaleString(),
                    course: asg.courseTitle || '',
                    status: st,
                  } as Activity;
                }));
              } catch (e) {
                console.warn('Failed to load assignment activities', e);
              }

              // دمج الأنشطة مع إخفاء المكتمل من الامتحانات وإظهار الواجبات غير المكتملة فقط
              const mergedActivities = [
                ...examActivities.filter((a) => a.status !== 'completed'),
                ...assignmentActivities.filter((a) => a.status === 'pending')
              ];
              setActivities(mergedActivities);
            } catch (e) {
              console.warn('Failed to load exam activities', e);
            }
            
          } catch (error) {
            console.error('Error loading teacher courses:', error);
          }

          // تحميل الإشعارات
          try {
            const userNotifications = await NotificationService.getUserNotifications(user.uid);
            setNotifications(userNotifications);
            
            const unreadCount = await NotificationService.getUnreadCount(user.uid);
            setUnreadNotifications(unreadCount);
          } catch (error) {
            console.error('Error loading notifications:', error);
          }
        }
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setLoading(false);
        setDataLoaded(true); // تعيين أن البيانات تم تحميلها بالكامل
      }
    };

    loadStudentData();
  }, [user]);

  // عرض شاشة التحميل أثناء تحميل البيانات
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // تم إزالة نافذة "لم تنضم إلى أي مدرس بعد" نهائياً حسب طلب المستخدم

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '👤';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    try {
      setSavingProfile(true);
      await StudentService.updateStudentProfile(user.uid, {
        fullName: profileFullName,
        parentPhone: profileParentPhone || undefined,
        studentPhone: profileStudentPhone || undefined,
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profileFullName });
      }
      setStudentInfo((prev) => prev ? { ...prev, name: profileFullName } : prev);
      toast.success('تم حفظ الملف الشخصي');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSavingProfile(false);
    }
  };

  // تحويل صورة إلى Base64 مع ضغط لتقليل الحجم
  const compressImageToBase64 = (file: File, maxWidth = 512, quality = 0.7): Promise<string> => {
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
  const handleAvatarFile = async (file: File) => {
    if (!user?.uid) return;
    try {
      setUploadingAvatar(true);
      // ضغط الصورة وتحويلها إلى Base64
      const base64Image = await compressImageToBase64(file, 512, 0.7);
      // حفظ الصورة المضغوطة كبايس64 في Firestore فقط، بدون تحديث Auth.photoURL لتفادي حدود الطول
      await StudentService.updateStudentProfile(user.uid, { photoURL: base64Image });
      setProfilePhotoURL(base64Image);
      toast.success('تم تحديث صورة الحساب');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!user?.email) {
        toast.error('لا يوجد بريد مرتبط بالحساب');
        return;
      }
      await sendPasswordResetEmail(auth, user.email);
      toast.success('تم إرسال رابط استعادة كلمة السر إلى بريدك');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('تعذر إرسال بريد الاستعادة');
    }
  };

  const copyTeacherId = async () => {
    if (studentInfo?.teacherId) {
      try {
        await navigator.clipboard.writeText(studentInfo.teacherId);
        setCopiedTeacherId(true);
        setTimeout(() => setCopiedTeacherId(false), 2000);
        toast.success(language === 'ar' ? 'تم نسخ معرف المعلم' : 'Teacher ID copied');
      } catch (error) {
        console.error('Error copying teacher ID:', error);
        toast.error(language === 'ar' ? 'فشل في نسخ المعرف' : 'Failed to copy ID');
      }
    }
  };
  const menuItems = dashboardTheme === 'proA'
    ? [
      { id: 'home', label: 'الرئيسية', icon: Home },
      { id: 'examResults', label: 'نتائج الامتحانات', icon: Award },
      { id: 'results', label: 'نتائج الواجبات', icon: ClipboardList },
      { id: 'payments', label: 'المدفوعات', icon: CreditCard },
    ]
    : dashboardTheme === 'modernLight'
    ? [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'examResults', label: 'Exam Results', icon: Award },
      { id: 'results', label: 'Assignment Results', icon: ClipboardList },
      { id: 'payments', label: 'Payments', icon: CreditCard },
    ]
    : [
      { id: 'home', label: 'لوحة التحكم', icon: Home },
      { id: 'examResults', label: 'نتائج الامتحانات', icon: Award },
      { id: 'payments', label: 'المدفوعات', icon: CreditCard },
      { id: 'results', label: 'نتائج الواجبات', icon: ClipboardList },
    ];

  const themeAccent = dashboardTheme === 'proA' 
    ? '#3b82f6' 
    : dashboardTheme === 'modernLight'
    ? '#FBBF24'
    : '#10b981';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Custom Header */}
      <InviteHeader 
        teacherName={studentInfo?.teacherName}
        teacherId={studentInfo?.teacherId}
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


      {/* Navigation Menu */}
      <nav className="sticky top-16 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-2">
          <div className="flex flex-wrap gap-2 justify-center">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'home' && (
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1 space-y-8">
              {/* Welcome Section */}
              <div className="text-center fade-in">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  مرحباً بك، {studentInfo?.name || 'الطالب'}
                </h2>
                <p className="text-gray-600">
                  استمر في رحلة التعلم واكتشف المزيد من الدورات الرائعة
                </p>
              </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    إجمالي الكورسات المسجلة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEnrolled}</div>
                  <p className="text-xs text-muted-foreground">
                    لم يتم التسجيل في أي كورس بعد
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    الكورسات قيد التقدم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">
                    لا توجد كورسات قيد التقدم
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    الكورسات المكتملة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <p className="text-xs text-muted-foreground">
                    لم يتم إكمال أي كورس بعد
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Teacher ID Section */}
            {false && (
              <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    معرف المعلم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-blue-700">
                      معرف المعلم الخاص بك للمراجعة
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                      <code className="flex-1 text-lg font-mono font-bold text-blue-900 tracking-wider">
                        {studentInfo.teacherId}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyTeacherId}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        {copiedTeacherId ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-blue-600">
                      يمكنك نسخ هذا المعرف للمراجعة
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Enrolled Courses Section (Main) */}
              <div className="lg:col-span-8">
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">كورساتي المسجّلة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrolledCourses.length === 0 ? (
                      <div className="p-8 text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد دورات مسجّلة</h3>
                        <p className="text-gray-500">عند التسجيل في أي دورة ستظهر هنا.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrolledCourses.map((course: any) => (
                          <Card key={course.id} className="group rounded-2xl overflow-hidden border-0 shadow-sm bg-white hover:shadow-xl transition-transform hover:-translate-y-0.5">
                            <div className="relative w-full h-48">
                              {course.thumbnail ? (
                                <img
                                  src={course.thumbnail}
                                  alt={course.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="text-base font-semibold text-gray-900">{course.title}</h3>
                              <div className="flex items-center justify-between w-full text-sm text-gray-600">
                                <span className="truncate">{`Mr ${course.instructorName || studentInfo?.teacherName || ''}`}</span>
                                <span className="flex items-center gap-1 text-gray-500">
                                  <BookOpen className="h-4 w-4" />
                                  {(course.totalLessons ?? (course.lessons?.length ?? 0))}
                                </span>
                              </div>
                              <Button className="w-full mt-2" onClick={() => navigate(`/course/${course.id}`)}>
                                ادخل الكورس
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: Recent Activities (Opposite side) */}
              <aside className="lg:col-span-4">
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      الامتحانات والواجبات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.filter(a => a.type === 'exam' || (a.type === 'assignment' && a.status === 'pending')).length === 0 ? (
                      <div className="text-center py-8">
                        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات أو واجبات</h3>
                        <p className="text-gray-500">
                          ستظهر هنا الامتحانات والواجبات الجديدة عند توفرها
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {activities
                          .filter(a => {
                            if (a.type === 'assignment') return a.status === 'pending';
                            if (a.type === 'exam') {
                              if (a.status === 'overdue') {
                                const endAt = a.endAtMs ?? 0;
                                if (!endAt) return false;
                                const withinTwoHours = (nowMs - endAt) <= (2 * 60 * 60 * 1000);
                                return withinTwoHours;
                              }
                              return true;
                            }
                            return false;
                          })
                          .map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                {activity.type === 'quiz' && <FileText className="h-5 w-5 text-blue-500" />}
                                {activity.type === 'exam' && <Award className="h-5 w-5 text-red-500" />}
                                {activity.type === 'assignment' && <BookOpen className="h-5 w-5 text-green-500" />}
                                <div>
                                  <h4 className="text-sm font-medium">{activity.title}</h4>
                                  <p className="text-xs text-gray-500">{activity.course}</p>
                                  <p className="text-xs text-gray-400">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {activity.dueDate}
                                  </p>
                                  {activity.type === 'exam' && activity.openAtMs ? (
                                    <div className="text-xs text-red-600">
                                      {activity.status === 'overdue'
                                        ? (language === 'ar' ? 'لم تتمكن من الدخول الي الامتحان في الوقت المحدد' : 'You could not enter the exam within the allowed time')
                                        : ((activity.openAtMs - nowMs) > 0 
                                            ? `${language === 'ar' ? 'يفتح خلال: ' : 'Opens in: '} ${formatRemaining(activity.openAtMs - nowMs)}`
                                            : (language === 'ar' ? 'متاح الآن' : 'Available now')
                                          )
                                        }
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              {activity.type === 'exam' && activity.status !== 'overdue' ? (
                                <Button 
                                  size="sm" 
                                  disabled={((activity.openAtMs ?? 0) > nowMs && activity.status !== 'completed')}
                                  onClick={() => navigate(`/exam/${activity.id}${activity.status === 'completed' ? '?view=result' : ''}`)}
                                >
                                  {activity.status === 'completed' ? 'معلومات الامتحان' : 'ابدأ الامتحان'}
                                </Button>
                              ) : null}
                              <Badge 
                                variant={activity.status === 'completed' ? 'default' : 'secondary'}
                              >
                                {activity.status === 'completed' ? 'مكتمل' : 'معلق'}
                              </Badge>
                            </div>
                          ))}
                        <div className="mt-4 text-center">
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveSection('examResults')}
                          >
                            عرض نتائج الامتحانات
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
            </div>
            

          </div>
        )}

        {false && activeSection === 'courses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">كورساتي</h2>
              <Badge variant="outline">
                {enrolledCourses.length} دورة مسجلة
              </Badge>
            </div>
            
            {teacherCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد دورات متاحة</h3>
                  <p className="text-gray-500">
                    لا توجد دورات منشورة من المدرس حالياً.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center mb-4">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <p className="text-sm text-gray-500">{course.instructorName || studentInfo?.teacherName}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{course.lessons?.length || 0} دروس</span>
                          <Badge variant="secondary">{course.category}</Badge>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>المستوى: {course.level === 'beginner' ? 'مبتدئ' : course.level === 'intermediate' ? 'متوسط' : 'متقدم'}</span>
                          <span className="font-medium text-primary">
                            {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {course.description}
                        </p>
            <Button className="w-full" onClick={() => {
                          const isEnrolled = enrolledCourses.some((c: any) => c.id === course.id);
                          if (isEnrolled || ((course as any).price === 0)) {
                            navigate(`/course/${course.id}`);
                          } else {
                            navigate(`/course/${course.id}/details`);
                          }
                        }}>
                          {enrolledCourses.some((c: any) => c.id === course.id) || ((course as any).price === 0) ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              ابدأ الدورة
                            </>
                          ) : (
                            language === 'ar' ? 'تفاصيل الدورة' : 'Course Details'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'examResults' && (
          <div className="space-y-6" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900">نتائج الامتحانات</h2>
            {resultsView === 'list' ? (
              <>
                {resultsLoading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      جاري التحميل...
                    </CardContent>
                  </Card>
                ) : examResults.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج منشورة</h3>
                      <p className="text-gray-500">عند نشر درجاتك ستظهر هنا.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {examResults.map((res) => {
                      const meta = examMeta[res.examId];
                      const title = meta?.title || 'امتحان';
                      const courseTitle = meta?.courseTitle || meta?.courseId || '';
                      const att = examAttempts[res.examId] || {};
                      const submitted = att.submittedAt || res.submittedAt || null;
                      const startAt = att.startAt || null;
                      const durationMs = (startAt && submitted) ? (new Date(submitted).getTime() - new Date(startAt).getTime()) : null;
                      const durationText = durationMs ? formatDuration(durationMs) : '—';
                      const totalQuestions = (meta?.questions?.length ?? (res.examSnapshot?.questions?.length ?? null));
                      const solvedQuestions = Object.keys(res.answers || {}).length || null;
                      const manualEnabled = !!(meta?.settings?.manualGradingEnabled ?? res.examSnapshot?.settings?.manualGradingEnabled);
                      const awaitingManual = manualEnabled && res.status !== 'graded';
                      const score = res.score;
                      const totalPoints = res.total;
                      const percentage = (!awaitingManual && typeof score === 'number' && typeof totalPoints === 'number' && totalPoints > 0)
                        ? Math.round((score / totalPoints) * 100)
                        : null;
                      return (
                        <Card key={res.examId} className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg"><span className="flex items-center gap-2"><Award className="h-5 w-5 text-gray-400" /> {title}</span></CardTitle>
                              {courseTitle ? <Badge variant="secondary">{courseTitle}</Badge> : null}
                            </div>
                            {submitted ? (
                              <p className="text-sm text-gray-500 mt-1">
                                تم التسليم: {new Date(submitted as any).toLocaleDateString('ar-SA', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                })}
                              </p>
                            ) : null}
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              <div className="p-3 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500">الوقت المستهلك</div>
                                <div className="mt-1 text-base font-semibold">{durationText}</div>
                              </div>
                              <div className="p-3 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500">إجمالي الأسئلة</div>
                                <div className="mt-1 text-base font-semibold">{totalQuestions ?? '—'}</div>
                              </div>
                              <div className="p-3 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500">الأسئلة المحلولة</div>
                                <div className="mt-1 text-base font-semibold">{solvedQuestions ?? '—'}</div>
                              </div>
                              <div className="p-3 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500">النتيجة</div>
                                <div className="mt-1 text-base font-semibold">{awaitingManual ? 'بانتظار التصحيح' : ((score != null && totalPoints != null) ? `${score} / ${totalPoints}` : '—')}</div>
                              </div>
                              <div className="p-3 bg-gray-50 rounded border">
                                <div className="text-xs text-gray-500">النسبة المئوية</div>
                                <div className="mt-1 text-base font-semibold">{awaitingManual ? '__%' : (percentage != null ? `${percentage}%` : '—')}</div>
                              </div>
                            </div>

                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">تفاصيل الواجب</h3>
                  <Button variant="outline" onClick={() => { setAssignmentView('list'); setSelectedAssignmentResult(null); }}>رجوع إلى النتائج</Button>
                </div>
                {selectedAssignmentResult ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{(assignmentMeta[selectedAssignmentResult.assignmentId]?.title) || 'واجب'}</CardTitle>
                        <Badge variant={'default'}>
                          تم النشر
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{(assignmentMeta[selectedAssignmentResult.assignmentId]?.courseTitle) || ''}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-gray-700">
                          النتيجة: <span className="font-semibold">
                            {(() => {
                              const isManual = (assignmentMeta[selectedAssignmentResult.assignmentId]?.manualGradingEnabled) || (selectedAssignmentResult as any)?.manualGrading === true;
                              const isGraded = !!(selectedAssignmentResult as any)?.gradedAt;
                              if (isManual && !isGraded) {
                                return 'قيد التصحيح';
                              }
                              if (selectedAssignmentResult.earnedPoints != null && selectedAssignmentResult.totalPoints != null) {
                                return `${selectedAssignmentResult.earnedPoints} / ${selectedAssignmentResult.totalPoints}`;
                              }
                              if (selectedAssignmentResult.correct != null && selectedAssignmentResult.total != null) {
                                return `${selectedAssignmentResult.correct} / ${selectedAssignmentResult.total}`;
                              }
                              return '—';
                            })()}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {((assignmentMeta[selectedAssignmentResult.assignmentId]?.questions) || []).map((q: any, idx: number) => {
                            const yourAns = selectedAssignmentResult.answers?.[q.id];
                            let yourText = '';
                            let correctText = '';
                            let isCorrect: boolean | null = null;
                            const manual = false;
                            const showCorrectness = true;
                            if (q.type === 'mcq') {
                              const selected = (q.options || []).find((o: any) => o.id === yourAns);
                              yourText = selected ? selected.text : '—';
                              const corrects = (q.options || []).filter((o: any) => o.correct).map((o: any) => o.text);
                              const correctIds = (q.options || []).filter((o: any) => o.correct).map((o: any) => o.id);
                              correctText = corrects.join(', ');
                              const a = yourAns as string;
                              isCorrect = a ? correctIds.includes(a) : null;
                            } else if (q.type === 'fill') {
                              yourText = ((yourAns as string) || '').toString();
                              correctText = ((q as any).answer || '').toString();
                              const a = ((yourAns as string) || '').trim().toLowerCase();
                              const corr = ((q as any).answer || '').trim().toLowerCase();
                              isCorrect = a ? a === corr : null;
                            } else if (q.type === 'drag') {
                              const arr = Array.isArray(yourAns) ? (yourAns as string[]) : [];
                              const corr = ((q as any).correctOrder) || (q.items || []).map((i: any) => i.id);
                              const yourList = arr.map((id: string) => q.items?.find((i: any) => i.id === id)?.text || id);
                              const corrList = corr.map((id: string) => q.items?.find((i: any) => i.id === id)?.text || id);
                              yourText = yourList.join(' | ');
                              correctText = corrList.join(' | ');
                              isCorrect = Array.isArray(arr) && arr.length === corr.length && arr.every((id, i) => id === corr[i]);
                            } else if (q.type === 'essay') {
                              yourText = ((yourAns as string) || '').toString();
                              correctText = '';
                              isCorrect = null;
                            }
                            return (
                              <div key={q.id} className={`rounded border ${showCorrectness && isCorrect === false ? 'border-red-500' : ''}`}>
                                <div className="p-3 space-y-2">
                                  {(q as any).imageBase64 && (q as any).imagePosition === 'above' && (
                                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                  )}
                                  <div className={(q as any).imageBase64 && (((q as any).imagePosition === 'left') || ((q as any).imagePosition === 'right')) ? 'flex items-start gap-3' : ''}>
                                    {(q as any).imageBase64 && (q as any).imagePosition === 'left' && (
                                      <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                    )}
                                    <div className="font-medium flex-1">سؤال {String(idx + 1).padStart(2, '0')}: {q.text}</div>
                                    {(q as any).imageBase64 && (q as any).imagePosition === 'right' && (
                                      <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                    )}
                                  </div>
                                  {(q as any).imageBase64 && (q as any).imagePosition === 'below' && (
                                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                  )}
                                  <div className="text-sm">إجابتك: <span className="font-semibold">{yourText || '—'}</span></div>
                                  {showCorrectness && q.type !== 'essay' && (
                                    <div className="text-sm">الإجابة الصحيحة: <span className="font-semibold">{correctText || '—'}</span></div>
                                  )}
                                  {showCorrectness && isCorrect === false ? <div className="h-1 bg-red-500 rounded"></div> : null}
                                  {showCorrectness && isCorrect === false ? <div className="text-red-600 text-xs">إجابة غير صحيحة</div> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">لم يتم اختيار نتيجة</CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'results' && (
          <div className="space-y-6" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900">نتائج الواجبات</h2>
            {assignmentView === 'list' ? (
              <>
                {assignmentLoading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      جاري التحميل...
                    </CardContent>
                  </Card>
                ) : assignmentResults.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج منشورة</h3>
                      <p className="text-gray-500">عند نشر درجاتك ستظهر هنا.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {assignmentResults.map((res) => {
                      const meta = assignmentMeta[res.assignmentId];
                      const title = meta?.title || 'واجب';
                      const courseTitle = meta?.courseTitle || meta?.courseId || '';
                      const statusText = 'تم النشر';
                      return (
                        <Card key={res.assignmentId} className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg"><span className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-gray-400" /> {title}</span></CardTitle>
                              <Badge variant={'default'}>
                                {statusText}
                              </Badge>
                            </div>
                            {courseTitle ? <p className="text-sm text-gray-500 mt-1">{courseTitle}</p> : null}
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const totalQuestions = (meta?.questions?.length ?? (res.total ?? null));
                              const solvedQuestions = (res.correct ?? null);
                              const scorePoints = (res.earnedPoints != null && res.totalPoints != null) ? `${res.earnedPoints} / ${res.totalPoints}` : null;
                              const scoreAlt = (res.correct != null && res.total != null) ? `${res.correct} / ${res.total}` : null;
                              const percentage = (res.earnedPoints != null && res.totalPoints)
                                ? Math.round((res.earnedPoints / res.totalPoints) * 100)
                                : ((res.correct != null && res.total) ? Math.round((res.correct / res.total) * 100) : null);
                              return (
                                <>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                                      <div className="text-xs text-emerald-700">إجمالي الأسئلة</div>
                                      <div className="mt-1 text-base font-semibold text-emerald-900">{totalQuestions ?? '—'}</div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                                      <div className="text-xs text-emerald-700">المحلولة</div>
                                      <div className="mt-1 text-base font-semibold text-emerald-900">{solvedQuestions ?? '—'}</div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                                      <div className="text-xs text-emerald-700">النتيجة</div>
                                      <div className="mt-1 text-base font-semibold text-emerald-900">{(scorePoints || scoreAlt) ?? '—'}</div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                                      <div className="text-xs text-emerald-700">النسبة المئوية</div>
                                      <div className="mt-1 text-base font-semibold text-emerald-900">{percentage != null ? `${percentage}%` : '—'}</div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                                      <div className="text-xs text-emerald-700">حالة التصحيح</div>
                                      <div className="mt-1 text-base font-semibold text-emerald-900">{(res.gradedAt || (res.questionResults && Object.keys(res.questionResults).length > 0) || (typeof res.earnedPoints === 'number' && typeof res.totalPoints === 'number')) ? 'مصحّح' : 'قيد التصحيح'}</div>
                                    </div>
                                  </div>
                                  {res.feedback ? (
                                    <div className="mt-4 text-sm text-gray-600">
                                      ملاحظات المدرس: <span className="font-medium">{res.feedback}</span>
                                    </div>
                                  ) : null}
                                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                    {res.createdAt ? (
                                      <span>
                                        تم التسليم: {new Date(res.createdAt).toLocaleDateString('ar-SA', {
                                          year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                      </span>
                                    ) : <span></span>}
                                    {res.gradedAt ? (
                                      <span>
                                        تم التصحيح: {new Date(res.gradedAt).toLocaleDateString('ar-SA', {
                                          year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                      </span>
                                    ) : null}
                                  </div>
                                </>
                              )
                            })()}
                            <Button 
                              className="w-full mt-4" 
                              variant="outline" 
                              onClick={() => { setSelectedAssignmentResult(res); setAssignmentView('detail'); }}
                            >
                                تفاصيل الواجب
                              </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              // تفاصيل الواجب داخل نفس القسم
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">تفاصيل الواجب</h3>
                  <Button variant="outline" onClick={() => { setAssignmentView('list'); setSelectedAssignmentResult(null); }}>رجوع إلى النتائج</Button>
                </div>
                {selectedAssignmentResult ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{(assignmentMeta[selectedAssignmentResult.assignmentId]?.title) || 'واجب'}</CardTitle>
                        <Badge variant={'default'}>
                          تم النشر
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{(assignmentMeta[selectedAssignmentResult.assignmentId]?.courseTitle) || ''}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-gray-700">
                          النتيجة: <span className="font-semibold">
                            {selectedAssignmentResult.earnedPoints != null && selectedAssignmentResult.totalPoints != null 
                              ? `${selectedAssignmentResult.earnedPoints} / ${selectedAssignmentResult.totalPoints}` 
                              : (selectedAssignmentResult.correct != null && selectedAssignmentResult.total != null 
                                ? `${selectedAssignmentResult.correct} / ${selectedAssignmentResult.total}` 
                                : '—')}
                          </span>
                        </div>
                        {/* عرض الأسئلة والإجابات */}
                        <div className="space-y-3">
                          {(() => {
                            const manual = (assignmentMeta[selectedAssignmentResult.assignmentId]?.manualGradingEnabled) || (selectedAssignmentResult as any)?.manualGrading === true;
                            const pendingManual = manual && !(selectedAssignmentResult as any)?.gradedAt;
                            if (pendingManual) {
                              return (
                                <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 text-sm text-muted-foreground">
                                  {language === 'ar'
                                    ? 'تم إرسال الواجب للتصحيح. ستظهر التفاصيل بعد نشر الدرجة.'
                                    : 'Assignment submitted for manual grading. Details will appear after publishing.'}
                                </div>
                              );
                            }
                            return (assignmentMeta[selectedAssignmentResult.assignmentId]?.questions || []).map((q: any, idx: number) => {
                            const yourAns = selectedAssignmentResult.answers?.[q.id];
                            let yourText = '';
                            let correctText = '';
                            let isCorrect: boolean | null = null;
                            const showCorrectness = true;
                            if (q.type === 'mcq') {
                              const selected = (q.options || []).find((o: any) => o.id === yourAns);
                              yourText = selected ? selected.text : '—';
                              const corrects = (q.options || []).filter((o: any) => o.correct).map((o: any) => o.text);
                              const correctIds = (q.options || []).filter((o: any) => o.correct).map((o: any) => o.id);
                              correctText = corrects.join(', ');
                              const a = yourAns as string;
                              isCorrect = a ? correctIds.includes(a) : null;
                            } else if (q.type === 'fill') {
                              yourText = ((yourAns as string) || '').toString();
                              correctText = ((q as any).answer || '').toString();
                              const a = ((yourAns as string) || '').trim().toLowerCase();
                              const corr = ((q as any).answer || '').trim().toLowerCase();
                              isCorrect = a ? a === corr : null;
                            } else if (q.type === 'drag') {
                              const arr = Array.isArray(yourAns) ? (yourAns as string[]) : [];
                              const corr = ((q as any).correctOrder) || (q.items || []).map((i: any) => i.id);
                              const yourList = arr.map((id: string) => q.items?.find((i: any) => i.id === id)?.text || id);
                              const corrList = corr.map((id: string) => q.items?.find((i: any) => i.id === id)?.text || id);
                              yourText = yourList.join(' | ');
                              correctText = corrList.join(' | ');
                              isCorrect = Array.isArray(arr) && arr.length === corr.length && arr.every((id, i) => id === corr[i]);
                            } else if (q.type === 'essay') {
                              yourText = ((yourAns as string) || '').toString();
                              correctText = '';
                              isCorrect = null;
                            }
                            return (
                              <div key={q.id} className={`rounded border ${showCorrectness && isCorrect === false ? 'border-red-500' : ''}`}>
                                <div className="p-3 space-y-2">
                                  {(q as any).imageBase64 && (q as any).imagePosition === 'above' && (
                                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                  )}
                                  <div className={(q as any).imageBase64 && (((q as any).imagePosition === 'left') || ((q as any).imagePosition === 'right')) ? 'flex items-start gap-3' : ''}>
                                    {(q as any).imageBase64 && (q as any).imagePosition === 'left' && (
                                      <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                    )}
                                    <div className="font-medium flex-1">سؤال {String(idx + 1).padStart(2, '0')}: {q.text}</div>
                                    {(q as any).imageBase64 && (q as any).imagePosition === 'right' && (
                                      <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                    )}
                                  </div>
                                  {(q as any).imageBase64 && (q as any).imagePosition === 'below' && (
                                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                                  )}
                                  <div className="text-sm">إجابتك: <span className="font-semibold">{yourText || '—'}</span></div>
                                  {showCorrectness && q.type !== 'essay' && (
                                    <div className="text-sm">الإجابة الصحيحة: <span className="font-semibold">{correctText || '—'}</span></div>
                                  )}
                                  {showCorrectness && isCorrect === false ? <div className="h-1 bg-red-500 rounded"></div> : null}
                                  {showCorrectness && isCorrect === false ? <div className="text-red-600 text-xs">إجابة غير صحيحة</div> : null}
                                </div>
                              </div>
                            );
                            });
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">لم يتم اختيار نتيجة</CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'payments' && (
          <div className="space-y-6" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900">{language === 'ar' ? 'المدفوعات' : 'Payments'}</h2>
            
            <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  {language === 'ar' ? 'سجل المدفوعات' : 'Payment History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="text-center text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : payments.length === 0 ? (
                  <div className="text-center text-gray-500">
                    {language === 'ar' ? 'لا توجد مدفوعات حالياً' : 'No payments yet'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {payments.map((p: any) => {
                      const statusBadge = p.status === 'confirmed'
                        ? (<Badge variant="default" className="bg-emerald-600 text-white">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>)
                        : p.status === 'pending'
                        ? (<Badge variant="outline" className="border-yellow-300 text-yellow-700">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</Badge>)
                        : (<Badge variant="outline" className="border-red-300 text-red-700">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>);
                      const title = p.courseTitle || (language === 'ar' ? 'دورة' : 'Course');
                      const amount = p.amount != null ? `${p.amount}` : null;
                      const dateStr = (() => { try { const d = new Date(p.createdAt); return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return '';} })();
                      const wallet = p.walletProvider ? p.walletProvider : null;
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">{title}</div>
                              <div className="text-sm text-gray-500">{dateStr}{wallet ? ` • ${wallet}` : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {amount ? <div className="text-sm font-semibold text-gray-700">{amount}</div> : null}
                            {statusBadge}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">الملف الشخصي</h2>

            <Tabs defaultValue="info" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">معلومات</TabsTrigger>
                <TabsTrigger value="avatar">الصورة</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">الاسم الكامل</Label>
                        <Input id="fullName" value={profileFullName} onChange={(e) => setProfileFullName(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input id="email" value={studentInfo?.email || ''} disabled />
                      </div>
                      <div>
                        <Label htmlFor="studentPhone">رقم هاتف الطالب</Label>
                        <Input id="studentPhone" value={profileStudentPhone} onChange={(e) => setProfileStudentPhone(e.target.value)} placeholder="05xxxxxxxx" />
                      </div>
                      <div>
                        <Label htmlFor="parentPhone">رقم هاتف ولي الأمر</Label>
                        <Input id="parentPhone" value={profileParentPhone} onChange={(e) => setProfileParentPhone(e.target.value)} placeholder="05xxxxxxxx" />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button variant="secondary" onClick={handleResetPassword}>نسيت كلمة السر</Button>
                      <Button onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile ? 'جارٍ الحفظ...' : 'حفظ'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="avatar" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profilePhotoURL || user?.photoURL || ''} alt={studentInfo?.name || 'الطالب'} />
                        <AvatarFallback>{getInitials(studentInfo?.name || 'الطالب')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm text-gray-600">اختر صورة جديدة لتحديث الأفاتار</p>
                        <input type="file" accept="image/*" onChange={(e) => e.target.files && handleAvatarFile(e.target.files[0])} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" disabled={uploadingAvatar}>
                        {uploadingAvatar ? 'جارٍ الرفع...' : 'تحديث الصورة'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Footer */}
       <footer className="bg-card border-t border-border text-center text-sm text-muted-foreground">
         <div className="py-4">
           © Manara Academy 2025 - جميع الحقوق محفوظة
         </div>
       </footer>
     </div>
   );
 };

export default StudentDashboard;
