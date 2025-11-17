import React, { useEffect, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { NotificationService } from '@/services/notificationService';
import { db } from '@/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

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

interface AdminNotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  sender: string;
  createdDate: string;
  totalRecipients: number;
}

const Notifications: React.FC = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotificationRow | null>(null);
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<string>('info');
  const [recipientScope, setRecipientScope] = useState<'all' | 'specific'>('all');
  const [recipientTeacherId, setRecipientTeacherId] = useState<string>('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState<string>('');
  const [linkText, setLinkText] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const BROADCAST_TEACHERS = '__ALL_TEACHERS__';

  useEffect(() => {
    const run = async () => {
      try {
        const tSnap = await getDocs(query(collection(db, 'teachers')));
        const tList = tSnap.docs.map((d) => ({ id: d.id, name: (d.data() as any).fullName || d.id }));
        setTeachers(tList);
      } catch (e) {
        console.error('Failed to load teachers:', e);
      }
      try {
        const nSnap = await getDocs(query(collection(db, 'notifications'), limit(100)));
        const rows: AdminNotificationRow[] = nSnap.docs
          .map((docSnap) => {
            const data = docSnap.data() as any;
            const created = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
            return {
              id: docSnap.id,
              type: String(data.type || 'info'),
              title: String(data.title || ''),
              message: String(data.message || ''),
              sender: 'الإدارة',
              createdDate: String(created),
              totalRecipients: 1,
            } as AdminNotificationRow;
          })
          .filter((row, idx) => {
            const data = nSnap.docs[idx].data() as any;
            return !!row.title && !!row.message && String(data.origin || '') === 'admin';
          });
        rows.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        setNotifications(rows);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    };
    run();
  }, []);

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

  const getStatusBadge = (status: string) => <Badge variant="secondary">{status}</Badge>;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || notification.type === (typeFilter as any);
      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, typeFilter]);

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
    setSelectedNotifications([]);
  };

  const handleCreateNotification = async () => {
    if (!newTitle.trim() || !newMessage.trim()) return;
    let recipients: string[] = [];
    if (recipientScope === 'all') {
      recipients = teachers.map((t) => t.id);
    } else if (recipientTeacherId) {
      recipients = [recipientTeacherId];
    }
    if (recipientScope !== 'all' && recipients.length === 0) return;
    const createdRows: AdminNotificationRow[] = [];
    if (recipientScope === 'all') {
      if (!teachers || teachers.length === 0) return;
      const tasks = teachers.map(async (t) => {
        try {
          const id = await NotificationService.createNotification({
            userId: t.id,
            title: newTitle.trim(),
            message: newMessage.trim(),
            type: newType as any,
            teacherId: t.id,
            expiresAt: expiresAtLocal ? new Date(expiresAtLocal).toISOString() : undefined,
            linkText: linkText.trim() || undefined,
            linkUrl: linkUrl.trim() || undefined,
            origin: 'admin',
          });
          createdRows.push({
            id,
            type: newType,
            title: newTitle.trim(),
            message: newMessage.trim(),
            sender: 'الإدارة',
            createdDate: new Date().toISOString(),
            totalRecipients: 1,
          });
        } catch (e) {
          console.error('Failed to create notification for teacher', t.id, e);
        }
      });
      await Promise.allSettled(tasks);
    } else {
      const tasks = recipients.map(async (uid) => {
        try {
          const id = await NotificationService.createNotification({
            userId: uid,
            title: newTitle.trim(),
            message: newMessage.trim(),
            type: newType as any,
            teacherId: uid,
            expiresAt: expiresAtLocal ? new Date(expiresAtLocal).toISOString() : undefined,
            linkText: linkText.trim() || undefined,
            linkUrl: linkUrl.trim() || undefined,
            origin: 'admin',
          });
          createdRows.push({
            id,
            type: newType,
            title: newTitle.trim(),
            message: newMessage.trim(),
            sender: 'الإدارة',
            createdDate: new Date().toISOString(),
            totalRecipients: 1,
          });
        } catch (e) {
          console.error('Failed to create notification for teacher', uid, e);
        }
      });
      await Promise.allSettled(tasks);
    }
    setNotifications((prev) => [...createdRows, ...prev]);
    setIsNewDialogOpen(false);
    setNewTitle('');
    setNewMessage('');
    setRecipientScope('all');
    setRecipientTeacherId('');
    setExpiresAtLocal('');
    setLinkText('');
    setLinkUrl('');
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
                    <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Bell className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'إشعار جديد' : 'New Notification'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{language === 'ar' ? 'إنشاء إشعار جديد' : 'Create New Notification'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="mb-1 block">{language === 'ar' ? 'العنوان' : 'Title'}</Label>
                            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                          </div>
                          <div>
                            <Label className="mb-1 block">{language === 'ar' ? 'الرسالة' : 'Message'}</Label>
                            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="mb-1 block">{language === 'ar' ? 'النوع' : 'Type'}</Label>
                              <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="info">{language === 'ar' ? 'معلومات' : 'Info'}</SelectItem>
                                <SelectItem value="success">{language === 'ar' ? 'نجاح' : 'Success'}</SelectItem>
                                <SelectItem value="warning">{language === 'ar' ? 'تحذير' : 'Warning'}</SelectItem>
                                <SelectItem value="error">{language === 'ar' ? 'خطأ' : 'Error'}</SelectItem>
                                <SelectItem value="announcement">{language === 'ar' ? 'إعلان' : 'Announcement'}</SelectItem>
                                <SelectItem value="promotion">{language === 'ar' ? 'عرض ترويجي' : 'Promotion'}</SelectItem>
                                <SelectItem value="maintenance">{language === 'ar' ? 'صيانة النظام' : 'Maintenance'}</SelectItem>
                                <SelectItem value="update">{language === 'ar' ? 'تحديث' : 'Update'}</SelectItem>
                                <SelectItem value="event">{language === 'ar' ? 'حدث' : 'Event'}</SelectItem>
                                <SelectItem value="reminder">{language === 'ar' ? 'تذكير' : 'Reminder'}</SelectItem>
                                <SelectItem value="payment">{language === 'ar' ? 'دفعات' : 'Payments'}</SelectItem>
                                <SelectItem value="deadline">{language === 'ar' ? 'موعد نهائي' : 'Deadline'}</SelectItem>
                                <SelectItem value="new_feature">{language === 'ar' ? 'ميزة جديدة' : 'New Feature'}</SelectItem>
                              </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="mb-1 block">{language === 'ar' ? 'المستلمون' : 'Recipients'}</Label>
                              <Select value={recipientScope} onValueChange={(v) => setRecipientScope(v as any)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">{language === 'ar' ? 'جميع المدرسين' : 'All Teachers'}</SelectItem>
                                  <SelectItem value="specific">{language === 'ar' ? 'مدرس محدد' : 'Specific Teacher'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="mb-1 block">{language === 'ar' ? 'تاريخ انتهاء الإشعار' : 'Notification Expiry'}</Label>
                            <Input type="datetime-local" value={expiresAtLocal} onChange={(e) => setExpiresAtLocal(e.target.value)} />
                          </div>
                          {recipientScope === 'specific' && (
                            <div>
                              <Label className="mb-1 block">{language === 'ar' ? 'اختر المدرس' : 'Select Teacher'}</Label>
                              <Select value={recipientTeacherId} onValueChange={setRecipientTeacherId}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {teachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="mb-1 block">{language === 'ar' ? 'نص الزر' : 'Button Text'}</Label>
                              <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder={language === 'ar' ? 'مثلاً: فتح' : 'e.g., Open'} />
                            </div>
                            <div>
                              <Label className="mb-1 block">{language === 'ar' ? 'رابط الزر' : 'Button Link URL'}</Label>
                              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                              {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button onClick={handleCreateNotification}>
                              {language === 'ar' ? 'إرسال' : 'Send'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                          </div>
                        </TableCell>
                        <TableCell>{(() => {
                          try {
                            const d = new Date(notification.createdDate);
                            const now = new Date();
                            const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                            const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
                            const timeStr = d.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                            if (same) return language === 'ar' ? `اليوم ${timeStr}` : `today ${timeStr}`;
                            if (isTomorrow) return language === 'ar' ? `غداً ${timeStr}` : `tomorrow ${timeStr}`;
                            return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                          } catch {
                            return notification.createdDate;
                          }
                        })()}</TableCell>
                        <TableCell>{getStatusBadge('sent')}</TableCell>
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
                                    
                                  </div>
                                  
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