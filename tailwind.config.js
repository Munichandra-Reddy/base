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
        sans: ['"Arial"', '"Helvetica"', 'sans-serif', 'var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        /* Cisco Brand & Layout Colors */
        cisco: {
          dark: '#011826',
          blue: '#049FD9',
          'blue-dark': '#004BAF',
          green: '#238823',
          cta: '#6CC04A',
          hover: '#04D98B',
        },
        brand: {
          dark: '#011826',
          surface: '#082236',
          border: '#0d314d',
        },
        primary: {
          DEFAULT: '#011826',
          dark: '#011826',
          blue: '#049FD9',
        },
        canvas: '#FFFFFF',
        paper: '#FFFFFF',
        subtle: '#F4F6F8',
        borderline: '#E5E5E5',
        card: '#FFFFFF',
        background: '#FFFFFF',
        muted: {
          DEFAULT: '#F4F6F8',
          foreground: '#595959',
        },
        border: '#E5E5E5',

        /* Typography Colors (Hierarchy) */
        heading: '#222222',
        body: '#595959',
        subtext: '#595959',
        'muted-border': '#CCCCCC',

        /* Semantic Status Colors */
        status: {
          success: {
            DEFAULT: '#6CC04A',
            tint: '#F0FDF4',
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
            DEFAULT: '#049FD9',
            tint: '#F0F9FF',
          },
          teal: {
            DEFAULT: '#04D98B',
            tint: '#ECFDF5',
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
