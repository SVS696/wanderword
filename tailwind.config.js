/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        doto: ['Doto', 'sans-serif'],
      },
      colors: {
        mint: '#ACD8C9',
        'mint-dark': '#97C8B9',
      }
    },
  },
  plugins: [],
}
