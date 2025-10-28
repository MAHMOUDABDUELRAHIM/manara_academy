import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { syncCurrentUserToFirestore } from '@/utils/syncUsers';
import { StudentService } from '@/services/studentService';
import { TeacherService } from '@/services/teacherService';
import { AdminService } from '@/services/adminService';

interface UserProfile {
  fullName?: string;
  role?: 'student' | 'teacher' | 'admin';
  subjectSpecialization?: string;
  status?: string;
  parentPhone?: string;
  studentPhone?: string;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'student' | 'teacher' | 'admin';
  profile?: UserProfile;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check if this is the admin email
          const isAdminEmail = firebaseUser.email === 'mahmoudabduelrahim@gmail.com';
          
          let userProfile: UserProfile = {};
          let role: 'student' | 'teacher' | 'admin' | undefined;

          if (isAdminEmail) {
            // Handle admin user
            let admin = await AdminService.getAdminByUid(firebaseUser.uid);
            if (!admin) {
              // Create admin profile if doesn't exist
              admin = await AdminService.createAdminProfile({
                uid: firebaseUser.uid,
                fullName: firebaseUser.displayName || 'مدير النظام',
                email: firebaseUser.email || '',
                role: 'super_admin',
                isActive: true,
                permissions: ['all']
              });
            }
            userProfile = {
              fullName: admin.fullName,
              role: 'admin'
            };
            role = 'admin';
          } else {
            // Check if user is a teacher
            const teacher = await TeacherService.getTeacherByUid(firebaseUser.uid);
            if (teacher) {
              userProfile = {
              fullName: teacher.fullName,
              role: 'teacher',
              subjectSpecialization: teacher.subjectSpecialization
            };
              role = 'teacher';
            } else {
              // Check if user is a student
              const student = await StudentService.getStudentByUid(firebaseUser.uid);
              if (student) {
                userProfile = {
                  fullName: student.fullName,
                  role: 'student'
                };
                role = 'student';
              } else {
                // Default to student if no profile found
                userProfile = {
                  fullName: firebaseUser.displayName || '',
                  role: 'student'
                };
                role = 'student';
              }
            }
          }

          // التحقق من وجود teacherId في localStorage وتنفيذ عملية الربط
          const teacherId = localStorage.getItem('teacherId');
          if (teacherId && role === 'student') {
            try {
              console.log('Found teacherId in localStorage:', teacherId);
              // تحقق من الربط الحالي للطالب
              const existingTeacher = await TeacherService.getTeacherForStudent(firebaseUser.uid);
              if (existingTeacher) {
                if (existingTeacher.id === teacherId) {
                  console.log('Student already linked to the same teacher. No action needed.');
                  localStorage.removeItem('teacherId');
                } else {
                  console.warn('Student already linked to another teacher. Skipping auto-link.', {
                    studentId: firebaseUser.uid,
                    currentTeacherId: existingTeacher.id,
                    requestedTeacherId: teacherId
                  });
                  localStorage.removeItem('teacherId');
                }
              } else {
                console.log('No existing teacher link found. Proceeding to link.');
                await TeacherService.linkStudentToTeacher(firebaseUser.uid, teacherId);
                localStorage.removeItem('teacherId');
                console.log('Student successfully linked to teacher');
              }
            } catch (linkError) {
              console.error('Error linking student to teacher:', linkError);
            }
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: role,
            profile: userProfile,
          });
        } catch (error) {
          console.error('Error in onAuthStateChanged:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if this is the admin email
      const isAdminEmail = email === 'mahmoudabduelrahim@gmail.com';
      
      let userProfile: UserProfile = {};
      let role: 'student' | 'teacher' | 'admin' | undefined;

      if (isAdminEmail) {
        // Handle admin user
        let admin = await AdminService.getAdminByUid(result.user.uid);
        if (!admin) {
          admin = await AdminService.createAdminProfile({
            uid: result.user.uid,
            fullName: result.user.displayName || 'مدير النظام',
            email: result.user.email || '',
            role: 'super_admin',
            isActive: true,
            permissions: ['all']
          });
        }
        
        // Update last login
        await AdminService.updateLastLogin(result.user.uid);
        
        userProfile = {
          fullName: admin.fullName,
          role: 'admin'
        };
        role = 'admin';
      } else {
        // Check if user is a teacher
        const teacher = await TeacherService.getTeacherByUid(result.user.uid);
        if (teacher) {
          userProfile = {
            fullName: teacher.fullName,
            role: 'teacher',
            subjectSpecialization: teacher.subjectSpecialization,
            inviteCode: teacher.inviteCode
          };
          role = 'teacher';
        } else {
          // Check if user is a student
          const student = await StudentService.getStudentByUid(result.user.uid);
          if (student) {
            userProfile = {
              fullName: student.fullName,
              role: 'student'
            };
            role = 'student';
          }
        }
      }
      
      return {
        ...result.user,
        role: role,
        profile: userProfile,
      };
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, userProfile?: UserProfile) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userProfile?.fullName && result.user) {
        await updateProfile(result.user, { displayName: userProfile.fullName });
      }
      
      // Create profile in appropriate collection based on role
      if (result.user && userProfile) {
        if (userProfile.role === 'teacher') {
          // Create teacher profile
          await TeacherService.createTeacherProfile(
            result.user.uid,
            userProfile.fullName || '',
            result.user.email || '',
            userProfile.subjectSpecialization
          );
        } else if (userProfile.role === 'student') {
          // Create student profile with phone numbers
          await StudentService.createStudentProfile(
            result.user.uid,
            userProfile.fullName || '',
            result.user.email || '',
            result.user.photoURL || undefined,
            userProfile.parentPhone,
            userProfile.studentPhone
          );
        } else if (userProfile.role === 'admin') {
          // Create admin profile
          await AdminService.createAdminProfile({
            uid: result.user.uid,
            fullName: userProfile.fullName || '',
            email: result.user.email || '',
            role: 'admin',
            isActive: true,
            permissions: []
          });
        }
      }
      
      return result.user;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check user role from appropriate collection
      let userProfile: UserProfile = {};
      let role: 'student' | 'teacher' | 'admin' | undefined;

      // Check if user is a teacher
      const teacher = await TeacherService.getTeacherByUid(result.user.uid);
      if (teacher) {
        userProfile = {
          fullName: teacher.fullName,
          role: 'teacher',
          subjectSpecialization: teacher.subjectSpecialization
        };
        role = 'teacher';
      } else {
        // Check if user is a student
        const student = await StudentService.getStudentByUid(result.user.uid);
        if (student) {
          userProfile = {
            fullName: student.fullName,
            role: 'student'
          };
          role = 'student';
        } else {
          // Create student profile by default
          await StudentService.createStudentProfile({
            uid: result.user.uid,
            fullName: result.user.displayName || '',
            email: result.user.email || '',
            isActive: true,
            enrolledCourses: [],
            linkedTeachers: []
          });
          
          userProfile = {
            fullName: result.user.displayName || '',
            role: 'student'
          };
          role = 'student';
        }
      }
      
      return {
        ...result.user,
        role: role,
        profile: userProfile,
      };
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    try {
      setError(null);
      setLoading(true);
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check user role from appropriate collection
      let userProfile: UserProfile = {};
      let role: 'student' | 'teacher' | 'admin' | undefined;

      // Check if user is a teacher
      const teacher = await TeacherService.getTeacherByUid(result.user.uid);
      if (teacher) {
        userProfile = {
          fullName: teacher.fullName,
          role: 'teacher',
          subjectSpecialization: teacher.subjectSpecialization
        };
        role = 'teacher';
      } else {
        // Check if user is a student
        const student = await StudentService.getStudentByUid(result.user.uid);
        if (student) {
          userProfile = {
            fullName: student.fullName,
            role: 'student'
          };
          role = 'student';
        } else {
          // Create student profile by default
          await StudentService.createStudentProfile({
            uid: result.user.uid,
            fullName: result.user.displayName || '',
            email: result.user.email || '',
            isActive: true,
            enrolledCourses: [],
            linkedTeachers: []
          });
          
          userProfile = {
            fullName: result.user.displayName || '',
            role: 'student'
          };
          role = 'student';
        }
      }
      
      return {
        ...result.user,
        role: role,
        profile: userProfile,
      };
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle,
    loginWithFacebook,
  };
};