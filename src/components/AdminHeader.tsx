import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

const AdminHeader: React.FC = () => {
  const { language, t } = useLanguage();
  const [adminName] = useState('Admin User');

  return (
    <header className="bg-background border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center">
        <Link to="/admin-dashboard" className="flex items-center space-x-2">
          <img 
            src="/Header-Logo.png" 
            alt="Manara Academy" 
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* Admin Profile Dropdown */}
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 hover:bg-accent/50 px-3 py-2 h-auto"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" alt={adminName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {adminName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">
                  {adminName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'مدير النظام' : 'System Admin'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            align="end" 
            className="w-56 mt-2"
            sideOffset={5}
          >
            <DropdownMenuItem asChild>
              <Link 
                to="/admin/profile" 
                className="flex items-center space-x-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link 
                to="/admin/settings" 
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="flex items-center space-x-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={() => {
                // Handle logout logic here
                console.log('Admin logout');
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;