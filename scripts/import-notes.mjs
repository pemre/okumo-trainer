// Klas notlarını (Obsidian markdown) + fiil listesini uygulamanın okuduğu JSON'a çevirir.
// Kullanım: bun scripts/import-notes.mjs   (notlar SADECE okunur, asla yazılmaz)

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const NOTES_DIR =
  process.env.OKUMO_NOTES_DIR || "/Users/user/Desktop/emre/4. Belgelik/Hollandaca dil kursu";
const SOURCE_DIR = path.join(ROOT, "data-source");
const OUT_DIR = path.join(ROOT, "src", "data");

const TURKISH_HINT = /[çğıöşü]/i;
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, "")
    .trim();

const clean = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

// "komend (komınd)" → "komend" ; "m.a.w." gibi kısaltma parantezleri korunur
const stripParen = (s) =>
  s
    .replace(/\s*\(([^)]*)\)/g, (m, g) => (g.includes(".") ? m : ""))
    .replace(/\s+/g, " ")
    .trim();

const cells = (line) =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => stripParen(clean(c)));

const isSeparator = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

const splitSentenceCell = (cell) => {
  let m = cell.split(/\s+[—–]\s+/);
  if (m.length < 2) {
    // "NL cümle - TR çeviri": yalnızca tire sonrası Türkçe'ye özgü harf varsa böl
    const parts = cell.split(/\s+-\s+/);
    if (/[çğıöşü]/i.test(parts.slice(1).join(" - "))) m = parts;
  }
  if (m.length >= 2) return { zin: clean(m[0]), zin_tr: clean(m.slice(1).join(" — ")) };
  return { zin: clean(cell), zin_tr: "" };
};

const columnsFromHeader = (header) => {
  const h = header.map((c) => c.toLowerCase());
  const find = (...keys) => h.findIndex((c) => keys.some((k) => c.includes(k)));
  const map = {
    nl: find("hollandaca", "nederlands"),
    en: find("i̇ngilizce", "ingilizce", "english"),
    tr: find("türkçe", "turkce"),
    zin: find("cümle", "cumle", "örnek", "ornek"),
  };
  if (map.nl < 0 && h.length) map.nl = h[0] === "#" ? 1 : 0;
  return map;
};

function tableRowToItem(row, map) {
  const get = (i) => (i >= 0 && i < row.length ? row[i] : "");
  const nl = get(map.nl);
  if (!nl || nl === "#") return null;
  const item = { nl, en: get(map.en), tr: get(map.tr), zin: "", zin_tr: "", synoniem: "" };
  const cell = map.zin >= 0 ? get(map.zin) : "";
  if (cell) {
    if (/\s+[—–]\s+/.test(cell)) Object.assign(item, splitSentenceCell(cell));
    else if (TURKISH_HINT.test(cell) && !NL_LIKE.test(cell)) item.tr ||= cell;
    else Object.assign(item, splitSentenceCell(cell));
  }
  if (!item.tr && !item.zin && row.length > map.nl + 2) {
    const last = row[row.length - 1];
    if (last && !last.includes(" ") && last !== nl) item.synoniem = last; // ör. "uit elkaar halen … losmaken"
  }
  // Tek kelimelik hücre cümle değildir (eşanlamlı ya da çeviri olabilir)
  if (item.zin && !item.zin.includes(" ")) {
    if (TURKISH_HINT.test(item.zin)) item.tr ||= item.zin;
    else item.synoniem ||= item.zin;
    item.zin = "";
  }
  return item;
}

const NL_LIKE =
  /\b(de|het|een|ik|je|hij|zij|wij|niet|is|zijn|heb|hebt|heeft|moet|kan|kun|wil|ga|kom|dat|die|om|en|maar)\b/i;

function parseBullet(bodyRaw, out) {
  const body = clean(bodyRaw);
  if (body.includes("(")) return; // dipnot/açıklama maddesi
  const parts = body
    .split(/\s+[—–]\s+|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return;
  const [nlRaw, second, third] = parts;
  const quoted = /^["“]/.test(nlRaw);
  const nl = quoted ? nlRaw.replace(/^["“]|["”]\.?$/g, "").trim() : nlRaw.replace(/\.$/, "").trim();
  const item = { nl, en: "", tr: "", zin: "", zin_tr: "", synoniem: "" };
  if (TURKISH_HINT.test(second)) item.tr = second;
  else item.en = second;
  if (third) {
    if (quoted) {
      item.zin = nl;
      item.zin_tr = TURKISH_HINT.test(second) ? second : third;
      if (item.zin_tr === second) item.tr = "";
    } else item.zin = third;
  }
  if (quoted) item.zin = nl;
  if (!nl || norm(nl).length < 2) return;
  out.push(item);
}

function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^\s*\|/.test(line)) {
      const block = [];
      let j = i;
      while (j < lines.length && /^\s*\|/.test(lines[j])) block.push(lines[j++]);
      i = j - 1;
      if (block.length >= 2) {
        const header = cells(block[0]);
        const bodyStart = isSeparator(block[1]) ? 2 : 1;
        const map = columnsFromHeader(header);
        for (const raw of block.slice(bodyStart)) {
          const item = tableRowToItem(cells(raw), map);
          if (item && item.nl && !/^#+$/.test(item.nl)) items.push(item);
        }
      }
      continue;
    }

    const bullet = /^\*\s+(?<body>.+)$/.exec(line);
    if (bullet) parseBullet(bullet.groups.body, items);
  }
  return items;
}

function mergeItems(lists) {
  const byKey = new Map();
  for (const list of lists) {
    for (const it of list) {
      const key = norm(it.nl);
      if (!it.nl || it.nl.length < 2) continue;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, it);
        continue;
      }
      for (const f of ["en", "tr", "zin", "zin_tr", "synoniem"])
        if (!prev[f] && it[f]) prev[f] = it[f];
    }
  }
  return [...byKey.values()];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

async function main() {
  const files = (await readdir(NOTES_DIR)).filter((f) => f.endsWith(".md")).sort();
  const lists = [];
  const sources = [];
  for (const f of files) {
    const parsed = parseMarkdown(await readFile(path.join(NOTES_DIR, f), "utf8"));
    const bron = /^\d{4}-\d{2}-\d{2}/.exec(f)?.[0] || f;
    for (const it of parsed) it.bron = bron;
    lists.push(parsed);
    sources.push({ file: f, items: parsed.length });
  }

  const overrides = existsSync(path.join(SOURCE_DIR, "overrides.json"))
    ? JSON.parse(await readFile(path.join(SOURCE_DIR, "overrides.json"), "utf8"))
    : {};
  const connectieven = existsSync(path.join(SOURCE_DIR, "connectieven.json"))
    ? JSON.parse(await readFile(path.join(SOURCE_DIR, "connectieven.json"), "utf8"))
    : [];
  const connectiveKeys = new Set(
    connectieven.map((c) => norm(c.nl).replace(/[().]/g, "").replace(/\s+/g, " ")),
  );
  const ckey = (s) => norm(s).replace(/[().]/g, "").replace(/\s+/g, " ");

  const items = mergeItems(lists)
    .filter((it) => !connectiveKeys.has(ckey(it.nl)))
    .map((it) => {
      const ov = overrides[norm(it.nl)] || {};
      const nl = ov.nl || it.nl;
      const merged = {
        id: norm(nl)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        nl,
        en: ov.en || it.en || "",
        tr: ov.tr || it.tr || "",
        zin: ov.zin || it.zin || "",
        zin_tr: ov.zin_tr || it.zin_tr || "",
        synoniem: ov.synoniem || it.synoniem || "",
        type: nl.trim().includes(" ") ? "ifade" : "woord",
        bron: it.bron,
        auto: !!ov.auto,
        note: ov.note || "",
        eksik: [],
      };
      if (!merged.tr) merged.eksik.push("tr");
      if (!merged.en) merged.eksik.push("en");
      if (!merged.zin) merged.eksik.push("zin");
      if (!merged.tr || !merged.zin) merged.auto = true;
      return merged;
    });

  const werkwoorden = [];
  if (existsSync(path.join(SOURCE_DIR, "verbs.csv"))) {
    const [head, ...body] = parseCsv(await readFile(path.join(SOURCE_DIR, "verbs.csv"), "utf8"));
    for (const r of body) {
      const o = Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()]));
      if (!o.mastar) continue;
      werkwoorden.push({
        id: o.mastar,
        inf: o.mastar,
        vt: o.verleden_tijd_enkelvoud,
        vt_mv: o.verleden_tijd_meervoud,
        voltooid: o.voltooid_tijd,
        familie: o.aile_kodu,
        familie_adi: o.aile_adi,
        tr: o.betekenis_tr,
        en: o.betekenis_en,
      });
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const meta = { generated: new Date().toISOString(), notesDir: NOTES_DIR, sources };
  const write = (name, data) =>
    writeFile(path.join(OUT_DIR, name), `${JSON.stringify(data, null, 1)}\n`);
  await write("woorden.json", { meta, items });
  await write("connectieven.json", { meta, items: connectieven });
  await write("werkwoorden.json", { meta, items: werkwoorden });

  const eksik = items.filter((i) => i.eksik.length);
  const auto = items.filter((i) => i.auto);
  console.log(`kaynak       : ${sources.map((s) => `${s.file}=${s.items}`).join(", ")}`);
  console.log(
    `kelime/ifade : ${items.length}  (auto doldurulmuş: ${auto.length}, hâlâ eksik: ${eksik.length})`,
  );
  console.log(`bağlaç       : ${connectieven.length}   fiil: ${werkwoorden.length}`);
  if (eksik.length) console.log(eksik.map((e) => `${e.nl}[${e.eksik}]`).join(" | "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
