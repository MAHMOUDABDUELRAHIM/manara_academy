import { useState, useEffect } from 'react';
import { TeacherTheme, defaultThemePresets } from '../types/theme';

// Hook for managing teacher themes
export const useTeacherTheme = (teacherId?: string) => {
  const [theme, setTheme] = useState<TeacherTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    loadTeacherTheme(teacherId);
  }, [teacherId]);

  const loadTeacherTheme = async (teacherId: string) => {
    try {
      setLoading(true);
      setError(null);

      // For now, return default theme
      // In the future, this will fetch from the database
      const defaultTheme: TeacherTheme = {
        id: `theme_${teacherId}`,
        teacherId,
        ...defaultThemePresets[0].theme,
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        backgroundColor: '#F8FAFC',
        textColor: '#1F2937',
        cardStyle: 'default',
        backgroundPattern: 'gradient',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      setTheme(defaultTheme);
    } catch (err) {
      setError('Failed to load teacher theme');
      console.error('Error loading teacher theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (updates: Partial<TeacherTheme>) => {
    if (!theme) return;

    try {
      const updatedTheme = {
        ...theme,
        ...updates,
        updatedAt: new Date()
      };

      // In the future, this will save to the database
      setTheme(updatedTheme);
      
      return updatedTheme;
    } catch (err) {
      setError('Failed to update theme');
      console.error('Error updating theme:', err);
      throw err;
    }
  };

  const resetToDefault = () => {
    if (!teacherId) return;

    const defaultTheme: TeacherTheme = {
      id: `theme_${teacherId}`,
      teacherId,
      ...defaultThemePresets[0].theme,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#F8FAFC',
      textColor: '#1F2937',
      cardStyle: 'default',
      backgroundPattern: 'gradient',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    setTheme(defaultTheme);
  };

  // Generate CSS variables for the theme
  const getThemeStyles = () => {
    if (!theme) return {};

    return {
      '--theme-primary': theme.primaryColor,
      '--theme-secondary': theme.secondaryColor,
      '--theme-background': theme.backgroundColor,
      '--theme-text': theme.textColor,
      '--theme-font-family': theme.fontFamily || 'inherit',
    } as React.CSSProperties;
  };

  return {
    theme,
    loading,
    error,
    updateTheme,
    resetToDefault,
    getThemeStyles
  };
};