import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        xeryus: {
          red:     "#fd3838",
          redMid:  "#ed5c5c",
          redDark: "#aa2121",
          black:   "#0a0a0a",
          card:    "#1a1a1a",
          cardHov: "#242424",
          border:  "#333333",
          muted:   "#888888",
        },
      },
    },
  },
  plugins: [],
};
export default config;
