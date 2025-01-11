/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
           keyframes: { fadeIn: { from: {opacity:0}, to: {opacity:1} } },
           animation: { fadeIn: 'fadeIn 0.3s ease-out' }
         }
  },
  plugins: [],
};
