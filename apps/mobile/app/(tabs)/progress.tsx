import { Linking, Pressable, SafeAreaView, ScrollView, Text } from "react-native";
import { GlassCard } from "../../components/glass-card";

export default function ProgressTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ color: "white", fontSize: 34, fontWeight: "700" }}>Progress & store</Text>
        <GlassCard>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>Upload a progress photo</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 10 }}>
            Client photos are uploaded to Supabase Storage, processed for background removal, then marked up by your coach.
          </Text>
        </GlassCard>
        <GlassCard>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>Store purchase handoff</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 10 }}>
            Digital product checkout opens in hosted Stripe Checkout to keep mobile commerce simple in v1.
          </Text>
          <Pressable
            onPress={() => Linking.openURL("https://checkout.stripe.com/pay/mock-prod_1")}
            style={{ marginTop: 18, borderRadius: 999, backgroundColor: "#00A3FF", paddingVertical: 16 }}
          >
            <Text style={{ textAlign: "center", color: "black", fontWeight: "700" }}>Open checkout</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
