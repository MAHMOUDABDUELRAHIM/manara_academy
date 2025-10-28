﻿import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Removed upload video modal imports
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { CourseService } from "@/services/courseService";
import { toast } from "sonner";
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Edit,
  Settings,
  Plus,
  Search,
  Filter,
  Eye,
  MoreVertical
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  enrolledStudents: number;
  status: 'active' | 'draft' | 'archived';
  category: string;
  price: number;
  earnings: number;
  createdAt: string;
  lastUpdated: string;
}

export const TeacherMyCourses = () => {
  const navigate = useNavigate();
const { language, t } = useLanguage();
const { user } = useAuthContext();
const teacherName = user?.displayName || (language === 'ar' ? 'مدرس جديد' : 'New Teacher');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Empty state for new teachers - no fake data
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [courseStudentsCount, setCourseStudentsCount] = useState<Record<string, number>>({});
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // ØªÙ… Ø¥Ø²Ø§Ù„Ø© Ø­Ø§Ù„Ø© Ø±ÙØ¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ
  // Ø¥Ø¯Ø§Ø±Ø© Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¯ÙˆØ±Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„ØµÙØ­Ø©
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [isLoadingManage, setIsLoadingManage] = useState(false);
  const [isSavingManage, setIsSavingManage] = useState(false);

  // Ø¬Ù„Ø¨ Ø¯ÙˆØ±Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingCourses(true);
        const instructorCourses = await CourseService.getInstructorCourses(user.uid);
        setCourses(instructorCourses);
      } catch (error) {
        console.error('Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¯ÙˆØ±Ø§Øª:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [user?.uid]);

  // Calculate total students count from confirmed access (enrolledCourses)
  useEffect(() => {
    const computeCounts = async () => {
      if (!user?.uid || courses.length === 0) {
        setCourseStudentsCount({});
        setTotalStudentsCount(0);
        return;
      }
      const counts: Record<string, number> = {};
      for (const course of courses) {
        try {
          const q = query(
            collection(db, 'students'),
            where('teacherId', '==', user.uid),
            where('enrolledCourses', 'array-contains', course.id)
          );
          const snap = await getDocs(q);
          counts[course.id] = snap.size;
        } catch {
          counts[course.id] = 0;
        }
      }
      setCourseStudentsCount(counts);
      setTotalStudentsCount(Object.values(counts).reduce((sum, n) => sum + n, 0));
    };
    computeCounts();
  }, [courses, user?.uid]);
  // Live subscription: update counts instantly when teacher grants access
  useEffect(() => {
    if (!user?.uid || courses.length === 0) return;
    const studentsQ = query(
      collection(db, 'students'),
      where('teacherId', '==', user.uid)
    );
    const unsub = onSnapshot(studentsQ, (snap) => {
      const counts: Record<string, number> = {};
      for (const c of courses) counts[c.id] = 0;
      snap.forEach((doc) => {
        const data = doc.data() as any;
        const enrolled: string[] = data.enrolledCourses || [];
        for (const cid of enrolled) {
          if (counts[cid] != null) counts[cid] += 1;
        }
      });
      setCourseStudentsCount(counts);
      setTotalStudentsCount(Object.values(counts).reduce((sum, n) => sum + n, 0));
    });
    return () => unsub();
  }, [user?.uid, courses]);

  // Calculate active courses count: any course in "My Courses" is considered active
  const activeCourses = courses.length;

  // Calculate total students count
  const totalStudents = courses.reduce((total, course) => total + (courseStudentsCount[course.id] ?? 0), 0);

  // Ø¹Ù…Ù„Ø© Ø§Ù„Ø¹Ø±Ø¶ Ø¨Ø§Ù„Ø¬Ù†ÙŠÙ‡ Ø§Ù„Ù…ØµØ±ÙŠ
  const currencyLabel = language === 'ar' ? 'جنيه' : 'EGP';

  // Calculate total earnings
  const totalEarnings = courses.reduce((total, course) => total + (course.price * (courseStudentsCount[course.id] ?? 0)), 0);

  const categories = [
    { value: 'all', label: language === 'ar' ? 'جميع التصنيفات' : 'All Categories' },
    { value: 'رياضيات', label: language === 'ar' ? 'رياضيات' : 'Mathematics' },
    { value: 'فيزياء', label: language === 'ar' ? 'فيزياء' : 'Physics' },
    { value: 'كيمياء', label: language === 'ar' ? 'كيمياء' : 'Chemistry' },
    { value: 'أحياء', label: language === 'ar' ? 'أحياء' : 'Biology' },
    { value: 'تاريخ', label: language === 'ar' ? 'تاريخ' : 'History' },
    { value: 'جغرافيا', label: language === 'ar' ? 'جغرافيا' : 'Geography' }
  ];

  const statusOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'All Status' },
    { value: 'active', label: language === 'ar' ? 'نشط' : 'Active' },
    { value: 'draft', label: language === 'ar' ? 'مسودة' : 'Draft' },
    { value: 'archived', label: language === 'ar' ? 'مؤرشف' : 'Archived' }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        label: language === 'ar' ? 'نشط' : 'Active', 
        className: 'bg-green-100 text-green-800 border-green-200' 
      },
      draft: { 
        label: language === 'ar' ? 'مسودة' : 'Draft', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      },
      archived: { 
        label: language === 'ar' ? 'مؤرشف' : 'Archived', 
        className: 'bg-gray-100 text-gray-800 border-gray-200' 
      }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // ØªÙ… Ø¥Ø²Ø§Ù„Ø© Ù…Ø¹Ø§Ù„Ø¬Ø§Øª Ø±ÙØ¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ

  // Ø¨Ø¯Ø¡ Ø¥Ø¯Ø§Ø±Ø© Ø¯ÙˆØ±Ø© Ù…Ø¹ÙŠÙ†Ø©
  const startManage = async (courseId: string) => {
    try {
      setIsLoadingManage(true);
      setEditingCourseId(courseId);
      const course = await CourseService.getCourseById(courseId);
      if (!course) {
        toast.error(language === 'ar' ? 'لم يتم العثور على بيانات الدورة' : 'Course not found');
        setEditingCourseId(null);
        return;
      }
      const objectivesArr = Array.isArray((course as any)?.objectives) ? [...(course as any).objectives] : [];
      const DEFAULT_OBJECTIVES = [
        { id: `obj-${Date.now()}-1`, title: language === 'ar' ? 'إتقان المفاهيم الأساسية' : 'Master fundamental concepts' },
        { id: `obj-${Date.now()}-2`, title: language === 'ar' ? 'تطبيق المهارات عمليًا' : 'Apply skills practically' },
        { id: `obj-${Date.now()}-3`, title: language === 'ar' ? 'بناء مشاريع حقيقية' : 'Build real projects' },
        { id: `obj-${Date.now()}-4`, title: language === 'ar' ? 'الحصول على شهادة معتمدة' : 'Get certified completion' },
      ];
      setEditingCourse({
        title: (course as any)?.title || '',
        description: (course as any)?.description || '',
        objectives: objectivesArr.length > 0 ? objectivesArr : DEFAULT_OBJECTIVES,
        lessons: Array.isArray((course as any)?.lessons) ? [...(course as any).lessons] : []
      });
    } catch (error) {
      console.error('Error starting manage:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل بيانات الدورة' : 'Failed to load course data');
      setEditingCourseId(null);
    } finally {
      setIsLoadingManage(false);
    }
  };

  // ØªØ­Ø¯ÙŠØ« ÙˆØµÙ Ø§Ù„Ø¯ÙˆØ±Ø©
  const updateDescription = (value: string) => {
    setEditingCourse((prev: any) => ({ ...(prev || {}), description: value }));
  };

  // ØªØ­Ø¯ÙŠØ« Ø­Ù‚ÙˆÙ„ Ø¯Ø±Ø³ Ù…Ø¹ÙŠÙ†
  const updateLessonField = (index: number, key: 'title' | 'description', value: string) => {
    setEditingCourse((prev: any) => {
      const lessons = [...(prev?.lessons || [])];
      if (lessons[index]) {
        lessons[index] = { ...lessons[index], [key]: value, updatedAt: new Date().toISOString() };
      }
      return { ...(prev || {}), lessons };
    });
  };

  // Ø¥Ø¶Ø§ÙØ© Ø¯Ø±Ø³: ØªÙˆØ¬ÙŠÙ‡ Ø¥Ù„Ù‰ ØµÙØ­Ø© Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¯Ø±Ø³
  const addLesson = () => {
    if (!editingCourseId) return;
    navigate(`/teacher-dashboard/courses/${editingCourseId}/add-lesson`);
  };

  // Ø­ÙØ¸ ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ø¯ÙˆØ±Ø©
  const saveCourseEdits = async () => {
    if (!editingCourseId) return;
    try {
      setIsSavingManage(true);
      await CourseService.updateCourseContent(editingCourseId, {
        title: editingCourse?.title || '',
        description: editingCourse?.description || '',
        objectives: editingCourse?.objectives || [],
        lessons: editingCourse?.lessons || []
      });
  toast.success(language === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully');
      // ØªØ­Ø¯ÙŠØ« Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯ÙˆØ±Ø§Øª Ø¨Ø¹Ø¯ Ø§Ù„Ø­ÙØ¸
      if (user?.uid) {
        const instructorCourses = await CourseService.getInstructorCourses(user.uid);
        setCourses(instructorCourses);
      }
      setEditingCourseId(null);
      setEditingCourse(null);
    } catch (error) {
      console.error('Error saving course edits:', error);
  toast.error(language === 'ar' ? 'فشل حفظ التعديلات' : 'Failed to save changes');
    } finally {
      setIsSavingManage(false);
    }
  };

  // Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©
  const cancelManage = () => {
    setEditingCourseId(null);
    setEditingCourse(null);
  };



  // Empty State Component
  const EmptyCoursesState = () => (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-[#ee7b3d]/10 rounded-full flex items-center justify-center">
        <BookOpen className="h-12 w-12 text-[#ee7b3d]" />
      </div>
      <h3 className="text-xl font-semibold text-[#2c4656] mb-3">
        {language === 'ar' ? 'ابدأ رحلتك التعليمية' : 'Start Your Teaching Journey'}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {language === 'ar' 
          ? 'لم تقم بإنشاء أي دورات بعد. ابدأ بإنشاء دورتك الأولى وشارك معرفتك مع الطلاب'
          : 'You haven\'t created any courses yet. Start by creating your first course and share your knowledge with students'
        }
      </p>
      <Link to="/teacher/create-course">
        <Button className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white px-6 py-3 rounded-lg font-medium">
          <Plus className="h-5 w-5 mr-2" />
          {language === 'ar' ? 'إنشاء دورة جديدة' : 'Create New Course'}
        </Button>
      </Link>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="text-center p-4 border rounded-lg">
          <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-medium mb-2">
            {language === 'ar' ? 'إنشاء المحتوى' : 'Create Content'}
          </h4>
          <p className="text-sm text-gray-600">
            {language === 'ar' 
              ? 'أنشئ دورات تفاعلية وجذابة'
              : 'Create interactive and engaging courses'
            }
          </p>
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="font-medium mb-2">
            {language === 'ar' ? 'جذب الطلاب' : 'Attract Students'}
          </h4>
          <p className="text-sm text-gray-600">
            {language === 'ar' 
              ? 'اجذب الطلاب بمحتوى عالي الجودة'
              : 'Attract students with high-quality content'
            }
          </p>
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className="w-12 h-12 mx-auto mb-3 bg-[#ee7b3d]/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-[#ee7b3d]" />
          </div>
          <h4 className="font-medium mb-2">
            {language === 'ar' ? 'تحقيق الأرباح' : 'Earn Money'}
          </h4>
          <p className="text-sm text-gray-600">
            {language === 'ar' 
              ? 'احصل على أرباح من خبرتك'
              : 'Earn money from your expertise'
            }
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f2f2]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={teacherName} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto bg-[#f2f2f2]">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#2c4656] mb-2">
                {language === 'ar' ? 'دوراتي' : 'My Courses'}
              </h1>
              <p className="text-gray-600">
                {language === 'ar' 
                  ? 'إدارة وتتبع جميع دوراتك التعليمية'
                  : 'Manage and track all your educational courses'
                }
              </p>
            </div>
            <Link to="/teacher/create-course">
              <Button 
                className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white px-6 py-3 rounded-lg font-medium"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {language === 'ar' ? 'إنشاء دورة جديدة' : 'Create New Course'}
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'الدورات النشطة' : 'Active Courses'}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-[#2c4656]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2c4656]">{activeCourses}</div>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'كل دوراتك الحالية نشطة' : 'All your current courses are active'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                </CardTitle>
                <Users className="h-4 w-4 text-[#2c4656]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2c4656]">{totalStudentsCount}</div>
                <p className="text-xs text-gray-500">
                  {language === 'ar' ? 'الطلاب الذين تم فتح الدورة لهم' : 'students with course access opened'}
                </p>
              </CardContent>
            </Card>

            
          </div>

          {/* Search and Filters */}
          <Card className="bg-white border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في الدورات...' : 'Search courses...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656]"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 border-gray-200">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                    <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                    <SelectItem value="archived">{language === 'ar' ? 'مؤرشف' : 'Archived'}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48 border-gray-200">
                    <SelectValue placeholder={language === 'ar' ? 'التصنيف' : 'Category'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</SelectItem>
                    <SelectItem value="رياضيات">{language === 'ar' ? 'رياضيات' : 'Mathematics'}</SelectItem>
                    <SelectItem value="فيزياء">{language === 'ar' ? 'فيزياء' : 'Physics'}</SelectItem>
                    <SelectItem value="كيمياء">{language === 'ar' ? 'كيمياء' : 'Chemistry'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Courses Grid */}
          {isLoadingCourses ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c4656]"></div>
              <span className="ml-3 text-gray-600">
                {language === 'ar' ? 'جارٍ تحميل الدورات...' : 'Loading courses...'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredCourses.map((course) => (
              <Card key={course.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-gray-400" />
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
                    <p className="text-sm text-gray-500 mb-2">{course.category}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{(courseStudentsCount[course.id] ?? 0)} {language === 'ar' ? 'طالب' : 'students'}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>{course.price} {currencyLabel}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 mb-4">
                      <p>{language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {new Date(course.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-[#2c4656] hover:bg-[#1e3240] text-white"
                      onClick={() => startManage(course.id)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إدارة' : 'Manage'}
                    </Button>
                    
                    <Link to={`/teacher-dashboard/courses/${course.id}/add-lesson`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-[#2c4656] text-[#2c4656] hover:bg-[#2c4656] hover:text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'إضافة درس' : 'Add Lesson'}
                      </Button>
                    </Link>

                    {/* Ø²Ø± Ø±ÙØ¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ØªÙ… Ø­Ø°ÙÙ‡ Ø­Ø³Ø¨ Ø§Ù„Ø·Ù„Ø¨ */}

                    <Link to={`/teacher-dashboard/courses/${course.id}/details`}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="px-3"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}

          {/* إدارة المحتوى داخل الصفحة */}
          {editingCourseId && (
            <Card className="bg-white border-0 shadow-md mb-8">
              <CardHeader>
                <CardTitle className="text-[#2c4656]">
                  {language === 'ar' ? 'إدارة محتوى الدورة' : 'Manage Course Content'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingManage ? (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2c4656]"></div>
                    <span>{language === 'ar' ? 'جارٍ تحميل البيانات...' : 'Loading data...'}</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#2c4656] mb-2">
                        {language === 'ar' ? 'عنوان الدورة' : 'Course Title'}
                      </label>
                      <Input
                        value={editingCourse?.title || ''}
                        onChange={(e) => setEditingCourse((prev: any) => ({ ...(prev || {}), title: e.target.value }))}
                        placeholder={language === 'ar' ? 'أدخل عنوان الدورة' : 'Enter course title'}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-[#2c4656]">
                          {language === 'ar' ? 'أهداف الدورة' : 'Course Objectives'}
                        </label>
                        <Button
                          onClick={() => setEditingCourse((prev: any) => ({
                            ...(prev || {}),
                            objectives: [
                              ...((prev?.objectives || [])),
                              { id: `obj-${Date.now()}`, title: language === 'ar' ? 'هدف جديد' : 'New Objective' }
                            ]
                          }))}
                          className="bg-[#2c4656] hover:bg-[#1e3240] text-white"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'إضافة هدف' : 'Add Objective'}
                        </Button>
                      </div>

                      {(editingCourse?.objectives || []).length === 0 ? (
                        <p className="text-gray-500">
                          {language === 'ar' ? 'لا توجد أهداف بعد' : 'No objectives yet'}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {(editingCourse?.objectives || []).map((obj: any, idx: number) => (
                            <div key={obj.id || idx} className="flex items-center gap-2">
                              <Input
                                value={obj.title || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEditingCourse((prev: any) => {
                                    const objectives = [...(prev?.objectives || [])];
                                    if (objectives[idx]) {
                                      objectives[idx] = { ...objectives[idx], title: value };
                                    }
                                    return { ...(prev || {}), objectives };
                                  });
                                }}
                                placeholder={language === 'ar' ? 'اكتب هدفًا للدورة' : 'Write a course objective'}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2c4656] mb-2">
                        {language === 'ar' ? 'وصف الدورة' : 'Course Description'}
                      </label>
                      <textarea
                        className="w-full min-h-[100px] border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#2c4656]"
                        value={editingCourse?.description || ''}
                        onChange={(e) => updateDescription(e.target.value)}
                        placeholder={language === 'ar' ? 'اكتب وصفًا واضحًا ومفصلًا للدورة...' : 'Write a clear and detailed description...'}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-[#2c4656]">
                          {language === 'ar' ? 'الدروس' : 'Lessons'}
                        </label>
                        <Button 
                          onClick={addLesson}
                          className="bg-[#2c4656] hover:bg-[#1e3240] text-white"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'إضافة درس' : 'Add Lesson'}
                        </Button>
                      </div>

                      {(editingCourse?.lessons || []).length === 0 ? (
                        <p className="text-gray-500">
                          {language === 'ar' ? 'لا توجد دروس بعد' : 'No lessons yet'}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {(editingCourse?.lessons || []).map((lesson: any, index: number) => (
                            <div key={lesson.id || index} className="border border-gray-200 rounded-md p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm text-gray-600 mb-1">
                                    {language === 'ar' ? 'عنوان الدرس' : 'Lesson Title'}
                                  </label>
                                  <Input
                                    value={lesson.title || ''}
                                    onChange={(e) => updateLessonField(index, 'title', e.target.value)}
                                    className="border-gray-200"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-gray-600 mb-1">
                                    {language === 'ar' ? 'وصف الدرس' : 'Lesson Description'}
                                  </label>
                                  <Input
                                    value={lesson.description || ''}
                                    onChange={(e) => updateLessonField(index, 'description', e.target.value)}
                                    className="border-gray-200"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={saveCourseEdits}
                        disabled={isSavingManage}
                        className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white"
                      >
                        {isSavingManage ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                      </Button>
                      <Button 
                        onClick={cancelManage}
                        variant="outline"
                        className="border-[#2c4656] text-[#2c4656] hover:bg-[#2c4656] hover:text-white"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoadingCourses && courses.length === 0 && (
            <EmptyCoursesState />
          )}
          
          {!isLoadingCourses && courses.length > 0 && filteredCourses.length === 0 && (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {language === 'ar' ? 'لا توجد دورات' : 'No courses found'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {language === 'ar' 
                    ? 'لم يتم العثور على دورات تطابق معايير البحث'
                    : 'No courses match your search criteria'
                  }
                </p>
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  variant="outline"
                  className="border-[#2c4656] text-[#2c4656] hover:bg-[#2c4656] hover:text-white"
                >
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500 h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Floating Support Chat */}
      <FloatingSupportChat />

      {/* ØªÙ… Ø¥Ø²Ø§Ù„Ø© Ù…ÙˆØ¯Ø§Ù„ Ø±ÙØ¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ */}
    </div>
  );
};

export default TeacherMyCourses;

