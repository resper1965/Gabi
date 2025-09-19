import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de cores ness
        primary: '#EEF1F6',
        primaryAccent: '#0B0C0E',
        brand: '#00ADE8',
        background: {
          DEFAULT: '#0B0C0E',
          secondary: '#111317'
        },
        secondary: '#151820',
        border: '#1B2030',
        accent: '#00ADE8',
        muted: '#A1A1AA',
        destructive: '#E53935',
        positive: '#22C55E'
      },
      fontFamily: {
        geist: 'var(--font-geist-sans)',
        dmmono: 'var(--font-dm-mono)',
        montserrat: ['Montserrat', 'sans-serif']
      },
      borderRadius: {
        xl: '10px'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config
