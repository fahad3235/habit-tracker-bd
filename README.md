# Habit Tracker BD — হ্যাবিট ট্র্যাকার

A free, fully offline daily habit tracker with streaks and a GitHub-style activity heatmap. Bilingual (English/বাংলা), zero network requests, all data stays in your browser.

## The problem

Streak-based habit apps are either subscription-locked, ad-filled, or send your daily routine to a server. Habit Tracker BD is a single static page: add habits, check in daily, watch your streaks grow — with nothing leaving the device.

## Features

- **Habits with optional numeric goals** — e.g. "Read" (simple check-in) or "Drink water" (8 glasses/day); partial progress tracked
- **Daily check-in** — today + past 30 days toggleable per habit; future dates are never shown
- **Exact streak math** — current streak (alive through yesterday if today isn't done yet) + longest streak, in one pure, tested function
- **12-week heatmap** — GitHub-style intensity grid from daily completion %
- **Stats** — total check-ins, this-week %, this-month %, best habit
- **Today's check-in list** with per-habit streak badges
- **localStorage persistence** keyed by date (`YYYY-MM-DD`); JSON export/import; sample data
- **Full EN ⇄ বাংলা UI toggle** (Bengali digits in counts)
- Responsive mobile + desktop; empty states; inline validation

## Tech stack

Vanilla HTML/CSS/JS. No build step, no dependencies, no backend. Streak engine (`js/streaks.js`) is framework-free pure functions.

## Prerequisites

Any modern browser. For tests: Node 18+ and a Chromium binary.

## Install

No install. Open `index.html` via a local server (recommended) or file:

```bash
cd habit-tracker-bd
python3 -m http.server 8080
# open http://localhost:8080/
```

## Dev commands

None — no build, no bundler. Edit and reload.

Test hook: `?asof=YYYY-MM-DD` freezes "today" (used by the test suite for deterministic streak assertions).

## Environment variables

None. There is no backend and no external service.

## Testing

Headless-Chrome suite (puppeteer-core + system Chromium), real runs:

```bash
cd /tmp/ht-test
node test.js
```

**23 checks, all passing**, zero console/page errors:
- streak engine: 3 consecutive days → streak 3; a gap day breaks current to 1; longest streak tracked across gaps; today-not-done-but-yesterday-done keeps streak alive; empty history → 0/0; single day → 1/1
- UI: add habit → appears in today list + habit card; toggle today on/off updates streak badge; heatmap renders exactly 84 cells; grid contains no future dates; numeric goal partial (5/8) not counted, full (8/8) counted; delete habit removes its data; export → clear → import round-trips; state survives reload; BN/EN toggle rewrites all labels and back; form validation (empty name, non-positive goal); 390px mobile → 0px horizontal overflow

## Deployment

Static files — deploy anywhere. GitHub Pages compatible: push to a repo, enable Pages (Deploy from a branch → `main` / `/ (root)`).

## Limitations

- Streaks use the device's local timezone; traveling across timezones can shift day boundaries
- Data lives in per-browser `localStorage` (no sync); JSON export is the backup path
- Numeric goals count a day only when the goal is fully met (no partial-day streaks)
- No reminders/notifications — the app doesn't run in the background
- Heatmap intensity is per-day habit-completion %, not effort

## Status

Complete and verified. See `PROJECT_LEDGER.md` (run #15) for test evidence.
