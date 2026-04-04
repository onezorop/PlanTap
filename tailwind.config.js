/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#f7f7f5',
          sidebar: '#ffffff',
          card: '#ffffff',
          border: '#e5e5e5',
          text: '#37352f',
          textSecondary: '#6b6b6b',
          hover: '#efefef',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss/nesting'),
  ],
}
