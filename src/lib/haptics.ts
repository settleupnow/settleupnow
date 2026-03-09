/**
 * Lightweight haptic feedback using the Vibration API.
 * Falls back silently on unsupported devices (desktop browsers).
 */

type HapticType = "success" | "warning" | "error" | "light";

const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [30, 20, 30, 20, 30],
};

export function trigger(type: HapticType = "light") {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(patterns[type]);
    }
  } catch {
    // silently fail
  }
}
