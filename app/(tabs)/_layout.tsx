import { Image } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

function HeaderLogo() {
  return (
    <Image
      source={require("../../assets/images/logo-white.png")}
      style={{ width: 140, height: 36 }}
      resizeMode="contain"
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
          headerTitle: () => <HeaderLogo />,
        }}
      />
      <Tabs.Screen
        name="asistencia"
        options={{
          title: "Asistencia",
          tabBarIcon: ({ color }) => <TabIcon name="time-outline" color={color} />,
          headerTitle: "Marcar Asistencia",
        }}
      />
      <Tabs.Screen
        name="documentos"
        options={{
          title: "Documentos",
          tabBarIcon: ({ color }) => <TabIcon name="document-text-outline" color={color} />,
          headerTitle: "Mis Documentos",
        }}
      />
      <Tabs.Screen
        name="charlas"
        options={{
          title: "Charlas",
          tabBarIcon: ({ color }) => <TabIcon name="easel-outline" color={color} />,
          headerTitle: "Charlas",
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <TabIcon name="person-outline" color={color} />,
          headerTitle: "Mi Perfil",
        }}
      />
    </Tabs>
  );
}
