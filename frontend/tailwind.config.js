/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B19',
          900: '#0B132B',
          800: '#111C3A',
          700: '#1C2541',
          600: '#2A3B66',
          500: '#3A506B',
        },
        brand: {
          blue: '#00A8E8',
          deepBlue: '#007EA7',
          teal: '#00F5D4',
          cyan: '#2EC4B6',
          accent: '#06D6A0',
          warning: '#FFD166',
          danger: '#EF476F'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

