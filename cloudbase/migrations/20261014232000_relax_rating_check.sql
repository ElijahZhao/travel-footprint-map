-- 打卡表单默认 rating = 0（未评分），原 CHECK (rating BETWEEN 1 AND 5)
-- 会拒绝未评分的保存。放宽为 0–5，使「不评星」成为合法状态。
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_rating_check;
ALTER TABLE public.checkins ADD CONSTRAINT checkins_rating_check CHECK (rating BETWEEN 0 AND 5);
