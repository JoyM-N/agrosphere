import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          bg:      "#F7F4EB",
          bg2:     "#EFEAD8",
          surface: "#FDFBF7",
          surface2:"#FAFAFA",
          border:  "#E3DAC9",
          border2: "#CFC1A6",
          amber:   "#E58B19",
          amber2:  "#F2A63B",
          green:   "#4A9661",
          green2:  "#6BCF8A",
          orange:  "#D9692A",
          text:    "#4A3F35",
          text2:   "#827260",
          muted:   "#A39686",
          danger:  "#D14B4B",
        },
        background: "#F7F4EB",
        foreground: "#4A3F35",
        border:     "#E3DAC9",
        input:      "#FDFBF7",
        ring:       "#E58B19",
        primary: {
          DEFAULT:    "#E58B19",
          foreground: "#FDFBF7",
        },
        secondary: {
          DEFAULT:    "#EFEAD8",
          foreground: "#4A3F35",
        },
        card: {
          DEFAULT:    "#FDFBF7",
          foreground: "#4A3F35",
        },
        muted: {
          DEFAULT:    "#EFEAD8",
          foreground: "#A39686",
        },
        accent: {
          DEFAULT:    "#EFEAD8",
          foreground: "#4A3F35",
        },
        destructive: {
          DEFAULT:    "#D14B4B",
          foreground: "#FDFBF7",
        },
      },
      fontFamily: {
        sans:    ["Outfit", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        serif:   ["Playfair Display", "serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg:  "0.875rem",
        md:  "0.625rem",
        sm:  "0.375rem",
        xl:  "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-in":     "fadeIn 0.7s ease-out",
        "slide-up":    "slideUp 0.6s ease-out",
        "float":       "float 7s ease-in-out infinite",
        "float-slow":  "float 10s ease-in-out infinite",
        "spin-slow":   "spin 20s linear infinite",
        "pulse-amber": "pulseAmber 3s ease-in-out infinite",
        "shimmer":     "shimmer 2.5s linear infinite",
        "ticker":      "ticker 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-16px)" },
        },
        pulseAmber: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(240,165,0,0.2)" },
          "50%":      { boxShadow: "0 0 50px rgba(240,165,0,0.4)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
};

export default config;