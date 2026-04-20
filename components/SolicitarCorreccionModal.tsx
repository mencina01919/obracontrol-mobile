import { useState } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";

type Campo = "entrada" | "salida" | "inicioColacion" | "finColacion";

const CAMPOS: { key: Campo; label: string }[] = [
  { key: "entrada",        label: "Entrada" },
  { key: "inicioColacion", label: "Inicio colación" },
  { key: "finColacion",    label: "Fin colación" },
  { key: "salida",         label: "Salida" },
];

interface Props {
  registroId: string | null;
  fecha: string | null;
  onClose: () => void;
  onEnviado: () => void;
}

export default function SolicitarCorreccionModal({ registroId, fecha, onClose, onEnviado }: Props) {
  const [campo, setCampo] = useState<Campo>("entrada");
  const [hora, setHora] = useState(""); // HH:MM
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar() {
    if (!hora.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Formato inválido", "Ingresa la hora en formato HH:MM (ej. 08:30)");
      return;
    }
    if (!motivo.trim()) {
      Alert.alert("Motivo requerido", "Debes indicar el motivo de la corrección.");
      return;
    }
    if (!registroId || !fecha) return;

    // Construir ISO usando la fecha del registro + la hora ingresada en hora Chile
    const [hh, mm] = hora.split(":").map(Number);
    const fechaBase = new Date(fecha + "T12:00:00");
    const valorNuevo = new Date(Date.UTC(
      fechaBase.getUTCFullYear(),
      fechaBase.getUTCMonth(),
      fechaBase.getUTCDate(),
      (hh ?? 0) + 3, // UTC-3 Chile
      mm ?? 0,
    )).toISOString();

    setEnviando(true);
    try {
      await api.asistencia.solicitarCorreccion({ registroId, campo, valorNuevo, motivo: motivo.trim() });
      Alert.alert("Solicitud enviada", "Tu solicitud de corrección fue enviada. Un supervisor la revisará pronto.");
      setHora("");
      setMotivo("");
      onEnviado();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={!!registroId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Solicitar corrección</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {fecha && (
              <Text style={styles.fechaLabel}>
                {new Date(fecha + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Campo a corregir</Text>
            <View style={styles.campoGrid}>
              {CAMPOS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.campoBtn, campo === c.key && styles.campoBtnActive]}
                  onPress={() => setCampo(c.key)}
                >
                  <Text style={[styles.campoBtnText, campo === c.key && styles.campoBtnTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Hora correcta (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={hora}
              onChangeText={setHora}
              placeholder="08:30"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>Motivo de la corrección</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej: El sistema no registró mi entrada por falla de red"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
              <Text style={styles.infoText}>
                La solicitud quedará pendiente hasta que un supervisor la apruebe. Recibirás el resultado en tu historial.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnEnviar, enviando && styles.btnDisabled]}
              onPress={handleEnviar}
              disabled={enviando}
            >
              {enviando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnEnviarText}>Enviar solicitud</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  body: { flexGrow: 0 },
  bodyContent: { padding: 16, gap: 4 },
  fechaLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, textTransform: "capitalize" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  campoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  campoBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  campoBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  campoBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  campoBtnTextActive: { color: COLORS.primary },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  inputMultiline: { height: 80, paddingTop: 12 },
  infoBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: `${COLORS.accent}10`, borderRadius: 10, padding: 12, marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  btnEnviar: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnEnviarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
