# Di Sản Sống

> **Dự án Di Sản Sống** — Học viện Công nghệ Bưu chính Viễn thông, Khoa Quản trị Kinh doanh 1 · Hà Nội, 2026
>
> *Bản thuyết minh sản phẩm dự thi và yêu cầu thiết kế website*
>
> Trợ lý số AI lưu giữ tri thức người cao tuổi và kết nối các thế hệ

## Mục lục

- [Định hướng thống nhất](#định-hướng-thống-nhất)
- [Phạm vi và trạng thái](#phạm-vi-và-trạng-thái)
- [Các quyết định chính cho bên làm website](#các-quyết-định-chính-cho-bên-làm-website)
- [I. VẤN ĐỀ THỰC TIỄN, SỰ CẦN THIẾT VÀ MỤC TIÊU CỦA DỰ ÁN](#i-vấn-đề-thực-tiễn-sự-cần-thiết-và-mục-tiêu-của-dự-án)
  - [1.1. Bối cảnh và vấn đề thực tiễn](#11-bối-cảnh-và-vấn-đề-thực-tiễn)
  - [1.2. Đối tượng tác động và nhu cầu thực tế](#12-đối-tượng-tác-động-và-nhu-cầu-thực-tế)
  - [1.3. Tính cấp thiết của giải pháp](#13-tính-cấp-thiết-của-giải-pháp)
  - [1.4. Mục tiêu của dự án](#14-mục-tiêu-của-dự-án)
- [II. GIẢI PHÁP VÀ NỘI DUNG KHOA HỌC CÔNG NGHỆ VÀ TÍNH KHẢ THI](#ii-giải-pháp-và-nội-dung-khoa-học-công-nghệ-và-tính-khả-thi)
  - [2.1. Tổng quan giải pháp](#21-tổng-quan-giải-pháp)
  - [2.2. Cấu trúc và các thành phần của hệ thống](#22-cấu-trúc-và-các-thành-phần-của-hệ-thống)
  - [2.3. Nguyên lý hoạt động và quy trình xử lý](#23-nguyên-lý-hoạt-động-và-quy-trình-xử-lý)
  - [2.4. Công nghệ và phương pháp kỹ thuật được sử dụng](#24-công-nghệ-và-phương-pháp-kỹ-thuật-được-sử-dụng)
  - [2.5. Tính khả thi](#25-tính-khả-thi)
- [III. TÍNH MỚI VÀ SÁNG TẠO](#iii-tính-mới-và-sáng-tạo)
  - [3.1. Điểm mới trong ý tưởng và cách tiếp cận](#31-điểm-mới-trong-ý-tưởng-và-cách-tiếp-cận)
  - [3.2. Điểm mới trong công nghệ, thiết kế và mô hình hoạt động](#32-điểm-mới-trong-công-nghệ-thiết-kế-và-mô-hình-hoạt-động)
  - [3.3. So sánh với các giải pháp hiện có](#33-so-sánh-với-các-giải-pháp-hiện-có)
  - [3.4. Giá trị khác biệt và lợi thế cạnh tranh cốt lõi](#34-giá-trị-khác-biệt-và-lợi-thế-cạnh-tranh-cốt-lõi)
- [IV. KẾT QUẢ, SẢN PHẨM HIỆN CÓ VÀ MỨC ĐỘ HOÀN THIỆN KIỂM CHỨNG](#iv-kết-quả-sản-phẩm-hiện-có-và-mức-độ-hoàn-thiện-kiểm-chứng)
  - [4.1. Sản phẩm và kết quả đã đạt được](#41-sản-phẩm-và-kết-quả-đã-đạt-được)
  - [4.2. Kết quả thử nghiệm và kiểm chứng](#42-kết-quả-thử-nghiệm-và-kiểm-chứng)
  - [4.3. Đánh giá mức độ hoàn thiện của sản phẩm](#43-đánh-giá-mức-độ-hoàn-thiện-của-sản-phẩm)
- [V. KHẢ NĂNG ỨNG DỤNG VÀ TÁC ĐỘNG DỰ KIẾN](#v-khả-năng-ứng-dụng-và-tác-động-dự-kiến)
  - [5.1. Khả năng ứng dụng và phạm vi triển khai](#51-khả-năng-ứng-dụng-và-phạm-vi-triển-khai)
  - [5.2. Tiềm năng phát triển và thương mại hóa](#52-tiềm-năng-phát-triển-và-thương-mại-hóa)
  - [5.3. Tác động đa chiều của sản phẩm](#53-tác-động-đa-chiều-của-sản-phẩm)
- [VI. HƯỚNG PHÁT TRIỂN VÀ KẾ HOẠCH BƯỚC TIẾP THEO](#vi-hướng-phát-triển-và-kế-hoạch-bước-tiếp-theo)
  - [6.1. Những nội dung cần tiếp tục hoàn thiện](#61-những-nội-dung-cần-tiếp-tục-hoàn-thiện)
  - [6.2. Lộ trình phát triển sản phẩm](#62-lộ-trình-phát-triển-sản-phẩm)
  - [6.3. Nguồn lực và nhu cầu hỗ trợ](#63-nguồn-lực-và-nhu-cầu-hỗ-trợ)
- [VII. MỨC ĐỘ LÀM CHỦ SẢN PHẨM](#vii-mức-độ-làm-chủ-sản-phẩm)
  - [7.1. Mức độ tự chủ về công nghệ và sở hữu trí tuệ](#71-mức-độ-tự-chủ-về-công-nghệ-và-sở-hữu-trí-tuệ)
  - [7.2. Phân công vai trò và đóng góp của từng thành viên trong nhóm](#72-phân-công-vai-trò-và-đóng-góp-của-từng-thành-viên-trong-nhóm)
  - [7.3. Vai trò hỗ trợ từ người hướng dẫn cố vấn và đơn vị bên ngoài](#73-vai-trò-hỗ-trợ-từ-người-hướng-dẫn-cố-vấn-và-đơn-vị-bên-ngoài)
- [VIII. KẾT QUẢ ĐÃ ĐẠT GIẢI TRƯỚC ĐÂY NẾU CÓ](#viii-kết-quả-đã-đạt-giải-trước-đây-nếu-có)
- [IX. KÊ KHAI VIỆC SỬ DỤNG CÔNG CỤ TRÍ TUỆ NHÂN TẠO](#ix-kê-khai-việc-sử-dụng-công-cụ-trí-tuệ-nhân-tạo)
- [X. DANH MỤC TÀI LIỆU MINH CHỨNG KÈM THEO NẾU CÓ](#x-danh-mục-tài-liệu-minh-chứng-kèm-theo-nếu-có)
- [PHỤ LỤC A. CÁC ĐIỂM CHUẨN HÓA VÀ LIÊN KẾT NỘI DUNG](#phụ-lục-a-các-điểm-chuẩn-hóa-và-liên-kết-nội-dung)
  - [A1. Những nội dung thay đổi so với bản trước](#a1-những-nội-dung-thay-đổi-so-với-bản-trước)
  - [A2. Ma trận logic từ vấn đề đến kiểm chứng](#a2-ma-trận-logic-từ-vấn-đề-đến-kiểm-chứng)
- [PHỤ LỤC B. YÊU CẦU THIẾT KẾ VÀ PHÁT TRIỂN WEBSITE](#phụ-lục-b-yêu-cầu-thiết-kế-và-phát-triển-website)
  - [B1. Đề bài và mục tiêu website](#b1-đề-bài-và-mục-tiêu-website)
  - [B2. Website tham khảo và hướng vận dụng](#b2-website-tham-khảo-và-hướng-vận-dụng)
  - [B3. Phong cách hình ảnh và hệ thống giao diện](#b3-phong-cách-hình-ảnh-và-hệ-thống-giao-diện)
  - [B4. Phạm vi ưu tiên và khác biệt giữa demo với MVP](#b4-phạm-vi-ưu-tiên-và-khác-biệt-giữa-demo-với-mvp)
  - [B5. Sơ đồ trang và điều hướng](#b5-sơ-đồ-trang-và-điều-hướng)
  - [B6. Trang chủ và nội dung cần thiết kế](#b6-trang-chủ-và-nội-dung-cần-thiết-kế)
  - [B7. Màn hình kể chuyện và gợi mở kinh nghiệm](#b7-màn-hình-kể-chuyện-và-gợi-mở-kinh-nghiệm)
  - [B8. Bản chép lời, bản nháp và kiểm duyệt](#b8-bản-chép-lời-bản-nháp-và-kiểm-duyệt)
  - [B9. Kho gia đình và đầu ra sách](#b9-kho-gia-đình-và-đầu-ra-sách)
  - [B10. Kho tri thức và trải nghiệm người học](#b10-kho-tri-thức-và-trải-nghiệm-người-học)
  - [B11. Vai trò và quyền truy cập](#b11-vai-trò-và-quyền-truy-cập)
  - [B12. Trạng thái nội dung, đồng ý và chia sẻ](#b12-trạng-thái-nội-dung-đồng-ý-và-chia-sẻ)
  - [B13. Dữ liệu tối thiểu và chất lượng nội dung](#b13-dữ-liệu-tối-thiểu-và-chất-lượng-nội-dung)
  - [B14. Kiến trúc triển khai và tích hợp AI](#b14-kiến-trúc-triển-khai-và-tích-hợp-ai)
  - [B15. Hiệu ứng và chuyển động](#b15-hiệu-ứng-và-chuyển-động)
  - [B16. Trạng thái rỗng, lỗi và trải nghiệm dự phòng](#b16-trạng-thái-rỗng-lỗi-và-trải-nghiệm-dự-phòng)
  - [B17. Chỉ số cần ghi nhận để kiểm chứng sản phẩm](#b17-chỉ-số-cần-ghi-nhận-để-kiểm-chứng-sản-phẩm)
  - [B18. Dữ liệu mẫu và kịch bản quay demo](#b18-dữ-liệu-mẫu-và-kịch-bản-quay-demo)
  - [B19. Tiêu chí nghiệm thu cụ thể](#b19-tiêu-chí-nghiệm-thu-cụ-thể)
  - [B20. Tiến độ, báo giá và bàn giao](#b20-tiến-độ-báo-giá-và-bàn-giao)
- [PHỤ LỤC C. TÀI LIỆU THAM KHẢO VÀ NỘI DUNG CẦN BỔ SUNG](#phụ-lục-c-tài-liệu-tham-khảo-và-nội-dung-cần-bổ-sung)

---

## Định hướng thống nhất

Di Sản Sống giúp người cao tuổi kể lại ký ức và kinh nghiệm bằng tiếng Việt; AI hỗ trợ chuyển lời kể thành câu chuyện và tư liệu có cấu trúc. Người kể kiểm tra nội dung, quyết định ai được tiếp cận. Gia đình có nơi lưu giữ tiếng nói và ký ức; người trẻ có thể tìm, học từ phần tri thức được cho phép chia sẻ.

Ưu tiên giai đoạn đầu là một hành trình hoàn chỉnh: gợi mở → ghi lại → biên tập → người kể duyệt → lưu giữ → tìm kiếm và học hỏi. Sách ký ức là một đầu ra của hành trình này. Kho tri thức có nguồn kể và phạm vi sử dụng rõ ràng là phần cần thể hiện trong cả hồ sơ lẫn website.

## Phạm vi và trạng thái

Phần I–X là bản thuyết minh theo sườn dự thi. Phụ lục A giải thích các điểm chuẩn hóa; phụ lục B là yêu cầu website để gửi đơn vị phát triển; phụ lục C trình bày tài liệu tham khảo và thông tin còn thiếu. Phần đầu được cập nhật theo tệp Markdown bổ sung; các phần còn lại đã được chỉnh để thống nhất với ba nhóm người dùng và mục tiêu thử nghiệm mới.

Dự án hiện được ghi nhận ở giai đoạn ý tưởng và thiết kế mô hình, đang phối hợp xây dựng website. Những mục tiêu, mức giá và phương án kỹ thuật là kế hoạch; kết quả triển khai chỉ cập nhật sau khi có minh chứng. Các ô [Bổ sung] cần hoàn thiện trước khi nộp.

## Các quyết định chính cho bên làm website

Thiết kế ấm áp, rõ chữ, ưu tiên điện thoại; tách chế độ người kể khỏi màn hình quản lý gia đình. Bản demo phải trình diễn được một câu chuyện gia đình và một nội dung kinh nghiệm có thể tìm thấy trong kho tri thức mẫu. Phải phân biệt chức năng thật với chức năng mô phỏng; thống nhất phạm vi bàn giao trước khi lập trình.

## I. VẤN ĐỀ THỰC TIỄN, SỰ CẦN THIẾT VÀ MỤC TIÊU CỦA DỰ ÁN

### 1.1. Bối cảnh và vấn đề thực tiễn

#### Bối cảnh

Việt Nam đang già hóa dân số nhanh. Kết quả Điều tra dân số và nhà ở giữa kỳ năm 2024 cho thấy cả nước có 14,2 triệu người từ 60 tuổi trở lên, tăng 2,8 triệu người so với năm 2019; số người trong nhóm tuổi này được dự báo xấp xỉ 18 triệu vào năm 2030 [1]. Dân số trung bình năm 2025 ước tính 102,3 triệu người, tuổi thọ trung bình đạt 74,7 tuổi [2]. Quy mô người cao tuổi gia tăng đặt ra nhu cầu quan tâm cả đời sống lẫn cơ hội tiếp tục đóng góp của họ.

Người cao tuổi nắm giữ những câu chuyện gia đình, kinh nghiệm sống, kỹ năng nghề nghiệp và hiểu biết địa phương. Một phần những giá trị này tồn tại trong lời kể hoặc thực hành trực tiếp. Khi không được ghi lại kịp thời và sắp xếp có hệ thống, gia đình khó lưu giữ, người trẻ khó tìm học, còn những chi tiết chỉ người kể biết có thể không phục hồi được.

#### Thực trạng và giới hạn của các nhóm giải pháp

Nhóm thứ nhất là dịch vụ viết hồi ký trong nước. Dịch vụ như BE Heritage giới thiệu hồi ký, tự truyện và cả gói kết hợp AI với biên tập viên [10]. Hướng này phù hợp khi khách hàng cần biên tập sâu; khả năng phục vụ nhiều gia đình phụ thuộc quy trình và nguồn nhân lực. Chưa có khảo sát đồng nhất về giá và thời gian, nên dự án không mặc định dịch vụ thủ công luôn đắt hơn hoặc kém hiệu quả hơn.

Nhóm thứ hai là công cụ lưu trữ ảnh, video, ghi âm. Chúng đáp ứng nhu cầu lưu tệp, nhưng một bộ sưu tập do gia đình tự tạo chưa đương nhiên có câu hỏi phỏng vấn, bản biên tập đã xác nhận hoặc cấu trúc bài học. Khoảng trống mà dự án hướng tới là giảm công tổ chức và chuyển lời kể thành nội dung dễ dùng; cần đánh giá trên thao tác thực tế thay vì khẳng định mọi công cụ hiện có đều thiếu tính năng.

Nhóm thứ ba là nền tảng quốc tế. Remento và Storyworth đã có hành trình ghi lại chuyện đời và tạo sách; StoryCorps phát triển nội dung và chương trình kể chuyện cộng đồng [5–7]. Remento công bố công nghệ Speech-to-Story xử lý tiếng Anh và tiếng Tây Ban Nha, chưa xử lý tự động tiếng Việt theo trang hỗ trợ đã kiểm tra [8]. Storyworth đã liệt kê tiếng Việt trong tính năng Story Calls; Family Calls hỗ trợ tiếng Anh và Tây Ban Nha, còn Magic Interviews hỗ trợ tiếng Anh theo nguồn đã kiểm tra [9]. Khả năng ghi lời kể tiếng Việt tự thân chưa đủ làm điểm mới. Lợi thế dự kiến của Di Sản Sống cần đặt ở trải nghiệm tiếng Việt được kiểm thử, bộ câu hỏi phù hợp và tổ chức tri thức theo nhu cầu trong nước.

Nhóm thứ tư là hoạt động số hóa và bảo tồn di sản. Việc nghề làm tranh dân gian Đông Hồ được ghi danh vào Danh sách di sản văn hóa phi vật thể cần bảo vệ khẩn cấp năm 2025 cho thấy nhu cầu tiếp tục truyền dạy và duy trì người thực hành [4]. Di Sản Sống hướng tới bổ sung một kênh ghi lại lời kể và kinh nghiệm cá nhân; số hóa không thể thay thế quá trình thực hành nghề, môi trường văn hóa và các chương trình bảo tồn chuyên môn.

#### Điểm nghẽn được lựa chọn

Gia đình thiếu một quy trình thuận tiện để hỏi và ghi lại; người kể có thể gặp khó khi tự viết hoặc quản lý tệp; người học thiếu cách tìm lại kinh nghiệm theo chủ đề và nguồn kể. Dự án tập trung giải quyết ba điểm nghẽn này bằng cùng một chuỗi xử lý, đồng thời giữ quyền kiểm duyệt và chia sẻ ở người kể.

### 1.2. Đối tượng tác động và nhu cầu thực tế

Ba nhóm cốt lõi tương ứng với ba vai trò: người tạo tri thức, người muốn lưu giữ và chi trả, người tiếp nhận tri thức. Người cao tuổi là người dùng trực tiếp; gia đình là khách hàng trả phí ưu tiên; người trẻ là người học và hưởng lợi từ nội dung được chia sẻ có phép.

| **Nhóm mục tiêu** | **Nỗi đau ưu tiên** | **Nhu cầu sản phẩm** |
| --- | --- | --- |
| Người cao tuổi từ 60 tuổi | Muốn chia sẻ nhưng thiếu cơ hội được ghi lại; tự viết hoặc thao tác số có thể khó. | Kể bằng giọng nói; câu hỏi dễ hiểu; nghe/xem lại; chủ động sửa và quyết định chia sẻ. |
| Con cháu 28–50 tuổi, ưu tiên gia đình đô thị | Muốn giữ tiếng nói và kỷ niệm nhưng thiếu thời gian hỏi, gỡ băng và biên tập. | Thiết lập kho gia đình; gợi ý câu hỏi; hỗ trợ người kể; tìm lại và tạo sách từ nội dung đã duyệt. |
| Học sinh, sinh viên và người trẻ quan tâm kinh nghiệm thực tiễn | Nội dung truyền miệng rời rạc, khó tìm theo kỹ năng hoặc bối cảnh sử dụng. | Kho tri thức có chủ đề, bài học, nguồn kể và giới hạn áp dụng; nghe lại trích đoạn được phép. |

Trường học, thư viện, bảo tàng, làng nghề và câu lạc bộ là đối tác tiếp cận hoặc khách hàng tổ chức ở bước tiếp theo. Họ có thể tổ chức buổi kể chuyện, sử dụng tư liệu được cấp quyền và kết nối người truyền đạt với người học. Vai trò tổ chức bổ sung cho ba nhóm người dùng, không làm thay đổi trọng tâm B2C ban đầu.

Các nỗi đau và sự sẵn sàng chi trả nêu trên hiện là giả thuyết sản phẩm. Số liệu dân số chứng minh bối cảnh, chưa chứng minh nhu cầu mua. Nhóm dự kiến phỏng vấn và thử nghiệm với ít nhất 20 người cao tuổi cùng 30 người dùng thuộc nhóm gia đình, người trẻ; ghi nhận mức khó khi thao tác, đầu ra được ưu tiên và điều kiện chấp nhận trả phí.

### 1.3. Tính cấp thiết của giải pháp

#### Hệ quả nếu tiếp tục chậm ghi lại và truyền đạt

Thứ nhất, ký ức cá nhân có tính thời điểm. Khi người nắm giữ không còn khả năng kể hoặc xác nhận, một số câu chuyện và chi tiết nghề nghiệp không có nguồn đối chiếu thay thế. Giá trị cần lưu giữ không chỉ nằm ở văn bản mà còn ở giọng nói, cách diễn đạt và bối cảnh của người kể.

Thứ hai, cách sống giữa các thế hệ đang thay đổi. Báo cáo của Tổng cục Thống kê và UNFPA ghi nhận tỷ lệ người cao tuổi sống một mình tăng từ 9,68% năm 2009 lên 13,74% năm 2019 [3, mục 2.4]. Đây là dữ kiện về sắp xếp cuộc sống, không đồng nghĩa mọi người sống một mình đều cô đơn. Nó củng cố lý do thiết kế thêm cơ hội đối thoại và cùng lưu giữ câu chuyện trong gia đình.

Thứ ba, tri thức nghề cần được ghi chép và tiếp tục thực hành. Chương trình bảo tồn và phát triển làng nghề Việt Nam đặt mục tiêu đến năm 2030 khôi phục, bảo tồn ít nhất 129 nghề truyền thống và 208 làng nghề truyền thống có nguy cơ mai một, thất truyền [11]. Tư liệu có nguồn gốc và được phân loại có thể hỗ trợ học tập, chuẩn bị truyền nghề và nghiên cứu; các thao tác nghề phức tạp vẫn cần người có chuyên môn hướng dẫn.

Thứ tư, nếu ít có kênh để người cao tuổi chia sẻ kinh nghiệm, gia đình và cộng đồng sẽ khó tận dụng đầy đủ sự hiểu biết của họ. Một hành trình dễ sử dụng có thể giúp người kể tiếp tục đóng góp và tạo thêm lý do để các thế hệ trò chuyện.

#### Lý do lựa chọn hướng giải quyết

Di Sản Sống dùng giọng nói để giảm yêu cầu gõ chữ, dùng AI để hỗ trợ gỡ băng và tổ chức nội dung, dùng bước kiểm duyệt để giữ đúng ý người kể. Cấu trúc chủ đề và bài học giúp phần kinh nghiệm được phép chia sẻ có thể được tìm lại và học hỏi. Cùng một đầu vào được xử lý thành hai dạng đầu ra phù hợp: câu chuyện gia đình và tư liệu kinh nghiệm; không bắt buộc mọi câu chuyện riêng phải công khai.

#### Ý nghĩa thực tiễn

Người cao tuổi có cách kể thuận tiện và quyền quyết định nội dung của mình. Gia đình có thể lưu giữ âm thanh gốc cùng bản đọc dễ tiếp cận. Người trẻ được tiếp cận tư liệu có nguồn kể, còn đơn vị giáo dục và văn hóa có thể sử dụng phần được cấp quyền. Những lợi ích về gắn kết, tiết kiệm thời gian và khả năng học hỏi sẽ được đo trong thử nghiệm ở phần IV.

### 1.4. Mục tiêu của dự án

Mục tiêu tổng quát là phát triển nền tảng AI giúp người cao tuổi chia sẻ bằng giọng nói tiếng Việt, chuyển lời kể thành nội dung có cấu trúc để gia đình lưu giữ và người trẻ tìm kiếm, học hỏi. Trong sáu tháng đầu, nhóm tập trung hoàn thiện MVP, thử nghiệm khả năng sử dụng, chất lượng nội dung và sự sẵn sàng chi trả trước khi mở rộng.

| **Tiêu chí SMART** | **Mục tiêu thống nhất** |
| --- | --- |
| S - Cụ thể | MVP có ghi âm tiếng Việt, bản chép lời, bản nháp câu chuyện/tư liệu kinh nghiệm, kiểm duyệt, phân loại chủ đề, kho riêng và tìm kiếm phần được phép. |
| M - Đo lường được | Ít nhất 50 đơn vị nội dung đã được người kể duyệt; ít nhất 20 người cao tuổi và 30 người dùng gia đình/người trẻ; phấn đấu ít nhất 80% người dùng đánh giá quy trình dễ thực hiện. |
| A - Khả thi | Tích hợp dịch vụ AI sẵn có, giới hạn chủ đề và thời lượng; có người thân hoặc biên tập viên hỗ trợ; triển khai theo thứ tự ưu tiên ở phụ lục B. |
| R - Phù hợp | Đo đồng thời khả năng kể, khả năng lưu giữ và khả năng tìm học; khảo sát chi trả để lựa chọn gói dịch vụ phù hợp. |
| T - Thời hạn | Hoàn thiện MVP trong 3 tháng đầu; hoàn tất thử nghiệm và đánh giá trong 6 tháng từ ngày khởi động dự án được nhóm thống nhất. |

Một đơn vị nội dung là một câu chuyện hoặc một nội dung kinh nghiệm độc lập có âm thanh nguồn, bản đã duyệt và thông tin chủ đề. Nếu một lời kể tạo cả câu chuyện và thẻ kiến thức thì chỉ tính một đơn vị trong mục tiêu 50. Không cộng bản nháp, tệp trùng hay nhiều định dạng của cùng nội dung. Cách tính chỉ tiêu 80% và thiết kế mẫu được quy định tại mục 4.2.

## II. GIẢI PHÁP VÀ NỘI DUNG KHOA HỌC CÔNG NGHỆ VÀ TÍNH KHẢ THI

### 2.1. Tổng quan giải pháp

Di Sản Sống là nền tảng web ưu tiên điện thoại, kết nối ba hoạt động: kể chuyện có hướng dẫn, lưu giữ có kiểm duyệt và học hỏi từ tri thức được chia sẻ có phép. Nguyên lý giải quyết là giảm công thao tác ở đầu vào, giữ khả năng đối chiếu khi biên tập và tổ chức đầu ra theo nhu cầu sử dụng.

Người kể chọn một chủ đề như tuổi thơ, gia đình, quê hương hoặc nghề nghiệp. Hệ thống đưa câu hỏi gợi mở, ghi lại câu trả lời và tạo bản chép lời. Từ cùng nguồn đó, AI hỗ trợ bản nháp câu chuyện hoặc bản nháp kinh nghiệm theo cấu trúc. Người kể xác nhận trước khi nội dung được lưu dưới trạng thái đã duyệt; chia sẻ gia đình và công bố cộng đồng là những lựa chọn riêng.

Ví dụ minh họa: một người kể về kinh nghiệm chăm cây có thể lưu câu chuyện về khu vườn trong kho gia đình; nếu đồng ý, họ chọn công bố riêng phần kỹ năng đã rà soát. Người trẻ tìm “chăm cây” sẽ thấy thẻ kinh nghiệm, nguồn kể và đoạn âm thanh được cho phép, không nhìn thấy toàn bộ chuyện riêng của gia đình.

### 2.2. Cấu trúc và các thành phần của hệ thống

| **Mô đun** | **Chức năng và liên kết** |
| --- | --- |
| Không gian người kể | Chủ đề, câu hỏi, ghi âm, nghe lại và xác nhận; giao diện ít lựa chọn. |
| Không gian gia đình | Mời thành viên, quản lý kho, giúp biên tập theo ủy quyền và tạo sách từ nội dung đã duyệt. |
| Xử lý giọng nói và nội dung | Lưu nguồn, ASR tạo chữ, AI tạo bản nháp, gắn chủ đề và trạng thái xử lý. |
| Quản lý tri thức | Câu chuyện và thẻ kinh nghiệm có cấu trúc, liên kết nguồn; tìm kiếm theo quyền truy cập. |
| Quản lý quyền và sự đồng ý | Phạm vi riêng tư, người xem được mời, bản công khai, quyền dùng âm thanh và nhật ký xác nhận. |
| Kho khám phá và kết nối | Nội dung được phép, lưu mục quan tâm, đề nghị trao đổi/học nghề qua nhóm điều phối. |
| Vận hành và hỗ trợ | Quản lý nội dung công khai, báo cáo, lỗi xử lý, yêu cầu xóa và truy cập hỗ trợ có giới hạn. |

Giao diện gửi dữ liệu tới máy chủ; máy chủ kiểm tra quyền, lưu tệp vào kho riêng và đưa tác vụ vào hàng đợi. Dịch vụ AI trả về bản nháp, không ghi thẳng vào kho công khai. Sau xác nhận, hệ thống mới đưa phiên bản được phép vào chỉ mục tìm kiếm và kênh chia sẻ tương ứng.

### 2.3. Nguyên lý hoạt động và quy trình xử lý

**Bước 1 - Thiết lập:** gia đình tạo không gian, người kể được giải thích việc ghi âm, xử lý và lưu dữ liệu.

**Bước 2 - Gợi mở:** chọn chủ đề, câu hỏi ngắn, có thể bỏ qua nội dung không muốn kể.

**Bước 3 - Ghi nhận:** thu âm, tạm dừng, nghe lại; giữ nguồn gốc và thời điểm ghi.

**Bước 4 - Chuyển hóa:** ASR tạo bản chép lời; AI đề xuất cấu trúc, tiêu đề và chủ đề. Dạng kinh nghiệm chỉ có các bước, điều kiện và lưu ý thực sự xuất hiện trong nguồn; trường thiếu dữ liệu được bỏ trống hoặc hỏi bổ sung.

**Bước 5 - Kiểm duyệt:** người kể đối chiếu, sửa và chấp nhận phiên bản; người thân chỉ hỗ trợ trong phạm vi được ủy quyền.

**Bước 6 - Lưu giữ và khai thác:** lưu câu chuyện vào kho riêng; chọn thành viên được xem hoặc đề nghị công bố bản kinh nghiệm riêng. Người học tìm chủ đề, đọc/nghe và gửi đề nghị trao đổi nếu có. Mọi thay đổi nội dung đã công bố phải qua xác nhận lại, tránh đưa bản AI mới lên tự động.

### 2.4. Công nghệ và phương pháp kỹ thuật được sử dụng

ASR nhận dạng giọng nói tiếng Việt thành văn bản; mô hình ngôn ngữ hỗ trợ gợi ý câu hỏi, biên tập và trích xuất nội dung theo biểu mẫu; TTS có thể đọc câu hỏi hoặc bản nháp khi người dùng yêu cầu. Cơ sở dữ liệu lưu người dùng, nội dung, phiên bản và quyền; kho tệp lưu âm thanh, ảnh. MVP dùng tìm kiếm từ khóa và bộ lọc chủ đề; tìm kiếm ngữ nghĩa chỉ bổ sung nếu kiểm chứng được nhu cầu và quyền truy cập.

Cơ sở kỹ thuật là sự kết hợp giữa xử lý giọng nói, tạo bản nháp có cấu trúc và kiểm duyệt của con người. Nhóm không tuyên bố tự huấn luyện mô hình nền tảng hay phát minh thuật toán mới. Chất lượng được kiểm tra bằng đối chiếu bản chép lời, rà soát chi tiết sai nguồn và đánh giá khả năng người học tìm đúng tư liệu. Mỗi bản kinh nghiệm phải truy ngược được tới lời kể nguồn.

### 2.5. Tính khả thi

#### 2.5.1. Khả thi về kỹ thuật và công nghệ

Việc tích hợp công cụ sẵn có cho phép nhóm tập trung vào quy trình và trải nghiệm. Mốc MVP ba tháng áp dụng phạm vi cốt lõi: ghi âm, ASR, bản nháp, duyệt, kho riêng và tìm kiếm theo chủ đề. Giai đoạn đầu chấp nhận hỗ trợ thủ công có ghi nhận, giới hạn thời lượng và chưa triển khai đồng thời cuộc gọi, video tự động hay sàn giao dịch.

Rủi ro kỹ thuật trọng yếu là giọng nhỏ, tạp âm, giọng vùng miền và sai nghĩa khi biên tập. Biện pháp gồm hướng dẫn thu âm, giữ bản gốc, đánh dấu đoạn cần kiểm tra, sửa tên riêng và duyệt từng phiên bản. Mức độ đáp ứng phải được đo trong thử nghiệm, không suy ra từ năng lực quảng bá của nhà cung cấp AI.

#### 2.5.2. Khả thi về tài chính và chi phí vận hành

Chi phí phục vụ gồm AI theo thời lượng, lưu trữ, biên tập, hỗ trợ và sản xuất sách theo đơn. Giá thử nghiệm kế thừa đề án: 149.000 đồng/tháng hoặc 1.490.000 đồng/năm cho gói gia đình; sách in dự kiến 2.500.000 đồng/cuốn. Dịch vụ tổ chức dự kiến 30–60 triệu đồng/chương trình; giấy phép nội dung tham khảo 15 triệu đồng/năm/trường. Nội dung được cấp phép phải có sự đồng ý tương ứng của người kể; không bán quyền với tư liệu riêng.

Các mức giá cần khảo sát, chưa phải giá bán chính thức. Phí in tách riêng làm tổng chi phí cao hơn gói thuê bao; thử nghiệm cần hỏi mức chấp nhận cho gói điện tử và gói có sách. Ngân sách website phải tách chi phí xây dựng demo, MVP, phí dịch vụ AI và bảo trì. Mỗi gói cần hạn mức sử dụng để tính được chi phí trên một nội dung hoàn thành.

Bảng tài chính cũ cho doanh thu ba năm là 807, 3.168 và 8.865 triệu đồng, chi phí 1.100, 2.600 và 6.200 triệu đồng. Đây chỉ là kịch bản giả định theo số lượng bán, không dùng làm kết quả hay cam kết doanh thu. Cần lập lại theo thời điểm có thuê bao, số tháng phục vụ và dòng tiền; 300 thuê bao cuối năm không đồng nghĩa có đủ 300 gói thu cả năm. Chưa xác nhận thời điểm hoàn vốn.

#### 2.5.3. Khả thi về pháp lý và bảo mật dữ liệu

Điều kiện triển khai là có cơ chế đồng ý dễ hiểu cho ghi âm, gửi xử lý AI, lưu giữ và công bố; rà soát quyền với ảnh, lời kể và người thứ ba xuất hiện trong nội dung. Nhóm cần được tư vấn quy định hiện hành trước khi thu dữ liệu thật hoặc cấp quyền khai thác thương mại. Tài liệu này quy định yêu cầu thiết kế, không thay thế ý kiến pháp lý.

Về kỹ thuật, kho tệp mặc định riêng, quyền kiểm tra tại máy chủ, truy cập hỗ trợ có giới hạn và có nhật ký. Nội dung đưa lên kho công khai là bản được duyệt riêng; âm thanh nguồn không tự công khai theo văn bản. Có chức năng thu hồi chia sẻ, xuất dữ liệu và yêu cầu xóa. Hệ thống phải giải thích rằng bản do người xem đã tải ra ngoài có thể không thu hồi được.

## III. TÍNH MỚI VÀ SÁNG TẠO

### 3.1. Điểm mới trong ý tưởng và cách tiếp cận

Dự án nhìn người cao tuổi như người tạo tri thức và có quyền quyết định cách tri thức được lưu giữ, sử dụng. Cách tiếp cận xuất phát từ câu chuyện riêng trong gia đình rồi mở cơ hội đóng góp phần kinh nghiệm được lựa chọn cho người học. Nhờ vậy, hoạt động lưu ký ức có thể tạo thêm giá trị sử dụng mà vẫn bảo vệ không gian riêng tư.

Điểm khác biệt hướng tới là hành trình tiếng Việt gắn ba nhu cầu kể, giữ và học, với nguồn kể và sự cho phép được giữ xuyên suốt. Tính mới này có phạm vi ứng dụng và tổ chức dịch vụ; chưa có cơ sở tuyên bố dự án đầu tiên hoặc duy nhất.

### 3.2. Điểm mới trong công nghệ, thiết kế và mô hình hoạt động

Về thiết kế, tách màn hình người kể đơn giản khỏi màn hình quản lý của gia đình và giao diện tìm học. Về dữ liệu, bản chép lời, câu chuyện và thẻ kinh nghiệm là các đối tượng liên quan nhưng có trạng thái duyệt và quyền riêng. Về vận hành, người kể chọn nội dung được công bố và nhóm điều phối các đề nghị truyền đạt trước khi xây thị trường kết nối hoàn chỉnh.

Giá trị cải tiến cần kiểm chứng gồm giảm công biên tập, giữ đúng lời kể và tăng khả năng tìm đúng kinh nghiệm. Việc dùng AI không tự chứng minh ba giá trị này; các chỉ số đo tại mục 4.2 sẽ quyết định nội dung nào tiếp tục đầu tư.

### 3.3. So sánh với các giải pháp hiện có

| **Giải pháp** | **Năng lực tham chiếu đã xác nhận** | **Hướng phát triển của Di Sản Sống** |
| --- | --- | --- |
| Remento [5,8] | Lời kể thành sách, QR tới âm thanh; xử lý tự động hiện công bố tiếng Anh/Tây Ban Nha. | Kiểm thử tiếng Việt; cấu trúc kinh nghiệm và nguồn kể được duyệt. |
| Storyworth [6,9] | Câu hỏi, ghi lời kể và sách; Story Calls có tiếng Việt, Magic Interviews hiện công bố tiếng Anh. | Bộ câu hỏi theo bối cảnh Việt, cách duyệt dễ dùng và hành trình tìm học; cần đo lợi ích thực tế. |
| Storii [12] | Thu lời kể qua cuộc gọi và xuất âm thanh hoặc bản chép lời. | Khởi đầu từ web; giảm thao tác và lưu nội dung có phân loại. Gọi điện là hướng mở rộng. |
| StoryCorps [7] | Nội dung nghe và chương trình ghi lại câu chuyện cộng đồng. | Nối kho gia đình với phần tri thức được cấp phép; kiểm chứng khả năng tìm học. |
| Dịch vụ hồi ký trong nước [10] | Dịch vụ hồi ký và gói có AI kết hợp người biên tập; chưa khảo sát đồng nhất giá/chất lượng. | Đánh giá mô hình AI kết hợp biên tập hỗ trợ, không mặc định ưu thế giá. |

Bảng so sánh dựa trên thông tin công khai tại thời điểm kiểm tra, không phải thử nghiệm trực tiếp toàn bộ dịch vụ. Tính năng không được nguồn nêu rõ chưa thể coi là không tồn tại. Chưa có dữ liệu để khẳng định Di Sản Sống chính xác hơn, rẻ hơn hoặc dễ dùng hơn các giải pháp này.

### 3.4. Giá trị khác biệt và lợi thế cạnh tranh cốt lõi

Giá trị đề xuất là lời kể tiếng Việt có thể được giữ nguyên nguồn, chuyển thành bản đọc đã xác nhận và, khi người kể cho phép, thành tư liệu tìm học. Lợi thế có thể tích lũy từ bộ câu hỏi được kiểm thử, quy trình biên tập trung thành, dữ liệu có quyền sử dụng rõ và mạng lưới hỗ trợ gia đình, câu lạc bộ, đơn vị giáo dục. Đó là những năng lực nhóm cần xây dựng và đo lường, chưa phải tài sản đã hoàn thiện.

## IV. KẾT QUẢ, SẢN PHẨM HIỆN CÓ VÀ MỨC ĐỘ HOÀN THIỆN KIỂM CHỨNG

### 4.1. Sản phẩm và kết quả đã đạt được

Nhóm đã có bản mô tả ý tưởng, phân tích ba nhóm đối tượng, mục tiêu sáu tháng, quy trình xử lý và yêu cầu website. Nhóm đang phối hợp tìm nguồn lực xây dựng web. Hồ sơ được cung cấp chưa có link sản phẩm được kiểm tra, mã nguồn bàn giao, dữ liệu khảo sát hay biên bản thử nghiệm; vì vậy chưa ghi nhận chức năng hoạt động ổn định hoặc người dùng thực tế.

Sản phẩm cần tạo tiếp theo là demo tương tác để làm rõ giá trị, sau đó là MVP có xử lý và lưu trữ thật. Demo không dùng làm bằng chứng đạt 50 nội dung hay kết quả thử nghiệm với người cao tuổi. Phần IV sẽ được cập nhật sau mỗi vòng thử, kèm phiên bản và minh chứng tương ứng.

### 4.2. Kết quả thử nghiệm và kiểm chứng

Chưa có kết quả đo để báo cáo. Kế hoạch kiểm chứng thống nhất với mục 1.4: tối thiểu 20 người cao tuổi và 30 người dùng còn lại; đề xuất tuyển 15 người thân và 15 người trẻ. Đây là 50 cá nhân phân biệt; người thân hỗ trợ không được tính thêm thành một người dùng đã hoàn thành nếu chưa làm nhiệm vụ đánh giá riêng. Cỡ mẫu nhỏ phục vụ cải tiến sản phẩm, không đại diện cho toàn thị trường.

Người cao tuổi thực hiện chọn chủ đề, ghi âm và kiểm tra bản nháp; gia đình thực hiện tìm, quản lý và xem đầu ra; người trẻ thực hiện tìm theo một nhu cầu học cụ thể, đọc/nghe nguồn và phản hồi mức hữu ích. Thử nghiệm nội dung 5–10 phút trước, ghi rõ người nào tự thao tác và người nào cần trợ giúp. Dữ liệu thật chỉ được thu sau khi giải thích và có sự đồng ý.

| **Chỉ tiêu** | **Định nghĩa và cách đo** |
| --- | --- |
| Ít nhất 50 nội dung được duyệt | Mỗi nội dung có mã duy nhất, âm thanh nguồn, loại, chủ đề và xác nhận; một nguồn tạo nhiều định dạng chỉ đếm một lần. |
| Ít nhất 80% đánh giá dễ dùng | Câu hỏi sau nhiệm vụ theo thang 1–5; mức 4 hoặc 5 tính dễ. Tỷ lệ = số đánh giá 4–5 / số trả lời hợp lệ. Báo riêng từng nhóm, tổng hợp, số bỏ cuộc và mức trợ giúp; phấn đấu 80% ở từng nhóm. |
| Khả năng hoàn thành nhiệm vụ | Số hoàn thành / số bắt đầu; ghi thời gian và số lần cần giúp. Không thay thế bằng mức hài lòng. |
| Chất lượng bản chép lời | Đối chiếu mẫu với bản chép tay; thống kê lỗi từ và lỗi trọng yếu về tên, địa điểm, thời gian; tách giọng/vùng và điều kiện thu. |
| Độ trung thành nội dung | Rà soát chi tiết AI tự thêm, bỏ hoặc đổi nghĩa. Ngưỡng nghiệm thu đề xuất: không còn chi tiết sai lệch trọng yếu trong bản được công bố. |
| Khả năng tìm và học | Nhiệm vụ tìm đúng nội dung theo chủ đề; đo thành công, thời gian và mức hiểu bài học. Tư liệu kinh nghiệm phải có nguồn và giới hạn áp dụng. |
| Mức sẵn sàng chi trả | Phỏng vấn người quyết định trả tiền; ghi gói ưu tiên, giá chấp nhận, ý định so với thanh toán thật. Không báo ý định là doanh thu. |
| Quyền truy cập | Kiểm tra người khác gia đình, bản chưa duyệt, chia sẻ âm thanh, thu hồi và tìm kiếm; lưu ca thử cùng kết quả. |

Thực hiện trong tháng 4–6 sau khi MVP hoàn thiện: chạy thử nhỏ để sửa lỗi, tuyển đủ mẫu, thu nội dung và đo, sau đó tổng hợp. Phiếu kết quả ghi người tham gia bằng mã, phiên bản web, thiết bị, tác vụ, kết quả và sự đồng ý; hồ sơ chia sẻ cho bên ngoài không để lộ dữ liệu cá nhân không cần thiết.

### 4.3. Đánh giá mức độ hoàn thiện của sản phẩm

Phân loại theo từng chức năng: đã mô tả, có demo, hoạt động trong MVP, đã kiểm thử nội bộ, đã thử với người dùng. Chỉ ghi đạt khi có bằng chứng. Điều kiện để chuyển từ thử nội bộ sang thử người thật là luồng ghi và duyệt không mất dữ liệu, kiểm tra quyền truy cập đạt, người dùng hiểu quyền chia sẻ và các lỗi quan trọng có phương án xử lý.

Hạn chế cần theo dõi gồm giọng khó nhận dạng, công sửa bản nháp, khả năng người cao tuổi duyệt, mức hữu ích của thẻ kinh nghiệm và chi phí phục vụ. Chỉ mở rộng kho công khai khi quy trình duyệt, quyền và xử lý yêu cầu thu hồi đã được kiểm tra.

## V. KHẢ NĂNG ỨNG DỤNG VÀ TÁC ĐỘNG DỰ KIẾN

### 5.1. Khả năng ứng dụng và phạm vi triển khai

Triển khai đầu tiên với gia đình tại Hà Nội và câu lạc bộ có người hỗ trợ. Bối cảnh sử dụng gồm buổi kể tại nhà, hoạt động gia đình cùng sưu tập ký ức, buổi ghi lời kể tại câu lạc bộ và bài học trải nghiệm từ tư liệu được đồng ý sử dụng. Người kể dùng điện thoại hoặc máy tính bảng có micro; người thân quản lý nội dung và hỗ trợ bước đầu.

Sau kiểm chứng, trường học, thư viện, bảo tàng và làng nghề có thể tiếp nhận bộ tư liệu hoặc cùng tổ chức chương trình. Mở rộng địa bàn phụ thuộc chất lượng nhận dạng, khả năng hỗ trợ và mạng lưới đối tác; không chỉ phụ thuộc lượng truy cập web. Các nghề có thao tác phức tạp vẫn cần hoạt động thực hành trực tiếp.

### 5.2. Tiềm năng phát triển và thương mại hóa

Khách hàng trả phí đầu tiên là gia đình muốn lưu giữ ký ức. Đề xuất thử hai cách mua: gói số hóa có hạn mức và gói nội dung kèm sách; khảo sát trước khi quyết định thuê bao dài hạn. Kênh tiếp cận là website, giới thiệu từ gia đình, Zalo OA và hoạt động tại câu lạc bộ. Dịch vụ cho tổ chức phát triển sau khi có nội dung đủ chất lượng, quyền và quy trình triển khai rõ.

Người học cần có khả năng khám phá một phần nội dung công khai để kiểm chứng giá trị học hỏi; không mặc định phải trả phí ngay. Trước khi thu phí quyền dùng tư liệu hoặc hoạt động truyền nghề, nhóm phải làm rõ phạm vi quyền, quyền lợi của người kể và sự đồng ý cho khai thác thương mại.

Ước tính thị trường phải tách số người cao tuổi, số hộ có nhu cầu và số khách sẵn sàng chi trả. Công thức kế hoạch B2C là số hộ đủ điều kiện tiếp cận × tỷ lệ có nhu cầu × tỷ lệ chuyển đổi × doanh thu bình quân mỗi hộ. Các tỷ lệ chưa có khảo sát không dùng để khẳng định quy mô thị trường. Các mốc 300, 1.200, 3.500 thuê bao trong đề án cũ được giữ như kịch bản dài hạn có điều kiện, không là KPI sáu tháng.

### 5.3. Tác động đa chiều của sản phẩm

**Kinh tế:** kỳ vọng giảm thời gian gỡ băng, sắp xếp và biên tập sơ bộ; đo công lao động và chi phí trên nội dung so với cách làm thủ công trong cùng điều kiện. Giá trị kinh tế cũng có thể đến từ dịch vụ biên tập, sách và chương trình được cấp quyền; cần theo dõi chi phí phục vụ thực tế.

**Xã hội và giáo dục:** tạo thêm hoạt động đối thoại giữa người cao tuổi với con cháu, giúp người trẻ tiếp cận kinh nghiệm có nguồn. Đo số buổi cùng kể, mức hài lòng và số nhiệm vụ tìm học thành công. Khảo sát cảm nhận gắn kết trước và sau có thể bổ sung, nhưng không suy ra tác dụng điều trị hoặc quan hệ nhân quả từ mẫu nhỏ.

**Văn hóa:** lưu giữ lời kể và hiểu biết nghề nghiệp, địa phương; theo dõi giờ âm thanh đã xác nhận, số nội dung có nguồn rõ và số lượt sử dụng có phép. Môi trường: ưu tiên bản điện tử và in theo nhu cầu; chưa có căn cứ định lượng giảm phát thải. Không gắn tác động giảm ùn tắc hoặc logistics xanh vì không thuộc cơ chế hoạt động của dự án.

## VI. HƯỚNG PHÁT TRIỂN VÀ KẾ HOẠCH BƯỚC TIẾP THEO

### 6.1. Những nội dung cần tiếp tục hoàn thiện

Hoàn thiện bộ câu hỏi theo chủ đề; biểu mẫu câu chuyện và kinh nghiệm; quy trình duyệt nội dung và sự đồng ý. Cải thiện khả năng nhận dạng, sửa tên riêng và giữ đúng ý; thử giao diện người kể, quản lý gia đình và tìm học. Kết quả ở mục 4.2 là đầu vào quyết định ưu tiên sửa, thay vì tăng tính năng trước khi giải quyết lỗi cốt lõi.

### 6.2. Lộ trình phát triển sản phẩm

| **Giai đoạn** | **Kết quả và điều kiện hoàn thành** |
| --- | --- |
| Demo dự thi tháng 10/2026 | Theo nhu cầu hiện tại, đề nghị bản trình diễn ngày 23/10 để quay video ngày 24/10; thời hạn phải được bên làm web xác nhận. Không thay thế MVP ba tháng. |
| Tháng 1 từ khởi động | Chốt yêu cầu, mẫu giao diện, dữ liệu demo, mô hình quyền và kiến trúc; thử cách dùng với nhóm nhỏ để sửa sớm. |
| Tháng 2–3 | Hoàn thiện MVP cốt lõi và kiểm thử nội bộ; chức năng thật gồm ghi, lưu, AI, duyệt, phân quyền, phân loại và tìm kiếm. |
| Tháng 4–6 | Thử với ≥20 người cao tuổi và ≥30 người dùng khác; đạt ≥50 nội dung đã duyệt; đánh giá mục tiêu dễ dùng, chất lượng và chi trả. |
| Sau tháng 6 | Chọn phân khúc/gói trả phí dựa trên dữ liệu; thí điểm tổ chức khi có quyền sử dụng và quy trình triển khai. |
| Năm 2–3 | Mở rộng có điều kiện theo tỷ lệ duy trì, chi phí phục vụ và chất lượng; sách in, chương trình truyền nghề và địa bàn mới là các hướng tiếp theo. |

### 6.3. Nguồn lực và nhu cầu hỗ trợ

Nguồn lực cần có là đầu mối sản phẩm, đơn vị phát triển, người tích hợp AI, biên tập viên và người hỗ trợ thử nghiệm. Giảng viên/cố vấn hỗ trợ phương pháp đánh giá; câu lạc bộ và gia đình hỗ trợ tuyển người kể; chuyên gia rà soát quyền dữ liệu và nội dung. Nhóm cần điện thoại/máy tính bảng, nơi thu yên tĩnh và tài khoản dịch vụ do nhóm kiểm soát.

Đề án cũ dự kiến nhu cầu vốn 600 triệu đồng từ vốn nhóm/người thân, quỹ/giải thưởng và nhà đầu tư. Chưa có xác nhận nguồn đã huy động; cần lập ngân sách theo giai đoạn và báo giá thực tế. Không đặt việc gọi vốn thành điều kiện bắt buộc của demo quy mô nhỏ; cần xác định mức tiền tối thiểu đủ xây và thử MVP trước.

## VII. MỨC ĐỘ LÀM CHỦ SẢN PHẨM

### 7.1. Mức độ tự chủ về công nghệ và sở hữu trí tuệ

Nhóm định hướng làm chủ yêu cầu, bộ câu hỏi, tiêu chí chất lượng, quy trình phê duyệt và vận hành. Phần mềm có thể thuê phát triển; ASR/LLM và hạ tầng có thể dùng dịch vụ bên thứ ba. Chưa có bằng chứng nhóm tự huấn luyện AI nền tảng hoặc đã đăng ký bảo hộ. Cần công bố đúng phạm vi nhóm tự làm và bên ngoài hỗ trợ.

Hợp đồng web cần xác định quyền với mã nguồn, thiết kế, cơ sở dữ liệu và tài liệu; tên miền, kho mã, hosting và tài khoản AI thuộc quyền quản lý của nhóm. Quyền với phần mềm khác với quyền đối với lời kể và ảnh của người dùng. Trước bảo hộ nhãn hiệu hoặc khai thác nội dung, cần tư vấn phạm vi phù hợp và ghi nhận sự đồng ý cụ thể của người có quyền.

### 7.2. Phân công vai trò và đóng góp của từng thành viên trong nhóm

| **Thành viên** | **Phạm vi theo bảng phân công** | **Kết quả cần xác nhận** |
| --- | --- | --- |
| Nguyễn Văn Dũng | III; phối hợp VII; tổng hợp Word và đầu mối demo. | Yêu cầu sản phẩm, bản tích hợp và biên bản kiểm tra demo. |
| Nga | I; phối hợp VI và video. | Nội dung có nguồn, kịch bản và dữ liệu minh họa được phép. |
| Đức | II; phối hợp VI. | Luồng hệ thống và phối hợp rà soát kỹ thuật. |
| Minh Thúy | 2.5 và IV. | Khả thi, phương pháp thử và kết quả kiểm chứng khi có. |
| Đoàn Linh | V; phối hợp VII; VIII và video. | Ứng dụng, phạm vi quyền/đóng góp và minh chứng nếu có. |

Cơ chế phối hợp đề xuất: Dũng quản lý một bản yêu cầu và danh sách việc; người phụ trách xác nhận phần mình trước tổng hợp. Mọi thay đổi chức năng được ghi ảnh hưởng đến thời gian, chi phí và tiêu chí nghiệm thu. Phần IX–X cần chỉ định đầu mối tổng hợp và từng thành viên kê khai công cụ, nguồn và đóng góp thực tế.

### 7.3. Vai trò hỗ trợ từ người hướng dẫn cố vấn và đơn vị bên ngoài

Người hướng dẫn dự kiến góp ý mô hình và phương pháp; đơn vị web xây phần giao diện/hệ thống theo phạm vi ký kết; dịch vụ AI xử lý nội dung; đối tác cộng đồng hỗ trợ tiếp cận. [Bổ sung tên và xác nhận từng bên.] Nhóm chịu trách nhiệm nội dung nộp và định hướng sản phẩm, không ghi lập trình thuê ngoài thành năng lực kỹ thuật tự thực hiện.

## VIII. KẾT QUẢ ĐÃ ĐẠT GIẢI TRƯỚC ĐÂY NẾU CÓ

Chưa có thông tin giải thưởng của chính Di Sản Sống trong hồ sơ được cung cấp. Trước khi nộp, nhóm xác nhận “Chưa có” hoặc bổ sung tên cuộc thi, thời gian, giải và minh chứng. Thành tích cá nhân hoặc dự án khác chỉ ghi ở hồ sơ thành viên nếu thể lệ cho phép.

## IX. KÊ KHAI VIỆC SỬ DỤNG CÔNG CỤ TRÍ TUỆ NHÂN TẠO

ChatGPT được sử dụng để chuẩn hóa đề án, kiểm tra nguồn công khai, liên kết mục tiêu với giải pháp và soạn yêu cầu website. Nhóm kiểm tra, hiệu chỉnh và chịu trách nhiệm bản nộp. [Bổ sung công cụ mà từng thành viên và bên phát triển sử dụng, phiên bản nếu biết, mục đích và phần đầu ra giữ lại.]

AI trong sản phẩm dự kiến hỗ trợ ASR, câu hỏi và bản nháp; chưa có minh chứng tích hợp thành công. Bản kê sản phẩm cần ghi nhà cung cấp thật, dữ liệu gửi xử lý và cơ chế con người rà soát. Không ghi dữ liệu mẫu mô phỏng là kết quả AI trực tiếp; không gửi lời kể thật tới dịch vụ ngoài phạm vi đồng ý.

## X. DANH MỤC TÀI LIỆU MINH CHỨNG KÈM THEO NẾU CÓ

| **Mã** | **Tài liệu minh chứng** | **Trạng thái** |
| --- | --- | --- |
| MC01 | Bản mô tả cũ và bản Markdown cập nhật phần I | Đã được cung cấp |
| MC02 | Nguồn chính thức và nguồn sản phẩm ở phụ lục C | Đã đối chiếu theo phạm vi nêu |
| MC03 | URL demo, phiên bản, chức năng thật/mô phỏng | Cần bổ sung sau bàn giao |
| MC04 | Ảnh và video có nhãn dữ liệu mẫu | Cần thực hiện |
| MC05 | Phiếu đồng ý, nhiệm vụ thử, phản hồi và dữ liệu đo | Chưa có kết quả |
| MC06 | Mã nguồn, thiết kế, danh mục dịch vụ và bàn giao | Cần bên phát triển cung cấp |
| MC07 | Đối tác, giải thưởng, bảo hộ và quyền nội dung | Chỉ kê khi có minh chứng |

## PHỤ LỤC A. CÁC ĐIỂM CHUẨN HÓA VÀ LIÊN KẾT NỘI DUNG

### A1. Những nội dung thay đổi so với bản trước

Đã thay phần I bằng nội dung được biên tập từ bản bổ sung và đối chiếu nguồn. Mục tiêu thống nhất là MVP ba tháng, thử nghiệm sáu tháng, ít nhất 20 người cao tuổi và 30 người dùng khác, tối thiểu 50 nội dung đã duyệt và phấn đấu 80% đánh giá dễ dùng. Mục tiêu ba buổi kể và ngưỡng 70% trong bản trước không tiếp tục dùng làm KPI chính.

Đã sửa đơn vị tỷ suất chết thô: nguồn năm 2025 ghi 6,1‰, không phải 6,1% [2]. Bỏ phép quy đổi ra số tử vong trong lập luận cấp thiết vì không phản ánh riêng người cao tuổi hoặc lượng tri thức thất truyền. Số liệu sống một mình được dùng đúng như thông tin về hình thức sống, không thay cho chỉ báo cô đơn.

Đã sửa nhận định về đối thủ: Remento hiện công bố tự động xử lý tiếng Anh/Tây Ban Nha; Storyworth đã liệt kê tiếng Việt cho Story Calls [8–9]. Dịch vụ hồi ký trong nước cũng có gói kết hợp AI và biên tập [10]. Vì vậy, “có AI” hoặc “có ghi âm tiếng Việt” chưa đủ làm lợi thế; cần kiểm chứng giá trị của hành trình kể–giữ–học. Không kết luận hệ thống mới độc quyền, đầu tiên hay rẻ hơn. Thay đoạn bảo tồn ca trù chưa đối chiếu được bằng nguồn làng nghề và Đông Hồ đã kiểm tra.

Phần website được mở rộng thành ba không gian gắn ba nhóm mục tiêu, có hai dạng nội dung và quy trình quyền riêng. Kho tri thức, phân loại, tìm kiếm và truy nguồn là phần cốt lõi của MVP; sách, video và hoạt động truyền nghề được triển khai theo ưu tiên, không lấn át mục tiêu lưu giữ và học hỏi.

### A2. Ma trận logic từ vấn đề đến kiểm chứng

| **Vấn đề** | **Giải pháp và màn hình** | **Minh chứng cần đo** |
| --- | --- | --- |
| Người cao tuổi khó tự ghi chép | Câu hỏi gợi mở và ghi âm, duyệt bằng màn hình lớn; B7. | Hoàn thành nhiệm vụ, trợ giúp, đánh giá dễ dùng. |
| Gia đình thiếu thời gian tổ chức | Bản nháp, kho gia đình và tìm lại; B8–B9. | Thời gian biên tập, lỗi sửa, nhiệm vụ tìm lại. |
| Người trẻ khó tìm kinh nghiệm | Thẻ kinh nghiệm có nguồn và kho khám phá; B10. | Tìm đúng nội dung, hiểu bài học, phản hồi hữu ích. |
| Lo ngại sai ý và quyền riêng | Nguồn gốc, duyệt phiên bản và chia sẻ từng bản; B11–B12. | Sai lệch trọng yếu, kiểm tra truy cập và thu hồi. |
| Chưa rõ khả năng thương mại | Thử gói và chi phí phục vụ; B17. | Chi trả, tỷ lệ sử dụng, chi phí/nội dung hoàn thành. |

## PHỤ LỤC B. YÊU CẦU THIẾT KẾ VÀ PHÁT TRIỂN WEBSITE

### B1. Đề bài và mục tiêu website

Nhóm đề nghị xây website Di Sản Sống có trang giới thiệu và không gian trải nghiệm sản phẩm. Người xem phải hiểu sản phẩm giúp ông bà kể bằng tiếng Việt, gia đình lưu giữ và người trẻ học từ phần được đồng ý chia sẻ. Bản demo cần chứng minh trọn hành trình, có một ví dụ ký ức và một ví dụ kinh nghiệm; không chỉ trình bày trang giới thiệu với nút bấm không có kết quả.

**Hành trình ưu tiên:** chọn chủ đề → ghi hoặc nghe lời kể mẫu → bản chép lời → bản nháp → người kể duyệt → lưu riêng → chọn phần được phép → tìm và đọc/nghe trong kho tri thức. Mỗi bước phải nhìn thấy quan hệ với bước trước và biết hành động tiếp theo. Phần triển khai thật và mô phỏng được nêu trong B4.

**Đầu ra đề nghị bên phát triển:** bản thiết kế thích ứng, demo có thể quay, danh mục tính năng theo trạng thái; sau khi chốt giai đoạn hai là MVP có xử lý và lưu trữ thật. Đề nghị phản hồi báo giá theo hạng mục, thời hạn và phụ thuộc; mọi đề xuất thêm phải giải thích giúp nhóm người dùng nào và đo bằng gì.

### B2. Website tham khảo và hướng vận dụng

Nguồn được kiểm tra qua nội dung công khai ngày 21/10/2026. Các mô tả dưới đây tập trung hành trình và tính năng được nguồn công bố. Màu sắc, chuyển động và bố cục đề xuất cho Di Sản Sống là chỉ dẫn thiết kế riêng, chưa phải kết luận thử nghiệm giao diện các website tham khảo.

| **Tham khảo** | **Phần cần học hỏi** | **Áp dụng cụ thể** |
| --- | --- | --- |
| Remento [5]<br>remento.co | Lời kể thành sách, giữ khả năng nghe giọng nguồn. | Trang chủ có một chuyện mẫu; chi tiết kết hợp bản đọc và trình phát; sách là đầu ra nhìn thấy được. |
| Storyworth [6]<br>welcome.storyworth.com | Câu hỏi gợi mở, lựa chọn hình thức kể và quà tặng. | Thư viện câu hỏi theo tuổi thơ, gia đình, quê hương, nghề; gia đình chọn câu hỏi cho người kể. |
| Storii [12]<br>storii.com | Giảm yêu cầu tự viết; hỗ trợ thu lời kể qua cuộc gọi. | Rút ngắn màn hình bắt đầu; hướng dẫn dễ hiểu. Không quảng bá cuộc gọi hoặc dùng không mạng khi chưa triển khai. |
| StoryCorps [7]<br>storycorps.org | Thư viện câu chuyện nghe và chương trình cộng đồng. | Thẻ có chủ đề, người kể, thời lượng; ưu tiên cách tìm và nghe nội dung đã có quyền công bố. |

Chọn Remento làm tham khảo chính cho cách giải thích đầu ra, Storyworth cho câu hỏi, Storii cho sự đơn giản và StoryCorps cho khám phá. Không sao chép logo, ảnh, câu chuyện, chứng thực hoặc mã nguồn. Ảnh tham khảo cần chuyển thành hướng chụp hoặc bố cục riêng; nội dung demo dùng tài sản được phép.

### B3. Phong cách hình ảnh và hệ thống giao diện

**Hướng thiết kế:** album ký ức Việt Nam đương đại, ấm và đáng tin, giữ nội dung là trung tâm. Nền kem #FAF7F0, xanh trầm #214E43 cho nút chính, đất nung #A84832 cho điểm nhấn và chữ #1F2933. Dùng bề mặt trắng, khoảng trống rõ và ảnh đời thường. Kiểm tra tương phản của từng cặp màu thực tế; không coi mã màu là bảo đảm sẵn có.

Chữ nội dung Be Vietnam Pro hoặc Noto Sans có đủ tiếng Việt; tiêu đề có thể dùng Noto Serif. Nội dung mặc định 18 px, chế độ người kể 20–22 px, dòng 1,5–1,7; nút cao ít nhất 48 px và có khoảng cách tránh chạm nhầm. Cỡ chữ có lựa chọn tăng/giảm và lưu tùy chọn. Biểu tượng luôn đi kèm nhãn ở tác vụ chính.

Trang công khai dùng ảnh ông bà–con cháu hoặc hoạt động nghề có quyền sử dụng, ưu tiên gương mặt và bàn tay người kể. Không lấy hình robot hoặc mạng nơ ron làm trung tâm thương hiệu. Họa tiết giấy, album, dấu thời gian chỉ dùng nhẹ ở trang giới thiệu; vùng ghi âm và đọc duyệt nền sạch, không nhiễu. Không dùng ảnh hư cấu làm minh chứng người thật đã thử sản phẩm.

| **Thành phần dùng chung** | **Quy cách** |
| --- | --- |
| Thanh điều hướng | Trang giới thiệu có menu gọn; chế độ kể chỉ có Quay lại, chủ đề và Trợ giúp. Không đặt bảng giá hoặc quảng cáo trong lúc ghi. |
| Nút và trạng thái | Một nút chính nổi bật mỗi bước; nút phụ ít tương phản hơn nhưng đủ đọc; trạng thái đang bận ngăn gửi trùng. |
| Thẻ nội dung | Ảnh hoặc biểu tượng chủ đề, tiêu đề, người kể, nhãn nội dung, thời lượng, quyền; không dựa màu để phân biệt. |
| Trình phát | Phát/dừng, thanh tiến độ, thời gian và bản chép lời; thao tác được bằng bàn phím. |
| Thông báo | Lưu thành công, lỗi, nháp và công khai ghi bằng chữ; lỗi quan trọng giữ đến khi người dùng xử lý. |
| Khả năng tiếp cận | Nhãn biểu mẫu, focus rõ, thứ tự Tab, phụ đề/bản chép lời, phóng chữ 200% không mất chức năng, giảm chuyển động theo thiết bị. |

Thiết kế trước ở 390 px, kiểm tra tối thiểu 360, 768 và 1440 px. Trên máy tính, trang quản lý có thể dùng thanh bên và hai cột; trên điện thoại chuyển thành một cột và nút tác vụ trong tầm tay. Không khóa người dùng vào một kiểu thiết bị. Các tiêu chí trên là yêu cầu dự án để kiểm thử, chưa phải chứng nhận tuân thủ tiêu chuẩn.

### B4. Phạm vi ưu tiên và khác biệt giữa demo với MVP

P0 là bắt buộc trong gói đã chốt; P1 là bổ sung sau khi P0 đạt; P2 là hướng phát triển chưa tính trong báo giá cơ sở. Chức năng P0 có thể được mô phỏng trong demo khi ghi rõ, nhưng MVP phải xử lý thật. Việc mô phỏng không cho phép thu hoặc chia sẻ dữ liệu riêng của người dùng thật.

| **Nhóm tính năng** | **Demo dự thi P0** | **MVP P0** |
| --- | --- | --- |
| Bắt đầu và câu hỏi | Chọn chủ đề, người kể mẫu, câu hỏi tiếng Việt; có nhánh ký ức và kinh nghiệm. | Người kể thật, bộ câu hỏi quản lý được; lưu tiến trình. |
| Ghi âm | Ghi/nghe lại trên thiết bị nếu hỗ trợ; luôn có tệp mẫu dự phòng. | Tải và lưu an toàn; xử lý lỗi, định dạng, thời lượng và quyền. |
| ASR và bản nháp | Có dữ liệu trước/sau mẫu, nhãn Mô phỏng kết quả AI. | Gọi AI thật từ máy chủ; trạng thái, thử lại, chi phí và liên kết nguồn. |
| Duyệt và lưu | Sửa nội dung, đổi trạng thái trong phiên demo. | Lưu phiên bản, duyệt thực, sửa lại phải duyệt lại. |
| Kho gia đình | Danh sách, bộ lọc, tìm kiếm và chi tiết mẫu dùng được. | Đăng nhập, dữ liệu riêng và quyền kiểm tra ở máy chủ. |
| Tri thức và tìm học | Thẻ kinh nghiệm có cấu trúc, lọc/tìm dữ liệu mẫu, nguồn nghe được. | Chỉ mục theo quyền; chỉ bản được phép mới xuất hiện. |
| Chia sẻ | Hộp thoại minh họa phạm vi, không khẳng định có bảo mật máy chủ. | Mời thành viên, quyền văn bản/âm thanh riêng, thu hồi và nhật ký. |
| Sách và liên hệ | Xem chương và tải PDF mẫu; biểu mẫu minh họa báo đúng trạng thái. | Bản đọc nội dung đã duyệt; tiếp nhận liên hệ qua kênh thực nếu có. |

P1: xuất sách PDF từ nội dung thật, câu hỏi cá nhân hóa, tìm kiếm ngữ nghĩa, đánh dấu đoạn âm thanh chính xác theo mốc, đặt lịch trao đổi qua điều phối và quản lý phản hồi sâu hơn. P2: sách in tích hợp đặt hàng, thanh toán, gọi điện tự động, video, ứng dụng di động riêng. Không nhân bản giọng nói hoặc tạo người thân ảo trong phạm vi này.

Nếu tiến độ demo ngắn, hoàn thành một luồng chuẩn và các trạng thái lỗi trước khi làm hiệu ứng. Kho khám phá mẫu và thẻ kinh nghiệm vẫn thuộc demo P0 để thể hiện nhóm người trẻ; không để sản phẩm chỉ giống dịch vụ viết hồi ký. Bảng giá chỉ hiển thị giá dự kiến hoặc Đăng ký quan tâm, chưa thu tiền.

### B5. Sơ đồ trang và điều hướng

| **Khu vực và đường dẫn đề xuất** | **Trang và liên kết** |
| --- | --- |
| Công khai | / trang chủ; /cach-hoat-dong; /kham-pha; /tri-thuc/[id]; /to-chuc; /goi-dich-vu; /quyen-rieng-tu. |
| Bắt đầu trải nghiệm | /bat-dau chọn vai và mục đích; demo vào dữ liệu mẫu, MVP vào luồng thiết lập phù hợp. |
| Người kể | /ke-chuyen chọn chủ đề; /ke-chuyen/phien/[id] ghi/nghe; /ban-nhap/[id] sửa và duyệt. |
| Gia đình | /gia-dinh kho; /cau-chuyen/[id] chi tiết riêng; /bo-suu-tap; /sach; /thanh-vien; /cai-dat. |
| Người học | /kham-pha kết quả; /tri-thuc/[id] nội dung được phép; /da-luu khi có tài khoản; /ket-noi gửi quan tâm. |
| Vận hành | /quan-tri cho người có quyền: nội dung công khai, báo cáo, lỗi và yêu cầu hỗ trợ/xóa. |

Đường dẫn là gợi ý để báo giá và thống nhất màn hình, không bắt buộc công nghệ. Nút Kể chuyện đưa thẳng vào chủ đề, nút Khám phá vào kho công khai. Người chưa đăng nhập vẫn nghe dữ liệu mẫu/công khai; với kho gia đình phải xác thực trước khi máy chủ trả dữ liệu. Trang lỗi có quay lại an toàn, không hiển thị thông tin của người khác.

### B6. Trang chủ và nội dung cần thiết kế

| **Thứ tự khối** | **Nội dung và tương tác** |
| --- | --- |
| 1. Thanh đầu trang | Logo, Cách hoạt động, Khám phá tri thức, Dành cho tổ chức; Đăng nhập và Bắt đầu lưu giữ. Mobile menu gọn. |
| 2. Phần mở đầu | Tiêu đề: Giữ lại giọng kể, trao truyền kinh nghiệm. Mô tả rõ tiếng Việt, bản nháp và quyền người kể. Nút chính Kể câu chuyện đầu tiên; nút phụ Nghe chuyện mẫu. |
| 3. Chuyện mẫu | Một ảnh gia đình, trích đoạn ngắn, trình phát 30–60 giây; nhãn Dữ liệu minh họa. Bấm Xem câu chuyện để mở màn chi tiết. |
| 4. Ba nhóm giá trị | Ba thẻ Ông bà kể, Gia đình lưu giữ, Người trẻ học hỏi; mỗi thẻ dẫn đúng trải nghiệm tương ứng. |
| 5. Cách hoạt động | Bốn bước dễ đọc: Kể → AI hỗ trợ bản nháp → Người kể duyệt → Lưu và chia sẻ. Có đường dẫn dùng thử. |
| 6. Đầu ra | Chuyển tab Câu chuyện gia đình / Kinh nghiệm thực tiễn; cùng thấy nguồn kể, quyền và ví dụ nội dung. |
| 7. Kho tri thức mẫu | 3–6 thẻ theo nấu ăn, làm vườn, nghề thủ công; có tìm kiếm hoặc liên kết xem toàn bộ. |
| 8. Quyền và niềm tin | Mặc định riêng tư, duyệt trước, lựa chọn chia sẻ; dẫn chính sách. Không dùng chứng nhận bảo mật chưa có. |
| 9. Gói và tổ chức | Mức giá dự kiến có nhãn; liên hệ nhận tư vấn chương trình. Không ghi đối tác hoặc khách hàng giả. |
| 10. FAQ và chân trang | Ai được xem, AI có sửa sai không, có cần biết viết không, xóa dữ liệu thế nào, có thu tiền chưa; liên hệ và điều khoản. |

Bố cục desktop mở đầu hai cột: bên trái lời giới thiệu, bên phải ảnh người kể và thẻ nghe thử nhỏ. Mobile xếp chữ–nút–ảnh–thẻ nghe. Không để carousel lớn che nút bắt đầu. Các con số 20 người, 50 nội dung hay 80% chỉ ghi ở mục tiêu thử nghiệm, không đưa lên trang chủ như kết quả đã đạt.

### B7. Màn hình kể chuyện và gợi mở kinh nghiệm

Màn chọn chủ đề hiển thị tối đa sáu lựa chọn đầu: Tuổi thơ, Gia đình, Quê hương, Nghề nghiệp, Món ăn, Làm vườn. Hai hướng đầu ra Câu chuyện và Kinh nghiệm chỉ là gợi ý, có thể thay sau duyệt. Có lựa chọn Chưa biết kể gì để nhận câu hỏi dễ bắt đầu. Không bắt điền hồ sơ dài trước buổi đầu.

Ví dụ câu hỏi ký ức: “Bác nhớ điều gì nhất về ngày Tết khi còn nhỏ?”; tiếp theo “Ai thường chuẩn bị việc đó cùng bác?”. Với kinh nghiệm: “Bác có thể kể cách nhận biết khi nào cây cần tưới không?”; hỏi tiếp điều kiện, dấu hiệu và lưu ý mà người kể thật sự biết. Tránh câu hỏi dẫn dắt hoặc giả định sự kiện chưa được kể. Người dùng luôn có Bỏ qua câu hỏi và Kết thúc buổi kể.

Màn ghi hiển thị một câu hỏi lớn, nút Nghe câu hỏi nếu có, micro, thời lượng và trạng thái bằng chữ. Bắt đầu chỉ ghi sau thao tác chủ động và cấp quyền; Tạm dừng ngừng thu, Tiếp tục nối cùng phiên, Kết thúc chuyển nghe lại. Có Giữ bản ghi, Ghi lại và Tiếp tục; ghi lại phải xác nhận vì thay nguồn. MVP có hạn mức đề xuất 10 phút/phiên trong pilot, thông báo trước khi chạm giới hạn.

Khi từ chối micro, hướng dẫn thao tác theo trình duyệt, cho tải tệp hợp lệ hoặc dùng mẫu trong demo. Nếu chưa hỗ trợ một trình duyệt, nói rõ và có lối thay thế. Demo không tự tải bản ghi thật lên dịch vụ AI; muốn thử xử lý thật phải dùng luồng đã có đồng ý và chính sách dữ liệu.

### B8. Bản chép lời, bản nháp và kiểm duyệt

Desktop đặt nguồn bên trái và bản nháp bên phải; mobile dùng hai tab Nguồn lời kể / Bản nháp, trình phát không che nút duyệt. Nguồn chép lời và nguồn âm thanh giữ nguyên phiên bản gốc; người dùng có thể sửa bản chép hiển thị nhưng lưu được lịch sử. Các đoạn không chắc có nhãn Cần kiểm tra, không dùng màu đơn thuần.

Bản nháp câu chuyện gồm tiêu đề, đoạn mở, nội dung theo trình tự và bài học nếu có. Bản nháp kinh nghiệm gồm tên kỹ năng, bối cảnh, điều kiện, cách làm, lưu ý và giới hạn áp dụng; chỉ hiện mục có căn cứ. Tên người, địa điểm, năm và chủ đề có trường sửa. Không tạo lời trích trực tiếp nếu AI đã diễn đạt lại; phân biệt lời nguyên văn với nội dung biên tập.

Nút chính Xác nhận nội dung; nút phụ Lưu để xem sau và Quay lại nguồn. Trước xác nhận, hỏi “Nội dung này đã đúng điều bác muốn kể chưa?”. Người hỗ trợ có thể gửi bản đã sửa để người kể duyệt, không tự nhân danh người kể nếu chưa có ủy quyền được ghi nhận. Sau duyệt, chuyển sang lựa chọn nơi lưu; không tự bật chia sẻ công khai.

Nếu sửa bản đã công bố, tạo bản nháp mới và tạm rút bản công khai theo quy tắc thống nhất ở B12; trước khi lưu phải thông báo điều đó. Chỉ công bố lại khi bản mới đã duyệt và quyền tương ứng được xác nhận. Nhóm có thể chọn giữ bản công khai cũ trong tương lai, nhưng không áp dụng hai quy tắc khác nhau trong MVP.

### B9. Kho gia đình và đầu ra sách

Màn kho gia đình ưu tiên ô tìm, bộ lọc người kể/chủ đề/trạng thái và nút Thêm câu chuyện. Thẻ nội dung hiển thị tiêu đề, người kể, ngày ghi, thời lượng, nháp/đã duyệt và phạm vi xem. Kho rỗng hướng dẫn một hành động: Mời người kể hoặc Bắt đầu câu chuyện. Kết quả tìm không chỉ dựa tên tệp; MVP tìm tiêu đề, chủ đề và bản văn đã có quyền.

Chi tiết riêng có ảnh, trình phát, bản đọc, thông tin nguồn và các nút Sửa, Thêm vào bộ sưu tập, Quyền truy cập. Thành viên chỉ đọc không thấy tác vụ chỉnh sửa; dù biết URL vẫn bị kiểm tra quyền. Tìm kiếm trong gia đình chỉ trả dữ liệu thuộc không gian được phép.

Sách ký ức cho chọn các nội dung đã duyệt, đặt tên và xem bìa, mục lục, một chương. Demo dùng PDF mẫu ghi rõ chưa tạo từ dữ liệu người dùng; MVP P0 có bản đọc theo chương, xuất PDF động thuộc P1 nếu chưa chốt thêm. QR cho bản riêng phải yêu cầu đăng nhập hoặc quyền hợp lệ; QR không biến nội dung thành công khai và không bảo đảm lưu trữ vĩnh viễn.

### B10. Kho tri thức và trải nghiệm người học

Đây là màn hình chứng minh giá trị ngoài lưu ký ức. Có tìm kiếm theo cụm từ đời thường, bộ lọc chủ đề, loại nội dung và địa phương khi được cung cấp. Mỗi thẻ gồm tên kinh nghiệm, người kể hoặc bút danh được phép, tóm tắt, chủ đề và thời lượng. Không hiển thị tên gia đình, âm thanh hay thông tin riêng ngoài phạm vi công bố.

Thẻ chi tiết gồm Vấn đề áp dụng, Kinh nghiệm, Điều kiện/Lưu ý, Nguồn kể và phạm vi sử dụng. Phần nào người kể chưa cung cấp được ghi Chưa có thông tin, không để AI suy ra cách làm. Nếu có âm thanh được cho phép, dùng trình phát nguồn hoặc đoạn đã được duyệt; nếu không, vẫn cho đọc bản văn theo quyền. Có nút Lưu để xem sau, Báo nội dung cần kiểm tra và Đề nghị trao đổi khi phù hợp.

MVP tìm kiếm từ khóa có thể xử lý tiếng Việt có/không dấu; bộ lọc kết hợp phải cho kết quả đúng tập quyền. Không có kết quả thì gợi ý bỏ bộ lọc hoặc đổi từ, không tự tạo nội dung AI lấp chỗ trống. Tìm kiếm ngữ nghĩa và hỏi đáp qua kho là P1/P2; nếu bổ sung phải kiểm soát quyền trước truy xuất, có nguồn dẫn và nói rõ khi không có tư liệu.

Kết nối người truyền đạt ban đầu dùng biểu mẫu: chủ đề muốn trao đổi, hình thức quan tâm, thông tin liên hệ tối thiểu và đồng ý được nhóm liên hệ. Không hiện số điện thoại của người kể công khai. Nhóm điều phối xác minh trước; hệ thống không tự hứa có lớp học, chuyên gia sẵn lịch hoặc kết quả nghề nghiệp.

### B11. Vai trò và quyền truy cập

Người trả phí không tự động có quyền công bố lời kể. Người kể là chủ thể duyệt nội dung; người quản lý gia đình quản lý thành viên và thanh toán nhưng chỉ chỉnh/công bố trong phạm vi được người kể cho phép. Khi người kể cần hỗ trợ, ghi nhận người hỗ trợ và cách xác nhận; không chỉ đặt một ô đồng ý thay cho mọi trường hợp.

| **Vai trò** | **Được thực hiện** | **Giới hạn chính** |
| --- | --- | --- |
| Người kể | Ghi, xem nguồn của mình, duyệt, chọn phạm vi và yêu cầu rút/xóa. | Không được truy cập chuyện riêng của người khác nếu chưa có quyền. |
| Người quản lý gia đình | Tạo không gian, mời thành viên, tổ chức kho và hỗ trợ theo quyền. | Thanh toán không đồng nghĩa được tự công bố hoặc khai thác thương mại. |
| Người thân được mời | Xem hoặc hỗ trợ sửa theo quyền của từng nội dung. | Không mời tiếp, chia sẻ rộng hoặc tải nếu chưa được cấp quyền tương ứng. |
| Người học/khách | Xem nội dung công khai được duyệt, tìm kiếm và gửi quan tâm. | Không truy cập nguồn riêng hoặc danh tính/liên hệ không được công bố. |
| Biên tập hỗ trợ | Xử lý nhiệm vụ được giao, theo phiên cấp quyền và nhật ký. | Không có quyền đọc toàn bộ kho gia đình mặc định. |
| Quản trị | Quản lý hệ thống, nội dung công khai, báo cáo và yêu cầu hỗ trợ. | Truy cập nội dung riêng cần cơ chế cho phép, lý do và ghi nhận. |

Máy chủ phải kiểm tra người dùng, gia đình và quyền trên từng đối tượng: bản ghi, văn bản, ảnh, PDF và kết quả tìm. Ẩn nút trên màn hình là chưa đủ. Cần thử bằng tài khoản gia đình khác và truy cập trực tiếp URL/API. Demo chuyển vai bằng nút chỉ là minh họa, phải ghi rõ chưa phải xác thực thật.

### B12. Trạng thái nội dung, đồng ý và chia sẻ

Tách ba trục dữ liệu: xử lý (đã tải/đang xử lý/lỗi/sẵn sàng), biên tập (nháp/chờ duyệt/đã duyệt) và quyền (riêng/người được mời/bản công khai). “Đã duyệt” không đồng nghĩa “công khai”. Một câu chuyện riêng có thể có bản kinh nghiệm công khai được duyệt riêng; bản công khai chỉ tham chiếu phần nguồn được phép.

Hộp chia sẻ dùng ba lựa chọn dễ hiểu: Chỉ mình tôi, Người được mời, Đề nghị công bố. Trước công bố có bản xem chính xác nội dung người ngoài sẽ thấy. Tên thật/bút danh, địa phương, ảnh và âm thanh là các lựa chọn riêng; mặc định không công bố toàn bộ nguồn. Sự đồng ý công bố không thay thế sự đồng ý cho khai thác thương mại.

Nhật ký ghi người thực hiện, vai trò, phiên bản nội dung, phạm vi và thời điểm. Khi thu hồi quyền, chặn nguồn/bản văn/PDF lưu trên hệ thống, loại khỏi kết quả và xóa cache phù hợp; không chỉ gỡ thẻ giao diện. Nội dung sao chép hoặc tải ngoài hệ thống có thể không thu hồi được, cần giải thích trước khi công bố.

Quy tắc MVP đề xuất: sửa nội dung đã công bố sẽ rút bản hiện hành, tạo nháp và yêu cầu duyệt/cấp quyền lại. Thu hồi một nguồn phải xem xét mọi bản dẫn xuất và mục tìm kiếm liên quan. Yêu cầu xóa có trạng thái tiếp nhận, đang xử lý, hoàn tất; thời hạn, phạm vi sao lưu và trường hợp lưu theo nghĩa vụ được nhóm và cố vấn xác định trước vận hành thật.

### B13. Dữ liệu tối thiểu và chất lượng nội dung

| **Đối tượng** | **Trường tối thiểu và ràng buộc** |
| --- | --- |
| Người dùng và gia đình | Mã, vai trò, gia đình, lời mời; thông tin liên hệ tối thiểu, không mặc định thu giấy tờ tùy thân. |
| Người kể | Tên hiển thị/bút danh, cách xác nhận, người hỗ trợ nếu có; không bắt công bố tuổi hay địa chỉ. |
| Nguồn ghi âm | Mã phiên, người kể, gia đình, tệp riêng, thời lượng, thời điểm, quyền xử lý; không thay âm thanh gốc bằng giọng AI. |
| Bản chép lời | Mã nguồn, phiên bản, chữ, đoạn cần kiểm tra; mốc thời gian chỉ bắt buộc khi dịch vụ hỗ trợ đúng. |
| Câu chuyện | Nguồn, loại, tiêu đề, nội dung, chủ đề, người duyệt, phiên bản và trạng thái. |
| Thẻ kinh nghiệm | Nguồn nội dung, kỹ năng, bối cảnh, cách làm có căn cứ, lưu ý và giới hạn; quyền với bản dẫn xuất riêng. |
| Chia sẻ và đồng ý | Người cấp quyền, phiên bản, người xem/phạm vi, quyền với văn bản/ảnh/âm thanh, thời hạn và thu hồi. |
| Theo dõi thử nghiệm | Mã người tham gia, phiên bản web, tác vụ, thời gian, mức trợ giúp, kết quả và phản hồi; tách dữ liệu cá nhân. |

Không đưa chi tiết riêng nhạy cảm lên bản công khai chỉ vì có trong lời kể. Nội dung về người thứ ba cần người kể kiểm tra và nhóm rà soát trước công bố. Kinh nghiệm cá nhân không trình bày như hướng dẫn chuyên môn đã được xác nhận; phạm vi pilot ưu tiên chủ đề sinh hoạt, nghề và văn hóa ít rủi ro, các nội dung đòi hỏi chuyên môn cần cơ chế duyệt phù hợp.

### B14. Kiến trúc triển khai và tích hợp AI

Đơn vị web đề xuất công nghệ đáp ứng yêu cầu và dễ bàn giao; có thể dùng Next.js/React, PostgreSQL, xác thực và kho tệp riêng. Nhóm không yêu cầu tự huấn luyện mô hình. Mọi API AI gọi từ máy chủ, khóa ở cấu hình bảo mật; không nhúng vào trình duyệt hoặc kho mã công khai. Không dùng dữ liệu mẫu có thật của gia đình làm nội dung công khai mặc định.

Luồng đề xuất: tải tệp → kiểm tra dung lượng/định dạng → lưu riêng → tạo tác vụ → ASR → lưu bản chép → tạo bản nháp theo biểu mẫu → người dùng sửa và duyệt. Mỗi bước có mã trạng thái, lỗi có thể thử lại; thử lại cùng tác vụ không nhân đôi nội dung hoặc vô hạn chi phí. Nếu AI không khả dụng, giữ bản ghi và cho hẹn xử lý lại, không làm mất dữ liệu.

Trước tích hợp, bên phát triển cung cấp nhà cung cấp, loại dữ liệu gửi, chính sách lưu/xử lý, hạn mức và cách thay dịch vụ. Giới hạn theo thời lượng, số tác vụ/người dùng và ngân sách; báo cáo dùng thật tách môi trường demo. Bản ghi và lời kể được coi là dữ liệu đầu vào, không được dùng làm chỉ dẫn thay đổi quyền hoặc lệnh hệ thống.

Phân loại và trích xuất dùng cấu trúc được kiểm tra. AI chỉ tóm tắt từ nguồn; thiếu thông tin thì đánh dấu/hỏi lại. Không xuất bản tự động khi tác vụ báo thành công. Định nghĩa chi tiết nguồn và bản dẫn xuất nhất quán với B12 để rút/xóa đúng toàn bộ đối tượng liên quan.

### B15. Hiệu ứng và chuyển động

| **Vị trí** | **Hiệu ứng đề xuất** | **Yêu cầu triển khai** |
| --- | --- | --- |
| Trang chủ | Nội dung xuất hiện nhẹ, dịch 12–20 px, 200–350 ms, một lần. | Nội dung có sẵn khi tắt chuyển động; không chờ hiệu ứng mới bấm được. |
| Thẻ nội dung | Đổi bóng/nâng nhẹ 150–200 ms; focus có viền rõ. | Mobile dùng phản hồi nhấn, không phụ thuộc hover. |
| Ghi âm | Micro nhịp nhẹ khi đang ghi, thời lượng thật; sóng theo tín hiệu nếu triển khai. | Tạm dừng thì ngừng hiệu ứng; luôn kèm chữ. Sóng minh họa phải ghi nhãn. |
| Đang xử lý | Thay nhãn theo bước đang tải/chuyển chữ/tạo nháp. | Không chạy phần trăm giả hoặc hứa thời gian cố định; lỗi có hành động tiếp. |
| Lưu và duyệt | Phản hồi ngắn có chữ, sau đó trạng thái vẫn thấy trên trang. | Không dùng hiệu ứng pháo hoa hoặc thông báo tự mất trước khi đọc. |
| Sách mẫu | Chuyển chương bằng fade/trượt nhẹ; lật trang tùy chọn. | Bản đọc mặc định rõ ràng; không yêu cầu 3D để xem nội dung. |
| Toàn hệ thống | Tắt/giảm hiệu ứng theo thiết lập giảm chuyển động. | Không cuộn cưỡng chế, parallax mạnh, video nền hoặc tiếng tự chạy. |

Phân biệt hiệu ứng làm rõ trạng thái với hiệu ứng trang trí. Màn kể và duyệt ưu tiên phản hồi thao tác; trang giới thiệu có thể giàu hình ảnh hơn. Đơn vị thiết kế cần bàn giao cả trạng thái không có chuyển động để kiểm tra người dùng nhạy cảm với hoạt ảnh.

### B16. Trạng thái rỗng, lỗi và trải nghiệm dự phòng

| **Tình huống** | **Thông báo và cách xử lý** |
| --- | --- |
| Chưa có câu chuyện | “Gia đình mình chưa có câu chuyện nào. Hãy bắt đầu từ một kỷ niệm dễ nhớ.” Có nút Bắt đầu. |
| Không cấp micro | Giải thích cần quyền để ghi; hướng dẫn cấp quyền, cho tải tệp hoặc dùng mẫu trong demo; không lặp hỏi vô hạn. |
| Mạng gián đoạn | Cho biết đã lưu được bước nào; giữ phần có thể giữ; thử tải lại không tạo bản trùng. Không hứa khôi phục khi chưa lưu. |
| Đóng trang lúc ghi/chưa lưu | Cảnh báo rõ rời trang có thể mất phần chưa lưu; có Quay lại và Rời trang. |
| AI lỗi hoặc quá hạn mức | Giữ nguồn, hiển thị chờ xử lý/đã chạm hạn mức; cho thử lại phù hợp hoặc liên hệ hỗ trợ. |
| Không tìm thấy | Giữ từ khóa để sửa, gợi ý bỏ bộ lọc; không tự tạo câu trả lời ngoài nguồn. |
| Không có quyền/link thu hồi | Thông báo không còn quyền xem; không lộ tiêu đề hoặc thông tin nội dung riêng; quay về trang an toàn. |
| Biểu mẫu kết nối | Kiểm tra trường thiếu; báo đã tiếp nhận thật hoặc chỉ mô phỏng; không báo gửi thành công nếu không lưu/gửi được. |

### B17. Chỉ số cần ghi nhận để kiểm chứng sản phẩm

Sự kiện tối thiểu: bắt đầu chủ đề, bắt đầu/kết thúc ghi, tải thành công, tạo bản nháp, sửa, duyệt, tìm kiếm, mở kết quả, yêu cầu chia sẻ và gửi quan tâm. Ghi mã sự kiện và thời điểm, không đưa toàn bộ lời kể hoặc nội dung tìm kiếm riêng vào công cụ phân tích bên ngoài mặc định. Phiên thử nghiệm dùng mã người tham gia để tổng hợp cùng phiếu đánh giá.

Báo cáo cần trả lời: người cao tuổi có hoàn thành không; cần giúp ở bước nào; gia đình mất bao nhiêu công sửa; người trẻ có tìm đúng điều cần học không; chi phí phục vụ là bao nhiêu. Trong pilot theo dõi phút âm thanh, lượt AI và thời gian biên tập trên mỗi nội dung đã duyệt. Chỉ tiêu 80% dùng dữ liệu phản hồi hợp lệ theo mục 4.2; không tự suy từ lượt bấm nút hoặc tỷ lệ truy cập.

### B18. Dữ liệu mẫu và kịch bản quay demo

Chuẩn bị tối thiểu hai người kể hư cấu có nhãn và sáu nội dung minh họa: ba chuyện gia đình, ba kinh nghiệm theo chủ đề món ăn, làm vườn và nghề thủ công. Có ít nhất một nháp, một nội dung riêng, một bản được mời xem và một bản công khai mẫu. Ảnh và âm thanh có quyền dùng; nếu dùng giọng tổng hợp phải ghi rõ giọng minh họa, không gắn như giọng thật của nhân vật.

Kịch bản 3 phút đề xuất: 0:00–0:20 giới thiệu ba nhóm người dùng; 0:20–0:50 chọn chủ đề và ghi/nghe mẫu; 0:50–1:20 xem chữ và bản nháp, sửa một tên hoặc chi tiết; 1:20–1:45 duyệt và lưu riêng; 1:45–2:10 chọn phần kinh nghiệm được phép; 2:10–2:40 chuyển góc nhìn người học, tìm từ khóa và nghe nguồn mẫu; 2:40–3:00 xem một chương sách, kết bằng trạng thái demo và mục tiêu thử nghiệm.

Có nút khôi phục dữ liệu mẫu và đường trình diễn dự phòng không phụ thuộc API. Nếu tạo bản nháp bằng dữ liệu dựng sẵn thì nhãn Mô phỏng vẫn thấy trong video; không dùng hiệu ứng chờ để khiến người xem tưởng đã gọi AI thật. Hồ sơ demo kèm URL, phiên bản và danh mục phần thật/mô phỏng.

### B19. Tiêu chí nghiệm thu cụ thể

Nghiệm thu demo trước, MVP sau theo hợp đồng riêng. Mỗi ca thử lưu phiên bản, thiết bị, kết quả và bằng chứng. Chức năng đánh dấu P1/P2 chỉ là bắt buộc khi được thêm vào phạm vi ký kết. Lỗi làm lộ dữ liệu, mất nguồn hoặc tự công bố chưa duyệt phải được sửa trước thử nghiệm người thật.

| **Mã và phạm vi** | **Ca thử** | **Điều kiện đạt** |
| --- | --- | --- |
| NT01 Demo | Luồng kể đầy đủ | Đi từ chủ đề tới bản duyệt, kho, chi tiết và đầu ra; không có nút cụt trong đường trình diễn. |
| NT02 Demo | Luồng tìm học | Tìm được nội dung kinh nghiệm theo từ khóa và bộ lọc; mở nguồn mẫu và thấy thông tin được phép. |
| NT03 Demo | Minh bạch | Mọi kết quả AI dựng sẵn, tài khoản mẫu, PDF mẫu được ghi nhãn; không có số liệu thành tích giả. |
| NT04 Demo/MVP | Micro và ghi lại | Cấp/từ chối quyền được xử lý; dừng thực sự ngừng thu; ghi lại có xác nhận; nghe lại đúng nguồn. |
| NT05 MVP | ASR và bản nháp thật | Một tệp tiếng Việt được lưu, chuyển chữ và tạo nháp qua dịch vụ đã kê; lỗi giữ nguyên nguồn và có thử lại. |
| NT06 MVP | Duyệt và công bố | Nháp không công khai; duyệt không tự công khai; sửa bản đã công bố rút theo quy tắc B12 và yêu cầu duyệt lại. |
| NT07 MVP | Truy cập chéo | Gia đình B không xem được tệp, văn bản, ảnh, sách, API và kết quả tìm riêng của A khi biết đường dẫn. |
| NT08 MVP | Quyền với âm thanh | Công khai bản văn nhưng không âm thanh thì nguồn âm thanh riêng vẫn không truy cập được từ kho khám phá. |
| NT09 MVP | Thu hồi | Sau thu hồi không xem được qua link cũ/kết quả tìm; kiểm tra cache và bản dẫn xuất nằm trong hệ thống. |
| NT10 MVP | Chất lượng tri thức | Mỗi thẻ có nguồn; trường không có căn cứ không được AI bổ sung như dữ kiện; không còn sai lệch trọng yếu trong bản công bố. |
| NT11 MVP | Đếm mục tiêu nội dung | 50 nội dung kiểm chứng đếm theo mã nguồn độc lập đã duyệt, không đếm lặp câu chuyện/thẻ/PDF. |
| NT12 Demo/MVP | Tiếng Việt và màn hình | Kiểm tra 360/768/1440 px; không cắt dấu, che nút hoặc cuộn ngang ngoài thành phần có chủ đích. |
| NT13 Demo/MVP | Khả năng tiếp cận | Dùng bàn phím, focus/nhãn đúng, chữ 200% vẫn thao tác được; âm thanh không tự phát, giảm chuyển động hoạt động. |
| NT14 Demo/MVP | Trình duyệt | Chrome/Edge máy tính, Chrome Android và Safari iPhone theo thiết bị kiểm thử; báo trước điểm không hỗ trợ và có phương án. |
| NT15 MVP | Lỗi và thử lại | Mất mạng, AI lỗi và thử lại không mất nguồn đã lưu, không tạo dữ liệu trùng; thông báo đúng trạng thái. |
| NT16 Demo/MVP | Tải trang | Mục tiêu trang công khai hiển thị nội dung chính trong 3 giây trên cấu hình mạng/thiết bị thống nhất; ghi kết quả đo, tách thời gian AI. |
| NT17 MVP | Theo dõi thử nghiệm | Xuất được số hoàn thành và bước cần giúp theo mã, phục vụ đánh giá ≥20+30 người; phản hồi dễ dùng nhập được để tổng hợp. |
| NT18 Cả hai | Bàn giao | URL, mã nguồn, thiết kế, tài khoản/quyền quản lý, cấu hình mẫu, hướng dẫn và danh sách giới hạn đầy đủ. |

### B20. Tiến độ, báo giá và bàn giao

Đề nghị bên làm web xác nhận thời hạn demo mong muốn ngày 23/10/2026, phục vụ video ngày 24/10. Nếu không đủ thời gian, chốt một luồng đầy đủ với nguồn và kết quả mẫu được ghi nhãn; thống nhất phần giản lược trước khi làm. Mốc MVP ba tháng tính từ ngày khởi động dự án được xác nhận, không phải ngày giao demo.

Báo giá tách: thiết kế giao diện; demo P0; MVP P0; các lựa chọn P1/P2; phí AI/lưu trữ, hosting, bảo trì và nội dung. Mỗi dòng cần khối lượng, chi phí, phụ thuộc, thời hạn, số vòng sửa và tiêu chí nhận. Nêu rõ tệp nào nhóm phải cung cấp, mức hỗ trợ sau bàn giao và quyền sửa mã khi kết thúc hợp tác.

Bàn giao: mã nguồn cùng lịch sử, tệp thiết kế có thành phần, hướng dẫn chạy/triển khai, cấu trúc và xuất dữ liệu, danh mục dịch vụ và giấy phép, cấu hình mẫu không có khóa bí mật, cách sao lưu/khôi phục và quản lý hạn mức. Tài khoản demo, staging và production phân biệt; môi trường demo có nút reset, môi trường thật không có reset xóa dữ liệu tùy tiện.

Nhóm quản lý kho mã, tên miền và tài khoản triển khai; bên phát triển được cấp quyền làm việc phù hợp. Trước nghiệm thu cần một buổi hướng dẫn cập nhật chủ đề/câu hỏi, nội dung trang chủ, dữ liệu mẫu và xử lý lỗi. Ghi rõ phần thuê ngoài để sử dụng đúng ở mục VII của hồ sơ dự thi.

## PHỤ LỤC C. TÀI LIỆU THAM KHẢO VÀ NỘI DUNG CẦN BỔ SUNG

Nguồn công khai dưới đây được truy cập hoặc đối chiếu ngày 21/10/2026. Số liệu dân số là thông tin bối cảnh; mô tả sản phẩm là thông tin do nhà cung cấp công bố, không thay thế kiểm thử độc lập. Các số [ ] trong nội dung trỏ tới danh mục này.

- **[1]** Cục Thống kê (2025). Thông cáo báo chí Kết quả Điều tra dân số và nhà ở giữa kỳ năm 2024. Mục 1, chỉ tiêu (7): người 60+ và dự báo 2030.  
  <https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2025/01/thong-cao-bao-chi-ket-qua-dieu-tra-dan-so-va-nha-o-giua-ky-nam-2024/>

- **[2]** Cục Thống kê (2026). Thông cáo báo chí về tình hình dân số, lao động, việc làm quý IV và năm 2025. Mục 1: dân số trung bình, tuổi thọ và tỷ suất chết thô.  
  <https://www.nso.gov.vn/tin-tuc-thong-ke/2026/01/thong-cao-bao-chi-ve-tinh-hinh-dan-so-lao-dong-viec-lam-quy-iv-va-nam-2025/>

- **[3]** General Statistics Office of Viet Nam và UNFPA (2021). Population ageing and older persons in Viet Nam. Mục 2.4, trang in 22, trang PDF 36: hình thức sống.  
  <https://vietnam.unfpa.org/sites/default/files/pub-pdf/ageing_report_from_census_2019_eng_final27082021.pdf>

- **[4]** Báo điện tử Chính phủ (10/12/2025). Vietnamese Dong Ho folk painting craft named in UNESCO’s urgent safeguarding list. Nguồn đối chiếu sự kiện khi trang UNESCO yêu cầu xác minh truy cập.  
  <https://en.baochinhphu.vn/vietnamese-dong-ho-folk-painting-craft-named-in-unescos-urgent-safeguarding-list-111251210101407406.htm>

- **[5]** Remento. Trang chủ và mô tả cách hoạt động.  
  <https://www.remento.co/>

- **[6]** Storyworth. Trang giới thiệu và cách hoạt động.  
  <https://welcome.storyworth.com/>

- **[7]** StoryCorps. Trang chủ và các chương trình kể chuyện.  
  <https://storycorps.org/>

- **[8]** Remento Help Center (19/06/2025). Supported languages on Remento.  
  <https://help.remento.co/en/articles/8365902-supported-languages-on-remento>

- **[9]** Storyworth Help Center (cập nhật 20–21/08/2026). What languages are supported?; Can I voice record my stories?; Voice recording language support. Nguồn thứ ba liệt kê tiếng Việt trong Story Calls.  
  <https://help.storyworth.com/en_US/what-languages-are-supported>  
  <https://help.storyworth.com/en_US/can-i-voice-record-my-stories>  
  <https://help.storyworth.com/audio-features/voice-recording-language-support>

- **[10]** BE Heritage. Trang giới thiệu dịch vụ viết hồi ký trong nước; dùng tham chiếu loại hình, không dùng xác nhận giá.  
  <https://hoiky.com.vn/>

- **[11]** Văn phòng Chính phủ qua Báo điện tử Chính phủ (08/07/2022). Thông tin chỉ đạo, điều hành ngày 07/07/2022, phần Quyết định 801/QĐ-TTg và mục tiêu làng nghề.  
  <https://baochinhphu.vn/thong-tin-chi-dao-dieu-hanh-cua-chinh-phu-thu-tuong-chinh-phu-102220708075116501.htm>

- **[12]** Storii. Trang chủ và cách hoạt động.  
  <https://www.storii.com/>
