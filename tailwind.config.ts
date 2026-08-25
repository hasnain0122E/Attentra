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
        ink: {
          DEFAULT: "#EDEFE7",
          dim: "#B7BBAE",
          faint: "#7C8177",
        },
        paper: {
          DEFAULT: "#08090A",
          raised: "#0F110F",
          line: "rgba(237,239,231,0.09)",
          lineStrong: "rgba(237,239,231,0.16)",
        },
        gold: {
          DEFAULT: "#D8A94A",
          dim: "#8A722F",
          soft: "rgba(216,169,74,0.12)",
        },
        teal: {
          DEFAULT: "#4FA98F",
          dim: "#2C5B4C",
          soft: "rgba(79,169,143,0.12)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(237,239,231,0.06) 1px, transparent 0)",
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        pulseGlow: "pulseGlow 7s ease-in-out infinite",
        rise: "rise 0.6s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.35" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
