import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import SignaturePad from "./SignaturePad";

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

type Step = "video" | "firma" | "enviando";

interface Props {
  charla: Charla | null;
  onClose: () => void;
  onFirmada: (svgData: string) => Promise<void>;
}

const { width } = Dimensions.get("window");
const VIDEO_HEIGHT = Math.round((width - 32) * 9 / 16);

export default function CharlaModal({ charla, onClose, onFirmada }: Props) {
  const [step, setStep] = useState<Step>("video");
  const [videoVisto, setVideoVisto] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const mountedRef = useRef(true);

  // Reset state each time a new charla opens
  useEffect(() => {
    if (charla) {
      setStep("video");
      setVideoVisto(false);
      setProgreso(0);
    }
  }, [charla?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const player = useVideoPlayer(
    charla?.videoUrl ?? null,
    useCallback((p) => {
      p.loop = false;
      p.addListener("timeUpdate", (e) => {
        if (!mountedRef.current) return;
        const dur = p.duration;
        if (!dur || dur === 0) return;
        const pct = e.currentTime / dur;
        setProgreso(pct);
        if (pct >= 0.9) setVideoVisto(true);
      });
    }, [])
  );

  async function handleFirma(svgData: string) {
    setStep("enviando");
    try {
      await onFirmada(svgData);
      // onFirmada closes the modal via setSelected(null) in parent
    } catch {
      if (mountedRef.current) setStep("firma");
    }
  }

  function handleClose() {
    player.pause();
    onClose();
  }

  const hasVideo = !!charla?.videoUrl;
  const pct = Math.min(100, Math.round(progreso * 100));

  return (
    <Modal
      visible={!!charla}
      animationType="slide"
      transparent
      onRequestClose={step !== "enviando" ? handleClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={2}>{charla?.titulo}</Text>
            {step !== "enviando" && (
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            scrollEnabled={step !== "firma"}
          >
            <Text style={styles.tema}>{charla?.tema}</Text>

            {/* ── Ya firmada ── */}
            {charla?.firmada && (
              <View style={styles.firmadaBox}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
                <Text style={styles.firmadaTitle}>Charla firmada</Text>
                {charla.firmadoEn && (
                  <Text style={styles.firmadaSub}>
                    {new Date(charla.firmadoEn).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                )}
              </View>
            )}

            {/* ── Pendiente: video + firma ── */}
            {!charla?.firmada && (
              <>
                {/* Video */}
                {hasVideo && step === "video" && (
                  <View style={{ marginTop: 16 }}>
                    <VideoView
                      player={player}
                      style={[styles.video, { height: VIDEO_HEIGHT }]}
                      allowsFullscreen
                      allowsPictureInPicture={false}
                      contentFit="contain"
                    />
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>{pct}% visto</Text>
                      {videoVisto && (
                        <View style={styles.vistoBadge}>
                          <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                          <Text style={styles.vistoText}>Completado</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.firmarBtn, !videoVisto && styles.firmarBtnDisabled]}
                      onPress={() => setStep("firma")}
                      disabled={!videoVisto}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#fff" />
                      <Text style={styles.firmarBtnText}>
                        {videoVisto ? "Firmar charla" : `Ver el video antes de firmar (${pct}%)`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Sin video */}
                {!hasVideo && step === "video" && (
                  <TouchableOpacity style={[styles.firmarBtn, { marginTop: 16 }]} onPress={() => setStep("firma")}>
                    <Ionicons name="pencil-outline" size={16} color="#fff" />
                    <Text style={styles.firmarBtnText}>Firmar charla</Text>
                  </TouchableOpacity>
                )}

                {/* Pad de firma */}
                {step === "firma" && (
                  <View style={{ marginTop: 16 }}>
                    <SignaturePad
                      onConfirm={handleFirma}
                      onCancel={() => setStep(hasVideo ? "video" : "video")}
                    />
                  </View>
                )}

                {/* Enviando */}
                {step === "enviando" && (
                  <View style={styles.enviandoBox}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                    <Text style={styles.enviandoText}>Enviando firma…</Text>
                  </View>
                )}
              </>
            )}
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
    maxHeight: "92%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  body: { flexGrow: 0 },
  bodyContent: { padding: 16, paddingBottom: 8 },
  tema: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  video: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  progressLabel: { fontSize: 12, color: COLORS.textMuted },
  vistoBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  vistoText: { fontSize: 12, fontWeight: "600", color: COLORS.success },
  firmarBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  firmarBtnDisabled: { backgroundColor: COLORS.textMuted },
  firmarBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  firmadaBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  firmadaTitle: { fontSize: 18, fontWeight: "700", color: COLORS.success },
  firmadaSub: { fontSize: 14, color: COLORS.textSecondary },
  enviandoBox: { alignItems: "center", gap: 16, paddingVertical: 48 },
  enviandoText: { color: COLORS.textSecondary, fontSize: 15 },
});
