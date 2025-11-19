import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { Image as ImageIcon } from "lucide-react";
import { TeacherService } from "@/services/teacherService";
import { SubscriptionRequestService, SubscriptionRequest } from "@/services/subscriptionRequestService";
import { toast } from "sonner";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";

export const TeacherPayouts = () => {
  const { language } = useLanguage();
  const { user } = useAuthContext();
  const teacherName = user?.displayName || (language === 'ar' ? 'مدرس جديد' : 'New Teacher');

  // Wallet number state
  const [paymentNumber, setPaymentNumber] = useState<string>("");
  const [savingPayment, setSavingPayment] = useState<boolean>(false);

  // Student subscription requests state
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [errorRequests, setErrorRequests] = useState<string | null>(null);
  const [showScreenshot, setShowScreenshot] = useState<boolean>(false);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'confirmed');


  useEffect(() => {
    const init = async () => {
      if (!user?.uid) return;
      try {
        // Load teacher profile payment number if available
        const teacher = await TeacherService.getTeacherByUid(user.uid);
        if (teacher?.paymentNumber) {
          setPaymentNumber(teacher.paymentNumber);
        }
      } catch (e) {
        // ignore load error for payment number
      }

      try {
        setLoadingRequests(true);
        setErrorRequests(null);
        const reqs = await SubscriptionRequestService.getRequestsForTeacher(user.uid);
        setRequests(reqs);
      } catch (e) {
        console.error(e);
        setErrorRequests(language === 'ar' ? 'فشل تحميل طلبات الطلاب' : 'Failed to load student requests');
      } finally {
        setLoadingRequests(false);
      }
    };
    init();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'subscriptionRequests'), where('teacherId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const next: SubscriptionRequest[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setRequests(next);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleSavePaymentNumber = async () => {
    if (!user?.uid) return;
    try {
      setSavingPayment(true);
      await TeacherService.updateTeacherProfile(user.uid, { paymentNumber });
      toast.success(language === 'ar' ? 'تم حفظ رقم المحفظة' : 'Payment number saved');
    } catch (e) {
      toast.error(language === 'ar' ? 'فشل حفظ رقم المحفظة' : 'Failed to save payment number');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await SubscriptionRequestService.confirmRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed', processedAt: new Date().toISOString() } : r));
      toast.success(language === 'ar' ? 'تم تأكيد الدفع وفتح الكورس' : 'Payment confirmed and course access granted');
    } catch (e) {
      toast.error(language === 'ar' ? 'فشل تأكيد الدفع' : 'Failed to confirm payment');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await SubscriptionRequestService.rejectRequest(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', processedAt: new Date().toISOString() } : r));
      toast.success(language === 'ar' ? 'تم رفض الطلب' : 'Request rejected');
    } catch (e) {
      toast.error(language === 'ar' ? 'فشل رفض الطلب' : 'Failed to reject request');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16" dir="ltr">
      <DashboardHeader fixed studentName={teacherName} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="md:ml-64 flex-1 p-6 overflow-y-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#2c4656] mb-2">
              {language === 'ar' ? 'طلبات اشتراك الطلاب' : 'Student Subscription Requests'}
            </h1>
            <p className="text-gray-600">
              {language === 'ar' 
                ? 'أدخل رقم محفظتك واستعرض طلبات اشتراك الطلاب للتحقق من الدفع'
                : 'Add your wallet number and manage student subscription requests with payment screenshots'}
            </p>
          </div>

          {/* Wallet Number Section */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl mb-8">
            <CardHeader>
              <CardTitle className="text-[#2c4656]">
                {language === 'ar' ? 'رقم المحفظة لاستقبال اشتراكات الطلاب' : 'Wallet Number for Student Subscriptions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <Input
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل رقم المحفظة (مثال: فودافون كاش)' : 'Enter wallet number (e.g., Vodafone Cash)'}
                  className="md:flex-1"
                />
                <Button onClick={handleSavePaymentNumber} disabled={savingPayment} className="bg-[#ee7b3d] hover:bg-[#d66a2c] text-white">
                  {savingPayment ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {language === 'ar' ? 'سيظهر هذا الرقم للطلاب للدفع عبر المحافظ الإلكترونية.' : 'Students will use this wallet number to pay via cash wallets.'}
              </p>
            </CardContent>
          </Card>

          {/* Student Requests Section */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2c4656]">
                <ImageIcon className="h-5 w-5" />
                {language === 'ar' ? 'طلبات الطلاب (مع لقطة الدفع)' : 'Student Requests (with payment screenshot)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <p className="text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : errorRequests ? (
                <p className="text-red-600">{errorRequests}</p>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {language === 'ar' ? 'لا توجد طلبات اشتراك حالياً' : 'No subscription requests yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-6 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    <div>{language === 'ar' ? 'الطالب' : 'Student'}</div>
                    <div>{language === 'ar' ? 'الدورة' : 'Course'}</div>
                    <div>{language === 'ar' ? 'المبلغ' : 'Amount'}</div>
                    <div>{language === 'ar' ? 'الحالة' : 'Status'}</div>
                    <div>{language === 'ar' ? 'الصورة' : 'Screenshot'}</div>
                    <div className={language === 'ar' ? 'text-right' : 'text-left'}>{language === 'ar' ? 'إجراءات' : 'Actions'}</div>
                  </div>
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border border-gray-200 rounded-lg items-center">
                      <div className="text-sm text-gray-700">
                        {req.studentName || req.studentId}
                      </div>
                      <div className="text-sm text-gray-700">
                        {req.courseTitle || req.courseId}
                      </div>
                      <div className="text-sm text-gray-700">
                        {req.amount ?? '-'}
                      </div>
                      <div>
                        <Badge variant="outline" className="capitalize w-fit">
                          {language === 'ar' ? (req.status === 'pending' ? 'معلق' : req.status === 'confirmed' ? 'تم التأكيد' : 'مرفوض') : req.status}
                        </Badge>
                      </div>
                      <div>
                        {req.screenshotUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d]/10"
                            onClick={() => { setActiveScreenshot(req.screenshotUrl!); setShowScreenshot(true); }}
                          >
                            {language === 'ar' ? 'عرض الصورة' : 'View Screenshot'}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">{language === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                        <Button 
                          disabled={req.status !== 'pending'} 
                          className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white"
                          onClick={() => handleConfirm(req.id!)}
                        >
                          {language === 'ar' ? 'تأكيد الدفع وفتح الكورس' : 'Confirm & Grant Access'}
                        </Button>
                        <Button 
                          variant="outline" 
                          disabled={req.status !== 'pending'}
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(req.id!)}
                        >
                          {language === 'ar' ? 'رفض الطلب' : 'Reject'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approved Requests Section */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2c4656]">
                <ImageIcon className="h-5 w-5" />
                {language === 'ar' ? 'الطلبات الموافق عليها' : 'Approved Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <p className="text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : approvedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {language === 'ar' ? 'لا توجد طلبات مؤكدة حالياً' : 'No approved requests yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-5 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    <div>{language === 'ar' ? 'الطالب' : 'Student'}</div>
                    <div>{language === 'ar' ? 'الدورة' : 'Course'}</div>
                    <div>{language === 'ar' ? 'المبلغ' : 'Amount'}</div>
                    <div>{language === 'ar' ? 'الصورة' : 'Screenshot'}</div>
                    <div>{language === 'ar' ? 'تمت في' : 'Processed At'}</div>
                  </div>
                  {approvedRequests.map((req) => (
                    <div key={req.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg items-center">
                      <div className="text-sm text-gray-700">{req.studentName || req.studentId}</div>
                      <div className="text-sm text-gray-700">{req.courseTitle || req.courseId}</div>
                      <div className="text-sm text-gray-700">{req.amount ?? '-'}</div>
                      <div>
                        {req.screenshotUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#ee7b3d] text-[#ee7b3d] hover:bg-[#ee7b3d]/10"
                            onClick={() => { setActiveScreenshot(req.screenshotUrl!); setShowScreenshot(true); }}
                          >
                            {language === 'ar' ? 'عرض الصورة' : 'View Screenshot'}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">{language === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">{req.processedAt ? new Date(req.processedAt).toLocaleString() : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-center">{language === 'ar' ? 'لقطة الدفع' : 'Payment Screenshot'}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                {activeScreenshot && (
                  <img src={activeScreenshot} alt="Payment screenshot" className="max-h-[70vh] rounded-lg border" />
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-center">{language === 'ar' ? 'لقطة الدفع' : 'Payment Screenshot'}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                {activeScreenshot && (
                  <img src={activeScreenshot} alt="Payment screenshot" className="max-h-[70vh] rounded-lg border" />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500 h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Floating Support Chat */}
      <FloatingSupportChat />
    </div>
  );
};

export default TeacherPayouts;