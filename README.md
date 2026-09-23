# okumo-trainer

Hollandaca alıştırma uygulaması: **sınıf notlarından üretilmiş kelime/ifade kartları**, haftanın
**bağlaçları** ve 215 düzensiz **fiilin çekim alıştırması** tek yerde. Yerelde çalışır, LAN'dan
`http://dil.ev/` üzerinden erişilir, çevrimdışıyken de oynanır.

okumo.dev'in dilini ödünç alır: krem zemin + terracotta aksan, Fraunces/Nunito Sans, yuvarlak
"cozy" kartlar; tekrar planı SM-2'den sadeleştirilmiştir.

---

## 0) Agent steering (bu bölüm bağlayıcıdır)

Bu README, projede çalışan **her agent'ın** (ve insanın) tek referansıdır. Kod değişmeden önce burası
okunur; kod değiştikten sonra burası güncellenir.

### HARD RULE — README güncel kalır

> **Anlamlı her değişiklik (yeni özellik, davranış/oyun kuralı değişikliği, veri şeması, komut,
> bağımlılık, altyapı, port/URL) aynı commit içinde bu README'yi güncellemek zorundadır.**
> Güncellenmemiş bir README, tamamlanmamış bir değişiklik sayılır — PR hazır sayılmaz.
> İstisna: davranışı ve arayüzü değiştirmeyen hata düzeltmeleri (bug fix) README'ye dokunmak zorunda
> değildir; davranışı tanımlı hale getiren bir düzeltme (örn. "boşluk artık kabul ediliyor")
> dokunmak zorundadır.

Steering kuralları (Kiro tarzı: tetikleyici → beklenen davranış):

| Tetikleyici | Beklenen davranış |
|---|---|
| Yeni oyun modu | `src/games/questions.ts`'e soru üretici + `App.tsx` MODES kartı + README "Oyun modları" satırı + `scripts/data.test.ts`'e kapsam testi |
| Veri şeması değişikliği | `src/lib/types.ts` + `import-notes.mjs` + `scripts/data.test.ts` + README "Veri kuralları" birlikte değişir |
| Yeni komut / bağımlılık | `package.json` + README "Komutlar" tablosu |
| Port, URL, sunucu ucu | `server.mjs` + `README` "Servis ve altyapı" + SwiftBar eklentisi (`URL`, `PORT`) birlikte |
| İlerleme/eşitleme mantığı | `src/lib/sync.ts` + `scripts/sync.test.ts` + README "İlerleme ve eşitleme" |
| Ders notu klasörü değişirse | `OKUMO_NOTES_DIR` ile çalıştır, `import-notes.mjs` dokunulmaz |
| Notlardaki eksik/hatalı alan | **Asla not dosyasını düzenleme** → `data-source/overrides.json` |
| Commit | Türkçe, emir kipi, tek satır: `eşleştirme: yanlışta kart titremesi` |

Değişmez ilkeler:

1. **Ders notları salt-okunurdur.** `~/Desktop/emre/4. Belgelik/Hollandaca dil kursu/*.md` hiçbir
   durumda yazılmaz; düzeltmeler `data-source/overrides.json`'da tutulur.
2. **Repo'ya sır girmez.** API anahtarı, token, parola, .env, kişisel veri yok. Bu repo public.
3. **Çevrimdışı çalışmak bir özelliktir.** Hiçbir özellik interneti zorunlu kılamaz (Çin/sınırlı
   bağlantı senaryosu). Ağ varsa eşitlenir, yoksa yerel ilerleme geçerlidir.
4. **Arayüz metinleri Türkçe**, kod yorumları Türkçe, tanımlayıcılar İngilizce.
5. **`src/data/*.json` üretilmiştir** — elle düzenlenmez, `bun run import` ile yenilenir ve commit edilir
   (CI/Pages'te vault bulunmaz).

---

## 1) Hızlı başlangıç

```bash
bun install
bun run import      # sınıf notlarını okur → src/data/*.json
bun test            # 17 test: SRS, veri sözleşmeleri, eşitleme birleştirme
bunx tsc --noEmit   # tip kontrolü
bun run dev         # geliştirme (Vite, http://localhost:5173)
bun run build       # dist/
bun run serve       # dist'i http://127.0.0.1:8911 üzerinde servis eder
```

Yerelde SwiftBar'dan yönetilir:
`~/Downloads/github-pemre/swiftbar-plugins/okumo-trainer.30s.sh`
(durum, başlat/durdur/yeniden başlat, **derle**, **sınıf notlarını içe aktar** = import+build+restart,
günlükler, "dist eski" uyarısı). Günlükler: `/tmp/okumo-trainer-{server,import,swiftbar}.log`.

---

## 2) Mimari

```
okumo-trainer/
├── data-source/            # elle bakımı yapılan kaynaklar
│   ├── verbs.csv           # 215 fiil: mastar + çekimler + ses kalıbı ailesi
│   ├── patterns.md         # 14 ses kalıbı ailesi + istisnalar
│   ├── connectieven.json   # bağlaç destesi (anlam, işlev, örnek cümle)
│   └── overrides.json      # notlarda eksik/hatalı alanların düzeltmeleri
├── scripts/
│   ├── import-notes.mjs    # Obsidian notları → src/data/*.json (notları SADECE okur)
│   ├── srs.test.ts         # aralıklı tekrar, oturum seçimi, cevap denetimi
│   ├── data.test.ts        # üretilen verinin sözleşmeleri
│   └── sync.test.ts        # iki cihazın ilerlemesini birleştirme kuralları
├── src/
│   ├── App.tsx             # ana sayfa (mod kartları, XP/seri, eşitleme durumu) + tur özeti
│   ├── components/ui.tsx   # CozyCard, Pill, BigButton, ProgressBar, TopBar
│   ├── lib/
│   │   ├── types.ts        # WordItem, Connective, Verb, CardState, Progress, ModeId
│   │   ├── data.ts         # üretilmiş JSON'ları içe alır
│   │   ├── srs.ts          # SM-2 sadeleştirmesi: review(), checkTyped(), pickSession()
│   │   ├── sync.ts         # mergeProgress(), normalizeProgress() — saf fonksiyonlar
│   │   └── store.ts        # localStorage + sunucu eşitlemesi, XP/seri, React hook'ları
│   ├── games/
│   │   ├── questions.ts    # moda göre soru üreticileri
│   │   ├── MatchGame.tsx   # eşleştirme (5+5 çift)
│   │   └── SessionGame.tsx # choice / type / scramble / connect / verbs turları
│   └── data/*.json         # ÜRETİLMİŞ veri (repoda durur, CI'da notlar yok)
├── server.mjs              # dist servisi + /api/progress (bağımlılıksız HTTP sunucu)
└── .github/workflows/      # ci.yml · deploy.yml · pages-preview.yml
```

Veri akışı:

```
Obsidian notları ──(bun run import)──> src/data/woorden.json ─┐
data-source/connectieven.json ────────────────────────────────┼─> uygulama (React)
data-source/verbs.csv ────────────────────────────────────────┘
                                                              └─> ilerleme: localStorage ⇄ /api/progress ⇄ data/progress.json
```

Notlar vault'ta durur (`OKUMO_NOTES_DIR` ile başka klasöre yönlendirilebilir).

---

## 3) Oyun modları

| Mod | Ne yapar | SRS anahtarı |
|---|---|---|
| 🃏 **Eşleştirme** | Solda 5 Hollandaca kart (kelime + altında örnek cümle), sağda 5 kart (İngilizce + altında Türkçe). Dokun-eşleştir; yanlışta kart kırmızı titrer, doğrular kaybolur. | `w.id` |
| ✅ **Çoktan seçmeli** | NL→TR, NL→EN, TR→NL yönlerinde 4 şıklı sorular (şıklar diğer kayıtlardan gelir). | `w.id` |
| ⌨️ **Yazma** | Türkçesi/İngilizcesi verilir, Hollandacasını yazarsın. `de/het`, noktalama, büyük-küçük harf ve fazla boşluk hoşgörülür. | `w.id` |
| 🧩 **Cümle dizme** | Türkçe çevirisi verilir; karışık Hollandaca kelime çipleri doğru sıraya dizilir (≥4 kelimeli örnek cümleler). | `w.id` |
| 🔗 **Bağlaçlar** | Cümlede boşluk doldurma: yarısı çoktan seçmeli, yarısı yazarak. | `c:<slug>` |
| 🔄 **Fiil çekimi** | Fiil + istenen form (verleden tijd enk./meerv., voltooid) → çekimini yazarsın. Ses kalıbı ailesi ipucu verilir. | `v:<csv-satırı>:<form>` |

Tur başına 10 soru (eşleştirmede 5 çift). Doğru cevap +10 XP, yanlış +2 XP; yanlışlar tur sonunda
listelenir ve kartın tekrar tarihi bugüne çekilir. Seviye: her 200 XP bir seviye.

---

## 4) Veri kuralları

- Ders notları **hiçbir zaman** değiştirilmez; `import-notes.mjs` sadece okur.
- Notta boş/hatalı alanlar `data-source/overrides.json` ile tamamlanır. Her düzeltme `auto: true`
  işaretlenir ve uygulamanın ana sayfasında "✏️ Notlarımda eksik/hatalı olup doldurulan kayıtlar"
  bölümünde listelenir — yani hangi bilginin nottan değil agent'tan geldiği her zaman görünür.
- `override` alanları nottaki değeri **ezer** (öncelik: `override` > not).
- Notlardaki tablo satırları: `Hollandaca | İngilizce | Türkçe | örnek cümle`. Cümle hücresi
  `—`/`–` ile bölünür; tek kelimelik hücre cümle sayılmaz (eşanlamlı/çeviri olarak sınıflanır).
- `src/data/*.json` üretilmiştir: elle düzenlenmez, `bun run import` ile yenilenir, commit edilir.
- Güncel veri: **85 kelime/ifade · 9 bağlaç · 215 fiil** (55 kayıt override ile tamamlandı, eksik: 0).

---

## 5) İlerleme ve eşitleme

Yerel (her zaman çalışır): `localStorage["okumo-trainer/v1"]` — kart başına `ease/interval/reps/lapses/
due/lastSeen/at`, ayrıca XP, seri, oynanan günler. Ana sayfadan JSON indir/yükle/sıfırla.

Sunucu (varsa): `GET/PUT /api/progress` ⇄ `data/progress.json` (atomik yazım; gövde şekil
doğrulamasından geçmezse 400; >512 KB reddedilir). Akış: **çek → birleştir → gerekiyorsa yaz**.

`mergeProgress()` (bkz. `scripts/sync.test.ts`):

- kart kart: `at` (epoch ms) büyük olan kazanır; tek tarafta olan kart korunur,
- `xp`, `bestStreak`, `sessions`: en büyük; `daysPlayed`: birleşim; `streak`/`lastDay`: yeni tarafın.

Çevrimdışı davranış: istek başarısızsa durum `offline` olur (arayüzde 📴), oyun aynen sürer; her turdan
sonra 1,5 sn gecikmeyle yeniden denenir ve `online` olayında tekrar eşitlenir. Statik yayında
(GitHub Pages) `/api/progress` yoktur → sessizce yerel moda düşer, hata göstermez.

---

## 6) Servis ve altyapı

| | |
|---|---|
| Port | `8911` (`OKUMO_PORT` ile değişir), `0.0.0.0` — LAN'dan erişilir |
| URL | `http://dil.ev/` — Pi-hole DNS kaydı (`dns.hosts`: `192.168.1.200 dil.ev`) + Traefik file provider router `okumo-trainer` → `http://192.168.1.30:8911` |
| Servis edilen | yalnızca `dist/` (SPA fallback index.html). `dist` **dışına** çıkan yollar reddedilir (%2e%2e%2f dâhil) |
| Uçlar | `GET /health` · `GET|PUT /api/progress` |
| Başlatan | `server.mjs` (bağımlılıksız `node:http`); yerelde SwiftBar eklentisi, istenirse launchd |
| Durum dosyası | `data/progress.json` (+ `.tmp` atomik yazım) — **git'e girmez** |
| Loglar | `/tmp/okumo-trainer-server.log`, `/tmp/okumo-trainer-import.log`, `/tmp/okumo-trainer-swiftbar.log` |

Sunucuyu durdururken **portu tutan PID** kullanılır (`lsof -nP -iTCP:8911 -sTCP:LISTEN -t`); başka bir
sürece dokunulmaz. Ağ tarafı (DNS + Traefik) değiştiyse komşu servisleri de doğrula (`yap.ev`).

---

## 7) Test ve doğrulama

```bash
bun test               # 17 test / 3 dosya
bunx tsc --noEmit      # tip kontrolü
bun run build          # derleme
curl -s http://127.0.0.1:8911/health      # {"status":"ok","dist":true,"progress":…}
```

Değişiklikten sonra beklenen kanıt: testler geçer, tip kontrolü temiz, derleme çalışır, `/health`
yanıt verir ve oynanan modun tarayıcıdan elle doğrulanması (eşleştirme → diğer modlar → özet →
`localStorage` yazımı). Tarayıcı duman testi yerel scratica tutulur, repoya girmez.

---

## 8) Yayın (GitHub Pages)

- `main` → kök adres (`deploy.yml`), `base: "./"` sayesinde hem kök hem alt dizinde çalışır.
- Her PR → `/pull/<numara>/` altında önizleme (`pages-preview.yml`), PR kapanınca silinir.
  **Emre'nin tercihi: her PR'da önizleme bağlantısı.**
- Pages kaynağı **GitHub Actions** olmalıdır (Settings → Pages → Source: GitHub Actions);
  "Deploy from a branch" seçili kaldığı sürece PR önizlemeleri oluşmaz.

---

## 9) Yol haritası / bilinen sınırlar

- Anlık kalan iş yok. İlerleme senkronu tek sunucu dosyası üzerinden (kişisel kullanım için yeterli;
  çok kullanıcılı olursa kilit eklenmeli).
- Telaffuz (edge-tts) düşünüldü ama eklenmedi: çevrimdışı senaryoda internet gerektirdiği için
  önbellekli ses üretimi tasarlanmadan girmesi doğru değil.
- Konuşma pratiği (STT) kapsam dışı.
