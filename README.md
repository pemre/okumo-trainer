# okumo-trainer

A Dutch practice app: **word/phrase cards generated from class notes**, the week's **connectives**
and conjugation drills for 215 irregular **verbs**, all in one place. It runs locally, is reachable
over the LAN at `http://dil.ev/`, and keeps working offline.

It borrows okumo.dev's language: cream background + terracotta accent, Fraunces/Nunito Sans, round
"cozy" cards; the review schedule is a simplification of SM-2. The home screen carries an XP chart
for the last 30 days (recharts) and a year-long review calendar (react-activity-calendar); the
**📄 Data sources** popup at the bottom opens the lesson notes the data comes from via `obsidian://`
links. When new lesson notes are imported, the records added to the deck are announced once on load
by the **🆕 new records popup**, while the permanent **"N records"** button lists the **whole** deck
in a popup (grouped by words/connectives/verbs, alphabetical, searchable). The 🌐 menu in the top bar
turns **interface languages** on and off (TR / EN / both) and sets their **priority order** — the
priority language shows everywhere, the other one only in meaning explanations.

---

## 0) Agent steering (this section is binding)

This README is the single reference for **every agent** (and human) working on this project. Read it
before changing code; update it after changing code.

### HARD RULE — the README stays current

> **Every meaningful change (new feature, behaviour/game-rule change, data schema, command,
> dependency, infrastructure, port/URL) must update this README in the same commit.**
> An outdated README counts as an unfinished change — the PR is not ready.
> Exception: bug fixes that change neither behaviour nor interface need not touch the README; a fix
> that makes behaviour explicit (e.g. "whitespace is now accepted") must.

Steering rules (Kiro style: trigger → expected behaviour):

| Trigger | Expected behaviour |
|---|---|
| New game mode | Question builder in `src/games/questions.ts` + a MODES card in `App.tsx` + a README "Game modes" row + coverage tests in `scripts/questions.test.ts` |
| New visual/chart component | `src/components/History.tsx` + pure math in `src/lib/history.ts` + `scripts/history.test.ts` + README "Chart and calendar" |
| Top bar / chip layout | Must stay one line on narrow screens: truncated `TopBar` title, `shrink-0` chips, sizes set once via `sm:` — verified at 320/375 px with `okumo_mobile_check.py` |
| New interactive element (button, chip, form) | Verified in the browser smoke test **by clicking**, not only with the keyboard (Enter) — `BigButton` is `type="button"` and never submits on its own |
| Sound/haptics/shake behaviour | `src/lib/feedback.ts` + `scripts/feedback.test.ts` + README "Press feedback"; the canonical copy lives in the sibling repo `ay-ui-library` (`PressFeedback` block) — keep both in sync in the same commit |
| Data schema / note parsing change | `src/lib/types.ts` + `import-notes.mjs` + `scripts/data.test.ts` + `scripts/notes.test.ts` + README "Data rules" change together |
| New command / dependency | `package.json` + the README "Commands" table |
| Port, URL, server endpoint | `server.mjs` + README "Service and infrastructure" + the SwiftBar plugin (`URL`, `PORT`) together |
| Progress/sync and deck changes | `src/lib/sync.ts` + `scripts/sync.test.ts` + README "Progress and syncing" (including the new-records popup) |
| New interface string / translation | Wrap the text in `t("…")` + add one line to the EN dictionary in `src/lib/i18n.ts` + `scripts/i18n.test.ts`; a missing dictionary entry falls back to Turkish |
| Lesson-notes folder moves | Run with `OKUMO_NOTES_DIR`, leave `import-notes.mjs` untouched |
| Missing/wrong field in the notes | Fix the **note itself** (table cell; convert a bullet to a table row when it lacks the 4 fields) → then `bun run import` + `bun test` |
| Commit | English, imperative, one line: `match: card shake on a wrong answer` |

Invariants:

1. **The lesson notes are the single source of truth.** `~/Desktop/emre/4. Belgelik/Hollandaca dil
   kursu/*.md` is the only source feeding the app; a missing or wrong field is fixed **in the note**
   and the note is re-imported (`bun run import`). Writing to the notes needs explicit human
   approval and the notes are not in git → take a copy first. The `data-source/overrides.json`
   mechanism used until 2026-09-23 was removed for this reason: all 73 corrections moved into the
   notes.
2. **No secrets in the repo.** No API keys, tokens, passwords, .env or personal data. This repo is public.
3. **Working offline is a feature.** No feature may require the internet (China / limited-connection
   scenario). When the network is there it syncs, otherwise local progress stands.
4. **UI strings are Turkish** (the app teaches a Turkish speaker), while **code comments, docs, test
   names and commit messages are English** so collaborating stays easy. Identifiers follow the data
   contract: field names coming from the note schema (`zin_tr`, `vt_mv`, `familie_adi`, `voltooid`,
   `synoniem`…) are Dutch/Turkish by design and are not renamed.
5. **`src/data/*.json` is generated** — never edited by hand, refreshed with `bun run import` and
   committed (CI/Pages has no vault).

---

## 1) Quick start

```bash
bun install
bun run import      # reads the class notes → src/data/*.json
bun test            # 68 tests: chart series, press feedback, question contracts, SRS, data, sync, notes parser, interface languages
bun run lint        # biome: lint + format check (1 warning tolerated, no errors)
bunx tsc --noEmit   # type check
bun run dev         # development (Vite, http://localhost:5173)
bun run build       # dist/
bun run serve       # serves dist on http://127.0.0.1:8911
```

Locally it is managed from SwiftBar:
`~/Downloads/github-pemre/swiftbar-plugins/modules/okumo-trainer.30s.sh`
(status, start/stop/restart, **build**, **import class notes** = import+build+restart, logs, a
"stale dist" warning). Logs: `/tmp/okumo-trainer-{server,import,swiftbar}.log`.

---

## 2) Architecture

```
okumo-trainer/
├── data-source/            # sources maintained by hand
│   ├── verbs.csv           # 215 verbs: infinitive + conjugations + sound-pattern family
│   ├── patterns.md         # 14 sound-pattern families + exceptions
│   └── connectieven.json   # connective deck (meaning, function, example sentence)
├── scripts/
│   ├── import-notes.mjs    # Obsidian notes → src/data/*.json (+ obsidian:// links)
│   ├── srs.test.ts         # spaced repetition, session selection, answer checking
│   ├── data.test.ts        # contracts of the generated data
│   ├── notes.test.ts       # notes parser: lines that do/don't become records (+line numbers)
│   ├── questions.test.ts   # question builders: every mode produces questions, every answer passes the rule
│   ├── feedback.test.ts    # press feedback: shake frames, cancellation, silent fallback, tone frequency
│   ├── history.test.ts     # daily series: missing days, DST shift, level thresholds, average
│   └── sync.test.ts        # rules for merging two devices' progress
├── src/
│   ├── App.tsx             # home screen (mode cards, XP/streak, sources popup) + round summary
│   ├── components/ui.tsx   # CozyCard, Pill, BigButton, ProgressBar, TopBar, LangMenu
│   ├── components/History.tsx # XpChart (recharts) + ActivityHeat (react-activity-calendar)
│   ├── lib/
│   │   ├── types.ts        # WordItem, Connective, Verb, CardState, Progress, ModeId
│   │   ├── data.ts         # imports the generated JSON
│   │   ├── i18n.ts         # interface languages: TR + EN, priority order, useT()
│   │   ├── srs.ts          # SM-2 simplification: review(), checkTyped(), pickSession()
│   │   ├── sync.ts         # mergeProgress(), newDeckIds(), normalizeProgress() — pure functions
│   │   ├── feedback.ts     # press feedback: Web Audio tones, haptics, WAAPI shake
│   │   ├── history.ts      # daily XP series: gap filling, level thresholds, moving average
│   │   └── store.ts        # localStorage + server sync, XP/streak, deck stamp, React hooks
│   ├── games/
│   │   ├── questions.ts    # per-mode question builders
│   │   ├── MatchGame.tsx   # matching (5+5 pairs)
│   │   └── SessionGame.tsx # choice / type / scramble / connect / verbs rounds
│   └── data/*.json         # GENERATED data (lives in the repo, CI has no notes)
├── server.mjs              # serves dist + /api/progress (dependency-free HTTP server)
├── biome.json              # lint + format (2 spaces, double quotes, 100 columns)
└── .github/workflows/      # ci.yml · deploy.yml · pages-preview.yml
```

Data flow:

```
Obsidian notes ──(bun run import)──> src/data/woorden.json ─┐
data-source/connectieven.json ──────────────────────────────┼─> app (React)
data-source/verbs.csv ──────────────────────────────────────┘
                                                            └─> progress: localStorage ⇄ /api/progress ⇄ data/progress.json
```

The notes live in the vault (`OKUMO_NOTES_DIR` can point elsewhere); every source gets an
`obsidian://open?vault=…&file=…` link (`OKUMO_VAULT_DIR`, default `/Users/user/Desktop/emre`; the
vault name is the folder name).

---

## 3) Game modes

| Mode | What it does | SRS key |
|---|---|---|
| 🃏 **Matching** | Five Dutch cards on the left (word + example sentence below), five cards on the right (priority-language meaning, secondary meaning underneath). Tap to match; a wrong pair shakes red, matched pairs disappear. | `w.id` |
| ✅ **Multiple choice** | Four-option questions in the priority language: NL→meaning and meaning→NL (options come from other records). | `w.id` |
| ⌨️ **Typing** | The meaning (priority language) is given, you type the Dutch. `de/het`, punctuation, case and extra whitespace are tolerated. | `w.id` |
| 🧩 **Sentence scramble** | A sentence translation is given; shuffled Dutch word chips must be put in order (example sentences with ≥4 words). | `w.id` |
| 🔗 **Connectives** | Fill the gap in a sentence: half multiple choice, half typed. | `c:<slug>` |
| 🔄 **Verb drilling** | Verb + requested form (past singular/plural, past participle) → you type the conjugation. The sound-pattern family is shown as a hint. | `v:<csv-row>:<form>` |

Ten questions per round (five pairs when matching). A round is only as long as its pool allows:
**connectives run 9 questions** because the data holds 9 of them (every other mode reaches 10). The
round header shows `k / N` for the question you are on and the bar uses the *same* base, so the last
question is a full bar — the bar never trails the counter.

A correct answer is +10 XP, a wrong one +2 XP;
wrong answers are listed at the end of the round and the card's review date is pulled back to today.
Level: every 200 XP is one level.

### Press feedback (sound, haptics, shake)

Every answer gets the yap.ev key feel: tone + haptics + a short shake, all **in one place**
(`settle()`). Finishing a round plays a closing fanfare and shakes the whole page
(`[data-feedback-root]`).

| Moment | Sound | Shake |
|---|---|---|
| Correct | `success` (880 → 1320 Hz) | soft (6 frames / 260 ms, question card) |
| Wrong | `error` (400 → 300 Hz) | hard (8 frames / 480 ms, question card) |
| Round end | `finish` (523/659/784/1047 Hz arpeggio) | hard (whole page) |

- No audio files: tones are synthesised with Web Audio → **works offline**, nothing added to the bundle.
- `src/lib/feedback.ts` has no dependencies; without Web Audio / vibration / animation APIs it does
  nothing and never throws (iOS Safari ignores vibration; sound and shake still work).
- The shake uses the Web Animations API with `translate` only (no rotation → no mobile viewport
  shift); a repeated press cancels the previous shake, so there is no add/remove-class race.
- `prefers-reduced-motion: reduce` is honoured: the shake stops, **sound and haptics keep working**.
  The check lives in `feedback.ts` because a CSS media query cannot cover the Web Animations API
  (the block in `styles.css` only disables CSS animations).
- **The canonical, reusable version lives in the `ay-ui-library` repo**: the `PressFeedback` block
  (`usePressFeedback()` + `feedbackSound()`, `haptic()`, `shake()`). The copy here exists because the
  language app must stay dependency-free and offline, and the GitHub Actions build cannot reach the
  sibling repo; if the library is published to npm this file turns back into an import.
- Verification: `scripts/feedback.test.ts` (unit: frame counts, cancellation, silent fallback, tone
  frequency) + `okumo_feedback_check.py` (browser: measures that the animation starts and the tone
  plays on a real element).
- If the sound ever gets annoying, one condition in front of the `feedbackSound` calls turns it off;
  a permanent 🔊/🔇 button would go here **and** into `ay-ui-library`'s `PressFeedback` block.

---

### Daily XP chart and review calendar

The home screen has two visuals, both fed by the `Progress.daily` series (day → XP earned that day):

| Component | What it shows | Source |
|---|---|---|
| `XpChart` (recharts `ComposedChart`) | Last 30 days: daily XP bars (coloured by level) + a 7-day average line | `src/components/History.tsx` |
| `ActivityHeat` (react-activity-calendar v3) | 52 weeks of squares; `count` = that day's XP, `level` 0-4 | same file |

- Level thresholds: 30/60/90/120 XP → 1/2/3/4 (`levelFor`, `src/lib/history.ts`). A day with no
  activity is 0 (cream).
- The series builder is pure: missing days are filled with 0 and dates advance by calendar day
  (`addDays`) — subtracting milliseconds would shift the day across a DST change. Tests:
  `scripts/history.test.ts`.
- The chart/calendar only draw **local** data; they work without the server (consistent with the
  offline invariant).
- Verification: `scripts/history.test.ts` (unit) + `okumo_history_check.py` (browser: empty progress
  draws squares but no filled day; after a round a bar and a filled square appear and "henüz kayıt
  yok" disappears).
- react-activity-calendar v3 insists on two things: `{date, count, level}` fields and a `theme`
  (the default theme is grey). Both are set in `History.tsx`.
- 364 days do not fit in the box, so the calendar scrolls horizontally and **starts at the far right**
  (today): `scrollLeft = scrollWidth` when the container's `ref` attaches. The width is
  data-independent, so one pass is enough — a later progress load does not move it. (On mobile the
  user used to have to scroll right on every visit to see today.)
- Those two dependencies grow the bundle (raw 792 KB / gzip 235 KB; before 323 KB / 94 KB, i.e. ≈
  +140 KB gzip). Accepted because it is a one-off download for personal, offline use; no code
  splitting (lazy chunk) was introduced — `React.lazy` can move the chart/calendar into their own
  chunk if that ever matters.
- `daily` is only written when a round ends (`recordSession`): several rounds on the same day add up.

---

### Mobile layout (narrow screens)

The top bar is **always a single line**; even at 320 px the chips do not wrap (when they did, the bar
grew to 81 px, now 49 px). The rule has three parts and lives in `src/components/ui.tsx`:

- Title `min-w-0 truncate`: space runs out → the **title is clipped** (or hidden on purpose, see
  below) first; chips do not move. Crushed to a sliver (11 px on the game screen at 320 px) it read as
  a glitch, so it is `display:none` where it cannot be readable: the **game screen below `sm`** (the
  ← button plus the chips leave no room) and the **home screen below 360 px**.
- Chips `shrink-0 whitespace-nowrap`: they never compress and their content never breaks into two lines.
  The **🌐 chip drops its `TR+EN` label below `sm`** (~45 px back to the title); the icon still opens
  the menu, and the panel shows the state in full.
- Sizes from one place: the `TopBar` right cluster is `text-xs gap-1 px-3` (mobile) →
  `sm:text-sm sm:gap-2`, and `Pill` **never** sets its own font size (it would override the cluster).

Verified by `okumo_mobile_check.py` — measures 320/375/414/768 px × (home screen + game screen); the
page must not scroll sideways, chips stay on one line inside the screen, and the title must be
readable (≥60 px, never clipped) **or deliberately hidden** (`display:none`). The check only counts
chips the user can see: the closed language menu keeps its rows in the layout, clipped.

---

## 4) Data rules

- **The notes are the single source of truth.** Fix a missing/wrong field in the note; `bun run
  import` brings it into the app. There is no separate override file and no "agent filled this"
  marker (both removed on 2026-09-23 — the "✏️ filled records" section in the app went with them).
- Writing to the notes needs explicit approval and **the notes are not in git**: take a copy first
  and show the user a summary of the change. The note schema stays intact — only cell contents change.
- `import-notes.mjs` never writes, it only reads; updating a note is the job of the agent/workflow
  (the one-off migration script ran on 2026-09-23 and is not kept in the repo).
- Table rows in the notes: `Dutch | English | Turkish | example sentence`. The sentence cell is split
  on `—`/`–`; a single-word cell is not a sentence (it is classified as a synonym/translation).
- **Parenthesis rule** (`stripParen`): a single-word parenthesis is a pronunciation hint and is
  dropped (`komend (komınd)` → `komend`); a parenthesis containing a dot, comma or space is an
  explanation and is kept (`m.a.w.`, `to spend (money, time)`). So a short hint written as `(…)` in
  the note never shows up in the app.
- The sentence cell is stored as `NL — TR`; a sentence without a translation counts as incomplete.
- `src/data/*.json` is generated: never edited by hand, refreshed with `bun run import`, committed.
- **Silent loss is visible:** the end of the `bun run import` output lists lines that produced no
  record as file:line + reason + text. Reasons: *parenthesised bullet* (`* cursus (kurs, ders) vs
  opleiding (…)` — treated as a footnote), *bullet with 4+ parts* (`parseBullet` reads at most 3),
  *Dutch empty/too short*, *unreadable table row*. A non-empty list means either fix the line
  (bullet → table row) or accept it deliberately in the note; it is never ignored silently. Example:
  the `verloren` bullet had 4 parts and never reached the app (converted to a table row on
  2026-09-23, 85 → 86 records).
- Current data: **111 words/phrases · 9 connectives · 215 verbs** (335 records total; missing fields:
  0, skipped content: 2 footnotes).
- **Sources popup:** the "📄 Data sources (3)" button at the bottom of the home screen opens a native
  `<dialog>` (`showModal()`); each row opens its note in Obsidian
  (`obsidian://open?vault=emre&file=…`) and shows how many records came from that note. The list
  lives only in the popup so the page does not grow with it. Closing: ESC or **Kapat** (click-outside
  was not added because it needlessly trips the `useKeyWithClickEvents` a11y rule).

---

### Lesson photo → note → app

A note taken during class (table/list) or a **photo of the important words table on a tablet or
blackboard** travels the same path; there is no photo-parsing code, the flow is agent work:

1. The photo/note content is read and the rows are turned into the **note schema**:
   `| Dutch | English | Turkish | Example Sentence (NL) — translation |`.
2. The rows are added to the relevant lesson note
   (`4. Belgelik/Hollandaca dil kursu/<YYYY-MM-DD> Hollandaca dil kursu.md`). For a new lesson day a
   file is created (frontmatter: `title/date/created/url/tags/notes`). Cells are aligned to the same
   width for long lists; when rows are added to an existing table the table is realigned (otherwise
   the user notices the ragged columns).
3. `bun run import` → is "skipped content" empty? `bun test` (data contract) → `bun run build`.
4. Commit + push (README in the same commit). Local `dil.ev` reads the rebuilt `dist`; run the
   **build** action in the SwiftBar plugin if it warns about a stale dist. If the lesson-notes folder
   moves, run with `OKUMO_NOTES_DIR=… bun run import`.

Rules: the notes are the single source of truth (never write data straight into the app); if the same
word is added twice, `mergeItems` merges on normalised Dutch and fills empty fields — so a duplicate
row is harmless. A missing English/Turkish field counts as incomplete and turns the data test red,
which is why every new row is written with **all four fields filled**.

---

## 5) Progress and syncing

Local (always works): `localStorage["okumo-trainer/v1"]` — per card `ease/interval/reps/lapses/due/
lastSeen/at`, plus XP, streak and days played. The home screen can download/import/reset it as JSON.

Server (when available): `GET/PUT /api/progress` ⇄ `data/progress.json` (atomic write; a body that
fails shape validation gets 400; >512 KB is rejected). Flow: **fetch → merge → write if needed**.

`mergeProgress()` (see `scripts/sync.test.ts`):

- per card: the larger `at` (epoch ms) wins; a card present on one side only is kept,
- `xp`, `bestStreak`, `sessions`: maximum; `daysPlayed`: union; `streak`/`lastDay`: the newer side.
- `daily` (day → XP): the **maximum per day** wins. `ponytail:` ceiling — XP earned by two devices on
  the same day is not summed, it under-counts instead of double-counting; if per-device separation is
  ever needed, store a device id and total per device. `normalizeProgress` drops non-numeric,
  infinite and negative daily entries.

Offline behaviour: a failed request sets the state to `offline` (📴 in the UI) and the game continues;
1.5 s after every round it retries, and an `online` event syncs again. On the static site (GitHub
Pages) there is no `/api/progress` → it silently falls back to local mode and never shows an error.

### New-records popup (deck changes)

When new lesson notes are imported and `dist` is rebuilt the deck grows; the app notices **on load**
and shows the added records **once** in a popup (NL — priority meaning, at most 20 rows, the rest
collapsing into "… and N more"). No server needed: it works without a network because the source is
`src/data/*.json`.

- Stamp: `localStorage["okumo-trainer/deck"]` — the list of card ids the device **last saw**.
  `detectNewDeckItems()` (store.ts) runs once per page load, updates the stamp and returns the new
  ids; the comparison itself is the pure `newDeckIds(seen, all)` (`scripts/sync.test.ts`).
- First launch or a corrupt/cleared stamp: taken as the baseline **silently**, no popup. A corrupt
  stamp is repaired and the app keeps running. Even when the deck shrinks, the remaining records do
  not count as new.
- One card-id contract: word `id`, connective `c:<id>`, verb `v:<id>` (the SRS key for verbs is
  `v:<id>:<form>`). Listing verbs without the prefix made `describe()` fail to resolve them and the
  popup row rendered empty — `allIds` got the `v:` prefix for that reason on 2026-09-23.
- Verification: `python3 ~/.hermes/cache/scratch/okumo_new_items_check.py [address]` (shortens the
  stamp and reloads: the popup opens, "Tamam" closes it, a second load stays quiet, a corrupt stamp
  is handled, 375 px fits). Read-only — it never touches your progress.

### Deck list popup (all records)

The **"N records"** button at the bottom of the home screen (previously plain text) shows the whole
deck in a native `<dialog>`: 📖 Words · 🔗 Connectives · 🔄 Verbs, each group alphabetical (verbs as
`inf · past · past-plural · participle`), rows in the same format as the new-records popup (`NL —
meaning`).

- Single source: `DECK_GROUPS` (App.tsx) — the word/connective/verb ids are generated **there**, and
  `allIds` (review counter + new-record detection) is its flattened form, never duplicated. Adding a
  new group type (e.g. idioms) is one line in `DECK_GROUPS`.
- **Search box** (inside the popup, `type="search"`): case-insensitive substring match over the whole
  `describe()` text (Dutch **and** every translation), partial input is enough ("twij" → twijfel).
  While filtering, the group header shows `matches / total`, a group with no match is **hidden**, and
  with no results at all it says "Aramayla eşleşen kayıt yok." Closing the popup resets the query
  (`onClose`). Filtering runs on every keystroke — no measurable cost for 335 records; if it grows,
  build a module-level `Map` index instead of calling `describe` repeatedly.
- Card order does not matter (the stamp diff is a set); the list is read-only and never touches the
  game flow.
- Verification: `python3 ~/.hermes/cache/scratch/okumo_deck_popup_check.py [address]` — button text =
  popup header = sum of the group rows (currently 335 = 111+9+215), search (Dutch, Turkish, partial,
  no result, clearing, reset on reopen), a known record is listed, "Kapat" and ESC close it, no
  overflow at 375 px. Read-only.

### Interface languages (3 languages: TR + EN → Dutch)

The **🌐 menu** in the top bar (native `<details>`, `data-testid="lang-menu"`) turns interface
languages on and off and sets their **priority order**: `TR`, `EN` or `TR+EN`. The choice lives in
`localStorage["okumo-trainer/langs"]` as an **ordered array** — `langs[0]` is the priority language —
and **at least one language stays on** (turning off the last one is ignored).

- **The priority language shows everywhere**: interface strings (`translate`), month labels, and the
  language the questions are asked in.
- **A secondary language shows only in meaning explanations**, always listed after the priority one:
  deck rows (`NL — meaning`), feedback detail rows, the thin sub-line under a matching tile, and the
  question sub-line when a meaning is asked.
- **Reordering** happens in the menu: drag the ⠿ handle (native HTML5 drag & drop, mouse) or press
  ↑ (touch, keyboard, screen readers); both call the same `dilTasi(kaynak, hedef)` in
  `src/lib/i18n.ts`. Enabling a language appends it to the end, so the current priority never
  changes by accident.
- Default: both on with TR first. Language names are always written in their own language
  ("Türkçe"/"English"), so the way back is never lost.

- **Translation layer: `src/lib/i18n.ts`.** `react-intl` was deliberately not used: for ~95 lines of
  text the ICU + extraction chain would be heavy, and the app is dependency-free and works offline.
  - **msgid = the original Turkish text**: use `t("Kapat")`, dictionary `EN["Kapat"] = "Close"`. A
    missing entry falls back to Turkish → forgetting a translation never breaks the screen.
  - Placeholders use `{name}` (`t("{n} kayıt", { n: 335 })`), so the dictionary can hold the whole
    sentence.
  - Data translation `ceviri(ls, { tr, en })` joins the fields of the enabled languages **in priority
    order**; when the priority language has no field it shows what exists (no invented translations,
    no empty rows).
  - Components use `const { t, ceviri, langs } = useT()` (`useSyncExternalStore`): a language change
    re-renders only the subscribed components, with no global mutation.
- **Questions follow the priority language** (`buildQuestions(mode, size, cards, ls)`): priority TR →
  NL↔TR, priority EN → NL↔EN. The secondary language never asks questions. Languages are **frozen
  when a round starts** (`useState(getLangs)`): switching mid-round does not shuffle the questions,
  only the texts and detail rows switch instantly.
- **Known limits (data-driven; no invented translations):** `functie` (the connective function label)
  and sentence translations (`zin_tr`) only exist in Turkish → with TR off the connective hint is
  hidden and sentence scramble falls back to the word meaning. Verb family names are the one
  exception: the 15 sound-pattern codes are translated via `FAMILIE_EN` (the Turkish family name has
  no English counterpart in the data).
- **Adding a language** (e.g. German): `LANGS` + `LANG_ADI` + a dictionary + a `MONTHS` row; the menu
  renders itself from `LANGS`. Combinations like `TR · DE` follow the same rule.
- Verification: `python3 ~/.hermes/cache/scratch/okumo_lang_menu_check.py [address]` — default TR+EN,
  turning EN off falls back to Turkish, turning TR off gives an English interface plus English
  meanings, the last language cannot be turned off, a reload keeps the choice, ↑ and drag & drop
  reorder the priority, the interface and meaning order follow, the game hint/feedback matches the
  priority language, and nothing overflows at 375 px. The script aborts `/api/progress` → playing
  while it runs never touches the real progress on the server.

---

## 6) Service and infrastructure

| | |
|---|---|
| Port | `8911` (`OKUMO_PORT` overrides), `0.0.0.0` — reachable from the LAN |
| URL | `http://dil.ev/` — Pi-hole DNS record (`dns.hosts`: `192.168.1.200 dil.ev`) + Traefik file-provider router `okumo-trainer` → `http://192.168.1.30:8911` |
| Served | `dist/` only (SPA fallback index.html). Paths escaping `dist` are rejected (`%2e%2e%2f` included) |
| Endpoints | `GET /health` · `GET|PUT /api/progress` |
| Started by | `server.mjs` (dependency-free `node:http`); the SwiftBar plugin locally, launchd if preferred |
| State file | `data/progress.json` (+ `.tmp` atomic write) — **not in git** |
| Logs | `/tmp/okumo-trainer-server.log`, `/tmp/okumo-trainer-import.log`, `/tmp/okumo-trainer-swiftbar.log` |

Stopping the server uses the **PID holding the port** (`lsof -nP -iTCP:8911 -sTCP:LISTEN -t`); it
never touches another process. If the network side (DNS + Traefik) changes, verify the neighbouring
services too (`yap.ev`).

---

## 7) Tests and verification

```bash
bun test               # 68 tests / 8 files
bun run lint           # biome check (CI runs the same step)
bunx tsc --noEmit      # type check
python3 ~/.hermes/cache/scratch/okumo_mobile_check.py http://dil.ev/   # 320/375 px top bar
python3 ~/.hermes/cache/scratch/okumo_sources_popup_check.py          # sources popup + obsidian links
python3 ~/.hermes/cache/scratch/okumo_calendar_scroll_check.py        # calendar opens at the far right (today)
python3 ~/.hermes/cache/scratch/okumo_new_items_check.py              # new-records popup: quiet first load, 4 new words
python3 ~/.hermes/cache/scratch/okumo_lang_menu_check.py              # language menu: priority order, persistence, game+deck, 375 px
python3 ~/.hermes/cache/scratch/okumo_progress_check.py            # round bar: label = bar base, last question = 100%, connectives = 9
python3 ~/.hermes/cache/scratch/okumo_deck_popup_check.py             # "N records" button → the whole deck (335 = 111+9+215)
bun run build          # build
curl -s http://127.0.0.1:8911/health      # {"status":"ok","dist":true,"progress":…}
```

The `bun run import` output is evidence too: "missing fields: 0" and the "skipped content" list
(empty, or footnotes that were deliberately accepted).

Expected evidence after a change: the tests pass, `bun run lint` reports no errors, the type check is
clean, the build works, `/health` answers, and the played mode is verified by hand in the browser
(matching → other modes → summary → `localStorage` write). Typed steps are tried **both ways**:
submitting with Enter and clicking "Kontrol et" — on 2026-09-23 the button had lost its `onClick`, so
typing drills only worked with Enter and the tests missed it because they use Enter. Browser smoke
tests live in the local scratch folder, never in the repo.

---

## 8) Publishing (GitHub Pages)

- `main` → the root address (`deploy.yml`); `base: "./"` makes it work both at the root and in a subdirectory.
- Every PR → a preview under `/pull/<number>/` (`pages-preview.yml`), deleted when the PR closes.
  **Emre's preference: a preview link on every PR.**
- The Pages source must be **GitHub Actions** (Settings → Pages → Source: GitHub Actions); as long as
  "Deploy from a branch" is selected, PR previews are never created.

---

## 9) Roadmap / known limits

- Nothing outstanding right now. Progress sync goes through a single server file (enough for personal
  use; multi-user would need locking).
- Next ideas (on request): badges (first round, flawless round, 7-day streak…), a daily reminder cron
  (with the existing Telegram/Home Assistant skills), CSS confetti on a flawless round, tap popovers
  for `title=` hints that never show on touch, a no-JS `/liste` page (Kobo/printing), property-based
  tests for `mergeProgress`.
- The `uit elkaar halen` record lost its "losmaken" synonym on 2026-09-23: a single-word cell in the
  note now carries a sentence and the 4-column note schema has no room for `synoniem`. If needed, add
  a "Synonym" column to the notes and a key to `columnsFromHeader` (then it becomes visible in the note).
- Pronunciation (edge-tts) was considered but not added: it needs the internet, which conflicts with
  the offline scenario unless cached audio generation is designed first.
- Speaking practice (STT) is out of scope.
