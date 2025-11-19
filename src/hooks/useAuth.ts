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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
  phoneNumber?: string;
  emailVerified?: boolean;
  // Added to support trial period logic for teachers
  createdAt?: string;
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

          // Respect pending role hint set during registration to avoid student fallback
          const pendingRole = (() => {
            try { return localStorage.getItem('pendingRole'); } catch { return null; }
          })();

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
            if (admin && (admin as any).isActive === false) {
              setError('تم تعليق هذا الحساب. تواصل مع الدعم الفني لحل المشكلة');
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
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
              if ((teacher as any).isActive === false) {
                setError('تم تعليق هذا الحساب. تواصل مع الدعم الفني لحل المشكلة');
                await signOut(auth);
                setUser(null);
                setLoading(false);
                return;
              }
              userProfile = {
                fullName: teacher.fullName,
                role: 'teacher',
                subjectSpecialization: teacher.subjectSpecialization,
                emailVerified: !!(teacher as any).emailVerified,
                createdAt: (teacher as any).createdAt || undefined,
              };
              role = 'teacher';
            } else if (pendingRole === 'teacher') {
              // Temporary teacher role based on registration hint to prevent redirect to student dashboard
              userProfile = {
                fullName: firebaseUser.displayName || '',
                role: 'teacher',
                emailVerified: false,
              };
              role = 'teacher';
            } else {
              const student = await StudentService.getStudentByUid(firebaseUser.uid);
              if (student) {
                if ((student as any).isActive === false) {
                  setError('تم تعليق هذا الحساب. تواصل مع الدعم الفني لحل المشكلة');
                  await signOut(auth);
                  setUser(null);
                  setLoading(false);
                  return;
                }
                userProfile = {
                  fullName: student.fullName,
                  role: 'student'
                };
                role = 'student';
              } else {
                setError('account_not_available');
                await signOut(auth);
                setUser(null);
                setLoading(false);
                return;
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

          // Clear pending role hint only when role is resolved to teacher
          try {
            if (pendingRole && role === 'teacher') {
              localStorage.removeItem('pendingRole');
            }
          } catch {}
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
        if (admin && (admin as any).isActive === false) {
          await signOut(auth);
          throw new Error('account_suspended');
        }
        
        userProfile = {
          fullName: admin.fullName,
          role: 'admin'
        };
        role = 'admin';
      } else {
        // Check if user is a teacher
        const teacher = await TeacherService.getTeacherByUid(result.user.uid);
        if (teacher) {
          if ((teacher as any).isActive === false) {
            await signOut(auth);
            throw new Error('account_suspended');
          }
          userProfile = {
            fullName: teacher.fullName,
            role: 'teacher',
            subjectSpecialization: teacher.subjectSpecialization,
            inviteCode: (teacher as any).inviteCode,
            emailVerified: !!(teacher as any).emailVerified,
            createdAt: (teacher as any).createdAt || undefined,
          };
          role = 'teacher';
        } else {
          // Check if user is a student
          const student = await StudentService.getStudentByUid(result.user.uid);
          if (student) {
            if ((student as any).isActive === false) {
              await signOut(auth);
              throw new Error('account_suspended');
            }
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
      // Optimistically set local user state with intended role to ensure correct routing immediately
      if (result.user && userProfile?.role) {
        try {
          // Persist pending role hint for auth state reconciliation
          localStorage.setItem('pendingRole', userProfile.role);
        } catch {}
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          displayName: userProfile.fullName || result.user.displayName,
          photoURL: result.user.photoURL,
          role: userProfile.role,
          profile: userProfile,
        });
      }
      
      // تحديث اسم العرض للمستخدم الجديد (لا نجعل أي فشل هنا يوقف التسجيل)
      if (userProfile?.fullName && result.user) {
        try {
          await updateProfile(result.user, { displayName: userProfile.fullName });
        } catch (profileErr) {
          console.warn('Non-critical: failed to update displayName after registration:', profileErr);
        }
      }
      
      // Create profile in appropriate collection based on role
      if (result.user && userProfile) {
        if (userProfile.role === 'teacher') {
          // Create teacher profile (غير حرج: لو فشل لا نوقف التسجيل)
          try {
            await TeacherService.createTeacherProfile(
              result.user.uid,
              userProfile.fullName || '',
              result.user.email || '',
              userProfile.subjectSpecialization,
              userProfile.phoneNumber
            );
          } catch (createErr) {
            console.error('Non-critical: failed to create teacher profile:', createErr);
          }
        } else if (userProfile.role === 'student') {
          // Create student profile with phone numbers
          try {
            await StudentService.createStudentProfile(
              result.user.uid,
              userProfile.fullName || '',
              result.user.email || '',
              result.user.photoURL || undefined,
              userProfile.parentPhone,
              userProfile.studentPhone
            );
          } catch (createErr) {
            console.error('Non-critical: failed to create student profile:', createErr);
          }
        } else if (userProfile.role === 'admin') {
          // Create admin profile
          try {
            await AdminService.createAdminProfile({
              uid: result.user.uid,
              fullName: userProfile.fullName || '',
              email: result.user.email || '',
              role: 'admin',
              isActive: true,
              permissions: []
            });
          } catch (createErr) {
            console.error('Non-critical: failed to create admin profile:', createErr);
          }
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
        if ((teacher as any).isActive === false) {
          await signOut(auth);
          throw new Error('account_suspended');
        }
        userProfile = {
          fullName: teacher.fullName,
          role: 'teacher',
          subjectSpecialization: teacher.subjectSpecialization,
          emailVerified: !!(teacher as any).emailVerified,
          createdAt: (teacher as any).createdAt || undefined,
        };
        role = 'teacher';
        } else {
          const student = await StudentService.getStudentByUid(result.user.uid);
          if (student) {
            if ((student as any).isActive === false) {
              await signOut(auth);
              throw new Error('account_suspended');
            }
            userProfile = {
              fullName: student.fullName,
              role: 'student'
            };
            role = 'student';
          } else {
            await signOut(auth);
            throw new Error('account_not_available');
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

  const registerTeacherWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      try { localStorage.setItem('pendingRole', 'teacher'); } catch {}
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      let userProfile: UserProfile = {};
      let role: 'student' | 'teacher' | 'admin' | undefined;

      const existingTeacher = await TeacherService.getTeacherByUid(result.user.uid);
      if (existingTeacher) {
        if ((existingTeacher as any).isActive === false) {
          await signOut(auth);
          throw new Error('account_suspended');
        }
        userProfile = {
          fullName: existingTeacher.fullName,
          role: 'teacher',
          subjectSpecialization: existingTeacher.subjectSpecialization,
          emailVerified: !!(auth.currentUser?.emailVerified) || !!(existingTeacher as any).emailVerified,
          createdAt: (existingTeacher as any).createdAt || undefined,
        };
        role = 'teacher';
      } else {
        const created = await TeacherService.createTeacherProfile(
          result.user.uid,
          result.user.displayName || '',
          result.user.email || '',
          undefined,
          undefined
        );
        try { await updateDoc(doc(db, 'teachers', result.user.uid), { emailVerified: true, updatedAt: new Date().toISOString() }); } catch {}
        userProfile = {
          fullName: created.fullName,
          role: 'teacher',
          subjectSpecialization: created.subjectSpecialization,
          emailVerified: !!(auth.currentUser?.emailVerified) || true,
          createdAt: created.createdAt,
        };
        role = 'teacher';
      }

      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: userProfile.fullName || result.user.displayName,
        photoURL: result.user.photoURL,
        role: role,
        profile: userProfile,
      });

      try { if (role === 'teacher') localStorage.removeItem('pendingRole'); } catch {}

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
        if ((teacher as any).isActive === false) {
          await signOut(auth);
          throw new Error('account_suspended');
        }
        userProfile = {
          fullName: teacher.fullName,
          role: 'teacher',
          subjectSpecialization: teacher.subjectSpecialization,
          emailVerified: !!(teacher as any).emailVerified,
          createdAt: (teacher as any).createdAt || undefined,
        };
        role = 'teacher';
        } else {
          const student = await StudentService.getStudentByUid(result.user.uid);
          if (student) {
            if ((student as any).isActive === false) {
              await signOut(auth);
              throw new Error('account_suspended');
            }
            userProfile = {
              fullName: student.fullName,
              role: 'student'
            };
            role = 'student';
          } else {
            await signOut(auth);
            throw new Error('account_not_available');
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
    registerTeacherWithGoogle,
  };
};