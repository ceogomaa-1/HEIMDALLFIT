import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#050506",
          borderTopColor: "rgba(255,255,255,0.08)"
        },
        tabBarActiveTintColor: "#00A3FF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)"
      }}
    >
      <Tabs.Screen name="program" options={{ title: "Program" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
    </Tabs>
  );
}
