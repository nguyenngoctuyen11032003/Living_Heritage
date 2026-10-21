# Tính năng và bản đồ mã nguồn

Bản đồ route → thư mục sở hữu (theo spec §6 và kế hoạch `docs/superpowers/plans/2026-10-21-living-heritage-mvp.md`). Đường dẫn tính từ `apps/web/src/`. Mỗi khu vực khai báo route trong `routes/<khu-vực>/index.ts` (hợp đồng ở `routes/types.ts`), `app/router.tsx` gom tất cả lại.

Trạng thái: **đang xây dựng** cho mọi mục; người điều phối cập nhật khi từng phần hoàn tất.

## Route

| Route | Nội dung | Route khai báo ở | Logic / UI | Workstream | Trạng thái |
|---|---|---|---|---|---|
| `/` | Trang chủ 13 khối (spec §6.1) | `routes/landing` | `components/landing/*`, `components/motion/*` | C | đang xây dựng |
| `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc` | Trang tĩnh song ngữ | `routes/landing` hoặc `routes/legal` | `components/landing/*` | C | đang xây dựng |
| `/quyen-rieng-tu`, `/dieu-khoan` | Chính sách, điều khoản | `routes/legal` | — | C | đang xây dựng |
| `/dang-nhap`, `/dang-ky`, `/auth/callback` | Email + mật khẩu, magic link | `routes/auth` | `features/auth` | E | đang xây dựng |
| `/k/:token` | Đăng nhập ẩn danh + nhận người kể | `routes/narrator` (bare) | `features/narrators` | E | đang xây dựng |
| `/ke-chuyen` | Chọn chủ đề (6 thẻ + "Chưa biết kể gì") | `routes/narrator` | `features/storytelling` | E | đang xây dựng |
| `/ke-chuyen/phien/:id` | Ghi âm, nghe câu hỏi, Giữ / Ghi lại / Câu tiếp | `routes/narrator` | `features/storytelling` (`recorder.ts`) | E | đang xây dựng |
| `/gia-dinh/nguoi-ke` | Người kể, liên kết kể chuyện (QR), thu hồi | `routes/family/narrators.ts` | `features/narrators` | E | đang xây dựng |
| `/gia-dinh/thanh-vien` | Mời thành viên, vai trò | `routes/family/members.ts` | `features/families` | E | đang xây dựng |
| `/ban-nhap/:id` | Trạng thái AI, chép lời, bản nháp, lịch sử, "Xác nhận đúng ý tôi" | `routes/review` | `features/review` | F | đang xây dựng |
| `/gia-dinh` | Kho gia đình: tìm kiếm, lọc, thẻ, kho rỗng | `routes/family/vault.ts` | `features/vault` | F | đang xây dựng |
| `/cau-chuyen/:id` | Chi tiết riêng, audio signed URL, chia sẻ | `routes/family/vault.ts` | `features/vault`, `features/sharing` | F | đang xây dựng |
| `/sach`, `/sach/:id` | Trình tạo sách, xem trước, in, QR | `routes/books` | `features/books` | F | đang xây dựng |
| `/kham-pha` | Kho tri thức: `search_public`, lọc, thẻ tạp chí | `routes/knowledge` | `features/knowledge` | G | đang xây dựng |
| `/tri-thuc/:id` | Chi tiết tri thức, Lưu / Báo cáo / Đề nghị trao đổi | `routes/knowledge` | `features/knowledge` | G | đang xây dựng |
| `/nghe/:storyId` | Đích của QR: phát audio nếu có quyền | `routes/knowledge` | `features/knowledge` | G | đang xây dựng |
| `/quan-tri` | Duyệt công bố, báo cáo, yêu cầu xoá, AI lỗi | `routes/admin` | `features/admin` | G | đang xây dựng |
| `*` | Không tìm thấy | `routes/NotFound.tsx` | — | lead | đang xây dựng |

## Phần dùng chung

| Phần | Vị trí | Trạng thái |
|---|---|---|
| Design tokens, font, chuyển động | `design/` | đang xây dựng |
| Song ngữ vi/en (`t()`) | `i18n/`, từ điển `i18n/dict/<ns>.{vi,en}.ts` | đang xây dựng |
| UI cơ bản, layout | `components/ui`, `components/layout` | đang xây dựng |
| Supabase client, env | `lib/` | đang xây dựng |
| Types DB, hợp đồng AI, hằng số | `packages/shared/src` | đang xây dựng |
| Schema, RLS, RPC, pgTAP | `supabase/migrations`, `supabase/tests` | đang xây dựng |
| Edge Function AI (Gemini) | `supabase/functions/ai-process`, `_shared` | đang xây dựng |
| CI/CD, script kiểm tra | `.github/workflows`, `scripts/` | có (xem `docs/DEPLOY.md`) |
