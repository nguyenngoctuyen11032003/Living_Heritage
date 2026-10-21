# Giới hạn hiện tại của Di Sản Sống

Danh sách trung thực theo mã nguồn ở thời điểm vòng kiểm tra 2026-10-21 (đối chiếu DỰ ÁN.md B4, B18, B19). Chưa có kết quả thử nghiệm với người dùng thật; mọi mục "thật" dưới đây nghĩa là đã có mã chạy với Supabase, **không** có nghĩa là đã được kiểm chứng ngoài thực tế (DỰ ÁN.md §4.3).

Ký hiệu: **Thật** — xử lý và lưu trữ thật. **Minh họa** — dữ liệu dựng sẵn, có nhãn trên giao diện. **Chưa có** — chưa triển khai. **Đang bổ sung** — đang làm trong vòng này, chờ người điều phối xác nhận.

## 1. Phần thật, phần minh họa, phần chưa có

| Nhóm | Thật | Minh họa (có nhãn) | Chưa có / đang bổ sung |
|---|---|---|---|
| Bắt đầu và câu hỏi | 6 chủ đề + "Chưa biết kể gì", câu hỏi tiếng Việt/Anh, phiên kể, câu hỏi gợi ý tiếp bằng AI | — | Quản lý bộ câu hỏi trên giao diện (hiện chỉ sửa bằng migration). Trang `/bat-dau` chọn vai và mục đích: **đang bổ sung** |
| Ghi âm | Ghi, tạm dừng, nghe lại, ghi lại có xác nhận, tải tệp có sẵn, giữ bản ghi trên máy khi mất mạng, tối đa 10 phút / 20 MB | — | Tệp ghi âm mẫu dự phòng cho demo |
| Chép lời và bản nháp | Gemini gọi từ Edge Function `ai-process`; thử lại không nhân đôi; hạn mức theo ngày | Khối "Một lời kể, ba đầu ra" ở trang chủ ghi "Mô phỏng kết quả AI" | — |
| Duyệt và lưu | Phiên bản, chỉ người kể duyệt (hoặc người hỗ trợ ghi nhận đồng ý), sửa bản công khai thì rút và phải duyệt lại | — | Trường sửa riêng cho tên người, địa điểm, chủ đề |
| Kho gia đình, bộ sưu tập, album, cây gia đình | Đăng nhập, RLS theo gia đình và từng câu chuyện | — | Kho mẫu (nháp / riêng / được mời) cho demo: **đang bổ sung** cùng `/trai-nghiem` |
| Kho tri thức | `search_public` chỉ trả bản đã duyệt công bố; tìm có/không dấu; hỏi đáp có dẫn nguồn | Khi kho trống: 8 thẻ `mau-*` với người kể hư cấu, âm thanh phát mô phỏng (không có tệp) | Tệp âm thanh mẫu có quyền dùng |
| Chia sẻ và quyền | 3 lựa chọn, bật/tắt giọng kể–tên thật–vùng–ảnh, xem trước bản công khai, rút công bố, nhật ký | — | Thời hạn chia sẻ; quyền tải xuống riêng; vai trò biên tập hỗ trợ theo phiên |
| Tải xuống (B11) | Thành viên chỉ xem không có nút tải; in sách chỉ dành cho người biên tập | — | Chưa có quyền tải riêng ở tầng lưu trữ: ai nghe/xem được câu chuyện đều nhận liên kết có chữ ký hiệu lực 1 giờ tới tệp âm thanh/ảnh, nên người rành kỹ thuật vẫn có thể lưu tệp. Hướng P1: cờ `allow_download` theo từng câu chuyện và liên kết ngắn hạn hơn cho người chỉ xem |
| Người hỗ trợ và cách xác nhận (B11/B13) | Duyệt thay có đánh dấu đồng ý của người kể, ghi phương thức `assisted` | — | Ghi người hỗ trợ ở hồ sơ người kể và phương thức xác nhận trên biểu mẫu người kể + lúc duyệt: **đang bổ sung** |
| Thu hồi | Xoá `public_items` và kết quả tìm ngay khi rút | — | Tệp âm thanh công khai được gỡ bởi lệnh đồng bộ do trình duyệt gọi (best-effort) và có thể còn trong bộ nhớ đệm tối đa 1 giờ |
| Sách | Chọn câu chuyện đã duyệt, bìa, mục lục, chương, in / lưu PDF bằng hộp thoại in của trình duyệt, QR dẫn tới `/nghe/:id` (cần đăng nhập) | Sách mẫu ở trang chủ và `/sach-ky-uc` | PDF mẫu tải về; xuất PDF tự động phía máy chủ |
| Liên hệ | Đề nghị trao đổi và báo cáo nội dung lưu vào cơ sở dữ liệu | Với thẻ minh họa: chỉ mô phỏng, có thông báo | Kênh liên hệ cho tổ chức (trang `/to-chuc` ghi rõ đang chuẩn bị) |
| Quản trị | Duyệt công bố, báo cáo, đề nghị trao đổi, AI lỗi, số liệu AI tổng hợp | — | Gỡ nội dung công khai từ báo cáo: **đang bổ sung**. Trạng thái "đang xử lý" và thao tác xoá thật cho yêu cầu xoá: **đang bổ sung** (hiện quản trị phải xoá thủ công) |
| Đo lường (B17) | `ai_usage` (lượt AI, độ trễ, dung lượng) | — | Sự kiện sản phẩm `app_events`, mã người tham gia, đếm nội dung đã duyệt theo nguồn: **đang bổ sung**. Xuất số hoàn thành theo mã và nhập phiếu dễ dùng: chưa có |
| Demo | — | Trang chủ, `/kham-pha`, `/tri-thuc/mau-*` chạy được khi chưa kết nối máy chủ | Đường demo `/trai-nghiem` không cần API và nút "Khôi phục dữ liệu mẫu": **đang bổ sung** |

Các trang kể chuyện, bản nháp, kho gia đình và sách hiện báo "chưa kết nối" khi không có Supabase; chúng không có chế độ dữ liệu giả.

## 2. Giới hạn trình duyệt và thiết bị

Chưa có kết quả kiểm thử trên thiết bị thật; điền vào `docs/TEST-MATRIX.md`. Điều đã biết từ mã:

- **Ghi âm** dùng `MediaRecorder`, ưu tiên `audio/webm;codecs=opus`, rồi `audio/webm`, rồi `audio/mp4` (`features/storytelling/recorder.ts`). Safari trên iPhone/iPad thường chỉ có `audio/mp4`. Trình duyệt không có `MediaRecorder` sẽ thấy thông báo "Trình duyệt này chưa ghi âm được" và lối thay thế là chọn tệp có sẵn.
- Tên tệp trong kho luôn có đuôi `.webm` (`upload.ts`) kể cả khi nội dung là `audio/mp4`; kiểu tệp thật nằm ở cột `recordings.mime`. Công cụ bên ngoài nên đọc `mime`, không dựa vào đuôi.
- **Quyền micro**: lần từ chối được hướng dẫn theo trình duyệt (có hướng dẫn riêng cho iOS: Cài đặt → Safari → Micro). Ứng dụng không tự hỏi lại vô hạn.
- **Nghe câu hỏi**: giọng đọc từ Edge Function `question-tts`; khi lỗi hoặc hết hạn mức thì dùng `speechSynthesis` của trình duyệt. Một số máy không có giọng tiếng Việt và giao diện sẽ báo điều đó.
- iOS Safari có thể giữ `AudioContext` ở trạng thái tạm dừng cho tới khi người dùng chạm; đồng hồ mức tiếng micro được đánh thức sau thao tác.
- Danh sách "Đã lưu" (`/da-luu`) và tuỳ chọn cỡ chữ / tự đọc câu hỏi lưu trên từng trình duyệt; chế độ ẩn danh hoặc xoá dữ liệu trang sẽ mất.
- Liên kết nghe có chữ ký hết hạn sau 1 giờ; tệp xuất dữ liệu gia đình chứa liên kết tải tệp cũng hết hạn sau 1 giờ.

## 3. Hạn mức mặc định

| Hạn mức | Mặc định | Đổi bằng |
|---|---|---|
| Lượt AI chép lời + soạn nháp / người / ngày | 30 | secret `AI_DAILY_LIMIT` |
| Lượt đọc câu hỏi bằng giọng máy chủ / người / ngày | 60 | secret `TTS_DAILY_LIMIT` |
| Hỏi đáp kho tri thức | 10 câu / phút / máy chủ xử lý, 1 000 câu / ngày | `KNOWLEDGE_RATE_PER_MIN`, `KNOWLEDGE_DAILY_CAP` |
| Ngắt mạch khi Gemini lỗi | 5 lỗi / 60 giây thì tạm ngừng 60 giây | sửa mã |
| Bản ghi | 10 phút, 20 MB | `packages/shared/src/constants.ts` (và bản sao trong `supabase/functions/_shared`) |

Hạn mức hỏi đáp và ngắt mạch nằm trong bộ nhớ từng isolate của Edge Function, nên chỉ là giới hạn gần đúng.

## 4. Ngoài phạm vi (P1/P2, chưa tính trong gói)

Theo DỰ ÁN.md B4: thanh toán và thu phí (bảng giá chỉ là "Giá dự kiến"), đặt in sách, gọi điện tự động, video, ứng dụng di động riêng, đặt lịch trao đổi qua điều phối, đánh dấu đoạn âm thanh theo mốc thời gian chính xác. Không nhân bản giọng nói hoặc tạo người thân ảo. Hỏi đáp và tìm kiếm ngữ nghĩa trong kho tri thức đã có (vượt P0) nhưng chỉ trả lời từ bản đã công bố.

## 5. Chưa được kiểm chứng

- Chưa có số liệu thử nghiệm người dùng (mục tiêu 20 + 30 người, 50 nội dung, 80% dễ dùng là **mục tiêu**, không phải kết quả).
- Chưa đo thời gian tải trang công khai (NT16) và chưa có ma trận thiết bị đã chạy (NT14).
- Chất lượng chép lời tiếng Việt theo vùng miền chưa được đo.
