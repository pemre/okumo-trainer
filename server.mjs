// Serves the built app locally plus a small JSON store for progress syncing.
// Started by SwiftBar; dil.ev reaches it through Traefik. No dependencies.
import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.OKUMO_PORT || 8911);
const ROOT = path.join(import.meta.dir, "dist");
const DATA_DIR = path.join(import.meta.dir, "data");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const MAX_BODY = 512 * 1024; // the progress file is a few KB; anything above that is suspicious

// Conversation practice (duo-talk: Dutch tutor with speech in/out) runs as a separate Python
// server; this process only proxies it under the same origin so one address serves both.
const TALK_ORIGIN = process.env.OKUMO_TALK_ORIGIN || "http://127.0.0.1:8931";
const TALK_UP = new URL(TALK_ORIGIN);
const TALK_PORT = TALK_UP.port || "80";
const TALK_DIR =
  process.env.OKUMO_TALK_DIR || path.join(os.homedir(), "Downloads/github-pemre/duo-talk");
const TALK_API = ["/api/turn", "/api/review", "/api/tts", "/api/word", "/api/info", "/api/stt"];
// A turn waits for the model and the TTS render; the timeout exists so a stalled tutor
// answers with an error instead of leaving the browser hanging forever.
const TALK_TIMEOUT_MS = Number(process.env.OKUMO_TALK_TIMEOUT_MS || 120000);

const isTalkApi = (pathname) => TALK_API.includes(pathname);

const TALK_DOWN_PAGE = `<!doctype html><meta charset="utf-8">
<body style="font:16px/1.5 -apple-system,sans-serif;padding:2rem;max-width:34rem;margin:auto">
<h1>Konuşma sunucusu kapalı</h1>
<p>duo-talk başlamamış. Elle başlatmak için:</p>
<pre style="background:#eee;padding:.75rem;border-radius:8px;overflow:auto">cd ${TALK_DIR}
python3 server.py --port ${TALK_PORT} --host 127.0.0.1</pre>
<p>Ya da okumo sunucusunu yeniden başlat: <code>bash ~/Downloads/github-pemre/swiftbar-plugins/modules/okumo-trainer.30s.sh restart</code></p>
</body>`;

/** Reverse-proxy one request to the duo-talk server. Never hangs, never double-writes headers. */
function proxyToTalk(req, res, targetPath) {
  const out = httpRequest(
    {
      hostname: TALK_UP.hostname,
      port: TALK_UP.port,
      path: targetPath,
      method: req.method,
      // hop-by-hop headers (connection, transfer-encoding, upgrade…) are not forwarded
      headers: {
        accept: req.headers.accept ?? "*/*",
        "content-type": req.headers["content-type"] ?? "application/json",
        ...(req.headers["content-length"]
          ? { "content-length": req.headers["content-length"] }
          : {}),
      },
    },
    (up) => {
      const headers = { "content-type": up.headers["content-type"] ?? "application/octet-stream" };
      if (up.headers["content-length"]) headers["content-length"] = up.headers["content-length"];
      res.writeHead(up.statusCode ?? 502, headers);
      up.pipe(res);
    },
  );
  out.setTimeout(TALK_TIMEOUT_MS, () => out.destroy(new Error("upstream timeout")));
  out.on("error", (e) => {
    if (res.headersSent) {
      res.destroy(); // the body was already streaming; there is nothing left to explain
      return;
    }
    if (isTalkApi(new URL(req.url ?? "/", "http://x").pathname)) {
      sendJson(res, 503, { error: `duo-talk yanıt vermiyor (${TALK_ORIGIN}): ${e.message}` });
    } else {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(TALK_DOWN_PAGE);
    }
  });
  req.on("aborted", () => out.destroy());
  req.pipe(out);
}

// Start the tutor server with the app, unless it is already answering.
function ensureTalkServer() {
  const probe = httpRequest(`${TALK_ORIGIN}/api/info`, { method: "GET" }, (r) => r.resume());
  probe.setTimeout(1500, () => probe.destroy(new Error("probe timeout")));
  probe.on("error", () => {
    const child = spawn(
      process.env.OKUMO_PYTHON || "python3",
      ["server.py", "--port", TALK_PORT, "--host", "127.0.0.1"],
      { cwd: TALK_DIR, stdio: "ignore", detached: true },
    );
    child.on("spawn", () => console.log(`duo-talk başlatıldı (${TALK_DIR}, port ${TALK_PORT})`));
    child.on("error", (e) => console.warn(`duo-talk başlatılamadı (${TALK_DIR}): ${e.message}`));
    child.unref();
  });
  probe.end();
}

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
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Trust boundary: a body that fails the shape check never reaches the disk.
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
      sendJson(res, 200, null); // nothing stored yet
    }
    return;
  }
  if (req.method === "PUT" || req.method === "POST") {
    try {
      const parsed = JSON.parse(await readBody(req));
      if (!isProgress(parsed)) return sendJson(res, 400, { error: "invalid progress body" });
      await mkdir(DATA_DIR, { recursive: true });
      const tmp = `${PROGRESS_FILE}.tmp`;
      await writeFile(tmp, JSON.stringify(parsed, null, 1));
      await rename(tmp, PROGRESS_FILE); // atomic: no half-written file can survive
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
  if (isTalkApi(url.pathname)) {
    proxyToTalk(req, res, url.pathname + url.search);
    return;
  }
  if (url.pathname === "/konusma" || url.pathname === "/konusma/") {
    proxyToTalk(req, res, "/index.html");
    return;
  }
  if (url.pathname.startsWith("/konusma/")) {
    // relative assets of the tutor page must not fall through to the SPA fallback
    proxyToTalk(req, res, url.pathname.slice("/konusma".length) + url.search);
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
  // Paths escaping dist (%2e%2e%2f etc.) fall back to index.html.
  const resolved = path.resolve(ROOT, rel);
  const file =
    resolved.startsWith(ROOT + path.sep) &&
    existsSync(resolved) &&
    !statSync(resolved).isDirectory()
      ? resolved
      : path.join(ROOT, "index.html");
  if (!existsSync(file)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("no dist/ — run `bun run build`");
    return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`okumo-trainer http://127.0.0.1:${PORT} (dist: ${ROOT}, data: ${DATA_DIR})`);
  ensureTalkServer();
});
