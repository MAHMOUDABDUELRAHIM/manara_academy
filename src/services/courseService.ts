import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Course, CourseEnrollment, CourseRating } from '@/types/course';
import { NotificationService } from './notificationService';
import { StudentService } from './studentService';

export class CourseService {
  private static coursesCollection = 'courses';
  private static enrollmentsCollection = 'enrollments';
  private static ratingsCollection = 'courseRatings';

  /**
   * إنشاء دورة جديدة
   */
  static async createCourse(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // تحويل الصورة إلى base64 إذا كانت موجودة
      let thumbnailBase64 = '';
      if (courseData.thumbnailFile) {
        thumbnailBase64 = await this.convertFileToBase64(courseData.thumbnailFile);
      }

      // إعداد بيانات الدورة
      const courseToSave: Omit<Course, 'id'> = {
        ...courseData,
        thumbnail: thumbnailBase64,
        totalLessons: courseData.lessons.length,
        enrolledStudents: 0,
        rating: 0,
        totalRatings: 0,
        status: 'published',
        isActive: true,
        allowComments: true,
        allowDownloads: false,
        certificateEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // إزالة thumbnailFile من البيانات المحفوظة
      delete (courseToSave as any).thumbnailFile;

      // حفظ الدورة في Firestore
      const docRef = await addDoc(collection(db, this.coursesCollection), {
        ...courseToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('تم إنشاء الدورة بنجاح:', docRef.id);

      // التسجيل التلقائي للطلاب وإرسال الإشعارات
      try {
        await this.autoEnrollStudentsAndNotify(docRef.id, courseData.instructorId, courseData.title, courseData.instructorName);
      } catch (enrollmentError) {
        console.error('خطأ في التسجيل التلقائي للطلاب:', enrollmentError);
        // لا نرمي خطأ هنا لأن الكورس تم إنشاؤه بنجاح
      }

      return docRef.id;
    } catch (error) {
      console.error('خطأ في إنشاء الدورة:', error);
      throw new Error('فشل في إنشاء الدورة. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * التسجيل التلقائي للطلاب وإرسال الإشعارات
   */
  private static async autoEnrollStudentsAndNotify(
    courseId: string, 
    teacherId: string, 
    courseTitle: string, 
    teacherName: string
  ): Promise<void> {
    try {
      // جلب جميع الطلاب المرتبطين بالمدرس
      const students = await StudentService.getStudentsByTeacher(teacherId);
      
      console.log(`Found ${students.length} students for teacher ${teacherId}`);

      // تحديد إن كانت الدورة مجانية قبل التسجيل التلقائي
      const course = await this.getCourseById(courseId);
      const price = Number((course as any)?.price ?? 0);
      const isFree = !isNaN(price) && price === 0;

      // تسجيل الطلاب في الكورس المجاني فقط
      if (isFree) {
        const enrollmentPromises = students.map(async (student) => {
          try {
            await StudentService.enrollInCourse(student.id, courseId);
            console.log(`Enrolled student ${student.id} in free course ${courseId}`);
          } catch (error) {
            console.error(`Failed to enroll student ${student.id}:`, error);
          }
        });

        // انتظار تسجيل جميع الطلاب
        await Promise.allSettled(enrollmentPromises);
      } else {
        console.log(`Course ${courseId} is paid. Skipping auto-enrollment for students.`);
      }

      // إرسال إشعارات لجميع الطلاب (عام)
      try {
        await NotificationService.createCourseNotificationsForAllStudents(
          teacherId, 
          courseId, 
          courseTitle, 
          teacherName
        );
        console.log(`Sent notifications to all students for course: ${courseTitle}`);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
      }

    } catch (error) {
      console.error('Error in auto enrollment and notification:', error);
      throw error;
    }
  }

  /**
   * تحديث دورة موجودة
   */
  static async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
      const courseRef = doc(db, this.coursesCollection, courseId);
      
      // تحويل صورة جديدة إلى base64 إذا كانت موجودة
      if (updates.thumbnailFile) {
        const thumbnailBase64 = await this.convertFileToBase64(updates.thumbnailFile);
        updates.thumbnail = thumbnailBase64;
        delete (updates as any).thumbnailFile;
      }

      await updateDoc(courseRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('تم تحديث الدورة بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث الدورة:', error);
      throw new Error('فشل في تحديث الدورة. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * تحديث محتوى الكورس (وصف/دروس) — واجهة مبسطة للاستخدام داخل إدارة المحتوى
   */
  static async updateCourseContent(courseId: string, updates: { description?: string; lessons?: any[] }): Promise<void> {
    return this.updateCourse(courseId, updates as Partial<Course>);
  }

  /**
   * حذف دورة
   */
  static async deleteCourse(courseId: string): Promise<void> {
    try {
      const courseRef = doc(db, this.coursesCollection, courseId);
      
      // حذف الدورة من Firestore (لا نحتاج لحذف الصور لأنها محفوظة كـ base64)
      await deleteDoc(courseRef);
      
      console.log('تم حذف الدورة بنجاح');
    } catch (error) {
      console.error('خطأ في حذف الدورة:', error);
      throw new Error('فشل في حذف الدورة. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * الحصول على دورة بواسطة المعرف
   */
  static async getCourseById(courseId: string): Promise<Course | null> {
    try {
      const courseRef = doc(db, this.coursesCollection, courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        return {
          id: courseDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Course;
      }
      
      return null;
    } catch (error) {
      console.error('خطأ في الحصول على الدورة:', error);
      throw new Error('فشل في تحميل بيانات الدورة.');
    }
  }

  /**
   * الحصول على دورات المدرس
   */
  static async getInstructorCourses(instructorId: string): Promise<Course[]> {
    try {
      const q = query(
        collection(db, this.coursesCollection),
        where('instructorId', '==', instructorId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Course);
      });
      
      return courses;
    } catch (error) {
      console.error('خطأ في الحصول على دورات المدرس:', error);
      throw new Error('فشل في تحميل الدورات.');
    }
  }

  // إحضار دورات المدرس المنشورة فقط (لدعم القراءة العامة بدون تسجيل)
  static async getInstructorPublishedCourses(instructorId: string, limitCount?: number): Promise<Course[]> {
    try {
      let q = query(
        collection(db, this.coursesCollection),
        where('instructorId', '==', instructorId),
        where('status', '==', 'published'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Course);
      });

      return courses;
    } catch (error) {
      console.error('خطأ في الحصول على دورات المدرس المنشورة:', error);
      throw new Error('فشل في تحميل الدورات.');
    }
  }

  /**
   * الحصول على جميع الدورات المنشورة
   */
  static async getPublishedCourses(limitCount?: number): Promise<Course[]> {
    try {
      let q = query(
        collection(db, this.coursesCollection),
        where('status', '==', 'published'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        courses.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Course);
      });
      
      return courses;
    } catch (error) {
      console.error('خطأ في الحصول على الدورات المنشورة:', error);
      throw new Error('فشل في تحميل الدورات.');
    }
  }

  /**
   * نشر دورة
   */
  static async publishCourse(courseId: string): Promise<void> {
    try {
      const courseRef = doc(db, this.coursesCollection, courseId);
      await updateDoc(courseRef, {
        status: 'published',
        isActive: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('تم نشر الدورة بنجاح');
    } catch (error) {
      console.error('خطأ في نشر الدورة:', error);
      throw new Error('فشل في نشر الدورة.');
    }
  }

  /**
   * إضافة درس جديد إلى الكورس
   */
  static async addLessonToCourse(courseId: string, lessonData: {
    title: string;
    description: string;
    videoUrl?: string;
    order?: number;
  }): Promise<string> {
    try {
      // الحصول على الكورس الحالي
      const courseRef = doc(db, this.coursesCollection, courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        throw new Error('الكورس غير موجود');
      }

      const courseData = courseDoc.data();
      const currentLessons = courseData.lessons || [];
      
      // إنشاء الدرس الجديد
      const newLesson = {
        id: `lesson-${Date.now()}`,
        title: lessonData.title,
        description: lessonData.description,
        type: 'video',
        videoUrl: lessonData.videoUrl || '',
        order: lessonData.order || currentLessons.length + 1,
        duration: 0, // يمكن تحديثه لاحقاً
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // إضافة الدرس إلى قائمة الدروس
      const updatedLessons = [...currentLessons, newLesson];

      // تحديث الكورس بالدرس الجديد
      await updateDoc(courseRef, {
        lessons: updatedLessons,
        totalLessons: updatedLessons.length,
        updatedAt: serverTimestamp()
      });

      // إرسال إشعار للطلاب الملتحقين بهذه الدورة عن الدرس الجديد
      try {
        const teacherId = courseData.instructorId || courseData.teacherId || '';
        const teacherName = courseData.instructorName || courseData.teacherName || '';
        await NotificationService.createLessonNotificationsForCourseStudents(
          courseId,
          courseData.title,
          newLesson.title,
          teacherId,
          teacherName
        );
      } catch (notifyError) {
        console.error('Error sending lesson notifications:', notifyError);
      }

      console.log('تم إضافة الدرس بنجاح:', newLesson.id);
      return newLesson.id;
    } catch (error) {
      console.error('خطأ في إضافة الدرس:', error);
      throw new Error('فشل في إضافة الدرس. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * تحويل ملف إلى base64
   */
  private static convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('فشل في قراءة الملف'));
        }
      };
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * البحث في الدورات
   */
  static async searchCourses(searchTerm: string, category?: string): Promise<Course[]> {
    try {
      let q = query(
        collection(db, this.coursesCollection),
        where('status', '==', 'published'),
        where('isActive', '==', true)
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const course = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate()
        } as Course;
        
        // فلترة النتائج بناءً على النص المدخل
        if (
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.instructorName.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          courses.push(course);
        }
      });
      
      return courses;
    } catch (error) {
      console.error('خطأ في البحث عن الدورات:', error);
      throw new Error('فشل في البحث عن الدورات.');
    }
  }

  /**
   * حذف درس من الكورس بواسطة معرف الدرس
   */
  static async deleteLessonFromCourse(courseId: string, lessonId: string): Promise<void> {
    try {
      const courseRef = doc(db, this.coursesCollection, courseId);
      const courseDoc = await getDoc(courseRef);
      if (!courseDoc.exists()) {
        throw new Error('الكورس غير موجود');
      }
      const courseData = courseDoc.data();
      const currentLessons: any[] = courseData.lessons || [];
      const updatedLessons = currentLessons.filter((l) => String(l.id) !== String(lessonId));
      await updateDoc(courseRef, {
        lessons: updatedLessons,
        totalLessons: updatedLessons.length,
        updatedAt: serverTimestamp()
      });
      console.log(`تم حذف الدرس ${lessonId} من الكورس ${courseId}`);
    } catch (error) {
      console.error('خطأ في حذف الدرس:', error);
      throw new Error('فشل في حذف الدرس. يرجى المحاولة مرة أخرى.');
    }
  }
}