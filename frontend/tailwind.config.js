/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#07070e',
        surface: {
          DEFAULT: '#0f0f1a',
          raised: '#161625',
          overlay: '#1d1d30',
        },
        border: {
          DEFAULT: '#252538',
          subtle: '#1a1a2b',
          strong: '#35355a',
        },
        primary: {
          DEFAULT: '#7b6ef5',
          hover: '#6d61e8',
          muted: '#7b6ef520',
          border: '#7b6ef540',
        },
        ink: {
          DEFAULT: '#e2e2f0',
          muted: '#8888a8',
          faint: '#4a4a65',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(123, 110, 245, 0.15)',
        'glow': '0 0 24px rgba(123, 110, 245, 0.2)',
      },
    },
  },
  plugins: [],
};
