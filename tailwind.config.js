const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        terminal: {
          green: {
            DEFAULT: '#00ff9d',
            50: '#00ff9d10',
            100: '#00ff9d20',
            200: '#00ff9d30',
            300: '#00ff9d40',
            400: '#00ff9d50',
            500: '#00ff9d60',
            600: '#00ff9d70',
            700: '#00ff9d80',
            800: '#00ff9d90',
            900: '#00ff9d',
          },
          black: '#0a0f16',
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Roboto Mono",
          "Monaco",
          "Consolas",
          "monospace"
        ],
        terminal: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}