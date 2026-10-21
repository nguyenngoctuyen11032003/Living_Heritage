# Deploy — GitHub Actions + GitHub Pages + Supabase

Không có server riêng. Web tĩnh trên GitHub Pages (`https://nguyenngoctuyen11032003.github.io/Living_Heritage/`), dữ liệu và Edge Function trên Supabase hosted (project ref `dfohmtznhercbhutvyag`, region Singapore).

```text
Pull Request ──► CI (.github/workflows/ci.yml)
                  ├─ web:       check-public-env → check-migrations-immutable → test scripts → lint → typecheck → test → build → check-bundle-secrets
                  ├─ secrets:   gitleaks (bản ghim + sha256) quét toàn bộ lịch sử Git với .gitleaks.toml
                  ├─ functions: deno check ai-process/index.ts → deno lint → deno test --allow-env
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
