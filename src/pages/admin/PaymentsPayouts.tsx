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
  TrendingUp,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '@/firebase/config';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, orderBy, updateDoc } from 'firebase/firestore';

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
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'refunded';
  planId?: string;
  walletNumber?: string;
  receiptBase64?: string;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);

  // Payments from Firestore
  const [payments, setPayments] = useState<AdminPayment[]>([]);

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
          status: (data.status as AdminPayment['status']) || 'pending',
          planId: data.planId,
          walletNumber: data.walletNumber,
          receiptBase64: data.receiptBase64,
        };
      });
      setPayments(rows);
    }, (err) => {
      console.error('Failed to subscribe to payments:', err);
      toast.error(language === 'ar' ? 'تعذر تحميل المدفوعات من فايرستور.' : 'Failed to load payments from Firestore.');
    });
    return () => unsub();
  }, [language]);

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

  // Calculate totals - will be fetched from backend
  const totalPayments = 0;
  const totalPayouts = 0;
  const pendingPayouts = 0;

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الأرباح المدفوعة' : 'Total Payouts'}
                    </p>
                    <p className="text-2xl font-bold">${totalPayouts.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'طلبات السحب المعلقة' : 'Pending Payouts'}
                    </p>
                    <p className="text-2xl font-bold">{pendingPayouts}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'صافي الربح' : 'Net Revenue'}
                    </p>
                    <p className="text-2xl font-bold">${(totalPayments - totalPayouts).toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Payments and Payouts */}
          <Tabs defaultValue="payments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payments">
                {language === 'ar' ? 'المدفوعات' : 'Payments'}
              </TabsTrigger>
              <TabsTrigger value="payouts">
                {language === 'ar' ? 'المدفوعات المقبولة' : 'Approved Payments'}
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

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-6">
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

              {/* Payouts Table */}
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
  const handleApprovePayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.uid || null,
      });
      toast.success(language === 'ar' ? 'تم قبول الدفع.' : 'Payment approved.');
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