/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        appwrite: {
          pink: '#fd366e',
          dark: '#19191d',
          card: '#202026',
          border: '#2e2e38',
        }
      }
    },
  },
  plugins: [],
}
