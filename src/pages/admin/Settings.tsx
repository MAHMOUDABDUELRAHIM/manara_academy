import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
}

const Settings: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

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
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: '1',
      name: 'مجاني',
      price: 0,
      duration: 'شهري',
      features: ['الوصول لـ 3 دورات', 'دعم المجتمع', 'شهادة إتمام'],
      isPopular: false,
      status: 'active'
    },
    {
      id: '2',
      name: 'قياسي',
      price: 29,
      duration: 'شهري',
      features: ['الوصول لجميع الدورات', 'دعم مباشر', 'شهادات معتمدة', 'مشاريع عملية'],
      isPopular: true,
      status: 'active'
    },
    {
      id: '3',
      name: 'احترافي',
      price: 99,
      duration: 'شهري',
      features: ['كل ميزات القياسي', 'جلسات فردية', 'مراجعة الكود', 'وصول مبكر للدورات', 'مجتمع VIP'],
      isPopular: false,
      status: 'active'
    }
  ]);

  const tabs = [
    { id: 'general', label: language === 'ar' ? 'الإعدادات العامة' : 'General Settings', icon: Globe },
    { id: 'payment', label: language === 'ar' ? 'إعدادات الدفع' : 'Payment Settings', icon: CreditCard },
    { id: 'notifications', label: language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings', icon: Bell },
    { id: 'plans', label: language === 'ar' ? 'إدارة الخطط' : 'Plan Management', icon: Crown }
  ];

  const handleSaveGeneral = () => {
    console.log('Saving general settings:', generalSettings);
    // Mock save functionality
  };

  const handleSavePayment = () => {
    console.log('Saving payment settings:', paymentSettings);
    // Mock save functionality
  };

  const handleSaveNotifications = () => {
    console.log('Saving notification settings:', notificationSettings);
    // Mock save functionality
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsEditingPlan(true);
  };

  const handleSavePlan = () => {
    if (selectedPlan) {
      setPlans(plans.map(p => p.id === selectedPlan.id ? selectedPlan : p));
      setIsEditingPlan(false);
      setSelectedPlan(null);
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
      status: 'inactive'
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

                <Button onClick={handleSaveGeneral} className="w-full md:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
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
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
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
            <DialogContent className="max-w-2xl">
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
                <div className="space-y-4">
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
                        onChange={(e) => setSelectedPlan({...selectedPlan, price: parseInt(e.target.value)})}
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
                          <SelectItem value="شهري">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                          <SelectItem value="سنوي">{language === 'ar' ? 'سنوي' : 'Yearly'}</SelectItem>
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