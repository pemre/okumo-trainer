/**
 * Reads Dutch aloud with the **browser's own voice** (`speechSynthesis`): no dependency, no audio
 * files, works offline, and on iOS/macOS the Dutch system voices (Xander/Fenna) are used.
 *
 * ponytail: known ceiling — the voice is whatever the device ships; a hosted TTS API would sound
 * better but costs a key plus a network round-trip (offline practice would break).
 */

/** Does this browser have speech synthesis at all? (Old/headless ones do not: no speaker then.) */
export function speakAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!speakAvailable() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // one voice at a time: a second tap interrupts the first
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "nl-NL";
  u.rate = 0.9; // learner pace: a shade slower than the default
  // Prefer **Netherlands** Dutch: the system list puts Flemish (`nl-BE`, Ellen) first, and its
  // rolled R reads harshly to a learner; `nl-NL` (Xander) is the model the lessons follow.
  const sesler = synth.getVoices();
  const nl =
    sesler.find((v) => v.lang.replace("_", "-").toLowerCase() === "nl-nl") ??
    sesler.find((v) => v.lang.toLowerCase().startsWith("nl"));
  if (nl) u.voice = nl; // no Dutch voice installed → let the browser pick by `lang`
  synth.speak(u);
}
