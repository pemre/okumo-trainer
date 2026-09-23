// Ana sayfadaki geçmiş görselleri: günlük XP grafiği (recharts) + tekrar takvimi
// (react-activity-calendar). İkisi de aynı `daily` serisinden beslenir (bkz. src/lib/history.ts).
import { ActivityCalendar } from "react-activity-calendar";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_DAYS, calendarRows, dailySeries, movingAverage } from "../lib/history";
import { useT } from "../lib/i18n";

// okumo.dev paleti: krem zemin, terracotta aksan. Seviye 0 boş gün.
const LEVEL_FILL = ["#e7dcc4", "#e6b795", "#d98a5f", "#c14a1d", "#8f3113"];
const AXIS = "#e3d6bd";
const INK = "#8a7a63";

// react-activity-calendar v3: tema zorunlu (varsayılan gri) ve tam iki renk verilir,
// aradaki seviyeleri kütüphane açar. Okumo krem zemin kullandığı için iki şemada da açık renk.
const CALENDAR_THEME = { light: ["#eee3cb", "#c14a1d"], dark: ["#eee3cb", "#c14a1d"] };

// Ay etiketleri dar alan (3 harf): iki dilli yazılamaz → açık dillerin ilki kullanılır.
const MONTHS: Record<string, string[]> = {
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export function XpChart({ daily }: { daily: Record<string, number> }) {
  const { t } = useT();
  const series = dailySeries(daily, CHART_DAYS);
  const average = movingAverage(series.map((day) => day.xp));
  const data = series.map((day, i) => ({
    ...day,
    avg: average[i],
    label: `${day.date.slice(8)}.${day.date.slice(5, 7)}`,
  }));
  const empty = series.every((day) => day.xp === 0);

  return (
    <section className="rounded-cozy bg-surface p-4 shadow-cozy" data-testid="xp-chart">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">
          {t("Son {n} gün", { n: CHART_DAYS })}
        </h2>
        <span className="text-xs text-inksoft">
          {empty ? t("henüz kayıt yok") : t("günlük XP")}
        </span>
      </div>
      <div className="mt-3 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke={AXIS} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: INK }}
              tickLine={false}
              axisLine={{ stroke: AXIS }}
              interval={4}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: `1px solid ${AXIS}`, fontSize: 12 }}
              labelStyle={{ color: INK }}
              cursor={{ fill: "rgba(193, 74, 29, 0.06)" }}
            />
            <Bar dataKey="xp" name="XP" radius={[3, 3, 0, 0]} maxBarSize={12}>
              {data.map((day) => (
                <Cell key={day.date} fill={LEVEL_FILL[day.level]} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="avg"
              name={t("7 günlük ortalama")}
              stroke={INK}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function ActivityHeat({ daily }: { daily: Record<string, number> }) {
  const { t, langs } = useT();
  const data = calendarRows(daily);

  return (
    <section className="rounded-cozy bg-surface p-4 shadow-cozy" data-testid="heatmap">
      <h2 className="font-display text-lg font-semibold">{t("Tekrar takvimi")}</h2>
      <p className="mt-1 text-xs text-inksoft">
        {t("Her kare bir gün; koyulaştıkça o gün daha çok XP.")}
      </p>
      <div className="mt-3 overflow-x-auto">
        {/* Kütüphane kaydırmayı kendi iç kapsayıcısında yapar
            (`.react-activity-calendar__scroll-container`), dışarıdaki sarmalayıcı taşmaz.
            52 hafta kutuya sığmadığı için varsayılan konum en sağ (bugün) olsun; `ref` çocuklar
            bağlandıktan sonra çalıştığı için iç kapsayıcı hazırdır. Genişlik veriden bağımsız
            sabit olduğundan bir kez yeter, ilerleme sonradan yüklense de konum kaymaz. */}
        <ActivityCalendar
          ref={(el) => {
            const kaydirici = el?.querySelector<HTMLElement>(
              ".react-activity-calendar__scroll-container",
            );
            if (kaydirici) kaydirici.scrollLeft = kaydirici.scrollWidth;
          }}
          data={data}
          blockSize={9}
          blockMargin={3}
          weekStart={1}
          colorScheme="light"
          labels={{ months: MONTHS[langs[0]] ?? MONTHS.tr }}
          theme={CALENDAR_THEME}
          showTotalCount={false}
          showWeekdayLabels={false}
          showColorLegend={false}
          tooltips={{ activity: { text: ({ date, count }) => `${date} · ${count} XP` } }}
        />
      </div>
    </section>
  );
}
