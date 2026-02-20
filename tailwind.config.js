/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // NIILU Design System - Cores
      colors: {
        primary: {
          100: '#E7F3EE',
          300: '#4A8F73',
          400: '#2F6B52',
          500: '#1F4D3A', // Verde Floresta - Principal
          600: '#1A4331',
          700: '#16392B',
        },
        success: '#2E7D32',
        warning: '#F4B400',
        postpone: '#EF6C00',
        error: '#C62828',
        info: '#1976D2',
      },
      // NIILU Design System - Tipografia
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}