import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6f6ff',
          100: '#eae8ff',
          200: '#d3ccff',
          300: '#b6a6ff',
          400: '#9a80ff',
          500: '#7f5cff',
          600: '#6439f6',
          700: '#542ed1',
          800: '#4325a6',
          900: '#34207f',
        },
      },
      boxShadow: {
        card: '0 6px 20px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [forms, typography],
};
