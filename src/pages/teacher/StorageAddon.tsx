import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/firebase/config';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

export default function StorageAddon() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gb, setGb] = useState<number>(1);
  const [priceEgp, setPriceEgp] = useState<number>(5);
  const [pricePerGBBase, setPricePerGBBase] = useState<number>(5);
  const [bundles, setBundles] = useState<Array<{ id: string; gb: number; discountPct: number; color: string }>>([
    { id: 'bundle-2', gb: 2, discountPct: 40, color: '#ef4444' },
    { id: 'bundle-5', gb: 5, discountPct: 40, color: '#fb923c' },
    { id: 'bundle-10', gb: 10, discountPct: 40, color: '#22c55e' },
  ]);
  const [selectedBundleId, setSelectedBundleId] = useState<string>('custom');
  const [walletNumber, setWalletNumber] = useState<string>('');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(() => {
    try { return localStorage.getItem('storageAddonLocked') === 'true'; } catch { return false; }
  });
  const [bannerText, setBannerText] = useState<string>('');

  useEffect(() => {
    if (locked) {
      const msg = language === 'ar'
        ? 'تم استلام طلب شراء المساحة الإضافية وجارٍ تفعيلها. قد يستغرق ذلك بضع دقائق. للتسريع يمكنك التواصل مع الدعم عبر واتساب.'
        : 'Your storage add-on request has been received and is being activated. This may take a few minutes. You can contact support on WhatsApp to expedite.';
      setBannerText(msg);
    }
  }, [locked, language]);

  useEffect(() => {
    if (selectedBundleId === 'custom') {
      setPriceEgp(gb * pricePerGBBase);
    } else {
      const b = bundles.find(x => x.id === selectedBundleId);
      if (b) {
        const base = b.gb * pricePerGBBase;
        const discounted = Math.round(base * (1 - b.discountPct / 100));
        setPriceEgp(discounted);
        setGb(b.gb);
      }
    }
  }, [gb, selectedBundleId]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      const data = snap.data() as any;
      const wallet = typeof data?.adminWalletNumber === 'string' ? data.adminWalletNumber : '';
      setWalletNumber(wallet);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'storageAddon'), (snap) => {
      const data = snap.data() as any;
      const base = typeof data?.pricePerGBBase === 'number' ? data.pricePerGBBase : 5;
      setPricePerGBBase(base);
      const arr = Array.isArray(data?.bundles) ? data.bundles : [];
      const mapped = arr.map((it: any) => ({
        id: typeof it?.id === 'string' ? it.id : `bundle-${Math.random().toString(36).slice(2, 8)}`,
        gb: typeof it?.gb === 'number' ? it.gb : 0,
        discountPct: typeof it?.discountPct === 'number' ? it.discountPct : 0,
        color: typeof it?.color === 'string' ? it.color : '#3b82f6',
      })).filter((x: any) => x.gb > 0);
      if (mapped.length > 0) setBundles(mapped);
    });
    return () => unsub();
  }, []);

  const handleFile = (file?: File) => {
    try {
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const maxW = 1200;
          const maxH = 1200;
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const scale = Math.min(1, Math.min(maxW / w, maxH / h));
          w = Math.max(1, Math.floor(w * scale));
          h = Math.max(1, Math.floor(h * scale));
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no ctx');
          ctx.drawImage(img, 0, 0, w, h);
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          const targetKB = 400;
          const limit = targetKB * 1024 * 1.37;
          let guard = 0;
          while (dataUrl.length > limit && quality > 0.4 && guard < 6) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            guard++;
          }
          setReceiptBase64(dataUrl);
        } catch {
          const reader = new FileReader();
          reader.onload = () => { setReceiptBase64(reader.result as string); };
          reader.readAsDataURL(file);
        } finally {
          try { URL.revokeObjectURL(url); } catch {}
        }
      };
      img.onerror = () => {
        try { URL.revokeObjectURL(url); } catch {}
        toast.error(language === 'ar' ? 'تعذر معالجة صورة الإيصال.' : 'Failed to process receipt image.');
      };
      img.src = url;
    } catch {
      toast.error(language === 'ar' ? 'تعذر قراءة ملف الإيصال.' : 'Failed to read receipt file.');
    }
  };

  const submitAddon = async () => {
    try {
      if (!user?.uid) {
        toast.error(language === 'ar' ? 'يجب تسجيل الدخول كمدرس.' : 'You must be logged in as a teacher.');
        return;
      }
      if (!gb || gb < 1) {
        toast.error(language === 'ar' ? 'أدخل عدد الجيجا المطلوب (1 على الأقل).' : 'Enter GB amount (at least 1).');
        return;
      }
      if (!receiptBase64) {
        toast.error(language === 'ar' ? 'قم برفع صورة إيصال الدفع.' : 'Please upload payment receipt image.');
        return;
      }
      setSaving(true);
      await addDoc(collection(db, 'payments'), {
        teacherId: user.uid,
        teacherName: user.displayName || '—',
        planName: 'storage_addon',
        teacherEmail: user.email || '—',
        status: 'pending',
        amount: priceEgp,
        currency: 'EGP',
        createdAt: serverTimestamp(),
        receiptBase64,
        walletNumber,
        type: 'storage_addon',
        addonGB: gb,
        period: 'addon',
        bundleId: selectedBundleId === 'custom' ? null : selectedBundleId,
        discountPct: selectedBundleId === 'custom' ? 0 : (bundles.find(b => b.id === selectedBundleId)?.discountPct || 0),
        pricePerGBBase: pricePerGBBase,
      });
      const msg = language === 'ar'
        ? 'تم استلام طلب شراء المساحة الإضافية وجارٍ تفعيلها. قد يستغرق ذلك بضع دقائق. للتسريع يمكنك التواصل مع الدعم عبر واتساب.'
        : 'Your storage add-on request has been received and is being activated. This may take a few minutes. You can contact support on WhatsApp to expedite.';
      setBannerText(msg);
      setLocked(true);
      try { localStorage.setItem('storageAddonLocked', 'true'); } catch {}
      toast.success(language === 'ar' ? 'تم إرسال الطلب بنجاح.' : 'Request submitted successfully.');
    } catch (e: any) {
      console.error('Failed to submit storage addon:', e);
      const detail = (e?.message || '').toString();
      toast.error(language === 'ar' ? `تعذر إرسال الطلب: ${detail || 'حدث خطأ عند الإرسال'}` : `Failed to submit request: ${detail || 'An error occurred'}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const run = async () => {
      try {
        if (!user?.uid) return;
        const qref = query(collection(db, 'payments'), where('teacherId', '==', user.uid), where('type', '==', 'storage_addon'));
        unsub = onSnapshot(qref, (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)));
          const latest = rows[0];
          if (!latest) {
            setLocked(false);
            setBannerText('');
            try { localStorage.removeItem('storageAddonLocked'); } catch {}
            return;
          }
          if (latest.status === 'pending') {
            const msg = language === 'ar'
              ? 'تم استلام طلب شراء المساحة الإضافية وجارٍ تفعيلها. قد يستغرق ذلك بضع دقائق. للتسريع يمكنك التواصل مع الدعم عبر واتساب.'
              : 'Your storage add-on request has been received and is being activated. This may take a few minutes. You can contact support on WhatsApp to expedite.';
            setBannerText(msg);
            setLocked(true);
            try { localStorage.setItem('storageAddonLocked', 'true'); } catch {}
          } else if (latest.status === 'approved') {
            toast.success(language === 'ar' ? 'تمت الموافقة على المساحة الإضافية.' : 'Storage add-on approved.');
            try { localStorage.removeItem('storageAddonLocked'); } catch {}
            navigate('/teacher-dashboard');
          } else if (latest.status === 'rejected') {
            toast.error(language === 'ar' ? 'تم رفض طلب المساحة الإضافية.' : 'Storage add-on request rejected.');
            setLocked(false);
            setBannerText('');
            try { localStorage.removeItem('storageAddonLocked'); } catch {}
          }
        });
      } catch {}
    };
    run();
    return () => { if (unsub) unsub(); };
  }, [user?.uid, language]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader fixed />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar isSubscriptionApproved={true} />
        <main className="md:ml-64 flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="space-y-6">
            {bannerText && (
              <div className="rounded-md border border-[#2c4656]/30 bg-[#2c4656]/10 p-3 text-sm">
                <div className="font-semibold text-[#2c4656]">{language === 'ar' ? 'طلبك قيد المراجعة' : 'Your request is under review'}</div>
                <div className="mt-1 text-muted-foreground">{bannerText}</div>
              </div>
            )}
            <div className="flex items-center justify-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center">
                {language === 'ar' ? 'شراء مساحة تخزينية إضافية' : 'Buy Additional Storage'}
              </h1>
            </div>
            <Card className="border-2 border-[#2c4656]/20 shadow-xl bg-gradient-to-br from-white to-[#2c4656]/5 relative">
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تفاصيل شراء المساحة' : 'Storage Purchase Details'}</CardTitle>
              </CardHeader>
              <CardContent className={`space-y-4 ${locked ? 'pointer-events-none opacity-60' : ''}`}>
                <div>
                  <label className={`text-sm mb-2 block ${language === 'ar' ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'الباقات الجاهزة' : 'Ready-made bundles'}
                  </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {bundles.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`${language === 'ar' ? 'text-right' : 'text-left'} rounded-md border relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md ${selectedBundleId === b.id ? 'border-[#2c4656] ring-2 ring-[#2c4656]/40' : 'border-muted'}`}
                        onClick={() => setSelectedBundleId(b.id)}
                      >
                        <div className="flex">
                          <div style={{ backgroundColor: b.color }} className="w-2" />
                          <div className="p-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{b.gb} GB</div>
                              <div className="text-xs text-red-600">-{b.discountPct}%</div>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {language === 'ar' ? 'خصم على السعر' : 'Discounted price'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${language === 'ar' ? 'text-right' : 'text-left'} rounded-md border relative overflow-hidden group transition hover:-translate-y-0.5 hover:shadow-md ${selectedBundleId === 'custom' ? 'border-[#2c4656] ring-2 ring-[#2c4656]/40' : 'border-muted'}`}
                      onClick={() => setSelectedBundleId('custom')}
                    >
                      <div className="flex">
                        <div style={{ backgroundColor: '#3b82f6' }} className="w-2" />
                        <div className="p-3 flex-1">
                          <div className="font-semibold">{language === 'ar' ? 'مخصص' : 'Custom'}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {language === 'ar' ? 'اختر عدد الجيجا يدويًا' : 'Choose GB manually'}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                {selectedBundleId === 'custom' ? (
                  <div className="space-y-3">
                    <label className={`text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'المساحة المطلوبة (جيجا)' : 'Required storage (GB)'}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={gb}
                      onChange={(e) => { setGb(Number(e.target.value)); setSelectedBundleId('custom'); }}
                      className="h-12 text-lg rounded-md border-2 border-[#2c4656]/30 focus-visible:ring-2 focus-visible:ring-[#2c4656]"
                    />
                  </div>
                ) : null}
                <div className="rounded-md border bg-[#2c4656]/10 border-[#2c4656]/20 p-3">
                  <div className={`text-sm mb-1 ${language === 'ar' ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'التكلفة' : 'Cost'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">EGP</Badge>
                    <span className="text-2xl font-semibold text-foreground">{priceEgp}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'رقم الهاتف لإرسال المبلغ' : 'Phone number to send payment'}
                  </label>
                  <div className="text-sm rounded-md bg-muted/40 p-2">{walletNumber || (language === 'ar' ? '— لا يوجد رقم حالياً —' : '— No number set —')}</div>
                </div>
                <div className="space-y-2">
                  <label className={`text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'رفع صورة إيصال الدفع' : 'Upload payment receipt image'}
                  </label>
                  <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || undefined)} disabled={locked} />
                  {receiptBase64 && (
                    <div className="border rounded-md p-2 bg-[#2c4656]/10 border-[#2c4656]/20">
                      <img src={receiptBase64} alt="Receipt" className="mt-1 max-h-64 w-auto" />
                    </div>
                  )}
                  <div className={`text-xs text-muted-foreground ${language === 'ar' ? 'text-right' : ''}`}>
                    {language === 'ar'
                      ? 'أرسل المبلغ إلى الرقم أعلاه، ثم ارفع صورة الإيصال واضغط على زر شراء المساحة.'
                      : 'Send the amount to the phone number above, then upload the receipt image and click Buy Storage.'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className={locked ? 'pointer-events-none opacity-60' : ''}>
                <Button onClick={submitAddon} disabled={saving || locked} className="bg-[#2c4656] hover:bg-[#1e3240] text-white">
                  {saving ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (language === 'ar' ? 'شراء المساحة' : 'Buy Storage')}
                </Button>
              </CardFooter>
              {locked && (
                <div className="absolute inset-0 rounded-md"></div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}