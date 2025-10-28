// نماذج البيانات للدورات في Firestore
export interface Lesson {
  id: string;
  title: string;
  titleAr?: string;
  type: 'video' | 'text' | 'quiz';
  content: string; // URL للفيديو، محتوى نصي، أو بيانات الاختبار
  duration?: number; // بالدقائق
  order: number;
  isCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id?: string; // سيتم إنشاؤه تلقائياً بواسطة Firestore
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  category: string;
  categoryAr?: string;
  price: number;
  currency: string; // 'USD', 'ILS', etc.
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // إجمالي المدة بالساعات
  thumbnail: string; // URL للصورة المصغرة
  thumbnailFile?: File; // الملف المؤقت قبل الرفع
  
  // معلومات المدرس
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  
  // الدروس
  lessons: Lesson[];
  totalLessons: number;
  
  // الإحصائيات
  enrolledStudents: number;
  rating: number;
  totalRatings: number;
  
  // الحالة والتواريخ
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // معلومات إضافية
  tags?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  targetAudience?: string;
  
  // إعدادات الدورة
  allowComments: boolean;
  allowDownloads: boolean;
  certificateEnabled: boolean;
  
  // معلومات SEO
  slug?: string;
  metaDescription?: string;
}

// نموذج للتسجيل في الدورة
export interface CourseEnrollment {
  id?: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: Date;
  progress: number; // نسبة الإنجاز من 0 إلى 100
  completedLessons: string[]; // معرفات الدروس المكتملة
  lastAccessedAt: Date;
  status: 'active' | 'completed' | 'suspended';
  certificateIssued?: boolean;
  certificateIssuedAt?: Date;
}

// نموذج لتقييم الدورة
export interface CourseRating {
  id?: string;
  courseId: string;
  studentId: string;
  studentName: string;
  rating: number; // من 1 إلى 5
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

// نموذج لتعليقات الدروس
export interface LessonComment {
  id?: string;
  courseId: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: LessonComment[];
}

// نموذج لإحصائيات الدورة
export interface CourseStats {
  courseId: string;
  totalEnrollments: number;
  activeStudents: number;
  completionRate: number;
  averageRating: number;
  totalRevenue: number;
  monthlyEnrollments: { [month: string]: number };
  dailyViews: { [date: string]: number };
  updatedAt: Date;
}