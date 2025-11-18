import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { TeacherService } from '../services/teacherService'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, UserPlus, Globe, Mail, Lock, User, Search, Sun, Moon, Inbox, Loader2, Facebook, Instagram, Twitter, Linkedin, MessageCircle } from 'lucide-react'
import { auth, db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
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
  interface OverlayText {
    id: string;
    textAr?: string;
    textEn?: string;
    xPct: number;
    yPct: number;
  }
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
  // روابط وسائل التواصل الاجتماعي للفوتر
  const [socialMedia, setSocialMedia] = useState<{ facebook?: string; instagram?: string; twitter?: string; linkedin?: string; telegram?: string }>({})
  // إعدادات واتساب العائم
  const [whatsappNumber, setWhatsappNumber] = useState<string>('')
  // How Manara section customization states
  const [featuresTitleAr, setFeaturesTitleAr] = useState<string>('إزاي منارة')
  const [featuresTitleEn, setFeaturesTitleEn] = useState<string>('How Manara Helps')
  const [inviteFeatures, setInviteFeatures] = useState<Array<{emoji: string; titleAr: string; titleEn: string; descAr: string; descEn: string}>>([])
  const [showWhatsappFloat, setShowWhatsappFloat] = useState<boolean>(false)
  // Editable hero texts from teacher settings
  const [heroTitleAr, setHeroTitleAr] = useState<string>('')
  const [heroTitleEn, setHeroTitleEn] = useState<string>('')
  const [heroDescAr, setHeroDescAr] = useState<string>('')
  const [heroDescEn, setHeroDescEn] = useState<string>('')
  const [overlayTexts, setOverlayTexts] = useState<OverlayText[]>([])
  const [heroAvatarBase64, setHeroAvatarBase64] = useState<string>('')
  const [heroFrameStyle, setHeroFrameStyle] = useState<'circle' | 'rounded' | 'square' | 'hexagon' | 'diamond'>('circle')
  const [heroTheme, setHeroTheme] = useState<'classic' | 'proBanner'>('classic')
  const [brandLogoScale, setBrandLogoScale] = useState<number>(1)
  const [brandNameScale, setBrandNameScale] = useState<number>(1)
  const [serviceUnavailable, setServiceUnavailable] = useState<boolean>(false)
  const [hasApprovedActiveSubscription, setHasApprovedActiveSubscription] = useState<boolean>(false)
  // Readonly preview mode (opened from teacher editor)
  const params = new URLSearchParams(location.search)
  const isReadOnly = params.get('readonly') === '1' || params.get('readonly') === 'true'

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
    try {
      const params = new URLSearchParams(location.search)
      const inc = params.get('incognito')
      const teacherPreview = params.get('teacherPreview') === '1'
      if (inc === '1' && !teacherPreview) {
        try { localStorage.clear() } catch {}
        try { sessionStorage.clear() } catch {}
        try { signOut(auth) } catch {}
      }
    } catch {}
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
        try {
          let effectiveId = teacherId
          try {
            const proxy = (teacherData as any)?.proxyOf
            if (typeof proxy === 'string' && proxy.length > 0) {
              effectiveId = proxy
            }
          } catch {}
          let validApproved = false
          try {
            const qAppr = query(collection(db, 'payments'), where('teacherId', '==', effectiveId), where('status', '==', 'approved'))
            const snap = await getDocs(qAppr)
            if (snap.size > 0) {
              const docs = snap.docs.map(d => ({ id: d.id, data: d.data() as any }))
              docs.sort((a, b) => {
                const aApproved = a.data.approvedAt?.seconds || 0
                const bApproved = b.data.approvedAt?.seconds || 0
                const aCreated = a.data.createdAt?.seconds || 0
                const bCreated = b.data.createdAt?.seconds || 0
                if (aApproved !== bApproved) return bApproved - aApproved
                return bCreated - aCreated
              })
              const latest = docs[0]?.data || null
              const expiresAt = latest?.expiresAt?.toDate?.() || latest?.expiresAt || null
              if (expiresAt instanceof Date) {
                validApproved = Date.now() < expiresAt.getTime()
              } else {
                validApproved = true
              }
            }
          } catch {}
          let trialMs = 24 * 60 * 60 * 1000
          try {
            const tsnap = await getDoc(doc(db, 'settings', 'trial'))
            if (tsnap.exists()) {
              const data: any = tsnap.data()
              const unit = data?.unit === 'minutes' ? 'minutes' : 'days'
              const value = typeof data?.value === 'number' && data.value > 0 ? data.value : 1
              trialMs = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000
            } else {
              try {
                const cached = localStorage.getItem('trialSettings')
                if (cached) {
                  const parsed = JSON.parse(cached)
                  const unit = parsed?.unit === 'minutes' ? 'minutes' : 'days'
                  const value = typeof parsed?.value === 'number' && parsed.value > 0 ? parsed.value : 1
                  trialMs = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000
                }
              } catch {}
            }
          } catch {}
          let createdMs = 0
          try {
            const createdRaw: any = (teacherData as any)?.createdAt
            if (typeof createdRaw === 'string') {
              createdMs = new Date(createdRaw).getTime()
            } else if (createdRaw?.seconds) {
              createdMs = createdRaw.seconds * 1000
            } else if (createdRaw instanceof Date) {
              createdMs = createdRaw.getTime()
            }
          } catch {}
          const trialExpired = !!createdMs && (Date.now() - createdMs >= trialMs)
          setServiceUnavailable(false)
        } catch {}
        
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
          // روابط التواصل وواتساب من وثيقة المدرس (عامة)
          const tSocial = (teacherData as any)?.socialMedia as { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; telegram?: string } | undefined
          if (tSocial && typeof tSocial === 'object') setSocialMedia(tSocial)
          const tWhats = (teacherData as any)?.whatsappNumber as string | undefined
          if (typeof tWhats === 'string') setWhatsappNumber(tWhats)
          const tWhatsShow = !!(teacherData as any)?.showWhatsappFloat
          setShowWhatsappFloat(tWhatsShow)

          // نصوص الهيرو من وثيقة المدرّس (تناغمًا مع سلوك اسم المنصة/الشعار)
          const tHeroTitleAr = (teacherData as any)?.heroTitleAr as string | undefined
          const tHeroTitleEn = (teacherData as any)?.heroTitleEn as string | undefined
          const tHeroDescAr = (teacherData as any)?.heroDescAr as string | undefined
          const tHeroDescEn = (teacherData as any)?.heroDescEn as string | undefined

          if (tHeroTitleAr && tHeroTitleAr.trim().length > 0) setHeroTitleAr(tHeroTitleAr.trim())
          if (tHeroTitleEn && tHeroTitleEn.trim().length > 0) setHeroTitleEn(tHeroTitleEn.trim())
          if (tHeroDescAr && tHeroDescAr.trim().length > 0) setHeroDescAr(tHeroDescAr.trim())
          if (tHeroDescEn && tHeroDescEn.trim().length > 0) setHeroDescEn(tHeroDescEn.trim())

          // صورة الهيرو وإطارها من وثيقة المدرّس العامة (inviteHero)
          const tInviteHero = (teacherData as any)?.inviteHero as any | undefined
          if (tInviteHero && typeof tInviteHero === 'object') {
            const av = typeof tInviteHero.avatarBase64 === 'string' ? tInviteHero.avatarBase64 : undefined
            const fs = typeof tInviteHero.frameStyle === 'string' ? tInviteHero.frameStyle : undefined
            const th = typeof tInviteHero.heroTheme === 'string' ? tInviteHero.heroTheme : undefined
            if (av) setHeroAvatarBase64(av)
            if (fs) setHeroFrameStyle(fs as any)
            if (th && ['classic','proBanner'].includes(th)) setHeroTheme(th as any)
            const ot = Array.isArray(tInviteHero.overlayTexts) ? tInviteHero.overlayTexts : []
            if (ot) setOverlayTexts(ot as OverlayText[])
          }
          // بدائل من الحقول العليا إن وجدت
          const avTopT = (teacherData as any)?.heroAvatarBase64 as string | undefined
          if (avTopT) setHeroAvatarBase64(avTopT)
          const fsTopT = (teacherData as any)?.heroFrameStyle as string | undefined
          if (fsTopT) setHeroFrameStyle(fsTopT as any)
          const thTopT = (teacherData as any)?.heroTheme as string | undefined
          if (thTopT && ['classic','proBanner'].includes(thTopT)) setHeroTheme(thTopT as any)

          // قسم "إزاي منارة" من وثيقة المدرّس العامة أولاً
          const tInviteFeatures = (teacherData as any)?.inviteFeatures as any | undefined
          if (tInviteFeatures && typeof tInviteFeatures === 'object') {
            const sTitleAr = typeof tInviteFeatures.titleAr === 'string' ? tInviteFeatures.titleAr.trim() : ''
            const sTitleEn = typeof tInviteFeatures.titleEn === 'string' ? tInviteFeatures.titleEn.trim() : ''
            if (sTitleAr) setFeaturesTitleAr(sTitleAr)
            if (sTitleEn) setFeaturesTitleEn(sTitleEn)
            const items = Array.isArray(tInviteFeatures.items) ? tInviteFeatures.items : []
            if (items.length > 0) {
              const sanitized = items.map((it: any) => ({
                emoji: typeof it.emoji === 'string' ? it.emoji : '✅',
                titleAr: typeof it.titleAr === 'string' ? it.titleAr : '',
                titleEn: typeof it.titleEn === 'string' ? it.titleEn : '',
                descAr: typeof it.descAr === 'string' ? it.descAr : '',
                descEn: typeof it.descEn === 'string' ? it.descEn : '',
              }))
              setInviteFeatures(sanitized)
            }
          }
        } catch {}
        // تحميل شعار العلامة من إعدادات المعلم
        try {
          const settingsDoc = await getDoc(doc(db, 'teacherSettings', teacherId))
          ;(window as any).__inviteSettingsExists = settingsDoc.exists()
          if (settingsDoc.exists()) {
            const logo = settingsDoc.data().platformLogoBase64 as string | undefined
            if (logo) setBrandLogo(logo)
            const name = settingsDoc.data().platformName as string | undefined
            if (name) setBrandName(name)
            const logoScale = settingsDoc.data().brandLogoScale as number | undefined
            if (typeof logoScale === 'number') setBrandLogoScale(Math.min(3, Math.max(0.6, logoScale)))
            const nameScale = settingsDoc.data().brandNameScale as number | undefined
          if (typeof nameScale === 'number') setBrandNameScale(Math.min(3, Math.max(0.6, nameScale)))
          // Load social media links + WhatsApp float settings
          const data = settingsDoc.data()
          const sm = (data.socialMedia || {}) as { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; telegram?: string }
          setSocialMedia(sm)
          const wa = (data.whatsappNumber as string) || ''
          setWhatsappNumber(wa)
          const waShow = !!data.showWhatsappFloat
          setShowWhatsappFloat(waShow)
          // Load hero section texts if available (prefer nested inviteHero, then fallback to top-level fields)
          const inviteHero = data.inviteHero as any | undefined
          let appliedHero = false
          if (inviteHero && typeof inviteHero === 'object') {
            const tAr = typeof inviteHero.heroTitleAr === 'string' ? inviteHero.heroTitleAr.trim() : undefined
            const tEn = typeof inviteHero.heroTitleEn === 'string' ? inviteHero.heroTitleEn.trim() : undefined
            const dAr = typeof inviteHero.heroDescAr === 'string' ? inviteHero.heroDescAr.trim() : undefined
            const dEn = typeof inviteHero.heroDescEn === 'string' ? inviteHero.heroDescEn.trim() : undefined

            if (tAr && tAr.length > 0) { setHeroTitleAr(tAr); appliedHero = true }
            if (tEn && tEn.length > 0) { setHeroTitleEn(tEn); appliedHero = true }
            if (dAr && dAr.length > 0) { setHeroDescAr(dAr); appliedHero = true }
            if (dEn && dEn.length > 0) { setHeroDescEn(dEn); appliedHero = true }
            ;(window as any).__inviteHeroSource = 'nested'
            ;(window as any).__inviteHeroValues = { tAr, tEn, dAr, dEn }

            // قراءة صورة الهيرو وإطارها من inviteHero في إعدادات المعلم
            const av = typeof inviteHero.avatarBase64 === 'string' ? inviteHero.avatarBase64 : undefined
            const fs = typeof inviteHero.frameStyle === 'string' ? inviteHero.frameStyle : undefined
            const th = typeof inviteHero.heroTheme === 'string' ? inviteHero.heroTheme : undefined
            if (av) setHeroAvatarBase64(av)
            if (fs) setHeroFrameStyle(fs as any)
            if (th && ['classic','proBanner'].includes(th)) setHeroTheme(th as any)
            const ot = Array.isArray(inviteHero.overlayTexts) ? inviteHero.overlayTexts : []
            if (ot) setOverlayTexts(ot as OverlayText[])
          }
          // Fallback: legacy top-level hero fields when nested inviteHero is missing or empty
          if (!appliedHero) {
            const tArTop = typeof data.heroTitleAr === 'string' ? data.heroTitleAr.trim() : undefined
            const tEnTop = typeof data.heroTitleEn === 'string' ? data.heroTitleEn.trim() : undefined
            const dArTop = typeof data.heroDescAr === 'string' ? data.heroDescAr.trim() : undefined
            const dEnTop = typeof data.heroDescEn === 'string' ? data.heroDescEn.trim() : undefined

            if (tArTop && tArTop.length > 0) setHeroTitleAr(tArTop)
            if (tEnTop && tEnTop.length > 0) setHeroTitleEn(tEnTop)
            if (dArTop && dArTop.length > 0) setHeroDescAr(dArTop)
            if (dEnTop && dEnTop.length > 0) setHeroDescEn(dEnTop)
            ;(window as any).__inviteHeroSource = 'top-level'
            ;(window as any).__inviteHeroValues = { tArTop, tEnTop, dArTop, dEnTop }
          }
          // Final fallback from brand name if hero still empty (for robustness only)
          if (!appliedHero) {
            const bName = (data.platformName as string) || ''
            if (bName) {
              setHeroTitleAr(prev => prev || `منصة ${bName}`)
              setHeroTitleEn(prev => prev || `platform ${bName}`)
            }
            ;(window as any).__inviteBrandName = bName
          }

          // بدائل إضافية لصورة الهيرو وإطاره من الحقول العليا في إعدادات المعلم
          const avTop = typeof (data as any).heroAvatarBase64 === 'string' ? (data as any).heroAvatarBase64 : undefined
          const fsTop = typeof (data as any).heroFrameStyle === 'string' ? (data as any).heroFrameStyle : undefined
          const thTop = typeof (data as any).heroTheme === 'string' ? (data as any).heroTheme : undefined
          if (avTop) setHeroAvatarBase64(avTop)
          if (fsTop) setHeroFrameStyle(fsTop as any)
          if (thTop && ['classic','proBanner'].includes(thTop)) setHeroTheme(thTop as any)

          // Load How Manara section customization from teacherSettings
          try {
            const section = (data.inviteFeatures as any) || null
            if (section && typeof section === 'object') {
              const sTitleAr = typeof section.titleAr === 'string' ? section.titleAr.trim() : ''
              const sTitleEn = typeof section.titleEn === 'string' ? section.titleEn.trim() : ''
              if (sTitleAr) setFeaturesTitleAr(sTitleAr)
              if (sTitleEn) setFeaturesTitleEn(sTitleEn)
              const items: any[] = Array.isArray(section.items) ? section.items : []
              if (items.length > 0) {
                const sanitized = items.map((it: any) => ({
                  emoji: typeof it.emoji === 'string' ? it.emoji : '✅',
                  titleAr: typeof it.titleAr === 'string' ? it.titleAr : '',
                  titleEn: typeof it.titleEn === 'string' ? it.titleEn : '',
                  descAr: typeof it.descAr === 'string' ? it.descAr : '',
                  descEn: typeof it.descEn === 'string' ? it.descEn : '',
                }))
                setInviteFeatures(sanitized)
              }
            }
          } catch (e2) {
            console.warn('Failed to load invite features section', e2)
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

  useEffect(() => {
    let unsub: (() => void) | null = null
    let cancelled = false
    const run = async () => {
      try {
        if (!teacherId) return
        const tSnap = await getDoc(doc(db, 'teachers', teacherId))
        const tData: any = tSnap.exists() ? tSnap.data() : null
        const effectiveId: string = (typeof tData?.proxyOf === 'string' && tData.proxyOf.length > 0) ? tData.proxyOf : teacherId
        let trialMs = 24 * 60 * 60 * 1000
        try {
          const tsnap = await getDoc(doc(db, 'settings', 'trial'))
          if (tsnap.exists()) {
            const d: any = tsnap.data()
            const unit = d?.unit === 'minutes' ? 'minutes' : 'days'
            const value = typeof d?.value === 'number' && d.value > 0 ? d.value : 1
            trialMs = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000
          } else {
            try {
              const cached = localStorage.getItem('trialSettings')
              if (cached) {
                const parsed = JSON.parse(cached)
                const unit = parsed?.unit === 'minutes' ? 'minutes' : 'days'
                const value = typeof parsed?.value === 'number' && parsed.value > 0 ? parsed.value : 1
                trialMs = unit === 'days' ? value * 24 * 60 * 60 * 1000 : value * 60 * 1000
              }
            } catch {}
          }
        } catch {}
        let createdMs = 0
        try {
          const raw: any = tData?.createdAt
          if (typeof raw === 'string') createdMs = new Date(raw).getTime()
          else if (raw?.seconds) createdMs = raw.seconds * 1000
          else if (raw instanceof Date) createdMs = raw.getTime()
        } catch {}
        const trialExpired = !!createdMs && (Date.now() - createdMs >= trialMs)
        const qPayments = query(collection(db, 'payments'), where('teacherId', '==', effectiveId))
        unsub = onSnapshot(qPayments, (snap) => {
          const payments = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          const basePayments = payments.filter(p => p?.type !== 'storage_addon')
          const approvedList = basePayments
            .filter(p => p?.status === 'approved')
            .sort((a, b) => ((b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0)))
          const approvedP = approvedList[0]
          const expApproved: any = approvedP?.expiresAt?.toDate?.() || approvedP?.expiresAt || null
          const validApproved = expApproved instanceof Date ? (Date.now() < expApproved.getTime()) : !!approvedP
          const hasActive = !!validApproved
          if (!cancelled) {
            setHasApprovedActiveSubscription(hasActive)
            setServiceUnavailable(false)
          }
        })
      } catch {}
    }
    run()
    return () => { cancelled = true; if (unsub) unsub() }
  }, [teacherId])

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
      const params = new URLSearchParams(location.search)
      const teacherPreview = params.get('teacherPreview') === '1'
      const previewLS = (() => { try { return localStorage.getItem('studentPreview') === 'true' } catch { return false } })()
      if (teacherPreview || previewLS) {
        toast.info(language === 'ar' ? 'أنت في وضع معاينة المدرس؛ لن يتم تسجيل الخروج' : 'Teacher preview mode; sign out is disabled')
        return
      }
      setSigningOut(true)
      await new Promise((res) => setTimeout(res, 1500))
      await signOut(auth)
      toast.success(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully')
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
      {/* Readonly overlay to block interactions when previewed from editor */}
      {isReadOnly && !hasApprovedActiveSubscription && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ background: 'transparent' }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
      )}
      
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
        heroAvatarBase64={heroAvatarBase64}
        frameStyle={heroFrameStyle}
        heroTheme={heroTheme}
        overlayTexts={overlayTexts}
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
      {/* Features section (customizable) */}
      <section className="bg-white dark:bg-gray-950 py-14">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{language === 'ar' ? featuresTitleAr : featuresTitleEn}</h2>
          <div className="w-24 h-1 bg-blue-500 dark:bg-blue-400 mx-auto mb-8 rounded"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(inviteFeatures.length > 0 ? inviteFeatures : [
              { emoji: '📝', titleAr: 'هتتـــرب', titleEn: 'Practice', descAr: 'امتحانات إلكترونية تقدر تعيدها لحد ما تتقنها', descEn: 'Online exams you can repeat until you master them' },
              { emoji: '🗺️', titleAr: 'هتجهــزك', titleEn: 'Prepare', descAr: 'مش محتاج تسأل هتذاكر إيه النهاردة. إحنا مجهزين لك', descEn: "No need to ask what to study today; we're ready for you" },
              { emoji: '🎯', titleAr: 'هتتقــاس', titleEn: 'Measure', descAr: 'نظام نقاط على كل حاجة بأفكارها ومهامها للطلبة', descEn: 'Point system across tasks and ideas to measure progress' },
              { emoji: '💬', titleAr: 'هتشــارك', titleEn: 'Share', descAr: 'مجموعات للمناقشة عشان تسأل وتشارك أفكارك مع زمايلك', descEn: 'Discussion groups to ask and share ideas with peers' },
            ]).map((f, idx) => (
              <div key={idx} className="rounded-2xl bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <div className="font-bold text-xl text-blue-700 dark:text-blue-400 mb-2">{language === 'ar' ? f.titleAr : f.titleEn}</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{language === 'ar' ? f.descAr : f.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="mt-10 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {/* Social media icons centered above rights reserved */}
        {(() => {
          const links = [
            { key: 'facebook', url: socialMedia.facebook, icon: <Facebook className="w-6 h-6" /> },
            { key: 'instagram', url: socialMedia.instagram, icon: <Instagram className="w-6 h-6" /> },
            { key: 'twitter', url: socialMedia.twitter, icon: <Twitter className="w-6 h-6" /> },
            { key: 'linkedin', url: socialMedia.linkedin, icon: <Linkedin className="w-6 h-6" /> },
            { key: 'telegram', url: socialMedia.telegram, icon: <MessageCircle className="w-6 h-6" /> },
          ].filter(l => typeof l.url === 'string' && l.url.trim() !== '')

          if (links.length === 0) return null
          return (
            <div className="mb-6">
              <div className="mb-3 text-gray-700 dark:text-gray-300 text-lg font-semibold">
                {language === 'ar' ? 'تابعني على' : 'Follow me on'}
              </div>
              <div className="flex items-center justify-center gap-4">
                {links.map(l => (
                  <a
                    key={l.key}
                    href={l.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={language === 'ar' ? `رابط ${l.key}` : `${l.key} link`}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                  >
                    {l.icon}
                  </a>
                ))}
              </div>
            </div>
          )
        })()}
        {language === 'ar' ? 'جميع الحقوق محفوظة لدى اكاديمية منارة' : 'All rights reserved to Manara Academy'}
      </footer>

      {/* Floating WhatsApp button (optional) */}
      {showWhatsappFloat && whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/[^+\d]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 shadow-lg text-white"
          aria-label={language === 'ar' ? 'تواصل عبر واتساب' : 'Contact via WhatsApp'}
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    </div>
  )
}

const getInitials = (name: string) => {
  if (!name) return 'T'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'T'
}

// تم نقل handleViewCourse داخل المكوّن InvitePage لاستخدام navigate بشكل صحيح