/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edulink: {
          // Global Colors (exact match from reference theme)
          background: '#ffffff',
          default: '#444444',
          heading: '#37423b',
          accent: '#1ab8aa',
          surface: '#ffffff',
          contrast: '#ffffff',
          
          // Navigation Colors (exact match from reference theme)
          nav: '#272828',
          'nav-hover': '#5fcf80',
          'nav-mobile-background': '#ffffff',
          'nav-dropdown-background': '#ffffff',
          'nav-dropdown': '#272828',
          'nav-dropdown-hover': '#5fcf80',
          
          // Color Presets (exact match from reference theme)
          'light-background': '#f9f9f9',
          'dark-background': '#060606',
          'dark-surface': '#252525',
          
          // Status colors (matching reference theme usage)
          success: '#5fcf80',
          warning: '#f0ad4e',
          error: '#d9534f',
          info: '#5bc0de',
          
          // Additional colors for reference
          primary: '#1ab8aa',
          secondary: '#5fcf80',
          
          // Neutral colors (kept for utility)
          gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          }
        }
      },
      fontFamily: {
        'open-sans': ['"Open Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', '"Liberation Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        'raleway': ['Raleway', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'default': ['"Open Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', '"Liberation Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        'heading': ['Raleway', 'sans-serif'],
        'nav': ['Poppins', 'sans-serif'],
      },
      // Extended spacing to match existing design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Custom shadows matching existing design
      boxShadow: {
        'edulink': '0 0 30px rgba(0, 0, 0, 0.1)',
        'edulink-lg': '0 0 35px rgba(0, 0, 0, 0.1)',
      },
      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}