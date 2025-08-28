/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Databricks brand colors
        'databricks': {
          'orange': '#FF6B35',
          'blue': '#00A1C9',
          'dark-blue': '#1B3139',
          'light-gray': '#F5F5F5',
          'medium-gray': '#E0E0E0',
          'dark-gray': '#666666'
        },
        // Alias common design tokens
        'background': '#F5F5F5',
        'foreground': '#666666',
        'border': '#E0E0E0',
        'primary': '#00A1C9',
        'secondary': '#FF6B35'
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
