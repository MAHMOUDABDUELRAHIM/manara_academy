import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import {
  CreditCard,
  Search,
  Filter,
  Eye,
  Check,
  X,
  DollarSign,
  Calendar,
  User,
  BookOpen,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '@/firebase/config';
import { StorageService } from '@/services/storageService';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, orderBy, updateDoc, getDoc, where, getDocs } from 'firebase/firestore';
import { TeacherService } from '@/services/teacherService';

interface AdminPayment {
  id: string;
  teacher: {
    name: string;
    email: string;
    avatar?: string;
    id: string;
  };
  amount: number;
  currency?: 'USD' | 'EGP' | 'JOD';
  createdAt: string; // formatted
  createdAtMs?: number; // for ordering
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'refunded';
  planId?: string;
  walletNumber?: string;
  receiptBase64?: string;
  rawPeriod?: string;
  extendedByDays?: number;
  type?: string;
  addonGB?: number;
}

interface PayoutRequest {
  id: string;
  teacher: {
    name: string;
    email: string;
    avatar?: string;
  };
  amount: number;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe';
  bankDetails?: {
    accountNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  notes?: string;
}

const PaymentsPayouts: React.FC = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);

  // Payments from Firestore
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [teacherPhones, setTeacherPhones] = useState<Record<string, string>>({});

  // Mock payout requests data - will be replaced with real data from backend
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

  // Admin wallet/phone number state
  const [adminWalletInput, setAdminWalletInput] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);
  const [currentAdminWallet, setCurrentAdminWallet] = useState('');

  // Subscribe to settings/payment for existing admin wallet number
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      const data = snap.data() as any;
      const wallet = typeof data?.adminWalletNumber === 'string' ? data.adminWalletNumber : '';
      setCurrentAdminWallet(wallet);
      // Pre-fill input with current saved value
      if (wallet) setAdminWalletInput(wallet);
    }, (err) => {
      console.error('Failed to subscribe to admin wallet setting:', err);
    });
    return () => unsub();
  }, []);

  // Subscribe to payments collection from Firestore
  useEffect(() => {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const rows: AdminPayment[] = snapshot.docs.map((d) => {
        const data = d.data() as any;
        const ts = data.createdAt?.toDate ? data.createdAt.toDate() : (typeof data.createdAt === 'number' ? new Date(data.createdAt) : new Date());
        const formattedDate = ts.toLocaleString();
        return {
          id: d.id,
          teacher: {
            name: data.teacherName || '—',
            email: data.teacherEmail || '—',
            avatar: undefined,
            id: data.teacherId || '—',
          },
          amount: typeof data.amount === 'number' ? data.amount : 0,
          currency: data.currency,
          createdAt: formattedDate,
          createdAtMs: ts.getTime(),
          status: (data.status as AdminPayment['status']) || 'pending',
          planId: data.planId,
          walletNumber: data.walletNumber,
          receiptBase64: data.receiptBase64,
          rawPeriod: (data.period || ''),
          extendedByDays: typeof data.extendedByDays === 'number' ? data.extendedByDays : 0,
          type: data.type,
          addonGB: typeof data.addonGB === 'number' ? data.addonGB : undefined,
        };
      });
      setPayments(rows);
    }, (err) => {
      console.error('Failed to subscribe to payments:', err);
      toast.error(language === 'ar' ? 'تعذر تحميل المدفوعات من فايرستور.' : 'Failed to load payments from Firestore.');
    });
    return () => unsub();
  }, [language]);

  useEffect(() => {
    const ids = Array.from(new Set(payments.map((p) => p.teacher?.id).filter((id) => id && id !== '—')));
    const toFetch = ids.filter((id) => !(id in teacherPhones));
    if (toFetch.length === 0) return;
    (async () => {
      try {
        const results = await Promise.all(toFetch.map(async (id) => {
          try {
            const tp = await TeacherService.getTeacherProfile(id!);
            const phone = (tp?.phoneNumber || '').toString().trim();
            return { id: id!, phone };
          } catch {
            return { id: id!, phone: '' };
          }
        }));
        setTeacherPhones((prev) => {
          const next = { ...prev };
          results.forEach(({ id, phone }) => {
            if (phone) next[id] = phone;
          });
          return next;
        });
      } catch {}
    })();
  }, [payments]);

  const validateWallet = (raw: string) => {
    // Allow digits, spaces, dashes, leading +; normalize to digits with optional leading +
    const trimmed = raw.trim();
    const allowed = /^[+]?([0-9][ \-]?){6,20}$/;
    return allowed.test(trimmed);
  };

  const normalizeWallet = (raw: string) => {
    const t = raw.trim();
    const hasPlus = t.startsWith('+');
    const digits = t.replace(/[^0-9]/g, '');
    return (hasPlus ? '+' : '') + digits;
  };

  const handleSaveAdminWallet = async () => {
    const input = adminWalletInput;
    if (!validateWallet(input)) {
      toast.error(language === 'ar' ? 'الرقم غير صالح. تحقق من التنسيق.' : 'Invalid number. Please check the format.');
      return;
    }
    const normalized = normalizeWallet(input);
    try {
      setSavingWallet(true);
      await setDoc(
        doc(db, 'settings', 'payment'),
        {
          adminWalletNumber: normalized,
          adminWalletUpdatedBy: auth.currentUser?.uid || null,
          adminWalletUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setCurrentAdminWallet(normalized);
      setAdminWalletInput(normalized);
      toast.success(language === 'ar' ? 'تم حفظ رقم الهاتف/المحفظة بنجاح' : 'Phone/Wallet number saved successfully');
    } catch (e) {
      console.error('Failed to save admin wallet number:', e);
      toast.error(language === 'ar' ? 'فشل حفظ الرقم. حاول مرة أخرى.' : 'Failed to save number. Please try again.');
    } finally {
      setSavingWallet(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const pRef = doc(db, 'payments', paymentId);
      const pSnap = await getDoc(pRef);
      const pdata: any = pSnap.exists() ? pSnap.data() : {};
      const teacherId: string | undefined = typeof pdata?.teacherId === 'string' ? pdata.teacherId : undefined;
      let planDocData: any = null;
      const planId: string | undefined = typeof pdata?.planId === 'string' ? pdata.planId : undefined;
      const planName: string | undefined = typeof pdata?.planName === 'string' ? pdata.planName : undefined;
      if (planId) {
        const psnap = await getDoc(doc(db, 'pricingPlans', planId));
        planDocData = psnap.exists() ? psnap.data() : null;
      }
      if (!planDocData && planName) {
        const qByName = query(collection(db, 'pricingPlans'), where('name', '==', planName));
        const s2 = await getDocs(qByName);
        planDocData = s2.docs[0]?.data() || null;
      }
      let periodMs: number | null = null;
      try {
        const periodStr = (planDocData?.period || '').toString().toLowerCase();
        const isYear = periodStr.includes('year') || periodStr.includes('annual') || periodStr.includes('سنوي') || periodStr.includes('سنة');
        const isHalfYear = periodStr.includes('half') || periodStr.includes('semi') || periodStr.includes('semiannual') || periodStr.includes('semi-annual') || periodStr.includes('نصف') || periodStr.includes('نصف سنوي');
        const isMonth = periodStr.includes('month') || periodStr.includes('monthly') || periodStr.includes('شهري') || periodStr.includes('شهر');
        const isFiveMin = (periodStr.includes('5') && (periodStr.includes('minute') || periodStr.includes('minutes') || periodStr.includes('دقيقة') || periodStr.includes('دقائق')));
        if (isFiveMin) {
          periodMs = 5 * 60 * 1000;
        } else if (isYear) {
          periodMs = 365 * 24 * 60 * 60 * 1000;
        } else if (isHalfYear) {
          periodMs = 180 * 24 * 60 * 60 * 1000;
        } else if (isMonth) {
          periodMs = 30 * 24 * 60 * 60 * 1000;
        }
      } catch {}
      if (!periodMs) {
        const rawPeriod = (pdata?.period || '').toString().toLowerCase();
        const isYear = rawPeriod.includes('year') || rawPeriod.includes('annual') || rawPeriod.includes('سنوي') || rawPeriod.includes('سنة');
        const isHalfYear = rawPeriod.includes('half') || rawPeriod.includes('semi') || rawPeriod.includes('semiannual') || rawPeriod.includes('semi-annual') || rawPeriod.includes('نصف') || rawPeriod.includes('نصف سنوي') || rawPeriod.includes('ستة أشهر') || rawPeriod.includes('6 اشهر') || rawPeriod.includes('6 أشهر');
        const isMonth = rawPeriod.includes('month') || rawPeriod.includes('monthly') || rawPeriod.includes('شهري') || rawPeriod.includes('شهر');
        const isFiveMin = (rawPeriod.includes('5') && (rawPeriod.includes('minute') || rawPeriod.includes('minutes') || rawPeriod.includes('دقيقة') || rawPeriod.includes('دقائق')));
        if (isFiveMin) {
          periodMs = 5 * 60 * 1000;
        } else if (isYear) {
          periodMs = 365 * 24 * 60 * 60 * 1000;
        } else if (isHalfYear) {
          periodMs = 180 * 24 * 60 * 60 * 1000;
        } else if (isMonth) {
          periodMs = 30 * 24 * 60 * 60 * 1000;
        }
      }
      if (!periodMs) {
        toast.error(language === 'ar' ? 'لا توجد مدة محددة لهذه الباقة.' : 'No duration defined for this plan.');
        return;
      }
      const expiresDate = new Date(Date.now() + periodMs);

      await updateDoc(pRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.uid || null,
        approvedPeriodDays: Math.round(periodMs / (24 * 60 * 60 * 1000)),
        expiresAt: expiresDate,
      });
      try {
        if (teacherId) {
          const usedBytes = await StorageService.getTeacherStorageUsageBytes(teacherId);
          await updateDoc(doc(db, 'teachers', teacherId), {
            usageBaselineBytes: usedBytes,
            usageResetAt: new Date().toISOString(),
            s3UsageBytes: 0,
            extraStorageGB: 0,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {}
      toast.success(language === 'ar' ? 'تم قبول الدفع وتم تحديد انتهاء الاشتراك.' : 'Payment approved and subscription expiry set.');
    } catch (e) {
      console.error('Failed to approve payment:', e);
      toast.error(language === 'ar' ? 'تعذر قبول الدفع.' : 'Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.uid || null,
      });
      toast.success(language === 'ar' ? 'تم رفض الدفع.' : 'Payment rejected.');
    } catch (e) {
      console.error('Failed to reject payment:', e);
      toast.error(language === 'ar' ? 'تعذر رفض الدفع.' : 'Failed to reject payment.');
    }
  };

  const handleApproveStorageAddon = async (paymentId: string) => {
    try {
      const pRef = doc(db, 'payments', paymentId);
      const pSnap = await getDoc(pRef);
      const pdata: any = pSnap.exists() ? pSnap.data() : {};
      const teacherId: string | undefined = pdata?.teacherId;
      const addonGB: number = typeof pdata?.addonGB === 'number' ? pdata.addonGB : 0;
      if (!teacherId || !addonGB || addonGB <= 0) {
        toast.error(language === 'ar' ? 'بيانات الطلب غير مكتملة.' : 'Request data incomplete.');
        return;
      }
      const tRef = doc(db, 'teachers', teacherId);
      const tSnap = await getDoc(tRef);
      const tdata: any = tSnap.exists() ? tSnap.data() : {};
      const currentExtra: number = typeof tdata?.extraStorageGB === 'number' ? tdata.extraStorageGB : 0;
      const nextExtra = currentExtra + addonGB;
      await updateDoc(tRef, { extraStorageGB: nextExtra, updatedAt: new Date().toISOString() });
      await updateDoc(pRef, { status: 'approved', approvedAt: serverTimestamp(), approvedBy: auth.currentUser?.uid || null, approvedAddonGB: addonGB });
      toast.success(language === 'ar' ? 'تمت الموافقة على المساحة الإضافية وزيادتها للمدرس.' : 'Storage add-on approved and applied to teacher.');
    } catch (e) {
      console.error('Approve storage add-on failed:', e);
      toast.error(language === 'ar' ? 'تعذر الموافقة على المساحة الإضافية.' : 'Failed to approve storage add-on.');
    }
  };

  const handleRejectStorageAddon = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status: 'rejected', rejectedAt: serverTimestamp(), rejectedBy: auth.currentUser?.uid || null });
      toast.success(language === 'ar' ? 'تم رفض طلب المساحة الإضافية.' : 'Storage add-on request rejected.');
    } catch (e) {
      console.error('Reject storage add-on failed:', e);
      toast.error(language === 'ar' ? 'تعذر رفض الطلب.' : 'Failed to reject request.');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">{language === 'ar' ? 'موافق عليه' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{language === 'ar' ? 'فشل' : 'Failed'}</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-orange-600">{language === 'ar' ? 'مسترد' : 'Refunded'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">{language === 'ar' ? 'موافق عليه' : 'Approved'}</Badge>;
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{language === 'ar' ? 'تم التحويل' : 'Processed'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprovePayout = (payoutId: string) => {
    setPayoutRequests(prev => 
      prev.map(payout => 
        payout.id === payoutId 
          ? { ...payout, status: 'approved' as const }
          : payout
      )
    );
  };

  const handleRejectPayout = (payoutId: string) => {
    setPayoutRequests(prev => 
      prev.map(payout => 
        payout.id === payoutId 
          ? { ...payout, status: 'rejected' as const }
          : payout
      )
    );
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayouts = payoutRequests.filter(payout => {
    const matchesSearch = payout.teacher.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // List of approved payments for the renamed tab
  const approvedPayments = payments.filter(payment => {
    const isApproved = payment.status === 'approved';
    const matchesSearch = payment.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    return isApproved && matchesSearch;
  });

  const rejectedPayments = payments.filter(payment => {
    const isRejected = payment.status === 'rejected';
    const matchesSearch = payment.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    return isRejected && matchesSearch;
  });

  const storageAddonRequests = payments.filter((p) => p.type === 'storage_addon');

  // Calculate real total payments (approved only)
  const totalPayments = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);

  const [extensionDays, setExtensionDays] = useState<Record<string, number>>({});
  const [extLoadingByTeacher, setExtLoadingByTeacher] = useState<Record<string, boolean>>({});
  const [bulkPeriod, setBulkPeriod] = useState<'all' | 'monthly' | 'half' | 'year' | 'five'>('all');
  const [bulkDays, setBulkDays] = useState<number>(0);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [cancelLoadingByTeacher, setCancelLoadingByTeacher] = useState<Record<string, boolean>>({});
  const [cancelDialogOpenByTeacher, setCancelDialogOpenByTeacher] = useState<Record<string, boolean>>({});

  const handleExtendExpiry = async (teacherId: string) => {
    try {
      const days = extensionDays[teacherId] || 0;
      if (!days || days < 1) {
        toast.error(language === 'ar' ? 'أدخل عدد الأيام (1 على الأقل)' : 'Enter number of days (at least 1)');
        return;
      }
      setExtLoadingByTeacher(prev => ({ ...prev, [teacherId]: true }));
      const q = query(collection(db, 'payments'), where('teacherId', '==', teacherId), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error(language === 'ar' ? 'لا توجد مدفوعات مقبولة لهذا المدرس.' : 'No approved payments for this teacher.');
        setExtLoadingByTeacher(prev => ({ ...prev, [teacherId]: false }));
        return;
      }
      const docs = snap.docs.map(d => ({ id: d.id, data: d.data() as any }));
      docs.sort((a, b) => {
        const ae = a.data.expiresAt?.toDate?.()?.getTime?.() || a.data.expiresAt?.getTime?.() || 0;
        const be = b.data.expiresAt?.toDate?.()?.getTime?.() || b.data.expiresAt?.getTime?.() || 0;
        if (ae !== be) return be - ae;
        const ac = a.data.createdAt?.seconds || 0;
        const bc = b.data.createdAt?.seconds || 0;
        return bc - ac;
      });
      const latest = docs[0];
      const currentExp: Date | null = latest.data.expiresAt?.toDate?.() || latest.data.expiresAt || null;
      const baseMs = currentExp instanceof Date ? currentExp.getTime() : Date.now();
      const addMs = days * 24 * 60 * 60 * 1000;
      const newExp = new Date(baseMs + addMs);
      await updateDoc(doc(db, 'payments', latest.id), { expiresAt: newExp, extendedByDays: (latest.data.extendedByDays || 0) + days });
      toast.success(language === 'ar' ? `تم تمديد الاشتراك ${days} يومًا.` : `Subscription extended by ${days} day(s).`);
      setExtensionDays(prev => ({ ...prev, [teacherId]: 0 }));
    } catch (e) {
      console.error('Failed to extend subscription:', e);
      toast.error(language === 'ar' ? 'تعذر تمديد الاشتراك.' : 'Failed to extend subscription.');
    } finally {
      setExtLoadingByTeacher(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  const handleCancelSubscription = async (teacherId: string) => {
    try {
      setCancelLoadingByTeacher(prev => ({ ...prev, [teacherId]: true }));
      const q = query(collection(db, 'payments'), where('teacherId', '==', teacherId), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error(language === 'ar' ? 'لا توجد مدفوعات مقبولة لهذا المدرس.' : 'No approved payments for this teacher.');
        setCancelLoadingByTeacher(prev => ({ ...prev, [teacherId]: false }));
        return;
      }
      const docs = snap.docs.map(d => ({ id: d.id, data: d.data() as any }));
      docs.sort((a, b) => {
        const ae = a.data.expiresAt?.toDate?.()?.getTime?.() || a.data.expiresAt?.getTime?.() || 0;
        const be = b.data.expiresAt?.toDate?.()?.getTime?.() || b.data.expiresAt?.getTime?.() || 0;
        if (ae !== be) return be - ae;
        const ac = a.data.createdAt?.seconds || 0;
        const bc = b.data.createdAt?.seconds || 0;
        return bc - ac;
      });
      const latest = docs[0];
      const now = new Date();
      await updateDoc(doc(db, 'payments', latest.id), { expiresAt: now, cancelledAt: serverTimestamp(), status: 'rejected' });
      try { await updateDoc(doc(db, 'teachers', teacherId), { extraStorageGB: 0, updatedAt: new Date().toISOString() }); } catch {}
      toast.success(language === 'ar' ? 'تم إلغاء الاشتراك وتحويله إلى غير نشط.' : 'Subscription cancelled and set to inactive.');
      setCancelDialogOpenByTeacher(prev => ({ ...prev, [teacherId]: false }));
    } catch (e) {
      console.error('Failed to cancel subscription:', e);
      toast.error(language === 'ar' ? 'تعذر إلغاء الاشتراك.' : 'Failed to cancel subscription.');
    } finally {
      setCancelLoadingByTeacher(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  const classifyPeriodKey = (raw?: string) => {
    const s = (raw || '').toString().toLowerCase();
    if (!s) return 'all';
    const isFive = s.includes('5') && (s.includes('minute') || s.includes('minutes') || s.includes('دقيقة') || s.includes('دقائق'));
    const isMonth = s.includes('month') || s.includes('monthly') || s.includes('شهري') || s.includes('شهر');
    const isHalf = s.includes('half') || s.includes('semi') || s.includes('semiannual') || s.includes('semi-annual') || s.includes('نصف') || s.includes('نصف سنوي');
    const isYear = s.includes('year') || s.includes('annual') || s.includes('سنوي') || s.includes('سنة');
    if (isFive) return 'five';
    if (isYear) return 'year';
    if (isHalf) return 'half';
    if (isMonth) return 'monthly';
    return 'all';
  };

  const handleExtendAll = async () => {
    try {
      if (!bulkDays || bulkDays < 1) {
        toast.error(language === 'ar' ? 'أدخل عدد الأيام (1 على الأقل)' : 'Enter number of days (at least 1)');
        return;
      }
      setBulkLoading(true);
      const q = query(collection(db, 'payments'), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error(language === 'ar' ? 'لا توجد مدفوعات مقبولة.' : 'No approved payments found.');
        setBulkLoading(false);
        return;
      }
      const rows = snap.docs.map(d => ({ id: d.id, data: d.data() as any }));
      const byTeacher: Record<string, { id: string; data: any }> = {};
      for (const r of rows) {
        const tId = r.data.teacherId;
        if (!tId) continue;
        const exp = r.data.expiresAt?.toDate?.() || r.data.expiresAt || null;
        const expMs = exp instanceof Date ? exp.getTime() : 0;
        const cur = byTeacher[tId];
        if (!cur) byTeacher[tId] = r; else {
          const curExp = cur.data.expiresAt?.toDate?.() || cur.data.expiresAt || null;
          const curMs = curExp instanceof Date ? curExp.getTime() : 0;
          if (expMs >= curMs) byTeacher[tId] = r;
        }
      }
      let count = 0;
      for (const [tId, r] of Object.entries(byTeacher)) {
        const key = classifyPeriodKey(r.data.period);
        if (bulkPeriod !== 'all' && key !== bulkPeriod) continue;
        const base = r.data.expiresAt?.toDate?.() || r.data.expiresAt || null;
        const baseMs = base instanceof Date ? base.getTime() : Date.now();
        const addMs = bulkDays * 24 * 60 * 60 * 1000;
        const newExp = new Date(baseMs + addMs);
        await updateDoc(doc(db, 'payments', r.id), { expiresAt: newExp, extendedByDays: (r.data.extendedByDays || 0) + bulkDays });
        count++;
      }
      toast.success(language === 'ar' ? `تم تمديد الاشتراك لعدد ${count} حساب.` : `Extended subscription for ${count} account(s).`);
      setBulkDays(0);
    } catch (e) {
      console.error('Failed to bulk extend:', e);
      toast.error(language === 'ar' ? 'تعذر التمديد الجماعي.' : 'Failed to extend in bulk.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Helper to normalize period label to Arabic/English
  const labelPeriod = (raw?: string) => {
    const s = (raw || '').toString().toLowerCase();
    if (!s) return language === 'ar' ? 'غير محدد' : 'Unspecified';
    const isFive = s.includes('5') && (s.includes('minute') || s.includes('minutes') || s.includes('دقيقة') || s.includes('دقائق'));
    const isMonth = s.includes('month') || s.includes('monthly') || s.includes('شهري') || s.includes('شهر');
    const isHalf = s.includes('half') || s.includes('semi') || s.includes('semiannual') || s.includes('semi-annual') || s.includes('نصف') || s.includes('نصف سنوي');
    const isYear = s.includes('year') || s.includes('annual') || s.includes('سنوي') || s.includes('سنة');
    if (isFive) return language === 'ar' ? '5 دقائق' : '5 minutes';
    if (isYear) return language === 'ar' ? 'سنوي' : 'Yearly';
    if (isHalf) return language === 'ar' ? 'نصف سنوي' : 'Half-Year';
    if (isMonth) return language === 'ar' ? 'شهري' : 'Monthly';
    return raw || (language === 'ar' ? 'غير محدد' : 'Unspecified');
  };

  const renewalAccounts = (() => {
    const byTeacher: Record<string, { teacher: AdminPayment['teacher']; payments: AdminPayment[] }> = {};
    payments.forEach((p) => {
      const tId = p.teacher?.id;
      if (!tId || tId === '—') return;
      if (!byTeacher[tId]) byTeacher[tId] = { teacher: p.teacher, payments: [] };
      byTeacher[tId].payments.push(p);
    });
    const list = Object.values(byTeacher)
      .map((e) => {
        const sorted = e.payments.slice().sort((a, b) => ((a.createdAtMs || 0) - (b.createdAtMs || 0)));
        const approvedSorted = sorted.filter((x) => x.status === 'approved');
        if (approvedSorted.length === 0) return null;
        const firstApproved = approvedSorted[0];
        const renewals = sorted.filter((x) => {
          const isRenewalStatus = x.status === 'approved' || x.status === 'pending' || x.status === 'rejected';
          const afterFirst = (x.createdAtMs || 0) > (firstApproved.createdAtMs || 0);
          return isRenewalStatus && afterFirst;
        });
        if (renewals.length === 0) return null;
        const periods = approvedSorted.map((x) => labelPeriod(x.rawPeriod));
        const renewalsCount = renewals.length;
        const latestRenewal = renewals.slice().sort((a, b) => ((b.createdAtMs || 0) - (a.createdAtMs || 0)))[0];
        const latestRenewalPeriod = labelPeriod(latestRenewal?.rawPeriod);
        return { teacher: e.teacher, renewalsCount, periods, latestRenewal, latestRenewalPeriod };
      })
      .filter(Boolean) as { teacher: AdminPayment['teacher']; renewalsCount: number; periods: string[]; latestRenewal?: AdminPayment; latestRenewalPeriod?: string }[];
    return list;
  })();

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                {language === 'ar' ? 'المدفوعات والأرباح' : 'Payments & Payouts'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة المدفوعات وطلبات سحب الأرباح' : 'Manage payments and payout requests'}
            </p>
          </div>

          {/* Stats Card: Total Payments only */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}
                    </p>
                    <p className="text-2xl font-bold">${totalPayments.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Payments, Approved, and Renewals */}
          <Tabs defaultValue="payments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="payments">
                {language === 'ar' ? 'المدفوعات' : 'Payments'}
              </TabsTrigger>
              <TabsTrigger value="approved">
                {language === 'ar' ? 'المدفوعات المقبولة' : 'Approved Payments'}
              </TabsTrigger>
              <TabsTrigger value="rejected">
                {language === 'ar' ? 'اشتراكات مرفوضة' : 'Rejected Subscriptions'}
              </TabsTrigger>
              <TabsTrigger value="renewals">
                {language === 'ar' ? 'طلبات التجديد' : 'Renewal Requests'}
              </TabsTrigger>
              <TabsTrigger value="storage_addons">
                {language === 'ar' ? 'طلبات زيادة المساحة' : 'Storage Add-ons'}
              </TabsTrigger>
            </TabsList>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              {/* Admin Wallet/Phone Number Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? 'رقم الهاتف/المحفظة لقبول المدفوعات' : 'Phone/Wallet Number for Payments'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 max-w-xl">
                    <label htmlFor="admin-wallet-input" className="text-sm font-medium">
                      {language === 'ar' ? 'أدخل رقم الهاتف أو المحفظة' : 'Enter phone or wallet number'}
                    </label>
                    <Input
                      id="admin-wallet-input"
                      value={adminWalletInput}
                      onChange={(e) => setAdminWalletInput(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: +201234567890 أو 010-1234-5678' : 'e.g., +201234567890 or 010-1234-5678'}
                      inputMode="numeric"
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveAdminWallet} disabled={savingWallet}>
                        {language === 'ar' ? 'حفظ' : 'Save'}
                      </Button>
                      {currentAdminWallet && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {language === 'ar' ? 'القيمة الحالية:' : 'Current:'} {currentAdminWallet}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'سيتم حفظ الرقم وربطه بحساب الأدمن الحالي، وسيظهر للمدرسين في صفحة الاشتراك بشكل للقراءة فقط.' : 'This number is saved, linked to the current admin, and shown read-only in teachers’ subscription dialog.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={language === 'ar' ? 'البحث بالطالب أو الدورة...' : 'Search by student or course...'}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={language === 'ar' ? 'تصفية بالحالة' : 'Filter by Status'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                        <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                        <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                        <SelectItem value="failed">{language === 'ar' ? 'فشل' : 'Failed'}</SelectItem>
                        <SelectItem value="refunded">{language === 'ar' ? 'مسترد' : 'Refunded'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {language === 'ar' ? 'تصدير' : 'Export'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payments Table (from Firestore) */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? `المدفوعات (${filteredPayments.length})` : `Payments (${filteredPayments.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المعلم' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={payment.teacher.avatar} alt={payment.teacher.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {payment.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{payment.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{teacherPhones[payment.teacher.id] || '—'}</div>
                                  <div className="text-sm text-muted-foreground">{payment.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{payment.amount}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.currency || 'USD'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payment.createdAt}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              {payment.receiptBase64 ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      {language === 'ar' ? 'إيصال الدفع' : 'View Receipt'}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="relative">
                                      <img
                                        src={payment.receiptBase64}
                                        alt={language === 'ar' ? 'صورة إيصال الدفع' : 'Payment receipt image'}
                                        className="max-h-[75vh] mx-auto rounded-lg"
                                      />
                                      <DialogClose asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute right-3 top-3"
                                          aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </DialogClose>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {language === 'ar' ? 'لا يوجد إيصال' : 'No receipt'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprovePayment(payment.id)}
                                  disabled={payment.status !== 'pending'}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {language === 'ar' ? 'قبول' : 'Approve'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRejectPayment(payment.id)}
                                  disabled={payment.status !== 'pending'}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  {language === 'ar' ? 'رفض' : 'Reject'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={language === 'ar' ? 'البحث بالمدرس...' : 'Search by teacher...'}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'تمديد جماعي للاشتراك' : 'Bulk Subscription Extension'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-end gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">{language === 'ar' ? 'نوع الاشتراك' : 'Subscription type'}</span>
                      <select
                        value={bulkPeriod}
                        onChange={(e) => setBulkPeriod(e.target.value as any)}
                        className="border rounded px-2 py-1 h-9"
                      >
                        <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                        <option value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</option>
                        <option value="half">{language === 'ar' ? 'نصف سنوي' : 'Half-Year'}</option>
                        <option value="year">{language === 'ar' ? 'سنوي' : 'Yearly'}</option>
                        <option value="five">{language === 'ar' ? '5 دقائق' : '5 minutes'}</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">{language === 'ar' ? 'أيام التمديد' : 'Extension days'}</span>
                      <Input type="number" min={1} value={bulkDays || ''} onChange={(e) => setBulkDays(Number(e.target.value))} className="w-28" />
                    </div>
                    <Button onClick={handleExtendAll} disabled={bulkLoading}>
                      {bulkLoading ? (language === 'ar' ? 'جاري التمديد...' : 'Extending...') : (language === 'ar' ? 'تمديد للجميع' : 'Extend All')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? `المدفوعات المقبولة (${approvedPayments.length})` : `Approved Payments (${approvedPayments.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}</TableHead>
                          <TableHead>{language === 'ar' ? 'حالة التمديد' : 'Extension Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'تمديد الاشتراك (أيام)' : 'Extend Subscription (days)'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إلغاء الاشتراك' : 'Cancel Subscription'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={payment.teacher.avatar} alt={payment.teacher.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {payment.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{payment.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{teacherPhones[payment.teacher.id] || '—'}</div>
                                  <div className="text-sm text-muted-foreground">{payment.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{payment.amount}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.currency || 'USD'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payment.createdAt}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              {payment.receiptBase64 ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      {language === 'ar' ? 'عرض الإيصال' : 'View Receipt'}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="relative">
                                      <img src={payment.receiptBase64} alt="Payment receipt" className="max-h-[24rem] w-auto" />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {((payment.extendedByDays || 0) > 0) ? (
                                <div className="text-sm">
                                  <Badge variant="outline" className="mr-2">{language === 'ar' ? 'ممدد' : 'Extended'}</Badge>
                                  {(payment.extendedByDays || 0)} {language === 'ar' ? 'يوم' : 'day(s)'}
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <Badge variant="outline" className="mr-2">{language === 'ar' ? 'غير ممدد' : 'Not extended'}</Badge>
                                  0
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={extensionDays[payment.teacher.id] || ''}
                                  onChange={(e) => setExtensionDays(prev => ({ ...prev, [payment.teacher.id]: Number(e.target.value) }))}
                                  placeholder={language === 'ar' ? 'أيام' : 'Days'}
                                  className="w-24"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleExtendExpiry(payment.teacher.id)}
                                  disabled={!!extLoadingByTeacher[payment.teacher.id]}
                                >
                                  {extLoadingByTeacher[payment.teacher.id]
                                    ? (language === 'ar' ? 'جاري التمديد...' : 'Extending...')
                                    : (language === 'ar' ? 'تمديد' : 'Extend')}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpenByTeacher(prev => ({ ...prev, [payment.teacher.id]: true }))}>
                                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </Button>
                                <Dialog open={!!cancelDialogOpenByTeacher[payment.teacher.id]} onOpenChange={(v) => setCancelDialogOpenByTeacher(prev => ({ ...prev, [payment.teacher.id]: v }))}>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>{language === 'ar' ? 'تأكيد إلغاء الاشتراك' : 'Confirm Cancellation'}</DialogTitle>
                                    </DialogHeader>
                                    <p className="text-sm text-muted-foreground">
                                      {language === 'ar'
                                        ? 'سيتم تحويل هذا الحساب إلى حالة غير مشترك وسيعتبر الاشتراك منتهيًا. هل أنت متأكد؟'
                                        : 'This account will be set to non-subscribed and considered expired. Are you sure?'}
                                    </p>
                                    <div className="flex justify-end gap-2 mt-4">
                                      <Button variant="outline" size="sm" onClick={() => setCancelDialogOpenByTeacher(prev => ({ ...prev, [payment.teacher.id]: false }))}>
                                        {language === 'ar' ? 'إغلاق' : 'Close'}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleCancelSubscription(payment.teacher.id)}
                                        disabled={!!cancelLoadingByTeacher[payment.teacher.id]}
                                      >
                                        {cancelLoadingByTeacher[payment.teacher.id]
                                          ? (language === 'ar' ? 'جاري الإلغاء...' : 'Cancelling...')
                                          : (language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel')}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? `الاشتراكات المرفوضة (${rejectedPayments.length})` : `Rejected Subscriptions (${rejectedPayments.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={payment.teacher.avatar} alt={payment.teacher.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {payment.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{payment.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{teacherPhones[payment.teacher.id] || '—'}</div>
                                  <div className="text-sm text-muted-foreground">{payment.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{payment.amount}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.currency || 'USD'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payment.createdAt}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              {payment.receiptBase64 ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      {language === 'ar' ? 'عرض الإيصال' : 'View Receipt'}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="relative">
                                      <img src={payment.receiptBase64} alt="Payment receipt" className="max-h-[24rem] w-auto" />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Storage Add-ons Tab */}
            <TabsContent value="storage_addons" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? `طلبات زيادة المساحة (${storageAddonRequests.length})` : `Storage Add-on Requests (${storageAddonRequests.length})`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المساحة المطلوبة (GB)' : 'Requested GB'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إيصال الدفع' : 'Receipt'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storageAddonRequests.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={p.teacher.avatar} alt={p.teacher.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {p.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{p.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{p.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.addonGB || 0} GB</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{p.amount}</span>
                            </TableCell>
                            <TableCell>
                              {p.receiptBase64 ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">{language === 'ar' ? 'عرض' : 'View'}</Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>{language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}</DialogTitle>
                                    </DialogHeader>
                                    <img src={p.receiptBase64} alt="Receipt" className="max-h-[24rem] w-auto" />
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleApproveStorageAddon(p.id)} disabled={p.status !== 'pending'}>
                                  {language === 'ar' ? 'موافقة' : 'Approve'}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectStorageAddon(p.id)} disabled={p.status !== 'pending'}>
                                  {language === 'ar' ? 'رفض' : 'Reject'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Renewals Tab */}
            <TabsContent value="renewals" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={language === 'ar' ? 'البحث بالمدرس...' : 'Search by teacher...'}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? `طلبات التجديد (${renewalAccounts.length})` : `Renewal Requests (${renewalAccounts.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'عدد مرات التجديد' : 'Renewals Count'}</TableHead>
                          <TableHead>{language === 'ar' ? 'أنواع التجديدات' : 'Renewal Types'}</TableHead>
                          <TableHead>{language === 'ar' ? 'أحدث تجديد' : 'Latest Renewal'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renewalAccounts.map((acc, idx) => (
                          <TableRow key={acc.teacher.id + '_' + idx}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {acc.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{acc.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{teacherPhones[acc.teacher.id] || '—'}</div>
                                  <div className="text-sm text-muted-foreground">{acc.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{acc.renewalsCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {acc.periods.map((p, i) => (
                                  <Badge key={i} variant="secondary" className="rounded-none">{p}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {acc.latestRenewal ? (
                                <div className="flex items-center gap-2">
                                  {getPaymentStatusBadge(acc.latestRenewal.status)}
                                  <Badge variant="outline">{acc.latestRenewalPeriod}</Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
};

export default PaymentsPayouts;