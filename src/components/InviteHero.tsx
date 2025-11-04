import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Image as ImageIcon, Palette } from 'lucide-react';

interface InviteHeroProps {
  language: 'ar' | 'en';
  teacherFullName?: string;
  teacherPhotoURL?: string;
  teacherId?: string;
  isAuthenticated?: boolean;
  onSignOutClick?: () => void;
  heroTitleAr?: string;
  heroTitleEn?: string;
  heroDescAr?: string;
  heroDescEn?: string;
  // Optional inline edit mode for teacher editor session
  editable?: boolean;
  onTitleChange?: (text: string) => void;
  onDescChange?: (text: string) => void;
  // New: optional avatar override and frame style for the hero left illustration
  heroAvatarBase64?: string;
  frameStyle?: 'circle' | 'rounded' | 'square' | 'hexagon' | 'diamond';
  onAvatarUpload?: (base64: string) => void;
  onFrameStyleChange?: (style: 'circle' | 'rounded' | 'square' | 'hexagon' | 'diamond') => void;
  // New: hero theme (classic vs professional banner)
  heroTheme?: 'classic' | 'proBanner';
  onThemeChange?: (theme: 'classic' | 'proBanner') => void;
  // New: overlay texts that can be positioned on the banner image
  overlayTexts?: { id: string; textAr?: string; textEn?: string; xPct: number; yPct: number }[];
  onOverlayTextsChange?: (v: { id: string; textAr?: string; textEn?: string; xPct: number; yPct: number }[]) => void;
}

const getInitials = (name: string) => {
  if (!name) return 'T';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'T';
};

export const InviteHero: React.FC<InviteHeroProps> = ({
  language,
  teacherFullName,
  teacherPhotoURL,
  teacherId,
  isAuthenticated,
  onSignOutClick,
  heroTitleAr,
  heroTitleEn,
  heroDescAr,
  heroDescEn,
  editable,
  onTitleChange,
  onDescChange,
  heroAvatarBase64,
  frameStyle = 'circle',
  onAvatarUpload,
  onFrameStyleChange,
  heroTheme = 'classic',
  onThemeChange,
  overlayTexts,
  onOverlayTextsChange,
}) => {
  const titleArDefaultHTML = 'منصة <span class="text-blue-600">منارة</span> الأكاديمية';
  const titleEnDefaultHTML = 'Manara <span class="text-blue-600">Academy</span> Platform';
  const descArDefault = 'منصة متكاملة بها كل ما يحتاجه الطالب للتفوق';
  const descEnDefault = 'A complete platform with everything students need to excel';

  const titleHTML = language === 'ar'
    ? (heroTitleAr && heroTitleAr.length > 0 ? heroTitleAr : titleArDefaultHTML)
    : (heroTitleEn && heroTitleEn.length > 0 ? heroTitleEn : titleEnDefaultHTML);

  const descText = language === 'ar'
    ? (heroDescAr || descArDefault)
    : (heroDescEn || descEnDefault);

  // Local editing state for real transparent inputs
  const [titleValue, setTitleValue] = useState<string>(
    language === 'ar' ? (heroTitleAr || titleArDefaultHTML) : (heroTitleEn || titleEnDefaultHTML)
  );
  const [descValue, setDescValue] = useState<string>(
    language === 'ar' ? (heroDescAr || descArDefault) : (heroDescEn || descEnDefault)
  );
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const titleEditRef = useRef<HTMLDivElement | null>(null);
  const descEditRef = useRef<HTMLDivElement | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ left: number; top: number } | null>(null);
  const [selectionField, setSelectionField] = useState<'title' | 'desc' | null>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);

  // Keep local state in sync if props or language change
  useEffect(() => {
    setTitleValue(language === 'ar' ? (heroTitleAr || titleArDefaultHTML) : (heroTitleEn || titleEnDefaultHTML));
  }, [language, heroTitleAr, heroTitleEn]);
  useEffect(() => {
    setDescValue(language === 'ar' ? (heroDescAr || descArDefault) : (heroDescEn || descEnDefault));
  }, [language, heroDescAr, heroDescEn]);

  const inputDir = language === 'ar' ? 'rtl' : 'ltr';
  const inputAlign = language === 'ar' ? 'right' : 'left';

  const updateSelectionUI = (field: 'title' | 'desc') => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPos(null);
      setSelectionField(null);
      setShowColorMenu(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setSelectionPos(null);
      setSelectionField(null);
      setShowColorMenu(false);
      return;
    }
    setSelectionPos({ left: rect.left + rect.width / 2, top: rect.top - 10 });
    setSelectionField(field);
  };

  const applyColorToSelection = (hex: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, hex);
    setShowColorMenu(false);
  };

  // File input for avatar upload when editable
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleTriggerUpload = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file, { maxWidth: 640, maxHeight: 640, quality: 0.75, format: 'image/jpeg' });
      onAvatarUpload && onAvatarUpload(base64);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const fallback = String(reader.result || '');
        onAvatarUpload && onAvatarUpload(fallback);
      };
      reader.readAsDataURL(file);
    }
  };

  // Compress image to base64 with max dimensions and quality
  const compressImageFile = (file: File, opts: { maxWidth: number; maxHeight: number; quality: number; format: 'image/jpeg' | 'image/webp' }) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const origW = img.width;
          const origH = img.height;
          const ratio = Math.min(opts.maxWidth / origW, opts.maxHeight / origH, 1);
          const targetW = Math.max(1, Math.round(origW * ratio));
          const targetH = Math.max(1, Math.round(origH * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No canvas context')); return; }
          // Fill white background for JPEG to avoid black on transparent PNGs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          try {
            const base64 = canvas.toDataURL(opts.format, opts.quality);
            resolve(base64);
          } catch (err) {
            try {
              resolve(canvas.toDataURL());
            } catch (err2) {
              reject(err2);
            }
          }
        };
        img.onerror = reject;
        img.src = String(reader.result || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getFrameClasses = () => {
    switch (frameStyle) {
      case 'rounded':
        return 'rounded-2xl ring-8 ring-blue-200';
      case 'square':
        return 'rounded-none ring-8 ring-blue-200';
      case 'hexagon':
        return 'ring-8 ring-blue-200';
      case 'diamond':
        return 'ring-8 ring-blue-200 rotate-45';
      default:
        return 'rounded-full ring-8 ring-blue-200';
    }
  };

  const getInnerClip = () => {
    switch (frameStyle) {
      case 'rounded':
        return 'rounded-2xl';
      case 'square':
        return 'rounded-none';
      case 'hexagon':
        return '';
      case 'diamond':
        return '';
      default:
        return 'rounded-full';
    }
  };

  const getOuterStyle = () => {
    if (frameStyle === 'hexagon') {
      return { clipPath: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)' } as React.CSSProperties;
    }
    if (frameStyle === 'diamond') {
      return { transform: 'rotate(45deg)' } as React.CSSProperties;
    }
    return {} as React.CSSProperties;
  };

  const getInnerStyle = () => {
    if (frameStyle === 'hexagon') {
      return { clipPath: 'inherit' } as React.CSSProperties;
    }
    if (frameStyle === 'diamond') {
      return { transform: 'rotate(-45deg)' } as React.CSSProperties;
    }
    return {} as React.CSSProperties;
  };

  // Removed shape selection UI per request; frameStyle remains rendered if provided
  // Theme selector (classic vs professional banner)
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  return (
    <section className={`${heroTheme === 'proBanner' ? 'pt-6 md:pt-8 pb-16' : 'py-16'}`}>
      <div className={`${heroTheme === 'proBanner' ? 'w-full' : 'max-w-6xl mx-auto'} ${heroTheme === 'proBanner' ? 'px-0' : 'px-4'} grid grid-cols-1 md:grid-cols-2 ${heroTheme === 'proBanner' ? 'gap-0' : 'gap-10'} items-center`}>
        {/* Left: illustration / photo */}
        <div className={`order-2 md:order-1 ${heroTheme === 'proBanner' ? 'md:col-span-2' : ''} flex justify-center md:justify-start`}>
          {heroTheme === 'proBanner' ? (
            <div
              ref={bannerRef}
              className="relative w-full h-[32rem] md:h-[42rem] rounded-2xl overflow-hidden"
              onMouseUp={() => setDraggingId(null)}
              onMouseLeave={() => setDraggingId(null)}
              onMouseMove={(e) => {
                if (!draggingId || !bannerRef.current || !overlayTexts || !onOverlayTextsChange) return;
                const rect = bannerRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                const clampedX = Math.max(0, Math.min(100, x));
                const clampedY = Math.max(0, Math.min(100, y));
                const updated = overlayTexts.map(t => t.id === draggingId ? { ...t, xPct: clampedX, yPct: clampedY } : t);
                onOverlayTextsChange(updated);
              }}
            >
              {(heroAvatarBase64 || teacherPhotoURL) ? (
                <img
                  src={(heroAvatarBase64 || teacherPhotoURL) as string}
                  alt={teacherFullName || 'Teacher'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-extrabold">
                  {getInitials(teacherFullName || (language === 'ar' ? 'الأستاذ' : 'Teacher'))}
                </div>
              )}
              {/* Overall readability tint */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-black/15 to-transparent" />
              {/* Bottom color/tint overlay to blend with next section */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white/80 dark:to-slate-900/70" />

              {/* Additional draggable overlay texts */}
              {overlayTexts && overlayTexts.length > 0 && (
                overlayTexts.map(item => {
                  const displayText = language === 'ar' ? (item.textAr || '') : (item.textEn || '');
                  const stylePos: React.CSSProperties = {
                    left: `${item.xPct}%`,
                    top: `${item.yPct}%`,
                    transform: 'translate(-50%, -50%)',
                  };
                  return (
                    <div
                      key={item.id}
                      className="absolute z-20"
                      style={stylePos}
                      onMouseDown={() => { if (editable) setDraggingId(item.id); }}
                    >
                      {editable ? (
                        <textarea
                          value={displayText}
                          onChange={(e) => {
                            if (!overlayTexts || !onOverlayTextsChange) return;
                            const updated = overlayTexts.map(t => t.id === item.id ? (
                              language === 'ar' ? { ...t, textAr: e.target.value } : { ...t, textEn: e.target.value }
                            ) : t);
                            onOverlayTextsChange(updated);
                          }}
                          className="min-w-[160px] max-w-[360px] text-white/95 text-base md:text-lg font-semibold bg-black/20 border border-white/30 rounded-md px-2 py-1 shadow-sm backdrop-blur-[1px] focus:outline-none"
                          style={{ direction: language === 'ar' ? 'rtl' as any : 'ltr' as any }}
                          spellCheck={false}
                        />
                      ) : (
                        <div className="text-white text-lg md:text-xl font-semibold drop-shadow">
                          {displayText}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Editor controls on banner */}
              {editable && (
                <>
                  <button
                    type="button"
                    aria-label={language === 'ar' ? 'رفع صورة البنر' : 'Upload banner image'}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-blue-700 border border-blue-200 rounded-full p-2.5 shadow"
                    onClick={handleTriggerUpload}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  {/* Theme selector placed on banner in edit mode */}
                  <button
                    type="button"
                    aria-label={language === 'ar' ? 'اختيار ثيم الهيرو' : 'Choose hero theme'}
                    className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/90 hover:bg-white text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm shadow"
                    onClick={() => setShowThemeMenu(v => !v)}
                  >
                    <Palette className="w-4 h-4" />
                    {language === 'ar' ? 'الثيم' : 'Theme'}
                  </button>
                  {showThemeMenu && (
                    <div className="absolute z-20 top-12 left-2 bg-white border border-gray-200 rounded-md shadow p-2">
                      <button
                        className={`block w-full text-left px-3 py-2 rounded ${heroTheme === 'classic' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                        onClick={() => { onThemeChange && onThemeChange('classic'); setShowThemeMenu(false); }}
                      >
                        {language === 'ar' ? 'كلاسيكي (نص + إطار)' : 'Classic (Text + Frame)'}
                      </button>
                      <button
                        className={`block w-full text-left px-3 py-2 rounded ${heroTheme === 'proBanner' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                        onClick={() => { onThemeChange && onThemeChange('proBanner'); setShowThemeMenu(false); }}
                      >
                        {language === 'ar' ? 'بانر احترافي' : 'Professional Banner'}
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}

              {/* Overlay content: title, description and CTAs */}
              <div className={`absolute inset-0 flex items-center ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl ${language === 'ar' ? 'text-right mr-6 md:mr-10' : 'text-left ml-6 md:ml-10'}`}>
                  {editable ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      aria-label={language === 'ar' ? 'عنوان الدعوة' : 'Invite title'}
                      dir="rtl"
                      lang={language}
                      spellCheck={false}
                      onInput={(e) => {
                        const html = (e.currentTarget as HTMLDivElement).innerHTML;
                        setTitleValue(html);
                        onTitleChange && onTitleChange(html);
                      }}
                      onMouseUp={() => updateSelectionUI('title')}
                      onKeyUp={() => updateSelectionUI('title')}
                      className="text-white text-5xl md:text-6xl font-bold leading-tight mb-4 w-full bg-transparent border border-transparent focus:border-transparent outline-none"
                      style={{ direction: 'rtl', textAlign: 'right', lineHeight: '1.2', wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: titleValue }}
                    />
                  ) : (
                    <h1
                      className="text-white drop-shadow-md text-5xl md:text-6xl font-bold leading-tight mb-4"
                      dangerouslySetInnerHTML={{ __html: titleHTML }}
                    />
                  )}

                  {editable ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      aria-label={language === 'ar' ? 'وصف الدعوة' : 'Invite description'}
                      dir={inputDir}
                      lang={language}
                      spellCheck={false}
                      onInput={(e) => {
                        const html = (e.currentTarget as HTMLDivElement).innerHTML;
                        setDescValue(html);
                        onDescChange && onDescChange(html);
                      }}
                      onMouseUp={() => updateSelectionUI('desc')}
                      onKeyUp={() => updateSelectionUI('desc')}
                      className="text-white/90 text-xl mb-6 w-full bg-transparent border border-transparent focus:border-transparent outline-none"
                      style={{ direction: inputDir as any, textAlign: inputAlign as any, wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: descValue }}
                    />
                  ) : (
                    <p className="text-white/90 drop-shadow-sm text-xl mb-6" dangerouslySetInnerHTML={{ __html: descText }}></p>
                  )}

                  <div className={`flex flex-col sm:flex-row ${language === 'ar' ? 'justify-end' : 'justify-start'} items-center gap-4`}>
                    {!isAuthenticated ? (
                      <>
                        <a
                          href={teacherId ? '/register/student?teacherId=' + teacherId : '/register/student'}
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          {language === 'ar' ? 'اعمل حساب جديد' : 'Create New Account'}
                        </a>
                        <a
                          href={teacherId ? '/student-login?teacherId=' + teacherId : '/student-login'}
                          className="inline-block bg-white/95 border border-blue-600 text-blue-700 hover:bg-white px-6 py-3 rounded-lg font-medium transition-colors"
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
                          onClick={onSignOutClick}
                          className="inline-flex items-center bg-white/95 border border-blue-600 text-blue-700 hover:bg-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          <Loader2 className="w-4 h-4 mr-2 hidden" />
                          {language === 'ar' ? 'تسجيل خروج' : 'Sign Out'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`relative w-72 h-72 bg-blue-100 flex items-center justify-center ${getFrameClasses()}`} style={getOuterStyle()}>
              {heroAvatarBase64 || teacherPhotoURL ? (
                <img
                  src={(heroAvatarBase64 || teacherPhotoURL) as string}
                  alt={teacherFullName || 'Teacher'}
                  className={`w-64 h-64 object-cover ${getInnerClip()}`}
                  style={getInnerStyle()}
                />
              ) : (
                <div className={`w-64 h-64 ${getInnerClip()} bg-blue-500 text-white flex items-center justify-center text-5xl font-extrabold`} style={getInnerStyle()}>
                  {getInitials(teacherFullName || (language === 'ar' ? 'الأستاذ' : 'Teacher'))}
                </div>
              )}
              <span className="absolute -top-2 -left-2 bg-white text-blue-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'دعوة' : 'Invite'}</span>
              <span className="absolute -bottom-2 -right-2 bg-white text-indigo-600 text-xs px-2 py-1 rounded-full shadow">{language === 'ar' ? 'انضم' : 'Join'}</span>

              {editable && (
                <>
                  <button
                    type="button"
                    aria-label={language === 'ar' ? 'رفع صورة داخل الإطار' : 'Upload image into frame'}
                    className="absolute top-2 right-0 transform translate-x-1 bg-white/90 hover:bg-white text-blue-700 border border-blue-200 rounded-full p-2.5 shadow"
                    style={frameStyle === 'diamond' ? { transform: 'rotate(-45deg)' } : undefined}
                    onClick={handleTriggerUpload}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: headline + description + CTAs */}
        {heroTheme !== 'proBanner' && (
        <div className={`${language === 'ar' ? 'text-right' : 'text-left'} order-1 md:order-2`}>
          {editable && (
            <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'} mb-2 relative`}> 
              <button
                type="button"
                aria-label={language === 'ar' ? 'اختيار ثيم الهيرو' : 'Choose hero theme'}
                className="inline-flex items-center gap-1 bg-white/90 hover:bg-white text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm shadow"
                onClick={() => setShowThemeMenu(v => !v)}
              >
                <Palette className="w-4 h-4" />
                {language === 'ar' ? 'الثيم' : 'Theme'}
              </button>
              {showThemeMenu && (
                <div className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-md shadow p-2 right-0">
                  <button
                    className={`block w-full text-left px-3 py-2 rounded ${heroTheme === 'classic' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                    onClick={() => { onThemeChange && onThemeChange('classic'); setShowThemeMenu(false); }}
                  >
                    {language === 'ar' ? 'كلاسيكي (نص + إطار)' : 'Classic (Text + Frame)'}
                  </button>
                  <button
                    className={`block w-full text-left px-3 py-2 rounded ${heroTheme === 'proBanner' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                    onClick={() => { onThemeChange && onThemeChange('proBanner'); setShowThemeMenu(false); }}
                  >
                    {language === 'ar' ? 'بانر احترافي' : 'Professional Banner'}
                  </button>
                </div>
              )}
            </div>
          )}
          {editable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              aria-label={language === 'ar' ? 'عنوان الدعوة' : 'Invite title'}
              dir="rtl"
              lang={language}
              spellCheck={false}
              onInput={(e) => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML;
                setTitleValue(html);
                onTitleChange && onTitleChange(html);
              }}
              onMouseUp={() => updateSelectionUI('title')}
              onKeyUp={() => updateSelectionUI('title')}
              className="text-5xl md:text-6xl font-bold leading-tight mb-4 w-full bg-transparent border border-transparent focus:border-transparent outline-none"
              style={{ direction: 'rtl', textAlign: 'right', lineHeight: '1.2', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: titleValue }}
            />
          ) : (
            <h1
              className="text-5xl md:text-6xl font-bold leading-tight mb-4"
              dangerouslySetInnerHTML={{ __html: titleHTML }}
            />
          )}

          {editable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              aria-label={language === 'ar' ? 'وصف الدعوة' : 'Invite description'}
              dir={inputDir}
              lang={language}
              spellCheck={false}
              onInput={(e) => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML;
                setDescValue(html);
                onDescChange && onDescChange(html);
              }}
              onMouseUp={() => updateSelectionUI('desc')}
              onKeyUp={() => updateSelectionUI('desc')}
              className="text-gray-700 dark:text-gray-300 text-xl mb-6 w-full bg-transparent border border-transparent focus:border-transparent outline-none"
              style={{ direction: inputDir as any, textAlign: inputAlign as any, wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: descValue }}
            />
          ) : (
            <p
              className="text-gray-700 dark:text-gray-300 text-xl mb-6"
              dangerouslySetInnerHTML={{ __html: descText }}
            />
          )}
          <div className={`flex flex-col sm:flex-row ${language === 'ar' ? 'justify-end' : 'justify-start'} items-center gap-4`}>
            {/* Conditional CTA buttons based on login state */}
            {!isAuthenticated ? (
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
                  onClick={onSignOutClick}
                  className="inline-flex items-center bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Loader2 className="w-4 h-4 mr-2 hidden" />
                  {language === 'ar' ? 'تسجيل خروج' : 'Sign Out'}
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    {/* Floating color picker icon shown only when selecting text in edit mode */}
    {editable && selectionPos && selectionField && (
      <div
        className="fixed z-50"
        style={{ left: selectionPos.left, top: selectionPos.top }}
      >
        <button
          type="button"
          className="inline-flex items-center justify-center bg-white/95 border border-blue-200 text-blue-700 hover:bg-white rounded-full p-2 shadow"
          onClick={() => setShowColorMenu(v => !v)}
          aria-label={language === 'ar' ? 'اختيار لون النص المحدد' : 'Pick color for selected text'}
        >
          <Palette className="w-4 h-4" />
        </button>
        {showColorMenu && (
          <div className="mt-1 bg-white border border-gray-200 rounded-md shadow p-2 flex gap-1">
            {['#ffffff','#ffd700','#ff4d4f','#52c41a','#1677ff','#6b7280'].map(c => (
              <button
                key={c}
                type="button"
                className="w-6 h-6 rounded"
                style={{ backgroundColor: c }}
                onClick={() => applyColorToSelection(c)}
                aria-label={language === 'ar' ? `لون ${c}` : `Color ${c}`}
              />
            ))}
          </div>
        )}
      </div>
    )}
    </section>
  );
};

export default InviteHero;