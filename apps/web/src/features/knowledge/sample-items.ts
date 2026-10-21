// ILLUSTRATIVE DATA ("Dữ liệu minh hoạ"). Shown only when the public hub has zero approved items, always under
// a banner and an IllustrativeBadge. Every narrator here is a fictional character written by the project team;
// none of this is a real recording. Ids start with 'mau-' so /tri-thuc/mau-… renders the sample.
import type { Region, StoryKind } from '@lh/shared';
import type { Locale } from '@/i18n';
import { stripDiacritics } from '@/lib/format';
import type { KnowledgeFilters } from './filters';

export interface Bi {
  vi: string;
  en: string;
}

export interface SampleExperience {
  skill: Bi;
  context: Bi | null;
  conditions: Bi[];
  steps: Bi[];
  cautions: Bi[];
  limits: Bi | null;
}

export interface SampleItem {
  id: string;
  kind: StoryKind;
  topicSlug: string;
  /** A short verbatim-style quote used as the card title. */
  title: Bi;
  summary: Bi;
  body: Bi;
  experience?: SampleExperience;
  narratorLabel: Bi;
  region: Region;
  decade: number;
  /** Illustrative duration (seconds) of the narration; null = text only. */
  durationS: number | null;
  audioAllowed: boolean;
  publishedAt: string;
}

export const SAMPLE_PREFIX = 'mau-';

export const SAMPLE_ITEMS: readonly SampleItem[] = [
  {
    id: 'mau-tuot-la-mai',
    kind: 'experience',
    topicSlug: 'lam-vuon',
    title: { vi: 'Tuốt lá mai phải canh đúng rằm tháng Chạp, sớm quá hoa nở trước Tết.', en: 'Strip the yellow apricot (mai) leaves on the full moon of the twelfth month — any earlier and it blooms before Tet.' },
    summary: {
      vi: 'Cách canh ngày tuốt lá để cây mai vàng nở đúng mùng Một, theo kinh nghiệm hơn bốn mươi năm trồng mai ở miền Tây.',
      en: 'How to time leaf-stripping so a yellow apricot blossom (mai) tree blooms right on Lunar New Year’s Day, from forty years of growing mai in the Mekong Delta.',
    },
    body: {
      vi: 'Nhà tôi trồng mai từ hồi ba tôi còn sống. Năm nào cũng vậy, cứ tới rằm tháng Chạp là cả nhà ra vườn tuốt lá.\nNhưng không phải năm nào cũng giống năm nào. Trời lạnh thì tuốt sớm hơn vài bữa, trời nắng gắt thì để trễ lại. Cái đó phải nhìn nụ mà đoán.',
      en: 'My family has grown mai since my father was alive. Every year, on the full moon of the twelfth month, the whole household goes out to strip the leaves.\nBut no two years are the same. In a cold year you strip a few days earlier; in a hot one you wait. You have to read the buds.',
    },
    experience: {
      skill: { vi: 'Tuốt lá mai vàng để hoa nở đúng Tết', en: 'Stripping yellow apricot (mai) leaves so it blooms for Tet' },
      context: {
        vi: 'Mai vàng trồng đất hoặc trồng chậu ở Nam Bộ, muốn hoa nở rộ vào ba ngày Tết thay vì nở sớm hay nở muộn.',
        en: 'Yellow mai grown in the ground or in pots in southern Vietnam, when you want full bloom over the three days of Tet rather than early or late.',
      },
      conditions: [
        { vi: 'Cây khoẻ, đã được bón phân và tưới đều từ tháng Mười âm lịch.', en: 'A healthy tree, fed and watered regularly since the tenth lunar month.' },
        { vi: 'Nụ đã to bằng hạt tiêu trở lên.', en: 'Buds at least the size of a peppercorn.' },
      ],
      steps: [
        { vi: 'Khoảng mùng 5 tháng Chạp, ngưng tưới hai ba bữa cho cây hơi “khát”.', en: 'Around the 5th of the twelfth month, stop watering for two or three days so the tree is slightly thirsty.' },
        { vi: 'Rằm tháng Chạp, tuốt hết lá bằng tay, kéo từ cuống ra ngoài, không giật ngược.', en: 'On the full moon, strip every leaf by hand, pulling from the stalk outward — never tug backwards.' },
        { vi: 'Tưới đẫm lại ngay sau khi tuốt.', en: 'Water deeply right after stripping.' },
        { vi: 'Theo dõi nụ mỗi sáng; nếu trời lạnh, nụ chậm thì tưới nước ấm.', en: 'Check the buds every morning; if it is cold and they are slow, water with lukewarm water.' },
      ],
      cautions: [
        { vi: 'Đừng tuốt lá khi cây vừa bị sâu hay vừa sang chậu.', en: 'Don’t strip a tree that has just had pests or has just been repotted.' },
        { vi: 'Tuốt nhẹ tay để khỏi gãy mầm nụ ở nách lá.', en: 'Be gentle so you don’t break the buds at the leaf joints.' },
      ],
      limits: {
        vi: 'Kinh nghiệm ở vùng Cần Thơ; miền Bắc và miền Trung khí hậu khác, ngày tuốt có thể phải đổi.',
        en: 'Based on the Can Tho area; the north and centre have a different climate, so the timing may need to change.',
      },
    },
    narratorLabel: { vi: 'Ông Tư Vườn (bút danh)', en: 'Mr. Tu the Gardener (pen name)' },
    region: 'nam',
    decade: 1980,
    durationS: 214,
    audioAllowed: true,
    publishedAt: '2026-09-02T08:00:00Z',
  },
  {
    id: 'mau-ca-kho-to',
    kind: 'experience',
    topicSlug: 'mon-an',
    title: { vi: 'Nồi cá kho ngon nhờ nước màu tự thắng và lửa riu riu cả buổi chiều.', en: 'Good braised fish comes from home-made caramel and a low flame all afternoon.' },
    summary: {
      vi: 'Cách kho cá lóc trong niêu đất của một người mẹ từng nấu cơm cho cả xóm chài.',
      en: 'How a mother who once cooked for a whole fishing hamlet braised snakehead fish in a clay pot.',
    },
    body: {
      vi: 'Hồi đó nhà đông, tôi nấu cơm cho mười mấy miệng ăn. Cá thì có sẵn, cái khó là làm sao cho cá thấm mà không nát.',
      en: 'Back then the house was full; I cooked for more than ten people. Fish was never short — the hard part was getting it to soak up the flavour without falling apart.',
    },
    experience: {
      skill: { vi: 'Kho cá lóc trong niêu đất', en: 'Braising snakehead fish in a clay pot' },
      context: {
        vi: 'Khi muốn cá kho chắc thịt, thấm đều và để được vài ngày mà không cần tủ lạnh.',
        en: 'When you want braised fish that stays firm, absorbs the seasoning evenly and keeps for a few days without a fridge.',
      },
      conditions: [
        { vi: 'Cá tươi, làm sạch nhớt bằng muối và nước nóng già.', en: 'Fresh fish, cleaned of slime with salt and very hot water.' },
        { vi: 'Niêu đất đã được “tôi” (luộc nước vo gạo) từ trước.', en: 'A clay pot already seasoned by boiling rice water in it.' },
      ],
      steps: [
        { vi: 'Thắng đường với chút mỡ tới khi màu cánh gián thì tắt bếp, thêm nước sôi.', en: 'Caramelise sugar with a little lard until it is the colour of a cockroach wing, take it off the heat and add boiling water.' },
        { vi: 'Ướp cá với nước mắm, tiêu, hành tím và nước màu chừng nửa giờ.', en: 'Marinate the fish with fish sauce, pepper, shallots and the caramel for about half an hour.' },
        { vi: 'Lót vài lát gừng dưới đáy niêu, xếp cá lên, đun lửa lớn cho sôi.', en: 'Line the pot with a few slices of ginger, lay the fish on top and bring to a boil over high heat.' },
        { vi: 'Hạ lửa riu riu, để hé nắp, kho tới khi nước sệt lại.', en: 'Lower to the gentlest simmer, lid ajar, until the sauce thickens.' },
      ],
      cautions: [{ vi: 'Đừng đảo cá trong lúc kho, chỉ nghiêng niêu cho nước áo đều.', en: 'Don’t stir the fish while it cooks — just tilt the pot so the sauce coats it.' }],
      limits: { vi: 'Lượng gia vị là theo khẩu vị miền Nam, khá ngọt; nên nêm lại cho hợp.', en: 'The seasoning follows southern taste, which is fairly sweet; adjust to your own.' },
    },
    narratorLabel: { vi: 'Bà Năm Chợ Cũ (bút danh)', en: 'Grandma Nam of the Old Market (pen name)' },
    region: 'nam',
    decade: 1970,
    durationS: 168,
    audioAllowed: true,
    publishedAt: '2026-08-21T08:00:00Z',
  },
  {
    id: 'mau-nhuom-cu-nau',
    kind: 'experience',
    topicSlug: 'nghe-nghiep',
    title: { vi: 'Vải nhuộm củ nâu phải phơi đủ bảy nắng mới lên màu bền.', en: 'Cloth dyed with dye-yam needs seven suns before the colour holds.' },
    summary: {
      vi: 'Kinh nghiệm nhuộm vải bằng củ nâu của một người thợ dệt làng nghề đồng bằng Bắc Bộ.',
      en: 'Dyeing cloth with dye-yam tubers, as remembered by a weaver from a craft village in the Red River Delta.',
    },
    body: {
      vi: 'Ngày trước áo nâu là áo của cả làng. Mẹ tôi nhuộm, rồi tôi nhuộm. Củ nâu giã ra, ngâm vải, phơi, rồi lại ngâm.',
      en: 'In the old days, brown clothes were what the whole village wore. My mother dyed them, then I did. Pound the tubers, soak the cloth, dry it, soak it again.',
    },
    experience: {
      skill: { vi: 'Nhuộm vải bằng củ nâu', en: 'Dyeing cloth with dye-yam' },
      context: { vi: 'Nhuộm vải bông hoặc vải tơ tằm thành màu nâu đỏ bền màu mà không dùng thuốc nhuộm công nghiệp.', en: 'Dyeing cotton or silk a lasting reddish brown without industrial dyes.' },
      conditions: [{ vi: 'Có nắng to liên tục nhiều ngày.', en: 'Several days of strong, steady sunshine.' }],
      steps: [
        { vi: 'Giã nát củ nâu, ngâm nước một đêm rồi lọc lấy nước cốt.', en: 'Pound the tubers, soak overnight and strain off the liquid.' },
        { vi: 'Nhúng vải cho thật đẫm, vắt nhẹ, phơi ngoài nắng.', en: 'Soak the cloth through, wring lightly and dry it in the sun.' },
        { vi: 'Khô rồi lại nhúng, lặp lại tới khi đủ bảy lượt nắng.', en: 'Once dry, dip again — repeat until it has had seven rounds of sun.' },
      ],
      cautions: [{ vi: 'Nhựa củ nâu dính tay khó rửa, nên đeo bao tay.', en: 'The sap stains hands and is hard to wash off; wear gloves.' }],
      limits: null,
    },
    narratorLabel: { vi: 'Bà Hai Thợ Dệt (bút danh)', en: 'Grandma Hai the Weaver (pen name)' },
    region: 'bac',
    decade: 1960,
    durationS: null,
    audioAllowed: false,
    publishedAt: '2026-08-14T08:00:00Z',
  },
  {
    id: 'mau-nam-lut-lon',
    kind: 'story',
    topicSlug: 'que-huong',
    title: { vi: 'Năm lụt lớn, cả xóm nấu chung một nồi cháo trên gác nhà thờ họ.', en: 'In the year of the great flood, the whole hamlet shared one pot of rice porridge in the clan house loft.' },
    summary: {
      vi: 'Ký ức về mùa lũ năm ấy và cách người trong xóm chia nhau từng bơ gạo.',
      en: 'A memory of that flood season, and how neighbours shared every last cup of rice.',
    },
    body: {
      vi: 'Nước lên trong một đêm. Sáng ra mở cửa thì nước đã ngang thềm, tới trưa thì ngập tới bàn thờ.\nÔng trưởng họ cho mở gác nhà thờ, ai còn gạo thì đem lên. Tôi nhớ nồi cháo to lắm, phải hai người khiêng.\nKhông ai giành phần. Người già ăn trước, con nít ăn sau, người lớn ăn cuối. Ba ngày sau nước rút, nhà nào cũng mất nhiều thứ, mà không mất người nào.\nTới giờ tôi vẫn nghĩ, cái làm cho xóm mình qua được không phải là gạo, mà là cái gác ấy.',
      en: 'The water rose in a single night. By morning it was at the doorstep; by noon it reached the ancestral altar.\nThe clan elder opened the loft of the clan house and everyone who still had rice carried it up. I remember the porridge pot was so big it took two people to lift.\nNobody grabbed. The old ate first, then the children, then the adults. Three days later the water went down. Every house had lost a lot, but no one had lost a person.\nI still think what got our hamlet through wasn’t the rice. It was that loft.',
    },
    narratorLabel: { vi: 'Ông Bảy Sông Hương (bút danh)', en: 'Mr. Bay of the Perfume River (pen name)' },
    region: 'trung',
    decade: 1960,
    durationS: 251,
    audioAllowed: true,
    publishedAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'mau-dan-ro-tre',
    kind: 'experience',
    topicSlug: 'nghe-nghiep',
    title: { vi: 'Nan tre chẻ mỏng như lá lúa thì cái rổ mới dẻo, dùng chục năm không gãy.', en: 'Split the bamboo as thin as a rice leaf and the basket stays supple for ten years.' },
    summary: {
      vi: 'Những điều cần biết khi chọn tre và chẻ nan đan rổ, rá, từ một người đan lát ở miền Trung.',
      en: 'What to know when choosing bamboo and splitting strips for baskets, from a basket-weaver in central Vietnam.',
    },
    body: {
      vi: 'Tre phải chọn cây ba năm tuổi, chặt vào mùa khô. Tre non thì mềm mà mau mọt, tre già thì giòn.',
      en: 'Choose three-year-old bamboo and cut it in the dry season. Young bamboo is soft but gets weevils; old bamboo is brittle.',
    },
    experience: {
      skill: { vi: 'Chọn tre và chẻ nan đan rổ', en: 'Choosing bamboo and splitting strips for baskets' },
      context: { vi: 'Đan rổ, rá, nia dùng hằng ngày trong bếp và ngoài đồng.', en: 'Weaving everyday baskets, sieves and winnowing trays for the kitchen and the field.' },
      conditions: [
        { vi: 'Tre ba năm tuổi, chặt vào mùa khô.', en: 'Three-year-old bamboo cut in the dry season.' },
        { vi: 'Dao chẻ thật bén.', en: 'A very sharp splitting knife.' },
      ],
      steps: [
        { vi: 'Ngâm tre dưới ao chừng một tháng cho hết nhựa, đỡ mọt.', en: 'Soak the bamboo in a pond for about a month to draw out the sap and keep weevils away.' },
        { vi: 'Phơi khô trong bóng râm, không phơi nắng gắt.', en: 'Dry it in the shade, never in harsh sun.' },
        { vi: 'Chẻ nan theo thớ, giữ dao thẳng, mỏng đều như lá lúa.', en: 'Split along the grain, knife straight, evenly thin as a rice leaf.' },
        { vi: 'Đan từ đáy lên, nan dọc nan ngang khít nhau.', en: 'Weave from the base up, keeping the strips tight.' },
      ],
      cautions: [],
      limits: { vi: 'Áp dụng cho tre gai, tre ngà vùng đồng bằng; các loại tre, nứa khác cần cách xử lý riêng.', en: 'Applies to common lowland bamboo; other bamboo and reed species need different treatment.' },
    },
    narratorLabel: { vi: 'Ông Ba Đan Lát (bút danh)', en: 'Mr. Ba the Basket-weaver (pen name)' },
    region: 'trung',
    decade: 1970,
    durationS: 142,
    audioAllowed: true,
    publishedAt: '2026-07-30T08:00:00Z',
  },
  {
    id: 'mau-tien-de-danh',
    kind: 'story',
    topicSlug: 'gia-dinh',
    title: { vi: 'Mẹ dặn: tiền để dành là để lúc nhà có việc, không phải để cho người ta thấy.', en: 'Mother told me: savings are for when the family needs them, not for others to see.' },
    summary: {
      vi: 'Một bài học về chi tiêu và sự kín đáo mà người kể giữ suốt đời.',
      en: 'A lesson about money and discretion that the narrator has kept all her life.',
    },
    body: {
      vi: 'Mẹ tôi bán hàng xén ngoài chợ huyện. Mỗi phiên chợ, mẹ bỏ riêng mấy đồng vào cái ống tre treo trên xà nhà.\nCó lần tôi xin tiền may áo mới để đi hội, mẹ không cho. Tôi giận cả tuần.\nĐến năm ba tôi ốm nặng, cái ống tre ấy chạy được thuốc cho ba suốt mấy tháng. Lúc đó tôi mới hiểu.\nBây giờ tôi cũng dặn con cháu như vậy: có thì cất đi, đừng khoe; ai cần thì giúp, đừng kể.',
      en: 'My mother sold sundries at the district market. Every market day she set aside a few coins in a bamboo tube hung from the roof beam.\nOnce I asked for money for a new dress for the village festival and she said no. I sulked for a whole week.\nThe year my father fell seriously ill, that bamboo tube paid for his medicine for months. Only then did I understand.\nNow I tell my children and grandchildren the same: if you have something, put it away and don’t show it off; if someone needs help, help them and don’t tell.',
    },
    narratorLabel: { vi: 'Bà Sáu Hàng Xén (bút danh)', en: 'Grandma Sau the Sundries Seller (pen name)' },
    region: 'bac',
    decade: 1950,
    durationS: 189,
    audioAllowed: true,
    publishedAt: '2026-09-18T08:00:00Z',
  },
  {
    id: 'mau-hat-giong-gac-bep',
    kind: 'experience',
    topicSlug: 'lam-vuon',
    title: { vi: 'Hạt giống để dành phải treo trên gác bếp cho khô khói thì mùa sau mới nảy.', en: 'Keep your seeds hung above the kitchen fire to dry in the smoke, or they won’t sprout next season.' },
    summary: {
      vi: 'Cách giữ hạt giống bầu, bí, mướp qua mùa mưa ẩm theo lối nhà nông xưa.',
      en: 'How old farming households kept gourd, squash and luffa seeds through the damp season.',
    },
    body: {
      vi: 'Nhà nào ở quê cũng có cái gác bếp. Trên đó treo đủ thứ: bắp giống, quả bầu khô, túi hạt mướp.',
      en: 'Every country house had a rack above the kitchen fire, hung with everything: seed corn, dried gourds, little bags of luffa seeds.',
    },
    experience: {
      skill: { vi: 'Giữ hạt giống qua mùa ẩm', en: 'Keeping seeds through the damp season' },
      context: { vi: 'Để dành hạt giống rau, bầu bí cho vụ sau khi không có tủ bảo quản.', en: 'Saving vegetable and gourd seeds for next season without any storage cabinet.' },
      conditions: [{ vi: 'Quả để giống phải già hẳn trên cây.', en: 'Seed fruit must fully ripen on the vine.' }],
      steps: [
        { vi: 'Chọn quả to, đều, không sâu, để già trên giàn.', en: 'Pick large, even, pest-free fruit and let it age on the trellis.' },
        { vi: 'Hái về, để nguyên quả, treo trên gác bếp.', en: 'Bring it in whole and hang it above the kitchen fire.' },
        { vi: 'Khi tới vụ, tách hạt, ngâm nước ấm nửa ngày rồi mới gieo.', en: 'At planting time, take out the seeds and soak them in lukewarm water for half a day before sowing.' },
      ],
      cautions: [{ vi: 'Không treo sát lửa, hạt bị chín sẽ không nảy mầm.', en: 'Don’t hang it too close to the flame — cooked seeds won’t germinate.' }],
      limits: { vi: 'Hợp với bếp củi; nhà dùng bếp ga cần chỗ khô thoáng khác.', en: 'Suits wood-fired kitchens; homes with gas stoves need another dry, airy spot.' },
    },
    narratorLabel: { vi: 'Ông Chín Gác Bếp (bút danh)', en: 'Mr. Chin of the Kitchen Rack (pen name)' },
    region: 'bac',
    decade: 1990,
    durationS: null,
    audioAllowed: false,
    publishedAt: '2026-08-05T08:00:00Z',
  },
  {
    id: 'mau-tet-ao-moi',
    kind: 'story',
    topicSlug: 'tuoi-tho',
    title: { vi: 'Tết hồi nhỏ, tôi chỉ mong có bộ áo mới để sáng mùng Một đi chúc Tết ông bà.', en: 'As a child, all I wanted for Tet was a new outfit to wear when wishing my grandparents a happy New Year.' },
    summary: {
      vi: 'Một buổi sáng mùng Một và bộ áo may từ tấm vải mẹ để dành cả năm.',
      en: 'One New Year’s morning, and the outfit sewn from cloth mother had saved all year.',
    },
    body: {
      vi: 'Nhà nghèo, cả năm có một bộ áo mới là quý lắm. Mẹ mua vải từ tháng Chín, cất trong rương, tới hai mươi tháng Chạp mới đem ra may.\nĐêm Giao thừa tôi không ngủ được, cứ sờ cái áo hoài.\nSáng mùng Một, tôi mặc áo mới chạy qua nhà ông bà. Ông xoa đầu, cho tôi một phong bao đỏ, trong có tờ tiền mới tinh. Tôi giữ tờ tiền đó tới tận hết tháng Giêng mới dám tiêu.',
      en: 'We were poor, so one new outfit a year was precious. Mother bought the cloth in the ninth month, kept it in a chest, and only took it out to sew on the twentieth of the twelfth month.\nOn New Year’s Eve I couldn’t sleep; I kept touching the shirt.\nOn the first morning I put it on and ran to my grandparents’ house. Grandfather patted my head and gave me a red envelope with a crisp new note inside. I kept that note until the end of the first month before I dared to spend it.',
    },
    narratorLabel: { vi: 'Bà Út Bến Tre (bút danh)', en: 'Grandma Ut of Ben Tre (pen name)' },
    region: 'nam',
    decade: 1950,
    durationS: 133,
    audioAllowed: true,
    publishedAt: '2026-09-25T08:00:00Z',
  },
];

export function isSampleId(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith(SAMPLE_PREFIX);
}

export function getSampleItem(id: string | undefined | null): SampleItem | null {
  if (!isSampleId(id)) return null;
  return SAMPLE_ITEMS.find((s) => s.id === id) ?? null;
}

function norm(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

function haystack(s: SampleItem): string {
  const parts: string[] = [s.title.vi, s.title.en, s.summary.vi, s.summary.en, s.body.vi, s.body.en, s.narratorLabel.vi];
  if (s.experience) parts.push(s.experience.skill.vi, s.experience.skill.en, ...s.experience.steps.flatMap((x) => [x.vi, x.en]));
  return norm(parts.join(' '));
}

/** Client-side equivalent of search_public for the illustrative set (accent-insensitive, every word must match). */
export function matchSamples(filters: KnowledgeFilters, items: readonly SampleItem[] = SAMPLE_ITEMS): SampleItem[] {
  const words = norm(filters.q).split(/[^a-z0-9]+/).filter(Boolean);
  return items
    .filter((s) => (!filters.topic || s.topicSlug === filters.topic) && (!filters.kind || s.kind === filters.kind))
    .filter((s) => (!filters.region || s.region === filters.region) && (!filters.decade || s.decade === filters.decade))
    .filter((s) => {
      if (words.length === 0) return true;
      const h = haystack(s);
      return words.every((w) => h.includes(w));
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Locale pick helper for non-React code. */
export function pickBi(value: Bi, locale: Locale): string {
  return value[locale];
}
