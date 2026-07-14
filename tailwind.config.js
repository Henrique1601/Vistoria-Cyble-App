/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0c0f14',
          raised: '#141920',
          overlay: '#1a2029',
          border: '#253040',
          'border-subtle': '#1c2533',
        },
        content: {
          DEFAULT: '#e2e8f0',
          secondary: '#94a3b8',
          tertiary: '#64748b',
        },
        accent: {
          DEFAULT: '#e8823a',
          dim: '#6b3a1a',
          hover: '#f09248',
        },
        success: {
          DEFAULT: '#34d399',
          dim: '#064e3b',
        },
        danger: {
          DEFAULT: '#f87171',
          dim: '#7f1d1d',
        },
        warn: {
          DEFAULT: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-geist)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'diffusion': '0 20px 40px -15px rgba(0,0,0,0.3)',
        'inner-refract': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow-accent': '0 0 0 3px rgba(232,130,58,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
