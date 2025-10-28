import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { CourseService } from '@/services/courseService';
import { ExamService } from '@/services/examService';
import AssignmentService from '@/services/assignmentService';
import { NotificationService } from '@/services/notificationService';
import { StudentService } from '@/services/studentService';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

import { Award, Upload, CheckSquare, Square, Puzzle, PlusCircle, Timer, Calendar, ArrowRight, AlertTriangle, Play, Pause, Clock, Trash2, ArrowUp, ArrowDown, ListOrdered, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription as AlertDialogDesc, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type QuestionType = 'mcq' | 'fill' | 'drag' | 'essay';

type MCQOption = { id: string; text: string; correct: boolean };
type ExamQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  options?: MCQOption[];
  answer?: string; // for fill-in-the-blank
  items?: { id: string; text: string }[]; // for drag-and-drop (basic list)
  points?: number;
  correctOrder?: string[];
  imageBase64?: string;
  imagePosition?: 'above' | 'below' | 'left' | 'right';
  imageWidth?: number;
};

type ExamSettings = {
  secureMode: boolean;
  timeLimitMinutes: number | null;
  oneWay: boolean;
  scheduleEnabled: boolean;
  scheduledAt: string | null; // ISO or local datetime string
  windowEndAt?: string | null; // explicit end of entry window
  manualGradingEnabled: boolean;
};

type ExamDraft = {
  title: string;
  courseId: string | null;
  questions: ExamQuestion[];
  settings: ExamSettings;
};

 type AssignmentOption = { id: string; text: string; correct: boolean };
 type AssignmentQuestion = {
  id: string;
  type?: 'mcq' | 'essay';
  text: string;
  options: AssignmentOption[];
  points: number;
  imageBase64?: string;
  imagePosition?: { x: number; y: number };
  imageWidth?: number;
};

type AssignmentDraft = {
  title: string;
  courseId: string | null;
  questions: AssignmentQuestion[];
  manualGradingEnabled?: boolean;
};

const TeacherAssessments: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const t = useMemo(() => ({
    pageTitle: language === 'ar' ? 'الامتحانات والواجبات' : 'Exams and Assignments',
    sectionExam: language === 'ar' ? 'إنشاء امتحان' : 'Create Exam',
    sectionAssignment: language === 'ar' ? 'إنشاء واجب' : 'Create Assignment',
    examTitle: language === 'ar' ? 'عنوان الامتحان' : 'Exam Title',
    selectCourse: language === 'ar' ? 'اختر الدورة' : 'Select Course',
    addMCQ: language === 'ar' ? 'أضف سؤال اختيار من متعدد' : 'Add Multiple-choice',
    addFill: language === 'ar' ? 'أضف سؤال إملاء فراغ' : 'Add Fill-in-the-blank',
    addDrag: language === 'ar' ? 'أضف سؤال سحب وإفلات' : 'Add Drag-and-drop',
    questionText: language === 'ar' ? 'نص السؤال' : 'Question Text',
    optionText: language === 'ar' ? 'نص الخيار' : 'Option Text',
    correct: language === 'ar' ? 'صحيح' : 'Correct',
    answerText: language === 'ar' ? 'نص الإجابة' : 'Answer Text',
    saveExam: language === 'ar' ? 'حفظ الامتحان' : 'Save Exam',
    assignmentTitle: language === 'ar' ? 'عنوان الواجب' : 'Assignment Title',
    assignmentDesc: language === 'ar' ? 'وصف الواجب' : 'Assignment Description',
    assignmentType: language === 'ar' ? 'نوع الواجب' : 'Assignment Type',
    typeMCQ: language === 'ar' ? 'اختيار من متعدد' : 'Multiple-choice',
    typeFile: language === 'ar' ? 'رفع ملف' : 'File Upload',
    uploadFile: language === 'ar' ? 'رفع ملف' : 'Upload File',
    saveAssignment: language === 'ar' ? 'حفظ الواجب' : 'Save Assignment',
    savedExam: language === 'ar' ? 'تم حفظ الامتحان بنجاح' : 'Exam saved successfully',
    savedAssignment: language === 'ar' ? 'تم حفظ الواجب بنجاح' : 'Assignment saved successfully',
    points: language === 'ar' ? 'النقاط' : 'Points',
    questionPoints: language === 'ar' ? 'نقاط السؤال' : 'Question Points',
  }), [language]);

  const [teacherName, setTeacherName] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);

  const [exam, setExam] = useState<ExamDraft>({ 
    title: '', 
    courseId: null, 
    questions: [], 
    settings: {
      secureMode: false,
      timeLimitMinutes: null,
      oneWay: false,
      scheduleEnabled: false,
      scheduledAt: null,
      windowEndAt: null,
      manualGradingEnabled: false,
    }
  });
  const [assignment, setAssignment] = useState<AssignmentDraft>({ title: '', courseId: null, questions: [], manualGradingEnabled: false });
  const [draggingImageQid, setDraggingImageQid] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const addAssignmentQuestion = () => {
    const id = `aq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAssignment(prev => ({
      ...prev,
      questions: [...prev.questions, { id, type: 'mcq', text: '', options: [], points: 1, imageBase64: undefined, imagePosition: { x: 0, y: 0 }, imageWidth: 320 }]
    }));
  };
  const addEssayAssignmentQuestion = () => {
    const id = `aq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setAssignment(prev => ({
      ...prev,
      questions: [...prev.questions, { id, type: 'essay', text: '', options: [], points: 1, imageBase64: undefined, imagePosition: { x: 0, y: 0 }, imageWidth: 320 }]
    }));
  };
  const removeAssignmentQuestion = (qid: string) => {
    setAssignment(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== qid) }));
  };
  const addAssignmentOption = (qid: string) => {
    const opt = { id: `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`, text: '', correct: false };
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, options: [...q.options, opt] } : q) }));
  };
  const updateAssignmentOptionText = (qid: string, oid: string, text: string) => {
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o) } : q) }));
  };
  const toggleAssignmentCorrect = (qid: string, oid: string) => {
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, correct: !o.correct } : o) } : q) }));
  };
  const updateAssignmentQuestionPoints = (qid: string, points: number) => {
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, points: Math.max(0, points) } : q) }));
  };
  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const handleAssignmentImageUpload = async (qid: string, file: File) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, imageBase64: base64 } : q) }));
  };
  const handleAssignmentImageWidthChange = (qid: string, width: number) => {
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qid ? { ...q, imageWidth: width } : q) }));
  };
  const startDragImage = (qid: string) => (e: React.MouseEvent<HTMLDivElement | HTMLImageElement>) => {
    setDraggingImageQid(qid);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onDragImage = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingImageQid) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - (dragOffset?.x || 0);
    const y = e.clientY - rect.top - (dragOffset?.y || 0);
    setAssignment(prev => ({ ...prev, questions: prev.questions.map(q => q.id === draggingImageQid ? { ...q, imagePosition: { x: Math.max(0, x), y: Math.max(0, y) } } : q) }));
  };
  const endDragImage = () => {
    setDraggingImageQid(null);
    setDragOffset(null);
  };

  const [savingExam, setSavingExam] = useState<boolean>(false);

  // Scheduled/Ongoing exams state for teacher
  const [scheduledExams, setScheduledExams] = useState<any[]>([]);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [extendExamId, setExtendExamId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState<number | ''>('');
  const [editScheduledAt, setEditScheduledAt] = useState<string>('');
  const [editTimeLimit, setEditTimeLimit] = useState<number | ''>('');
  const [activeSection, setActiveSection] = useState<'exams' | 'assignments'>('exams');
  // Per-exam input for setting remaining time directly
  const [timeAdjustments, setTimeAdjustments] = useState<Record<string, string>>({});
  // Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ø§Ù…ØªØ­Ø§Ù† Ù„Ù…Ù† Ù„Ù… ÙŠØ¨Ø¯Ø£ÙˆØ§ ÙÙ‚Ø·
  const [reopenExamId, setReopenExamId] = useState<string | null>(null);
  const [reopenScheduledAt, setReopenScheduledAt] = useState<string>('');
  const [reopenTimeLimit, setReopenTimeLimit] = useState<number | ''>('');

  // Grading inbox state
  const [gradingInboxOpen, setGradingInboxOpen] = useState<boolean>(false);
  const [gradingExamId, setGradingExamId] = useState<string | null>(null);
  const [gradingExamMeta, setGradingExamMeta] = useState<any | null>(null);
  const [gradingLoading, setGradingLoading] = useState<boolean>(false);
  const [gradingCandidates, setGradingCandidates] = useState<Array<{ studentId: string; studentName: string; photoURL?: string; studentPhone?: string; parentPhone?: string; score?: number; total?: number; answers?: any; submittedAt?: Date }>>([]);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Subsection routing for exams main session
  const [examSubsection, setExamSubsection] = useState<'create' | 'grading_inbox' | 'grading_detail' | 'auto_results' | 'auto_detail'>('create');
  // Detail grading states
  const [gradingDetailStudentName, setGradingDetailStudentName] = useState<string>('');
  const [gradingDetailAnswers, setGradingDetailAnswers] = useState<any | null>(null);
  const [gradingDetailScores, setGradingDetailScores] = useState<Record<string, number>>({});
  const [gradingDetailFeedback, setGradingDetailFeedback] = useState<string>('');
  const [gradingDetailCorrect, setGradingDetailCorrect] = useState<Record<string, boolean | null>>({});
  const [gradingDetailPhotoURL, setGradingDetailPhotoURL] = useState<string>('');
  const [gradingDetailStudentPhone, setGradingDetailStudentPhone] = useState<string>('');
  const [gradingDetailParentPhone, setGradingDetailParentPhone] = useState<string>('');

  // Auto results state
  const [autoResultsLoading, setAutoResultsLoading] = useState<boolean>(false);
  const [autoResultsExamId, setAutoResultsExamId] = useState<string | null>(null);
  const [autoResultsExamMeta, setAutoResultsExamMeta] = useState<any | null>(null);
  const [autoResultsList, setAutoResultsList] = useState<Array<{ studentId: string; studentName: string; photoURL?: string; studentPhone?: string; parentPhone?: string; score: number; total: number; answers?: any; submittedAt?: Date; gradedAt?: Date }>>([]);
  const [autoDetailStudentId, setAutoDetailStudentId] = useState<string | null>(null);
  const [autoDetailStudentName, setAutoDetailStudentName] = useState<string>('');
  const [autoDetailAnswers, setAutoDetailAnswers] = useState<any | null>(null);
  // Assignment inbox state
  const [assignmentInboxLoading, setAssignmentInboxLoading] = useState<boolean>(false);
  const [assignmentInboxItems, setAssignmentInboxItems] = useState<any[]>([]);
  // Assignment grading session state
  const [assignmentSubsection, setAssignmentSubsection] = useState<'create' | 'grading_detail'>('create');
  const [assignmentGradingAttempt, setAssignmentGradingAttempt] = useState<any | null>(null);
  const [assignmentGradingMeta, setAssignmentGradingMeta] = useState<any | null>(null);
  const [assignmentGradingStudent, setAssignmentGradingStudent] = useState<{ name: string; photoURL?: string; studentPhone?: string; parentPhone?: string } | null>(null);
  const [assignmentGradingCorrect, setAssignmentGradingCorrect] = useState<Record<string, boolean | null>>({});
  const [assignmentGradingPoints, setAssignmentGradingPoints] = useState<Record<string, number>>({});
  const [assignmentGradingFeedback, setAssignmentGradingFeedback] = useState<string>('');
  const [publishingAssignment, setPublishingAssignment] = useState<boolean>(false);
  // Real-time sources for scheduled exams
  const [instructorExamsRT, setInstructorExamsRT] = useState<any[]>([]);
  const [courseExamsMapRT, setCourseExamsMapRT] = useState<Record<string, any[]>>({});
  // Dedup auto-end notifications per exam
  const [autoEndNotifiedIds, setAutoEndNotifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadTeacherData = async () => {
      if (!user) return;
      setTeacherName(user.displayName || (language === 'ar' ? 'مدرس' : 'Teacher'));
      try {
        const instructorCourses = await CourseService.getInstructorCourses(user.uid);
        setCourses(instructorCourses);
      } catch (error) {
        console.error('Error loading instructor courses', error);
      }
    };

    loadTeacherData();
  }, [user, language]);

  // Back to Create Exam main session
  const backToCreateExam = () => {
    setExamSubsection('create');
    // reset manual grading state
    setSelectedStudentId(null);
    setGradingExamId(null);
    setGradingExamMeta(null);
    setGradingCandidates([]);
    setGradingDetailAnswers(null);
    setGradingDetailScores({});
    setGradingDetailFeedback('');
    // reset auto results state
    setAutoResultsExamId(null);
    setAutoResultsExamMeta(null);
    setAutoResultsList([]);
    setAutoDetailStudentId(null);
    setAutoDetailStudentName('');
    setAutoDetailAnswers(null);
  };

  // Open detail grading for a specific student candidate
  const openStudentGrading = (cand: { studentId: string; studentName: string; answers?: any }) => {
    setSelectedStudentId(cand.studentId);
    setGradingDetailStudentName(cand.studentName);
    setGradingDetailAnswers(cand.answers ?? null);
    const initScores: Record<string, number> = {};
    const initCorrect: Record<string, boolean | null> = {};
    gradingExamMeta?.questions?.forEach((q: any) => { initScores[q.id] = 0; initCorrect[q.id] = null; });
    setGradingDetailScores(initScores);
    setGradingDetailCorrect(initCorrect);
    setExamSubsection('grading_detail');
  };

  // Open auto results list for ended exam (auto-graded)
  const openAutoResults = async (ex: any) => {
    if (!user) return;
    setAutoResultsLoading(true);
    setExamSubsection('auto_results');
    setAutoResultsExamId(ex.id);
    setAutoDetailStudentId(null);
    setAutoDetailStudentName('');
    setAutoDetailAnswers(null);
    try {
      const meta = await ExamService.getExamById(ex.id);
      setAutoResultsExamMeta(meta);
    } catch {}

    try {
      const courseIdForExam = ex.courseId || gradingExamMeta?.courseId || null;
let students: any[] = [];
if (courseIdForExam) {
  try {
    const studentsQuery = query(
      collection(db, 'students'),
      where('enrolledCourses', 'array-contains', courseIdForExam)
    );
    const studentsSnap = await getDocs(studentsQuery);
    students = studentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    console.warn('Failed to fetch students by course enrollment, falling back to teacher link', e);
    students = await StudentService.getStudentsByTeacher(user.uid);
  }
} else {
  students = await StudentService.getStudentsByTeacher(user.uid);
}
      const list = await Promise.all(students.map(async (stu) => {
        try {
          const res = await StudentService.getExamResult(stu.id, ex.id);
          // Ø¹Ø±Ø¶ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø¹Ø§Ø¯ÙŠØ© ÙˆØ§Ù„Ø¢Ù„ÙŠØ©: Ø£ÙŠ Ù†ØªÙŠØ¬Ø© Ù…Ù‚Ø¯Ù‘Ù…Ø©ØŒ Ø³ÙˆØ§Ø¡ ØªÙ… ØªØµØ­ÙŠØ­Ù‡Ø§ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø£Ùˆ ÙŠØ¯ÙˆÙŠØ§Ù‹ Ù„Ø§Ø­Ù‚Ø§Ù‹
          if (res && res.submittedAt) {
            return {
              studentId: stu.id,
              studentName: stu.fullName,
              photoURL: stu.photoURL,
              studentPhone: stu.studentPhone,
              parentPhone: stu.parentPhone,
              score: res.score,
              total: res.total,
              answers: res.answers,
              submittedAt: res.submittedAt,
              gradedAt: res.gradedAt,
            };
          }
        } catch (e) {
          console.warn('Failed to fetch auto result for student', stu.id, e);
        }
        return null;
      }));
      setAutoResultsList(list.filter(Boolean) as Array<{ studentId: string; studentName: string; photoURL?: string; studentPhone?: string; parentPhone?: string; score: number; total: number; answers?: any; submittedAt?: Date; gradedAt?: Date }>);
    } catch (err) {
      console.error('Error loading auto results', err);
      toast.error(language === 'ar' ? 'تعذر تحميل النتائج الآلية' : 'Failed to load auto results');
    } finally {
      setAutoResultsLoading(false);
    }
  };

  // Open read-only detail for a specific auto-graded result
  const openAutoDetail = (cand: { studentId: string; studentName: string; answers?: any }) => {
    setAutoDetailStudentId(cand.studentId);
    setAutoDetailStudentName(cand.studentName);
    setAutoDetailAnswers(cand.answers ?? null);
    setExamSubsection('auto_detail');
  };

  const backFromDetail = () => {
    if (examSubsection === 'auto_detail') {
      setExamSubsection('auto_results');
      setAutoDetailStudentId(null);
    } else {
      setExamSubsection('grading_inbox');
      setSelectedStudentId(null);
    }
  };

  // Assignments inbox loader
  const loadAssignmentInbox = async () => {
    if (!user) return;
    setAssignmentInboxLoading(true);
    try {
      const items = await AssignmentService.getManualInboxForTeacher(user.uid);
      setAssignmentInboxItems(items || []);
    } catch (err) {
      console.error('Error loading assignment inbox', err);
      toast.error(language === 'ar' ? 'تعذر تحميل صندوق الواجبات' : 'Failed to load assignment inbox');
    } finally {
      setAssignmentInboxLoading(false);
    }
  };

  // Open assignment grading detail
  const openAssignmentGrading = async (item: any) => {
    try {
      setAssignmentSubsection('grading_detail');
      setAssignmentGradingAttempt(item);
      const meta = await AssignmentService.getAssignmentById(item.assignmentId);
      setAssignmentGradingMeta(meta);
      let stu: any = null;
      try { stu = await StudentService.getStudentById(item.studentId); } catch {}
      setAssignmentGradingStudent(stu ? { name: stu.fullName, photoURL: stu.photoURL, studentPhone: stu.studentPhone, parentPhone: stu.parentPhone } : { name: item.studentName || '', photoURL: undefined, studentPhone: undefined, parentPhone: undefined });
      const initCorrect: Record<string, boolean | null> = {};
      const initPoints: Record<string, number> = {};
      (meta?.questions || []).forEach((q: any) => { initCorrect[q.id] = null; initPoints[q.id] = 0; });
      setAssignmentGradingCorrect(initCorrect);
      setAssignmentGradingPoints(initPoints);
      setAssignmentGradingFeedback('');
    } catch (e) {
      console.error('Failed to open assignment grading', e);
      toast.error(language === 'ar' ? 'تعذر فتح التصحيح' : 'Failed to open grading');
      setAssignmentSubsection('create');
    }
  };

  // Publish assignment grade
  const publishAssignmentGrade = async () => {
    if (!assignmentGradingAttempt || !assignmentGradingMeta || !user) return;
    setPublishingAssignment(true);
    try {
      await AssignmentService.publishManualGrade({
        attemptId: assignmentGradingAttempt.attemptId,
        assignmentId: assignmentGradingAttempt.assignmentId,
        studentId: assignmentGradingAttempt.studentId,
        correctnessByQid: Object.fromEntries(Object.entries(assignmentGradingCorrect).map(([k, v]) => [k, v === true])),
        pointsByQid: assignmentGradingPoints,
        feedback: assignmentGradingFeedback || undefined,
      });
      toast.success(language === 'ar' ? 'تم نشر درجة الطالب' : 'Student grade published');
      // Notify student (best-effort)
      try {
        await NotificationService.createNotification({
          userId: assignmentGradingAttempt.studentId,
          title: language === 'ar' ? 'تم نشر درجة الواجب' : 'Assignment grade published',
          message: (assignmentGradingMeta?.title ? assignmentGradingMeta.title : (language === 'ar' ? 'واجب' : 'Assignment')),
          type: 'success',
          teacherId: user.uid,
          courseId: assignmentGradingAttempt.courseId,
        });
      } catch {}
      await loadAssignmentInbox();
      // Reset
      setAssignmentSubsection('create');
      setAssignmentGradingAttempt(null);
      setAssignmentGradingMeta(null);
      setAssignmentGradingStudent(null);
      setAssignmentGradingCorrect({});
      setAssignmentGradingPoints({});
      setAssignmentGradingFeedback('');
    } catch (e) {
      console.error('Failed to publish assignment grade', e);
      toast.error(language === 'ar' ? 'فشل نشر الدرجة' : 'Failed to publish grade');
    } finally {
      setPublishingAssignment(false);
    }
  };

  // Ø­Ù…Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ù†Ø¯ ÙØªØ­ Ù‚Ø³Ù… Ø§Ù„ÙˆØ§Ø¬Ø¨Ø§Øª
  useEffect(() => {
    if (activeSection === 'assignments') {
      loadAssignmentInbox();
    }
  }, [activeSection, user]);

  // Render a student's answer for a question
  const renderAnswerDisplay = (q: any) => {
    const ans = gradingDetailAnswers ? gradingDetailAnswers[q.id] : undefined;
    if (!ans) return <span className="italic text-muted-foreground">{language === 'ar' ? 'لا توجد إجابة' : 'No answer'}</span>;
    switch (q.type) {
      case 'mcq': {
        const opt = q.options?.find((o: any) => o.id === ans);
        return <span>{opt ? opt.text : String(ans)}</span>;
      }
      case 'fill':
      case 'essay':
        return <pre className="whitespace-pre-wrap text-sm">{String(ans)}</pre>;
      case 'drag': {
        const order = Array.isArray(ans) ? ans : [];
        return (
          <div className="flex flex-wrap gap-2">
            {order.map((id: string) => {
              const item = q.items?.find((it: any) => it.id === id);
              return <Badge key={id} variant="secondary">{item ? item.text : id}</Badge>;
            })}
          </div>
        );
      }
      default:
        return <span>{String(ans)}</span>;
    }
  };

  // Render auto detail student's answer for a question (read-only)
  const renderAutoAnswerDisplay = (q: any) => {
    const ans = autoDetailAnswers ? autoDetailAnswers[q.id] : undefined;
    if (!ans) return <span className="italic text-muted-foreground">{language === 'ar' ? 'لا توجد إجابة' : 'No answer'}</span>;
    switch (q.type) {
      case 'mcq': {
        const opt = q.options?.find((o: any) => o.id === ans);
        return <span>{opt ? opt.text : String(ans)}</span>;
      }
      case 'fill':
      case 'essay':
        return <pre className="whitespace-pre-wrap text-sm">{String(ans)}</pre>;
      case 'drag': {
        const order = Array.isArray(ans) ? ans : [];
        return (
          <div className="flex flex-wrap gap-2">
            {order.map((id: string) => {
              const item = q.items?.find((it: any) => it.id === id);
              return <Badge key={id} variant="secondary">{item ? item.text : id}</Badge>;
            })}
          </div>
        );
      }
      default:
        return <span>{String(ans)}</span>;
    }
  };

  const markCorrect = (qId: string, correct: boolean) => {
    setGradingDetailCorrect(prev => ({ ...prev, [qId]: correct }));
    const points = gradingExamMeta?.questions?.find((qq: any) => qq.id === qId)?.points ?? 0;
    setGradingDetailScores(prev => ({ ...prev, [qId]: correct ? points : 0 }));
  };

  // Submit per-question graded result for selected student
  const submitDetailGrade = async () => {
    if (!user || !gradingExamId || !selectedStudentId) return;
    try {
      const numericScores = Object.values(gradingDetailScores || {});
      const scoreTotal = numericScores.reduce((a, b) => a + (Number(b) || 0), 0);
      await StudentService.updateExamGrade(selectedStudentId, gradingExamId, {
        score: scoreTotal,
        status: 'graded',
        gradedBy: user.uid,
        gradedAt: new Date().toISOString(),
        feedback: gradingDetailFeedback || undefined,
      });

      try {
        const examMeta = gradingExamMeta || (await ExamService.getExamById(gradingExamId));
        await NotificationService.createNotification({
          userId: selectedStudentId,
          title: language === 'ar' ? 'تم نشر نتيجة الامتحان' : 'Exam result published',
          message: language === 'ar'
            ? `تم تصحيح امتحان "${examMeta?.title || ''}" ونشر نتيجتك: ${scoreTotal}.`
            : `Your exam "${examMeta?.title || ''}" has been graded and your score is ${scoreTotal}.`,
          type: 'grade',
          createdAt: new Date(),
          read: false,
        });
      } catch (e) {
        console.warn('Failed to send grade notification', e);
      }

      setGradingCandidates(prev => prev.filter(c => c.studentId !== selectedStudentId));
      setSelectedStudentId(null);
      setExamSubsection('grading_inbox');
      toast.success(language === 'ar' ? 'تم نشر الدرجة للطالب' : 'Grade published to the student');
    } catch (err) {
      console.error('Error publishing grade', err);
      toast.error(language === 'ar' ? 'تعذر نشر الدرجة' : 'Failed to publish grade');
    }
  };


  // Refresh scheduled/ongoing exams for teacher across courses + by instructor
  useEffect(() => {
    const loadScheduled = async () => {
      if (!user) { setScheduledExams([]); return; }
      const results: any[] = [];
      const seen = new Set<string>();
      // Course-based
      if (courses.length > 0) {
        for (const c of courses) {
          try {
            const exs = await ExamService.getScheduledExamsForCourse(c.id);
            exs.forEach((ex: any) => {
              if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); }
            });
          } catch (e) {
            console.warn('Failed to fetch scheduled exams for course', c.id, e);
          }
        }
      }
      // Instructor-based (fallback/union)
      try {
        const instructorExams = await ExamService.getScheduledExamsForInstructor(user.uid);
        instructorExams.forEach((ex: any) => {
          if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); }
        });
      } catch (e) {
        console.warn('Failed to fetch scheduled exams for instructor', user.uid, e);
      }
      setScheduledExams(results);
    };
    loadScheduled();
  }, [user, courses]);

  // Real-time subscriptions: instructor and per-course
  useEffect(() => {
    if (!user) return;
    const unsubs: Array<() => void> = [];

    // Helper to map snapshot docs to ExamDoc-like objects
    const mapDocs = (docs: any[]) => docs.map((docSnap: any) => {
      const data = docSnap.data();
      const scheduled = data.scheduledAt?.toDate?.() || data.scheduledAt || null;
      const scheduleEnabled = !!data.settings?.scheduleEnabled;
      if (!scheduleEnabled || !scheduled) return null;
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        scheduledAt: scheduled,
        settings: {
          ...data.settings,
          scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
          windowEndAt: data.settings?.windowEndAt?.toDate?.() || data.settings?.windowEndAt || null,
        },
      } as any;
    }).filter(Boolean);

    // Instructor-based subscription (covers exams created by this teacher)
    try {
      const qInstructor = query(
        collection(db, 'exams'),
        where('instructorId', '==', user.uid),
        where('isActive', '==', true)
      );
      const unsubInstructor = onSnapshot(qInstructor, (snap) => {
        const list = mapDocs(snap.docs);
        setInstructorExamsRT(list);
      });
      unsubs.push(unsubInstructor);
    } catch {}

    // Per-course subscriptions (exams visible on courses taught by this teacher)
    (courses || []).forEach((c) => {
      try {
        const qCourse = query(
          collection(db, 'exams'),
          where('courseId', '==', c.id),
          where('isActive', '==', true)
        );
        const unsubCourse = onSnapshot(qCourse, (snap) => {
          const list = mapDocs(snap.docs);
          setCourseExamsMapRT((prev) => ({ ...prev, [c.id]: list }));
        });
        unsubs.push(unsubCourse);
      } catch {}
    });

    return () => { unsubs.forEach((fn) => { try { fn(); } catch {} }); };
  }, [user, courses]);

  // Merge RT sources so new exams appear immediately without manual refresh
  useEffect(() => {
    const unionMap = new Map<string, any>();
    instructorExamsRT.forEach((ex) => { if (ex?.id) unionMap.set(ex.id, ex); });
    Object.values(courseExamsMapRT).forEach((arr) => arr.forEach((ex) => { if (ex?.id && !unionMap.has(ex.id)) unionMap.set(ex.id, ex); }));
    setScheduledExams(Array.from(unionMap.values()));
  }, [instructorExamsRT, courseExamsMapRT]);

  useEffect(() => {
    const i = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Auto-end exams when timer reaches zero
  useEffect(() => {
    if (!scheduledExams || scheduledExams.length === 0) return;
    
    const checkAndEndExams = async () => {
      const examsToEnd: string[] = [];
      
      scheduledExams.forEach((exam: any) => {
        const timeRemaining = calculateTimeRemaining(exam, nowMs);
        
        // If time remaining is exactly 0, the exam should be ended
        if (timeRemaining === 0) {
          const openAt = exam.scheduledAt ? new Date(exam.scheduledAt as any) : null;
          const tl = exam.settings?.timeLimitMinutes ?? null;
          const windowEnd = exam.settings?.windowEndAt ? new Date(exam.settings.windowEndAt as any) : null;

          const endCheckMs = windowEnd
            ? windowEnd.getTime()
            : (openAt && tl ? openAt.getTime() + tl * 60000 : null);

          // Double check that we're past the end of entry window
          if (endCheckMs !== null && nowMs >= endCheckMs) {
            examsToEnd.push(exam.id);
          }
        }
      });
      
      // End exams that have reached zero time (dedup notifications and updates)
      for (const examId of examsToEnd) {
        try {
          // Skip if already notified/processed
          if (autoEndNotifiedIds.has(examId)) continue;
          // Update the exam to mark it as ended by setting a flag or updating its status
          // This will trigger the real-time listener to move it to ended section
          await ExamService.updateExamSchedule(examId, { 
            timeLimitMinutes: 0,
            // autoEnded is for future audits; visual state is driven by time/window checks
          });
          setAutoEndNotifiedIds((prev) => {
            const next = new Set(prev); next.add(examId); return next;
          });
          toast.info(language === 'ar' ? 'تم إنهاء امتحان تلقائياً' : 'Exam ended automatically');
        } catch (error) {
          console.error('Failed to auto-end exam:', examId, error);
        }
      }
    };
    
    checkAndEndExams();
  }, [scheduledExams, nowMs, language]);

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return language === 'ar' ? '0ث' : '0s';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (d > 0) return `${d} ${language === 'ar' ? 'يوم' : 'd'} ${h}:${String(m).padStart(2,'0')}`;
    return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Runtime time control: per-exam delta minutes input and handler
  const [timeDeltaByExam, setTimeDeltaByExam] = useState<Record<string, number>>({});
  const handleIncreaseTime = async (examId: string, currentLimit: number | null) => {
    const delta = timeDeltaByExam[examId] || 0;
    if (!delta || delta <= 0) {
      toast.error(language === 'ar' ? 'أدخل دقائق الزيادة أولاً' : 'Enter minutes to add');
      return;
    }
    const newLimit = (currentLimit || 0) + delta;
    try {
      await ExamService.updateExamSchedule(examId, { timeLimitMinutes: newLimit });
      setScheduledExams(prev => (prev || []).map((e: any) => e.id === examId ? { ...e, settings: { ...e.settings, timeLimitMinutes: newLimit } } : e));
      toast.success(language === 'ar' ? `تمت زيادة الوقت بمقدار ${delta} دقيقة` : `Time increased by ${delta} minutes`);
      setTimeDeltaByExam(prev => ({ ...prev, [examId]: 0 }));
    } catch (err) {
      console.error('Failed to update exam time limit', err);
      toast.error(language === 'ar' ? 'فشل تعديل وقت الامتحان' : 'Failed to update exam time');
    }
  };

  // Helper function to format time like in ExamRunner
  function formatTime(sec: number | null) {
    if (sec === null || sec < 0) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Helper function to calculate time remaining for an exam
  function calculateTimeRemaining(exam: any, nowMs: number) {
    const openAt = exam.scheduledAt ? new Date(exam.scheduledAt as any) : null;
    const tlRaw = exam.settings?.timeLimitMinutes;
    const tl = typeof tlRaw === 'number' ? tlRaw : (tlRaw != null ? Number(tlRaw) : undefined);
    if (!openAt) return null;

    const openMs = openAt.getTime();
    const windowEnd = exam.settings?.windowEndAt ? new Date(exam.settings.windowEndAt as any) : null;
    const windowEndMs = windowEnd ? windowEnd.getTime() : (typeof tl === 'number' && !Number.isNaN(tl) ? openMs + tl * 60000 : null);

    // If exam hasn't started yet, return seconds until start (upcoming countdown)
    if (nowMs < openMs) {
      return Math.max(0, Math.floor((openMs - nowMs) / 1000));
    }

    // If exam has ended, return 0
    if (windowEndMs !== null && nowMs >= windowEndMs) return 0;

    // Return seconds remaining until end
    return windowEndMs !== null ? Math.max(0, Math.floor((windowEndMs - nowMs) / 1000)) : null;
  }

  const handleIncreaseTimeQuick = async (examId: string, currentLimit: number | null, delta: number) => {
    const change = delta || 0;
    if (change === 0) return;
    const base = currentLimit || 0;
    const newLimit = Math.max(0, base + change);
    if (newLimit === base) return; // no effective change (e.g., would go below 0)
    try {
      await ExamService.updateExamSchedule(examId, { timeLimitMinutes: newLimit });
      setScheduledExams(prev => (prev || []).map((e: any) => e.id === examId ? { ...e, settings: { ...e.settings, timeLimitMinutes: newLimit } } : e));
      if (change > 0) {
        toast.success(language === 'ar' ? `+${change} دقيقة` : `+${change} minutes`);
      } else {
        toast.success(language === 'ar' ? `-${Math.abs(change)} دقيقة` : `-${Math.abs(change)} minutes`);
      }
    } catch (err) {
      console.error('Failed quick update time', err);
      toast.error(language === 'ar' ? 'فشل تعديل الوقت' : 'Failed to update time');
    }
  };

  // Set remaining time directly: for upcoming exams sets duration; for ongoing sets end to now + desired
  const handleSetRemainingTime = async (exam: any, desiredMinutesInput: string) => {
    const desired = Number(desiredMinutesInput);
    if (Number.isNaN(desired) || desired < 0) {
      toast.error(language === 'ar' ? 'أدخل عدد دقائق صحيح' : 'Enter a valid minutes value');
      return;
    }
    const openAt = exam.scheduledAt ? new Date(exam.scheduledAt as any) : null;
    if (!openAt) {
      toast.error(language === 'ar' ? 'وقت الفتح غير محدد' : 'Open time is missing');
      return;
    }
    const openMs = openAt.getTime();
    const isUpcoming = nowMs < openMs;
    const elapsedMinutes = Math.max(0, Math.floor((nowMs - openMs) / 60000));
    const newTotalLimit = isUpcoming ? desired : (elapsedMinutes + desired);
    try {
      await ExamService.updateExamSchedule(exam.id, { timeLimitMinutes: newTotalLimit });
      setScheduledExams(prev => (prev || []).map((e: any) => e.id === exam.id ? { ...e, settings: { ...e.settings, timeLimitMinutes: newTotalLimit } } : e));
      setTimeAdjustments(prev => ({ ...prev, [exam.id]: '' }));
      toast.success(language === 'ar' ? 'تم تحديث الوقت' : 'Time updated');
    } catch (err) {
      console.error('Failed to set remaining time', err);
      toast.error(language === 'ar' ? 'فشل تحديث الوقت' : 'Failed to update time');
    }
  };

  const openEdit = (ex: any) => {
    setEditingExamId(ex.id);
    const sched = ex.scheduledAt ? new Date(ex.scheduledAt) : null;
    setEditScheduledAt(sched ? toLocalInputValue(sched) : '');
    setEditTimeLimit(ex.settings?.timeLimitMinutes ?? '');
  };

  const cancelEdit = () => {
    setEditingExamId(null);
    setEditScheduledAt('');
    setEditTimeLimit('');
  };

  // Open grading inbox for an ended exam
  const openGradingInbox = async (ex: any) => {
    if (!user) return;
    setGradingLoading(true);
    setGradingInboxOpen(false); // use main session instead of dialog
    setExamSubsection('grading_inbox');
    setSelectedStudentId(null);
    setGradingDetailAnswers(null);
    setGradingDetailScores({});
    setGradingDetailFeedback('');
    setGradingExamId(ex.id);
    try {
      const meta = await ExamService.getExamById(ex.id);
      setGradingExamMeta(meta);
    } catch {}

    try {
      const courseIdForExam = ex.courseId || gradingExamMeta?.courseId || null;
let students: any[] = [];
if (courseIdForExam) {
  try {
    const studentsQuery = query(
      collection(db, 'students'),
      where('enrolledCourses', 'array-contains', courseIdForExam)
    );
    const studentsSnap = await getDocs(studentsQuery);
    students = studentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    console.warn('Failed to fetch students by course enrollment, falling back to teacher link', e);
    students = await StudentService.getStudentsByTeacher(user.uid);
  }
} else {
  students = await StudentService.getStudentsByTeacher(user.uid);
}
      const results = await Promise.all(students.map(async (stu) => {
        try {
          const res = await StudentService.getExamResult(stu.id, ex.id);
          if (res && res.status === 'pending') {
            return {
              studentId: stu.id,
              studentName: stu.fullName,
              photoURL: stu.photoURL,
              studentPhone: stu.studentPhone,
              parentPhone: stu.parentPhone,
              score: res.score,
              total: res.total,
              answers: res.answers,
              submittedAt: res.submittedAt,
              autoSubmitted: res.autoSubmitted === true,
            };
          }
        } catch (e) {
          console.warn('Failed to fetch result for student', stu.id, e);
        }
        return null;
      }));
      const pendingAll = results.filter(Boolean) as Array<{ studentId: string; studentName: string; score?: number; total?: number; answers?: any; submittedAt?: Date; autoSubmitted?: boolean }>;
      const questionIds = (gradingExamMeta?.questions || []).map((q: any) => q.id);
      // Ø§Ø³ØªØ¨Ø¹Ø§Ø¯ Ø§Ù„ØªØ³Ù„ÙŠÙ…Ø§Øª Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ© Ø¨Ø³Ø¨Ø¨ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„ÙˆÙ‚Øª + Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§ÙƒØªÙ…Ø§Ù„ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø§Øª
      const pending = pendingAll.filter(c => {
        const submitted = !!c.submittedAt;
        const notAuto = c.autoSubmitted !== true;
        if (!submitted || !notAuto) return false;
        if (questionIds.length === 0) return true;
        const answers = c.answers || {};
        const answeredCount = questionIds.filter(id => answers[id] !== undefined).length;
        return answeredCount === questionIds.length;
      });
      setGradingCandidates(pending);
    } catch (err) {
      console.error('Error loading grading inbox', err);
      toast.error(language === 'ar' ? 'تعذر تحميل صندوق التصحيح' : 'Failed to load grading inbox');
    } finally {
      setGradingLoading(false);
    }
  };

  // Submit grade for selected student
  const submitGrade = async () => {
    if (!user || !gradingExamId || !selectedStudentId) return;
    const cand = gradingCandidates.find(c => c.studentId === selectedStudentId);
    if (!cand) return;
    const total = cand.total ?? 0;
    const parsedScore = Number(gradeScore);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > total) {
      toast.warning(language === 'ar' ? 'أدخل علامة صحيحة بين 0 والمجموع' : 'Enter a valid score between 0 and total');
      return;
    }
    try {
      await StudentService.updateExamGrade(selectedStudentId, gradingExamId, {
        score: parsedScore,
        gradedBy: user.uid,
        feedback: gradeFeedback || undefined,
      });
      const title = language === 'ar' ? 'نشر نتيجة الامتحان' : 'Exam grade published';
      const courseTitle = gradingExamMeta?.courseTitle || '';
      const message = language === 'ar'
        ? `تم نشر نتيجتك في الامتحان "${gradingExamMeta?.title || ''}". علامتك: ${parsedScore}/${total}.`
        : `Your exam "${gradingExamMeta?.title || ''}" has been graded. Score: ${parsedScore}/${total}.`;
      await NotificationService.createNotification({
        userId: selectedStudentId,
        title,
        message,
        type: 'success',
        courseId: gradingExamMeta?.courseId,
        teacherId: user.uid,
      });
      setGradingCandidates(prev => prev.filter(c => c.studentId !== selectedStudentId));
      setGradeScore('');
      setGradeFeedback('');
      setSelectedStudentId(null);
      toast.success(language === 'ar' ? 'تم نشر الدرجة بنجاح' : 'Grade published successfully');
    } catch (err) {
      console.error('Failed to submit grade', err);
      toast.error(language === 'ar' ? 'فشل نشر الدرجة' : 'Failed to publish grade');
    }
  };

  const saveEdit = async (examId: string) => {
    try {
      if (!!editScheduledAt && (editTimeLimit === '' || Number(editTimeLimit) <= 0)) {
        toast.error(language === 'ar' ? 'يرجى تحديد وقت الامتحان (بالدقائق)' : 'Please set exam time limit (minutes)');
        return;
      }
      await ExamService.updateExamSchedule(examId, {
        scheduleEnabled: !!editScheduledAt,
        scheduledAt: editScheduledAt || null,
        timeLimitMinutes: editScheduledAt ? Number(editTimeLimit) : null
      });
      toast.success(language === 'ar' ? 'تم تحديث الجدولة' : 'Schedule updated');
      cancelEdit();
      // refresh from courses + instructor with dedup
      const results: any[] = [];
      const seen = new Set<string>();
      for (const c of courses) {
        try {
          const exs = await ExamService.getScheduledExamsForCourse(c.id);
          exs.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
        } catch {}
      }
      try {
        const instructorExams = await ExamService.getScheduledExamsForInstructor(user?.uid || '');
        instructorExams.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
      } catch {}
      setScheduledExams(results);
    } catch (e) {
      console.error('updateExamSchedule failed', e);
      toast.error(language === 'ar' ? 'فشل تحديث الجدولة' : 'Failed to update schedule');
    }
  };

  // ÙØªØ­ ÙˆØ§Ø¬Ù‡Ø© Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ÙØªØ­ ÙÙ‚Ø· Ù„Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ± Ø§Ù„Ù…Ù…ØªØ­Ù†ÙŠÙ†
  const openReopen = (ex: any) => {
    setReopenExamId(ex.id);
    const sched = ex.scheduledAt ? new Date(ex.scheduledAt) : null;
    setReopenScheduledAt(sched ? toLocalInputValue(sched) : '');
    setReopenTimeLimit(ex.settings?.timeLimitMinutes ?? '');
  };
  const cancelReopen = () => {
    setReopenExamId(null);
    setReopenScheduledAt('');
    setReopenTimeLimit('');
  };
  const saveReopen = async (examId: string) => {
    try {
      if (!reopenScheduledAt) {
        toast.error(language === 'ar' ? 'يرجى إدخال موعد إعادة الفتح' : 'Please set reopen date');
        return;
      }
      if (reopenTimeLimit === '' || Number(reopenTimeLimit) <= 0) {
        toast.error(language === 'ar' ? 'يرجى تحديد وقت الامتحان (بالدقائق)' : 'Please set exam time limit (minutes)');
        return;
      }
      await ExamService.reopenForUnattempted(examId, {
        scheduledAt: reopenScheduledAt,
        timeLimitMinutes: Number(reopenTimeLimit),
      });

      // Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù„Ø·Ù„Ø§Ø¨ ØºÙŠØ± Ø§Ù„Ù…Ù…ØªØ­Ù†ÙŠÙ† ÙÙŠ Ø§Ù„Ø¯ÙˆØ±Ø©
      try {
        const exDoc = await ExamService.getExamById(examId);
        const teacherStudents = await StudentService.getStudentsByTeacher(user?.uid || '');
        let notified = 0;
        for (const s of teacherStudents) {
          const enrolled = (s.enrolledCourses || []).includes(exDoc?.courseId || '');
          if (!enrolled) continue;
          const attempt = await StudentService.getExamAttempt(s.id, examId);
          if (attempt?.startAt || attempt?.submittedAt) continue; // ÙÙ‚Ø· Ù…Ù† Ù„Ù… ÙŠØ­Ø§ÙˆÙ„
          await NotificationService.createNotification({
            userId: s.id,
            title: language === 'ar' ? 'إعادة فتح الامتحان' : 'Exam reopened',
            message: language === 'ar'
              ? `تمت إعادة فتح امتحان "${exDoc?.title || ''}" للطلاب غير الممتحنين. الموعد: ${new Date(reopenScheduledAt).toLocaleString()}.`
              : `Exam "${exDoc?.title || ''}" has been reopened for unattempted students. Opens: ${new Date(reopenScheduledAt).toLocaleString()}.`,
            type: 'info',
            courseId: exDoc?.courseId || undefined,
            teacherId: user?.uid || undefined,
          });
          notified++;
        }
        toast.success(
          language === 'ar'
            ? `تم إعادة فتح الامتحان وإشعار ${notified} طالباً غير ممتحن`
            : `Exam reopened and ${notified} unattempted students notified`
        );
      } catch (notifyErr) {
        console.error('Error sending reopen notifications:', notifyErr);
        toast.success(language === 'ar' ? 'تم إعادة فتح الامتحان للطلاب غير الممتحنين فقط' : 'Exam reopened for unattempted students only');
      }

      cancelReopen();
      // Ø¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø§Ù…ØªØ­Ø§Ù†Ø§Øª Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©
      const results: any[] = [];
      const seen = new Set<string>();
      for (const c of courses) {
        try {
          const exs = await ExamService.getScheduledExamsForCourse(c.id);
          exs.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
        } catch {}
      }
      try {
        const instructorExams = await ExamService.getScheduledExamsForInstructor(user?.uid || '');
        instructorExams.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
      } catch {}
      setScheduledExams(results);
    } catch (e) {
      console.error('reopenForUnattempted failed', e);
      toast.error(language === 'ar' ? 'فشل إعادة فتح الامتحان' : 'Failed to reopen exam');
    }
  };

  // Helper: perform reopen using direct params (avoid async state race)
  const saveReopenWithParams = async (examId: string, scheduledAt: string, timeLimit: number) => {
    try {
      await ExamService.reopenForUnattempted(examId, {
        scheduledAt,
        timeLimitMinutes: Number(timeLimit),
      });

      try {
        const exDoc = await ExamService.getExamById(examId);
        const teacherStudents = await StudentService.getStudentsByTeacher(user?.uid || '');
        let notified = 0;
        for (const s of teacherStudents) {
          const enrolled = (s.enrolledCourses || []).includes(exDoc?.courseId || '');
          if (!enrolled) continue;
          const attempt = await StudentService.getExamAttempt(s.id, examId);
          if (attempt?.startAt || attempt?.submittedAt) continue;
          await NotificationService.createNotification({
            userId: s.id,
            title: language === 'ar' ? 'إعادة فتح الامتحان' : 'Exam reopened',
            message: language === 'ar'
              ? `تمت إعادة فتح امتحان "${exDoc?.title || ''}" للطلاب غير الممتحنين. الموعد: ${new Date(scheduledAt).toLocaleString()}.`
              : `Exam "${exDoc?.title || ''}" has been reopened for unattempted students. Opens: ${new Date(scheduledAt).toLocaleString()}.`,
            type: 'info',
            courseId: exDoc?.courseId || undefined,
            teacherId: user?.uid || undefined,
          });
          notified++;
        }
        toast.success(
          language === 'ar'
            ? `تم إعادة فتح الامتحان وإشعار ${notified} طالباً غير ممتحن`
            : `Exam reopened and ${notified} unattempted students notified`
        );
      } catch (notifyErr) {
        console.error('Error sending reopen notifications:', notifyErr);
        toast.success(language === 'ar' ? 'تم إعادة فتح الامتحان للطلاب غير الممتحنين فقط' : 'Exam reopened for unattempted students only');
      }

      // refresh scheduled exams (courses + instructor with dedup)
      const results: any[] = [];
      const seen = new Set<string>();
      for (const c of courses) {
        try {
          const exs = await ExamService.getScheduledExamsForCourse(c.id);
          exs.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
        } catch {}
      }
      try {
        const instructorExams = await ExamService.getScheduledExamsForInstructor(user?.uid || '');
        instructorExams.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
      } catch {}
      setScheduledExams(results);
    } catch (e) {
      console.error('reopenForUnattempted failed', e);
      toast.error(language === 'ar' ? 'فشل إعادة فتح الامتحان' : 'Failed to reopen exam');
    }
  };

  // Quick reopen feature removed in favor of windowEndAt scheduling.

  const toggleFreeze = async (ex: any) => {
    try {
      await ExamService.setExamTimerFreeze(ex.id, !ex.timerFrozen);
      toast.success(
        !ex.timerFrozen 
          ? (language === 'ar' ? 'تم تجميد الوقت مؤقتاً' : 'Exam time frozen temporarily') : (language === 'ar' ? 'تم إلغاء التجميد' : 'Freeze disabled')
      );
      // update local state
      setScheduledExams(prev => prev.map(e => e.id === ex.id ? { ...e, timerFrozen: !ex.timerFrozen } : e));
    } catch (err) {
      console.error('setExamTimerFreeze error', err);
      toast.error(language === 'ar' ? 'فشل التجميد' : 'Failed to toggle freeze');
    }
  };

  // Increase time dialog handlers
  const openExtend = (ex: any) => {
    setExtendExamId(ex.id);
    setExtendMinutes('');
  };

  const cancelExtend = () => {
    setExtendExamId(null);
    setExtendMinutes('');
  };

  const submitExtend = async () => {
    if (!extendExamId || extendMinutes === '' || Number(extendMinutes) <= 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال عدد دقائق صالح' : 'Please enter a valid minutes amount');
      return;
    }
    try {
      const existing = scheduledExams.find((e) => e.id === extendExamId);
      const currentTl = existing?.settings?.timeLimitMinutes ?? 0;
      const nextTl = (currentTl || 0) + Number(extendMinutes);
      await ExamService.updateExamSchedule(extendExamId, { timeLimitMinutes: nextTl });
      setScheduledExams((prev) => prev.map((e) => (e.id === extendExamId ? { ...e, settings: { ...e.settings, timeLimitMinutes: nextTl } } : e)));
      toast.success(language === 'ar' ? 'تمت زيادة الوقت بنجاح' : 'Time increased successfully');
      cancelExtend();
    } catch (err) {
      console.error('increase time error', err);
      toast.error(language === 'ar' ? 'فشل زيادة الوقت' : 'Failed to increase time');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      // جلب بيانات الامتحان للحصول على courseId أو معلومات إضافية لازمة للتنظيف
      let examMeta: any | null = null;
      try {
        examMeta = await ExamService.getExamById(examId);
      } catch {}

      await ExamService.deleteExam(examId);
      toast.success(language === 'ar' ? 'تم حذف الامتحان نهائياً' : 'Exam deleted permanently');
      // Clear edit state if deleting the edited exam
      if (editingExamId === examId) {
        cancelEdit();
      }

      // Refresh scheduled exams from courses + instructor with dedup
      const results: any[] = [];
      const seen = new Set<string>();
      for (const c of courses) {
        try {
          const exs = await ExamService.getScheduledExamsForCourse(c.id);
          exs.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
        } catch {}
      }
      try {
        const instructorExams = await ExamService.getScheduledExamsForInstructor(user?.uid || '');
        instructorExams.forEach((ex: any) => { if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); results.push(ex); } });
      } catch {}
      setScheduledExams(results);
    } catch (err) {
      console.error('deleteExam error', err);
      toast.error(language === 'ar' ? 'فشل حذف الامتحان' : 'Failed to delete exam');
    }
  };

  const addExamQuestion = (type: QuestionType) => {
    const newQuestion: ExamQuestion = { id: `q-${Date.now()}`, type, text: '', points: 1 };
    if (type === 'mcq') newQuestion.options = [];
    if (type === 'drag') newQuestion.items = [];
    setExam(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };



  const toggleOneWay = () => {
    setExam(prev => ({ ...prev, settings: { ...prev.settings, oneWay: !prev.settings.oneWay } }));
  };

  const toggleSchedule = () => {
    setExam(prev => ({ 
      ...prev, 
      settings: { 
        ...prev.settings, 
        scheduleEnabled: !prev.settings.scheduleEnabled, 
        scheduledAt: !prev.settings.scheduleEnabled ? prev.settings.scheduledAt : null 
      } 
    }));
  };

  const toggleManualGrading = () => {
    setExam(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        manualGradingEnabled: !prev.settings.manualGradingEnabled,
      },
    }));
  };

  const removeQuestion = (id: string) => {
    setExam(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const addOption = (qId: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        options: [...(q.options || []), { id: `opt-${Date.now()}`, text: '', correct: false }]
      } : q)
    }));
  };

  const updateOptionText = (qId: string, optId: string, text: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        options: (q.options || []).map(o => o.id === optId ? { ...o, text } : o)
      } : q)
    }));
  };

  const toggleOptionCorrect = (qId: string, optId: string) => {
    // Enforce single correct option (radio-style)
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        options: (q.options || []).map(o => ({ ...o, correct: o.id === optId }))
      } : q)
    }));
  };

  const updateDragItemText = (qId: string, itemId: string, text: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        items: (q.items || []).map(i => i.id === itemId ? { ...i, text } : i)
      } : q)
    }));
  };

  const addDragItem = (qId: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        items: [ ...(q.items || []), { id: `item-${Date.now()}`, text: '' } ]
      } : q)
    }));
  };

  // Update question points, min 1
  const updateQuestionPoints = (qId: string, pts: number) => {
    const safe = Number.isFinite(pts) ? Math.max(1, Math.floor(pts)) : 1;
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, points: safe } : q)
    }));
  };

  // Reorder drag items within a question
  const moveDragItem = (qId: string, itemId: string, dir: 'up' | 'down') => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        const items = [...(q.items || [])];
        const idx = items.findIndex(i => i.id === itemId);
        if (idx < 0) return q;
        const newIdx = dir === 'up' ? Math.max(0, idx - 1) : Math.min(items.length - 1, idx + 1);
        if (newIdx === idx) return q;
        const [it] = items.splice(idx, 1);
        items.splice(newIdx, 0, it);
        return { ...q, items };
      })
    }));
  };

  // Set current item order as the correct order for grading
  const setDragCorrectOrder = (qId: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? {
        ...q,
        correctOrder: (q.items || []).map(i => i.id)
      } : q)
    }));
    toast.success(language === 'ar' ? 'تم تعيين الترتيب الصحيح' : 'Correct order set');
  };

  // Compress image file to base64 (auto-resize large images)
  const compressImageToBase64 = (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleQuestionImageFile = async (qId: string, file?: File) => {
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file);
      setExam(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === qId ? { ...q, imageBase64: base64, imageWidth: (q as any).imageWidth || 320, imagePosition: (q as any).imagePosition || 'below' } : q)
      }));
      toast.success(language === 'ar' ? 'تم إضافة صورة للسؤال' : 'Question image added');
    } catch (e) {
      console.error(e);
      toast.error(language === 'ar' ? 'فشل ضغط الصورة' : 'Failed to compress image');
    }
  };

  const setQuestionImagePosition = (qId: string, pos: 'above' | 'below' | 'left' | 'right') => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, imagePosition: pos } : q)
    }));
  };

  const [resizing, setResizing] = useState<{ qId: string | null; startX: number; startWidth: number }>({ qId: null, startX: 0, startWidth: 0 });
  const startImageResize = (qId: string, startX: number, startWidth: number) => {
    setResizing({ qId, startX, startWidth });
  };

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizing.qId) return;
      const dx = e.clientX - resizing.startX;
      const nextW = Math.max(120, resizing.startWidth + dx);
      setExam(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === resizing.qId ? { ...q, imageWidth: nextW } : q)
      }));
    }
    function onUp() {
      if (!resizing.qId) return;
      setResizing({ qId: null, startX: 0, startWidth: 0 });
    }
    if (resizing.qId) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  useEffect(() => {
    async function loadSelectedStudent() {
      if (examSubsection !== 'grading_detail' || !selectedStudentId) return;
      try {
        const s = await StudentService.getStudentById(selectedStudentId);
        if (s) {
          setGradingDetailStudentName(prev => prev || s.fullName || '');
          setGradingDetailPhotoURL(s.photoURL || '');
          setGradingDetailStudentPhone(s.studentPhone || '');
          setGradingDetailParentPhone(s.parentPhone || '');
        }
      } catch (err) {
        console.warn('Failed to load student info for grading detail', err);
      }
    }
    loadSelectedStudent();
  }, [examSubsection, selectedStudentId]);

  const saveExam = async () => {
    if (!user?.uid) {
      toast.error(language === 'ar' ? 'يجب تسجيل الدخول كمدرس' : 'You must be logged in as a teacher');
      return;
    }
    if (!exam.title.trim()) {
      toast.error(language === 'ar' ? 'أدخل عنوان الامتحان' : 'Enter an exam title');
      return;
    }
    if (!exam.courseId) {
      toast.error(language === 'ar' ? 'اختر الدورة للامتحان' : 'Select a course for the exam');
      return;
    }
    if (exam.questions.length === 0) {
      toast.error(language === 'ar' ? 'أضف على الأقل سؤالاً واحداً' : 'Add at least one question');
      return;
    }

    // Require scheduling fields (open time and window end) for exam creation
    if (!exam.settings.scheduledAt || (exam.settings.scheduledAt || '').trim() === '') {
      toast.error(language === 'ar' ? 'يرجى تحديد وقت الفتح (حقل إلزامي)' : 'Please set an Open time (required)');
      return;
    }
    if (!exam.settings.windowEndAt || (exam.settings.windowEndAt || '').trim() === '') {
      toast.error(language === 'ar' ? 'يرجى تحديد وقت نهاية نافذة الدخول' : 'Please set the entry window end time');
      return;
    }
    // Validate windowEndAt after scheduledAt
    try {
      const start = new Date(exam.settings.scheduledAt!);
      const end = new Date(exam.settings.windowEndAt!);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        toast.error(language === 'ar' ? 'وقت نهاية النافذة يجب أن يكون بعد وقت الفتح' : 'Entry window end must be after open time');
        return;
      }
    } catch {
      toast.error(language === 'ar' ? 'تواريخ غير صالحة' : 'Invalid dates');
      return;
    }

    // ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø§Øª Ø§Ù„ØµØ­ÙŠØ­Ø© Ø¹Ù†Ø¯ Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„ØªØµØ­ÙŠØ­ Ø§Ù„ÙŠØ¯ÙˆÙŠ (ØªØµØ­ÙŠØ­ ØªÙ„Ù‚Ø§Ø¦ÙŠ)
    if (!exam.settings.manualGradingEnabled) {
      for (let idx = 0; idx < exam.questions.length; idx++) {
        const q = exam.questions[idx];
        const qNum = idx + 1;
        if (q.type === 'mcq') {
          const opts = (q.options || []).filter(o => (o.text || '').trim().length > 0);
          const hasCorrect = opts.some(o => o.correct === true);
          if (!hasCorrect) {
            toast.error(language === 'ar' ? `السؤال ${qNum}: يجب تحديد خيار صحيح واحد على الأقل` : `Question ${qNum}: select at least one correct option`);
            return;
          }
        } else if (q.type === 'fill') {
          const ans = (q.answer || '').trim();
          if (!ans) {
            toast.error(language === 'ar' ? `السؤال ${qNum}: أدخل الإجابة الصحيحة` : `Question ${qNum}: enter the correct answer`);
            return;
          }
        } else if (q.type === 'drag') {
          const items = (q.items || []).filter(i => (i.text || '').trim().length > 0);
          const ids = items.map(i => i.id);
          const order = Array.isArray(q.correctOrder) ? q.correctOrder : [];
          const coversAll = order.length === ids.length && order.every(id => ids.includes(id));
          if (!coversAll) {
            toast.error(language === 'ar' ? `السؤال ${qNum}: عيّن ترتيب العناصر الصحيح كإجابة` : `Question ${qNum}: set the correct item order as the answer`);
            return;
          }
        }
      }
    }

    // Require exam time limit before publishing
    if (!exam.settings.timeLimitMinutes || exam.settings.timeLimitMinutes <= 0) {
      toast.error(language === 'ar' ? 'يرجى تحديد وقت الامتحان (بالدقائق)' : 'Please set exam time limit (minutes)');
      return;
    }

    setSavingExam(true);
    try {
      // ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸
      const sanitizedQuestions = exam.questions.map((q) => {
        const base = { id: q.id, type: q.type, text: q.text, points: q.points ?? 1 } as any;
        if (q.type === 'mcq') {
          base.options = (q.options || []).filter((o) => o.text && o.text.trim().length > 0);
        } else if (q.type === 'fill') {
          base.answer = (q.answer || '').trim();
        } else if (q.type === 'drag') {
          base.items = (q.items || []).filter((i) => i.text && i.text.trim().length > 0);
          base.correctOrder = Array.isArray(q.correctOrder) && q.correctOrder.length > 0
            ? q.correctOrder
            : base.items.map((i: any) => i.id);
        }
        // include optional image fields for question
        if (q.imageBase64) base.imageBase64 = q.imageBase64;
        if (q.imagePosition) base.imagePosition = q.imagePosition;
        if (typeof q.imageWidth === 'number') base.imageWidth = q.imageWidth;
        return base;
      });

      const examId = await ExamService.createExam({
        title: exam.title.trim(),
        courseId: exam.courseId,
        instructorId: user.uid,
        questions: sanitizedQuestions,
        settings: {
          secureMode: false,
          timeLimitMinutes: exam.settings.timeLimitMinutes ?? null,
          oneWay: !!exam.settings.oneWay,
          scheduleEnabled: true,
          scheduledAt: exam.settings.scheduledAt || null,
          windowEndAt: exam.settings.windowEndAt || null,
          manualGradingEnabled: !!exam.settings.manualGradingEnabled,
        },
      });

      // Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø³Ø¬Ù„ÙŠÙ† ÙÙŠ Ø§Ù„Ø¯ÙˆØ±Ø©
      try {
        const teacherStudents = await StudentService.getStudentsByTeacher(user.uid);
        let notified = 0;
        for (const s of teacherStudents) {
          const enrolled = (s.enrolledCourses || []).includes(exam.courseId!);
          if (!enrolled) continue;
          await NotificationService.createNotification({
            userId: s.id,
            title: language === 'ar' ? 'امتحان جديد' : 'New Exam',
            message: language === 'ar'
              ? `تم نشر امتحان "${exam.title}" في دورتك.`
              : `Exam "${exam.title}" has been published in your course.`,
            type: 'info',
            courseId: exam.courseId!,
            teacherId: user.uid,
          });
          notified++;
        }
        toast.success(
          language === 'ar'
            ? `تم حفظ الامتحان وإشعار ${notified} طالباً`
            : `Exam saved and ${notified} students notified`
        );
      } catch (notifyErr) {
        console.error('Error sending notifications:', notifyErr);
        toast.success(t.savedExam);
      }

      // Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø· Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø¬Ø²Ø¦ÙŠØ§Ù‹ Ù…Ø¹ Ø¥Ø¨Ù‚Ø§Ø¡ Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
      setExam({
        title: '',
        courseId: exam.courseId,
        questions: [],
        settings: {
          secureMode: false,
          timeLimitMinutes: null,
          oneWay: false,
          scheduleEnabled: false,
          scheduledAt: null,
        },
      });
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error(language === 'ar' ? 'فشل حفظ الامتحان' : 'Failed to save exam');
    } finally {
      setSavingExam(false);
    }
  };

  const saveAssignment = async () => {
    try {
      const title = assignment.title.trim();
      if (!title || !assignment.courseId) {
        toast.error(language === 'ar' ? 'يرجى إدخال العنوان وتحديد الدورة' : 'Please enter title and select course');
        return;
      }
      if (assignment.questions.length === 0) {
        toast.error(language === 'ar' ? 'أضف على الأقل سؤالاً واحداً' : 'Add at least one question');
        return;
      }
      const sanitized = assignment.questions.map((q) => {
        const opts = (q.options || [])
          .filter((o) => o.text && o.text.trim().length > 0)
          .map((o) => ({ id: o.id, text: o.text.trim(), correct: !!o.correct }));

        const imgBase64 = q.imageBase64 ?? null;
        const imgPos = q.imagePosition && typeof q.imagePosition.x === 'number' && typeof q.imagePosition.y === 'number'
          ? q.imagePosition
          : null;
        const imgWidth = typeof q.imageWidth === 'number' ? q.imageWidth : null;

        return {
          id: q.id,
          type: q.type || 'mcq',
          text: q.text?.trim() || '',
          options: opts,
          points: q.points || 1,
          imageBase64: imgBase64,
          imagePosition: imgPos,
          imageWidth: imgWidth,
        };
      });
      for (const q of sanitized) {
        if (!q.text) {
          toast.error(language === 'ar' ? 'يرجى كتابة نص السؤال' : 'Please write question text');
          return;
        }
        if ((q as any).type !== 'essay') {
          if (!q.options || q.options.length < 2) {
            toast.error(language === 'ar' ? 'كل سؤال يحتاج خيارين على الأقل' : 'Each question needs at least two options');
            return;
          }
          if (!assignment.manualGradingEnabled && !q.options.some((o) => o.correct)) {
            toast.error(language === 'ar' ? 'يجب تحديد الإجابة الصحيحة لكل سؤال' : 'Mark a correct option for each question');
            return;
          }
        }
      }
      const id = await AssignmentService.createAssignment({
        title,
        courseId: assignment.courseId!,
        instructorId: user?.uid || '',
        questions: sanitized as any,
        manualGradingEnabled: assignment.manualGradingEnabled === true,
      });
      // Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ù„Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø³Ø¬Ù„ÙŠÙ† ÙÙŠ Ø§Ù„Ø¯ÙˆØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©
      try {
        const course = await CourseService.getCourseById(assignment.courseId!);
        const courseTitle = course?.title || course?.titleAr || '';
        const teacherStudents = await StudentService.getStudentsByTeacher(user?.uid || '');
        let notified = 0;
        for (const s of teacherStudents) {
          if (Array.isArray(s.enrolledCourses) && s.enrolledCourses.includes(assignment.courseId!)) {
            await NotificationService.createNotification({
              userId: s.id,
              title: language === 'ar' ? 'تم إضافة واجب' : 'New Assignment Added',
              message: language === 'ar'
                ? `تم إضافة واجب "${title}" في دورة "${courseTitle}".`
                : `An assignment "${title}" was added to course "${courseTitle}".`,
              type: 'info',
              courseId: assignment.courseId!,
              teacherId: user?.uid || '',
            });
            notified++;
          }
        }
        if (notified > 0) {
          toast.success(language === 'ar' ? `تم نشر الواجب وإرسال إشعار (${notified})` : `Assignment published and notifications sent (${notified})`);
        } else {
          toast.success(language === 'ar' ? 'تم نشر الواجب' : 'Assignment published');
        }
      } catch (e) {
        console.warn('Assignment notification failed', e);
        toast.success(language === 'ar' ? 'تم نشر الواجب (تعذر إرسال الإشعارات)' : 'Assignment published (notifications failed)');
      }
      // Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù†Ù…ÙˆØ°Ø¬
      setAssignment({ title: '', courseId: null, questions: [] });
    } catch (e) {
      console.error('saveAssignment failed', e);
      toast.error(language === 'ar' ? 'تعذر حفظ الواجب' : 'Failed to save assignment');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={teacherName} />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />

        
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t.pageTitle}</h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'أنشئ الامتحانات والواجبات وحدّدها على دوراتك' 
                : 'Create exams and assignments and assign them to your courses'}
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <Button
              variant={activeSection === 'exams' ? 'default' : 'outline'}
              onClick={() => setActiveSection('exams')}
            >
              {language === 'ar' ? 'إضافة وإدارة الامتحانات' : 'Add & Manage Exams'}
            </Button>
            <Button
              variant={activeSection === 'assignments' ? 'default' : 'outline'}
              onClick={() => setActiveSection('assignments')}
            >
              {language === 'ar' ? 'إضافة وإدارة الواجبات' : 'Add & Manage Assignments'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              <div className={activeSection === 'exams' ? 'block' : 'hidden'}>
                {examSubsection === 'create' ? (<div>
                  <div className="p-3 text-sm text-muted-foreground">{t.sectionExam}</div>

              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> {language === 'ar' ? 'إنشاء امتحان' : 'Create Exam'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm">{language === 'ar' ? 'عنوان الامتحان' : 'Exam title'}</label>
                    <Input value={exam.title} onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))} placeholder={language === 'ar' ? 'اكتب عنوان الامتحان' : 'Enter exam title'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">{language === 'ar' ? 'اختيار الدورة' : 'Select course'}</label>
                      <select
                        className="w-full border rounded h-10 px-3 bg-background"
                        value={exam.courseId || ''}
                        onChange={(e) => setExam(prev => ({ ...prev, courseId: e.target.value || null }))}
                      >
                        <option value="">{language === 'ar' ? 'اختر دورة' : 'Choose a course'}</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.titleAr || c.title || c.name || c.id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> {language === 'ar' ? 'مدة الامتحان (دقائق)' : 'Exam duration (minutes)'}</label>
                      <Input
                        type="number"
                        min={1}
                        value={exam.settings.timeLimitMinutes ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExam(prev => ({
                            ...prev,
                            settings: { ...prev.settings, timeLimitMinutes: val === '' ? null : Math.max(1, Number(val) || 0) }
                          }));
                        }}
                        placeholder={language === 'ar' ? 'مثال: 60' : 'e.g., 60'}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> {language === 'ar' ? 'وقت الفتح (حقل إلزامي)' : 'Open time (required)'}</label>
                      <Input
                        type="datetime-local"
                        required
                        value={exam.settings.scheduledAt || ''}
                        onChange={(e) => setExam(prev => ({
                          ...prev,
                          settings: { ...prev.settings, scheduledAt: e.target.value, scheduleEnabled: true }
                        }))}
                      />
                      <label className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> {language === 'ar' ? 'وقت نهاية نافذة الدخول (حقل إلزامي)' : 'Entry window end (required)'}</label>
                      <Input
                        type="datetime-local"
                        required
                        value={exam.settings.windowEndAt || ''}
                        onChange={(e) => setExam(prev => ({
                          ...prev,
                          settings: { ...prev.settings, windowEndAt: e.target.value, scheduleEnabled: true }
                        }))}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={exam.settings.oneWay} onCheckedChange={() => toggleOneWay()} />
                      <span className="text-sm">{language === 'ar' ? 'التنقل باتجاه واحد (بدون رجوع)' : 'One-way navigation (no back)'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={exam.settings.manualGradingEnabled} onCheckedChange={() => toggleManualGrading()} />
                      <span className="text-sm">{language === 'ar' ? 'تمكين التصحيح اليدوي' : 'Enable manual grading'}</span>
                    </div>
                  </div>
                  {/* Questions builder */}
                  <div className="mt-6 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => addExamQuestion('mcq')}>
                        <PlusCircle className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة سؤال اختيار من متعدد' : 'Add MCQ question'}
                      </Button>
                      <Button variant="secondary" onClick={() => addExamQuestion('fill')}>
                        <PlusCircle className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة سؤال فراغ' : 'Add Fill question'}
                      </Button>
                      <Button variant="secondary" onClick={() => addExamQuestion('drag')}>
                        <PlusCircle className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة سؤال ترتيب/سحب' : 'Add Drag/Order question'}
                      </Button>
                      {exam.settings.manualGradingEnabled && (
                        <Button variant="secondary" onClick={() => addExamQuestion('essay')}>
                          <PlusCircle className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة سؤال مقالي' : 'Add Essay question'}
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {exam.questions.map((q) => (
                        <div key={q.id} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">{q.type}</Badge>
                            <div className="flex items-center gap-2">
                              <label className="text-sm flex items-center gap-2">
                                {language === 'ar' ? 'الدرجة' : 'Points'}
                              </label>
                              <Input
                                type="number"
                                min={1}
                                className="w-20"
                                value={q.points ?? 1}
                                onChange={(e) => updateQuestionPoints(q.id, Number(e.target.value))}
                              />
                              <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>
                                <Trash2 className="h-4 w-4 mr-1" />{language === 'ar' ? 'حذف' : 'Remove'}
                              </Button>
                            </div>
                          </div>

                          <div className={(q as any).imageBase64 && (((q as any).imagePosition === 'left') || ((q as any).imagePosition === 'right')) ? 'flex items-start gap-3 mb-2' : 'mb-2'}>
                            {(q as any).imageBase64 && (q as any).imagePosition === 'left' && (
                              <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                            )}
                            <div className="flex-1">
                              <label className="text-sm font-medium mb-1 block">{language === 'ar' ? 'نص السؤال' : 'Question Text'}</label>
                              <Textarea
                                value={q.text}
                                onChange={(e) => setExam(prev => ({
                                  ...prev,
                                  questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, text: e.target.value } : qq)
                                }))}
                                placeholder={language === 'ar' ? 'اكتب نص السؤال هنا' : 'Type question text here'}
                              />
                            </div>
                            {(q as any).imageBase64 && (q as any).imagePosition === 'right' && (
                              <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                            )}
                          </div>
                          {(q as any).imageBase64 && (q as any).imagePosition === 'below' && (
                            <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border mb-2" />
                          )}

                          <div className="space-y-2 mb-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm flex items-center gap-2">
                                <Upload className="h-4 w-4" />{language === 'ar' ? 'صورة السؤال' : 'Question image'}
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleQuestionImageFile(q.id, file);
                                }}
                              />
                            </div>
                            {(q as any).imageBase64 && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{language === 'ar' ? 'موضع الصورة:' : 'Image position:'}</span>
                                <Button variant={(q as any).imagePosition === 'above' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionImagePosition(q.id, 'above')}>{language === 'ar' ? 'أعلى' : 'Above'}</Button>
                                <Button variant={(q as any).imagePosition === 'below' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionImagePosition(q.id, 'below')}>{language === 'ar' ? 'أسفل' : 'Below'}</Button>
                                <Button variant={(q as any).imagePosition === 'left' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionImagePosition(q.id, 'left')}>{language === 'ar' ? 'يسار' : 'Left'}</Button>
                                <Button variant={(q as any).imagePosition === 'right' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionImagePosition(q.id, 'right')}>{language === 'ar' ? 'يمين' : 'Right'}</Button>
                                <span className="ml-3 text-sm">{language === 'ar' ? 'عرض:' : 'Width:'}</span>
                                <Input
                                  type="number"
                                  className="w-24"
                                  min={100}
                                  value={(q as any).imageWidth ?? 320}
                                  onChange={(e) => setExam(prev => ({
                                    ...prev,
                                    questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, imageWidth: Math.max(100, Number(e.target.value) || 320) } : qq)
                                  }))}
                                />
                              </div>
                            )}
                          </div>

                          {q.type === 'mcq' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{language === 'ar' ? 'خيارات السؤال' : 'Question options'}</span>
                                <Button variant="outline" size="sm" onClick={() => addOption(q.id)}>
                                  <PlusCircle className="h-4 w-4 mr-1" />{language === 'ar' ? 'إضافة خيار' : 'Add option'}
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {(q.options || []).map((opt) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <Input
                                      className="flex-1"
                                      value={opt.text}
                                      onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                                      placeholder={language === 'ar' ? 'نص الخيار' : 'Option text'}
                                    />
                                    {!exam.settings.manualGradingEnabled && (
                                      <Button
                                        variant={opt.correct ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleOptionCorrect(q.id, opt.id)}
                                        title={language === 'ar' ? 'تعيين كإجابة صحيحة' : 'Mark as correct'}
                                      >
                                        <CheckSquare className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.type === 'fill' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{language === 'ar' ? 'الإجابة الصحيحة' : 'Correct answer'}</label>
                              <Input
                                value={q.answer || ''}
                                onChange={(e) => setExam(prev => ({
                                  ...prev,
                                  questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, answer: e.target.value } : qq)
                                }))}
                                placeholder={language === 'ar' ? 'أدخل الإجابة الصحيحة' : 'Enter correct answer'}
                              />
                            </div>
                          )}

                          {q.type === 'drag' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{language === 'ar' ? 'عناصر الترتيب' : 'Order items'}</span>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => addDragItem(q.id)}>
                                    <PlusCircle className="h-4 w-4 mr-1" />{language === 'ar' ? 'إضافة عنصر' : 'Add item'}
                                  </Button>
                                  {!exam.settings.manualGradingEnabled && (
                                    <Button variant="outline" size="sm" onClick={() => setDragCorrectOrder(q.id)}>
                                      <ListOrdered className="h-4 w-4 mr-1" />{language === 'ar' ? 'تعيين الترتيب الصحيح' : 'Set correct order'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(q.items || []).map((it) => (
                                  <div key={it.id} className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => moveDragItem(q.id, it.id, 'up')} title={language === 'ar' ? 'أعلى' : 'Up'}>
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => moveDragItem(q.id, it.id, 'down')} title={language === 'ar' ? 'أسفل' : 'Down'}>
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Input
                                      className="flex-1"
                                      value={it.text}
                                      onChange={(e) => updateDragItemText(q.id, it.id, e.target.value)}
                                      placeholder={language === 'ar' ? 'نص العنصر' : 'Item text'}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.type === 'essay' && (
                            <div className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'سؤال مقالي: سيتم تصحيحه يدوياً.' : 'Essay question: will be graded manually.'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setExam({ title: '', courseId: null, questions: [], settings: { secureMode: false, timeLimitMinutes: null, oneWay: false, scheduleEnabled: false, scheduledAt: null, windowEndAt: null, manualGradingEnabled: false } })}>
                      {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    </Button>
                    <Button onClick={saveExam}>{language === 'ar' ? 'حفظ الامتحان' : 'Save Exam'}</Button>
                  </div>
                </CardContent>
              </Card>
              </div>) : null}

              {examSubsection === 'grading_inbox' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><Award className="h-5 w-5" /> {language === 'ar' ? 'صندوق التصحيح' : 'Grading Inbox'}</span>
                      <Button variant="outline" size="sm" onClick={backToCreateExam}>{language === 'ar' ? 'عودة' : 'Back'}</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gradingExamMeta ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الامتحان:' : 'Exam:'} {gradingExamMeta.title}
                      </div>
                    ) : null}
                    {gradingLoading ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'جاري تحميل الطلاب...' : 'Loading students...'}
                      </div>
                    ) : gradingCandidates.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'لا توجد تسليمات بانتظار التصحيح' : 'No pending submissions to grade'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {gradingCandidates.map((c, idx) => (
                          <div key={`${c.studentId}-${(c as any)?.submittedAt?.getTime?.() ?? (c as any)?.submittedAt?.toMillis?.() ?? idx}`} className="flex items-center justify-between border rounded p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={c.photoURL || ''} />
                                <AvatarFallback>{(c.studentName || 'S').charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{c.studentName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {c.studentPhone ? (
                                    <>
                                      <span>{language === 'ar' ? 'هاتف الطالب:' : 'Student phone:'} </span>
                                      <a href={`tel:${c.studentPhone}`} className="underline">{c.studentPhone}</a>
                                    </>
                                  ) : null}
                                  {c.parentPhone ? (
                                    <>
                                      <span className="ml-2">{language === 'ar' ? 'هاتف ولي الأمر:' : 'Parent phone:'} </span>
                                      <a href={`tel:${c.parentPhone}`} className="underline">{c.parentPhone}</a>
                                    </>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {language === 'ar' ? 'سُلّم في:' : 'Submitted at:'} {c.submittedAt ? new Date(c.submittedAt as any).toLocaleString() : '-'}
                                </div>
                              </div>
                            </div>
                            <Button variant="default" size="sm" onClick={() => openStudentGrading(c)}>
                              {language === 'ar' ? 'تصحيح' : 'Grade'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {examSubsection === 'auto_results' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><Award className="h-5 w-5" /> {language === 'ar' ? 'النتائج الآلية' : 'Auto Results'}</span>
                      <Button variant="outline" size="sm" onClick={backToCreateExam}>{language === 'ar' ? 'عودة' : 'Back'}</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {autoResultsExamMeta ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الامتحان:' : 'Exam:'} {autoResultsExamMeta.title}
                      </div>
                    ) : null}
                    {autoResultsLoading ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'جاري تحميل النتائج...' : 'Loading results...'}
                      </div>
                    ) : autoResultsList.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {autoResultsList.map((r, idx) => (
                          <div key={`${r.studentId}-${(r as any)?.submittedAt?.getTime?.() ?? (r as any)?.submittedAt?.toMillis?.() ?? idx}`} className="flex items-center justify-between border rounded p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={r.photoURL || ''} />
                                <AvatarFallback>{(r.studentName || 'S').charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{r.studentName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {r.studentPhone ? (
                                    <>
                                      <span>{language === 'ar' ? 'هاتف الطالب:' : 'Student phone:'} </span>
                                      <a href={`tel:${r.studentPhone}`} className="underline">{r.studentPhone}</a>
                                    </>
                                  ) : null}
                                  {r.parentPhone ? (
                                    <>
                                      <span className="ml-2">{language === 'ar' ? 'هاتف ولي الأمر:' : 'Parent phone:'} </span>
                                      <a href={`tel:${r.parentPhone}`} className="underline">{r.parentPhone}</a>
                                    </>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {language === 'ar' ? 'النتيجة:' : 'Score:'} {typeof r.score === 'number' ? r.score : '-'}{typeof r.total === 'number' ? ` / ${r.total}` : ''}
                                </div>
                                {r.submittedAt ? (
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'قدّم في:' : 'Submitted at:'} {new Date(r.submittedAt as any).toLocaleString()}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <Button variant="default" size="sm" onClick={() => openAutoDetail(r)}>
                              {language === 'ar' ? 'عرض' : 'View'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {examSubsection === 'auto_detail' && autoResultsExamMeta && autoDetailStudentId && (
                <div className="p-3 text-sm text-muted-foreground">{language === 'ar' ? 'تفاصيل النتائج الآلية' : 'Auto detail (temporarily simplified)'}</div>
              )}

              {examSubsection === 'grading_detail' && gradingExamMeta && selectedStudentId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><Award className="h-5 w-5" /> {language === 'ar' ? 'تصحيح إجابات الطالب' : 'Grade Student Answers'}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={backFromDetail}>{language === 'ar' ? 'رجوع إلى القائمة' : 'Back to list'}</Button>
                        <Button variant="secondary" size="sm" onClick={backToCreateExam}>{language === 'ar' ? 'عودة' : 'Back'}</Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border rounded">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={gradingDetailPhotoURL || ''} />
                        <AvatarFallback>{(gradingDetailStudentName || 'S').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{gradingDetailStudentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {gradingDetailStudentPhone ? (
                            <>
                              <span>{language === 'ar' ? 'هاتف الطالب:' : 'Student phone:'} </span>
                              <a href={`tel:${gradingDetailStudentPhone}`} className="underline">{gradingDetailStudentPhone}</a>
                            </>
                          ) : null}
                          {gradingDetailParentPhone ? (
                            <>
                              <span className="ml-2">{language === 'ar' ? 'هاتف ولي الأمر:' : 'Parent phone:'} </span>
                              <a href={`tel:${gradingDetailParentPhone}`} className="underline">{gradingDetailParentPhone}</a>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {gradingExamMeta.questions?.map((q: any) => (
                        <div key={q.id} className="border rounded p-3">
                          {q.imageBase64 && q.imagePosition === 'above' && (
                            <img src={q.imageBase64} alt="question" style={{ width: (q.imageWidth ?? 320) }} className="rounded border mb-2" />
                          )}
                          <div className={q.imageBase64 && (q.imagePosition === 'left' || q.imagePosition === 'right') ? 'flex items-start gap-3' : ''}>
                            {q.imageBase64 && q.imagePosition === 'left' && (
                              <img src={q.imageBase64} alt="question" style={{ width: (q.imageWidth ?? 320) }} className="rounded border" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium mb-1">{q.text}</div>
                              <div className="text-sm text-muted-foreground">{renderAnswerDisplay(q)}</div>
                              {gradingExamMeta?.settings?.manualGradingEnabled && (
                                <div className="mt-3 flex items-center gap-3">
                                  <span className="text-sm">{language === 'ar' ? 'تقييم الإجابة' : 'Answer evaluation'}</span>
                                  <Button
                                    variant={gradingDetailCorrect[q.id] === true ? 'default' : 'outline'}
                                    size="icon"
                                    onClick={() => markCorrect(q.id, true)}
                                    title={language === 'ar' ? 'وضع علامة صحيح' : 'Mark correct'}
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    variant={gradingDetailCorrect[q.id] === false ? 'destructive' : 'outline'}
                                    size="icon"
                                    onClick={() => markCorrect(q.id, false)}
                                    title={language === 'ar' ? 'وضع علامة خطأ' : 'Mark incorrect'}
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                  <span className="text-xs text-muted-foreground">{language === 'ar' ? 'درجة السؤال:' : 'Question points:'} {q.points ?? 0}</span>
                                </div>
                              )}
                            </div>
                            {q.imageBase64 && q.imagePosition === 'right' && (
                              <img src={q.imageBase64} alt="question" style={{ width: (q.imageWidth ?? 320) }} className="rounded border" />
                            )}
                          </div>
                          {q.imageBase64 && q.imagePosition === 'below' && (
                            <img src={q.imageBase64} alt="question" style={{ width: (q.imageWidth ?? 320) }} className="rounded border mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">{language === 'ar' ? 'ملاحظات عامة' : 'Overall feedback'}</label>
                      <Textarea value={gradingDetailFeedback} onChange={(e) => setGradingDetailFeedback(e.target.value)} placeholder={language === 'ar' ? 'اكتب ملاحظات قصيرة (اختياري)' : 'Write short feedback (optional)'} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={backFromDetail}>{language === 'ar' ? 'رجوع' : 'Back'}</Button>
                      {gradingExamMeta?.settings?.manualGradingEnabled && (
                        <Button onClick={submitDetailGrade}>{language === 'ar' ? 'تم التصحيح' : 'Mark as graded'}</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              </div>
              </div>

              {activeSection === 'assignments' && (
              <div className="lg:col-span-2 space-y-6">
                {assignmentSubsection === 'create' ? (
                  <>
                  <div className="p-3 text-sm text-muted-foreground">{language === 'ar' ? 'إنشاء واجب' : 'Create Assignment'}</div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> {language === 'ar' ? 'إنشاء واجب جديد' : 'Create New Assignment'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm">{t.assignmentTitle}</label>
                          <Input value={assignment.title} onChange={(e) => setAssignment(prev => ({ ...prev, title: e.target.value }))} placeholder={language === 'ar' ? 'اكتب عنوان الواجب' : 'Enter assignment title'} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm">{t.selectCourse}</label>
                          <select
                            className="w-full border rounded px-3 py-2"
                            value={assignment.courseId || ''}
                            onChange={(e) => setAssignment(prev => ({ ...prev, courseId: e.target.value || null }))}
                          >
                            <option value="">{language === 'ar' ? 'اختر الدورة' : 'Select course'}</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>{c.title || c.titleAr || c.name || c.id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="assignment-manual" checked={assignment.manualGradingEnabled === true} onCheckedChange={(v) => setAssignment(prev => ({ ...prev, manualGradingEnabled: !!v }))} />
                        <label htmlFor="assignment-manual" className="text-sm cursor-pointer">{language === 'ar' ? 'تمكين التصحيح اليدوي (اختياري)' : 'Enable manual grading (optional)'}</label>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{language === 'ar' ? 'أسئلة الواجب' : 'Assignment Questions'}</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={addAssignmentQuestion}><PlusCircle className="h-4 w-4" /> {language === 'ar' ? 'إضافة سؤال' : 'Add Question'}</Button>
                            {assignment.manualGradingEnabled ? (
                              <Button variant="outline" size="sm" onClick={addEssayAssignmentQuestion}><PlusCircle className="h-4 w-4" /> {language === 'ar' ? 'إضافة سؤال مقالي' : 'Add Essay Question'}</Button>
                            ) : null}
                          </div>
                        </div>
                        {assignment.questions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد أسئلة بعد' : 'No questions yet'}</div>
                        ) : (
                          <div className="space-y-4">
                            {assignment.questions.map((q) => (
                              <div key={q.id} className="border rounded p-3 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
                                  <div className="md:col-span-4 space-y-2">
                                    <label className="text-xs text-muted-foreground">{t.questionText}</label>
                                    <Textarea value={q.text} onChange={(e) => setAssignment(prev => ({ ...prev, questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, text: e.target.value } : qq) }))} placeholder={language === 'ar' ? 'نص السؤال...' : 'Question text...'} />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">{t.questionPoints}</label>
                                    <Input type="number" min={1} value={q.points} onChange={(e) => setAssignment(prev => ({ ...prev, questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, points: Math.max(1, Number(e.target.value) || 1) } : qq) }))} />
                                  </div>
                                </div>
                                {q.type === 'essay' ? (
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'هذا سؤال مقالي وسيتم تصحيحه يدويًا' : 'This is an essay question and will be graded manually.'}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-medium">{language === 'ar' ? 'خيارات السؤال' : 'Options'}</div>
                                      <Button variant="outline" size="sm" onClick={() => addAssignmentOption(q.id)}><PlusCircle className="h-4 w-4" /> {language === 'ar' ? 'إضافة خيار' : 'Add Option'}</Button>
                                    </div>
                                    {q.options.length === 0 ? (
                                      <div className="text-xs text-muted-foreground">{language === 'ar' ? 'أضف خيارين على الأقل' : 'Add at least two options'}</div>
                                    ) : (
                                      <div className="space-y-2">
                                        {q.options.map((opt) => (
                                          <div key={opt.id} className="flex items-center gap-2">
                                            {/* Hide correct selector when manual grading is enabled */}
                                            {!assignment.manualGradingEnabled ? (
                                              <Checkbox checked={opt.correct} onCheckedChange={(v) => setAssignment(prev => ({ ...prev, questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, options: qq.options.map(o => o.id === opt.id ? { ...o, correct: !!v } : o) } : qq) }))} />
                                            ) : null}
                                            <Input className="flex-1" value={opt.text} onChange={(e) => setAssignment(prev => ({ ...prev, questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, options: qq.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o) } : qq) }))} placeholder={t.optionText} />
                                            <Button variant="ghost" size="sm" onClick={() => setAssignment(prev => ({ ...prev, questions: prev.questions.map(qq => qq.id === q.id ? { ...qq, options: qq.options.filter(o => o.id !== opt.id) } : qq) }))}>{language === 'ar' ? 'حذف' : 'Remove'}</Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-end">
                                  <Button variant="destructive" size="sm" onClick={() => removeAssignmentQuestion(q.id)}>{language === 'ar' ? 'حذف السؤال' : 'Delete Question'}</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setAssignment({ title: '', courseId: null, questions: [], manualGradingEnabled: assignment.manualGradingEnabled })}>{language === 'ar' ? 'إعادة تعيين' : 'Reset'}</Button>
                        <Button onClick={saveAssignment}>{assignment.manualGradingEnabled ? (language === 'ar' ? 'نشر الواجب' : 'Publish Assignment') : t.saveAssignment}</Button>
                      </div>
                    </CardContent>
                  </Card>
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">{language === 'ar' ? 'تصحيح الواجب' : 'Grade Assignment'}</span>
                        <Button variant="outline" size="sm" onClick={() => setAssignmentSubsection('create')}>{language === 'ar' ? 'رجوع' : 'Back'}</Button>
                      </CardTitle>
                      <div className="mt-2 flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={assignmentGradingStudent?.photoURL || ''} />
                          <AvatarFallback>{(assignmentGradingStudent?.name || 'طالب').slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{assignmentGradingStudent?.name || (language === 'ar' ? 'طالب' : 'Student')}</div>
                          <div className="text-xs text-muted-foreground">{language === 'ar' ? 'هاتف الطالب:' : 'Student Phone:'} {assignmentGradingStudent?.studentPhone || '—'}</div>
                          <div className="text-xs text-muted-foreground">{language === 'ar' ? 'هاتف ولي الأمر:' : 'Parent Phone:'} {assignmentGradingStudent?.parentPhone || '—'}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">{language === 'ar' ? 'الواجب:' : 'Assignment:'} {assignmentGradingMeta?.title || '—'}</div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {(assignmentGradingMeta?.questions || []).map((q: any, idx: number) => {
                          const ans = assignmentGradingAttempt?.answers?.[q.id];
                          let ansText = '';
                          if (q.type === 'mcq') {
                            const opt = (q.options || []).find((o: any) => o.id === ans);
                            ansText = opt ? opt.text : '—';
                          } else {
                            ansText = ans ? String(ans) : '—';
                          }
                          const isCorrect = assignmentGradingCorrect[q.id];
                          const awarded = assignmentGradingPoints[q.id] ?? 0;
                          const maxPts = q.points || 0;
                          return (
                            <div key={q.id} className="border rounded p-3 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">{language === 'ar' ? `سؤال ${idx + 1}` : `Question ${idx + 1}`}</div>
                                  <div className="mt-1">{q.text}</div>
                                  <div className="mt-2 text-sm">{language === 'ar' ? 'إجابة الطالب:' : 'Student answer:'} <span className="font-semibold">{ansText}</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant={isCorrect === true ? 'default' : 'outline'} size="sm" onClick={() => setAssignmentGradingCorrect(prev => ({ ...prev, [q.id]: true }))}><CheckCircle2 className="h-4 w-4" /></Button>
                                  <Button variant={isCorrect === false ? 'destructive' : 'outline'} size="sm" onClick={() => setAssignmentGradingCorrect(prev => ({ ...prev, [q.id]: false }))}><XCircle className="h-4 w-4" /></Button>
                                  <div className="flex items-center gap-1">
                                    <Input type="number" className="w-20" min={0} max={maxPts} value={awarded} onChange={(e) => setAssignmentGradingPoints(prev => ({ ...prev, [q.id]: Math.min(Math.max(0, Number(e.target.value) || 0), maxPts) }))} />
                                    <span className="text-xs text-muted-foreground">/ {maxPts}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">{language === 'ar' ? 'ملاحظات عامة' : 'Overall feedback'}</label>
                        <Textarea value={assignmentGradingFeedback} onChange={(e) => setAssignmentGradingFeedback(e.target.value)} placeholder={language === 'ar' ? 'اكتب ملاحظات قصيرة (اختياري)' : 'Write short feedback (optional)'} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAssignmentSubsection('create')}>{language === 'ar' ? 'رجوع' : 'Back'}</Button>
                        <Button onClick={publishAssignmentGrade} disabled={publishingAssignment}>{language === 'ar' ? 'نشر درجة الطالب' : 'Publish Student Grade'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              )}

            {activeSection === 'assignments' && (
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Upload className="h-5 w-5" /> {language === 'ar' ? 'صندوق الوارد للواجبات' : 'Assignments Inbox'}</span>
                    <Button variant="outline" size="sm" onClick={loadAssignmentInbox}>{language === 'ar' ? 'تحديث' : 'Refresh'}</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignmentInboxLoading ? (
                    <div className="py-8 text-center text-muted-foreground">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                  ) : assignmentInboxItems.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">{language === 'ar' ? 'لا توجد تسليمات بانتظار التصحيح' : 'No pending submissions'}</div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                      {assignmentInboxItems.map((item: any) => (
                        <div key={item.attemptId} className="border rounded p-3">
                          <div className="font-medium">{item.assignmentTitle}</div>
                          <div className="text-sm">{language === 'ar' ? 'الطالب:' : 'Student:'} {item.studentName}</div>
                          {item.courseTitle && (
                            <div className="text-xs text-muted-foreground">{language === 'ar' ? 'الدورة:' : 'Course:'} {item.courseTitle}</div>
                          )}
                          {item.submittedAt && (
                            <div className="text-xs text-muted-foreground">{language === 'ar' ? 'قدّم في:' : 'Submitted at:'} {new Date(item.submittedAt).toLocaleString()}</div>
                          )}
                          <div className="mt-3">
                            <Button size="sm" onClick={() => openAssignmentGrading(item)}>{language === 'ar' ? 'تصحيح' : 'Grade'}</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            )}
            {activeSection === 'exams' && (
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      {language === 'ar' ? 'الامتحانات الجارية أو القادمة' : 'Ongoing or Upcoming Exams'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const items = (scheduledExams || []).filter((ex: any) => {
                        const openAt = ex.scheduledAt ? new Date(ex.scheduledAt as any) : null;
                        const tlRaw = ex.settings?.timeLimitMinutes;
                        const tl = typeof tlRaw === 'number' ? tlRaw : (tlRaw != null ? Number(tlRaw) : undefined);
                        const windowEnd = ex.settings?.windowEndAt ? new Date(ex.settings.windowEndAt as any) : null;
                        const windowEndMs = windowEnd
                          ? windowEnd.getTime()
                          : (openAt && typeof tl === 'number' && !Number.isNaN(tl) ? openAt.getTime() + tl * 60000 : null);
                        const ended = windowEndMs !== null && nowMs >= windowEndMs;
                        return !ended; // show upcoming or ongoing
                      }).sort((a: any, b: any) => {
                        const aOpen = a.scheduledAt ? new Date(a.scheduledAt as any).getTime() : 0;
                        const bOpen = b.scheduledAt ? new Date(b.scheduledAt as any).getTime() : 0;
                        return aOpen - bOpen;
                      });
                      if (items.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'لا توجد امتحانات مجدولة حالياً' : 'No scheduled exams yet'}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                          {items.map((ex: any) => {
                            const openAt = ex.scheduledAt ? new Date(ex.scheduledAt as any) : null;
                            const openMs = openAt ? openAt.getTime() : 0;
                            const tlRaw = ex.settings?.timeLimitMinutes;
                            const tl = typeof tlRaw === 'number' ? tlRaw : (tlRaw != null ? Number(tlRaw) : undefined);
                            const windowEnd = ex.settings?.windowEndAt ? new Date(ex.settings.windowEndAt as any) : null;
                            const windowEndMs = windowEnd
                              ? windowEnd.getTime()
                              : (openAt && typeof tl === 'number' && !Number.isNaN(tl) ? openAt.getTime() + tl * 60000 : null);
                            const isUpcoming = openMs > nowMs;
                            const isOngoing = !isUpcoming && (windowEndMs === null || nowMs < windowEndMs);
                            const timeRemaining = calculateTimeRemaining(ex, nowMs);
                            
                            return (
                              <div key={ex.id} className="border rounded p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{ex.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {(ex.courseTitle || ex.courseId) ? (
                                        <>
                                          {language === 'ar' ? 'الدورة: ' : 'Course: '} {ex.courseTitle || ex.courseId}
                                          {' • '}
                                        </>
                                      ) : null}
                                      {language === 'ar' ? 'يفتح: ' : 'Opens: '} {openAt ? openAt.toLocaleString() : '—'}
                                      {tl ? (<> {' • '} {language === 'ar' ? 'المدة: ' : 'Duration: '} {tl} {language === 'ar' ? 'دقائق' : 'min'}</>) : null}
                                    </div>
                                    {/* Countdown Timer for Upcoming or Ongoing Exams */}
                                    {timeRemaining !== null && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="text-sm font-bold text-red-600">
                                          {isUpcoming 
                                            ? (language === 'ar' ? 'يبدأ بعد: ' : 'Starts In: ')
                                            : (language === 'ar' ? 'ينتهي الدخول بعد: ' : 'Entry Window Ends In: ')
                                          }
                                          <span className="font-mono">{formatTime(timeRemaining)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isUpcoming ? 'secondary' : 'default'}>
                                      {isUpcoming ? (language === 'ar' ? 'قادم' : 'Upcoming') : (language === 'ar' ? 'جاري' : 'Ongoing')}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        className="w-20"
                                        type="number"
                                        min={0}
                                        placeholder={language === 'ar' ? 'دقائق' : 'min'}
                                        value={timeAdjustments[ex.id] ?? ''}
                                        onChange={(e) => setTimeAdjustments(prev => ({ ...prev, [ex.id]: e.target.value }))}
                                      />
                                      <Button size="sm" variant="outline" onClick={() => handleSetRemainingTime(ex, timeAdjustments[ex.id] ?? '')}>
                                        {language === 'ar' ? 'تغيير الوقت' : 'Change Time'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'المدة الحالية:' : 'Current duration:'} {tl ?? 0} {language === 'ar' ? 'دقائق' : 'min'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'اضبط الوقت المتبقي' : 'Set remaining time'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {language === 'ar' ? 'الامتحانات المنتهية' : 'Ended Exams'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const items = (scheduledExams || []).filter((ex: any) => {
                        const openAt = ex.scheduledAt ? new Date(ex.scheduledAt as any) : null;
                        const tl = ex.settings?.timeLimitMinutes;
                        const windowEnd = ex.settings?.windowEndAt ? new Date(ex.settings.windowEndAt as any) : null;
                        const windowEndMs = windowEnd
                          ? windowEnd.getTime()
                          : (openAt && typeof tl === 'number' ? openAt.getTime() + tl * 60000 : null);
                        const ended = windowEndMs !== null && nowMs >= windowEndMs;
                        return ended;
                      }).sort((a: any, b: any) => {
                        const aOpen = a.scheduledAt ? new Date(a.scheduledAt as any).getTime() : 0;
                        const bOpen = b.scheduledAt ? new Date(b.scheduledAt as any).getTime() : 0;
                        return bOpen - aOpen; // latest ended first
                      });
                      if (items.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'لا توجد امتحانات منتهية بعد' : 'No ended exams yet'}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                          {items.map((ex: any) => {
                            const openAt = ex.scheduledAt ? new Date(ex.scheduledAt as any) : null;
                            const tl = ex.settings?.timeLimitMinutes;
                            const windowEnd = ex.settings?.windowEndAt ? new Date(ex.settings.windowEndAt as any) : null;
                            const windowEndMs = windowEnd
                              ? windowEnd.getTime()
                              : (openAt && typeof tl === 'number' ? openAt.getTime() + tl * 60000 : null);
                            const endedAt = windowEndMs ? new Date(windowEndMs) : null;
                            const manual = !!ex.settings?.manualGradingEnabled;
                            return (
                              <div key={ex.id} className="border rounded p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-medium">{ex.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {(ex.courseTitle || ex.courseId) ? (
                                        <>
                                          {language === 'ar' ? 'الدورة: ' : 'Course: '} {ex.courseTitle || ex.courseId}
                                          {' • '}
                                        </>
                                      ) : null}
                                      {language === 'ar' ? 'انتهى: ' : 'Ended: '} {endedAt ? endedAt.toLocaleString() : '—'}
                                    </div>
                                  </div>
                                  <Badge variant="destructive">{language === 'ar' ? 'منتهي' : 'Ended'}</Badge>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 justify-end">
                                  {manual ? (
                                    <Button size="sm" onClick={() => openGradingInbox(ex)}>
                                      {language === 'ar' ? 'صندوق التصحيح' : 'Grading Inbox'}
                                    </Button>
                                  ) : (
                                    <Button size="sm" onClick={() => openAutoResults(ex)}>
                                      {language === 'ar' ? 'النتائج' : 'Results'}
                                    </Button>
                                  )}
                                  {/* Reopen button removed */}
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteExam(ex.id)}>
                                    {language === 'ar' ? 'حذف' : 'Delete'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          </main>
        </div>
      </div>
    );
  };

export default TeacherAssessments;























