import { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import SolicitarCorreccionModal from "@/components/SolicitarCorreccionModal";

type MarcacionTipo = "ENTRADA" | "INICIO_COLACION" | "FIN_COLACION" | "SALIDA";

type RegistroHoy = {
  id: string;
  entrada: string | null;
  inicioColacion: string | null;
  finColacion: string | null;
  salida: string | null;
  horasTrabajadas: number | null;
};

type HistorialItem = {
  id: string;
  fecha: string;
  entrada: string | null;
  inicioColacion: string | null;
  finColacion: string | null;
  salida: string | null;
  horasTrabajadas: number | null;
  tipoJornada: string | null;
};

const MARCACIONES: {
  tipo: MarcacionTipo;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  field: keyof RegistroHoy;
}[] = [
  { tipo: "ENTRADA",         label: "Entrada",        icon: "log-in-outline",           color: COLORS.success, field: "entrada" },
  { tipo: "INICIO_COLACION", label: "Inicio Colación", icon: "restaurant-outline",       color: COLORS.warning, field: "inicioColacion" },
  { tipo: "FIN_COLACION",    label: "Fin Colación",    icon: "checkmark-circle-outline", color: COLORS.accent,  field: "finColacion" },
  { tipo: "SALIDA",          label: "Salida",          icon: "log-out-outline",          color: COLORS.danger,  field: "salida" },
];

function mesLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

function rangoMes(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AsistenciaScreen() {
  const now = new Date();
  const [mesYear, setMesYear] = useState(now.getFullYear());
  const [mesMonth, setMesMonth] = useState(now.getMonth());
  const [registroHoy, setRegistroHoy] = useState<RegistroHoy | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState<MarcacionTipo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [correccionRegistro, setCorreccionRegistro] = useState<{ id: string; fecha: string } | null>(null);
  const [mesCerrado, setMesCerrado] = useState<boolean>(false);
  const [cerrando, setCerrando] = useState(false);

  const esHoy = mesYear === now.getFullYear() && mesMonth === now.getMonth();

  // Registrar push token al montar (silencioso, no critico)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          await api.pushToken(tokenData.data).catch(() => {});
        }
      } catch {
        // Push notifications opcional, no interrumpir
      }
    })();
  }, []);

  async function cargar(year = mesYear, month = mesMonth) {
    const { from, to } = rangoMes(year, month);
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const [data, cierreData] = await Promise.all([
      api.asistencia.get(from, to),
      !isCurrentMonth
        ? api.asistencia.estadoCierre(month + 1, year).catch(() => ({ cerrado: false, confirmedAt: null }))
        : Promise.resolve({ cerrado: false, confirmedAt: null }),
    ]);
    setRegistroHoy(isCurrentMonth ? data.registroHoy as RegistroHoy | null : null);
    setHistorial(data.historial as HistorialItem[]);
    setMesCerrado(cierreData.cerrado);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar().catch(() => Alert.alert("Error", "No se pudo cargar el historial")).finally(() => setLoading(false));
    }, [mesYear, mesMonth])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargar().catch(() => {});
    setRefreshing(false);
  }, [mesYear, mesMonth]);

  function navMes(delta: number) {
    let m = mesMonth + delta;
    let y = mesYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMesMonth(m);
    setMesYear(y);
    setLoading(true);
    cargar(y, m).finally(() => setLoading(false));
  }

  async function marcar(tipo: MarcacionTipo) {
    setMarcando(tipo);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat: number | undefined;
      let lng: number | undefined;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      await api.asistencia.marcar(tipo, lat, lng);
      await cargar();
      Alert.alert("Registrado", `${MARCACIONES.find(m => m.tipo === tipo)?.label} marcada correctamente.`);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al marcar");
    } finally {
      setMarcando(null);
    }
  }

  async function handleCerrarMes() {
    Alert.alert(
      "Confirmar asistencia",
      `¿Estás de acuerdo con los registros de asistencia de ${mesLabel(mesYear, mesMonth)}? Esta acción queda registrada.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setCerrando(true);
            try {
              await api.asistencia.cerrarMes(mesMonth + 1, mesYear);
              setMesCerrado(true);
              Alert.alert("Confirmado", `Tu asistencia de ${mesLabel(mesYear, mesMonth)} ha sido confirmada.`);
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Error al confirmar");
            } finally {
              setCerrando(false);
            }
          },
        },
      ]
    );
  }

  function formatHora(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }

  function formatFecha(iso: string) {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
  }

  const totalHoras = historial.reduce((acc, r) => acc + Number(r.horasTrabajadas ?? 0), 0);
  const diasTrabajados = historial.filter(r => r.entrada).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Marcaciones hoy — solo si es el mes actual */}
      {esHoy && (
        <>
          <Text style={styles.sectionTitle}>Marcaciones de hoy</Text>
          <View style={styles.marcacionesGrid}>
            {MARCACIONES.map((m) => {
              const hora = formatHora(registroHoy?.[m.field] as string | null ?? null);
              const registrada = !!hora;
              return (
                <TouchableOpacity
                  key={m.tipo}
                  style={[styles.marcacionCard, registrada && styles.marcacionRegistrada]}
                  onPress={() => !registrada && marcar(m.tipo)}
                  disabled={!!marcando || registrada}
                >
                  {marcando === m.tipo
                    ? <ActivityIndicator color={m.color} size="small" />
                    : <Ionicons name={m.icon} size={28} color={registrada ? COLORS.textMuted : m.color} />
                  }
                  <Text style={[styles.marcacionLabel, registrada && styles.marcacionLabelDone]}>{m.label}</Text>
                  {hora
                    ? <Text style={[styles.marcacionHora, { color: m.color }]}>{hora}</Text>
                    : <Text style={styles.marcacionPendiente}>Pendiente</Text>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Navegador de mes */}
      <View style={styles.mesNav}>
        <TouchableOpacity onPress={() => navMes(-1)} style={styles.mesBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.mesLabel}>{mesLabel(mesYear, mesMonth)}</Text>
        <TouchableOpacity
          onPress={() => navMes(1)}
          style={styles.mesBtn}
          disabled={esHoy}
        >
          <Ionicons name="chevron-forward" size={20} color={esHoy ? COLORS.border : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Resumen del mes */}
      {!loading && (
        <View style={styles.resumenRow}>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNum}>{diasTrabajados}</Text>
            <Text style={styles.resumenLabel}>Días trabajados</Text>
          </View>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNum}>{totalHoras.toFixed(1)}h</Text>
            <Text style={styles.resumenLabel}>Horas totales</Text>
          </View>
        </View>
      )}

      {/* Confirmar mes (meses pasados) */}
      {!loading && !esHoy && historial.length > 0 && (
        <TouchableOpacity
          style={[styles.cerrarMesBtn, mesCerrado && styles.cerrarMesBtnDone]}
          onPress={mesCerrado ? undefined : handleCerrarMes}
          disabled={mesCerrado || cerrando}
        >
          {cerrando
            ? <ActivityIndicator color={mesCerrado ? COLORS.success : COLORS.surface} size="small" />
            : <Ionicons
                name={mesCerrado ? "checkmark-circle" : "checkmark-circle-outline"}
                size={18}
                color={mesCerrado ? COLORS.success : COLORS.surface}
              />
          }
          <Text style={[styles.cerrarMesBtnText, mesCerrado && styles.cerrarMesBtnTextDone]}>
            {mesCerrado ? "Asistencia confirmada" : "Confirmar mi asistencia del mes"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Historial */}
      {loading
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        : historial.length === 0
          ? <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Sin registros este mes</Text>
            </View>
          : historial.map((item) => (
              <View key={item.id} style={styles.historialCard}>
                <View style={styles.historialTop}>
                  <Text style={styles.historialFecha}>{formatFecha(item.fecha)}</Text>
                  {item.horasTrabajadas != null && (
                    <View style={styles.horasBadge}>
                      <Text style={styles.horasText}>{Number(item.horasTrabajadas).toFixed(1)}h</Text>
                    </View>
                  )}
                </View>
                <View style={styles.historialMarcas}>
                  {[
                    { label: "Entrada",   hora: item.entrada,        color: COLORS.success },
                    { label: "Col. ini",  hora: item.inicioColacion,  color: COLORS.warning },
                    { label: "Col. fin",  hora: item.finColacion,     color: COLORS.accent  },
                    { label: "Salida",    hora: item.salida,          color: COLORS.danger  },
                  ].map((mk) => (
                    <View key={mk.label} style={styles.marcaTick}>
                      <Text style={styles.marcaLabel}>{mk.label}</Text>
                      <Text style={[styles.marcaHora, { color: mk.hora ? mk.color : COLORS.border }]}>
                        {mk.hora ? formatHora(mk.hora) : "--:--"}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.correccionBtn}
                  onPress={() => setCorreccionRegistro({ id: item.id, fecha: item.fecha })}
                >
                  <Ionicons name="create-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.correccionBtnText}>Solicitar corrección</Text>
                </TouchableOpacity>
              </View>
            ))
      }

      <SolicitarCorreccionModal
        registroId={correccionRegistro?.id ?? null}
        fecha={correccionRegistro?.fecha ?? null}
        onClose={() => setCorreccionRegistro(null)}
        onEnviado={() => { setCorreccionRegistro(null); onRefresh(); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 12 },
  marcacionesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  marcacionCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  marcacionRegistrada: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", opacity: 0.7 },
  marcacionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, textAlign: "center" },
  marcacionLabelDone: { color: COLORS.textMuted },
  marcacionHora: { fontSize: 16, fontWeight: "700" },
  marcacionPendiente: { fontSize: 12, color: COLORS.textMuted },
  mesNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  mesBtn: { padding: 8 },
  mesLabel: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, textTransform: "capitalize" },
  resumenRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  resumenCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  resumenNum: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
  resumenLabel: { fontSize: 12, color: COLORS.textSecondary },
  cerrarMesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  cerrarMesBtnDone: {
    backgroundColor: `${COLORS.success}18`,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  cerrarMesBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },
  cerrarMesBtnTextDone: { color: COLORS.success },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  historialCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  historialTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historialFecha: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, textTransform: "capitalize" },
  horasBadge: { backgroundColor: `${COLORS.primary}14`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  horasText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  historialMarcas: { flexDirection: "row", justifyContent: "space-between" },
  marcaTick: { alignItems: "center", gap: 3 },
  marcaLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
  marcaHora: { fontSize: 13, fontWeight: "700" },
  correccionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  correccionBtnText: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600" },
});
