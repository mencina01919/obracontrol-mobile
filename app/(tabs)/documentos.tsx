import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";

type Documento = {
  id: string;
  tipo: string;
  titulo: string;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  mimetype: string;
  sizeBytes: number;
  createdAt: string;
};

const TIPO_LABELS: Record<string, string> = {
  CONTRATO_TRABAJO: "Contrato de Trabajo",
  LIQUIDACION_SUELDO: "Liquidación de Sueldo",
  CERTIFICADO_AFP: "Certificado AFP",
  CERTIFICADO_SALUD: "Certificado de Salud",
  ANEXO_CONTRATO: "Anexo de Contrato",
  OTRO: "Otro",
};

const TIPOS_FILTER = [
  { key: "", label: "Todos" },
  { key: "LIQUIDACION_SUELDO", label: "Liquidaciones" },
  { key: "CONTRATO_TRABAJO", label: "Contratos" },
  { key: "OTRO", label: "Otros" },
];

export default function DocumentosScreen() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("");

  async function cargar(tipo: string) {
    try {
      const data = await api.documentos(tipo || undefined);
      setDocumentos(data.documentos as Documento[]);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    cargar(tipoFiltro).finally(() => setLoading(false));
  }, [tipoFiltro]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar(tipoFiltro);
    setRefreshing(false);
  }, [tipoFiltro]);

  function formatFecha(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {TIPOS_FILTER.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, tipoFiltro === f.key && styles.filterChipActive]}
            onPress={() => setTipoFiltro(f.key)}
          >
            <Text style={[styles.filterChipText, tipoFiltro === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={documentos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay documentos</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.docCard}>
            <View style={styles.docIcon}>
              <Ionicons
                name={item.mimetype === "application/pdf" ? "document-text-outline" : "document-outline"}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTipo}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
              <Text style={styles.docTitulo} numberOfLines={2}>{item.titulo}</Text>
              <View style={styles.docMeta}>
                {item.fechaEmision && (
                  <Text style={styles.docMetaText}>
                    <Ionicons name="calendar-outline" size={11} /> {formatFecha(item.fechaEmision)}
                  </Text>
                )}
                <Text style={styles.docMetaText}>{formatSize(item.sizeBytes)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  filterChipTextActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  docCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}14`,
    justifyContent: "center",
    alignItems: "center",
  },
  docTipo: { fontSize: 11, fontWeight: "700", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  docTitulo: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginTop: 2 },
  docMeta: { flexDirection: "row", gap: 10, marginTop: 4 },
  docMetaText: { fontSize: 11, color: COLORS.textMuted },
});
