# Phase 2 brief — shared rules for workstreams E1, E2, F1, F2, G

Project: `D:/Code/Tuyen/Living_Heritage`, the "Di Sản Sống / Living Heritage" web app (React 19 + Vite + Tailwind v4 + motion + react-router 8 + supabase-js), bilingual vi (default) / en. Supabase is LIVE: the migrations are already pushed to project `dfohmtznhercbhutvyag` and `.env` has the URL and publishable key.

Read before coding:
- `docs/superpowers/specs/2026-10-21-living-heritage-mvp-design.md`: §6 routes, §7 data, §10 errors.
- `DỰ ÁN.md`, Phụ lục B. Product rules: narrator approves first, private by default, honest labels, empty and error states as in B16.
- `packages/shared/src/database.types.ts` (generated) and `supabase/migrations/*.sql`: the source of truth for table, column and RPC names.

## Foundation you must use (do not modify)

| What | Where | How to use |
| --- | --- | --- |
| i18n | `@/i18n` | `const t = useT('<your ns>')`; `usePick()` for `{vi,en}` data; `useLocale()`. Keys go only in YOUR `i18n/dict/<ns>.vi.ts` (source, `as const`) and `<ns>.en.ts` (`satisfies Shape<typeof vi>`). Write natural, polished copy in both languages. |
| Routes | `routes/types.ts` (`AreaRoutes`, `page()`) | Fill your area file. `site` = public layout, `app` = signed-in family layout (`AppShell`, sidebar), `narrator` = large-text storytelling layout, `bare` = no layout. Paths have no leading slash. |
| Session | `@/lib/session` | `useSession()` → `{user, loading, isAnonymous}`; `RequireAuth`. The AppShell and NarratorShell layouts already guard their routes. |
| Supabase | `@/lib/supabase` | `getSupabase()` / `requireSupabase()` → typed `SupabaseClient<Database>`. |
| Family context | `@/features/families/current` | `useCurrentFamily()` → `{families, current:{id,name,role}, loading, select, reload, canEdit, canManage}`. Already mounted in `App.tsx`. |
| AI client | `@/features/ai/client` | `transcribeAndDraft(recordingId, lang)`, `suggestQuestions(narratorId, topicId, lang)`, `AiError`, `aiErrorKey(e)`. |
| UI primitives | `@/components/ui` | Button, ButtonLink, buttonClasses, Badge, Card, Field/Input/Textarea/Select, Dialog, Tabs/TabList/Tab/TabPanel, useToast, Skeleton, EmptyState, Spinner, AudioPlayer, QrCode, IllustrativeBadge. Read `components/ui/index.ts` and each component's props before use. Workstream C may still be polishing them; if an API is missing, compose locally inside your own folder and report it. |
| Motion | `@/components/motion` | WordsPullUp, Reveal, … |
| Utilities | `@/lib/format`, `@/lib/cn`, `@/lib/env` | `formatDuration`, `formatDate`, `stripDiacritics`; `cn`; `env.siteUrl`, `siteHref(path)`. |
| Design tokens | Tailwind classes | `bg-cream`, `bg-paper`, `text-ink`, `text-ink-soft`, `bg-heritage`, `text-heritage-deep`, `text-terracotta`, `bg-mint`, `border-line`, `bg-night`, `font-serif`, `font-hand`. Body is 18px. Buttons are at least 48px tall (56px in narrator mode). |

## Database facts (from workstream A)

### RPCs
All raise short error codes in `error.message`. Map them with `t()`.

| RPC | Returns | Notes |
| --- | --- | --- |
| `create_family({name})` | uuid | |
| `create_family_invite({p_family, p_email, p_role, p_relation, p_ttl_days})` | raw token | Owner/manager only. |
| `accept_invite({p_token})` | family_id | Caller's email must match the invite. |
| `create_narrator_link({p_narrator, p_ttl_days})` | raw 32-char token | Shown once. |
| `claim_narrator_link({p_token})` | narrator_id | |
| `revoke_narrator_link({p_link})` | | |
| `save_story_draft({p_story, p_title, p_summary, p_body, p_fields})` | version | Sets status to pending_review and auto-withdraws the public copy. |
| `approve_story({p_story, p_assisted_consent})` | version | |
| `preview_public_item({p_story})` | jsonb | The exact public snapshot. |
| `request_publish({p_story})` | uuid | |
| `review_publish({p_request, p_approve, p_note})` | | Admin only. |
| `withdraw_public({p_story})` | | |
| `search_public({q, p_topic, p_kind, p_region, p_decade, lim, off})` | public_items rows | Anon OK; matches with or without Vietnamese diacritics. |

**Helpers:** `is_family_member`, `family_role`, `is_narrator_user({nid})`, `is_admin()`, `is_family_editor`, `can_read_story`, `can_write_story`.

**Error codes:** not_authenticated, forbidden, not_found, not_narrator, story_not_approved, request_not_pending, link_not_found, link_expired, link_revoked, link_already_claimed, invite_*, anonymous_not_allowed, invalid_*.

### Narrator link flow
1. Open `/k/:token`.
2. Call `signInAnonymously()`, then `claim_narrator_link`.
3. The narrator user is **not** a family member. They can read their own narrator row and the family name. They can create sessions, recordings and stories only for their own narrator.

### Recording upload
1. Insert `sessions {family_id?, narrator_id, topic_id, started_by}`. Check the columns in the types.
2. Upload to bucket `recordings` at path `{family_id}/{narrator_id}/{uuid}.webm` (exactly three segments).
3. Insert `recordings {family_id, narrator_id, session_id, question_id, storage_path (no bucket prefix), duration_s, mime, size_bytes}`.
4. Call `transcribeAndDraft`. The function responds synchronously with `story_ids` (1 story, plus 1 experience when present). Jobs are readable from `ai_jobs`.

### Visibility
- Viewers see only stories with visibility `family` or `public`.
- owner, manager, editor and the narrator user see everything in their scope.
- Content edits go ONLY through `save_story_draft`. Direct updates are allowed only on `visibility` (private/family) and `topic_id`.

### Approval
- "Xác nhận đúng ý tôi" appears only for the narrator user: `narrators.user_id === session user`, or `rpc('is_narrator_user', {nid})`.
- If the narrator has no bound device, an owner/manager may approve with `p_assisted_consent: true`, after an explicit consent checkbox.

### Share settings
- Table `story_share_settings {story_id, show_audio, show_real_name, show_region, show_photos}`.
- Switching a setting OFF on a public story applies immediately.
- Switching a setting ON requires a new `request_publish`.

### public_items
- Never contains family_id or narrator_id.
- Has `narrator_label`, `topic_slug`, `audio_allowed`, `audio_path` (bucket `public-audio`, public URL via `storage.from('public-audio').getPublicUrl`).
- `reports` accepts anon inserts: `{public_item_id, reason ∈ inaccurate|unsafe|privacy|copyright|offensive|other, note}`.
- `connect_requests` accepts signed-in inserts only, including anonymous sessions: `{public_item_id, name, contact, message}`.

### Audio and admin
- Private audio: `storage.from('recordings').createSignedUrl(path, 3600)`.
- Admins are flagged in `profiles.is_admin`. Check with `rpc('is_admin')`.

## Rules

1. Edit ONLY the files listed in your ownership. Other agents are editing other folders of the same working tree right now.
2. Never run `git add`, `commit`, `stash`, `checkout` or `reset`. The lead commits.
3. Never add npm dependencies. Never touch `.env`. Never write to the hosted DB except through the app's normal user flows; manual test accounts are allowed.
4. Use every user-visible string through `t()`. No fake stats or testimonials. Illustrative data must be labelled.
5. **Accessibility:** labels on every field, visible focus, aria-live for async status, keyboard operable controls, honour `prefers-reduced-motion`, no horizontal scroll at 360px.
6. **States:** every page handles loading (Skeleton), empty (EmptyState with one clear action), error (message + retry), not-configured (`getSupabase()` null → friendly notice) and forbidden.
7. **Tests:** colocated `*.test.ts(x)` for your pure logic and key components. Mock supabase with a small fake object; no network in tests.
8. **Before reporting:**
   - Run `pnpm --filter @lh/web typecheck`, `pnpm --filter @lh/web test` and `pnpm lint` from the repo root.
   - Fix all errors in YOUR files. Errors in files you do not own are not yours; list them in your report.
   - Run `pnpm build` once at the end.
9. **Final report** (concise): routes added, files, exported hooks/components others may use, test results, and any change you need outside your ownership (do not make it yourself).
