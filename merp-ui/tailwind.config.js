/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'merp-primary': '#1d4ed8',
        'merp-secondary': '#0f172a',
        'merp-accent': '#3b82f6',
        'merp-background': '#f8fafc',
        'merp-surface': '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
