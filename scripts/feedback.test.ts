// Press-feedback contract: the shake really runs, a repeat press cancels the previous one and
// unsupported environments (no API) stay silent. Browser counterpart:
// okumo_feedback_check.py (asserts the animation starts and the tone plays on a real element).
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
  test("hard shake is 8 frames / 480 ms, soft is 6 frames / 260 ms", () => {
    const { element, calls } = fakeElement();
    shake(element, "hard");
    expect(calls[0].frames).toHaveLength(8);
    expect(calls[0].timing).toMatchObject({ duration: 480 });
    shake(element);
    expect(calls[1].frames).toHaveLength(6);
    expect(calls[1].timing).toMatchObject({ duration: 260 });
  });

  test("a second shake on the same element cancels the previous one", () => {
    const { element, cancelled } = fakeElement();
    shake(element);
    shake(element);
    expect(cancelled).toEqual([0]);
  });

  test("returns quietly when the element has no animation API", () => {
    expect(() => shake({} as Element)).not.toThrow();
    expect(() => shake(null)).not.toThrow();
  });

  test("uses translate only (no rotation)", () => {
    const { element, calls } = fakeElement();
    shake(element, "hard");
    for (const frame of calls[0].frames) {
      expect(String(frame.transform)).toStartWith("translate3d");
    }
  });

  test("with prefers-reduced-motion the shake stops while sound and haptics keep working", () => {
    const { element, calls } = fakeElement();
    // @ts-expect-error: fake window in the test environment
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    shake(element, "hard");
    expect(calls).toHaveLength(0);

    // @ts-expect-error: fake matchMedia, no need for a full MediaQueryList
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    shake(element);
    expect(calls).toHaveLength(1);

    expect(() => feedbackSound("click")).not.toThrow();
    expect(() => haptic()).not.toThrow();
  });
});

describe("sound and haptics", () => {
  test("playing a tone without AudioContext does not throw", () => {
    for (const kind of ["click", "success", "error", "finish"] as const) {
      expect(() => feedbackSound(kind)).not.toThrow();
    }
  });

  test("plays the right frequency when AudioContext exists", () => {
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
    // @ts-expect-error: fake window/AudioContext in the test environment
    globalThis.window = { AudioContext: FakeContext };
    feedbackSound("success");
    expect(frequencies[0]).toBe(880);
  });

  test("returns quietly without the vibration API", () => {
    expect(() => haptic()).not.toThrow();
    expect(() => haptic([10, 20])).not.toThrow();
  });
});
