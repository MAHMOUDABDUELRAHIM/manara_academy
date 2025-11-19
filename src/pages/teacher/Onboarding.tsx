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
import { UploadCloud, BadgeCheck, Clock, Check, BookOpen, Atom, FlaskConical, Sigma, Languages, Globe } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/firebase/config";
import { doc, updateDoc } from "firebase/firestore";

const Onboarding = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; specialization?: string; experience?: string }>({});

  // Step 1: Personal info
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [specializationCategory, setSpecializationCategory] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<string>('SA');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  // Step 2: Featured profile
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [bio, setBio] = useState("");
  // Step 3: Platform branding
  const [platformName, setPlatformName] = useState("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [animateOut, setAnimateOut] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");

  useEffect(() => {
    if (!user?.uid) return;
    // Pre-fill with current profile data if any
    setFullName(user.profile?.fullName || "");
    try {
      const existingPhone: any = (user.profile as any)?.phoneNumber;
      if (typeof existingPhone === 'string' && existingPhone.trim()) {
        setPhoneNumber(existingPhone);
      }
    } catch {}
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
        setAnimateIn(true);
        setTimeout(() => { setAnimateIn(false); }, 20);
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
      const errs: any = {};
      if (!fullName.trim() || fullName.trim().length < 2) errs.fullName = language === 'ar' ? 'يرجى إدخال الاسم' : 'Please enter name';
      if (!specialization) errs.specialization = language === 'ar' ? 'يرجى اختيار المادة' : 'Please select subject';
      const maxLen = countryMaxLen[phoneCountry] || 10;
      const normalizedLocal = (phoneNumber || '').replace(/[^\d]/g, '');
      if (!normalizedLocal) errs.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
      if (normalizedLocal && !(normalizedLocal.length === maxLen || phoneNumber.startsWith('+'))) errs.phone = language === 'ar' ? 'تحقق من طول رقم الهاتف' : 'Check phone number length';
      setErrors(errs);
      if (Object.keys(errs).length > 0) { setSaving(false); return; }
      payload.fullName = fullName.trim();
      payload.subjectSpecialization = specialization || '';
      payload.specializationCategory = specializationCategory || '';
      const dial = countryDial[phoneCountry] || '';
      const raw = (phoneNumber || '').trim();
      let normalized = raw.replace(/[^+\d]/g, '');
      if (!normalized.startsWith('+')) {
        const local = normalized.replace(/^0+/, '');
        if (dial) normalized = `+${dial}${local}`; else normalized = local;
      }
      if (normalized) payload.phoneNumber = normalized;
    } else if (step === 2) {
      const errs: any = {};
      if (!experienceYears) errs.experience = language === 'ar' ? 'يرجى اختيار الخبرة' : 'Please select experience';
      if (!photoBase64) errs.photo = language === 'ar' ? 'يرجى رفع صورة أو اختيار افاتار' : 'Please upload a photo or choose an avatar';
      setErrors(errs);
      if (Object.keys(errs).length > 0) { setSaving(false); return; }
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
    if (!user?.uid) return;
    await saveStep();
    try {
      await updateDoc(doc(db, 'teachers', user.uid), { onboardingCompleted: true, updatedAt: new Date() });
    } catch {}
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
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = language === 'ar' ? 'en' : 'ar';
                  try { localStorage.setItem('language', next as any); } catch {}
                  window.location.reload();
                }}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {language === 'ar' ? 'EN' : 'AR'}
              </Button>
            </div>
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
                  {errors.fullName && (<p className="text-red-600 text-xs mt-1">{errors.fullName}</p>)}
                </div>
                <div>
                  <Label htmlFor="phone">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 rounded-lg shadow-sm border-gray-200 bg-white flex-1"
                      maxLength={(countryMaxLen[phoneCountry] || 10) + 4}
                      placeholder={language === 'ar' ? 'ادخل رقم هاتفك فقط' : 'Enter your phone number only'}
                    />
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="w-36 border border-gray-300 rounded-md px-2 py-2 bg-white"
                    >
                      {countryOptions.map((opt) => (
                        <option key={opt.v} value={opt.v}>{`${flagEmoji(opt.v)} ${language === 'ar' ? opt.nAr : opt.nEn} (+${opt.d})`}</option>
                      ))}
                    </select>
                  </div>
                  {errors.phone && (<p className="text-red-600 text-xs mt-1">{errors.phone}</p>)}
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
                  {errors.specialization && (<p className="text-red-600 text-xs mt-1">{errors.specialization}</p>)}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'قد تظهر هذه المعلومات في الصفحة الرئيسية إذا تم اختيارك كمدرس الشهر' : 'These details may appear on the homepage if selected as Teacher of the Month'}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>{language === 'ar' ? 'الصورة الشخصية' : 'Profile Photo'}</Label>
                    <span className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'اختر افاتار جاهز أو ارفع صورتك الخاصة' : 'Choose a ready avatar or upload your photo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="group relative h-24 w-24 rounded-full overflow-hidden border border-gray-200 shadow-sm bg-white">
                      {photoBase64 ? (
                        <img src={photoBase64} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <UploadCloud className="h-6 w-6 text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const b64 = await compressImageToBase64(f, 512, 0.8); setPhotoBase64(b64); setSelectedAvatar(""); } }}
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      {["/افاتار.png","/افاتار بنت.png"].map((av) => {
                        const isSelected = selectedAvatar === av || (!selectedAvatar && photoBase64 === av);
                        return (
                          <div key={av} className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setSelectedAvatar(av); setPhotoBase64(av); }}
                              className={`relative h-16 w-16 rounded-full overflow-hidden border ${isSelected ? 'border-[#ee7b3d]' : 'border-gray-200'} shadow-sm bg-white`}
                            >
                              <img src={av} alt="avatar option" className="h-full w-full object-cover" />
                            </button>
                            <div className={`h-4 w-4 rounded-full border ${isSelected ? 'bg-[#ee7b3d] border-[#ee7b3d]' : 'bg-white border-gray-300'} flex items-center justify-center` }>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {errors.photo && (<p className="text-red-600 text-xs mt-1">{errors.photo}</p>)}
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
                  {errors.experience && (<p className="text-red-600 text-xs mt-1">{errors.experience}</p>)}
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
                  <div className="group relative h-24 w-24 rounded-full overflow-hidden border border-gray-200 shadow-sm bg-white">
                    {logoBase64 ? (
                      <img src={logoBase64} alt="logo" className="h-full w-full object-contain" />
                    ) : null}
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

        <div className="relative bg-[#f5f7fb] p-8 hidden md:flex items-center justify-center">
          <div className="pointer-events-none">
            <BookOpen className="absolute left-8 top-8 h-8 w-8 text-[#2c4656]/20" />
            <Atom className="absolute right-10 top-20 h-10 w-10 text-[#2c4656]/15" />
            <FlaskConical className="absolute left-1/3 bottom-10 h-9 w-9 text-[#2c4656]/20" />
            <Sigma className="absolute right-1/4 bottom-16 h-8 w-8 text-[#2c4656]/15" />
            <Languages className="absolute left-12 bottom-24 h-9 w-9 text-[#2c4656]/15" />
            <BookOpen className="absolute left-24 top-32 h-6 w-6 text-[#2c4656]/20" />
            <Atom className="absolute right-24 top-10 h-7 w-7 text-[#2c4656]/15" />
            <FlaskConical className="absolute left-10 top-1/2 h-6 w-6 text-[#2c4656]/20" />
            <Sigma className="absolute right-8 top-1/3 h-7 w-7 text-[#2c4656]/15" />
            <Languages className="absolute left-1/4 top-16 h-6 w-6 text-[#2c4656]/15" />
            <BookOpen className="absolute right-1/3 bottom-8 h-6 w-6 text-[#2c4656]/20" />
            <Atom className="absolute left-1/2 bottom-20 h-5 w-5 text-[#2c4656]/15" />
            <FlaskConical className="absolute right-16 bottom-6 h-6 w-6 text-[#2c4656]/20" />
            <Sigma className="absolute left-20 bottom-14 h-5 w-5 text-[#2c4656]/15" />
            <Languages className="absolute right-1/2 top-24 h-6 w-6 text-[#2c4656]/15" />
          </div>
          <div className="text-center">
            <div className={`${language === 'ar' ? 'font-arabicBrand font-extrabold' : 'font-extrabold'} text-[#2c4656] transition-all duration-500 ${animateOut ? '-translate-y-5 opacity-0' : (animateIn ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100')} text-4xl md:text-5xl`}>
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

const countryOptions = [
  { v: 'SA', nAr: 'السعودية', nEn: 'Saudi Arabia', d: '966' },
  { v: 'EG', nAr: 'مصر', nEn: 'Egypt', d: '20' },
  { v: 'AE', nAr: 'الإمارات', nEn: 'United Arab Emirates', d: '971' },
  { v: 'KW', nAr: 'الكويت', nEn: 'Kuwait', d: '965' },
  { v: 'BH', nAr: 'البحرين', nEn: 'Bahrain', d: '973' },
  { v: 'QA', nAr: 'قطر', nEn: 'Qatar', d: '974' },
  { v: 'OM', nAr: 'عمان', nEn: 'Oman', d: '968' },
  { v: 'JO', nAr: 'الأردن', nEn: 'Jordan', d: '962' },
  { v: 'LB', nAr: 'لبنان', nEn: 'Lebanon', d: '961' },
  { v: 'PS', nAr: 'فلسطين', nEn: 'Palestine', d: '970' },
  { v: 'IQ', nAr: 'العراق', nEn: 'Iraq', d: '964' },
  { v: 'SY', nAr: 'سوريا', nEn: 'Syria', d: '963' },
  { v: 'MA', nAr: 'المغرب', nEn: 'Morocco', d: '212' },
  { v: 'DZ', nAr: 'الجزائر', nEn: 'Algeria', d: '213' },
  { v: 'TN', nAr: 'تونس', nEn: 'Tunisia', d: '216' },
  { v: 'LY', nAr: 'ليبيا', nEn: 'Libya', d: '218' },
  { v: 'SD', nAr: 'السودان', nEn: 'Sudan', d: '249' },
  { v: 'YE', nAr: 'اليمن', nEn: 'Yemen', d: '967' },
  { v: 'US', nAr: 'الولايات المتحدة', nEn: 'United States', d: '1' },
  { v: 'GB', nAr: 'المملكة المتحدة', nEn: 'United Kingdom', d: '44' },
  { v: 'DE', nAr: 'ألمانيا', nEn: 'Germany', d: '49' },
  { v: 'FR', nAr: 'فرنسا', nEn: 'France', d: '33' },
  { v: 'ES', nAr: 'إسبانيا', nEn: 'Spain', d: '34' },
  { v: 'IT', nAr: 'إيطاليا', nEn: 'Italy', d: '39' },
  { v: 'TR', nAr: 'تركيا', nEn: 'Turkey', d: '90' },
  { v: 'IN', nAr: 'الهند', nEn: 'India', d: '91' },
  { v: 'PK', nAr: 'باكستان', nEn: 'Pakistan', d: '92' },
  { v: 'BD', nAr: 'بنغلاديش', nEn: 'Bangladesh', d: '880' },
  { v: 'ID', nAr: 'إندونيسيا', nEn: 'Indonesia', d: '62' },
  { v: 'PH', nAr: 'الفلبين', nEn: 'Philippines', d: '63' },
  { v: 'MY', nAr: 'ماليزيا', nEn: 'Malaysia', d: '60' },
  { v: 'SG', nAr: 'سنغافورة', nEn: 'Singapore', d: '65' },
  { v: 'CN', nAr: 'الصين', nEn: 'China', d: '86' },
  { v: 'JP', nAr: 'اليابان', nEn: 'Japan', d: '81' },
  { v: 'KR', nAr: 'كوريا الجنوبية', nEn: 'South Korea', d: '82' },
  { v: 'RU', nAr: 'روسيا', nEn: 'Russia', d: '7' },
  { v: 'UA', nAr: 'أوكرانيا', nEn: 'Ukraine', d: '380' },
  { v: 'SE', nAr: 'السويد', nEn: 'Sweden', d: '46' },
  { v: 'NO', nAr: 'النرويج', nEn: 'Norway', d: '47' },
  { v: 'DK', nAr: 'الدنمارك', nEn: 'Denmark', d: '45' },
  { v: 'NL', nAr: 'هولندا', nEn: 'Netherlands', d: '31' },
  { v: 'BE', nAr: 'بلجيكا', nEn: 'Belgium', d: '32' },
  { v: 'CH', nAr: 'سويسرا', nEn: 'Switzerland', d: '41' },
  { v: 'AT', nAr: 'النمسا', nEn: 'Austria', d: '43' },
  { v: 'GR', nAr: 'اليونان', nEn: 'Greece', d: '30' },
  { v: 'PT', nAr: 'البرتغال', nEn: 'Portugal', d: '351' },
  { v: 'IE', nAr: 'إيرلندا', nEn: 'Ireland', d: '353' },
  { v: 'ZA', nAr: 'جنوب أفريقيا', nEn: 'South Africa', d: '27' },
  { v: 'NG', nAr: 'نيجيريا', nEn: 'Nigeria', d: '234' },
  { v: 'KE', nAr: 'كينيا', nEn: 'Kenya', d: '254' },
];

const countryDial: Record<string, string> = countryOptions.reduce((acc, c) => { acc[c.v] = c.d; return acc; }, {} as Record<string, string>);
const countryMaxLen: Record<string, number> = {
  SA: 9,
  EG: 10,
  AE: 9,
  KW: 8,
  BH: 8,
  QA: 8,
  OM: 8,
  JO: 9,
  LB: 8,
  PS: 9,
  IQ: 10,
  SY: 9,
  MA: 9,
  DZ: 9,
  TN: 8,
  LY: 9,
  SD: 9,
  YE: 9,
  US: 10,
  GB: 10,
  DE: 10,
  FR: 9,
  ES: 9,
  IT: 10,
  TR: 10,
  IN: 10,
  PK: 10,
  BD: 10,
  ID: 10,
  PH: 10,
  MY: 10,
  SG: 8,
  CN: 11,
  JP: 10,
  KR: 10,
  RU: 10,
  UA: 9,
  SE: 9,
  NO: 8,
  DK: 8,
  NL: 9,
  BE: 9,
  CH: 9,
  AT: 10,
  GR: 10,
  PT: 9,
  IE: 9,
  ZA: 9,
  NG: 10,
  KE: 9,
};

const flagEmoji = (cc: string) => {
  const up = cc.trim().toUpperCase();
  if (up.length !== 2) return '';
  const codePoints = Array.from(up).map((ch) => 127397 + ch.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default Onboarding;