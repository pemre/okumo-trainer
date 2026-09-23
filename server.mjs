// Derlenmiş uygulamayı yerelde servis eder + ilerleme eşitlemesi için küçük bir JSON deposu.
// SwiftBar başlatır; dil.ev Traefik üzerinden buraya gelir. Bağımlılık yok.
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const PORT = Number(process.env.OKUMO_PORT || 8911);
const ROOT = path.join(import.meta.dir, "dist");
const DATA_DIR = path.join(import.meta.dir, "data");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const MAX_BODY = 512 * 1024; // ilerleme dosyası birkaç KB; üstü şüpheli

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

const sendJson = (res, code, payload) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("gövde çok büyük"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Güven sınırı: şekil kontrolünden geçmeyen gövde diske yazılmaz.
const isProgress = (value) =>
  !!value &&
  typeof value === "object" &&
  value.version === 1 &&
  typeof value.xp === "number" &&
  typeof value.streak === "number" &&
  !!value.cards &&
  typeof value.cards === "object" &&
  Array.isArray(value.daysPlayed);

async function handleProgress(req, res) {
  if (req.method === "GET") {
    try {
      sendJson(res, 200, JSON.parse(await readFile(PROGRESS_FILE, "utf8")));
    } catch {
      sendJson(res, 200, null); // henüz kayıt yok
    }
    return;
  }
  if (req.method === "PUT" || req.method === "POST") {
    try {
      const parsed = JSON.parse(await readBody(req));
      if (!isProgress(parsed)) return sendJson(res, 400, { error: "geçersiz ilerleme gövdesi" });
      await mkdir(DATA_DIR, { recursive: true });
      const tmp = `${PROGRESS_FILE}.tmp`;
      await writeFile(tmp, JSON.stringify(parsed, null, 1));
      await rename(tmp, PROGRESS_FILE); // atomik: yarı yazılmış dosya kalmaz
      sendJson(res, 200, { ok: true, updatedAt: parsed.updatedAt ?? 0 });
    } catch (error) {
      sendJson(res, 400, { error: String(error?.message ?? error) });
    }
    return;
  }
  sendJson(res, 405, { error: "method not allowed" });
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/api/progress") {
    await handleProgress(req, res);
    return;
  }
  if (url.pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      dist: existsSync(ROOT),
      progress: existsSync(PROGRESS_FILE),
    });
    return;
  }

  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  // dist dışına çıkan yollar (%2e%2e%2f vb.) index.html'e düşer.
  const resolved = path.resolve(ROOT, rel);
  let file =
    resolved.startsWith(ROOT + path.sep) && existsSync(resolved) && !statSync(resolved).isDirectory()
      ? resolved
      : path.join(ROOT, "index.html");
  if (!existsSync(file)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("dist/ yok — `bun run build` çalıştırın");
    return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`okumo-trainer http://127.0.0.1:${PORT} (dist: ${ROOT}, data: ${DATA_DIR})`);
});
