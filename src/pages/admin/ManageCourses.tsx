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
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  Users, 
  BookOpen, 
  TrendingUp,
  Pause
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  teacher: {
    name: string;
    avatar: string;
  };
  category: string;
  students: number;
  status: 'published' | 'draft' | 'archived';
  createdDate: string;
  lessons: number;
  quizzes: number;
  price: number;
}

const ManageCourses: React.FC = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Empty courses array - will be populated from backend
  const [courses] = useState<Course[]>([]);

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.teacher.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      published: 'default',
      draft: 'secondary',
      archived: 'outline'
    };
    
    const labels = {
      published: language === 'ar' ? 'منشور' : 'Published',
      draft: language === 'ar' ? 'مسودة' : 'Draft',
      archived: language === 'ar' ? 'مؤرشف' : 'Archived'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  // Analytics will be fetched from backend
  const totalCourses = 0;
  const totalStudents = 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 space-y-6 lg:ml-0">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {language === 'ar' ? 'إدارة الكورسات' : 'Manage Courses'}
              </h1>
              <p className="text-gray-600 mt-1">
                {language === 'ar' ? 'إدارة وتنظيم جميع الكورسات التعليمية على المنصة' : 'Manage and organize all educational courses on the platform'}
              </p>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-sm border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'إجمالي الكورسات' : 'Total Courses'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalCourses}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {language === 'ar' ? 'سيتم تحديثها من قاعدة البيانات' : 'Will be updated from database'}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {language === 'ar' ? 'إجمالي الطلاب المسجلين' : 'Total Enrolled Students'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalStudents}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {language === 'ar' ? 'سيتم تحديثها من قاعدة البيانات' : 'Will be updated from database'}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={language === 'ar' ? 'البحث في الكورسات...' : 'Search courses...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px] border-gray-200">
                    <SelectValue placeholder={language === 'ar' ? 'حالة الكورس' : 'Course Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                    <SelectItem value="published">{language === 'ar' ? 'منشور' : 'Published'}</SelectItem>
                    <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                    <SelectItem value="archived">{language === 'ar' ? 'مؤرشف' : 'Archived'}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[180px] border-gray-200">
                    <SelectValue placeholder={language === 'ar' ? 'التصنيف' : 'Category'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</SelectItem>
                    <SelectItem value="البرمجة">{language === 'ar' ? 'البرمجة' : 'Programming'}</SelectItem>
                    <SelectItem value="التصميم">{language === 'ar' ? 'التصميم' : 'Design'}</SelectItem>
                    <SelectItem value="التسويق">{language === 'ar' ? 'التسويق' : 'Marketing'}</SelectItem>
                    <SelectItem value="الإدارة">{language === 'ar' ? 'الإدارة' : 'Management'}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                  <Filter className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تصفية متقدمة' : 'Advanced Filter'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Courses List */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {language === 'ar' ? `الكورسات (${filteredCourses.length})` : `Courses (${filteredCourses.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {filteredCourses.length === 0 && (
                  <div className="p-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {language === 'ar' ? 'لا توجد كورسات' : 'No courses found'}
                    </h3>
                    <p className="text-gray-500">
                      {language === 'ar' ? 'سيتم عرض الكورسات هنا عند ربط الصفحة بقاعدة البيانات' : 'Courses will be displayed here when connected to the database'}
                    </p>
                  </div>
                )}
                
                {filteredCourses.map((course) => (
                  <div key={course.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 space-x-reverse flex-1">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">{course.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{course.description}</p>
                          
                          <div className="flex items-center flex-wrap gap-3">
                            <div className="flex items-center">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={course.teacher.avatar} />
                                <AvatarFallback className="text-xs">{course.teacher.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600 mr-2">{course.teacher.name}</span>
                            </div>
                            
                            <Badge variant="outline" className="text-xs">{course.category}</Badge>
                            {getStatusBadge(course.status)}
                            
                            <span className="text-xs text-gray-500">
                              {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(course.createdDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-8 space-x-reverse ml-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الطلاب' : 'Students'}</p>
                          <p className="font-semibold text-gray-900">{course.students}</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الدروس' : 'Lessons'}</p>
                          <p className="font-semibold text-gray-900">{course.lessons}</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'السعر' : 'Price'}</p>
                          <p className="font-semibold text-gray-900">${course.price}</p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-orange-600 hover:text-orange-700">
                              <Pause className="mr-2 h-4 w-4" />
                              {language === 'ar' ? 'إيقاف الكورس' : 'Pause Course'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600 hover:text-red-700">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default ManageCourses;