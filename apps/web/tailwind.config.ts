import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0A0B",
        accent: "#00A3FF",
        glass: "rgba(255,255,255,0.10)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,163,255,0.28), 0 14px 40px rgba(0,163,255,0.20)"
      }
    }
  },
  plugins: []
};

export default config;
