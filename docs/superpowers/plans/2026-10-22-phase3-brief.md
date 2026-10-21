# Phase 3 brief: shared rules for workstreams P1 to P5

Branch: `feat/phase-3`. The repo is `D:/Code/Tuyen/Living_Heritage`.

## What to read first

1. `docs/superpowers/plans/2026-10-21-phase2-brief.md`, in full. Its foundation table, DB facts and Rules 1–9 all still apply.
2. The new migration `supabase/migrations/20261022000100_phase3.sql`. It has already been pushed to the hosted DB, and `packages/shared/src/database.types.ts` has been regenerated from it.

## New schema (already live)

### `narrators` table: new columns
| Column | Type | Meaning |
|---|---|---|
| `relation` | text, ≤60 chars | Relation to the family, e.g. "Bà nội". |
| `lang` | `'vi'` \| `'en'`, default `'vi'` | The language the narrator speaks. The AI must transcribe and draft in this language, not in the UI language. |
| `generation` | smallint, 1..6 | Generation level for the family tree. 1 is the oldest. |

Authenticated users can insert and update all three columns, within the existing row-level security (RLS).

### `story_photos` table
- Columns: `id`, `story_id`, `family_id`, `storage_path`, `caption`, `position`, `created_by`, `created_at`.
- Photo files live in bucket `media` at path `{family_id}/{uuid}.{ext}`. The existing media policies apply: editors upload, members read, owner/manager delete.
- Reading a photo row requires `can_read_story(story_id)`.
- Inserting, updating or deleting requires `can_write_story(story_id)`.
- Insert grants cover `story_id`, `family_id`, `storage_path`, `caption`, `position`. Update grants cover `caption`, `position`.
- Show images through `storage.from('media').createSignedUrl(path, 3600)`.

### `public_items` table: new columns
- `embedding vector(768)` and `embedded_at`. Only the service role writes them.
- A trigger clears the embedding whenever the title, summary, body or fields change.

### RPC `match_public_items`
- Signature: `match_public_items(p_embedding vector(768), p_limit int = 6, p_min_similarity float = 0.5)`.
- Returns: `{id, kind, title, summary, body, fields, topic_slug, narrator_label, region, decade, similarity}`.
- Can be called by **service_role and authenticated only**, never anon. Browsers must reach it through the `knowledge-ask` Edge Function.

### Edge Functions
- Already registered in `supabase/config.toml`:
  - `knowledge-ask`: `verify_jwt = false`, because anonymous visitors call it. Rate-limit inside the function.
  - `question-tts`: `verify_jwt = true`.
- `deploy.yml` deploys every `supabase/functions/*/index.ts`.
- CI runs `deno check */index.ts`, `deno lint` and `deno test --allow-env` inside `supabase/functions`.
- Deno is not installed. Run it with `npx -y deno@2 …`.
- Copy the existing function structure (`ai-process`, `public-audio-sync`):
  - `index.ts` handles wiring only.
  - `handler.ts` holds the logic, with dependency injection.
  - `lib/` holds helpers.
  - Tests go in `*_test.ts` and use `import assert from 'node:assert/strict'`.
  - Shared code is in `_shared/`.

### Lead-provided scaffolding
- New i18n namespaces `settings` and `media`.
- New route areas `routes/settings/index.ts` and `routes/media/index.ts`, already registered in the router.
- AppShell navigation now links to `/gia-dinh/album`, `/gia-dinh/cay-gia-dinh` and `/cai-dat`, and shows Admin only to admins.
- `@playwright/test` is installed in `apps/web`.

## Product rules (from DỰ ÁN.md)
- The narrator approves first, and everything is private by default.
- Never invent content. AI answers must cite their public sources and say so when nothing is found.
- No fake data unless it is labelled.
- Accessibility rules as in Phase 2.

## Process
- Other agents are working in other folders of the same tree at the same time.
- Never run git `add`, `commit`, `stash`, `reset` or `checkout`.
- Never add dependencies.
- Never touch `.env`.
- When you finish, report: the files you changed, test results, and any requests outside your ownership.
