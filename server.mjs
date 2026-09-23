// Derlenmiş uygulamayı yerelde servis eder: SwiftBar başlatır, okumo.ev'ye Traefik yönlendirir.
// Bağımlılık yok — yap.ev'deki (emre-gorevler) desenin aynısı.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const PORT = Number(process.env.OKUMO_PORT || 8911);
const ROOT = path.join(import.meta.dir, "dist");

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

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", dist: existsSync(ROOT) }));
    return;
  }
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let file = path.join(ROOT, rel);
  // SPA: bilinmeyen yollar ve dizinler index.html'e düşer
  if (!rel || !existsSync(file) || statSync(file).isDirectory()) file = path.join(ROOT, "index.html");
  if (!existsSync(file)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("dist/ yok — `bun run build` çalıştırın");
    return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`okumo-trainer http://127.0.0.1:${PORT} (dist: ${ROOT})`);
});
