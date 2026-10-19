import type { Config } from 'tailwindcss';

/**
 * The palette is a set of CSS variables rather than fixed hex values, so a colour
 * scheme is one block of variable assignments and not a rewrite of the ~1,100
 * places that use `text-ink-700` and friends. The `rgb(... / <alpha-value>)`
 * shape is what keeps Tailwind's opacity modifiers (`bg-clay-50/40`) working —
 * a plain `var(--clay-50)` would break them. The values live in
 * `src/app/globals.css`: `:root` holds the light scheme, `.theme-dark` the dark
 * one, and the class on `<html>` decides which applies.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // The scheme is a class the server writes on <html> (see src/lib/theme.ts), so a
  // saved account choice wins over the operating system setting instead of the page
  // silently following the device. Both schemes are written explicitly, and only
  // `theme-dark` opens the `dark:` variants.
  darkMode: ['class', '.theme-dark'],
  theme: {
    extend: {
      colors: {
        clay: {
          50: rgb('clay-50'),
          100: rgb('clay-100'),
          200: rgb('clay-200'),
          300: rgb('clay-300'),
          400: rgb('clay-400'),
          500: rgb('clay-500'),
          600: rgb('clay-600'),
          700: rgb('clay-700'),
          800: rgb('clay-800'),
          900: rgb('clay-900')
        },
        ochre: {
          50: rgb('ochre-50'),
          100: rgb('ochre-100'),
          500: rgb('ochre-500'),
          700: rgb('ochre-700')
        },
        moss: {
          50: rgb('moss-50'),
          100: rgb('moss-100'),
          500: rgb('moss-500'),
          700: rgb('moss-700'),
          900: rgb('moss-900')
        },
        ink: {
          50: rgb('ink-50'),
          100: rgb('ink-100'),
          500: rgb('ink-500'),
          700: rgb('ink-700'),
          900: rgb('ink-900')
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
