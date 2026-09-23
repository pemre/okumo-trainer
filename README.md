# okumo-trainer

Hollandaca alıştırma uygulaması: **sınıf notlarından üretilmiş kelime/ifade kartları**, haftanın
**bağlaçları** ve 215 düzensiz **fiilin çekim alıştırması** tek yerde. Yerelde çalışır, LAN'dan
`http://dil.ev/` üzerinden erişilir, çevrimdışıyken de oynanır.

okumo.dev'in dilini ödünç alır: krem zemin + terracotta aksan, Fraunces/Nunito Sans, yuvarlak
"cozy" kartlar; tekrar planı SM-2'den sadeleştirilmiştir. Ana sayfada son 30 günün XP grafiği
(recharts) ve yıllık tekrar takvimi (react-activity-calendar) vardır; alttaki **📄 Veri kaynakları**
popup'ı, verinin üretildiği ders notlarını `obsidian://` bağlantısıyla açar. Yeni ders notları içe
aktarıldığında desteye eklenen kayıtlar açılışta **🆕 yeni kayıt popup'ı** ile bir kez haber verilir;
alttaki **kalıcı "N kayıt"** düğmesi ise destenin **tamamını** popup'ta listeler (kelime/bağlaç/fiil
gruplu, alfabetik, aramalı). Sağ üstteki 🌐 menüsü **arayüz dillerini** (TR / EN / ikisi) açar-kapatır —
arayüz metinleri ve kelime çevirileri açık dillere göre gösterilir.

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
| Yeni oyun modu | `src/games/questions.ts`'e soru üretici + `App.tsx` MODES kartı + README "Oyun modları" satırı + `scripts/questions.test.ts`'e kapsam testi |
| Yeni görsel/grafik bileşeni | `src/components/History.tsx` + hesap `src/lib/history.ts`'te (saf) + `scripts/history.test.ts` + README "Grafik ve takvim" |
| Üst çubuk / chip düzeni | Dar ekranda tek satır kalmalı: kırpılan `TopBar` başlığı, `shrink-0` chip'ler, boyut `sm:` ile tek yerden — `okumo_mobile_check.py` ile 320/375 px'te doğrulanır |
| Yeni etkileşim öğesi (düğme, çip, form) | Tarayıcı duman testinde **tıklanarak** doğrulanır, sadece klavye (Enter) ile geçilmez — `BigButton` `type="button"`'dır, formu kendiliğinden göndermez |
| Ses/titreşim/titreme davranışı | `src/lib/feedback.ts` + `scripts/feedback.test.ts` + README "Bas geri bildirimi"; kanonik sürüm kardeş depo `ay-ui-library`'deki `PressFeedback` bloğu — ikisi aynı commit'te uyumlu tutulur |
| Veri şeması / not ayrıştırma değişikliği | `src/lib/types.ts` + `import-notes.mjs` + `scripts/data.test.ts` + `scripts/notes.test.ts` + README "Veri kuralları" birlikte değişir |
| Yeni komut / bağımlılık | `package.json` + README "Komutlar" tablosu |
| Port, URL, sunucu ucu | `server.mjs` + `README` "Servis ve altyapı" + SwiftBar eklentisi (`URL`, `PORT`) birlikte |
| İlerleme/eşitleme ve deste değişimi | `src/lib/sync.ts` + `scripts/sync.test.ts` + README "İlerleme ve eşitleme" (yeni kayıt popup'ı dâhil) |
| Yeni arayüz metni / çeviri | Metin `t("…")` ile sarılır + `src/lib/i18n.ts` EN sözlüğüne bir satır + `scripts/i18n.test.ts`; sözlükte karşılık yoksa Türkçe'ye düşer |
| Ders notu klasörü değişirse | `OKUMO_NOTES_DIR` ile çalıştır, `import-notes.mjs` dokunulmaz |
| Notlardaki eksik/hatalı alan | Düzeltme **notun kendisine** yazılır (tablo hücresi; bullet 4 alanı taşımıyorsa tablo satırına çevrilir) → sonra `bun run import` + `bun test` |
| Commit | Türkçe, emir kipi, tek satır: `eşleştirme: yanlışta kart titremesi` |

Değişmez ilkeler:

1. **Ders notları tek doğruluk kaynağıdır.** `~/Desktop/emre/4. Belgelik/Hollandaca dil kursu/*.md`
   uygulamanın beslediği tek kaynaktır; bir alan eksik/hatalıysa düzeltme **nota** yazılır ve not
   yeniden içe aktarılır (`bun run import`). Not yazımı elle onaylıdır ve notlar git'te değildir →
   yazmadan önce kopya alınır. 23.09.2026'ya kadar kullanılan `data-source/overrides.json`
   mekanizması bu yüzden kaldırıldı: 73 düzeltmenin tamamı notlara taşındı.
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
bun test            # 63 test: grafik serisi, bas geri bildirimi, soru sözleşmeleri, SRS, veri, eşitleme, not ayrıştırıcısı, arayüz dilleri
bun run lint        # biome: lint + format kontrolü (1 uyarı tolere edilir, hata yok)
bunx tsc --noEmit   # tip kontrolü
bun run dev         # geliştirme (Vite, http://localhost:5173)
bun run build       # dist/
bun run serve       # dist'i http://127.0.0.1:8911 üzerinde servis eder
```

Yerelde SwiftBar'dan yönetilir:
`~/Downloads/github-pemre/swiftbar-plugins/modules/okumo-trainer.30s.sh`
(durum, başlat/durdur/yeniden başlat, **derle**, **sınıf notlarını içe aktar** = import+build+restart,
günlükler, "dist eski" uyarısı). Günlükler: `/tmp/okumo-trainer-{server,import,swiftbar}.log`.

---

## 2) Mimari

```
okumo-trainer/
├── data-source/            # elle bakımı yapılan kaynaklar
│   ├── verbs.csv           # 215 fiil: mastar + çekimler + ses kalıbı ailesi
│   ├── patterns.md         # 14 ses kalıbı ailesi + istisnalar
│   └── connectieven.json   # bağlaç destesi (anlam, işlev, örnek cümle)
├── scripts/
│   ├── import-notes.mjs    # Obsidian notları → src/data/*.json (+ obsidian:// bağlantıları)
│   ├── srs.test.ts         # aralıklı tekrar, oturum seçimi, cevap denetimi
│   ├── data.test.ts        # üretilen verinin sözleşmeleri
│   ├── notes.test.ts       # not ayrıştırıcısı: kayda dönüşen/dönüşmeyen satırlar (+satır no)
│   ├── questions.test.ts   # soru üreticileri: her mod soru üretir, her cevap kabul kuralından geçer
│   ├── feedback.test.ts    # bas geri bildirimi: titreme kareleri, iptal, sessiz geri düşüş, ton frekansı
│   ├── history.test.ts     # günlük seri: eksik gün, yaz saati geçişi, seviye eşikleri, ortalama
│   └── sync.test.ts        # iki cihazın ilerlemesini birleştirme kuralları
├── src/
│   ├── App.tsx             # ana sayfa (mod kartları, XP/seri, kaynak popup'ı) + tur özeti
│   ├── components/ui.tsx   # CozyCard, Pill, BigButton, ProgressBar, TopBar
│   ├── components/History.tsx # XpChart (recharts) + ActivityHeat (react-activity-calendar)
│   ├── lib/
│   │   ├── types.ts        # WordItem, Connective, Verb, CardState, Progress, ModeId
│   │   ├── data.ts         # üretilmiş JSON'ları içe alır
│   │   ├── srs.ts          # SM-2 sadeleştirmesi: review(), checkTyped(), pickSession()
│   │   ├── sync.ts         # mergeProgress(), newDeckIds(), normalizeProgress() — saf fonksiyonlar
│   │   ├── feedback.ts     # bas geri bildirimi: Web Audio tonları, titreşim, WAAPI titreme
│   │   ├── history.ts      # günlük XP serisi: eksik gün doldurma, seviye eşikleri, hareketli ortalama
│   │   └── store.ts        # localStorage + sunucu eşitlemesi, XP/seri, deste damgası, React hook'ları
│   ├── games/
│   │   ├── questions.ts    # moda göre soru üreticileri
│   │   ├── MatchGame.tsx   # eşleştirme (5+5 çift)
│   │   └── SessionGame.tsx # choice / type / scramble / connect / verbs turları
│   └── data/*.json         # ÜRETİLMİŞ veri (repoda durur, CI'da notlar yok)
├── server.mjs              # dist servisi + /api/progress (bağımlılıksız HTTP sunucu)
├── biome.json              # lint + format (2 boşluk, çift tırnak, 100 kolon)
└── .github/workflows/      # ci.yml · deploy.yml · pages-preview.yml
```

Veri akışı:

```
Obsidian notları ──(bun run import)──> src/data/woorden.json ─┐
data-source/connectieven.json ────────────────────────────────┼─> uygulama (React)
data-source/verbs.csv ────────────────────────────────────────┘
                                                              └─> ilerleme: localStorage ⇄ /api/progress ⇄ data/progress.json
```

Notlar vault'ta durur (`OKUMO_NOTES_DIR` ile başka klasöre yönlendirilebilir); her kaynağın
`obsidian://open?vault=…&file=…` bağlantısı üretilir (`OKUMO_VAULT_DIR`, varsayılan
`/Users/user/Desktop/emre`; kasa adı klasör adıdır).

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

### Bas geri bildirimi (ses, titreşim, titreme)

Her cevap değerlendirmesinde yap.ev'deki tuş hissi verilir: `settle()` içinde **tek yerde** ton + titreşim +
kısa titreme. Tur bitince bitiş fanfarı çalar ve tüm sayfa titrer (`[data-feedback-root]`).

| An | Ses | Titreme |
|---|---|---|
| Doğru | `success` (880 → 1320 Hz) | yumuşak (6 kare / 260 ms, soru kartı) |
| Yanlış | `error` (400 → 300 Hz) | sert (8 kare / 480 ms, soru kartı) |
| Tur sonu | `finish` (523/659/784/1047 Hz arpej) | sert (tüm sayfa) |

- Ses dosyası yok: tonlar Web Audio ile sentezlenir → **çevrimdışı çalışır**, pakete ses eklenmez.
- `src/lib/feedback.ts` bağımlılıksızdır; Web Audio / titreşim / animasyon API'si olmayan ortamda sessizce
  hiçbir şey yapmaz, asla hata vermez (iOS Safari titreşimi yok sayar; ses ve titreme çalışır).
- Titreme Web Animations API'siyle, yalnızca `translate` ile (döndürme yok → mobilde viewport kaymaz);
  üst üste basışta önceki titreme iptal edilir, sınıf ekle/çıkar yarışı yok.
- `prefers-reduced-motion: reduce` ayarına uyulur: titreme oynamaz, **ses ve titreşim çalışır**. Kontrol
  `feedback.ts` içindedir çünkü CSS medya sorgusu Web Animations API'sini kapsamaz (`styles.css`'teki
  blok yalnız CSS animasyonlarını kapatır).
- **Kanonik, yeniden kullanılabilir sürüm `ay-ui-library` deposunda**: `PressFeedback` bloğu
  (`usePressFeedback()` + `feedbackSound()`, `haptic()`, `shake()`). Burada aynı motorun kopyası duruyor,
  çünkü dil uygulaması bağımlılıksız ve çevrimdışı kalmalı ve GitHub Actions derlemesi kardeş depoya
  erişemez; kütüphane npm'e yayımlanırsa bu dosya import'a döner.
- Doğrulama: `scripts/feedback.test.ts` (birim: kare sayısı, iptal, sessiz geri düşüş, ton frekansı) +
  `okumo_feedback_check.py` (tarayıcı: gerçek elemanda animasyonun başladığı ve tonun çalındığı ölçülür).
- Ses rahatsız ederse kapatmak için `feedbackSound` çağrılarının başına tek koşul yeter; kalıcı bir
  🔊/🔇 düğmesi istenirse hem buraya hem `ay-ui-library`'nin `PressFeedback` bloğuna eklenir.

---

### Günlük XP grafiği ve tekrar takvimi

Ana sayfada iki görsel var; ikisi de `Progress.daily` (gün → o gün kazanılan XP) serisinden beslenir:

| Bileşen | Ne gösterir | Kaynak |
|---|---|---|
| `XpChart` (recharts `ComposedChart`) | Son 30 gün: günlük XP çubuğu (seviyeye göre renk) + 7 günlük ortalama çizgisi | `src/components/History.tsx` |
| `ActivityHeat` (react-activity-calendar v3) | 52 haftalık kareler; `count` = o günün XP'si, `level` 0-4 | aynı dosya |

- Seviye eşikleri: 30/60/90/120 XP → 1/2/3/4 (`levelFor`, `src/lib/history.ts`). Boş gün 0 (krem).
- Seri üretimi saf fonksiyondur: eksik günler 0 ile dolar, tarihler takvim günü üzerinden yürünür
  (`addDays`) — milisaniye çıkarma yaz saati geçişinde günü kaydırırdı. Test: `scripts/history.test.ts`.
- Grafik/takvim yalnız **yerel** veriyi çizer; sunucu yoksa da çalışır (çevrimdışı ilkesiyle uyumlu).
- Doğrulama: `scripts/history.test.ts` (birim) + `okumo_history_check.py` (tarayıcı: boş ilerlemede
  kareler çizilir ama dolu gün yok; bir tur sonrası çubuk ve dolu kare oluşur, "henüz kayıt yok" kalkar).
- react-activity-calendar v3 iki şeyi zorunlu tutar: `{date, count, level}` alanları ve bir `theme`
  (varsayılan tema gri). İkisi de `History.tsx` içinde ayarlıdır.
- 364 gün kutuya sığmadığı için takvim yatay kaydırılır ve **varsayılan konum en sağdadır** (bugün):
  kapsayıcının `ref`'i bağlanırken `scrollLeft = scrollWidth`. Genişlik veriden bağımsız sabit olduğu
  için tek seferlik — ilerleme sonradan yüklense de konum kaymaz. (Mobilde kullanıcı her açılışta
  bugünü görmek için sağa kaydırmak zorunda kalıyordu.)
- Bu iki bağımlılık paketi büyütür (ham 792 KB / gzip 235 KB; öncesi 323 KB / 94 KB, yani ≈ +140 KB
  gzip). Kişisel + çevrimdışı kullanımda tek seferlik indirme olduğu için kabul edildi; kod bölmeye
  (lazy chunk) gidilmedi — gerekirse `React.lazy` ile grafik/takvim ayrı parçaya alınır.
- `daily` alanı yalnız tur bitince yazılır (`recordSession`): aynı gün birden çok tur oynanırsa toplanır.

---

### Mobil düzen (dar ekran)

Üst çubuk **her zaman tek satırdır**; 320 px'te bile chip'ler alt satıra kaymaz (kaydığında çubuk
81 px'e çıkıyordu, artık 49 px). Kural üç parçalı ve `src/components/ui.tsx` içinde:

- Başlık `min-w-0 truncate`: yer daralınca önce **başlık kırpılır** ("okumo-tra…"), chip'ler kaymaz.
- Chip'ler `shrink-0 whitespace-nowrap`: sıkışmaz, içerikleri iki satıra bölünmez.
- Boyut tek yerden: `TopBar` sağ kümesi `text-xs gap-1 px-3` (mobil) → `sm:text-sm sm:gap-2`, `Pill`
  kendi yazı boyutunu **vermez** (yoksa sağdaki küme ayarını ezer).

Doğrulaması: `okumo_mobile_check.py` — 320/375/414/768 px × (ana sayfa + oyun ekranı) ölçer; sayfa
yatay kaymıyor, chip'ler tek satır ve ekran içinde, başlık ≥60 px görünür olmalı.

---

## 4) Veri kuralları

- **Notlar tek doğruluk kaynağıdır.** Eksik/hatalı alan düzeltmesi nota yazılır; `bun run import` ile
  uygulamaya girer. Ayrı bir override dosyası ve "agent doldurdu" işareti yoktur (23.09.2026'da
  kaldırıldı — uygulamadaki "✏️ doldurulan kayıtlar" bölümü de bu yüzden silindi).
- Not yazımı elle onaylıdır ve **notlar git'te değildir**: yazmadan önce kopya alınır, değişiklik
  özeti kullanıcıya gösterilir. Not şeması bozulmaz — yalnız hücre içerikleri değişir.
- `import-notes.mjs` yazmaz, yalnız okur; notu güncelleyen şey agent/iş akışıdır (tek seferlik göç
  betiği 2026-09-23'te çalıştırıldı, repoda durmaz).
- Notlardaki tablo satırları: `Hollandaca | İngilizce | Türkçe | örnek cümle`. Cümle hücresi
  `—`/`–` ile bölünür; tek kelimelik hücre cümle sayılmaz (eşanlamlı/çeviri olarak sınıflanır).
- **Parantez kuralı** (`stripParen`): tek sözcüklü parantez okunuş ipucudur, atılır (`komend (komınd)`
  → `komend`); nokta, virgül ya da boşluk içeren parantez açıklamadır, korunur (`m.a.w.`,
  `to spend (money, time)`). Bu yüzden notta `(…)` ile yazılan kısa ipucu uygulamada görünmez.
- Cümle hücresi `NL — TR` biçiminde tutulur; çevirisi olmayan cümle varsa eksik sayılır.
- `src/data/*.json` üretilmiştir: elle düzenlenmez, `bun run import` ile yenilenir, commit edilir.
- **Sessiz kayıp görünürdür:** `bun run import` çıktısının sonunda "atlanan içerik" bölümü, kayda
  dönüşmeyen satırları dosya:satır + sebep + metin olarak listeler. Sebepler: *parantezli madde*
  (`* cursus (kurs, ders) vs opleiding (…)` — dipnot sayılır), *4+ parçalı madde* (`parseBullet` en
  çok 3 parça okur), *Hollandaca boş/kısa*, *tablo satırı okunamadı*. Bu liste boş değilse ya satır
  düzeltilir (bullet → tablo satırı) ya da bilinçli olarak notta bırakıldığı kabul edilir; sessizce
  yok sayılmaz. Örnek: `verloren` maddesi 4 parçalı olduğu için uygulamaya hiç girmiyordu (23.09.2026'da
  tablo satırına çevrildi, 85 → 86 kayıt).
- Güncel veri: **111 kelime/ifade · 9 bağlaç · 215 fiil** (toplam 335 kayıt; eksik alan: 0,
  atlanan içerik: 2 dipnot).
- **Kaynak popup'ı:** ana sayfanın altındaki "📄 Veri kaynakları (3)" düğmesi yerleşik `<dialog>`
  (`showModal()`) açar; her satır notu Obsidian'da açar (`obsidian://open?vault=emre&file=…`), yanında
  o nottan üretilen kayıt sayısı yazar. Kaynak listesi büyüdükçe sayfa uzamasın diye liste artık
  yalnız popup'ta. Kapatma: ESC ya da **Kapat** (arkaya tıklayarak kapatma, `useKeyWithClickEvents`
  a11y kuralını gereksiz tetiklediği için eklenmedi).

---

### Ders fotoğrafı → not → uygulama

Ders sırasında alınan not (tablo/liste) veya **tablet/tahtadaki önemli sözcükler tablosunun
fotoğrafı** aynı yoldan geçer; fotoğrafı ayrıştıran bir kod yok, akış agent işidir:

1. Fotoğraf/not içeriği okunur, satırlar **not şemasına** çevrilir:
   `| Hollandaca | İngilizce | Türkçe | Örnek Cümle (NL) — çevirisi |`.
2. Satırlar ilgili ders notuna eklenir (`4. Belgelik/Hollandaca dil kursu/<YYYY-MM-DD> Hollandaca dil kursu.md`).
   Yeni ders günüyse o günün dosyası oluşturulur (frontmatter: `title/date/created/url/tags/notes`).
   Uzun listeler için hücreler aynı genişliğe hizalanır; mevcut tabloya satır eklendiyse tablo yeniden
   hizalanır (aksi hâlde hizasızlık kullanıcı tarafından fark edilir).
3. `bun run import` → "atlanan içerik" boş mu? `bun test` (veri sözleşmesi) → `bun run build`.
4. Commit + push (README aynı commit'te). Yerel `dil.ev` yeniden derlenmiş `dist`'i okur; SwiftBar
   eklentisi "dist eski" uyarısı veriyorsa **derle** eylemi çalıştırılır.

Kurallar: notlar tek doğruluk kaynağıdır (veri uygulamaya elle yazılmaz); aynı sözcük iki kez
eklenirse `mergeItems` normalize edilmiş Hollandaca üzerinden birleştirir, boş alanlar tamamlanır —
yani tekrar satır zararsızdır. İngilizce/Türkçe eksikse uygulamada eksik sayılır ve veri testi
kırmızı olur; bu yüzden yeni satır **dört alan dolu** olacak şekilde yazılır.

---

## 5) İlerleme ve eşitleme

Yerel (her zaman çalışır): `localStorage["okumo-trainer/v1"]` — kart başına `ease/interval/reps/lapses/
due/lastSeen/at`, ayrıca XP, seri, oynanan günler. Ana sayfadan JSON indir/yükle/sıfırla.

Sunucu (varsa): `GET/PUT /api/progress` ⇄ `data/progress.json` (atomik yazım; gövde şekil
doğrulamasından geçmezse 400; >512 KB reddedilir). Akış: **çek → birleştir → gerekiyorsa yaz**.

`mergeProgress()` (bkz. `scripts/sync.test.ts`):

- kart kart: `at` (epoch ms) büyük olan kazanır; tek tarafta olan kart korunur,
- `xp`, `bestStreak`, `sessions`: en büyük; `daysPlayed`: birleşim; `streak`/`lastDay`: yeni tarafın.
- `daily` (gün → XP): **gün başına en büyük** kazanır. `ponytail:` tavanı — iki cihazın aynı gün
  kazandığı XP toplanmaz, çift saymak yerine eksik sayar; cihaz başına ayrım gerekirse kayda cihaz
  kimliği eklenip toplam o şekilde alınmalı. `normalizeProgress` günlük kayıttan sayı olmayan,
  sonsuz ve negatif girdileri atar.

Çevrimdışı davranış: istek başarısızsa durum `offline` olur (arayüzde 📴), oyun aynen sürer; her turdan
sonra 1,5 sn gecikmeyle yeniden denenir ve `online` olayında tekrar eşitlenir. Statik yayında
(GitHub Pages) `/api/progress` yoktur → sessizce yerel moda düşer, hata göstermez.

### Yeni kayıt popup'ı (deste değişimi)

Yeni ders notları içe aktarılıp `dist` derlendiğinde deste büyür; uygulama bunu **açılışta** fark eder
ve eklenen kayıtları **bir kez** popup'ta gösterir (NL — TR, en fazla 20 satır, fazlası "… ve N tane
daha"). Sunucu gerekmez: ağ yokken de çalışır, çünkü kaynak `src/data/*.json`.

- Damga: `localStorage["okumo-trainer/deck"]` — cihazın **son gördüğü** kart kimlikleri listesi.
  `detectNewDeckItems()` (store.ts) sayfada bir kez çalışır, damgayı günceller ve yeni kimlikleri
  döndürür; karşılaştırma saf fonksiyon `newDeckIds(seen, all)` (`scripts/sync.test.ts`).
- İlk açılış ya da bozuk/temizlenmiş damga: **sessizce temel alınır**, popup çıkmaz. Bozuk damga
  düzeltilir, uygulama durmaz. Deste küçülse bile kalan kayıtlar "yeni" sayılmaz.
- Kart kimliği sözleşmesi tek: kelime `id`, bağlaç `c:<id>`, fiil `v:<id>` (SRS anahtarı fiilde
  `v:<id>:<form>`). Fiiller öneksiz listelenirse `describe()` çözemez ve popup satırı boş kalır —
  23.09.2026'da `allIds` bu yüzden `v:` önekli hâle getirildi.
- Doğrulama: `python3 ~/.hermes/cache/scratch/okumo_new_items_check.py [adres]` (damgayı kısaltıp
  sayfayı yeniler: popup açılır, "Tamam" kapatır, ikinci açılışta çıkmaz). Salt okunur — ilerlemeye
  dokunmaz.

### Deste listesi popup'ı (tüm kayıtlar)

Ana sayfanın altındaki **"N kayıt"** düğmesi (eskiden düz metindi) destenin tamamını yerleşik
`<dialog>` içinde gösterir: 📖 Kelimeler · 🔗 Bağlaçlar · 🔄 Fiiller, her grup alfabetik (fiiller
`inf · vt · vt_mv · voltooid` dizisiyle), satırlar yeni kayıt popup'ıyla aynı biçimde (`NL — TR`).

- Tek kaynak: `DECK_GROUPS` (App.tsx) — kelime/bağlaç/fiil kimlikleri **oradan** üretilir; `allIds`
  (tekrar sayacı + yeni kayıt tespiti) da bu listenin düzleştirilmiş hâlidir, ayrıca tekrarlanmaz.
  Yeni grup türü (örn. deyimler) eklemek = `DECK_GROUPS`'a bir satır.
- **Arama kutusu** (popup içinde, `type="search"`): `describe()` metninin tamamında (Hollandaca **ve**
  Türkçe) harf duyarsız içerik araması; kısmi yazım yeter ("twij" → twijfel). Süzülürken grup başlığı
  `eşleşen / toplam` gösterir, eşleşmeyen grup **gizlenir**, hiç sonuç yoksa "Aramayla eşleşen kayıt
  yok." Popup kapanınca arama sıfırlanır (`onClose`). Süzme her tuşta yeniden yapılır — 335 kayıt için
  ölçülebilir bir maliyet yok; büyürse `describe` çağrıları yerine modül seviyesinde bir `Map` indeksi kur.
- Kart sırası önemsiz (damga farkı küme); liste yalnız okunur, oyun akışına dokunmaz.
- Doğrulama: `python3 ~/.hermes/cache/scratch/okumo_deck_popup_check.py [adres]` — düğme metni =
  popup başlığı = grup satır toplamı (şu an 335 = 111+9+215), arama (NL, TR, kısmi, boş sonuç,
  temizleme, yeniden açılışta sıfır), bilinen kayıt listede, "Kapat" ve ESC kapatıyor, 375 px'te
  taşma yok. Salt okunur.

### Arayüz dilleri (3 dilli: TR + EN → Hollandaca)

Sağ üstteki **🌐 menüsü** (yerleşik `<details>`, `data-testid="lang-menu"`) arayüz dillerini açar/kapatır:
`TR`, `EN` ya da `TR+EN`. Seçim `localStorage["okumo-trainer/langs"]`'ta durur; **en az bir dil açık
kalır** (son dili kapatma denemesi yok sayılır). Varsayılan: ikisi de açık (uygulamanın bugünkü 3 dilli
hâli). Kapatılan dil **hem arayüz metinlerinden hem veri çevirilerinden** çıkar; tek değerli dar alanlar
(takvim ay adları) açık dillerin **ilki**ni kullanır.

- **Çeviri katmanı: `src/lib/i18n.ts`.** `react-intl` bilinçli olarak kullanılmadı: ~95 satırlık metin
  için ICU + extraction zinciri ağır olurdu, üstelik uygulama bağımlılıksız/çevrimdışı çalışıyor.
  - **msgid = Türkçe özgün metin**: kullanım `t("Kapat")`, sözlük `EN["Kapat"] = "Close"`. Karşılık
    yoksa Türkçe'ye düşer → yeni metin eklerken çeviri unutulsa da ekran bozulmaz.
  - İki dil açıkken `translate` metinleri `TR · EN` biçiminde birleştirir; yer tutucular `{ad}` ile
    (`t("{n} kayıt", { n: 335 })`).
  - Veri çevirisi `ceviri(ls, { tr, en })`: açık dillerin alanlarını birleştirir; açık dilde alan yoksa
    elde olanı gösterir (uydurma yok, boş satır yok).
  - Bileşenler `const { t, ceviri, langs } = useT()` kullanır (`useSyncExternalStore`): dil değişince
    yalnız abone bileşen yeniden çizilir, global mutasyon yok.
- **Sorular da dile uyar** (`buildQuestions(mode, size, cards, ls)`): TR-only'de yönler NL↔TR, EN-only'de
  NL↔EN, iki dilde bugünkü karışım (NL→TR, NL→EN, TR→NL). Oyun turu başlarken **diller sabitlenir**
  (`useState(getLangs)`): tur ortasında dil değişse sorular yerinden oynamaz, yalnız metinler/bilgi
  satırları anında yeni dile geçer.
- **Bilinen sınırlar (veri kaynaklı, uydurma çeviri yapılmaz):** `functie` (bağlaç işlev etiketi) ve
  cümle çevirileri (`zin_tr`) veride yalnız Türkçe → TR kapalıyken bağlaç ipucu gösterilmez, cümle
  dizmede cümle çevirisi yerine kelime anlamı kullanılır. Fiil ailesi adı için 15 ses kalıbı kodu
  `FAMILIE_EN` ile çevrilir (Türkçe adın İngilizcesi veride yok).
- **Yeni dil eklemek** (örn. Almanca): `LANGS` + `LANG_ADI` + bir sözlük + `MONTHS` satırı; menü
  `LANGS`'ten otomatik üretilir. Üçüncü dilde `TR · DE` gibi birleşimler de aynı kuralla çalışır.
- Doğrulama: `python3 ~/.hermes/cache/scratch/okumo_lang_menu_check.py [adres]` — varsayılan TR+EN,
  EN kapatınca TR'ye dönüş, TR kapatınca İngilizce arayüz + İngilizce çeviriler, son dilin
  kapatılamaması, yenilemede kalıcılık, oyun ipucu/geri bildirim uyumu, 375 px taşma yok.
  `/api/progress` kesilir → test oynarken sunucudaki gerçek ilerlemeye dokunmaz.

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
bun test               # 63 test / 8 dosya
bun run lint           # biome check (CI'da aynı adım var)
bunx tsc --noEmit      # tip kontrolü
python3 ~/.hermes/cache/scratch/okumo_mobile_check.py http://dil.ev/   # 320/375 px üst çubuk
python3 ~/.hermes/cache/scratch/okumo_sources_popup_check.py          # kaynak popup'ı + obsidian bağlantıları
python3 ~/.hermes/cache/scratch/okumo_calendar_scroll_check.py        # tekrar takvimi en sağda (bugün) açılıyor mu
python3 ~/.hermes/cache/scratch/okumo_new_items_check.py             # yeni kayıt popup'ı: sessiz ilk açılış, 4 yeni kelime
python3 ~/.hermes/cache/scratch/okumo_lang_menu_check.py             # dil menüsü: TR/EN aç-kapa, kalıcılık, oyun+tablo uyumu, 375 px
python3 ~/.hermes/cache/scratch/okumo_deck_popup_check.py            # "N kayıt" düğmesi → tüm deste popup'ı (335 = 111+9+215)
bun run build          # derleme
curl -s http://127.0.0.1:8911/health      # {"status":"ok","dist":true,"progress":…}
```

`bun run import` çıktısı da bir kanıttır: "eksik alanlı: 0" ve "atlanan içerik" listesi (boş ya da
bilinçli kabul edilmiş dipnotlar).

Değişiklikten sonra beklenen kanıt: testler geçer, `bun run lint` hata vermez, tip kontrolü temiz,
derleme çalışır, `/health`
yanıt verir ve oynanan modun tarayıcıdan elle doğrulanması (eşleştirme → diğer modlar → özet →
`localStorage` yazımı). Yazmalı adımlar **iki yoldan** denenir: Enter ile gönderme ve "Kontrol et"
düğmesine tıklama — 23.09.2026'da düğme `onClick`'siz kaldığı için yazma alıştırmaları yalnızca
Enter ile çalışıyordu ve testler Enter kullandığı için görülmedi. Tarayıcı duman testleri yerel
scratch'te tutulur, repoya girmez.

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
- Sıradaki fikirler (istenirse): rozetler (ilk tur, kusursuz tur, 7 gün seri…), günlük hatırlatma
  cron'u (mevcut Telegram/Home Assistant becerileriyle), kusursuz turda CSS konfeti, dokunmatikte
  görünmeyen `title=` ipuçları için tap-popover, no-JS `/liste` (Kobo/yazdırma), `mergeProgress`
  için rastgele özellik testi.
- `uit elkaar halen` kaydının "losmaken" eşanlamlısı 23.09.2026'da düştü: nottaki tek kelimelik
  hücre artık cümle taşıyor ve 4 sütunlu not şemasında `synoniem` için yer yok. Gerekirse nota
  "Eşanlamlı" sütunu eklenip `columnsFromHeader`'a bir anahtar yazılır (o zaman notta görünür).
- Telaffuz (edge-tts) düşünüldü ama eklenmedi: çevrimdışı senaryoda internet gerektirdiği için
  önbellekli ses üretimi tasarlanmadan girmesi doğru değil.
- Konuşma pratiği (STT) kapsam dışı.
