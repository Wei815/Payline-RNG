/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dashboard-bg': '#0a192f',
        'dashboard-card': '#112240',
        'dashboard-accent': '#64ffda',
        'dashboard-text-primary': '#e6f1ff',
        'dashboard-text-secondary': '#8892b0',
      }
    },
  },
  plugins: [],
}
