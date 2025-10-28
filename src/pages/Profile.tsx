import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import FloatingSupportChat from '@/components/FloatingSupportChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Globe, Lock, Award, Download, Eye, EyeOff } from 'lucide-react';

interface Certificate {
  id: string;
  title: string;
  titleAr: string;
  course: string;
  courseAr: string;
  issueDate: string;
  issueDateAr: string;
  certificateUrl: string;
  grade: string;
  gradeAr: string;
}

const Profile = () => {
  const { language } = useLanguage();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    fullName: 'أحمد محمد علي',
    email: 'ahmed.mohamed@example.com',
    language: 'ar'
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Mock certificates data
  const certificates: Certificate[] = [
    {
      id: '1',
      title: 'Web Development Completion Certificate',
      titleAr: 'شهادة إتمام تطوير الويب',
      course: 'Complete Web Development Bootcamp',
      courseAr: 'دورة تطوير الويب الشاملة',
      issueDate: 'March 15, 2024',
      issueDateAr: '15 مارس 2024',
      certificateUrl: '/certificates/web-dev-cert.pdf',
      grade: 'Excellent',
      gradeAr: 'ممتاز'
    },
    {
      id: '2',
      title: 'React Development Certificate',
      titleAr: 'شهادة تطوير React',
      course: 'Advanced React Development',
      courseAr: 'تطوير React المتقدم',
      issueDate: 'February 28, 2024',
      issueDateAr: '28 فبراير 2024',
      certificateUrl: '/certificates/react-cert.pdf',
      grade: 'Very Good',
      gradeAr: 'جيد جداً'
    },
    {
      id: '3',
      title: 'UI/UX Design Certificate',
      titleAr: 'شهادة تصميم واجهة المستخدم',
      course: 'UI/UX Design Masterclass',
      courseAr: 'دورة تصميم واجهة المستخدم الشاملة',
      issueDate: 'January 20, 2024',
      issueDateAr: '20 يناير 2024',
      certificateUrl: '/certificates/uiux-cert.pdf',
      grade: 'Good',
      gradeAr: 'جيد'
    }
  ];

  const translations = {
    en: {
      profile: 'Profile',
      personalInfo: 'Personal Information',
      fullName: 'Full Name',
      email: 'Email Address',
      languagePreference: 'Language Preference',
      arabic: 'Arabic',
      english: 'English',
      saveChanges: 'Save Changes',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      updatePassword: 'Update Password',
      certificates: 'My Certificates',
      noCertificates: 'No certificates earned yet',
      noCertificatesMessage: 'Complete courses to earn certificates and showcase your achievements.',
      issuedOn: 'Issued on',
      grade: 'Grade',
      download: 'Download',
      profileUpdated: 'Profile updated successfully!',
      passwordUpdated: 'Password updated successfully!',
      show: 'Show',
      hide: 'Hide'
    },
    ar: {
      profile: 'الملف الشخصي',
      personalInfo: 'المعلومات الشخصية',
      fullName: 'الاسم الكامل',
      email: 'عنوان البريد الإلكتروني',
      languagePreference: 'تفضيل اللغة',
      arabic: 'العربية',
      english: 'الإنجليزية',
      saveChanges: 'حفظ التغييرات',
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور الجديدة',
      updatePassword: 'تحديث كلمة المرور',
      certificates: 'شهاداتي',
      noCertificates: 'لم تحصل على شهادات بعد',
      noCertificatesMessage: 'أكمل الدورات للحصول على الشهادات وإظهار إنجازاتك.',
      issuedOn: 'صدرت في',
      grade: 'الدرجة',
      download: 'تحميل',
      profileUpdated: 'تم تحديث الملف الشخصي بنجاح!',
      passwordUpdated: 'تم تحديث كلمة المرور بنجاح!',
      show: 'إظهار',
      hide: 'إخفاء'
    }
  };

  const currentTranslations = translations[language as keyof typeof translations];

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle profile update logic here
    alert(currentTranslations.profileUpdated);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    // Handle password update logic here
    alert(currentTranslations.passwordUpdated);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleDownloadCertificate = (certificateUrl: string) => {
    // Handle certificate download logic here
    window.open(certificateUrl, '_blank');
  };

  const getGradeBadge = (grade: string) => {
    const gradeColors = {
      'Excellent': 'bg-green-100 text-green-800 border-green-200',
      'ممتاز': 'bg-green-100 text-green-800 border-green-200',
      'Very Good': 'bg-blue-100 text-blue-800 border-blue-200',
      'جيد جداً': 'bg-blue-100 text-blue-800 border-blue-200',
      'Good': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'جيد': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <Badge className={gradeColors[grade as keyof typeof gradeColors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {grade}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <DashboardHeader />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        <DashboardSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {currentTranslations.profile}
              </h1>
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? 'إدارة معلوماتك الشخصية وإعداداتك'
                  : 'Manage your personal information and settings'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Personal Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {currentTranslations.personalInfo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.fullName}
                      </label>
                      <Input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="border-input focus:border-primary focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.email}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className="pl-10 border-input focus:border-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.languagePreference}
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <select
                          value={profileData.language}
                          onChange={(e) => setProfileData({...profileData, language: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
                        >
                          <option value="ar">{currentTranslations.arabic}</option>
                          <option value="en">{currentTranslations.english}</option>
                        </select>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {currentTranslations.saveChanges}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {currentTranslations.changePassword}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.currentPassword}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="pl-10 pr-10 border-input focus:border-primary focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.newPassword}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="pl-10 pr-10 border-input focus:border-primary focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {currentTranslations.confirmPassword}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="pl-10 pr-10 border-input focus:border-primary focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {currentTranslations.updatePassword}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Certificates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {currentTranslations.certificates}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {certificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificates.map((certificate) => (
                      <Card key={certificate.id} className="border border-border hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-foreground text-sm line-clamp-2">
                                {language === 'ar' ? certificate.titleAr : certificate.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {language === 'ar' ? certificate.courseAr : certificate.course}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {currentTranslations.issuedOn}: {language === 'ar' ? certificate.issueDateAr : certificate.issueDate}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs text-muted-foreground">{currentTranslations.grade}: </span>
                                {getGradeBadge(language === 'ar' ? certificate.gradeAr : certificate.grade)}
                              </div>
                              
                              <Button
                                size="sm"
                                onClick={() => handleDownloadCertificate(certificate.certificateUrl)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {currentTranslations.download}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {currentTranslations.noCertificates}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {currentTranslations.noCertificatesMessage}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center text-sm text-muted-foreground h-16 flex items-center justify-center">
        © Manara Academy 2025 - {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </footer>
      
      <FloatingSupportChat />
    </div>
  );
};

export default Profile;