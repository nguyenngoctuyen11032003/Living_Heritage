// E2E fixtures: a small in-memory fake of the Supabase REST / RPC / Storage / Functions / Auth APIs.
// The e2e build (vite --mode e2e, root .env.e2e) points supabase-js at https://e2e.invalid; mockSupabase()
// answers every request to that origin with page.route(), so specs never touch a real backend.
//
// The fake PostgREST understands what the app actually sends: eq/neq/in/is/ilike/gt(e)/lt(e) filters, `or=(…)`,
// order/limit/offset, single-object Accept headers, `Prefer: count=exact` (+ HEAD), embedded resources
// (`families(name)`, `book_chapters(count)`), insert/upsert/update/delete. Rows are fixture data for one family
// ("Nhà họ Nguyễn") — they only ever exist inside the test browser.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type Page, type Request, type Route } from '@playwright/test';

export const SUPABASE_URL = 'https://e2e.invalid';
const STORAGE_KEY = 'lh-auth'; // src/lib/supabase.ts storageKey
const LOCALE_KEY = 'lh.locale'; // src/i18n/LocaleProvider.tsx
const NARRATOR_KEY = 'lh.narratorId'; // features/storytelling/data.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type Db = Record<string, Row[]>;

// ---- ids --------------------------------------------------------------------------------------------------
export const IDS = {
  family: 'f0000000-0000-4000-8000-000000000001',
  owner: '11111111-1111-4111-8111-111111111111',
  viewer: '33333333-3333-4333-8333-333333333333',
  narratorUser: '22222222-2222-4222-8222-222222222222',
  narratorBa: 'c0000000-0000-4000-8000-000000000001',
  narratorOng: 'c0000000-0000-4000-8000-000000000002',
  session1: 'd0000000-0000-4000-8000-000000000001',
  session2: 'd0000000-0000-4000-8000-000000000002',
  rec1: 'e0000000-0000-4000-8000-000000000001',
  rec2: 'e0000000-0000-4000-8000-000000000002',
  rec3: 'e0000000-0000-4000-8000-000000000003',
  /** approved family story (Bà) */
  storyTet: '50000000-0000-4000-8000-000000000001',
  /** experience card from the same recording (Bà), pending review */
  storyBanhChung: '50000000-0000-4000-8000-000000000002',
  /** pending-review story with [?] markers in its transcript (Bà) */
  storyHarvest: '50000000-0000-4000-8000-000000000003',
  /** approved + public story (Ông) */
  storyBike: '50000000-0000-4000-8000-000000000004',
  pubBike: '90000000-0000-4000-8000-000000000001',
  pubTuongBan: '90000000-0000-4000-8000-000000000002',
  pubCho: '90000000-0000-4000-8000-000000000003',
  pubRauMuong: '90000000-0000-4000-8000-000000000004',
  collection: '70000000-0000-4000-8000-000000000001',
  book: '80000000-0000-4000-8000-000000000001',
  photo: '60000000-0000-4000-8000-000000000001',
  link: '40000000-0000-4000-8000-000000000001',
  /** A syntactically valid 32-char narrator link token */
  linkToken: 'Zk3pQ9vR2xT7mW4bN8cY1dF6gH5jL0sA',
} as const;

// ---- topics + questions: parsed from the seed migration so they always match the DB -----------------------
const SEED = readFileSync(fileURLToPath(new URL('../../../../supabase/migrations/20261021000500_seed_topics.sql', import.meta.url)), 'utf8');
const TUPLE = /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*\)/g;
const unq = (s: string) => s.replace(/''/g, "'");
const [topicSql = '', questionSql = ''] = SEED.split(/insert into public\.questions/i);
export const TOPICS: Row[] = [...topicSql.matchAll(TUPLE)].map((m) => ({ id: m[1], slug: m[2], title_vi: unq(m[3]!), title_en: unq(m[4]!), icon: m[5], sort: Number(m[6]) }));
export const QUESTIONS: Row[] = [...questionSql.matchAll(TUPLE)].map((m) => ({ id: m[1], topic_id: m[2], prompt_vi: unq(m[3]!), prompt_en: unq(m[4]!), kind_hint: m[5], sort: Number(m[6]) }));
export const topicId = (slug: string) => TOPICS.find((t) => t.slug === slug)?.id as string;

// ---- fixture rows ---------------------------------------------------------------------------------------
const T0 = '2026-09-14T02:30:00Z';
const T1 = '2026-10-02T03:10:00Z';
const T2 = '2026-10-18T08:45:00Z';

export const TRANSCRIPT_HARVEST =
  'Hồi đó cứ đến tháng mười là cả làng ra đồng gặt. Bà nhớ nhất là cái ao sau nhà [?], nước trong veo, ' +
  'tụi nhỏ tắm cả buổi. Ông ngoại hay đan rổ bằng tre ngâm [?] rồi đem ra chợ Đồng Xuân bán. [?] Mỗi lần ' +
  'mất mùa thì cả nhà ăn khoai trừ cơm, vậy mà vẫn vui.';

const EXPERIENCE_FIELDS = {
  skill: 'Gói bánh chưng vuông bằng tay, không cần khuôn',
  context: 'Bà học từ mẹ ở Đông Ngạc, gói mỗi năm vào ngày 28 Tết.',
  conditions: ['Lá dong bánh tẻ, rửa sạch, lau khô', 'Gạo nếp cái hoa vàng ngâm 8 tiếng', 'Đỗ xanh đãi vỏ, thịt ba chỉ ướp tiêu'],
  steps: ['Xếp bốn lá dong thành hình chữ thập', 'Rải một lớp gạo, đặt đỗ và thịt vào giữa', 'Phủ gạo, gấp lá vuông góc rồi buộc lạt chữ thập', 'Luộc liên tục 10 đến 12 tiếng, thêm nước sôi khi cạn'],
  cautions: ['Không buộc lạt quá chặt kẻo bánh nứt', 'Luôn để nước ngập bánh'],
  limits: 'Kinh nghiệm của một gia đình; thời gian luộc tuỳ bếp và cỡ bánh.',
};

function story(overrides: Row): Row {
  return {
    family_id: IDS.family,
    kind: 'story',
    summary: null,
    fields: {},
    lang: 'vi',
    visibility: 'private',
    edit_status: 'pending_review',
    current_version: 1,
    approved_at: null,
    approved_by: null,
    created_by: IDS.owner,
    created_at: T1,
    updated_at: T1,
    ...overrides,
  };
}

/** A fresh copy of the whole fake database. Mutations by one test never leak into another. */
export function seedDb(): Db {
  const stories = [
    story({
      id: IDS.storyTet,
      narrator_id: IDS.narratorBa,
      recording_id: IDS.rec1,
      topic_id: topicId('tuoi-tho'),
      title: 'Tết ở làng Đông Ngạc năm 1955',
      summary: 'Bà kể về những ngày giáp Tết, nồi bánh chưng và tiếng pháo đầu xuân.',
      body: 'Năm ấy bà mới lên mười. Cả nhà thức trắng đêm 28 để canh nồi bánh chưng.\n\nSáng mồng Một, ông cụ thân sinh mặc áo the, dẫn các con đi chúc Tết họ hàng trong làng.',
      edit_status: 'approved',
      visibility: 'family',
      approved_at: T1,
      approved_by: IDS.narratorUser,
      created_at: T0,
    }),
    story({
      id: IDS.storyBanhChung,
      narrator_id: IDS.narratorBa,
      recording_id: IDS.rec1,
      topic_id: topicId('mon-an'),
      kind: 'experience',
      title: 'Cách gói bánh chưng vuông của bà',
      summary: 'Kinh nghiệm gói bánh chưng không cần khuôn, truyền từ mẹ của bà.',
      body: 'Bà gói bánh bằng tay, không dùng khuôn, mỗi năm vào ngày 28 Tết.',
      fields: EXPERIENCE_FIELDS,
      created_at: T0,
    }),
    story({
      id: IDS.storyHarvest,
      narrator_id: IDS.narratorBa,
      recording_id: IDS.rec3,
      topic_id: topicId('que-huong'),
      title: 'Những mùa gặt ở quê',
      summary: null,
      body: 'Hồi đó cứ đến tháng mười là cả làng ra đồng gặt. Bà nhớ nhất là cái ao sau nhà, nước trong veo.\n\nMỗi lần mất mùa thì cả nhà ăn khoai trừ cơm, vậy mà vẫn vui.',
      created_at: T2,
      updated_at: T2,
    }),
    story({
      id: IDS.storyBike,
      narrator_id: IDS.narratorOng,
      recording_id: IDS.rec2,
      topic_id: topicId('nghe-nghiep'),
      title: 'Chiếc xe đạp Phượng Hoàng',
      summary: 'Ông kể về chiếc xe đạp đã chở ông đi dạy học suốt hai mươi năm.',
      body: 'Năm 1978 ông dành dụm ba tháng lương mới mua được chiếc xe đạp Phượng Hoàng.\n\nChiếc xe theo ông qua bao mùa mưa lũ, đến giờ vẫn còn dựng ở hiên nhà.',
      edit_status: 'approved',
      visibility: 'public',
      approved_at: T1,
      approved_by: IDS.owner,
      created_at: T1,
    }),
  ];
  const versions = stories.map((s) => ({
    id: randomUUID(),
    story_id: s.id,
    version: 1,
    created_at: s.created_at,
    created_by: s.created_by,
    edit_status: s.edit_status,
    note: null,
    title: s.title,
    summary: s.summary,
    body: s.body,
    fields: s.fields,
  }));
  const publicItem = (o: Row): Row => ({
    story_id: randomUUID(),
    summary: null,
    fields: {},
    topic_id: o.topic_slug ? topicId(o.topic_slug) : null,
    lang: 'vi',
    region: null,
    decade: null,
    audio_allowed: false,
    audio_path: null,
    embedding: null,
    embedded_at: null,
    published_at: T1,
    updated_at: T1,
    ...o,
  });
  return {
    profiles: [
      { id: IDS.owner, display_name: 'Nguyễn Minh Anh', is_admin: false, locale: 'vi', created_at: T0, updated_at: T0 },
      { id: IDS.viewer, display_name: 'Nguyễn Hoàng Nam', is_admin: false, locale: 'vi', created_at: T0, updated_at: T0 },
    ],
    families: [{ id: IDS.family, name: 'Nhà họ Nguyễn', owner_id: IDS.owner, created_at: T0, updated_at: T0 }],
    family_members: [
      { family_id: IDS.family, user_id: IDS.owner, role: 'owner', relation: 'Cháu nội', created_at: T0 },
      { family_id: IDS.family, user_id: IDS.viewer, role: 'viewer', relation: 'Cháu ngoại', created_at: T1 },
    ],
    family_invites: [
      { id: randomUUID(), family_id: IDS.family, email: 'thu.nguyen@example.com', role: 'editor', relation: 'Con dâu', expires_at: '2026-11-30T00:00:00Z', accepted_at: null, accepted_by: null, invited_by: IDS.owner, token_hash: 'x', created_at: T1 },
    ],
    narrators: [
      { id: IDS.narratorBa, family_id: IDS.family, display_name: 'Nguyễn Thị Lan', pen_name: 'Bà Lan', relation: 'Bà nội', lang: 'vi', generation: 1, region: 'bac', birth_year: 1945, avatar_path: null, user_id: null, created_by: IDS.owner, created_at: T0, updated_at: T0 },
      { id: IDS.narratorOng, family_id: IDS.family, display_name: 'Nguyễn Văn Hùng', pen_name: null, relation: 'Ông nội', lang: 'vi', generation: 1, region: 'bac', birth_year: 1942, avatar_path: null, user_id: null, created_by: IDS.owner, created_at: T1, updated_at: T1 },
    ],
    narrator_links: [{ id: IDS.link, narrator_id: IDS.narratorBa, token_hash: 'x', created_by: IDS.owner, created_at: T1, expires_at: '2026-12-31T00:00:00Z', claimed_at: null, claimed_by: null, revoked_at: null }],
    topics: TOPICS.map((t) => ({ ...t })),
    questions: QUESTIONS.map((q) => ({ ...q })),
    sessions: [
      { id: IDS.session1, family_id: IDS.family, narrator_id: IDS.narratorBa, topic_id: topicId('tuoi-tho'), started_by: IDS.owner, created_at: T0, ended_at: T0 },
      { id: IDS.session2, family_id: IDS.family, narrator_id: IDS.narratorOng, topic_id: topicId('nghe-nghiep'), started_by: IDS.owner, created_at: T1, ended_at: T1 },
    ],
    recordings: [
      { id: IDS.rec1, family_id: IDS.family, narrator_id: IDS.narratorBa, session_id: IDS.session1, question_id: QUESTIONS[0]?.id ?? null, storage_path: `${IDS.family}/${IDS.narratorBa}/rec1.webm`, duration_s: 312.4, mime: 'audio/webm', size_bytes: 480000, created_by: IDS.owner, created_at: T0 },
      { id: IDS.rec2, family_id: IDS.family, narrator_id: IDS.narratorOng, session_id: IDS.session2, question_id: null, storage_path: `${IDS.family}/${IDS.narratorOng}/rec2.webm`, duration_s: 421, mime: 'audio/webm', size_bytes: 650000, created_by: IDS.owner, created_at: T1 },
      { id: IDS.rec3, family_id: IDS.family, narrator_id: IDS.narratorBa, session_id: IDS.session1, question_id: null, storage_path: `${IDS.family}/${IDS.narratorBa}/rec3.webm`, duration_s: 188, mime: 'audio/webm', size_bytes: 290000, created_by: IDS.owner, created_at: T2 },
    ],
    transcripts: [
      { id: randomUUID(), recording_id: IDS.rec1, version: 1, text: 'Năm ấy bà mới lên mười. Cả nhà thức trắng đêm 28 để canh nồi bánh chưng.', uncertain_spans: [], created_by: null, created_at: T0 },
      { id: randomUUID(), recording_id: IDS.rec3, version: 1, text: TRANSCRIPT_HARVEST, uncertain_spans: [], created_by: null, created_at: T2 },
    ],
    ai_jobs: [
      { id: randomUUID(), family_id: IDS.family, narrator_id: IDS.narratorBa, recording_id: IDS.rec1, kind: 'transcribe_and_draft', status: 'done', error: null, attempts: 1, story_ids: [IDS.storyTet, IDS.storyBanhChung], created_by: IDS.owner, created_at: T0, updated_at: T0 },
      { id: randomUUID(), family_id: IDS.family, narrator_id: IDS.narratorBa, recording_id: IDS.rec3, kind: 'transcribe_and_draft', status: 'done', error: null, attempts: 1, story_ids: [IDS.storyHarvest], created_by: IDS.owner, created_at: T2, updated_at: T2 },
    ],
    stories,
    story_versions: versions,
    story_share_settings: [{ story_id: IDS.storyBike, show_audio: false, show_real_name: false, show_region: true, show_photos: false, updated_at: T1, updated_by: IDS.owner }],
    story_photos: [{ id: IDS.photo, story_id: IDS.storyTet, family_id: IDS.family, storage_path: `${IDS.family}/photo1.jpg`, caption: 'Tết 1955, sân nhà ở Đông Ngạc', position: 0, created_by: IDS.owner, created_at: T1 }],
    publish_requests: [{ id: randomUUID(), family_id: IDS.family, story_id: IDS.storyBike, status: 'approved', note: null, requested_at: T1, requested_by: IDS.owner, reviewed_at: T1, reviewer: null }],
    public_items: [
      publicItem({ id: IDS.pubBike, story_id: IDS.storyBike, kind: 'story', title: 'Chiếc xe đạp Phượng Hoàng', summary: 'Chiếc xe đạp đã chở một thầy giáo đi dạy suốt hai mươi năm.', body: stories[3]!.body, topic_slug: 'nghe-nghiep', narrator_label: 'Một người ông ở Hà Nội', region: 'bac', decade: 1970 }),
      publicItem({
        id: IDS.pubTuongBan,
        kind: 'experience',
        title: 'Cách ủ tương Bần',
        summary: 'Kinh nghiệm ủ tương của một gia đình làng Bần, Hưng Yên.',
        body: 'Tương ngon nhờ nắng và nhờ kiên nhẫn.',
        fields: { skill: 'Ủ tương Bần', context: 'Làm vào tháng 5 âm lịch, khi nắng to.', conditions: ['Gạo nếp, đậu tương, muối hột', 'Chum sành sạch'], steps: ['Đồ xôi rồi ủ mốc vàng 3 ngày', 'Rang đậu, ngâm nước 2 tuần', 'Trộn mốc với nước đậu và muối, phơi nắng 1 tháng'], cautions: ['Đậy vung khi trời mưa'], limits: 'Kinh nghiệm gia đình, chưa được kiểm chứng như một quy trình an toàn thực phẩm.' },
        topic_slug: 'mon-an',
        narrator_label: 'Một người bà ở Hưng Yên',
        region: 'bac',
        decade: 1960,
      }),
      publicItem({ id: IDS.pubCho, kind: 'story', title: 'Chợ Bến Thành những năm 80', summary: 'Một buổi sáng đi chợ cùng mẹ thời bao cấp.', body: 'Hồi đó đi chợ phải dậy từ bốn giờ sáng.', topic_slug: 'que-huong', narrator_label: 'Một người mẹ ở Sài Gòn', region: 'nam', decade: 1980, lang: 'vi' }),
      publicItem({
        id: IDS.pubRauMuong,
        kind: 'experience',
        title: 'Trồng rau muống mùa mưa',
        summary: 'Mẹo giữ luống rau muống không úng nước.',
        body: 'Lên luống cao, rạch rãnh thoát nước.',
        fields: { skill: 'Trồng rau muống', context: null, conditions: ['Đất thịt nhẹ'], steps: ['Lên luống cao 20 cm', 'Rạch rãnh thoát nước giữa các luống'], cautions: [], limits: null },
        topic_slug: 'lam-vuon',
        narrator_label: 'Một người ông ở Huế',
        region: 'trung',
        decade: 1990,
      }),
    ],
    reports: [],
    connect_requests: [],
    deletion_requests: [],
    collections: [{ id: IDS.collection, family_id: IDS.family, title: 'Ký ức ngày Tết', description: 'Những câu chuyện quanh nồi bánh chưng.', created_by: IDS.owner, created_at: T1 }],
    collection_items: [{ collection_id: IDS.collection, family_id: IDS.family, story_id: IDS.storyTet, position: 0, added_at: T1 }],
    books: [{ id: IDS.book, family_id: IDS.family, title: 'Sách ký ức nhà họ Nguyễn', subtitle: 'Tập 1', cover_style: 'heritage', created_by: IDS.owner, created_at: T1, updated_at: T2 }],
    book_chapters: [
      { book_id: IDS.book, family_id: IDS.family, story_id: IDS.storyTet, position: 0 },
      { book_id: IDS.book, family_id: IDS.family, story_id: IDS.storyBike, position: 1 },
    ],
  };
}

// ---- tiny PostgREST emulator ----------------------------------------------------------------------------
const fold = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

interface Embed {
  alias: string;
  table: string;
  select: string;
}
function parseEmbeds(select: string): Embed[] {
  return splitTop(select)
    .map((part) => /^(?:([\w]+):)?([\w]+)(?:![\w]+)?\((.*)\)$/s.exec(part))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ alias: m[1] ?? m[2]!, table: m[2]!, select: m[3]! }));
}

const SINGULAR: Record<string, string> = {
  families: 'family',
  stories: 'story',
  narrators: 'narrator',
  topics: 'topic',
  recordings: 'recording',
  sessions: 'session',
  collections: 'collection',
  books: 'book',
  public_items: 'public_item',
  questions: 'question',
  profiles: 'profile',
};
const singular = (t: string) => SINGULAR[t] ?? t.replace(/s$/, '');

function embed(db: Db, table: string, rows: Row[], select: string): Row[] {
  const embeds = parseEmbeds(select);
  if (!embeds.length) return rows.map((r) => ({ ...r }));
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const e of embeds) {
      const target = db[e.table] ?? [];
      const fk = `${singular(e.table)}_id`;
      if (fk in row) {
        const hit = target.find((t) => t.id === row[fk]);
        out[e.alias] = hit ? (embed(db, e.table, [hit], e.select)[0] ?? null) : null;
      } else {
        const back = `${singular(table)}_id`;
        const children = target.filter((t) => t[back] === row.id);
        out[e.alias] = e.select.trim() === 'count' ? [{ count: children.length }] : embed(db, e.table, children, e.select);
      }
    }
    return out;
  });
}

function parseValue(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v.replace(/^"(.*)"$/, '$1');
}

function matchOp(cell: unknown, op: string, raw: string): boolean {
  const neg = op.startsWith('not.');
  const o = neg ? op.slice(4) : op;
  let ok: boolean;
  switch (o) {
    case 'eq':
      ok = String(cell) === String(parseValue(raw)) || (cell === null && raw === 'null');
      break;
    case 'neq':
      ok = String(cell) !== String(parseValue(raw));
      break;
    case 'is':
      ok = raw === 'null' ? cell === null || cell === undefined : String(cell) === raw;
      break;
    case 'in': {
      const items = splitTop(raw.replace(/^\(|\)$/g, '')).map((x) => String(parseValue(x)));
      ok = items.includes(String(cell));
      break;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = typeof cell === 'number' ? cell : String(cell);
      const b = typeof cell === 'number' ? Number(raw) : raw;
      ok = o === 'gt' ? a > b : o === 'gte' ? a >= b : o === 'lt' ? a < b : a <= b;
      break;
    }
    case 'like':
    case 'ilike': {
      const needle = raw.replace(/^\*|\*$/g, '').replace(/%/g, '');
      ok = o === 'ilike' ? String(cell ?? '').toLowerCase().includes(needle.toLowerCase()) : String(cell ?? '').includes(needle);
      break;
    }
    case 'cs':
      ok = Array.isArray(cell) && splitTop(raw.replace(/^\{|\}$/g, '')).every((x) => (cell as unknown[]).map(String).includes(x));
      break;
    default:
      ok = true;
  }
  return neg ? !ok : ok;
}

/** `col.op.value` → predicate (used inside `or=(…)`). */
function condition(expr: string): (r: Row) => boolean {
  const m = /^([\w]+)\.((?:not\.)?[a-z]+)\.(.*)$/s.exec(expr);
  if (!m) return () => true;
  return (r) => matchOp(r[m[1]!], m[2]!, m[3]!);
}

function applyQuery(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key) || key.includes('.')) continue;
    if (key === 'or') {
      const conds = splitTop(value.replace(/^\(|\)$/g, '')).map(condition);
      out = out.filter((r) => conds.some((c) => c(r)));
      continue;
    }
    if (key === 'and') {
      const conds = splitTop(value.replace(/^\(|\)$/g, '')).map(condition);
      out = out.filter((r) => conds.every((c) => c(r)));
      continue;
    }
    const dot = value.indexOf('.');
    let op = value.slice(0, dot);
    let raw = value.slice(dot + 1);
    if (op === 'not') {
      const d2 = raw.indexOf('.');
      op = `not.${raw.slice(0, d2)}`;
      raw = raw.slice(d2 + 1);
    }
    out = out.filter((r) => matchOp(r[key], op, raw));
  }
  const order = params.get('order');
  if (order) {
    const keys = order.split(',').map((o) => {
      const [col, dir] = o.split('.');
      return { col: col!, desc: dir === 'desc' };
    });
    out = [...out].sort((a, b) => {
      for (const k of keys) {
        const x = a[k.col];
        const y = b[k.col];
        if (x === y) continue;
        const c = x === null || x === undefined ? 1 : y === null || y === undefined ? -1 : x < y ? -1 : 1;
        return k.desc ? -c : c;
      }
      return 0;
    });
  }
  return out;
}

function decodeJwt(auth: string | undefined): Row | null {
  const token = auth?.replace(/^Bearer\s+/i, '') ?? '';
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Row;
  } catch {
    return null;
  }
}

// ---- auth -----------------------------------------------------------------------------------------------
export type Role = 'owner' | 'viewer' | 'admin';

function fakeJwt(payload: Row): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

export function makeUser(id: string, opts: { email?: string | null; anonymous?: boolean; name?: string } = {}): Row {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: opts.anonymous ? '' : (opts.email ?? 'minhanh@example.com'),
    phone: '',
    is_anonymous: !!opts.anonymous,
    app_metadata: opts.anonymous ? { provider: 'anonymous', providers: [] } : { provider: 'email', providers: ['email'] },
    user_metadata: opts.name ? { display_name: opts.name } : {},
    identities: [],
    created_at: T0,
    updated_at: T0,
  };
}

export function makeSession(user: Row): Row {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: fakeJwt({ sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, is_anonymous: user.is_anonymous, exp: now + 3600 * 24 }),
    token_type: 'bearer',
    expires_in: 3600 * 24,
    expires_at: now + 3600 * 24,
    refresh_token: `e2e-refresh-${user.id}`,
    user,
  };
}

// ---- static media ----------------------------------------------------------------------------------------
/** 0.5 s of silence as a WAV file, so <audio> elements load. */
function silentWav(): Buffer {
  const rate = 8000;
  const samples = rate / 2;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}
const WAV = silentWav();
const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#e9c9a0"/><circle cx="600" cy="160" r="70" fill="#f6e6c8"/><path d="M0 460 C200 400 400 520 800 430 V600 H0Z" fill="#214e43" opacity=".55"/><text x="40" y="560" font-family="sans-serif" font-size="28" fill="#163a31">e2e fixture photo</text></svg>`;

// ---- the mock ---------------------------------------------------------------------------------------------
export interface Call {
  method: string;
  path: string;
  search: string;
  body: Row | Row[] | null;
}

export interface MockOptions {
  /** Replace seed rows (e.g. `{ public_items: [] }` for an empty hub). */
  db?: Partial<Db>;
  /** Return value of rpc('is_admin'). */
  admin?: boolean;
  /** Outcome of the ai-process function. */
  ai?: 'done' | 'error' | 'quota_exceeded';
  /** Valid credentials for password login (anything else → invalid_credentials). */
  login?: { email: string; password: string };
  /** Force an RPC to fail with this code, e.g. `{ claim_narrator_link: 'link_expired' }`. */
  rpcErrors?: Record<string, string>;
}

export interface Mock {
  db: Db;
  calls: Call[];
  rpcCalls: (fn: string) => Row[];
  unmocked: string[];
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range, content-profile' };
const json = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...headers }, body: JSON.stringify(body) });

function bodyOf(req: Request): Row | Row[] | null {
  try {
    return (req.postDataJSON() ?? null) as Row | Row[] | null;
  } catch {
    return null;
  }
}

/**
 * Answer every request to https://e2e.invalid. Call before page.goto(). The fake DB is stateful per test:
 * inserts, updates and RPCs change `mock.db`, and every call is recorded in `mock.calls`.
 */
export async function mockSupabase(page: Page, opts: MockOptions = {}): Promise<Mock> {
  const db: Db = { ...seedDb(), ...(opts.db as Db | undefined) };
  const calls: Call[] = [];
  const unmocked: string[] = [];
  const anonUsers = new Set<string>([IDS.narratorUser]);

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;
    const headers = req.headers();
    const body = method === 'GET' || method === 'HEAD' ? null : bodyOf(req);
    calls.push({ method, path, search: url.search, body });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const uid = (decodeJwt(headers.authorization)?.sub as string | undefined) ?? null;

    // ---------------- auth ----------------
    if (path.startsWith('/auth/v1/')) {
      const ep = path.slice('/auth/v1/'.length);
      if (ep === 'token') {
        const grant = url.searchParams.get('grant_type');
        const b = (body ?? {}) as Row;
        if (grant === 'password') {
          const ok = opts.login && b.email === opts.login.email && b.password === opts.login.password;
          if (!ok) return json(route, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
          return json(route, makeSession(makeUser(IDS.owner, { email: String(b.email), name: 'Nguyễn Minh Anh' })));
        }
        if (grant === 'refresh_token') {
          const id = String(b.refresh_token ?? '').replace('e2e-refresh-', '') || IDS.owner;
          return json(route, makeSession(makeUser(id, { anonymous: anonUsers.has(id) })));
        }
        return json(route, { code: 400, error_code: 'unsupported_grant_type', msg: 'unsupported' }, 400);
      }
      if (ep === 'signup') {
        const b = (body ?? {}) as Row;
        if (!b.email) {
          const id = IDS.narratorUser;
          anonUsers.add(id);
          return json(route, makeSession(makeUser(id, { anonymous: true })));
        }
        // Email confirmation on: a user without a session.
        return json(route, { ...makeUser(randomUUID(), { email: String(b.email) }), confirmation_sent_at: new Date().toISOString(), identities: [{ id: 'x' }] });
      }
      if (ep === 'user') {
        if (!uid) return json(route, { code: 401, error_code: 'no_authorization', msg: 'no user' }, 401);
        return json(route, makeUser(uid, { anonymous: anonUsers.has(uid) }));
      }
      if (ep.startsWith('logout')) return route.fulfill({ status: 204, body: '' });
      if (ep === 'otp' || ep === 'recover' || ep === 'resend') return json(route, {});
      unmocked.push(`${method} ${path}`);
      return json(route, {});
    }

    // ---------------- storage ----------------
    if (path.startsWith('/storage/v1/')) {
      const rest = path.slice('/storage/v1/'.length);
      if (method === 'POST' && rest.startsWith('object/sign/')) {
        const objectPath = rest.slice('object/sign/'.length);
        const b = (body ?? {}) as Row;
        if (Array.isArray(b.paths)) {
          return json(route, (b.paths as string[]).map((p) => ({ path: p, signedURL: `/object/sign/${objectPath}/${p}?token=e2e`, error: null })));
        }
        return json(route, { signedURL: `/object/sign/${objectPath}?token=e2e` });
      }
      if (method === 'GET' || method === 'HEAD') {
        if (/\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(rest)) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: PHOTO_SVG });
        return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
      }
      if ((method === 'POST' || method === 'PUT') && rest.startsWith('object/')) {
        const key = rest.slice('object/'.length);
        return json(route, { Key: key, Id: randomUUID() });
      }
      if (method === 'DELETE') return json(route, []);
      unmocked.push(`${method} ${path}`);
      return json(route, {});
    }

    // ---------------- edge functions ----------------
    if (path.startsWith('/functions/v1/')) {
      const fn = path.slice('/functions/v1/'.length);
      const b = (body ?? {}) as Row;
      if (fn === 'ai-process') {
        if (b.action === 'suggest_questions') return json(route, { questions: ['Hồi nhỏ ông/bà sống ở đâu?', 'Món ăn nào gợi nhớ quê nhà nhất?'] });
        const recId = String(b.recording_id);
        const rec = db.recordings!.find((r) => r.id === recId);
        if (!rec) return json(route, { error: 'not_found' }, 404);
        if (opts.ai === 'error' || opts.ai === 'quota_exceeded') {
          const jobId = randomUUID();
          db.ai_jobs!.push({ id: jobId, recording_id: recId, family_id: rec.family_id, narrator_id: rec.narrator_id, kind: 'transcribe_and_draft', status: 'error', error: 'ai_unavailable', attempts: 1, story_ids: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          return json(route, { error: opts.ai === 'error' ? 'ai_unavailable' : 'quota_exceeded', job_id: jobId }, opts.ai === 'error' ? 503 : 429);
        }
        const existing = db.stories!.filter((s) => s.recording_id === recId).map((s) => s.id as string);
        const jobId = randomUUID();
        let storyIds = existing;
        if (!existing.length) {
          const sid = randomUUID();
          const now = new Date().toISOString();
          db.stories!.push(story({ id: sid, narrator_id: rec.narrator_id, recording_id: recId, topic_id: null, title: 'Cây đa đầu làng', body: 'Ngày xưa đầu làng có cây đa to lắm, trưa nào tụi nhỏ cũng ra đó chơi.', edit_status: 'pending_review', created_at: now, updated_at: now, created_by: uid }));
          db.transcripts!.push({ id: randomUUID(), recording_id: recId, version: 1, text: 'Ngày xưa đầu làng có cây đa [?] to lắm, trưa nào tụi nhỏ cũng ra đó chơi.', uncertain_spans: [], created_by: null, created_at: now });
          db.story_versions!.push({ id: randomUUID(), story_id: sid, version: 1, created_at: now, created_by: uid, edit_status: 'pending_review', note: null, title: 'Cây đa đầu làng', summary: null, body: 'Ngày xưa đầu làng có cây đa to lắm.', fields: {} });
          storyIds = [sid];
        }
        db.ai_jobs!.push({ id: jobId, recording_id: recId, family_id: rec.family_id, narrator_id: rec.narrator_id, kind: 'transcribe_and_draft', status: 'done', error: null, attempts: 1, story_ids: storyIds, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return json(route, { job_id: jobId, status: 'done', story_ids: storyIds, error: null });
      }
      if (fn === 'public-audio-sync') return json(route, { ok: true });
      if (fn === 'knowledge-ask') return json(route, { answer: null, sources: [], found: false });
      if (fn === 'question-tts') return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
      unmocked.push(`${method} ${path}`);
      return json(route, { error: 'not_found' }, 404);
    }

    // ---------------- rpc ----------------
    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = path.slice('/rest/v1/rpc/'.length);
      const b = (body ?? {}) as Row;
      const forced = opts.rpcErrors?.[fn];
      if (forced) return json(route, { code: 'P0001', message: forced, details: null, hint: null }, 400);
      const reply = rpc(db, fn, b, uid, opts, anonUsers);
      if (reply === undefined) {
        unmocked.push(`${method} ${path}`);
        return json(route, { code: 'PGRST202', message: `Could not find the function public.${fn}` }, 404);
      }
      return json(route, reply);
    }

    // ---------------- tables ----------------
    if (path.startsWith('/rest/v1/')) {
      const table = path.slice('/rest/v1/'.length);
      const rows = (db[table] ??= []);
      const select = url.searchParams.get('select') ?? '*';
      const prefer = headers.prefer ?? '';
      const wantObject = (headers.accept ?? '').includes('vnd.pgrst.object');
      const reply = (out: Row[], status = 200) => {
        const shaped = embed(db, table, out, select);
        const extra: Record<string, string> = {};
        if (/count=(exact|planned|estimated)/.test(prefer)) extra['content-range'] = `0-${Math.max(0, out.length - 1)}/${out.length}`;
        if (method === 'HEAD') return route.fulfill({ status, headers: { ...CORS, ...extra }, body: '' });
        if (wantObject) {
          if (shaped.length !== 1) return json(route, { code: 'PGRST116', details: `The result contains ${shaped.length} rows`, message: 'JSON object requested, multiple (or no) rows returned', hint: null }, 406);
          return json(route, shaped[0], status, extra);
        }
        return json(route, shaped, status, extra);
      };

      if (method === 'GET' || method === 'HEAD') {
        let out = applyQuery(rows, url.searchParams);
        const total = out.length;
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = url.searchParams.get('limit');
        out = out.slice(offset, limit ? offset + Number(limit) : undefined);
        if (/count=/.test(prefer) && method === 'HEAD') {
          return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `*/${total}` }, body: '' });
        }
        if (/count=/.test(prefer) && !wantObject) {
          // content-range reports the full count, not the page size
          const range = out.length ? `${offset}-${offset + out.length - 1}/${total}` : `*/${total}`;
          return json(route, embed(db, table, out, select), 200, { 'content-range': range });
        }
        return reply(out);
      }
      if (method === 'POST') {
        const input = Array.isArray(body) ? body : body ? [body] : [];
        const upsert = /resolution=merge-duplicates/.test(prefer);
        const conflict = url.searchParams.get('on_conflict')?.split(',') ?? ['id'];
        const now = new Date().toISOString();
        const written: Row[] = [];
        for (const item of input) {
          const existing = upsert ? rows.find((r) => conflict.every((c) => r[c] === item[c])) : undefined;
          if (existing) {
            Object.assign(existing, item, { updated_at: now });
            written.push(existing);
          } else {
            const row: Row = { id: randomUUID(), created_at: now, ...item };
            if (table === 'sessions') row.started_by ??= uid;
            rows.push(row);
            written.push(row);
          }
        }
        if (!/return=representation/.test(prefer)) return route.fulfill({ status: 201, headers: CORS, body: '' });
        return reply(written, 201);
      }
      if (method === 'PATCH') {
        const hit = applyQuery(rows, url.searchParams);
        for (const r of hit) Object.assign(r, body as Row, { updated_at: new Date().toISOString() });
        if (!/return=representation/.test(prefer)) return route.fulfill({ status: 204, headers: CORS, body: '' });
        return reply(hit);
      }
      if (method === 'DELETE') {
        const hit = applyQuery(rows, url.searchParams);
        db[table] = rows.filter((r) => !hit.includes(r));
        if (!/return=representation/.test(prefer)) return route.fulfill({ status: 204, headers: CORS, body: '' });
        return reply(hit);
      }
    }
    unmocked.push(`${method} ${path}`);
    return json(route, { message: `not mocked: ${method} ${path}` }, 404);
  });

  return {
    db,
    calls,
    unmocked,
    rpcCalls: (fn) => calls.filter((c) => c.path === `/rest/v1/rpc/${fn}`).map((c) => (c.body ?? {}) as Row),
  };
}

function rpc(db: Db, fn: string, b: Row, uid: string | null, opts: MockOptions, anonUsers: Set<string>): unknown {
  const role = db.family_members!.find((m) => m.user_id === uid)?.role as string | undefined;
  const isNarratorOf = (nid: unknown) => !!uid && db.narrators!.some((n) => n.id === nid && n.user_id === uid);
  const storyById = (id: unknown) => db.stories!.find((s) => s.id === id);
  switch (fn) {
    case 'is_admin':
      return opts.admin === true;
    case 'is_narrator_user':
      return isNarratorOf(b.nid);
    case 'can_write_story': {
      const s = storyById(b.sid);
      return !!s && (role === 'owner' || role === 'manager' || role === 'editor' || isNarratorOf(s.narrator_id));
    }
    case 'can_read_story':
      return !!storyById(b.sid);
    case 'is_family_member':
      return !!role;
    case 'family_role':
      return role ?? null;
    case 'claim_narrator_link': {
      const narrator = db.narrators!.find((n) => n.id === IDS.narratorBa)!;
      if (uid) {
        narrator.user_id = uid;
        anonUsers.add(uid);
      }
      return narrator.id;
    }
    case 'approve_story': {
      const s = storyById(b.p_story);
      if (!s) return undefined;
      s.edit_status = 'approved';
      s.approved_at = new Date().toISOString();
      s.approved_by = uid;
      return s.current_version;
    }
    case 'save_story_draft': {
      const s = storyById(b.p_story);
      if (!s) return undefined;
      s.current_version = Number(s.current_version) + 1;
      Object.assign(s, { title: b.p_title ?? s.title, summary: b.p_summary ?? s.summary, body: b.p_body ?? s.body, fields: b.p_fields ?? s.fields, edit_status: 'pending_review' });
      db.story_versions!.push({ id: randomUUID(), story_id: s.id, version: s.current_version, created_at: new Date().toISOString(), created_by: uid, edit_status: 'pending_review', note: null, title: s.title, summary: s.summary, body: s.body, fields: s.fields });
      return s.current_version;
    }
    case 'search_public': {
      const q = fold(b.q ?? '').trim();
      const items = db.public_items!.filter(
        (p) =>
          (!q || fold(`${p.title} ${p.summary ?? ''} ${p.body}`).includes(q)) &&
          (!b.p_topic || p.topic_slug === b.p_topic) &&
          (!b.p_kind || p.kind === b.p_kind) &&
          (!b.p_region || p.region === b.p_region) &&
          (!b.p_decade || Number(p.decade) === Number(b.p_decade)),
      );
      const off = Number(b.off ?? 0);
      return items.slice(off, off + Number(b.lim ?? 12));
    }
    case 'preview_public_item': {
      const s = storyById(b.p_story);
      if (!s) return undefined;
      const topic = db.topics!.find((t) => t.id === s.topic_id);
      return { kind: s.kind, title: s.title, summary: s.summary, body: s.body, fields: s.fields, topic_slug: topic?.slug ?? null, region: 'bac', decade: 1950, narrator_label: 'Một người bà ở Hà Nội', audio_allowed: false };
    }
    case 'request_publish': {
      const id = randomUUID();
      const s = storyById(b.p_story);
      db.publish_requests!.push({ id, story_id: b.p_story, family_id: s?.family_id, status: 'pending', note: null, requested_at: new Date().toISOString(), requested_by: uid, reviewed_at: null, reviewer: null });
      return id;
    }
    case 'withdraw_public':
    case 'review_publish':
    case 'revoke_narrator_link':
      return null;
    case 'create_family': {
      const id = randomUUID();
      db.families!.push({ id, name: b.name, owner_id: uid, created_at: new Date().toISOString() });
      db.family_members!.push({ family_id: id, user_id: uid, role: 'owner', relation: null, created_at: new Date().toISOString() });
      return id;
    }
    case 'create_narrator_link':
      return IDS.linkToken;
    case 'create_family_invite':
      return 'InviteTokenE2E000000000000000000';
    case 'accept_invite':
      return IDS.family;
    case 'match_public_items':
      return [];
    default:
      return undefined;
  }
}

// ---- sessions ---------------------------------------------------------------------------------------------
async function seedStorage(page: Page, entries: Record<string, string>) {
  await page.addInitScript((pairs) => {
    for (const [k, v] of Object.entries(pairs)) {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        /* storage blocked */
      }
    }
  }, entries);
}

/** Seed a signed-in family member (owner by default) before the app boots. Admin = owner + is_admin. */
export async function signedIn(page: Page, role: Role = 'owner') {
  const id = role === 'viewer' ? IDS.viewer : IDS.owner;
  const user = makeUser(id, { email: role === 'viewer' ? 'nam@example.com' : 'minhanh@example.com', name: role === 'viewer' ? 'Nguyễn Hoàng Nam' : 'Nguyễn Minh Anh' });
  await seedStorage(page, { [STORAGE_KEY]: JSON.stringify(makeSession(user)) });
}

/**
 * Seed the anonymous narrator session a storytelling link creates (/k/:token), bound to "Bà Lan".
 * Pass the mock so the narrator row is linked to the anonymous user.
 */
export async function anonymousNarrator(page: Page, mock: Mock) {
  const narrator = mock.db.narrators!.find((n) => n.id === IDS.narratorBa)!;
  narrator.user_id = IDS.narratorUser;
  const user = makeUser(IDS.narratorUser, { anonymous: true });
  await seedStorage(page, { [STORAGE_KEY]: JSON.stringify(makeSession(user)), [NARRATOR_KEY]: IDS.narratorBa });
}

/** Force the UI language (otherwise the vi-VN browser locale gives Vietnamese). */
export async function setLocale(page: Page, locale: 'vi' | 'en') {
  await seedStorage(page, { [LOCALE_KEY]: locale });
}

// ---- browser fakes ------------------------------------------------------------------------------------------
/** Fake getUserMedia + MediaRecorder: recording "works" and produces a small audio/webm Blob. */
export async function fakeMicrophone(page: Page) {
  await page.addInitScript(() => {
    class FakeRecorder extends EventTarget {
      state: 'inactive' | 'recording' | 'paused' = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((ev: { data: Blob }) => void) | null = null;
      static isTypeSupported(t: string) {
        return t.startsWith('audio/webm');
      }
      constructor(_stream: MediaStream, options?: { mimeType?: string }) {
        super();
        if (options?.mimeType) this.mimeType = options.mimeType;
      }
      /** One take = a valid 1 s silent WAV (so the review player can load it), delivered when recording stops. */
      private emit() {
        const rate = 8000;
        const buf = new ArrayBuffer(44 + rate * 2);
        const v = new DataView(buf);
        const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
        str(0, 'RIFF');
        v.setUint32(4, 36 + rate * 2, true);
        str(8, 'WAVEfmt ');
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, rate, true);
        v.setUint32(28, rate * 2, true);
        v.setUint16(32, 2, true);
        v.setUint16(34, 16, true);
        str(36, 'data');
        v.setUint32(40, rate * 2, true);
        this.ondataavailable?.({ data: new Blob([buf], { type: this.mimeType }) });
      }
      start(slice?: number) {
        this.state = 'recording';
        void slice;
      }
      pause() {
        this.state = 'paused';
      }
      resume() {
        this.state = 'recording';
      }
      stop() {
        if (this.state === 'inactive') return;
        this.emit();
        this.state = 'inactive';
        setTimeout(() => this.dispatchEvent(new Event('stop')), 0);
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: FakeRecorder, configurable: true, writable: true });
    const md = navigator.mediaDevices ?? ({} as MediaDevices);
    Object.defineProperty(md, 'getUserMedia', {
      value: async () => {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dest = ctx.createMediaStreamDestination();
        osc.connect(dest);
        osc.start();
        return dest.stream;
      },
      configurable: true,
    });
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true });
  });
}

// ---- assertions ----------------------------------------------------------------------------------------------
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth, 'page must not scroll horizontally').toBeLessThanOrEqual(innerWidth);
}

/** Wait until the lazy route rendered its h1 (and no skeleton is busy). */
export async function ready(page: Page) {
  await expect(page.locator('h1').first()).toBeVisible();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 7_000 }).catch(() => {});
}
