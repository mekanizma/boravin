# BORAVIN — Production E-ticaret Platformu

Premium, admin-öncelikli, AI destekli e-ticaret platformu. Kıbrıs teknoloji perakendesi BORAVIN için sıfırdan tasarlandı.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 4 + BORAVIN design tokens
- Supabase Postgres + Drizzle ORM
- Supabase Auth (admin + müşteri kayıt/giriş) + RBAC
- Gemini AI provider abstraction
- Docker Compose (optional local Postgres + MinIO)
- Render Blueprint (`render.yaml`) — production web + Postgres + uploads disk

## Hızlı başlangıç (Supabase)

1. `.env.local` içinde `DATABASE_PROVIDER=postgres` ve Session Pooler `DATABASE_URL` ayarla (Dashboard → Connect → Session pooler; IPv4 ağlar için direct host çalışmaz).
2. `NEXT_PUBLIC_SUPABASE_URL`, publishable ve secret key ekle.
3. Şema + seed + Auth senkronu:

```bash
npm install
npx drizzle-kit push
npm run db:seed
npm run db:sync-auth
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin  
  - Email: `admin@boravin.com`
  - Şifre: `Admin123!`

### Yerel PGlite (Docker yok)

```bash
# DATABASE_PROVIDER=pglite ve DATABASE_URL=pglite:./data/boravin
npm run setup:local
npm run dev
```

Veritabanı proje içinde `./data/boravin` klasöründe (PGlite — gömülü Postgres). MinIO/Docker gerekmez; dosyalar `public/uploads` altına yazılır.

### İsteğe bağlı: gerçek PostgreSQL / Docker

```bash
# DATABASE_PROVIDER=postgres ve DATABASE_URL=postgresql://... ayarla
npm run docker:up
npm run db:push
npm run db:seed
npm run dev
```


## Scriptler

| Script | Açıklama |
|--------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Vitest |
| `npm run db:push` | Şemayı DB'ye uygula |
| `npm run db:migrate` | Migration çalıştır |
| `npm run db:seed` | Demo veri |
| `npm run start:render` | Render production start (disk + PORT bind) |
| `npm run db:migrate:deploy` | Postgres migrator (pre-deploy) |

## Ortam değişkenleri

Bkz. [.env.example](.env.example)

Kritik:

- `DATABASE_URL`
- `AUTH_SECRET`
- `GEMINI_API_KEY` (AI için)
- `AI_PROVIDER=gemini`
- Storage / Payment / Shipping / Email provider ayarları

Secret'ler asla frontend bundle'a gitmez. AI çağrıları server-side'dır.

## Mimari

```
src/
  app/(storefront)   # Müşteri arayüzü
  app/(admin)/admin  # Yönetim paneli
  components/ui      # Design system
  features/          # Domain actions (products, cart…)
  lib/db             # Drizzle schema
  lib/ai             # AI provider + services
  lib/payments|shipping|email|storage|analytics
```

## Özellikler (özet)

- Ürün / varyant / stok / bulk / CSV hazır mimari
- Dinamik kategori filtreleri + shareable URL
- Homepage CMS blokları
- Kampanya / kupon / duyuru
- AI Center (kampanya, ürün açıklaması, SEO, görsel prompt)
- Sepet + guest checkout (mock ödeme)
- RBAC + audit log
- SEO metadata + Product JSON-LD
- Rate limiting, security headers

## Deployment (Render)

Tüm uygulama + Postgres Render üzerinde çalışır. **Auth** mevcut mimaride Supabase Auth'ta kalır (kullanıcı giriş/kayıt).

### 1. Blueprint

1. Kodu GitHub/GitLab'a push edin.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → bu repo.
3. Root'taki `render.yaml` otomatik okunur: web servis + Postgres + 5 GB uploads disk.
4. Prompt edilen secret'ları girin:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `GEMINI_API_KEY` / `GEMINI_PROJECT` (AI için)

### 2. Supabase Auth redirect

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://<servis-adiniz>.onrender.com`
- Redirect URLs: aynı origin + `/admin/**`, `/account/**` gerekirse

### 3. Deploy akışı

| Adım | Komut |
|------|--------|
| Build | `npm ci && npm run build` |
| Pre-deploy | `npm run db:migrate:deploy` |
| Start | `npm run start:render` (`0.0.0.0:$PORT`, uploads disk symlink) |

İlk demo veri (isteğe bağlı, Shell'den):

```bash
npm run db:seed
npm run db:sync-auth
```

### 4. Ortam özeti

- `DATABASE_URL` → Render Postgres (Blueprint `fromDatabase`)
- `DATABASE_SSL=require`
- `UPLOADS_DIR=/var/data/uploads` (kalıcı disk)
- `NEXT_PUBLIC_APP_URL` / `AUTH_URL` → `RENDER_EXTERNAL_URL`
- `BARCODE_GOOGLE_HEADLESS=0` (Render'da Chrome yok)

Region: `frankfurt` (Kıbrıs/TR için düşük gecikme). Planlar Blueprint'te değiştirilebilir.

## Notlar

- Docker kapalıysa uygulama UI render eder; DB bağımlı listeler empty state gösterir.
- Gerçek iyzico/PayTR/Stripe bağlamak için `src/lib/payments` provider ekleyin.
- Meilisearch için `src/lib/search` arayüzü hazırdır.
