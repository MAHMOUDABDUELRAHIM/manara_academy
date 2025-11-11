import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import TeacherSidebar from '@/components/TeacherSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  RefreshCw, 
  Mail, 
  Users, 
  Palette, 
  Check,
  AlertCircle,
  Edit,
  Eye,
  X,
  UserPlus,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle,
  Phone,
  Settings,
  Type,
  ChevronDown
} from 'lucide-react';
import { sendEmailVerification, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { toast } from 'sonner';
import { StudentDashboardPreview } from '@/components/StudentDashboardPreview';
import InviteHeader from '@/components/InviteHeader';
import { InviteHero } from '@/components/InviteHero';
import { TeacherService } from '@/services/teacherService';


interface Student {
  id: string;
  name: string;
  email: string;
  signupDate: Date;
  lastLogin: Date;
}

export default function InviteStudents() {
  interface OverlayText {
    id: string;
    textAr?: string;
    textEn?: string;
    xPct: number; // 0-100 percentage from left
    yPct: number; // 0-100 percentage from top
  }
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCustomCodeMode, setIsCustomCodeMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // New theme selection state
  const [selectedTheme, setSelectedTheme] = useState<'proA' | 'proB'>('proA');
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // Branding settings state
  const [platformName, setPlatformName] = useState('');
  const [platformLogoBase64, setPlatformLogoBase64] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Assistant permissions: detect if current user is an assistant (proxy account)
  const [isAssistant, setIsAssistant] = useState(false);
  useEffect(() => {
    const checkAssistant = async () => {
      try {
        if (!user?.uid) return;
        const meDoc = await getDoc(doc(db, 'teachers', user.uid));
        if (meDoc.exists()) {
          const data = meDoc.data() as any;
          if (typeof data?.proxyOf === 'string' && data.proxyOf.length > 0) {
            setIsAssistant(true);
          } else {
            setIsAssistant(false);
          }
        }
      } catch (e) {
        console.warn('Failed to check assistant proxyOf flag', e);
      }
    };
    checkAssistant();
  }, [user?.uid]);

  // Resolve effective teacher ID (supports assistant accounts via proxyOf)
  const [effectiveTeacherId, setEffectiveTeacherId] = useState<string | null>(null);
  useEffect(() => {
    const resolveEffectiveTeacher = async () => {
      if (!user?.uid) return;
      try {
        const profile = await TeacherService.getTeacherByUid(user.uid);
        const effId = (profile as any)?.id || user.uid;
        setEffectiveTeacherId(effId);
      } catch (e) {
        setEffectiveTeacherId(user.uid);
      }
    };
    resolveEffectiveTeacher();
  }, [user?.uid]);

  // Hero settings state
  const [heroTitleAr, setHeroTitleAr] = useState('');
  const [heroTitleEn, setHeroTitleEn] = useState('');
  const [heroDescAr, setHeroDescAr] = useState('');
  const [heroDescEn, setHeroDescEn] = useState('');
  const [heroTheme, setHeroTheme] = useState<'classic' | 'proBanner'>('classic');
  const [heroAvatarBase64, setHeroAvatarBase64] = useState<string>('');
  const [heroFrameStyle, setHeroFrameStyle] = useState<'circle' | 'rounded' | 'square' | 'hexagon' | 'diamond'>('circle');
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [overlayTexts, setOverlayTexts] = useState<OverlayText[]>([]);

  // Toolbar component: theme toggle + add text inside bordered rounded container
  const HeroToolbar: React.FC<{
    language: 'ar' | 'en';
    heroTheme: 'classic' | 'proBanner';
    onThemeChange: (t: 'classic' | 'proBanner') => void;
  }> = ({ language, heroTheme, onThemeChange }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="relative inline-flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-1 bg-transparent">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[#2c4656] hover:text-[#1e3240]"
          onClick={() => setOpen(v => !v)}
          aria-label={language === 'ar' ? 'الثيم' : 'Theme'}
        >
          <Palette className="w-5 h-5" />
          <span className="text-sm">{language === 'ar' ? 'الثيم' : 'Theme'}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute z-30 top-full mt-2 right-0 bg-white border border-gray-200 rounded-md shadow p-2 min-w-[180px]">
            <button
              className={`block w-full text-right px-3 py-2 rounded ${heroTheme === 'classic' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
              onClick={() => { onThemeChange('classic'); setOpen(false); }}
            >
              {language === 'ar' ? 'كلاسيكي (نص + إطار)' : 'Classic (Text + Frame)'}
            </button>
            <button
              className={`block w-full text-right px-3 py-2 rounded ${heroTheme === 'proBanner' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
              onClick={() => { onThemeChange('proBanner'); setOpen(false); }}
            >
              {language === 'ar' ? 'بانر احترافي' : 'Professional Banner'}
            </button>
          </div>
        )}
        {/* تمت إزالة زر إضافة نص بناءً على طلبك */}
      </div>
    );
  };

  // "How Manara" section customization state
  const defaultInviteFeatures = [
    {
      emoji: '📝',
      titleAr: 'هتتـــرب',
      titleEn: 'Practice',
      descAr: 'امتحانات إلكترونية تقدر تعيدها لحد ما تتقنها',
      descEn: 'Online exams you can repeat until you master them',
    },
    {
      emoji: '🗺️',
      titleAr: 'هتجهــزك',
      titleEn: 'Prepare',
      descAr: 'مش محتاج تسأل هتذاكر إيه النهاردة. إحنا مجهزين لك',
      descEn: "No need to ask what to study today; we're ready for you",
    },
    {
      emoji: '🎯',
      titleAr: 'هتتقــاس',
      titleEn: 'Measure',
      descAr: 'نظام نقاط على كل حاجة بأفكارها ومهامها للطلبة',
      descEn: 'Point system across tasks and ideas to measure progress',
    },
    {
      emoji: '💬',
      titleAr: 'هتشــارك',
      titleEn: 'Share',
      descAr: 'مجموعات للمناقشة عشان تسأل وتشارك أفكارك مع زمايلك',
      descEn: 'Discussion groups to ask and share ideas with peers',
    },
  ];
  const [featuresTitleAr, setFeaturesTitleAr] = useState<string>('إزاي منارة');
  const [featuresTitleEn, setFeaturesTitleEn] = useState<string>('How Manara Helps');
  const [inviteFeatures, setInviteFeatures] = useState<typeof defaultInviteFeatures>(defaultInviteFeatures);
  const [isSavingInviteFeatures, setIsSavingInviteFeatures] = useState(false);

  // Navigation state for tabs
  const [activeTab, setActiveTab] = useState<'platform' | 'social'>('platform');

  // Social media settings state
  const [socialMedia, setSocialMedia] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    telegram: ''
  });
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showWhatsappFloat, setShowWhatsappFloat] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  // Helper: compress image to reduce size and dimensions
  const compressImage = async (
    file: File,
    maxWidth = 512,
    maxHeight = 512,
    initialQuality = 0.82
  ): Promise<{ blob: Blob; type: string }> => {
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      // Prefer WEBP to preserve transparency and better compression
      let quality = initialQuality;
      let blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', quality)
      );

      // Fallback if WEBP not produced
      if (!blob) {
        blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
      }

      // Iteratively reduce quality if size is still too large (> ~600KB)
      const maxSizeBytes = 600_000;
      while (blob && blob.size > maxSizeBytes && quality > 0.5) {
        quality -= 0.1;
        blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/webp', quality)
        );
      }

      if (!blob) throw new Error('Failed to create blob from canvas');
      const type = blob.type || 'image/webp';
      return { blob, type };
    } catch (error) {
      console.error('Image compression error:', error);
      // If compression fails, upload the original file
      return { blob: file, type: file.type || 'application/octet-stream' };
    }
  };

  // Helper: convert Blob to Base64 Data URL
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Check email verification status with real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest email verification status
        await currentUser.reload();
        const updatedUser = auth.currentUser;
        
        if (updatedUser) {
          setIsEmailVerified(updatedUser.emailVerified);
          
          // If email is verified, save this status to Firestore for persistence
          if (updatedUser.emailVerified) {
            try {
              const userDocRef = doc(db, 'teachers', updatedUser.uid);
              await updateDoc(userDocRef, {
                emailVerified: true,
                emailVerifiedAt: new Date()
              });
            } catch (error) {
              console.error('Error updating email verification status:', error);
            }
          }
        }
      }
    });

    // Also check Firestore for persistent verification status
    const checkFirestoreVerification = async () => {
      try {
        const userDocRef = doc(db, 'teachers', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.emailVerified) {
            setIsEmailVerified(true);
          }
        }
      } catch (error) {
        console.error('Error checking Firestore verification:', error);
      }
    };

    checkFirestoreVerification();
    loadInvitationCode();
    loadBrandSettings();
    loadSocialMediaSettings();
    loadInviteFeatures();
    loadStudents();

    return () => unsubscribe();
  }, [user]);

  // Once effectiveTeacherId is resolved, load dependent data
  useEffect(() => {
    if (!effectiveTeacherId) return;
    loadInvitationCode();
    loadBrandSettings();
    loadSocialMediaSettings();
    loadInviteFeatures();
    loadStudents();
  }, [effectiveTeacherId]);

  // Generate unique 6-character invitation code
  const generateUniqueCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code is unique in Firestore
      try {
        const codesQuery = query(
          collection(db, 'invitationCodes'),
          where('code', '==', code)
        );
        const querySnapshot = await getDocs(codesQuery);
        isUnique = querySnapshot.empty;
      } catch (error) {
        console.error('Error checking code uniqueness:', error);
        break;
      }
    }
    
    return code;
  };

  const loadInvitationCode = async () => {
    if (!effectiveTeacherId) return;
    
    try {
      const userDocRef = doc(db, 'teachers', effectiveTeacherId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.invitationCode) {
          setInvitationCode(userData.invitationCode);
        } else {
          // Generate new unique code for new teacher
          const newCode = await generateUniqueCode();
          setInvitationCode(newCode);
          
          // Save to user document and invitation codes collection
          await updateDoc(userDocRef, { invitationCode: newCode });
          await setDoc(doc(db, 'invitationCodes', newCode), {
            code: newCode,
            teacherId: effectiveTeacherId,
            teacherName: user.displayName || user.email,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error loading invitation code:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل رمز الدعوة' : 'Error loading invitation code');
    } finally {
      setIsLoadingCode(false);
    }
  };

  // New: load theme selection from Firestore
  const loadTheme = async () => {
    if (!user) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', user.uid));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const theme = data.studentDashboardTheme as 'proA' | 'proB' | undefined;
        if (theme === 'proA' || theme === 'proB') {
          setSelectedTheme(theme);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل الثيم:', error);
    }
  };

  // New: save theme selection to Firestore
  const saveTheme = async (theme: 'proA' | 'proB') => {
    if (!effectiveTeacherId) return;
    try {
      setIsSavingTheme(true);
      setSelectedTheme(theme);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        {
          studentDashboardTheme: theme,
          updatedAt: new Date()
        },
        { merge: true }
      );
      toast.success(language === 'ar' ? 'تم حفظ الثيم' : 'Theme saved');
    } catch (error) {
      console.error('خطأ في حفظ الثيم:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ الثيم' : 'Failed to save theme');
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Load branding (platform name and logo) from Firestore
  const [brandLogoScale, setBrandLogoScale] = useState<number>(1);
  const [brandNameScale, setBrandNameScale] = useState<number>(1);

  const clampScale = (v: number) => Math.min(3, Math.max(0.6, Number.isFinite(v) ? v : 1));

  const loadBrandSettings = async () => {
    if (!effectiveTeacherId) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', effectiveTeacherId));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setPlatformName(
          (data.platformName as string) ||
            (user.displayName ? `منصة ${user.displayName}` : 'منصتي')
        );
        setPlatformLogoBase64((data.platformLogoBase64 as string) || '');
        setBrandLogoScale(clampScale((data.brandLogoScale as number) ?? 1));
        setBrandNameScale(clampScale((data.brandNameScale as number) ?? 1));
        
        // Load hero settings (prefer nested inviteHero for compatibility with InvitePage)
        const nestedHero = (data.inviteHero as any) || null;
        if (nestedHero && typeof nestedHero === 'object') {
          setHeroTitleAr((nestedHero.heroTitleAr as string) || 'منصة أكاديمية منارة');
          setHeroTitleEn((nestedHero.heroTitleEn as string) || 'Manara Academy Platform');
          setHeroDescAr((nestedHero.heroDescAr as string) || 'منصة تعليمية متقدمة لتطوير المهارات والمعرفة');
          setHeroDescEn((nestedHero.heroDescEn as string) || 'Advanced learning platform for skill and knowledge development');
          setHeroAvatarBase64((nestedHero.avatarBase64 as string) || '');
          const style = (nestedHero.frameStyle as string) || 'circle';
          if (['circle','rounded','square','hexagon','diamond'].includes(style)) {
            setHeroFrameStyle(style as any);
          }
          const theme = (nestedHero.heroTheme as string) || 'classic';
          if (['classic','proBanner'].includes(theme)) {
            setHeroTheme(theme as any);
          }
        } else {
          // Fallback to legacy top-level fields
          setHeroTitleAr((data.heroTitleAr as string) || 'منصة أكاديمية منارة');
          setHeroTitleEn((data.heroTitleEn as string) || 'Manara Academy Platform');
          setHeroDescAr((data.heroDescAr as string) || 'منصة تعليمية متقدمة لتطوير المهارات والمعرفة');
          setHeroDescEn((data.heroDescEn as string) || 'Advanced learning platform for skill and knowledge development');
        }
      } else {
        setPlatformName(user?.displayName ? `منصة ${user.displayName}` : 'منصتي');
        // Set default hero values
        setHeroTitleAr('منصة أكاديمية منارة');
        setHeroTitleEn('Manara Academy Platform');
        setHeroDescAr('منصة تعليمية متقدمة لتطوير المهارات والمعرفة');
        setHeroDescEn('Advanced learning platform for skill and knowledge development');
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات العلامة التجارية:', error);
    }
  };

  // Load "How Manara" features from Firestore
  const loadInviteFeatures = async () => {
    if (!user) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', user.uid));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const section = (data.inviteFeatures as any) || null;
        if (section && typeof section === 'object') {
          const tAr = typeof section.titleAr === 'string' ? section.titleAr.trim() : '';
          const tEn = typeof section.titleEn === 'string' ? section.titleEn.trim() : '';
          if (tAr) setFeaturesTitleAr(tAr);
          if (tEn) setFeaturesTitleEn(tEn);
          const items = Array.isArray(section.items) ? section.items : [];
          if (items.length > 0) {
            const sanitized = items.map((it: any) => ({
              emoji: typeof it.emoji === 'string' ? it.emoji : '✅',
              titleAr: typeof it.titleAr === 'string' ? it.titleAr : '',
              titleEn: typeof it.titleEn === 'string' ? it.titleEn : '',
              descAr: typeof it.descAr === 'string' ? it.descAr : '',
              descEn: typeof it.descEn === 'string' ? it.descEn : '',
            }));
            setInviteFeatures(sanitized);
          }
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل ميزات "إزاي منارة":', error);
    }
  };

  // Upload logo: compress and store Base64 directly in Firestore
  const handleLogoUpload = async (file: File) => {
    if (!effectiveTeacherId || !file) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الشعار' : 'Assistant account cannot modify logo');
      return;
    }
    try {
      setIsUploadingLogo(true);
      // Basic validation
      if (!file.type.startsWith('image/')) {
        toast.error(language === 'ar' ? 'الملف المختار ليس صورة' : 'Selected file is not an image');
        return;
      }

      // Compress image and convert to Base64 Data URL
      const { blob } = await compressImage(file);
      const dataUrl = await blobToDataURL(blob);
      setPlatformLogoBase64(dataUrl);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        { platformLogoBase64: dataUrl, updatedAt: new Date() },
        { merge: true }
      );
      // Mirror logo to public teacher profile for student access
      try {
        await updateDoc(doc(db, 'teachers', effectiveTeacherId), { brandLogoBase64: dataUrl, updatedAt: new Date().toISOString() });
      } catch (e) {
        console.warn('Failed to mirror brand logo to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ الشعار في Firestore' : 'Logo saved to Firestore');
    } catch (error) {
      console.error('خطأ في رفع الشعار:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ الشعار' : 'Failed to save logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save platform name to Firestore
  const saveBrandSettings = async () => {
    if (!effectiveTeacherId) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الإعدادات' : 'Assistant account cannot modify settings');
      return;
    }
    try {
      setIsSavingBrand(true);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        { platformName, platformLogoBase64, brandLogoScale, brandNameScale, updatedAt: new Date() },
        { merge: true }
      );
      // Mirror name/logo to teacher profile for public consumption
      try {
        await updateDoc(
          doc(db, 'teachers', effectiveTeacherId),
          {
            brandLogoBase64: platformLogoBase64 || '',
            platformName: platformName || '',
            // New: mirror scales so invite page can read them without teacherSettings fallback
            brandLogoScale: brandLogoScale,
            brandNameScale: brandNameScale,
            updatedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.warn('Failed to mirror brand settings to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ إعدادات المنصة' : 'Platform settings saved');
    } catch (error) {
      console.error('خطأ في حفظ إعدادات المنصة:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ إعدادات المنصة' : 'Failed to save platform settings');
    } finally {
      setIsSavingBrand(false);
    }
  };

  // تعديل حجم الشعار (مسودة فقط حتى الضغط على تطبيق التغييرات)
  const nudgeLogoScale = (delta: number) => {
    if (!user) return;
    const next = clampScale(brandLogoScale + delta);
    setBrandLogoScale(next);
    // لا يتم الحفظ الآن؛ يتم الحفظ عند الضغط على "تطبيق التغييرات"
    toast.info(
      language === 'ar'
        ? 'تم تعديل حجم الشعار في المعاينة، اضغط تطبيق للتطبيق'
        : 'Logo size changed in preview; click Apply to save'
    );
  };

  // تعديل حجم اسم المنصة (مسودة فقط حتى الضغط على تطبيق التغييرات)
  const nudgeNameScale = (delta: number) => {
    if (!user) return;
    const next = clampScale(brandNameScale + delta);
    setBrandNameScale(next);
    // لا يتم الحفظ الآن؛ يتم الحفظ عند الضغط على "تطبيق التغييرات"
    toast.info(
      language === 'ar'
        ? 'تم تعديل حجم الاسم في المعاينة، اضغط تطبيق للتطبيق'
        : 'Name size changed in preview; click Apply to save'
    );
  };

  // Load social media settings from Firestore
  const loadSocialMediaSettings = async () => {
    if (!effectiveTeacherId) return;
    try {
      const settingsDoc = await getDoc(doc(db, 'teacherSettings', effectiveTeacherId));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.socialMedia) {
          setSocialMedia(data.socialMedia);
        }
        if (data.whatsappNumber) {
          setWhatsappNumber(data.whatsappNumber);
        }
        if (data.showWhatsappFloat !== undefined) {
          setShowWhatsappFloat(data.showWhatsappFloat);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات وسائل التواصل:', error);
    }
  };

  // Save social media settings to Firestore
  const saveSocialMediaSettings = async () => {
    if (!effectiveTeacherId) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الإعدادات' : 'Assistant account cannot modify settings');
      return;
    }
    try {
      setIsSavingSocial(true);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        {
          socialMedia,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // Mirror social media to public teacher profile for invite page consumption
      try {
        await updateDoc(
          doc(db, 'teachers', effectiveTeacherId),
          {
            socialMedia: socialMedia || {},
            updatedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.warn('Failed to mirror social media to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ وسائل التواصل' : 'Social media settings saved');
    } catch (error) {
      console.error('خطأ في حفظ وسائل التواصل:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ وسائل التواصل' : 'Failed to save social media settings');
    } finally {
      setIsSavingSocial(false);
    }
  };

  // Save WhatsApp settings to Firestore
  const saveWhatsAppSettings = async () => {
    if (!effectiveTeacherId) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الإعدادات' : 'Assistant account cannot modify settings');
      return;
    }
    try {
      setIsSavingSocial(true);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        {
          whatsappNumber,
          showWhatsappFloat,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // Mirror WhatsApp settings to public teacher profile for invite page consumption
      try {
        await updateDoc(
          doc(db, 'teachers', effectiveTeacherId),
          {
            whatsappNumber: whatsappNumber || '',
            showWhatsappFloat: !!showWhatsappFloat,
            updatedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.warn('Failed to mirror WhatsApp settings to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ إعدادات واتساب' : 'WhatsApp settings saved');
    } catch (error) {
      console.error('خطأ في حفظ إعدادات واتساب:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ إعدادات واتساب' : 'Failed to save WhatsApp settings');
    } finally {
      setIsSavingSocial(false);
    }
  };

  const loadStudents = async () => {
    console.log('🔍 بدء تحميل الطلاب...');
    console.log('👤 المستخدم الحالي:', user);
    
    if (!user) {
      console.log('❌ لا يوجد مستخدم مسجل دخول');
      setIsLoadingStudents(false);
      return;
    }
    
    console.log('🔑 معرف المعلم الفعّال:', effectiveTeacherId || user.uid);
    
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacherId', '==', effectiveTeacherId || user.uid)
      );
      
      console.log('📊 تنفيذ استعلام الطلاب...');
      const querySnapshot = await getDocs(studentsQuery);
      console.log('📋 عدد الوثائق المسترجعة:', querySnapshot.size);
      
      const studentsData: Student[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 بيانات الطالب:', doc.id, data);
        
        // التعامل مع التواريخ بطريقة آمنة
        let signupDate = new Date();
        let lastLogin = new Date();
        
        // إذا كان createdAt من نوع Timestamp
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          signupDate = data.createdAt.toDate();
        } 
        // إذا كان createdAt من نوع string
        else if (data.createdAt && typeof data.createdAt === 'string') {
          signupDate = new Date(data.createdAt);
        }
        
        // إذا كان lastLogin من نوع Timestamp
        if (data.lastLogin && typeof data.lastLogin.toDate === 'function') {
          lastLogin = data.lastLogin.toDate();
        } 
        // إذا كان lastLogin من نوع string
        else if (data.lastLogin && typeof data.lastLogin === 'string') {
          lastLogin = new Date(data.lastLogin);
        }
        // إذا كان lastActivity موجود كبديل
        else if (data.lastActivity && typeof data.lastActivity === 'string') {
          lastLogin = new Date(data.lastActivity);
        }
        
        studentsData.push({
          id: doc.id,
          name: data.displayName || data.fullName || data.name || 'غير محدد',
          email: data.email,
          signupDate,
          lastLogin
        });
      });
      
      console.log('✅ تم تحميل الطلاب بنجاح:', studentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('❌ خطأ في تحميل قائمة الطلاب:', error);
    } finally {
      setIsLoadingStudents(false);
      console.log('🏁 انتهاء تحميل الطلاب');
    }
  };

  // Save hero settings to Firestore
  const saveHeroSettings = async () => {
    if (!effectiveTeacherId) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الإعدادات' : 'Assistant account cannot modify settings');
      return;
    }
    try {
      setIsSavingHero(true);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        {
          inviteHero: {
            heroTitleAr,
            heroTitleEn,
            heroDescAr,
            heroDescEn,
            avatarBase64: heroAvatarBase64 || '',
            frameStyle: heroFrameStyle || 'circle',
            heroTheme: heroTheme || 'classic',
            overlayTexts: overlayTexts,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // Mirror hero settings to public teacher profile for student-facing invite page consumption
      try {
        await updateDoc(doc(db, 'teachers', effectiveTeacherId), {
          heroTitleAr: heroTitleAr || '',
          heroTitleEn: heroTitleEn || '',
          heroDescAr: heroDescAr || '',
          heroDescEn: heroDescEn || '',
          // Also store avatar/frame for direct consumption
          heroAvatarBase64: heroAvatarBase64 || '',
          heroFrameStyle: heroFrameStyle || 'circle',
          heroTheme: heroTheme || 'classic',
          // Nested object for future compatibility
          inviteHero: {
            heroTitleAr: heroTitleAr || '',
            heroTitleEn: heroTitleEn || '',
            heroDescAr: heroDescAr || '',
            heroDescEn: heroDescEn || '',
            avatarBase64: heroAvatarBase64 || '',
            frameStyle: heroFrameStyle || 'circle',
            heroTheme: heroTheme || 'classic',
            overlayTexts: overlayTexts,
          },
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to mirror hero settings to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ إعدادات العنوان الرئيسي' : 'Hero settings saved');
    } catch (error) {
      console.error('خطأ في حفظ إعدادات العنوان الرئيسي:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ إعدادات العنوان الرئيسي' : 'Failed to save hero settings');
    } finally {
      setIsSavingHero(false);
    }
  };

  // Save "How Manara" features to Firestore
  const saveInviteFeatures = async () => {
    if (!effectiveTeacherId) return;
    if (isAssistant) {
      toast.error(language === 'ar' ? 'حساب مساعد غير مسموح بتعديل الإعدادات' : 'Assistant account cannot modify settings');
      return;
    }
    try {
      setIsSavingInviteFeatures(true);
      await setDoc(
        doc(db, 'teacherSettings', effectiveTeacherId),
        {
          inviteFeatures: {
            titleAr: featuresTitleAr,
            titleEn: featuresTitleEn,
            items: inviteFeatures,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // Mirror How Manara section to public teacher profile for invite page consumption
      try {
        await updateDoc(
          doc(db, 'teachers', effectiveTeacherId),
          {
            inviteFeatures: {
              titleAr: featuresTitleAr || '',
              titleEn: featuresTitleEn || '',
              items: inviteFeatures || []
            },
            updatedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.warn('Failed to mirror inviteFeatures to teacher profile', e);
      }
      toast.success(language === 'ar' ? 'تم حفظ قسم إزاي منارة' : 'How Manara section saved');
    } catch (error) {
      console.error('خطأ في حفظ قسم إزاي منارة:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ قسم إزاي منارة' : 'Failed to save How Manara section');
    } finally {
      setIsSavingInviteFeatures(false);
    }
  };

  // Open invite page with current teacher UID
  const openInvitePage = () => {
    if (!effectiveTeacherId && !user?.uid) {
      toast.error(language === 'ar' ? 'لم يتم التعرف على حساب المدرس' : 'Teacher account not recognized');
      return;
    }
    const teacherIdForLink = effectiveTeacherId || user.uid;
    const url = `${window.location.origin}/invite/${teacherIdForLink}?readonly=1`;
    window.open(url, '_blank');
  };

  // Save custom invitation code
  const saveCustomCode = async () => {
    if (!effectiveTeacherId || !customCode.trim()) return;
    
    // Validate code format (6 characters, alphanumeric)
    const codeRegex = /^[A-Z0-9]{6}$/;
    if (!codeRegex.test(customCode.toUpperCase())) {
      toast.error(language === 'ar' ? 'الرمز يجب أن يكون 6 أحرف أو أرقام' : 'Code must be 6 alphanumeric characters');
      return;
    }
    
    const upperCode = customCode.toUpperCase();
    
    try {
      // Check if code is already taken by another teacher
      const codesQuery = query(
        collection(db, 'invitationCodes'),
        where('code', '==', upperCode)
      );
      const querySnapshot = await getDocs(codesQuery);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        if (existingDoc.data().teacherId !== effectiveTeacherId) {
          toast.error(language === 'ar' ? 'هذا الرمز مستخدم بالفعل' : 'This code is already taken');
          return;
        }
      }
      
      // Remove old code from invitation codes collection
      if (invitationCode) {
        const oldCodeDoc = doc(db, 'invitationCodes', invitationCode);
        await deleteDoc(oldCodeDoc);
      }
      
      // Save new code
      const userDocRef = doc(db, 'teachers', effectiveTeacherId);
      await updateDoc(userDocRef, { invitationCode: upperCode });
      
      await setDoc(doc(db, 'invitationCodes', upperCode), {
        code: upperCode,
        teacherId: effectiveTeacherId,
        teacherName: user.displayName || user.email,
        createdAt: new Date()
      });
      
      setInvitationCode(upperCode);
      setCustomCode('');
      setIsCustomCodeMode(false);
      toast.success(language === 'ar' ? 'تم حفظ الرمز بنجاح' : 'Code saved successfully');
      
    } catch (error) {
      console.error('Error saving custom code:', error);
      toast.error(language === 'ar' ? 'خطأ في حفظ الرمز' : 'Error saving code');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success(language === 'ar' ? 'تم نسخ الرمز' : 'Code copied');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في نسخ الرمز' : 'Failed to copy code');
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) return;
    
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      toast.success(language === 'ar' ? 'تم إرسال رسالة التحقق' : 'Verification email sent');
    } catch (error) {
      console.error('خطأ في إرسال رسالة التحقق:', error);
      toast.error(language === 'ar' ? 'فشل في إرسال رسالة التحقق' : 'Failed to send verification email');
    } finally {
      setIsSendingVerification(false);
    }
  };

  
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader studentName={user.displayName || 'المدرس'} />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <TeacherSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#2c4656] rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {language === 'ar' ? 'تخصيص المنصة' : 'Platform Customization'}
                </h1>
                <p className="text-gray-600">
                  {language === 'ar' 
                    ? 'قم بإدارة وتخصيص منصتك: الشعار واسم المنصة ووسائل التواصل' 
                    : 'Manage and customize your platform: logo, name and social media'
                  }
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === 'platform' ? 'default' : 'outline'}
                onClick={() => setActiveTab('platform')}
                className={activeTab === 'platform' ? 'bg-[#2c4656] hover:bg-[#1e3240]' : ''}
              >
                <Settings className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تخصيص المنصة' : 'Platform Customization'}
              </Button>
              <Button
                variant={activeTab === 'social' ? 'default' : 'outline'}
                onClick={() => setActiveTab('social')}
                className={activeTab === 'social' ? 'bg-[#2c4656] hover:bg-[#1e3240]' : ''}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'وسائل التواصل' : 'Social Media'}
              </Button>
            </div>

            {/* Email Verification Message */}
            {!isEmailVerified && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">
                      {language === 'ar' 
                        ? 'تحقق من بريدك الإلكتروني لتفعيل هذه الميزة'
                        : 'Verify your email to activate this feature'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content with Disabled Effect */}
            <div className={!isEmailVerified ? 'opacity-50 pointer-events-none select-none' : ''}>
              
              {/* Platform Customization Tab */}
              {activeTab === 'platform' && (
                <>
                  {/* Platform Branding Section */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-[#2c4656]" />
                        {language === 'ar' ? 'إدارة وتخصيص المنصة' : 'Platform Management and Customization'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Logo upload and preview + حجم */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {platformLogoBase64 ? (
                            <img src={platformLogoBase64} alt="شعار المنصة" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 text-xs">{language === 'ar' ? 'لا يوجد شعار' : 'No logo'}</span>
                          )}
                        </div>
                        <div>
                          <input
                            id="logo-input"
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) await handleLogoUpload(file);
                              // Clear value to allow re-uploading the same file and retrigger onChange
                              e.currentTarget.value = '';
                            }}
                          />
                          <Button
                            disabled={isUploadingLogo}
                            className="bg-[#2c4656] hover:bg-[#1e3240]"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            {isUploadingLogo
                              ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                              : (language === 'ar' ? 'إضافة/تحديث الشعار' : 'Add/Update Logo')}
                          </Button>
                          <div className="mt-2 flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => nudgeLogoScale(-0.1)}>-</Button>
                            <div className="text-xs text-gray-600">{language === 'ar' ? 'حجم الشعار' : 'Logo size'}: ×{brandLogoScale.toFixed(1)}</div>
                            <Button variant="outline" size="sm" onClick={() => nudgeLogoScale(+0.1)}>+</Button>
                          </div>
                        </div>
                      </div>

                      {/* Platform name input */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                          <Label htmlFor="platformName">
                            {language === 'ar' ? 'اسم المنصة' : 'Platform Name'}
                          </Label>
                          <Input
                            id="platformName"
                            value={platformName}
                            onChange={(e) => setPlatformName(e.target.value)}
                            placeholder={language === 'ar' ? 'أدخل اسم منصتك' : 'Enter your platform name'}
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex items-center gap-2 mr-2">
                            <Button variant="outline" size="sm" onClick={() => nudgeNameScale(-0.1)}>-</Button>
                            <div className="text-xs text-gray-600">{language === 'ar' ? 'حجم الاسم' : 'Name size'}: ×{brandNameScale.toFixed(1)}</div>
                            <Button variant="outline" size="sm" onClick={() => nudgeNameScale(+0.1)}>+</Button>
                          </div>
                          <Button
                            disabled={isSavingBrand}
                            className="bg-[#2c4656] hover:bg-[#1e3240]"
                            onClick={saveBrandSettings}
                          >
                            {isSavingBrand
                              ? (language === 'ar' ? 'جاري التطبيق...' : 'Applying...')
                              : (language === 'ar' ? 'تطبيق التغييرات' : 'Apply Changes')}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {language === 'ar'
                          ? 'تنعكس تغييرات حجم الشعار والاسم في المعاينة فقط حتى تضغط "تطبيق التغييرات"، بعدها تظهر فوراً في صفحة الدعوة.'
                          : 'Logo and name size changes affect the preview only until you click "Apply Changes", then they appear immediately on the invite page.'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Live Preview Section - header-only, live reflects draft changes */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-[#2c4656]" />
                        {language === 'ar' ? 'معاينة مباشرة' : 'Live Preview'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {language === 'ar' 
                          ? 'معاينة هيدر صفحة الدعوة فقط، تعكس تغييرات الاسم والشعار فوراً'
                          : 'Header-only preview of the invite page; name and logo changes reflect instantly'
                        }
                      </p>
                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
                        {/* Limit height to header area and prevent interactions */}
                        <div className="relative h-24 sm:h-28 md:h-32 pointer-events-none">
                          <InviteHeader
                            teacherName={user.displayName || (language === 'ar' ? 'المدرس' : 'Teacher')}
                            teacherPhotoURL={user.photoURL || undefined}
                            brandLogo={platformLogoBase64 || ''}
                            brandName={platformName || ''}
                            brandLogoScale={brandLogoScale}
                            brandNameScale={brandNameScale}
                            showProfileAvatar={false}
                            teacherId={effectiveTeacherId || user.uid}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hero Editor Section with Live Preview */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-[#2c4656]" />
                        {language === 'ar' ? 'تحرير العنوان الرئيسي' : 'Hero Section Editor'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Editable Live Hero Preview (structure identical to InvitePage via InviteHero) */}
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        {/* Action buttons inside the editable box */}
                        <div className="flex justify-end gap-2 p-2 bg-white/60">
                          {/* Theme + Add Text group inside rounded hollow rectangle */}
                          <HeroToolbar
                            language={language}
                            heroTheme={heroTheme}
                            onThemeChange={(t) => setHeroTheme(t)}
                          />
                          <Button
                            disabled={isSavingHero}
                            className="bg-[#2c4656] hover:bg-[#1e3240]"
                            onClick={saveHeroSettings}
                          >
                            {isSavingHero
                              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                              : (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={openInvitePage}
                            aria-label={language === 'ar' ? 'عرض صفحة الدعوة' : 'Open Invite Page'}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <InviteHero
                          language={language}
                          teacherFullName={user.displayName || (language === 'ar' ? 'المدرس' : 'Teacher')}
                          teacherPhotoURL={user.photoURL || undefined}
                          teacherId={user.uid}
                          isAuthenticated={false}
                          onSignOutClick={() => {}}
                          heroTitleAr={heroTitleAr}
                          heroTitleEn={heroTitleEn}
                          heroDescAr={heroDescAr}
                          heroDescEn={heroDescEn}
                          editable
                          onTitleChange={(text) => {
                            if (language === 'ar') setHeroTitleAr(text); else setHeroTitleEn(text);
                          }}
                          onDescChange={(text) => {
                            if (language === 'ar') setHeroDescAr(text); else setHeroDescEn(text);
                          }}
                          heroAvatarBase64={heroAvatarBase64}
                          frameStyle={heroFrameStyle}
                          onAvatarUpload={(b64) => setHeroAvatarBase64(b64)}
                          onFrameStyleChange={(style) => setHeroFrameStyle(style)}
                          heroTheme={heroTheme}
                          onThemeChange={(theme) => setHeroTheme(theme)}
                          overlayTexts={overlayTexts}
                          onOverlayTextsChange={setOverlayTexts}
                        />
                        <p className="text-xs text-gray-500 mt-2 px-6 py-2">
                          {language === 'ar'
                            ? 'اضغط على عنوان ووصف العنوان الرئيسي للتعديل مباشرة. استخدم زر "حفظ التعديلات" بالأعلى لتطبيقها على صفحة الدعوة.'
                            : 'Click the hero title and description to edit inline. Use the "Save Changes" button above to apply to the invite page.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* How Manara Section Editor */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-[#2c4656]" />
                        {language === 'ar' ? 'تخصيص قسم إزاي منارة' : 'Customize "How Manara" Section'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Editable Live Preview */}
                      <div className="border rounded-lg overflow-hidden border-gray-200">
                        {/* Action buttons inside the editable box */}
                        <div className="flex justify-end gap-2 p-2 bg-white/60">
                          <Button
                            disabled={isSavingInviteFeatures}
                            className="bg-[#2c4656] hover:bg-[#1e3240]"
                            onClick={saveInviteFeatures}
                          >
                            {isSavingInviteFeatures
                              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                              : (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={openInvitePage}
                            aria-label={language === 'ar' ? 'عرض صفحة الدعوة' : 'Open Invite Page'}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-6">
                          <div className="text-center">
                            <textarea
                              aria-label={language === 'ar' ? 'عنوان قسم إزاي منارة' : 'How Manara section title'}
                              dir={language === 'ar' ? 'rtl' : 'ltr'}
                              lang={language}
                              spellCheck={false}
                              value={language === 'ar' ? featuresTitleAr : featuresTitleEn}
                              onChange={(e) => {
                                const text = e.target.value;
                                if (language === 'ar') setFeaturesTitleAr(text); else setFeaturesTitleEn(text);
                              }}
                              onInput={(e) => {
                                const ta = e.currentTarget as HTMLTextAreaElement;
                                ta.style.height = 'auto';
                                ta.style.height = `${ta.scrollHeight}px`;
                              }}
                              className="text-2xl font-bold mb-2 text-gray-900 w-full bg-transparent border border-transparent focus:border-transparent outline-none resize-none overflow-hidden"
                              style={{ textAlign: (language === 'ar' ? 'right' : 'left') as any, lineHeight: '1.2', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                              rows={1}
                            />
                            <div className="w-24 h-1 bg-blue-500 mx-auto mb-6 rounded"></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {inviteFeatures.map((f, i) => (
                              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-4 text-center">
                                <div
                                  className="text-4xl mb-2 cursor-text select-text"
                                  contentEditable
                                  suppressContentEditableWarning
                                  onInput={(e) => {
                                    const text = (e.currentTarget.textContent || '').trim();
                                    const updated = [...inviteFeatures];
                                    updated[i] = { ...updated[i], emoji: text };
                                    setInviteFeatures(updated);
                                  }}
                                >
                                  {f.emoji}
                                </div>
                                <textarea
                                  aria-label={language === 'ar' ? 'عنوان العنصر' : 'Feature title'}
                                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                                  lang={language}
                                  spellCheck={false}
                                  value={language === 'ar' ? f.titleAr : f.titleEn}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    const updated = [...inviteFeatures];
                                    updated[i] = {
                                      ...updated[i],
                                      ...(language === 'ar' ? { titleAr: text } : { titleEn: text })
                                    };
                                    setInviteFeatures(updated);
                                  }}
                                  onInput={(e) => {
                                    const ta = e.currentTarget as HTMLTextAreaElement;
                                    ta.style.height = 'auto';
                                    ta.style.height = `${ta.scrollHeight}px`;
                                  }}
                                  className="font-semibold text-gray-900 mb-1 w-full bg-transparent border border-transparent focus:border-transparent outline-none resize-none overflow-hidden"
                                  style={{ textAlign: (language === 'ar' ? 'right' : 'left') as any, lineHeight: '1.2', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                  rows={1}
                                />
                                <textarea
                                  aria-label={language === 'ar' ? 'وصف العنصر' : 'Feature description'}
                                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                                  lang={language}
                                  spellCheck={false}
                                  value={language === 'ar' ? f.descAr : f.descEn}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    const updated = [...inviteFeatures];
                                    updated[i] = {
                                      ...updated[i],
                                      ...(language === 'ar' ? { descAr: text } : { descEn: text })
                                    };
                                    setInviteFeatures(updated);
                                  }}
                                  onInput={(e) => {
                                    const ta = e.currentTarget as HTMLTextAreaElement;
                                    ta.style.height = 'auto';
                                    ta.style.height = `${ta.scrollHeight}px`;
                                  }}
                                  className="text-sm text-gray-600 w-full bg-transparent border border-transparent focus:border-transparent outline-none resize-none overflow-hidden"
                                  style={{ textAlign: (language === 'ar' ? 'right' : 'left') as any, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                  rows={2}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-4 text-center">
                            {language === 'ar'
                              ? 'اضغط على أي نص داخل المعاينة للتعديل مباشرة. استخدم زر "حفظ التعديلات" بالأعلى لتطبيقها على صفحة الدعوة.'
                              : 'Click any text in the preview to edit inline. Use the "Save Changes" button above to apply to the invite page.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Social Media Tab */}
              {activeTab === 'social' && (
                <>
                  {/* Social Media Links Section */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-[#2c4656]" />
                        {language === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Social Media Links'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Facebook */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-blue-600" />
                            {language === 'ar' ? 'فيسبوك' : 'Facebook'}
                          </Label>
                          <Input
                            value={socialMedia.facebook}
                            onChange={(e) => setSocialMedia(prev => ({ ...prev, facebook: e.target.value }))}
                            placeholder={language === 'ar' ? 'رابط صفحة الفيسبوك' : 'Facebook page URL'}
                            className="mt-2"
                          />
                        </div>

                        {/* Instagram */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <Instagram className="h-4 w-4 text-pink-600" />
                            {language === 'ar' ? 'انستجرام' : 'Instagram'}
                          </Label>
                          <Input
                            value={socialMedia.instagram}
                            onChange={(e) => setSocialMedia(prev => ({ ...prev, instagram: e.target.value }))}
                            placeholder={language === 'ar' ? 'رابط حساب الانستجرام' : 'Instagram profile URL'}
                            className="mt-2"
                          />
                        </div>

                        {/* Twitter/X */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <Twitter className="h-4 w-4 text-blue-400" />
                            {language === 'ar' ? 'تويتر / X' : 'Twitter / X'}
                          </Label>
                          <Input
                            value={socialMedia.twitter}
                            onChange={(e) => setSocialMedia(prev => ({ ...prev, twitter: e.target.value }))}
                            placeholder={language === 'ar' ? 'رابط حساب تويتر' : 'Twitter profile URL'}
                            className="mt-2"
                          />
                        </div>

                        {/* LinkedIn */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-blue-700" />
                            {language === 'ar' ? 'لينكدان' : 'LinkedIn'}
                          </Label>
                          <Input
                            value={socialMedia.linkedin}
                            onChange={(e) => setSocialMedia(prev => ({ ...prev, linkedin: e.target.value }))}
                            placeholder={language === 'ar' ? 'رابط حساب لينكدان' : 'LinkedIn profile URL'}
                            className="mt-2"
                          />
                        </div>

                        {/* Telegram */}
                        <div>
                          <Label className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            {language === 'ar' ? 'تيلجرام' : 'Telegram'}
                          </Label>
                          <Input
                            value={socialMedia.telegram}
                            onChange={(e) => setSocialMedia(prev => ({ ...prev, telegram: e.target.value }))}
                            placeholder={language === 'ar' ? 'رابط قناة أو حساب تيلجرام' : 'Telegram channel/profile URL'}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          disabled={isSavingSocial}
                          className="bg-[#2c4656] hover:bg-[#1e3240]"
                          onClick={saveSocialMediaSettings}
                        >
                          {isSavingSocial
                            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                            : (language === 'ar' ? 'حفظ وسائل التواصل' : 'Save Social Media')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* WhatsApp Floating Button Section */}
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-green-600" />
                        {language === 'ar' ? 'أيقونة واتساب العائمة' : 'Floating WhatsApp Button'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="whatsapp-toggle"
                            checked={showWhatsappFloat}
                            onChange={(e) => setShowWhatsappFloat(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="whatsapp-toggle">
                            {language === 'ar' ? 'تفعيل أيقونة واتساب العائمة' : 'Enable floating WhatsApp button'}
                          </Label>
                        </div>
                      </div>

                      {showWhatsappFloat && (
                        <div>
                          <Label htmlFor="whatsapp-number">
                            {language === 'ar' ? 'رقم الهاتف (مع رمز الدولة)' : 'Phone Number (with country code)'}
                          </Label>
                          <Input
                            id="whatsapp-number"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: +966501234567' : 'Example: +966501234567'}
                            className="mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {language === 'ar'
                              ? 'أدخل رقم الهاتف مع رمز الدولة. عند الضغط على الأيقونة، سيتم توجيه الطالب إلى واتساب مباشرة.'
                              : 'Enter phone number with country code. When clicked, students will be redirected to WhatsApp directly.'}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          disabled={isSavingSocial}
                          className="bg-green-600 hover:bg-green-700"
                          onClick={saveWhatsAppSettings}
                        >
                          {isSavingSocial
                            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                            : (language === 'ar' ? 'حفظ إعدادات واتساب' : 'Save WhatsApp Settings')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
    </div>
  );
}