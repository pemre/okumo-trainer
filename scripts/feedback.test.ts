// Bas geri bildirimi sözleşmesi: titreme gerçekten oynar, mükerrer basışta öncekini iptal eder,
// desteklemeyen ortamda (API yok) sessizce hiçbir şey yapmaz. Tarayıcı karşılığı:
// okumo_feedback_check.py (gerçek elemanda animasyonun başladığını ve tonun çalındığını doğrular).
import { describe, expect, test } from "bun:test";
import { feedbackSound, haptic, shake } from "../src/lib/feedback";

type Call = { frames: Keyframe[]; timing: KeyframeAnimationOptions };

function fakeElement() {
  const calls: Call[] = [];
  const cancelled: number[] = [];
  const element = {
    animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
      const index = calls.length;
      calls.push({ frames, timing });
      return {
        cancel: () => cancelled.push(index),
        addEventListener: () => {},
      };
    },
  } as unknown as Element;
  return { element, calls, cancelled };
}

describe("shake", () => {
  test("sert titreme 8 kare / 480 ms, yumuşak 6 kare / 260 ms", () => {
    const { element, calls } = fakeElement();
    shake(element, "hard");
    expect(calls[0].frames).toHaveLength(8);
    expect(calls[0].timing).toMatchObject({ duration: 480 });
    shake(element);
    expect(calls[1].frames).toHaveLength(6);
    expect(calls[1].timing).toMatchObject({ duration: 260 });
  });

  test("aynı elemanda ikinci titreme öncekini iptal eder", () => {
    const { element, cancelled } = fakeElement();
    shake(element);
    shake(element);
    expect(cancelled).toEqual([0]);
  });

  test("animasyon API'si olmayan elemanda sessizce çıkar", () => {
    expect(() => shake({} as Element)).not.toThrow();
    expect(() => shake(null)).not.toThrow();
  });

  test("yalnızca translate kullanır (döndürme yok)", () => {
    const { element, calls } = fakeElement();
    shake(element, "hard");
    for (const frame of calls[0].frames) {
      expect(String(frame.transform)).toStartWith("translate3d");
    }
  });
});

describe("ses ve titreşim", () => {
  test("AudioContext yokken ton çalmak patlamaz", () => {
    for (const kind of ["click", "success", "error", "finish"] as const) {
      expect(() => feedbackSound(kind)).not.toThrow();
    }
  });

  test("AudioContext varsa doğru frekansı çalar", () => {
    const frequencies: number[] = [];
    class FakeContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: "",
          frequency: {
            setValueAtTime: (value: number) => frequencies.push(value),
            linearRampToValueAtTime: () => {},
          },
          connect: (node: unknown) => node,
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: (node: unknown) => node,
        };
      }
    }
    // @ts-expect-error: test ortamında sahte window/AudioContext
    globalThis.window = { AudioContext: FakeContext };
    feedbackSound("success");
    expect(frequencies[0]).toBe(880);
  });

  test("titreşim API'si yoksa sessizce çıkar", () => {
    expect(() => haptic()).not.toThrow();
    expect(() => haptic([10, 20])).not.toThrow();
  });
});
