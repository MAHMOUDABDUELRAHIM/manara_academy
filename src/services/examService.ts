import { 
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { CourseService } from './courseService';
import { StudentService } from './studentService';

export type ExamQuestionType = 'mcq' | 'fill' | 'drag' | 'essay';

export interface ExamChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  text: string;
  options?: ExamChoice[];
  answer?: string;
  items?: { id: string; text: string }[];
  points?: number;
  correctOrder?: string[];
}

export interface ExamSettings {
  secureMode: boolean;
  timeLimitMinutes: number | null;
  oneWay: boolean;
  scheduleEnabled: boolean;
  scheduledAt?: Timestamp | null;
  windowEndAt?: Timestamp | null;
  reopenOnly?: boolean; // show only to students with no submitted attempt
  manualGradingEnabled?: boolean; // when true, results are withheld until graded by teacher
}

export interface ExamDoc {
  id?: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  instructorId: string;
  questions: ExamQuestion[];
  settings: ExamSettings;
  createdAt: Timestamp | Date;
  scheduledAt?: Timestamp | Date | null;
  isActive?: boolean;
  // runtime control for teacher
  timerFrozen?: boolean;
  frozenSince?: Timestamp | Date | null;
}

export class ExamService {
  static collectionName = 'exams';

  /**
   * Create a new exam document
   */
  static async createExam(params: {
    title: string;
    courseId: string;
    instructorId: string;
    questions: ExamQuestion[];
    settings: Omit<ExamSettings, 'scheduledAt' | 'windowEndAt'> & { scheduledAt?: string | null; windowEndAt?: string | null };
  }): Promise<string> {
    const { title, courseId, instructorId, questions, settings } = params;

    if (!title || !courseId || !instructorId) {
      throw new Error('Missing required fields for exam creation');
    }

    // Resolve course title for convenient display
    let courseTitle: string | undefined;
    try {
      const course = await CourseService.getCourseById(courseId);
      courseTitle = course?.title || course?.titleAr || undefined;
    } catch {
      // optional
    }

    // Convert scheduledAt/windowEndAt strings to Timestamp if provided
    let scheduledAtTs: Timestamp | null = null;
    if (settings.scheduleEnabled && settings.scheduledAt) {
      try {
        const date = new Date(settings.scheduledAt);
        if (!isNaN(date.getTime())) {
          scheduledAtTs = Timestamp.fromDate(date);
        }
      } catch {}
    }
    let windowEndAtTs: Timestamp | null = null;
    if (settings.scheduleEnabled && settings.windowEndAt) {
      try {
        const dateEnd = new Date(settings.windowEndAt);
        if (!isNaN(dateEnd.getTime())) {
          windowEndAtTs = Timestamp.fromDate(dateEnd);
        }
      } catch {}
    }

    const payload: Omit<ExamDoc, 'id'> = {
      title,
      courseId,
      courseTitle,
      instructorId,
      questions,
      settings: {
        secureMode: settings.secureMode,
        timeLimitMinutes: settings.timeLimitMinutes ?? null,
        oneWay: settings.oneWay,
        scheduleEnabled: settings.scheduleEnabled,
        scheduledAt: scheduledAtTs ?? null,
        windowEndAt: windowEndAtTs ?? null,
        reopenOnly: false,
        manualGradingEnabled: !!settings.manualGradingEnabled,
      },
      createdAt: serverTimestamp(),
      scheduledAt: scheduledAtTs ?? null,
      isActive: true,
    };

    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  /**
   * Get exam by ID
   */
  static async getExamById(examId: string): Promise<ExamDoc | null> {
    const snap = await getDoc(doc(db, this.collectionName, examId));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt || null,
      settings: {
        ...data.settings,
        scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
        windowEndAt: data.settings?.windowEndAt?.toDate?.() || data.settings?.windowEndAt || null,
      },
    } as ExamDoc;
  }

  /**
   * Get visible exams for a course (filters by schedule if present)
   */
  static async getVisibleExamsForCourse(courseId: string): Promise<ExamDoc[]> {
    const q = query(
      collection(db, this.collectionName),
      where('courseId', '==', courseId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const now = new Date();
    const exams: ExamDoc[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const scheduled = data.scheduledAt?.toDate?.() || data.scheduledAt || null;
      const scheduleEnabled = !!data.settings?.scheduleEnabled;
      // Must be scheduled and schedule enabled
      if (!scheduleEnabled || !scheduled) {
        return;
      }
      // Only visible when scheduled time has arrived
      if (scheduled > now) {
        return;
      }
      exams.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        scheduledAt: scheduled,
        settings: {
          ...data.settings,
          scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
          windowEndAt: data.settings?.windowEndAt?.toDate?.() || data.settings?.windowEndAt || null,
        },
      } as ExamDoc);
    });
    return exams;
  }

  /**
   * Get scheduled exams for a course (upcoming and visible)
   */
  static async getScheduledExamsForCourse(courseId: string): Promise<ExamDoc[]> {
    const q = query(
      collection(db, this.collectionName),
      where('courseId', '==', courseId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const exams: ExamDoc[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const scheduled = data.scheduledAt?.toDate?.() || data.scheduledAt || null;
      const scheduleEnabled = !!data.settings?.scheduleEnabled;
      if (!scheduleEnabled || !scheduled) {
        return;
      }
      exams.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        scheduledAt: scheduled,
        settings: {
          ...data.settings,
          scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
          windowEndAt: data.settings?.windowEndAt?.toDate?.() || data.settings?.windowEndAt || null,
        },
      } as ExamDoc);
    });
    return exams;
  }

  /**
   * Get scheduled exams for an instructor (upcoming + visible)
   */
  static async getScheduledExamsForInstructor(instructorId: string): Promise<ExamDoc[]> {
    const q = query(
      collection(db, this.collectionName),
      where('instructorId', '==', instructorId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const exams: ExamDoc[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const scheduled = data.scheduledAt?.toDate?.() || data.scheduledAt || null;
      const scheduleEnabled = !!data.settings?.scheduleEnabled;
      if (!scheduleEnabled || !scheduled) {
        return;
      }
      exams.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        scheduledAt: scheduled,
        settings: {
          ...data.settings,
          scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
          windowEndAt: data.settings?.windowEndAt?.toDate?.() || data.settings?.windowEndAt || null,
        },
      } as ExamDoc);
    });
    return exams;
  }

  /**
   * Get scheduled exams for a student across enrolled courses (upcoming + visible)
   */
  static async getScheduledExamsForStudent(studentId: string): Promise<ExamDoc[]> {
    const enrolledCourseIds = await StudentService.getEnrolledCourses(studentId);
    const results: ExamDoc[] = [];
    for (const cid of enrolledCourseIds) {
      try {
        const courseExams = await this.getScheduledExamsForCourse(cid);
        results.push(...courseExams);
      } catch (e) {
        console.warn('Failed to fetch scheduled exams for course', cid, e);
      }
    }
    return results;
  }

  // Update exam schedule and time limit
  static async updateExamSchedule(examId: string, updates: {
    scheduleEnabled?: boolean;
    scheduledAt?: string | null;
    timeLimitMinutes?: number | null;
    windowEndAt?: string | null;
  }): Promise<void> {
    const payload: any = {};
    if (typeof updates.scheduleEnabled === 'boolean') {
      payload['settings.scheduleEnabled'] = updates.scheduleEnabled;
    }
    if (updates.scheduledAt !== undefined) {
      let scheduledAtTs: Timestamp | null = null;
      if (updates.scheduledAt) {
        const d = new Date(updates.scheduledAt);
        if (!isNaN(d.getTime())) scheduledAtTs = Timestamp.fromDate(d);
      }
      payload['scheduledAt'] = scheduledAtTs;
      payload['settings.scheduledAt'] = scheduledAtTs;
    }
    if (updates.windowEndAt !== undefined) {
      let windowEndAtTs: Timestamp | null = null;
      if (updates.windowEndAt) {
        const d2 = new Date(updates.windowEndAt);
        if (!isNaN(d2.getTime())) windowEndAtTs = Timestamp.fromDate(d2);
      }
      payload['settings.windowEndAt'] = windowEndAtTs;
    }
    if (updates.timeLimitMinutes !== undefined) {
      payload['settings.timeLimitMinutes'] = updates.timeLimitMinutes ?? null;
    }
    await updateDoc(doc(db, this.collectionName, examId), payload);
  }

  // Freeze or unfreeze exam timer (runtime control)
  static async setExamTimerFreeze(examId: string, freeze: boolean): Promise<void> {
    const payload: any = {
      timerFrozen: freeze,
    };
    if (freeze) {
      payload['frozenSince'] = serverTimestamp();
    } else {
      payload['frozenSince'] = null;
    }
    await updateDoc(doc(db, this.collectionName, examId), payload);
  }

  // Permanently delete exam document
  static async deleteExam(examId: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, examId));
  }

  static async reopenForUnattempted(examId: string, options: { scheduledAt: string; timeLimitMinutes?: number | null }): Promise<void> {
    const { scheduledAt, timeLimitMinutes } = options;
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) throw new Error('Invalid scheduledAt');
    const scheduledAtTs = Timestamp.fromDate(d);
    const payload: any = {
      'settings.scheduleEnabled': true,
      'settings.scheduledAt': scheduledAtTs,
      'scheduledAt': scheduledAtTs,
      'settings.reopenOnly': true,
    };
    if (timeLimitMinutes !== undefined) {
      payload['settings.timeLimitMinutes'] = timeLimitMinutes ?? null;
    }
    await updateDoc(doc(db, this.collectionName, examId), payload);
  }
}