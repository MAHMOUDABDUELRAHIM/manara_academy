import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auth, db } from '@/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import { TEACHER_FEATURES } from '@/constants/teacherFeatures';

import {
  Settings as SettingsIcon,
  Globe,
  CreditCard,
  Bell,
  Crown,
  Edit,
  Plus,
  Save,
  Upload,
  Mail,
  DollarSign,
  Smartphone,
  Shield,
  Palette,
  Database,
  Users,
  BookOpen,
  Star,
  Check,
  X
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  isPopular: boolean;
  status: 'active' | 'inactive';
  storageGB?: number;
  allowedSections?: Record<string, string[]>; // featureId -> sectionIds
}

const Settings: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [storageUnit, setStorageUnit] = useState<'GB' | 'MB'>('GB');

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'Manara Academy',
    logo: '/Header-Logo.png',
    contactEmail: 'support@manara-academy.com',
    supportPhone: '+1-234-567-8900',
    address: '123 Education Street, Learning City',
    description: 'منصة تعليمية متقدمة لتعلم المهارات التقنية والإبداعية',
    language: 'ar',
    timezone: 'UTC+3'
  });
  // Trial Settings State (unit: 'days' | 'minutes', value: number)
  const [trialSettings, setTrialSettings] = useState<{ unit: 'days' | 'minutes'; value: number }>({ unit: 'days', value: 1 });

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    currency: 'USD',
    minimumPayout: 50,
    payoutSchedule: 'weekly',
    stripeEnabled: true,
    paypalEnabled: true,
    bankTransferEnabled: false,
    commissionRate: 15
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
    courseUpdates: true,
    paymentAlerts: true,
    systemMaintenance: true
  });

  // Mock Plans Data
  const [plans, setPlans] = useState<Plan[]>([]);

  // Load and subscribe to pricing plans from Firestore collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pricingPlans'), (snap) => {
      const arr: Plan[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const price = typeof d?.prices?.USD === 'number' ? d.prices.USD
          : typeof d?.priceUsd === 'number' ? d.priceUsd
          : typeof d?.priceUSD === 'number' ? d.priceUSD
          : typeof d?.price === 'number' ? d.price
          : 0;
        const duration = typeof d?.period === 'string' ? d.period
          : typeof d?.duration === 'string' ? d.duration
          : 'شهري';
        arr.push({
          id: docSnap.id,
          name: d?.name || 'خطة',
          price: price,
          duration: duration,
          features: Array.isArray(d?.features) ? d.features : [],
          isPopular: !!d?.popular,
          status: (d?.status === 'inactive') ? 'inactive' : 'active',
          storageGB: typeof d?.storageGB === 'number' ? d.storageGB : undefined,
          allowedSections: typeof d?.allowedSections === 'object' && d?.allowedSections !== null
            ? Object.fromEntries(Object.entries(d.allowedSections).map(([k, v]: [string, any]) => [k, Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []]))
            : {},
        });
      });
      // Optional: sort by order if present
      arr.sort((a, b) => {
        const ao = typeof (snap.docs.find(x => x.id === a.id)?.data() as any)?.order === 'number' ? (snap.docs.find(x => x.id === a.id)?.data() as any).order : 0;
        const bo = typeof (snap.docs.find(x => x.id === b.id)?.data() as any)?.order === 'number' ? (snap.docs.find(x => x.id === b.id)?.data() as any).order : 0;
        return ao - bo;
      });
      setPlans(arr);
    }, (error) => {
      console.error('Failed to subscribe pricing plans:', error);
    });
    return () => unsub();
  }, []);

  const tabs = [
    { id: 'general', label: language === 'ar' ? 'الإعدادات العامة' : 'General Settings', icon: Globe },
    { id: 'payment', label: language === 'ar' ? 'إعدادات الدفع' : 'Payment Settings', icon: CreditCard },
    { id: 'notifications', label: language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings', icon: Bell },
    { id: 'plans', label: language === 'ar' ? 'إدارة الخطط' : 'Plan Management', icon: Crown },
    { id: 'addons', label: language === 'ar' ? 'إدارة خطط الزيادة' : 'Add-on Management', icon: DollarSign }
  ];

  const [addonSettings, setAddonSettings] = useState<{ pricePerGBBase: number; bundles: { id: string; gb: number; discountPct: number; color: string }[] }>({
    pricePerGBBase: 5,
    bundles: [
      { id: 'bundle-2', gb: 2, discountPct: 40, color: '#ef4444' },
      { id: 'bundle-5', gb: 5, discountPct: 40, color: '#fb923c' },
      { id: 'bundle-10', gb: 10, discountPct: 40, color: '#22c55e' },
    ],
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'storageAddon'), (snap) => {
      const d: any = snap.data() || {};
      const base = typeof d?.pricePerGBBase === 'number' ? d.pricePerGBBase : addonSettings.pricePerGBBase;
      const arr = Array.isArray(d?.bundles) ? d.bundles : addonSettings.bundles;
      const mapped = arr.map((it: any) => ({
        id: typeof it?.id === 'string' ? it.id : `bundle-${Math.random().toString(36).slice(2, 8)}`,
        gb: typeof it?.gb === 'number' ? it.gb : 0,
        discountPct: typeof it?.discountPct === 'number' ? it.discountPct : 0,
        color: typeof it?.color === 'string' ? it.color : '#3b82f6',
      })).filter((x: any) => x.gb > 0);
      setAddonSettings({ pricePerGBBase: base, bundles: mapped });
    });
    return () => unsub();
  }, []);

  const handleSaveAddonSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'storageAddon'), {
        pricePerGBBase: Number(addonSettings.pricePerGBBase) || 5,
        bundles: addonSettings.bundles.map(b => ({ id: b.id, gb: Number(b.gb) || 0, discountPct: Number(b.discountPct) || 0, color: b.color })),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(language === 'ar' ? 'تم حفظ إعدادات الزيادة بالمساحة.' : 'Storage add-on settings saved.');
    } catch {
      toast.error(language === 'ar' ? 'تعذر حفظ الإعدادات.' : 'Failed to save settings.');
    }
  };

  const addBundleRow = () => {
    const id = `bundle-${Date.now()}`;
    setAddonSettings((prev) => ({
      ...prev,
      bundles: [...prev.bundles, { id, gb: 1, discountPct: 0, color: '#3b82f6' }],
    }));
  };

  const updateBundleField = (id: string, key: 'gb' | 'discountPct' | 'color', value: string) => {
    setAddonSettings((prev) => ({
      ...prev,
      bundles: prev.bundles.map((b) => b.id === id ? { ...b, [key]: key === 'color' ? value : Number(value) } : b),
    }));
  };

  const removeBundle = (id: string) => {
    setAddonSettings((prev) => ({ ...prev, bundles: prev.bundles.filter((b) => b.id !== id) }));
  };

  const handleSaveGeneral = () => {
    console.log('Saving general settings:', generalSettings);
    // Mock save functionality
  };
  const handleSaveTrial = async () => {
    try {
      await setDoc(doc(db, 'settings', 'trial'), {
        unit: trialSettings.unit,
        value: Number(trialSettings.value) || 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      try { localStorage.setItem('trialSettings', JSON.stringify(trialSettings)); } catch {}
      toast.success(language === 'ar' ? 'تم تحديث مدة الفترة التجريبية.' : 'Trial duration updated.');
    } catch (error) {
      console.error('Failed to save trial settings:', error);
      toast.error(language === 'ar' ? 'تعذر حفظ إعدادات التجربة' : 'Failed to save trial settings');
    }
  };

  const handleSavePayment = () => {
    console.log('Saving payment settings:', paymentSettings);
    // Save currency in Firestore so the entire site reflects it
    setDoc(doc(db, 'settings', 'payment'), {
      currency: paymentSettings.currency,
      minimumPayout: paymentSettings.minimumPayout,
      payoutSchedule: paymentSettings.payoutSchedule,
      stripeEnabled: paymentSettings.stripeEnabled,
      paypalEnabled: paymentSettings.paypalEnabled,
      bankTransferEnabled: paymentSettings.bankTransferEnabled,
      commissionRate: paymentSettings.commissionRate,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    .then(() => {
      toast.success(language === 'ar' ? 'تم حفظ العملة وتطبيقها على الباقات تلقائيًا.' : 'Currency saved and applied to plans automatically.');
    })
    .catch(() => {
      toast.error(language === 'ar' ? 'تعذر حفظ الإعدادات، حاول مجددًا.' : 'Failed to save settings, please try again.');
    });
  };

  // Load payment settings (including currency) from Firestore on mount
  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment'));
        if (snap.exists()) {
          const data = snap.data();
          setPaymentSettings((prev) => ({
            currency: (data.currency === 'USD' || data.currency === 'EGP' || data.currency === 'JOD') ? data.currency : prev.currency,
            minimumPayout: typeof data.minimumPayout === 'number' ? data.minimumPayout : prev.minimumPayout,
            payoutSchedule: typeof data.payoutSchedule === 'string' ? data.payoutSchedule : prev.payoutSchedule,
            stripeEnabled: typeof data.stripeEnabled === 'boolean' ? data.stripeEnabled : prev.stripeEnabled,
            paypalEnabled: typeof data.paypalEnabled === 'boolean' ? data.paypalEnabled : prev.paypalEnabled,
            bankTransferEnabled: typeof data.bankTransferEnabled === 'boolean' ? data.bankTransferEnabled : prev.bankTransferEnabled,
            commissionRate: typeof data.commissionRate === 'number' ? data.commissionRate : prev.commissionRate,
          }));
        }
      } catch (error) {
        console.error('Failed to load payment settings:', error);
      }
    };
    loadPaymentSettings();
  }, []);
  // Load trial settings on mount
  useEffect(() => {
    const loadTrialSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'trial'));
        if (snap.exists()) {
          const data = snap.data() as any;
          const unit = (data.unit === 'minutes') ? 'minutes' : 'days';
          const value = typeof data.value === 'number' && data.value > 0 ? data.value : 1;
          setTrialSettings({ unit, value });
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
      } catch (error) {
        console.error('Failed to load trial settings:', error);
      }
    };
    loadTrialSettings();
  }, []);

  const handleSaveNotifications = () => {
    console.log('Saving notification settings:', notificationSettings);
    // Mock save functionality
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsEditingPlan(true);
  };

  const handleSavePlan = async () => {
    if (!selectedPlan) return;
    try {
      // Require admin privileges to write pricing plans
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error(language === 'ar' ? 'يجب تسجيل الدخول كمشرف أولاً.' : 'You must sign in as an admin.');
        return;
      }
      const isAdmin = await getDoc(doc(db, 'admins', uid));
      if (!isAdmin.exists()) {
        toast.error(language === 'ar' ? 'لا تملك صلاحيات الأدمن لكتابة الباقات.' : 'Admin privileges required to manage plans.');
        return;
      }

      const priceNumber = Number.isFinite(Number(selectedPlan.price)) ? Number(selectedPlan.price) : 0;
      const payload: any = {
        name: selectedPlan.name,
        // store USD as base; teacher سيحوّل بحسب العملة
        priceUSD: priceNumber,
        period: selectedPlan.duration,
        features: selectedPlan.features,
        popular: selectedPlan.isPopular,
        status: selectedPlan.status,
        storageGB: Number(selectedPlan.storageGB) || 0,
        allowedSections: selectedPlan.allowedSections || {},
        updatedAt: serverTimestamp(),
      };
      // If plan exists (by id) update; otherwise create with given id
      const exists = plans.some(p => p.id === selectedPlan.id);
      if (exists) {
        await updateDoc(doc(db, 'pricingPlans', selectedPlan.id), payload);
      } else {
        // create with this id to keep current behavior
        await setDoc(doc(db, 'pricingPlans', selectedPlan.id), { ...payload, createdAt: serverTimestamp() });
      }
      toast.success(language === 'ar' ? 'تم حفظ الخطة في Firestore.' : 'Plan saved to Firestore.');
      setIsEditingPlan(false);
      setSelectedPlan(null);
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      const msg = err?.code || err?.message || '';
      toast.error(
        language === 'ar'
          ? `تعذّر حفظ الخطة (${msg || 'خطأ غير معروف'})`
          : `Failed to save plan (${msg || 'Unknown error'})`
      );
    }
  };

  const handleAddNewPlan = () => {
    const newPlan: Plan = {
      id: Date.now().toString(),
      name: 'خطة جديدة',
      price: 0,
      duration: 'شهري',
      features: [],
      isPopular: false,
      status: 'inactive',
      storageGB: 0,
      allowedSections: {},
    };
    setSelectedPlan(newPlan);
    setIsEditingPlan(true);
  };

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
              <SettingsIcon className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                {language === 'ar' ? 'الإعدادات' : 'Settings'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة إعدادات المنصة والتكوينات العامة' : 'Manage platform settings and general configurations'}
            </p>
          </div>

        {/* Settings Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">{language === 'ar' ? 'اسم المنصة' : 'Platform Name'}</Label>
                    <Input
                      id="platformName"
                      value={generalSettings.platformName}
                      onChange={(e) => setGeneralSettings({...generalSettings, platformName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">{language === 'ar' ? 'البريد الإلكتروني' : 'Contact Email'}</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={generalSettings.contactEmail}
                      onChange={(e) => setGeneralSettings({...generalSettings, contactEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">{language === 'ar' ? 'هاتف الدعم' : 'Support Phone'}</Label>
                    <Input
                      id="supportPhone"
                      value={generalSettings.supportPhone}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportPhone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">{language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</Label>
                    <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings({...generalSettings, language: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">{language === 'ar' ? 'العنوان' : 'Address'}</Label>
                  <Input
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({...generalSettings, address: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{language === 'ar' ? 'وصف المنصة' : 'Platform Description'}</Label>
                  <Textarea
                    id="description"
                    value={generalSettings.description}
                    onChange={(e) => setGeneralSettings({...generalSettings, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'شعار المنصة' : 'Platform Logo'}</Label>
                  <div className="flex items-center gap-4">
                    <img src={generalSettings.logo} alt="Logo" className="h-12 w-auto" />
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'رفع شعار جديد' : 'Upload New Logo'}
                    </Button>
                  </div>
                </div>

                {/* Trial duration settings */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-semibold">
                    {language === 'ar' ? 'مدة الفترة التجريبية' : 'Trial Period Duration'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar'
                      ? 'اختر وحدة المدة (أيام أو دقائق) وحدد القيمة. سيتم تطبيق التغيير فورًا على جميع المدرسين الذين ما زالت فترة تجربتهم مفتوحة.'
                      : 'Choose unit (days or minutes) and set value. Change applies immediately to all teachers with open trials.'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trialUnit">{language === 'ar' ? 'الوحدة' : 'Unit'}</Label>
                      <Select value={trialSettings.unit} onValueChange={(value) => setTrialSettings({ ...trialSettings, unit: (value as any) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">{language === 'ar' ? 'أيام' : 'Days'}</SelectItem>
                          <SelectItem value="minutes">{language === 'ar' ? 'دقائق' : 'Minutes'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trialValue">{language === 'ar' ? 'القيمة' : 'Value'}</Label>
                      <Input
                        id="trialValue"
                        type="number"
                        min={1}
                        value={trialSettings.value}
                        onChange={(e) => setTrialSettings({ ...trialSettings, value: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSaveTrial} className="w-full md:w-auto">
                        <Save className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'حفظ مدة التجربة' : 'Save Trial Duration'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveGeneral} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'addons' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {language === 'ar' ? 'إدارة خطط الزيادة في المساحة' : 'Storage Add-on Management'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'سعر الأساس لكل جيجا (EGP)' : 'Base price per GB (EGP)'}</Label>
                    <Input
                      type="number"
                      value={addonSettings.pricePerGBBase}
                      onChange={(e) => setAddonSettings({ ...addonSettings, pricePerGBBase: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الباقات الجاهزة' : 'Ready-made bundles'}</Label>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المعرف' : 'ID'}</TableHead>
                          <TableHead>{language === 'ar' ? 'السعة (GB)' : 'Capacity (GB)'}</TableHead>
                          <TableHead>{language === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'}</TableHead>
                          <TableHead>{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
                          <TableHead>{language === 'ar' ? 'إجراء' : 'Action'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {addonSettings.bundles.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="text-xs text-muted-foreground">{b.id}</TableCell>
                            <TableCell>
                              <Input type="number" value={b.gb} onChange={(e) => updateBundleField(b.id, 'gb', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={b.discountPct} onChange={(e) => updateBundleField(b.id, 'discountPct', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="text" value={b.color} onChange={(e) => updateBundleField(b.id, 'color', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Button variant="destructive" onClick={() => removeBundle(b.id)}>{language === 'ar' ? 'حذف' : 'Delete'}</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={addBundleRow}><Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'إضافة باقة' : 'Add Bundle'}</Button>
                    <Button onClick={handleSaveAddonSettings}><Save className="h-4 w-4 mr-2" />{language === 'ar' ? 'حفظ' : 'Save'}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Settings Tab */}
          {activeTab === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الدفع' : 'Payment Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                    <Select value={paymentSettings.currency} onValueChange={(value) => setPaymentSettings({...paymentSettings, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                        <SelectItem value="JOD">JOD - Jordanian Dinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumPayout">{language === 'ar' ? 'الحد الأدنى للسحب' : 'Minimum Payout'}</Label>
                    <Input
                      id="minimumPayout"
                      type="number"
                      value={paymentSettings.minimumPayout}
                      onChange={(e) => setPaymentSettings({...paymentSettings, minimumPayout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">{language === 'ar' ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      value={paymentSettings.commissionRate}
                      onChange={(e) => setPaymentSettings({...paymentSettings, commissionRate: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutSchedule">{language === 'ar' ? 'جدولة المدفوعات' : 'Payout Schedule'}</Label>
                    <Select value={paymentSettings.payoutSchedule} onValueChange={(value) => setPaymentSettings({...paymentSettings, payoutSchedule: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                        <SelectItem value="biweekly">{language === 'ar' ? 'كل أسبوعين' : 'Bi-weekly'}</SelectItem>
                        <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{language === 'ar' ? 'بوابات الدفع' : 'Payment Gateways'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Stripe</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'معالجة البطاقات الائتمانية' : 'Credit card processing'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={paymentSettings.stripeEnabled}
                        onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, stripeEnabled: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">PayPal</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'محفظة رقمية' : 'Digital wallet'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={paymentSettings.paypalEnabled}
                        onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, paypalEnabled: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">{language === 'ar' ? 'التحويل البنكي' : 'Bank Transfer'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'تحويل مباشر للبنك' : 'Direct bank transfer'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={paymentSettings.bankTransferEnabled}
                        onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, bankTransferEnabled: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSavePayment} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</div>
                        <div className="text-sm text-muted-foreground">{language === 'ar' ? 'تلقي الإشعارات عبر البريد' : 'Receive notifications via email'}</div>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">{language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}</div>
                        <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات فورية على الجهاز' : 'Instant notifications on device'}</div>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, pushNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">{language === 'ar' ? 'رسائل SMS' : 'SMS Notifications'}</div>
                        <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات عبر الرسائل النصية' : 'Notifications via text messages'}</div>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{language === 'ar' ? 'أنواع الإشعارات' : 'Notification Types'}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-purple-600" />
                        <div>
                          <div className="font-medium">{language === 'ar' ? 'رسائل تسويقية' : 'Marketing Emails'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'عروض وأخبار المنصة' : 'Platform offers and news'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.marketingEmails}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, marketingEmails: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{language === 'ar' ? 'تحديثات الدورات' : 'Course Updates'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات الدروس الجديدة' : 'New lesson notifications'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.courseUpdates}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, courseUpdates: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">{language === 'ar' ? 'تنبيهات الدفع' : 'Payment Alerts'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات المعاملات المالية' : 'Financial transaction notifications'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.paymentAlerts}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, paymentAlerts: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-red-600" />
                        <div>
                          <div className="font-medium">{language === 'ar' ? 'صيانة النظام' : 'System Maintenance'}</div>
                          <div className="text-sm text-muted-foreground">{language === 'ar' ? 'إشعارات الصيانة والتحديثات' : 'Maintenance and update notifications'}</div>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.systemMaintenance}
                        onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemMaintenance: checked})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plan Management Tab */}
          {activeTab === 'plans' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    {language === 'ar' ? 'إدارة الخطط' : 'Plan Management'}
                  </div>
                  <Button onClick={handleAddNewPlan}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة خطة جديدة' : 'Add New Plan'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'اسم الخطة' : 'Plan Name'}</TableHead>
                        <TableHead>{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المدة' : 'Duration'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الميزات' : 'Features'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{plan.name}</span>
                              {plan.isPopular && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  {language === 'ar' ? 'شائع' : 'Popular'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              {plan.price === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `$${plan.price}`}
                            </div>
                          </TableCell>
                          <TableCell>{plan.duration}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="text-sm text-muted-foreground">
                                {plan.features.slice(0, 2).join(', ')}
                                {plan.features.length > 2 && ` +${plan.features.length - 2} ${language === 'ar' ? 'أخرى' : 'more'}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                              {plan.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {language === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Edit Dialog */}
          <Dialog open={isEditingPlan} onOpenChange={setIsEditingPlan}>
            <DialogContent className="max-w-3xl md:max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedPlan?.id === Date.now().toString() 
                    ? (language === 'ar' ? 'إضافة خطة جديدة' : 'Add New Plan')
                    : (language === 'ar' ? 'تعديل الخطة' : 'Edit Plan')
                  }
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' ? 'قم بتعديل تفاصيل الخطة والميزات المتاحة' : 'Modify plan details and available features'}
                </DialogDescription>
              </DialogHeader>
              
              {selectedPlan && (
                <div className="pretty-scrollbar overflow-y-auto max-h-[75vh] pr-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planName">{language === 'ar' ? 'اسم الخطة' : 'Plan Name'}</Label>
                      <Input
                        id="planName"
                        value={selectedPlan.name}
                        onChange={(e) => setSelectedPlan({...selectedPlan, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planPrice">{language === 'ar' ? 'السعر' : 'Price'}</Label>
                      <Input
                        id="planPrice"
                        type="number"
                        value={selectedPlan.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSelectedPlan({
                            ...selectedPlan,
                            price: Number.isFinite(val) ? val : 0,
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planDuration">{language === 'ar' ? 'المدة' : 'Duration'}</Label>
                      <Select value={selectedPlan.duration} onValueChange={(value) => setSelectedPlan({...selectedPlan, duration: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ثانوي">{language === 'ar' ? 'ثانوي' : 'Secondary'}</SelectItem>
                          <SelectItem value="نصف ثانوي">{language === 'ar' ? 'نصف ثانوي' : 'Half-Secondary'}</SelectItem>
                          <SelectItem value="شهري">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                          <SelectItem value="5 دقائق">{language === 'ar' ? '5 دقائق' : '5 minutes'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planStatus">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                      <Select value={selectedPlan.status} onValueChange={(value: 'active' | 'inactive') => setSelectedPlan({...selectedPlan, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                          <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planStorageGB">{language === 'ar' ? 'المساحة المتاحة' : 'Available Storage'}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="planStorageGB"
                        type="number"
                        min={0}
                        value={storageUnit === 'GB' ? (selectedPlan.storageGB ?? 0) : ((selectedPlan.storageGB ?? 0) * 1024)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const gbVal = storageUnit === 'GB' ? val : (val / 1024);
                          setSelectedPlan({
                            ...selectedPlan,
                            storageGB: Number.isFinite(gbVal) ? gbVal : 0,
                          });
                        }}
                      />
                      <Select value={storageUnit} onValueChange={(v) => setStorageUnit((v as 'GB' | 'MB') || 'GB')}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GB">GB</SelectItem>
                          <SelectItem value="MB">MB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Allowed sections inside each page for this plan */}
                  <div className="space-y-3 border rounded-lg p-3">
                    <h3 className="text-sm font-semibold">
                      {language === 'ar' ? 'الصفحات وسيشناتها ضمن هذه الباقة' : 'Pages and their Sessions in this Plan'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar'
                        ? 'اختر السيشنات داخل كل صفحة. إذا لم تُحدَّد أي سيشن لصفحة، تعتبر الصفحة غير مدرجة ومقفلة لمشتركي الباقة.'
                        : 'Pick sessions inside each page. If no sessions are selected for a page, it is considered excluded and locked for subscribers.'}
                    </p>
                    <div className="space-y-4">
                      {TEACHER_FEATURES.filter(f => f.id !== 'dashboard').map((f) => {
                        const selectedForPage = (selectedPlan.allowedSections?.[f.id] || []);
                        const pageIncluded = selectedForPage.length > 0;
                        return (
                          <div key={f.id} className="border rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{language === 'ar' ? f.labelAr : f.labelEn}</span>
                                {pageIncluded ? (
                                  <Badge variant="secondary" className="ml-1">{language === 'ar' ? 'مدرج' : 'Included'}</Badge>
                                ) : (
                                  <Badge variant="outline" className="ml-1">{language === 'ar' ? 'غير مدرج' : 'Excluded'}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{language === 'ar' ? 'تضمين الصفحة' : 'Include Page'}</span>
                                <Checkbox
                                  checked={pageIncluded}
                                  onCheckedChange={(val) => {
                                    const current = selectedPlan.allowedSections || {};
                                    const next = { ...current };
                                    if (!val) {
                                      next[f.id] = [];
                                    } else {
                                      // لا نحدد سيشنات افتراضياً؛ ينتقيها الأدمن لاحقاً
                                      if (!Array.isArray(next[f.id])) next[f.id] = [];
                                    }
                                    setSelectedPlan({ ...selectedPlan, allowedSections: next });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {f.sections.map((s) => {
                                const isChecked = selectedForPage.includes(s.id);
                                return (
                                  <label key={s.id} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(val) => {
                                        const current = selectedPlan.allowedSections || {};
                                        const next = { ...current };
                                        const arr = Array.isArray(next[f.id]) ? [...next[f.id]] : [];
                                        if (val) {
                                          if (!arr.includes(s.id)) arr.push(s.id);
                                        } else {
                                          const idx = arr.indexOf(s.id);
                                          if (idx >= 0) arr.splice(idx, 1);
                                        }
                                        next[f.id] = arr;
                                        setSelectedPlan({ ...selectedPlan, allowedSections: next });
                                      }}
                                    />
                                    <span className="text-sm">{language === 'ar' ? s.labelAr : s.labelEn}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الميزات' : 'Features'}</Label>
                    <div className="space-y-2">
                      {selectedPlan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...selectedPlan.features];
                              newFeatures[index] = e.target.value;
                              setSelectedPlan({...selectedPlan, features: newFeatures});
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newFeatures = selectedPlan.features.filter((_, i) => i !== index);
                              setSelectedPlan({...selectedPlan, features: newFeatures});
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => setSelectedPlan({...selectedPlan, features: [...selectedPlan.features, '']})}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'إضافة ميزة' : 'Add Feature'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="popular"
                      checked={selectedPlan.isPopular}
                      onCheckedChange={(checked) => setSelectedPlan({...selectedPlan, isPopular: checked})}
                    />
                    <Label htmlFor="popular">{language === 'ar' ? 'خطة شائعة' : 'Popular Plan'}</Label>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditingPlan(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleSavePlan}>
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
};

export default Settings;