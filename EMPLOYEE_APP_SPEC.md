# Employee App — Design Spec (for Claude Design)

## Context

We have an existing **shift-scheduling app for managers** (Hebrew, RTL): the manager defines shifts, collects employee requests, runs AI-assisted auto-scheduling, and publishes a final monthly schedule. Data is stored in Supabase.

We now want a second app: the **Employee App**. Employees use it to:

1. Submit scheduling requests for an upcoming month (days they can't work, days they prefer, etc.)
2. View the published shift schedule (current month, next month) — the whole team's schedule, with a toggle to see only their own shifts.

This spec describes the screens to design. The output should be an HTML/CSS/JS prototype bundle (Claude Design handoff) that will then be implemented for real against the existing Supabase backend.

## Global design requirements

- **Language: Hebrew. Direction: RTL.** All UI text in Hebrew.
- **Mobile-first.** Employees will open this on their phones. Must look great at ~390px wide; desktop is secondary.
- Clean, friendly, light theme. It's a sibling of the manager app but can have its own character.
- Logged-in employee's name should always be visible (e.g., in the header).

## Screen 1: Login — «כניסה»

- Email + password login (backed by Supabase Auth — design just the form).
- Fields: אימייל, סיסמה. Button: «כניסה».
- Secondary action: «שכחתי סיסמה» (sends a reset email — just needs a link/state).
- Error state: wrong credentials message.
- No self-registration: accounts are created by the manager. So no "sign up" link.

## Screen 2: My Schedule — «הסידור»

The main screen after login.

- **Month switcher**: current month / next month (e.g., «יולי 2026» with ‹ › arrows). Future months only exist if the manager published them; show an empty state «הסידור לחודש זה טרם פורסם» otherwise.
- **Month calendar view** (RTL week: ראשון on the right). Each day shows the shifts and who's assigned to them.
- Shifts per day (these are the real shift types):
  - Weekdays (Sun–Thu): בוקר 07:00–15:00, ערב 15:00–23:00, לילה 23:00–07:00
  - Fri–Sat: בוקר 07:00–15:00, קצר 15:00–19:00, לילה 19:00–07:00
  - Occasionally special/multi-day shifts (e.g., a 48h on-call) — handle gracefully.
- **The logged-in employee's own shifts must be strongly highlighted** (color/badge) so they're scannable at a glance.
- **Toggle: «רק המשמרות שלי»** — filters the view to show only days/shifts where the employee is assigned. Off by default (whole team visible).
- A small summary strip is nice to have: e.g., «8 משמרות החודש · 2 לילות».
- Mobile consideration: a full month grid with names in every cell won't fit on a phone. Consider a list-by-week or agenda layout on mobile, month grid on desktop. Designer's call — this is the hardest layout problem in the app.

## Screen 3: Submit Requests — «הגשת בקשות»

Employees submit constraints/preferences for a month that hasn't been scheduled yet.

- **Month selector** (usually next month).
- **Calendar where the employee taps days to cycle through markings:**
  - לא זמין (unavailable — hard constraint) — e.g., red
  - מעדיף לעבוד (prefers to work) — e.g., green
  - יכול לעבוד (available if needed) — e.g., blue/neutral
  - unmarked (no preference)
- **Free-text note field**: «הערות למשבץ» (e.g., "מעדיף לילות", "עד 15 בחודש אני בחו"ל").
- **Save/submit button** «שליחת בקשות» + a saved-successfully state «הבקשות נשלחו ✓» with last-updated timestamp.
- Employees can come back and **edit** their requests until the manager publishes the schedule for that month. After publication, show the requests as read-only with a notice «הסידור לחודש זה כבר פורסם».
- Empty state for a month with no requests yet.

## Navigation

Two main tabs/sections: «הסידור» and «הגשת בקשות» (+ logout «התנתקות» somewhere, e.g., a small menu). Bottom tab bar works well on mobile.

---

## Appendix: real data shapes (for realistic mock data)

The prototype should use mock data shaped like the real thing:

```js
// Employees
{ id: 'e7', name: 'דנה לוי' }

// A published schedule for a month:
// { "YYYY-MM-DD": { shiftId: [employeeId, ...] } }
{
  "2026-07-01": { "morning": ["e7", "e3"], "evening": ["e1"], "night": ["e5"] },
  "2026-07-03": { "morning": ["e2"], "short": ["e7"], "night": ["e4"] }
}

// One employee's requests for one month:
{
  "unavailable": ["2026-07-05", "2026-07-06"],   // לא זמין
  "high":        ["2026-07-10"],                  // מעדיף לעבוד
  "can":         ["2026-07-12"],                  // יכול לעבוד
  "note":        "מעדיף משמרות לילה"
}
```

Use ~8 employees with Hebrew names in mock data, and a fully populated July 2026 schedule so the calendar looks real.
