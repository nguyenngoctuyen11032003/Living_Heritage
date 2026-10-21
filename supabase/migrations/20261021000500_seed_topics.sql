-- Di Sản Sống: bilingual topics and opening questions (6 topics × 5 questions). Runs on the hosted DB
-- too (seed.sql does not). Fixed ids + "on conflict do nothing" keep it idempotent.
-- Slugs must match TOPIC_SLUGS in packages/shared/src/constants.ts; sort = display order.
-- Questions are open and non-leading, addressed respectfully to the elder ("ông/bà").
-- icon = lucide-react icon name.

insert into public.topics (id, slug, title_vi, title_en, icon, sort) values
  ('a0000000-0000-4000-8000-000000000001', 'tuoi-tho', 'Tuổi thơ', 'Childhood', 'sun', 1),
  ('a0000000-0000-4000-8000-000000000002', 'gia-dinh', 'Gia đình', 'Family', 'users', 2),
  ('a0000000-0000-4000-8000-000000000003', 'que-huong', 'Quê hương', 'Hometown', 'house', 3),
  ('a0000000-0000-4000-8000-000000000004', 'nghe-nghiep', 'Nghề nghiệp', 'Work & craft', 'hammer', 4),
  ('a0000000-0000-4000-8000-000000000005', 'mon-an', 'Món ăn', 'Food & cooking', 'utensils', 5),
  ('a0000000-0000-4000-8000-000000000006', 'lam-vuon', 'Làm vườn', 'Gardening', 'sprout', 6)
on conflict do nothing;

insert into public.questions (id, topic_id, prompt_vi, prompt_en, kind_hint, sort) values
  -- Tuổi thơ / Childhood
  ('b0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001',
   'Ông/bà nhớ điều gì nhất về ngày Tết khi còn nhỏ?',
   'What do you remember most about Tết when you were little?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001',
   'Hồi nhỏ, ông/bà hay chơi những trò gì, và chơi cùng ai?',
   'As a child, what games did you play, and who did you play with?', 'story', 2),
  ('b0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001',
   'Ngôi nhà nơi ông/bà lớn lên trông như thế nào?',
   'What was the house you grew up in like?', 'story', 3),
  ('b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001',
   'Thời thơ ấu, có người lớn nào mà ông/bà vẫn nhớ mãi không? Vì sao ạ?',
   'Is there a grown-up from your childhood you still think of often? Why?', 'story', 4),
  ('b0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000001',
   'Ngày đầu tiên đi học của ông/bà diễn ra thế nào?',
   'What was your first day of school like?', 'story', 5),

  -- Gia đình / Family
  ('b0000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000002',
   'Ông/bà kể cho con cháu nghe về cha mẹ của mình được không ạ?',
   'Could you tell us about your own parents?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000002',
   'Ông/bà và người bạn đời đã gặp nhau như thế nào?',
   'How did you and your partner meet?', 'story', 2),
  ('b0000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000002',
   'Nhà mình có món ăn, câu nói hay nếp nhà nào được truyền từ đời trước không ạ?',
   'Is there a dish, a saying or a family custom handed down from earlier generations?', 'story', 3),
  ('b0000000-0000-4000-8000-000000000204', 'a0000000-0000-4000-8000-000000000002',
   'Khoảnh khắc nào bên gia đình khiến ông/bà thấy hạnh phúc nhất?',
   'Which moment with your family made you happiest?', 'story', 4),
  ('b0000000-0000-4000-8000-000000000205', 'a0000000-0000-4000-8000-000000000002',
   'Ông/bà mong con cháu nhớ điều gì về gia đình mình?',
   'What would you like your grandchildren to remember about our family?', 'story', 5),

  -- Quê hương / Hometown
  ('b0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000003',
   'Quê ông/bà ở đâu, và nơi ấy có gì đặc biệt?',
   'Where is your hometown, and what makes it special?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000003',
   'Ngày trước, một ngày bình thường ở quê diễn ra thế nào ạ?',
   'Back then, what was an ordinary day in your hometown like?', 'story', 2),
  ('b0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000003',
   'Ở quê có lễ hội hay phong tục nào ông/bà nhớ mãi không?',
   'Is there a festival or custom from your hometown that has stayed with you?', 'story', 3),
  ('b0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000003',
   'Quê mình bây giờ đã khác xưa ở những điểm nào?',
   'In what ways has your hometown changed since those days?', 'story', 4),
  ('b0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000003',
   'Nếu được đưa con cháu về quê một ngày, ông/bà sẽ dẫn các cháu đi những đâu?',
   'If you could take your grandchildren back home for a day, where would you take them?', 'story', 5),

  -- Nghề nghiệp / Work & craft
  ('b0000000-0000-4000-8000-000000000401', 'a0000000-0000-4000-8000-000000000004',
   'Công việc đầu tiên của ông/bà là gì?',
   'What was your first job?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000402', 'a0000000-0000-4000-8000-000000000004',
   'Ai đã dạy nghề cho ông/bà, và người ấy dạy như thế nào?',
   'Who taught you your trade, and how did they teach you?', 'experience', 2),
  ('b0000000-0000-4000-8000-000000000403', 'a0000000-0000-4000-8000-000000000004',
   'Sau nhiều năm làm nghề, ông/bà đúc kết được mẹo hay bí quyết gì?',
   'After many years of work, what tips or know-how have you learned?', 'experience', 3),
  ('b0000000-0000-4000-8000-000000000404', 'a0000000-0000-4000-8000-000000000004',
   'Có lần nào trong công việc ông/bà gặp khó khăn lớn không? Khi ấy ông/bà đã làm gì?',
   'Was there ever a hard time in your work? What did you do then?', 'story', 4),
  ('b0000000-0000-4000-8000-000000000405', 'a0000000-0000-4000-8000-000000000004',
   'Nếu có người trẻ muốn theo nghề này, ông/bà sẽ dặn họ điều gì?',
   'If a young person wanted to take up this work, what would you tell them?', 'experience', 5),

  -- Món ăn / Food & cooking
  ('b0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000005',
   'Món ăn nào gợi cho ông/bà nhiều kỷ niệm nhất?',
   'Which dish brings back the most memories for you?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000502', 'a0000000-0000-4000-8000-000000000005',
   'Ông/bà kể giúp con cháu cách nấu món ông/bà nấu ngon nhất, từng bước một được không ạ?',
   'Could you walk us through, step by step, the dish you cook best?', 'experience', 2),
  ('b0000000-0000-4000-8000-000000000503', 'a0000000-0000-4000-8000-000000000005',
   'Ngày xưa, mâm cơm nhà mình thường có những món gì?',
   'In the old days, what did a family meal at home usually include?', 'story', 3),
  ('b0000000-0000-4000-8000-000000000504', 'a0000000-0000-4000-8000-000000000005',
   'Có món nào nhà mình chỉ nấu vào dịp Tết hay ngày giỗ không ạ?',
   'Is there a dish your family cooks only for Tết or memorial days?', 'story', 4),
  ('b0000000-0000-4000-8000-000000000505', 'a0000000-0000-4000-8000-000000000005',
   'Khi nấu ăn, ông/bà thường để ý những gì để món ăn vừa ngon vừa sạch?',
   'When you cook, what do you pay attention to so the food is both tasty and clean?', 'experience', 5),

  -- Làm vườn / Gardening
  ('b0000000-0000-4000-8000-000000000601', 'a0000000-0000-4000-8000-000000000006',
   'Ông/bà bắt đầu làm vườn từ khi nào?',
   'When did you start gardening?', 'story', 1),
  ('b0000000-0000-4000-8000-000000000602', 'a0000000-0000-4000-8000-000000000006',
   'Trong vườn, cây nào ông/bà chăm lâu nhất, và ông/bà chăm cây ấy ra sao?',
   'Which plant in your garden have you looked after the longest, and how do you care for it?', 'experience', 2),
  ('b0000000-0000-4000-8000-000000000603', 'a0000000-0000-4000-8000-000000000006',
   'Ông/bà xem trời, xem đất thế nào để biết lúc nào nên gieo trồng?',
   'How do you read the weather and the soil to know when to plant?', 'experience', 3),
  ('b0000000-0000-4000-8000-000000000604', 'a0000000-0000-4000-8000-000000000006',
   'Khi cây bị sâu bệnh, ông/bà thường xử lý thế nào?',
   'When your plants get pests or disease, what do you usually do?', 'experience', 4),
  ('b0000000-0000-4000-8000-000000000605', 'a0000000-0000-4000-8000-000000000006',
   'Có kinh nghiệm làm vườn nào ông/bà muốn truyền lại cho con cháu không ạ?',
   'Is there any gardening know-how you would like to pass on to the next generation?', 'experience', 5)
on conflict do nothing;
