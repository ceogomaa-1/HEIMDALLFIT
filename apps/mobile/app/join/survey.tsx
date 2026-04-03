import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { GlassCard } from "../../components/glass-card";

export default function SurveyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [form, setForm] = useState({
    age: "",
    weight: "",
    injuries: "",
    goals: ""
  });

  async function submitSurvey() {
    await fetch("http://localhost:3000/api/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        age: Number(form.age),
        weight: Number(form.weight),
        injuries: form.injuries,
        goals: form.goals
      })
    });
    router.replace("/(tabs)/program");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <GlassCard>
          <Text style={{ color: "#7DD3FC", letterSpacing: 6, fontSize: 12 }}>AUTOMATED ONBOARDING</Text>
          <Text style={{ color: "white", fontSize: 34, fontWeight: "700", marginTop: 16 }}>
            Coach room {roomId}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 12, fontSize: 15 }}>
            Finish your intake so your coach receives your goals instantly in the pending queue.
          </Text>
        </GlassCard>

        {[
          { key: "age", label: "Age", keyboardType: "numeric" as const },
          { key: "weight", label: "Weight", keyboardType: "numeric" as const },
          { key: "injuries", label: "Injuries / limitations" },
          { key: "goals", label: "Goals" }
        ].map((field) => (
          <View key={field.key}>
            <Text style={{ color: "white", marginBottom: 8 }}>{field.label}</Text>
            <TextInput
              value={form[field.key as keyof typeof form]}
              onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
              keyboardType={field.keyboardType}
              style={{
                color: "white",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                borderRadius: 22,
                paddingHorizontal: 18,
                paddingVertical: 16
              }}
            />
          </View>
        ))}

        <Pressable
          onPress={submitSurvey}
          style={{ backgroundColor: "#00A3FF", paddingVertical: 18, borderRadius: 999, marginTop: 8 }}
        >
          <Text style={{ color: "black", textAlign: "center", fontWeight: "700" }}>Submit and join room</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
