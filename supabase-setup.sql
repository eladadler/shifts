-- ============================================================
-- הקמת טבלאות לממשק בין אפליקציית המשבץ לאפליקציית העובדים
-- הריצו את הקובץ הזה פעם אחת ב-Supabase: SQL Editor → New query → הדביקו → Run
-- ============================================================

-- 1. עובדים (מסונכרן אוטומטית מאפליקציית המשבץ; משמש לזיהוי עובד לפי אימייל)
create table if not exists app_employees (
  id         text primary key,
  name       text not null,
  email      text,
  color      text,
  updated_at timestamptz not null default now()
);

-- אסימון מנוי יומן — כתובת ה-ICS של העובד. ניתן לאיפוס: אסימון חדש מנתק את הישן.
alter table app_employees
  add column if not exists cal_token text;

create unique index if not exists app_employees_cal_token
  on app_employees (cal_token) where cal_token is not null;

-- 2. בקשות עובדים (העובדים כותבים מאפליקציית העובד; המשבץ קורא)
create table if not exists employee_requests (
  emp_id      text not null,
  month       text not null,                 -- 'YYYY-MM'
  unavailable jsonb not null default '[]',   -- ["YYYY-MM-DD", ...] לא זמין
  high        jsonb not null default '[]',   -- מעדיף לעבוד
  can         jsonb not null default '[]',   -- יכול לעבוד
  note        text  not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (emp_id, month)
);

-- 3. סידורים שפורסמו (המשבץ כותב בלחיצה על "אישור ופרסום"; העובדים קוראים)
create table if not exists published_schedules (
  month          text primary key,           -- 'YYYY-MM'
  schedule       jsonb not null,             -- { "YYYY-MM-DD": { shiftId: [empId, ...] } }
  shift_settings jsonb,                      -- תמונת הגדרות המשמרות בעת הפרסום
  employees      jsonb not null default '[]',-- [{ id, name, color }]
  published_at   timestamptz not null default now()
);

-- ============================================================
-- הרשאות (RLS) — תואם למדיניות הקיימת של mishmarot_state:
-- גישה מלאה עם מפתח ה-publishable. בעתיד אפשר להדק.
-- ============================================================
alter table app_employees       enable row level security;
alter table employee_requests   enable row level security;
alter table published_schedules enable row level security;

drop policy if exists "open access" on app_employees;
create policy "open access" on app_employees
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "open access" on employee_requests;
create policy "open access" on employee_requests
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "open access" on published_schedules;
create policy "open access" on published_schedules
  for all to anon, authenticated using (true) with check (true);

-- 4. מנויי Push (אפליקציית העובדים כותבת; Service Worker קורא לשליחת התראות)
create table if not exists push_subscriptions (
  emp_id       text primary key,
  subscription jsonb not null,              -- Web Push subscription JSON (endpoint, keys)
  prefs        jsonb not null default '{"alert24h":true,"alertCustom":false,"alertCustomHours":2}',
  updated_at   timestamptz not null default now()
);

-- עמודת prefs לטבלה קיימת (הריצו אם כבר יצרתם את הטבלה בעבר)
alter table push_subscriptions
  add column if not exists prefs jsonb not null default '{"alert24h":true,"alertCustom":false,"alertCustomHours":2}';

alter table push_subscriptions enable row level security;
drop policy if exists "open access" on push_subscriptions;
create policy "open access" on push_subscriptions
  for all to anon, authenticated using (true) with check (true);

-- 5. התראות ממתינות (אפליקציית המשבץ כותבת; Service Worker קורא ומסמן)
create table if not exists pending_notifications (
  id         uuid default gen_random_uuid() primary key,
  emp_id     text not null,
  title      text not null,
  body       text not null default '',
  tag        text not null default '',
  created_at timestamptz not null default now(),
  shown_at   timestamptz                    -- null = טרם הוצג; Service Worker מסמן לאחר הצגה
);

create index if not exists pending_notifications_emp_id_shown_at
  on pending_notifications (emp_id, shown_at)
  where shown_at is null;

alter table pending_notifications enable row level security;
drop policy if exists "open access" on pending_notifications;
create policy "open access" on pending_notifications
  for all to anon, authenticated using (true) with check (true);

-- 6. עובדים ממתינים לאישור (הרשמה עצמית → ממתין לאישור מנהל)
create table if not exists pending_employees (
  id         uuid default gen_random_uuid() primary key,
  email      text not null unique,
  name       text not null default '',
  status     text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now()
);

alter table pending_employees enable row level security;
drop policy if exists "open access" on pending_employees;
create policy "open access" on pending_employees
  for all to anon, authenticated using (true) with check (true);

-- 8. תזמון התראות משמרת (Cron + pg_net) — הריצו פעם אחת ב-SQL Editor
-- create extension if not exists pg_net with schema extensions;
-- select cron.schedule(
--   'shift-reminders',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     'https://ajniglpdgkwnasuslsyc.supabase.co/functions/v1/shift-reminders',
--     '{}',
--     '{"Content-Type":"application/json","apikey":"sb_publishable_zMTTfShJSVqKaGRYlYoqFA_9y_5Q5hk"}'
--   );
--   $$
-- );

-- 7. משוב AI (אדמינים כותבים דרך מצב תחזה; שמור לשיפור פרומפטים)
create table if not exists ai_feedback (
  id           uuid default gen_random_uuid() primary key,
  emp_id       text,
  emp_name     text,
  month        text,
  original_text text,
  ai_result    jsonb,
  rating       text not null,               -- 'good' | 'bad'
  correction   text,
  created_at   timestamptz not null default now()
);

alter table ai_feedback enable row level security;
drop policy if exists "open access" on ai_feedback;
create policy "open access" on ai_feedback
  for all to anon, authenticated using (true) with check (true);

-- 9. בקשות חילוף משמרות (אפליקציית העובד כותבת וקוראת; המשבץ מאשר; ה-Edge
--    Function swaps מבצע את השינוי בפועל בסידור בעת אישור/תפיסה)
create table if not exists shift_swap_requests (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz not null default now(),
  month          text not null,               -- 'YYYY-MM' של published_schedules הרלוונטי
  kind           text not null,               -- 'full' | 'partial' | 'hole'
  source         text not null,               -- 'direct' (הצעה לעובד ספציפי) | 'market' (לוח פתוח)
  status         text not null default 'open',
  -- open | pending_peer | pending_manager | approved | rejected | cancelled
  date           text not null,               -- YYYY-MM-DD של המשמרת המבקשת
  shift_id       text not null,
  from_emp_id    text not null,               -- מי שהמשמרת/השעות שלו כרגע
  to_emp_id      text,                        -- יעד ישיר, או תופס בלוח פתוח; null = עדיין פתוח
  -- partial בלבד: הצד השני להחלפת השעות ומשמרתו שלו (יכולה ליפול ביום/משמרת שונים)
  to_date        text,
  to_shift_id    text,
  direction      text,                        -- partial: 'early' (הקדמת התחלה) | 'late' (הארכת סיום)
  edge           text,                        -- hole: 'start' | 'end' — הקצה שמתקצר
  boundary_time  text,                        -- 'HH:MM' — הגבול החדש המשותף
  note           text  not null default '',
  responded_at   timestamptz,
  responded_by   text,
  applied_at     timestamptz
);

create index if not exists shift_swap_requests_month on shift_swap_requests (month);
create index if not exists shift_swap_requests_status on shift_swap_requests (status);
create index if not exists shift_swap_requests_from on shift_swap_requests (from_emp_id);
create index if not exists shift_swap_requests_to on shift_swap_requests (to_emp_id);

alter table shift_swap_requests enable row level security;
drop policy if exists "open access" on shift_swap_requests;
create policy "open access" on shift_swap_requests
  for all to anon, authenticated using (true) with check (true);

-- 10. בקשות קבועות (אפליקציית העובד כותבת וקוראת; מתמלאות אוטומטית בכל חודש חדש
--     עד שהעובד מכבה אותן — ראו הודעה למשבץ שהוסיפה שדה requestCriteria/shabbatFrequencyDays)
create table if not exists employee_recurring_requests (
  id         uuid default gen_random_uuid() primary key,
  emp_id     text not null,
  weekday    int  not null,               -- 0=ראשון .. 6=שבת
  shift_id   text,                        -- null = היום כולו; אחרת משמרת ספציפית
  mark       text not null,               -- 'un' | 'high' | 'can'
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists employee_recurring_requests_emp on employee_recurring_requests (emp_id);

alter table employee_recurring_requests enable row level security;
drop policy if exists "open access" on employee_recurring_requests;
create policy "open access" on employee_recurring_requests
  for all to anon, authenticated using (true) with check (true);

-- 11. העדפות עובד — כמה משמרות בשבוע בימי חול, והאם מוכן למשמרות שישי/שבת.
--     שתי האפליקציות קוראות וכותבות כאן ישירות (במקום ב-mishmarot_state הכללי),
--     כדי שעריכה מכל צד לא תדרוס את הצד השני. נכנס גם לאלגוריתם השיבוץ האוטומטי.
create table if not exists employee_prefs (
  emp_id                  text primary key,
  weekday_shifts_per_week int     not null default 2,  -- יעד משמרות/שבוע בימי א'-ה'
  wants_friday            boolean not null default true,
  wants_saturday          boolean not null default true, -- כולל משמרת "שבת ארוכה" (shabbat)
  updated_at              timestamptz not null default now()
);

alter table employee_prefs enable row level security;
drop policy if exists "open access" on employee_prefs;
create policy "open access" on employee_prefs
  for all to anon, authenticated using (true) with check (true);

-- 12. הערה מיוחדת למשבץ, מלווה את הבקשה החודשית (נפרדת מהטקסט החופשי ל-AI)
alter table employee_requests
  add column if not exists manager_note text not null default '';
