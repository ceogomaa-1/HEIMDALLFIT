import { appConfig } from "@heimdallfit/config";
import { isValidRoomId, normalizeRoomId } from "@heimdallfit/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { GlassCard } from "../components/glass-card";

export default function JoinScreen() {
  const [roomId, setRoomId] = useState("");
  const normalized = useMemo(() => normalizeRoomId(roomId), [roomId]);

  function continueToSurvey() {
    if (!isValidRoomId(normalized)) return;
    router.push({ pathname: "/join/survey", params: { roomId: normalized } });
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#0A0A0B" }}>
      <GlassCard>
        <Text style={{ color: "#7DD3FC", letterSpacing: 6, fontSize: 12 }}>HEIMDALL ROOM ACCESS</Text>
        <Text style={{ color: "white", fontSize: 40, fontWeight: "700", marginTop: 16 }}>
          Enter your coach&apos;s Room ID.
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 12, fontSize: 16 }}>
          No sign-up friction. Enter the 8-character code and we&apos;ll build the rest around you.
        </Text>
        <View
          style={{
            marginTop: 28,
            borderRadius: 24,
            borderColor: "rgba(255,255,255,0.14)",
            borderWidth: 1,
            backgroundColor: "rgba(255,255,255,0.06)",
            paddingHorizontal: 18
          }}
        >
          <TextInput
            placeholder={`e.g. ${appConfig.roomIdLength} chars`}
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="characters"
            value={normalized}
            onChangeText={setRoomId}
            style={{ color: "white", fontSize: 28, letterSpacing: 8, paddingVertical: 18 }}
            maxLength={8}
          />
        </View>
        <Pressable
          onPress={continueToSurvey}
          style={{
            marginTop: 24,
            borderRadius: 999,
            backgroundColor: isValidRoomId(normalized) ? "#00A3FF" : "rgba(255,255,255,0.12)",
            paddingVertical: 16
          }}
        >
          <Text style={{ textAlign: "center", color: isValidRoomId(normalized) ? "black" : "white", fontWeight: "700" }}>
            Continue
          </Text>
        </Pressable>
      </GlassCard>
    </SafeAreaView>
  );
}
