import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { UploadCloud, BadgeCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/firebase/config";
import { doc, updateDoc } from "firebase/firestore";

const Onboarding = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Personal info
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [specializationCategory, setSpecializationCategory] = useState("");
  // Step 2: Featured profile
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [bio, setBio] = useState("");
  // Step 3: Platform branding
  const [platformName, setPlatformName] = useState("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    // Pre-fill with current profile data if any
    setFullName(user.profile?.fullName || "");
  }, [user?.uid]);

  useEffect(() => {
    const phrasesAr = [
      'تعليم يليق بطموحك',
      'منصة حديثة لرحلة نجاحك',
      'دروس مصممة لتتقدم بثقة',
      'ابدأ اليوم وصِل لأعلى أداء'
    ];
    const interval = setInterval(() => {
      setAnimateOut(true);
      setTimeout(() => {
        setPhraseIndex((idx) => (idx + 1) % phrasesAr.length);
        setAnimateOut(false);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const compressImageToBase64 = (file: File, maxDimension = 512, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('no ctx'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = String(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveStep = async (nextStep?: number) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const ref = doc(db, 'teachers', user.uid);
      const payload: any = { updatedAt: new Date() };
      if (step === 1) {
        payload.fullName = fullName.trim();
        payload.subjectSpecialization = specialization || '';
        payload.specializationCategory = specializationCategory || '';
      } else if (step === 2) {
        if (photoBase64) payload.photoURL = photoBase64;
        if (experienceYears) payload.experienceYears = Number(experienceYears);
        if (bio) payload.bio = bio;
      } else if (step === 3) {
        if (platformName) payload.platformName = platformName;
        if (logoBase64) payload.brandLogoBase64 = logoBase64;
      }
      await updateDoc(ref, payload);
      if (typeof nextStep === 'number') setStep(nextStep);
    } catch (e) {
      console.error('Failed to save onboarding step', e);
      toast.error(language === 'ar' ? 'تعذر الحفظ، حاول لاحقاً' : 'Failed to save, try later');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    await saveStep();
    navigate('/teacher-dashboard');
  };

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <img
        src="/لوجو%20فردي.png"
        alt="Manara Logo"
        className={`fixed top-4 ${language === 'ar' ? 'left-4' : 'right-4'} h-10 w-auto object-contain z-50`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        <div className="flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{language === 'ar' ? 'إعداد حساب المدرس' : 'Teacher Onboarding'}</h2>
              <p className="text-gray-500">{language === 'ar' ? 'أكمل البيانات لتخصيص منصتك التعليمية' : 'Complete the steps to personalize your teaching platform'}</p>
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-2 bg-[#ee7b3d] transition-all`} style={{ width: `${(step/3)*100}%` }} />
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="fullName">{language === 'ar' ? 'الاسم/الشهرة' : 'Name / Nickname'}</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-lg shadow-sm border-gray-200 bg-white" />
                </div>
                <div>
                  <Label>{language === 'ar' ? 'التخصص (المادة الدراسية)' : 'Specialization (Subject)'}</Label>
                  <Select value={specialization} onValueChange={(val) => {
                    setSpecialization(val);
                    const thanaweya = ['رياضيات (ثانوي)','فيزياء (ثانوي)','كيمياء (ثانوي)','أحياء (ثانوي)','لغة عربية (ثانوي)','لغة إنجليزية (ثانوي)','تاريخ (ثانوي)','جغرافيا (ثانوي)','فلسفة (ثانوي)','علم نفس (ثانوي)'];
                    const bakaloria = ['رياضيات (بكالوريا)','فيزياء (بكالوريا)','كيمياء (بكالوريا)','لغة عربية (بكالوريا)','لغة إنجليزية (بكالوريا)'];
                    const eadady = ['رياضيات (ثالث إعدادي)','علوم (ثالث إعدادي)','لغة عربية (ثالث إعدادي)','لغة إنجليزية (ثالث إعدادي)','دراسات اجتماعية (ثالث إعدادي)'];
                    const other = ['برمجة','مونتاج','تصميم','كتابة المحتوى','غير ذلك'];
                    if (thanaweya.includes(val)) setSpecializationCategory('thanaweya');
                    else if (bakaloria.includes(val)) setSpecializationCategory('bakaloria');
                    else if (eadady.includes(val)) setSpecializationCategory('talta_eadady');
                    else setSpecializationCategory('other');
                  }}>
                    <SelectTrigger className="h-12 rounded-lg shadow-sm border-gray-200 bg-white">
                      <SelectValue placeholder={language === 'ar' ? 'اختر المادة الدراسية' : 'Select subject'} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs text-gray-500">{language === 'ar' ? 'الثانوية العامة' : 'General Secondary'}</div>
                      <SelectItem value="رياضيات (ثانوي)">{language === 'ar' ? 'رياضيات (ثانوي)' : 'Mathematics - Secondary'}</SelectItem>
                      <SelectItem value="فيزياء (ثانوي)">{language === 'ar' ? 'فيزياء (ثانوي)' : 'Physics - Secondary'}</SelectItem>
                      <SelectItem value="كيمياء (ثانوي)">{language === 'ar' ? 'كيمياء (ثانوي)' : 'Chemistry - Secondary'}</SelectItem>
                      <SelectItem value="أحياء (ثانوي)">{language === 'ar' ? 'أحياء (ثانوي)' : 'Biology - Secondary'}</SelectItem>
                      <SelectItem value="لغة عربية (ثانوي)">{language === 'ar' ? 'لغة عربية (ثانوي)' : 'Arabic - Secondary'}</SelectItem>
                      <SelectItem value="لغة إنجليزية (ثانوي)">{language === 'ar' ? 'لغة إنجليزية (ثانوي)' : 'English - Secondary'}</SelectItem>
                      <SelectItem value="تاريخ (ثانوي)">{language === 'ar' ? 'تاريخ (ثانوي)' : 'History - Secondary'}</SelectItem>
                      <SelectItem value="جغرافيا (ثانوي)">{language === 'ar' ? 'جغرافيا (ثانوي)' : 'Geography - Secondary'}</SelectItem>
                      <SelectItem value="فلسفة (ثانوي)">{language === 'ar' ? 'فلسفة (ثانوي)' : 'Philosophy - Secondary'}</SelectItem>
                      <SelectItem value="علم نفس (ثانوي)">{language === 'ar' ? 'علم نفس (ثانوي)' : 'Psychology - Secondary'}</SelectItem>
                      <div className="px-2 py-1 text-xs text-gray-500">{language === 'ar' ? 'البكالوريا' : 'Baccalaureate'}</div>
                      <SelectItem value="رياضيات (بكالوريا)">{language === 'ar' ? 'رياضيات (بكالوريا)' : 'Mathematics - Baccalaureate'}</SelectItem>
                      <SelectItem value="فيزياء (بكالوريا)">{language === 'ar' ? 'فيزياء (بكالوريا)' : 'Physics - Baccalaureate'}</SelectItem>
                      <SelectItem value="كيمياء (بكالوريا)">{language === 'ar' ? 'كيمياء (بكالوريا)' : 'Chemistry - Baccalaureate'}</SelectItem>
                      <SelectItem value="لغة عربية (بكالوريا)">{language === 'ar' ? 'لغة عربية (بكالوريا)' : 'Arabic - Baccalaureate'}</SelectItem>
                      <SelectItem value="لغة إنجليزية (بكالوريا)">{language === 'ar' ? 'لغة إنجليزية (بكالوريا)' : 'English - Baccalaureate'}</SelectItem>
                      <div className="px-2 py-1 text-xs text-gray-500">{language === 'ar' ? 'الصف الثالث الإعدادي' : 'Third Preparatory'}</div>
                      <SelectItem value="رياضيات (ثالث إعدادي)">{language === 'ar' ? 'رياضيات (ثالث إعدادي)' : 'Mathematics - Grade 9'}</SelectItem>
                      <SelectItem value="علوم (ثالث إعدادي)">{language === 'ar' ? 'علوم (ثالث إعدادي)' : 'Science - Grade 9'}</SelectItem>
                      <SelectItem value="لغة عربية (ثالث إعدادي)">{language === 'ar' ? 'لغة عربية (ثالث إعدادي)' : 'Arabic - Grade 9'}</SelectItem>
                      <SelectItem value="لغة إنجليزية (ثالث إعدادي)">{language === 'ar' ? 'لغة إنجليزية (ثالث إعدادي)' : 'English - Grade 9'}</SelectItem>
                      <SelectItem value="دراسات اجتماعية (ثالث إعدادي)">{language === 'ar' ? 'دراسات اجتماعية (ثالث إعدادي)' : 'Social Studies - Grade 9'}</SelectItem>
                      <div className="px-2 py-1 text-xs text-gray-500">{language === 'ar' ? 'تخصصات أخرى' : 'Other Specializations'}</div>
                      <SelectItem value="برمجة">{language === 'ar' ? 'برمجة' : 'Programming'}</SelectItem>
                      <SelectItem value="مونتاج">{language === 'ar' ? 'مونتاج' : 'Video Editing'}</SelectItem>
                      <SelectItem value="تصميم">{language === 'ar' ? 'تصميم' : 'Design'}</SelectItem>
                      <SelectItem value="كتابة المحتوى">{language === 'ar' ? 'كتابة المحتوى' : 'Content Writing'}</SelectItem>
                      <SelectItem value="غير ذلك">{language === 'ar' ? 'غير ذلك' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'قد تظهر هذه المعلومات في الصفحة الرئيسية إذا تم اختيارك كمدرس الشهر' : 'These details may appear on the homepage if selected as Teacher of the Month'}
                </p>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الصورة الشخصية (اختياري)' : 'Profile Photo (Optional)'}</Label>
                  <div className="group relative h-24 w-24 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                    <img src={photoBase64 || '/avatar-placeholder.png'} alt="avatar" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-6 w-6 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhotoBase64(await compressImageToBase64(f, 512, 0.8)); }}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="experienceYears">{language === 'ar' ? 'الخبرة' : 'Experience'}</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { v: '1', tAr: 'سنة', tEn: '1 year' },
                      { v: '2', tAr: '2-3 سنوات', tEn: '2-3 years' },
                      { v: '5', tAr: '4-6 سنوات', tEn: '4-6 years' },
                      { v: '8', tAr: '7-10 سنوات', tEn: '7-10 years' },
                      { v: '10', tAr: 'أكثر من 10', tEn: '10+ years' }
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setExperienceYears(opt.v)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full border transition ${experienceYears === opt.v ? 'border-[#ee7b3d] bg-[#ee7b3d]/10 text-[#ee7b3d]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      >
                        <BadgeCheck className="h-4 w-4" />
                        {language === 'ar' ? opt.tAr : opt.tEn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">{language === 'ar' ? 'السيرة الذاتية' : 'Bio'}</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={language === 'ar' ? 'اكتب نبذة عنك' : 'Write a short bio'} className="resize-none h-32 overflow-y-auto" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="platformName">{language === 'ar' ? 'اسم المنصة' : 'Platform Name'}</Label>
                  <Input id="platformName" value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="h-12 rounded-lg shadow-sm border-gray-200 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'لوجو المنصة' : 'Platform Logo'}</Label>
                  <div className="group relative h-24 w-24 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                    <img src={logoBase64 || '/Header-Logo.png'} alt="logo" className="h-full w-full object-contain bg-white" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-6 w-6 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) setLogoBase64(await compressImageToBase64(f, 512, 0.8)); }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'يمكنك تخطي هذه المرحلة الآن وإكمالها لاحقاً من الإعدادات.' : 'You can skip this now and complete it later from Settings.'}
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>{language === 'ar' ? 'رجوع' : 'Back'}</Button>
              ) : <div />}
              {step < 3 ? (
                <Button onClick={() => saveStep(step + 1)} disabled={saving} className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white">{language === 'ar' ? 'التالي' : 'Next'}</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={finish} disabled={saving}>{language === 'ar' ? 'تخطي' : 'Skip'}</Button>
                  <Button onClick={finish} disabled={saving} className="bg-[#ee7b3d] hover:bg-[#ee7b3d]/90 text-white">{language === 'ar' ? 'إنهاء' : 'Finish'}</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative bg-[#f5f7fb] p-8 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-3xl md:text-4xl font-extrabold text-[#2c4656] transition-all duration-500 ${animateOut ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
              {language === 'ar' 
                ? ['تعليم يليق بطموحك','منصة حديثة لرحلة نجاحك','دروس مصممة لتتقدم بثقة','ابدأ اليوم وصِل لأعلى أداء'][phraseIndex]
                : ['Learn with confidence','A modern platform for your journey','Lessons designed for success','Start today and reach higher'][phraseIndex]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;