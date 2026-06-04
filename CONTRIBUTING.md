# Contributing to Trading Trainer

Short guide for working in this codebase. Every section here is something a
prior version got wrong at least once.

## Stack

- Next.js 15 (App Router), React 18, TypeScript strict, Tailwind.
- `lightweight-charts` for candlestick rendering.
- Vitest for unit smoke tests of pure rule engines.
- **No backend.** All state in `localStorage`. See "Storage" below.

## Project shape

```
app/                        # Next.js routes (server components by default)
  practice/page.tsx         # The big one — practice flow lives here
  learn/                    # /learn path + /learn/course/[moduleId]
  journal/                  # journal, compare, bookmarks, growth
  glossary/                 # word-bank for terms
components/                 # React components (most are "use client")
  Dashboard/                # dashboard sub-components
  practice/                 # practice-page-only helpers (banners, toggles)
lib/                        # pure modules: types, scoring, storage, scenarios
  __tests__/                # vitest smoke tests for the rule engines
scripts/                    # one-off Node scripts (e.g. candle fetchers)
```

## Storage conventions

All persisted state lives under `localStorage` with a single namespace
prefix and an explicit version suffix:

```
trainer.<feature>.v<n>     # e.g. trainer.attempts.v1
```

Rules:

1. Define the key as a `const` at the top of [lib/storage.ts](lib/storage.ts)
   and add it to `ALL_KEYS`. The `resetAllLocalData()` helper iterates
   `ALL_KEYS`; if a new key isn't there, "Reset all" silently leaves it
   behind.
2. Read/write helpers always SSR-guard: `if (!isBrowser()) return …`. Don't
   touch `window.localStorage` directly inside components.
3. Never bump the `v<n>` suffix unless the shape genuinely changes in a way
   that older data can't deserialize cleanly. Bumping invalidates every
   user's history.
4. New shape fields should be optional with a sensible default — old saves
   should keep loading.

## Scenarios

Two flavors:

- **Authored** (lib/scenarios.ts + lib/scenarios-real.ts) — real OHLCV from
  Coinbase, or hand-written synthetic moves via `buildSeries`. Use
  `buildRealScenario({ … })` from [lib/scenario-factory.ts](lib/scenario-factory.ts)
  so every scenario has the same shape and `dataSource: "real"`.
- **Procedural** (lib/procedural-scenarios.ts) — generated on demand from a
  recipe per setup type. Tagged `dataSource: "procedural"`. Show a `✦ Procedural`
  pill anywhere the title is rendered (see `app/practice/page.tsx`).

Every saved attempt embeds a `scenarioSnapshot` (v3.1+) so the chart can be
re-rendered later even if the scenario library changes or the scenario was
procedural. When you change the `Scenario` type, also update
`ScenarioSnapshot` in [lib/types.ts](lib/types.ts) and the
`buildScenarioSnapshot` helper in [lib/storage.ts](lib/storage.ts).

## Voice (copy style)

All user-facing copy follows the voice guide in the roadmap document at
`~/.claude/plans/the-lesson-plan-needs-composed-pinwheel.md` (Voice of
the app section). Quick version, in case you're shipping copy now:

- Three registers: **plain-direct** (lessons, glossary, errors),
  **coaching** (review headlines, weekly digest, principle-of-the-day),
  **mascot** (empty states, cooldowns, achievement unlocks).
- Use "you" and "your" — never "users" or "the trader."
- Use "the trainer" (or just direct verbs) — not "this app," not "we."
- No exclamation marks in body copy. The trainer is calm.
- No hype words ("crushed it," "amazing," "perfect" unless factual).
- No emojis in body copy. Mascot SVG carries personality.

Audit before shipping a new surface. Past releases have read as one
voice because every contributor checks against these rules.

## Component conventions

- Files use `"use client"` only when they need hooks or browser APIs. Server
  components stay server.
- Component file = one default export. Co-locate small helper sub-components
  in the same file unless they're reused.
- Class names use the Tailwind tokens defined in [tailwind.config.ts](tailwind.config.ts)
  (`text-good`, `text-bad`, `text-warn`, `text-accent`, `text-muted`, `bg-panel`,
  `bg-panel2`, `border-line`). New colors go in the config, not as hex literals
  in components.
- Big numbers in the UI use `font-mono tab-nums` so they don't jiggle when the
  value changes.

## Chart tools (indicator overlays)

Toggleable indicators on the Practice / Paper Trading / Portfolio charts go
through one central registry:

- **`lib/types.ts`** — `ChartToolId` union + `CHART_TOOL_LABELS` + the
  `DEFAULT_INDICATOR_CONFIG` defaulting every tool to `false` (so adding a
  new tool can't silently auto-enable for existing users).
- **`lib/indicator-meta.ts`** — one row per *drawn line*, not per toggle.
  EMA toggle → 3 lines (ema20/ema50/ema200). Bollinger toggle → 3 lines.
  Super Guppy toggle → 1 entry (the 24-EMA ribbon is treated as one
  semantic indicator for legend + tooltip purposes). Each row carries
  color, plain-English name, one-line meaning, Learn slug, value formatter.
- **`components/Chart.tsx`** (main pane) / **`components/IndicatorSubChart.tsx`**
  (sub-panel oscillators) draw the series and register them in
  `seriesMetaRef` keyed by `IndicatorLineId`. The crosshair handler uses
  that registry to resolve hover targets; dedup-by-id means ribbon
  indicators (multiple series, one id) show as a single legend row.
- **`components/practice/ChartLegend.tsx`** + **`ChartHoverTooltip.tsx`**
  read from `indicator-meta`. Both special-case `super_guppy` to render
  a state chip (BULL/BEAR/MIXED) using the active color-mode palette
  instead of a numeric value.
- **`components/practice/ChartToolsHelp.tsx`** — the `?` modal beside the
  toggle bar. Add a card here when you add a tool.
- **`components/DefaultOverlaysSettings.tsx`** — Settings → Default chart
  overlays. Add the tool to `ORDER` and `DESCRIPTIONS`.
- **`lib/scoring.ts`** `INDICATOR_KEYWORDS` — substring vocab for the
  `chart_tools` scoring category. New tool needs an entry so a thesis
  that names it earns the bonus.
- **`lib/learn.ts`** — add a `category: "chart_tools"` Learn term with the
  standard template (simpleDefinition, whyItMatters, example,
  commonMistake, replayScoringConnection, relatedTags).
- **`lib/learn-quizzes.ts`** + **`lib/learn-charts.ts`** — quiz + visual
  chart spec for the Learn term.

Trend-state coloring (Super Guppy and any future direction-aware tool)
reads the user's chart-color mode from `lib/storage.getColorMode()`.
Default is colorblind-friendly (blue/orange/gray); switch is in
Settings → Chart colors. Palettes live in `lib/color-mode.ts`.

## Versioning

- `lib/version.ts` exports `APP_VERSION` — bump on every shipped release.
- `package.json` `version` matches — `lib/version.ts` "3.2" ↔ package.json
  "3.2.0".
- `lib/changelog.ts` gets a new entry per release. 3–5 plain-English bullets
  aimed at a user reading the file cold. The version-badge modal in the
  header renders this directly.
- The roadmap lives at `~/.claude/plans/the-lesson-plan-needs-composed-pinwheel.md`
  (v3 → v5 vision). Don't ship features that aren't on it without updating it.

## Tests

Smoke tests only, focused on the rule engines:

```bash
npm test                    # run vitest once
npm run test:watch          # watch mode
```

Live under `lib/__tests__/`. The test bar is "would a breaking change to this
math silently misscore old saves?" — those need a test. UI assertions are
out of scope; we rely on the production build for type/lint signal.

## When you ship

1. `npm run build` clean (no type errors, no console errors during page
   prerender).
2. `npm test` passes.
3. `APP_VERSION` + `package.json` `version` + a new `CHANGELOG` entry, all
   in the same commit.
4. Update the version-label memory at
   `~/.claude/projects/<project>/memory/feedback_version_label.md` with the
   new version note (one line).
