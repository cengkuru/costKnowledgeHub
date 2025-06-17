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
          teal:      '#355E69', // primary brand teal
          cyan:      '#0AAEA0', // secondary accent
          amber:     '#F0AD4E', // highlight / call‑to‑action
          charcoal:  '#1F1F1F', // dark neutral text
          gray:      '#F5F6F7', // light neutral background
          white:     '#FFFFFF'  // white base
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

