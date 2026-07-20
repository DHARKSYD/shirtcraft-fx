/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black:    '#0A0A0A',
          charcoal: '#1A1A1A',
          white:    '#FAFAFA',
          gold:     '#C8A95B',
          'gold-light': '#E0C07B',
          'gold-dark':  '#A88840',
          ivory:    '#F8F6F1',
          smoke:    '#F2F2F2',
          muted:    '#9CA3AF',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"Space Mono"', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['4.5rem',  { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-xl':  ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg':  ['3rem',    { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-md':  ['2.25rem', { lineHeight: '1.2' }],
        'display-sm':  ['1.875rem',{ lineHeight: '1.25' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
        'card-lg': '0 4px 24px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)',
        'gold':    '0 4px 20px rgba(200,169,91,.35)',
        'glass':   '0 8px 32px rgba(0,0,0,.12)',
        'inset':   'inset 0 1px 0 rgba(255,255,255,.1)',
      },
      borderRadius: {
        'xl':   '16px',
        '2xl':  '24px',
        '3xl':  '32px',
        '4xl':  '40px',
        '5xl':  '48px',
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'float-delayed':  'float 6s ease-in-out 3s infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'fade-in':        'fadeIn .5s ease forwards',
        'slide-up':       'slideUp .5s ease forwards',
        'pulse-gold':     'pulseGold 2s ease-in-out infinite',
        'spin-slow':      'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-18px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200,169,91,.4)' },
          '50%':       { boxShadow: '0 0 0 12px rgba(200,169,91,0)' },
        },
      },
      backdropBlur: { xs: '4px' },
      spacing: { '18': '4.5rem', '88': '22rem', '128': '32rem' },
      screens: { '3xl': '1920px' },
    },
  },
  plugins: [],
}
