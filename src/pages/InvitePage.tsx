import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { TeacherService } from '../services/teacherService'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, UserPlus, Globe, Mail, Lock, User, Search, Sun, Moon, Inbox, Loader2 } from 'lucide-react'
import { auth } from '@/firebase/config'
import { signOut } from 'firebase/auth'
import { CourseService } from '@/services/courseService'
import { Course } from '@/types/course'
import { StudentService } from '@/services/studentService'

interface Teacher {
  uid: string
  fullName: string
  email: string
  photoURL?: string
}

interface LoginFormData {
  email: string
  password: string
}

interface RegisterFormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export default function InvitePage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login, register } = useAuth()
  const { language, setLanguage } = useLanguage()
  
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [isDark, setIsDark] = useState<boolean>(() => {
  if (typeof document !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return document.documentElement.classList.contains('dark')
  }
  return false
})
  const [signingOut, setSigningOut] = useState(false)

// Theme toggle handler
const toggleTheme = () => setIsDark(v => !v)

// Sync Tailwind dark class and persist preference
useEffect(() => {
  if (isDark) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}, [isDark])
  
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [forgotEmail, setForgotEmail] = useState('')

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!teacherId) {
        navigate('/')
        return
      }

      try {
        const teacherData = await TeacherService.getTeacherProfile(teacherId)
        setTeacher(teacherData)
        
        // حفظ teacherId في localStorage للاستخدام بعد تسجيل الدخول
        if (teacherData?.uid) {
          localStorage.setItem('teacherId', teacherData.uid)
          console.log('Saved teacherId to localStorage:', teacherData.uid)
        }
        // Fetch teacher courses
        try {
          setCoursesLoading(true)
          const teacherCourses = await CourseService.getInstructorPublishedCourses(teacherId)
          setCourses(teacherCourses || [])
        } catch (courseErr) {
          console.error('Error loading teacher courses:', courseErr)
          setCourses([])
        } finally {
          setCoursesLoading(false)
        }
      } catch (error: any) {
        console.error('Error fetching teacher:', error)
        const msg = String(error?.message || '')
        const code = error?.code
        const offline = msg.includes('client is offline') || msg.includes('Failed to fetch') || code === 'unavailable'
        if (offline) {
          toast.error(
            language === 'ar'
              ? 'الاتصال بالإنترنت غير متاح حاليًا. يرجى المحاولة لاحقًا.'
              : 'Internet connection is unavailable. Please try again later.'
          )
          setIsOffline(true)
          return
        }
        toast.error(
          language === 'ar' 
            ? 'رابط الدعوة غير صحيح' 
            : 'Invalid invitation link'
        )
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchTeacher()
  }, [teacherId, navigate, language])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const user = await login(loginData.email, loginData.password)
      
      if (user && teacherId) {
        try {
          const existingTeacher = await TeacherService.getTeacherForStudent(user.uid)
          if (existingTeacher && existingTeacher.id !== teacherId) {
            // الطالب مرتبط بمدرس آخر: حجب الدخول تماماً بدون رسائل
            try { await signOut(auth) } catch {}
            navigate('/student-login')
            return
          }
          if (!existingTeacher) {
            await TeacherService.linkStudentToTeacher(user.uid, teacherId)
          }
        } catch (linkError) {
          console.error('Error linking student to teacher:', linkError)
        }
      }

      toast.success(
        language === 'ar' 
          ? 'تم تسجيل الدخول بنجاح!' 
          : 'Login successful!'
      )
      
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(redirect || '/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      
      let errorMessage = language === 'ar' 
        ? 'فشل في تسجيل الدخول. يرجى التحقق من البيانات.' 
        : 'Login failed. Please check your credentials.'
      
      // تخصيص رسائل الخطأ بناءً على كود Firebase إن وجد
      if (error?.code === 'auth/invalid-credential') {
        errorMessage = language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'
      }
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOutClick = async () => {
    try {
      setSigningOut(true)
      await new Promise((res) => setTimeout(res, 1500))
      await signOut(auth)
      toast.success(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully')
      // لا يتم التوجيه بعد تسجيل الخروج؛ يبقى المستخدم في نفس الصفحة
    } catch (err) {
      console.error('Sign out error:', err)
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تسجيل الخروج' : 'Error during sign out')
    } finally {
      setSigningOut(false)
    }
  }

  const handleForgotPassword = () => {
    toast.info(
      language === 'ar'
        ? 'سيتم إرسال رابط إعادة تعيين كلمة المرور قريباً' 
        : 'Password reset link will be sent soon'
    )
    setShowForgotPassword(false)
  }

  // نقلنا هذه الدالة داخل المكوّن لاستخدام navigate و teacherId
  const handleViewCourse = (courseId: string) => {
    try {
      if (teacherId) {
        localStorage.setItem('teacherId', teacherId)
      }
    } catch {}
    navigate(`/course/${courseId}/details`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      {isOffline && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-sm">
            {language === 'ar'
              ? 'تعذر الوصول إلى خوادم Firebase. تعمل الصفحة في وضع عدم الاتصال مؤقتًا.'
              : 'Unable to reach Firebase services. The page is operating offline temporarily.'}
          </div>
        </div>
      )}
      {/* Header with teacher logo and language selector */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {teacher?.photoURL ? (
              <img src={teacher.photoURL} alt={teacher.fullName} className="w-10 h-10 rounded-full object-cover border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {getInitials(teacher?.fullName || (language === 'ar' ? 'الأستاذ' : 'Teacher'))}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-semibold text-gray-900">{teacher?.fullName || (language === 'ar' ? 'الأستاذ' : 'Teacher')}</div>
              {/* Removed subtext "Invite Students" per request */}
            </div>
          </div>
          
          {/* Middle: search */}
          <div className="flex-1 hidden md:block">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                placeholder={language === 'ar' ? 'ابحث عن الدورات...' : 'Search courses...'}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Right: avatar + language + theme toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (auth.currentUser) {
                  navigate('/dashboard')
                } else {
                  const url = teacherId ? '/student-login?teacherId=' + teacherId : '/student-login'
                  navigate(url)
                }
              }}
              aria-label={language === 'ar' ? 'الحساب' : 'Account'}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 overflow-hidden"
            >
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="avatar" className="w-10 h-10 object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-700" />
              )}
            </button>
            <button
              onClick={toggleTheme}
              aria-label={language === 'ar' ? (isDark ? 'الوضع الفاتح' : 'الوضع الداكن') : (isDark ? 'Light mode' : 'Dark mode')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            >
              {isDark ? <Sun className="w-5 h-5 text-gray-700" /> : <Moon className="w-5 h-5 text-gray-700" />}
            </button>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
              <Globe className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>
      {/* Enlarged banner with CTA buttons inside */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: illustration / photo */}
          <div className="order-2 md:order-1 flex justify-center md:justify-start">
            <div className="relative w-72 h-72 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-blue-200">
              {teacher?.photoURL ? (
                <img src={teacher.photoURL} alt={teacher.fullName} className="w-64 h-64 object-cover rounded-full" />
              ) : (
                <div className="w-64 h-64 rounded-full bg-blue-500 text-white flex items-center justify-center text-5xl font-extrabold">
                  {getInitials(teacher?.fullName || (language === 'ar' ? 'الأستاذ' : 'Teacher'))}
                </div>
              )}
              <span className="absolute -top-2 -left-2 bg-white text-blue-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'دعوة' : 'Invite'}</span>
              <span className="absolute -bottom-2 -right-2 bg-white text-indigo-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'انضم' : 'Join'}</span>
            </div>
          </div>
      
          {/* Right: headline + description + CTAs */}
          <div className={`${language === 'ar' ? 'text-right' : 'text-left'} order-1 md:order-2`}>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {language === 'ar' ? (
                <>منصة <span className="text-blue-600">منارة</span> الأكاديمية</>
              ) : (
                <>Manara <span className="text-blue-600">Academy</span> Platform</>
              )}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
              {language === 'ar'
                ? 'منصة متكاملة بها كل ما يحتاجه الطالب للتفوق'
                : 'A complete platform with everything students need to excel'}
            </p>
            <div className={`flex flex-col sm:flex-row ${language === 'ar' ? 'justify-end' : 'justify-start'} items-center gap-4`}>
              {/* Conditional CTA buttons based on login state */}
              {!auth.currentUser ? (
                <>
                  <a
                    href={teacherId ? '/register/student?teacherId=' + teacherId : '/register/student'}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'اعمل حساب جديد' : 'Create New Account'}
                  </a>
                  <a
                    href={teacherId ? '/student-login?teacherId=' + teacherId : '/student-login'}
                    className="inline-block bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'سجل دخولك' : 'Sign In'}
                  </a>
                </>
              ) : (
                <>
                  <a
                    href={'/dashboard'}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {language === 'ar' ? 'تصفح كورساتك' : 'Browse Your Courses'}
                  </a>
                  <button
                    onClick={handleSignOutClick}
                    disabled={signingOut}
                    className="inline-flex items-center bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {signingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {language === 'ar' ? (signingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل خروج') : (signingOut ? 'Signing out...' : 'Sign Out')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content with teacher info and published courses */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">{language === 'ar' ? 'كورساتنا المقترحة' : 'Featured Courses'}</h2>
          <div className="w-24 h-1 bg-blue-500 dark:bg-blue-400 mx-auto mt-3 rounded"></div>
        </div>

        {coursesLoading ? (
          <div className="text-center text-gray-500">{language === 'ar' ? 'جاري تحميل الدورات...' : 'Loading courses...'}</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-300 flex flex-col items-center gap-3">
            <Inbox className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            <div className="text-lg font-medium">{language === 'ar' ? 'لا توجد كورسات في الوقت الحالي' : 'No courses available right now'}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">{language === 'ar' ? 'لا توجد صورة' : 'No Image'}</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{course.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
  {course.price === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `${course.price} ${course.currency || ''}`}
</span>
                    <button onClick={() => handleViewCourse(course.id)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
                      {language === 'ar' ? 'عرض الدورة' : 'View Course'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Features section */}
      <section className="bg-white dark:bg-gray-950 py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{language === 'ar' ? 'إزاي منارة' : 'How Manara Helps'}</h2>
          <div className="w-24 h-1 bg-blue-500 dark:bg-blue-400 mx-auto mb-8 rounded"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{
              key: 'practice',
              emoji: '📝',
              titleAr: 'هتتـــرب',
              titleEn: 'Practice',
              descAr: 'امتحانات إلكترونية تقدر تعيدها لحد ما تتقنها',
              descEn: 'Online exams you can repeat until you master them'
            },{
              key: 'plan',
              emoji: '🗺️',
              titleAr: 'هتجهــزك',
              titleEn: 'Prepare',
              descAr: 'مش محتاج تسأل هتذاكر إيه النهاردة. إحنا مجهزين لك',
              descEn: "No need to ask what to study today; we're ready for you"
            },{
              key: 'measure',
              emoji: '🎯',
              titleAr: 'هتتقــاس',
              titleEn: 'Measure',
              descAr: 'نظام نقاط على كل حاجة بأفكارها ومهامها للطلبة',
              descEn: 'Point system across tasks and ideas to measure progress'
            },{
              key: 'share',
              emoji: '💬',
              titleAr: 'هتشــارك',
              titleEn: 'Share',
              descAr: 'مجموعات للمناقشة عشان تسأل وتشارك أفكارك مع زمايلك',
              descEn: 'Discussion groups to ask and share ideas with peers'
            }].map((f) => (
              <div key={f.key} className="rounded-2xl bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <div className="font-bold text-xl text-blue-700 dark:text-blue-400 mb-2">{language === 'ar' ? f.titleAr : f.titleEn}</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? f.descAr : f.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="mt-10 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {language === 'ar' ? 'جميع الحقوق محفوظة لدى اكاديمية منارة' : 'All rights reserved to Manara Academy'}
      </footer>
    </div>
  )
}

const getInitials = (name: string) => {
  if (!name) return 'T'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'T'
}

// تم نقل handleViewCourse داخل المكوّن InvitePage لاستخدام navigate بشكل صحيح