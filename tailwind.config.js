/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cetus: {
          primary: '#6366f1',
          secondary: '#818cf8',
          dark: '#0f0f23',
          card: '#1a1a2e',
          accent: '#00d4aa',
        }
      }
    },
  },
  plugins: [],
}
