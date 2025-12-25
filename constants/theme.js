export const COLORS = {
    primary: '#059669', // Emerald 600
    primaryDark: '#047857', // Emerald 700
    primaryLight: '#34D399', // Emerald 400
    secondary: '#0D9488', // Teal 600

    background: '#F3F4F6', // Gray 100
    surface: '#FFFFFF',

    textPrimary: '#1F2937', // Gray 800
    textSecondary: '#4B5563', // Gray 600
    textLight: '#9CA3AF', // Gray 400
    textWhite: '#FFFFFF',

    success: '#10B981', // Emerald 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444', // Red 500

    border: '#E5E7EB', // Gray 200

    // Gradients or Accents
    gradientStart: '#059669',
    gradientEnd: '#34D399',
};

export const FONTS = {
    regular: 'Inter_400Regular',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 40,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, // increased slightly for better visibility
        shadowRadius: 6,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
};