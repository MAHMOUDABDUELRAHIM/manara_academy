import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  key: string;
  test: (password: string) => boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const { t, language } = useLanguage();

  const requirements: PasswordRequirement[] = [
    {
      key: 'minLength',
      test: (pwd) => pwd.length >= 8
    },
    {
      key: 'hasUppercase',
      test: (pwd) => /[A-Z]/.test(pwd)
    },
    {
      key: 'hasLowercase',
      test: (pwd) => /[a-z]/.test(pwd)
    },
    {
      key: 'hasNumber',
      test: (pwd) => /\d/.test(pwd)
    },
    {
      key: 'hasSpecialChar',
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
  ];

  const getPasswordStrength = () => {
    const passedRequirements = requirements.filter(req => req.test(password)).length;
    return (passedRequirements / requirements.length) * 100;
  };

  const getStrengthLabel = () => {
    const strength = getPasswordStrength();
    if (strength === 0) return t('passwordStrengthVeryWeak');
    if (strength <= 40) return t('passwordStrengthWeak');
    if (strength <= 60) return t('passwordStrengthFair');
    if (strength <= 80) return t('passwordStrengthGood');
    return t('passwordStrengthStrong');
  };

  const getStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength <= 20) return 'bg-red-500';
    if (strength <= 40) return 'bg-orange-500';
    if (strength <= 60) return 'bg-yellow-500';
    if (strength <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (!password) return null;

  return (
    <div className={`mt-3 p-3 bg-gray-50 rounded-lg border ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('passwordStrength')}
          </span>
          <span className="text-sm text-gray-600">
            {getStrengthLabel()}
          </span>
        </div>
        <Progress 
          value={getPasswordStrength()} 
          className="h-2"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {t('passwordRequirements')}
        </p>
        {requirements.map((requirement) => {
          const isPassed = requirement.test(password);
          return (
            <div key={requirement.key} className="flex items-center gap-2 text-sm">
              {isPassed ? (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <span className={isPassed ? 'text-green-700' : 'text-gray-600'}>
                {t(`passwordRequirement${requirement.key.charAt(0).toUpperCase() + requirement.key.slice(1)}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;