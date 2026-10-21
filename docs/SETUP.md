# Cài đặt Di Sản Sống trên máy

Monorepo pnpm: `apps/web` (Vite + React, đưa lên GitHub Pages), `packages/shared` (types, hợp đồng AI, hằng số), `supabase/` (migration, pgTAP, Edge Function `ai-process`), `scripts/` (kiểm tra an toàn dùng trong CI).

## Cần có
- Node.js 22 (`.nvmrc`) và pnpm 10 (`corepack enable`; phiên bản ghim ở `packageManager` trong `package.json`).
- Docker Desktop: chỉ cần cho database local và test pgTAP.
- Deno 2: chỉ cần khi sửa `supabase/functions` (hoặc dùng `npx deno@2`).
- Supabase CLI: đã có sẵn qua devDependency `supabase@2.120.0`, gọi bằng `pnpm exec supabase …`.

## 1. Cài phụ thuộc
```bash
pnpm install
```

## 2. Điền `.env` (gốc repo, đã bị git ignore)
```bash
cp .env.example .env
```

| Biến | Ở đâu | Ghi chú |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API | `https://dfohmtznhercbhutvyag.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys | chỉ key `sb_publishable_…` (hoặc JWT role `anon`) |
| `VITE_SITE_URL` | tự đặt | local: `http://localhost:5173` |
| `VITE_BASE_PATH` | tự đặt | local: `/`; production: `/Living_Heritage/` |

Chỉ bốn biến `VITE_*` trên được phép: mọi `VITE_*` đều bị đóng gói vào JavaScript công khai. Kiểm tra bằng:
```bash
node scripts/check-public-env.mjs            # thêm --strict để bắt buộc URL + key
```
Biến server (`SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `GEMINI_*`) **không bao giờ** có tiền tố `VITE_`.

## 3. Chạy web
```bash
pnpm dev            # http://localhost:5173
pnpm lint
pnpm typecheck
pnpm test           # Vitest (apps/web, packages/shared)
pnpm build          # ra apps/web/dist (có 404.html cho deep link trên Pages)
node scripts/check-bundle-secrets.mjs   # sau build: không secret, không source map
node --test scripts/*.test.mjs          # test các script kiểm tra
```

Git Bash trên Windows tự đổi chuỗi giống đường dẫn: dùng `MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/Living_Heritage/ pnpm build` khi thử build với base path.

## 4. Database local (Docker)
Cổng local dùng dải 544xx (API 54421, DB 54422, Studio 54423, Mailpit 54424) để không đụng Linguo (553xx). Chỉ chạy một stack Supabase mỗi lúc.

```bash
pnpm db:start       # supabase start: áp mọi migration + supabase/seed.sql
pnpm db:lint        # supabase db lint --fail-on error
pnpm db:test        # pgTAP trong supabase/tests
pnpm db:stop
```
Stack gọn giống CI (nhanh hơn, không có Studio/types):
```bash
pnpm exec supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,mailpit,postgres-meta
```
`pnpm db:reset` chỉ dùng cho stack **local**; không bao giờ chạy `db reset`, `config push` hay seed với project hosted.

### Migration mới
- Tên file: `supabase/migrations/<14 chữ số>_<chữ_thường_số_gạch_dưới>.sql`, số **lớn hơn** migration cuối đã có. CI (`scripts/check-migrations-immutable.mjs`) từ chối tên sai.
- Không sửa migration đã deploy (có trong `supabase/migrations-applied.json`); tạo migration mới. Xem `docs/DEPLOY.md`.

### Sinh lại types
Sau khi đổi schema (cần stack đầy đủ `pnpm db:start`, vì `gen types` dùng `postgres-meta`):
```bash
pnpm exec supabase gen types typescript --local --schema public > packages/shared/src/database.types.ts
```
Commit file đã sinh cùng migration.

## 5. Edge Function `ai-process`
Code ở `supabase/functions/ai-process`, phần dùng chung ở `supabase/functions/_shared`. Key Gemini **chỉ** nằm ở secret của Supabase, không bao giờ ở `.env` của web.

```bash
cd supabase/functions
deno check ai-process/index.ts
deno lint
deno test --allow-env      # Gemini giả lập, không gọi mạng
```
Chạy local (khi stack đầy đủ đang chạy): tạo `supabase/functions/.env` (bị git ignore) với `GEMINI_API_KEY`, `GEMINI_MODEL`, tuỳ chọn `AI_DAILY_LIMIT` (mặc định 30), rồi
```bash
pnpm exec supabase functions serve --env-file supabase/functions/.env
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` do Supabase tự cấp.

## 6. Supabase hosted (một lần)
Auth hosted cấu hình trên Dashboard (`supabase/config.toml` chỉ áp dụng local):
- **Authentication → URL Configuration**: Site URL `https://nguyenngoctuyen11032003.github.io/Living_Heritage`; Redirect URLs `https://nguyenngoctuyen11032003.github.io/Living_Heritage/**`, `http://localhost:5173/**`, `http://localhost:4173/**` (đường dẫn phân biệt hoa/thường).
- **Sign In / Providers**: bật Email, đặt **Minimum password length = 8** (giống `config.toml`; mặc định hosted là 6); bật **Anonymous sign-ins** (liên kết kể chuyện `/k/:token` đăng nhập ẩn danh).
- Email mặc định của Supabase chỉ gửi vài email mỗi giờ; trước khi có người dùng thật nên cấu hình **Authentication → Emails → SMTP**.

Deploy và secrets: `docs/DEPLOY.md`.
