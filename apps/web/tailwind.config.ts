import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#050507",
        accent: "#2563EB",
        glass: "rgba(255,255,255,0.10)",
        "hf-void": "#050507",
        "hf-deep": "#080810",
        "hf-surface": "#0C0C14",
        "hf-raised": "#11111C",
        "hf-hover": "#161624",
        "hf-active": "#1D1D2B",
        "hf-accent": "#2563EB",
        "hf-green": "#10B981",
        "hf-amber": "#F59E0B",
        "hf-combat": "#EF4444"
      },
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        body: ["'Cabinet Grotesk'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,163,255,0.28), 0 8px 32px rgba(0,163,255,0.20)",
        card: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)",
        panel: "0 24px 80px rgba(0,0,0,0.65)"
      },
      animation: {
        "fade-up": "slide-up-fade 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "slide-left": "slideInLeft 0.4s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.5s infinite",
        "pulse-glow": "pulse-ring 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite",
        "orb-drift": "orb-drift 12s ease-in-out infinite",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.22,1,0.36,1) both"
      }
    }
  },
  plugins: []
};

export default config;
