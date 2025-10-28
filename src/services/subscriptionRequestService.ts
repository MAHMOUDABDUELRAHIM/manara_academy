import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { StudentService } from './studentService';
import { NotificationService } from './notificationService';

export interface SubscriptionRequest {
  id?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  courseId: string;
  courseTitle?: string;
  teacherId: string;
  screenshotUrl: string;
  amount?: number;
  walletProvider?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

export class SubscriptionRequestService {
  static collectionName = 'subscriptionRequests';

  static async getRequestsForTeacher(teacherId: string): Promise<SubscriptionRequest[]> {
    const q = query(
      collection(db, this.collectionName),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionRequest));
  }

  static async confirmRequest(requestId: string): Promise<void> {
    const ref = doc(db, this.collectionName, requestId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as SubscriptionRequest;
    await StudentService.enrollInCourse(data.studentId, data.courseId);
    
    // إرسال إشعار للطالب بأن الاشتراك تم فتحه بعد التأكيد
    try {
      await NotificationService.createNotification({
        userId: data.studentId,
        title: 'تم الاشتراك وفتح الكورس',
        message: `تم تأكيد الدفع لدورة "${data.courseTitle || ''}". يمكنك بدء الدورة الآن.`,
        type: 'success',
        courseId: data.courseId,
        teacherId: data.teacherId,
      });
    } catch (e) {
      console.warn('Failed to send enrollment notification', e);
    }

    await updateDoc(ref, {
      status: 'confirmed',
      processedAt: new Date().toISOString()
    });
  }

  static async rejectRequest(requestId: string, reason?: string): Promise<void> {
    const ref = doc(db, this.collectionName, requestId);
    await updateDoc(ref, {
      status: 'rejected',
      processedAt: new Date().toISOString(),
      rejectionReason: reason || ''
    });
  }

  // Optional: for future student-side creation
  static async createRequest(req: Omit<SubscriptionRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const createdAt = new Date().toISOString();

    // Sanitize payload by removing undefined values (Firestore doesn't allow undefined)
    const basePayload: Record<string, any> = { ...req, status: 'pending', createdAt };
    const payload: Record<string, any> = {};
    Object.entries(basePayload).forEach(([key, value]) => {
      if (value !== undefined) payload[key] = value;
    });

    // Create in general collection (visible to teacher)
    const docRef = await addDoc(collection(db, this.collectionName), payload);

    // Also store in student's subcollection for quick access and linkage
    try {
      const studentBase: Record<string, any> = { parentId: docRef.id, ...req, status: 'pending', createdAt };
      const studentPayload: Record<string, any> = {};
      Object.entries(studentBase).forEach(([key, value]) => {
        if (value !== undefined) studentPayload[key] = value;
      });

      await addDoc(collection(db, 'students', req.studentId, 'subscriptionRequests'), studentPayload);
    } catch (e) {
      console.warn('Failed to write student subcollection subscriptionRequests, continuing:', e);
    }

    return docRef.id;
  }
}