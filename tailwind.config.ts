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
          card:    "#141414",
          cardHov: "#1c1c1c",
          border:  "#2a2a2a",
          muted:   "#888888",
        },
      },
    },
  },
  plugins: [],
};
export default config;
