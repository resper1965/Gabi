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
        // Paleta de cores ness - CORRIGIDA PARA CONTRASTE
        primary: '#00ADE8',
        primaryAccent: '#0099CC',
        brand: '#00ADE8',
        background: {
          DEFAULT: '#0B0C0E',
          secondary: '#111317'
        },
        foreground: '#EEF1F6', // Texto principal - ALTO CONTRASTE
        secondary: {
          DEFAULT: '#151820',
          foreground: '#B8BCC8' // Texto secundário - CONTRASTE ADEQUADO
        },
        border: '#1B2030',
        accent: '#00ADE8',
        muted: {
          DEFAULT: '#8B919F',
          foreground: '#6B7280' // Texto muted - CONTRASTE LEGÍVEL
        },
        destructive: '#EF4444',
        positive: '#10B981'
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
