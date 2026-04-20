import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import CharlaModal from "@/components/CharlaModal";

type Charla = {
  id: string;
  titulo: string;
  tema: string;
  fecha: string;
  videoUrl: string | null;
  cerrada: boolean;
  firmada: boolean;
  firmadoEn: string | null;
};

export default function CharlasScreen() {
  const [charlas, setCharlas] = useState<Charla[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Charla | null>(null);

  async function cargar() {
    try {
      const data = await api.charlas();
      setCharlas(data.charlas as Charla[]);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  }, []);

  async function handleFirmada(svgData: string) {
    if (!selected) return;
    await api.firmarCharla(selected.id, svgData);
    setSelected(null);
    await cargar();
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={charlas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="easel-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay charlas asignadas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelected(item)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, item.firmada ? styles.badgeFirmada : styles.badgePendiente]}>
                <Ionicons
                  name={item.firmada ? "checkmark-circle" : "time-outline"}
                  size={13}
                  color={item.firmada ? COLORS.success : COLORS.warning}
                />
                <Text style={[styles.badgeText, item.firmada ? styles.badgeTextFirmada : styles.badgeTextPendiente]}>
                  {item.firmada ? "Firmada" : "Pendiente"}
                </Text>
              </View>
              <Text style={styles.fecha}>{formatFecha(item.fecha)}</Text>
            </View>

            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.tema} numberOfLines={2}>{item.tema}</Text>

            <View style={styles.cardFooter}>
              {item.videoUrl && (
                <View style={styles.videoPill}>
                  <Ionicons name="play-circle-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.videoPillText}>Incluye video</Text>
                </View>
              )}
              {item.firmadoEn && (
                <Text style={styles.firmadoEn}>
                  Firmada el {new Date(item.firmadoEn).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </Text>
              )}
              {!item.firmada && !item.cerrada && (
                <View style={styles.pendientePill}>
                  <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.pendientePillText}>Toca para firmar</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <CharlaModal
        charla={selected}
        onClose={() => setSelected(null)}
        onFirmada={handleFirmada}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeFirmada: { backgroundColor: `${COLORS.success}18` },
  badgePendiente: { backgroundColor: `${COLORS.warning}18` },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextFirmada: { color: COLORS.success },
  badgeTextPendiente: { color: COLORS.warning },
  fecha: { fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  titulo: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  tema: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 },
  videoPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${COLORS.accent}14`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  videoPillText: { fontSize: 11, fontWeight: "600", color: COLORS.accent },
  firmadoEn: { fontSize: 11, color: COLORS.textMuted },
  pendientePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pendientePillText: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
});
