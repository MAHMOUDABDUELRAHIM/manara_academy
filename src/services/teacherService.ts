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
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';

// Helper: remove undefined deeply from objects/arrays (Firestore forbids undefined)
function stripUndefinedDeep(obj: any): any {
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const mapped = obj.map((v) => stripUndefinedDeep(v));
    return mapped.filter((v) => v !== undefined);
  }
  if (obj && typeof obj === 'object') {
    const out: any = {};
    Object.keys(obj).forEach((k) => {
      const v = (obj as any)[k];
      if (v !== undefined) {
        const cleaned = stripUndefinedDeep(v);
        if (cleaned !== undefined) out[k] = cleaned;
      }
    });
    return out;
  }
  return obj;
}

export interface TeacherProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  subjectSpecialization?: string;
  bio?: string;
  photoURL?: string;
  // شعار العلامة الخاص بالمعلم بصيغة Base64 لعرضه علنًا
  brandLogoBase64?: string;
  // اسم المنصة/العلامة للمعلم
  platformName?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  studentsCount: number;
  coursesCount: number;
  paymentNumber?: string;
}

export interface StudentTeacherLink {
  id: string;
  studentId: string;
  teacherId: string;
  linkedAt: string;
  isActive: boolean;
}

export class TeacherService {
  // إنشاء ملف تعريف المدرس
  static async createTeacherProfile(
    uid: string, 
    fullName: string, 
    email: string, 
    subjectSpecialization?: string,
    phoneNumber?: string
  ): Promise<TeacherProfile> {
    try {
      const teacherProfile: Omit<TeacherProfile, 'id'> = {
        uid,
        fullName,
        email,
        phoneNumber: (phoneNumber || '').toString().trim(),
        // Firestore لا يقبل undefined؛ نضمن قيمة سلسلة بدلًا من undefined
        subjectSpecialization: subjectSpecialization || '',
        photoURL: '',
        bio: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        studentsCount: 0,
        coursesCount: 0
      };

      // استخدام setDoc مع uid كمعرف المستند لضمان التطابق مع قواعد الأمان
      const teacherRef = doc(db, 'teachers', uid);
      // إزالة أي undefined عميق قبل الحفظ
      await setDoc(teacherRef, stripUndefinedDeep(teacherProfile));
      
      return {
        id: uid,
        ...teacherProfile
      };
    } catch (error) {
      console.error('Error creating teacher profile:', error);
      throw error;
    }
  }

  // الحصول على ملف تعريف المدرس بواسطة UID
  static async getTeacherByUid(uid: string): Promise<TeacherProfile | null> {
    try {
      const teacherRef = doc(db, 'teachers', uid);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        const data = teacherSnap.data() as any;
        // دعم حسابات المساعدين: إذا كان المستند يحتوي على proxyOf
        // نعيد بيانات المدرس الرئيسي المرتبط بالمساعد
        if (data && typeof data.proxyOf === 'string' && data.proxyOf.length > 0) {
          const mainRef = doc(db, 'teachers', data.proxyOf);
          const mainSnap = await getDoc(mainRef);
          if (mainSnap.exists()) {
            const mainData = mainSnap.data();
            return {
              id: data.proxyOf,
              ...(mainData as any)
            } as TeacherProfile;
          }
        }
        return {
          id: teacherSnap.id,
          ...data
        } as TeacherProfile;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting teacher by UID:', error);
      throw error;
    }
  }



  // الحصول على ملف تعريف المدرس بواسطة ID
  static async getTeacherProfile(teacherId: string): Promise<TeacherProfile | null> {
    try {
      const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
      
      if (!teacherDoc.exists()) {
        return null;
      }

      return {
        id: teacherDoc.id,
        ...teacherDoc.data()
      } as TeacherProfile;
    } catch (error) {
      console.error('Error getting teacher profile:', error);
      throw error;
    }
  }

  // ربط الطالب بالمدرس باستخدام معرف المدرس
  static async linkStudentToTeacher(
    studentId: string, 
    teacherId: string
  ): Promise<StudentTeacherLink | null> {
    try {
      console.log('Starting linkStudentToTeacher process:', { studentId, teacherId });
      
      // 1️⃣ الحصول على بيانات المدرس
      const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));

      if (!teacherDoc.exists()) {
        console.error('No teacher found with ID:', teacherId);
        throw new Error("لم يتم العثور على المدرس.");
      }

      // 2️⃣ نجيب بيانات المدرس
      const teacherData = teacherDoc.data();
      console.log('Found teacher:', { teacherId, teacherName: teacherData.fullName });

      // التحقق من مستند الطالب الحالي أو إنشاؤه إذا لم يكن موجوداً
      let studentDoc = await getDoc(doc(db, 'students', studentId));
      let studentData;
      
      if (!studentDoc.exists()) {
        console.log('Student document not found, creating new student document:', studentId);
        
        // الحصول على بيانات المستخدم من Firebase Auth
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser || currentUser.uid !== studentId) {
          console.error('No authenticated user found or UID mismatch:', studentId);
          throw new Error('الطالب غير موجود أو غير مصادق عليه');
        }
        
        // إنشاء مستند الطالب الجديد
        const newStudentData = {
          uid: studentId,
          fullName: currentUser.displayName || 'طالب جديد',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          isActive: true,
          enrolledCourses: [],
        };
        
        await setDoc(doc(db, 'students', studentId), newStudentData);
        console.log('Created new student document:', { studentId, studentName: newStudentData.fullName });
        
        studentData = newStudentData;
      } else {
        studentData = studentDoc.data();
        console.log('Found existing student:', { studentId, studentName: studentData.fullName });
      }
      
      // منع تغيير الربط إذا كان الطالب مرتبطاً بمدرس آخر مسبقاً
      if (studentData.teacherId && studentData.teacherId !== teacherId) {
        console.warn('Student already linked to another teacher. Blocking re-link.', {
          studentId,
          currentTeacherId: studentData.teacherId,
          requestedTeacherId: teacherId
        });
        // استخدم رسالة خطأ واضحة يمكن التعامل معها في الواجهة
        throw new Error(`STUDENT_ALREADY_LINKED:${studentData.teacherId}`);
      }

      // تحقق احتياطي من الروابط القديمة في studentTeacherLinks لمنع ازدواجية الربط عبر النظام القديم
      if (!studentData.teacherId) {
        const existingLinksQ = query(
          collection(db, 'studentTeacherLinks'),
          where('studentId', '==', studentId),
          where('isActive', '==', true)
        );
        const existingLinksSnap = await getDocs(existingLinksQ);
        if (!existingLinksSnap.empty) {
          const linkData = existingLinksSnap.docs[0].data() as any;
          const existingTeacherId = linkData.teacherId;
          if (existingTeacherId && existingTeacherId !== teacherId) {
            console.warn('Student has active legacy link to different teacher. Blocking re-link.', {
              studentId,
              existingTeacherId,
              requestedTeacherId: teacherId
            });
            throw new Error(`STUDENT_ALREADY_LINKED:${existingTeacherId}`);
          }
        }
      }

      // التحقق من عدم وجود ربط سابق
      if (studentData.teacherId && studentData.teacherId === teacherId) {
        console.log('Student already linked to this teacher');
        // إرجاع الربط الموجود
        return {
          id: `${studentId}_${teacherId}`,
          studentId,
          teacherId: teacherId,
          linkedAt: studentData.linkedAt || new Date().toISOString(),
          isActive: true
        };
      }

      // 3️⃣ تحديث مستند الطالب بإضافة teacherId
      await updateDoc(doc(db, 'students', studentId), {
        teacherId: teacherId,
        linkedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('Updated student document with teacherId');

      // التحقق من عدم وجود ربط مسبق في studentTeacherLinks
      const linksRef = collection(db, "studentTeacherLinks");
      const checkQ = query(linksRef, where("studentId", "==", studentId), where("teacherId", "==", teacherId));
      const existing = await getDocs(checkQ);
      
      if (!existing.empty) {
        console.log('Link already exists in studentTeacherLinks collection');
        return {
          id: existing.docs[0].id,
          ...existing.docs[0].data()
        } as StudentTeacherLink;
      }

      // إنشاء الربط الجديد في المجموعة المنفصلة أيضاً للتوافق مع النظام الحالي
      const link: Omit<StudentTeacherLink, 'id'> = {
        studentId,
        teacherId: teacherId,
        linkedAt: new Date().toISOString(),
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'studentTeacherLinks'), link);
      console.log('Created new studentTeacherLink:', docRef.id);

      // 4️⃣ تسجيل الطالب تلقائياً في جميع دورات المدرس الموجودة
      try {
        console.log('Starting retroactive enrollment for existing courses...');
        const { CourseService } = await import('./courseService');
        const { StudentService } = await import('./studentService');
        const { NotificationService } = await import('./notificationService');
        
        // جلب جميع دورات المدرس
        const teacherCourses = await CourseService.getInstructorCourses(teacherId);
        console.log(`Found ${teacherCourses.length} existing courses for teacher`);
        
        // تسجيل الطالب في الدورات المجانية فقط
        for (const course of teacherCourses) {
          try {
            const price = Number((course as any)?.price ?? 0);
            const isFree = !isNaN(price) && price === 0;

            if (!isFree) {
              // الدورة مدفوعة: عدم التسجيل التلقائي، يمكن إرسال إشعار توفّر الدورة
              try {
                await NotificationService.createNotification({
                  userId: studentId,
                  type: 'course_available',
                  title: 'دورة جديدة متاحة',
                  message: `تم إضافة دورة مدفوعة "${course.title}". اضغط لعرض التفاصيل والاشتراك.`,
                  data: {
                    courseId: course.id,
                    courseName: course.title,
                    teacherName: teacherData.fullName
                  }
                });
              } catch {}
              continue;
            }

            await StudentService.enrollInCourse(studentId, course.id);
            console.log(`Enrolled student in free course: ${course.title}`);
            
            // إرسال إشعار للطالب عن التسجيل في الدورة المجانية
            await NotificationService.createNotification({
              userId: studentId,
              type: 'course_enrollment',
              title: 'تم تسجيلك في دورة مجانية',
              message: `تم تسجيلك تلقائياً في دورة "${course.title}"`,
              data: {
                courseId: course.id,
                courseName: course.title,
                teacherName: teacherData.fullName
              }
            });
          } catch (enrollError) {
            console.error(`Error enrolling student in course ${course.id}:`, enrollError);
            // لا نوقف العملية إذا فشل التسجيل في دورة واحدة
          }
        }
        
        console.log('Retroactive enrollment completed');
      } catch (retroError) {
        console.error('Error in retroactive enrollment:', retroError);
        // لا نوقف العملية الأساسية إذا فشل التسجيل التلقائي
      }

      return {
        id: docRef.id,
        ...link
      };

    } catch (error) {
      console.error('Error in linkStudentToTeacher:', error);
      throw error;
    }
  }

  // الحصول على ربط الطالب بالمدرس
  static async getStudentTeacherLink(
    studentId: string, 
    teacherId: string
  ): Promise<StudentTeacherLink | null> {
    try {
      const q = query(
        collection(db, 'studentTeacherLinks'), 
        where('studentId', '==', studentId),
        where('teacherId', '==', teacherId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as StudentTeacherLink;
    } catch (error) {
      console.error('Error getting student teacher link:', error);
      throw error;
    }
  }

  // الحصول على المدرس المرتبط بالطالب
  static async getTeacherForStudent(studentId: string): Promise<TeacherProfile | null> {
    try {
      // أولاً، البحث في مستند الطالب عن teacherId
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        if (studentData.teacherId) {
          // الحصول على بيانات المدرس مباشرة
          const teacherDoc = await getDoc(doc(db, 'teachers', studentData.teacherId));
          if (teacherDoc.exists()) {
            return {
              id: teacherDoc.id,
              ...teacherDoc.data()
            } as TeacherProfile;
          }
        }
      }

      // إذا لم يوجد teacherId في مستند الطالب، البحث في المجموعة المنفصلة (للتوافق مع النظام القديم)
      const q = query(
        collection(db, 'studentTeacherLinks'), 
        where('studentId', '==', studentId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const linkDoc = querySnapshot.docs[0];
      const link = linkDoc.data() as StudentTeacherLink;
      
      // الحصول على بيانات المدرس
      const teacherDoc = await getDoc(doc(db, 'teachers', link.teacherId));
      if (!teacherDoc.exists()) {
        return null;
      }

      return {
        id: teacherDoc.id,
        ...teacherDoc.data()
      } as TeacherProfile;
    } catch (error) {
      console.error('Error getting teacher for student:', error);
      throw error;
    }
  }

  // الحصول على قائمة الطلاب المرتبطين بالمدرس
  static async getStudentsForTeacher(teacherId: string): Promise<StudentTeacherLink[]> {
    try {
      const q = query(
        collection(db, 'studentTeacherLinks'), 
        where('teacherId', '==', teacherId),
        where('isActive', '==', true),
        orderBy('linkedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudentTeacherLink));
    } catch (error) {
      console.error('Error getting students for teacher:', error);
      throw error;
    }
  }

  // الحصول على قائمة الروابط للطالب (مع أي مدرس)
  static async getStudentLinks(studentId: string): Promise<StudentTeacherLink[]> {
    try {
      const q = query(
        collection(db, 'studentTeacherLinks'), 
        where('studentId', '==', studentId),
        where('isActive', '==', true),
        orderBy('linkedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudentTeacherLink));
    } catch (error) {
      console.error('Error getting student links:', error);
      throw error;
    }
  }

  // تحديث عدد الطلاب للمدرس
  static async updateTeacherStudentsCount(teacherId: string): Promise<void> {
    try {
      const students = await this.getStudentsForTeacher(teacherId);
      const teacherRef = doc(db, 'teachers', teacherId);
      
      await updateDoc(teacherRef, {
        studentsCount: students.length,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating teacher students count:', error);
      throw error;
    }
  }

  // تحديث ملف تعريف المدرس
  static async updateTeacherProfile(
    teacherId: string, 
    updates: Partial<TeacherProfile>
  ): Promise<void> {
    try {
      const teacherRef = doc(db, 'teachers', teacherId);
      await updateDoc(teacherRef, stripUndefinedDeep({
        ...updates,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw error;
    }
  }

}