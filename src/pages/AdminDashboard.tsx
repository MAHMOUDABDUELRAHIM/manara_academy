import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  TrendingUp,
  Bell,
  MessageCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  monthlyEarnings: number;
  studentsGrowth?: number;
  teachersGrowth?: number;
  coursesGrowth?: number;
  earningsGrowth?: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  createdAt: Date;
}

interface SupportMessage {
  id: string;
  user: string;
  subject: string;
  message: string;
  time: string;
  status: 'new' | 'pending' | 'resolved';
  createdAt: Date;
}

interface MonthlyRegistration {
  month: string;
  registrations: number;
  date: Date;
}

// API Service Functions - Ready for backend integration
class AdminDashboardAPI {
  private static baseURL = import.meta.env.VITE_API_URL || '/api';

  static async getDashboardStats(): Promise<DashboardStats> {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${this.baseURL}/admin/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Add auth token
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async getNotifications(limit: number = 5): Promise<Notification[]> {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${this.baseURL}/admin/notifications?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async getSupportMessages(limit: number = 5): Promise<SupportMessage[]> {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${this.baseURL}/admin/support-messages?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch support messages: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async getMonthlyRegistrations(): Promise<MonthlyRegistration[]> {
    // TODO: Replace with actual API endpoint
    const response = await fetch(`${this.baseURL}/admin/analytics/monthly-registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monthly registrations: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();

  // State for dashboard data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRegistration[]>([]);
  
  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingSupportMessages, setIsLoadingSupportMessages] = useState(true);
  const [isLoadingMonthlyData, setIsLoadingMonthlyData] = useState(true);

  // Error states
  const [statsError, setStatsError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [supportMessagesError, setSupportMessagesError] = useState<string | null>(null);
  const [monthlyDataError, setMonthlyDataError] = useState<string | null>(null);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      // TODO: Uncomment when backend is ready
      // const data = await AdminDashboardAPI.getDashboardStats();
      // setStats(data);
      
      // Temporary: Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set default empty state until backend is connected
      setStats({
        totalStudents: 0,
        totalTeachers: 0,
        totalCourses: 0,
        monthlyEarnings: 0,
        studentsGrowth: 0,
        teachersGrowth: 0,
        coursesGrowth: 0,
        earningsGrowth: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Failed to load dashboard statistics');
      setStats({
        totalStudents: 0,
        totalTeachers: 0,
        totalCourses: 0,
        monthlyEarnings: 0
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch recent notifications
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      setNotificationsError(null);
      
      // TODO: Uncomment when backend is ready
      // const data = await AdminDashboardAPI.getNotifications(5);
      // setNotifications(data);
      
      // Temporary: Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setNotifications([]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotificationsError(error instanceof Error ? error.message : 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Fetch support messages
  const fetchSupportMessages = async () => {
    try {
      setIsLoadingSupportMessages(true);
      setSupportMessagesError(null);
      
      // TODO: Uncomment when backend is ready
      // const data = await AdminDashboardAPI.getSupportMessages(5);
      // setSupportMessages(data);
      
      // Temporary: Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      setSupportMessages([]);
    } catch (error) {
      console.error('Error fetching support messages:', error);
      setSupportMessagesError(error instanceof Error ? error.message : 'Failed to load support messages');
      setSupportMessages([]);
    } finally {
      setIsLoadingSupportMessages(false);
    }
  };

  // Fetch monthly registration data
  const fetchMonthlyData = async () => {
    try {
      setIsLoadingMonthlyData(true);
      setMonthlyDataError(null);
      
      // TODO: Uncomment when backend is ready
      // const data = await AdminDashboardAPI.getMonthlyRegistrations();
      // setMonthlyData(data);
      
      // Temporary: Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      setMonthlyData([]);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setMonthlyDataError(error instanceof Error ? error.message : 'Failed to load monthly registration data');
      setMonthlyData([]);
    } finally {
      setIsLoadingMonthlyData(false);
    }
  };

  // Refresh all data
  const refreshAllData = () => {
    fetchDashboardStats();
    fetchNotifications();
    fetchSupportMessages();
    fetchMonthlyData();
  };

  // Load all dashboard data on component mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Loading component for stats cards
  const StatsCardSkeleton = () => (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );

  // Error component for failed data loading
  const ErrorCard = ({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) => (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-destructive">{title}</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </CardContent>
    </Card>
  );

  // Empty state component
  const EmptyStateCard = ({ title, message }: { title: string; message: string }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="rounded-full bg-muted p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <div className="flex">
        <AdminSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">
          {/* Welcome Section with Refresh Button */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {language === 'ar' ? 'مرحباً، مدير النظام' : 'Welcome, Admin'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'إليك نظرة عامة على أداء المنصة اليوم' : 'Here\'s an overview of your platform performance today'}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={refreshAllData}
              disabled={isLoadingStats || isLoadingNotifications || isLoadingSupportMessages || isLoadingMonthlyData}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingStats || isLoadingNotifications || isLoadingSupportMessages || isLoadingMonthlyData) ? 'animate-spin' : ''}`} />
              {language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoadingStats ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : statsError ? (
              <div className="col-span-full">
                <ErrorCard 
                  title={language === 'ar' ? 'خطأ في تحميل الإحصائيات' : 'Failed to Load Statistics'}
                  error={statsError}
                  onRetry={fetchDashboardStats}
                />
              </div>
            ) : (
              <>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.totalStudents?.toLocaleString() || '0'}
                    </div>
                    {stats?.studentsGrowth !== undefined && stats.studentsGrowth > 0 && (
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.studentsGrowth}% {language === 'ar' ? 'من الشهر الماضي' : 'from last month'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي المدرسين' : 'Total Teachers'}
                    </CardTitle>
                    <GraduationCap className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.totalTeachers?.toLocaleString() || '0'}
                    </div>
                    {stats?.teachersGrowth !== undefined && stats.teachersGrowth > 0 && (
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.teachersGrowth}% {language === 'ar' ? 'من الشهر الماضي' : 'from last month'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.totalCourses?.toLocaleString() || '0'}
                    </div>
                    {stats?.coursesGrowth !== undefined && stats.coursesGrowth > 0 && (
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.coursesGrowth}% {language === 'ar' ? 'من الشهر الماضي' : 'from last month'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'الأرباح (هذا الشهر)' : 'Earnings (this month)'}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      ${stats?.monthlyEarnings?.toLocaleString() || '0'}
                    </div>
                    {stats?.earningsGrowth !== undefined && stats.earningsGrowth > 0 && (
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{stats.earningsGrowth}% {language === 'ar' ? 'من الشهر الماضي' : 'from last month'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Registrations Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {language === 'ar' ? 'التسجيلات الشهرية' : 'Monthly Registrations'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMonthlyData ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : monthlyDataError ? (
                    <div className="flex flex-col items-center justify-center h-48">
                      <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                      <p className="text-sm text-destructive mb-2">{monthlyDataError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchMonthlyData}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </Button>
                    </div>
                  ) : monthlyData.length > 0 ? (
                    <div className="space-y-4">
                      {monthlyData.map((data, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{data.month}</span>
                          <div className="flex items-center gap-2 flex-1 mx-4">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((data.registrations / 250) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{data.registrations}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-sm">
                        {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
                      </p>
                      <p className="text-xs mt-1">
                        {language === 'ar' ? 'سيتم عرض البيانات عند ربط الباك إند' : 'Data will appear when backend is connected'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Notifications */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {language === 'ar' ? 'الإشعارات الحديثة' : 'Recent Notifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : notificationsError ? (
                    <div className="flex flex-col items-center justify-center h-32">
                      <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
                      <p className="text-xs text-destructive mb-2 text-center">{notificationsError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchNotifications}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </Button>
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {notification.time}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                notification.type === 'success' ? 'default' :
                                notification.type === 'warning' ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs text-center">
                        {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                      </p>
                      <p className="text-xs mt-1 text-center">
                        {language === 'ar' ? 'ستظهر الإشعارات هنا' : 'Notifications will appear here'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Support Messages Section */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {language === 'ar' ? 'رسائل الدعم الحديثة' : 'Recent Support Messages'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSupportMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : supportMessagesError ? (
                  <div className="flex flex-col items-center justify-center h-32">
                    <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
                    <p className="text-xs text-destructive mb-2 text-center">{supportMessagesError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchSupportMessages}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </Button>
                  </div>
                ) : supportMessages.length > 0 ? (
                  <div className="space-y-4">
                    {supportMessages.map((message) => (
                      <div key={message.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-medium">{message.user}</h4>
                              <Badge 
                                variant={
                                  message.status === 'new' ? 'default' :
                                  message.status === 'pending' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {message.status}
                              </Badge>
                            </div>
                            <h5 className="text-sm font-medium text-foreground mb-1">{message.subject}</h5>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {message.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {message.time}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs text-center">
                      {language === 'ar' ? 'لا توجد رسائل دعم' : 'No support messages'}
                    </p>
                    <p className="text-xs mt-1 text-center">
                      {language === 'ar' ? 'ستظهر رسائل الدعم هنا' : 'Support messages will appear here'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;