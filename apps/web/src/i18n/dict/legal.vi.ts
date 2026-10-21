// Namespace 'legal' (Workstream C) - static pages: how it works, plans, organisations, privacy, terms, memory books.
// Vietnamese is the source of keys.
export default {
  _ns: 'legal',
  common: {
    draft: 'Bản dự thảo cho giai đoạn thử nghiệm',
    updated: 'Cập nhật ngày 21/10/2026',
    toc: 'Trên trang này',
    pilotNote: 'Di Sản Sống đang trong giai đoạn thử nghiệm. Nội dung trang này có thể được điều chỉnh trước khi chính thức vận hành; mọi thay đổi quan trọng sẽ được thông báo trước.',
    related: 'Xem thêm',
    signUp: 'Tạo tài khoản miễn phí',
  },
  how: {
    title: 'Cách hoạt động',
    eyebrow: 'Từ lời kể đến di sản',
    heading: 'Ông bà chỉ cần kể. Phần còn lại, chúng tôi làm cùng gia đình.',
    lead: 'Di Sản Sống chia hành trình thành bốn bước rõ ràng. Ở mỗi bước, bạn luôn biết ai đang làm gì, dữ liệu đang ở đâu và bước tiếp theo là gì.',
    steps: {
      s1: {
        title: 'Kể bằng giọng nói',
        body: 'Gia đình tạo một liên kết kể chuyện cho ông bà. Mở liên kết trên điện thoại là vào ngay chế độ kể, không cần mật khẩu.',
        a: 'Chọn một trong sáu chủ đề hoặc “Chưa biết kể gì” để nhận câu hỏi gợi mở.',
        b: 'Nghe câu hỏi được đọc to, bấm nút lớn để ghi; có thể tạm dừng và kể tiếp.',
        c: 'Nghe lại rồi chọn Giữ lại, Ghi lại hoặc chuyển sang câu tiếp theo.',
      },
      s2: {
        title: 'AI hỗ trợ bản nháp',
        body: 'Bản ghi được gửi tới máy chủ của chúng tôi, nơi AI chép lời tiếng Việt và soạn bản nháp. Trình duyệt không bao giờ giữ khoá AI.',
        a: 'Bản chép lời giữ nguyên cách nói; chỗ nghe chưa rõ được đánh dấu “Cần kiểm tra”.',
        b: 'AI gợi ý một câu chuyện dễ đọc, hoặc một thẻ kinh nghiệm có cấu trúc.',
        c: 'Nếu xử lý lỗi, bản ghi gốc vẫn được giữ và bạn có thể thử lại.',
      },
      s3: {
        title: 'Người kể duyệt',
        body: 'Bản nháp chỉ là bản nháp. Người kể — hoặc con cháu ngồi cạnh — đọc lại, sửa tên người, địa danh, năm tháng cho đúng.',
        a: 'Đặt bản chép lời và bản nháp cạnh nhau để đối chiếu.',
        b: 'Chỉ người kể mới bấm được “Xác nhận đúng ý tôi”.',
        c: 'Mỗi lần sửa tạo một phiên bản mới; sửa sau khi duyệt thì cần duyệt lại.',
      },
      s4: {
        title: 'Lưu và chia sẻ',
        body: 'Bản đã duyệt vào kho gia đình, riêng tư mặc định. Từ đó, gia đình quyết định chia sẻ đến đâu.',
        a: 'Mời thành viên gia đình với vai trò phù hợp.',
        b: 'Đề nghị đưa từng thẻ kinh nghiệm vào kho tri thức công khai, có kiểm duyệt.',
        c: 'Chọn chương để làm sách ký ức có mã QR nghe lại giọng gốc.',
      },
    },
    rolesTitle: 'Ai làm phần việc nào',
    roles: {
      people: { title: 'Con người quyết định', body: 'Chọn chủ đề, kể, sửa, duyệt, chia sẻ, rút lại, xoá — tất cả do người kể và gia đình quyết định.' },
      ai: { title: 'AI làm phần nặng nhọc', body: 'Chép lời, gợi ý cách trình bày, sắp xếp thành các trường của thẻ kinh nghiệm. AI không tự lưu, không tự công bố.' },
    },
  },
  plans: {
    title: 'Gói dịch vụ',
    eyebrow: 'Minh bạch về chi phí',
    heading: 'Miễn phí trong giai đoạn thử nghiệm',
    lead: 'Chúng tôi công bố trước mức giá dự kiến để gia đình có thông tin đầy đủ. Hiện chưa thu phí, chưa nhận thanh toán và không tự động gia hạn bất cứ điều gì.',
    notesTitle: 'Điều cần biết về giá',
    notes: {
      a: 'Mọi mức giá đều là dự kiến và có thể thay đổi sau thử nghiệm.',
      b: 'Khi có gói chính thức, bạn sẽ được thông báo trước và tự chọn tham gia.',
      c: 'Dữ liệu tạo trong giai đoạn thử nghiệm vẫn thuộc về gia đình bạn.',
      d: 'Sách in là kế hoạch; bản PDF in tại nhà sẽ có trước.',
    },
  },
  orgs: {
    title: 'Dành cho tổ chức',
    eyebrow: 'Chương trình cộng đồng',
    heading: 'Cùng ghi lại ký ức và tri thức của cộng đồng',
    lead: 'Di Sản Sống có thể đồng hành cùng các tổ chức muốn lưu giữ lời kể của người cao tuổi một cách bài bản: có quy trình đồng ý, có người hỗ trợ và có kho tri thức chung được kiểm duyệt.',
    audiencesTitle: 'Phù hợp với',
    audiences: {
      library: { title: 'Thư viện', body: 'Xây bộ sưu tập lời kể địa phương, có bản chép lời để tra cứu.' },
      museum: { title: 'Bảo tàng, nhà văn hoá', body: 'Ghi lại câu chuyện quanh hiện vật, nghề truyền thống và lễ hội.' },
      seniors: { title: 'Hội người cao tuổi', body: 'Tổ chức buổi kể chuyện, giúp hội viên lưu giữ cho con cháu.' },
      school: { title: 'Trường học', body: 'Dự án “phỏng vấn ông bà” cho học sinh, học từ kinh nghiệm thật.' },
    },
    programTitle: 'Một chương trình mẫu',
    program: {
      s1: { title: 'Trao đổi nhu cầu', body: 'Xác định chủ đề, số người kể và cách sử dụng nội dung.' },
      s2: { title: 'Tập huấn người hỗ trợ', body: 'Hướng dẫn tình nguyện viên đặt câu hỏi và hỗ trợ người kể dùng công cụ.' },
      s3: { title: 'Ghi lại có đồng ý', body: 'Mỗi người kể đồng ý rõ ràng; được duyệt và rút lại nội dung của mình.' },
      s4: { title: 'Tuyển chọn vào kho chung', body: 'Phần được phép đi vào kho tri thức, ghi rõ nguồn kể và giới hạn áp dụng.' },
    },
    principlesTitle: 'Nguyên tắc không thay đổi',
    principles: {
      a: 'Người kể giữ quyền với lời kể của mình.',
      b: 'Không công bố khi chưa có đồng ý và chưa kiểm duyệt.',
      c: 'Không dùng nội dung để huấn luyện mô hình AI khi chưa được phép.',
      d: 'Chương trình đang ở giai đoạn thử nghiệm; chưa có đối tác chính thức.',
    },
    contactTitle: 'Muốn cùng thử nghiệm?',
    contactBody: 'Kênh tiếp nhận chính thức cho tổ chức đang được chuẩn bị. Trong lúc chờ, hãy tạo tài khoản để trải nghiệm đầy đủ hành trình và nhận cập nhật khi chương trình mở.',
  },
  privacy: {
    title: 'Quyền riêng tư',
    eyebrow: 'Chính sách quyền riêng tư',
    heading: 'Chúng tôi giữ gìn lời kể của gia đình bạn như thế nào',
    lead: 'Viết bằng ngôn ngữ dễ hiểu: dữ liệu nào được lưu, để làm gì, ai được xem và bạn có những quyền gì.',
    sections: {
      scope: {
        title: 'Phạm vi',
        body: 'Chính sách này áp dụng cho website và các tính năng của Di Sản Sống trong giai đoạn thử nghiệm, gồm chế độ kể chuyện, kho gia đình, kho tri thức và sách ký ức.',
      },
      data: {
        title: 'Dữ liệu chúng tôi lưu',
        body: 'Chúng tôi chỉ lưu những gì cần để dịch vụ hoạt động:',
        a: 'Thông tin tài khoản: email, tên hiển thị, ngôn ngữ ưa dùng.',
        b: 'Thông tin gia đình: thành viên, vai trò, người kể và quan hệ.',
        c: 'Nội dung: bản ghi âm, bản chép lời, bản nháp, các phiên bản và trạng thái duyệt.',
        d: 'Lựa chọn chia sẻ và nhật ký thay đổi quyền truy cập.',
      },
      purpose: {
        title: 'Mục đích sử dụng',
        body: 'Dữ liệu được dùng để chép lời, soạn bản nháp, lưu trữ cho gia đình, hiển thị nội dung đã được phép chia sẻ và bảo đảm an toàn hệ thống. Chúng tôi không bán dữ liệu và không dùng nội dung của bạn cho quảng cáo.',
      },
      ai: {
        title: 'AI xử lý lời kể ra sao',
        body: 'Bản ghi được gửi từ máy chủ của chúng tôi tới dịch vụ AI của bên thứ ba (Google Gemini) để chép lời và soạn nháp. Khoá truy cập AI chỉ nằm ở máy chủ. Kết quả AI luôn là bản nháp và chỉ được lưu như lời của người kể sau khi người kể xác nhận.',
      },
      access: {
        title: 'Ai được xem',
        body: 'Mặc định, nội dung chỉ hiển thị với thành viên gia đình được mời, theo vai trò. Quyền được kiểm tra ở máy chủ cho từng yêu cầu; tệp âm thanh nằm trong kho lưu trữ riêng tư và chỉ mở qua liên kết có thời hạn.',
      },
      public: {
        title: 'Chia sẻ công khai',
        body: 'Một nội dung chỉ vào kho tri thức công khai khi người kể đồng ý, gia đình gửi đề nghị và nội dung được kiểm duyệt. Bạn chọn có kèm giọng nói, tên thật, quê quán hay không, và có thể rút lại bất cứ lúc nào. Khi nội dung được sửa, bản công khai tự động được gỡ cho tới khi duyệt lại.',
      },
      rights: {
        title: 'Quyền của bạn',
        body: 'Bạn có thể:',
        a: 'Xem và sửa thông tin, nội dung của mình.',
        b: 'Tải về dữ liệu của gia đình.',
        c: 'Rút nội dung khỏi kho công khai.',
        d: 'Yêu cầu xoá từng nội dung hoặc toàn bộ tài khoản, bao gồm tệp âm thanh.',
      },
      elders: {
        title: 'Người cao tuổi và sự đồng ý',
        body: 'Người kể có quyền quyết định với lời kể của mình. Khi người kể cần hỗ trợ thao tác, thành viên gia đình có thể giúp, nhưng việc xác nhận nội dung phải phản ánh đúng ý người kể và được ghi lại.',
      },
      changes: {
        title: 'Thay đổi chính sách',
        body: 'Đây là bản dự thảo cho giai đoạn thử nghiệm. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên website trước khi áp dụng.',
      },
    },
  },
  terms: {
    title: 'Điều khoản sử dụng',
    eyebrow: 'Điều khoản sử dụng',
    heading: 'Những thoả thuận khi dùng Di Sản Sống',
    lead: 'Ngắn gọn, rõ ràng và đặt quyền của người kể lên trước.',
    sections: {
      pilot: {
        title: 'Giai đoạn thử nghiệm',
        body: 'Dịch vụ đang thử nghiệm, có thể thay đổi hoặc tạm dừng để cải tiến. Chúng tôi cố gắng giữ an toàn dữ liệu, nhưng khuyến khích gia đình tải về bản sao những nội dung quan trọng.',
      },
      account: {
        title: 'Tài khoản',
        body: 'Bạn chịu trách nhiệm giữ an toàn tài khoản và các liên kết kể chuyện đã tạo. Hãy thu hồi liên kết khi không còn dùng.',
      },
      content: {
        title: 'Nội dung thuộc về bạn',
        body: 'Lời kể, bản chép lời và hình ảnh thuộc về người kể và gia đình. Bạn cho phép chúng tôi lưu trữ và xử lý nội dung chỉ để cung cấp dịch vụ, trong phạm vi bạn đã chọn.',
      },
      consent: {
        title: 'Đồng ý của người kể',
        body: 'Chỉ ghi lại và chia sẻ lời kể khi người kể đồng ý. Không ghi âm người khác khi họ không biết, và không đăng thông tin riêng tư của người thứ ba.',
      },
      knowledge: {
        title: 'Kho tri thức công khai',
        body: 'Thẻ kinh nghiệm là trải nghiệm cá nhân, có ghi nguồn kể và giới hạn áp dụng. Đó không phải lời khuyên chuyên môn về y tế, pháp lý, tài chính hay kỹ thuật. Hãy ghi nguồn khi trích dẫn.',
      },
      ai: {
        title: 'AI và độ chính xác',
        body: 'AI có thể nghe nhầm hoặc diễn đạt chưa đúng. Vì vậy mọi bản nháp đều cần người kể duyệt; chúng tôi không bảo đảm bản nháp chưa duyệt là chính xác.',
      },
      prohibited: {
        title: 'Không được phép',
        body: 'Không dùng dịch vụ để đăng nội dung vi phạm pháp luật, xúc phạm, mạo danh, hoặc vi phạm quyền của người khác; không cố truy cập dữ liệu của gia đình khác.',
      },
      fees: {
        title: 'Phí dịch vụ',
        body: 'Hiện chưa thu phí. Mọi mức giá trên website là dự kiến. Nếu có gói trả phí, bạn sẽ được thông báo trước và tự quyết định tham gia.',
      },
      ending: {
        title: 'Ngừng sử dụng và xoá',
        body: 'Bạn có thể ngừng sử dụng bất cứ lúc nào và yêu cầu xoá dữ liệu. Chúng tôi có thể tạm khoá tài khoản vi phạm điều khoản sau khi đã thông báo.',
      },
      changes: {
        title: 'Thay đổi điều khoản',
        body: 'Điều khoản có thể được cập nhật khi dịch vụ phát triển. Thay đổi quan trọng sẽ được thông báo trước khi có hiệu lực.',
      },
    },
  },
  book: {
    title: 'Sách ký ức',
    eyebrow: 'Sách ký ức có QR',
    heading: 'Những câu chuyện đã duyệt, đóng thành một cuốn sách biết nói',
    lead: 'Sách ký ức là một đầu ra của hành trình kể chuyện: con cháu đọc bằng mắt, quét QR để nghe bằng tai — đúng giọng ông bà, đúng đoạn được kể.',
    stepsTitle: 'Làm một cuốn sách',
    steps: {
      s1: { title: 'Chọn chuyện đã duyệt', body: 'Chỉ những câu chuyện người kể đã xác nhận mới được đưa vào sách.' },
      s2: { title: 'Sắp chương và bìa', body: 'Kéo thả để sắp chương, chọn ảnh bìa và lời đề tặng.' },
      s3: { title: 'Xem trước và in PDF', body: 'Lật xem từng trang, rồi in ra PDF ngay tại nhà.' },
      s4: { title: 'Đặt in (dự kiến)', body: 'Sách bìa cứng in sẵn là kế hoạch, chưa nhận đặt hàng.' },
    },
    qrTitle: 'Mã QR hoạt động thế nào',
    qrBody: 'Mỗi chương có một mã QR trỏ tới trang nghe của câu chuyện đó.',
    qr: {
      a: 'Nếu câu chuyện đã công khai, ai quét cũng nghe được.',
      b: 'Nếu là chuyện riêng của gia đình, người quét phải đăng nhập và là thành viên.',
      c: 'Rút lại hoặc xoá câu chuyện thì mã QR không còn phát nội dung.',
    },
    ctaTitle: 'Bắt đầu từ một câu chuyện',
    ctaBody: 'Cuốn sách nào cũng bắt đầu bằng một lời kể. Hãy để ông bà kể câu chuyện đầu tiên.',
  },
} as const;
