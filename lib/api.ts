import Constants from "expo-constants";
import { getToken } from "./auth";
import { API_BASE } from "./constants";

const DISPOSITIVO_ID: string =
  Constants.easConfig?.runtimeVersion ??
  Constants.expoConfig?.extra?.deviceId ??
  Constants.installationId ??
  "unknown";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/mobile${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
  return data as T;
}

export const api = {
  login: (body: { rut?: string; email?: string; pin: string }) =>
    request<{ token: string; trabajador: Record<string, unknown> }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () =>
    request<{ trabajador: Record<string, unknown> }>("/me"),

  asistencia: {
    get: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      return request<{ registroHoy: unknown; historial: unknown[]; fechaHoy: string }>(`/asistencia${qs ? `?${qs}` : ""}`);
    },
    solicitarCorreccion: (body: { registroId: string; campo: string; valorNuevo: string; motivo: string }) =>
      request<{ ok: boolean; solicitudId: string }>("/asistencia/correcciones", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    marcar: (tipo: "ENTRADA" | "INICIO_COLACION" | "FIN_COLACION" | "SALIDA", lat?: number, lng?: number) =>
      request<{ ok: boolean; registro: unknown; marcacion: { id: string; hashRegistro: string } }>("/asistencia", {
        method: "POST",
        body: JSON.stringify({ tipo, lat, lng, dispositivoId: DISPOSITIVO_ID }),
      }),
  },

  documentos: (tipo?: string) =>
    request<{ documentos: unknown[] }>(`/documentos${tipo ? `?tipo=${tipo}` : ""}`),

  liquidaciones: () =>
    request<{ liquidaciones: unknown[] }>("/liquidaciones"),

  charlas: () =>
    request<{ charlas: unknown[] }>("/charlas"),

  firmarCharla: (id: string, svgData: string) =>
    request<{ ok: boolean; firmaId: string; firmadoEn: string }>(`/charlas/${id}/firmar`, {
      method: "POST",
      body: JSON.stringify({ svgData }),
    }),
};
