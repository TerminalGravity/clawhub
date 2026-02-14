/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ClawHub Command Center palette
        terminal: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        surface: {
          0: '#0a0a0b',    // Deepest - page background
          1: '#111113',    // Base surface
          2: '#18181b',    // Elevated surface
          3: '#1f1f23',    // Higher elevation
          4: '#27272a',    // Highest elevation
        },
        ink: {
          primary: '#fafafa',
          secondary: '#a1a1aa',
          tertiary: '#71717a',
          muted: '#52525b',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.1)',
          emphasis: 'rgba(255,255,255,0.15)',
          focus: 'rgba(34,197,94,0.5)',
        },
        status: {
          online: '#22c55e',
          busy: '#eab308',
          offline: '#6b7280',
          error: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
