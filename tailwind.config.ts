import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#fbf5ef',
          100: '#f5e6d4',
          200: '#eac9a6',
          300: '#dfa773',
          400: '#d18746',
          500: '#b96a2c',
          600: '#965222',
          700: '#733e1c',
          800: '#522c16',
          900: '#331b0f'
        },
        ochre: {
          50: '#fdf7e6',
          100: '#f9eabd',
          500: '#c99a1b',
          700: '#8a6410'
        },
        moss: {
          50: '#eef4ea',
          100: '#d9e6d1',
          500: '#5d7d4a',
          700: '#3d5a2f',
          900: '#22361a'
        },
        ink: {
          50: '#f5f6f8',
          100: '#e6e8ec',
          500: '#4b5563',
          700: '#2a3038',
          900: '#111418'
        }
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,20,24,0.04), 0 4px 16px rgba(17,20,24,0.06)'
      }
    }
  },
  plugins: []
};

export default config;
