import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Clock, BookOpen, Users, Star, X } from 'lucide-react';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    titleAr: string;
    instructor: string;
    instructorAr: string;
    price: number | string;
    totalLessons: number;
    category: string;
    categoryAr: string;
    thumbnail: string;
  };
}

const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({ isOpen, onClose, course }) => {
  const { language } = useLanguage();

  // Mock video data for the course
  const courseVideos = [
    { id: 1, title: language === 'ar' ? 'مقدمة في الدورة' : 'Course Introduction', duration: '5:30' },
    { id: 2, title: language === 'ar' ? 'الأساسيات' : 'Fundamentals', duration: '12:45' },
    { id: 3, title: language === 'ar' ? 'المفاهيم المتقدمة' : 'Advanced Concepts', duration: '18:20' },
    { id: 4, title: language === 'ar' ? 'التطبيق العملي' : 'Practical Application', duration: '25:15' },
    { id: 5, title: language === 'ar' ? 'المشروع النهائي' : 'Final Project', duration: '30:00' },
  ];

  const totalDuration = courseVideos.reduce((total, video) => {
    const [minutes, seconds] = video.duration.split(':').map(Number);
    return total + minutes + (seconds / 60);
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (language === 'ar') {
      return hours > 0 ? `${hours} ساعة ${mins} دقيقة` : `${mins} دقيقة`;
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {language === 'ar' ? course.titleAr : course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Course Image */}
            <div className="space-y-4">
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                {course.thumbnail ? (
                  <img 
                    src={course.thumbnail} 
                    alt={language === 'ar' ? course.titleAr : course.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              
              {/* Course Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Play className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{courseVideos.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'فيديو' : 'Videos'}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'المدة الإجمالية' : 'Total Duration'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Course Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'ar' ? 'تفاصيل الدورة' : 'Course Details'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {language === 'ar' ? 'المدرب: ' : 'Instructor: '}
                      {language === 'ar' ? course.instructorAr : course.instructor}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      {language === 'ar' ? course.categoryAr : course.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">4.8 (245 {language === 'ar' ? 'تقييم' : 'reviews'})</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {typeof course.price === 'number' ? `$${course.price}` : course.price}
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    {language === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Course Content */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ar' ? 'محتوى الدورة' : 'Course Content'}
            </h3>
            
            <Card>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {courseVideos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className={`p-4 flex items-center justify-between hover:bg-muted/50 ${
                        index !== courseVideos.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'فيديو' : 'Video'} • {video.duration}
                          </p>
                        </div>
                      </div>
                      
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Course Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ar' ? 'ما ستتعلمه' : 'What You\'ll Learn'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                language === 'ar' ? 'إتقان المفاهيم الأساسية' : 'Master fundamental concepts',
                language === 'ar' ? 'تطبيق المهارات عملياً' : 'Apply skills practically',
                language === 'ar' ? 'بناء مشاريع حقيقية' : 'Build real projects',
                language === 'ar' ? 'الحصول على شهادة معتمدة' : 'Get certified completion'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailsModal;