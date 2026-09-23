# okumo-trainer

Hollandaca alıştırma uygulaması: **sınıf notlarından üretilmiş kelime/ifade kartları**, bu haftanın
**bağlaçları** ve 215 düzensiz **fiilin çekim alıştırması** tek yerde. Yerelde çalışır, `okumo.ev`
üzerinden LAN'dan erişilir, ilerleme tarayıcıda kalır.

okumo.dev'in dilini ödünç alır: krem zemin + terracotta aksan, Fraunces/Nunito Sans, yuvarlak
"cozy" kartlar ve aralıklı tekrar (SM-2'den sadeleştirilmiş).

## Oyun modları

| Mod | Ne yapar |
|---|---|
| 🃏 **Eşleştirme** | Solda 5 Hollandaca kart (kelime + örnek cümle), sağda 5 kart (İngilizce + Türkçe). Dokun-eşleştir. |
| ✅ **Çoktan seçmeli** | NL→TR, NL→EN, TR→NL yönlerinde 4 şıklı sorular. |
| ⌨️ **Yazma** | Türkçesi/İngilizcesi verilir, Hollandacasını yazarsın (de/het, noktalama, büyük-küçük harf hoşgörülür). |
| 🔗 **Bağlaçlar** | Cümlede boşluk doldurma: yarısı çoktan seçmeli, yarısı yazarak. |
| 🔄 **Fiil çekimi** | fiil + istenen form (verleden tijd enk./meerv., voltooid) → çekimi yazarsın. |

## Mimari

```
okumo-trainer/
├── data-source/            # elle bakımı yapılan kaynaklar (repo içinde, notlar DIŞARIDA)
│   ├── verbs.csv           # 215 fiil: mastar + çekimler + ses kalıbı ailesi
│   ├── patterns.md         # 14 aile + istisnalar
│   ├── connectieven.json   # bağlaç destesi (anlam, işlev, örnek cümle)
│   └── overrides.json      # notlarda eksik/hatalı alanların düzeltmeleri
├── scripts/
│   ├── import-notes.mjs    # Obsidian notları → src/data/*.json  (notları SADECE okur)
│   ├── srs.test.ts         # aralıklı tekrar + oturum seçimi + cevap denetimi testleri
│   └── data.test.ts        # üretilen verinin sözleşmeleri
├── src/
│   ├── App.tsx             # ana sayfa (mod kartları, XP/seri, veri yönetimi) + özet
│   ├── lib/{srs,store,data,types}.ts
│   ├── games/{MatchGame,SessionGame,questions}.tsx
│   └── data/*.json         # ÜRETİLMİŞ veri (repoda durur, CI'da notlar yok)
├── server.mjs              # derlenmiş dist'i 8911'de servis eden bağımlılıksız sunucu
└── .github/workflows/      # ci.yml · deploy.yml (main → Pages) · pages-preview.yml (her PR)
```

Notlar vault'ta durur: `~/Desktop/emre/4. Belgelik/Hollandaca dil kursu/*.md`. İçe aktarma
`OKUMO_NOTES_DIR` ile başka bir klasöre de yönlendirilebilir.

## Komutlar

```bash
bun install
bun run import     # sınıf notlarını okuyup src/data/*.json üretir
bun test           # aralıklı tekrar + veri sözleşmesi testleri
bun run dev        # geliştirme sunucusu (Vite)
bun run build      # dist/
bun run serve      # dist'i http://127.0.0.1:8911 üzerinde servis eder
```

Yerelde SwiftBar'dan yönetilir: `~/Downloads/github-pemre/swiftbar-plugins/okumo-trainer.30s.sh`
(başlat/durdur, derle, **sınıf notlarını içe aktar**, günlükler).

## GitHub Pages

- `main` → kök adres (deploy.yml)
- Her PR → `/pull/<numara>/` altında önizleme (pages-preview.yml), PR kapanınca silinir
- Vite `base: "./"` olduğu için her iki yol da çalışır

## Veri kuralları

- Ders notları **hiçbir zaman** değiştirilmez; sadece okunur.
- Notlarda boş kalan çeviri/örnek cümleler `data-source/overrides.json` içinde tamamlanır
  (`auto: true` ile işaretlenir) ve uygulamanın ana sayfasında "✏️ doldurulan kayıtlar" olarak listelenir.
- `src/data/*.json` üretilmiş dosyalardır; elle düzenlenmez, `bun run import` ile yenilenir.

## İlerleme

İlerleme tarayıcının `localStorage`'ında (`okumo-trainer/v1`) tutulur: kart başına aralıklı tekrar
durumu, XP, seri, oynanan günler. Ana sayfadan JSON olarak indirilip geri yüklenebilir.

> ponytail: cihazlar arası senkron yok. Telefon + Mac aynı ilerlemeyi paylaşsın istenirse
> `server.mjs`'e küçük bir `/api/progress` (oku/yaz) eklenir.
