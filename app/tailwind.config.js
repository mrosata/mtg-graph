/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Iowan Old Style', 'Palatino', 'serif'],
        head: ['"Cormorant Garamond"', 'Iowan Old Style', 'Palatino', 'serif'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          bg: '#0c0a0d',
          panel: '#15131a',
          raised: '#1c1a22',
          line: '#2a2632',
          'line-2': '#3a3543',
        },
        vellum: {
          DEFAULT: '#ece4cf',
          mute: '#b8af9a',
          dim: '#8a8295',
        },
        brass: {
          DEFAULT: '#d4a44a',
          hi: '#f0c97a',
          deep: '#8a6628',
          glow: 'rgb(212 164 74 / 0.18)',
        },
        // Semantic WUBRG (calibrated for dark surfaces)
        mana: {
          w: '#f0e6c8',
          u: '#7eb6e8',
          b: '#7a6b86',
          r: '#e07772',
          g: '#82b97c',
          c: '#a8a39a',
        },
        // Tag-axis semantic
        axis: {
          effect: '#d4a44a',
          trigger: '#7eb6e8',
          condition: '#b388e8',
          theme: '#b388e8',
        },
      },
      letterSpacing: {
        'eyebrow': '0.22em',
        'caps': '0.16em',
      },
      boxShadow: {
        'brass-glow': '0 0 0 1px rgb(212 164 74 / 0.55), 0 0 0 4px rgb(212 164 74 / 0.16)',
        'card-rest': '0 1px 2px rgb(0 0 0 / 0.4), 0 0 0 1px rgb(255 255 255 / 0.02)',
        'card-hover': '0 8px 24px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(212 164 74 / 0.4), 0 -1px 0 rgb(240 201 122 / 0.55) inset',
        'panel': '0 1px 0 rgb(255 255 255 / 0.025) inset, 0 24px 60px -28px rgb(0 0 0 / 0.6)',
      },
      animation: {
        'page-enter': 'pageEnter 320ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
        'tag-pop': 'tagPop 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fadeIn 180ms ease-out backwards',
      },
      keyframes: {
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tagPop: {
          '0%': { transform: 'scale(0.94)' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
