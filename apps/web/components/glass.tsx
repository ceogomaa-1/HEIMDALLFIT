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
        background: "rgba(12,12,20,0.80)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.05)",
        position: "relative",
        overflow: "hidden",
        ...style
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          pointerEvents: "none"
        }}
      />
      {children}
    </div>
  );
}
