# Tính năng và bản đồ mã nguồn

Bản đồ route → thư mục sở hữu (theo spec §6 và kế hoạch `docs/superpowers/plans/2026-10-21-living-heritage-mvp.md`). Đường dẫn tính từ `apps/web/src/`. Mỗi khu vực khai báo route trong `routes/<khu-vực>/index.ts` (hợp đồng ở `routes/types.ts`), `app/router.tsx` gom tất cả lại.

Trạng thái (cập nhật 2026-10-22, theo bằng chứng trong repo, không theo ý định):

- **có e2e** = có kịch bản Playwright riêng (backend giả bằng `page.route()`, `apps/web/tests/e2e/*.spec.ts`) cùng quét cấu trúc a11y; `acceptance.spec.ts` ánh xạ NT01/02/03/12/13.
- **có route, quét a11y** = route đã nối trong router và nằm trong `tests/e2e/routes.ts` (quét a11y + giao diện), chưa có kịch bản luồng riêng.
- Chưa mục nào được ghi "hoàn thành": e2e chỉ chạy với backend giả, chưa thử trên Supabase thật, thiết bị thật (NT04, NT05, NT14, NT16) hay có số đo; NT07-NT11, NT15, NT17-NT18 cần kiểm thử ngoài e2e (pgTAP, vận hành, bàn giao).

## Route

| Route | Nội dung | Route khai báo ở | Logic / UI | Workstream | Trạng thái |
|---|---|---|---|---|---|
| `/` | Trang chủ 13 khối (spec §6.1) | `routes/landing` | `components/landing/*`, `components/motion/*` | C | có e2e (`landing.spec.ts`) |
| `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc`, `/sach-ky-uc` | Trang tĩnh song ngữ | `routes/legal` | `components/landing/*` | C | có route, quét a11y |
| `/quyen-rieng-tu`, `/dieu-khoan` | Chính sách, điều khoản | `routes/legal` | — | C | có route, quét a11y |
| `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/dat-lai-mat-khau`, `/auth/callback` | Email + mật khẩu, magic link, khôi phục | `routes/auth` | `features/auth` | E | có e2e (`auth.spec.ts`; `/auth/callback` chưa có e2e) |
| `/moi/:token` | Nhận lời mời vào gia đình | `routes/family/members.ts` | `features/families` | E | có route, chưa có e2e |
| `/k/:token` | Đăng nhập ẩn danh + nhận người kể | `routes/narrator` (bare) | `features/narrators` | E | có e2e (`narrator.spec.ts`) |
| `/ke-chuyen`, `/ke-chuyen/chu-de/:slug`, `/ke-chuyen/cua-toi` | Chọn chủ đề (6 thẻ + "Chưa biết kể gì"), bắt đầu theo chủ đề, câu chuyện của tôi | `routes/narrator` | `features/storytelling` | E | có e2e (chủ đề) / quét a11y (còn lại) |
| `/ke-chuyen/phien/:id` | Ghi âm, nghe câu hỏi, Giữ / Ghi lại / Câu tiếp | `routes/narrator` | `features/storytelling` (`recorder.ts`) | E | có e2e (micro giả; chưa thử micro/trình duyệt thật) |
| `/gia-dinh/bat-dau` (+ `/bat-dau`) | Tạo gia đình lần đầu | `routes/family/members.ts` | `features/families` | E | có route, quét a11y |
| `/gia-dinh/nguoi-ke` | Người kể, liên kết kể chuyện (QR), thu hồi | `routes/family/narrators.ts` | `features/narrators` | E | có route, quét a11y |
| `/gia-dinh/thanh-vien` (+ `/thanh-vien`) | Mời thành viên, vai trò | `routes/family/members.ts` | `features/families` | E | có route, quét a11y |
| `/ban-nhap/:id` | Trạng thái AI, chép lời, bản nháp, lịch sử, "Xác nhận đúng ý tôi" | `routes/review` | `features/review` | F | có e2e (`review.spec.ts`) |
| `/gia-dinh` | Kho gia đình: tìm kiếm, lọc, thẻ, kho rỗng | `routes/family/vault.ts` | `features/vault` | F | có e2e (`vault.spec.ts`) |
| `/cau-chuyen/:id` | Chi tiết riêng, audio signed URL, chia sẻ | `routes/family/vault.ts` | `features/vault`, `features/sharing` | F | có e2e (`vault.spec.ts`, `review.spec.ts`) |
| `/gia-dinh/bo-suu-tap`, `/gia-dinh/bo-suu-tap/:id` (+ `/bo-suu-tap`) | Bộ sưu tập | `routes/family/vault.ts` | `features/vault` | F | có route, quét a11y |
| `/sach`, `/sach/:id`, `/sach/:id/in` | Trình tạo sách, xem trước, in, QR | `routes/books` | `features/books` | F | có route, quét a11y; luồng được đi qua trong `acceptance.spec.ts` (NT01) |
| `/kham-pha` | Kho tri thức: `search_public`, lọc, thẻ tạp chí | `routes/knowledge` | `features/knowledge` | G | có e2e (`knowledge.spec.ts`) |
| `/tri-thuc/:id` | Chi tiết tri thức, Lưu / Báo cáo / Đề nghị trao đổi | `routes/knowledge` | `features/knowledge` | G | có e2e (`knowledge.spec.ts`) |
| `/da-luu` | Nội dung đã lưu | `routes/knowledge` | `features/knowledge` | G | có route, quét a11y |
| `/nghe/:storyId` | Đích của QR: phát audio nếu có quyền | `routes/knowledge` | `features/knowledge` | G | có route, chưa có e2e |
| `/quan-tri` | Duyệt công bố, báo cáo, yêu cầu xoá, AI lỗi | `routes/admin` | `features/admin` | G | có route, quét a11y |
| `/cai-dat`, `/gia-dinh/du-lieu` | Cài đặt tài khoản, trung tâm dữ liệu (xuất, xoá, nhật ký) | `routes/settings` | `features/settings` | — | có route, quét a11y (không thuộc B5 gốc) |
| `/gia-dinh/album`, `/gia-dinh/cay-gia-dinh` | Album ảnh, cây gia đình | `routes/media` | `features/media` | — | có route, quét a11y (không thuộc B5 gốc) |
| `*` | Không tìm thấy | `routes/NotFound.tsx` | — | lead | có (quét a11y bắt trang 404 trên mọi route) |

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
