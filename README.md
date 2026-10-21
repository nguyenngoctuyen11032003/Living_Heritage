# Di Sản Sống — Living Heritage

Di Sản Sống là trợ lý số giúp lưu giữ tri thức của người cao tuổi và kết nối các thế hệ.
- **Ông bà** kể chuyện bằng giọng nói tiếng Việt.
- **AI** (Gemini) chép lời, rồi soạn bản nháp câu chuyện gia đình và thẻ kinh nghiệm.
- **Người kể** đọc lại, sửa, rồi duyệt.
- **Gia đình** lưu giữ trong kho riêng và có thể làm sách ký ức, mỗi chương có mã QR phát giọng gốc.
- **Người trẻ** học từ những phần người kể đã đồng ý công bố.

Giao diện song ngữ **Tiếng Việt / English**, ưu tiên điện thoại.

Đây là web app một trang (React) chạy trên GitHub Pages. Backend dùng Supabase: Auth (gồm đăng nhập ẩn danh cho liên kết kể chuyện), Postgres với RLS, Storage, Edge Functions. CI/CD chạy bằng GitHub Actions.

Site: https://nguyenngoctuyen11032003.github.io/Living_Heritage/

## Trạng thái

Bản MVP theo [spec 1](docs/superpowers/specs/2026-10-21-living-heritage-mvp-design.md) đã có đủ luồng: kể → AI chép lời và soạn nháp → người kể duyệt → kho gia đình → đề nghị công bố → admin duyệt → kho tri thức → sách ký ức có QR.

Database đã được đưa lên Supabase. Các phần được đánh dấu "cần kiểm thử thật" trong [docs/FEATURES.md](docs/FEATURES.md) chưa được chạy hết luồng với Supabase và Gemini thật.

Dự án đang thử nghiệm, nên:
- mọi dữ liệu mẫu đều có nhãn "Dữ liệu minh họa";
- giá dịch vụ là giá dự kiến, chưa thu phí.

## Bắt đầu nhanh

Cần Node.js 22+ và pnpm 10 (`corepack enable`). Docker chỉ cần khi chạy test database ở máy.

```bash
pnpm install
cp .env.example .env          # điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY
pnpm check-env                # chặn việc lỡ đưa secret vào biến VITE_*

pnpm dev                      # http://localhost:5173
pnpm test                     # unit test (Vitest)
pnpm lint && pnpm typecheck
pnpm build && pnpm check:bundle   # build production + kiểm tra bundle không lọt secret hay source map
pnpm test:scripts             # test cho các script kiểm tra
```

Database ở máy (Docker, cổng 544xx):

```bash
pnpm exec supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,mailpit,postgres-meta
pnpm db:test                  # pgTAP (supabase/tests)
pnpm db:lint
pnpm db:stop
```

Chi tiết xem [docs/SETUP.md](docs/SETUP.md).

## Tài liệu

- Thuyết minh dự án và yêu cầu website: [DỰ ÁN.md](DỰ%20ÁN.md)
- Spec và kế hoạch: [docs/superpowers/specs/](docs/superpowers/specs/), [docs/superpowers/plans/](docs/superpowers/plans/)
- Bản đồ tính năng (route → file → trạng thái): [docs/FEATURES.md](docs/FEATURES.md)
- Cài đặt ở máy: [docs/SETUP.md](docs/SETUP.md)
- Deploy (secrets, biến môi trường, an toàn database, xử lý sự cố): [docs/DEPLOY.md](docs/DEPLOY.md)

## Cấu trúc

```text
apps/web/            React 19 + Vite 8 + Tailwind v4 + motion + react-router 8
  src/i18n/          song ngữ vi/en, mỗi khu vực một namespace
  src/components/    ui, motion, layout, landing, illustrations
  src/features/      auth, families, narrators, storytelling, ai, review, sharing, vault, books, knowledge, admin
  src/routes/        mỗi khu vực một file khai báo route (routes/types.ts)
packages/shared/     hằng số enum, hợp đồng AI (zod), kiểu database sinh tự động
supabase/            config.toml, migrations (+ migrations-applied.json), tests pgTAP
  functions/ai-process/         Gemini: chép lời + bản nháp, có hạn mức và circuit breaker
  functions/public-audio-sync/  đồng bộ bucket public-audio với nội dung đã công bố
scripts/             check-public-env, check-bundle-secrets, check-migrations-immutable
.github/workflows/   ci.yml, deploy.yml
```

## Lưu ý vận hành

- **Đăng nhập ẩn danh:** liên kết kể chuyện `/k/:token` chỉ hoạt động khi bật Anonymous sign-ins trong Supabase Auth.
- **Cấp quyền quản trị:** chạy `update profiles set is_admin = true where id = '<user id>';` trong SQL Editor.
- **Migration:** không sửa migration đã deploy. Mỗi khi migrate xong, ghi checksum bằng `pnpm check:migrations --record <files>` (xem DEPLOY.md).
