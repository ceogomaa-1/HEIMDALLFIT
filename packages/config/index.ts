const runtimeEnv: Record<string, string | undefined> =
  typeof globalThis !== "undefined" && "process" in globalThis
    ? ((globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {})
    : {};

export const appConfig = {
  name: "HEIMDALLFIT",
  appUrl: runtimeEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  deepLinkBase: runtimeEnv.NEXT_PUBLIC_DEEP_LINK_BASE ?? "heimdallfit://join",
  roomIdLength: 8
} as const;

export const themeTokens = {
  colors: {
    background: "#0A0A0B",
    glass: "rgba(255,255,255,0.10)",
    glassStrong: "rgba(255,255,255,0.16)",
    border: "rgba(255,255,255,0.14)",
    text: "#FFFFFF",
    muted: "#9CA3AF",
    accent: "#00A3FF",
    accentSoft: "rgba(0,163,255,0.18)",
    success: "#2ED47A",
    danger: "#FF5C8A"
  },
  shadows: {
    glow: "0 0 0 1px rgba(0,163,255,0.28), 0 14px 40px rgba(0,163,255,0.20)",
    panel: "0 20px 60px rgba(0,0,0,0.45)"
  },
  blur: "blur(20px)"
} as const;

export const combatTemplates = [
  {
    slug: "boxing",
    title: "Boxing Fight Camp",
    format: "3 x 5 min, 1 min rest",
    rounds: 3,
    roundSeconds: 300,
    restSeconds: 60
  },
  {
    slug: "mma",
    title: "MMA Cage Engine",
    format: "5 x 5 min, 1 min rest",
    rounds: 5,
    roundSeconds: 300,
    restSeconds: 60
  },
  {
    slug: "bjj",
    title: "BJJ Competition Flow",
    format: "6 x 6 min, 90 sec rest",
    rounds: 6,
    roundSeconds: 360,
    restSeconds: 90
  }
] as const;
