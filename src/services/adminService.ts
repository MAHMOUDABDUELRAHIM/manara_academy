import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface AdminProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  role: 'admin' | 'super_admin';
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  permissions: string[];
  lastLogin?: string;
}

export class AdminService {
  // إنشاء ملف شخصي جديد للأدمن
  static async createAdminProfile(adminData: Omit<AdminProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminProfile> {
    try {
      console.log('Creating admin profile:', adminData);
      
      const adminRef = doc(db, 'admins', adminData.uid);
      const adminProfile: Omit<AdminProfile, 'id'> = {
        ...adminData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(adminRef, adminProfile);
      
      const createdAdmin: AdminProfile = {
        id: adminData.uid,
        ...adminProfile
      };

      console.log('Admin profile created successfully:', createdAdmin);
      return createdAdmin;
    } catch (error) {
      console.error('Error creating admin profile:', error);
      throw error;
    }
  }

  // الحصول على ملف شخصي للأدمن بواسطة UID
  static async getAdminByUid(uid: string): Promise<AdminProfile | null> {
    try {
      console.log('Getting admin by UID:', uid);
      
      const adminRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        const adminData = adminSnap.data();
        const admin: AdminProfile = {
          id: adminSnap.id,
          ...adminData
        } as AdminProfile;
        
        console.log('Admin found:', admin);
        return admin;
      } else {
        console.log('No admin found with UID:', uid);
        return null;
      }
    } catch (error) {
      console.error('Error getting admin by UID:', error);
      throw error;
    }
  }

  // الحصول على جميع الأدمن
  static async getAllAdmins(): Promise<AdminProfile[]> {
    try {
      console.log('Getting all admins');
      
      const adminsRef = collection(db, 'admins');
      const q = query(adminsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const admins: AdminProfile[] = [];
      querySnapshot.forEach((doc) => {
        const adminData = doc.data();
        admins.push({
          id: doc.id,
          ...adminData
        } as AdminProfile);
      });

      console.log('Found admins:', admins.length);
      return admins;
    } catch (error) {
      console.error('Error getting all admins:', error);
      throw error;
    }
  }

  // تحديث ملف شخصي للأدمن
  static async updateAdminProfile(uid: string, updates: Partial<AdminProfile>): Promise<void> {
    try {
      console.log('Updating admin profile:', uid, updates);
      
      const adminRef = doc(db, 'admins', uid);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(adminRef, updateData);
      console.log('Admin profile updated successfully');
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  }

  // حذف ملف شخصي للأدمن
  static async deleteAdminProfile(uid: string): Promise<void> {
    try {
      console.log('Deleting admin profile:', uid);
      
      const adminRef = doc(db, 'admins', uid);
      await deleteDoc(adminRef);
      
      console.log('Admin profile deleted successfully');
    } catch (error) {
      console.error('Error deleting admin profile:', error);
      throw error;
    }
  }

  // تحديث آخر تسجيل دخول للأدمن
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      console.log('Updating last login for admin:', uid);
      
      const adminRef = doc(db, 'admins', uid);
      await updateDoc(adminRef, {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('Last login updated successfully');
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // تحديث صلاحيات الأدمن
  static async updateAdminPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      console.log('Updating admin permissions:', uid, permissions);
      
      const adminRef = doc(db, 'admins', uid);
      await updateDoc(adminRef, {
        permissions,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Admin permissions updated successfully');
    } catch (error) {
      console.error('Error updating admin permissions:', error);
      throw error;
    }
  }

  // التحقق من صلاحيات الأدمن
  static async checkAdminPermission(uid: string, permission: string): Promise<boolean> {
    try {
      const admin = await this.getAdminByUid(uid);
      if (!admin || !admin.isActive) {
        return false;
      }

      return admin.permissions.includes(permission) || admin.role === 'super_admin';
    } catch (error) {
      console.error('Error checking admin permission:', error);
      return false;
    }
  }

  // الحصول على الأدمن النشطين فقط
  static async getActiveAdmins(): Promise<AdminProfile[]> {
    try {
      console.log('Getting active admins');
      
      const adminsRef = collection(db, 'admins');
      const q = query(
        adminsRef, 
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const admins: AdminProfile[] = [];
      querySnapshot.forEach((doc) => {
        const adminData = doc.data();
        admins.push({
          id: doc.id,
          ...adminData
        } as AdminProfile);
      });

      console.log('Found active admins:', admins.length);
      return admins;
    } catch (error) {
      console.error('Error getting active admins:', error);
      throw error;
    }
  }

  // تفعيل أو إلغاء تفعيل أدمن
  static async toggleAdminStatus(uid: string, isActive: boolean): Promise<void> {
    try {
      console.log('Toggling admin status:', uid, isActive);
      
      const adminRef = doc(db, 'admins', uid);
      await updateDoc(adminRef, {
        isActive,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Admin status updated successfully');
    } catch (error) {
      console.error('Error toggling admin status:', error);
      throw error;
    }
  }
}