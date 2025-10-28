import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

import { auth } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherService } from '@/services/teacherService';
import { CourseService } from '@/services/courseService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import StudentsSidebar from '@/components/StudentsSidebar';

import { Award, Upload, CheckSquare, Puzzle, PlusCircle } from 'lucide-react';

type QuestionType = 'mcq' | 'fill' | 'drag';

type MCQOption = { id: string; text: string; correct: boolean };
type ExamQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  options?: MCQOption[];
  answer?: string; // for fill-in-the-blank
  items?: { id: string; text: string }[]; // for drag-and-drop (basic list)
};

type ExamDraft = {
  title: string;
  courseId: string | null;
  questions: ExamQuestion[];
};

type AssignmentType = 'mcq' | 'file';
type AssignmentDraft = {
  title: string;
  description: string;
  courseId: string | null;
  type: AssignmentType;
  mcq?: { question: string; options: MCQOption[] };
  file?: File | null;
};

const StudentAssessments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);

  const [exam, setExam] = useState<ExamDraft>({ title: '', courseId: null, questions: [] });
  const [assignment, setAssignment] = useState<AssignmentDraft>({
    title: '',
    description: '',
    courseId: null,
    type: 'mcq',
    mcq: { question: '', options: [] },
    file: null,
  });

  // Access guard similar to StudentDashboard (teacher conflict)
  useEffect(() => {
    const verifyAccess = async () => {
      if (!user) {
        navigate('/login/student');
        return;
      }

      try {
        const links = await TeacherService.getStudentLinks(user.uid);
        const existingTeacher = links?.teacherId || null;
        const pendingTeacherId = localStorage.getItem('teacherId');

        if (existingTeacher && pendingTeacherId && existingTeacher !== pendingTeacherId) {
          await signOut(auth);
          navigate('/login/student');
          return;
        }

        setTeacherId(existingTeacher);

        if (existingTeacher) {
          const teacherCourses = await CourseService.getInstructorCourses(existingTeacher);
          const mapped = (teacherCourses || []).map((c: any) => ({ id: c.id, name: c.title || c.name || 'Course' }));
          setCourses(mapped);
        }
      } catch (err) {
        // Fail safe: restrict access
        await signOut(auth);
        navigate('/login/student');
        return;
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [user, navigate]);

  const t = useMemo(() => ({
    pageTitle: language === 'ar' ? 'الامتحانات والواجبات' : 'Exams & Assignments',
    sectionExam: language === 'ar' ? 'إنشاء امتحان' : 'Create Exam',
    sectionAssignment: language === 'ar' ? 'إنشاء واجب' : 'Create Assignment',
    examTitle: language === 'ar' ? 'عنوان الامتحان' : 'Exam Title',
    chooseCourse: language === 'ar' ? 'اختر المقرر' : 'Choose Course',
    addMCQ: language === 'ar' ? 'أضف سؤال اختيار من متعدد' : 'Add Multiple-Choice',
    addFill: language === 'ar' ? 'أضف سؤال إملأ الفراغ' : 'Add Fill-in-the-Blank',
    addDrag: language === 'ar' ? 'أضف سؤال سحب وإفلات' : 'Add Drag-and-Drop',
    saveExam: language === 'ar' ? 'حفظ الامتحان' : 'Save Exam',
    assignmentTitle: language === 'ar' ? 'عنوان الواجب' : 'Assignment Title',
    assignmentDesc: language === 'ar' ? 'وصف الواجب' : 'Assignment Description',
    assignmentType: language === 'ar' ? 'نوع الواجب' : 'Assignment Type',
    typeMCQ: language === 'ar' ? 'اختيار من متعدد' : 'Multiple-Choice',
    typeFile: language === 'ar' ? 'رفع ملف' : 'File Upload',
    mcqQuestion: language === 'ar' ? 'نص السؤال' : 'Question Text',
    addOption: language === 'ar' ? 'أضف خيار' : 'Add Option',
    optionText: language === 'ar' ? 'نص الخيار' : 'Option Text',
    markCorrect: language === 'ar' ? 'صح' : 'Correct',
    uploadFile: language === 'ar' ? 'اختر الملف' : 'Choose File',
    saveAssignment: language === 'ar' ? 'حفظ الواجب' : 'Save Assignment',
  }), [language]);

  // Helpers
  const addExamQuestion = (type: QuestionType) => {
    const id = Math.random().toString(36).slice(2);
    const base: ExamQuestion = { id, type, text: '' };
    if (type === 'mcq') base.options = [];
    if (type === 'fill') base.answer = '';
    if (type === 'drag') base.items = [];
    setExam(prev => ({ ...prev, questions: [...prev.questions, base] }));
  };

  const updateQuestion = (id: string, patch: Partial<ExamQuestion>) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...patch } : q)
    }));
  };

  const addMCQOption = (qid: string) => {
    const opt: MCQOption = { id: Math.random().toString(36).slice(2), text: '', correct: false };
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qid ? { ...q, options: [...(q.options || []), opt] } : q)
    }));
  };

  const toggleMCQCorrect = (qid: string, oid: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qid) return q;
        return {
          ...q,
          options: (q.options || []).map(o => o.id === oid ? { ...o, correct: !o.correct } : o)
        };
      })
    }));
  };

  const updateMCQOptionText = (qid: string, oid: string, text: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qid) return q;
        return {
          ...q,
          options: (q.options || []).map(o => o.id === oid ? { ...o, text } : o)
        };
      })
    }));
  };

  const addDragItem = (qid: string) => {
    const item = { id: Math.random().toString(36).slice(2), text: '' };
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qid ? { ...q, items: [...(q.items || []), item] } : q)
    }));
  };

  const updateDragItemText = (qid: string, iid: string, text: string) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qid) return q;
        return {
          ...q,
          items: (q.items || []).map(i => i.id === iid ? { ...i, text } : i)
        };
      })
    }));
  };

  const removeQuestion = (qid: string) => {
    setExam(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== qid) }));
  };

  const saveExam = () => {
    if (!exam.title || !exam.courseId || exam.questions.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إكمال بيانات الامتحان' : 'Please complete exam details');
      return;
    }
    // TODO: Integrate with backend service to persist the exam
    toast.success(language === 'ar' ? 'تم حفظ الامتحان بنجاح' : 'Exam saved successfully');
    // Reset draft
    setExam({ title: '', courseId: null, questions: [] });
  };

  const addAssignmentOption = () => {
    const opt: MCQOption = { id: Math.random().toString(36).slice(2), text: '', correct: false };
    setAssignment(prev => ({
      ...prev,
      mcq: { question: prev.mcq?.question || '', options: [...(prev.mcq?.options || []), opt] }
    }));
  };

  const toggleAssignmentCorrect = (oid: string) => {
    setAssignment(prev => ({
      ...prev,
      mcq: {
        question: prev.mcq?.question || '',
        options: (prev.mcq?.options || []).map(o => o.id === oid ? { ...o, correct: !o.correct } : o)
      }
    }));
  };

  const updateAssignmentOptionText = (oid: string, text: string) => {
    setAssignment(prev => ({
      ...prev,
      mcq: {
        question: prev.mcq?.question || '',
        options: (prev.mcq?.options || []).map(o => o.id === oid ? { ...o, text } : o)
      }
    }));
  };

  const saveAssignment = () => {
    if (!assignment.title || !assignment.courseId) {
      toast.error(language === 'ar' ? 'يرجى إكمال بيانات الواجب' : 'Please complete assignment details');
      return;
    }
    if (assignment.type === 'mcq') {
      const opts = assignment.mcq?.options || [];
      if (!assignment.mcq?.question || opts.length < 2) {
        toast.error(language === 'ar' ? 'أكمل سؤال الاختيار وخياراته' : 'Complete MCQ question and options');
        return;
      }
    }
    if (assignment.type === 'file' && !assignment.file) {
      toast.error(language === 'ar' ? 'يرجى اختيار ملف الواجب' : 'Please choose an assignment file');
      return;
    }
    // TODO: Integrate with backend service to persist the assignment
    toast.success(language === 'ar' ? 'تم حفظ الواجب بنجاح' : 'Assignment saved successfully');
    setAssignment({ title: '', description: '', courseId: null, type: 'mcq', mcq: { question: '', options: [] }, file: null });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5" /> {t.sectionExam}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t.examTitle}</label>
                  <Input value={exam.title} onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))} placeholder={t.examTitle} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t.chooseCourse}</label>
                  <select className="w-full border rounded h-10 px-2" value={exam.courseId || ''} onChange={(e) => setExam(prev => ({ ...prev, courseId: e.target.value }))}>
                    <option value="">--</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => addExamQuestion('mcq')}><PlusCircle className="h-4 w-4 mr-2" />{t.addMCQ}</Button>
                <Button variant="secondary" onClick={() => addExamQuestion('fill')}><PlusCircle className="h-4 w-4 mr-2" />{t.addFill}</Button>
                <Button variant="secondary" onClick={() => addExamQuestion('drag')}><PlusCircle className="h-4 w-4 mr-2" />{t.addDrag}</Button>
              </div>

              <div className="space-y-4">
                {exam.questions.map(q => (
                  <div key={q.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="capitalize">{q.type}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>{language === 'ar' ? 'حذف' : 'Remove'}</Button>
                    </div>
                    <label className="text-sm font-medium mb-1 block">{language === 'ar' ? 'نص السؤال' : 'Question Text'}</label>
                    <Input value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} placeholder={language === 'ar' ? 'اكتب السؤال هنا' : 'Enter question here'} />

                    {q.type === 'mcq' && (
                      <div className="mt-3 space-y-2">
                        {(q.options || []).map(opt => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <Input className="flex-1" value={opt.text} onChange={(e) => updateMCQOptionText(q.id, opt.id, e.target.value)} placeholder={t.optionText} />
                            <Button variant={opt.correct ? 'default' : 'outline'} size="sm" onClick={() => toggleMCQCorrect(q.id, opt.id)}>{t.markCorrect}</Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addMCQOption(q.id)}>{t.addOption}</Button>
                      </div>
                    )}

                    {q.type === 'fill' && (
                      <div className="mt-3">
                        <label className="text-sm font-medium mb-1 block">{language === 'ar' ? 'الإجابة المتوقعة' : 'Expected Answer'}</label>
                        <Input value={q.answer || ''} onChange={(e) => updateQuestion(q.id, { answer: e.target.value })} placeholder={language === 'ar' ? 'اكتب الإجابة' : 'Enter answer'} />
                      </div>
                    )}

                    {q.type === 'drag' && (
                      <div className="mt-3 space-y-2">
                        <div className="text-sm text-muted-foreground flex items-center gap-2"><Puzzle className="h-4 w-4" />{language === 'ar' ? 'عناصر السحب والإفلات (قائمة بسيطة)' : 'Drag-and-drop items (simple list)'}</div>
                        {(q.items || []).map(i => (
                          <div key={i.id} className="flex items-center gap-2">
                            <Input className="flex-1" value={i.text} onChange={(e) => updateDragItemText(q.id, i.id, e.target.value)} placeholder={language === 'ar' ? 'نص العنصر' : 'Item text'} />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addDragItem(q.id)}>{language === 'ar' ? 'أضف عنصر' : 'Add Item'}</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={saveExam}>{t.saveExam}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> {t.sectionAssignment}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t.assignmentTitle}</label>
                  <Input value={assignment.title} onChange={(e) => setAssignment(prev => ({ ...prev, title: e.target.value }))} placeholder={t.assignmentTitle} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t.chooseCourse}</label>
                  <select className="w-full border rounded h-10 px-2" value={assignment.courseId || ''} onChange={(e) => setAssignment(prev => ({ ...prev, courseId: e.target.value }))}>
                    <option value="">--</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{t.assignmentDesc}</label>
                <textarea className="w-full border rounded p-2" rows={3} value={assignment.description} onChange={(e) => setAssignment(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium mb-1 block">{t.assignmentType}</label>
                  <select className="w-full border rounded h-10 px-2" value={assignment.type} onChange={(e) => setAssignment(prev => ({ ...prev, type: e.target.value as AssignmentType }))}>
                    <option value="mcq">{t.typeMCQ}</option>
                    <option value="file">{t.typeFile}</option>
                  </select>
                </div>
              </div>

              {assignment.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">{t.mcqQuestion}</label>
                  <Input value={assignment.mcq?.question || ''} onChange={(e) => setAssignment(prev => ({ ...prev, mcq: { question: e.target.value, options: prev.mcq?.options || [] } }))} />
                  {(assignment.mcq?.options || []).map(opt => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <Input className="flex-1" value={opt.text} onChange={(e) => updateAssignmentOptionText(opt.id, e.target.value)} placeholder={t.optionText} />
                      <Button variant={opt.correct ? 'default' : 'outline'} size="sm" onClick={() => toggleAssignmentCorrect(opt.id)}>{t.markCorrect}</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addAssignmentOption}>{t.addOption}</Button>
                </div>
              )}

              {assignment.type === 'file' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">{t.uploadFile}</label>
                  <input type="file" onChange={(e) => setAssignment(prev => ({ ...prev, file: e.target.files?.[0] || null }))} />
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={saveAssignment}>{t.saveAssignment}</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <StudentsSidebar />
        </div>
      </div>
    </div>
  );
};

export default StudentAssessments;