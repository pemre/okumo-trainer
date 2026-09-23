/**
 * Press feedback: sound + haptic buzz + a short shake (the key feel from yap.ev).
 *
 * The canonical, reusable version lives in the `PressFeedback` block of ay-ui-library.
 * The copy here is deliberate: the language app must stay dependency-free and offline, and the
 * GitHub Actions build cannot reach the sibling repo (ay-ui-library). If the library ships to npm,
 * this file turns back into `import { feedbackSound, haptic, shake } from "ay-ui-library"`.
 *
 * No audio files: tones are synthesised with Web Audio (works offline, no bundle weight).
 */

export type FeedbackKind = "click" | "success" | "error" | "finish";
export type ShakeKind = "soft" | "hard";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  if (typeof window === "undefined") return null;
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return null;
  try {
    context = new ctor();
  } catch {
    return null; // Web Audio yok: sessiz devam et, asla patlama
  }
  return context;
}

/** Plays a single tone; `glide` slides the frequency by that many Hz over the duration. */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.12,
  glide = 0,
): void {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (glide) osc.frequency.linearRampToValueAtTime(frequency + glide, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

const RECIPES: Record<FeedbackKind, () => void> = {
  click: () => {
    playTone(800, 0.06, "sine", 0.08);
    playTone(600, 0.05, "sine", 0.06);
  },
  success: () => {
    playTone(880, 0.12, "triangle", 0.15);
    setTimeout(() => playTone(1320, 0.1, "triangle", 0.12), 80);
  },
  error: () => {
    playTone(400, 0.1, "sine", 0.08);
    playTone(300, 0.08, "sine", 0.06);
  },
  finish: () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, "triangle", 0.18), i * 100);
    });
  },
};

/** Plays the tone for this moment (default: a short click). */
export function feedbackSound(kind: FeedbackKind = "click"): void {
  RECIPES[kind]();
}

/** Destekleyen platformda titretir (Android Chrome; iOS Safari yok sayar). */
export function haptic(pattern: number | number[] = [20, 30, 20]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no vibration API — nothing to do
  }
}

const SHAKES: Record<ShakeKind, { duration: number; frames: Keyframe[] }> = {
  soft: {
    duration: 260,
    frames: [
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(-3px, 1px, 0)" },
      { transform: "translate3d(3px, -1px, 0)" },
      { transform: "translate3d(-2px, 0, 0)" },
      { transform: "translate3d(2px, 0, 0)" },
      { transform: "translate3d(0, 0, 0)" },
    ],
  },
  hard: {
    duration: 480,
    frames: [
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(-6px, 1px, 0)" },
      { transform: "translate3d(6px, -1px, 0)" },
      { transform: "translate3d(-5px, 1px, 0)" },
      { transform: "translate3d(5px, -1px, 0)" },
      { transform: "translate3d(-3px, 0, 0)" },
      { transform: "translate3d(3px, 0, 0)" },
      { transform: "translate3d(0, 0, 0)" },
    ],
  },
};

const running = new WeakMap<Element, Animation>();

/**
 * A user with `prefers-reduced-motion: reduce` still gets sound and haptics, not the shake.
 * The check lives here because a CSS media query cannot cover the Web Animations API.
 */
function motionAllowed(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shakes the target. Uses `translate` only (no rotation) so the mobile viewport never shifts;
 * runs on the Web Animations API, so there is no stylesheet or add/remove-class race.
 * A second call cancels the shake still running on the same element.
 */
export function shake(target: Element | null | undefined, kind: ShakeKind = "soft"): void {
  if (!target || typeof target.animate !== "function" || !motionAllowed()) return;
  const { frames, duration } = SHAKES[kind];
  running.get(target)?.cancel();
  const animation = target.animate(frames, {
    duration,
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  });
  running.set(target, animation);
  animation.addEventListener("finish", () => {
    if (running.get(target) === animation) running.delete(target);
  });
}
