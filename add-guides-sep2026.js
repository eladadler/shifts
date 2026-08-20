// סקריפט להוספת 20 מדריכים + בקשות ספטמבר 2026
// להריץ בקונסול הדפדפן בזמן שהאפליקציה פתוחה
(async () => {
  const d = (n) => `2026-09-${String(n).padStart(2, '0')}`;
  const COLORS = [
    'oklch(0.62 0.14 250)', 'oklch(0.62 0.14 330)', 'oklch(0.62 0.14 160)',
    'oklch(0.62 0.14 50)',  'oklch(0.62 0.14 210)', 'oklch(0.62 0.14 10)',
    'oklch(0.62 0.14 290)', 'oklch(0.62 0.14 130)', 'oklch(0.62 0.14 70)',
    'oklch(0.62 0.14 190)',
  ];

  // ------------------- נתוני המדריכים -------------------
  const GUIDES_DATA = [
    // name, email, password, role, anchor, nights, color, max, unavailable[], high[], note
    {
      name: 'יוסי כהן',       email: 'yosi.cohen@guides.il',     password: 'Yosi@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[0], max: 18,
      unavailable: [d(7),d(8),d(14),d(15),d(21),d(22),d(28),d(29)],            // שני+שלישי בלוק
      high: [],
      note: 'חסום בימי שני ושלישי'
    },
    {
      name: 'מיכל לוי',       email: 'michal.levi@guides.il',    password: 'Michal@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[1], max: 16,
      unavailable: [d(18)],                                                      // שישי 18/9 בלוק
      high: [d(6),d(7),d(13),d(14),d(20),d(21),d(27),d(28)],                   // מעדיפה ראשון+שני
      note: 'מעדיפה ראשון ושני, לא זמינה שישי 18/9'
    },
    {
      name: 'אבי מזרחי',      email: 'avi.mizrahi@guides.il',    password: 'Avi@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[2], max: 18,
      unavailable: [d(2),d(3),d(9),d(10),d(16),d(17),d(23),d(24),d(30),d(5),d(19)], // רביעי+חמישי, שבת 5+19
      high: [],
      note: 'חסום רביעי וחמישי, שבת 5/9 ו-19/9'
    },
    {
      name: 'דינה פרץ',       email: 'dina.peretz@guides.il',    password: 'Dina@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[3], max: 16,
      unavailable: [],
      high: [d(1),d(2),d(3),d(8),d(9),d(10),d(15),d(16),d(17),d(22),d(23),d(24),d(29),d(30)],
      note: 'מעדיפה שלישי-רביעי-חמישי'
    },
    {
      name: 'אלון שפירא',     email: 'alon.shapira@guides.il',   password: 'Alon@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[4], max: 18,
      unavailable: [d(6),d(13),d(20),d(27),d(4),d(25),d(12)],                  // ראשון+שישי 4+25+שבת 12
      high: [],
      note: 'חסום ימי ראשון, שישי 4+25/9, שבת 12/9'
    },
    {
      name: 'רחל אברהם',      email: 'rachel.avraham@guides.il', password: 'Rachel@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[5], max: 16,
      unavailable: [d(26)],                                                      // שבת 26/9 בלוק
      high: [d(6),d(7),d(13),d(14),d(20),d(21),d(27),d(28)],
      note: 'מעדיפה ראשון ושני, חסומה שבת 26/9'
    },
    {
      name: 'גיא בן-דוד',     email: 'guy.bendavid@guides.il',   password: 'Guy@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[6], max: 18,
      unavailable: [d(3),d(10),d(17),d(24),d(11),d(19),d(26)],                  // חמישי+שישי 11+שבת 19+26
      high: [],
      note: 'חסום כל החמישים, שישי 11/9, שבת 19+26/9'
    },
    {
      name: 'נועה גולן',      email: 'noa.golan@guides.il',      password: 'Noa@2026',
      role: 'מדריכה', anchor: false, nights: false, color: COLORS[7], max: 16,
      unavailable: [d(1),d(7),d(8),d(14),d(15),d(23),d(24),d(30)],             // שני+שלישי שבוע א-ב, רביעי+חמישי שבוע ד-ה
      high: [],
      note: 'שני+שלישי בלוק בשבועות הראשונים, רביעי+חמישי בשבועות האחרונים'
    },
    {
      name: 'עמית דהן',       email: 'amit.dahan@guides.il',     password: 'Amit@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[8], max: 18,
      unavailable: [d(5)],                                                       // שבת 5/9 בלוק
      high: [d(2),d(3),d(4),d(9),d(10),d(11),d(16),d(17),d(18),d(23),d(24),d(25),d(30)],
      note: 'מעדיף רביעי-חמישי-שישי, חסום שבת 5/9'
    },
    {
      name: 'תמר יוסף',       email: 'tamar.yosef@guides.il',    password: 'Tamar@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[9], max: 16,
      unavailable: [],
      high: [d(6),d(7),d(8),d(13),d(14),d(15)],
      note: 'מעדיפה שבועות הראשונים של החודש'
    },
    {
      name: 'ירון חזן',       email: 'yaron.hazan@guides.il',    password: 'Yaron@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[0], max: 18,
      unavailable: [d(7),d(9),d(14),d(16),d(21),d(23),d(28),d(30),d(4),d(18),d(12)], // שני+רביעי+שישי 4+18+שבת 12
      high: [],
      note: 'חסום שני ורביעי, שישי 4+18/9, שבת 12/9'
    },
    {
      name: 'שירה אלוני',     email: 'shira.aloni@guides.il',    password: 'Shira@2026',
      role: 'מדריכה', anchor: false, nights: false, color: COLORS[1], max: 16,
      unavailable: [],
      high: [d(4),d(5),d(11),d(12),d(18),d(19),d(25),d(26)],                   // מעדיפה שישי+שבת
      note: 'מעדיפה משמרות סוף שבוע'
    },
    {
      name: 'בן-ציון מנחם',   email: 'bentzion.menachem@guides.il', password: 'Ben@2026',
      role: 'מדריך',  anchor: true,  nights: true,  color: COLORS[2], max: 18,
      unavailable: [d(6),d(7),d(13),d(14),d(20),d(21),d(27),d(28),d(25),d(5),d(19)], // ראשון+שני+שישי 25+שבת 5+19
      high: [],
      note: 'חסום ראשון ושני, שישי 25/9, שבת 5+19/9'
    },
    {
      name: 'אורית שלום',     email: 'orit.shalom@guides.il',    password: 'Orit@2026',
      role: 'מדריכה', anchor: false, nights: false, color: COLORS[3], max: 16,
      unavailable: [],
      high: [d(2),d(3),d(9),d(10),d(16),d(17),d(23),d(24),d(30)],              // מעדיפה רביעי+חמישי
      note: 'מעדיפה רביעי וחמישי'
    },
    {
      name: 'ניר קפלן',       email: 'nir.kaplan@guides.il',     password: 'Nir@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[4], max: 18,
      unavailable: [d(3),d(10),d(17),d(24),d(11),d(26)],                        // חמישי+שישי 11+שבת 26
      high: [],
      note: 'חסום כל החמישים, שישי 11/9, שבת 26/9'
    },
    {
      name: 'דבורה רוזן',     email: 'devora.rosen@guides.il',   password: 'Devora@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[5], max: 16,
      unavailable: [d(12)],                                                      // שבת 12/9 בלוק
      high: [d(6),d(7),d(8),d(13),d(14),d(15),d(20),d(21),d(22),d(27),d(28),d(29)],
      note: 'מעדיפה ראשון-שני-שלישי, חסומה שבת 12/9'
    },
    {
      name: 'ערן שוורץ',      email: 'eran.schwartz@guides.il',  password: 'Eran@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[6], max: 18,
      unavailable: [d(6),d(8),d(13),d(15),d(20),d(22),d(27),d(29),d(4),d(11),d(5)], // ראשון+שלישי+שישי 4+11+שבת 5
      high: [],
      note: 'חסום ראשון ושלישי, שישי 4+11/9, שבת 5/9'
    },
    {
      name: 'ליאת נחום',      email: 'liat.nahum@guides.il',     password: 'Liat@2026',
      role: 'מדריכה', anchor: false, nights: false, color: COLORS[7], max: 16,
      unavailable: [],
      high: [d(7),d(8),d(9),d(14),d(15),d(16),d(21),d(22),d(23),d(28),d(29),d(30)],
      note: 'מעדיפה שני-שלישי-רביעי'
    },
    {
      name: 'אהרן ביטון',     email: 'aharon.biton@guides.il',   password: 'Aharon@2026',
      role: 'מדריך',  anchor: false, nights: true,  color: COLORS[8], max: 18,
      unavailable: [d(2),d(7),d(9),d(14),d(16),d(21),d(23),d(28),d(30),d(18),d(19),d(26)], // שני+רביעי+שישי 18+שבת 19+26
      high: [],
      note: 'חסום שני ורביעי, שישי 18/9, שבת 19+26/9'
    },
    {
      name: 'פנינה ויס',      email: 'penina.weiss@guides.il',   password: 'Penina@2026',
      role: 'מדריכה', anchor: true,  nights: false, color: COLORS[9], max: 16,
      unavailable: [],
      high: [d(3),d(4),d(5),d(10),d(11),d(12),d(17),d(18),d(19),d(24),d(25),d(26)],
      note: 'מעדיפה חמישי-שישי-שבת'
    },
  ];

  // ------------------- טעינת מצב קיים -------------------
  console.log('⏳ טוען מצב נוכחי...');
  let state = null;
  try {
    state = await window.__db.load();
  } catch(e) {}
  if (!state) {
    const raw = localStorage.getItem('mishmarot-state-v6');
    state = raw ? JSON.parse(raw) : {};
  }
  if (!state.employees) state.employees = [];
  if (!state.requests)  state.requests  = {};

  const existingIds = new Set(state.employees.map(e => e.id));
  const existingEmails = new Set(state.employees.map(e => e.email).filter(Boolean));
  let added = 0;

  const now = Date.now();

  for (let i = 0; i < GUIDES_DATA.length; i++) {
    const g = GUIDES_DATA[i];
    const id = `guide-${String(i + 1).padStart(2, '0')}`;

    // אל תשכפל לפי ID או מייל
    if (existingIds.has(id) || existingEmails.has(g.email)) {
      console.log(`⏭ דילוג על ${g.name} (כבר קיים)`);
      continue;
    }

    // הוסף עובד
    state.employees.push({
      id, name: g.name, role: g.role, email: g.email,
      color: g.color, max: g.max, anchor: g.anchor, nights: g.nights,
    });

    // הוסף בקשות לספטמבר 2026
    if (!state.requests[id]) state.requests[id] = {};
    state.requests[id]['2026-09'] = {
      text: '',
      unavailable: g.unavailable,
      high: g.high,
      can: [],
      note: g.note,
      analyzedAt: now,
      analyzedText: '',
    };

    existingIds.add(id);
    existingEmails.add(g.email);
    added++;
  }

  // ------------------- שמירה -------------------
  console.log(`💾 שומר ${added} מדריכים חדשים...`);
  localStorage.setItem('mishmarot-state-v6', JSON.stringify(state));
  try {
    const ok = await window.__db.save(state);
    if (ok) console.log('✅ נשמר ל-Supabase בהצלחה!');
    else     console.warn('⚠️ שמירה ל-Supabase נכשלה — נשמר ב-localStorage');
  } catch(e) {
    console.warn('⚠️ שגיאת Supabase:', e.message);
  }

  // ------------------- הדפסת פרטי כניסה -------------------
  console.log('\n📋 פרטי כניסה למדריכים:\n');
  console.table(GUIDES_DATA.map((g, i) => ({
    '#': i + 1,
    'שם': g.name,
    'מייל': g.email,
    'סיסמה': g.password,
  })));

  console.log('\n✅ סיום! רענן את הדף לראות את המדריכים.');
})();
