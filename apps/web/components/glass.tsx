import { cx } from "@heimdallfit/ui";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

export function GlassPanel({
  className,
  children,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"div">>) {
  return (
    <div className={cx("glass rounded-[28px] border border-white/10", className)} {...props}>
      {children}
    </div>
  );
}
