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
  limit,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { CourseService } from './courseService';
import { StudentService } from './studentService';

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

export interface AssignmentOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface AssignmentQuestion {
  id: string;
  // Optional question type for assignments; defaults to 'mcq' when omitted
  type?: 'mcq' | 'essay';
  text: string;
  options: AssignmentOption[];
  points: number;
  imageBase64?: string;
  imagePosition?: { x: number; y: number };
  imageWidth?: number; // px
}

export interface AssignmentDoc {
  id?: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  instructorId: string;
  questions: AssignmentQuestion[];
  isPublished: boolean;
  manualGradingEnabled?: boolean;
  availabilityDays?: number | null; // optional window length in days (for manual grading)
  windowEndAt?: Timestamp | Date | null; // absolute end time at 23:59:59 of the last day
  createdAt: Timestamp | Date;
}

export default class AssignmentService {
  static collectionName = 'assignments';

  static async createAssignment(params: {
    title: string;
    courseId: string;
    instructorId: string;
    questions: AssignmentQuestion[];
    manualGradingEnabled?: boolean;
    availabilityDays?: number | null;
  }): Promise<string> {
    const { title, courseId, instructorId, questions, manualGradingEnabled, availabilityDays } = params;
    if (!title || !courseId || !instructorId) throw new Error('Missing required fields for assignment creation');

    let courseTitle: string | undefined;
    try {
      const course = await CourseService.getCourseById(courseId);
      courseTitle = course?.title || course?.titleAr || undefined;
    } catch {}

    // Compute window end at publish time if availabilityDays is provided
    let windowEndAt: Date | null = null;
    try {
      if (manualGradingEnabled && typeof availabilityDays === 'number' && availabilityDays > 0) {
        const now = new Date();
        const end = new Date(now);
        end.setDate(now.getDate() + availabilityDays);
        // Set to end of day 23:59:59 local
        end.setHours(23, 59, 59, 999);
        windowEndAt = end;
      }
    } catch {}

    const payload: Omit<AssignmentDoc, 'id'> = {
      title,
      courseId,
      courseTitle: courseTitle ?? null,
      instructorId,
      questions: stripUndefinedDeep(questions) as AssignmentQuestion[],
      isPublished: true,
      manualGradingEnabled: manualGradingEnabled === true,
      availabilityDays: manualGradingEnabled ? (availabilityDays ?? null) : null,
      windowEndAt: manualGradingEnabled ? (windowEndAt || null) : null,
      createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, this.collectionName), payload);
    return ref.id;
  }

  static async getAssignmentById(assignmentId: string): Promise<AssignmentDoc | null> {
    const snap = await getDoc(doc(db, this.collectionName, assignmentId));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    } as AssignmentDoc;
  }

  static async getAssignmentsForCourse(courseId: string): Promise<AssignmentDoc[]> {
    const q = query(
      collection(db, this.collectionName),
      where('courseId', '==', courseId),
      where('isPublished', '==', true)
    );
    const snapshot = await getDocs(q);
    const assignments: AssignmentDoc[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      assignments.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      } as AssignmentDoc);
    });
    return assignments;
  }

  static async getPublishedAssignmentsForStudent(studentId: string): Promise<AssignmentDoc[]> {
    const enrolled = await StudentService.getEnrolledCourses(studentId);
    const results: AssignmentDoc[] = [];
    for (const cid of enrolled) {
      try {
        const asgs = await this.getAssignmentsForCourse(cid);
        results.push(...asgs);
      } catch (e) {
        console.warn('Failed to fetch assignments for course', cid, e);
      }
    }
    return results;
  }

  static async getAssignmentAttempt(studentId: string, assignmentId: string): Promise<{ createdAt?: Date } | null> {
    const q = query(
      collection(db, 'assignmentAttempts'),
      where('studentId', '==', studentId),
      where('assignmentId', '==', assignmentId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.docs.length === 0) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as any;
    return {
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };
  }

  static async getAssignmentAttemptsForStudent(studentId: string): Promise<Array<{
    attemptId?: string;
    assignmentId: string;
    courseId?: string;
    answers?: Record<string, string>;
    totalPoints?: number;
    earnedPoints?: number;
    total?: number; // legacy alias of totalQuestions
    correct?: number; // legacy alias of correctQuestions
    totalQuestions?: number;
    correctQuestions?: number;
    manualGrading?: boolean;
    feedback?: string;
    questionResults?: Record<string, any>;
    gradedAt?: Date;
    createdAt?: Date;
  }>> {
    const q = query(
      collection(db, 'assignmentAttempts'),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    const list: Array<{ attemptId?: string; assignmentId: string; courseId?: string; answers?: Record<string, string>; totalPoints?: number; earnedPoints?: number; total?: number; correct?: number; totalQuestions?: number; correctQuestions?: number; manualGrading?: boolean; feedback?: string; questionResults?: Record<string, any>; gradedAt?: Date; createdAt?: Date; }> = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      list.push({
        attemptId: docSnap.id,
        assignmentId: data.assignmentId,
        courseId: data.courseId,
        answers: data.answers,
        totalPoints: data.totalPoints,
        earnedPoints: data.earnedPoints,
        total: data.total ?? data.totalQuestions,
        correct: data.correct ?? data.correctQuestions,
        totalQuestions: data.totalQuestions,
        correctQuestions: data.correctQuestions,
        manualGrading: data.manualGrading === true,
        feedback: data.feedback,
        questionResults: data.questionResults,
        gradedAt: data.gradedAt?.toDate?.() || undefined,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });
    return list;
  }

  static listenAssignmentAttemptsForStudent(studentId: string, callback: (list: Array<{
    attemptId?: string;
    assignmentId: string;
    courseId?: string;
    answers?: Record<string, string>;
    totalPoints?: number;
    earnedPoints?: number;
    total?: number;
    correct?: number;
    totalQuestions?: number;
    correctQuestions?: number;
    manualGrading?: boolean;
    feedback?: string;
    questionResults?: Record<string, any>;
    gradedAt?: Date;
    createdAt?: Date;
  }>) => void): () => void {
    const qy = query(
      collection(db, 'assignmentAttempts'),
      where('studentId', '==', studentId)
    );
    const unsubscribe = onSnapshot(qy, (snapshot) => {
      const list: Array<{ attemptId?: string; assignmentId: string; courseId?: string; answers?: Record<string, string>; totalPoints?: number; earnedPoints?: number; total?: number; correct?: number; totalQuestions?: number; correctQuestions?: number; manualGrading?: boolean; feedback?: string; questionResults?: Record<string, any>; gradedAt?: Date; createdAt?: Date; }> = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        list.push({
          attemptId: docSnap.id,
          assignmentId: data.assignmentId,
          courseId: data.courseId,
          answers: data.answers,
          totalPoints: data.totalPoints,
          earnedPoints: data.earnedPoints,
          total: data.total ?? data.totalQuestions,
          correct: data.correct ?? data.correctQuestions,
          totalQuestions: data.totalQuestions,
          correctQuestions: data.correctQuestions,
          manualGrading: data.manualGrading === true,
          feedback: data.feedback,
          questionResults: data.questionResults,
          gradedAt: data.gradedAt?.toDate?.() || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      });
      callback(list);
    });
    return unsubscribe;
  }

  static gradeAssignment(assignment: AssignmentDoc, answers: Record<string, string>): { totalPoints: number; earnedPoints: number; totalQuestions: number; correctQuestions: number } {
    const totalQuestions = assignment.questions.length;
    const totalPoints = assignment.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    let correctQuestions = 0;
    let earnedPoints = 0;

    for (const q of assignment.questions) {
      // Skip essays in auto-grading; they require manual review
      if ((q as any).type === 'essay') continue;
      const chosen = answers[q.id];
      const correctOpt = (q.options || []).find(o => o.correct);
      if (chosen && correctOpt && chosen === correctOpt.id) {
        correctQuestions++;
        earnedPoints += q.points || 1;
      }
    }

    return { totalPoints, earnedPoints, totalQuestions, correctQuestions };
  }

  static async submitAssignmentAttempt(params: {
    assignmentId: string;
    studentId: string;
    courseId: string;
    answers: Record<string, string>;
  }): Promise<{ attemptId: string; totalPoints: number; earnedPoints: number; totalQuestions: number; correctQuestions: number }> {
    const assignment = await this.getAssignmentById(params.assignmentId);
    if (!assignment) throw new Error('Assignment not found');
    const { totalPoints, earnedPoints, totalQuestions, correctQuestions } = this.gradeAssignment(assignment, params.answers);
    const isManual = (assignment as any)?.manualGradingEnabled === true || (assignment as any)?.settings?.manualGradingEnabled === true;
    const payload = {
      assignmentId: params.assignmentId,
      studentId: params.studentId,
      courseId: params.courseId,
      instructorId: (assignment as any)?.instructorId,
      manualGrading: !!isManual,
      answers: params.answers,
      totalPoints,
      earnedPoints,
      totalQuestions,
      correctQuestions,
      // Keep legacy fields for backward compatibility
      total: totalQuestions,
      correct: correctQuestions,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'assignmentAttempts'), payload);
    return { attemptId: ref.id, totalPoints, earnedPoints, totalQuestions, correctQuestions };
  }

  /**
   * Publish manual grading for an assignment attempt.
   * Updates the attempt with per-question correctness, points, overall totals, feedback, and graded timestamp.
   */
  static async publishManualGrade(params: {
    attemptId: string;
    assignmentId: string;
    studentId: string;
    correctnessByQid: Record<string, boolean>;
    pointsByQid: Record<string, number>;
    feedback?: string;
  }): Promise<void> {
    const { attemptId, assignmentId, studentId, correctnessByQid, pointsByQid, feedback } = params;
    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    // Compute totals safely
    const totalPoints = (assignment.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);
    let earnedPoints = 0;
    let totalQuestions = (assignment.questions || []).length;
    let correctQuestions = 0;

    for (const q of (assignment.questions || [])) {
      const qid = q.id;
      const awarded = Number(pointsByQid?.[qid] ?? 0) || 0;
      const isCorrect = correctnessByQid?.[qid] === true;
      if (isCorrect) correctQuestions += 1;
      // Cap awarded points to question points
      const capped = Math.min(Math.max(0, awarded), q.points || 0);
      earnedPoints += capped;
    }

    const attemptRef = doc(db, 'assignmentAttempts', attemptId);
    // Fix linkage on older attempts to satisfy Firestore rules (only when missing)
    let fixFields: Record<string, any> = {};
    try {
      const snap = await getDoc(attemptRef);
      const data = (snap?.data?.() as any) || {};
      if (!data.assignmentId) {
        fixFields.assignmentId = assignmentId;
      }
      const instructorIdFromAttempt = data.instructorId;
      const instructorIdFromAssignment = (assignment as any)?.instructorId;
      if (!instructorIdFromAttempt && instructorIdFromAssignment) {
        fixFields.instructorId = instructorIdFromAssignment;
      }
    } catch {}
    await updateDoc(attemptRef, stripUndefinedDeep({
      // Ensure linkage and instructor identity for rules checks
      assignmentId,
      instructorId: (assignment as any)?.instructorId,
      ...fixFields,
      totalPoints,
      earnedPoints,
      totalQuestions,
      correctQuestions,
      // legacy aliases for UI compatibility
      total: totalQuestions,
      correct: correctQuestions,
      gradedAt: serverTimestamp(),
      feedback: feedback || null,
      questionResults: Object.fromEntries(Object.keys(correctnessByQid || {}).map((qid) => [qid, {
        isCorrect: !!correctnessByQid[qid],
        pointsAwarded: Number(pointsByQid?.[qid] ?? 0) || 0,
      }]))
    }));
  }

  static async getManualInboxForTeacher(teacherId: string): Promise<Array<{
    attemptId: string;
    assignmentId: string;
    assignmentTitle?: string;
    studentId: string;
    studentName?: string;
    courseId?: string;
    createdAt?: Date;
    gradedAt?: Date | null;
    answers?: Record<string, string>;
    totalPoints?: number;
    earnedPoints?: number;
    totalQuestions?: number;
    correctQuestions?: number;
    // enriched fields
    courseTitle?: string;
    submittedAt?: Date;
  }>> {
    const courses = await CourseService.getInstructorCourses(teacherId);
    const courseIds = courses.map(c => c.id);
    const courseTitleMap: Record<string, string> = {};
    courses.forEach(c => { if (c?.id && c?.title) courseTitleMap[c.id] = c.title; });

    const itemsMap: Map<string, any> = new Map();

    // Gather manual assignment ids across teacher's courses
    const manualAssignmentsByCourse: Record<string, Array<{ id: string; title?: string }>> = {};
    for (const cid of courseIds) {
      try {
        const assignments = await this.getAssignmentsForCourse(cid);
        const manualAssignments = assignments.filter(a => (a as any)?.manualGradingEnabled === true || (a as any)?.settings?.manualGradingEnabled === true);
        if (manualAssignments.length > 0) {
          manualAssignmentsByCourse[cid] = manualAssignments.map(a => ({ id: a.id as string, title: (a as any)?.title }));
        }
      } catch (e) {
        console.warn('Failed to load assignments for course', cid, e);
      }
    }

    // Direct pass: query attempts by instructorId to capture all of the teacher's submissions
    try {
      const qByInstructor = query(collection(db, 'assignmentAttempts'), where('instructorId', '==', teacherId));
      const snapByInstructor = await getDocs(qByInstructor);
      const manualIdsSet = new Set(Object.values(manualAssignmentsByCourse).flat().map(a => a.id));
      for (const docSnap of snapByInstructor.docs) {
        const data = docSnap.data() as any;
        // Filter to manual-graded assignments using known manual IDs (or manualGrading flag if present)
        const isManual = data.manualGrading === true || manualIdsSet.has(data.assignmentId);
        if (!isManual) continue;
        let studentName: string | undefined;
        try {
          const student = await StudentService.getStudentById(data.studentId);
          studentName = student?.fullName;
        } catch {}
        const courseTitle = data.courseId ? courseTitleMap[data.courseId] : undefined;
        const attemptItem = {
          attemptId: docSnap.id,
          assignmentId: data.assignmentId,
          assignmentTitle: undefined, // optionally resolve below
          studentId: data.studentId,
          studentName,
          courseId: data.courseId,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          gradedAt: data.gradedAt?.toDate?.() || null,
          answers: data.answers,
          totalPoints: data.totalPoints,
          earnedPoints: data.earnedPoints,
          totalQuestions: data.totalQuestions,
          correctQuestions: data.correctQuestions,
          questionResults: data.questionResults,
          courseTitle,
          submittedAt: data.createdAt?.toDate?.() || new Date(),
        };
        itemsMap.set(docSnap.id, attemptItem);
      }
    } catch (e) {
      console.warn('Failed to load manual attempts by instructorId', teacherId, e);
    }

    // First pass: query by courseId to catch most attempts
    for (const cid of courseIds) {
      const manualAssignments = manualAssignmentsByCourse[cid] || [];
      if (manualAssignments.length === 0) continue;
      try {
        const q = query(collection(db, 'assignmentAttempts'), where('courseId', '==', cid));
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as any;
          // Only include attempts for manual-graded assignments
          if (!manualAssignments.some(a => a.id === data.assignmentId)) continue;
          let studentName: string | undefined;
          try {
            const student = await StudentService.getStudentById(data.studentId);
            studentName = student?.fullName;
          } catch {}
          const attemptItem = {
            attemptId: docSnap.id,
            assignmentId: data.assignmentId,
            assignmentTitle: manualAssignments.find(a => a.id === data.assignmentId)?.title,
            studentId: data.studentId,
            studentName,
            courseId: data.courseId,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            gradedAt: data.gradedAt?.toDate?.() || null,
            answers: data.answers,
            totalPoints: data.totalPoints,
            earnedPoints: data.earnedPoints,
            totalQuestions: data.totalQuestions,
            correctQuestions: data.correctQuestions,
            questionResults: data.questionResults,
            courseTitle: courseTitleMap[cid],
            submittedAt: data.createdAt?.toDate?.() || new Date(),
          };
          itemsMap.set(docSnap.id, attemptItem);
        }
      } catch (e) {
        console.warn('Failed to load manual attempts by courseId', cid, e);
      }
    }

    // Second pass: query directly by assignmentId (in chunks of 10) to catch any attempts with mismatched/undefined courseId
    const allManualIds: string[] = Object.values(manualAssignmentsByCourse).flat().map(a => a.id);
    const chunkSize = 10;
    for (let i = 0; i < allManualIds.length; i += chunkSize) {
      const idsChunk = allManualIds.slice(i, i + chunkSize);
      if (idsChunk.length === 0) continue;
      try {
        const q = query(collection(db, 'assignmentAttempts'), where('assignmentId', 'in', idsChunk));
        const snapshot = await getDocs(q);
        for (const docSnap of snapshot.docs) {
          if (itemsMap.has(docSnap.id)) continue; // already included from courseId query
          const data = docSnap.data() as any;
          let studentName: string | undefined;
          try {
            const student = await StudentService.getStudentById(data.studentId);
            studentName = student?.fullName;
          } catch {}
          const courseTitle = data.courseId ? courseTitleMap[data.courseId] : undefined;
          const attemptItem = {
            attemptId: docSnap.id,
            assignmentId: data.assignmentId,
            assignmentTitle: undefined, // optionally resolve below
            studentId: data.studentId,
            studentName,
            courseId: data.courseId,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            gradedAt: data.gradedAt?.toDate?.() || null,
            answers: data.answers,
            totalPoints: data.totalPoints,
            earnedPoints: data.earnedPoints,
            totalQuestions: data.totalQuestions,
            correctQuestions: data.correctQuestions,
            questionResults: data.questionResults,
            courseTitle,
            submittedAt: data.createdAt?.toDate?.() || new Date(),
          };
          itemsMap.set(docSnap.id, attemptItem);
        }
      } catch (e) {
        console.warn('Failed to load manual attempts by assignmentId chunk', idsChunk, e);
      }
    }

    // Resolve assignment titles for any entries missing them (best-effort)
    // Only include attempts that still need grading. Exclude those with gradedAt or with questionResults already present.
    const items = Array.from(itemsMap.values()).filter(it => !it.gradedAt && !it.questionResults);
    const missingTitleIds = Array.from(new Set(items.filter(it => !it.assignmentTitle).map(it => it.assignmentId)));
    for (const aid of missingTitleIds) {
      try {
        const meta = await this.getAssignmentById(aid);
        items.forEach(it => { if (it.assignmentId === aid && !it.assignmentTitle) it.assignmentTitle = meta?.title; });
      } catch {}
    }

    items.sort((a, b) => (b?.createdAt?.getTime?.() || 0) - (a?.createdAt?.getTime?.() || 0));
    return items;
  }
}