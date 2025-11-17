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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import SyncUsersButton from '@/components/SyncUsersButton';
import {
  Users,
  Search,
  Filter,
  Eye,
  UserX,
  Trash2,
  Calendar,
  BookOpen,
  Activity,
  Key,
  Ban,
  Plus,
  MoreHorizontal,
  Edit,
  Star,
  UserCheck,
  RotateCcw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useUsers, FirestoreUser } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

// دالة لحساب الأيام المتبقية للاشتراك
const getRemainingDays = (endDateStr: string): string => {
  const endDate = new Date(endDateStr);
  const today = new Date();
  
  // إذا كان تاريخ الانتهاء قد مر
  if (endDate < today) {
    return 'منتهي';
  }
  
  // حساب الفرق بالأيام
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return `${diffDays} يوم`;
};

const ManageUsers: React.FC = () => {
  const { language } = useLanguage();
  const { 
    users, 
    loading, 
    error, 
    updateUserStatus, 
    deleteUser, 
    updateUser, 
    searchUsers,
    filterUsersByRole,
    filterUsersByStatus,
    getUserStats
  } = useUsers();
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<{id: string, status: string, role: string} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, role: string} | null>(null);

  let filteredUsers = users.filter(user => user.email !== 'mahmoudabduelrahim@gmail.com');
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredUsers = filteredUsers.filter(u => 
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  }
  if (roleFilter !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
  }
  if (statusFilter !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.status === statusFilter);
  }

  // Get user statistics
  const stats = getUserStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">{language === 'ar' ? 'نشط' : 'Active'}</Badge>;
      case 'suspended':
        return <Badge variant="destructive">{language === 'ar' ? 'معلق' : 'Suspended'}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{language === 'ar' ? 'في الانتظار' : 'Pending'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant="outline" className={role === 'teacher' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
        {role === 'teacher' ? (language === 'ar' ? 'مدرس' : 'Teacher') : (language === 'ar' ? 'طالب' : 'Student')}
      </Badge>
    );
  };

  // Handle user actions
  const handleSuspendUser = async (userId: string, currentStatus: string, role: string) => {
    // إذا كان الحساب معلق بالفعل، قم بإلغاء التعليق مباشرة
    if (currentStatus === 'suspended') {
      try {
        await updateUserStatus(userId, 'active', role as any);
        toast({
          title: language === 'ar' ? 'تم إلغاء تعليق المستخدم بنجاح' : 'User unsuspended successfully',
          variant: "default",
        });
      } catch (error) {
        console.error('Error unsuspending user:', error);
        toast({
          title: language === 'ar' ? 'حدث خطأ أثناء إلغاء تعليق المستخدم' : 'Error unsuspending user',
          variant: "destructive",
        });
      }
    } else {
      // إذا كان الحساب نشط، اعرض نافذة التأكيد أولاً
      setUserToSuspend({ id: userId, status: currentStatus, role });
      setIsSuspendDialogOpen(true);
    }
  };

  const confirmSuspendUser = async () => {
    if (!userToSuspend) return;
    
    try {
      await updateUserStatus(userToSuspend.id, 'suspended', userToSuspend.role as any);
      toast({
        title: language === 'ar' ? 'تم تعليق المستخدم بنجاح' : 'User suspended successfully',
        variant: "default",
      });
      
      // إغلاق نافذة التأكيد وإعادة تعيين البيانات
      setIsSuspendDialogOpen(false);
      setUserToSuspend(null);
      
      // إذا كان المستخدم المعلق هو نفسه المستخدم المحدد حالياً، قم بتحديث حالته
      if (selectedUser && selectedUser.id === userToSuspend.id) {
        setSelectedUser({
          ...selectedUser,
          status: 'suspended'
        });
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: language === 'ar' ? 'حدث خطأ أثناء تعليق المستخدم' : 'Error suspending user',
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, role: string) => {
    setUserToDelete({ id: userId, role });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id, userToDelete.role as any);
      toast({
        title: language === 'ar' ? 'تم حذف المستخدم وكل البيانات المرتبطة' : 'User and related data deleted',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const target = users.find(u => u.id === userId);
      if (!target || !target.email) {
        toast({ title: language === 'ar' ? 'البريد الإلكتروني غير متاح' : 'Email not available', variant: 'destructive' });
        return;
      }
      await resetPassword(target.email);
      toast({ title: language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور' : 'Password reset link sent', variant: 'default' });
    } catch (e) {
      toast({ title: language === 'ar' ? 'فشل إرسال رابط إعادة التعيين' : 'Failed to send reset link', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users'}
              </h1>
              <p className="text-gray-600">
                {language === 'ar' 
                  ? 'إدارة حسابات المستخدمين والأذونات' 
                  : 'Manage user accounts and permissions'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SyncUsersButton />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">
                {language === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Content - only show when not loading */}
          {!loading && (
            <>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'المستخدمون النشطون' : 'Active Users'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.active}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'المدرسون' : 'Teachers'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.teachers}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Star className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'الطلاب' : 'Students'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.students}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
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
                      placeholder={language === 'ar' ? 'البحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={language === 'ar' ? 'تصفية بالدور' : 'Filter by Role'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الأدوار' : 'All Roles'}</SelectItem>
                    <SelectItem value="student">{language === 'ar' ? 'طالب' : 'Student'}</SelectItem>
                    <SelectItem value="teacher">{language === 'ar' ? 'مدرس' : 'Teacher'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={language === 'ar' ? 'تصفية بالحالة' : 'Filter by Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                    <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="suspended">{language === 'ar' ? 'معلق' : 'Suspended'}</SelectItem>
                    <SelectItem value="pending">{language === 'ar' ? 'في الانتظار' : 'Pending'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? `المستخدمون (${filteredUsers.length})` : `Users (${filteredUsers.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ الانضمام' : 'Join Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                              {language === 'ar' ? 'لا توجد مستخدمين حالياً' : 'No users found'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? 'سيتم عرض المستخدمين هنا عند إضافتهم' : 'Users will appear here when added'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback>
                                  {user.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.fullName}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.lastActivity 
                              ? new Date(user.lastActivity).toLocaleDateString('en-US')
                              : (language === 'ar' ? 'غير متاح' : 'N/A')
                            }
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSuspendUser(user.id, user.status, user.role)}>
                                  {user.status === 'suspended' ? (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      {language === 'ar' ? 'إلغاء التعليق' : 'Unsuspend'}
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      {language === 'ar' ? 'تعليق الحساب' : 'Suspend'}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user.id, user.role)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {language === 'ar' ? 'حذف المستخدم' : 'Delete User'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
            </>
          )}

          {/* User Details Dialog */}
          {selectedUser && (
            <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* User Profile */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUser.photoURL} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {selectedUser.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{selectedUser.fullName}</h3>
                      <p className="text-gray-600">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getRoleBadge(selectedUser.role)}
                        {getStatusBadge(selectedUser.status)}
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {language === 'ar' ? 'تاريخ الانضمام:' : 'Join Date:'}
                        </span>
                      </div>
                      <p className="text-sm">
                        {new Date(selectedUser.createdAt).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {language === 'ar' ? 'آخر نشاط:' : 'Last Activity:'}
                        </span>
                      </div>
                      <p className="text-sm">
                        {selectedUser.lastActivity 
                          ? new Date(selectedUser.lastActivity).toLocaleDateString('en-US')
                          : (language === 'ar' ? 'غير متاح' : 'N/A')
                        }
                      </p>
                    </div>
                  </div>

                  {/* Courses Info */}
                  {selectedUser.role !== 'admin' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {selectedUser.role === 'teacher' 
                              ? (language === 'ar' ? 'الدورات التي يدرسها:' : 'Teaching Courses:')
                              : (language === 'ar' ? 'الدورات المسجل بها:' : 'Enrolled Courses:')
                            }
                          </span>
                        </div>
                        {selectedUser.role === 'teacher' && selectedUser.teachingCourses && selectedUser.teachingCourses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 pl-6">
                            {selectedUser.teachingCourses.map((courseId, index) => (
                              <div key={courseId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm">{courseId}</span>
                              </div>
                            ))}
                          </div>
                        ) : selectedUser.role === 'student' && selectedUser.enrolledCourses && selectedUser.enrolledCourses.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 pl-6">
                            {selectedUser.enrolledCourses.map((courseId, index) => (
                              <div key={courseId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm">{courseId}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 pl-6">
                            {language === 'ar' ? 'لا توجد دورات' : 'No courses'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subject Specialization for Teachers */}
                  {selectedUser.role === 'teacher' && selectedUser.subjectSpecialization && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {language === 'ar' ? 'التخصص:' : 'Specialization:'}
                        </span>
                      </div>
                      <p className="text-sm">{selectedUser.subjectSpecialization}</p>
                    </div>
                  )}
                  
                  {/* Subscription Details */}
                  <div className="space-y-2 border p-3 rounded-md bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {language === 'ar' ? 'تفاصيل الاشتراك:' : 'Subscription Details:'}
                      </span>
                    </div>
                    {selectedUser.subscription ? (
                      <div className="space-y-2 pl-6">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{language === 'ar' ? 'الخطة:' : 'Plan:'}</span>
                          <span className="text-sm">{selectedUser.subscription.planName || (language === 'ar' ? 'قياسي' : 'Standard')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{language === 'ar' ? 'تاريخ البدء:' : 'Start Date:'}</span>
                          <span className="text-sm">
                            {selectedUser.subscription.startDate 
                              ? new Date(selectedUser.subscription.startDate).toLocaleDateString('en-US')
                              : new Date(selectedUser.createdAt).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{language === 'ar' ? 'تاريخ الانتهاء:' : 'End Date:'}</span>
                          <span className="text-sm">
                            {selectedUser.subscription.endDate 
                              ? new Date(selectedUser.subscription.endDate).toLocaleDateString('en-US')
                              : (language === 'ar' ? 'غير متاح' : 'N/A')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{language === 'ar' ? 'المدة المتبقية:' : 'Remaining Time:'}</span>
                          <span className="text-sm">
                            {selectedUser.subscription.endDate 
                              ? getRemainingDays(selectedUser.subscription.endDate)
                              : (language === 'ar' ? 'غير متاح' : 'N/A')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
                          <Badge variant="outline" className={selectedUser.subscription.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
                            {selectedUser.subscription.status === 'active' 
                              ? (language === 'ar' ? 'نشط' : 'Active')
                              : (language === 'ar' ? 'منتهي' : 'Expired')}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-6">
                        <p className="text-sm text-gray-500">
                          {language === 'ar' ? 'لا يوجد اشتراك نشط' : 'No active subscription'}
                        </p>
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 mt-2">
                          {language === 'ar' ? 'مستخدم مجاني' : 'Free User'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(selectedUser.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuspendUser(selectedUser.id, selectedUser.status, selectedUser.role)}
                      className={selectedUser.status === 'suspended' ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                    >
                      {selectedUser.status === 'suspended' ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'إلغاء التعليق' : 'Unsuspend'}
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'تعليق المستخدم' : 'Suspend User'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>

      {/* Suspend Account Confirmation Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600">
              {language === 'ar' ? 'تحذير: إجراء خطير' : 'Warning: Dangerous Action'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <p className="text-center">
              {language === 'ar' 
                ? 'أنت على وشك تعليق حساب هذا المستخدم. لن يتمكن من تسجيل الدخول إلى حسابه بعد هذا الإجراء.'
                : 'You are about to suspend this user account. They will not be able to log in to their account after this action.'
              }
            </p>
            <p className="text-center text-sm text-gray-500">
              {language === 'ar'
                ? 'سيتم توجيه المستخدم إلى الدعم الفني عند محاولة تسجيل الدخول.'
                : 'The user will be directed to support when attempting to log in.'
              }
            </p>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setIsSuspendDialogOpen(false);
                setUserToSuspend(null);
              }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSuspendUser}
            >
              {language === 'ar' ? 'تأكيد تعليق الحساب' : 'Confirm Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600">
              {language === 'ar' ? 'تأكيد حذف المستخدم' : 'Confirm User Deletion'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Trash2 className="h-16 w-16 text-red-500" />
            </div>
            <p className="text-center">
              {language === 'ar' 
                ? 'سيتم حذف هذا المستخدم وجميع المعلومات المرتبطة به من النظام، بما في ذلك روابط الدعوة والارتباطات.' 
                : 'This will delete the user and all related information, including invitation links and associations.'
              }
            </p>
            <p className="text-center text-sm text-gray-500">
              {language === 'ar'
                ? 'لا يمكن التراجع عن هذا الإجراء.'
                : 'This action cannot be undone.'
              }
            </p>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
            >
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
