/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rose: { 50: '#fff1f5', 100: '#ffe4ec', 500: '#d92d70', 600: '#b4235f', 700: '#8f1d4b' },
        graphite: { 50: '#f9fafb', 100: '#f2f4f7', 200: '#e4e7ec', 500: '#667085', 700: '#344054', 900: '#182230' }
      },
    },
  },
  plugins: [],
}
