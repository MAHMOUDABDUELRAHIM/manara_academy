import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import InviteHeader from '@/components/InviteHeader';
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CourseService } from '@/services/courseService';
import { StudentService } from '@/services/studentService';
import { TeacherService } from '@/services/teacherService';
import { ExamService, ExamDoc } from '@/services/examService';
import AssignmentService, { AssignmentDoc } from '@/services/assignmentService';
import { 
  BookOpen, 
  Play, 
  ArrowLeft,
  FileText,
  HelpCircle,
  Video,
  Loader2,
  PlayCircle,
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  Award,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

const CourseContent = () => {
  // إعدادات Bunny المأخوذة من متغيرات البيئة
  const bunnyLibraryId = import.meta.env.VITE_BUNNY_LIBRARY_ID as string | undefined;
  const bunnyCdnHost = import.meta.env.VITE_BUNNY_CDN_HOST as string | undefined;
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuthContext();

  // Real state from Firestore
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [answersByAssignment, setAnswersByAssignment] = useState<Record<string, Record<string, string>>>({});
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [selectedLessonId, setSelectedLessonId] = useState<string | number | null>(null);
  const [selectedItem, setSelectedItem] = useState<{type:'lesson'|'assignment'|'exam', id:string} | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [examResults, setExamResults] = useState<Record<string, any>>({});
  const [examAttempts, setExamAttempts] = useState<Record<string, { startAt?: Date; submittedAt?: Date }>>({});
  const [assignmentResults, setAssignmentResults] = useState<Record<string, any>>({});
  const [showingResultsForAssignment, setShowingResultsForAssignment] = useState<string | null>(null);
  // WhatsApp floating button settings
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [showWhatsappFloat, setShowWhatsappFloat] = useState<boolean>(false);
  // Branding settings for header (logo and platform name)
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [brandLogoScale, setBrandLogoScale] = useState<number>(1);
  const [brandNameScale, setBrandNameScale] = useState<number>(1);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLIFrameElement | HTMLVideoElement | null>(null);
  const [storageOverCap, setStorageOverCap] = useState<boolean>(false);
  // إعدادات Bunny مُعرَّفة بالفعل أعلى المكوّن

  const normalizedWhatsapp = (whatsappNumber || '').replace(/[^+\d]/g, '');
  const shouldShowWhatsapp = !!showWhatsappFloat && !!normalizedWhatsapp;

  // ساعة العد التنازلي لفتح الامتحانات
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load student's exam result for selected exam to control sidebar actions
  useEffect(() => {
    async function loadExamResult() {
      try {
        if (selectedItem?.type === 'exam' && user?.uid) {
          const res = await StudentService.getExamResult(user.uid, selectedItem.id);
          setExamResults((prev) => ({ ...prev, [selectedItem.id]: res }));
        }
      } catch {}
    }
    loadExamResult();
  }, [selectedItem?.id, selectedItem?.type, user?.uid]);

  // Load and subscribe to student's assignment attempts so results update in realtime when teacher publishes grades
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      try {
        if (!user?.uid) return;
        // Initial load
        const attempts = await AssignmentService.getAssignmentAttemptsForStudent(user.uid);
        const initialMap: Record<string, any> = {};
        for (const att of attempts) {
          if (att.assignmentId) initialMap[att.assignmentId] = att;
        }
        setAssignmentResults(initialMap);
        // Subscribe for live updates (gradedAt/questionResults)
        unsubscribe = AssignmentService.listenAssignmentAttemptsForStudent(user.uid, (list) => {
          const map: Record<string, any> = {};
          for (const att of list) {
            if (att.assignmentId) map[att.assignmentId] = att;
          }
          setAssignmentResults(map);
        });
      } catch (e) {
        console.warn('Failed to watch assignment attempts for student', e);
      }
    };
    init();
    return () => { try { if (unsubscribe) unsubscribe(); } catch {} };
  }, [user?.uid]);

  // Load student's exam attempt timing info for duration calculation
  useEffect(() => {
    async function loadExamAttempt() {
      try {
        if (selectedItem?.type === 'exam' && user?.uid) {
          const att = await StudentService.getExamAttempt(user?.uid, selectedItem.id);
          if (att) setExamAttempts((prev) => ({ ...prev, [selectedItem.id]: att }));
        }
      } catch {}
    }
    loadExamAttempt();
  }, [selectedItem?.id, selectedItem?.type, user?.uid]);

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return language === 'ar' ? 'متاح الآن' : 'Available now';
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const parts: string[] = [];
    if (days) parts.push(`${days}${language === 'ar' ? 'ي' : 'd'}`);
    if (hours) parts.push(`${hours}${language === 'ar' ? 'س' : 'h'}`);
    if (minutes) parts.push(`${minutes}${language === 'ar' ? 'د' : 'm'}`);
    if (seconds) parts.push(`${seconds}${language === 'ar' ? 'ث' : 's'}`);
    return parts.join(' ');
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!courseId) {
          throw new Error(language === 'ar' ? 'معرّف الدورة غير موجود في الرابط' : 'Course ID is missing from route');
        }

        // Fetch course
        const courseData = await CourseService.getCourseById(courseId);
        if (!courseData) {
          throw new Error(language === 'ar' ? 'لم يتم العثور على الدورة' : 'Course not found');
        }
        // Guard: allow الوصول فقط لدورات المدرس المرتبط بالطالب
        let linkedTeacher: any | null = null;
        if (user?.uid) {
          try {
            linkedTeacher = await TeacherService.getTeacherForStudent(user.uid);
            if (linkedTeacher && courseData.instructorId !== linkedTeacher.id) {
              throw new Error(language === 'ar' ? 'لا يمكنك الوصول لهذه الدورة لأنها من مدرس آخر' : 'You cannot access this course; it belongs to another teacher');
            }
          } catch (guardErr) {
            throw guardErr;
          }
        }
        if (!isMounted) return;
        setCourse(courseData);
        {
          const now = new Date();
          const raw = Array.isArray(courseData.lessons) ? courseData.lessons : [];
          const visible = raw.filter((l: any) => {
            const vis = (l?.visibility || 'public');
            const at = l?.publishAt ? new Date(l.publishAt) : null;
            if (vis === 'public') return true;
            if (vis === 'scheduled') return !!at && at <= now;
            return false; // private hidden regardless of publishAt
          });
          setLessons(visible);
        }

        // Fetch scheduled exams for this course (to show countdown before opening)
        try {
          const examsData = await ExamService.getScheduledExamsForCourse(courseId);
          if (isMounted) setExams(examsData);
        } catch (e) {
          console.warn('Failed to load exams for course', courseId, e);
        }

        // Fetch published assignments for this course
        try {
          const asgs = await AssignmentService.getAssignmentsForCourse(courseId);
          if (isMounted) setAssignments(asgs);
        } catch (e) {
          console.warn('Failed to load assignments for course', courseId, e);
        }

        // Fetch progress for current student
        if (user?.uid) {
          try {
            const progress = await StudentService.getCourseProgress(user.uid, courseId);
            if (progress) {
              setProgressPercentage(progress.completionPercentage || 0);
            } else {
              setProgressPercentage(0);
            }
          } catch (pErr) {
            // Don't block page if progress fails; just show 0%
            console.warn('Progress load failed:', pErr);
            setProgressPercentage(0);
          }
        } else {
          setProgressPercentage(0);
        }

        // Load WhatsApp settings from teacher profile and settings
        try {
          const teacherIdForPage = (linkedTeacher?.id) || courseData.instructorId;
          if (teacherIdForPage) {
            try {
              const teacherData = await TeacherService.getTeacherProfile(teacherIdForPage);
              if (teacherData) {
                const tWhats = (teacherData as any)?.whatsappNumber as string | undefined;
                const tShow = (teacherData as any)?.showWhatsappFloat as boolean | undefined;
                if (typeof tWhats === 'string' && tWhats.trim()) setWhatsappNumber(tWhats);
                if (typeof tShow === 'boolean') setShowWhatsappFloat(!!tShow);
                const over95 = !!(teacherData as any)?.storageOver95Pct;
                setStorageOverCap(over95);
              }
            } catch (e) {
              console.warn('Failed to load public teacher profile for course page', e);
            }
            try {
              const settingsSnap = await getDoc(doc(db, 'teacherSettings', teacherIdForPage));
              if (settingsSnap.exists()) {
                const data = settingsSnap.data() as any;
                if (typeof data?.whatsappNumber === 'string' && data.whatsappNumber.trim()) {
                  setWhatsappNumber(data.whatsappNumber);
                }
                if (typeof data?.showWhatsappFloat === 'boolean') {
                  setShowWhatsappFloat(!!data.showWhatsappFloat);
                }
              }
            } catch (e) {
              console.warn('Failed to load teacherSettings for course page', e);
            }
          }
        } catch (e) {
          console.warn('Failed to resolve WhatsApp settings for course page', e);
        }

        // Load branding settings (logo and platform name) from teacher profile and settings
        try {
          const teacherIdForPage = (linkedTeacher?.id) || courseData.instructorId;
          if (teacherIdForPage) {
            try {
              const teacherData = await TeacherService.getTeacherProfile(teacherIdForPage);
              if (teacherData) {
                const brandLogoBase64 = (teacherData as any)?.brandLogoBase64 ?? (teacherData as any)?.platformLogoBase64;
                const platformName = (teacherData as any)?.platformName;
                const logoScaleRaw = (teacherData as any)?.brandLogoScale;
                const nameScaleRaw = (teacherData as any)?.brandNameScale;
                if (typeof brandLogoBase64 === 'string' && brandLogoBase64.trim()) setBrandLogo(brandLogoBase64);
                if (typeof platformName === 'string' && platformName.trim()) setBrandName(platformName);
                if (typeof logoScaleRaw === 'number') setBrandLogoScale(logoScaleRaw);
                if (typeof nameScaleRaw === 'number') setBrandNameScale(nameScaleRaw);
              }
            } catch (e) {
              console.warn('Failed to load public branding for course page', e);
            }
            try {
              const settingsSnap = await getDoc(doc(db, 'teacherSettings', teacherIdForPage));
              if (settingsSnap.exists()) {
                const data = settingsSnap.data() as any;
                const sBrandLogo = data?.platformLogoBase64 ?? data?.brandLogoBase64;
                const sPlatformName = data?.platformName;
                const sLogoScale = data?.brandLogoScale;
                const sNameScale = data?.brandNameScale;
                if (typeof sBrandLogo === 'string' && sBrandLogo.trim()) setBrandLogo(sBrandLogo);
                if (typeof sPlatformName === 'string' && sPlatformName.trim()) setBrandName(sPlatformName);
                if (typeof sLogoScale === 'number') setBrandLogoScale(sLogoScale);
                if (typeof sNameScale === 'number') setBrandNameScale(sNameScale);
              }
            } catch (e) {
              console.warn('Failed to load teacherSettings branding for course page', e);
            }
          }
        } catch (e) {
          console.warn('Failed to resolve branding for course page', e);
        }
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء التحميل' : 'An error occurred while loading'));
        // إعادة التوجيه إلى لوحة التحكم لحالات عدم السماح بالدخول
        try { navigate('/dashboard'); } catch {}
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [courseId, user?.uid, language]);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'assignment':
        return <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'exam':
        return <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'video':
        return <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'text':
        return <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      case 'quiz':
        return <HelpCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const handleLessonClick = (lesson: any) => {
    try {
      const id = lesson?.id ?? lesson?.order ?? null;
      setSelectedLessonId(id);
      if (id != null) {
        setSelectedItem({ type: 'lesson', id: String(id) });
      }
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    } catch (e) {
      console.warn('Failed to open lesson:', e);
    }
  };

  const closeLesson = () => {
    setSelectedLessonId(null);
    setSelectedItem(null);
    // إعادة ضبط
  };

  const getTimelineItems = () => {
    // ترتيب الدروس
    const lessonsSorted = [...lessons].sort((a, b) => {
      const aOrder = Number(a.order ?? 0);
      const bOrder = Number(b.order ?? 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return aDate - bDate;
    });

    // ترتيب الواجبات
    const assignmentsSorted = [...assignments].sort((a, b) => {
      const aDate = (a.publishedAt || a.createdAt) ? new Date((a.publishedAt || a.createdAt) as any).getTime() : 0;
      const bDate = (b.publishedAt || b.createdAt) ? new Date((b.publishedAt || b.createdAt) as any).getTime() : 0;
      return aDate - bDate;
    });

    // ترتيب الامتحانات
    const examsSorted = [...exams].sort((a, b) => {
      const ad = a.scheduledAt ? new Date(a.scheduledAt as any).getTime() : 0;
      const bd = b.scheduledAt ? new Date(b.scheduledAt as any).getTime() : 0;
      return ad - bd;
    });

    return [
      ...lessonsSorted.map((l) => ({
        type: 'lesson' as const,
        id: String(l.id ?? l.order ?? ''),
        title: language === 'ar' ? (l.titleAr || l.title) : l.title,
        subtitle: l.duration || undefined,
        dateMs: l.createdAt ? new Date(l.createdAt as any).getTime() : Number(l.order ?? 0),
      })),
      ...assignmentsSorted.map((a) => ({
        type: 'assignment' as const,
        id: String(a.id),
        title: a.title,
        subtitle: a.courseTitle || undefined,
        dateMs: (a.publishedAt || a.createdAt) ? new Date((a.publishedAt || a.createdAt) as any).getTime() : 0,
      })),
      ...examsSorted.map((e) => ({
        type: 'exam' as const,
        id: String(e.id),
        title: e.title,
        subtitle: e.description || undefined,
        dateMs: e.scheduledAt ? new Date(e.scheduledAt as any).getTime() : 0,
      }))
    ].sort((a, b) => a.dateMs - b.dateMs);
  };

  const completeLesson = async (lessonId: string) => {
    try {
      // إضافة الدرس للدروس المكتملة
      setCompletedLessons(prev => new Set([...prev, lessonId]));
      
      // تحديث شريط التقدم
      const totalLessons = lessons.length;
      const completedCount = completedLessons.size + 1; // +1 للدرس الحالي
      const newProgress = Math.round((completedCount / totalLessons) * 100);
      setProgressPercentage(newProgress);

      // إشعار بالإكمال
      toast.success(language === 'ar' ? 'تم إكمال الدرس بنجاح!' : 'Lesson completed successfully!');

      // الانتقال للعنصر التالي في القائمة
      const timelineItems = getTimelineItems();
      const currentIndex = timelineItems.findIndex(item => 
        item.type === 'lesson' && String(item.id) === lessonId
      );
      
      if (currentIndex !== -1 && currentIndex < timelineItems.length - 1) {
        const nextItem = timelineItems[currentIndex + 1];
        setSelectedItem({ type: nextItem.type as 'lesson'|'assignment'|'exam', id: String(nextItem.id) });
        
        if (nextItem.type === 'lesson') {
          setSelectedLessonId(nextItem.id);
        } else if (nextItem.type === 'assignment') {
          setActiveAssignmentId(String(nextItem.id));
        }

        // التمرير للعنصر الجديد
        setTimeout(() => {
          playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

      // حفظ التقدم في قاعدة البيانات (اختياري)
      if (user?.uid && courseId) {
        try {
          await StudentService.updateLessonProgress(user.uid, courseId, lessonId, true);
        } catch (error) {
          console.warn('Failed to save progress to database:', error);
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إكمال الدرس' : 'Error completing lesson');
    }
  };

  const renderLessonPlayer = () => {
    if (!selectedItem || selectedItem.type !== 'lesson') return null;
    const lesson = lessons.find(l => String(l.id ?? l.order) === selectedItem.id);
    if (!lesson) return (
      <div className="text-muted-foreground">
        {language === 'ar' ? 'لم يتم العثور على الدرس' : 'Lesson not found'}
      </div>
    );
    return (
      <div ref={playerRef} className="space-y-6">
        {/* Video Player Section */}
        <div className="w-full">
          {(() => {
            if (storageOverCap) {
              return (
                <div className="w-full h-48 flex items-center justify-center bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {language === 'ar' ? 'الفيديو غير متوفر في الوقت الحالي' : 'Video is not available at the moment'}
                    </span>
                  </div>
                </div>
              );
            }
            const hasVideo = lesson.type === 'video';
            if (hasVideo) {
              const raw = lesson?.videoUrl || lesson?.content || lesson?.url || '';
              const looksLikeGuid = /^[0-9a-fA-F-]{36}$/.test(raw);
              if (looksLikeGuid && bunnyLibraryId) {
                const iframeSrc = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${raw}?autoplay=false`;
                return (
                  <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{aspectRatio: '16/9'}}>
                    <iframe
                      ref={videoElRef as React.RefObject<HTMLIFrameElement>}
                      className="absolute inset-0 w-full h-full"
                      src={iframeSrc}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              if (raw) {
                return (
                  <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{aspectRatio: '16/9'}}>
                    <video
                      className="w-full h-full object-cover"
                      controls
                      src={raw}
                      poster={lesson?.thumbnail || lesson?.previewImage || lesson?.image || course?.thumbnail || course?.previewImage || course?.image}
                    />
                  </div>
                );
              }
              return (
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center" style={{aspectRatio: '16/9'}}>
                  <div className="text-center text-muted-foreground">
                    <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{language === 'ar' ? 'لا يوجد فيديو متاح' : 'No video available'}</p>
                  </div>
                </div>
              );
            } else if (lesson.type === 'text') {
              return (
                <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <div className="prose max-w-none whitespace-pre-wrap dark:prose-invert">
                    {lesson.content}
                  </div>
                </div>
              );
            } else {
              return (
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center" style={{aspectRatio: '16/9'}}>
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{language === 'ar' ? 'لا يوجد محتوى متاح' : 'No content available'}</p>
                  </div>
                </div>
              );
            }
          })()}
        </div>

        {/* Title and Description Section */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'ar' ? (lesson.titleAr || lesson.title) : lesson.title}
          </h1>
          
          {(lesson.description || lesson.descriptionAr || course?.description || course?.descriptionAr) && (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {language === 'ar'
                ? (lesson.descriptionAr || lesson.description || course?.descriptionAr || course?.description)
                : (lesson.description || course?.description)}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {!completedLessons.has(String(lesson.id ?? lesson.order)) && (
              <Button 
                onClick={() => completeLesson(String(lesson.id ?? lesson.order))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تم إكمال الدرس' : 'Mark as Complete'}
              </Button>
            )}
            {completedLessons.has(String(lesson.id ?? lesson.order)) && (
              <div className="flex items-center text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تم الإكمال' : 'Completed'}
              </div>
            )}
            <Button variant="secondary" onClick={closeLesson}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إخفاء المشغل' : 'Hide player'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAssignmentPlayer = () => {
    if (!selectedItem || selectedItem.type !== 'assignment') return null;
    const asg = assignments.find(a => a.id === selectedItem.id);
    if (!asg) return (
      <div className="text-muted-foreground">
        {language === 'ar' ? 'لم يتم العثور على الواجب' : 'Assignment not found'}
      </div>
    );
    // If manual grading with availability window has ended, block entry
    if (asg.manualGradingEnabled) {
      const now = Date.now();
      let endAtMs: number | null = null;
      if (asg.windowEndAt) {
        try { endAtMs = new Date(asg.windowEndAt as any).getTime(); } catch {}
      }
      if (!endAtMs && asg.availabilityDays) {
        try {
          const created = asg.createdAt ? new Date(asg.createdAt as any) : new Date();
          const end = new Date(created);
          end.setDate(created.getDate() + (asg.availabilityDays as number));
          end.setHours(23, 59, 59, 999);
          endAtMs = end.getTime();
        } catch {}
      }
      if (endAtMs && now > endAtMs) {
        return (
          <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            {language === 'ar' ? 'انتهت مدة تسليم الواجب. لا يمكنك الدخول إلى الواجب بعد الآن.' : 'The assignment submission window has ended. You can no longer access this assignment.'}
          </div>
        );
      }
    }
    // If there's an existing attempt for this assignment, do not show the questions again
    if (assignmentResults[asg.id!]) return null;
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{asg.title}</h2>
          {asg.courseTitle ? (
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? `الدورة: ${asg.courseTitle}` : `Course: ${asg.courseTitle}`}
            </p>
          ) : null}
        </div>
        {asg.questions.map((q) => (
          <div key={q.id} className="border rounded p-3">
            <div className="relative">
              <p className="font-medium mb-2">{q.text}</p>
              {q.imageBase64 && (
                <div className="relative min-h-[160px] border rounded">
                  <img
                    src={q.imageBase64}
                    alt="question"
                    style={{ position: 'absolute', left: (q.imagePosition?.x || 0), top: (q.imagePosition?.y || 0), width: q.imageWidth ?? 320 }}
                    className="rounded"
                  />
                </div>
              )}
            </div>
            {q.type === 'essay' ? (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  value={(answersByAssignment[asg.id!] || {})[q.id] || ''}
                  onChange={(e) => setAnswersByAssignment(prev => ({
                    ...prev,
                    [asg.id!]: { ...(prev[asg.id!] || {}), [q.id]: e.target.value }
                  }))}
                  placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}
                />
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'سيتم تصحيح هذا السؤال يدويًا.' : 'This question will be graded manually.'}
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const checked = (answersByAssignment[asg.id!] || {})[q.id] === opt.id;
                  return (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`assign-${asg.id}-${q.id}`}
                        value={opt.id}
                        checked={checked}
                        onChange={() => handleSelectAnswer(asg.id!, q.id, opt.id)}
                      />
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setActiveAssignmentId(null); setSelectedItem(null); }}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={() => submitAssignmentAttempt(asg.id!)} disabled={submittingAssignmentId === asg.id}>
            {language === 'ar' ? 'إنهاء الواجب' : 'Finish Assignment'}
          </Button>
        </div>
      </div>
    );
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (language === 'ar') {
      if (hours > 0) return `${hours} ساعة ${minutes} دقيقة ${seconds} ثانية`;
      return `${minutes} دقيقة ${seconds} ثانية`;
    }
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const renderAssignmentResults = () => {
    if (!showingResultsForAssignment) return null;
    
    const assignment = assignments.find(a => a.id === showingResultsForAssignment);
    const result = assignmentResults[showingResultsForAssignment];
    
    if (!assignment || !result) return null;
    const hasComputedScore = typeof result?.earnedPoints === 'number' && typeof result?.totalPoints === 'number';
    const hasPerQuestion = !!result?.questionResults && Object.keys(result.questionResults || {}).length > 0;
    const isManualPending = !!result.manualGrading && !(result.gradedAt || hasPerQuestion || hasComputedScore);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {language === 'ar' ? 'نتائج الواجب' : 'Assignment Results'}
          </h3>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowingResultsForAssignment(null);
              setSelectedItem(null);
            }}
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </div>
        
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Award className="h-6 w-6 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                {assignment.title}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {isManualPending ? (language === 'ar' ? 'قيد التصحيح' : 'Pending grading') : `${(result.earnedPoints ?? 0)}/${(result.totalPoints ?? assignment.questions?.reduce((s: number, q: any) => s + (q.points || 0), 0))}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'النقاط' : 'Points'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {isManualPending ? '__' : `${(result.correctQuestions ?? result.correct ?? 0)}/${(result.totalQuestions ?? result.total ?? (assignment.questions?.length ?? 0))}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الأسئلة الصحيحة' : 'Correct Questions'}
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {language === 'ar' ? 'النسبة المئوية: ' : 'Percentage: '}
                <span className="text-green-600">
                  {isManualPending ? '—' : `${Math.round(((result.earnedPoints ?? 0) / ((result.totalPoints ?? assignment.questions?.reduce((s: number, q: any) => s + (q.points || 0), 0)) || 1)) * 100)}%`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Detailed question results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {language === 'ar' ? 'تفاصيل الأسئلة' : 'Question Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isManualPending ? (
              <div className="p-3 rounded-lg border bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'تم إرسال الواجب للتصحيح. ستظهر التفاصيل بعد نشر الدرجة.'
                  : 'Assignment submitted for manual grading. Details will appear after publishing.'}
              </div>
            ) : (
              assignment.questions?.map((question, index) => {
                const isCorrect = result.questionResults?.[question.id]?.isCorrect === true;
                const pointsAwarded = Number(result.questionResults?.[question.id]?.pointsAwarded ?? (isCorrect ? (question.points || 0) : 0));
                return (
                  <div key={question.id} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">
                          {language === 'ar' ? `السؤال ${index + 1}: ` : `Question ${index + 1}: `}
                          {question.text}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'النقاط: ' : 'Points: '}
                          {pointsAwarded}/{question.points}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderExamPanel = () => {
    if (!selectedItem || selectedItem.type !== 'exam') return null;
    const exam = exams.find(e => e.id === selectedItem.id);
    if (!exam) return (
      <div className="text-muted-foreground">
        {language === 'ar' ? 'لم يتم العثور على الامتحان' : 'Exam not found'}
      </div>
    );
    const openAt = exam.scheduledAt ? new Date(exam.scheduledAt as any) : null;
    const openAtMs = openAt ? openAt.getTime() : 0;
    const remainingMs = openAtMs - nowMs;
    const timeLimit = exam.settings?.timeLimitMinutes ?? null;
    const windowEnd = exam.settings?.windowEndAt ? new Date(exam.settings.windowEndAt as any) : null;
    const endMs = windowEnd
      ? windowEnd.getTime()
      : (timeLimit ? openAtMs + timeLimit * 60000 : null);
    const hasEnded = endMs !== null && nowMs >= endMs;
    const res = examResults[exam.id];
    const hasResult = !!res;
    const isLocked = remainingMs > 0;
 
// If exam ended or student has a saved result, show result card with same styling as dashboard
if (hasEnded || hasResult) {
  const att = examAttempts[exam.id] || {};
  const submitted = att.submittedAt || res?.submittedAt || null;
  const startAt = att.startAt || null;
  const durationMs = (startAt && submitted) ? (new Date(submitted).getTime() - new Date(startAt).getTime()) : null;
  const durationText = durationMs ? formatDuration(durationMs) : '—';
  const totalQuestions = (exam.questions?.length ?? (res?.examSnapshot?.questions?.length ?? null));
  const solvedQuestions = Object.keys(res?.answers || {}).length || null;
  const score = res?.score;
  const totalPoints = res?.total;
  const percentage = (typeof score === 'number' && typeof totalPoints === 'number' && totalPoints > 0)
    ? Math.round((score / totalPoints) * 100)
    : null;
  const courseTitle = exam.courseTitle || '';

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg"><span className="flex items-center gap-2"><Award className="h-5 w-5 text-gray-400" /> {exam.title}</span></CardTitle>
          {courseTitle ? <Badge variant="secondary">{courseTitle}</Badge> : null}
        </div>
        {submitted ? (
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar' ? 'تم التسليم: ' : 'Submitted: '} {new Date(submitted as any).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500">{language === 'ar' ? 'الوقت المستهلك' : 'Time Spent'}</div>
            <div className="mt-1 text-base font-semibold">{durationText}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500">{language === 'ar' ? 'إجمالي الأسئلة' : 'Total Questions'}</div>
            <div className="mt-1 text-base font-semibold">{totalQuestions ?? '—'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500">{language === 'ar' ? 'الأسئلة المحلولة' : 'Solved Questions'}</div>
            <div className="mt-1 text-base font-semibold">{solvedQuestions ?? '—'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500">{language === 'ar' ? 'النتيجة' : 'Score'}</div>
            <div className="mt-1 text-base font-semibold">{(score != null && totalPoints != null) ? `${score} / ${totalPoints}` : '—'}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500">{language === 'ar' ? 'النسبة المئوية' : 'Percentage'}</div>
            <div className="mt-1 text-base font-semibold">{percentage != null ? `${percentage}%` : '—'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    // Default exam info and start button when available
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">{exam.title}</h2>
        {openAt && (
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'ar' ? 'موعد الامتحان: ' : 'Scheduled: '} {openAt.toLocaleString()}
          </p>
        )}
        {hasEnded ? (
          <div className="text-sm text-red-600 font-medium mb-4">
            {language === 'ar' ? 'انتهت صلاحية الدخول للامتحان' : 'Exam entry expired'}
          </div>
        ) : (
          <>
            <p className="text-xs text-red-600 mb-4">
              {language === 'ar' ? 'يفتح خلال: ' : 'Opens in: '} {formatRemaining(remainingMs)}
            </p>
            <Button onClick={() => navigate(`/exam/${exam.id}`)} disabled={isLocked}>
              <Play className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'بدء الامتحان' : 'Start Exam'}
            </Button>
          </>
        )}
      </div>
    );
  };

  const handleStartAssignment = (assignmentId: string) => {
    setActiveAssignmentId(assignmentId);
    setSelectedItem({ type: 'assignment', id: assignmentId });
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleSelectAnswer = (assignmentId: string, questionId: string, optionId: string) => {
    setAnswersByAssignment(prev => ({
      ...prev,
      [assignmentId]: { ...(prev[assignmentId] || {}), [questionId]: optionId }
    }));
  };

  const submitAssignmentAttempt = async (assignmentId: string) => {
    if (!user?.uid || !courseId) {
      toast.error(language === 'ar' ? 'يرجى تسجيل الدخول للمحاولة' : 'Please login to attempt');
      return;
    }
    // Confirm submission before finalizing
    const confirmed = window.confirm(language === 'ar'
      ? 'هل أنت متأكد من إنهاء وتسليم الواجب؟ لن تظهر الأسئلة مرة أخرى وسيتم عرض النتائج.'
      : 'Are you sure you want to finish and submit the assignment? Questions will not reappear and results will be shown.'
    );
    if (!confirmed) return;
    
    // Find the assignment to check if manual grading is enabled
    const assignment = assignments.find(a => a.id === assignmentId);
    
    try {
      setSubmittingAssignmentId(assignmentId);
      const answers = answersByAssignment[assignmentId] || {};
      const res = await AssignmentService.submitAssignmentAttempt({
        assignmentId,
        studentId: user.uid,
        courseId,
        answers
      });
      
      // Check if manual grading is enabled
      if (assignment?.manualGradingEnabled) {
        // Manual grading - show message and show pending results card
        toast.success(language === 'ar'
          ? 'تم إرسال الواجب لقسم التصحيح، ستظهر نتيجتك قريباً'
          : 'Assignment submitted for grading, results will be available soon'
        );
        const totalPoints = (assignment?.questions || []).reduce((sum: number, q: any) => sum + (q.points || 0), 0);
        const totalQuestions = (assignment?.questions || []).length;
        setAssignmentResults(prev => ({
          ...prev,
          [assignmentId]: {
            manualGrading: true,
            gradedAt: null,
            totalPoints,
            totalQuestions,
            earnedPoints: null,
            correctQuestions: null,
            questionResults: {}
          }
        }));
        setShowingResultsForAssignment(assignmentId);
        setActiveAssignmentId(null);
        setSelectedItem(null);
      } else {
        // Automatic grading - show results immediately
        setAssignmentResults(prev => ({ ...prev, [assignmentId]: res }));
        setShowingResultsForAssignment(assignmentId);
        setActiveAssignmentId(null);
      }
    } catch (e) {
      console.error('Submit assignment failed', e);
      toast.error(language === 'ar' ? 'تعذر إرسال الواجب' : 'Failed to submit assignment');
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const lessonsSorted = [...lessons].sort((a,b) => {
    const ao = Number(a.order ?? 0); const bo = Number(b.order ?? 0);
    if (ao !== bo) return ao - bo;
    const ad = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
    return ad - bd;
  });
  const assignmentsSorted = [...assignments].sort((a,b) => {
    const ad = (a.publishedAt || a.createdAt) ? new Date((a.publishedAt || a.createdAt) as any).getTime() : 0;
    const bd = (b.publishedAt || b.createdAt) ? new Date((b.publishedAt || b.createdAt) as any).getTime() : 0;
    return ad - bd;
  });
  const examsSorted = [...exams].sort((a,b) => {
    const ad = a.scheduledAt ? new Date(a.scheduledAt as any).getTime() : 0;
    const bd = b.scheduledAt ? new Date(b.scheduledAt as any).getTime() : 0;
    return ad - bd;
  });
  const timelineItems = [
    ...lessonsSorted.map((l) => ({
      type: 'lesson' as const,
      id: String(l.id ?? l.order ?? ''),
      title: language === 'ar' ? (l.titleAr || l.title) : l.title,
      subtitle: l.duration || undefined,
      dateMs: l.createdAt ? new Date(l.createdAt as any).getTime() : Number(l.order ?? 0),
      icon: l.type === 'video' ? <Video className="h-4 w-4 text-gray-400" /> : <BookOpen className="h-4 w-4 text-gray-400" />,
    })),
    ...assignmentsSorted.map((a) => ({
      type: 'assignment' as const,
      id: String(a.id),
      title: a.title,
      subtitle: a.courseTitle || undefined,
      dateMs: (a.publishedAt || a.createdAt) ? new Date((a.publishedAt || a.createdAt) as any).getTime() : 0,
    })),
    ...examsSorted.map((e) => ({
      type: 'exam' as const,
      id: String(e.id),
      title: e.title,
      subtitle: language === 'ar' ? 'امتحان مجدول' : 'Scheduled exam',
      dateMs: e.scheduledAt ? new Date(e.scheduledAt as any).getTime() : 0,
    })),
  ].sort((a,b) => a.dateMs - b.dateMs);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <InviteHeader 
        brandLogo={brandLogo ?? undefined}
        brandName={brandName ?? undefined}
        brandLogoScale={brandLogoScale}
        brandNameScale={brandNameScale}
      />
      
      <main className="p-6 overflow-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>

          <div className="max-w-6xl mx-auto">
            {/* Real course header: title and actual progress */}
            {isLoading ? (
              <div className="flex items-center gap-2 mb-6">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : error ? (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-destructive">
                  {language === 'ar' ? 'خطأ' : 'Error'}
                </h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : (
              course && (
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {language === 'ar' ? (course.titleAr || course.title) : course.title}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    {language === 'ar' ? (course.descriptionAr || course.description) : course.description}
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'مستوى التقدم' : 'Progress'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <Progress value={progressPercentage} />
                  </div>
                </div>
              )
            )}

            {/* Two-column layout: sidebar left, player right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardContent className="p-4">
                    <h2 className="text-xl font-semibold mb-3">
                      {language === 'ar' ? 'المحتوى' : 'Content'}
                    </h2>
                    {timelineItems.length > 0 ? (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
                        {timelineItems.map((item) => {
                          const isSelected = selectedItem && selectedItem.type === item.type && selectedItem.id === item.id;
                          // Compute exam end state and result existence
                          const ex = item.type === 'exam' ? exams.find(e => e.id === item.id) : null;
                          const openAt = ex?.scheduledAt ? new Date(ex.scheduledAt as any) : null;
                          const tl = ex?.settings?.timeLimitMinutes ?? null;
                          const endAtMs = openAt && tl ? openAt.getTime() + tl * 60000 : null;
                          const hasEnded = !!(endAtMs && nowMs >= endAtMs);
                          const hasResult = !!examResults[item.id];
                          return (
                            <React.Fragment key={`${item.type}-${item.id}`}>
                              <button
                                onClick={() => {
                                  setSelectedItem({ type: item.type, id: item.id });
                                  // If assignment already submitted, immediately show results view
                                  if (item.type === 'assignment' && assignmentResults[item.id]) {
                                    setShowingResultsForAssignment(item.id);
                                    setActiveAssignmentId(null);
                                  }
                                }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-primary/5' : 'bg-transparent'} hover:bg-muted/60`}
                              >
                                <span className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-100 dark:bg-gray-800">
                                  {item.type === 'lesson' ? item.icon : item.type === 'assignment' ? <FileText className="h-4 w-4 text-gray-400" /> : <HelpCircle className="h-4 w-4 text-gray-400" />}
                                </span>
                                <div className="flex-1">
                                  <p className="font-medium">{item.title}</p>
                                  {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                                  {/* عرض موعد آخر تسليم إذا كان واجباً وله مدة */}
                                  {item.type === 'assignment' && (() => {
                                    const asg = assignments.find(a => a.id === item.id);
                                    if (asg && (asg.windowEndAt || (asg.createdAt && asg.availabilityDays))) {
                                      let endAt = null;
                                      if (asg.windowEndAt) {
                                        try { endAt = new Date(asg.windowEndAt as any); } catch {}
                                      } else if (asg.createdAt && asg.availabilityDays) {
                                        const created = new Date(asg.createdAt as any);
                                        const end = new Date(created);
                                        end.setDate(created.getDate() + asg.availabilityDays);
                                        end.setHours(23,59,59,999);
                                        endAt = end;
                                      }
                                      if (endAt && Date.now() < endAt.getTime() && asg.manualGradingEnabled) {
                                        // Format date to localized day and 12:00 am
                                        const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true } as const;
                                        // Always use midnight for Arabic: الساعة 12 صباحًا
                                        const dateStr = endAt.toLocaleDateString('ar-SA', { weekday: 'long' });
                                        let hour = endAt.getHours();
                                        let ampm = 'صباحًا';
                                        if (hour === 0 || hour === 24) hour = 12;
                                        else if (hour > 12) { hour -= 12; ampm = 'مساءً'; }
                                        const min = String(endAt.getMinutes()).padStart(2,'0');
                                        const deadlineText = `${dateStr} ${hour}:00 ${ampm}`;
                                        return (
                                          <div className="text-xs text-red-600 mt-1 font-semibold">
                                            {language === 'ar' 
                                              ? `آخر موعد للتسليم: ${deadlineText}`
                                              : `Due: ${endAt.toLocaleDateString('en-US', { weekday:'long' })} 12:00 am`}
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                                {item.type === 'assignment' && assignmentResults[item.id] && (
                                  <Badge variant="secondary" className="flex-shrink-0">{language === 'ar' ? 'تم التسليم' : 'Submitted'}</Badge>
                                )}
                                {item.type === 'lesson' && completedLessons.has(String(item.id)) && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                )}
                              </button>

                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {language === 'ar' ? 'لا يوجد محتوى بعد.' : 'No content yet.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Player Panel */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="rounded-2xl border-0 shadow-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                  <CardContent className="p-4">
                    {!selectedItem && (
                      <p className="text-muted-foreground">
                        {language === 'ar' ? 'اختر درساً أو واجباً أو امتحاناً من القائمة' : 'Select a lesson, assignment, or exam from the list'}
                      </p>
                    )}
                    {renderLessonPlayer()}
                    {renderAssignmentPlayer()}
                    {renderAssignmentResults()}
                    {renderExamPanel()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        </main>
      
      {shouldShowWhatsapp && (
        <a
          href={`https://wa.me/${normalizedWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg text-white"
          aria-label={language === 'ar' ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}
    </div>
  );
};

export default CourseContent;