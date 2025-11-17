import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'course_added' | 'course_enrollment' | string;
  isRead: boolean;
  readAt?: string;
  createdAt: string | Timestamp;
  courseId?: string;
  teacherId?: string;
  expiresAt?: string | Timestamp;
  audience?: 'teachers_all' | 'all_users';
  linkText?: string;
  linkUrl?: string;
  origin?: 'admin' | 'system' | 'auto';
}

export class NotificationService {
  
  /**
   * إنشاء إشعار جديد
   */
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    try {
      const base = {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
      } as any;
      const newNotification = Object.fromEntries(
        Object.entries(base).filter(([, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'notifications'), newNotification);
      console.log('Notification created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * إنشاء إشعار كورس جديد لطالب واحد
   */
  static async createCourseNotification(
    studentId: string, 
    teacherId: string, 
    courseId: string, 
    courseTitle: string,
    teacherName: string
  ): Promise<string> {
    return await this.createNotification({
      userId: studentId,
      title: 'كورس جديد متاح!',
      message: `أضاف ${teacherName} كورساً جديداً: "${courseTitle}". اطلع عليه الآن!`,
      type: 'course_added',
      courseId,
      teacherId
    });
  }

  /**
   * إنشاء إشعارات كورس جديد لجميع طلاب المدرس
   */
  static async createCourseNotificationsForAllStudents(
    teacherId: string, 
    courseId: string, 
    courseTitle: string,
    teacherName: string
  ): Promise<string[]> {
    try {
      // جلب جميع الطلاب المرتبطين بالمدرس
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacherId', '==', teacherId),
        where('isActive', '==', true)
      );

      const studentsSnapshot = await getDocs(studentsQuery);
      const notificationIds: string[] = [];

      // إنشاء إشعار لكل طالب
      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;
        try {
          const notificationId = await this.createCourseNotification(
            studentId, 
            teacherId, 
            courseId, 
            courseTitle,
            teacherName
          );
          notificationIds.push(notificationId);
        } catch (error) {
          console.error(`Error creating notification for student ${studentId}:`, error);
        }
      }

      console.log(`Created ${notificationIds.length} notifications for course: ${courseTitle}`);
      return notificationIds;
    } catch (error) {
      console.error('Error creating course notifications for all students:', error);
      throw error;
    }
  }

  /**
   * جلب إشعارات المستخدم
   */
  static async getUserNotifications(userId: string, limitCount: number = 20): Promise<Notification[]> {
    try {
      // استخدام استعلام بسيط بدون orderBy لتجنب الحاجة إلى فهرس مركب
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // تحويل Timestamp إلى string إذا لزم الأمر
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      } as Notification));

      // ترتيب النتائج في الذاكرة بدلاً من قاعدة البيانات
      return notifications.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // ترتيب تنازلي (الأحدث أولاً)
      });
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * جلب الإشعارات غير المقروءة للمستخدم
   */
  static async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      // استخدام استعلام بسيط بدون orderBy لتجنب الحاجة إلى فهرس مركب
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      } as Notification));

      // ترتيب النتائج في الذاكرة
      return notifications.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // ترتيب تنازلي (الأحدث أولاً)
      });
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  /**
   * تحديد الإشعار كمقروء
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * تحديد جميع إشعارات المستخدم كمقروءة
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          isRead: true,
          readAt: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);
      console.log(`Marked ${updatePromises.length} notifications as read for user: ${userId}`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * عدد الإشعارات غير المقروءة
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const unreadNotifications = await this.getUnreadNotifications(userId);
      return unreadNotifications.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * إنشاء إشعارات عند إضافة درس جديد لجميع طلاب الدورة (الملتحقين بها)
   */
  static async createLessonNotificationsForCourseStudents(
    courseId: string,
    courseTitle: string,
    lessonTitle: string,
    teacherId: string,
    teacherName: string
  ): Promise<string[]> {
    try {
      // جلب جميع الطلاب الملتحقين بهذه الدورة فقط
      const studentsQuery = query(
        collection(db, 'students'),
        where('enrolledCourses', 'array-contains', courseId),
        where('isActive', '==', true)
      );

      const studentsSnapshot = await getDocs(studentsQuery);
      const notificationIds: string[] = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;
        try {
          const notificationId = await this.createNotification({
            userId: studentId,
            title: 'تم إضافة درس جديد',
            message: `أضاف ${teacherName} درسًا جديدًا "${lessonTitle}" في دورة "${courseTitle}".`,
            type: 'info',
            courseId,
            teacherId
          });
          notificationIds.push(notificationId);
        } catch (error) {
          console.error(`Error creating lesson notification for student ${studentId}:`, error);
        }
      }

      console.log(`Created ${notificationIds.length} lesson notifications for course: ${courseTitle}`);
      return notificationIds;
    } catch (error) {
      console.error('Error creating lesson notifications for course students:', error);
      throw error;
    }
  }
}