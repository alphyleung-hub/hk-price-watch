import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { primary: '#2563EB', success: '#22C55E', warning: '#EAB308', danger: '#EF4444' } } },
} satisfies Config;
