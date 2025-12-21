/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'xp-blue': '#0054E3',
        'xp-title': '#0997FF',
        'xp-gray': '#ECE9D8',
        'xp-border': '#0054E3',
      },
      fontFamily: {
        'xp': ['"Tahoma"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
