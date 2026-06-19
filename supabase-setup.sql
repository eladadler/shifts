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

-- 4. משוב AI (אדמינים כותבים דרך מצב תחזה; שמור לשיפור פרומפטים)
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
