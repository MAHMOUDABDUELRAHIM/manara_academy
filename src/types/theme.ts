// Theme types for teacher customization
export interface TeacherTheme {
  id: string;
  teacherId: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Branding
  logoUrl?: string;
  brandName?: string;
  welcomeMessage?: string;
  
  // Layout
  cardStyle: 'default' | 'rounded' | 'minimal' | 'modern';
  backgroundPattern?: 'gradient' | 'solid' | 'pattern';
  
  // Typography
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  
  // Custom CSS (for advanced users)
  customCSS?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  nameAr: string;
  preview: string;
  theme: Partial<TeacherTheme>;
}

// Default theme presets
export const defaultThemePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default Blue',
    nameAr: 'الأزرق الافتراضي',
    preview: '/theme-previews/default.png',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#F8FAFC',
      textColor: '#1F2937',
      cardStyle: 'default',
      backgroundPattern: 'gradient'
    }
  },
  {
    id: 'green',
    name: 'Nature Green',
    nameAr: 'الأخضر الطبيعي',
    preview: '/theme-previews/green.png',
    theme: {
      primaryColor: '#10B981',
      secondaryColor: '#059669',
      backgroundColor: '#F0FDF4',
      textColor: '#1F2937',
      cardStyle: 'rounded',
      backgroundPattern: 'gradient'
    }
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    nameAr: 'البنفسجي الملكي',
    preview: '/theme-previews/purple.png',
    theme: {
      primaryColor: '#8B5CF6',
      secondaryColor: '#7C3AED',
      backgroundColor: '#FAFAF9',
      textColor: '#1F2937',
      cardStyle: 'modern',
      backgroundPattern: 'gradient'
    }
  }
];