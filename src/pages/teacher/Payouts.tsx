import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import TeacherSidebar from "@/components/TeacherSidebar";
import FloatingSupportChat from "@/components/FloatingSupportChat";
import { Image as ImageIcon } from "lucide-react";
import { TeacherService } from "@/services/teacherService";
import { SubscriptionRequestService, SubscriptionRequest } from "@/services/subscriptionRequestService";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-[#f2f2f2]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={teacherName} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto bg-[#f2f2f2]">
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
          <Card className="bg-white border-0 shadow-sm mb-8">
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
          <Card className="bg-white border-0 shadow-sm">
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
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {language === 'ar' ? 'لا توجد طلبات اشتراك حالياً' : 'No subscription requests yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col md:flex-row gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="md:w-2/3 space-y-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{language === 'ar' ? 'الطالب:' : 'Student:'}</span> {req.studentName || req.studentId}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{language === 'ar' ? 'الدورة:' : 'Course:'}</span> {req.courseTitle || req.courseId}
                        </p>
                        <Badge variant="outline" className="capitalize w-fit">
                          {language === 'ar' ? (req.status === 'pending' ? 'معلق' : req.status === 'confirmed' ? 'تم التأكيد' : 'مرفوض') : req.status}
                        </Badge>
                        {req.amount && (
                          <p className="text-sm text-gray-700">{language === 'ar' ? 'المبلغ:' : 'Amount:'} {req.amount}</p>
                        )}
                      </div>
                      <div className="md:w-1/3">
                        {req.screenshotUrl ? (
                          <a href={req.screenshotUrl} target="_blank" rel="noopener noreferrer">
                            <img src={req.screenshotUrl} alt="Payment screenshot" className="w-full h-40 object-cover rounded-md border" />
                          </a>
                        ) : (
                          <div className="w-full h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                            {language === 'ar' ? 'لا توجد صورة' : 'No image'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 md:w-full">
                        <Button 
                          disabled={req.status !== 'pending'} 
                          className="bg-green-600 hover:bg-green-700 text-white"
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