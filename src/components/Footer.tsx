import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 mt-auto" dir="rtl">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-white mb-4">أكاديمية منارة</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              منصة تعليمية متقدمة تهدف إلى تقديم أفضل تجربة تعليمية للطلاب والمعلمين
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-4">روابط سريعة</h4>
            <div className="flex flex-col gap-3">
              <Link to="/about" className="text-slate-300 hover:text-white transition-colors text-sm">
                حول المنصة
              </Link>
              <Link to="/support" className="text-slate-300 hover:text-white transition-colors text-sm">
                الدعم الفني
              </Link>
              <Link to="/privacy" className="text-slate-300 hover:text-white transition-colors text-sm">
                سياسة الخصوصية
              </Link>
              <Link to="/terms" className="text-slate-300 hover:text-white transition-colors text-sm">
                الشروط والأحكام
              </Link>
            </div>
          </div>

          {/* Social Media */}
          <div className="text-center md:text-right">
            <h4 className="text-lg font-semibold text-white mb-4">تابعنا</h4>
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-8 pt-6 text-center">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} أكاديمية منارة. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};
