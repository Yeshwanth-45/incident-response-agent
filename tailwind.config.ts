import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0b0f1a',
          900: '#0f1420',
          800: '#161c2c',
          700: '#1f2738',
        },
        severity: {
          critical: '#dc2626',
          high: '#ea580c',
          medium: '#d97706',
          low: '#16a34a',
        },
        brand: {
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      borderRadius: {
        xl2: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,20,32,0.04), 0 1px 6px rgba(15,20,32,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
