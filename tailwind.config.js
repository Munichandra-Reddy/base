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
        /* Core Brand & Layout Colors */
        brand: {
          dark: '#0B192C',
          surface: '#15293F',
          border: '#1E2E42',
        },
        primary: {
          DEFAULT: '#0B192C',
          dark: '#0B192C',
        },
        canvas: '#F1F3F6',
        paper: '#FFFFFF',
        subtle: '#EBF0F5',
        borderline: '#E2E8F0',
        card: '#FFFFFF',
        background: '#F1F3F6',
        muted: {
          DEFAULT: '#EBF0F5',
          foreground: '#64748B',
        },
        border: '#E2E8F0',

        /* Typography Colors (Hierarchy) */
        heading: '#0F172A',
        body: '#334155',
        subtext: '#64748B',
        'muted-border': '#CBD5E1',

        /* Semantic Status Colors */
        status: {
          success: {
            DEFAULT: '#10B981',
            tint: '#ECFDF5',
          },
          warning: {
            DEFAULT: '#F59E0B',
            tint: '#FFFBEB',
          },
          destructive: {
            DEFAULT: '#EF4444',
            tint: '#FEF2F2',
          },
          info: {
            DEFAULT: '#2563EB',
            tint: '#EFF6FF',
          },
          teal: {
            DEFAULT: '#0D9488',
            tint: '#F0FDFA',
          },
        },
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
