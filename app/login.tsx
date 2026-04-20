import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image,
} from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { saveAuth, type StoredUser } from "@/lib/auth";
import { COLORS } from "@/lib/constants";

type LoginMode = "rut" | "email";

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length === 0) return "";
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  if (body.length === 0) return dv;
  const reversed = body.split("").reverse();
  const grouped: string[] = [];
  for (let i = 0; i < reversed.length; i += 3) {
    grouped.push(reversed.slice(i, i + 3).reverse().join(""));
  }
  return grouped.reverse().join(".") + "-" + dv;
}

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>("rut");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  function handleRutChange(text: string) {
    setIdentifier(formatRut(text));
  }

  async function handleLogin() {
    const id = identifier.trim();
    const p = pin.trim();
    if (!id || !p) {
      Alert.alert("Campos requeridos", "Ingresa tu RUT/correo y PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        ...(mode === "rut" ? { rut: id } : { email: id }),
        pin: p,
      });

      const user = res.trabajador as StoredUser;
      await saveAuth(res.token, user);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo-white.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Portal del Trabajador</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "rut" && styles.toggleActive]}
              onPress={() => { setMode("rut"); setIdentifier(""); }}
            >
              <Text style={[styles.toggleText, mode === "rut" && styles.toggleTextActive]}>RUT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "email" && styles.toggleActive]}
              onPress={() => { setMode("email"); setIdentifier(""); }}
            >
              <Text style={[styles.toggleText, mode === "email" && styles.toggleTextActive]}>Correo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{mode === "rut" ? "RUT" : "Correo electrónico"}</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={mode === "rut" ? handleRutChange : setIdentifier}
              placeholder={mode === "rut" ? "12.345.678-9" : "nombre@empresa.cl"}
              placeholderTextColor={COLORS.textMuted}
              keyboardType={mode === "email" ? "email-address" : "default"}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={mode === "rut" ? 12 : undefined}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.help}>
          Si olvidaste tu PIN, contacta a tu supervisor o al área de RRHH.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logoImg: { width: 220, height: 72, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 20 },
  toggle: { flexDirection: "row", backgroundColor: COLORS.background, borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  toggleActive: { backgroundColor: COLORS.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: "500", color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.primary, fontWeight: "700" },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  help: { textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 24 },
});
