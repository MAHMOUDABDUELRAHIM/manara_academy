import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { toast } from 'sonner';
import { AdminService, AdminProfile } from '@/services/adminService';
import { StudentService, StudentProfile } from '@/services/studentService';
import { TeacherService, TeacherProfile } from '@/services/teacherService';

export interface FirestoreUser {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  subjectSpecialization?: string;
  enrolledCourses?: string[];
  teachingCourses?: string[];
  photoURL?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب جميع المستخدمين من Collections المختلفة
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        setLoading(true);
        const allUsers: FirestoreUser[] = [];

        // جلب الأدمن
        const admins = await AdminService.getAllAdmins();
        admins.forEach((admin: AdminProfile) => {
          allUsers.push({
            id: admin.id,
            fullName: admin.fullName,
            email: admin.email,
            role: 'admin',
            status: admin.isActive ? 'active' : 'suspended',
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
            lastActivity: admin.lastLogin,
            photoURL: admin.photoURL
          });
        });

        // جلب المدرسين
        const teachers = await TeacherService.getAllTeachers();
        teachers.forEach((teacher: TeacherProfile) => {
          allUsers.push({
            id: teacher.id,
            fullName: teacher.fullName,
            email: teacher.email,
            role: 'teacher',
            status: teacher.isActive ? 'active' : 'suspended',
            createdAt: teacher.createdAt,
            updatedAt: teacher.updatedAt,
            subjectSpecialization: teacher.subjectSpecialization,
            photoURL: teacher.photoURL
          });
        });

        // جلب الطلاب
        const students = await StudentService.getAllStudents();
        students.forEach((student: StudentProfile) => {
          allUsers.push({
            id: student.id,
            fullName: student.fullName,
            email: student.email,
            role: 'student',
            status: student.isActive ? 'active' : 'suspended',
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
            enrolledCourses: student.enrolledCourses,
            photoURL: student.photoURL
          });
        });

        // ترتيب المستخدمين حسب تاريخ الإنشاء
        allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setUsers(allUsers);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('فشل في جلب بيانات المستخدمين');
        toast.error('فشل في جلب بيانات المستخدمين');
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // تحديث حالة المستخدم
  const updateUserStatus = async (userId: string, status: 'active' | 'suspended', role: 'student' | 'teacher' | 'admin') => {
    try {
      const isActive = status === 'active';
      
      if (role === 'admin') {
        await AdminService.toggleAdminStatus(userId, isActive);
      } else if (role === 'teacher') {
        await TeacherService.updateTeacherProfile(userId, { isActive });
      } else if (role === 'student') {
        await StudentService.updateStudentProfile(userId, { isActive });
      }

      // تحديث الحالة محلياً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status, updatedAt: new Date().toISOString() }
            : user
        )
      );

      toast.success(`تم ${status === 'active' ? 'تفعيل' : 'تعليق'} المستخدم بنجاح`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('فشل في تحديث حالة المستخدم');
      throw error;
    }
  };

  // حذف المستخدم
  const deleteUser = async (userId: string, role: 'student' | 'teacher' | 'admin') => {
    try {
      if (role === 'admin') {
        await AdminService.deleteAdminProfile(userId);
      } else if (role === 'teacher') {
        await TeacherService.deleteTeacherProfile(userId);
      } else if (role === 'student') {
        await StudentService.deleteStudentProfile(userId);
      }

      // إزالة المستخدم محلياً
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('فشل في حذف المستخدم');
      throw error;
    }
  };

  // تحديث بيانات المستخدم
  const updateUser = async (userId: string, updates: Partial<FirestoreUser>) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const updateData = {
        fullName: updates.fullName,
        email: updates.email,
        subjectSpecialization: updates.subjectSpecialization,
        photoURL: updates.photoURL
      };

      if (user.role === 'admin') {
        await AdminService.updateAdminProfile(userId, updateData);
      } else if (user.role === 'teacher') {
        await TeacherService.updateTeacherProfile(userId, updateData);
      } else if (user.role === 'student') {
        await StudentService.updateStudentProfile(userId, updateData);
      }

      // تحديث البيانات محلياً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, ...updates, updatedAt: new Date().toISOString() }
            : user
        )
      );

      toast.success('تم تحديث بيانات المستخدم بنجاح');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('فشل في تحديث بيانات المستخدم');
      throw error;
    }
  };

  // البحث في المستخدمين
  const searchUsers = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      return users;
    }

    return users.filter(user => 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // فلترة المستخدمين حسب الدور
  const filterUsersByRole = (role: 'student' | 'teacher' | 'admin' | 'all') => {
    if (role === 'all') {
      return users;
    }
    return users.filter(user => user.role === role);
  };

  // فلترة المستخدمين حسب الحالة
  const filterUsersByStatus = (status: 'active' | 'suspended' | 'pending' | 'all') => {
    if (status === 'all') {
      return users;
    }
    return users.filter(user => user.status === status);
  };

  // إحصائيات المستخدمين
  const getUserStats = () => {
    const stats = {
      total: users.length,
      students: users.filter(u => u.role === 'student').length,
      teachers: users.filter(u => u.role === 'teacher').length,
      admins: users.filter(u => u.role === 'admin').length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      pending: users.filter(u => u.status === 'pending').length
    };
    return stats;
  };

  return {
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
  };
};