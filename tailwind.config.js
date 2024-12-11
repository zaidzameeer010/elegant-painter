/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#F8F9FE',
          100: '#F1F3F9',
          200: '#E4E7F0',
          400: '#9BA3AF',
          900: '#111827',
        }
      },
      boxShadow: {
        'lg': '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '4xl': '32px',
      }
    },
  },
  plugins: [],
}
