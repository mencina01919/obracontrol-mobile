import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "@/lib/constants";

type Point = { x: number; y: number };
type Stroke = Point[];

interface Props {
  onConfirm: (svgData: string, base64: string) => void;
  onCancel: () => void;
}

function pointsToPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0]!.x.toFixed(1)},${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return d;
}

export default function SignaturePad({ onConfirm, onCancel }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke>([]);
  const [size, setSize] = useState({ width: 0, height: 180 });
  const viewRef = useRef<View>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  function onLayout(e: LayoutChangeEvent) {
    const { width, height, x, y } = e.nativeEvent.layout;
    setSize({ width, height });
    viewRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      offsetRef.current = { x: px, y: py };
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const pt = { x: pageX - offsetRef.current.x, y: pageY - offsetRef.current.y };
        currentStroke.current = [pt];
        setStrokes((s) => [...s, [pt]]);
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const pt = { x: pageX - offsetRef.current.x, y: pageY - offsetRef.current.y };
        currentStroke.current.push(pt);
        setStrokes((s) => {
          const copy = [...s];
          copy[copy.length - 1] = [...currentStroke.current];
          return copy;
        });
      },
      onPanResponderRelease: () => {
        currentStroke.current = [];
      },
    })
  ).current;

  function handleClear() {
    setStrokes([]);
  }

  function handleConfirm() {
    if (strokes.length === 0) return;
    const { width, height } = size;
    const paths = strokes.map((s) => pointsToPath(s)).filter(Boolean);
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${paths.map((d) => `<path d="${d}" stroke="#1e3a5f" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    const base64 = `data:image/svg+xml;base64,${btoa(svgData)}`;
    onConfirm(svgData, base64);
  }

  const isEmpty = strokes.length === 0;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Firma con el dedo</Text>

      <View
        ref={viewRef}
        style={styles.canvas}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <Svg width={size.width} height={size.height}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={pointsToPath(stroke)}
              stroke={COLORS.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
        {isEmpty && (
          <Text style={styles.placeholder}>Dibuja tu firma aquí</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnSecondaryText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleClear}>
          <Text style={styles.btnSecondaryText}>Limpiar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, isEmpty && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={isEmpty}
        >
          <Text style={styles.btnPrimaryText}>Confirmar firma</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  label: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  canvas: {
    height: 180,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    position: "absolute",
    color: COLORS.textMuted,
    fontSize: 14,
  },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
