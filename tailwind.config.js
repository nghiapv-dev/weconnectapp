/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      flex: {
        '2': '2 2 0%',
      },
      width: {
        '15': '3.75rem',
        '25': '6.25rem',
      },
      height: {
        '15': '3.75rem', 
        '25': '6.25rem',
        '62': '15.5rem',
        '75': '18.75rem',
        '96': '24rem',
      },
      colors: {
        primary: '#5183fe',
        secondary: '#1a73e8',
        background: '#ffffff',
        darkBackground: '#1e1e1e',
        cardBackground: '#f5f5f5',
        darkCardBackground: '#2a2a2a',
        text: '#333333',
        darkText: '#ffffff',
        border: '#e0e0e0',
        darkBorder: '#404040',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
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
        pulseRing: {
          '0%': {
            transform: 'scale(0.33)',
          },
          '40%, 50%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(1.03)',
          },
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}