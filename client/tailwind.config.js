/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bni: {
          red: '#CF2030',
          'red-dark': '#9E1522',
          'red-light': '#FDF0F1',
          gold: '#C9A24B',
          'gold-light': '#FAF5E9',
          'gold-dark': '#9A7727',
          cream: '#FBF8F3',
          charcoal: '#1C1917',
          gray: '#4A4A4A',
          'gray-light': '#F3F4F6',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(28, 25, 23, 0.06), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(28, 25, 23, 0.1), 0 8px 10px -6px rgba(28, 25, 23, 0.05)',
        'gold-glow': '0 0 20px rgba(201, 162, 75, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
