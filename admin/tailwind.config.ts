import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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
export default config
