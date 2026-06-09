import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#150F07',
        bg2: '#1E1108',
        surface: '#3D2B1F',
        amber: '#E8A44A',
        amber2: '#F5C97A',
        ink: '#F9E8C8'
      },
      fontFamily: {
        serif: ['var(--font-baskerville)', 'Georgia', 'serif'],
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '16px',
        el: '8px'
      },
      transitionTimingFunction: {
        'candle': 'cubic-bezier(0.23, 1, 0.32, 1)'
      }
    }
  },
  plugins: []
}

export default config
