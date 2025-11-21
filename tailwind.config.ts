import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        tradetron: {
          coral: '#FF6B7A', // Coral/salmon from TradeTron logo
          'coral-light': '#FF8A95',
          'coral-dark': '#E55A6A',
        },
      },
    },
  },
  plugins: [],
}
export default config

