import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { CourseService } from "@/services/courseService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, BookOpen } from "lucide-react";

interface Student {
  id: string;
  name: string;
  avatar?: string;
  coursesCount: number;
  commonCourses: string[];
  isOnline: boolean;
}

interface StudentsSidebarProps {
  className?: string;
}

export const StudentsSidebar = ({ className = "" }: StudentsSidebarProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingPeers, setLoadingPeers] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (!user) {
      setStudents([]);
      setLoadingPeers(false);
      return;
    }

    const selfRef = doc(db, "students", user.uid);
    unsubscribe = onSnapshot(selfRef, async (snap) => {
      if (!snap.exists()) {
        setStudents([]);
        setLoadingPeers(false);
        return;
      }

      const selfData: any = snap.data();
      const myCourses: string[] = Array.isArray(selfData?.enrolledCourses) ? selfData.enrolledCourses : [];
      const teacherId: string | undefined = selfData?.teacherId;

      if (!myCourses.length) {
        setStudents([]);
        setLoadingPeers(false);
        return;
      }

      // Firestore array-contains-any supports up to 10 values
      const filterCourses = myCourses.slice(0, 10);
      const constraints: any[] = [
        where("enrolledCourses", "array-contains-any", filterCourses),
        where("isActive", "==", true),
      ];
      if (teacherId) constraints.push(where("teacherId", "==", teacherId));

      const peersQuery = query(collection(db, "students"), ...constraints);
      const peersSnap = await getDocs(peersQuery);

      const titleCache = new Map<string, string>();
      const getCourseTitle = async (courseId: string): Promise<string> => {
        if (titleCache.has(courseId)) return titleCache.get(courseId)!;
        try {
          const course = await CourseService.getCourseById(courseId);
          const title = course?.title || courseId;
          titleCache.set(courseId, title);
          return title;
        } catch {
          titleCache.set(courseId, courseId);
          return courseId;
        }
      };

      const result: Student[] = [];
      for (const d of peersSnap.docs) {
        if (d.id === user.uid) continue;
        const pdata: any = d.data();
        const peerCourses: string[] = Array.isArray(pdata?.enrolledCourses) ? pdata.enrolledCourses : [];
        const commonIds = peerCourses.filter((cid) => myCourses.includes(cid));
        if (!commonIds.length) continue;

        const lastActivity = pdata?.lastActivity ? new Date(pdata.lastActivity) : null;
        const isOnline = !!(lastActivity && Date.now() - lastActivity.getTime() < 10 * 60 * 1000);

        const commonTitles = await Promise.all(commonIds.slice(0, 2).map((cid) => getCourseTitle(cid)));

        result.push({
          id: d.id,
          name: pdata?.fullName || (pdata?.email ? String(pdata.email).split("@")[0] : "طالب"),
          avatar: pdata?.photoURL || "",
          coursesCount: commonIds.length,
          commonCourses: commonTitles,
          isOnline,
        });
      }

      result.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return b.coursesCount - a.coursesCount;
      });

      setStudents(result);
      setLoadingPeers(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return (
    <div className={`w-80 ${className}`}>
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            الطلاب المسجلين معك
          </CardTitle>
          <p className="text-sm text-gray-600">
            {students.length} طالب في نفس الكورسات
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">لا يوجد طلاب مسجلين معك</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {student.avatar ? (
                        <img 
                          src={student.avatar} 
                          alt={student.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    {/* Online Status */}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      student.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {student.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {student.coursesCount} كورس
                      </Badge>
                    </div>
                    
                    {/* Common Courses */}
                    <div className="space-y-1">
                      {student.commonCourses.slice(0, 2).map((course, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                          <BookOpen className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{course}</span>
                        </div>
                      ))}
                      {student.commonCourses.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{student.commonCourses.length - 2} كورس آخر
                        </p>
                      )}
                    </div>

                    {/* Online Status Text */}
                    <div className="mt-2">
                      <span className={`text-xs ${
                        student.isOnline ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {student.isOnline ? 'متصل الآن' : 'غير متصل'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsSidebar;