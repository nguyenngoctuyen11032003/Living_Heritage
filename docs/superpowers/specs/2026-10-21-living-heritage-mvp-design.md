# Di Sản Sống — Spec 1: Nền móng, giao diện song ngữ và MVP thật

**Ngày:** 2026-10-21 · **Trạng thái:** Đã duyệt thiết kế
**Nguồn yêu cầu:** [DỰ ÁN.md](../../../DỰ%20ÁN.md) (thuyết minh I–X, phụ lục B "Yêu cầu website")
**Mô hình tham chiếu:** cấu trúc repo Linguo; UX Remento (luồng kể → sách QR) và StoryCorps (thư viện câu chuyện); phong cách hero Reelmark và các phần tối kiểu Prisma.

---

## 1. Mục tiêu

Xây sản phẩm web chạy thật: Supabase (Auth, Postgres, RLS, Storage, Edge Functions) và Gemini xử lý giọng nói tiếng Việt. Deploy GitHub Pages bằng GitHub Actions. Giao diện song ngữ **Tiếng Việt (mặc định) / English**.

Hành trình phải đi trọn: gợi mở → ghi âm → AI chép lời và tạo bản nháp → người kể duyệt → lưu kho gia đình → đề nghị công bố → kho tri thức tìm học → sách ký ức có QR.

**Ngoài phạm vi:** thanh toán, đặt in sách, gọi điện tự động, video, app di động riêng, nhân bản giọng nói, PWA/Web Push.

## 2. Quyết định đã chốt

| Chủ đề | Quyết định |
| --- | --- |
| Repo | `nguyenngoctuyen11032003/Living_Heritage`, pnpm monorepo như Linguo; site `https://nguyenngoctuyen11032003.github.io/Living_Heritage/` |
| Supabase | project `dfohmtznhercbhutvyag`; key chỉ ở `.env` cục bộ, GitHub Secrets, Supabase Secrets |
| AI | Gemini qua Edge Function `ai-process` (server-side), `GEMINI_API_KEY` + `GEMINI_MODEL` ở Supabase Secrets |
| Đọc câu hỏi | `speechSynthesis` của trình duyệt (vi-VN / en-US), không tốn chi phí; Gemini TTS là P1 |
| Người kể không cần mật khẩu | Gia đình tạo **liên kết kể chuyện** (token + QR). Mở link → `signInAnonymously` → RPC `claim_narrator_link(token)` gắn user ẩn danh với `narrators.user_id`. Link thu hồi được, có hạn |
| Song ngữ | Từ điển `vi`/`en` có kiểu chặt (khóa thiếu là lỗi TypeScript), `LocaleProvider` + `useT()`, lưu localStorage, cập nhật `<html lang>`. Nội dung người dùng giữ ngôn ngữ gốc, có cột `lang`. Dữ liệu minh họa có bản `vi` và `en` |
| Tìm kiếm | Postgres FTS cấu hình `simple` + `unaccent` + `pg_trgm` → tìm có/không dấu |
| Sách | Trình đọc theo chương + CSS in ra PDF (P0); QR từng chương trỏ tới `/nghe/:storyId`, có kiểm tra quyền |
| Không dùng | Ảnh/video CDN trong prompt mẫu (không rõ quyền) → minh họa SVG riêng; không số liệu/đánh giá/logo giả |

## 3. Kiến trúc

```
Trình duyệt (React SPA trên GitHub Pages)
  ├─ supabase-js (anon/publishable key, RLS) → Postgres + Storage (bucket riêng tư `recordings`, `media`)
  └─ functions.invoke('ai-process') ─→ Edge Function (verify_jwt)
         ├─ kiểm tra quyền trên session (client người dùng, RLS)
         ├─ quota (service role, RPC ai_quota_consume/refund)
         ├─ tải audio từ Storage → Gemini generateContent (audio inline) → transcript
         └─ Gemini JSON schema → bản nháp story + experience → lưu, đổi trạng thái ai_jobs
```

Tác vụ AI có `ai_jobs(status: queued|transcribing|drafting|done|error)`, khóa idempotency theo `recording_id + kind`. Gọi lại khi job đang chạy trả về job hiện tại. Lỗi giữ nguyên audio, có thể thử lại. Circuit breaker 5 lỗi / 60 giây.

## 4. Cấu trúc repo

```
apps/web/src/
  app/          main.tsx, App.tsx, router.tsx
  i18n/         vi.ts, en.ts, LocaleProvider.tsx, useT.ts
  design/       tokens.css, global.css, fonts.css, motion.ts
  components/
    ui/         Button, Badge, Card, Input, Dialog, Tabs, AudioPlayer, Toast, Skeleton, LanguageSwitch
    layout/     SiteHeader, SiteFooter, AppShell, NarratorShell
    motion/     WordsPullUp, WordsPullUpMultiStyle, ScrollRevealText, HandNote, DrawArrow
    landing/    Hero, CurvedCarousel, SampleStory, Manifesto, ValueTrio, HowItWorks, OneVoiceThreeOutputs, FeatureGrid, KnowledgePreview, BookShowcase, TrustPrivacy, Plans, Faq
    illustrations/ SVG theo chủ đề
  features/
    auth/ families/ narrators/ storytelling/ review/ vault/ sharing/ knowledge/ books/ admin/ ai/
  lib/          env.ts, supabase.ts, cn.ts, format.ts
  routes/       landing, auth, narrator, family, knowledge, books, admin, legal, NotFound
packages/shared/src/  database.types.ts, schemas (zod), ai-contract.ts, constants (topics, roles, statuses)
supabase/  config.toml, migrations/, migrations-applied.json, tests/*.test.sql, seed.sql, functions/{ai-process,_shared}
scripts/   check-public-env, check-bundle-secrets, check-migrations-immutable
.github/workflows/ ci.yml, deploy.yml
```

## 5. Hệ thống thiết kế

**Màu:**

| Token | Giá trị |
| --- | --- |
| `--cream` | #FAF7F0 |
| `--paper` | #FFFFFF |
| `--ink` | #1F2933 |
| `--ink-soft` | #52606D |
| `--heritage` | #214E43 |
| `--heritage-deep` | #163A31 |
| `--terracotta` | #A84832 |
| `--mint` | #DCE8D5 |
| `--line` | #E6E0D2 |
| `--night` | #121B18 |
| `--night-card` | #1B2622 |
| `--night-ink` | #E9E4D4 |

Phần tối dùng lớp noise SVG.

**Chữ:**
- Be Vietnam Pro 400/500/600/700 cho giao diện.
- Noto Serif 400/600 + italic cho tiêu đề và câu trích.
- Caveat 600 cho ghi chú viết tay.
- Cả ba font tự host qua `@fontsource`, có subset tiếng Việt.

**Cỡ chữ và chạm:**
- Nội dung 18px, chế độ người kể 21px, dòng 1,6.
- Nút ≥48px; ở chế độ người kể, nút ≥56px và nút ghi âm 120px.
- Có nút phóng chữ (100/115/130%).

**Chuyển động:**
- Dùng `motion`; mọi hiệu ứng tắt khi `prefers-reduced-motion`.
- Pull-up từng từ, chữ hiện dần theo cuộn, băng chuyền cong tự trôi và kéo được có quán tính, mũi tên tự vẽ.

**Khả năng tiếp cận:**
- Focus rõ, nhãn biểu mẫu đầy đủ.
- Trình phát dùng được bằng bàn phím.
- Trạng thái luôn có chữ, không chỉ dựa vào màu.

## 6. Màn hình và route

| Route | Nội dung |
| --- | --- |
| `/` | Trang chủ (13 khối, xem 6.1) |
| `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc`, `/quyen-rieng-tu`, `/dieu-khoan` | Trang tĩnh song ngữ |
| `/kham-pha` | Kho tri thức: tìm kiếm, lọc chủ đề/loại/vùng/thập niên, thẻ tạp chí |
| `/tri-thuc/:id` | Chi tiết: trình phát (nếu được phép), bản đọc, kinh nghiệm, điều kiện/lưu ý, giới hạn áp dụng, nguồn kể, liên quan, Lưu / Báo cáo / Đề nghị trao đổi |
| `/nghe/:storyId` | Đích của QR: phát âm thanh nếu người xem có quyền |
| `/dang-nhap`, `/dang-ky`, `/auth/callback` | Email + mật khẩu, magic link |
| `/k/:token` | Mở liên kết kể chuyện (đăng nhập ẩn danh + nhận người kể) |
| `/ke-chuyen` | Chế độ người kể: chọn chủ đề (6 thẻ lớn + "Chưa biết kể gì") |
| `/ke-chuyen/phien/:id` | Ghi âm: câu hỏi lớn, Nghe câu hỏi, nút ghi, tạm dừng/tiếp tục, kết thúc → nghe lại, Giữ / Ghi lại / Câu tiếp |
| `/ban-nhap/:id` | Biên tập hai cột (mobile: tab Nguồn / Bản nháp): trạng thái AI, chép lời, đoạn "Cần kiểm tra", bản nháp story/experience, lịch sử phiên bản, **Xác nhận đúng ý tôi** (chỉ người kể) / Gửi người kể duyệt |
| `/gia-dinh` | Tổng quan kho: tìm kiếm, lọc người kể/chủ đề/trạng thái, thẻ nội dung, kho rỗng có hướng dẫn |
| `/cau-chuyen/:id` | Chi tiết riêng: ảnh, trình phát, bản đọc, nguồn, Sửa, Bộ sưu tập, Quyền truy cập |
| `/gia-dinh/nguoi-ke` | Người kể: tạo, liên kết kể chuyện (QR), thu hồi |
| `/gia-dinh/thanh-vien` | Mời thành viên, vai trò, quan hệ |
| `/sach`, `/sach/:id` | Trình tạo sách: chọn nội dung đã duyệt, sắp chương, bìa, xem trước lật trang, in PDF, QR |
| `/quan-tri` | Duyệt đề nghị công bố, báo cáo, yêu cầu xóa, tác vụ AI lỗi |

### 6.1 Trang chủ

1. **Header:** logo lá + "Di Sản Sống", menu (Cách hoạt động · Khám phá · Sách ký ức · Dành cho tổ chức), chuyển ngôn ngữ VI/EN, Đăng nhập, nút "Bắt đầu lưu giữ".
2. **Hero kiểu Reelmark** trên nền kem:
   - Huy hiệu mint "Đang thử nghiệm · 2026".
   - Tiêu đề 2 dòng "Giữ lại giọng kể, / trao truyền kinh nghiệm" hiện lên từ trạng thái mờ.
   - Dòng phụ 3 câu.
   - Ghi chú Caveat "Chỉ cần nói thôi" kèm mũi tên cong xuống băng chuyền, và "Không cần gõ chữ" kèm mũi tên nhỏ chỉ vào nút.
   - **Băng chuyền cong** 10 thẻ câu chuyện minh họa (hình học mặt trong hình trụ, clip-path tính lại mỗi khung hình, tự trôi khoảng 50u/giây, kéo được, có quán tính).
   - Nút "Kể câu chuyện đầu tiên" trong vòng viền nét đứt.
3. **Chuyện mẫu:** ảnh minh họa, trình phát, bản ghi lời tô sáng theo thời gian, nhãn "Dữ liệu minh họa".
4. **Manifesto (tối):** chữ khổng lồ "Di Sản Sống*" kéo lên từng từ; câu tuyên ngôn nhiều kiểu chữ (serif nghiêng); đoạn văn hiện từng ký tự theo cuộn.
5. **Ba nhóm giá trị:** Ông bà kể / Gia đình lưu giữ / Người trẻ học hỏi, mỗi thẻ dẫn tới trải nghiệm tương ứng.
6. **Cách hoạt động:** 4 bước đánh số, có minh họa.
7. **"Một lời kể, ba đầu ra":** tab Chép lời / Câu chuyện / Thẻ kinh nghiệm trên cùng một đoạn kể.
8. **Lưới tính năng tối (4 cột kiểu Prisma):** thẻ minh họa động + 3 thẻ (01 Kho gia đình, 02 Kho tri thức, 03 Sách ký ức có QR), checklist và "Tìm hiểu thêm ↗".
9. **Kho tri thức mẫu:** 6 thẻ tạp chí (nấu ăn, làm vườn, thủ công…), có tìm kiếm.
10. **Sách ký ức:** mô phỏng sách lật, thẻ QR "Nghe bản gốc · 1:12", thông số dự kiến.
11. **Quyền và niềm tin:** riêng tư mặc định, duyệt trước, chia sẻ từng phần, xóa và tải về.
12. **Gói dự kiến:** 149.000đ/tháng, 1.490.000đ/năm, sách 2.500.000đ, tất cả có nhãn "dự kiến". Kèm phần dành cho tổ chức.
13. **FAQ và footer.**

## 7. Dữ liệu

**Enum:**
- `member_role`: owner, manager, editor, viewer
- `story_kind`: story, experience
- `edit_status`: draft, pending_review, approved
- `visibility`: private, family, public
- `job_status`: queued, transcribing, drafting, done, error
- `publish_status`: pending, approved, rejected, withdrawn

**Bảng:**

| Bảng | Mục đích |
| --- | --- |
| `profiles` | id = auth.users, display_name, locale, is_admin |
| `families` | Kho gia đình; owner_id |
| `family_members` | family_id, user_id, role, relation |
| `family_invites` | Lời mời theo email; token băm |
| `narrators` | family_id, display_name, pen_name, birth_year, region, user_id (người kể đã nhận liên kết), avatar_path |
| `narrator_links` | narrator_id, token_hash, expires_at, revoked_at |
| `topics`, `questions` | Seed song ngữ: title_vi/en, prompt_vi/en, kind_hint |
| `sessions` | narrator_id, topic_id, started_by |
| `recordings` | session_id, question_id, storage_path, duration_s, mime, created_by |
| `transcripts` | recording_id, version, text, uncertain_spans jsonb |
| `stories` | family_id, narrator_id, recording_id, kind, title, body, fields jsonb (experience: skill, context, conditions, steps, cautions, limits), topic_id, lang, edit_status, visibility, approved_by, approved_at, current_version |
| `story_versions` | Bản chụp mỗi lần sửa/duyệt |
| `story_share_settings` | show_audio, show_real_name, show_region, show_photos |
| `publish_requests` | story_id, status, reviewer, note |
| `public_items` | Bản chụp công khai đã duyệt: title, summary, body, fields, topic, region, decade, narrator_label, audio_allowed, search_tsv |
| `audit_log` | actor, action, target, details, at |
| `collections`, `collection_items` | Bộ sưu tập |
| `books`, `book_chapters` | Sách ký ức |
| `connect_requests`, `reports`, `deletion_requests` | Kết nối, báo cáo, yêu cầu xóa |
| `ai_jobs`, `ai_quota`, `ai_usage` | Hàng đợi AI, hạn mức, nhật ký dùng |

**Hàm hỗ trợ RLS** (security definer, `search_path` cố định): `is_family_member(fid)`, `family_role(fid)`, `is_narrator_user(nid)`, `is_admin()`.

**RPC:**

| RPC | Việc làm |
| --- | --- |
| `create_family` | Tạo kho gia đình |
| `create_narrator_link` | Tạo liên kết, trả token một lần |
| `claim_narrator_link` | Gắn user ẩn danh với người kể |
| `revoke_narrator_link` | Thu hồi liên kết |
| `approve_story` | Chỉ người kể hoặc người được ủy quyền ghi nhận |
| `save_story_draft` | Lưu bản nháp; tạo version; nếu bản đang công khai thì rút xuống |
| `request_publish` | Gửi đề nghị công bố |
| `review_publish` | Admin duyệt; tạo hoặc cập nhật `public_items` |
| `withdraw_public` | Rút bản công khai |
| `search_public` | Tìm trong kho công khai (q, topic, kind, region, decade, limit, offset) |
| `accept_invite` | Nhận lời mời vào gia đình |

**Storage:**
- `recordings`: riêng tư; đường dẫn `{family_id}/{narrator_id}/{uuid}.webm`; policy theo `is_family_member`.
- `public-audio`: chỉ chứa bản sao audio của item công khai có `audio_allowed`.

**Quy tắc bất biến:**
- Nháp không bao giờ có trong `public_items`.
- Sửa bản đã công khai → `withdraw_public` tự động, kèm ghi log.
- Thu hồi → xóa `public_items` và file `public-audio`.

## 8. Edge Function `ai-process`

- **Đầu vào:** `{ action: 'transcribe_and_draft', recording_id }` hoặc `{ action: 'suggest_questions', narrator_id, topic_id }`.
- **Kiểm tra:** JWT; người gọi là thành viên gia đình hoặc người kể của recording; quota ngày (`AI_DAILY_LIMIT`, mặc định 30).
- **Bước 1:** tải audio (giới hạn 20 MB) → Gemini với lời dặn "chép nguyên văn tiếng Việt, đánh dấu [?] chỗ không chắc".
- **Bước 2:** Gemini `responseSchema` → `{ story: {title, body}, experience: {skill, context, conditions[], steps[], cautions[], limits} | null, topics[], uncertain[] }`. Prompt nhấn mạnh: "chỉ dùng thông tin có trong lời kể, trường thiếu để null".
- **Lưu kết quả:** transcript v1, stories ở trạng thái draft (1 story + tối đa 1 experience), đổi `ai_jobs.status`.
- **Lỗi:** mã `quota_exceeded`, `ai_unavailable`, `audio_too_large`, `forbidden`, `not_found`. Khi lỗi thì hoàn quota và giữ nguồn.

## 9. Song ngữ

- `i18n/vi.ts` là nguồn khóa (`as const`); `en.ts` có kiểu `Dict` dựng từ vi → thiếu khóa là lỗi biên dịch.
- `t('hero.title')` và `t('x', { n })` hỗ trợ nội suy.
- `LanguageSwitch` có ở header và ở chế độ người kể.
- Ngôn ngữ mặc định lấy từ localStorage, nếu không có thì theo `navigator.language`, cuối cùng là `vi`.
- Prompt AI nhận `lang` theo ngôn ngữ người kể.

## 10. Xử lý lỗi và trạng thái rỗng

- Theo B16: từ chối micro → hướng dẫn và cho tải tệp; mất mạng → giữ blob trong IndexedDB rồi thử tải lại.
- Rời trang khi đang ghi → cảnh báo `beforeunload`.
- AI lỗi hoặc hết quota → giữ nguồn, có nút thử lại.
- Không có quyền → trang an toàn, không lộ tiêu đề.
- Không có kết quả → gợi ý bỏ bộ lọc.

## 11. CI/CD

- **ci.yml:**
  - Kiểm biến môi trường public, migration không bị sửa.
  - Lint, typecheck, test, build, quét secret trong bundle.
  - Gitleaks.
  - `deno check`/`lint`/`test` cho functions.
  - Database: `supabase start`, `db lint`, `supabase test db`.
- **deploy.yml** (push main):
  - CI.
  - Migrate (`environment: production`, `db push`).
  - Deploy functions khi có thay đổi.
  - Build Pages với `VITE_BASE_PATH=/Living_Heritage/`.
- **Vars:** SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SITE_URL.
- **Secrets:** SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, GEMINI_API_KEY, GEMINI_MODEL.

## 12. Kiểm thử và tiêu chí hoàn thành

- **pgTAP:**
  - Truy cập chéo gia đình (NT07).
  - Nháp không công khai, duyệt không tự công khai (NT06).
  - Âm thanh không công khai thì vẫn bị khóa (NT08).
  - Thu hồi (NT09).
  - Chỉ người kể mới duyệt được.
  - Liên kết kể chuyện: hết hạn, bị thu hồi.
- **Vitest:**
  - Từ điển vi/en đủ khóa.
  - Hình học băng chuyền.
  - Bộ ghi âm (MediaRecorder giả lập).
  - Hợp đồng AI (zod).
  - Bộ dựng truy vấn tìm kiếm.
- **Deno test:** handler `ai-process` với Gemini giả lập (thành công, lỗi, quota).
- **Hoàn thành khi:**
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` xanh.
  - Deploy chạy và trang chủ hiển thị được ở cả hai ngôn ngữ.
  - Luồng kể → AI → duyệt → kho → công bố → tìm thấy chạy được trên Supabase thật.
