# Deploy — GitHub Actions + GitHub Pages + Supabase

Không có server riêng. Web tĩnh trên GitHub Pages (`https://nguyenngoctuyen11032003.github.io/Living_Heritage/`), dữ liệu và Edge Function trên Supabase hosted (project ref `dfohmtznhercbhutvyag`, region Singapore).

```text
Pull Request ──► CI (.github/workflows/ci.yml)
                  ├─ web:       check-public-env → check-migrations-immutable → test scripts → lint → typecheck → test → build → check-bundle-secrets
                  ├─ secrets:   gitleaks (bản ghim + sha256) quét toàn bộ lịch sử Git với .gitleaks.toml
                  ├─ e2e:       build --mode e2e → Playwright (Chromium, Supabase giả bằng page.route, không cần secret)
                  ├─ functions: deno check */index.ts → deno lint → deno test --allow-env
                  └─ database:  supabase start (Docker, gọn) → áp mọi migration + seed → db lint → pgTAP

push main ─────► Deploy (.github/workflows/deploy.yml)
                  verify (= CI) ─┐
                  changes ───────┼─► migrate   (khi supabase/migrations đổi; db push qua SUPABASE_DB_URL, dry-run trước)
                                 ├─► functions (khi supabase/functions hoặc config.toml đổi; cần SUPABASE_ACCESS_TOKEN, thiếu thì bỏ qua)
                                 └─► build (VITE_* từ Variables, base /Living_Heritage/) → check-bundle-secrets → pages
```

- `changes` so với commit của lần Deploy **thành công** gần nhất trên `main`, nên migration trong một lần push thất bại vẫn được áp ở lần sau.
- Thứ tự: `verify` → `migrate` → (`functions` ∥ `build`) → `pages`. Migrate lỗi thì không build; `functions` lỗi không chặn web.
- Chạy tay: Actions → Deploy → **Run workflow** với `migrate = true` và/hoặc `functions = true`.
- Mọi action được ghim theo commit SHA đầy đủ (giống Linguo).

## Quy tắc an toàn database
- CI/CD chỉ chạy `supabase db push`. Không bao giờ chạy `db reset`, `config push`, `db push --include-seed` hay seed với project hosted.
- Mỗi thay đổi schema = một file migration **mới** `supabase/migrations/<14 chữ số>_<ten>.sql` (chữ thường, số, `_`), số lớn hơn migration cuối.
- **Không sửa migration đã deploy.** Supabase chỉ áp mỗi file một lần; sửa file cũ làm production lệch với DB mới tinh mà không ai báo.
  - `supabase/migrations-applied.json` ghi sha256 (CRLF chuẩn hoá thành LF) của mọi migration đã deploy. `node scripts/check-migrations-immutable.mjs` (CI job `web`) fail khi file đã ghi bị sửa/đổi tên/xoá, hoặc có file tên sai.
  - **Sau mỗi lần job `migrate` xanh**, ghi các file vừa áp rồi commit:
    ```bash
    for f in supabase/migrations/*.sql; do n=$(basename "$f"); grep -q "\"$n\"" supabase/migrations-applied.json || echo "$n"; done
    node scripts/check-migrations-immutable.mjs --record <file1.sql> <file2.sql>
    git add supabase/migrations-applied.json && git commit -m "chore(db): record deployed migrations"
    ```
    Chỉ ghi **sau khi** migrate xanh. Commit này nằm ngoài `supabase/migrations` nên Deploy kế tiếp không migrate lại.
  - Lỡ sửa: hoàn tác file về bản đã deploy, đưa thay đổi vào migration mới (`create or replace`, `drop … if exists`, `grant/revoke` tường minh).
- `supabase/config.toml` chỉ áp dụng local; Auth hosted cấu hình trên Dashboard (`docs/SETUP.md` mục 6).

## Biến và secrets

| Tên | Loại / nơi đặt | Bắt buộc | Lấy ở đâu | Dùng bởi |
|---|---|---|---|---|
| `SUPABASE_PROJECT_ID` | Variable (repo) | Có | Dashboard → Project Settings → General (`dfohmtznhercbhutvyag`) | `functions` |
| `VITE_SUPABASE_URL` | Variable (repo) | Có | Project Settings → Data API | CI `web`, `build` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Variable (repo) | Có | Project Settings → API Keys (`sb_publishable_…`) | CI `web`, `build` |
| `VITE_SITE_URL` | Variable (repo) | Nên có | `https://nguyenngoctuyen11032003.github.io/Living_Heritage` | `build` (link QR, magic link) |
| `VITE_BASE_PATH` | Variable (repo) | Không | mặc định `/<tên-repo>/` = `/Living_Heritage/` | `build` |
| `SUPABASE_DB_URL` | Secret, environment `production` | Có (để migrate) | Dashboard → **Connect** → Session pooler: `postgresql://postgres.<ref>:<mật khẩu URL-encode>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` | `migrate` |
| `SUPABASE_ACCESS_TOKEN` | Secret, environment `production` | Có (để deploy function) | supabase.com/dashboard/account/tokens | `functions` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret, environment `production` | Không (dự phòng cho script bảo trì) | Project Settings → API Keys (secret key) | chưa workflow nào dùng |
| `GEMINI_API_KEY` | Secret, environment `production` | Không, nếu đã đặt thẳng trên Supabase | aistudio.google.com/apikey | `functions` → `supabase secrets set` |
| `GEMINI_MODEL` | Secret, environment `production` | Như trên | model id Flash, vd. `gemini-3.8-flash` (gemini-2.5-flash không còn mở cho tài khoản mới) | như trên |
| `AI_DAILY_LIMIT` | Secret, environment `production` | Không (mặc định 30) | tự đặt | như trên |

- Job `functions` chỉ đẩy secret **có giá trị** (qua file env 0600, không in ra log); secret GitHub để trống không xoá giá trị đang có trên Supabase. Có thể đặt thẳng: Dashboard → Edge Functions → Secrets, hoặc `pnpm exec supabase secrets set --project-ref dfohmtznhercbhutvyag GEMINI_MODEL=<model-id>`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` do Supabase tự cấp cho Edge Function.
- Mọi `VITE_*` bị đóng gói công khai: chỉ bốn biến trên được phép (`scripts/check-public-env.mjs`), và bundle được quét secret/source map (`scripts/check-bundle-secrets.mjs`).
- `SUPABASE_DB_URL` dùng **session pooler** (IPv4) vì runner GitHub không có IPv6 tới `db.<ref>.supabase.co`. Đổi mật khẩu DB thì cập nhật secret này.

## Thiết lập một lần
1. Repo **public** (Pages cho repo private cần gói trả phí). Nhánh mặc định `main`.
2. **Settings → Pages → Source: GitHub Actions** (`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`).
3. **Settings → Environments → `production`**: thêm secrets ở bảng trên. Tuỳ chọn bật **Required reviewers** để mỗi lần migrate/deploy function phải bấm duyệt (dự án một người nên hiện để trống), và Deployment branches = `main`.
   ```bash
   gh secret set SUPABASE_ACCESS_TOKEN --env production   # dán token khi được hỏi, không đưa vào argv
   ```
4. **Settings → Secrets and variables → Actions → Variables**: các biến ở bảng trên.
5. Supabase Auth URL Configuration và Providers như `docs/SETUP.md` mục 6.

## Quy trình hằng ngày
1. Nhánh → PR → CI xanh → merge `main`.
2. Deploy tự chạy. Có migration mới: xem log `Preview migrations to apply`, rồi ghi checksum (mục trên).
3. Kiểm tra site sau khi job `pages` xanh.

## Môi trường: demo, staging, production
- Hiện chỉ có **một** project Supabase hosted (`dfohmtznhercbhutvyag`), đóng vai production cho site GitHub Pages. Chưa có project staging hay demo riêng.
- Muốn có staging/demo: tạo project Supabase mới, áp cùng migration (`supabase db push --db-url <staging>`), đặt secrets riêng (khoá Gemini riêng, `AI_DAILY_LIMIT` thấp), và build web với `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` của project đó. Không dùng chung tài khoản người dùng hay bucket giữa các môi trường; báo cáo số liệu dùng thật chỉ lấy từ production (DỰ ÁN.md B14).
- Dữ liệu minh họa (thẻ `mau-*`, chuyện mẫu trang chủ, demo `/trai-nghiem`) nằm trong mã web, **không** ghi vào database. Vì vậy nút "Khôi phục dữ liệu mẫu" chỉ đặt lại trạng thái trong trình duyệt.
- **Production không có lệnh reset.** Không chạy `db reset`, seed, `config push` hay script xoá hàng loạt với project hosted (xem mục Quy tắc an toàn database). Xoá dữ liệu gia đình chỉ đi qua yêu cầu xoá và được ghi nhật ký.

## Sao lưu và khôi phục
Sao lưu tự động của Supabase phụ thuộc gói dịch vụ: xem Dashboard → Database → Backups trước khi có dữ liệu thật. Ngoài ra nên tự sao lưu định kỳ (máy có Supabase CLI, `SUPABASE_DB_URL` là session pooler như bảng trên; không commit tệp dump):

```bash
# Cấu trúc, vai trò và dữ liệu (ba tệp riêng)
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" -f backup/schema.sql
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f backup/roles.sql
pnpm exec supabase db dump --db-url "$SUPABASE_DB_URL" --data-only -f backup/data.sql
# Tệp trong Storage (lệnh experimental của CLI; cần đăng nhập `supabase login`)
for b in recordings media public-audio avatars; do
  pnpm exec supabase storage cp -r "ss:///$b" "backup/storage/$b" --experimental --linked
done
```

- Kiểm tra trong `data.sql` có đủ schema cần thiết (`public`, và `auth` nếu muốn giữ tài khoản); nếu thiếu, dump thêm theo schema bằng `--schema`.
- Tệp sao lưu chứa ghi âm và dữ liệu cá nhân: lưu mã hoá, giới hạn người truy cập, xoá bản cũ theo chính sách lưu trữ đã thống nhất; yêu cầu xoá đã hoàn tất cũng phải được xử lý trong các bản sao lưu còn giữ (DỰ ÁN.md B12).
- Khôi phục vào project **mới** (không ghi đè production đang chạy): áp migration bằng `supabase db push`, rồi `psql "$NEW_DB_URL" -f backup/roles.sql` (nếu cần) và `psql "$NEW_DB_URL" -f backup/data.sql`, chép lại tệp Storage cùng đường dẫn, đặt lại secrets Edge Function và Auth (`docs/SETUP.md` mục 6). Thử khôi phục ít nhất một lần trước pilot và ghi kết quả.

## Cấu trúc dữ liệu và xuất dữ liệu
Mọi dữ liệu riêng gắn với `family_id`; quyền đọc do RLS kiểm tra trên từng hàng và từng tệp.

| Nhóm | Bảng (schema `public`) |
|---|---|
| Tài khoản, gia đình | `profiles`, `families`, `family_members`, `family_invites`, `narrators`, `narrator_links` |
| Câu hỏi | `topics`, `questions` (dùng chung, không theo gia đình) |
| Nội dung | `sessions`, `recordings`, `transcripts` (mỗi lần sửa là phiên bản mới), `stories`, `story_versions`, `story_share_settings`, `story_photos`, `collections`, `collection_items`, `books`, `book_chapters` |
| Công khai | `publish_requests`, `public_items` (bản chụp đã duyệt, có thể tìm), `reports`, `connect_requests` |
| Vận hành | `deletion_requests`, `audit_log`, `ai_jobs`, `ai_quota`, `ai_usage` |

| Bucket | Công khai | Đường dẫn tệp | Nội dung |
|---|---|---|---|
| `recordings` | Không | `{family_id}/{narrator_id}/{uuid}.webm` (kiểu thật ở `recordings.mime`) | Ghi âm gốc, ≤ 20 MB |
| `media` | Không | `{family_id}/{uuid}.{ext}` | Ảnh câu chuyện (`story_photos`) |
| `public-audio` | Có | `items/…` | Bản sao âm thanh của nội dung đã duyệt công bố kèm giọng kể; được đồng bộ lại bởi `public-audio-sync` |
| `avatars` | Có | `{user_id}/…` (`profiles.avatar_path`) | Ảnh đại diện hồ sơ, ≤ 2 MB |

Xuất dữ liệu cho gia đình: `/gia-dinh/du-lieu` → Xuất dữ liệu (`apps/web/src/features/settings/exportData.ts`). Tệp JSON `format = di-san-song.family-export`, `version = 1`, gồm `families`, `narrators`, `stories`, `story_versions`, `story_share_settings`, `recordings`, `transcripts`, `collections`, `collection_items`, `books`, `book_chapters`, `story_photos`, phần `stories_expanded` lồng lịch sử phiên bản, và danh sách `files` là liên kết tải ghi âm/ảnh có chữ ký hết hạn sau 1 giờ. Tệp chỉ chứa những gì người xuất được phép đọc.

## Hạn mức và ngân sách AI
- Hạn mức theo người dùng / ngày (giờ Việt Nam), lưu ở `ai_quota`: `AI_DAILY_LIMIT` (mặc định 30 lượt chép lời + soạn nháp) và `TTS_DAILY_LIMIT` (mặc định 60 lượt đọc câu hỏi). Hỏi đáp kho tri thức: `KNOWLEDGE_RATE_PER_MIN` (10) và `KNOWLEDGE_DAILY_CAP` (1 000), giữ trong bộ nhớ Edge Function. Đặt bằng `supabase secrets set` hoặc secret GitHub cùng tên (job `functions` chỉ đẩy secret có giá trị).
- Gemini lỗi liên tục: ngắt mạch 5 lỗi / 60 giây, tạm ngừng 60 giây; bản ghi được giữ và người dùng thấy nút thử lại.
- Theo dõi chi phí: `/quan-tri` → Số liệu (lượt gọi AI, lỗi, độ trễ, dung lượng 30 ngày, xuất CSV) và trang usage/billing của Google AI Studio. Đặt giới hạn chi tiêu hoặc cảnh báo ngân sách ở phía nhà cung cấp; hệ thống không tự biết số tiền đã tiêu.
- Hết hạn mức thì bản ghi vẫn được lưu và xử lý lại sau; không có lệnh nào xoá bản ghi vì hết lượt.

## Xử lý sự cố
| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `check-public-env` fail ở `build` | Thiếu variable `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, có `VITE_*` lạ, hoặc dán nhầm secret key. |
| `migrate`: `Thiếu secret SUPABASE_DB_URL` | Đặt secret trong environment `production` (không phải repo secrets). |
| `migrate`: timeout / `network is unreachable` | Đang dùng host `db.<ref>.supabase.co` (IPv6). Đổi sang URL session pooler. |
| `migrate`: `password authentication failed` / `Tenant or user not found` | Mật khẩu chưa URL-encode, user phải là `postgres.<ref>` với pooler, hoặc sai region. |
| `db push` từ chối migration số nhỏ hơn | Đổi tên file (khi chưa deploy) cho số lớn hơn migration cuối đã áp. |
| `check-migrations-immutable` fail | Đã sửa migration đã deploy hoặc tên file sai: hoàn tác, tạo migration mới. |
| Job `functions` chỉ in notice "Bỏ qua deploy" | Chưa có `SUPABASE_ACCESS_TOKEN`; thêm rồi chạy tay Deploy với `functions = true`. |
| AI trả `ai_unavailable` | Thiếu `GEMINI_API_KEY`/`GEMINI_MODEL` trên Supabase secrets, hoặc Google đang quá tải. Lý do cụ thể nằm ở `ai_jobs.error` (Quản trị → Tác vụ AI lỗi), ví dụ `gemini unavailable 503 … high demand`. Hệ thống tự thử lại 3 lần (1s, 2s, 4s); người kể bấm "Thử lại" sẽ dùng lại bản chép lời đã có. Có thể đặt thêm secret `GEMINI_FALLBACK_MODEL` để thử một model khác khi model chính vẫn quá tải. |
| Deep link trên Pages trả 404 trắng | `404.html` phải có trong `dist` (plugin `spaFallback` ở `apps/web/vite.config.ts`) và `VITE_BASE_PATH` khớp tên repo (phân biệt hoa/thường). |
| Magic link / đăng nhập chuyển về localhost | Sửa Site URL và Redirect URLs trên Supabase Auth. |
| `deploy-pages` lỗi 404 / not enabled | Pages chưa bật Source = GitHub Actions (bước 2). |
| gitleaks fail | Rotate secret trước, rồi gỡ khỏi code; chỉ `.env.example`/`.env.e2e` được allowlist. |
