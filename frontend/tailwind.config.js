/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fichua: {
          green: "#0B6E4F",
          gold: "#E4B363",
          dark: "#0A1F1A",
          cream: "#F7F4EC",
        },
      },
    },
  },
  plugins: [],
};
