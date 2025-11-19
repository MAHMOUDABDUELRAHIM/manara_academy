import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/firebase/config";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc, onSnapshot, orderBy, addDoc, serverTimestamp, limit, Timestamp } from "firebase/firestore";
import { toast } from 'sonner';
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { CourseService } from "@/services/courseService";
import { NotificationService } from "@/services/notificationService";
const BROADCAST_TEACHERS = "__ALL_TEACHERS__";
import { TeacherService } from "@/services/teacherService";
import { StudentService, StudentProfile } from "@/services/studentService";
import AssignmentService from "@/services/assignmentService";
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp,
  Bell,
  ExternalLink,
  Play,
  Edit,
  Clock,
  Plus,
  GraduationCap,
  Mail,
  AlertTriangle,
  Copy,
  RefreshCw
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, UploadCloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription as AlertDialogDesc, 
  AlertDialogFooter, 
  AlertDialogAction, 
  AlertDialogCancel 
} from '@/components/ui/alert-dialog';

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  enrolledStudents: number;
  status: 'active' | 'draft' | 'archived';
  category: string;
  price: number;
}

interface TeacherStats {
  totalCourses: number;
  activeStudents: number;
  monthlyEarnings: number;
  totalEarnings: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  linkText?: string;
  linkUrl?: string;
  _isRead?: boolean;
  _expiresMs?: number;
}

export const TeacherDashboard = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === 'ar';
  const [showWelcomeTrial, setShowWelcomeTrial] = useState<boolean>(false);
  const [trialSettings, setTrialSettings] = useState<{ unit: 'days' | 'minutes'; value: number } | null>(null);
  useEffect(() => {
    const loadTrial = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'trial'));
        if (snap.exists()) {
          const d: any = snap.data();
          const unit = d?.unit === 'minutes' ? 'minutes' : 'days';
          const value = typeof d?.value === 'number' && d.value > 0 ? d.value : 1;
          setTrialSettings({ unit, value });
          try { localStorage.setItem('trialSettings', JSON.stringify({ unit, value })); } catch {}
        } else {
          try {
            const cached = localStorage.getItem('trialSettings');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && (parsed.unit === 'days' || parsed.unit === 'minutes') && typeof parsed.value === 'number') {
                setTrialSettings(parsed);
              }
            }
          } catch {}
        }
      } catch {}
    };
    loadTrial();
  }, []);
  
  // Teacher Pricing Plans loaded from Firestore
  interface PricingPlanDoc {
    id?: string;
    name: string;
    period?: string; // e.g. "/month"
    features?: string[];
    popular?: boolean;
    // price sources (one of these should exist)
    priceUsd?: number;
    priceUSD?: number;
    prices?: { USD?: number; EGP?: number; JOD?: number };
    price?: number;
    currency?: 'USD' | 'EGP' | 'JOD';
    order?: number;
  }

  const [plans, setPlans] = useState<PricingPlanDoc[]>([]);

  // Helper to smooth-scroll to pricing section when hash is #pricing
  const scrollToPricing = () => {
    if (window.location.hash === '#pricing') {
      const el = document.getElementById('pricing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Attempt scroll on mount and shortly after (in case of async content)
  useEffect(() => {
    scrollToPricing();
    const t = setTimeout(scrollToPricing, 300);
    return () => clearTimeout(t);
  }, []);

  // Re-attempt scroll after pricing plans render/update
  useEffect(() => {
    scrollToPricing();
  }, [plans.length]);

  // React to hash changes to ensure scroll even when already on dashboard
  useEffect(() => {
    const onHashChange = () => scrollToPricing();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const checkTrialWelcome = async () => {
      try {
        if (user?.role !== 'teacher' || !user?.uid) return;
        const profile = await TeacherService.getTeacherByUid(user.uid).catch(() => null);
        const seen = !!(profile as any)?.hasSeenTrialWelcome;
        if (!seen) {
          setShowWelcomeTrial(true);
        }
      } catch {}
    };
    checkTrialWelcome();
  }, [user?.uid, user?.role]);

  useEffect(() => {
    const sendWelcomeNotificationOnce = async () => {
      try {
        if (user?.role !== 'teacher' || !user?.uid) return;
        const uid = user.uid;
        const profile = await TeacherService.getTeacherByUid(uid).catch(() => null);
        const already = !!(profile as any)?.welcomeNotifCreated;
        if (!already) {
          await NotificationService.createNotification({
            userId: uid,
            title: 'مرحبًا بك في منارة'
            , message: 'يسعدنا انضمامك! يمكنك الآن استكشاف المنصة والبدء في إنشاء دوراتك. جرّب الميزات وتعرّف على اللوحة لتعرف كيف تدير المحتوى والطلاب بسهولة.'
            , type: 'success'
            , origin: 'system'
          } as any);
          await NotificationService.createNotification({
            userId: uid,
            title: 'إرشادات البدء للمدرّس'
            , message: 'ننصحك بالاطلاع على الإرشادات للتعرّف على طريقة استخدام المنصة خطوة بخطوة. إذا واجهت أي مشكلة يمكنك التواصل مع الدعم مباشرة من خلال شات الدعم أو عبر واتساب.'
            , type: 'info'
            , origin: 'system'
            , linkText: 'الإرشادات'
            , linkUrl: '/teacher-dashboard/invite-students'
          } as any);
          await TeacherService.updateTeacherProfile(uid, { welcomeNotifCreated: true } as any);
        }
      } catch {}
    };
    sendWelcomeNotificationOnce();
  }, [user?.uid, user?.role]);

  // Subscription section state
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanDoc | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [walletNumber, setWalletNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [isReceiptValid, setIsReceiptValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [rejectedPlanId, setRejectedPlanId] = useState<string | null>(null);
  const [rejectionVisibleUntil, setRejectionVisibleUntil] = useState<number | null>(null);
  const subscriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rejectionTimeoutRef = useRef<number | null>(null);

  // Currency handling (listening to admin settings)
  const [currency, setCurrency] = useState<'USD' | 'EGP' | 'JOD'>('USD');
  const [adminWalletInitialized, setAdminWalletInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to app currency from Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      const data = snap.data() as any;
      const cur = data?.currency;
      if (cur === 'USD' || cur === 'EGP' || cur === 'JOD') {
        setCurrency(cur);
      }
      // Read admin wallet number from settings/payment and populate walletNumber as read-only
      const adminWallet = typeof data?.adminWalletNumber === 'string' ? data.adminWalletNumber : '';
      if (adminWallet && !adminWalletInitialized) {
        setWalletNumber(adminWallet);
        setAdminWalletInitialized(true);
      }
    }, (error) => {
      console.error('Failed to subscribe to app currency:', error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Subscribe to pricing plans for real-time updates
    let unsubscribe: any = null;
    // Initial one-time fetch to ensure plans render even if streaming is blocked
    try {
      getDocs(collection(db, 'pricingPlans')).then((onceSnap) => {
        const onceData: PricingPlanDoc[] = onceSnap.docs.map((docSnap) => {
          const d = docSnap.data() as any;
          const features = Array.isArray(d.features) ? d.features : [];
          const period = typeof d.period === 'string' ? d.period : '';
          const popular = !!d.popular;
          const order = typeof d.order === 'number' ? d.order : undefined;
          const priceUSD = typeof d.priceUSD === 'number'
            ? d.priceUSD
            : (typeof d.priceUsd === 'number' ? d.priceUsd
              : (typeof d.price === 'number' && d.currency === 'USD' ? d.price : undefined));
          return {
            id: docSnap.id,
            name: d.name || (isArabic ? 'باقة بدون اسم' : 'Unnamed Plan'),
            features,
            period,
            popular,
            order,
            priceUSD,
            prices: d.prices,
            price: d.price,
            currency: d.currency,
          } as PricingPlanDoc;
        });
        setPlans(onceData);
        console.log('[PricingPlans] initial one-time fetch count:', onceData.length);
      }).catch((e) => {
        console.error('Initial one-time fetch for pricingPlans failed:', e);
      });
    } catch (initErr) {
      console.error('Failed to start initial fetch for pricingPlans:', initErr);
    }
    const setupSubscription = () => {
      try {
        const q = query(collection(db, 'pricingPlans'), orderBy('order', 'asc'));
        unsubscribe = onSnapshot(q, (snap) => {
          const data: PricingPlanDoc[] = snap.docs.map((docSnap) => {
            const d = docSnap.data() as any;
            // Normalize fields and provide safe defaults to avoid runtime errors
            const features = Array.isArray(d.features) ? d.features : [];
            const period = typeof d.period === 'string' ? d.period : '';
            const popular = !!d.popular;
            const order = typeof d.order === 'number' ? d.order : undefined;
            const priceUSD = typeof d.priceUSD === 'number'
              ? d.priceUSD
              : (typeof d.priceUsd === 'number' ? d.priceUsd
                : (typeof d.price === 'number' && d.currency === 'USD' ? d.price : undefined));
            return {
              id: docSnap.id,
              name: d.name || (isArabic ? 'باقة بدون اسم' : 'Unnamed Plan'),
              features,
              period,
              popular,
              order,
              priceUSD,
              prices: d.prices,
              price: d.price,
              currency: d.currency,
            } as PricingPlanDoc;
          });
          setPlans(data);
          // If snapshot returns zero plans, perform a one-time fetch to double-check
          if (data.length === 0) {
            getDocs(collection(db, 'pricingPlans')).then((onceSnap) => {
              const onceData: PricingPlanDoc[] = onceSnap.docs.map((docSnap) => {
                const d = docSnap.data() as any;
                const features = Array.isArray(d.features) ? d.features : [];
                const period = typeof d.period === 'string' ? d.period : '';
                const popular = !!d.popular;
                const order = typeof d.order === 'number' ? d.order : undefined;
                const priceUSD = typeof d.priceUSD === 'number'
                  ? d.priceUSD
                  : (typeof d.priceUsd === 'number' ? d.priceUsd
                    : (typeof d.price === 'number' && d.currency === 'USD' ? d.price : undefined));
                return {
                  id: docSnap.id,
                  name: d.name || (isArabic ? 'باقة بدون اسم' : 'Unnamed Plan'),
                  features,
                  period,
                  popular,
                  order,
                  priceUSD,
                  prices: d.prices,
                  price: d.price,
                  currency: d.currency,
                } as PricingPlanDoc;
              });
              setPlans(onceData);
              console.log('[PricingPlans] one-time fetch count:', onceData.length);
            }).catch((e) => {
              console.error('Failed one-time fetch for pricingPlans:', e);
            });
          } else {
            console.log('[PricingPlans] live count:', data.length);
          }
        }, (error) => {
          console.error('Failed to subscribe to pricing plans (ordered):', error);
          // Fallback to unordered subscription if ordering fails for any reason
          try {
            unsubscribe = onSnapshot(collection(db, 'pricingPlans'), (snap2) => {
              const data2: PricingPlanDoc[] = snap2.docs.map((docSnap) => {
                const d = docSnap.data() as any;
                const features = Array.isArray(d.features) ? d.features : [];
                return { id: docSnap.id, name: d.name || (isArabic ? 'باقة بدون اسم' : 'Unnamed Plan'), features, period: d.period || '', popular: !!d.popular, prices: d.prices, priceUSD: d.priceUSD, price: d.price, currency: d.currency } as PricingPlanDoc;
              });
              setPlans(data2);
              console.log('[PricingPlans] fallback live count:', data2.length);
            });
          } catch (fallbackError) {
            console.error('Failed to subscribe to pricing plans (fallback):', fallbackError);
          }
        });
      } catch (err) {
        console.error('Failed to initialize pricing plans subscription:', err);
        try {
          unsubscribe = onSnapshot(collection(db, 'pricingPlans'), (snap2) => {
            const data2: PricingPlanDoc[] = snap2.docs.map((docSnap) => {
              const d = docSnap.data() as any;
              const features = Array.isArray(d.features) ? d.features : [];
              return { id: docSnap.id, name: d.name || (isArabic ? 'باقة بدون اسم' : 'Unnamed Plan'), features, period: d.period || '', popular: !!d.popular, prices: d.prices, priceUSD: d.priceUSD, price: d.price, currency: d.currency } as PricingPlanDoc;
            });
            setPlans(data2);
            console.log('[PricingPlans] final fallback live count:', data2.length);
          });
        } catch (finalError) {
          console.error('Failed to set pricing plans fallback subscription:', finalError);
        }
      }
    };
    setupSubscription();

    return () => {
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch {}
      }
    };
  }, []);

  const currencyMeta: Record<'USD' | 'EGP' | 'JOD', { symbol: string; rate: number }> = {
    USD: { symbol: '$', rate: 1 },
    EGP: { symbol: 'EGP ', rate: 49 },
    JOD: { symbol: 'JOD ', rate: 0.71 },
  };

  const formatPlanPrice = (plan: PricingPlanDoc) => {
    // If plan provides per-currency prices, use them
    if (plan.prices && typeof plan.prices[currency] === 'number') {
      const meta = currencyMeta[currency];
      return `${meta.symbol}${(plan.prices[currency] as number).toFixed(2)}`;
    }
    // If plan has a direct price with currency, use it when matching
    if (typeof plan.price === 'number' && plan.currency === currency) {
      const meta = currencyMeta[currency];
      return `${meta.symbol}${plan.price.toFixed(2)}`;
    }
    // Otherwise fallback to USD source and convert
    const usd = typeof plan.priceUsd === 'number' ? plan.priceUsd
      : typeof plan.priceUSD === 'number' ? plan.priceUSD
      : (typeof plan.price === 'number' && plan.currency === 'USD') ? plan.price
      : undefined;
    if (typeof usd === 'number') {
      const meta = currencyMeta[currency];
      const converted = usd * meta.rate;
      return `${meta.symbol}${converted.toFixed(2)}`;
    }
    // Final fallback: show unknown price
    return isArabic ? 'غير متاح' : 'N/A';
  };

  // Helper to compute numeric price in current currency
  const getPlanNumericPrice = (plan: PricingPlanDoc): number | null => {
    if (plan.prices && typeof plan.prices[currency] === 'number') {
      return plan.prices[currency] as number;
    }
    if (typeof plan.price === 'number' && plan.currency === currency) {
      return plan.price;
    }
    const usd = typeof plan.priceUsd === 'number' ? plan.priceUsd
      : typeof plan.priceUSD === 'number' ? plan.priceUSD
      : (typeof plan.price === 'number' && plan.currency === 'USD') ? plan.price
      : undefined;
    if (typeof usd === 'number') {
      return usd * currencyMeta[currency].rate;
    }
    return null;
  };

  // Process receipt file (image or PDF). Images are compressed to ~800KB; PDFs are accepted
  // directly if under ~800KB. Converts to base64 Data URL for storage in a Firestore document.
  const processReceiptFile = async (file: File): Promise<string> => {
    const targetMaxBytes = 800 * 1024; // ~800KB to stay well within Firestore doc limit when base64-encoded

    if (file.type.startsWith('image/')) {
      const imageBitmap = await createImageBitmap(file);
      const maxDims = [
        { w: 1920, h: 1080 },
        { w: 1600, h: 900 },
        { w: 1280, h: 720 },
        { w: 960, h: 540 },
        { w: 800, h: 450 }
      ];
      const qualities = [0.8, 0.7, 0.6, 0.5, 0.45, 0.4];

      const aspect = imageBitmap.width / imageBitmap.height;
      let lastDataUrl: string | null = null;

      for (const dims of maxDims) {
        const targetW = Math.min(dims.w, imageBitmap.width);
        const targetH = Math.min(dims.h, Math.round(targetW / aspect));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(isArabic ? 'تعذر معالجة الصورة.' : 'Unable to process image.');
        ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);
        for (const q of qualities) {
          const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', q));
          if (!blob) continue;
          if (blob.size <= targetMaxBytes) {
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return dataUrl;
          }
          // Keep last dataUrl candidate in case all attempts exceed size
          lastDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
      if (lastDataUrl) return lastDataUrl;
      throw new Error(isArabic ? 'تعذر ضغط الصورة إلى حجم مناسب.' : 'Unable to compress image to an acceptable size.');
    }

    if (file.type === 'application/pdf') {
      if (file.size > targetMaxBytes) {
        throw new Error(
          isArabic
            ? 'ملف PDF كبير. يرجى رفع ملف أصغر أو صورة.'
            : 'PDF file is too large. Please upload a smaller file or an image.'
        );
      }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return dataUrl;
    }

    throw new Error(
      isArabic
        ? 'نوع ملف الإيصال غير مدعوم. يسمح بالصور أو PDF.'
        : 'Unsupported receipt file type. Only images or PDF are allowed.'
    );
  };

  const openSubscription = (plan: typeof plans[number]) => {
    setSelectedPlan(plan);
    setShowSubscription(true);
    // Use setTimeout to ensure section is rendered before scrolling
    setTimeout(() => {
      const node = subscriptionSectionRef.current;
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (node) {
        window.scrollTo({ top: (node as any).offsetTop - 24, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleCompleteSubscription = async () => {
    if (!selectedPlan) return;
    if (!walletNumber || walletNumber.trim().length < 6) {
      toast.error(isArabic ? 'يرجى التأكد من رقم المحفظة.' : 'Please verify the wallet number.');
      return;
    }
    if (!receiptFile) {
      toast.error(isArabic ? 'يرجى رفع إيصال الدفع أولاً.' : 'Please upload the payment receipt first.');
      return;
    }
    if (!isReceiptValid) {
      toast.error(isArabic ? 'الإيصال غير صالح، يرجى اختيار صورة بصيغة JPEG/PNG.' : 'Receipt is invalid. Please select a JPEG/PNG image.');
      return;
    }
    try {
      setShowSuccessMessage(false);
      setIsSubmitting(true);
      setUploadProgress(15);
      const receiptBase64 = await processReceiptFile(receiptFile);
      setUploadProgress(60);
      const amount = getPlanNumericPrice(selectedPlan);
      if (amount === null) {
        throw new Error(isArabic ? 'تعذر تحديد سعر الباقة المختارة.' : 'Unable to determine selected plan price.');
      }
      // Use effectiveTeacherId (supports assistant accounts via proxyOf) to ensure
      // subscription records match the ID used by route guards and listeners.
      const teacherId = effectiveTeacherId || user?.uid || (user as any)?.id || 'unknown';
      const teacherName = (user?.profile?.fullName || user?.displayName || 'unknown') as string;
      const paymentDoc = {
        teacherId,
        teacherName,
        planId: selectedPlan.id || null,
        planName: selectedPlan.name,
        period: selectedPlan.period || '',
        amount,
        currency,
        walletNumber,
        receiptBase64,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'payments'), paymentDoc);
      setUploadProgress(100);
      setShowSuccessMessage(true);
      setPendingPlanId(selectedPlan.id || null);
      setShowSubscription(false);

      setReceiptFile(null);
      setIsReceiptValid(false);
      setReceiptError('');
      if (receiptPreview) {
        try { URL.revokeObjectURL(receiptPreview); } catch {}
        setReceiptPreview(null);
      }
      setTimeout(() => setUploadProgress(0), 800);
    } catch (err: any) {
      console.error('Complete subscription error:', err);
      const msg = err?.message || '';
      toast.error(
        isArabic
          ? `حدث خطأ أثناء تأكيد الدفع. حاول مرة أخرى. ${msg ? '(' + msg + ')' : ''}`
          : `An error occurred while confirming payment. Try again. ${msg ? '(' + msg + ')' : ''}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateReceipt = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSizeMB = 10;
    const isTypeOk = allowedTypes.includes(file.type);
    const isSizeOk = file.size <= maxSizeMB * 1024 * 1024;
    if (!isTypeOk) {
      setReceiptError(isArabic ? 'نوع الملف غير مدعوم. يسمح بالصورة (JPEG/PNG) أو PDF.' : 'Unsupported file type. Allowed: JPEG/PNG image or PDF.');
      setIsReceiptValid(false);
      return false;
    }
    if (!isSizeOk) {
      setReceiptError(isArabic ? `حجم الملف يتجاوز ${maxSizeMB} ميجابايت.` : `File size exceeds ${maxSizeMB} MB.`);
      setIsReceiptValid(false);
      return false;
    }
    setReceiptError('');
    setIsReceiptValid(true);
    return true;
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      try {
        const url = URL.createObjectURL(file);
        setReceiptPreview(url);
      } catch {
        setReceiptPreview(null);
      }
    } else {
      if (receiptPreview) {
        try { URL.revokeObjectURL(receiptPreview); } catch {}
      }
      setReceiptPreview(null);
    }
    if (file) validateReceipt(file);
    else {
      setIsReceiptValid(false);
      setReceiptError(isArabic ? 'لم يتم اختيار ملف.' : 'No file selected.');
    }
  };

  useEffect(() => {
    return () => {
      if (receiptPreview) {
        try { URL.revokeObjectURL(receiptPreview); } catch {}
      }
    };
  }, [receiptPreview]);
  
  // Empty state for new teachers - all data will come from backend later
  const teacherName = user?.profile?.fullName || user?.displayName || (language === 'ar' ? 'مدرس جديد' : 'New Teacher');
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const displayTeacherName = teacherProfile?.fullName || teacherName;
  
  // Email verification state
  const [showEmailVerification, setShowEmailVerification] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [personalList, setPersonalList] = useState<Notification[]>([]);
  const [broadcastList, setBroadcastList] = useState<Notification[]>([]);
  const [newNotifPreview, setNewNotifPreview] = useState<{ title: string; message: string; type?: string } | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const didInitRef = useRef<boolean>(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const uid = user?.uid || (user as any)?.id;
        if (!uid) {
          setNotifications([]);
          setNotificationCount(0);
          return;
        }
        const list = await NotificationService.getUserNotifications(uid, 50);
        const broadcastSnap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', BROADCAST_TEACHERS), limit(50)));
        const broadcast = broadcastSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const merged = [...list, ...broadcast] as Array<Record<string, unknown>>;
        const nowMs = Date.now();
        const filtered = merged.filter((n) => {
          const ex = (n as { expiresAt?: unknown }).expiresAt;
          let exMs: number | undefined;
          if (ex instanceof Timestamp) exMs = ex.toDate().getTime();
          else if (typeof ex === 'string') exMs = new Date(ex).getTime();
          return !exMs || nowMs < exMs;
        });
        const mapped: Notification[] = filtered.map((n) => {
          const createdRaw = (n as { createdAt?: unknown }).createdAt;
          const created =
            createdRaw instanceof Timestamp
              ? createdRaw.toDate().toISOString()
              : typeof createdRaw === 'string'
              ? createdRaw
              : new Date().toISOString();
          const typeRaw = (n as { type?: unknown }).type;
          const typeVal =
            typeRaw === 'success' || typeRaw === 'warning' || typeRaw === 'info' ? (typeRaw as 'success' | 'warning' | 'info') : 'info';
          return {
            id: String((n as { id?: unknown }).id || ''),
            title: String((n as { title?: unknown }).title || ''),
            message: String((n as { message?: unknown }).message || ''),
            time: String(created),
            type: typeVal,
            _isRead: Boolean((n as { isRead?: unknown }).isRead),
            linkText: (n as { linkText?: string }).linkText,
            linkUrl: (n as { linkUrl?: string }).linkUrl,
          };
        });
        setPersonalList(mapped);
        setNotificationCount(mapped.filter((n) => !n._isRead).length);
      } catch (e) {
        try {
          setPersonalList([]);
          setNotificationCount(0);
        } catch (err) { void err }
      }
    };
    loadNotifications();
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid || (user as any)?.id;
    if (!uid) return;
    const qPersonal = query(collection(db, 'notifications'), where('userId', '==', uid));
    const qBroadcast = query(collection(db, 'notifications'), where('userId', '==', BROADCAST_TEACHERS));
    const unsubPersonal = onSnapshot(qPersonal, (snap) => {
      try {
        const list: Notification[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdRaw = (data as { createdAt?: unknown }).createdAt;
          const created = createdRaw instanceof Timestamp ? createdRaw.toDate().toISOString() : typeof createdRaw === 'string' ? createdRaw : new Date().toISOString();
          const exRaw = (data as { expiresAt?: unknown }).expiresAt;
          const exMs = exRaw instanceof Timestamp ? exRaw.toDate().getTime() : typeof exRaw === 'string' ? new Date(exRaw).getTime() : undefined;
          const typeRaw = (data as { type?: unknown }).type;
          const typeVal = typeRaw === 'success' || typeRaw === 'warning' || typeRaw === 'info' ? (typeRaw as 'success' | 'warning' | 'info') : 'info';
          return {
            id: d.id,
            title: String((data as { title?: unknown }).title || ''),
            message: String((data as { message?: unknown }).message || ''),
            time: String(created),
            type: typeVal,
            _isRead: Boolean((data as { isRead?: unknown }).isRead),
            _expiresMs: typeof exMs === 'number' ? exMs : undefined,
            linkText: (data as { linkText?: string }).linkText,
            linkUrl: (data as { linkUrl?: string }).linkUrl,
          };
        });
        const nowMs = Date.now();
        const visible = list.filter((n) => !n._expiresMs || nowMs < n._expiresMs);
        visible.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setPersonalList(visible);
        const unread = visible.filter((n) => !n._isRead).length;
        setNotificationCount(unread);
      } catch (e) {
        console.error('Failed to parse live notifications:', e);
      }
    }, (err) => {
      try {
        setPersonalList([]);
      } catch (e) { void e }
    });
    const unsubBroadcast = onSnapshot(qBroadcast, (snap) => {
      try {
        const list: Notification[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdRaw = (data as { createdAt?: unknown }).createdAt;
          const created = createdRaw instanceof Timestamp ? createdRaw.toDate().toISOString() : typeof createdRaw === 'string' ? createdRaw : new Date().toISOString();
          const exRaw = (data as { expiresAt?: unknown }).expiresAt;
          const exMs = exRaw instanceof Timestamp ? exRaw.toDate().getTime() : typeof exRaw === 'string' ? new Date(exRaw).getTime() : undefined;
          const typeRaw = (data as { type?: unknown }).type;
          const typeVal = typeRaw === 'success' || typeRaw === 'warning' || typeRaw === 'info' ? (typeRaw as 'success' | 'warning' | 'info') : 'info';
          return {
            id: d.id,
            title: String((data as { title?: unknown }).title || ''),
            message: String((data as { message?: unknown }).message || ''),
            time: String(created),
            type: typeVal,
            _isRead: Boolean((data as { isRead?: unknown }).isRead),
            _expiresMs: typeof exMs === 'number' ? exMs : undefined,
            linkText: (data as { linkText?: string }).linkText,
            linkUrl: (data as { linkUrl?: string }).linkUrl,
          };
        });
        const nowMs = Date.now();
        const visible = list.filter((n) => !n._expiresMs || nowMs < n._expiresMs);
        visible.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setBroadcastList(visible);
      } catch (e) {
        console.error('Failed to parse broadcast notifications:', e);
      }
    }, (err) => { try { setBroadcastList([]); } catch (e) { void e } });
    return () => { try { unsubPersonal(); unsubBroadcast(); } catch (e) { void e } };
  }, [user?.uid]);

  useEffect(() => {
    const combine = () => {
      const merged: Notification[] = [
        ...personalList.map((n) => ({ id: n.id, title: n.title, message: n.message, time: n.time, type: n.type, linkText: n.linkText, linkUrl: n.linkUrl })),
        ...broadcastList.map((n) => ({ id: n.id, title: n.title, message: n.message, time: n.time, type: n.type, linkText: n.linkText, linkUrl: n.linkUrl }))
      ];
      const seen = new Set<string>();
      const uniq = merged.filter((x) => {
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      });
      uniq.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(uniq);
      try {
        const prev = prevIdsRef.current;
        const incoming = new Set<string>(uniq.map((x) => x.id));
        if (didInitRef.current) {
          const firstNew = uniq.find((x) => !prev.has(x.id));
          if (firstNew) {
            setNewNotifPreview({ title: firstNew.title, message: firstNew.message, type: firstNew.type });
          }
        } else {
          didInitRef.current = true;
        }
        prevIdsRef.current = incoming;
      } catch (e) { void e }
    };
    combine();
  }, [personalList, broadcastList]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<StudentProfile[]>([]);
  const [showStudentInfo, setShowStudentInfo] = useState<boolean>(false);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [studentCoursesForTeacher, setStudentCoursesForTeacher] = useState<Array<{ id: string; title: string }>>([]);
  const [assignSummary, setAssignSummary] = useState<{ count: number; average: number } | null>(null);
  const [examSummary, setExamSummary] = useState<{ count: number; average: number } | null>(null);
  // moved teacherProfile above to compute displayTeacherName
  // إدارة كود الدعوة المخصص
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(true);
  const [isCustomCodeMode, setIsCustomCodeMode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  
  const [stats, setStats] = useState<TeacherStats>({
    totalCourses: 0,
    activeStudents: 0,
    monthlyEarnings: 0,
    totalEarnings: 0
  });

  // حالة موافقة الاشتراك من قبل الإدارة
  const [isSubscriptionApproved, setIsSubscriptionApproved] = useState<boolean>(false);
  const [courseStudentsCount, setCourseStudentsCount] = useState<Record<string, number>>({});

  // تحديث الإحصائيات عند تغيير الدورات
  useEffect(() => {
    if (courses.length > 0) {
      const totalStudents = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);
      const totalEarnings = courses.reduce((sum, course) => sum + (course.price * course.enrolledStudents), 0);
      
      setStats({
        totalCourses: courses.length,
        activeStudents: totalStudents,
        monthlyEarnings: totalEarnings * 0.1, // افتراض 10% من الأرباح الشهرية
        totalEarnings: totalEarnings
      });
    }
  }, [courses]);

  // حساب معرف المدرس الفعّال للمستخدم (يدعم حسابات المساعد عبر proxyOf)
  const [effectiveTeacherId, setEffectiveTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const resolveEffectiveTeacher = async () => {
      if (!user?.uid) return;
      try {
        const profile = await TeacherService.getTeacherByUid(user.uid);
        const effId = profile?.id || user.uid;
        setEffectiveTeacherId(effId);
      } catch (e) {
        setEffectiveTeacherId(user.uid);
      }
    };
    resolveEffectiveTeacher();
  }, [user?.uid]);

  useEffect(() => {
    const loadStudentDetails = async () => {
      if (!showStudentInfo || !activeStudent) {
        setStudentCoursesForTeacher([]);
        setAssignSummary(null);
        setExamSummary(null);
        return;
      }
      const teacherCourseIds = new Set((courses || []).map((c) => c.id));
      const enrolledIds = (activeStudent.enrolledCourses || []).filter((id) => teacherCourseIds.has(id));
      const titles = (courses || [])
        .filter((c) => enrolledIds.includes(c.id))
        .map((c) => ({ id: c.id, title: c.title }));
      setStudentCoursesForTeacher(titles);

      try {
        const attempts = await AssignmentService.getAssignmentAttemptsForStudent(activeStudent.id);
        const filtered = attempts.filter((a) => a.courseId && enrolledIds.includes(a.courseId as string));
        const count = filtered.length;
        let avg = 0;
        if (count > 0) {
          const percents = filtered.map((a) => {
            const total = (a.totalPoints ?? a.total ?? 0) as number;
            const earned = (a.earnedPoints ?? a.correct ?? 0) as number;
            return total > 0 ? (earned / total) * 100 : 0;
          });
          avg = Math.round(percents.reduce((s, p) => s + p, 0) / count);
        }
        setAssignSummary({ count, average: avg });
      } catch {}

      try {
        const examResultsObj = (activeStudent as any)?.examResults || {};
        const results = Object.values(examResultsObj) as any[];
        const graded = results.filter(
          (r) => typeof r.total === "number" && typeof r.score === "number" && r.total > 0 && r.status === "graded"
        );
        const countE = graded.length;
        let avgE = 0;
        if (countE > 0) {
          avgE = Math.round(graded.reduce((s, r) => s + (r.score / r.total) * 100, 0) / countE);
        }
        setExamSummary(countE > 0 ? { count: countE, average: avgE } : null);
      } catch {}
    };
    loadStudentDetails();
  }, [showStudentInfo, activeStudent, courses]);

  // الاستماع لوثائق المدفوعات لهذا المدرس لمزامنة حالات الاشتراك: pending/approved/rejected بشكل فوري ومستمر
  useEffect(() => {
    if (!effectiveTeacherId) return;
    try {
      const q = query(
        collection(db, 'payments'),
        where('teacherId', '==', effectiveTeacherId)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let hasApproved = false;
        let hasValidApproved = false;
        let pendingForPlan: string | null = null;
        let latestApprovedAtMs: number | undefined;
        let latestPendingCreatedMs: number | undefined;
        const rejectedDocs: { planId?: string; cancelledAtMs?: number; createdAtMs?: number }[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const st = d?.status;
          if (st === 'approved') {
            hasApproved = true;
            const exp = d?.expiresAt?.toDate?.() || d?.expiresAt || null;
            if (exp instanceof Date) {
              if (Date.now() < exp.getTime()) {
                hasValidApproved = true;
              }
            }
            const apprTs = d?.approvedAt?.toDate?.() || d?.approvedAt || d?.createdAt?.toDate?.() || d?.createdAt || null;
            const apprMs = apprTs instanceof Date ? apprTs.getTime() : undefined;
            if (typeof apprMs === 'number') {
              if (latestApprovedAtMs == null || apprMs > latestApprovedAtMs) latestApprovedAtMs = apprMs;
            }
          } else if (st === 'pending') {
            pendingForPlan = typeof d?.planId === 'string' ? d.planId : pendingForPlan;
            const pendTs = d?.createdAt?.toDate?.() || d?.createdAt || null;
            const pendMs = pendTs instanceof Date ? pendTs.getTime() : undefined;
            if (typeof pendMs === 'number') {
              if (latestPendingCreatedMs == null || pendMs > latestPendingCreatedMs) latestPendingCreatedMs = pendMs;
            }
          } else if (st === 'rejected') {
            const cancelledTs = d?.cancelledAt?.toDate?.() || d?.cancelledAt || null;
            const createdTs = d?.createdAt?.toDate?.() || d?.createdAt || null;
            rejectedDocs.push({
              planId: typeof d?.planId === 'string' ? d.planId : undefined,
              cancelledAtMs: cancelledTs instanceof Date ? cancelledTs.getTime() : undefined,
              createdAtMs: createdTs instanceof Date ? createdTs.getTime() : undefined,
            });
          }
        });

        if (hasValidApproved) {
          setIsSubscriptionApproved(true);
          try { localStorage.setItem('isSubscriptionApproved', 'true'); } catch {}
          setPendingPlanId(null);
          // clear any rejection banner
          setRejectedPlanId(null);
          setRejectionVisibleUntil(null);
          if (rejectionTimeoutRef.current) { try { clearTimeout(rejectionTimeoutRef.current); } catch {} rejectionTimeoutRef.current = null; }
        } else if (pendingForPlan) {
          setIsSubscriptionApproved(false);
          try { localStorage.setItem('isSubscriptionApproved', 'false'); } catch {}
          setPendingPlanId(pendingForPlan);
          // clear any rejection banner when new pending is present
          setRejectedPlanId(null);
          setRejectionVisibleUntil(null);
          if (rejectionTimeoutRef.current) { try { clearTimeout(rejectionTimeoutRef.current); } catch {} rejectionTimeoutRef.current = null; }
        } else if (rejectedDocs.length > 0) {
          const byCancel = rejectedDocs
            .filter(r => typeof r.cancelledAtMs === 'number')
            .sort((a, b) => ((b.cancelledAtMs || 0) - (a.cancelledAtMs || 0)));
          const latest = byCancel[0];
          const latestCancelMs = latest?.cancelledAtMs;
          const isCancellationLatest = typeof latestCancelMs === 'number'
            && (latestApprovedAtMs == null || latestCancelMs > latestApprovedAtMs)
            && (latestPendingCreatedMs == null || latestCancelMs > latestPendingCreatedMs);
          if (latest && latest.planId && isCancellationLatest) {
            setIsSubscriptionApproved(false);
            try { localStorage.setItem('isSubscriptionApproved', 'false'); } catch {}
            setPendingPlanId(null);
            setRejectedPlanId(latest.planId);
            const expiresAt = Date.now() + 5 * 60 * 1000;
            setRejectionVisibleUntil(expiresAt);
            if (rejectionTimeoutRef.current) { try { clearTimeout(rejectionTimeoutRef.current); } catch {} }
            rejectionTimeoutRef.current = window.setTimeout(() => {
              setRejectedPlanId(null);
              setRejectionVisibleUntil(null);
              rejectionTimeoutRef.current = null;
            }, 5 * 60 * 1000);
          } else {
            setIsSubscriptionApproved(false);
            try { localStorage.setItem('isSubscriptionApproved', 'false'); } catch {}
          }
        } else {
          // Preserve existing pending state to avoid race conditions right after upload
          // Do not force-clear pendingPlanId when no payment docs are observed yet
          setIsSubscriptionApproved(false);
          try { localStorage.setItem('isSubscriptionApproved', 'false'); } catch {}
        }
      }, (error) => {
        console.error('Subscription status listener error:', error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Failed to subscribe to teacher payments:', err);
    }
  }, [effectiveTeacherId]);

  // جلب دورات المدرس باستخدام المعرف الفعّال
  useEffect(() => {
    const fetchCourses = async () => {
      if (!effectiveTeacherId) return;
      try {
        setIsLoadingCourses(true);
        const instructorCourses = await CourseService.getInstructorCourses(effectiveTeacherId);
        setCourses(instructorCourses);
      } catch (error) {
        console.error('خطأ في جلب الدورات:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [effectiveTeacherId]);

  useEffect(() => {
    const computeCounts = async () => {
      if (!effectiveTeacherId || courses.length === 0) {
        setCourseStudentsCount({});
        return;
      }
      const counts: Record<string, number> = {};
      for (const course of courses) {
        try {
          const qref = query(
            collection(db, 'students'),
            where('teacherId', '==', effectiveTeacherId),
            where('enrolledCourses', 'array-contains', course.id)
          );
          const snap = await getDocs(qref);
          counts[course.id] = snap.size;
        } catch {
          counts[course.id] = 0;
        }
      }
      setCourseStudentsCount(counts);
    };
    computeCounts();
  }, [courses, effectiveTeacherId]);

  useEffect(() => {
    if (!effectiveTeacherId || courses.length === 0) return;
    const studentsQ = query(
      collection(db, 'students'),
      where('teacherId', '==', effectiveTeacherId)
    );
    const unsub = onSnapshot(studentsQ, (snap) => {
      const counts: Record<string, number> = {};
      for (const c of courses) counts[c.id] = 0;
      snap.forEach((doc) => {
        const data = doc.data() as any;
        const enrolled: string[] = data.enrolledCourses || [];
        for (const cid of enrolled) {
          if (counts[cid] != null) counts[cid] += 1;
        }
      });
      setCourseStudentsCount(counts);
    });
    return () => unsub();
  }, [effectiveTeacherId, courses]);

  // جلب الطلاب المرتبطين والمسجلين
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user?.uid) return;
      try {
        setIsLoadingStudents(true);
        // جلب ملف تعريف المدرس (يراعي proxyOf)
        let profile = await TeacherService.getTeacherByUid(user.uid);
        if (!profile) {
          profile = await TeacherService.createTeacherProfile(
            user.uid,
            teacherName,
            user.email || ''
          );
        }
        if (profile) {
          setTeacherProfile(profile);
          const effId = profile.id || user.uid;
          setEffectiveTeacherId(effId);
          // جلب الطلاب المرتبطين (للإحصائيات)
          const students = await TeacherService.getStudentsForTeacher(effId);
          setLinkedStudents(students);
          // جلب الطلاب المسجلين مع التفاصيل الكاملة
          const registeredStudentsData = await StudentService.getStudentsByTeacher(effId);
          setRegisteredStudents(registeredStudentsData);
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات المدرس:', error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchTeacherData();
  }, [user?.uid, teacherName]);

  const getStatusBadge = (status: Course['status'] | null | undefined) => {
    const statusConfig = {
      active: { 
        label: language === 'ar' ? 'نشط' : 'Active', 
        variant: 'default' as const 
      },
      draft: { 
        label: language === 'ar' ? 'مسودة' : 'Draft', 
        variant: 'secondary' as const 
      },
      archived: { 
        label: language === 'ar' ? 'مؤرشف' : 'Archived', 
        variant: 'outline' as const 
      }
    } as const;

    const key = (status ?? 'draft') as keyof typeof statusConfig;
    return statusConfig[key] ?? { 
      label: language === 'ar' ? 'غير محدد' : 'Unknown', 
      variant: 'secondary' as const 
    };
  };

  // نسخ رابط الدعوة
  const copyInviteLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/invite/${effectiveTeacherId || user?.uid}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success(language === 'ar' ? 'تم نسخ الرابط بنجاح!' : 'Link copied successfully!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };



  // Handle sending verification email using Firebase Auth
  const handleSendVerificationEmail = async () => {
    if (!auth.currentUser) {
      console.error('No authenticated user found');
      return;
    }
    
    setIsSendingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      console.log('Verification email sent successfully via Firebase Auth');
      // Show success message
      alert(language === 'ar' ? 'تم إرسال بريد التحقق بنجاح!' : 'Verification email sent successfully!');
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      
      // Handle specific Firebase errors
      let errorMessage = '';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = language === 'ar' 
          ? 'تم إرسال عدد كبير من الطلبات. يرجى المحاولة مرة أخرى بعد قليل.' 
          : 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = language === 'ar' 
          ? 'المستخدم غير موجود.' 
          : 'User not found.';
      } else {
        errorMessage = language === 'ar' 
          ? 'فشل في إرسال بريد التحقق. يرجى المحاولة مرة أخرى.' 
          : 'Failed to send verification email. Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Check email verification status on component mount and listen for changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest email verification status
        await currentUser.reload();
        const updatedUser = auth.currentUser;
        
        if (updatedUser) {
          const isVerified = updatedUser.emailVerified;
          setIsEmailVerified(isVerified);
          setShowEmailVerification(!isVerified);
          
          // If email is verified, save this status to Firestore for persistence
          if (isVerified) {
            try {
              const userDocRef = doc(db, 'teachers', updatedUser.uid);
              await updateDoc(userDocRef, {
                emailVerified: true,
                emailVerifiedAt: new Date()
              });
            } catch (error) {
              console.error('Error updating email verification status:', error);
            }
          }
        }
      }
    });

    // Also check Firestore for persistent verification status
    const checkFirestoreVerification = async () => {
      try {
        const userDocRef = doc(db, 'teachers', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // If this account is an assistant (has proxyOf), do not suppress UI based on Firestore flag
          if (userData.emailVerified && !userData.proxyOf) {
            setIsEmailVerified(true);
            setShowEmailVerification(false);
          }
        }
      } catch (error) {
        console.error('Error checking Firestore verification:', error);
      }
    };

    checkFirestoreVerification();

    return () => unsubscribe();
  }, [user]);

  // توليد كود فريد من 6 أحرف/أرقام
  const generateUniqueCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      try {
        const codesQuery = query(
          collection(db, 'invitationCodes'),
          where('code', '==', code)
        );
        const querySnapshot = await getDocs(codesQuery);
        isUnique = querySnapshot.empty;
      } catch (error) {
        console.error('Error checking code uniqueness:', error);
        break;
      }
    }
    return code;
  };

  // تحميل كود الدعوة الحالي أو إنشاؤه للمدرس
  const loadInvitationCode = async () => {
    if (!effectiveTeacherId) return;
    try {
      const userDocRef = doc(db, 'teachers', effectiveTeacherId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.invitationCode) {
          setInvitationCode(userData.invitationCode);
        } else {
          const newCode = await generateUniqueCode();
          setInvitationCode(newCode);
          await updateDoc(userDocRef, { invitationCode: newCode });
          await setDoc(doc(db, 'invitationCodes', newCode), {
            code: newCode,
            teacherId: effectiveTeacherId,
            teacherName: user.displayName || user.email,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error loading invitation code:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل رمز الدعوة' : 'Error loading invitation code');
    } finally {
      setIsLoadingCode(false);
    }
  };

  useEffect(() => {
    if (!effectiveTeacherId) return;
    loadInvitationCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTeacherId]);

  // حفظ كود مخصص واستبدال القديم
  const saveCustomCode = async () => {
    if (!effectiveTeacherId || !customCode.trim()) return;
    const codeRegex = /^[A-Z0-9]{6}$/;
    const upperCode = customCode.toUpperCase();
    if (!codeRegex.test(upperCode)) {
      toast.error(language === 'ar' ? 'الرمز يجب أن يكون 6 أحرف أو أرقام' : 'Code must be 6 alphanumeric characters');
      return;
    }
    try {
      // تحقق من أن الكود غير مستخدم لدى مدرس آخر
      const codesQuery = query(
        collection(db, 'invitationCodes'),
        where('code', '==', upperCode)
      );
      const querySnapshot = await getDocs(codesQuery);
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        if (existingDoc.data().teacherId !== effectiveTeacherId) {
          toast.error(language === 'ar' ? 'هذا الرمز مستخدم بالفعل' : 'This code is already taken');
          return;
        }
      }
      // حذف الكود القديم إن وجد
      if (invitationCode) {
        const oldCodeDoc = doc(db, 'invitationCodes', invitationCode);
        await deleteDoc(oldCodeDoc);
      }
      // حفظ الكود الجديد في مستند المدرس ومجموعة الأكواد
      const userDocRef = doc(db, 'teachers', effectiveTeacherId);
      await updateDoc(userDocRef, { invitationCode: upperCode });
      await setDoc(doc(db, 'invitationCodes', upperCode), {
        code: upperCode,
        teacherId: effectiveTeacherId,
        teacherName: user?.displayName || user?.email,
        createdAt: new Date()
      });
      setInvitationCode(upperCode);
      setCustomCode('');
      setIsCustomCodeMode(false);
      toast.success(language === 'ar' ? 'تم حفظ الرمز بنجاح' : 'Code saved successfully');
    } catch (error) {
      console.error('Error saving custom code:', error);
      toast.error(language === 'ar' ? 'خطأ في حفظ الرمز' : 'Error saving code');
    }
  };

  // Empty state components
  const EmptyCoursesState = () => (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {language === 'ar' ? 'لا توجد دورات بعد' : 'No courses yet'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {language === 'ar' 
          ? 'ابدأ رحلتك التعليمية بإنشاء دورتك الأولى وشارف معرفتك مع الطلاب'
          : 'Start your teaching journey by creating your first course and share your knowledge with students'
        }
      </p>
      <Link to="/teacher-dashboard/create-course">
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {language === 'ar' ? 'إنشاء دورة جديدة' : 'Create New Course'}
        </Button>
      </Link>
    </div>
  );

  const EmptyNotificationsState = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium mb-2">
        {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
      </h4>
      <p className="text-xs text-muted-foreground">
        {language === 'ar' 
          ? 'ستظهر الإشعارات هنا عند وجود تحديثات'
          : 'Notifications will appear here when there are updates'
        }
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir="ltr">
      <Dialog open={showWelcomeTrial} onOpenChange={(open) => {
        setShowWelcomeTrial(open);
        try {
          if (!open && (effectiveTeacherId || user?.uid)) {
            const tid = effectiveTeacherId || user?.uid || '';
            TeacherService.updateTeacherProfile(tid, { hasSeenTrialWelcome: true }).catch(() => {});
          }
        } catch {}
      }}>
        <DialogContent
          className="sm:max-w-2xl w-[95vw] max-w-[95vw] h-[85vh] p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="h-full flex flex-col">
            <div className="h-1/2">
              <img
                src="/بانر%20نافذة%20الترحيب.png"
                alt={language === 'ar' ? 'بانر نافذة الترحيب' : 'Welcome dialog banner'}
                className="w-full h-full object-cover block"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="px-6 pt-4 flex-1 overflow-y-auto">
                <DialogHeader className="text-center">
                  <DialogTitle className="text-[#2c4656] text-center">
                    {language === 'ar' ? 'بدأت نسختك التجريبية الآن' : 'Your trial starts now'}
                    {trialSettings ? (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {language === 'ar'
                          ? `${trialSettings.value} ${trialSettings.unit === 'days' ? 'أيام' : 'دقائق'}`
                          : `${trialSettings.value} ${trialSettings.unit === 'days' ? 'days' : 'minutes'}`}
                      </span>
                    ) : null}
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    {language === 'ar'
                      ? 'مرحبًا بك! يمكنك تجربة الميزات الممتازة لدينا لتحديد الباقة الأنسب لك. تشمل ميزاتك:'
                      : 'Welcome! Try our premium features to determine the best plan for you. Your features include:'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" dir="ltr">
                  {[
                    { ar: 'لوحة التحكم والإحصائيات السريعة', en: 'Dashboard & quick stats' },
                    { ar: 'إدارة الدورات الحالية', en: 'Manage existing courses' },
                    { ar: 'إضافة كورس جديد', en: 'Add New Course' },
                    { ar: 'الامتحانات والواجبات', en: 'Exams & assignments' },
                    { ar: 'دعوة الطلاب وتخصيص المنصة', en: 'Invite students & customize platform' },
                    { ar: 'الأرباح والمدفوعات', en: 'Earnings & payouts' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                      <span className="text-sm text-gray-900">
                        {language === 'ar' ? item.ar : item.en}
                      </span>
                      <Check className="h-5 w-5 text-[#ee7b3d]" />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="px-6 pb-6">
                <Button onClick={() => {
                  try {
                    const tid = effectiveTeacherId || user?.uid || '';
                    if (tid) TeacherService.updateTeacherProfile(tid, { hasSeenTrialWelcome: true }).catch(() => {});
                  } catch {}
                  setShowWelcomeTrial(false);
                }} className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white">
                  {language === 'ar' ? 'لنبدأ' : "Let's go"}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DashboardHeader fixed studentName={displayTeacherName} notificationCount={notificationCount} notifications={notifications} newNotificationPreview={newNotifPreview} onPreviewClear={() => setNewNotifPreview(null)} defaultOpenNotifications={showWelcomeTrial} onNotificationsOpen={async () => {
        try {
          const uid = user?.uid || (user as any)?.id;
          if (uid) await NotificationService.markAllAsRead(uid);
        } catch {}
        setNotificationCount(0);
        setNewNotifPreview(null);
      }} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar isSubscriptionApproved={isSubscriptionApproved} />
        
        {/* Main Content */}
        <main className={`md:ml-64 flex-1 p-6 overflow-y-auto`}>
          {/* Welcome Section (moved above pricing, centered) */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {language === 'ar' ? 'مرحباً' : 'Welcome'}, {displayTeacherName}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              {language === 'ar' 
                ? 'ابدأ رحلتك التعليمية وشارك معرفتك مع الطلاب حول العالم'
                : 'Start your teaching journey and share your knowledge with students worldwide'
              }
            </p>
          </div>

          

          {/* Subscription Section (moved below pricing) */}
          {/* The details card renders after pricing plans for clearer flow */}
          {/* Note: openSubscription() scrolls to this ref when a plan is selected */}
          {/* Keep this conditional to only show after selection */}
          
          
          {/* Registered Students Section (correct version below pricing) */}

          {/* Welcome Section moved above pricing */}

          {/* Email Verification Alert disabled: verification is enforced via route guard */}

          {/* Stats Cards */}
          {isSubscriptionApproved && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'ابدأ بإنشاء دورتك الأولى' : 'Start by creating your first course'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'الطلاب المرتبطون' : 'Linked Students'}
                </CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{linkedStudents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الطلاب المسجلون بكودك' : 'Students registered with your code'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === 'ar' ? 'الطلاب المسجلون' : 'Registered Students'}
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{registeredStudents.length}</div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الطلاب المسجلون في دوراتك' : 'Students enrolled in your courses'}
                </p>
              </CardContent>
            </Card>

            {/* تمت إزالة بطاقتي الأرباح الشهرية وإجمالي الأرباح */}
          </div>
          )}

          {/* Invitation Link Section (visible before subscription) */}
          <Card className="mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                {language === 'ar' ? 'رابط دعوة الطلاب' : 'Student Invitation Link'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-mono text-gray-900 break-all bg-white p-3 rounded border">
                      {`${window.location.origin}/invite/${effectiveTeacherId || user?.uid || 'teacher-id'}`}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === 'ar' 
                        ? 'شارك هذا الرابط مع الطلاب للتسجيل في دوراتك'
                        : 'Share this link with students to register for your courses'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink()}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {language === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
                
                {/* Custom Invitation Code Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">
                    {language === 'ar' ? 'تخصيص رمز الدعوة (اختياري)' : 'Customize Invitation Code (Optional)'}
                  </h4>
                  {!isCustomCodeMode ? (
                    <Button 
                      onClick={() => setIsCustomCodeMode(true)}
                      variant="outline"
                      size="sm"
                      className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d] hover:text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تخصيص الرمز' : 'Customize Code'}
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          placeholder={language === 'ar' ? 'أدخل رمز مخصص (6 أحرف)' : 'Enter custom code (6 chars)'}
                          maxLength={6}
                          className="font-mono text-center px-3 py-2 border rounded-md text-sm"
                        />
                        <Button 
                          onClick={saveCustomCode}
                          size="sm"
                          className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => { setIsCustomCodeMode(false); setCustomCode(''); }}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' 
                          ? 'يجب أن يكون الرمز 6 أحرف أو أرقام باللغة الإنجليزية'
                          : 'Code must be 6 alphanumeric characters'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* تم إلغاء سيشن الطلاب المرتبطون */}
              </div>
            </CardContent>
          </Card>

          {/* Teacher Pricing Plans Section (hidden when subscription is active) */}
          {!isSubscriptionApproved && (
          <div id="pricing" className="mb-8">
            <div className="text-center mb-6">
              {/* Removed pricing title as requested */}
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                {t('pricingDescription')}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan, index) => (
                <Card key={index} className={`h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-xl ${plan.popular ? 'border-[#ee7b3d]' : ''}`}>
                  {plan.popular && (
                    <div className="bg-[#ee7b3d] text-white text-center py-2 font-semibold rounded-t-xl">
                      {t('mostPopular')}
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{formatPlanPrice(plan)}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </CardDescription>
                    {pendingPlanId === plan.id && (
                      <div className="mt-2 p-2 rounded border bg-yellow-50 text-yellow-900">
                        {isArabic ? (
                          <div>
                            <span className="font-semibold">تم تأكيد الاشتراك بانتظار التفعيل</span>
                            <span className="block text-xs mt-1">إذا لم يتم التفعيل خلال دقائق يرجى التواصل مع <a href="https://wa.me/01129972098" target="_blank" rel="noopener noreferrer" className="underline text-[#2c4656]">الدعم الفني</a>.</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold">Subscription confirmed, awaiting activation</span>
                            <span className="block text-xs mt-1">If not activated within minutes, please contact <a href="https://wa.me/01129972098" target="_blank" rel="noopener noreferrer" className="underline text-[#2c4656]">Support</a>.</span>
                          </div>
                        )}
                      </div>
                    )}
                    {rejectedPlanId === plan.id && rejectionVisibleUntil && Date.now() < rejectionVisibleUntil && (
                      <div className="mt-2 p-2 rounded border bg-red-50 text-red-900">
                        {isArabic ? (
                          <div>
                            <span className="font-semibold">تم رفض الاشتراك في الباقة</span>
                            <span className="block text-xs mt-1">يمكنك المحاولة مرة أخرى واختيار إحدى الباقات المتاحة.</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold">Subscription was rejected</span>
                            <span className="block text-xs mt-1">You can try again and choose one of the available plans.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start">
                          <Check className="w-5 h-5 text-[#ee7b3d] mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white' : 'border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d]/10'}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => openSubscription(plan)}
                      disabled={!!pendingPlanId}
                      aria-disabled={!!pendingPlanId}
                    >
                      {pendingPlanId ? (isArabic ? 'بانتظار التفعيل' : 'Awaiting Activation') : t('getStarted')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
          </div>
          )}

          {/* Subscription Section (appears after selecting a plan) */}
          {showSubscription && selectedPlan && (
            <div ref={subscriptionSectionRef} className="mb-10 scroll-mt-24" aria-live="polite">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>
                    {isArabic ? 'تفاصيل الباقة المختارة' : 'Selected Plan Details'}
                  </CardTitle>
                  <CardDescription>
                    <span className="font-semibold text-foreground mr-2">{selectedPlan.name}</span>
                    <span className="text-muted-foreground">{formatPlanPrice(selectedPlan)}{selectedPlan.period}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Selected plan features */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">
                        {isArabic ? 'ميزات الباقة' : 'Plan Features'}
                      </h4>
                      <ul className="space-y-3">
                        {selectedPlan.features.map((feature: string, fIndex: number) => (
                          <li key={fIndex} className="flex items-start">
                            <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Wallet and receipt upload */}
                    <div>
                      <Label htmlFor="wallet" className="text-sm">
                        {isArabic ? 'رقم المحفظة' : 'Wallet Number'}
                      </Label>
                      <Input
                        id="wallet"
                        value={walletNumber}
                        readOnly
                        placeholder={isArabic ? 'رقم المحفظة (يتم تحديده بواسطة الإدارة)' : 'Wallet number (set by admin)'}
                        className="mt-2"
                        inputMode="numeric"
                        aria-readonly="true"
                        aria-describedby="wallet-help"
                      />
                      <p id="wallet-help" className="text-xs text-muted-foreground mt-1">
                        {isArabic
                          ? 'للاشتراك، ادفع على رقم المحفظة هذا ثم ارفع إيصال الدفع، وسيتم تفعيل الباقة خلال دقائق.'
                          : 'To subscribe, pay to this wallet number, upload the payment receipt, and your plan will be activated within minutes.'}
                      </p>

                      <div className="mt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud className="w-4 h-4 mr-2" />
                          {isArabic ? 'إضافة إيصال الدفع' : 'Add Payment Receipt'}
                        </Button>
                        {receiptFile && (
                          <div className="mt-3">
                            <div className="text-sm text-muted-foreground mb-2">
                              {isArabic ? 'معاينة الإيصال:' : 'Receipt preview:'}
                            </div>
                            {receiptPreview && receiptFile?.type?.startsWith('image/') ? (
                              <img src={receiptPreview} alt="Receipt preview" className="max-h-64 rounded border" />
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {isArabic ? 'تم اختيار ملف غير صورة (مثل PDF). لا توجد معاينة.' : 'A non-image file (e.g., PDF) was selected. No preview.'}
                              </div>
                            )}
                            <div className="mt-2">
                              <Progress value={uploadProgress} className="w-full" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {isArabic ? `جاري الرفع: ${uploadProgress}%` : `Uploading: ${uploadProgress}%`}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Button 
                            onClick={handleCompleteSubscription} 
                            disabled={isSubmitting || !(isReceiptValid && walletNumber.trim().length >= 6)}
                            aria-disabled={isSubmitting || !(isReceiptValid && walletNumber.trim().length >= 6)}
                            className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                          >
                            {isArabic ? 'رفع الإيصال وتفعيل الباقة' : 'Upload Receipt and Activate Plan'}
                          </Button>
                          <Button variant="outline" onClick={() => setShowSubscription(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                            {isArabic ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Registered Students Section */}
          {isSubscriptionApproved && (<>
          <Card className="mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-gray-400" />
                {language === 'ar' ? 'قائمة الطلاب المسجلين' : 'Registered Students'}
                <Badge variant="secondary" className="ml-2">
                  {registeredStudents.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c4656]"></div>
                </div>
              ) : registeredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {language === 'ar' ? 'لا يوجد طلاب مسجلين' : 'No registered students'}
                  </h3>
                  <p className="text-gray-500">
                    {language === 'ar' 
                      ? 'شارك رمز الدعوة مع الطلاب للبدء'
                      : 'Share your invitation code with students to get started'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-3 px-4 font-medium">
                          {language === 'ar' ? 'اسم الطالب' : 'Student Name'}
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          {language === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          {language === 'ar' ? 'الحالة' : 'Status'}
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          {language === 'ar' ? 'إجراءات' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredStudents.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{student.fullName}</td>
                          <td className="py-3 px-4 text-gray-600">{student.email}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {student.createdAt?.toDate?.()?.toLocaleDateString('en-US') || 
                             new Date(student.createdAt).toLocaleDateString('en-US')}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={student.isActive ? "default" : "secondary"}>
                              {student.isActive 
                                ? (language === 'ar' ? 'نشط' : 'Active')
                                : (language === 'ar' ? 'غير نشط' : 'Inactive')
                              }
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d]/10"
                                onClick={() => { setActiveStudent(student); setShowStudentInfo(true); }}
                              >
                                {language === 'ar' ? 'معلومات الحساب' : 'Account Info'}
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                                disabled={suspendingId === student.id}
                                onClick={async () => {
                                  try {
                                    setSuspendingId(student.id);
                                    await StudentService.toggleStudentStatus(student.id);
                                    setRegisteredStudents(prev => prev.map(s => s.id === student.id ? { ...s, isActive: !s.isActive } : s));
                                    toast.success(language === 'ar' ? (student.isActive ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب') : (student.isActive ? 'Account suspended' : 'Account activated'));
                                  } catch (e) {
                                    toast.error(language === 'ar' ? 'فشل تغيير حالة الحساب' : 'Failed to change account status');
                                  } finally {
                                    setSuspendingId(null);
                                  }
                                }}
                              >
                                {student.isActive ? (language === 'ar' ? 'إيقاف الحساب' : 'Suspend') : (language === 'ar' ? 'تفعيل الحساب' : 'Activate')}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Account Info Dialog */}
          <Dialog open={showStudentInfo} onOpenChange={setShowStudentInfo}>
            <DialogContent className="sm:max-w-2xl xl:max-w-4xl" dir="ltr">
              <DialogHeader>
                <DialogTitle className="text-center">{language === 'ar' ? 'معلومات الحساب' : 'Account Information'}</DialogTitle>
              </DialogHeader>
              {activeStudent && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={(activeStudent as any)?.photoURL || ''} alt={activeStudent.fullName} />
                      <AvatarFallback>{activeStudent.fullName?.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-xl font-semibold text-foreground">{activeStudent.fullName}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{activeStudent.email}</span>
                      </div>
                    </div>
                    <Badge variant={activeStudent.isActive ? 'default' : 'secondary'}>
                      {activeStudent.isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-sm text-muted-foreground">{language === 'ar' ? 'الدورات المسجل بها' : 'Enrolled Courses'}</div>
                      <div className="text-2xl font-bold">{studentCoursesForTeacher.length}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-sm text-muted-foreground">{language === 'ar' ? 'متوسط الواجبات' : 'Assignments Avg'}</div>
                      <div className="text-2xl font-bold">{assignSummary ? `${assignSummary.average}%` : '-'}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="text-sm text-muted-foreground">{language === 'ar' ? 'متوسط الامتحانات' : 'Exams Avg'}</div>
                      <div className="text-2xl font-bold">{examSummary ? `${examSummary.average}%` : '-'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>{language === 'ar' ? 'تاريخ التسجيل' : 'Registered At'}</span>
                        <span className="font-medium">{activeStudent.createdAt ? (activeStudent.createdAt as any)?.toDate?.()?.toLocaleString('en-US') || new Date(activeStudent.createdAt as any).toLocaleString('en-US') : '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{language === 'ar' ? 'الحالة' : 'Status'}</span>
                        <span className="font-medium">{activeStudent.isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الاشتراك' : 'Enrollment'}</span>
                        <Badge variant={studentCoursesForTeacher.length > 0 ? 'default' : 'secondary'}>
                          {studentCoursesForTeacher.length > 0 ? (language === 'ar' ? 'مشترك' : 'Enrolled') : (language === 'ar' ? 'غير مشترك' : 'Not Enrolled')}
                        </Badge>
                      </div>
                      {studentCoursesForTeacher.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {studentCoursesForTeacher.map((c) => (
                            <Badge key={c.id} variant="secondary">{c.title}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          {/* Delete Confirmation */}
          <AlertDialog open={!!deletingStudentId} onOpenChange={(open) => !open && setDeletingStudentId(null)}>
            <AlertDialogContent dir="ltr">
              <AlertDialogHeader>
                <AlertDialogTitle>{language === 'ar' ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}</AlertDialogTitle>
                <AlertDialogDesc>{language === 'ar' ? 'سيتم حذف بيانات الطالب نهائياً ولا يمكن استعادتها.' : 'This will permanently delete the student data and cannot be undone.'}</AlertDialogDesc>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingStudentId(null)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={async () => {
                    if (!deletingStudentId) return;
                    try {
                      await StudentService.deleteStudentProfile(deletingStudentId);
                      setRegisteredStudents(prev => prev.filter(s => s.id !== deletingStudentId));
                      toast.success(language === 'ar' ? 'تم حذف الحساب' : 'Account deleted');
                    } catch (e) {
                      toast.error(language === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account');
                    } finally {
                      setDeletingStudentId(null);
                    }
                  }}
                >
                  {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>)}

          {isSubscriptionApproved && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Courses Section */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{language === 'ar' ? 'كورساتي' : 'My Courses'}</span>
                    {courses.length > 0 && (
                      <Link to="/teacher-dashboard/courses">
                        <Button variant="ghost" size="sm">
                          {language === 'ar' ? 'عرض الكل' : 'View All'}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCourses ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">
                        {language === 'ar' ? 'جاري تحميل الدورات...' : 'Loading courses...'}
                      </p>
                    </div>
                  ) : courses.length === 0 ? (
                    <EmptyCoursesState />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {courses.map((course) => {
                        const students = courseStudentsCount[course.id] ?? 0;
                        const earnings = Math.round((course.price || 0) * students);
                        return (
                          <div key={course.id} className="group border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white">
                            <div className="w-full h-32 bg-muted">
                              {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-4 text-center">
                              <h3 className="font-medium truncate" title={course.title}>{course.title}</h3>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {students} {language === 'ar' ? 'طالب' : 'students'} • {earnings} {language === 'ar' ? 'ج.م' : 'EGP'}
                              </div>
                              <div className="mt-2 flex items-center justify-center gap-2">
                                <Badge variant={getStatusBadge(course.status).variant}>{getStatusBadge(course.status).label}</Badge>
                                <Link to={`/teacher-dashboard/courses/${course.id}/add-lesson`}>
                                  <Button size="sm" variant="outline" className="h-7 px-2">
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    {language === 'ar' ? 'إضافة درس' : 'Add Lesson'}
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}

          {/* Getting Started Section for New Teachers */}
          {courses.length === 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {language === 'ar' ? 'ابدأ رحلتك التعليمية' : 'Start Your Teaching Journey'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'إنشاء دورة' : 'Create Course'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'ابدأ بإنشاء دورتك الأولى وشارف خبرتك'
                        : 'Start by creating your first course and share your expertise'
                      }
                    </p>
                    <Link to="/teacher-dashboard/create-course">
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'إنشاء الآن' : 'Create Now'}
                      </Button>
                    </Link>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'جذب الطلاب' : 'Attract Students'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'اجعل دورتك جذابة لتحصل على المزيد من الطلاب'
                        : 'Make your course attractive to get more students'
                      }
                    </p>
                    <Button size="sm" variant="outline" disabled>
                      {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                    </Button>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-2">
                      {language === 'ar' ? 'تحقيق الأرباح' : 'Earn Money'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === 'ar' 
                        ? 'احصل على أرباح من دوراتك وخبرتك'
                        : 'Earn money from your courses and expertise'
                      }
                    </p>
                    <Link to="/teacher-dashboard/payouts">
                      <Button size="sm" variant="outline">
                        {language === 'ar' ? 'عرض الأرباح' : 'View Payouts'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Floating Support Chat */}
      <FloatingSupportChat />
    </div>
  );
};

export default TeacherDashboard;