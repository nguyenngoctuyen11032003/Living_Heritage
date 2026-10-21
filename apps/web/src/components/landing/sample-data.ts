// Illustrative data for the landing page (plan rule 6: always shown with the "Dữ liệu minh hoạ / Illustrative data" label).
// All narrators are fictional characters; durations are illustrative.
import type { SceneKind } from '@/components/illustrations/scenes';

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
  { id: 'ca-kho', scene: 'kitchen', topic: { vi: 'Món ăn', en: 'Cooking' }, quote: { vi: 'Cá kho phải để lửa riu riu cả buổi chiều.', en: 'Braised fish wants a low flame all afternoon.' }, narrator: { vi: 'Bà Năm', en: 'Grandma Nam' }, age: 78, duration: 72 },
  { id: 'mua-gat', scene: 'field', topic: { vi: 'Quê hương', en: 'Hometown' }, quote: { vi: 'Mùa gặt, cả xóm ra đồng từ lúc gà gáy.', en: 'At harvest, the whole village was out before the roosters.' }, narrator: { vi: 'Ông Sáu', en: 'Grandpa Sau' }, age: 81, duration: 125 },
  { id: 'nhao-dat', scene: 'pottery', topic: { vi: 'Nghề thủ công', en: 'Crafts' }, quote: { vi: 'Đất phải nhào ba lượt mới mịn tay.', en: 'Knead the clay three times, until it feels like silk.' }, narrator: { vi: 'Ông Hai', en: 'Grandpa Hai' }, age: 74, duration: 108 },
  { id: 'lat-la-mai', scene: 'garden', topic: { vi: 'Làm vườn', en: 'Gardening' }, quote: { vi: 'Tưới mai lúc sáng sớm, đừng tưới giữa trưa.', en: 'Water the apricot tree at dawn — never in the midday sun.' }, narrator: { vi: 'Bà Tư', en: 'Grandma Tu' }, age: 72, duration: 72 },
  { id: 'banh-chung', scene: 'tet', topic: { vi: 'Gia đình', en: 'Family' }, quote: { vi: 'Đêm ba mươi, cả nhà ngồi canh nồi bánh chưng.', en: 'On New Year’s Eve we all sat up by the pot of banh chung rice cakes.' }, narrator: { vi: 'Bà Ba', en: 'Grandma Ba' }, age: 85, duration: 151 },
  { id: 'cho-que', scene: 'market', topic: { vi: 'Tuổi thơ', en: 'Childhood' }, quote: { vi: 'Chợ quê ngày ấy họp từ lúc trời còn tối.', en: 'The village market opened while it was still dark.' }, narrator: { vi: 'Bà Bảy', en: 'Grandma Bay' }, age: 76, duration: 96 },
  { id: 'xem-may', scene: 'boat', topic: { vi: 'Nghề nghiệp', en: 'Working life' }, quote: { vi: 'Nhìn mây cuối trời là biết mai có sóng.', en: 'One look at the far clouds told us if waves were coming.' }, narrator: { vi: 'Ông Tám', en: 'Grandpa Tam' }, age: 80, duration: 114 },
  { id: 'may-ao', scene: 'tailor', topic: { vi: 'Nghề nghiệp', en: 'Working life' }, quote: { vi: 'Đo vai trước, rồi mới đo eo.', en: 'Measure the shoulders first, then the waist.' }, narrator: { vi: 'Bà Chín', en: 'Grandma Chin' }, age: 79, duration: 58 },
  { id: 'pha-tra', scene: 'tea', topic: { vi: 'Nếp nhà', en: 'Home ways' }, quote: { vi: 'Tráng ấm bằng nước sôi thì trà mới dậy hương.', en: 'Warm the pot with boiling water and the tea opens up.' }, narrator: { vi: 'Ông Mười', en: 'Grandpa Muoi' }, age: 83, duration: 80 },
  { id: 'den-ong-sao', scene: 'lantern', topic: { vi: 'Tuổi thơ', en: 'Childhood' }, quote: { vi: 'Ông dán cho tôi chiếc đèn ông sao bằng giấy kính.', en: 'Grandpa made me a star lantern out of cellophane.' }, narrator: { vi: 'Bà Út', en: 'Grandma Ut' }, age: 71, duration: 101 },
];

export interface TimedLine {
  /** start, seconds */
  t: number;
  text: Bi;
  /** Contains a passage the AI was unsure about ([?]) — must be checked by the narrator. */
  uncertain?: boolean;
}

/** Block 3 — one family memory with a timed transcript (58 s, simulated clock). */
export const SAMPLE_STORY = {
  title: { vi: 'Cái Tết đầu tiên ở nhà mới', en: 'Our first Lunar New Year (Tet) in the new house' },
  narrator: { vi: 'Bà Ba, 85 tuổi · Nam Định', en: 'Grandma Ba, 85 · Nam Dinh' },
  topic: { vi: 'Gia đình · Ký ức', en: 'Family · Memory' },
  duration: 58,
  scene: 'porch' as SceneKind,
  lines: [
    { t: 0, text: { vi: 'Năm đó nhà mới dựng xong, vách còn thơm mùi vôi.', en: 'That year the house was newly built — the walls still smelled of fresh lime.' } },
    { t: 8, text: { vi: 'Ông nhà tôi chặt cây tre ngoài ngõ về dựng cây nêu.', en: 'My husband cut a bamboo from the lane to raise the New Year pole.' } },
    { t: 17, text: { vi: 'Bọn trẻ thì tranh nhau rửa lá dong ngoài giếng.', en: 'The children squabbled over who got to wash the dong leaves at the well.' } },
    { t: 27, text: { vi: 'Tôi gói mười hai cái bánh, cái nào cũng vuông vức.', en: 'I wrapped twelve banh chung rice cakes, every one of them perfectly square.' } },
    { t: 38, text: { vi: 'Đêm ấy cả nhà ngồi quanh bếp lửa, chẳng ai muốn đi ngủ.', en: 'That night we sat around the fire and nobody wanted to go to bed.' } },
    { t: 48, text: { vi: 'Giờ nghĩ lại, ấm nhất là được ngồi cạnh nhau.', en: 'Looking back, the warmest part was simply sitting side by side.' } },
  ] satisfies TimedLine[],
};

/** Block 7 — one narration, three outputs (gardening: stripping mai leaves before Tết). */
export const OUTPUT_SAMPLE = {
  narrator: { vi: 'Bà Tư, 72 tuổi · Bến Tre', en: 'Grandma Tu, 72 · Ben Tre' },
  duration: 41,
  transcript: [
    { t: 0, text: { vi: 'Mai thì phải lặt lá trước Tết chừng mười lăm ngày, con à.', en: 'You strip the leaves off the yellow apricot blossom tree about fifteen days before Tet, dear.' } },
    { t: 7, text: { vi: 'Lặt xong phải tưới cho đẫm, tưới lúc sáng sớm, đừng tưới giữa trưa nắng.', en: 'Once they’re off, water it deeply — early in the morning, never in the midday sun.' } },
    { t: 16, text: { vi: 'Năm nào trời lạnh thì lặt sớm hơn vài bữa, [?] bón thêm chút phân kali.', en: 'In a cold year, strip a few days earlier and [?] add a little potash.' }, uncertain: true },
    { t: 26, text: { vi: 'Cây còn yếu thì đừng lặt hết, chừa lại mấy lá non trên ngọn.', en: 'If the tree is weak, don’t strip it bare — leave a few young leaves at the tips.' } },
    { t: 35, text: { vi: 'Má tôi dạy vậy, tôi làm theo năm chục năm rồi.', en: 'My mother taught me that, and I’ve done it for fifty years.' } },
  ] satisfies TimedLine[],
  story: {
    title: { vi: 'Năm mươi mùa mai của bà Tư', en: 'Fifty apricot blossom seasons with Grandma Tu' },
    paragraphs: [
      {
        vi: 'Cứ khoảng nửa tháng trước Tết, bà Tư lại ra vườn lặt lá cây mai vàng trước hiên. Bà bảo lặt xong thì phải tưới thật đẫm, và chỉ tưới vào sáng sớm, không bao giờ tưới lúc trưa nắng.',
        en: 'About half a month before every Tet, Grandma Tu goes out to strip the leaves from the yellow apricot blossom tree by the porch. Afterwards, she says, you water it deeply — only in the early morning, never in the midday sun.',
      },
      {
        vi: 'Năm nào trời lạnh, bà lặt sớm hơn vài hôm. Cây nào còn yếu, bà chừa lại mấy lá non trên ngọn. “Má tôi dạy vậy,” bà kể, “tôi làm theo năm chục năm rồi.”',
        en: 'In cold years she starts a few days early, and a weak tree keeps a few young leaves at its tips. “My mother taught me that,” she says, “and I’ve done it for fifty years.”',
      },
    ],
  },
  card: {
    skill: { vi: 'Lặt lá mai để hoa nở đúng dịp Tết', en: 'Stripping a yellow apricot blossom tree so it blooms for Tet' },
    context: { vi: 'Vườn nhà ở Nam Bộ; mai vàng trồng chậu hoặc trồng đất.', en: 'Home gardens in southern Vietnam; yellow apricot blossom trees in pots or in the ground.' },
    conditions: { vi: 'Cây khoẻ, đủ nắng; khoảng 15 ngày trước Tết khi thời tiết bình thường.', en: 'A healthy tree in full sun; about 15 days before Tet in a normal year.' },
    steps: [
      { vi: 'Lặt lá khoảng 15 ngày trước Tết (năm lạnh thì sớm hơn vài ngày).', en: 'Strip the leaves about 15 days before Tet (a few days earlier in a cold year).' },
      { vi: 'Tưới đẫm ngay sau khi lặt, vào sáng sớm.', en: 'Water deeply right after stripping, early in the morning.' },
      { vi: 'Theo dõi nụ hằng ngày và điều chỉnh lượng nước.', en: 'Check the buds daily and adjust the watering.' },
    ],
    cautions: { vi: 'Không tưới giữa trưa nắng. Cây yếu thì chừa lại vài lá non trên ngọn.', en: 'Never water in the midday sun. Leave a few young leaves on a weak tree.' },
    limits: { vi: 'Kinh nghiệm cá nhân ở một vùng khí hậu; giống mai hoặc thời tiết khác có thể cần điều chỉnh. Không thay thế tư vấn kỹ thuật nông nghiệp.', en: 'Personal know-how from one climate; other varieties or weather may need adjusting. Not a substitute for agronomic advice.' },
    source: { vi: 'Bà Tư (nhân vật minh hoạ), 72 tuổi, Bến Tre · lời kể 0:00–0:41', en: 'Grandma Tu (fictional), 72, Ben Tre · narration 0:00–0:41' },
  },
};

export interface KnowledgeSample {
  id: string;
  scene: SceneKind;
  kind: 'experience' | 'story';
  topic: Bi;
  title: Bi;
  excerpt: Bi;
  narrator: Bi;
  region: Bi;
  duration: number;
}

/** Block 9 — six magazine cards. Titles are verbatim-style quotes (StoryCorps pattern). */
export const KNOWLEDGE_SAMPLES: KnowledgeSample[] = [
  {
    id: 'kho-ca',
    scene: 'kitchen',
    kind: 'experience',
    topic: { vi: 'Món ăn', en: 'Cooking' },
    title: { vi: '“Nước kho sệt lại thì mới tắt bếp”', en: '“Only turn off the stove once the sauce turns glossy”' },
    excerpt: { vi: 'Cách kho cá bằng nồi đất: thắng nước màu, lửa riu riu và mẹo giữ cá không nát.', en: 'Braising fish in a clay pot: caramel, a low flame, and how to keep the fish whole.' },
    narrator: { vi: 'Bà Năm', en: 'Grandma Nam' },
    region: { vi: 'Nam Định', en: 'Nam Dinh' },
    duration: 192,
  },
  {
    id: 'lat-la-mai',
    scene: 'garden',
    kind: 'experience',
    topic: { vi: 'Làm vườn', en: 'Gardening' },
    title: { vi: '“Lặt lá mai trước Tết chừng mười lăm ngày”', en: '“Strip the apricot tree’s leaves about fifteen days before Tet”' },
    excerpt: { vi: 'Thời điểm lặt lá, cách tưới và điều cần tránh để mai nở đúng dịp.', en: 'When to strip the leaves, how to water, and what to avoid so it blooms on time.' },
    narrator: { vi: 'Bà Tư', en: 'Grandma Tu' },
    region: { vi: 'Bến Tre', en: 'Ben Tre' },
    duration: 41,
  },
  {
    id: 'nhao-dat',
    scene: 'pottery',
    kind: 'experience',
    topic: { vi: 'Nghề thủ công', en: 'Crafts' },
    title: { vi: '“Đất phải nhào ba lượt mới lên bàn xoay”', en: '“Knead three times before it goes on the wheel”' },
    excerpt: { vi: 'Chọn đất, ủ đất và nhào cho mịn — kinh nghiệm của một người thợ gốm lâu năm.', en: 'Choosing, resting and kneading clay — from a potter with a lifetime at the wheel.' },
    narrator: { vi: 'Ông Hai', en: 'Grandpa Hai' },
    region: { vi: 'Bát Tràng, Hà Nội', en: 'Bat Trang, Hanoi' },
    duration: 245,
  },
  {
    id: 'xem-may',
    scene: 'boat',
    kind: 'experience',
    topic: { vi: 'Nghề nghiệp', en: 'Working life' },
    title: { vi: '“Mây vảy cá cuối trời là mai có gió”', en: '“Fish-scale clouds on the horizon mean wind tomorrow”' },
    excerpt: { vi: 'Những dấu hiệu thời tiết người đi biển truyền miệng, kèm giới hạn khi áp dụng.', en: 'Weather signs fishermen passed down by word of mouth — with their limits spelled out.' },
    narrator: { vi: 'Ông Tám', en: 'Grandpa Tam' },
    region: { vi: 'Quảng Ngãi', en: 'Quang Ngai' },
    duration: 140,
  },
  {
    id: 'ao-dai',
    scene: 'tailor',
    kind: 'story',
    topic: { vi: 'Gia đình', en: 'Family' },
    title: { vi: '“Chiếc áo dài đầu tiên tôi may cho con gái”', en: '“The first ao dai I sewed for my daughter”' },
    excerpt: { vi: 'Một tấm vải để dành nhiều năm và buổi sáng con gái đi thi.', en: 'A length of silk saved for years, and the morning her daughter took her exams.' },
    narrator: { vi: 'Bà Chín', en: 'Grandma Chin' },
    region: { vi: 'Huế', en: 'Hue' },
    duration: 228,
  },
  {
    id: 'mua-gat',
    scene: 'field',
    kind: 'story',
    topic: { vi: 'Quê hương', en: 'Hometown' },
    title: { vi: '“Cả xóm ra đồng từ lúc gà gáy”', en: '“The whole village was out before the roosters”' },
    excerpt: { vi: 'Mùa gặt những năm sáu mươi: đổi công, nắm cơm và tiếng hò trên bờ ruộng.', en: 'Harvest in the sixties: shared labor, rice balls and songs along the dikes.' },
    narrator: { vi: 'Ông Sáu', en: 'Grandpa Sau' },
    region: { vi: 'Thái Bình', en: 'Thai Binh' },
    duration: 125,
  },
];
