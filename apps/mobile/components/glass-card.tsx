import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function GlassCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.10)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        borderRadius: 28,
        padding: 20
      }}
    >
      {children}
    </View>
  );
}
