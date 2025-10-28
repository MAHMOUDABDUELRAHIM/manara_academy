import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import {
  Bell,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  User,
  Mail,
  MessageSquare,
  Settings,
  Download
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  recipient: {
    type: 'all' | 'students' | 'teachers' | 'specific';
    users?: string[];
  };
  sender: string;
  createdDate: string;
  readBy: string[];
  totalRecipients: number;
  status: 'sent' | 'draft' | 'scheduled';
  scheduledDate?: string;
  category: 'system' | 'course' | 'payment' | 'announcement' | 'maintenance';
}

const Notifications: React.FC = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'تحديث جديد للمنصة',
      message: 'تم إطلاق تحديث جديد للمنصة يتضمن تحسينات في الأداء وميزات جديدة. يرجى تسجيل الخروج وإعادة تسجيل الدخول لتطبيق التحديثات.',
      recipient: { type: 'all' },
      sender: 'فريق التطوير',
      createdDate: '2024-01-15',
      readBy: ['user1', 'user2', 'user3'],
      totalRecipients: 1250,
      status: 'sent',
      category: 'system'
    },
    {
      id: '2',
      type: 'warning',
      title: 'صيانة مجدولة للخادم',
      message: 'ستتم صيانة الخادم يوم الجمعة من الساعة 2:00 إلى 4:00 صباحاً. قد تواجه انقطاع في الخدمة خلال هذه الفترة.',
      recipient: { type: 'all' },
      sender: 'فريق التقنية',
      createdDate: '2024-01-14',
      readBy: ['user1', 'user4'],
      totalRecipients: 1250,
      status: 'scheduled',
      scheduledDate: '2024-01-19',
      category: 'maintenance'
    },
    {
      id: '3',
      type: 'success',
      title: 'دورة جديدة متاحة: React المتقدم',
      message: 'تم إضافة دورة جديدة في React المتقدم من إعداد الأستاذ أحمد محمد. سجل الآن واحصل على خصم 20% للمسجلين الأوائل.',
      recipient: { type: 'students' },
      sender: 'فريق المحتوى',
      createdDate: '2024-01-13',
      readBy: ['user2', 'user5', 'user6'],
      totalRecipients: 850,
      status: 'sent',
      category: 'course'
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800">مرسل</Badge>;
      case 'draft':
        return <Badge variant="secondary">مسودة</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">مجدول</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications([...selectedNotifications, id]);
    } else {
      setSelectedNotifications(selectedNotifications.filter(nId => nId !== id));
    }
  };

  const handleDeleteSelected = () => {
    setNotifications(notifications.filter(n => !selectedNotifications.includes(n.id)));
    setSelectedNotifications([]);
  };

  const handleMarkAsRead = () => {
    setNotifications(notifications.map(n => 
      selectedNotifications.includes(n.id) 
        ? { ...n, readBy: [...n.readBy, 'current-user'] }
        : n
    ));
    setSelectedNotifications([]);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar />
        
        <main className="flex-1 p-6 mr-64">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {language === 'ar' ? 'إدارة الإشعارات' : 'Notifications Management'}
              </h1>
              <p className="text-gray-600">
                {language === 'ar' 
                  ? 'إدارة وإرسال الإشعارات للمستخدمين' 
                  : 'Manage and send notifications to users'
                }
              </p>
            </div>

            {/* Filters and Actions */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={language === 'ar' ? 'البحث في الإشعارات...' : 'Search notifications...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={language === 'ar' ? 'نوع الإشعار' : 'Type'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                        <SelectItem value="info">{language === 'ar' ? 'معلومات' : 'Info'}</SelectItem>
                        <SelectItem value="warning">{language === 'ar' ? 'تحذير' : 'Warning'}</SelectItem>
                        <SelectItem value="success">{language === 'ar' ? 'نجاح' : 'Success'}</SelectItem>
                        <SelectItem value="error">{language === 'ar' ? 'خطأ' : 'Error'}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                        <SelectItem value="sent">{language === 'ar' ? 'مرسل' : 'Sent'}</SelectItem>
                        <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                        <SelectItem value="scheduled">{language === 'ar' ? 'مجدول' : 'Scheduled'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    {selectedNotifications.length > 0 && (
                      <>
                        <Button variant="outline" onClick={handleMarkAsRead}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'تحديد كمقروء' : 'Mark as Read'}
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSelected}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'حذف المحدد' : 'Delete Selected'}
                        </Button>
                      </>
                    )}
                    <Button>
                      <Bell className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إشعار جديد' : 'New Notification'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'ar' ? 'قائمة الإشعارات' : 'Notifications List'}</span>
                  <Badge variant="secondary">
                    {filteredNotifications.length} {language === 'ar' ? 'إشعار' : 'notifications'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المرسل' : 'Sender'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المستلمون' : 'Recipients'}</TableHead>
                      <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedNotifications.includes(notification.id)}
                            onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getTypeIcon(notification.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {notification.message}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback>{notification.sender.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{notification.sender}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{notification.totalRecipients} {language === 'ar' ? 'مستخدم' : 'users'}</div>
                            <div className="text-gray-500">
                              {notification.readBy.length} {language === 'ar' ? 'قرأوا' : 'read'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{notification.createdDate}</TableCell>
                        <TableCell>{getStatusBadge(notification.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedNotification(notification)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    {getTypeIcon(notification.type)}
                                    {notification.title}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">{language === 'ar' ? 'الرسالة' : 'Message'}</h4>
                                    <p className="text-gray-700">{notification.message}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-1">{language === 'ar' ? 'المرسل' : 'Sender'}</h4>
                                      <p className="text-sm text-gray-600">{notification.sender}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</h4>
                                      <p className="text-sm text-gray-600">{notification.createdDate}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">{language === 'ar' ? 'المستلمون' : 'Recipients'}</h4>
                                      <p className="text-sm text-gray-600">
                                        {notification.totalRecipients} {language === 'ar' ? 'مستخدم' : 'users'}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">{language === 'ar' ? 'معدل القراءة' : 'Read Rate'}</h4>
                                      <p className="text-sm text-gray-600">
                                        {Math.round((notification.readBy.length / notification.totalRecipients) * 100)}%
                                      </p>
                                    </div>
                                  </div>
                                  {notification.scheduledDate && (
                                    <div>
                                      <h4 className="font-medium mb-1">{language === 'ar' ? 'تاريخ الإرسال المجدول' : 'Scheduled Date'}</h4>
                                      <p className="text-sm text-gray-600">{notification.scheduledDate}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notifications;