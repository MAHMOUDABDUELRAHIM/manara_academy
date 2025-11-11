import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import { 
  Upload, 
  Video, 
  ArrowLeft, 
  FileVideo,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { CourseService } from '@/services/courseService';

interface LessonData {
  title: string;
  description: string;
  videoFile: File | null;
}

export const AddLesson = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [lessonData, setLessonData] = useState<LessonData>({
    title: "",
    description: "",
    videoFile: null
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  const handleInputChange = (field: keyof LessonData, value: string) => {
    setLessonData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.startsWith('video/')) {
        toast.error(language === 'ar' ? 'يرجى اختيار ملف فيديو صالح' : 'Please select a valid video file');
        return;
      }

      // التحقق من حجم الملف (مثلاً 500MB كحد أقصى)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 500MB)' : 'File size too large (max 500MB)');
        return;
      }

      setLessonData(prev => ({
        ...prev,
        videoFile: file
      }));

      // رفع الفيديو فعلياً إلى مخزن S3 عبر الـ API
      uploadVideoToS3(file);
    }
  };

  const uploadVideoToS3 = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    const endpoint = `/api/upload-s3-video`;
    const form = new FormData();
    form.append('video', file);
    if (lessonData.title) form.append('title', lessonData.title);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      // If you need cookies, set withCredentials = true; not needed here
      xhr.responseType = 'json';

      let fallbackTimer: number | null = null;
      xhr.upload.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          setUploadProgress(percent);
        } else {
          // Fallback: gently tick progress to reassure user during unknown length uploads
          if (fallbackTimer === null) {
            fallbackTimer = window.setInterval(() => {
              setUploadProgress(prev => (prev < 95 ? prev + 1 : prev));
            }, 300);
          }
        }
      };

      const clearFallback = () => {
        if (fallbackTimer !== null) {
          window.clearInterval(fallbackTimer);
          fallbackTimer = null;
        }
      };

      xhr.onerror = () => {
        clearFallback();
        setIsUploading(false);
        setUploadedVideoUrl(null);
        toast.error(language === 'ar' ? 'فشل الاتصال بالسيرفر أثناء الرفع.' : 'Failed to connect to server during upload.');
      };
      xhr.onabort = () => {
        clearFallback();
        setIsUploading(false);
        setUploadedVideoUrl(null);
        toast.error(language === 'ar' ? 'تم إلغاء عملية الرفع.' : 'Upload was aborted.');
      };
      xhr.ontimeout = () => {
        clearFallback();
        setIsUploading(false);
        setUploadedVideoUrl(null);
        toast.error(language === 'ar' ? 'انتهت مهلة الاتصال أثناء الرفع.' : 'Upload timed out.');
      };

      xhr.onload = () => {
        clearFallback();
        const status = xhr.status;
        let data: any = null;
        try {
          data = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
        } catch (e) {
          // ignore parse error
        }

        if (status >= 200 && status < 300 && data?.success) {
          setUploadProgress(100);
          setUploadedVideoUrl(data.url);
          toast.success(language === 'ar' ? 'تم رفع الفيديو بنجاح!' : 'Video uploaded successfully!');
        } else {
          const msg = (data?.message && data?.error) ? `${data.message}: ${data.error}`
                    : (data?.message || `Upload failed with status ${status}`);
          setUploadedVideoUrl(null);
          toast.error(language === 'ar' ? `فشل الرفع: ${msg}` : `Upload failed: ${msg}`);
        }
        setIsUploading(false);
      };

      xhr.send(form);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setUploadedVideoUrl(null);
      toast.error(language === 'ar' ? 'حدث خطأ غير متوقع أثناء الرفع.' : 'Unexpected error occurred during upload.');
    }
  };

  const handlePublishLesson = async () => {
    // التحقق من البيانات المطلوبة
    if (!lessonData.title.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال عنوان الدرس' : 'Please enter lesson title');
      return;
    }

    if (!lessonData.description.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال وصف الدرس' : 'Please enter lesson description');
      return;
    }

    // يجب رفع الفيديو والحصول على رابط صالح قبل النشر
    if (!uploadedVideoUrl) {
      toast.error(language === 'ar' ? 'يرجى رفع فيديو الدرس أولاً' : 'Please upload the lesson video first');
      return;
    }

    setIsPublishing(true);

    try {
      // حفظ الدرس في Firestore
      const lessonId = await CourseService.addLessonToCourse(courseId!, {
        title: lessonData.title,
        description: lessonData.description,
        videoUrl: uploadedVideoUrl,
      });
      
      toast.success(language === 'ar' ? 'تم نشر الدرس بنجاح!' : 'Lesson published successfully!');
      
      // العودة إلى صفحة الدورات
      navigate('/teacher-dashboard');
      
    } catch (error) {
      console.error('Error publishing lesson:', error);
      toast.error(language === 'ar' ? 'خطأ في نشر الدرس' : 'Error publishing lesson');
    } finally {
      setIsPublishing(false);
    }
  };

  const goBack = () => {
    navigate('/teacher-dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="flex">
        <TeacherSidebar />
        
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === 'ar' ? 'العودة' : 'Back'}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {language === 'ar' ? 'إضافة درس جديد' : 'Add New Lesson'}
                </h1>
                <p className="text-gray-600">
                  {language === 'ar' ? 'أضف درساً جديداً إلى دورتك' : 'Add a new lesson to your course'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lesson Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileVideo className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'تفاصيل الدرس' : 'Lesson Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === 'ar' ? 'عنوان الدرس' : 'Lesson Title'}
                    </label>
                    <Input
                      placeholder={language === 'ar' ? 'أدخل عنوان الدرس...' : 'Enter lesson title...'}
                      value={lessonData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === 'ar' ? 'وصف الدرس' : 'Lesson Description'}
                    </label>
                    <Textarea
                      placeholder={language === 'ar' ? 'أدخل وصف الدرس...' : 'Enter lesson description...'}
                      value={lessonData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="w-full min-h-[120px]"
                      rows={5}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Video Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'فيديو الدرس' : 'Lesson Video'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!lessonData.videoFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#2c4656] transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="cursor-pointer flex flex-col items-center gap-4"
                      >
                        <div className="w-16 h-16 bg-[#2c4656]/10 rounded-full flex items-center justify-center">
                          <Upload className="h-8 w-8 text-[#2c4656]" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            {language === 'ar' ? 'اضغط لرفع الفيديو' : 'Click to upload video'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {language === 'ar' ? 'MP4, MOV, AVI (حتى 500MB)' : 'MP4, MOV, AVI (up to 500MB)'}
                          </p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{lessonData.videoFile.name}</p>
                          <p className="text-sm text-green-700">
                            {(lessonData.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} className="w-full" />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setLessonData(prev => ({ ...prev, videoFile: null })); setUploadedVideoUrl(null); setUploadProgress(0); }}
                        className="w-full"
                      >
                        {language === 'ar' ? 'تغيير الفيديو' : 'Change Video'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Publish Button */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handlePublishLesson}
                disabled={isPublishing || !lessonData.title || !lessonData.description || !uploadedVideoUrl}
                className="bg-[#2c4656] hover:bg-[#1e3240] text-white px-8 py-2 flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {language === 'ar' ? 'جاري النشر...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {language === 'ar' ? 'نشر الدرس' : 'Publish Lesson'}
                  </>
                )}
              </Button>
            </div>

            {/* Info Alert */}
            <div className="mt-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">
                    {language === 'ar' ? 'ملاحظة مهمة' : 'Important Note'}
                  </p>
                  <p>
                    {language === 'ar' 
                      ? 'تم تمكين رفع الفيديو إلى مخزن خارجي متوافق مع S3. سيتم عرض الفيديو مباشرة عبر الرابط المرفوع.'
                      : 'Video upload to an external S3-compatible storage is enabled. Videos will play directly from the uploaded URL.'
                    }
                  </p>
              </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};