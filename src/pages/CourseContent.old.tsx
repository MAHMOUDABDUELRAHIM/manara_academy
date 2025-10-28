import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import FloatingSupportChat from '@/components/FloatingSupportChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Play, 
  ArrowLeft,
  FileText,
  HelpCircle,
  Video,
 
} from 'lucide-react';

const CourseContent = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  // Removed tabs and default content; show lessons only

  // Remove mock course data; lessons should come from real data later
  const lessons: any[] = [];

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const handleLessonClick = (lessonId: string) => {
    console.log('Open lesson:', lessonId);
    // Navigate to lesson player
  };

  // Removed exams/assignments handlers and tabs

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader />
      
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
            {/* Removed course title/description and progress header */}

            {/* Lessons Only */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-4">
                  {language === 'ar' ? 'دروس الدورة' : 'Course Lessons'}
                </h2>
                {lessons.length > 0 ? (
                  <>
                    {lessons.map((lesson, index) => (
                      <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {language === 'ar' ? lesson.titleAr : lesson.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {lesson.type ? getContentIcon(lesson.type) : null}
                                {lesson.duration ? <span>{lesson.duration}</span> : null}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleLessonClick(lesson.id)}
                            disabled={!!lesson.isLocked}
                          >
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'بدء' : 'Start'}
                              </>
                          </Button>
                        </div>
                      </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد دروس متاحة حاليًا.' : 'No lessons available at the moment.'}
                  </p>
                )}
              </div>
          </div>
        </main>
      
      <FloatingSupportChat />
    </div>
  );
};

export default CourseContent;