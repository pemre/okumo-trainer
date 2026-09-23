// Günlük seri sözleşmesi: eksik günler 0, tarihler artan ve tekil (yaz saati geçişinde kaymaz),
// seviye eşikleri 30/60/90/120 XP. Grafiğin ve ısı haritasının beslendiği yer burasıdır.
import { describe, expect, test } from "bun:test";
import { calendarRows, dailySeries, levelFor, movingAverage } from "../src/lib/history";

describe("levelFor", () => {
  test("eşikler 30/60/90/120 XP", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(-5)).toBe(0);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(30)).toBe(1);
    expect(levelFor(31)).toBe(2);
    expect(levelFor(91)).toBe(4);
    expect(levelFor(500)).toBe(4);
  });
});

describe("dailySeries", () => {
  test("bugünle biter, eksik günler 0 olur, tarihler artan", () => {
    const series = dailySeries(
      { "2026-09-21": 10, "2026-09-23": 50 },
      5,
      new Date(2026, 8, 23, 12),
    );
    expect(series.map((day) => day.date)).toEqual([
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
    ]);
    expect(series.map((day) => day.xp)).toEqual([0, 0, 10, 0, 50]);
    expect(series[4].level).toBe(2); // ceil(50/30)
  });

  test("yaz saati geçişini kapsayan 370 günde tarihler tekil kalır", () => {
    const dates = dailySeries({}, 370, new Date(2026, 9, 26, 0, 30)).map((day) => day.date);
    expect(new Set(dates).size).toBe(370);
    expect(dates[dates.length - 1]).toBe("2026-10-26");
  });
});

describe("movingAverage", () => {
  test("pencere başta kısalsa da doğru ortalama verir", () => {
    expect(movingAverage([10, 20, 30], 2)).toEqual([10, 15, 25]);
  });
});

describe("calendarRows", () => {
  test("count = o günün XP'si, level 0-4", () => {
    const rows = calendarRows({ "2026-09-23": 100 }, 3, new Date(2026, 8, 23, 12));
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ date: "2026-09-23", count: 100, level: 4 });
    expect(rows[0]).toMatchObject({ count: 0, level: 0 });
  });
});
