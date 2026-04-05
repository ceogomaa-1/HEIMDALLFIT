import type { CSSProperties, ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
  style = {},
  id
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={className}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.048) 0%, rgba(255,255,255,0.028) 100%)",
        backdropFilter: "blur(28px) saturate(1.25)",
        WebkitBackdropFilter: "blur(28px) saturate(1.25)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "22px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)",
        position: "relative",
        overflow: "hidden",
        ...style
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "16%",
          right: "16%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
          pointerEvents: "none"
        }}
      />
      {children}
    </div>
  );
}
