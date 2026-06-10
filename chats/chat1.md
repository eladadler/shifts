# Timeout Defaults

_Started 2026-06-09 22:20 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "משמרות המהפכה"
Project is currently empty (no files)
Current date is now June 10, 2026
</system-info>

<default aesthetic_system_instructions>
The user has not attached a design system. If they have ALSO not attached references or art direction, and the project is empty, you must ASK the user what visual aesthetic they want. Use the questions_v2 tool to ask about preferred vibe, audience, colors, type, mood, etc. Do NOT just pick your own visual aesthetic without getting the user's aesthetic input -- this is how you get slop!

Once answered, use this guidance when creating designs:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic_system_instructions>

<pasted_text name="Pasted text (132 lines)">
מסמך אפיון מפורט: מערכת ניהול משמרות חכמה

1. סקירה כללית
מערכת ניהול משמרות המשלבת בינה מלאכותית עם ממשק ויזואלי עשיר (Drag & Drop) לניהול סידורי עבודה חודשיים. הממשק בנוי RTL מלא בעברית, ומאפשר למשבץ שליטה מלאה תוך כדי שמירה על כללי הארגון.

2. ניהול טיוטות (Draft Management)
2.1. יצירת טיוטה חדשה — GenerateDraftModal
כאשר המשבץ לוחץ "צור טיוטה חדשה", נפתח מודל (GenerateDraftModal) עם השלבים הבאים:
בחירת חודש: בחירת חודש ראשי לטיוטה (YYYY-MM).
קביעת טווח תאריכים: המשבץ יכול להרחיב את הסידור לימים מחודש קודם/בא (למשל, מ-27 בחודש הקודם עד ה-3 בחודש הבא).
הוצאת ימים: אפשרות לסמן ימים ספציפיים כ"מוחרגים" מהסידור (חגים, ימי סגירה).
הפעלת ה-AI: לחיצה על "צור סידור" מפעילה את מנוע השיבוץ האוטומטי.
2.2. סטטוסי טיוטה
סטטוס
משמעות
preview
טיוטה ריקה, טרם נוצרה
generating
ה-AI מבצע שיבוץ כרגע
draft
טיוטה פעילה הניתנת לעריכה
final
סידור סופי ומאושר, גלוי לעובדים


3. ממשק השיבוץ — Month View (תצוגה חודשית)
3.1. מבנה הדף
הדף מחולק לשני אזורים עיקריים:
לוח חודשי (MonthView): תצוגת רשת 7×N ימים.
חלונית צד (EmployeesSidePanel): רשימת עובדים זמינים לגרירה.
3.2. כרטיס יום בלוח
כל תא ביומן מציג:
תאריך + שם יום (עם הבחנה ויזואלית לסופי שבוע/חגים).
משבצות משמרת לפי סוגי המשמרות של אותו יום (בוקר, לילה, קצר וכו').
אווטאר עובד בכל משמרת מאוישת, עם צבע ייחודי לכל עובד.
אינדיקטור מילוי: ירוק = מאויש, כתום = חסר עובד, אדום = קונפליקט.
3.3. Drag & Drop — שיבוץ עובדים
גרירה מהחלונית הצדדית אל המשמרת:
המשבץ גורר עובד מרשימת העובדים בחלונית הצד.
בזמן הגרירה, תאי היומן הרלוונטיים מוארים/מוכהים בהתאם לזמינות.
שחרור מעל משמרת מבצע שיבוץ מיידי.
אם יש קונפליקט (כגון חפיפת שעות), מוצגת התראה ויזואלית (badge אדום) על הכרטיס — אך השיבוץ מתבצע.
גרירת משמרת קיימת בין ימים:
גרירת כרטיס משמרת קיים לתא אחר.
ברירת מחדל: העברה (המשמרת עוברת, המקום הישן מתרוקן).
החזקת מקש Shift בזמן הגרירה = שכפול (העתקה לתאריך החדש תוך השארת המקור).
3.4. תצוגה נוספת — OldView (סידור שבועי)
תצוגה לינארית לפי שעות, המאפשרת:
ראיית חפיפות זמן בין משמרות שונות.
זיהוי חזותי של חריגות זמן מנוחה.
לחיצה על "לן" לפתיחת פאנל ניהול.

4. חלונית העובדים (EmployeesSidePanel)
4.1. ארגון הרשימה
העובדים מוצגים בטאבים:
כל העובדים: רשימה מלאה עם מספר משמרות שבוצעו.
זמינים ליום: סינון לפי היום הנבחר בלוח.
עם בקשות: עובדים שהגישו בקשות לחודש הנוכחי.
4.2. מידע על כל עובד
כל כרטיס עובד בחלונית מציג:
אווטאר עם צבע ייחודי.
שם + תפקיד.
ספירת משמרות: "X / מקסימום" לחודש.
תג עוגן (⚓) לעובדים ותיקים.
אינדיקטור בקשה: האם הגיש בקשת זמינות לחודש.
4.3. Drag מהחלונית
כל כרטיס עובד הוא Draggable. בזמן גרירה, העובד "נתלש" מהרשימה ויכול להישחרר על כל משמרת בלוח.

5. מנוע השיבוץ החכם (AI Constraint Engine)
5.1. סדר עדיפויות (Hierarchy of Rules)
המנוע מבצע שיבוץ לפי הסדר הבא:
עוגנים: עובדים ותיקים ושיבוצים קבועים מועדפים ראשונים.
חסרי זמינות: עובדים שסימנו "לא יכול" — אינם משובצים לאותו תאריך.
מכסות: שמירה על מגבלות שבועיות וחודשיות.
זמן מנוחה: מינימום שעות בין משמרת לזו שאחריה.
העדפות: "יכול לעבוד" / "בעדיפות גבוהה" — לוקח בחשבון אם אפשרי.
5.2. מדיניות קונפליקטים
אין חסימה מוחלטת. המערכת תמיד מאפשרת למשבץ לעקוף את הכלל.
הצפה חובה: כל שיבוץ שעובר על כלל מציג תג אדום וטקסט הסבר.
משמרות רצופות: מותר (מקרה נדיר) אך מצריך אישור ויזואלי מהמשבץ.
5.3. לוג החלטות (Generation Log)
לאחר כל הרצת AI, נשמר generation_log בשדה הטיוטה:
[
  { timestamp, type: "info",     message: "שובץ יוסי לבוקר ב-3/7 לפי בקשה" },
  { timestamp, type: "dilemma",  message: "אין עובד זמין ללילה ב-15/7" },
  { timestamp, type: "decision", message: "שובץ דני בחריגת מנוחה — אין חלופה" }
]


6. ניהול משמרות זמניות (TemporaryShiftWizard)
לחגים או ימים מיוחדים, המשבץ יכול:
לבחור תאריכים עבור קבוצת משמרת זמנית.
להגדיר שם, שעות, מספר עובדים נדרש וצבע לכרטיס.
להחליט אם להסתיר/למחוק משמרות קיימות לאותם ימים.
להציג תקציר לפני אישור — כמה משמרות יוחלפו ומה יישמר.

7. ייצוא לאקסל (Excel Export)
7.1. תוכן הייצוא
עמודה
תיאור
תאריך
YYYY-MM-DD
יום בשבוע
ראשון–שבת
סוג משמרת
בוקר / לילה / קצר וכו'
שם עובד
שם מלא
שעת התחלה
HH:MM
שעת סיום
HH:MM
חריגות
תיאור קונפליקט אם קיים

7.2. פורמט הקובץ
כותרות בעברית.
שורות מצבעות לפי סוג משמרת.
גיליון אחד לכל טיוטה.

8. פורטל עובדים (Employee-Facing)
8.1. הגשת בקשות — EmployeeRequests
לוח חודשי בו העובד לוחץ על יום ובוחר סוג העדפה לכל משמרת.
3 סוגי העדפה: "לא יכול" (אדום) / "יכול לעבוד" (כתום) / "בעדיפות גבוהה" (ירוק).
טקסט חופשי: שדה הערות שה-AI ינתח ויתרגם לאילוצים מובנים (parseEmployeeRequest).
8.2. צפייה בסידור — EmployeeCalendar
תצוגת חודש: המשמרות שלי בלבד, עם אפשרות "כל הסידור".
תצוגת שבוע (OldView): לוח שעות לינארי לצפייה בסידור כולו.
מידע בלבד: אין אפשרות עריכה לעובד.



</pasted_text>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: questions_v2]_

קראתי את מסמך האפיון — מערכת מרשימה ומקיפה. לפני שאתחיל לעצב, יש לי כמה שאלות חשובות כדי לוודא שאני בונה את הדבר הנכון:

## User

Questions timed out; go with defaults

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

הטופס הסתיים בלי תשובות — אני מחליט לבד: אבנה **פרוטוטייפ אינטראקטיבי מלא של ממשק המשבץ** (לוח חודשי + Drag & Drop + חלונית עובדים + מודל יצירת טיוטה + לוג AI + ייצוא), בעברית RTL, בסגנון SaaS מקצועי-נקי, עם דאטה לדוגמה של מוקד 24/7 עם 14 עובדים.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

בניתי את **ממשק המשבץ** כפרוטוטייפ אינטראקטיבי מלא, על בסיס מסמך האפיון:

**מה יש בפנים:**
- **מצב התחלתי ריק** → לחיצה על "✦ צור טיוטה חדשה" פותחת את ה־GenerateDraftModal: הרחבת טווח לימים מחודש קודם/בא, והחרגת ימים בלחיצה (חגים/סגירה)
- **מנוע שיבוץ אמיתי** שרץ בדפדפן לפי היררכיית הכללים — עוגנים ← זמינות ← מכסות ← מנוחה (8 ש׳) ← העדפות — וכותב **לוג החלטות** (מידע / דילמה / הכרעה) שנפתח מהכפתור "לוג AI"
- **לוח חודשי** יולי 2026 עם בוקר/ערב/לילה (וקצר בסופ״ש), אינדיקטורים ירוק/כתום/אדום, ותגי קונפליקט עם הסבר ב־hover
- **Drag & Drop מלא**: גרירת עובד מהחלונית (ימים שבהם "לא יכול" מתעמעמים, "עדיפות גבוהה" זוהרים), גרירת משמרת בין ימים = העברה, עם **Shift = שכפול**
- **חלונית עובדים** עם 3 טאבים, ספירת משמרות מול מכסה, תג עוגן ⚓ ונקודת בקשה
- **אישור ופרסום** → סטטוס "סופי" נעול, ו**ייצוא לאקסל** (CSV בעברית עם עמודת חריגות)
- **Tweaks**: צבע ראשי, צפיפות לוח, מצב כהה

**מה עוד לא בנוי** (אשמח לבנות בהמשך): אשף משמרות זמניות, תצוגת שבוע לינארית (OldView), ופורטל העובדים (הגשת בקשות + צפייה). מה הכי חשוב לכם הלאה?

## User

Found issues — fixing…

## User

No issues found

## User

No issues found

## Assistant

היישור אושר — הכל תקין עכשיו. ✓

המערכת מוכנה לשימוש: צרו טיוטה, גררו עובדים, ובדקו את לוג ה־AI. כשתרצו, אפשר להמשיך לשלב הבא — אשף משמרות זמניות, תצוגת שבוע לינארית, או פורטל העובדים.

