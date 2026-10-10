'use strict';
/* Streak engine — pure functions. No DOM, no Date.now(); "today" is injected
   so the logic is deterministic and unit-testable. Dates are ISO YYYY-MM-DD. */

function htDayNumber(iso) {
  // Days since Unix epoch (UTC) — immune to local DST quirks.
  const p = iso.split('-');
  return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
}

function htIsoFromDayNumber(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}

function htAddDays(iso, n) {
  return htIsoFromDayNumber(htDayNumber(iso) + n);
}

/* doneIsoDates: array of YYYY-MM-DD strings on which the habit was completed.
   todayIso: the reference "today".
   Returns { current, longest }.
   - longest: max run of consecutive completed days (anywhere in history).
   - current: consecutive run ending today; if today is not done yet but
     yesterday is, the streak is still alive and counts from yesterday. */
function computeStreaks(doneIsoDates, todayIso) {
  const days = new Set((doneIsoDates || []).map(htDayNumber));
  const today = htDayNumber(todayIso);

  const sorted = Array.from(days).sort((a, b) => a - b);
  let longest = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = (prev !== null && d === prev + 1) ? run + 1 : 1;
    prev = d;
    if (run > longest) longest = run;
  }

  let current = 0;
  let cursor = days.has(today) ? today : (days.has(today - 1) ? today - 1 : null);
  while (cursor !== null && days.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, longest };
}

/* A habit is "done" on a day when its logged value reaches the goal
   (goal defaults to 1 for simple check-in habits). */
function doneDatesOf(habit) {
  const goal = habit.target && habit.target > 0 ? habit.target : 1;
  return Object.keys(habit.log || {}).filter(d => (habit.log[d] || 0) >= goal);
}

if (typeof module !== 'undefined') {
  module.exports = { htDayNumber, htIsoFromDayNumber, htAddDays, computeStreaks, doneDatesOf };
}
