import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tomato: { DEFAULT: "#EE4224", 50: "#FEF1EE", 100: "#FDDCD5", 200: "#FAB4A6", 300: "#F68A75", 400: "#F26549", 500: "#EE4224", 600: "#D02F13", 700: "#A7240E", 800: "#7D1B0B", 900: "#541208" },
        char: { DEFAULT: "#262626", 50: "#F4F4F4", 100: "#E6E6E6", 200: "#C9C9C9", 300: "#A3A3A3", 400: "#6E6E6E", 500: "#4A4A4A", 600: "#363636", 700: "#262626", 800: "#1B1B1B", 900: "#111111" },
        cream: { DEFAULT: "#F8EDD6", 50: "#FFFCF5", 100: "#FCF6E9", 200: "#F8EDD6", 300: "#F1DDB3", 400: "#E9CB8E", 500: "#DDB265" },
        basil: { DEFAULT: "#3F7D3A", 500: "#3F7D3A", 600: "#2F6229" },
        mustard: { DEFAULT: "#F5A524", 500: "#F5A524" },
      },
      fontFamily: {
        display: ["'Bowlby One'", "Impact", "system-ui", "sans-serif"],
        condensed: ["Anton", "Impact", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        retro: "4px 4px 0 0 #262626",
        "retro-lg": "6px 6px 0 0 #262626",
        "retro-red": "4px 4px 0 0 #EE4224",
      },
      keyframes: {
        drop: { "0%": { transform: "translateY(-40px) scale(1.3)", opacity: "0" }, "70%": { transform: "translateY(2px) scale(0.97)", opacity: "1" }, "100%": { transform: "translateY(0) scale(1)", opacity: "1" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        wiggle: { "0%,100%": { transform: "rotate(-3deg)" }, "50%": { transform: "rotate(3deg)" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.18)" }, "100%": { transform: "scale(1)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        sheetUp: { from: { transform: "translateY(24px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        steam: { "0%": { transform: "translateY(0) scaleX(1)", opacity: "0" }, "30%": { opacity: ".6" }, "100%": { transform: "translateY(-40px) scaleX(1.4)", opacity: "0" } },
      },
      animation: {
        drop: "drop .45s cubic-bezier(.2,.9,.3,1.2) both",
        "spin-slow": "spinSlow 40s linear infinite",
        wiggle: "wiggle 2.5s ease-in-out infinite",
        pop: "pop .35s ease-out",
        marquee: "marquee 30s linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        steam: "steam 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
