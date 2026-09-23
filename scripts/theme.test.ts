// Theme contract: with nothing stored the **browser/OS preference** decides (`prefers-color-scheme`),
// an explicit Light/Dark wins and is stored, and the OS flipping live only moves `system`.
// The stub world is installed before the import, because `theme.ts` reads the preference on load.
import { describe, expect, test } from "bun:test";

const store = new Map<string, string>();
let prefersDark = false;
const watchers: (() => void)[] = [];

(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};
(globalThis as Record<string, unknown>).matchMedia = (query: string) => ({
  matches: query.includes("prefers-color-scheme: dark") && prefersDark,
  addEventListener: (_: string, cb: () => void) => watchers.push(cb),
  removeEventListener: () => {},
});

const { getTema, isDark, setTema, TEMA_ADI, TEMALAR } = await import("../src/lib/theme");

describe("theme", () => {
  test("default is the system preference (nothing stored)", () => {
    expect(getTema()).toBe("system");
    expect(isDark()).toBe(false); // the stub OS says light
  });

  test("system follows the OS live", () => {
    prefersDark = true;
    for (const cb of watchers) cb(); // the OS flipped to dark
    expect(isDark()).toBe(true);
    prefersDark = false;
    for (const cb of watchers) cb();
    expect(isDark()).toBe(false);
  });

  test("an explicit choice beats the OS and is stored", () => {
    prefersDark = true;
    setTema("light");
    expect(isDark()).toBe(false); // light wins although the OS is dark
    expect(store.get("okumo-trainer/theme")).toBe("light");
    setTema("dark");
    expect(isDark()).toBe(true);
    expect(store.get("okumo-trainer/theme")).toBe("dark");
    setTema("system");
    expect(isDark()).toBe(true); // back to following the OS
  });

  test("the three options have Turkish msgid labels", () => {
    expect(TEMALAR).toEqual(["system", "light", "dark"]);
    expect(TEMA_ADI.system).toBe("Sistem");
    expect(TEMA_ADI.dark).toBe("Koyu");
  });

  test("no DOM: setting the theme does not throw", () => {
    expect(() => setTema("dark")).not.toThrow();
  });
});
