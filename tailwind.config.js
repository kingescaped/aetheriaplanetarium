/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#070b19',
          850: '#0c1228',
          800: '#111a3b',
          700: '#1d2a58',
          600: '#2c3e7e',
        },
        cosmic: {
          cyan: '#38bdf8',
          teal: '#2dd4bf',
          purple: '#a855f7',
          violet: '#818cf8',
          gold: '#fbbf24',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-cyan': '0 0 20px -2px rgba(56, 189, 248, 0.5)',
        'glow-gold': '0 0 20px -2px rgba(251, 191, 36, 0.6)',
        'glow-purple': '0 0 20px -2px rgba(168, 85, 247, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
      }
    },
  },
  plugins: [],
}
