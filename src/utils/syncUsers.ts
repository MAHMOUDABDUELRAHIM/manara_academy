import { auth, db } from '@/firebase/config';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { AdminService } from '@/services/adminService';
import { StudentService } from '@/services/studentService';
import { TeacherService } from '@/services/teacherService';

export interface AuthUserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime?: string;
}

/**
 * مزامنة المستخدمين من Firebase Auth إلى Firestore
 * هذه الدالة تجلب جميع المستخدمين من Firebase Auth وتحفظهم في Collections المناسبة
 */
export const syncAuthUsersToFirestore = async (): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // للأسف، Firebase Auth في الويب لا يدعم listUsers()
    // هذه الدالة متاحة فقط في Admin SDK
    // لذلك سنحتاج لحل بديل
    
    console.warn('Firebase Auth listUsers() is not available in web SDK');
    return {
      success: false,
      syncedCount: 0,
      errors: ['Firebase Auth listUsers() is not available in web SDK. Use Admin SDK instead.']
    };
  } catch (error) {
    console.error('Error syncing users:', error);
    errors.push(`Error syncing users: ${error}`);
    return {
      success: false,
      syncedCount,
      errors
    };
  }
};

/**
 * إنشاء أو تحديث مستخدم في Firestore عند تسجيل الدخول
 */
export const syncCurrentUserToFirestore = async (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<boolean> => {
  try {
    const isAdmin = email === 'mahmoudabduelrahim@gmail.com';
    
    // التحقق من وجود المستخدم في أي من Collections
    const [adminExists, teacherExists, studentExists] = await Promise.all([
      AdminService.getAdminProfile(uid).then(() => true).catch(() => false),
      TeacherService.getTeacherByUid(uid).then(() => true).catch(() => false),
      StudentService.getStudentProfile(uid).then(() => true).catch(() => false)
    ]);

    // إذا كان المستخدم موجود في أي collection، قم بتحديث آخر نشاط فقط
    if (adminExists || teacherExists || studentExists) {
      if (adminExists) {
        await AdminService.updateAdminProfile(uid, {
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else if (teacherExists) {
        await TeacherService.updateTeacherProfile(uid, {
          updatedAt: new Date().toISOString()
        });
      } else if (studentExists) {
        await StudentService.updateStudentProfile(uid, {
          updatedAt: new Date().toISOString()
        });
      }
      return true;
    }

    // إنشاء مستخدم جديد في Collection المناسب
    const userData = {
      id: uid,
      fullName: displayName || 'مستخدم جديد',
      email,
      photoURL: photoURL || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isAdmin) {
      // إنشاء أدمن
      await AdminService.createAdminProfile({
        ...userData,
        permissions: ['read', 'write', 'delete', 'manage_users'],
        lastLogin: new Date().toISOString()
      });
    } else {
      // افتراضياً إنشاء طالب
      await StudentService.createStudentProfile({
        ...userData,
        enrolledCourses: [],
        linkedTeachers: []
      });
    }
    
    console.log(`User ${email} synced to appropriate collection`);
    return true;
  } catch (error) {
    console.error('Error syncing current user to Firestore:', error);
    return false;
  }
};

/**
 * التحقق من وجود المستخدم في Firestore وإنشاؤه إذا لم يكن موجوداً
 */
export const ensureUserExistsInFirestore = async (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<{ exists: boolean; role: 'admin' | 'teacher' | 'student' | null }> => {
  try {
    // التحقق من وجود المستخدم في Collections المختلفة
    const [adminProfile, teacherProfile, studentProfile] = await Promise.all([
      AdminService.getAdminProfile(uid).catch(() => null),
      TeacherService.getTeacherByUid(uid).catch(() => null),
      StudentService.getStudentProfile(uid).catch(() => null)
    ]);

    if (adminProfile) {
      return { exists: true, role: 'admin' };
    }
    if (teacherProfile) {
      return { exists: true, role: 'teacher' };
    }
    if (studentProfile) {
      return { exists: true, role: 'student' };
    }

    // إذا لم يكن موجود، قم بإنشائه
    const synced = await syncCurrentUserToFirestore(uid, email, displayName, photoURL);
    if (synced) {
      const isAdmin = email === 'mahmoudabduelrahim@gmail.com';
      return { 
        exists: true, 
        role: isAdmin ? 'admin' : 'student' 
      };
    }

    return { exists: false, role: null };
  } catch (error) {
    console.error('Error ensuring user exists in Firestore:', error);
    return { exists: false, role: null };
  }
};

/**
 * الحصول على بيانات المستخدم من Collection المناسب
 */
export const getUserFromFirestore = async (uid: string) => {
  try {
    // البحث في جميع Collections
    const [adminProfile, teacherProfile, studentProfile] = await Promise.all([
      AdminService.getAdminProfile(uid).catch(() => null),
      TeacherService.getTeacherByUid(uid).catch(() => null),
      StudentService.getStudentProfile(uid).catch(() => null)
    ]);

    if (adminProfile) {
      return { ...adminProfile, role: 'admin' };
    }
    if (teacherProfile) {
      return { ...teacherProfile, role: 'teacher' };
    }
    if (studentProfile) {
      return { ...studentProfile, role: 'student' };
    }

    return null;
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    return null;
  }
};