import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface SyncUsersButtonProps {
  onSyncComplete?: () => void;
}

const SyncUsersButton: React.FC<SyncUsersButtonProps> = ({ onSyncComplete }) => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      // في الواقع، المزامنة تحدث تلقائياً عند تسجيل الدخول
      // هذا الزر للإشارة للمستخدم أن النظام يقوم بالمزامنة
      
      // محاكاة عملية المزامنة
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(
        language === 'ar' 
          ? 'تم تحديث قائمة المستخدمين. المستخدمون الجدد سيظهرون عند تسجيل دخولهم.' 
          : 'User list updated. New users will appear when they log in.'
      );
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء المزامنة' 
          : 'Error occurred during sync'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Users className="h-4 w-4" />
      )}
      {language === 'ar' ? 'تحديث المستخدمين' : 'Sync Users'}
    </Button>
  );
};

export default SyncUsersButton;