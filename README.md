# BORAVIN — Production E-ticaret Platformu

Premium, admin-öncelikli, AI destekli e-ticaret platformu. Kıbrıs teknoloji perakendesi BORAVIN için sıfırdan tasarlandı.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 4 + BORAVIN design tokens
- Supabase Postgres + Drizzle ORM
- Supabase Auth (admin + müşteri kayıt/giriş) + RBAC
- Gemini AI provider abstraction
- Docker Compose (optional local Postgres + MinIO)
- Render Blueprint (`render.yaml`) — production web + Supabase Storage

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

Veritabanı proje içinde `./data/boravin` klasöründe (PGlite — gömülü Postgres). Görseller production’da Supabase Storage’a (`STORAGE_PROVIDER=supabase`, bucket `boravin-media`) yazılır; lokal geliştirmede `STORAGE_PROVIDER=local` ile `public/uploads` kullanılabilir.

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

## Deployment (Render + Supabase)

Uygulama Render’da, **Postgres + Auth Supabase’de**.

### Kritik env (Render → Environment)

`DATABASE_URL` Render Postgres olmamalı. Supabase **Session Pooler** kullan:

```
DATABASE_PROVIDER=postgres
DATABASE_SSL=require
DATABASE_SSL_REJECT_UNAUTHORIZED=0
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres
```

Ayrıca: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `GEMINI_*`.

Değişiklikten sonra **Manual Deploy**.

### Üye profil / teslimat adresi (Supabase)

Storefront hesap ve adres özelliği **Auth kullanıcı id’si = `customers.id`** ile çalışır. Veritabanı tarafında:

- `addresses` için `customer_id` indeksi ve müşteri başına tek varsayılan adres kuralı
- `customers` ve `addresses` tablolarında **RLS**: `authenticated` rolü yalnızca `auth.uid()` ile eşleşen satırlara erişir

Uygulama sunucusu `DATABASE_URL` (pooler) ile yazdığı için mevcut server action’lar aynı kalır; RLS, ileride Supabase client ile doğrudan tablo erişiminde koruma sağlar.

**Migration (önerilen):**

```bash
npm run db:migrate:deploy
```

Supabase’de şema zaten varken (ilk kez drizzle journal yoksa) bir kez:

```bash
npm run db:supabase:customer-addresses   # RLS + adres indeksleri
npm run db:stamp-migrations              # drizzle.__drizzle_migrations kaydı
npm run db:sync-customers                # Auth → public.customers
```

Alternatif: Supabase Dashboard → SQL Editor → `supabase/migrations/20260229194500_customer_addresses_rls.sql` içeriğini çalıştırın.

### Ürün silme (Supabase)

Admin ürün silme için:

- `homepage_section_items.product_id` FK → **ON DELETE SET NULL** (anasayfa bağlantısı silmeyi engellemesin)
- `PRODUCT_CREATE` / `PRODUCT_EDIT` / `PRODUCT_DELETE` / `PRODUCT_VIEW` izinleri + `SUPER_ADMIN` / `ADMIN` / `PRODUCT_MANAGER` rollerine bağlama

```bash
npm run db:supabase:product-delete
# veya
npm run db:migrate:deploy
```

Alternatif: Supabase Dashboard → SQL Editor → `supabase/migrations/20260329193000_product_delete_support.sql`

## Notlar

- Docker kapalıysa uygulama UI render eder; DB bağımlı listeler empty state gösterir.
- Gerçek iyzico/PayTR/Stripe bağlamak için `src/lib/payments` provider ekleyin.
- Meilisearch için `src/lib/search` arayüzü hazırdır.
