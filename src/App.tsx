import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import StudentLogin from "./pages/StudentLogin";
import ForgotPassword from "./pages/ForgotPassword";
import StudentRegister from "./pages/StudentRegister";
import TeacherRegister from "./pages/TeacherRegister";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import VerifyTeacherEmail from "./pages/VerifyTeacherEmail";
import AdminDashboard from "./pages/AdminDashboard";
import MyCourses from "./pages/MyCourses";
import CourseCatalog from "./pages/CourseCatalog";
import Profile from "./pages/Profile";

import { TeacherMyCourses } from "./pages/teacher/MyCourses";
import CreateCourse from "./pages/teacher/CreateCourse";
import InviteStudents from "./pages/teacher/InviteStudents";
import Payouts from "./pages/teacher/Payouts";
import { AddLesson } from "./pages/teacher/AddLesson";
import TeacherAssessments from "./pages/teacher/Assessments";
import TeacherSettings from "./pages/teacher/Settings";

import ManageUsers from "./pages/admin/ManageUsers";
import ManageCourses from "./pages/admin/ManageCourses";
import PaymentsPayouts from "./pages/admin/PaymentsPayouts";
import SupportInbox from "./pages/admin/SupportInbox";
import Notifications from "./pages/admin/Notifications";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import Settings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";
import InvitePage from "./pages/InvitePage";
import CourseDetails from "./pages/CourseDetails";
import CourseContent from "./pages/CourseContent";
import ExamRunner from "./pages/ExamRunner";

import ErrorBoundary from "@/components/ErrorBoundary";

 const queryClient = new QueryClient();

 const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_relativeSplatPath: true }}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/student-login" element={<StudentLogin />} />
              <Route path="/login/student" element={<StudentLogin />} />
              <Route path="/login/student/:code" element={<StudentLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register/student" element={<StudentRegister />} />
              <Route path="/register/student/:code" element={<StudentRegister />} />
              <Route path="/register/teacher" element={<TeacherRegister />} />
              <Route path="/verify-teacher-email" element={<VerifyTeacherEmail />} />
              <Route path="/invite/:teacherId" element={<InvitePage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRole="student" loginPath="/student-login">
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/course/:courseId" element={
                <ProtectedRoute requiredRole="student" loginPath="/student-login">
                  <CourseContent />
                </ProtectedRoute>
              } />
              <Route path="/course/:courseId/details" element={
                <ProtectedRoute requiredRole="student" loginPath="/student-login">
                  <CourseDetails />
                </ProtectedRoute>
              } />
              <Route path="/course/:courseId/content" element={
                <ProtectedRoute requiredRole="student" loginPath="/student-login">
                  <CourseContent />
                </ProtectedRoute>
              } />
              <Route path="/exam/:examId" element={
                <ProtectedRoute requiredRole="student" loginPath="/student-login">
                  <ExamRunner />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/courses" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherMyCourses />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/courses/:courseId/details" element={
                <ProtectedRoute requiredRole="teacher">
                  <CourseDetails />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/create-course" element={
                <ProtectedRoute requiredRole="teacher">
                  <CreateCourse />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/invite-students" element={
                <ProtectedRoute requiredRole="teacher">
                  <InviteStudents />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/payouts" element={
                <ProtectedRoute requiredRole="teacher">
                  <Payouts />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/courses/:courseId/add-lesson" element={
                <ProtectedRoute requiredRole="teacher">
                  <AddLesson />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/assessments" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherAssessments />
                </ProtectedRoute>
              } />
              <Route path="/teacher-dashboard/settings" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherSettings />
                </ProtectedRoute>
              } />

              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/courses" element={<ManageCourses />} />
              <Route path="/admin/manage-courses" element={<ManageCourses />} />
              <Route path="/admin/payments" element={<PaymentsPayouts />} />
              <Route path="/admin/support" element={<SupportInbox />} />
              <Route path="/admin/notifications" element={<Notifications />} />
              <Route path="/admin/reports" element={<ReportsAnalytics />} />
              <Route path="/admin/analytics" element={<ReportsAnalytics />} />
              <Route path="/admin/settings" element={<Settings />} />
              {/* Redirect common route mistakes */}
              <Route path="/teacher" element={<Navigate to="/teacher-dashboard" replace />} />
              <Route path="/teacher/courses" element={<Navigate to="/teacher-dashboard/courses" replace />} />
              <Route path="/teacher/create-course" element={<Navigate to="/teacher-dashboard/create-course" replace />} />
              <Route path="/teacher/invite-students" element={<Navigate to="/teacher-dashboard/invite-students" replace />} />
              <Route path="/teacher/payouts" element={<Navigate to="/teacher-dashboard/payouts" replace />} />
              <Route path="/teacher/assessments" element={<Navigate to="/teacher-dashboard/assessments" replace />} />
              
              {/* Redirect registration routes for consistency */}
              <Route path="/student-register" element={<Navigate to="/register/student" replace />} />
              <Route path="/teacher-register" element={<Navigate to="/register/teacher" replace />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
