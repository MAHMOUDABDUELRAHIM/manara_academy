import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'ar' | 'en');
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50" dir="ltr">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/Header-Logo.png" 
            alt="Manara Academy Logo" 
            className="h-12 w-auto object-contain"
          />
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link to="/" className="hidden md:block text-sm font-medium text-foreground hover:text-primary transition-colors">
            {t('home')}
          </Link>
          
          {/* Language Switcher */}
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-auto min-w-[140px] h-9">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇪🇬</span>
                  <span>العربية</span>
                </div>
              </SelectItem>
              <SelectItem value="en">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span>
                  <span>English</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Login Button */}
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">
              {t('login')}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};
