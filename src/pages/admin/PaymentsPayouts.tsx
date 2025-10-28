import React, { useState } from 'react';
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

interface Payment {
  id: string;
  student: {
    name: string;
    email: string;
    avatar?: string;
  };
  course: {
    title: string;
    id: string;
  };
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
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

  // Mock payments data - will be replaced with real data from backend
  const [payments] = useState<Payment[]>([]);

  // Mock payout requests data - will be replaced with real data from backend
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>;
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
    const matchesSearch = payment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayouts = payoutRequests.filter(payout => {
    const matchesSearch = payout.teacher.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
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
                {language === 'ar' ? 'طلبات السحب' : 'Payout Requests'}
              </TabsTrigger>
            </TabsList>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
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

              {/* Payments Table */}
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
                          <TableHead>{language === 'ar' ? 'الطالب' : 'Student'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الدورة' : 'Course'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={payment.student.avatar} alt={payment.student.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {payment.student.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{payment.student.name}</div>
                                  <div className="text-sm text-muted-foreground">{payment.student.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payment.course.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">${payment.amount}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payment.date}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              <span className="text-sm">{payment.paymentMethod}</span>
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
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={language === 'ar' ? 'تصفية بالحالة' : 'Filter by Status'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                        <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                        <SelectItem value="approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</SelectItem>
                        <SelectItem value="processed">{language === 'ar' ? 'تم التحويل' : 'Processed'}</SelectItem>
                        <SelectItem value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Payouts Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'ar' ? `طلبات السحب (${filteredPayouts.length})` : `Payout Requests (${filteredPayouts.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Method'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={payout.teacher.avatar} alt={payout.teacher.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {payout.teacher.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{payout.teacher.name}</div>
                                  <div className="text-sm text-muted-foreground">{payout.teacher.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">${payout.amount}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{payout.requestDate}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payout.paymentMethod === 'bank_transfer' ? 
                                  (language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer') :
                                  payout.paymentMethod === 'paypal' ? 'PayPal' : 'Stripe'
                                }
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedPayout(payout)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {language === 'ar' ? 'تفاصيل طلب السحب' : 'Payout Request Details'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    {selectedPayout && (
                                      <div className="space-y-6">
                                        {/* Teacher Info */}
                                        <div className="flex items-center gap-4">
                                          <Avatar className="h-16 w-16">
                                            <AvatarImage src={selectedPayout.teacher.avatar} alt={selectedPayout.teacher.name} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                              {selectedPayout.teacher.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h3 className="text-xl font-semibold">{selectedPayout.teacher.name}</h3>
                                            <p className="text-muted-foreground">{selectedPayout.teacher.email}</p>
                                            {getPayoutStatusBadge(selectedPayout.status)}
                                          </div>
                                        </div>

                                        {/* Payout Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              {language === 'ar' ? 'المبلغ المطلوب' : 'Requested Amount'}
                                            </label>
                                            <p className="text-2xl font-bold">${selectedPayout.amount}</p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              {language === 'ar' ? 'تاريخ الطلب' : 'Request Date'}
                                            </label>
                                            <p className="text-lg">{selectedPayout.requestDate}</p>
                                          </div>
                                        </div>

                                        {/* Payment Method Details */}
                                        <div className="border rounded-lg p-4">
                                          <h4 className="font-medium mb-3">
                                            {language === 'ar' ? 'تفاصيل طريقة الدفع' : 'Payment Method Details'}
                                          </h4>
                                          {selectedPayout.paymentMethod === 'bank_transfer' && selectedPayout.bankDetails && (
                                            <div className="space-y-2">
                                              <div>
                                                <span className="text-sm font-medium">
                                                  {language === 'ar' ? 'اسم البنك:' : 'Bank Name:'}
                                                </span>
                                                <span className="ml-2">{selectedPayout.bankDetails.bankName}</span>
                                              </div>
                                              <div>
                                                <span className="text-sm font-medium">
                                                  {language === 'ar' ? 'رقم الحساب:' : 'Account Number:'}
                                                </span>
                                                <span className="ml-2">{selectedPayout.bankDetails.accountNumber}</span>
                                              </div>
                                            </div>
                                          )}
                                          {selectedPayout.paymentMethod === 'paypal' && selectedPayout.paypalEmail && (
                                            <div>
                                              <span className="text-sm font-medium">
                                                {language === 'ar' ? 'بريد PayPal:' : 'PayPal Email:'}
                                              </span>
                                              <span className="ml-2">{selectedPayout.paypalEmail}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Notes */}
                                        {selectedPayout.notes && (
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              {language === 'ar' ? 'ملاحظات' : 'Notes'}
                                            </label>
                                            <p className="mt-1 p-3 bg-muted rounded-lg">{selectedPayout.notes}</p>
                                          </div>
                                        )}

                                        {/* Action Buttons */}
                                        {selectedPayout.status === 'pending' && (
                                          <div className="flex gap-2 pt-4 border-t">
                                            <Button
                                              onClick={() => handleApprovePayout(selectedPayout.id)}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <Check className="h-4 w-4 mr-2" />
                                              {language === 'ar' ? 'موافقة' : 'Approve'}
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleRejectPayout(selectedPayout.id)}
                                            >
                                              <X className="h-4 w-4 mr-2" />
                                              {language === 'ar' ? 'رفض' : 'Reject'}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                {payout.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApprovePayout(payout.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejectPayout(payout.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
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