import { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { TeacherService, TeacherProfile } from '@/services/teacherService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import {
  Settings,
  Edit3,
  Loader2,
  UserPlus,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  DollarSign,
  Users,
  Bell,
  Settings as SettingsIcon,
  PlusCircle,
  PenSquare,
  Trash2,
  CheckSquare,
  Link as LinkIcon,
  Palette,
  Type,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { collection, doc, updateDoc, query, where, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

const TeacherSettings = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  // Trial expiration: block assistant creation after 24h from account creation
  const createdRaw: any = user?.profile?.createdAt as any;
  const createdMs = createdRaw
    ? (typeof createdRaw === 'string'
        ? new Date(createdRaw).getTime()
        : (createdRaw?.seconds ? createdRaw.seconds * 1000 : (createdRaw instanceof Date ? createdRaw.getTime() : NaN)))
    : 0;
  // Load trial duration from admin settings and use it for expiration
  const [trialMsFromSettings, setTrialMsFromSettings] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'trial'));
        if (snap.exists()) {
          const data: any = snap.data();
          const unit = data?.unit === 'minutes' ? 'minutes' : 'days';
          const value = typeof data?.value === 'number' && data.value > 0 ? data.value : 1;
          const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
          if (!cancelled) setTrialMsFromSettings(ms);
        } else {
          try {
            const cached = localStorage.getItem('trialSettings');
            if (cached) {
              const parsed = JSON.parse(cached);
              const unit = parsed?.unit === 'minutes' ? 'minutes' : 'days';
              const value = typeof parsed?.value === 'number' && parsed.value > 0 ? parsed.value : 1;
              const ms = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000;
              if (!cancelled) setTrialMsFromSettings(ms);
            }
          } catch {}
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, []);
  const trialExpired = !!createdMs && (Date.now() >= (createdMs + (trialMsFromSettings ?? (24 * 60 * 60 * 1000))));
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFullName, setEditingFullName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  // Assistant creation state
  const [assistantName, setAssistantName] = useState('');
  const [assistantEmail, setAssistantEmail] = useState('');
  const [assistantPassword, setAssistantPassword] = useState('');
  const [assistantPasswordConfirm, setAssistantPasswordConfirm] = useState('');
  const [creatingAssistant, setCreatingAssistant] = useState(false);
  const [createdAssistantUid, setCreatedAssistantUid] = useState<string>('');
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<any | null>(null);
  const [editPages, setEditPages] = useState<string[]>([]);
  const [editActions, setEditActions] = useState<string[]>([]);

  // Permissions: pages the assistant can see and actions they can perform
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);

  const pageOptions: { key: string; label: string; Icon: React.ComponentType<any> }[] = [
    { key: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', Icon: LayoutDashboard },
    { key: 'my_courses', label: language === 'ar' ? 'دوراتي' : 'My Courses', Icon: BookOpen },
    { key: 'create_course', label: language === 'ar' ? 'إنشاء دورة' : 'Create Course', Icon: PlusCircle },
    { key: 'invite_students', label: language === 'ar' ? 'إدارة وتخصيص المنصة' : 'Platform Management and Customization', Icon: SettingsIcon },
    { key: 'assessments', label: language === 'ar' ? 'الاختبارات' : 'Assessments', Icon: ClipboardList },
    { key: 'payouts', label: language === 'ar' ? 'المدفوعات' : 'Payouts', Icon: DollarSign },
    { key: 'settings', label: language === 'ar' ? 'الإعدادات' : 'Settings', Icon: SettingsIcon },
  ];

  const actionsByPage: Record<string, { key: string; labelAr: string; labelEn: string; Icon: React.ComponentType<any> }[]> = {
    dashboard: [],
    my_courses: [
      { key: 'edit_course', labelAr: 'تعديل دورة', labelEn: 'Edit course', Icon: PenSquare },
      { key: 'delete_course', labelAr: 'حذف دورة', labelEn: 'Delete course', Icon: Trash2 },
    ],
    create_course: [
      { key: 'create_course', labelAr: 'إنشاء دورة', labelEn: 'Create course', Icon: PlusCircle },
    ],
    invite_students: [
      { key: 'edit_platform_settings', labelAr: 'إعدادات المنصة', labelEn: 'Platform settings', Icon: SettingsIcon },
      { key: 'select_theme', labelAr: 'اختيار الثيم', labelEn: 'Select theme', Icon: Palette },
      { key: 'customize_hero', labelAr: 'تخصيص الـ Hero', labelEn: 'Customize Hero', Icon: Type },
      { key: 'manage_invite_features', labelAr: 'إدارة قسم الميزات', labelEn: 'Manage features section', Icon: CheckSquare },
      { key: 'configure_social_media', labelAr: 'إعداد وسائل التواصل', labelEn: 'Configure social media', Icon: LinkIcon },
      { key: 'manage_whatsapp', labelAr: 'إعدادات واتساب', labelEn: 'WhatsApp settings', Icon: MessageCircle },
    ],
    assessments: [
      { key: 'grade_assignments', labelAr: 'تصحيح الواجبات/الاختبارات', labelEn: 'Grade assignments/exams', Icon: CheckSquare },
    ],
    payouts: [
      { key: 'view_payouts', labelAr: 'عرض المدفوعات', labelEn: 'View payouts', Icon: DollarSign },
    ],
    settings: [
      { key: 'edit_profile_settings', labelAr: 'تعديل إعدادات الحساب', labelEn: 'Edit profile settings', Icon: SettingsIcon },
    ],
  };

  const persistAssistantPermissions = async (pages: string[], actions: string[]) => {
    if (!createdAssistantUid) return;
    try {
      await updateDoc(doc(db, 'teachers', createdAssistantUid), {
        allowedPages: pages,
        allowedActions: actions,
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error('Failed to update assistant permissions', e);
    }
  };

  const togglePage = (pageKey: string) => {
    setAllowedPages((prev) => {
      const isEnabled = prev.includes(pageKey);
      let nextPages: string[];
      let nextActions = [...allowedActions];
      if (isEnabled) {
        nextPages = prev.filter((p) => p !== pageKey);
        const toRemove = (actionsByPage[pageKey] || []).map((a) => a.key);
        nextActions = nextActions.filter((a) => !toRemove.includes(a));
        setAllowedActions(nextActions);
      } else {
        nextPages = [...prev, pageKey];
      }
      persistAssistantPermissions(nextPages, nextActions);
      return nextPages;
    });
  };

  const toggleActionForPage = (pageKey: string, actionKey: string) => {
    const pageEnabled = allowedPages.includes(pageKey);
    if (!pageEnabled) {
      // enable page first so action makes sense
      const nextPages = [...allowedPages, pageKey];
      setAllowedPages(nextPages);
      const nextActions = allowedActions.includes(actionKey)
        ? allowedActions.filter((a) => a !== actionKey)
        : [...allowedActions, actionKey];
      setAllowedActions(nextActions);
      persistAssistantPermissions(nextPages, nextActions);
      return;
    }
    setAllowedActions((prev) => {
      const has = prev.includes(actionKey);
      const next = has ? prev.filter((a) => a !== actionKey) : [...prev, actionKey];
      persistAssistantPermissions(allowedPages, next);
      return next;
    });
  };

  const actionOptions: { key: string; label: string; Icon: React.ComponentType<any> }[] = [
    { key: 'create_course', label: language === 'ar' ? 'إنشاء كورس' : 'Create Course', Icon: PlusCircle },
    { key: 'edit_course', label: language === 'ar' ? 'تعديل كورس' : 'Edit Course', Icon: PenSquare },
    { key: 'delete_course', label: language === 'ar' ? 'حذف كورس' : 'Delete Course', Icon: Trash2 },
    { key: 'grade_assignments', label: language === 'ar' ? 'تصحيح الواجبات' : 'Grade Assignments', Icon: CheckSquare },
    { key: 'send_notifications', label: language === 'ar' ? 'إرسال إشعارات' : 'Send Notifications', Icon: Bell },
    { key: 'link_students', label: language === 'ar' ? 'ربط الطلاب' : 'Link Students', Icon: LinkIcon },
    { key: 'manage_students', label: language === 'ar' ? 'إدارة الطلاب' : 'Manage Students', Icon: Users },
  ];

  const toggleInList = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.uid) return;
        const teacher = await TeacherService.getTeacherByUid(user.uid);
        setProfile(teacher);
        if (teacher?.fullName) setFullNameInput(teacher.fullName);
      } catch (e) {
        console.error('Error loading teacher profile', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user?.uid]);

  const fetchAssistants = async () => {
    if (!user?.uid) return;
    try {
      setLoadingAssistants(true);
      const q = query(
        collection(db, 'teachers'),
        where('proxyOf', '==', user.uid),
        where('isAssistant', '==', true)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAssistants(items);
    } catch (err) {
      console.error('Failed to fetch assistants', err);
    } finally {
      setLoadingAssistants(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, [user?.uid, createdAssistantUid]);

  const resendReset = async () => {
    if (!user?.email) return;
    try {
      setSendingReset(true);
      await sendPasswordResetEmail(auth, user.email);
      toast.success(
        language === 'ar'
          ? 'تم إرسال رسالة إلى بريدك الإلكتروني لتغيير كلمة السر (راقب بريدك)'
          : 'A password reset email was sent to your inbox'
      );
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل إرسال رابط إعادة التعيين' : 'Failed to send reset link');
    } finally {
      setSendingReset(false);
    }
  };

  const startEditFullName = () => {
    setEditingFullName(true);
    setFullNameInput(profile?.fullName || '');
  };

  const saveChanges = async () => {
    if (!user?.uid || !editingFullName) return;
    const newName = fullNameInput.trim();
    if (!newName) return;
    try {
      setSaving(true);
      await TeacherService.updateTeacherProfile(user.uid, { fullName: newName });
      setProfile(prev => prev ? { ...prev, fullName: newName, updatedAt: new Date().toISOString() } : prev);
      toast.success(language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
      setEditingFullName(false);
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const isStrongPassword = (pwd: string) => {
    // 8+ chars, upper, lower, number, special
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\d/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    );
  };

  const isValidEmail = (email: string) => {
    const e = email.trim();
    // Basic RFC 5322-style validation, suitable for Firebase Auth
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const createAssistantAccount = async () => {
    try {
      if (!user?.uid) return;
      // basic validations
      if (!assistantName.trim() || !assistantEmail.trim()) {
        toast.error(language === 'ar' ? 'يرجى إدخال الاسم والبريد الإلكتروني' : 'Please enter name and email');
        return;
      }
      if (!isValidEmail(assistantEmail)) {
        toast.error(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
        return;
      }
      if (assistantPassword !== assistantPasswordConfirm) {
        toast.error(language === 'ar' ? 'كلمتا السر غير متطابقتين' : 'Passwords do not match');
        return;
      }
      if (!isStrongPassword(assistantPassword)) {
        toast.error(language === 'ar' ? 'اختر كلمة مرور قوية (حروف كبيرة وصغيرة وأرقام ورمز)' : 'Choose a strong password (upper, lower, number, symbol)');
        return;
      }

      setCreatingAssistant(true);
      // Use secondary Firebase app to avoid switching current session
      const { initializeApp, getApp, deleteApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } = await import('firebase/auth');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');

      const mainApp = getApp();
      const secondaryApp = initializeApp((mainApp as any).options, 'assistantCreation');
      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);

      // Create assistant user in Firebase Auth (secondary app)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, assistantEmail.trim(), assistantPassword);
      const assistantUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: assistantName.trim() });

      // Create teacher profile for assistant with proxy to main teacher
      const nowIso = new Date().toISOString();
      const proxyProfile = {
        uid: assistantUid,
        fullName: assistantName.trim(),
        email: assistantEmail.trim(),
        subjectSpecialization: profile?.subjectSpecialization || '',
        photoURL: '',
        bio: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        isActive: true,
        studentsCount: profile?.studentsCount ?? 0,
        coursesCount: profile?.coursesCount ?? 0,
        // Extra fields for proxying
        proxyOf: user.uid,
        isAssistant: true,
        allowedPages,
        allowedActions
      } as any;
      await setDoc(doc(secondaryDb, 'teachers', assistantUid), proxyProfile);

      // Sign out secondary auth and clean up secondary app
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setAssistantName('');
      setAssistantEmail('');
      setAssistantPassword('');
      setAssistantPasswordConfirm('');
      // Keep selected permissions and remember the created assistant UID for immediate updates
      setCreatedAssistantUid(assistantUid);
      // Refresh assistants list with the newly created assistant
      fetchAssistants();

      toast.success(
        language === 'ar'
          ? 'تم إنشاء حساب المساعد وربطه بحسابك الرئيسي'
          : 'Assistant account created and linked to your main account'
      );
    } catch (err: any) {
      console.error('Assistant creation error:', err);
      const msg = err?.code === 'auth/email-already-in-use'
        ? (language === 'ar' ? 'هذا البريد مسجل مسبقًا' : 'Email already in use')
        : err?.code === 'auth/invalid-email'
          ? (language === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')
          : (language === 'ar' ? 'فشل إنشاء حساب المساعد' : 'Failed to create assistant account');
      toast.error(msg);
    } finally {
      setCreatingAssistant(false);
    }
  };

  const openPermissionsModal = async (assistantId: string) => {
    try {
      const assistantDoc = await getDoc(doc(db, 'teachers', assistantId));
      if (assistantDoc.exists()) {
        const data = assistantDoc.data() as any;
        setSelectedAssistant({ id: assistantId, ...data });
        setEditPages(Array.isArray(data.allowedPages) ? data.allowedPages : []);
        setEditActions(Array.isArray(data.allowedActions) ? data.allowedActions : []);
        setPermissionsOpen(true);
      }
    } catch (err) {
      console.error('Failed to open permissions modal', err);
    }
  };

  const toggleEditPage = (pageKey: string) => {
    setEditPages(prev => {
      const next = prev.includes(pageKey) ? prev.filter(p => p !== pageKey) : [...prev, pageKey];
      return next;
    });
  };

  const toggleEditActionForPage = (pageKey: string, actionKey: string) => {
    // Ensure page is enabled when an action is toggled
    setEditPages(prev => (prev.includes(pageKey) ? prev : [...prev, pageKey]));
    setEditActions(prev => {
      const next = prev.includes(actionKey) ? prev.filter(a => a !== actionKey) : [...prev, actionKey];
      return next;
    });
  };

  const saveAssistantPermissions = async () => {
    if (!selectedAssistant) return;
    try {
      await updateDoc(doc(db, 'teachers', selectedAssistant.id), {
        allowedPages: editPages,
        allowedActions: editActions,
        updatedAt: new Date(),
      });
      toast.success(language === 'ar' ? 'تم تحديث صلاحيات المساعد' : 'Assistant permissions updated');
      setPermissionsOpen(false);
      setSelectedAssistant(null);
      fetchAssistants();
    } catch (err) {
      console.error('Failed to save assistant permissions', err);
      toast.error(language === 'ar' ? 'فشل حفظ الصلاحيات' : 'Failed to save permissions');
    }
  };

  const deleteAssistant = async (assistantId: string) => {
    try {
      await deleteDoc(doc(db, 'teachers', assistantId));
      toast.success(language === 'ar' ? 'تم حذف حساب المساعد' : 'Assistant account deleted');
      setAssistants(prev => prev.filter(a => a.id !== assistantId));
    } catch (err) {
      console.error('Failed to delete assistant', err);
      toast.error(language === 'ar' ? 'فشل حذف حساب المساعد' : 'Failed to delete assistant');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader fixed studentName={profile?.fullName || user?.displayName || user?.email || ''} />
      <div className="container mx-auto px-4 py-6">
        <TeacherSidebar />
        <main className="md:ml-64">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={startEditFullName} disabled={saving} className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d] hover:text-white">
                    <Edit3 className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تعديل الاسم' : 'Edit Name'}
                  </Button>
                  <Button size="sm" onClick={saveChanges} disabled={saving || !editingFullName || !fullNameInput.trim()} className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">{language === 'ar' ? 'جارِ التحميل...' : 'Loading...'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                    {editingFullName ? (
                      <Input value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} />
                    ) : (
                      <Input value={profile?.fullName || ''} readOnly />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input value={profile?.email || user?.email || ''} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'التخصص' : 'Specialization'}</Label>
                    <Input value={profile?.subjectSpecialization || ''} readOnly />
                  </div>
                </div>
              )}
              <div className="mt-6">
                <Button 
                  variant="default" 
                  className="bg-primary hover:bg-primary/90" 
                  onClick={resendReset} 
                  disabled={!user?.email || sendingReset}
                >
                  {sendingReset && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إرسال رابط إعادة تعيين كلمة المرور' : 'Send Password Reset Link'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assistant creation section */}
          <Card className="mt-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {language === 'ar' ? 'إضافة شخص مساعد' : 'Add Assistant'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trialExpired && (
                <div className="mb-3 text-sm text-destructive">
                  {language === 'ar'
                    ? 'انتهت الفترة التجريبية، لا يمكنك إضافة مساعد حتى الاشتراك.'
                    : 'Trial ended; you cannot add assistants until you subscribe.'}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم الكامل للمساعد' : 'Assistant Full Name'}</Label>
                  <Input disabled={trialExpired} value={assistantName} onChange={(e) => setAssistantName(e.target.value)} placeholder={language === 'ar' ? 'اسم المساعد' : 'Assistant name'} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'البريد الإلكتروني للمساعد' : 'Assistant Email'}</Label>
                  <Input disabled={trialExpired} type="email" value={assistantEmail} onChange={(e) => setAssistantEmail(e.target.value)} placeholder="assistant@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'}</Label>
                  <Input disabled={trialExpired} type="password" value={assistantPassword} onChange={(e) => setAssistantPassword(e.target.value)} placeholder={language === 'ar' ? 'اختر كلمة قوية' : 'Choose a strong password'} />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'يُفضل أن تحتوي على حروف كبيرة وصغيرة وأرقام ورمز خاص' : 'Use upper/lowercase letters, numbers, and a special symbol.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                  <Input disabled={trialExpired} type="password" value={assistantPasswordConfirm} onChange={(e) => setAssistantPasswordConfirm(e.target.value)} />
                </div>
              </div>

              {/* Permissions selectors */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">{language === 'ar' ? 'الصفحات المتاحة للمساعد' : 'Pages accessible to assistant'}</h3>
                <div className="flex flex-wrap gap-2">
                  {pageOptions.map(({ key, label, Icon }) => {
                    const selected = allowedPages.includes(key);
                    const pageActions = actionsByPage[key] || [];
                    return (
                      <DropdownMenu key={key}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={() => togglePage(key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/30 hover:bg-muted'}`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>
                            {language === 'ar' ? 'صلاحيات الصفحة' : 'Page permissions'}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {pageActions.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-muted-foreground">
                              {language === 'ar' ? 'لا توجد صلاحيات داخلية لهذه الصفحة' : 'No internal permissions for this page'}
                            </div>
                          ) : (
                            pageActions.map(({ key: actionKey, labelAr, labelEn, Icon: ActionIcon }) => (
                              <DropdownMenuCheckboxItem
                                key={actionKey}
                                checked={allowedActions.includes(actionKey)}
                                onCheckedChange={() => toggleActionForPage(key, actionKey)}
                              >
                                <ActionIcon className="mr-2 h-4 w-4" />
                                {language === 'ar' ? labelAr : labelEn}
                              </DropdownMenuCheckboxItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <Button 
                  onClick={trialExpired ? () => toast.error(language === 'ar' ? 'انتهت الفترة التجريبية، يرجى الاشتراك لتمكين إضافة مساعد' : 'Trial ended; please subscribe to enable assistant creation') : createAssistantAccount}
                  disabled={creatingAssistant || trialExpired}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {creatingAssistant && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إنشاء حساب مساعد' : 'Create Assistant Account'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assistants list section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {language === 'ar' ? 'الحسابات المساعدة' : 'Assistant Accounts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAssistants ? (
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'جارِ التحميل...' : 'Loading...'}</p>
              ) : assistants.length === 0 ? (
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد حسابات مساعدة' : 'No assistants yet'}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assistants.map(a => (
                    <div key={a.id} className="border rounded-lg p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{a.fullName || a.displayName || a.email}</div>
                          <div className="text-sm text-muted-foreground">{a.email}</div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {language === 'ar' ? 'تأكيد حذف الحساب المساعد' : 'Confirm Assistant Deletion'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {language === 'ar' ? 'سيتم حذف هذا الحساب المساعد نهائياً من قائمة المساعدين.' : 'This assistant account will be removed from your assistants list.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2 justify-end mt-4">
                              <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAssistant(a.id)} className="bg-red-600 hover:bg-red-700">
                                {language === 'ar' ? 'حذف' : 'Delete'}
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => openPermissionsModal(a.id)}>
                          {language === 'ar' ? 'إدارة الصلاحيات' : 'Manage Permissions'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions modal */}
          <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'صلاحيات الحساب المساعد' : 'Assistant Account Permissions'}
                </DialogTitle>
              </DialogHeader>
              {selectedAssistant && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{selectedAssistant.fullName || selectedAssistant.email}</div>
                      <div className="text-sm text-muted-foreground">{selectedAssistant.email}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{language === 'ar' ? 'الصفحات المتاحة' : 'Accessible Pages'}</h3>
                    <div className="flex flex-wrap gap-2">
                      {pageOptions.map(({ key, label, Icon }) => {
                        const selected = editPages.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleEditPage(key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/30 hover:bg-muted'}`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{language === 'ar' ? 'صلاحيات الإجراءات' : 'Action Permissions'}</h3>
                    <div className="space-y-3">
                      {Object.keys(actionsByPage).map((pageKey) => {
                        const pageActions = actionsByPage[pageKey] || [];
                        if (pageActions.length === 0) return null;
                        return (
                          <div key={pageKey}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {pageOptions.find(p => p.key === pageKey)?.label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {pageActions.map(({ key: actionKey, labelAr, labelEn, Icon: ActionIcon }) => (
                                <button
                                  key={actionKey}
                                  type="button"
                                  onClick={() => toggleEditActionForPage(pageKey, actionKey)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${editActions.includes(actionKey) ? 'border-primary bg-primary/10 text-primary' : 'border-muted-foreground/30 hover:bg-muted'}`}
                                >
                                  <ActionIcon className="h-4 w-4" />
                                  {language === 'ar' ? labelAr : labelEn}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button onClick={saveAssistantPermissions}>
                      {language === 'ar' ? 'حفظ' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default TeacherSettings;