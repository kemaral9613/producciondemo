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
        industrial: {
          50: '#f4f6f8',
          100: '#e7ebf0',
          200: '#cbd4e1',
          300: '#a2b3cb',
          400: '#738cb0',
          500: '#536f96',
          600: '#415778',
          700: '#354762',
          800: '#2f3d52',
          900: '#2b3546',
          950: '#1c222f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
