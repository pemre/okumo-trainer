import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityHeat, XpChart } from "./components/History";
import {
  BigButton,
  CozyCard,
  Pill,
  ProgressBar,
  SettingsMenu,
  Speak,
  TopBar,
} from "./components/ui";
import MatchGame, { type GameResult } from "./games/MatchGame";
import SessionGame from "./games/SessionGame";
import { connectives, meta, verbs, words } from "./lib/data";
import { feedbackSound, haptic } from "./lib/feedback";
import { useT } from "./lib/i18n";
import { isDue } from "./lib/srs";
import {
  detectNewDeckItems,
  exportProgress,
  levelOf,
  levelProgress,
  recordSession,
  replaceProgress,
  resetProgress,
  startSync,
  useProgress,
  useSyncState,
} from "./lib/store";
import type { ModeId } from "./lib/types";

type Screen =
  | { name: "home" }
  | { name: "game"; mode: ModeId }
  | { name: "summary"; mode: ModeId; result: GameResult };

const MODES: { id: ModeId; icon: string; title: string; desc: string; tag?: string }[] = [
  {
    id: "match",
    icon: "🃏",
    title: "Eşleştirme",
    desc: "Solda Hollandaca + örnek cümle, sağda çevirisi. 5 çift.",
  },
  {
    id: "choice",
    icon: "✅",
    title: "Çoktan seçmeli",
    desc: "Hollandacadan çeviriye, çeviriden Hollandacaya 4 şıklı sorular.",
  },
  {
    id: "type",
    icon: "⌨️",
    title: "Yazma",
    desc: "Açık dillerdeki karşılığı verilir, Hollandacasını yazarsın.",
  },
  {
    id: "scramble",
    icon: "🧩",
    title: "Cümle dizme",
    desc: "Çevirisi verilir, karışık kelimeleri doğru sıraya dizip Hollandaca cümleyi kurarsın.",
  },
  {
    id: "connect",
    icon: "🔗",
    title: "Bağlaçlar",
    desc: "Bu haftanın bağlaçları: cümle içinde boşluğu doldur, anlamını pekiştir.",
    tag: "bu hafta",
  },
  {
    id: "verbs",
    icon: "🔄",
    title: "Fiil çekimi",
    desc: "215 düzensiz fiil, ses kalıbı ailelerine göre çekim alıştırması.",
  },
];

/** Max rows listed in the new-items popup — the rest collapse into "… and N more". */
const NEW_ITEMS_SHOWN = 20;

function describe(id: string): { nl: string; tr: string; en: string } | null {
  if (id.startsWith("c:")) {
    const c = connectives.find((x) => x.id === id.slice(2));
    return c ? { nl: c.nl, tr: `${c.functie} · ${c.tr}`, en: c.en } : null;
  }
  if (id.startsWith("v:")) {
    const v = verbs.find((x) => x.id === id.slice(2).split(":")[0]);
    return v ? { nl: `${v.inf} · ${v.vt} · ${v.vt_mv} · ${v.voltooid}`, tr: v.tr, en: v.en } : null;
  }
  const w = words.find((x) => x.id === id);
  return w ? { nl: w.nl, tr: w.tr, en: w.en } : null;
}

/** Deck row: `NL — <meaning in the enabled languages>` — new-items popup and deck list share it. */
function RecordRow({ id }: { id: string }) {
  const { ceviri } = useT();
  const info = describe(id);
  if (!info) return null;
  return (
    <li>
      <span className="font-semibold">{info.nl}</span>
      <Speak text={info.nl} />
      <span className="text-inksoft">— {ceviri(info)}</span>
    </li>
  );
}

/** Deck groups: the single source for the review counter, new-item detection and the deck list.
 *  Sorted alphabetically (Dutch dictionary order) — card order is irrelevant, the stamp diff is a set. */
const nlSirala = (a: { nl: string }, b: { nl: string }) => a.nl.localeCompare(b.nl, "nl");

const DECK_GROUPS = [
  { ad: "Kelimeler", icon: "📖", ids: [...words].sort(nlSirala).map((w) => w.id) },
  { ad: "Bağlaçlar", icon: "🔗", ids: [...connectives].sort(nlSirala).map((c) => `c:${c.id}`) },
  {
    ad: "Fiiller",
    icon: "🔄",
    ids: [...verbs].sort((a, b) => a.inf.localeCompare(b.inf, "nl")).map((v) => `v:${v.id}`),
  },
];

export default function App() {
  const progress = useProgress();
  const sync = useSyncState();
  const { t, ceviri } = useT();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [newItems, setNewItems] = useState<string[]>([]);
  const [deckQuery, setDeckQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sourcesDialog = useRef<HTMLDialogElement>(null);
  const newItemsDialog = useRef<HTMLDialogElement>(null);
  const deckDialog = useRef<HTMLDialogElement>(null);

  // Sync with the server on load and whenever the connection comes back (falls back to local).
  useEffect(() => startSync(), []);

  // Menus, cards and popup buttons get the yap.ev key click from one delegated listener.
  // The answer area is excluded: there the same press already plays its own verdict tone in
  // `settle()` (or the match game), and a click underneath would smear it.
  useEffect(() => {
    function onPress(e: PointerEvent) {
      const el = (e.target as Element | null)?.closest?.(
        "button, summary, a, input[type='checkbox']",
      );
      if (!el || el.closest("[data-testid='answers'], [data-testid='speak']")) return;
      feedbackSound("click");
      haptic();
    }
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, []);

  // Every card id in the deck: review counter, new-item detection and the deck list share it.
  // Verb ids keep the `v:` prefix (SRS key `v:<id>:<form>`) — without it `describe()` could not
  // resolve a verb and the popup row silently rendered empty.
  const allIds = useMemo(() => DECK_GROUPS.flatMap((g) => g.ids), []);

  // Deck search: plain case-insensitive substring match over NL + every translation.
  // A disabled language still matches (turning English off still finds "reach") — fewer surprises.
  const deckGroups = useMemo(() => {
    const q = deckQuery.trim().toLocaleLowerCase();
    if (!q) return DECK_GROUPS.map((g) => ({ ...g, ids: g.ids, hepsi: g.ids.length }));
    return DECK_GROUPS.map((g) => {
      const ids = g.ids.filter((id) => {
        const info = describe(id);
        return info ? `${info.nl} ${info.tr} ${info.en}`.toLocaleLowerCase().includes(q) : false;
      });
      return { ...g, ids, hepsi: g.ids.length };
    });
  }, [deckQuery]);
  const deckHits = deckGroups.reduce((n, g) => n + g.ids.length, 0);

  // Announce a grown deck (new lesson notes imported) once — on load and after a sync.
  useEffect(() => {
    const added = detectNewDeckItems(allIds);
    if (!added.length) return;
    setNewItems(added);
    if (!newItemsDialog.current?.open) newItemsDialog.current?.showModal();
  }, [allIds]);

  const dueCount = useMemo(
    () => allIds.filter((id) => isDue(progress.cards[id])).length,
    [allIds, progress],
  );

  const total = words.length + connectives.length + verbs.length;

  function startGame(mode: ModeId) {
    setScreen({ name: "game", mode });
  }

  function finish(mode: ModeId, result: GameResult) {
    recordSession(result.grades, result.xp);
    setScreen({ name: "summary", mode, result });
  }

  function downloadProgress() {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `okumo-trainer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const level = levelOf(progress.xp);

  return (
    <div className="min-h-dvh" data-feedback-root>
      <TopBar
        onHome={screen.name === "home" ? undefined : () => setScreen({ name: "home" })}
        right={
          <>
            <Pill title={t("Seri (üst üste oynanan gün)")}>🔥 {progress.streak}</Pill>
            <Pill title={t("Toplam XP")}>⭐ {progress.xp}</Pill>
            <Pill title={t("Seviye {n} · {xp} XP", { n: level, xp: progress.xp })}>
              {t("Sv {n}", { n: level })}
            </Pill>
            <Pill
              title={
                sync === "synced"
                  ? t("İlerleme yerel sunucuyla eşitlendi")
                  : sync === "offline"
                    ? t(
                        "Sunucuya ulaşılamıyor — ilerleme bu cihazda birikiyor, bağlantı gelince eşitlenir",
                      )
                    : t("Eşitleme bekleniyor")
              }
            >
              {sync === "synced" ? "☁️" : sync === "offline" ? "📴" : "💾"}
            </Pill>
            <SettingsMenu />
          </>
        }
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        {screen.name === "home" ? (
          <section className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {t("Hollandaca alıştırma")}
              </h1>
              <p className="mt-2 text-inksoft">
                {t(
                  "Sınıf notlarından üretilmiş {kelime} kelime/ifade, {baglac} bağlaç ve {fiil} fiil.",
                  {
                    kelime: words.length,
                    baglac: connectives.length,
                    fiil: verbs.length,
                  },
                )}{" "}
                {t("Bugün tekrar edilecek kart:")} <strong>{dueCount}</strong>
              </p>
            </div>

            <CozyCard className="bg-indigosoft">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {t("Seviye {n} · {xp} XP", { n: level, xp: progress.xp })}
                </span>
                <span className="text-inksoft">
                  {t("{n} tur oynandı", { n: progress.sessions })}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={Math.round(levelProgress(progress.xp) * 100)} max={100} />
              </div>
            </CozyCard>

            <XpChart daily={progress.daily} />
            <ActivityHeat daily={progress.daily} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {MODES.map((mode) => (
                <CozyCard
                  key={mode.id}
                  as="button"
                  onClick={() => startGame(mode.id)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      {mode.icon}
                    </span>
                    <span className="font-display text-lg font-semibold">{t(mode.title)}</span>
                    {mode.tag ? (
                      <span className="ml-auto rounded-full bg-accentsoft px-2 py-0.5 text-xs font-semibold text-accent">
                        {t(mode.tag)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-inksoft">{t(mode.desc)}</p>
                </CozyCard>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-inksoft">
              <button
                type="button"
                onClick={() => sourcesDialog.current?.showModal()}
                className="underline"
              >
                {t("📄 Veri kaynakları ({n})", { n: meta.sources.length })}
              </button>
              <button type="button" onClick={downloadProgress} className="underline">
                {t("İlerlemeyi indir")}
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="underline"
              >
                {t("İçe aktar")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(t("Tüm ilerleme (XP, seri, tekrar kartları) sıfırlanacak. Emin misin?"))
                  ) {
                    resetProgress();
                  }
                }}
                className="underline"
              >
                {t("Sıfırla")}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    replaceProgress(JSON.parse(await file.text()));
                  } catch {
                    alert(t("Dosya okunamadı."));
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                data-testid="deck-open"
                onClick={() => deckDialog.current?.showModal()}
                className="ml-auto underline"
              >
                {t("{n} kayıt", { n: total })}
              </button>
            </div>

            {/* Sources popup: files as obsidian:// links (vault "emre").
                Native <dialog> + showModal(): focus trap, ESC and backdrop come for free.
                Closing: ESC or the "Kapat" button (backdrop clicks trip an a11y lint for no gain). */}
            <dialog
              ref={sourcesDialog}
              className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-cozy bg-surface p-4 text-ink shadow-cozy backdrop:bg-sand/60 backdrop:backdrop-blur-sm"
            >
              <h2 className="font-display text-lg font-semibold">{t("Veri kaynakları")}</h2>
              <p className="mt-1 text-xs text-inksoft">
                {t(
                  "Uygulamadaki {n} kayıt bu ders notlarından üretilir. Bağlantılar notu Obsidian'da açar (kasa: emre).",
                  { n: total },
                )}
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {meta.sources.map((s) => (
                  <li key={s.file} className="flex items-baseline gap-2">
                    <a href={s.obsidian} className="underline">
                      {s.file.replace(" Hollandaca dil kursu.md", "")}
                    </a>
                    <span className="text-inksoft">{t("· {n} kayıt", { n: s.items })}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <BigButton onClick={() => sourcesDialog.current?.close()}>{t("Kapat")}</BigButton>
              </div>
            </dialog>

            {/* New-items popup: opened once when the deck grew since the last visit (new lesson
                notes imported). Native <dialog>: focus trap + ESC for free. */}
            <dialog
              ref={newItemsDialog}
              data-testid="new-items"
              className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-cozy bg-surface p-4 text-ink shadow-cozy backdrop:bg-sand/60 backdrop:backdrop-blur-sm"
            >
              <h2 className="font-display text-lg font-semibold">
                {t("🆕 {n} yeni kayıt geldi", { n: newItems.length })}
              </h2>
              <p className="mt-1 text-xs text-inksoft">
                {t("Son açılıştan bu yana desteye eklenenler (yeni ders notları):")}
              </p>
              <ul className="mt-3 flex max-h-[45vh] flex-col gap-1 overflow-y-auto text-sm">
                {newItems.slice(0, NEW_ITEMS_SHOWN).map((id) => (
                  <RecordRow key={id} id={id} />
                ))}
              </ul>
              {newItems.length > NEW_ITEMS_SHOWN ? (
                <p className="mt-2 text-xs text-inksoft">
                  {t("… ve {n} tane daha", { n: newItems.length - NEW_ITEMS_SHOWN })}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <BigButton onClick={() => newItemsDialog.current?.close()}>{t("Tamam")}</BigButton>
              </div>
            </dialog>

            {/* Deck list: the "N kayıt" button in the footer shows every record, grouped.
                Same <dialog> pattern; rows use RecordRow, identical to the new-items popup. */}
            <dialog
              ref={deckDialog}
              data-testid="deck"
              onClose={() => setDeckQuery("")}
              className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-cozy bg-surface p-4 text-ink shadow-cozy backdrop:bg-sand/60 backdrop:backdrop-blur-sm"
            >
              <h2 className="font-display text-lg font-semibold">
                {t("📚 {n} kayıt", { n: total })}
              </h2>
              <p className="mt-1 text-xs text-inksoft">
                {t(
                  "Ders notlarından üretilen destenin tamamı. Kelimeler alfabetik, fiiller çekim dizisi (inf · vt · vt_mv · voltooid) ile listelenir; arama çevirilerde de çalışır.",
                )}
              </p>
              <input
                type="search"
                data-testid="deck-search"
                value={deckQuery}
                onChange={(e) => setDeckQuery(e.target.value)}
                placeholder={t("Ara: Hollandaca ya da çeviri (örn. twijfel, şüphe)")}
                className="mt-3 w-full rounded-cozy border border-surface2 bg-sand px-3 py-2 text-sm"
              />
              <ul className="mt-3 flex max-h-[55vh] flex-col gap-3 overflow-y-auto text-sm">
                {deckGroups
                  .filter((g) => g.ids.length > 0)
                  .map((g) => (
                    <li key={g.ad} data-testid={`deck-group-${g.ad.toLowerCase()}`}>
                      <h3 className="sticky top-0 bg-surface text-xs font-semibold text-inksoft">
                        {g.icon} {t(g.ad)} · {g.ids.length}
                        {g.ids.length !== g.hepsi ? ` / ${g.hepsi}` : ""}
                      </h3>
                      <ul className="mt-1 flex flex-col gap-1">
                        {g.ids.map((id) => (
                          <RecordRow key={id} id={id} />
                        ))}
                      </ul>
                    </li>
                  ))}
              </ul>
              {deckHits === 0 ? (
                <p className="mt-2 text-xs text-inksoft" data-testid="deck-empty">
                  {t("Aramayla eşleşen kayıt yok.")}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <BigButton onClick={() => deckDialog.current?.close()}>{t("Kapat")}</BigButton>
              </div>
            </dialog>
          </section>
        ) : null}

        {screen.name === "game" ? (
          screen.mode === "match" ? (
            <MatchGame onFinish={(r) => finish("match", r)} />
          ) : (
            <SessionGame mode={screen.mode} onFinish={(r) => finish(screen.mode, r)} />
          )
        ) : null}

        {screen.name === "summary" ? (
          <section className="flex flex-col gap-4" data-testid="summary">
            <h1 className="font-display text-3xl font-semibold">
              {t("{a}/{b} doğru", { a: screen.result.correct, b: screen.result.total })}
            </h1>
            <p className="text-inksoft">
              {t("+{xp} XP · 🔥 {seri} gün seri · toplam {toplam} XP", {
                xp: screen.result.xp,
                seri: progress.streak,
                toplam: progress.xp,
              })}
            </p>

            {screen.result.wrongIds.length ? (
              <CozyCard>
                <div className="font-display text-lg font-semibold">
                  {t("Bu turda zorlandıkların")}
                </div>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {screen.result.wrongIds.map((id) => {
                    const info = describe(id);
                    return info ? (
                      <li key={id}>
                        <span className="font-semibold">{info.nl}</span>{" "}
                        <span className="text-inksoft">— {ceviri(info)}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
                <p className="mt-3 text-sm text-inksoft">
                  {t(
                    "Bu kartlar tekrar sırasında öne alındı; bir sonraki turda yeniden karşına çıkacak.",
                  )}
                </p>
              </CozyCard>
            ) : (
              <CozyCard className="bg-good/10">
                <p className="font-semibold">{t("Hepsi doğru — tebrikler! 🎉")}</p>
              </CozyCard>
            )}

            <div className="flex flex-wrap gap-3">
              <BigButton onClick={() => startGame(screen.mode)}>{t("Yeni tur")}</BigButton>
              <BigButton variant="soft" onClick={() => setScreen({ name: "home" })}>
                {t("Ana sayfa")}
              </BigButton>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
