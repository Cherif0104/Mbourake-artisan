/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f'
        }
      },
      boxShadow: {
        'cta': '0 4px 0 0 #b45309, 0 6px 20px rgba(245,158,11,0.28)',
        'cta-hover': '0 6px 0 0 #b45309, 0 10px 28px rgba(245,158,11,0.35)',
        'cta-active': '0 2px 0 0 #b45309',
        'glass': '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5)',
        'glass-hover': '0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.6)',
        'glow-brand': '0 0 24px rgba(245,158,11,0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
