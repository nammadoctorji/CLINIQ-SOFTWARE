/** CLINIQ design tokens — locked to the approved prototype */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#15262E', 2: '#22383F' },
        teal: { DEFAULT: '#0E7C6B', dark: '#0A5F52', wash: '#E6F3F0', bright: '#5FC7B4' },
        paper: '#FAF9F6',
        line: { DEFAULT: '#E5E4DE', strong: '#D2D1C9' },
        body: { DEFAULT: '#1E2B31', 2: '#5C6B70', 3: '#8B9699' },
        danger: { DEFAULT: '#B3261E', wash: '#FBEBEA' },
        caution: { DEFAULT: '#B45309', wash: '#FCF2E3' },
        ok: { DEFAULT: '#2E7D32', wash: '#EAF4EB' },
      },
      fontFamily: {
        disp: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
}
