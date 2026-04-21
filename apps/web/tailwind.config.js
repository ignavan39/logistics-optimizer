/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f1a',
        surface: '#1a1a2e',
        'surface-hover': '#242442',
        border: '#2a2a4a',
        text: {
          primary: '#e8e8e8',
          secondary: '#8888a0',
          muted: '#5a5a70',
        },
        accent: {
          lavender: '#a8d8ea',
          mint: '#a8e6cf',
          peach: '#ffb7b2',
          lilac: '#c3b1e1',
          sky: '#87ceeb',
        },
        status: {
          success: '#a8e6cf',
          warning: '#ffd93d',
          error: '#ff6b6b',
          info: '#a8d8ea',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}