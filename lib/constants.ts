export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.84:3000";

export const COLORS = {
  // Paleta idéntica al sitio web (globals.css)
  primary:       "#00236f",   // --color-primary
  primaryLight:  "#1e3a8a",   // --color-primary-container
  accent:        "#4059aa",   // --color-surface-tint
  success:       "#16a34a",   // --color-green
  warning:       "#d97706",   // --color-amber
  danger:        "#ba1a1a",   // --color-error
  surface:       "#ffffff",   // --color-surface-bright
  background:    "#f4f6fb",   // --color-background
  border:        "#dce2f7",   // --color-surface-variant
  textPrimary:   "#141b2b",   // --color-on-background
  textSecondary: "#565e74",   // --color-secondary
  textMuted:     "#757682",   // --color-outline
};
