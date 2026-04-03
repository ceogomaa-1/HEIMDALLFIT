import { combatTemplates } from "@heimdallfit/config";
import { calculateCombatDuration } from "@heimdallfit/types";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { GlassCard } from "../../components/glass-card";

export default function ProgramTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ color: "white", fontSize: 34, fontWeight: "700" }}>Today&apos;s combat plan</Text>
        {combatTemplates.map((template) => (
          <GlassCard key={template.slug}>
            <Text style={{ color: "white", fontSize: 24, fontWeight: "700" }}>{template.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 8 }}>{template.format}</Text>
            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={{ color: "#7DD3FC" }}>Total time: {Math.floor(calculateCombatDuration(template) / 60)} min</Text>
              <Text style={{ color: "rgba(255,255,255,0.75)" }}>Embedded drill videos and round timers live here.</Text>
              <Text style={{ color: "rgba(255,255,255,0.75)" }}>Weight cut check-in and recovery notes sync with your coach.</Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
