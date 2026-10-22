/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zhongwen: {
          50: '#fdf4f4',
          100: '#fbe8e8',
          200: '#f7d6d6',
          300: '#efb4b4',
          400: '#e38585',
          500: '#d35656',
          600: '#bf3b3b',
          700: '#a02e2e',
          800: '#842929',
          900: '#6e2727',
        },
        paper: {
          50: '#faf8f5',
          100: '#f4efe8',
          200: '#eae0d2',
          300: '#dcceb8',
        }
      },
      fontFamily: {
        serifZh: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', 'serif'],
        sansZh: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

