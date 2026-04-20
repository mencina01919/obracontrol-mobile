import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { COLORS } from "@/lib/constants";

type Trabajador = {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string | null;
  email: string | null;
  cargo: string | null;
  especialidad: string | null;
  fechaIngreso: string | null;
  afp: string | null;
  salud: string | null;
  obra: { id: string; nombre: string } | null;
};

export default function PerfilScreen() {
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((data) => setTrabajador(data.trabajador as Trabajador))
      .catch((e: unknown) => Alert.alert("Error", e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

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
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  if (!trabajador) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>No se pudo cargar el perfil.</Text>
      </View>
    );
  }

  const nombre = `${trabajador.nombres} ${trabajador.apellidos}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.nombre}>{nombre}</Text>
        {trabajador.cargo && <Text style={styles.cargo}>{trabajador.cargo}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información Personal</Text>
        <InfoRow label="RUT" value={trabajador.rut} icon="card-outline" />
        <InfoRow label="Correo" value={trabajador.email} icon="mail-outline" />
        <InfoRow label="Especialidad" value={trabajador.especialidad} icon="construct-outline" />
        {trabajador.fechaIngreso && (
          <InfoRow
            label="Fecha de ingreso"
            value={new Date(trabajador.fechaIngreso).toLocaleDateString("es-CL")}
            icon="calendar-outline"
          />
        )}
      </View>

      {trabajador.obra && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Obra asignada</Text>
          <InfoRow label="Obra" value={trabajador.obra.nombre} icon="business-outline" />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Previsión</Text>
        <InfoRow label="AFP" value={trabajador.afp} icon="wallet-outline" />
        <InfoRow label="Salud" value={trabajador.salud} icon="medical-outline" />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="exit-outline" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={{ width: 20 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { fontSize: 34, fontWeight: "800", color: "#fff" },
  nombre: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  cargo: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 1 },
  infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 8 },
  logoutText: { color: COLORS.danger, fontWeight: "600", fontSize: 15 },
});
