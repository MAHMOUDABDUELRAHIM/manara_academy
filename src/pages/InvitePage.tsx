import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { TeacherService } from '../services/teacherService'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, UserPlus, Globe, Mail, Lock, User, Search, Sun, Moon, Inbox, Loader2 } from 'lucide-react'
import { auth, db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { CourseService } from '@/services/courseService'
import { Course } from '@/types/course'
import { StudentService } from '@/services/studentService'
import InviteHero from '@/components/InviteHero'

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
  // شعار العلامة الخاص بالمعلم (Base64) لعرضه فوراً في الهيدر
  const [brandLogo, setBrandLogo] = useState<string>('')
  const [brandName, setBrandName] = useState<string>('')
  // Editable hero texts from teacher settings
  const [heroTitleAr, setHeroTitleAr] = useState<string>('')
  const [heroTitleEn, setHeroTitleEn] = useState<string>('')
  const [heroDescAr, setHeroDescAr] = useState<string>('')
  const [heroDescEn, setHeroDescEn] = useState<string>('')
  const [brandLogoScale, setBrandLogoScale] = useState<number>(1)
  const [brandNameScale, setBrandNameScale] = useState<number>(1)

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

  // Scroll progress for header top-edge bar
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const total = doc.scrollHeight - doc.clientHeight
      const current = doc.scrollTop
      const progress = total > 0 ? current / total : 0
      setScrollProgress(Math.max(0, Math.min(1, progress)))
      setIsScrolled(current > 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        // اسم المنصة من وثيقة المدرس (إن وجد)
        try {
          const tName = (teacherData as any)?.platformName as string | undefined
          if (tName) setBrandName(tName)
        } catch {}
        // قراءات احتياطية من وثيقة المدرس: الشعار والقياسات
        try {
          const tLogoBase64 = (teacherData as any)?.brandLogoBase64 as string | undefined
          if (tLogoBase64) setBrandLogo(tLogoBase64)

          const tLogoScale = (teacherData as any)?.brandLogoScale as number | undefined
          if (typeof tLogoScale === 'number') setBrandLogoScale(Math.min(3, Math.max(0.6, tLogoScale)))

          const tNameScale = (teacherData as any)?.brandNameScale as number | undefined
          if (typeof tNameScale === 'number') setBrandNameScale(Math.min(3, Math.max(0.6, tNameScale)))
        } catch {}
        // تحميل شعار العلامة من إعدادات المعلم
        try {
          const settingsDoc = await getDoc(doc(db, 'teacherSettings', teacherId))
          if (settingsDoc.exists()) {
            const logo = settingsDoc.data().platformLogoBase64 as string | undefined
            if (logo) setBrandLogo(logo)
            const name = settingsDoc.data().platformName as string | undefined
            if (name) setBrandName(name)
            const logoScale = settingsDoc.data().brandLogoScale as number | undefined
            if (typeof logoScale === 'number') setBrandLogoScale(Math.min(3, Math.max(0.6, logoScale)))
            const nameScale = settingsDoc.data().brandNameScale as number | undefined
            if (typeof nameScale === 'number') setBrandNameScale(Math.min(3, Math.max(0.6, nameScale)))
            // Load hero section texts if available
            const inviteHero = settingsDoc.data().inviteHero as any | undefined
            if (inviteHero) {
              if (typeof inviteHero.heroTitleAr === 'string') setHeroTitleAr(inviteHero.heroTitleAr)
              if (typeof inviteHero.heroTitleEn === 'string') setHeroTitleEn(inviteHero.heroTitleEn)
              if (typeof inviteHero.heroDescAr === 'string') setHeroDescAr(inviteHero.heroDescAr)
              if (typeof inviteHero.heroDescEn === 'string') setHeroDescEn(inviteHero.heroDescEn)
            }
          }
        } catch (e) {
          console.warn('Failed to load brand logo', e)
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
      <header
        className={`sticky top-0 z-50 relative ${
          isScrolled
            ? 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900'
            : 'bg-transparent'
        }`}
      >
        {/* Bottom-edge scroll progress with full-width track and moving indicator */}
        <div className="absolute left-0 bottom-0 w-full pointer-events-none">
          <div
            className={`relative h-1 transform-gpu origin-top transition-all duration-500 ease-out ${
              isScrolled ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
            }`}
          >
            {/* Full-width track */}
            <div className="absolute inset-0 bg-blue-200 dark:bg-indigo-900/40" />
            {/* Moving indicator */}
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-indigo-400"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(() => {
              const clamp = (v: number) => Math.min(3, Math.max(0.6, v || 1));
              const logoBasePx = 48;
              const logoSize = Math.round(logoBasePx * clamp(brandLogoScale));
              const displayName = brandName || teacher?.fullName || (language === 'ar' ? 'الأستاذ' : 'Teacher');
              if (brandLogo || (teacher as any)?.brandLogoBase64) {
                return <img src={brandLogo || (teacher as any)?.brandLogoBase64} alt={displayName} className="rounded object-cover border rounded-full" style={{ width: logoSize, height: logoSize }} />
              } else if (teacher?.photoURL) {
                return <img src={brandLogo || (teacher as any)?.brandLogoBase64 || teacher.photoURL} alt={displayName} className="rounded-full object-cover border" style={{ width: logoSize, height: logoSize }} />
              } else {
                return (
                  <div className="rounded-full bg-blue-600 text-white flex items-center justify-center font-bold" style={{ width: logoSize, height: logoSize }}>
                    {getInitials(displayName)}
                  </div>
                )
              }
            })()}
            <div className="leading-tight">
            {(() => {
              const displayName = brandName || teacher?.fullName || (language === 'ar' ? 'الأستاذ' : 'Teacher');
              const isArabic = /[\u0600-\u06FF]/.test(displayName);
              const clamp = (v: number) => Math.min(3, Math.max(0.6, v || 1));
              const nameBasePx = isArabic ? 20 : 18; // Arabic: text-xl, Non-Arabic: text-lg
              const nameSize = Math.round(nameBasePx * clamp(brandNameScale));
              return (
                <div
                  className={isArabic
                    ? "font-arabicBrand font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                    : "font-semibold text-gray-900 dark:text-white"
                  }
                  style={{ fontSize: `${nameSize}px` }}
                >
                  {displayName}
                </div>
              );
            })()}
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
      {/* Hero Section (reusable component) */}
      <InviteHero
        language={language}
        teacherFullName={teacher?.fullName}
        teacherPhotoURL={teacher?.photoURL}
        teacherId={teacherId}
        isAuthenticated={!!auth.currentUser}
        onSignOutClick={handleSignOutClick}
        heroTitleAr={heroTitleAr}
        heroTitleEn={heroTitleEn}
        heroDescAr={heroDescAr}
        heroDescEn={heroDescEn}
      />

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