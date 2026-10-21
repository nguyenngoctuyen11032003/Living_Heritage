# Tính năng và bản đồ mã nguồn

Bản đồ route → thư mục sở hữu (theo spec §6 và kế hoạch `docs/superpowers/plans/2026-10-21-living-heritage-mvp.md`). Đường dẫn tính từ `apps/web/src/`. Mỗi khu vực khai báo route trong `routes/<khu-vực>/index.ts` (hợp đồng ở `routes/types.ts`), `app/router.tsx` gom tất cả lại.

Trạng thái (theo DỰ ÁN.md §4.3, chỉ ghi khi có bằng chứng trong mã):
- **MVP** — chạy thật với Supabase (cần đăng nhập nếu là trang gia đình).
- **MVP (thiếu …)** — chạy thật nhưng còn thiếu phần được ghi trong ngoặc.
- **Minh họa** — dữ liệu dựng sẵn, có nhãn "Dữ liệu minh họa" / "Mô phỏng kết quả AI".
- **Chưa có** — chưa triển khai.

Giới hạn và phần mô phỏng: `docs/LIMITATIONS.md`. Mẫu ghi nghiệm thu NT01–NT18 theo thiết bị: `docs/TEST-MATRIX.md`. Sao lưu, xuất dữ liệu, hạn mức, môi trường: `docs/DEPLOY.md`.

## Route

| Route | Nội dung | Route khai báo ở | Logic / UI | Trạng thái |
|---|---|---|---|---|
| `/` | Trang chủ 13 khối (spec §6.1) | `routes/landing` | `components/landing/*`, `components/motion/*` | MVP; chuyện mẫu, đầu ra AI, sách mẫu là **Minh họa** |
| `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc`, `/sach-ky-uc` | Trang tĩnh song ngữ | `routes/legal` | `components/landing/*` | MVP; giá là "Giá dự kiến"; `/to-chuc` chưa có kênh liên hệ tư vấn |
| `/quyen-rieng-tu`, `/dieu-khoan` | Chính sách, điều khoản | `routes/legal` | — | MVP |
| `/dang-nhap`, `/dang-ky`, `/auth/callback`, `/quen-mat-khau`, `/dat-lai-mat-khau` | Email + mật khẩu, magic link | `routes/auth` | `features/auth` | MVP |
| `/bat-dau` (B5: chọn vai và mục đích) | — | — | — | **Chưa có** (hiện "Bắt đầu lưu giữ" → `/dang-ky` → `/gia-dinh/bat-dau`) |
| `/gia-dinh/bat-dau` | Tạo gia đình + 3 bước hướng dẫn | `routes/family/members.ts` | `features/families` | MVP |
| `/moi/:token` | Nhận lời mời thành viên | `routes/family/members.ts` | `features/families` | MVP |
| `/k/:token` | Đăng nhập ẩn danh + nhận người kể | `routes/auth` (bare) | `features/narrators` | MVP |
| `/ke-chuyen`, `/ke-chuyen/chu-de/:slug` | Chọn chủ đề (6 thẻ + "Chưa biết kể gì") | `routes/narrator` | `features/storytelling` | MVP (bộ câu hỏi chưa quản lý được trên giao diện) |
| `/ke-chuyen/phien/:sessionId` | Ghi âm, nghe câu hỏi, Bỏ qua, Giữ / Ghi lại / Câu tiếp, giới hạn 10 phút | `routes/narrator` | `features/storytelling` (`recorder.ts`) | MVP (không có tệp mẫu dự phòng cho demo) |
| `/ke-chuyen/cua-toi` | Câu chuyện của người kể | `routes/narrator` | `features/storytelling` | MVP |
| `/gia-dinh/nguoi-ke` | Người kể, liên kết kể chuyện (QR), thu hồi | `routes/family/narrators.ts` | `features/narrators` | MVP |
| `/gia-dinh/thanh-vien` | Mời thành viên, vai trò | `routes/family/members.ts` | `features/families` | MVP (không có lối vào từ thanh điều hướng mobile) |
| `/ban-nhap/:id` | Trạng thái AI, chép lời (sửa có phiên bản), bản nháp, lịch sử, "Xác nhận nội dung" | `routes/review` | `features/review` | MVP (có trường người, địa điểm; chủ đề đang bổ sung) |
| `/gia-dinh` | Kho gia đình: tìm kiếm, lọc, thẻ, kho rỗng | `routes/family/vault.ts` | `features/vault` | MVP |
| `/cau-chuyen/:id` | Chi tiết riêng, audio signed URL, chia sẻ | `routes/family/vault.ts` | `features/vault`, `features/sharing` | MVP |
| `/gia-dinh/bo-suu-tap`, `/gia-dinh/bo-suu-tap/:id` | Bộ sưu tập | `routes/family/vault.ts` | `features/vault` | MVP |
| `/gia-dinh/album`, `/gia-dinh/cay-gia-dinh` | Album ảnh, cây gia đình | `routes/media` | `features/media` | MVP (không có lối vào từ thanh điều hướng mobile) |
| `/sach`, `/sach/:id`, `/sach/:id/in` | Trình tạo sách, xem trước, in / lưu PDF, QR | `routes/books` | `features/books` | MVP (chưa có PDF mẫu cho demo) |
| `/kham-pha` | Kho tri thức: `search_public`, lọc, hỏi đáp có nguồn | `routes/knowledge` | `features/knowledge` | MVP; khi kho trống hiện thẻ **Minh họa** |
| `/tri-thuc/:id` | Chi tiết tri thức, Lưu / Báo cáo / Đề nghị trao đổi | `routes/knowledge` | `features/knowledge` | MVP; `/tri-thuc/mau-*` là **Minh họa** (âm thanh mô phỏng) |
| `/da-luu` | Danh sách lưu để xem sau | `routes/knowledge` | `features/knowledge` | MVP (lưu trên thiết bị, chưa theo tài khoản) |
| `/ket-noi` (B5) | Gửi quan tâm / đề nghị trao đổi | — | `ConnectDialog` trong `/tri-thuc/:id` | Chức năng có (hộp thoại); **chưa có** trang riêng |
| `/nghe/:storyId` | Đích của QR: phát audio nếu có quyền | `routes/knowledge` | `features/knowledge` | MVP |
| `/cai-dat`, `/gia-dinh/du-lieu` | Cài đặt, trung tâm dữ liệu (xuất, nhật ký, yêu cầu xoá) | `routes/settings` | `features/settings` | MVP (yêu cầu xoá được xử lý thủ công) |
| `/quan-tri` | Duyệt công bố, báo cáo, yêu cầu xoá, AI lỗi, đề nghị trao đổi, số liệu | `routes/admin` | `features/admin` | MVP (chưa gỡ được nội dung công khai từ báo cáo; không có lối vào mobile) |
| `*` | Không tìm thấy | `routes/NotFound.tsx` | — | MVP |

## Phần thật và phần mô phỏng (B4, B18)

| Nhóm P0 | Thật (MVP) | Minh họa / mô phỏng có nhãn | Chưa có |
|---|---|---|---|
| Bắt đầu và câu hỏi | Chủ đề, câu hỏi tiếng Việt, phiên kể | — | Quản lý bộ câu hỏi trên giao diện; trang `/bat-dau` |
| Ghi âm | Ghi / tạm dừng / nghe lại / ghi lại, tải tệp, giữ bản ghi khi mất mạng | — | Tệp mẫu dự phòng cho demo |
| ASR và bản nháp | Gemini qua Edge Function, thử lại, hạn mức | "Mô phỏng kết quả AI" trên trang chủ | — |
| Duyệt và lưu | Phiên bản, duyệt bởi người kể, sửa phải duyệt lại | — | — |
| Kho gia đình | Đăng nhập, RLS, tìm kiếm, lọc | — | Kho mẫu (nháp / riêng / được mời) cho demo |
| Tri thức | `search_public`, chỉ bản được duyệt | Thẻ `mau-*` khi kho trống, âm thanh mô phỏng | Tệp âm thanh mẫu có quyền dùng |
| Chia sẻ | 3 lựa chọn, bật/tắt âm thanh-tên-vùng-ảnh, xem trước, rút, nhật ký | — | Thời hạn chia sẻ; xoá cache âm thanh công khai phía máy chủ |
| Sách và liên hệ | Bản đọc theo chương, in / lưu PDF, QR, đề nghị trao đổi | Sách mẫu trên trang chủ | PDF mẫu; kênh liên hệ tổ chức |
| Demo | — | — | Nút "Khôi phục dữ liệu mẫu", đường demo không cần API |
| Đo lường (B17) | Số liệu AI tổng hợp ở `/quan-tri` | — | Sự kiện sản phẩm, mã người tham gia, đếm nội dung đã duyệt theo nguồn |

## Phần dùng chung

| Phần | Vị trí | Trạng thái |
|---|---|---|
| Design tokens, font, chuyển động (giảm chuyển động) | `design/` | MVP |
| Song ngữ vi/en (`t()`) | `i18n/`, từ điển `i18n/dict/<ns>.{vi,en}.ts` | MVP |
| UI cơ bản, layout | `components/ui`, `components/layout` | MVP |
| Supabase client, env | `lib/` | MVP |
| Types DB, hợp đồng AI, hằng số | `packages/shared/src` | MVP |
| Schema, RLS, RPC, pgTAP | `supabase/migrations`, `supabase/tests` | MVP |
| Edge Functions (`ai-process`, `knowledge-ask`, `public-audio-sync`, `question-tts`) | `supabase/functions` | MVP |
| CI/CD, script kiểm tra | `.github/workflows`, `scripts/` | có (xem `docs/DEPLOY.md`) |
| Kiểm thử e2e (route, i18n, visual 360/768/1440, a11y-lite) | `apps/web/tests/e2e` | có |
