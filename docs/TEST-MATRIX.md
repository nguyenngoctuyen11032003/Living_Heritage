# Ma trận nghiệm thu NT01–NT18

Mẫu ghi kết quả theo DỰ ÁN.md B19. Mỗi lần chạy: sao chép bảng, điền phiên bản web (commit SHA hoặc thẻ), thiết bị, kết quả và bằng chứng (ảnh, video, log, tên tệp test). **Không điền "Đạt" khi chưa có bằng chứng.** Lỗi làm lộ dữ liệu, mất nguồn hoặc tự công bố chưa duyệt phải sửa trước thử nghiệm người thật.

Kết quả: `Đạt` / `Không đạt` / `Một phần` / `Chưa chạy` / `Không áp dụng`.

## Thông tin lần chạy

| Mục | Giá trị |
|---|---|
| Ngày | |
| Người chạy | |
| URL | |
| Phiên bản web (commit) | |
| Môi trường | demo / staging / production |
| Dữ liệu dùng | dữ liệu mẫu / tài khoản thử (không dùng dữ liệu gia đình thật) |

## Thiết bị

| Mã | Thiết bị | Hệ điều hành | Trình duyệt + phiên bản |
|---|---|---|---|
| D1 | Máy tính | Windows / macOS | Chrome |
| D2 | Máy tính | Windows | Edge |
| D3 | Điện thoại Android | Android | Chrome |
| D4 | iPhone | iOS | Safari |

## Ca thử

Mỗi ô thiết bị ghi kết quả; cột Bằng chứng ghi đường dẫn hoặc tên tệp. Cột "Kiểm thử tự động liên quan" chỉ là nơi tìm thêm bằng chứng, không thay cho chạy tay.

| Mã | Phạm vi | Ca thử | Điều kiện đạt (B19) | D1 | D2 | D3 | D4 | Bằng chứng | Kiểm thử tự động liên quan |
|---|---|---|---|---|---|---|---|---|---|
| NT01 | Demo | Luồng kể đầy đủ | Chủ đề → bản duyệt → kho → chi tiết → đầu ra; không nút cụt | | | | | | `apps/web/tests/e2e/narrator.spec.ts`, `review.spec.ts`, `vault.spec.ts` |
| NT02 | Demo | Luồng tìm học | Tìm kinh nghiệm theo từ khoá và bộ lọc; mở nguồn mẫu, thấy thông tin được phép | | | | | | `tests/e2e/knowledge.spec.ts` |
| NT03 | Demo | Minh bạch | Kết quả AI dựng sẵn, tài khoản mẫu, PDF mẫu có nhãn; không số liệu giả | | | | | | — |
| NT04 | Demo/MVP | Micro và ghi lại | Cho phép / từ chối được xử lý; dừng thực sự ngừng thu; ghi lại có xác nhận; nghe lại đúng nguồn | | | | | | `features/storytelling/recorder.test.ts`, `recorderReducer.test.ts` |
| NT05 | MVP | ASR và bản nháp thật | Tệp tiếng Việt được lưu, chép lời, tạo nháp; lỗi giữ nguồn, thử lại được | | | | | | `supabase/functions/ai-process/handler_test.ts` |
| NT06 | MVP | Duyệt và công bố | Nháp không công khai; duyệt không tự công khai; sửa bản công bố thì rút và duyệt lại | | | | | | `supabase/tests/publish_flow.test.sql`, `approve_only_narrator.test.sql` |
| NT07 | MVP | Truy cập chéo | Gia đình B không xem được tệp, văn bản, ảnh, sách, API, kết quả tìm của A khi biết đường dẫn | | | | | | `supabase/tests/rls_cross_family.test.sql`, `media_access.test.sql` |
| NT08 | MVP | Quyền với âm thanh | Công khai bản văn không kèm âm thanh thì âm thanh riêng không truy cập được từ kho khám phá | | | | | | `supabase/tests/audio_privacy.test.sql` |
| NT09 | MVP | Thu hồi | Sau thu hồi không xem được qua link cũ / kết quả tìm; kiểm tra bộ nhớ đệm và bản dẫn xuất | | | | | | — (xem `docs/LIMITATIONS.md` mục Thu hồi) |
| NT10 | MVP | Chất lượng tri thức | Thẻ nào cũng có nguồn; trường không căn cứ không bị AI bổ sung; không sai lệch trọng yếu | | | | | | — (rà soát tay) |
| NT11 | MVP | Đếm mục tiêu nội dung | 50 nội dung đếm theo mã nguồn độc lập đã duyệt, không đếm lặp | | | | | | — |
| NT12 | Demo/MVP | Tiếng Việt và màn hình | 360 / 768 / 1440 px; không cắt dấu, che nút, cuộn ngang ngoài ý muốn | | | | | | `tests/e2e/visual.spec.ts`, `landing.spec.ts` |
| NT13 | Demo/MVP | Khả năng tiếp cận | Bàn phím, focus/nhãn đúng, chữ 200% vẫn dùng được; âm thanh không tự phát; giảm chuyển động hoạt động | | | | | | `tests/e2e/a11y-lite.spec.ts` |
| NT14 | Demo/MVP | Trình duyệt | Chạy trên D1–D4; điểm không hỗ trợ được báo trước và có phương án | | | | | | — |
| NT15 | MVP | Lỗi và thử lại | Mất mạng, AI lỗi, thử lại không mất nguồn, không tạo trùng; thông báo đúng | | | | | | `features/storytelling/upload.test.ts` |
| NT16 | Demo/MVP | Tải trang | Trang công khai hiện nội dung chính ≤ 3 giây trên cấu hình đã thống nhất; ghi số đo, tách thời gian AI | | | | | | — |
| NT17 | MVP | Theo dõi thử nghiệm | Xuất số hoàn thành và bước cần giúp theo mã; nhập phản hồi dễ dùng để tổng hợp | | | | | | — |
| NT18 | Cả hai | Bàn giao | URL, mã nguồn, thiết kế, tài khoản / quyền quản lý, cấu hình mẫu, hướng dẫn, danh sách giới hạn | | | | | | `docs/SETUP.md`, `docs/DEPLOY.md`, `docs/LIMITATIONS.md`, `docs/FEATURES.md` |

## NT16 — ghi số đo tải trang

| Trang | Thiết bị | Mạng (giả lập) | Lần 1 (s) | Lần 2 (s) | Lần 3 (s) | Công cụ |
|---|---|---|---|---|---|---|
| `/` | | | | | | |
| `/kham-pha` | | | | | | |
| `/tri-thuc/<id>` | | | | | | |

## Lỗi phát hiện

| Mã ca | Thiết bị | Mô tả | Mức độ (lộ dữ liệu / mất nguồn / tự công bố / khác) | Issue / PR | Đã kiểm lại |
|---|---|---|---|---|---|
| | | | | | |
