import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0A0A0B",
        accent: "#00A3FF",
        glass: "rgba(255,255,255,0.10)",
        "hf-void": "#07070A",
        "hf-deep": "#0A0A0F",
        "hf-surface": "#0F0F15",
        "hf-raised": "#141419",
        "hf-hover": "#1A1A22",
        "hf-active": "#202028",
        "hf-accent": "#00A3FF",
        "hf-green": "#43D07F",
        "hf-amber": "#F59E0B"
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,163,255,0.28), 0 8px 32px rgba(0,163,255,0.20)",
        card: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)",
        panel: "0 24px 80px rgba(0,0,0,0.65)"
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-left": "slideInLeft 0.4s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "orb-drift": "orb-drift 8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
