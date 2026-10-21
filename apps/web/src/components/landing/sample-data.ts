// Illustrative data for the landing page (plan rule 6: always shown with the "Dữ liệu minh họa / Illustrative data" label).
// All narrators are fictional characters; durations are illustrative.
import type { SceneKind } from '@/components/illustrations/scenes';
import { getSampleItem, type SampleItem } from '@/features/knowledge/sample-items';

export interface Bi {
  vi: string;
  en: string;
}

export interface CarouselStory {
  id: string;
  scene: SceneKind;
  topic: Bi;
  quote: Bi;
  narrator: Bi;
  age: number;
  /** seconds */
  duration: number;
}

export const CAROUSEL_STORIES: CarouselStory[] = [
  { id: 'ca-kho', scene: 'kitchen', topic: { vi: 'Món ăn', en: 'Cooking' }, quote: { vi: 'Cá kho phải để lửa riu riu cả buổi chiều.', en: 'Braised fish wants a low flame all afternoon.' }, narrator: { vi: 'Bà Năm', en: 'Grandma Năm' }, age: 78, duration: 72 },
  { id: 'mua-gat', scene: 'field', topic: { vi: 'Quê hương', en: 'Hometown' }, quote: { vi: 'Mùa gặt, cả xóm ra đồng từ lúc gà gáy.', en: 'At harvest, the whole village was out before the roosters.' }, narrator: { vi: 'Ông Sáu', en: 'Grandpa Sáu' }, age: 81, duration: 125 },
  { id: 'nhao-dat', scene: 'pottery', topic: { vi: 'Nghề thủ công', en: 'Crafts' }, quote: { vi: 'Đất phải nhào ba lượt mới mịn tay.', en: 'Knead the clay three times, until it feels like silk.' }, narrator: { vi: 'Ông Hai', en: 'Grandpa Hai' }, age: 74, duration: 108 },
  { id: 'lat-la-mai', scene: 'garden', topic: { vi: 'Làm vườn', en: 'Gardening' }, quote: { vi: 'Tưới mai lúc sáng sớm, đừng tưới giữa trưa.', en: 'Water the mai at dawn — never in the midday sun.' }, narrator: { vi: 'Bà Tư', en: 'Grandma Tư' }, age: 72, duration: 72 },
  { id: 'banh-chung', scene: 'tet', topic: { vi: 'Gia đình', en: 'Family' }, quote: { vi: 'Đêm ba mươi, cả nhà ngồi canh nồi bánh chưng.', en: 'On New Year’s Eve we all sat up by the bánh chưng pot.' }, narrator: { vi: 'Bà Ba', en: 'Grandma Ba' }, age: 85, duration: 151 },
  { id: 'cho-que', scene: 'market', topic: { vi: 'Tuổi thơ', en: 'Childhood' }, quote: { vi: 'Chợ quê ngày ấy họp từ lúc trời còn tối.', en: 'The village market opened while it was still dark.' }, narrator: { vi: 'Bà Bảy', en: 'Grandma Bảy' }, age: 76, duration: 96 },
  { id: 'xem-may', scene: 'boat', topic: { vi: 'Nghề nghiệp', en: 'Working life' }, quote: { vi: 'Nhìn mây cuối trời là biết mai có sóng.', en: 'One look at the far clouds told us if waves were coming.' }, narrator: { vi: 'Ông Tám', en: 'Grandpa Tám' }, age: 80, duration: 114 },
  { id: 'may-ao', scene: 'tailor', topic: { vi: 'Nghề nghiệp', en: 'Working life' }, quote: { vi: 'Đo vai trước, rồi mới đo eo.', en: 'Measure the shoulders first, then the waist.' }, narrator: { vi: 'Bà Chín', en: 'Grandma Chín' }, age: 79, duration: 58 },
  { id: 'pha-tra', scene: 'tea', topic: { vi: 'Nếp nhà', en: 'Home ways' }, quote: { vi: 'Tráng ấm bằng nước sôi thì trà mới dậy hương.', en: 'Warm the pot with boiling water and the tea opens up.' }, narrator: { vi: 'Ông Mười', en: 'Grandpa Mười' }, age: 83, duration: 80 },
  { id: 'den-ong-sao', scene: 'lantern', topic: { vi: 'Tuổi thơ', en: 'Childhood' }, quote: { vi: 'Ông dán cho tôi chiếc đèn ông sao bằng giấy kính.', en: 'Grandpa made me a star lantern out of cellophane.' }, narrator: { vi: 'Bà Út', en: 'Grandma Út' }, age: 71, duration: 101 },
];

export interface TimedLine {
  /** start, seconds */
  t: number;
  text: Bi;
  /** Contains a passage the AI was unsure about ([?]) — must be checked by the narrator. */
  uncertain?: boolean;
}

/**
 * Block 3 — a 58 s excerpt (B6: 30–60 s) of the illustrative hub story `mau-tet-ao-moi`, with a timed transcript
 * (simulated clock). "Xem câu chuyện" opens the full story at /tri-thuc/mau-tet-ao-moi, so the lines below must stay
 * verbatim sentences of that sample's body (features/knowledge/sample-items.ts) — see SampleStory.test.tsx.
 */
export const SAMPLE_STORY = {
  /** Detail screen the "Xem câu chuyện" link opens. */
  itemId: 'mau-tet-ao-moi',
  title: { vi: 'Bộ áo mới sáng mùng Một', en: 'A new outfit on New Year’s morning' },
  narrator: { vi: 'Bà Út Bến Tre (bút danh) · Miền Nam', en: 'Grandma Út of Bến Tre (pen name) · The South' },
  topic: { vi: 'Tuổi thơ · Ký ức', en: 'Childhood · Memory' },
  duration: 58,
  scene: 'tet' as SceneKind,
  lines: [
    { t: 0, text: { vi: 'Nhà nghèo, cả năm có một bộ áo mới là quý lắm.', en: 'We were poor, so one new outfit a year was precious.' } },
    { t: 7, text: { vi: 'Mẹ mua vải từ tháng Chín, cất trong rương, tới hai mươi tháng Chạp mới đem ra may.', en: 'Mother bought the cloth in the ninth month, kept it in a chest, and only took it out to sew on the twentieth of the twelfth month.' } },
    { t: 19, text: { vi: 'Đêm Giao thừa tôi không ngủ được, cứ sờ cái áo hoài.', en: 'On New Year’s Eve I couldn’t sleep; I kept touching the shirt.' } },
    { t: 28, text: { vi: 'Sáng mùng Một, tôi mặc áo mới chạy qua nhà ông bà.', en: 'On the first morning I put it on and ran to my grandparents’ house.' } },
    { t: 37, text: { vi: 'Ông xoa đầu, cho tôi một phong bao đỏ, trong có tờ tiền mới tinh.', en: 'Grandfather patted my head and gave me a red envelope with a crisp new note inside.' } },
    { t: 47, text: { vi: 'Tôi giữ tờ tiền đó tới tận hết tháng Giêng mới dám tiêu.', en: 'I kept that note until the end of the first month before I dared to spend it.' } },
  ] satisfies TimedLine[],
};

/** Block 7 — one narration, three outputs (gardening: stripping mai leaves before Tết). */
export const OUTPUT_SAMPLE = {
  narrator: { vi: 'Bà Tư, 72 tuổi · Bến Tre', en: 'Grandma Tư, 72 · Bến Tre' },
  duration: 41,
  transcript: [
    { t: 0, text: { vi: 'Mai thì phải lặt lá trước Tết chừng mười lăm ngày, con à.', en: 'You strip the mai’s leaves about fifteen days before Tết, dear.' } },
    { t: 7, text: { vi: 'Lặt xong phải tưới cho đẫm, tưới lúc sáng sớm, đừng tưới giữa trưa nắng.', en: 'Once they’re off, water it deeply — early in the morning, never in the midday sun.' } },
    { t: 16, text: { vi: 'Năm nào trời lạnh thì lặt sớm hơn vài bữa, [?] bón thêm chút phân kali.', en: 'In a cold year, strip a few days earlier and [?] add a little potash.' }, uncertain: true },
    { t: 26, text: { vi: 'Cây còn yếu thì đừng lặt hết, chừa lại mấy lá non trên ngọn.', en: 'If the tree is weak, don’t strip it bare — leave a few young leaves at the tips.' } },
    { t: 35, text: { vi: 'Má tôi dạy vậy, tôi làm theo năm chục năm rồi.', en: 'My mother taught me that, and I’ve done it for fifty years.' } },
  ] satisfies TimedLine[],
  story: {
    title: { vi: 'Năm mươi mùa mai của bà Tư', en: 'Fifty seasons of Grandma Tư’s mai tree' },
    paragraphs: [
      {
        vi: 'Cứ khoảng nửa tháng trước Tết, bà Tư lại ra vườn lặt lá cây mai vàng trước hiên. Bà bảo lặt xong thì phải tưới thật đẫm, và chỉ tưới vào sáng sớm, không bao giờ tưới lúc trưa nắng.',
        en: 'About half a month before every Tết, Grandma Tư goes out to strip the leaves from the yellow mai by the porch. Afterwards, she says, you water it deeply — only in the early morning, never in the midday sun.',
      },
      {
        vi: 'Năm nào trời lạnh, bà lặt sớm hơn vài hôm. Cây nào còn yếu, bà chừa lại mấy lá non trên ngọn. “Má tôi dạy vậy,” bà kể, “tôi làm theo năm chục năm rồi.”',
        en: 'In cold years she starts a few days early, and a weak tree keeps a few young leaves at its tips. “My mother taught me that,” she says, “and I’ve done it for fifty years.”',
      },
    ],
  },
  card: {
    skill: { vi: 'Lặt lá mai để hoa nở đúng dịp Tết', en: 'Stripping mai leaves so the tree blooms for Tết' },
    context: { vi: 'Vườn nhà ở Nam Bộ; mai vàng trồng chậu hoặc trồng đất.', en: 'Home gardens in southern Vietnam; yellow mai in pots or in the ground.' },
    conditions: { vi: 'Cây khỏe, đủ nắng; khoảng 15 ngày trước Tết khi thời tiết bình thường.', en: 'A healthy tree in full sun; about 15 days before Tết in a normal year.' },
    steps: [
      { vi: 'Lặt lá khoảng 15 ngày trước Tết (năm lạnh thì sớm hơn vài ngày).', en: 'Strip the leaves about 15 days before Tết (a few days earlier in a cold year).' },
      { vi: 'Tưới đẫm ngay sau khi lặt, vào sáng sớm.', en: 'Water deeply right after stripping, early in the morning.' },
      { vi: 'Theo dõi nụ hằng ngày và điều chỉnh lượng nước.', en: 'Check the buds daily and adjust the watering.' },
    ],
    cautions: { vi: 'Không tưới giữa trưa nắng. Cây yếu thì chừa lại vài lá non trên ngọn.', en: 'Never water in the midday sun. Leave a few young leaves on a weak tree.' },
    limits: { vi: 'Kinh nghiệm cá nhân ở một vùng khí hậu; giống mai hoặc thời tiết khác có thể cần điều chỉnh. Không thay thế tư vấn kỹ thuật nông nghiệp.', en: 'Personal know-how from one climate; other varieties or weather may need adjusting. Not a substitute for agronomic advice.' },
    source: { vi: 'Bà Tư (nhân vật minh họa), 72 tuổi, Bến Tre · lời kể 0:00–0:41', en: 'Grandma Tư (fictional), 72, Bến Tre · narration 0:00–0:41' },
  },
};

/**
 * Knowledge preview (B6 #7): six of the illustrative hub samples — cooking, gardening and crafts first — so every card
 * opens a real detail screen (/tri-thuc/mau-…) with the same title, narrator and source.
 */
export const KNOWLEDGE_PREVIEW_IDS = ['mau-ca-kho-to', 'mau-tuot-la-mai', 'mau-dan-ro-tre', 'mau-nhuom-cu-nau', 'mau-hat-giong-gac-bep', 'mau-nam-lut-lon'] as const;

/** The preview cards, resolved from the hub's illustrative set (ids that no longer exist are skipped). */
export function previewItems(): SampleItem[] {
  return KNOWLEDGE_PREVIEW_IDS.map((id) => getSampleItem(id)).filter((x): x is SampleItem => x !== null);
}
