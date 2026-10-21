// ILLUSTRATIVE DATA for the /trai-nghiem walkthrough ("Dữ liệu minh họa"). Every narrator is a fictional character
// written by the project team; no line here is a real recording or a real AI result. The two narrators are the
// pen names already used by the public hub samples (features/knowledge/sample-items.ts), so the public experience
// card the visitor finds on /kham-pha is the same item, with the same narrator, as the "Công khai" card here.
import { getSampleItem, type Bi, type SampleItem } from '@/features/knowledge/sample-items';

export type { Bi };

export type DemoKind = 'memory' | 'experience';

export interface DemoNarrator {
  id: 'ba-nam' | 'ong-tu';
  /** Pen name, exactly as on the hub samples. */
  name: Bi;
  short: Bi;
  meta: Bi;
}

export const DEMO_NARRATORS: Record<DemoNarrator['id'], DemoNarrator> = {
  'ba-nam': {
    id: 'ba-nam',
    name: { vi: 'Bà Năm Chợ Cũ (bút danh)', en: 'Grandma Năm of the Old Market (pen name)' },
    short: { vi: 'Bà Năm', en: 'Grandma Năm' },
    meta: { vi: '78 tuổi · Sài Gòn', en: '78 · Saigon' },
  },
  'ong-tu': {
    id: 'ong-tu',
    name: { vi: 'Ông Tư Vườn (bút danh)', en: 'Mr. Tư Vườn (pen name)' },
    short: { vi: 'Ông Tư', en: 'Mr. Tư' },
    meta: { vi: '74 tuổi · Cần Thơ', en: '74 · Cần Thơ' },
  },
};

export interface DemoLine {
  /** start, seconds (simulated clock) */
  t: number;
  /** `[?]` marks the words the (simulated) transcription was unsure about. */
  text: Bi;
  uncertain?: boolean;
}

export interface DemoNarration {
  kind: DemoKind;
  narrator: DemoNarrator['id'];
  /** seconds */
  duration: number;
  lines: DemoLine[];
  /** The simulated AI's guess for the `[?]` words (what "Giữ nguyên" keeps). */
  guess: Bi;
  draft: {
    title: Bi;
    /** `{fix}` is replaced by the checked words. Paragraphs are separated by a blank line. */
    body: Bi;
  };
  /** Experience narrations also produce a know-how card (read-only in the demo). */
  card?: {
    skill: Bi;
    steps: Bi[];
    cautions: Bi[];
    limits: Bi;
  };
}

export const NARRATIONS: Record<DemoKind, DemoNarration> = {
  memory: {
    kind: 'memory',
    narrator: 'ba-nam',
    duration: 45,
    guess: { vi: 'Tám', en: 'Tám' },
    lines: [
      { t: 0, text: { vi: 'Hồi đó nhà tôi ở gần Chợ Cũ, sáng nào má cũng dắt tôi đi chợ từ lúc trời còn tối.', en: 'Back then we lived near the Old Market, and every morning Mother took me along while it was still dark.' } },
      { t: 8, text: { vi: 'Tết năm nào má cũng kho một nồi cá thiệt lớn, để dành ăn tới mùng ba.', en: 'Every Tết she braised one huge pot of fish to last until the third day.' } },
      { t: 17, text: { vi: 'Cá thì mua của dì [?] ở đầu chợ, dì để dành con ngon nhất cho má.', en: 'She bought the fish from Auntie [?] at the market gate, who kept the best one for her.' }, uncertain: true },
      { t: 27, text: { vi: 'Đêm ba mươi, cả nhà ngồi quanh bếp, mùi nước màu thơm khắp xóm.', en: 'On New Year’s Eve the whole family sat around the stove, and the smell of caramel filled the lane.' } },
      { t: 36, text: { vi: 'Giờ má mất rồi, Tết nào tôi cũng kho một nồi y như vậy cho con cháu.', en: 'Mother is gone now, but every Tết I braise a pot just like hers for my children and grandchildren.' } },
    ],
    draft: {
      title: { vi: 'Nồi cá kho đêm ba mươi', en: 'The New Year’s Eve pot of braised fish' },
      body: {
        vi: 'Hồi nhỏ, bà Năm sống gần Chợ Cũ, sáng nào cũng theo má đi chợ từ lúc trời còn tối. Tết năm nào má bà cũng kho một nồi cá thật lớn, để dành ăn tới mùng ba. Cá mua của dì {fix} ở đầu chợ, người luôn để dành con ngon nhất cho má.\n\nĐêm ba mươi, cả nhà quây quần bên bếp, mùi nước màu thơm khắp xóm. Giờ má đã mất, nhưng Tết nào bà Năm cũng kho một nồi y như vậy cho con cháu.',
        en: 'As a girl, Grandma Năm lived near the Old Market and went with her mother every morning while it was still dark. Every Tết her mother braised one huge pot of fish to last until the third day, bought from Auntie {fix} at the market gate, who always kept the best one for her.\n\nOn New Year’s Eve the family gathered around the stove while the smell of caramel filled the lane. Her mother is gone now, but every Tết Grandma Năm braises a pot just like it for her children and grandchildren.',
      },
    },
  },
  experience: {
    kind: 'experience',
    narrator: 'ong-tu',
    duration: 46,
    guess: { vi: 'vài', en: 'a few' },
    lines: [
      { t: 0, text: { vi: 'Mai nhà tôi trồng từ hồi ba tôi còn sống, năm nào cũng tuốt lá vào rằm tháng Chạp.', en: 'We have grown mai since my father was alive, and every year we strip the leaves on the full moon of the twelfth month.' } },
      { t: 9, text: { vi: 'Trước đó chừng mười ngày thì ngưng tưới hai ba bữa cho cây hơi khát.', en: 'About ten days before, stop watering for two or three days so the tree gets a little thirsty.' } },
      { t: 18, text: { vi: 'Tuốt bằng tay, kéo từ cuống ra ngoài, đừng giật ngược kẻo gãy nụ.', en: 'Strip by hand, pulling from the stalk outward — never tug backwards or you break the buds.' } },
      { t: 27, text: { vi: 'Năm nào trời lạnh thì tuốt sớm hơn [?] bữa, nắng gắt thì để trễ lại.', en: 'In a cold year strip [?] days earlier; in a hot one, wait a little.' }, uncertain: true },
      { t: 37, text: { vi: 'Cây vừa bị sâu hay vừa sang chậu thì đừng tuốt.', en: 'Don’t strip a tree that has just had pests or has just been repotted.' } },
    ],
    draft: {
      title: { vi: 'Tuốt lá mai cho hoa nở đúng Tết', en: 'Stripping mai leaves so it blooms for Tết' },
      body: {
        vi: 'Vườn mai nhà ông Tư có từ thời ba ông. Năm nào ông cũng tuốt lá vào rằm tháng Chạp, trước đó ngưng tưới vài bữa cho cây hơi khát.\n\nÔng dặn tuốt bằng tay, kéo từ cuống ra ngoài để khỏi gãy nụ. Năm trời lạnh thì tuốt sớm hơn {fix} bữa, năm nắng gắt thì để trễ lại.',
        en: 'Mr. Tư’s mai garden goes back to his father’s time. Every year he strips the leaves on the full moon of the twelfth month, after letting the tree go thirsty for a few days.\n\nStrip by hand, he says, pulling from the stalk outward so the buds don’t break. In a cold year he starts {fix} days earlier; in a hot one he waits.',
      },
    },
    card: {
      skill: { vi: 'Tuốt lá mai vàng để hoa nở đúng Tết', en: 'Stripping yellow mai leaves so it blooms for Tết' },
      steps: [
        { vi: 'Ngưng tưới hai ba bữa, khoảng mười ngày trước rằm tháng Chạp.', en: 'Stop watering for two or three days, about ten days before the full moon of the twelfth month.' },
        { vi: 'Rằm tháng Chạp, tuốt lá bằng tay, kéo từ cuống ra ngoài.', en: 'On the full moon, strip the leaves by hand, pulling from the stalk outward.' },
        { vi: 'Tưới đẫm lại ngay sau khi tuốt.', en: 'Water deeply right after stripping.' },
      ],
      cautions: [{ vi: 'Không tuốt cây vừa bị sâu hay vừa sang chậu.', en: 'Don’t strip a tree that has just had pests or been repotted.' }],
      limits: { vi: 'Kinh nghiệm của một người ở Cần Thơ; nơi khác khí hậu khác có thể phải đổi ngày.', en: 'One person’s know-how from Cần Thơ; elsewhere the climate may call for other dates.' },
    },
  },
};

/** Replaces `{fix}` with the checked words. */
export function fillDraft(body: string, fix: string): string {
  return body.split('{fix}').join(fix.trim());
}

// ---------------------------------------------------------------------------
// Sample vault: 3 family stories + 3 experiences (food, gardening, crafts), every status the vault knows.
// ---------------------------------------------------------------------------

export type DemoStatus = 'draft' | 'private' | 'invited' | 'requested' | 'public';

export interface VaultSample {
  id: string;
  kind: 'story' | 'experience';
  topic: string;
  narrator: DemoNarrator['id'];
  status: DemoStatus;
  /** Public items point at the hub sample with the same content (/tri-thuc/:publicId). */
  publicId?: string;
  title?: Bi;
  summary?: Bi;
  body?: Bi;
}

export const VAULT_SAMPLES: readonly VaultSample[] = [
  {
    id: 'demo-dam-cuoi',
    kind: 'story',
    topic: 'gia-dinh',
    narrator: 'ba-nam',
    status: 'draft',
    title: { vi: 'Đám cưới của má năm 1962', en: 'Mother’s wedding in 1962' },
    summary: { vi: 'Bản nháp AI vừa soạn, đang chờ bà Năm nghe lại và duyệt.', en: 'A draft the AI just wrote, waiting for Grandma Năm to listen and approve.' },
    body: {
      vi: 'Má kể đám cưới chỉ có hai mâm cơm, ba mượn chiếc xe đạp của ông chú để rước dâu. Cả xóm kéo tới phụ dựng rạp từ chiều hôm trước.',
      en: 'Mother said the wedding had just two trays of food, and Father borrowed an uncle’s bicycle to fetch the bride. The whole lane came the afternoon before to help put up the awning.',
    },
  },
  {
    id: 'demo-ganh-hang',
    kind: 'story',
    topic: 'tuoi-tho',
    narrator: 'ba-nam',
    status: 'private',
    title: { vi: 'Gánh xôi đầu ngõ', en: 'The sticky-rice seller at the end of the lane' },
    summary: { vi: 'Đã duyệt, chỉ người ghi lại thấy được.', en: 'Approved; only the person who recorded it can see it.' },
    body: {
      vi: 'Sáng nào bà bán xôi cũng ghé đầu ngõ, gõ hai tiếng vào nắp nồi. Má cho tôi năm cắc, tôi chạy ra mua một gói xôi đậu xanh gói lá chuối.',
      en: 'Every morning the sticky-rice seller stopped at the end of the lane and tapped her pot lid twice. Mother gave me five cents and I ran out for a parcel of mung-bean rice wrapped in banana leaf.',
    },
  },
  {
    id: 'demo-nuoc-noi',
    kind: 'story',
    topic: 'que-huong',
    narrator: 'ong-tu',
    status: 'invited',
    title: { vi: 'Mùa nước nổi ở Cần Thơ', en: 'Flood season in Cần Thơ' },
    summary: { vi: 'Chia sẻ với các thành viên được mời trong gia đình.', en: 'Shared with the invited members of the family.' },
    body: {
      vi: 'Tháng Chín nước lên ngập tới bậc thềm. Tụi nhỏ bơi xuồng đi học, ba tôi giăng lưới sau hè bắt cá linh về kho mặn.',
      en: 'In the ninth month the water rose to the doorstep. We children paddled to school, and Father strung nets behind the house to catch linh fish for salty braising.',
    },
  },
  { id: 'demo-ca-kho', kind: 'experience', topic: 'mon-an', narrator: 'ba-nam', status: 'public', publicId: 'mau-ca-kho-to' },
  { id: 'demo-tuot-la-mai', kind: 'experience', topic: 'lam-vuon', narrator: 'ong-tu', status: 'public', publicId: 'mau-tuot-la-mai' },
  {
    id: 'demo-dan-nia',
    kind: 'experience',
    topic: 'nghe-nghiep',
    narrator: 'ong-tu',
    status: 'private',
    title: { vi: 'Vót nan đan nia cho chắc', en: 'Splitting bamboo strips for a sturdy winnowing tray' },
    summary: { vi: 'Kinh nghiệm đan lát, đã duyệt và để riêng tư.', en: 'Weaving know-how, approved and kept private.' },
    body: {
      vi: 'Tre phải chặt lúc trăng khuyết, ngâm bùn một tháng cho khỏi mọt. Nan vót đều tay, mặt cật để ra ngoài thì nia mới bền.',
      en: 'Cut the bamboo when the moon is waning and soak it in mud for a month so insects leave it alone. Split the strips evenly and keep the outer skin facing out, and the tray will last.',
    },
  },
];

/** The hub sample behind a public vault card (null when the id is not a sample). */
export function publicItemOf(sample: Pick<VaultSample, 'publicId'>): SampleItem | null {
  return sample.publicId ? getSampleItem(sample.publicId) : null;
}

/** Book chapter in the sample book: family stories that are approved (never drafts), oldest topic first. */
export const BOOK_STORY_IDS = ['demo-ganh-hang', 'demo-nuoc-noi'] as const;
