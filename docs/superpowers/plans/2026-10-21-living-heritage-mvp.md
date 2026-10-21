# Di Sản Sống MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bilingual (vi/en) Di Sản Sống web product on Supabase + Gemini, deployed to GitHub Pages, per [spec](../specs/2026-10-21-living-heritage-mvp-design.md).

**Architecture:** pnpm monorepo copied from Linguo conventions (`D:/Code/Tuyen/Linguo`). React SPA in `apps/web` talks to Supabase through RLS. AI runs only in the Edge Function `ai-process`. Work is split into workstreams that each **own disjoint file sets**. Shared contracts (DB names, i18n API, route registry, tokens) are fixed in Phase 0, before any parallel work starts.

**Tech Stack:**
- Front end: React 19, Vite 8, Tailwind v4 (`@tailwindcss/vite`), motion, react-router 8, lucide-react, zod 4, @supabase/supabase-js 2, @fontsource (be-vietnam-pro, noto-serif, caveat), qrcode
- Tests: Vitest + happy-dom
- Backend: Supabase CLI 2.120, Deno 2 Edge Functions, pgTAP

---

## Ground rules for every agent

1. **Only edit files inside your ownership list.** If you need a change elsewhere, stop and report it in your final message. Never edit it yourself.
2. **Supabase:**
   - Never run `supabase db reset`, `config push` or `seed` against the hosted project.
   - Only Workstream A may run `supabase db push`.
   - Never print or commit secrets. Secret values live in `D:/Code/Tuyen/Living_Heritage/.env`, which is gitignored.
3. **Text:** all user-visible text goes through `t()` with keys in **your own** dictionary namespace files. Do not hardcode text.
4. **Before reporting done:** run `pnpm --filter @lh/web typecheck`, `pnpm --filter @lh/web test` and `pnpm lint` for your files.
5. **Commits:** commit only your files with `git add <your paths>` (never `git add -A`). End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
6. **Honest data:**
   - No fake stats, testimonials or logos.
   - Sample data is labelled `Dữ liệu minh họa / Illustrative data`.
   - No remote images or videos from third-party CDNs.

---

## Phase 0 — Foundation and contracts (lead agent, sequential)

### Task 0.1: Monorepo scaffold
**Files:**
- Root files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.nvmrc`, `.npmrc`, `.gitignore`, `.env.example`, `.env.e2e`, `.gitleaks.toml`, `README.md`
- `apps/web/{package.json,index.html,vite.config.ts,tsconfig*.json}`
- `packages/shared/{package.json,tsconfig.json,src/index.ts}`

- [ ] Copy the configs from Linguo and rename the scope `@linguo` → `@lh`.
- [ ] Drop PWA, push and content scripts.
- [ ] Set `base` from `VITE_BASE_PATH` and keep `spaFallback` (copies index.html to 404.html).
- [ ] Run `pnpm install && pnpm --filter @lh/web build`. Expected: the build succeeds.
- [ ] Commit.

### Task 0.2: Design tokens, fonts, global CSS
**Files:** `apps/web/src/design/{tokens.css,fonts.css,global.css,motion.ts}`

- [ ] Tokens: use the exact values from spec §5. Expose them through `@theme inline` as `--color-cream`, `--color-ink`, `--color-ink-soft`, `--color-heritage`, `--color-heritage-deep`, `--color-terracotta`, `--color-mint`, `--color-line`, `--color-night`, `--color-night-card`, `--color-night-ink`, `--color-paper`, plus `--font-sans` (Be Vietnam Pro), `--font-serif` (Noto Serif) and `--font-hand` (Caveat).
- [ ] Add the utility classes `.noise-overlay` and `.bg-noise`.
- [ ] Add the text scale `[data-text-scale="115"|"130"]` on `html`.
- [ ] `motion.ts` exports `EASE_OUT = [0.16,1,0.3,1]`, `EASE_CARD = [0.22,1,0.36,1]` and `useReducedMotionSafe()`.

### Task 0.3: i18n contract
**Files:** `apps/web/src/i18n/{index.ts,LocaleProvider.tsx,useT.ts,types.ts}`, `apps/web/src/i18n/dict/<ns>.vi.ts` and `<ns>.en.ts`

- [ ] Create these namespaces, each owned by one workstream:

| Namespace | Owner |
| --- | --- |
| `common` | lead |
| `landing` | C |
| `auth` | E |
| `narrator` | E |
| `family` | E |
| `review` | F |
| `vault` | F |
| `books` | F |
| `knowledge` | G |
| `admin` | G |
| `legal` | C |

- [ ] Contract:
```ts
// each <ns>.vi.ts:  export default { ... } as const
// each <ns>.en.ts:  import type vi from './<ns>.vi'; export default { ... } satisfies Shape<typeof vi>
type Locale = 'vi' | 'en'
useT(ns): (key: DotPath<Dict[ns]>, vars?: Record<string, string|number>) => string
useLocale(): { locale: Locale; setLocale(l: Locale): void }
```
`Shape<T>` maps every leaf string to `string`, so a missing key in `en` is a type error.
- [ ] Test `i18n/i18n.test.ts`:
  - `t('hero.title')` returns the vi text, then the en text after `setLocale('en')`.
  - `{n}` interpolation works.
  - `<html lang>` updates.
  - The locale persists in localStorage under `lh.locale`.

### Task 0.4: Route registry
**Files:** `apps/web/src/app/{main.tsx,App.tsx,router.tsx}`, `apps/web/src/routes/<area>/index.ts`

Areas: `landing` (C), `auth` (E), `narrator` (E), `family` (E + F, see below), `knowledge` (G), `books` (F), `admin` (G).
- [ ] Each `routes/<area>/index.ts` exports `routes: RouteObject[]`, using `lazy` page modules. `router.tsx` concatenates them.
- [ ] Shared area `family`: E owns `routes/family/members.ts` and `narrators.ts`; F owns `routes/family/vault.ts`. The lead creates `routes/family/index.ts`, which concatenates the three.
- [ ] Lead creates the shells `components/layout/{SiteHeader,SiteFooter,AppShell,NarratorShell}.tsx` (C restyles SiteHeader/SiteFooter only) and `routes/NotFound.tsx`.

### Task 0.5: Supabase client and env
**Files:** `apps/web/src/lib/{env.ts,supabase.ts,cn.ts,format.ts}`, `supabase/config.toml`

- [ ] `getSupabase()` returns a singleton `SupabaseClient<Database>` built with `{auth:{flowType:'pkce'}}`.
- [ ] `config.toml`: `project_id="living-heritage"`, `[auth] enable_anonymous_sign_ins=true`, site_url `http://localhost:5173`, `[functions.ai-process] verify_jwt=true`.

### Task 0.6: Shared DB contract (names only)
**Files:** `packages/shared/src/{constants.ts,ai-contract.ts,database.types.ts}`

- [ ] `constants.ts`:
  - enums exactly as spec §7
  - `TOPIC_SLUGS = ['tuoi-tho','gia-dinh','que-huong','nghe-nghiep','mon-an','lam-vuon']`
  - `MAX_RECORDING_SECONDS = 600`
  - `MAX_AUDIO_BYTES = 20*1024*1024`
- [ ] `ai-contract.ts`: zod `AiRequest` (discriminated on `action`), `AiDraft`, `AiErrorCode`, as in spec §8.
- [ ] `database.types.ts`: a placeholder `Database` type. A regenerates it in Task A.6.

**Phase 0 exit:** build, typecheck, lint and test are green. Commit `chore: foundation`.

---

## Phase 1 — parallel (A, B, C, D)

### Workstream A — Database (owns `supabase/migrations/**`, `supabase/tests/**`, `supabase/seed.sql`, `supabase/migrations-applied.json`, `packages/shared/src/database.types.ts`)

- **A.1** `20261021000100_core.sql`:
  - extensions `unaccent`, `pg_trgm`
  - enums
  - tables `profiles`, `families`, `family_members`, `family_invites`, `narrators`, `narrator_links`, `topics`, `questions`
  - trigger that creates a profile on new auth user
  - helper functions `is_family_member`, `family_role`, `is_narrator_user`, `is_admin` (security definer, `set search_path = ''`)
  - RLS policies
  - RPCs `create_family`, `create_narrator_link(narrator uuid, ttl_days int default 30) returns text` (raw token; only the sha256 is stored), `claim_narrator_link(token text)`, `revoke_narrator_link`, `accept_invite`
- **A.2** `20261021000200_content.sql`:
  - tables `sessions`, `recordings`, `transcripts`, `stories`, `story_versions`, `story_share_settings`, `audit_log`, `collections`, `collection_items`
  - RPCs `save_story_draft(story uuid, title text, body text, fields jsonb)` (creates a version, sets `edit_status='pending_review'`, auto-withdraws from public and logs it) and `approve_story(story uuid)` (only `is_narrator_user(narrator_id)`, or an editor with `narrators.user_id is null` and a recorded assisted consent)
  - Storage bucket `recordings` (private) with policies keyed on the first path segment, which is `family_id`
- **A.3** `20261021000300_public.sql`:
  - tables `publish_requests`, `public_items` (with `search_tsv` generated from `unaccent(title||summary||body)`; GIN plus trigram index)
  - RPCs `request_publish`, `review_publish` (admin), `withdraw_public`, and `search_public(q text, topic text, kind story_kind, region text, decade int, lim int, off int)`
  - bucket `public-audio` (public read)
  - tables `connect_requests`, `reports`, `deletion_requests`
- **A.4** `20261021000400_ai.sql`:
  - tables `ai_jobs` (unique `recording_id, kind`), `ai_quota`, `ai_usage`
  - RPCs `ai_quota_consume(uid, limit)` and `ai_quota_refund(uid)` (service role only)
- **A.5** pgTAP tests in `supabase/tests/`:
  - `rls_cross_family.test.sql` (NT07)
  - `publish_flow.test.sql` (NT06, NT09)
  - `audio_privacy.test.sql` (NT08)
  - `approve_only_narrator.test.sql`
  - `narrator_link.test.sql` (expired, revoked, claimed twice)
  - `search_unaccent.test.sql` (searching `cham cay` finds `chăm cây`)
- **A.6** `seed.sql`: bilingual topics and questions (6 topics × 5 questions). Push to the hosted DB with `supabase link --project-ref dfohmtznhercbhutvyag` and `supabase db push` (password from `.env`, never echoed). Seed topics and questions through a migration `20261021000500_seed_topics.sql`, because seed.sql never runs on the hosted DB. Regenerate `database.types.ts` with `supabase gen types typescript --project-id dfohmtznhercbhutvyag` (needs `SUPABASE_ACCESS_TOKEN`). If that is unavailable, hand-write the types to match the migrations exactly. Record the checksums.

### Workstream B — Edge Function (owns `supabase/functions/**`)

- **B.1** `functions/deno.json`, `_shared/{cors.ts,ai-contract.ts (synced copy),supabase.ts}`.
- **B.2** `ai-process/lib/gemini.ts`:
  - `transcribe(audio: Uint8Array, mime, lang)` and `draft(transcript, lang, topic)`
  - REST `generateContent` with `x-goog-api-key`, model from `GEMINI_MODEL`
  - `responseMimeType: application/json` + `responseSchema`
  - timeout via `GEMINI_TIMEOUT_MS`
- **B.3** `ai-process/handler.ts` (dependency-injected): auth → load recording under the user's RLS client → upsert `ai_jobs` (idempotent) → quota consume → download from Storage → transcribe → save transcript → draft → insert stories as drafts → job `done`. On error: refund quota and set job `error` with the code.
- **B.4** `ai-process/handler_test.ts`:
  - success
  - quota_exceeded
  - Gemini 500 → refund + error
  - forbidden recording
  - duplicate call returns the existing job
  - audio_too_large
- **B.5** `suggest_questions` action: returns 3 follow-up questions in the narrator's language.

### Workstream C — Design system and landing (owns `apps/web/src/components/{ui,motion,landing,illustrations}/**`, `routes/landing/**`, `routes/legal/**`, `i18n/dict/landing.*`, `i18n/dict/legal.*`, restyle of `components/layout/SiteHeader.tsx` and `SiteFooter.tsx`)

- **C.1** UI primitives:
  - `Button` (variants primary/secondary/ghost/dark, sizes md/lg/xl)
  - `Badge`, `Card`, `Input`, `Textarea`, `Select`, `Dialog`, `Tabs`, `Toast`, `Skeleton`, `EmptyState`, `LanguageSwitch`, `TextScaleSwitch`
  - `AudioPlayer` (play/pause, seek, time, keyboard, transcript highlight callback)
  - Tests for Tabs keyboard navigation and AudioPlayer time formatting.
- **C.2** Motion: `WordsPullUp`, `WordsPullUpMultiStyle`, `ScrollRevealText`, `HandNote` (Caveat, rotation), `DrawArrow` (SVG stroke draw).
- **C.3** `CurvedCarousel`:
  - pure geometry function `cardGeometry(x, frame)` per spec (d, width, edge heights q^2.6, vertical centre, pushed x)
  - rAF loop, drag with momentum decay of 95%/s, reduced-motion = static row
  - Unit tests for the geometry: centre card is 170×280; edge height ≈ 372.
- **C.4** Landing sections 1–13 from spec §6.1, all bilingual. Sample stories in `landing/sample-data.ts` with `vi`/`en`. SVG illustrations per topic.
- **C.5** Static pages: `/cach-hoat-dong`, `/goi-dich-vu`, `/to-chuc`, `/quyen-rieng-tu`, `/dieu-khoan`.

### Workstream D — CI/CD, scripts, docs (owns `.github/**`, `scripts/**`, `docs/{SETUP,DEPLOY,FEATURES}.md`)

- **D.1** Scripts adapted from Linguo, each with `node --test` tests: `check-public-env.mjs`, `check-bundle-secrets.mjs`, `check-migrations-immutable.mjs`.
- **D.2** `ci.yml` (web, secrets, functions, database jobs) and `deploy.yml` (verify → changes → migrate → functions → build → pages), actions pinned by SHA as in Linguo.
- **D.3** Docs: SETUP, DEPLOY (secrets/vars table) and FEATURES (route → file map).
- **D.4** With `gh`, set the repo variables `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` and `VITE_BASE_PATH`. Create the `production` environment. Set the secret `SUPABASE_DB_PASSWORD` from `.env` via stdin. Enable Pages with `build_type=workflow`. Report which secrets the user must still add (`SUPABASE_ACCESS_TOKEN`, `GEMINI_MODEL`).

---

## Phase 2 — parallel (E, F, G), after A.6 and C.1

### Workstream E — Auth, family, narrator mode (owns `features/{auth,families,narrators,storytelling}/**`, `routes/{auth,narrator}/**`, `routes/family/{members,narrators}.ts` + pages, `i18n/dict/{auth,narrator,family}.*`)

- **E.1** Auth pages: `/dang-nhap`, `/dang-ky`, `/auth/callback`. `useSession()` hook and `RequireAuth` guard.
- **E.2** Family onboarding (`create_family`), members and invites, narrators CRUD, narrator link creation with QR (`qrcode`) and revoke.
- **E.3** `/k/:token`: `signInAnonymously` → `claim_narrator_link` → redirect to `/ke-chuyen`. Error states: expired or revoked.
- **E.4** Recorder service `features/storytelling/recorder.ts` (MediaRecorder, pause/resume, 600 s cap, IndexedDB backup, upload to `recordings/{family}/{narrator}/{uuid}.webm`) with tests using a fake MediaRecorder.
- **E.5** Narrator UI:
  - topic picker (6 + "Chưa biết kể gì")
  - session screen: big question, speechSynthesis "Nghe câu hỏi", record button, keep / re-record / next, skip / end
  - on keep: insert recording → `functions.invoke('ai-process')` → navigate to `/ban-nhap/:storyOrRecordingId` with a processing state

### Workstream F — Review, vault, sharing, books (owns `features/{review,vault,sharing,books}/**`, `routes/family/vault.ts` + pages, `routes/books/**`, `i18n/dict/{review,vault,books}.*`)

- **F.1** `/ban-nhap/:id`:
  - polls `ai_jobs` (Realtime optional) with step labels
  - dual panel: source audio + transcript with `[?]` highlighted, and the draft editor (story fields or experience fields)
  - version history
  - "Xác nhận đúng ý tôi" calls `approve_story`, shown only when `is_narrator_user`; otherwise "Gửi người kể duyệt"
  - `save_story_draft`
- **F.2** `/gia-dinh` vault: search, filters, cards, empty state. `/cau-chuyen/:id` detail, using a signed URL for audio.
- **F.3** Sharing dialog: Chỉ mình tôi / Gia đình / Đề nghị công bố, plus toggles for audio, real name, region and photos, an exact preview, and `request_publish` / `withdraw_public`.
- **F.4** Books `/sach`, `/sach/:id`: choose approved stories, order chapters, cover, flip preview, print CSS, QR per chapter → `${siteUrl}/nghe/:storyId`.

### Workstream G — Knowledge hub and admin (owns `features/{knowledge,admin}/**`, `routes/{knowledge,admin}/**`, `i18n/dict/{knowledge,admin}.*`)

- **G.1** `/kham-pha`:
  - `search_public` with debounced query, filters, magazine cards, pagination, no-results suggestions
  - when the DB is empty, show illustrative items clearly labelled
- **G.2** `/tri-thuc/:id`: player only when `audio_allowed`; experience sections; "Chưa có thông tin" for empty fields; Save (local), Report (`reports`) and Connect (`connect_requests` form).
- **G.3** `/nghe/:storyId`: public item audio, or the family audio when the viewer is a member, otherwise a safe message.
- **G.4** `/quan-tri` (requires `is_admin`): publish requests queue with preview and approve/reject, reports, deletion requests, failed AI jobs.

---

## Phase 3 — Integration (lead)

- [ ] Merge the reported cross-boundary requests.
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:bundle`. Expected: all green.
- [ ] Manual check with `pnpm dev`: the landing page in vi and en; the full flow against the hosted Supabase.
- [ ] Update README, push `main`, watch the Deploy run, and verify the Pages URL.

## Self-review notes

- Spec §6 routes map to: C (landing/static), E (auth, k, ke-chuyen), F (ban-nhap, gia-dinh, cau-chuyen, sach), G (kham-pha, tri-thuc, nghe, quan-tri).
- Spec §7 RPCs are all in A.1–A.4. Spec §8 is in B. Spec §11 is in D. Spec §12 tests are in A.5, B.4, C.1/C.3 and E.4.
