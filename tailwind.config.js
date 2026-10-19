/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#0B192C',
          surface: '#15293F',
          border: '#1E2E42',
        },
        primary: {
          DEFAULT: '#0B192C',
        },
        canvas: '#F1F3F6',
        paper: '#FFFFFF',
        subtle: '#EBF0F5',
        borderline: '#E2E8F0',
      },
      borderRadius: {
        card: '0.5rem',
        input: '6px',
        pill: '9999px',
      },
      boxShadow: {
        micro: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
