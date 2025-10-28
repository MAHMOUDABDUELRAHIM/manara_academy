import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { TeacherService } from '@/services/teacherService';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import FloatingSupportChat from '@/components/FloatingSupportChat';
import CourseDetailsModal from '@/components/CourseDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Filter, Play, Clock, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { StudentService } from '@/services/studentService';
import { CourseService } from '@/services/courseService';
import { Course } from '@/types/course';

interface EnrolledCourse extends Course {
  progress: number;
  totalLessons: number;
  completedLessons: number;
  status: 'in_progress' | 'completed' | 'not_started';
  enrolledDate: string;
  lastAccessed: string;
  isEnrolled: boolean;
}

  const MyCourses = () => {
    const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب الكورسات المسجل بها الطالب
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // جلب معرفات الكورسات المسجل بها الطالب
        const enrolledCourseIds = await StudentService.getEnrolledCourses(user.uid);
        console.log('Enrolled course IDs:', enrolledCourseIds);

        if (enrolledCourseIds.length === 0) {
          setEnrolledCourses([]);
          setIsLoading(false);
          return;
        }

        // جلب تفاصيل كل كورس
        const coursesPromises = enrolledCourseIds.map(async (courseId) => {
          try {
            const course = await CourseService.getCourseById(courseId);
            if (course) {
              // تحويل الكورس إلى EnrolledCourse مع بيانات إضافية
              const enrolledCourse: EnrolledCourse = {
                ...course,
                progress: Math.floor(Math.random() * 100), // مؤقت - يجب حسابه من التقدم الحقيقي
                totalLessons: course.lessons?.length || 0,
                completedLessons: Math.floor((course.lessons?.length || 0) * Math.random()),
                status: Math.random() > 0.5 ? 'in_progress' : 'not_started',
                enrolledDate: new Date().toISOString().split('T')[0],
                lastAccessed: new Date().toISOString().split('T')[0],
                isEnrolled: true
              };
              return enrolledCourse;
            }
            return null;
          } catch (error) {
            console.error(`Error fetching course ${courseId}:`, error);
            return null;
          }
        });

        const courses = await Promise.all(coursesPromises);
        const validCourses = courses.filter((course): course is EnrolledCourse => course !== null);

        // فلترة الدورات حسب المدرس المرتبط بالطالب لمنع مزج دورات مدرسين مختلفين
        const linkedTeacher = await TeacherService.getTeacherForStudent(user.uid);
        const filteredByTeacher = linkedTeacher
          ? validCourses.filter((course) => (course as any).instructorId === linkedTeacher.id)
          : validCourses;
        
        console.log('Fetched courses:', filteredByTeacher);
        setEnrolledCourses(filteredByTeacher);

      } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        setError('فشل في تحميل الكورسات. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [user?.uid]);

  const translations = {
    en: {
      myCourses: 'My Courses',
      searchCourses: 'Search courses...',
      filterAll: 'All Courses',
      filterInProgress: 'In Progress',
      filterCompleted: 'Completed',
      filterNotStarted: 'Not Started',
      continue: 'Continue',
      start: 'Start Course',
      completed: 'Completed',
      lessons: 'lessons',
      enrolledOn: 'Enrolled on',
      lastAccessed: 'Last accessed',
      noCourses: 'No courses found',
      noCoursesMessage: 'You haven\'t enrolled in any courses yet. Browse our catalog to get started!',
      browseCatalog: 'Browse Catalog',
      progress: 'Progress',
      instructor: 'Instructor',
      loading: 'Loading courses...',
      error: 'Error loading courses'
    },
    ar: {
      myCourses: 'دوراتي',
      searchCourses: 'البحث في الدورات...',
      filterAll: 'جميع الدورات',
      filterInProgress: 'قيد التقدم',
      filterCompleted: 'مكتملة',
      filterNotStarted: 'لم تبدأ',
      continue: 'متابعة',
      start: 'بدء الدورة',
      completed: 'مكتملة',
      lessons: 'دروس',
      enrolledOn: 'تاريخ التسجيل',
      lastAccessed: 'آخر دخول',
      noCourses: 'لم يتم العثور على دورات',
      noCoursesMessage: 'لم تسجل في أي دورات بعد. تصفح الكتالوج للبدء!',
      browseCatalog: 'تصفح الكتالوج',
      progress: 'التقدم',
      instructor: 'المدرب',
      loading: 'جاري تحميل الدورات...',
      error: 'خطأ في تحميل الدورات'
    }
  };

  const currentTranslations = translations[language as keyof typeof translations];

  const filteredCourses = enrolledCourses.filter(course => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || course.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: currentTranslations.completed, className: 'bg-green-100 text-green-800' };
      case 'in_progress':
        return { label: currentTranslations.filterInProgress, className: 'bg-blue-100 text-blue-800' };
      case 'not_started':
        return { label: currentTranslations.filterNotStarted, className: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={user?.displayName || (language === 'ar' ? 'طالب جديد' : 'New Student')} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <DashboardSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto theme-modern-light bg-[#F9FAFB]">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#2c4656] mb-2">
                {currentTranslations.myCourses}
              </h1>
              <p className="text-gray-600">
                {language === 'ar' 
                  ? 'تتبع تقدمك في جميع الدورات المسجل بها'
                  : 'Track your progress in all enrolled courses'
                }
              </p>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={currentTranslations.searchCourses}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className="whitespace-nowrap"
              >
                {currentTranslations.filterAll}
              </Button>
              <Button
                variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('in_progress')}
                className="whitespace-nowrap"
              >
                {currentTranslations.filterInProgress}
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
                className="whitespace-nowrap"
              >
                {currentTranslations.filterCompleted}
              </Button>
              <Button
                variant={filterStatus === 'not_started' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('not_started')}
                className="whitespace-nowrap"
              >
                {currentTranslations.filterNotStarted}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#ee7b3d]" />
                <p className="text-gray-600">{currentTranslations.loading}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                </Button>
              </div>
            </div>
          )}

          {/* Courses Grid */}
          {!isLoading && !error && (
            <>
              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <Card key={course.id} className="bg-card border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 fade-in fade-in-delay-100">
                      <div className="relative">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-[#ee7b3d] to-[#d66a2c] rounded-t-lg flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-white opacity-80" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className={getStatusBadge(course.status).className}>
                            {getStatusBadge(course.status).label}
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h3 className="font-bold text-lg text-[#2c4656] mb-2 line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            <span className="font-medium">{currentTranslations.instructor}:</span> {course.instructorName}
                          </p>
                          <p className="text-sm text-gray-500 mb-4">{course.category}</p>
                          
                          {/* Progress Bar */}
                          {course.status !== 'not_started' && (
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>{currentTranslations.progress}</span>
                                <span>{course.progress}%</span>
                              </div>
                              <Progress value={course.progress} className="h-2" />
                              <p className="text-xs text-gray-500 mt-1">
                                {course.completedLessons} / {course.totalLessons} {currentTranslations.lessons}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Course Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {currentTranslations.enrolledOn}: {formatDate(course.enrolledDate)}
                          </p>
                          <p>
                            <CheckCircle className="inline h-3 w-3 mr-1" />
                            {currentTranslations.lastAccessed}: {formatDate(course.lastAccessed)}
                          </p>
                        </div>

                        {/* Action Button */}
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
                          disabled={course.status === 'completed'}
                          onClick={() => {
                            if (course.status === 'completed') {
                              return;
                            }
                            
                            console.log('Starting course:', course.id);
                            navigate(`/course/${course.id}`);
                          }}
                        >
                          {course.status === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {currentTranslations.completed}
                            </>
                          ) : course.status === 'in_progress' ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {currentTranslations.continue}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {currentTranslations.start}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {currentTranslations.noCourses}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {currentTranslations.noCoursesMessage}
                  </p>
                  <Button 
                    className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white"
                    onClick={() => {
                      // Navigate to courses catalog
                      console.log('Navigate to courses catalog');
                    }}
                  >
                    {currentTranslations.browseCatalog}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCourse(null);
          }}
        />
      )}

      <FloatingSupportChat />
    </div>
  );
};

export default MyCourses;