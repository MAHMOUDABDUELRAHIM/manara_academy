import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import {
  BarChart,
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  Calendar,
  Download,
  FileText,
  Star,
  Award,
  Target,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';

interface ChartData {
  month: string;
  students: number;
  teachers: number;
  revenue: number;
  courses: number;
}

interface CourseStats {
  id: string;
  title: string;
  teacher: string;
  students: number;
  revenue: number;
  rating: number;
  completionRate: number;
  category: string;
}

interface TeacherPerformance {
  id: string;
  name: string;
  avatar: string;
  courses: number;
  students: number;
  revenue: number;
  rating: number;
  joinDate: string;
}

const ReportsAnalytics: React.FC = () => {
  const { language } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Mock data for charts
  const chartData: ChartData[] = [
    { month: 'يوليو', students: 120, teachers: 15, revenue: 25000, courses: 8 },
    { month: 'أغسطس', students: 180, teachers: 22, revenue: 35000, courses: 12 },
    { month: 'سبتمبر', students: 250, teachers: 28, revenue: 45000, courses: 18 },
    { month: 'أكتوبر', students: 320, teachers: 35, revenue: 55000, courses: 25 },
    { month: 'نوفمبر', students: 420, teachers: 42, revenue: 70000, courses: 32 },
    { month: 'ديسمبر', students: 520, teachers: 48, revenue: 85000, courses: 38 }
  ];

  // Mock popular courses data
  const popularCourses: CourseStats[] = [
    {
      id: '1',
      title: 'React للمبتدئين',
      teacher: 'أحمد محمد',
      students: 245,
      revenue: 12250,
      rating: 4.8,
      completionRate: 85,
      category: 'البرمجة'
    },
    {
      id: '2',
      title: 'تصميم UI/UX المتقدم',
      teacher: 'فاطمة علي',
      students: 189,
      revenue: 18900,
      rating: 4.9,
      completionRate: 78,
      category: 'التصميم'
    },
    {
      id: '3',
      title: 'Python للذكاء الاصطناعي',
      teacher: 'محمد أحمد',
      students: 156,
      revenue: 15600,
      rating: 4.7,
      completionRate: 82,
      category: 'البرمجة'
    },
    {
      id: '4',
      title: 'التسويق الرقمي الشامل',
      teacher: 'سارة محمود',
      students: 134,
      revenue: 13400,
      rating: 4.6,
      completionRate: 90,
      category: 'التسويق'
    },
    {
      id: '5',
      title: 'إدارة المشاريع الاحترافية',
      teacher: 'عمر حسن',
      students: 98,
      revenue: 9800,
      rating: 4.5,
      completionRate: 88,
      category: 'الإدارة'
    }
  ];

  // Mock teacher performance data
  const teacherPerformance: TeacherPerformance[] = [
    {
      id: '1',
      name: 'أحمد محمد',
      avatar: '/api/placeholder/40/40',
      courses: 5,
      students: 420,
      revenue: 21000,
      rating: 4.8,
      joinDate: '2023-01-15'
    },
    {
      id: '2',
      name: 'فاطمة علي',
      avatar: '/api/placeholder/40/40',
      courses: 3,
      students: 285,
      revenue: 28500,
      rating: 4.9,
      joinDate: '2023-03-20'
    },
    {
      id: '3',
      name: 'محمد أحمد',
      avatar: '/api/placeholder/40/40',
      courses: 4,
      students: 312,
      revenue: 18720,
      rating: 4.7,
      joinDate: '2023-02-10'
    },
    {
      id: '4',
      name: 'سارة محمود',
      avatar: '/api/placeholder/40/40',
      courses: 2,
      students: 198,
      revenue: 15840,
      rating: 4.6,
      joinDate: '2023-05-08'
    }
  ];

  // Calculate current month stats
  const currentMonth = chartData[chartData.length - 1];
  const previousMonth = chartData[chartData.length - 2];
  
  const studentGrowth = ((currentMonth.students - previousMonth.students) / previousMonth.students * 100).toFixed(1);
  const revenueGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1);
  const teacherGrowth = ((currentMonth.teachers - previousMonth.teachers) / previousMonth.teachers * 100).toFixed(1);
  const courseGrowth = ((currentMonth.courses - previousMonth.courses) / previousMonth.courses * 100).toFixed(1);

  const totalStudents = chartData.reduce((sum, data) => sum + data.students, 0);
  const totalRevenue = chartData.reduce((sum, data) => sum + data.revenue, 0);
  const totalTeachers = currentMonth.teachers;
  const totalCourses = currentMonth.courses;

  const handleExportPDF = () => {
    // Mock PDF export functionality
    console.log('Exporting PDF report...');
  };

  const handleExportExcel = () => {
    // Mock Excel export functionality
    console.log('Exporting Excel report...');
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">
                  {language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">{language === 'ar' ? 'الشهر الماضي' : 'Last Month'}</SelectItem>
                    <SelectItem value="3months">{language === 'ar' ? '3 أشهر' : '3 Months'}</SelectItem>
                    <SelectItem value="6months">{language === 'ar' ? '6 أشهر' : '6 Months'}</SelectItem>
                    <SelectItem value="1year">{language === 'ar' ? 'سنة' : '1 Year'}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExportPDF} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={handleExportExcel} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تحليل شامل لأداء المنصة والإحصائيات المالية' : 'Comprehensive platform performance analysis and financial statistics'}
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
                    </p>
                    <p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+{studentGrowth}%</span>
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                    </p>
                    <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+{revenueGrowth}%</span>
                    </div>
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
                      {language === 'ar' ? 'المدرسين النشطين' : 'Active Teachers'}
                    </p>
                    <p className="text-2xl font-bold">{totalTeachers}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+{teacherGrowth}%</span>
                    </div>
                  </div>
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
                    </p>
                    <p className="text-2xl font-bold">{totalCourses}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+{courseGrowth}%</span>
                    </div>
                  </div>
                  <BookOpen className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  {language === 'ar' ? 'النمو الشهري' : 'Monthly Growth'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</SelectItem>
                      <SelectItem value="students">{language === 'ar' ? 'الطلاب' : 'Students'}</SelectItem>
                      <SelectItem value="teachers">{language === 'ar' ? 'المدرسين' : 'Teachers'}</SelectItem>
                      <SelectItem value="courses">{language === 'ar' ? 'الدورات' : 'Courses'}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Simple Bar Chart Representation */}
                  <div className="space-y-3">
                    {chartData.map((data, index) => {
                      const value = data[selectedMetric as keyof ChartData] as number;
                      const maxValue = Math.max(...chartData.map(d => d[selectedMetric as keyof ChartData] as number));
                      const percentage = (value / maxValue) * 100;
                      
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-16 text-sm text-muted-foreground">{data.month}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {selectedMetric === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {language === 'ar' ? 'توزيع الفئات' : 'Category Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'البرمجة', value: 45, color: 'bg-blue-500' },
                    { name: 'التصميم', value: 25, color: 'bg-green-500' },
                    { name: 'التسويق', value: 15, color: 'bg-yellow-500' },
                    { name: 'الإدارة', value: 10, color: 'bg-purple-500' },
                    { name: 'أخرى', value: 5, color: 'bg-gray-500' }
                  ].map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${category.color}`}></div>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${category.color}`}
                            style={{ width: `${category.value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{category.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Courses */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {language === 'ar' ? 'الدورات الأكثر شعبية' : 'Most Popular Courses'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الدورة' : 'Course'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الطلاب' : 'Students'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التقييم' : 'Rating'}</TableHead>
                      <TableHead>{language === 'ar' ? 'معدل الإكمال' : 'Completion'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{course.title}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {course.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{course.teacher}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {course.students}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            ${course.revenue.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            {course.rating}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${course.completionRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{course.completionRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {language === 'ar' ? 'أداء المدرسين' : 'Teacher Performance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المدرس' : 'Teacher'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الدورات' : 'Courses'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الطلاب' : 'Students'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التقييم' : 'Rating'}</TableHead>
                      <TableHead>{language === 'ar' ? 'تاريخ الانضمام' : 'Join Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherPerformance.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={teacher.avatar} alt={teacher.name} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {teacher.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{teacher.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {teacher.courses}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {teacher.students}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            ${teacher.revenue.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            {teacher.rating}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{teacher.joinDate}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
};

export default ReportsAnalytics;