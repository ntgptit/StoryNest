-- Development seed: categories, tags, three demo authors, six stories and their chapters.
--
--   * DEVELOPMENT AND E2E ONLY. It lives outside supabase/migrations on purpose and refuses to run unless the
--     session (or database) is explicitly marked as development: SET storynest.environment = 'dev';
--     On Supabase hosted projects ALTER DATABASE ... SET is not permitted, so put that SET in the same session
--     as the seed. It is a deliberate acknowledgement, not a secret: never run the seed against production.
--     ('local' is set by the local shim.)
--   * Idempotent: fixed ids and ON CONFLICT DO NOTHING; a chapter is published only while it is not published yet,
--     so re-running creates no new versions, events or notifications. It never deletes anything.
--   * Chapters are published through the real RPC public.publish_chapter (as their author), not by writing the
--     version tables directly, so the seed exercises the same path the Studio will use.
--   * The demo authors cannot sign in (random password hash, no identity). Content is original sample text.

DO $$
BEGIN
  IF coalesce(current_setting('storynest.environment', true), '') NOT IN ('local', 'dev') THEN
    RAISE EXCEPTION 'Refusing to seed: this session is not marked as development. '
                    'Run SET storynest.environment = ''dev'' (development databases only) first.';
  END IF;
END $$;

-- 1. Categories (tree) and tags ---------------------------------------------------------------------------------
INSERT INTO public.categories (slug, name, parent_id, sort_order) VALUES
  ('lang-man',            'Lãng mạn',              NULL, 10),
  ('gia-tuong',           'Giả tưởng',             NULL, 20),
  ('phieu-luu',           'Phiêu lưu',             NULL, 30),
  ('trinh-tham-kinh-di',  'Trinh thám - Kinh dị',  NULL, 40),
  ('doi-thuong',          'Đời thường',            NULL, 50),
  ('khoa-hoc-vien-tuong', 'Khoa học viễn tưởng',   NULL, 60)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (slug, name, parent_id, sort_order)
SELECT v.slug, v.name, p.id, v.sort_order
  FROM (VALUES ('lang-man-hoc-duong', 'Lãng mạn học đường', 'lang-man', 11),
               ('gia-tuong-hien-dai', 'Giả tưởng hiện đại', 'gia-tuong', 21)) AS v(slug, name, parent, sort_order)
  JOIN public.categories p ON p.slug = v.parent
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.tags (slug, display_name) VALUES
  ('tinh-yeu', 'Tình yêu'), ('truong-thanh', 'Trưởng thành'), ('du-lich', 'Du lịch'),
  ('phep-thuat', 'Phép thuật'), ('bi-an', 'Bí ẩn'), ('gia-dinh', 'Gia đình'), ('hai-huoc', 'Hài hước')
ON CONFLICT (slug) DO NOTHING;

-- 2. Demo authors (profiles are created by the handle_new_user trigger) --------------------------------------------
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
SELECT '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,
       extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('username', v.username, 'display_name', v.display_name),
       now(), now(), '', '', '', ''
  FROM (VALUES
    ('5eed0000-0000-4000-8000-00000000a001', 'demo.an@seed.storynest.test',   'demo_an',   'An Nhiên'),
    ('5eed0000-0000-4000-8000-00000000a002', 'demo.binh@seed.storynest.test', 'demo_binh', 'Bình Minh'),
    ('5eed0000-0000-4000-8000-00000000a003', 'demo.chi@seed.storynest.test',  'demo_chi',  'Chi Lan')
  ) AS v(id, email, username, display_name)
ON CONFLICT (id) DO NOTHING;

-- 3. Stories -------------------------------------------------------------------------------------------------------
INSERT INTO public.stories (id, owner_id, category_id, slug, title, synopsis, language_code, status, visibility, is_mature)
SELECT v.id::uuid, v.owner::uuid, c.id, v.slug, v.title, v.synopsis, 'vi', v.status, v.visibility, v.is_mature
  FROM (VALUES
    ('5eed0000-0000-4000-8000-00000000b001', '5eed0000-0000-4000-8000-00000000a001', 'lang-man-hoc-duong', 'anh-chieu',
     'Ánh chiều', 'Một lá thư không đề tên được tìm thấy trong ngăn bàn cũ của thư viện trường, và hai người xa lạ bắt đầu viết cho nhau.',
     'ongoing', 'public', false),
    ('5eed0000-0000-4000-8000-00000000b002', '5eed0000-0000-4000-8000-00000000a002', 'phieu-luu', 'nhat-ky-lu-hanh',
     'Nhật ký lữ hành', 'Ba tháng đi bộ xuyên qua những ngôi làng nằm ngoài bản đồ, và những người đã cho tôi một chỗ ngủ.',
     'completed', 'public', false),
    ('5eed0000-0000-4000-8000-00000000b003', '5eed0000-0000-4000-8000-00000000a003', 'gia-tuong-hien-dai', 'rung-suong-mu',
     'Rừng sương mù', 'Khu rừng sau nhà biến mất mỗi sáng thứ Hai. Cô bé Mây là người duy nhất nhớ nó từng tồn tại.',
     'ongoing', 'public', false),
    ('5eed0000-0000-4000-8000-00000000b004', '5eed0000-0000-4000-8000-00000000a001', 'doi-thuong', 'nhung-nguoi-ban-cu',
     'Những người bạn cũ', 'Mười năm sau buổi tốt nghiệp, cả nhóm hẹn nhau ở quán cà phê đầu ngõ, nơi mọi thứ vẫn y nguyên, trừ chúng tôi.',
     'hiatus', 'public', false),
    ('5eed0000-0000-4000-8000-00000000b005', '5eed0000-0000-4000-8000-00000000a002', 'trinh-tham-kinh-di', 'dem-khong-ngu',
     'Đêm không ngủ', 'Người gác đêm của tòa nhà số 9 nghe thấy tiếng bước chân trên tầng không có ai ở. Truyện có nội dung dành cho người lớn.',
     'ongoing', 'public', true),
    ('5eed0000-0000-4000-8000-00000000b006', '5eed0000-0000-4000-8000-00000000a003', 'khoa-hoc-vien-tuong', 'ban-nhap-rieng-tu',
     'Bản nháp riêng tư', 'Chưa sẵn sàng cho ai đọc.', 'draft', 'private', false)
  ) AS v(id, owner, category, slug, title, synopsis, status, visibility, is_mature)
  JOIN public.categories c ON c.slug = v.category
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.story_tags (story_id, tag_id)
SELECT s.id, t.id
  FROM (VALUES
    ('anh-chieu', 'tinh-yeu'), ('anh-chieu', 'truong-thanh'),
    ('nhat-ky-lu-hanh', 'du-lich'), ('nhat-ky-lu-hanh', 'truong-thanh'),
    ('rung-suong-mu', 'phep-thuat'), ('rung-suong-mu', 'bi-an'),
    ('nhung-nguoi-ban-cu', 'gia-dinh'), ('nhung-nguoi-ban-cu', 'hai-huoc'),
    ('dem-khong-ngu', 'bi-an')
  ) AS v(story_slug, tag_slug)
  JOIN public.stories s ON s.slug = v.story_slug AND s.id::text LIKE '5eed0000-%'
  JOIN public.tags t ON t.slug = v.tag_slug
ON CONFLICT DO NOTHING;

-- 4. Chapters ----------------------------------------------------------------------------------------------------------
-- Creates chapter + draft with deterministic block ids, then (optionally) publishes it as its author through the RPC.
CREATE OR REPLACE FUNCTION pg_temp.seed_chapter(p_story_slug text, p_order integer, p_title text, p_paragraphs text[], p_publish boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_story uuid;
  v_owner uuid;
  v_id uuid := md5('seed-chapter:' || p_story_slug || ':' || p_order)::uuid;
  v_body jsonb;
  v_status text;
BEGIN
  SELECT id, owner_id INTO STRICT v_story, v_owner
    FROM public.stories WHERE slug = p_story_slug AND id::text LIKE '5eed0000-%';

  INSERT INTO public.chapters (id, story_id, slug, sort_order)
  VALUES (v_id, v_story, 'chuong-' || p_order, p_order)
  ON CONFLICT (id) DO NOTHING;

  SELECT jsonb_build_array(jsonb_build_object('block_id', md5(v_id::text || ':0')::uuid, 'type', 'heading', 'text', p_title))
         || coalesce(jsonb_agg(jsonb_build_object('block_id', md5(v_id::text || ':' || i)::uuid, 'type', 'paragraph', 'text', t)
                               ORDER BY i), '[]'::jsonb)
    INTO v_body
    FROM unnest(p_paragraphs) WITH ORDINALITY AS x(t, i);

  INSERT INTO public.chapter_drafts (chapter_id, title, body, updated_by)
  VALUES (v_id, p_title, v_body, v_owner)
  ON CONFLICT (chapter_id) DO NOTHING;

  IF p_publish THEN
    SELECT status INTO v_status FROM public.chapters WHERE id = v_id;
    IF v_status <> 'published' THEN
      PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
      PERFORM public.publish_chapter(v_id);
    END IF;
  END IF;
END $$;

-- Ánh chiều
SELECT pg_temp.seed_chapter('anh-chieu', 1, 'Lá thư trong ngăn bàn', ARRAY[
  $p$Chiều hôm đó, thư viện vắng đến mức tôi nghe được tiếng bụi rơi trên những kệ sách cũ.$p$,
  $p$Ngăn bàn cuối dãy kẹt cứng. Tôi giật mạnh, và một phong bì màu kem rơi ra, không tem, không tên người nhận.$p$,
  $p$Bên trong chỉ có một dòng: "Nếu bạn đọc được điều này, xin hãy trả lời."$p$], true);
SELECT pg_temp.seed_chapter('anh-chieu', 2, 'Câu trả lời đầu tiên', ARRAY[
  $p$Tôi mất ba ngày để dám viết lại. Ba ngày, và mười hai tờ giấy nháp bị vò nát.$p$,
  $p$Cuối cùng chỉ còn một câu: "Tôi đọc được rồi. Bạn là ai?"$p$,
  $p$Sáng hôm sau, phong bì đã nằm đó, như thể nó chưa từng rời đi.$p$], true);
SELECT pg_temp.seed_chapter('anh-chieu', 3, 'Người viết thư', ARRAY[
  $p$Chữ viết nghiêng, mực xanh, những dấu phẩy đặt rất kỹ. Tôi đoán người ấy là người cẩn thận.$p$,
  $p$"Mình không nói tên," thư viết, "vì mình sợ cậu sẽ nhìn mình khác đi."$p$,
  $p$Tôi đặt thư xuống và nhìn quanh. Trong phòng, mọi người đều đang cúi đầu đọc sách.$p$], true);
SELECT pg_temp.seed_chapter('anh-chieu', 4, 'Hoàng hôn trên sân thượng', ARRAY[
  $p$Chúng tôi hẹn nhau vào cuối tuần, trên sân thượng khối nhà cũ, nơi ánh chiều đổ xuống thành từng mảng cam.$p$,
  $p$Người đến trước tôi đang đứng quay lưng. Tôi nhận ra dáng đứng ấy trước khi nhận ra khuôn mặt.$p$], true);

-- Nhật ký lữ hành
SELECT pg_temp.seed_chapter('nhat-ky-lu-hanh', 1, 'Ngày đầu tiên', ARRAY[
  $p$Tôi rời thị trấn lúc sáu giờ, với một chiếc ba lô nặng hơn dự tính và một đôi giày chưa kịp quen chân.$p$,
  $p$Con đường đất đỏ chạy thẳng vào sương. Không có biển chỉ dẫn, chỉ có tiếng gà gáy từ một nơi rất xa.$p$], true);
SELECT pg_temp.seed_chapter('nhat-ky-lu-hanh', 2, 'Bữa cơm ở làng Nà', ARRAY[
  $p$Bà chủ nhà không hỏi tôi từ đâu đến. Bà chỉ múc thêm cơm và bảo: ăn đi, đường còn dài.$p$,
  $p$Tối đó tôi nằm nghe mưa trên mái lá, và lần đầu tiên sau nhiều tuần, tôi ngủ một giấc không mộng mị.$p$], true);
SELECT pg_temp.seed_chapter('nhat-ky-lu-hanh', 3, 'Điểm đến không có trên bản đồ', ARRAY[
  $p$Ngày thứ chín mươi, tôi đứng trên một con dốc nhìn xuống thung lũng mà không ai trong làng gọi tên.$p$,
  $p$Tôi hiểu ra mình chưa bao giờ đi tìm một nơi chốn. Tôi chỉ đi tìm lý do để quay về.$p$], true);

-- Rừng sương mù
SELECT pg_temp.seed_chapter('rung-suong-mu', 1, 'Sáng thứ Hai', ARRAY[
  $p$Mây thức dậy và thấy cửa sổ phòng mình trống trơn. Khu rừng sau nhà, nơi cô chơi từ nhỏ, không còn ở đó.$p$,
  $p$"Rừng nào?" mẹ hỏi, tay vẫn lật trứng. "Sau nhà mình chỉ có bãi đất trống thôi con."$p$], true);
SELECT pg_temp.seed_chapter('rung-suong-mu', 2, 'Tấm bản đồ bằng sương', ARRAY[
  $p$Mây tìm thấy nó dưới gối: một mảnh giấy ẩm lạnh, nét mực loang ra như thể đang tan.$p$,
  $p$Trên đó có một con đường, và ở cuối con đường là một cái tên cô chưa từng nghe: Hạ Vân.$p$], true);
SELECT pg_temp.seed_chapter('rung-suong-mu', 3, 'Người giữ cổng', ARRAY[
  $p$Lão giữ cổng ngồi trên một gốc cây không có cây. Lão đếm gì đó bằng những ngón tay trong suốt.$p$,
  $p$"Cháu nhớ nó," lão nói mà không ngẩng lên. "Vậy thì cháu phải trả giá."$p$], true);
SELECT pg_temp.seed_chapter('rung-suong-mu', 4, 'Cái giá của ký ức (bản nháp)', ARRAY[
  $p$Chương này vẫn đang được viết.$p$], false);

-- Những người bạn cũ
SELECT pg_temp.seed_chapter('nhung-nguoi-ban-cu', 1, 'Quán cà phê đầu ngõ', ARRAY[
  $p$Quán vẫn treo tấm biển xiêu vẹo ấy. Chỉ có ông chủ là già đi, và nhớ tên chúng tôi nhiều hơn chúng tôi nhớ nhau.$p$,
  $p$Hùng đến muộn nửa tiếng, như hồi mười tám tuổi, và cũng như hồi ấy, không ai trách.$p$], true);
SELECT pg_temp.seed_chapter('nhung-nguoi-ban-cu', 2, 'Bàn tròn', ARRAY[
  $p$Chúng tôi kể về công việc, về những đứa con, về những điều đã làm được. Không ai nhắc đến điều dang dở.$p$,
  $p$Đến khi cốc cuối cùng nguội, Lan mới khẽ hỏi: "Còn nhớ lời hứa năm đó không?"$p$], true);

-- Đêm không ngủ
SELECT pg_temp.seed_chapter('dem-khong-ngu', 1, 'Ca đêm đầu tiên', ARRAY[
  $p$Tòa nhà số 9 có mười hai tầng, nhưng thang máy chỉ dừng ở mười một.$p$,
  $p$Tôi ghi vào sổ trực: 2 giờ 14, tiếng bước chân trên tầng mười hai. Tầng không có ai ở.$p$], true);
SELECT pg_temp.seed_chapter('dem-khong-ngu', 2, 'Cuốn sổ trực', ARRAY[
  $p$Những người gác trước tôi đều để lại cùng một dòng, bằng nhiều nét chữ khác nhau.$p$,
  $p$Dòng ấy là: "Đừng lên tầng mười hai." Và bên dưới, bằng mực còn mới: "Đã quá muộn."$p$], true);

-- Bản nháp riêng tư (never published; story is private)
SELECT pg_temp.seed_chapter('ban-nhap-rieng-tu', 1, 'Khởi đầu', ARRAY[
  $p$Chỉ tác giả mới đọc được dòng này.$p$], false);

SELECT set_config('request.jwt.claims', '', true);
