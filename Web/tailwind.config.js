/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        // CoST Primary Colors
        'cost-red': {
          50: '#FDF2F4',
          100: '#FCE7EA',
          200: '#F8D0D6',
          300: '#F2A9B5',
          400: '#E8768A',
          500: '#C41E3A',
          600: '#A81932',
          700: '#8C152A',
          800: '#761326',
          900: '#641425',
          DEFAULT: '#C41E3A',
        },
        'cost-blue': {
          50: '#EDF5F7',
          100: '#D4E8EE',
          200: '#B8D9E3',
          300: '#92C5D3',
          400: '#6DAFC2',
          500: '#5B9FB5',
          600: '#4A8A9E',
          700: '#3D7385',
          800: '#335F6D',
          900: '#2C505C',
          DEFAULT: '#5B9FB5',
        },
        'cost-yellow': {
          50: '#FEFBF0',
          100: '#FDF6DC',
          200: '#FAECB8',
          300: '#F7E08B',
          400: '#F4D35E',
          500: '#F4C542',
          600: '#E5B020',
          700: '#BF9219',
          800: '#997416',
          900: '#7D5F14',
          DEFAULT: '#F4C542',
        },
        // CoST Neutral Colors
        'cost-dark': '#2C2C2C',
        'cost-medium': '#6B6B6B',
        'cost-light': '#B8B8A8',
        'cost-offwhite': '#F5F5F5',
        'cost-white': '#FFFFFF',
        // CoST Accent Colors
        'cost-pink': '#E8B4B4',
      },
      fontSize: {
        'xxl': '1.75rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
        'fluid-sm': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        'fluid-base': 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.5rem)',
        'fluid-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.75rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',
        'fluid-4xl': 'clamp(2.25rem, 1.75rem + 2.5vw, 3rem)',
        'fluid-5xl': 'clamp(3rem, 2rem + 5vw, 4rem)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
