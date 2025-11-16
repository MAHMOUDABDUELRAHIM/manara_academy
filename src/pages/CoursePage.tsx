import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Maximize, 
  CheckCircle, 
  Lock, 
  Clock, 
  BookOpen, 
  ArrowLeft,
  Download,
  FileText,
  Star,
  Users
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { CourseService } from "@/services/courseService";
import { StudentService } from "@/services/studentService";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number; // in seconds
  order: number;
  isCompleted: boolean;
  isLocked: boolean;
  resources?: {
    id: string;
    title: string;
    type: 'pdf' | 'doc' | 'link';
    url: string;
  }[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  instructorName: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  rating: number;
  totalStudents: number;
  lessons: Lesson[];
  totalDuration: number;
  completionPercentage: number;
}

export const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load course data
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId || !user) return;

      try {
        setLoading(true);
        
        // Get course details
        const courseData = await CourseService.getCourseById(courseId);
        if (!courseData) {
          toast.error("الكورس غير موجود");
          navigate('/dashboard');
          return;
        }

        // Check if student is enrolled
        const enrolledCourses = await StudentService.getEnrolledCourses(user.uid);
        if (!enrolledCourses.includes(courseId)) {
          toast.error("غير مسجل في هذا الكورس");
          navigate('/dashboard');
          return;
        }

        // Get student progress
        const progress = await StudentService.getCourseProgress(user.uid, courseId);
        
        // إظهار دروس علنية فقط (والدروس المجدولة التي حان موعدها)
        const now = new Date();
        const rawLessons: any[] = Array.isArray(courseData.lessons) ? courseData.lessons : [];
        const visibleLessonsRaw = rawLessons.filter((l: any) => {
          const vis = (l?.visibility || 'public');
          const at = l?.publishAt ? new Date(l.publishAt) : null;
          if (vis === 'public') return true;
          if (vis === 'scheduled') return !!at && at <= now;
          return false; // private always hidden
        });

        // Process lessons with completion status
        const lessonsWithProgress = visibleLessonsRaw.map((lesson: any, index: number) => ({
          ...lesson,
          id: lesson.id || `lesson-${index}`,
          order: lesson.order || index + 1,
          isCompleted: progress?.completedLessons?.includes(lesson.id) || false,
          isLocked: index > 0 && !(progress?.completedLessons?.includes(visibleLessonsRaw[index - 1]?.id) || index === 0)
        }));

        const courseWithProgress = {
          ...courseData,
          lessons: lessonsWithProgress,
          completionPercentage: progress?.completionPercentage || 0
        };

        setCourse(courseWithProgress);
        
        // Set first available lesson as current
        const firstAvailableLesson = lessonsWithProgress.find(lesson => !lesson.isLocked);
        if (firstAvailableLesson) {
          setCurrentLesson(firstAvailableLesson);
        }

      } catch (error) {
        console.error('Error loading course:', error);
        toast.error("خطأ في تحميل الكورس");
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, user, navigate]);

  // Mark lesson as completed
  const markLessonCompleted = async (lessonId: string) => {
    if (!user || !courseId) return;

    try {
      await StudentService.markLessonCompleted(user.uid, courseId, lessonId);
      
      // Update local state
      setCourse(prev => {
        if (!prev) return prev;
        
        const updatedLessons = prev.lessons.map(lesson => {
          if (lesson.id === lessonId) {
            return { ...lesson, isCompleted: true };
          }
          return lesson;
        });

        // Unlock next lesson
        const currentIndex = updatedLessons.findIndex(l => l.id === lessonId);
        if (currentIndex < updatedLessons.length - 1) {
          updatedLessons[currentIndex + 1].isLocked = false;
        }

        const completedCount = updatedLessons.filter(l => l.isCompleted).length;
        const completionPercentage = (completedCount / updatedLessons.length) * 100;

        return {
          ...prev,
          lessons: updatedLessons,
          completionPercentage
        };
      });

      toast.success("تم إكمال الدرس بنجاح!");
    } catch (error) {
      console.error('Error marking lesson completed:', error);
      toast.error("خطأ في حفظ التقدم");
    }
  };

  // Navigate to next lesson
  const goToNextLesson = () => {
    if (!course || !currentLesson) return;

    const currentIndex = course.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex < course.lessons.length - 1) {
      const nextLesson = course.lessons[currentIndex + 1];
      if (!nextLesson.isLocked) {
        setCurrentLesson(nextLesson);
      }
    }
  };

  // Navigate to previous lesson
  const goToPreviousLesson = () => {
    if (!course || !currentLesson) return;

    const currentIndex = course.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex > 0) {
      setCurrentLesson(course.lessons[currentIndex - 1]);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الكورس...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">الكورس غير موجود</h2>
          <p className="text-muted-foreground mb-4">لم يتم العثور على الكورس المطلوب</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة للداش بورد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                العودة
              </Button>
              <div>
                <h1 className="text-lg font-semibold truncate max-w-md">{course.title}</h1>
                <p className="text-sm text-muted-foreground">بواسطة {course.instructorName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                التقدم: {Math.round(course.completionPercentage)}%
              </div>
              <Progress value={course.completionPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 ${sidebarOpen ? 'mr-80' : ''} transition-all duration-300`}>
          {currentLesson ? (
            <div className="p-6">
              {/* Video Player */}
              <div className="bg-black rounded-lg overflow-hidden mb-6">
                <div className="aspect-video relative">
                  {currentLesson.videoUrl ? (
                    <video
                      className="w-full h-full"
                      controls
                      poster={course.thumbnail}
                      onEnded={() => markLessonCompleted(currentLesson.id)}
                    >
                      <source src={currentLesson.videoUrl} type="video/mp4" />
                      المتصفح لا يدعم تشغيل الفيديو
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>لا يوجد فيديو متاح لهذا الدرس</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousLesson}
                        disabled={course.lessons.findIndex(l => l.id === currentLesson.id) === 0}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextLesson}
                        disabled={course.lessons.findIndex(l => l.id === currentLesson.id) === course.lessons.length - 1}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {currentLesson.description}
                  </p>
                </div>

                {/* Lesson Resources */}
                {currentLesson.resources && currentLesson.resources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        مواد الدرس
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {currentLesson.resources.map((resource) => (
                          <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">{resource.title}</span>
                              <Badge variant="outline" className="mr-2">
                                {resource.type.toUpperCase()}
                              </Badge>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                تحميل
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mark as Complete */}
                {!currentLesson.isCompleted && (
                  <Button 
                    onClick={() => markLessonCompleted(currentLesson.id)}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    إكمال الدرس
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">اختر درساً للبدء</h2>
              <p className="text-muted-foreground">اختر درساً من القائمة الجانبية للبدء في التعلم</p>
            </div>
          )}
        </div>

        {/* Sidebar - Course Content */}
        <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-l border-border overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">محتوى الكورس</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? '←' : '→'}
              </Button>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-sm font-medium">{course.lessons.length}</div>
                <div className="text-xs text-muted-foreground">دروس</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-sm font-medium">{formatDuration(course.totalDuration || 0)}</div>
                <div className="text-xs text-muted-foreground">المدة</div>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Lessons List */}
            <div className="space-y-2">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentLesson?.id === lesson.id 
                      ? 'bg-primary/10 border-primary' 
                      : lesson.isLocked 
                        ? 'bg-muted/50 cursor-not-allowed' 
                        : 'hover:bg-muted'
                  }`}
                  onClick={() => !lesson.isLocked && setCurrentLesson(lesson)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {lesson.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : lesson.isLocked ? (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Play className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${lesson.isLocked ? 'text-muted-foreground' : ''}`}>
                          {index + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(lesson.duration || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button (when closed) */}
      {!sidebarOpen && (
        <Button
          className="fixed right-4 top-20 z-50"
          size="sm"
          onClick={() => setSidebarOpen(true)}
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default CoursePage;