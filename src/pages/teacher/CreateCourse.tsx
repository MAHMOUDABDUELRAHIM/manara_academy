import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { CourseService } from "@/services/courseService";
import { Course, Lesson } from "@/types/course";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Save,
  ArrowLeft,
  Image
} from "lucide-react";
import { isSectionAllowed } from "@/utils/access";

// Removed local Lesson interface since lessons UI is removed

interface CourseForm {
  title: string;
  description: string;
  price: number;
  category: string;
  level: string;
  duration: string;
  thumbnail: File | null;
  lessons: Lesson[];
  isFree: boolean;
  objectives?: string[];
}

export const TeacherCreateCourse = () => {
  const { language } = useLanguage();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const teacherName = user?.displayName || (language === 'ar' ? 'مدرس جديد' : 'New Teacher');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    level: '',
    thumbnail: null as File | null,
    lessons: [] as any[]
  });

  const categories = [
    { value: 'ثالث اعدادي', label: language === 'ar' ? 'ثالث اعدادي' : 'Grade 9' },
    { value: 'اولي ثانوي', label: language === 'ar' ? 'اولي ثانوي' : 'Grade 10' },
    { value: 'بكالوريا', label: language === 'ar' ? 'بكالوريا' : 'Baccalaureate' },
    { value: 'ثاني ثانوي', label: language === 'ar' ? 'ثاني ثانوي' : 'Grade 11' },
    { value: 'ثالث ثانوي', label: language === 'ar' ? 'ثالث ثانوي' : 'Grade 12' }
  ];

  const levels = [
    { value: 'beginner', label: language === 'ar' ? 'مبتدئ' : 'Beginner' },
    { value: 'intermediate', label: language === 'ar' ? 'متوسط' : 'Intermediate' },
    { value: 'advanced', label: language === 'ar' ? 'متقدم' : 'Advanced' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };







  const steps = [
    {
      number: 1,
      title: language === 'ar' ? 'معلومات أساسية' : 'Basic Information',
      description: language === 'ar' ? 'أدخل المعلومات الأساسية للدورة' : 'Enter basic course information'
    },
    {
      number: 2,
      title: language === 'ar' ? 'محتوى الدورة' : 'Course Content',
      description: language === 'ar' ? 'أضف الدروس والمحتوى' : 'Add lessons and content'
    },
    {
      number: 3,
      title: language === 'ar' ? 'التسعير والإعدادات' : 'Pricing & Settings',
      description: language === 'ar' ? 'حدد السعر والإعدادات' : 'Set price and settings'
    },
    {
      number: 4,
      title: language === 'ar' ? 'مراجعة ونشر' : 'Review & Publish',
      description: language === 'ar' ? 'راجع المعلومات واتشر الدورة' : 'Review information and publish course'
    }
  ];

  const [courseForm, setCourseForm] = useState<CourseForm>({
    title: '',
    description: '',
    price: 0,
    category: '',
    level: '',
    duration: '',
    thumbnail: null,
    lessons: [],
    isFree: false,
    objectives: ['']
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed lessons management functions (add/remove/update) as lessons are added on a dedicated page

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCourseForm(prev => ({
        ...prev,
        thumbnail: file
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // التحقق من صحة البيانات
      if (!courseForm.title.trim()) {
        toast.error(language === 'ar' ? 'يرجى إدخال عنوان الدورة' : 'Please enter course title');
        setIsSubmitting(false);
        return;
      }

      if (!courseForm.description.trim()) {
        toast.error(language === 'ar' ? 'يرجى إدخال وصف الدورة' : 'Please enter course description');
        setIsSubmitting(false);
        return;
      }

      if (!courseForm.category) {
        toast.error(language === 'ar' ? 'يرجى اختيار فئة الدورة' : 'Please select course category');
        setIsSubmitting(false);
        return;
      }

      if (!courseForm.isFree && (!courseForm.price || parseFloat(courseForm.price.toString()) <= 0)) {
        toast.error(language === 'ar' ? 'يرجى إدخال سعر صحيح للدورة' : 'Please enter a valid course price');
        setIsSubmitting(false);
        return;
      }

      const validObjectives = (courseForm.objectives || []).filter(o => o.trim() !== '');
      if (validObjectives.length === 0) {
        toast.error(language === 'ar' ? 'يرجى إدخال هدف واحد على الأقل للكورس' : 'Please enter at least one objective for the course');
        setIsSubmitting(false);
        return;
      }

      // إعداد بيانات الدورة للحفظ
      const courseToSave: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
        title: courseForm.title.trim(),
        description: courseForm.description.trim(),
        category: courseForm.category,
        price: courseForm.isFree ? 0 : courseForm.price,
        currency: 'EGP',
        objectives: validObjectives,
        level: 'beginner',
        duration: 0,
        thumbnail: '',
        thumbnailFile: courseForm.thumbnail,
        
        // معلومات المدرس
        instructorId: user?.uid || '',
        instructorName: user?.displayName || teacherName,
        instructorEmail: user?.email || '',
        
        // الدروس
        lessons: courseForm.lessons.map((lesson, index) => ({
          ...lesson,
          order: index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        totalLessons: courseForm.lessons.length,
        
        // الإحصائيات
        enrolledStudents: 0,
        rating: 0,
        totalRatings: 0,
        
        // الحالة والتواريخ
        status: 'published',
        isActive: true,
        
        // إعدادات الدورة
        allowComments: true,
        allowDownloads: false,
        certificateEnabled: false
      };

      // حفظ الدورة في Firestore
      const courseId = await CourseService.createCourse(courseToSave);
      
      toast.success(
        language === 'ar' 
          ? 'تم إنشاء الدورة بنجاح! يمكنك الآن إدارتها من لوحة التحكم.' 
          : 'Course created successfully! You can now manage it from your dashboard.'
      );
      
      // التوجيه تلقائياً إلى صفحة إضافة درس
      navigate(`/teacher-dashboard/courses/${courseId}/add-lesson`);
      
    } catch (error) {
      console.error('خطأ في إنشاء الدورة:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء إنشاء الدورة. يرجى المحاولة مرة أخرى.' 
          : 'An error occurred while creating the course. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed lesson type icon helper

  return (
    <div className="min-h-screen bg-[#f2f2f2]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={teacherName} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto bg-[#f2f2f2]">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/teacher/courses')}
                className="text-[#2c4656] hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'العودة' : 'Back'}
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#2c4656] mb-2">
                  {language === 'ar' ? 'إنشاء دورة جديدة' : 'Create New Course'}
                </h1>
                <p className="text-gray-600">
                  {language === 'ar' 
                    ? 'أنشئ دورة تعليمية جديدة وابدأ في تعليم الطلاب'
                    : 'Create a new educational course and start teaching students'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Course Basic Information */}
            {isSectionAllowed('create-course','basic-info') ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#2c4656]">
                  <BookOpen className="h-5 w-5" />
                  {language === 'ar' ? 'معلومات الدورة الأساسية' : 'Basic Course Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[#2c4656] font-medium">
                      {language === 'ar' ? 'عنوان الدورة' : 'Course Title'} *
                    </Label>
                    <Input
                      id="title"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={language === 'ar' ? 'أدخل عنوان الدورة' : 'Enter course title'}
                      className="border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-[#2c4656] font-medium">
                      {language === 'ar' ? 'السعر' : 'Price'} *
                    </Label>
                    
                    {/* Free Course Toggle */}
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        id="isFree"
                        checked={courseForm.isFree}
                        onChange={(e) => setCourseForm(prev => ({ 
                          ...prev, 
                          isFree: e.target.checked,
                          price: e.target.checked ? 0 : prev.price
                        }))}
                        className="rounded border-gray-300 text-[#ee7b3d] focus:ring-[#ee7b3d]"
                      />
                      <Label htmlFor="isFree" className="text-sm text-gray-600">
                        {language === 'ar' ? 'دورة مجانية' : 'Free Course'}
                      </Label>
                    </div>

                    {!courseForm.isFree && (
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder={language === 'ar' ? 'أدخل سعر الدورة' : 'Enter course price'}
                        className="border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656]"
                        required
                      />
                    )}
                    
                    {courseForm.isFree && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          {language === 'ar' 
                            ? 'هذه الدورة ستكون مجانية ومتاحة لجميع الطلاب المسجلين' 
                            : 'This course will be free and available to all registered students'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#2c4656] font-medium">
                    {language === 'ar' ? 'التصنيف' : 'Category'} *
                  </Label>
                  <Select value={courseForm.category} onValueChange={(value) => setCourseForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656]">
                      <SelectValue placeholder={language === 'ar' ? 'اختر التصنيف' : 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ثالث اعدادي">{language === 'ar' ? 'ثالث اعدادي' : 'Grade 9'}</SelectItem>
                      <SelectItem value="اولي ثانوي">{language === 'ar' ? 'اولي ثانوي' : 'Grade 10'}</SelectItem>
                      <SelectItem value="بكالوريا">{language === 'ar' ? 'بكالوريا' : 'Baccalaureate'}</SelectItem>
                      <SelectItem value="ثاني ثانوي">{language === 'ar' ? 'ثاني ثانوي' : 'Grade 11'}</SelectItem>
                      <SelectItem value="ثالث ثانوي">{language === 'ar' ? 'ثالث ثانوي' : 'Grade 12'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[#2c4656] font-medium">
                    {language === 'ar' ? 'وصف الدورة' : 'Course Description'} *
                  </Label>
                  <Textarea
                    id="description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل وصفاً مفصلاً للدورة' : 'Enter detailed course description'}
                    className="border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656] min-h-[120px]"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="objectives" className="text-[#2c4656] font-medium">
                    {language === 'ar' ? 'أهداف الكورس' : 'Course Objectives'} *
                  </Label>
                  <div className="space-y-2">
                    {(courseForm.objectives && courseForm.objectives.length > 0 ? courseForm.objectives : ['']).map((objective, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          id={`objective-${idx}`}
                          value={objective}
                          onChange={(e) => {
                            const newObjectives = [...(courseForm.objectives || [])];
                            newObjectives[idx] = e.target.value;
                            setCourseForm(prev => ({ ...prev, objectives: newObjectives }));
                          }}
                          placeholder={language === 'ar' ? 'أدخل الهدف' : 'Enter objective'}
                          className="border-gray-200 focus:border-[#2c4656] focus:ring-[#2c4656]"
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setCourseForm(prev => ({ ...prev, objectives: [...(prev.objectives || []), ''] }))}
                    className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة هدف' : 'Add Objective'}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {language === 'ar' ? 'أدخل كل هدف في حقل مستقل' : 'Enter each objective in its own field'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail" className="text-[#2c4656] font-medium">
                    {language === 'ar' ? 'صورة الدورة' : 'Course Thumbnail'}
                  </Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-[#2c4656] transition-colors">
                    <input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <label htmlFor="thumbnail" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Image className="h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-[#2c4656]">
                            {language === 'ar' ? 'انقر لرفع صورة' : 'Click to upload image'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {language === 'ar' ? 'PNG, JPG حتى 10MB' : 'PNG, JPG up to 10MB'}
                          </p>
                        </div>
                      </div>
                    </label>
                    {courseForm.thumbnail && (
                      <p className="text-sm text-green-600 mt-2">
                        {language === 'ar' ? 'تم رفع الصورة:' : 'Image uploaded:'} {courseForm.thumbnail.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            ) : (
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2c4656]">
                    {language === 'ar' ? 'هذه الباقة لا تسمح بتعديل معلومات الدورة' : 'Your plan does not allow editing basic info'}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}

            {/* تم إزالة قسم دروس الدورة وزر إضافة درس. سيتم إضافة الدروس في صفحة مستقلة */}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/teacher/courses')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              {isSectionAllowed('create-course','publish-controls') && (
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !courseForm.title ||
                    !courseForm.description ||
                    !courseForm.category ||
                    (!courseForm.isFree && !courseForm.price) ||
                    ((courseForm.objectives || []).filter(o => o.trim() !== '').length === 0)
                  }
                  className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white px-8"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إنشاء كورس' : 'Create Course'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500 h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Floating Support Chat */}
      <FloatingSupportChat />
    </div>
  );
};

export default TeacherCreateCourse;