/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'betopia-navy': '#2C3646',
        'betopia-orange': '#FF8C42',
        'betopia-gray': '#6B7280',
        'betopia-light': '#F3F4F6',
        'betopia-dark': '#1a202c',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-subtle': 'linear-gradient(to bottom, #ffffff, #F3F4F6)',
        'gradient-hero': 'linear-gradient(135deg, #ffffff 0%, #F3F4F6 100%)',
      },
    },
  },
  plugins: [],
}
