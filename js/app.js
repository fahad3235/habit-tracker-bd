'use strict';
/* Habit Tracker BD — UI wiring. Streak math lives in js/streaks.js (pure). */

const HT_KEY = 'habit-tracker-bd-v1';

function htGetAsOf() {
  const m = new URLSearchParams(location.search).get('asof');
  return /^\d{4}-\d{2}-\d{2}$/.test(m || '') ? m : null;
}
const HT_ASOF = htGetAsOf();

function htTodayIso() {
  if (HT_ASOF) return HT_ASOF;
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function htLoad() {
  try {
    const raw = localStorage.getItem(HT_KEY);
    if (!raw) return { lang: 'en', habits: [] };
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.habits)) throw new Error('bad shape');
    s.habits = s.habits.filter(h => h && typeof h.id === 'string' && typeof h.name === 'string');
    s.habits.forEach(h => { if (!h.log || typeof h.log !== 'object') h.log = {}; });
    if (s.lang !== 'bn') s.lang = 'en';
    return s;
  } catch (e) { return { lang: 'en', habits: [] }; }
}
function htSave() { localStorage.setItem(HT_KEY, JSON.stringify(htState)); }

let htState = htLoad();
const T = () => HT_STRINGS[htState.lang];
const L = (s) => htLocalizeDigits(s, htState.lang);

function htEsc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function htGoalOf(h) { return (h.target && h.target > 0) ? h.target : 1; }
function htIsDone(h, iso) { return (h.log[iso] || 0) >= htGoalOf(h); }
function htDoneDates(h) { return doneDatesOf(h); }

/* ---------- stats ---------- */
function htStats() {
  const today = htTodayIso();
  const tNum = htDayNumber(today);
  let total = 0, weekDone = 0, weekSlots = 0, monthDone = 0, monthSlots = 0;
  let best = null, bestLongest = -1;
  for (const h of htState.habits) {
    const done = htDoneDates(h);
    total += done.length;
    const st = computeStreaks(done, today);
    h._streak = st;
    if (st.longest > bestLongest) { bestLongest = st.longest; best = h; }
    for (let i = 0; i < 7; i++) {
      const iso = htIsoFromDayNumber(tNum - i);
      weekSlots++;
      if (htIsDone(h, iso)) weekDone++;
    }
    const [y, m] = today.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    const dayOfMonth = Number(today.split('-')[2]);
    for (let d = 1; d <= dayOfMonth; d++) {
      const iso = today.slice(0, 8) + String(d).padStart(2, '0');
      monthSlots++;
      if (htIsDone(h, iso)) monthDone++;
    }
  }
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  return { total, weekPct: pct(weekDone, weekSlots), monthPct: pct(monthDone, monthSlots), best, bestLongest };
}

/* ---------- render ---------- */
function htRender() {
  const t = T(), today = htTodayIso();
  document.documentElement.lang = htState.lang === 'bn' ? 'bn' : 'en';
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('langBtn').textContent = htState.lang === 'bn' ? 'English' : 'বাংলা';
  document.getElementById('sampleBtn').textContent = t.sample;
  document.getElementById('exportBtn').textContent = t.export;
  document.getElementById('importBtn').textContent = t.import;
  document.getElementById('clearBtn').textContent = t.clear;
  document.getElementById('todayHeading').textContent = t.todayHeading;
  document.getElementById('heatmapHeading').textContent = t.heatmapHeading;
  document.getElementById('habitsHeading').textContent = t.habitsHeading;
  document.getElementById('habitName').placeholder = t.namePh;
  document.getElementById('habitTarget').placeholder = t.goalPh;
  document.getElementById('habitUnit').placeholder = t.unitPh;
  document.getElementById('addBtn').textContent = t.add;
  document.getElementById('legendLess').textContent = t.less;
  document.getElementById('legendMore').textContent = t.more;
  document.getElementById('footNote').textContent = t.foot;
  document.getElementById('habitsEmpty').textContent = t.noHabits;
  document.getElementById('todayEmpty').textContent = t.noToday;

  const st = htStats();

  // stats strip
  const statsEl = document.getElementById('statsStrip');
  const statCard = (v, l) => '<div class="stat"><div class="v">' + L(v) + '</div><div class="l">' + htEsc(l) + '</div></div>';
  statsEl.innerHTML =
    statCard(st.total, t.totalCheckins) +
    statCard(st.weekPct + '%', t.thisWeek) +
    statCard(st.monthPct + '%', t.thisMonth) +
    statCard(st.best ? htEsc(st.best.name) : '—', t.bestHabit + (st.best && st.bestLongest > 0 ? ' · ' + L(st.bestLongest) + ' ' + t.streakUnit(st.bestLongest) : ''));

  // today list
  const tl = document.getElementById('todayList');
  document.getElementById('todayEmpty').classList.toggle('hidden', htState.habits.length > 0);
  tl.innerHTML = '';
  for (const h of htState.habits) {
    const row = document.createElement('div');
    row.className = 'today-row';
    row.dataset.habit = h.id;
    const done = htIsDone(h, today);
    const streakTxt = L(h._streak.current) + ' ' + t.streakUnit(h._streak.current);
    let action;
    if (h.target && h.target > 1) {
      const cur = h.log[today] || 0;
      action = '<span class="goal-wrap"><input type="number" min="0" step="any" value="' + cur + '" data-goal-input aria-label="amount">' +
        '<span class="progress-note">' + htEsc(h.unit || '') + '</span>' +
        '<button class="btn small primary" data-log type="button">' + htEsc(t.log) + '</button></span>' +
        '<span class="progress-note">' + L(cur) + ' ' + t.of + ' ' + L(h.target) + '</span>';
    } else {
      action = '<button class="btn small' + (done ? '' : ' primary') + '" data-toggle type="button">' + htEsc(done ? t.undo : t.done) + '</button>';
    }
    row.innerHTML = '<span class="dot" style="background:' + htEsc(h.color || '#22a06b') + '"></span>' +
      '<span class="name">' + htEsc(h.name) + '</span>' +
      '<span class="streak-badge">🔥 ' + htEsc(streakTxt) + '</span>' + action;
    tl.appendChild(row);
  }

  // heatmap: last 12 weeks (84 days), intensity = fraction of habits done
  const hm = document.getElementById('heatmap');
  hm.innerHTML = '';
  const tNum = htDayNumber(today);
  const startNum = tNum - 83;
  // align columns to weeks: first column starts on the weekday of startNum
  for (let i = 0; i < 84; i++) {
    const iso = htIsoFromDayNumber(startNum + i);
    const cell = document.createElement('i');
    let frac = 0;
    if (htState.habits.length) {
      let done = 0;
      for (const h of htState.habits) if (htIsDone(h, iso)) done++;
      frac = done / htState.habits.length;
    }
    const lvl = frac === 0 ? 0 : frac < 0.25 ? 1 : frac < 0.5 ? 2 : frac < 0.75 ? 3 : 4;
    cell.className = 'hm hm' + lvl;
    cell.title = iso + ' — ' + Math.round(frac * 100) + '%';
    cell.dataset.date = iso;
    hm.appendChild(cell);
  }

  // habit cards with 30-day toggle grids
  const hc = document.getElementById('habitCards');
  document.getElementById('habitsEmpty').classList.toggle('hidden', htState.habits.length > 0);
  hc.innerHTML = '';
  for (const h of htState.habits) {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.dataset.habit = h.id;
    let cells = '';
    for (let i = 30; i >= 0; i--) {
      const iso = htIsoFromDayNumber(tNum - i);
      const done = htIsDone(h, iso);
      const isToday = i === 0;
      cells += '<button type="button" class="day-cell' + (done ? ' done' : '') + (isToday ? ' today' : '') + '"' +
        ' data-date="' + iso + '" title="' + iso + '"' +
        (done ? ' style="background:' + htEsc(h.color || '#22a06b') + '"' : '') + '>' +
        L(Number(iso.slice(8))) + '</button>';
    }
    card.innerHTML =
      '<div class="habit-head"><span class="dot" style="background:' + htEsc(h.color || '#22a06b') + '"></span>' +
      '<span class="name">' + htEsc(h.name) + '</span>' +
      '<span class="streak-badge">🔥 ' + L(h._streak.current) + ' · ' + htEsc(t.longest) + ' ' + L(h._streak.longest) + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="btn small ghost danger" data-del type="button">' + htEsc(t.del) + '</button></div>' +
      '<div class="day-grid">' + cells + '</div>' +
      '<div class="day-legend muted"><span>' + htEsc(t.last30) + '</span></div>';
    hc.appendChild(card);
  }
}

/* ---------- actions ---------- */
function htAddHabit(name, color, target, unit) {
  const t = T();
  const errEl = document.getElementById('formError');
  name = (name || '').trim();
  if (!name) { errEl.textContent = t.nameRequired; errEl.classList.remove('hidden'); return false; }
  if (target !== '' && target !== null && !(Number(target) > 0)) {
    errEl.textContent = t.positiveTarget; errEl.classList.remove('hidden'); return false;
  }
  errEl.classList.add('hidden');
  htState.habits.push({
    id: 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name: name.slice(0, 60),
    color: color || '#22a06b',
    target: target === '' || target === null ? null : Number(target),
    unit: (unit || '').trim().slice(0, 20) || null,
    log: {}
  });
  htSave(); htRender();
  return true;
}

function htFind(id) { return htState.habits.find(h => h.id === id); }

function htToggle(h, iso) {
  if (htIsDone(h, iso)) delete h.log[iso];
  else h.log[iso] = htGoalOf(h);
  htSave(); htRender();
}

document.addEventListener('click', (e) => {
  const row = e.target.closest('[data-habit]');
  if (e.target.id === 'langBtn') {
    htState.lang = htState.lang === 'bn' ? 'en' : 'bn';
    htSave(); htRender(); return;
  }
  if (e.target.id === 'clearBtn') {
    if (confirm(T().confirmClear)) { htState.habits = []; htSave(); htRender(); }
    return;
  }
  if (e.target.id === 'exportBtn') { htExport(); return; }
  if (e.target.id === 'importBtn') { document.getElementById('importFile').click(); return; }
  if (e.target.id === 'sampleBtn') { htSample(); return; }
  if (!row) return;
  const h = htFind(row.dataset.habit);
  if (!h) return;
  if (e.target.closest('[data-toggle]')) { htToggle(h, htTodayIso()); return; }
  if (e.target.closest('[data-log]')) {
    const inp = row.querySelector('[data-goal-input]');
    const v = Number(inp.value);
    const today = htTodayIso();
    if (v > 0) h.log[today] = v; else delete h.log[today];
    htSave(); htRender(); return;
  }
  if (e.target.closest('[data-del]')) {
    if (confirm(T().confirmDel)) {
      htState.habits = htState.habits.filter(x => x.id !== h.id);
      htSave(); htRender();
    }
    return;
  }
  const cell = e.target.closest('.day-cell');
  if (cell) { htToggle(h, cell.dataset.date); }
});

document.getElementById('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = htAddHabit(
    document.getElementById('habitName').value,
    document.getElementById('habitColor').value,
    document.getElementById('habitTarget').value === '' ? null : document.getElementById('habitTarget').value,
    document.getElementById('habitUnit').value
  );
  if (ok) {
    document.getElementById('habitName').value = '';
    document.getElementById('habitTarget').value = '';
    document.getElementById('habitUnit').value = '';
  }
});

function htExport() {
  const blob = new Blob([JSON.stringify(htState, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'habit-tracker-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

document.getElementById('importFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || !Array.isArray(s.habits)) throw new Error('bad');
      s.habits = s.habits.filter(h => h && typeof h.id === 'string' && typeof h.name === 'string');
      s.habits.forEach(h => { if (!h.log || typeof h.log !== 'object') h.log = {}; });
      htState = { lang: s.lang === 'bn' ? 'bn' : 'en', habits: s.habits };
      htSave(); htRender();
    } catch (err) { alert(T().badImport); }
    e.target.value = '';
  };
  r.readAsText(f);
});

function htSample() {
  const today = htTodayIso();
  const tNum = htDayNumber(today);
  const mk = (name, color, target, unit, offsets) => {
    const log = {};
    offsets.forEach(o => { log[htIsoFromDayNumber(tNum - o)] = target || 1; });
    return { id: 's' + Math.random().toString(36).slice(2, 9), name, color, target, unit, log };
  };
  htState.habits = [
    mk('Read', '#3b82f6', 20, 'min', [0, 1, 2, 3, 4, 6, 7]),
    mk('Drink water', '#22a06b', 8, 'glasses', [0, 1, 3, 4, 5, 8]),
    mk('Walk', '#f59e0b', null, null, [0, 1, 2])
  ];
  htSave(); htRender();
}

htRender();
