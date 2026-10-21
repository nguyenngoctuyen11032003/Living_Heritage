# Tính năng và bản đồ mã nguồn

Bảng dưới đây cho biết mỗi route được khai báo ở đâu, logic nằm ở đâu và đang ở trạng thái nào. Các đường dẫn tính từ `apps/web/src/`.

Mỗi khu vực tự khai báo route của mình trong `routes/<khu-vực>/index.ts`. Hợp đồng route nằm ở `routes/types.ts`, và `app/router.tsx` gom tất cả lại. Spec gốc: [docs/superpowers/specs/2026-10-21-living-heritage-mvp-design.md](superpowers/specs/2026-10-21-living-heritage-mvp-design.md).

**Ý nghĩa trạng thái:**
- **Đã có:** đã viết code, có unit test, build đạt.
- **Cần kiểm thử thật:** chưa chạy hết luồng với Supabase và Gemini thật.

## Route

| Route | Nội dung | Route khai báo ở | Logic / UI | Trạng thái |
|---|---|---|---|---|
| `/` | Trang chủ 13 khối: hero có băng chuyền thẻ cong, chuyện mẫu, manifesto, ba đầu ra, lưới tính năng, kho mẫu, sách, quyền riêng tư, gói, FAQ | `routes/landing` | `components/landing/*`, `components/motion/*` | Đã có |
| `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc`, `/sach-ky-uc` | Trang giới thiệu, song ngữ | `routes/legal` | `routes/legal/*Page.tsx` | Đã có |
| `/quyen-rieng-tu`, `/dieu-khoan` | Chính sách và điều khoản | `routes/legal` | `routes/legal/StaticPage.tsx` | Đã có |
| `/dang-nhap`, `/dang-ky`, `/auth/callback`, `/quen-mat-khau`, `/dat-lai-mat-khau` | Email + mật khẩu, magic link, đặt lại mật khẩu | `routes/auth` | `features/auth` | Đã có · cần kiểm thử thật |
| `/k/:token` | Liên kết kể chuyện: đăng nhập ẩn danh rồi nhận người kể | `routes/auth` (bare) | `features/narrators/ClaimLinkPage.tsx` | Đã có · cần kiểm thử thật |
| `/moi/:token` | Nhận lời mời vào gia đình | `routes/family/members.ts` | `features/families/InviteAcceptPage.tsx` | Đã có · cần kiểm thử thật |
| `/gia-dinh/bat-dau` | Tạo kho gia đình và danh sách 3 bước khởi đầu | `routes/family/members.ts` | `features/families/OnboardingPage.tsx` | Đã có |
| `/gia-dinh/thanh-vien` | Thành viên, lời mời, vai trò | `routes/family/members.ts` | `features/families/MembersPage.tsx` | Đã có |
| `/gia-dinh/nguoi-ke` | Người kể, liên kết kể chuyện có QR, thu hồi liên kết | `routes/family/narrators.ts` | `features/narrators` | Đã có |
| `/ke-chuyen`, `/ke-chuyen/cua-toi`, `/ke-chuyen/chu-de/:slug` | Chế độ người kể: chọn chủ đề, câu chuyện của tôi | `routes/narrator` | `features/storytelling` | Đã có |
| `/ke-chuyen/phien/:id` | Câu hỏi đọc to, ghi âm có tạm dừng, nghe lại, tải lên, giữ bản ghi khi mất mạng, AI xử lý | `routes/narrator` | `features/storytelling` (`recorder.ts`, `upload.ts`, `SessionFlow.tsx`) | Đã có · cần kiểm thử thật |
| `/ban-nhap/:id` | Biên tập hai cột, chép lời có đánh dấu "Cần kiểm tra", lịch sử phiên bản, "Xác nhận đúng ý tôi" | `routes/review` (bare) | `features/review`, `features/sharing` | Đã có · cần kiểm thử thật |
| `/gia-dinh` | Kho gia đình: số liệu thật, "Cần bạn xem", tìm kiếm, lọc, thẻ | `routes/family/vault.ts` | `features/vault` | Đã có |
| `/cau-chuyen/:id` | Chi tiết riêng, âm thanh qua signed URL, chia sẻ, bộ sưu tập, thêm vào sách | `routes/family/vault.ts` | `features/vault`, `features/sharing` | Đã có |
| `/gia-dinh/bo-suu-tap`, `/gia-dinh/bo-suu-tap/:id` | Bộ sưu tập | `routes/family/vault.ts` | `features/vault/Collections.tsx` | Đã có |
| `/sach`, `/sach/:id`, `/sach/:id/in` | Sách ký ức: chọn chương, bìa, xem trước lật trang, QR từng chương, bản in A5 | `routes/books` | `features/books` | Đã có |
| `/kham-pha`, `/da-luu` | Kho tri thức: `search_public` (có hoặc không dấu), bộ lọc nằm trên URL, dữ liệu minh họa khi kho trống | `routes/knowledge` | `features/knowledge` | Đã có |
| `/tri-thuc/:id` | Chi tiết tri thức; Lưu, Báo cáo, Đề nghị trao đổi; nội dung liên quan | `routes/knowledge` | `features/knowledge` | Đã có |
| `/nghe/:storyId` | Trang mở khi quét QR: phát âm thanh nếu người xem có quyền, không lộ tiêu đề khi không có quyền | `routes/knowledge` | `features/knowledge/listen.ts` | Đã có · cần kiểm thử thật |
| `/quan-tri` | Duyệt công bố (kèm đồng bộ âm thanh công khai), báo cáo, kết nối, yêu cầu xoá, AI lỗi | `routes/admin` | `features/admin` | Đã có · cần kiểm thử thật |
| `*` | Không tìm thấy trang | `routes/NotFound.tsx` | — | Đã có |

## Phần dùng chung

| Phần | Vị trí |
|---|---|
| Song ngữ vi/en (thiếu khoá thì lỗi TypeScript) | `i18n/*`, `i18n/dict/<namespace>.{vi,en}.ts` |
| Phiên đăng nhập, `RequireAuth` | `lib/session.tsx` |
| Kho gia đình đang chọn | `features/families/current.tsx` (`useCurrentFamily`) |
| Gọi AI | `features/ai/client.ts` → Edge Function `ai-process` |
| Đồng bộ âm thanh công khai | `lib/publicAudio.ts` → Edge Function `public-audio-sync` |
| Bộ component | `components/ui/*`, `components/motion/*`, `components/illustrations/*` |
| Layout | `components/layout/layouts.tsx` (`SiteLayout`, `AppShell`, `NarratorShell`) |

## Backend

| Phần | Vị trí |
|---|---|
| Schema, RLS, RPC, Storage, tìm kiếm `unaccent`, hạn mức AI, chủ đề song ngữ | `supabase/migrations/2026102100010{0..5}_*.sql` |
| Kiểm thử pgTAP (truy cập chéo gia đình, luồng công bố, âm thanh riêng tư, chỉ người kể được duyệt, liên kết kể chuyện, tìm kiếm không dấu, quota) | `supabase/tests/*.test.sql` |
| AI: chép lời + bản nháp câu chuyện và thẻ kinh nghiệm (Gemini) | `supabase/functions/ai-process` |
| Đồng bộ bucket `public-audio` với `public_items` | `supabase/functions/public-audio-sync` |
