import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  AlertCircle,
  HardDrive,
  Copy
} from "lucide-react";
import { Zap, Calendar as CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CourseService } from '@/services/courseService';
import { StorageService } from '@/services/storageService';
import { TeacherService } from '@/services/teacherService';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { storage } from '@/firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

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
  const [uploadedVideoProvider, setUploadedVideoProvider] = useState<'s3' | 'firebase' | null>(null);
  const [uploadedVideoSize, setUploadedVideoSize] = useState<number>(0);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string | null>(null);
  const [videoVisibility, setVideoVisibility] = useState<'private' | 'unlisted' | 'public'>('private');
  const [isPremiere, setIsPremiere] = useState<boolean>(false);
  const [publicInstant, setPublicInstant] = useState<boolean>(true);
  const [publicSchedule, setPublicSchedule] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [scheduledHour, setScheduledHour] = useState<number>(12);
  const [scheduledMinute, setScheduledMinute] = useState<number>(0);
  const [scheduledPeriod, setScheduledPeriod] = useState<'am' | 'pm'>("am");
  const storageKey = `addLesson:${courseId}`;
  const [replacePrev, setReplacePrev] = useState<{ provider: 's3' | 'firebase' | null, url: string | null, path: string | null, size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const title = typeof data?.title === 'string' ? data.title : '';
        const description = typeof data?.description === 'string' ? data.description : '';
        const videoUrl = typeof data?.uploadedVideoUrl === 'string' ? data.uploadedVideoUrl : null;
        const provider = data?.uploadedVideoProvider === 's3' || data?.uploadedVideoProvider === 'firebase' ? data.uploadedVideoProvider : null;
        const size = typeof data?.uploadedVideoSize === 'number' ? data.uploadedVideoSize : 0;
        const path = typeof data?.uploadedVideoPath === 'string' ? data.uploadedVideoPath : null;
        setLessonData(prev => ({ ...prev, title, description }));
        setUploadedVideoUrl(videoUrl);
        setUploadedVideoProvider(provider);
        setUploadedVideoSize(size);
        setUploadedVideoPath(path);
        if (data?.videoVisibility === 'private' || data?.videoVisibility === 'unlisted' || data?.videoVisibility === 'public') {
          const vis = data.videoVisibility === 'unlisted' ? 'private' : data.videoVisibility;
          setVideoVisibility(vis);
        }
        if (typeof data?.isPremiere === 'boolean') {
          // ignore removed premiere option
        }
        if (typeof data?.publicInstant === 'boolean') setPublicInstant(!!data.publicInstant);
        if (typeof data?.publicSchedule === 'boolean') setPublicSchedule(!!data.publicSchedule);
        if (typeof data?.scheduledAt === 'string') {
          setScheduledAt(data.scheduledAt);
          try {
            const d = new Date(data.scheduledAt);
            let h = d.getHours();
            const period = h >= 12 ? 'pm' : 'am';
            h = h % 12;
            setScheduledHour(h === 0 ? 12 : h);
            setScheduledMinute(d.getMinutes());
            setScheduledPeriod(period);
          } catch {}
        }
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      const payload = {
        title: lessonData.title,
        description: lessonData.description,
        uploadedVideoUrl,
        uploadedVideoProvider,
        uploadedVideoSize,
        uploadedVideoPath,
        videoVisibility,
        isPremiere,
        publicInstant,
        publicSchedule,
        scheduledAt,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [lessonData.title, lessonData.description, uploadedVideoUrl, uploadedVideoProvider, uploadedVideoSize, uploadedVideoPath, videoVisibility, isPremiere, publicInstant, publicSchedule, scheduledAt, storageKey]);

  const handleInputChange = (field: keyof LessonData, value: string) => {
    setLessonData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const processVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار ملف فيديو صالح' : 'Please select a valid video file');
      return;
    }
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 500MB)' : 'File size too large (max 500MB)');
      return;
    }
    try {
      let usedSinceReset = 0;
      try {
        const lastRaw = localStorage.getItem('lastStorageUsedBytes');
        usedSinceReset = lastRaw ? Number(lastRaw) : 0;
      } catch {}
      let storageGb = 0;
      try {
        const rawGb = localStorage.getItem('approvedStorageGB');
        const baseGb = rawGb ? Number(rawGb) : 0;
        const extraRaw = localStorage.getItem('extraStorageGB');
        const extraGb = extraRaw ? Number(extraRaw) : 0;
        storageGb = (isNaN(baseGb) ? 0 : baseGb) + (isNaN(extraGb) ? 0 : extraGb);
      } catch {}
      if (storageGb > 0) {
        const capBytes = storageGb * 1024 * 1024 * 1024;
        const available = capBytes - usedSinceReset;
        if (available < file.size) {
          toast.error(language === 'ar' ? 'الفيديو يتجاوز المساحة التخزينية المتوفرة لديك. قم بترقية الباقة أو شراء مساحة إضافية.' : 'Video exceeds your available storage. Upgrade your plan or buy additional storage.');
          return;
        }
      }
    } catch {}
    setLessonData(prev => ({ ...prev, videoFile: file }));
    uploadVideoToS3(file);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processVideoFile(file);
      try { (event.target as HTMLInputElement).value = ''; } catch {}
      setReplacePrev(null);
    }
  };

  const uploadVideoToS3 = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    const apiBase = (typeof window !== 'undefined'
      ? (localStorage.getItem('apiBase') || 'http://127.0.0.1:8000')
      : 'http://127.0.0.1:8000');
    const endpoint = `${apiBase}/api/upload-s3-video`;
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
        uploadToFirebase(file);
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
          setIsUploading(false);
          setUploadedVideoUrl(data.url);
          setUploadedVideoProvider('s3');
          setUploadedVideoSize(file.size);
          setUploadedVideoPath(data?.key || null);
          try {
            const payload = { title: lessonData.title, description: lessonData.description, uploadedVideoUrl: data.url, uploadedVideoProvider: 's3', uploadedVideoSize: file.size, uploadedVideoPath: (data?.key || null) };
            localStorage.setItem(storageKey, JSON.stringify(payload));
          } catch {}
          toast.success(language === 'ar' ? 'تم رفع الفيديو بنجاح!' : 'Video uploaded successfully!');
          try {
            const prevRaw = localStorage.getItem('teacherUploadOffsetBytes');
            const prev = prevRaw ? Number(prevRaw) : 0;
            localStorage.setItem('teacherUploadOffsetBytes', String(prev));
          } catch {}
          try {
            const prevS3Raw = localStorage.getItem('teacherS3UsageBytes');
            const prevS3 = prevS3Raw ? Number(prevS3Raw) : 0;
            const nextS3 = prevS3 + file.size;
            localStorage.setItem('teacherS3UsageBytes', String(nextS3));
          } catch {}
          try {
            window.dispatchEvent(new CustomEvent('teacher-storage-updated', { detail: { addedBytes: file.size } }));
          } catch {}
          try {
            const lastRaw = localStorage.getItem('lastStorageUsedBytes');
            const last = lastRaw ? Number(lastRaw) : 0;
            const nextLast = last + file.size;
            localStorage.setItem('lastStorageUsedBytes', String(nextLast));
          } catch {}
          try {
            (async () => {
              const t = user?.uid ? await TeacherService.getTeacherByUid(user.uid).catch(() => null) : null;
              const teacherId = (t as any)?.id || user?.uid || null;
              if (teacherId) {
                await updateDoc(doc(db, 'teachers', teacherId), {
                  s3UsageBytes: increment(file.size),
                  updatedAt: new Date().toISOString(),
                });
              }
            })();
          } catch {}
          try {
            (async () => {
              try {
                if (replacePrev && replacePrev.provider === 's3' && replacePrev.url) {
                  const apiBase = (typeof window !== 'undefined' ? (localStorage.getItem('apiBase') || '') : '');
                  const endpoint = `${apiBase ? apiBase : ''}/api/delete-s3-video`;
                  const deriveKey = (u: string) => { try { const p = new URL(u).pathname; return p.startsWith('/') ? p.slice(1) : p; } catch { return u; } };
                  const key = replacePrev.path || deriveKey(replacePrev.url);
                  await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: replacePrev.url, key }) }).catch(() => null);
                } else if (replacePrev && replacePrev.provider === 'firebase' && replacePrev.path) {
                  try { await deleteObject(storageRef(storage, replacePrev.path)); } catch {}
                }
              } catch {}
            })();
          } catch {}
          setReplacePrev(null);
        } else {
          uploadToFirebase(file);
        }
      };

      xhr.send(form);
      setUploadProgress((prev) => (prev < 1 ? 1 : prev));
      if (fallbackTimer === null) {
        fallbackTimer = window.setInterval(() => {
          setUploadProgress(prev => (prev < 95 ? prev + 1 : prev));
        }, 300);
      }
    } catch (err) {
      uploadToFirebase(file);
    }
  };

  const uploadToFirebase = (file: File) => {
    try {
      setIsUploading(true);
      const path = `lesson-files/${courseId}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file);
      task.on('state_changed', (snapshot) => {
        const percent = Math.min(100, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        setUploadProgress((prev) => Math.max(prev, percent));
      }, (error: any) => {
        setIsUploading(false);
        setUploadedVideoUrl(null);
        toast.error(language === 'ar' ? 'فشل رفع الفيديو إلى التخزين.' : 'Failed to upload video to storage.');
      }, async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploadProgress(100);
          setUploadedVideoUrl(url);
          setUploadedVideoProvider('firebase');
          setUploadedVideoSize(file.size);
          setUploadedVideoPath(path);
          try {
            const payload = { title: lessonData.title, description: lessonData.description, uploadedVideoUrl: url, uploadedVideoProvider: 'firebase', uploadedVideoSize: file.size, uploadedVideoPath: path };
            localStorage.setItem(storageKey, JSON.stringify(payload));
          } catch {}
          setIsUploading(false);
          toast.success(language === 'ar' ? 'تم رفع الفيديو بنجاح!' : 'Video uploaded successfully!');
          try {
            const prevRaw = localStorage.getItem('teacherUploadOffsetBytes');
            const prev = prevRaw ? Number(prevRaw) : 0;
            const next = prev + file.size;
            localStorage.setItem('teacherUploadOffsetBytes', String(next));
          } catch {}
          try {
            window.dispatchEvent(new CustomEvent('teacher-storage-updated', { detail: { addedBytes: file.size } }));
          } catch {}
          try {
            (async () => {
              try {
                if (replacePrev && replacePrev.provider === 's3' && replacePrev.url) {
                  const apiBase = (typeof window !== 'undefined' ? (localStorage.getItem('apiBase') || '') : '');
                  const endpoint = `${apiBase ? apiBase : ''}/api/delete-s3-video`;
                  const deriveKey = (u: string) => { try { const p = new URL(u).pathname; return p.startsWith('/') ? p.slice(1) : p; } catch { return u; } };
                  const key = replacePrev.path || deriveKey(replacePrev.url);
                  await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: replacePrev.url, key }) }).catch(() => null);
                } else if (replacePrev && replacePrev.provider === 'firebase' && replacePrev.path) {
                  try { await deleteObject(storageRef(storage, replacePrev.path)); } catch {}
                }
              } catch {}
            })();
          } catch {}
          setReplacePrev(null);
        } catch (e) {
          setIsUploading(false);
          setUploadedVideoUrl(null);
          toast.error(language === 'ar' ? 'تعذر الحصول على رابط الفيديو بعد الرفع.' : 'Unable to get video URL after upload.');
        }
      });
    } catch (e) {
      setIsUploading(false);
      setUploadedVideoUrl(null);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء رفع الفيديو.' : 'An error occurred during video upload.');
    }
  };

  const handleDeleteVideo = async () => {
    if (!uploadedVideoUrl || !uploadedVideoProvider) return;
    try {
      const size = uploadedVideoSize || 0;
      const apiBaseRaw = (typeof window !== 'undefined') ? (localStorage.getItem('apiBase') || '') : '';
      const apiBase = apiBaseRaw && apiBaseRaw.trim() ? apiBaseRaw.trim() : '';
      const deriveS3KeyFromUrl = (u: string) => {
        try { const p = new URL(u).pathname; return p.startsWith('/') ? p.slice(1) : p; } catch { return u; }
      };
      if (uploadedVideoProvider === 's3') {
        const endpoint = `${apiBase}/api/delete-s3-video`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: uploadedVideoUrl, key: uploadedVideoUrl ? deriveS3KeyFromUrl(uploadedVideoUrl) : undefined })
        }).catch(() => null);
        if (!res || !res.ok) {
          try { toast.warning(language === 'ar' ? 'تعذر حذف الفيديو من S3، تم تنظيف الحالة محليًا.' : 'S3 delete failed; local state cleaned.'); } catch {}
        }
      } else if (uploadedVideoProvider === 'firebase' && uploadedVideoPath) {
        try {
          await deleteObject(storageRef(storage, uploadedVideoPath));
        } catch {
          toast.error(language === 'ar' ? 'تعذر حذف فيديو التخزين.' : 'Failed to delete storage video.');
          return;
        }
      }

      setLessonData(prev => ({ ...prev, videoFile: null }));
      setUploadedVideoUrl(null);
      setUploadedVideoProvider(null);
      setUploadedVideoSize(0);
      setUploadedVideoPath(null);
      setUploadProgress(0);
      try {
        const payload = { title: lessonData.title, description: lessonData.description, uploadedVideoUrl: null, uploadedVideoProvider: null, uploadedVideoSize: 0, uploadedVideoPath: null };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}
      toast.success(language === 'ar' ? 'تم حذف الفيديو.' : 'Video deleted.');
    } catch {
      toast.error(language === 'ar' ? 'فشل حذف الفيديو.' : 'Failed to delete video.');
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
      // تحديد حالة الرؤية والجدولة
      let visibility: 'private' | 'public' | 'scheduled' = 'private';
      let publishAt: string | undefined = undefined;
      if (videoVisibility === 'public') {
        if (publicSchedule && scheduledAt) {
          visibility = 'scheduled';
          publishAt = scheduledAt;
        } else {
          visibility = 'public';
          publishAt = new Date().toISOString();
        }
      } else {
        visibility = 'private';
      }

      // حفظ الدرس في Firestore
      const lessonId = await CourseService.addLessonToCourse(courseId!, {
        title: lessonData.title,
        description: lessonData.description,
        videoUrl: uploadedVideoUrl || undefined,
        visibility,
        publishAt,
      });
      
      toast.success(language === 'ar' ? 'تم نشر الدرس بنجاح!' : 'Lesson published successfully!');
      try { localStorage.removeItem(storageKey); } catch {}
      
      // العودة إلى صفحة الدورات
      navigate('/teacher-dashboard/courses');
      
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
        
        <main className="flex-1 p-6">
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

            <div className="space-y-6">
              

              {/* Video Upload */}
              <Card className="shadow-none rounded-xl bg-gray-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileVideo className="h-5 w-5 text-[#2c4656]" />
                    {language === 'ar' ? 'تفاصيل الدرس' : 'Lesson Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-4">
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
                      <div className="mt-2 rounded-xl border p-4 bg-gray-50">
                        <div className={`${language === 'ar' ? 'text-right' : ''} mb-2`}>
                          <div className="text-base font-semibold">{language === 'ar' ? 'مستوى العرض' : 'Visibility Level'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'يمكنك اختيار وقت نشر الفيديو ومن يمكنه مشاهدته.' : 'Choose when to publish and who can watch the video.'}</div>
                        </div>
                        <div className={`rounded-lg border p-3 ${language === 'ar' ? 'text-right' : ''}`}>
                          <div className="text-sm font-medium mb-2">{language === 'ar' ? 'حفظ الفيديو أو نشره' : 'Save or Publish'}</div>
                          <RadioGroup value={videoVisibility} onValueChange={(v) => setVideoVisibility(v as 'private' | 'public')}>
                            <label htmlFor="vis-private-main" className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <RadioGroupItem id="vis-private-main" value="private" />
                              <div>
                                <div className="font-medium">{language === 'ar' ? 'خاص' : 'Private'}</div>
                                <div className="text-sm text-muted-foreground">{language === 'ar' ? 'يمكنك أنت والمستخدمون الذين تختارهم فقط مشاهدة الفيديو.' : 'Only you and selected users can watch the video.'}</div>
                              </div>
                            </label>
                            <label htmlFor="vis-public-main" className={`flex items-start gap-3 mt-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <RadioGroupItem id="vis-public-main" value="public" />
                              <div>
                                <div className="font-medium">{language === 'ar' ? 'علني' : 'Public'}</div>
                                <div className="text-sm text-muted-foreground">{language === 'ar' ? 'يمكن للجميع مشاهدة الفيديو.' : 'Everyone can watch the video.'}</div>
                              </div>
                            </label>
                          </RadioGroup>
                          {videoVisibility === 'public' && (
                            <div className={`mt-3 space-y-3 ${language === 'ar' ? 'text-right' : ''}`}>
                              <div className="text-sm font-medium">{language === 'ar' ? 'خيارات النشر' : 'Publish Options'}</div>
                              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <Switch
                                  checked={publicInstant}
                                  onCheckedChange={(v) => { setPublicInstant(!!v); if (v) setPublicSchedule(false); }}
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    <span className="text-sm font-medium">{language === 'ar' ? 'نشر فوري' : 'Instant Publish'}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar'
                                      ? 'عند تفعيل النشر الفوري، سيتمكن جميع المسموح لهم بمشاهدة هذا الدرس من رؤيته فور نشره.'
                                      : 'When enabled, everyone allowed to view this lesson will see it immediately upon publish.'}
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <Switch
                                  checked={publicSchedule}
                                  onCheckedChange={(v) => { const on = !!v; setPublicSchedule(on); if (on) setPublicInstant(false); }}
                                />
                                <div className="space-y-1 w-full">
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{language === 'ar' ? 'تحديد موعد العرض' : 'Schedule Release'}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar'
                                      ? 'عند التفعيل، اختر تاريخ عرض الدرس ليصبح متاحًا تلقائيًا في الموعد المحدد.'
                                      : 'When enabled, pick a date for the lesson to become available automatically.'}
                                  </div>
                                  {publicSchedule && (
                                    <div className="mt-2">
                                      <div className={language === 'ar' ? 'flex flex-col items-end gap-2' : 'flex flex-col items-start gap-2'}>
                                        <div className="w-56">
                                          <Calendar
                                            className="p-2"
                                            classNames={{
                                              head_cell: "w-7 text-[0.75rem]",
                                              day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100",
                                              nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                                            }}
                                            selected={scheduledAt ? new Date(scheduledAt) : undefined}
                                            onSelect={(d) => {
                                              if (!d) { setScheduledAt(null); return; }
                                              const base = new Date(d);
                                              let h12 = scheduledHour % 12;
                                              if (scheduledPeriod === 'pm') h12 += 12;
                                              base.setHours(h12, scheduledMinute, 0, 0);
                                              setScheduledAt(base.toISOString());
                                            }}
                                            mode="single"
                                          />
                                        </div>
                                        <div className={language === 'ar' ? 'flex items-center gap-2 flex-row-reverse' : 'flex items-center gap-2'}>
                                          <div className="w-20">
                                            <Select value={String(scheduledHour)} onValueChange={(v) => {
                                              const hv = Number(v);
                                              setScheduledHour(hv);
                                              if (scheduledAt) {
                                                const base = new Date(scheduledAt);
                                                let h12 = hv % 12;
                                                if (scheduledPeriod === 'pm') h12 += 12;
                                                base.setHours(h12, scheduledMinute, 0, 0);
                                                setScheduledAt(base.toISOString());
                                              }
                                            }}>
                                              <SelectTrigger>
                                                <SelectValue placeholder={language === 'ar' ? 'ساعة' : 'Hour'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {[1,2,3,4,5,6,7,8,9,10,11,12].map((h) => (
                                                  <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="w-20">
                                            <Select value={String(scheduledMinute)} onValueChange={(v) => {
                                              const mv = Number(v);
                                              setScheduledMinute(mv);
                                              if (scheduledAt) {
                                                const base = new Date(scheduledAt);
                                                let h12 = scheduledHour % 12;
                                                if (scheduledPeriod === 'pm') h12 += 12;
                                                base.setHours(h12, mv, 0, 0);
                                                setScheduledAt(base.toISOString());
                                              }
                                            }}>
                                              <SelectTrigger>
                                                <SelectValue placeholder={language === 'ar' ? 'دقيقة' : 'Minute'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {[0,5,10,15,20,25,30,35,40,45,50,55].map((m) => (
                                                  <SelectItem key={m} value={String(m)}>{String(m).padStart(2,'0')}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="w-20">
                                            <Select value={scheduledPeriod} onValueChange={(v) => {
                                              const pv = v === 'pm' ? 'pm' : 'am';
                                              setScheduledPeriod(pv);
                                              if (scheduledAt) {
                                                const base = new Date(scheduledAt);
                                                let h12 = scheduledHour % 12;
                                                if (pv === 'pm') h12 += 12;
                                                base.setHours(h12, scheduledMinute, 0, 0);
                                                setScheduledAt(base.toISOString());
                                              }
                                            }}>
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="am">{language === 'ar' ? 'ص' : 'AM'}</SelectItem>
                                                <SelectItem value="pm">{language === 'ar' ? 'م' : 'PM'}</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {scheduledAt
                                            ? (() => {
                                                const d = new Date(scheduledAt);
                                                const h24 = d.getHours();
                                                const p = h24 >= 12 ? (language === 'ar' ? 'م' : 'PM') : (language === 'ar' ? 'ص' : 'AM');
                                                const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                                                const mm = String(d.getMinutes()).padStart(2,'0');
                                                return (language === 'ar' ? 'التاريخ والوقت المحدد: ' : 'Selected: ') + d.toLocaleDateString() + ` ${h12}:${mm} ${p}`;
                                              })()
                                            : (language === 'ar' ? 'لم يتم اختيار تاريخ بعد' : 'No date selected')}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="w-80">
                        {!(lessonData.videoFile || uploadedVideoUrl) ? (
                          <div 
                            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-[#2c4656] bg-gray-50 transition-colors"
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) { processVideoFile(f); } }}
                          >
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              className="hidden"
                              id="video-upload"
                              ref={fileInputRef}
                            />
                            <label
                              htmlFor="video-upload"
                              className={`flex flex-col items-center gap-4 ${(() => {
                                try {
                                  const rawGb = localStorage.getItem('approvedStorageGB');
                                  const baseGb = rawGb ? Number(rawGb) : 0;
                                  const extraRaw = localStorage.getItem('extraStorageGB');
                                  const extraGb = extraRaw ? Number(extraRaw) : 0;
                                  const capGb = (isNaN(baseGb) ? 0 : baseGb) + (isNaN(extraGb) ? 0 : extraGb);
                                  const lastRaw = localStorage.getItem('lastStorageUsedBytes');
                                  const lastUsed = lastRaw ? Number(lastRaw) : 0;
                                  const baselineRaw = localStorage.getItem('usageBaselineBytes');
                                  const baseline = baselineRaw ? Number(baselineRaw) : 0;
                                  const usedSinceReset = Math.max(0, lastUsed - (isNaN(baseline) ? 0 : baseline));
                                  const capBytes = capGb * 1024 * 1024 * 1024;
                                  const blocked = capGb > 0 && usedSinceReset >= capBytes;
                                  return blocked ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer';
                                } catch { return 'cursor-pointer'; }
                              })()}`}
                            >
                              <div className="w-16 h-16 bg-[#2c4656]/10 rounded-full flex items-center justify-center">
                                <FileVideo className="h-8 w-8 text-[#2c4656]" />
                              </div>
                              <div>
                                <p className="text-lg font-medium text-gray-900">
                                  {language === 'ar' ? 'اسحب فيديو الدرس هنا أو اضغط لاختياره' : 'Drag lesson video here or click to select'}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {language === 'ar' ? 'MP4, MOV, AVI حتى 500MB' : 'MP4, MOV, AVI up to 500MB'}
                                </p>
                              </div>
                            </label>
                            {(() => {
                                try {
                                const rawGb = localStorage.getItem('approvedStorageGB');
                                const baseGb = rawGb ? Number(rawGb) : 0;
                                const extraRaw = localStorage.getItem('extraStorageGB');
                                const extraGb = extraRaw ? Number(extraRaw) : 0;
                                const capGb = (isNaN(baseGb) ? 0 : baseGb) + (isNaN(extraGb) ? 0 : extraGb);
                                const lastRaw = localStorage.getItem('lastStorageUsedBytes');
                                const lastUsed = lastRaw ? Number(lastRaw) : 0;
                                const capBytes = capGb * 1024 * 1024 * 1024;
                                const blocked = capGb > 0 && lastUsed >= capBytes;
                                if (blocked) {
                                  return (
                                    <div className="mt-3 text-sm text-red-600">
                                      {language === 'ar' 
                                        ? <>
                                            لقد وصلت إلى الحد المسموح به من المساحة.
                                            <Link to="/teacher-dashboard/storage-addon" className="inline-flex items-center gap-1 px-2 py-1 ml-2 rounded-md border border-red-200 bg-red-50 text-red-600">
                                              <HardDrive className="h-4 w-4" />
                                              <span>شراء مساحة إضافية</span>
                                            </Link>
                                          </>
                                        : <>
                                            You reached your storage limit.
                                            <Link to="/teacher-dashboard/storage-addon" className="inline-flex items-center gap-1 px-2 py-1 ml-2 rounded-md border border-red-200 bg-red-50 text-red-600">
                                              <HardDrive className="h-4 w-4" />
                                              <span>Buy additional storage</span>
                                            </Link>
                                          </>}
                                    </div>
                                  );
                                }
                              } catch {}
                              return null;
                            })()}
                          </div>
                        ) : (
                          <>
                            {isUploading && (
                              <div className="rounded-lg overflow-hidden border border-gray-200 bg-white text-gray-900 mb-3">
                                <div className="bg-black relative" style={{ aspectRatio: '16 / 9' }}>
                                  <div className="absolute inset-0">
                                    <div className="h-full bg-[#2c4656]/60" style={{ width: `${uploadProgress}%`, transition: 'width 200ms ease' }} />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FileVideo className="h-20 w-20 text-white" style={{ opacity: Math.max(0.2, 1 - uploadProgress / 100) }} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {uploadedVideoUrl && (
                              <div className="rounded-lg overflow-hidden border border-gray-200 bg-white text-gray-900">
                                <div className="bg-black" style={{ aspectRatio: '16 / 9' }}>
                                  <video src={uploadedVideoUrl} controls className="w-full h-full object-contain" />
                                </div>
                                <div className={`p-3 flex items-start justify-between ${language === 'ar' ? 'flex-row-reverse text-right' : ''}`}>
                                  <button
                                    type="button"
                                    onClick={() => { try { if (uploadedVideoUrl) { navigator.clipboard.writeText(uploadedVideoUrl); toast.success(language === 'ar' ? 'تم نسخ الرابط' : 'Link copied'); } } catch {} }}
                                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    aria-label={language === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  <div className="space-y-1"> 
                                    <div className="text-sm text-gray-600">{language === 'ar' ? 'رابط الفيديو' : 'Video Link'}</div>
                                    <a href={uploadedVideoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{uploadedVideoUrl}</a>
                                    <div className="text-sm text-gray-600 mt-2">{language === 'ar' ? 'اسم الملف' : 'File Name'}</div>
                                    <div className="text-sm text-gray-900 break-all">{lessonData.videoFile?.name || (uploadedVideoUrl ? uploadedVideoUrl.split('/').pop() : '')}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setReplacePrev({ provider: uploadedVideoProvider, url: uploadedVideoUrl, path: uploadedVideoPath, size: uploadedVideoSize }); try { fileInputRef.current?.click(); } catch {} }}
                                className="opacity-70 hover:opacity-100"
                              >
                                {language === 'ar' ? 'تغيير الفيديو' : 'Change Video'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteVideo}
                              >
                                {language === 'ar' ? 'حذف الفيديو' : 'Delete Video'}
                              </Button>
                            </div>
                          </>
                        )}
                        
                      </div>
                    </div>
                  </div>
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

            
          </div>
        </main>
      </div>
    </div>
  );
};