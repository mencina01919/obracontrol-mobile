import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getStoredUser, clearAuth, type StoredUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";

type AsistenciaRegistro = {
  id: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  horasTrabajadas: number | null;
};

export default function InicioScreen() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [registroHoy, setRegistroHoy] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        getStoredUser(),
        api.asistencia.get(),
      ]).then(([u, asist]) => {
        setUser(u);
        setRegistroHoy(asist.registroHoy as Record<string, unknown> | null);
      }).catch(console.error).finally(() => setLoading(false));
    }, [])
  );

  async function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await clearAuth();
          router.replace("/login");
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const nombre = user ? `${user.nombres} ${user.apellidos}` : "Trabajador";
  const entrada = registroHoy?.entrada as string | null;
  const salida = registroHoy?.salida as string | null;

  function formatHora(iso: string | null) {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.welcomeName} numberOfLines={1}>{nombre}</Text>
          {user?.obra && <Text style={styles.welcomeSub}>{user.obra}</Text>}
          {user?.cargo && <Text style={styles.welcomeSub}>{user.cargo}</Text>}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Hoy</Text>
      <View style={styles.row}>
        <InfoTile label="Entrada" value={formatHora(entrada)} icon="log-in-outline" color={COLORS.success} />
        <InfoTile label="Salida" value={formatHora(salida)} icon="log-out-outline" color={COLORS.danger} />
      </View>

      <Text style={styles.sectionTitle}>Acceso rápido</Text>
      <View style={styles.grid}>
        <QuickAction label="Marcar asistencia" icon="time-outline" onPress={() => router.push("/(tabs)/asistencia")} />
        <QuickAction label="Mis documentos" icon="document-text-outline" onPress={() => router.push("/(tabs)/documentos")} />
        <QuickAction label="Charlas" icon="easel-outline" onPress={() => router.push("/(tabs)/charlas")} />
        <QuickAction label="Mi perfil" icon="person-outline" onPress={() => router.push("/(tabs)/perfil")} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="exit-outline" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoTile({ label, value, icon, color }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }) {
  return (
    <View style={[styles.tile, { flex: 1 }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={26} color={COLORS.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  welcomeText: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  welcomeName: { fontSize: 17, fontWeight: "700", color: "#fff" },
  welcomeSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 10, marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginBottom: 20 },
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileValue: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  tileLabel: { fontSize: 12, color: COLORS.textSecondary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  quickAction: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${COLORS.primary}14`,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, textAlign: "center" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  logoutText: { color: COLORS.danger, fontWeight: "600", fontSize: 15 },
});
