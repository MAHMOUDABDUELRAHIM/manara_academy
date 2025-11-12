import { storage } from '@/firebase/config';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { CourseService } from './courseService';

/**
 * Recursively sums sizes of all files under a given Storage prefix.
 */
async function sumPrefixBytes(prefixPath: string): Promise<number> {
  try {
    const rootRef = ref(storage, prefixPath);
    let total = 0;
    const stack: any[] = [rootRef];
    while (stack.length) {
      const current = stack.pop();
      // List items and subfolders
      const result = await listAll(current);
      // Queue subfolders
      result.prefixes.forEach((p) => stack.push(p));
      // Sum file sizes
      for (const item of result.items) {
        try {
          const meta: any = await getMetadata(item);
          const size = typeof meta.size === 'number' ? meta.size : 0;
          total += size;
        } catch {
          // Ignore individual metadata failures
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export const StorageService = {
  /**
   * Sum bytes for all lesson files of a course.
   * Path pattern: `lesson-files/<courseId>/...`
   */
  async getCourseFilesUsageBytes(courseId: string): Promise<number> {
    return sumPrefixBytes(`lesson-files/${courseId}`);
  },

  /**
   * Sum bytes across all courses taught by a teacher.
   */
  async getTeacherStorageUsageBytes(teacherId: string): Promise<number> {
    try {
      const courses = await CourseService.getInstructorCourses(teacherId);
      let total = 0;
      for (const c of courses) {
        const cid = (c as any)?.id || (c as any)?.courseId || '';
        if (!cid) continue;
        total += await StorageService.getCourseFilesUsageBytes(cid);
      }
      return total;
    } catch {
      return 0;
    }
  },
};

export default StorageService;