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
  setDoc,
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


export interface StudentProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  isActive: boolean;
  enrolledCourses: string[];
  teacherId?: string;
  linkedAt?: string;
  grade?: string;
  parentEmail?: string;
  parentPhone?: string;
  // add student phone number
  studentPhone?: string;
}

export class StudentService {
  // إنشاء ملف تعريف طالب جديد
  static async createStudentProfile(
    uidOrData: string | (Partial<StudentProfile> & { uid: string; fullName: string; email: string }),
    fullName?: string,
    email?: string,
    photoURL?: string,
    parentPhone?: string,
    studentPhone?: string
  ): Promise<StudentProfile> {
    try {
      let uid: string;
      let name: string;
      let mail: string;
      let photo: string | undefined = undefined;
      let pPhone: string | undefined = undefined;
      let sPhone: string | undefined = undefined;

      if (typeof uidOrData === 'string') {
        uid = uidOrData;
        name = fullName || '';
        mail = email || '';
        photo = photoURL || '';
        pPhone = parentPhone;
        sPhone = studentPhone;
      } else {
        uid = uidOrData.uid;
        name = uidOrData.fullName;
        mail = uidOrData.email;
        photo = uidOrData.photoURL || '';
        pPhone = uidOrData.parentPhone;
        sPhone = uidOrData.studentPhone;
      }

      const studentData: Omit<StudentProfile, 'id'> = {
        uid,
        fullName: name,
        email: mail,
        photoURL: photo || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
        enrolledCourses: [],
        parentPhone: pPhone,
        studentPhone: sPhone,
      };

      // استخدام setDoc مع uid كمعرف المستند لضمان التطابق مع قواعد الأمان
      const studentRef = doc(db, 'students', uid);
      await setDoc(studentRef, studentData);

      return {
        id: uid,
        ...studentData,
      };
    } catch (error) {
      console.error('Error creating student profile:', error);
      throw error;
    }
  }

  // الحصول على ملف تعريف الطالب بواسطة UID
  static async getStudentByUid(uid: string): Promise<StudentProfile | null> {
    try {
      const studentRef = doc(db, 'students', uid);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        return {
          id: studentSnap.id,
          ...studentSnap.data()
        } as StudentProfile;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting student by UID:', error);
      throw error;
    }
  }

  // الحصول على ملف تعريف الطالب بواسطة ID
  static async getStudentById(studentId: string): Promise<StudentProfile | null> {
    try {
      const docRef = doc(db, 'students', studentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as StudentProfile;
    } catch (error) {
      console.error('Error getting student by ID:', error);
      throw error;
    }
  }

  // تحديث ملف تعريف الطالب
  static async updateStudentProfile(
    studentId: string, 
    updates: Partial<Omit<StudentProfile, 'id' | 'uid' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'students', studentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  }

  // ربط الطالب بالمدرس
  static async linkToTeacher(studentId: string, teacherId: string): Promise<void> {
    try {
      await this.updateStudentProfile(studentId, {
        teacherId,
        linkedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error linking student to teacher:', error);
      throw error;
    }
  }

  // إلغاء ربط الطالب بالمدرس
  static async unlinkFromTeacher(studentId: string): Promise<void> {
    try {
      await this.updateStudentProfile(studentId, {
        teacherId: undefined,
        linkedAt: undefined
      });
    } catch (error) {
      console.error('Error unlinking student from teacher:', error);
      throw error;
    }
  }

  // تحديث آخر نشاط للطالب
  static async updateLastActivity(studentId: string): Promise<void> {
    try {
      await this.updateStudentProfile(studentId, {
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating student last activity:', error);
      throw error;
    }
  }

  // الحصول على جميع الطلاب
  static async getAllStudents(): Promise<StudentProfile[]> {
    try {
      const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudentProfile));
    } catch (error) {
      console.error('Error getting all students:', error);
      throw error;
    }
  }

  // الحصول على الطلاب المرتبطين بمدرس معين
  static async getStudentsByTeacher(teacherId: string): Promise<StudentProfile[]> {
    try {
      // الاستعلام الأساسي: الطلاب الذين لديهم teacherId في وثيقة الطالب
      const baseQuery = query(
        collection(db, 'students'),
        where('teacherId', '==', teacherId),
        where('isActive', '==', true)
      );
      const baseSnapshot = await getDocs(baseQuery);

      // استخدام خريطة لتفادي التكرار بين المسارين
      const studentsMap = new Map<string, StudentProfile>();

      baseSnapshot.docs.forEach((docSnap) => {
        const student = { id: docSnap.id, ...docSnap.data() } as StudentProfile;
        studentsMap.set(docSnap.id, student);
      });

      // مسار احتياطي: روابط الطلاب-المدرس من المجموعة القديمة studentTeacherLinks
      const linksQuery = query(
        collection(db, 'studentTeacherLinks'),
        where('teacherId', '==', teacherId),
        where('isActive', '==', true)
      );
      const linksSnapshot = await getDocs(linksQuery);

      for (const linkDoc of linksSnapshot.docs) {
        const linkData = linkDoc.data() as any;
        const studentId = linkData.studentId;
        if (studentId && !studentsMap.has(studentId)) {
          const studentDoc = await getDoc(doc(db, 'students', studentId));
          if (studentDoc.exists()) {
            const student = { id: studentDoc.id, ...studentDoc.data() } as StudentProfile;
            studentsMap.set(studentDoc.id, student);
          }
        }
      }

      // ترتيب النتائج في الذاكرة حسب linkedAt ثم createdAt تنازلياً لتجنب الحاجة لمؤشرات مركبة
      const students = Array.from(studentsMap.values()).sort((a: any, b: any) => {
        const aDate = new Date(a.linkedAt || a.createdAt || 0);
        const bDate = new Date(b.linkedAt || b.createdAt || 0);
        return (bDate.getTime() || 0) - (aDate.getTime() || 0);
      });

      return students;
    } catch (error) {
      console.error('Error getting students by teacher:', error);
      throw error;
    }
  }

  // البحث في الطلاب
  static async searchStudents(searchTerm: string): Promise<StudentProfile[]> {
    try {
      const allStudents = await this.getAllStudents();
      
      return allStudents.filter(student => 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  }

  // حذف ملف تعريف الطالب
  static async deleteStudentProfile(studentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'students', studentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting student profile:', error);
      throw error;
    }
  }

  // تعطيل/تفعيل الطالب
  static async toggleStudentStatus(studentId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      await this.updateStudentProfile(studentId, {
        isActive: !student.isActive
      });
    } catch (error) {
      console.error('Error toggling student status:', error);
      throw error;
    }
  }

  // إضافة دورة للطالب
  static async enrollInCourse(studentId: string, courseId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const enrolledCourses = student.enrolledCourses || [];
      if (!enrolledCourses.includes(courseId)) {
        enrolledCourses.push(courseId);
        await this.updateStudentProfile(studentId, {
          enrolledCourses
        });
      }
    } catch (error) {
      console.error('Error enrolling student in course:', error);
      throw error;
    }
  }

  // إزالة دورة من الطالب
  static async unenrollFromCourse(studentId: string, courseId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const enrolledCourses = (student.enrolledCourses || []).filter(id => id !== courseId);
      await this.updateStudentProfile(studentId, {
        enrolledCourses
      });
    } catch (error) {
      console.error('Error unenrolling student from course:', error);
      throw error;
    }
  }

  // الحصول على الدورات المسجل بها الطالب
  static async getEnrolledCourses(studentId: string): Promise<string[]> {
    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        return [];
      }
      return student.enrolledCourses || [];
    } catch (error) {
      console.error('Error getting enrolled courses:', error);
      throw error;
    }
  }

  // الحصول على تقدم الطالب في دورة معينة
  static async getCourseProgress(studentId: string, courseId: string): Promise<{
    completedLessons: string[];
    completionPercentage: number;
    lastAccessedLesson?: string;
    totalTimeSpent?: number;
  } | null> {
    try {
      const progressRef = doc(db, 'studentProgress', `${studentId}_${courseId}`);
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        return progressSnap.data() as {
          completedLessons: string[];
          completionPercentage: number;
          lastAccessedLesson?: string;
          totalTimeSpent?: number;
        };
      } else {
        // إنشاء سجل تقدم جديد إذا لم يكن موجوداً
        const initialProgress = {
          studentId,
          courseId,
          completedLessons: [],
          completionPercentage: 0,
          lastAccessedLesson: '',
          totalTimeSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(progressRef, initialProgress);
        return {
          completedLessons: [],
          completionPercentage: 0,
          lastAccessedLesson: '',
          totalTimeSpent: 0
        };
      }
    } catch (error) {
      console.error('Error getting course progress:', error);
      throw error;
    }
  }

  // تسجيل إكمال درس
  static async markLessonCompleted(studentId: string, courseId: string, lessonId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'studentProgress', `${studentId}_${courseId}`);
      const progressSnap = await getDoc(progressRef);
      
      let currentProgress = {
        completedLessons: [] as string[],
        completionPercentage: 0,
        lastAccessedLesson: '',
        totalTimeSpent: 0
      };

      if (progressSnap.exists()) {
        currentProgress = progressSnap.data() as typeof currentProgress;
      }

      // إضافة الدرس للدروس المكتملة إذا لم يكن موجوداً
      if (!currentProgress.completedLessons.includes(lessonId)) {
        currentProgress.completedLessons.push(lessonId);
      }

      // تحديث آخر درس تم الوصول إليه
      currentProgress.lastAccessedLesson = lessonId;

      // حفظ التحديثات
      await setDoc(progressRef, {
        studentId,
        courseId,
        ...currentProgress,
        updatedAt: new Date().toISOString(),
        ...(progressSnap.exists() ? {} : { createdAt: new Date().toISOString() })
      });

    } catch (error) {
      console.error('Error marking lesson completed:', error);
      throw error;
    }
  }

  // تحديث نسبة الإكمال
  static async updateCompletionPercentage(studentId: string, courseId: string, totalLessons: number): Promise<void> {
    try {
      const progressRef = doc(db, 'studentProgress', `${studentId}_${courseId}`);
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        const currentProgress = progressSnap.data();
        const completedCount = currentProgress.completedLessons?.length || 0;
        const completionPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

        await updateDoc(progressRef, {
          completionPercentage,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating completion percentage:', error);
      throw error;
    }
  }

  // تحديث الوقت المقضي في الدورة
  static async updateTimeSpent(studentId: string, courseId: string, additionalTime: number): Promise<void> {
    try {
      const progressRef = doc(db, 'studentProgress', `${studentId}_${courseId}`);
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        const currentProgress = progressSnap.data();
        const newTotalTime = (currentProgress.totalTimeSpent || 0) + additionalTime;

        await updateDoc(progressRef, {
          totalTimeSpent: newTotalTime,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating time spent:', error);
      throw error;
    }
  }

  // إدارة محاولات الامتحان للطالب
  static async ensureExamAttemptStarted(studentId: string, examId: string, durationMinutes: number | null): Promise<{ startAt: Date }> {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      await setDoc(studentRef, {
        uid: studentId,
        enrolledCourses: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true } as any);
    }
    const data = snap.exists() ? (snap.data() as any) : {};
    const attempts = data.examAttempts || {};
    if (attempts[examId]?.startAt) {
      const ts = attempts[examId].startAt;
      const startAt = ts?.toDate?.() || (typeof ts === 'string' ? new Date(ts) : new Date());
      return { startAt };
    }
    await updateDoc(studentRef, {
      [`examAttempts.${examId}`]: {
        startAt: serverTimestamp(),
        durationMinutes: durationMinutes ?? null,
      },
      updatedAt: new Date().toISOString(),
    });
    const after = await getDoc(studentRef);
    const attempts2 = (after.data() as any).examAttempts || {};
    const ts2 = attempts2[examId]?.startAt;
    const startAt2 = ts2?.toDate?.() || (typeof ts2 === 'string' ? new Date(ts2) : new Date());
    return { startAt: startAt2 };
  }

  static async saveExamResult(
    studentId: string,
    examId: string,
    payload: { score: number; total: number; answers: any; status?: 'pending' | 'graded'; gradedBy?: string; feedback?: string; autoSubmitted?: boolean; examSnapshot?: any }
  ): Promise<void> {
    const studentRef = doc(db, 'students', studentId);
    const statusValue = payload.status ?? 'pending';
    const base: any = {
      score: payload.score,
      total: payload.total,
      answers: stripUndefinedDeep(payload.answers),
      status: statusValue,
    };
    if (payload.gradedBy) base.gradedBy = payload.gradedBy;
    if (payload.feedback) base.feedback = payload.feedback;
    if (typeof payload.autoSubmitted === 'boolean') base.autoSubmitted = payload.autoSubmitted;
    if (payload.examSnapshot) base.examSnapshot = stripUndefinedDeep(payload.examSnapshot);
    await updateDoc(studentRef, {
      [`examResults.${examId}`]: {
        ...base,
        submittedAt: serverTimestamp(),
        ...(statusValue === 'graded' ? { gradedAt: serverTimestamp() } : {}),
      },
      updatedAt: new Date().toISOString(),
    } as any);
  }

  static async updateExamGrade(
    studentId: string,
    examId: string,
    params: { score: number; gradedBy: string; feedback?: string }
  ): Promise<void> {
    const studentRef = doc(db, 'students', studentId);
    const updates: any = {
      [`examResults.${examId}.score`]: params.score,
      [`examResults.${examId}.status`]: 'graded',
      [`examResults.${examId}.gradedBy`]: params.gradedBy,
      [`examResults.${examId}.gradedAt`]: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };
    if (params.feedback) updates[`examResults.${examId}.feedback`] = params.feedback;
    await updateDoc(studentRef, updates);
  }

  static async getExamAttempt(studentId: string, examId: string): Promise<{ startAt?: Date; submittedAt?: Date } | null> {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    const att = data.examAttempts?.[examId];
    if (!att) return null;
    const sa = att.startAt;
    const startAt = sa?.toDate?.() || (typeof sa === 'string' ? new Date(sa) : undefined);
    const sub = data.examResults?.[examId]?.submittedAt;
    const submittedAt = sub?.toDate?.() || (typeof sub === 'string' ? new Date(sub) : undefined);
    return { startAt, submittedAt };
  }

  static async getExamResult(
    studentId: string,
    examId: string
  ): Promise<{ score: number; total: number; answers: any; status?: 'pending' | 'graded'; submittedAt?: Date; gradedAt?: Date; gradedBy?: string; feedback?: string; autoSubmitted?: boolean; examSnapshot?: any } | null> {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    const res = data.examResults?.[examId];
    if (!res) return null;
    const submittedAt = res.submittedAt?.toDate?.() || (typeof res.submittedAt === 'string' ? new Date(res.submittedAt) : undefined);
    const gradedAt = res.gradedAt?.toDate?.() || (typeof res.gradedAt === 'string' ? new Date(res.gradedAt) : undefined);
    return {
      score: res.score,
      total: res.total,
      answers: res.answers,
      status: res.status,
      submittedAt,
      gradedAt,
      gradedBy: res.gradedBy,
      feedback: res.feedback,
      autoSubmitted: res.autoSubmitted === true ? true : undefined,
      examSnapshot: res.examSnapshot,
    };
  }

  static async getAllExamResults(studentId: string): Promise<Array<{ examId: string; score: number; total: number; answers: any; status?: 'pending' | 'graded'; submittedAt?: Date; gradedAt?: Date; gradedBy?: string; feedback?: string; autoSubmitted?: boolean; examSnapshot?: any }>> {
    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return [];
    const data = snap.data() as any;
    const results = data.examResults || {};
    const list: Array<{ examId: string; score: number; total: number; answers: any; status?: 'pending' | 'graded'; submittedAt?: Date; gradedAt?: Date; gradedBy?: string; feedback?: string; autoSubmitted?: boolean; examSnapshot?: any }> = [];
    for (const [examId, res] of Object.entries(results)) {
      const r: any = res;
      const submittedAt = r.submittedAt?.toDate?.() || (typeof r.submittedAt === 'string' ? new Date(r.submittedAt) : undefined);
      const gradedAt = r.gradedAt?.toDate?.() || (typeof r.gradedAt === 'string' ? new Date(r.gradedAt) : undefined);
      list.push({
        examId,
        score: r.score,
        total: r.total,
        answers: r.answers,
        status: r.status,
        submittedAt,
        gradedAt,
        gradedBy: r.gradedBy,
        feedback: r.feedback,
        autoSubmitted: r.autoSubmitted === true ? true : undefined,
        examSnapshot: r.examSnapshot,
      });
    }
    return list;
  }
}