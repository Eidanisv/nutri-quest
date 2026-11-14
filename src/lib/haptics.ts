/** Vibração curta (Android/Chrome). iOS ignora. Disparar no mesmo frame do feedback visual. */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* sem suporte: ignora */
  }
}
