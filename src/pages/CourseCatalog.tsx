import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import FloatingSupportChat from '@/components/FloatingSupportChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Filter, Star, Clock, Users, Play } from 'lucide-react';
import InviteHeader from '@/components/InviteHeader';

interface Course {
  id: string;
  title: string;
  titleAr: string;
  instructor: string;
  instructorAr: string;
  thumbnail: string;
  price: number;
  originalPrice?: number;
  rating: number;
  studentsCount: number;
  duration: string;
  durationAr: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  categoryAr: string;
  description: string;
  descriptionAr: string;
  isEnrolled: boolean;
}

const CourseCatalog = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Mock courses data
  const courses: Course[] = [
    {
      id: '1',
      title: 'Complete Web Development Bootcamp',
      titleAr: 'دورة تطوير الويب الشاملة',
      instructor: 'Ahmed Hassan',
      instructorAr: 'أحمد حسن',
      thumbnail: '/api/placeholder/300/200',
      price: 299,
      originalPrice: 399,
      rating: 4.8,
      studentsCount: 1250,
      duration: '12 weeks',
      durationAr: '12 أسبوع',
      level: 'beginner',
      category: 'Programming',
      categoryAr: 'البرمجة',
      description: 'Learn full-stack web development from scratch',
      descriptionAr: 'تعلم تطوير الويب الشامل من الصفر',
      isEnrolled: false
    },
    {
      id: '2',
      title: 'Advanced React Development',
      titleAr: 'تطوير React المتقدم',
      instructor: 'Sarah Johnson',
      instructorAr: 'سارة جونسون',
      thumbnail: '/api/placeholder/300/200',
      price: 199,
      rating: 4.9,
      studentsCount: 890,
      duration: '8 weeks',
      durationAr: '8 أسابيع',
      level: 'advanced',
      category: 'Programming',
      categoryAr: 'البرمجة',
      description: 'Master advanced React concepts and patterns',
      descriptionAr: 'إتقان مفاهيم وأنماط React المتقدمة',
      isEnrolled: true
    },
    {
      id: '3',
      title: 'UI/UX Design Masterclass',
      titleAr: 'دورة تصميم واجهة المستخدم الشاملة',
      instructor: 'Mike Wilson',
      instructorAr: 'مايك ويلسون',
      thumbnail: '/api/placeholder/300/200',
      price: 249,
      originalPrice: 349,
      rating: 4.7,
      studentsCount: 650,
      duration: '10 weeks',
      durationAr: '10 أسابيع',
      level: 'intermediate',
      category: 'Design',
      categoryAr: 'التصميم',
      description: 'Create stunning user interfaces and experiences',
      descriptionAr: 'إنشاء واجهات مستخدم وتجارب مذهلة',
      isEnrolled: false
    },
    {
      id: '4',
      title: 'Digital Marketing Strategy',
      titleAr: 'استراتيجية التسويق الرقمي',
      instructor: 'Emma Davis',
      instructorAr: 'إيما ديفيس',
      thumbnail: '/api/placeholder/300/200',
      price: 179,
      rating: 4.6,
      studentsCount: 420,
      duration: '6 weeks',
      durationAr: '6 أسابيع',
      level: 'beginner',
      category: 'Marketing',
      categoryAr: 'التسويق',
      description: 'Build effective digital marketing campaigns',
      descriptionAr: 'بناء حملات تسويق رقمي فعالة',
      isEnrolled: false
    },
    {
      id: '5',
      title: 'Data Science Fundamentals',
      titleAr: 'أساسيات علم البيانات',
      instructor: 'Dr. Omar Khalil',
      instructorAr: 'د. عمر خليل',
      thumbnail: '/api/placeholder/300/200',
      price: 329,
      rating: 4.8,
      studentsCount: 780,
      duration: '14 weeks',
      durationAr: '14 أسبوع',
      level: 'intermediate',
      category: 'Data Science',
      categoryAr: 'علم البيانات',
      description: 'Master data analysis and machine learning',
      descriptionAr: 'إتقان تحليل البيانات والتعلم الآلي',
      isEnrolled: false
    },
    {
      id: '6',
      title: 'Mobile App Development',
      titleAr: 'تطوير تطبيقات الهاتف المحمول',
      instructor: 'Lisa Chen',
      instructorAr: 'ليزا تشين',
      thumbnail: '/api/placeholder/300/200',
      price: 279,
      originalPrice: 379,
      rating: 4.7,
      studentsCount: 560,
      duration: '11 weeks',
      durationAr: '11 أسبوع',
      level: 'intermediate',
      category: 'Programming',
      categoryAr: 'البرمجة',
      description: 'Build native mobile apps for iOS and Android',
      descriptionAr: 'بناء تطبيقات محمولة أصلية لنظامي iOS و Android',
      isEnrolled: false
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories', labelAr: 'جميع الفئات' },
    { value: 'Programming', label: 'Programming', labelAr: 'البرمجة' },
    { value: 'Design', label: 'Design', labelAr: 'التصميم' },
    { value: 'Marketing', label: 'Marketing', labelAr: 'التسويق' },
    { value: 'Data Science', label: 'Data Science', labelAr: 'علم البيانات' }
  ];

  const levels = [
    { value: 'all', label: 'All Levels', labelAr: 'جميع المستويات' },
    { value: 'beginner', label: 'Beginner', labelAr: 'مبتدئ' },
    { value: 'intermediate', label: 'Intermediate', labelAr: 'متوسط' },
    { value: 'advanced', label: 'Advanced', labelAr: 'متقدم' }
  ];

  const translations = {
    en: {
      courseCatalog: 'Course Catalog',
      searchCourses: 'Search courses...',
      category: 'Category',
      level: 'Level',
      students: 'students',
      enroll: 'Enroll Now',
      enrolled: 'Enrolled',
      viewCourse: 'View Course',
      rating: 'Rating',
      duration: 'Duration',
      instructor: 'Instructor',
      noCourses: 'No courses found',
      noCoursesMessage: 'Try adjusting your search or filter criteria to find more courses.',
      clearFilters: 'Clear Filters',
      free: 'Free',
      sale: 'Sale'
    },
    ar: {
      courseCatalog: 'كتالوج الدورات',
      searchCourses: 'البحث في الدورات...',
      category: 'الفئة',
      level: 'المستوى',
      students: 'طالب',
      enroll: 'سجل الآن',
      enrolled: 'مسجل',
      viewCourse: 'عرض الدورة',
      rating: 'التقييم',
      duration: 'المدة',
      instructor: 'المدرب',
      noCourses: 'لم يتم العثور على دورات',
      noCoursesMessage: 'حاول تعديل معايير البحث أو التصفية للعثور على المزيد من الدورات.',
      clearFilters: 'مسح المرشحات',
      free: 'مجاني',
      sale: 'تخفيض'
    }
  };

  const currentTranslations = translations[language as keyof typeof translations];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = (language === 'ar' ? course.titleAr : course.title)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      (language === 'ar' ? course.instructorAr : course.instructor)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const getLevelBadge = (level: string) => {
    const levelColors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      advanced: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const levelLabels = {
      beginner: language === 'ar' ? 'مبتدئ' : 'Beginner',
      intermediate: language === 'ar' ? 'متوسط' : 'Intermediate',
      advanced: language === 'ar' ? 'متقدم' : 'Advanced'
    };

    return (
      <Badge className={levelColors[level as keyof typeof levelColors]}>
        {levelLabels[level as keyof typeof levelLabels]}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return language === 'ar' ? `${price} ر.س` : `$${price}`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedLevel('all');
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <InviteHeader />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <DashboardSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {currentTranslations.courseCatalog}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'اكتشف دورات جديدة وطور مهاراتك'
                : 'Discover new courses and develop your skills'
              }
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder={currentTranslations.searchCourses}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-input focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-primary focus:ring-primary min-w-[150px]"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {language === 'ar' ? category.labelAr : category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-primary focus:ring-primary min-w-[120px]"
              >
                {levels.map(level => (
                  <option key={level.value} value={level.value}>
                    {language === 'ar' ? level.labelAr : level.label}
                  </option>
                ))}
              </select>
              
              {(searchTerm || selectedCategory !== 'all' || selectedLevel !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="border-input hover:bg-accent"
                >
                  {currentTranslations.clearFilters}
                </Button>
              )}
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="p-0">
                    <div className="relative">
                      <img
                        src={course.thumbnail}
                        alt={language === 'ar' ? course.titleAr : course.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2">
                        {getLevelBadge(course.level)}
                      </div>
                      {course.originalPrice && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white">
                            {currentTranslations.sale}
                          </Badge>
                        </div>
                      )}
                      {course.isEnrolled && (
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-blue-500 text-white">
                            {currentTranslations.enrolled}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
                          {language === 'ar' ? course.titleAr : course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {currentTranslations.instructor}: {language === 'ar' ? course.instructorAr : course.instructor}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {language === 'ar' ? course.descriptionAr : course.description}
                        </p>
                      </div>

                      {/* Course Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{course.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{course.studentsCount.toLocaleString()} {currentTranslations.students}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{language === 'ar' ? course.durationAr : course.duration}</span>
                        </div>
                      </div>

                      {/* Price and Action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {course.originalPrice ? (
                            <>
                              <span className="text-lg font-bold text-foreground">
                                {formatPrice(course.price)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(course.originalPrice)}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-foreground">
                              {course.price === 0 ? currentTranslations.free : formatPrice(course.price)}
                            </span>
                          )}
                        </div>
                        
                        <Button 
                          className={`${
                            course.isEnrolled 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-primary hover:bg-primary/90'
                          } text-primary-foreground`}
                          disabled={course.isEnrolled}
                          onClick={() => {
                          if (course.isEnrolled) {
                            // Enrolled - go directly to unified course page (lessons)
                            console.log('Navigate to course page (lessons):', course.id);
                            navigate(`/course/${course.id}`);
                          } else {
                            // Not enrolled - handle enrollment
                            if (course.price === 0) {
                              // Free course - go to unified course page (lessons)
                              console.log('Start free course and navigate to course page:', course.id);
                              // TODO: Add enrollment logic here
                              navigate(`/course/${course.id}`);
                            } else {
                              // Paid course - go to course details for subscription
                              console.log('Navigate to course details for subscription:', course.id);
                              navigate(`/course/${course.id}/details`);
                            }
                          }
                        }}
                        >
                          {course.isEnrolled ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {currentTranslations.viewCourse}
                            </>
                          ) : course.price === 0 ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'ابدأ الدورة' : 'Start Course'}
                            </>
                          ) : (
                            <>
                              <BookOpen className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'تفاصيل الدورة' : 'Course Details'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {currentTranslations.noCourses}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {currentTranslations.noCoursesMessage}
              </p>
              <Button 
                onClick={clearFilters}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {currentTranslations.clearFilters}
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
      
      <FloatingSupportChat />
    </div>
  );
};

export default CourseCatalog;