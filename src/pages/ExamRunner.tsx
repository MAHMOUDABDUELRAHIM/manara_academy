import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ExamDoc, ExamQuestion, ExamService } from '@/services/examService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { StudentService } from '@/services/studentService';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

type AnswerMap = Record<string, string | string[]>;

export default function ExamRunner() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<ExamDoc | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [view, setView] = useState<'exam' | 'result' | 'review'>('exam');
  const [searchParams] = useSearchParams();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [locked, setLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [preStartLeft, setPreStartLeft] = useState<number | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  useEffect(() => {
    if (searchParams.get('view') === 'result' || searchParams.get('view') === 'review') return;
    if (!examId) return;
    setLoading(true);
    const ref = doc(db, 'exams', examId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setExam(null);
        setLoading(false);
        return;
      }
      const data = snap.data() as any;
      const examDoc: ExamDoc = {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt || null,
        settings: {
          ...data.settings,
          scheduledAt: data.settings?.scheduledAt?.toDate?.() || data.settings?.scheduledAt || null,
        },
      } as ExamDoc;
      setExam(examDoc);
      setLoading(false);
    });
    return () => { unsub(); };
  }, [examId, searchParams]);

  useEffect(() => {
    if (!exam) return;
    setAnswers((prev) => {
      const next: AnswerMap = { ...prev };
      exam.questions.forEach((q) => {
        if ((q as any).type === 'drag' && Array.isArray((q as any).items) && !Array.isArray(next[q.id])) {
          // @ts-ignore
          next[q.id] = (q as any).items.map((i: any) => i.id);
        }
      });
      return next;
    });
  }, [exam]);

  const timeLimitMinutes = useMemo(() => exam?.settings?.timeLimitMinutes ?? null, [exam]);

  // Countdown timer linked to attempt start time in Firestore
  useEffect(() => {
    async function initResultView() {
      const v = searchParams.get('view');
      if ((v === 'result' || v === 'review') && user?.uid && examId) {
        try {
          const res = await StudentService.getExamResult(user.uid, examId);
          if (res) {
            setAnswers(res.answers || {});
            setResult({ score: res.score, total: res.total });
            setView(v as any);
            if (v === 'review') {
              const snap: any = res.examSnapshot;
              if (snap && Array.isArray(snap.questions)) {
                setExam({
                  id: examId!,
                  title: snap.title || 'امتحان',
                  questions: snap.questions,
                  courseId: snap.courseId || '',
                  courseTitle: snap.courseTitle || '',
                  settings: { manualGradingEnabled: !!(snap.settings?.manualGradingEnabled) },
                  createdAt: new Date(),
                  scheduledAt: snap.settings?.scheduledAt || null,
                } as any);
                setLoading(false);
              } else {
                try {
                  const ex = await ExamService.getExamById(examId);
                  setExam(ex || null);
                } catch {
                  setExam(null);
                } finally {
                  setLoading(false);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load exam result for view', v, e);
        }
      }
    }
    initResultView();
  }, [searchParams, user?.uid, examId]);
  // Enforce entry window: block entry after scheduled window expires without attempt, and block result view if no attempt
  useEffect(() => {
    async function enforceEntryWindow() {
      if (!exam || !examId || !user?.uid) return;
      const scheduleEnabled = !!exam.settings?.scheduleEnabled;
      const openAt = exam.scheduledAt ? new Date(exam.scheduledAt as any) : null;
      // Use explicit entry window end if set; fallback to openAt+timeLimit only if no windowEndAt
      const windowEnd = exam.settings?.windowEndAt ? new Date(exam.settings.windowEndAt as any) : null;
      const tl = exam.settings?.timeLimitMinutes ?? null;
      const endAtMs = windowEnd
        ? windowEnd.getTime()
        : (openAt && tl ? openAt.getTime() + tl * 60000 : null);
  
      // If user tries to view result without actual result, lock
      if (searchParams.get('view') === 'result') {
        try {
          const res = await StudentService.getExamResult(user.uid, examId);
          if (!res) {
            setLocked(true);
            setLockMessage('لم تدخل الامتحان. لا توجد نتيجة للعرض.');
            setView('exam');
          }
        } catch {
          setLocked(true);
          setLockMessage('لم تدخل الامتحان. لا توجد نتيجة للعرض.');
          setView('exam');
        }
      }
  
      // If exam reopened only for unattempted, block students with any past attempt
      if (exam.settings?.reopenOnly) {
        try {
          const attempt = await StudentService.getExamAttempt(user.uid, examId);
          if (attempt?.startAt || attempt?.submittedAt) {
            setInfoMessage('هذا الامتحان مُتاح فقط لمن لم يدخلوا سابقاً.');
            if (searchParams.get('view') !== 'result') {
              setLocked(true);
              setLockMessage('هذا الامتحان مُتاح فقط لمن لم يدخلوا سابقاً.');
            }
          }
        } catch {}
      }
  
      // Block starting exam after window expires if no attempt was started
      if (scheduleEnabled && endAtMs !== null && Date.now() > endAtMs) {
        try {
          const attempt = await StudentService.getExamAttempt(user.uid, examId);
          if (!attempt?.startAt) {
            setLocked(true);
            setLockMessage('انتهى الوقت المحدد للدخول إلى الامتحان ولم يتم بدء المحاولة.');
          }
        } catch {
          setLocked(true);
          setLockMessage('انتهى الوقت المحدد للدخول إلى الامتحان ولم يتم بدء المحاولة.');
        }
      }
    }
    enforceEntryWindow();
  }, [exam, examId, user?.uid, searchParams]);

  useEffect(() => {
    let t: any;
    async function initTimer() {
      const limit = timeLimitMinutes;
      if (!examId || !exam || !limit || limit <= 0) {
        setTimeLeft(null);
        setPreStartLeft(null);
        return;
      }
      const scheduleEnabled = !!exam.settings?.scheduleEnabled;
      const openAtMs = exam.scheduledAt ? new Date(exam.scheduledAt as any).getTime() : null;
      if (scheduleEnabled && openAtMs) {
        const now = Date.now();
        if (now < openAtMs) {
          function tickPre() {
            const n = Date.now();
            const preLeft = Math.max(0, Math.floor((openAtMs - n) / 1000));
            setPreStartLeft(preLeft > 0 ? preLeft : null);
            if (preLeft === 0) {
              clearInterval(t);
              startAttemptTimer();
            }
          }
          tickPre();
          t = setInterval(tickPre, 1000);
        } else {
          await startAttemptTimer();
        }
      } else {
        // Fallback: timer based on attempt start for unscheduled exams
        if (view !== 'exam') {
          setTimeLeft(null);
          setPreStartLeft(null);
          return;
        }
        if (!user?.uid) return;
        const { startAt } = await StudentService.ensureExamAttemptStarted(user.uid, examId!, limit);
        function tick() {
          const endMs = startAt.getTime() + limit * 60 * 1000;
          const endLeft = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
          setTimeLeft(endLeft);
        }
        tick();
        t = setInterval(tick, 1000);
      }

      async function startAttemptTimer() {
        setPreStartLeft(null);
        if (!user?.uid) return;
        const { startAt } = await StudentService.ensureExamAttemptStarted(user.uid, examId!, limit);
        function tick() {
          const endMs = startAt.getTime() + limit * 60 * 1000;
          const endLeft = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
          setTimeLeft(endLeft);
        }
        tick();
        t = setInterval(tick, 1000);
      }
    }
    initTimer();
    return () => {
      if (t) clearInterval(t);
    };
  }, [examId, exam, user, timeLimitMinutes, view]);

  // Auto submit when timer hits zero
  useEffect(() => {
    if (view !== 'exam') return;
    if (timeLeft === 0 && !result) {
      handleSubmit(true);
    }
  }, [timeLeft, view, result]);

  // Ensure attempt is started when exam view is active (including scheduled mode)
  useEffect(() => {
    const limit = timeLimitMinutes;
    if (view !== 'exam' || !examId || !exam || !user?.uid || !limit || limit <= 0) return;
    StudentService.ensureExamAttemptStarted(user.uid, examId!, limit).catch(() => {});
  }, [view, examId, exam, user, timeLimitMinutes]);

  function formatTime(sec: number | null) {
    if (sec === null) return 'غير محدد';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setAnswer(q: ExamQuestion, value: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    setTouched((prev) => ({ ...prev, [q.id]: true }));
  }

  function moveDragAnswer(q: ExamQuestion, itemId: string, dir: 'up' | 'down') {
    setAnswers((prev) => {
      const arr = Array.isArray(prev[q.id]) ? ([...prev[q.id]] as string[]) : [];
      const idx = arr.indexOf(itemId);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? Math.max(0, idx - 1) : Math.min(arr.length - 1, idx + 1);
      if (newIdx === idx) return prev;
      arr.splice(idx, 1);
      arr.splice(newIdx, 0, itemId);
      return { ...prev, [q.id]: arr };
    });
    setTouched((prev) => ({ ...prev, [q.id]: true }));
  }

  function computeScore(ex: ExamDoc, ans: AnswerMap) {
    let total = 0;
    let score = 0;
    for (const q of ex.questions) {
      const pts = (q as any).points ?? 1;
      total += pts;
      if (q.type === 'mcq') {
        const correctIds = (q.options || []).filter((o) => (o as any).correct).map((o) => o.id);
        const a = ans[q.id] as string;
        if (a && correctIds.includes(a)) score += pts;
      } else if (q.type === 'fill') {
        const a = ((ans[q.id] as string) || '').trim().toLowerCase();
        const corr = ((q as any).answer || '').trim().toLowerCase();
        if (a && a === corr) score += pts;
      } else if (q.type === 'drag') {
        const corr = ((q as any).correctOrder) || (q.items || []).map((i) => i.id);
        const a = ans[q.id] as string[];
        if (Array.isArray(a) && a.length === corr.length && a.every((id, i) => id === corr[i])) score += pts;
      }
      // essay questions are not auto-graded
    }
    return { score, total };
  }

  function findUnanswered(): string[] {
    if (!exam) return [];
    const missing: string[] = [];
    for (const q of exam.questions) {
      if (q.type === 'mcq') {
        const a = answers[q.id] as string;
        if (!a) missing.push(q.id);
      } else if (q.type === 'fill') {
        const a = (answers[q.id] as string) || '';
        if (!a.trim()) missing.push(q.id);
      } else if (q.type === 'drag') {
        if (!touched[q.id]) missing.push(q.id);
      } else if (q.type === 'essay') {
        const a = (answers[q.id] as string) || '';
        if (!a.trim()) missing.push(q.id);
      }
    }
    return missing;
  }

  async function handleSubmit(auto = false) {
    if (!exam) return;
    setSubmitting(true);
    try {
      const manual = !!exam.settings?.manualGradingEnabled;
      const examSnapshot = {
        title: (exam as any).title,
        courseId: (exam as any).courseId,
        courseTitle: (exam as any).courseTitle,
        settings: { manualGradingEnabled: !!exam.settings?.manualGradingEnabled },
        questions: (exam.questions || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options?.map((o: any) => ({ id: o.id, text: o.text, correct: !!(o as any).correct })) || undefined,
          answer: (q as any).answer,
          items: q.items?.map((i: any) => ({ id: i.id, text: i.text })) || undefined,
          correctOrder: (q as any).correctOrder,
          imageBase64: (q as any).imageBase64,
          imagePosition: (q as any).imagePosition,
          imageWidth: (q as any).imageWidth,
          points: (q as any).points,
        })),
      };
      if (manual) {
        const total = exam.questions.reduce((sum, q: any) => sum + (q.points ?? 1), 0);
        if (user?.uid && examId) {
          await StudentService.saveExamResult(user.uid, examId, { score: 0, total, answers, status: 'pending', autoSubmitted: auto, examSnapshot });
        }
        // عرض النتيجة المعلقة بدلاً من التوجيه المباشر للوحة التحكم
        setResult({ score: 0, total, answers });
        setView('result');
        return;
      } else {
        const r = computeScore(exam, answers);
        setResult(r);
        setView('result');
        if (user?.uid && examId) {
          await StudentService.saveExamResult(user.uid, examId, { score: r.score, total: r.total, answers, status: 'graded', autoSubmitted: auto, examSnapshot });
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center" dir="rtl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جارٍ تحميل الاختبار...</span>
        </div>
      </div>
    );
  }
if (locked) {
  return (
    <div className="min-h-[60vh] grid place-items-center" dir="rtl">
      <div className="text-center space-y-4">
        <div className="text-destructive font-medium">{lockMessage || 'تم قفل هذا الامتحان'}</div>
        <Button variant="outline" onClick={() => navigate(-1)}>رجوع</Button>
      </div>
    </div>
  );
}

// قبل بدء الامتحان المجدول، اعرض عدًّا تنازليًا لوقت البداية
if (exam?.settings?.scheduleEnabled && preStartLeft !== null) {
  return (
    <div className="min-h-[60vh] grid place-items-center" dir="rtl">
      <div className="text-center space-y-4">
        <div className="text-lg">سيبدأ الامتحان خلال</div>
        <div className="text-2xl font-bold">{formatTime(preStartLeft)}</div>
        <Button variant="outline" onClick={() => navigate(-1)}>رجوع</Button>
      </div>
    </div>
  );
}

  if (!exam) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>الامتحان غير متاح</CardTitle>
          </CardHeader>
          <CardContent>
            <p>تعذر العثور على الامتحان المطلوب.</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>رجوع</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = exam.questions[currentIndex];

  // Helper to show student's answer vs correct answer in review view
  function ReviewRow({ question, index }: { question: ExamQuestion; index: number }) {
    const [open, setOpen] = useState(false);
    const yourAns = answers[question.id];
    let yourText = '';
    let correctText = '';
    let isCorrect: boolean | null = null;
    if (question.type === 'mcq') {
      const selected = (question.options || []).find((o) => o.id === yourAns);
      yourText = selected ? selected.text : '—';
      const corrects = (question.options || []).filter((o) => (o as any).correct).map((o) => o.text);
      const correctIds = (question.options || []).filter((o) => (o as any).correct).map((o) => o.id);
      correctText = corrects.join(', ');
      const a = yourAns as string;
      isCorrect = a ? correctIds.includes(a) : null;
    } else if (question.type === 'fill') {
      yourText = ((yourAns as string) || '').toString();
      correctText = ((question as any).answer || '').toString();
      const a = ((yourAns as string) || '').trim().toLowerCase();
      const corr = ((question as any).answer || '').trim().toLowerCase();
      isCorrect = a ? a === corr : null;
    } else if (question.type === 'drag') {
      const arr = Array.isArray(yourAns) ? (yourAns as string[]) : [];
      const corr = ((question as any).correctOrder) || (question.items || []).map((i) => i.id);
      const yourList = arr.map((id) => question.items?.find((i) => i.id === id)?.text || id);
      const corrList = corr.map((id: string) => question.items?.find((i) => i.id === id)?.text || id);
      yourText = yourList.join(' | ');
      correctText = corrList.join(' | ');
      isCorrect = Array.isArray(arr) && arr.length === corr.length && arr.every((id, i) => id === corr[i]);
    } else if (question.type === 'essay') {
      yourText = ((yourAns as string) || '').toString();
      correctText = '';
      isCorrect = null;
    }
    return (
      <div className={`rounded border ${isCorrect === false ? 'border-red-500' : ''}`}>
        <button className="w-full flex items-center justify-between p-3" onClick={() => setOpen((o) => !o)}>
          <span>سؤال {String(index + 1).padStart(2, '0')}</span>
          <div className="flex items-center gap-2">
            {isCorrect === false ? <span className="text-red-600 text-xs">إجابة غير صحيحة</span> : null}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        {isCorrect === false ? <div className="h-1 bg-red-500 mx-3 rounded"></div> : null}
        {open && (
          <div className="p-3 space-y-2">
            {(question as any).imageBase64 && (question as any).imagePosition === 'above' && (
              <img src={(question as any).imageBase64} alt="question" style={{ width: ((question as any).imageWidth ?? 320) }} className="rounded border" />
            )}
            <div className={(question as any).imageBase64 && (((question as any).imagePosition === 'left') || ((question as any).imagePosition === 'right')) ? 'flex items-start gap-3' : ''}>
              {(question as any).imageBase64 && (question as any).imagePosition === 'left' && (
                <img src={(question as any).imageBase64} alt="question" style={{ width: ((question as any).imageWidth ?? 320) }} className="rounded border" />
              )}
              <div className="font-medium flex-1">{question.text}</div>
              {(question as any).imageBase64 && (question as any).imagePosition === 'right' && (
                <img src={(question as any).imageBase64} alt="question" style={{ width: ((question as any).imageWidth ?? 320) }} className="rounded border" />
              )}
            </div>
            {(question as any).imageBase64 && (question as any).imagePosition === 'below' && (
              <img src={(question as any).imageBase64} alt="question" style={{ width: ((question as any).imageWidth ?? 320) }} className="rounded border" />
            )}
            <div className="text-sm">إجابتك: <span className="font-semibold">{yourText || '—'}</span></div>
            {!exam?.settings?.manualGradingEnabled && (
              <div className="text-sm">الإجابة الصحيحة: <span className="font-semibold">{correctText || '—'}</span></div>
            )}
            {exam?.settings?.manualGradingEnabled && (
              <div className="text-xs text-muted-foreground">سيتم تقييم هذه الإجابة يدوياً.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex flex-row-reverse gap-6">
        {/* Sidebar on the right */}
        {view !== 'result' ? (
          <aside className="w-64 shrink-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الوقت المتبقي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-center">{formatTime(timeLeft)}</div>
                {timeLeft === null && (
                  <div className="text-xs text-muted-foreground text-center mt-2">لا يوجد حد زمني</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الأسئلة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {exam.questions.map((question, idx) => (
                    <Button
                      key={question.id}
                      variant={idx === currentIndex ? 'default' : 'outline'}
                      size="sm"
                      className="h-12 p-0"
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        ) : null}
        {/* Main content */}
        <main className={view === 'result' ? 'flex-1 max-w-3xl mx-auto' : 'flex-1'}>
          {infoMessage ? (
            <Card className="mb-4 border-amber-300">
              <CardContent className="py-3">
                <div className="text-sm text-amber-700">{infoMessage}</div>
              </CardContent>
            </Card>
          ) : null}

          {view === 'result' && result ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">نتيجة الامتحان</CardTitle>
              </CardHeader>
              <CardContent className="py-4 space-y-3">
                {exam?.settings?.manualGradingEnabled ? (
                  <div className="space-y-2">
                    <div className="font-semibold text-blue-600">تم تسليم الامتحان بنجاح!</div>
                    <div className="text-sm text-gray-600">سيتم تصحيح إجاباتك وإعلان النتيجة قريباً. يمكنك مراجعة إجاباتك أدناه.</div>
                  </div>
                ) : (
                  <div className="font-semibold">الدرجة: {result.score} من {result.total}</div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => setView('review')}>مراجعة الإجابات</Button>
                  <Button variant="secondary" onClick={() => navigate('/dashboard')}>الخروج إلى لوحة الطالب</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {view === 'review' ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">مراجعة الإجابات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result ? (
                  <div className="text-sm mb-2">الدرجة: <span className="font-semibold">{result.score} / {result.total}</span></div>
                ) : null}
                {exam?.questions?.length ? (
                  exam.questions.map((q, idx) => (
                    <ReviewRow key={q.id} question={q as any} index={idx} />
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">تعذر تحميل تفاصيل الامتحان لعرض المراجعة.</div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {view === 'exam' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    سؤال {String(currentIndex + 1).padStart(2, '0')} من {exam.questions.length}
                  </span>
                  {(q as any).points ? (
                    <span className="text-sm text-muted-foreground">{(q as any).points} نقطة</span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(q as any).imageBase64 && (q as any).imagePosition === 'above' && (
                  <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                )}
                <div className={(q as any).imageBase64 && (((q as any).imagePosition === 'left') || ((q as any).imagePosition === 'right')) ? 'flex items-start gap-3' : ''}>
                  {(q as any).imageBase64 && (q as any).imagePosition === 'left' && (
                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                  )}
                  <div className="font-medium flex-1">{q.text}</div>
                  {(q as any).imageBase64 && (q as any).imagePosition === 'right' && (
                    <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                  )}
                </div>
                {(q as any).imageBase64 && (q as any).imagePosition === 'below' && (
                  <img src={(q as any).imageBase64} alt="question" style={{ width: ((q as any).imageWidth ?? 320) }} className="rounded border" />
                )}

                {q.type === 'mcq' && (
                  <div className="space-y-2">
                    {q.options?.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === opt.id}
                          onChange={() => setAnswer(q, opt.id)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'fill' && (
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="أدخل الإجابة"
                    value={(answers[q.id] as string) || ''}
                    onChange={(e) => setAnswer(q, e.target.value)}
                  />
                )}

                {q.type === 'drag' && (
                  <div className="space-y-2">
                    {((answers[q.id] as string[]) || []).map((itemId, idx) => {
                      const item = q.items?.find((i) => i.id === itemId);
                      if (!item) return null;
                      const arr = (answers[q.id] as string[]) || [];
                      return (
                        <div key={itemId} className="flex items-center justify-between border rounded p-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs border rounded">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span>{item.text}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveDragAnswer(q, itemId, 'up')}
                              disabled={idx === 0}
                              aria-label="move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => moveDragAnswer(q, itemId, 'down')}
                              disabled={idx === arr.length - 1}
                              aria-label="move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'essay' && (
                  <textarea
                    className="border rounded px-3 py-2 w-full min-h-[160px]"
                    placeholder="اكتب إجابتك هنا"
                    value={(answers[q.id] as string) || ''}
                    onChange={(e) => setAnswer(q, e.target.value)}
                  />
                )}
              </CardContent>
              <div className="flex items-center justify-between px-6 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  السابق
                </Button>
                <div className="flex items-center gap-2">
                  {currentIndex === exam.questions.length - 1 && !result && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={submitting}>
                          {submitting ? 'جارٍ الإرسال...' : 'إنهاء وتسليم'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الإنهاء والتسليم</AlertDialogTitle>
                          <AlertDialogDescription>
                            {exam?.settings?.manualGradingEnabled ? 'سيتم إرسال الامتحان وسيتم التصحيح يدوياً بدون عرض الدرجة الآن.' : 'سيتم إرسال الامتحان وعرض النتيجة. هل تريد المتابعة؟'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSubmit}>إنهاء وتسليم</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                    disabled={currentIndex === exam.questions.length - 1}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}