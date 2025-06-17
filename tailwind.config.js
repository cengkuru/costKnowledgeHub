/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
    "./src/**/*.{js,jsx,ts,tsx,vue}"
  ],
  theme: {
    extend: {
      colors: {
        cost: {
          teal:      '#355E69', // primary brand teal - headers, navigation, primary CTAs
          cyan:      '#0AAEA0', // secondary accent - highlights, secondary buttons
          amber:     '#F0AD4E', // call-to-action - warnings, important buttons, badges
          charcoal:  '#1F1F1F', // text - primary text, dark content
          gray:      '#F5F6F7', // background - light surfaces, cards, sections
          white:     '#FFFFFF', // base - primary background, card backgrounds
          // Additional shades for C40-style depth
          'teal-50':  '#f0f8f8',
          'teal-100': '#d1ecec',
          'teal-200': '#a3d9d9',
          'teal-600': '#2d4f57',
          'teal-700': '#253f45',
          'teal-800': '#1d3034',
          'cyan-50':  '#f0fdfc',
          'cyan-100': '#d1fbf8',
          'cyan-600': '#089990',
          'amber-50': '#fffaf0',
          'amber-100': '#fef3e0',
          'amber-600': '#d69e42'
        },
        // Semantic colors matching C40
        primary: '#355E69',
        secondary: '#0AAEA0',
        accent: '#F0AD4E',
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'monospace']
      },
      fontSize: {
        'xs': '0.75rem',    // 12px
        'sm': '0.875rem',   // 14px
        'base': '1rem',     // 16px
        'lg': '1.125rem',   // 18px
        'xl': '1.25rem',    // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.1)',
        'card-hover': '0 8px 16px rgba(0,0,0,0.15)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-hover': '0 20px 40px rgba(0, 0, 0, 0.15)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'fadeInScale': 'fadeInScale 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translate3d(0, 20px, 0)'
          },
          'to': {
            opacity: '1',
            transform: 'translate3d(0, 0, 0)'
          }
        },
        fadeInScale: {
          'from': {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)'
          },
          '33%': {
            transform: 'translateY(-10px) rotate(1deg)'
          },
          '66%': {
            transform: 'translateY(5px) rotate(-1deg)'
          }
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%) skewX(-12deg)'
          },
          '100%': {
            transform: 'translateX(200%) skewX(-12deg)'
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

