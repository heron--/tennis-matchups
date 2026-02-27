# Implementation Plan: Margin-Weighted ELO + Calibration Rounds

## Context

Two problems to solve:
1. **ELO changes are binary** — a 6-0 blowout and a 7-5 squeaker produce the same rating swing. We want score margin to influence ELO deltas.
2. **No calibration mode** — when new players all start at 1200, there's no structured way to quickly differentiate their ratings. We need a "calibration rounds" mode that pairs players diversely across X rounds to efficiently establish accurate ELOs.

---

## Feature 1: Margin-Weighted ELO (Steps 1–3)

### Step 1 — Update ELO calculation (`src/elo.ts`)

Add a `marginMultiplier(winnerScore, loserScore)` function:
- Formula: `1.0 + (ln(1 + diff) / ln(1 + total)) * 0.5`
- Bounded to **[1.0, 1.5]** — a shutout (6-0) gives ~1.5x, a close match (7-5) gives ~1.18x
- A winner always gains **at least** the base ELO amount; margin only increases it

Update `calculateEloUpdate` signature to accept optional scores:
```ts
calculateEloUpdate(winnerElo, loserElo, winnerScore?, loserScore?)
```
- When scores are provided, the K-factor delta is scaled by the multiplier
- When omitted, behavior is identical to today (backward compatible — bracket tests still pass)

### Step 2 — ELO unit tests (`src/elo.test.ts` — new file)

Test cases:
- `marginMultiplier` bounds: always in [1.0, 1.5], returns 1.0 for edge cases (0-0, equal scores)
- `marginMultiplier` ordering: 6-0 > 6-1 > 7-5 > 7-6
- `calculateEloUpdate` backward compat: omitting scores gives same results as before
- Blowout produces larger ELO change than close match (same starting ELOs)
- Max ELO change never exceeds 1.5x base
- Underdog blowout win produces large swing

### Step 3 — Thread scores to ELO call site (`src/useAppState.ts`)

In `recordMatch`, determine winner/loser scores from the existing parameters and pass them through:
```ts
const winnerScore = winnerId === player1Id ? player1Score : player2Score;
const loserScore = winnerId === player1Id ? player2Score : player1Score;
calculateEloUpdate(winner.elo, loser.elo, winnerScore, loserScore);
```
This is the only call site. No UI changes needed — both `RankedMatchManager` and `TournamentManager` already pass scores to `recordMatch`.

---

## Feature 2: Calibration Rounds (Steps 4–7)

### Step 4 — Add types (`src/types.ts`, `src/storage.ts`)

New types in `types.ts`:
- `CalibrationMatchup` — `{ id, player1Id, player2Id, winnerId, player1Score, player2Score }`
- `CalibrationRound` — `{ roundNumber, matchups[], byePlayerId, completed }`
- `CalibrationSession` — `{ id, playerIds[], totalRounds, currentRound, rounds[], status, startingElos: Record<string, number>, createdAt }`

Extend existing types:
- `AppState` — add `calibrationSessions: CalibrationSession[]`
- `MatchRecord.context` — add `'calibration'` to the union, add optional `calibrationSessionId`

Storage migration in `storage.ts`:
- Add `calibrationSessions: []` to `DEFAULT_STATE`
- In `loadState()`, default missing `calibrationSessions` to `[]` for existing users

### Step 5 — Pairing algorithm (`src/calibration.ts` — new file)

**"Diversity-First" pairing algorithm:**

`generateCalibrationPairings(players, pastRounds)`:
1. If odd player count, select bye player (fewest past byes, ties broken randomly)
2. Build matchup history matrix from completed rounds
3. Score all possible pairs: `cost = (timesPlayed × 1000) + rankDiff × randomFactor(0.5–1.5)`
   - The 1000× penalty on repeats means fresh matchups are always preferred
   - `rankDiff × randomFactor` adds controlled noise so we don't just pair by rank
4. Greedy min-cost matching (sort pairs by cost, pick lowest-cost unpaired pair)

Helper functions:
- `buildMatchupHistory(rounds)` — returns `Map<playerId, Map<opponentId, count>>`
- `createCalibrationSession(players, totalRounds)` — snapshots starting ELOs, generates first round

### Step 6 — Calibration algorithm tests (`src/calibration.test.ts` — new file)

Test cases:
- Correct matchup count for even/odd player counts
- Bye generated for odd count; bye player exists in player list
- Every active player appears in exactly one matchup per round
- With 4 players and 3 rounds, all 6 possible pairs are used (no repeats)
- Byes distributed fairly across 5 rounds with 5 players (each player gets exactly 1 bye)
- `buildMatchupHistory` returns correct counts
- `createCalibrationSession` initializes with correct state and ELO snapshots

### Step 7 — Wire into app (state, routing, UI)

**7a. State management** (`src/useAppState.ts`):
- Add `addCalibrationSession`, `updateCalibrationSession`, `deleteCalibrationSession` callbacks (same pattern as tournament CRUD)
- Extend `recordMatch` context type to accept `'calibration'` + optional `calibrationSessionId`

**7b. Navigation** (3 files):
- `src/App.tsx` — add route: `/calibration` → `<CalibrationManager />`
- `src/components/TopBar.tsx` — add `'/calibration': 'Calibration'` to `PAGE_LABELS`
- `src/components/SideNav.tsx` — add `NavItemDisableable` for Calibration between "Ranked Match" and the divider

**7c. Calibration UI page** (`src/pages/CalibrationManager.tsx` — new file):

Three views (same view-state pattern as `TournamentManager`):

1. **List view** — shows existing calibration sessions with status, player count, date
2. **Create view** — player selection checkboxes + number-of-rounds input → calls `createCalibrationSession` → navigates to session
3. **Session view**:
   - Round progress header ("Round 2 of 5")
   - Matchup cards for current round (tap to record result via modal)
   - Bye indicator if a player sits out
   - Standings table: Rank, Player, ELO, Change (vs starting ELO), W-L
   - On match recorded: call `recordMatch(context='calibration')`, update matchup in session
   - On round complete: if more rounds, call `generateCalibrationPairings` with latest ELOs and push new round; if last round, set status to `'completed'`

---

## Implementation Order

| Step | Files | What |
|------|-------|------|
| 1 | `src/elo.ts` | Add `marginMultiplier`, update `calculateEloUpdate` |
| 2 | `src/elo.test.ts` (new) | ELO unit tests |
| 3 | `src/useAppState.ts` | Pass scores through to ELO calculation |
| 4 | `src/types.ts`, `src/storage.ts` | Calibration types, AppState extension, storage migration |
| 5 | `src/calibration.ts` (new) | Pairing algorithm |
| 6 | `src/calibration.test.ts` (new) | Calibration algorithm tests |
| 7a | `src/useAppState.ts` | Calibration CRUD in state hook |
| 7b | `src/App.tsx`, `TopBar.tsx`, `SideNav.tsx` | Route + navigation |
| 7c | `src/pages/CalibrationManager.tsx` (new) | Full calibration UI |

## Verification

- Run `npm test` after steps 2 and 6 to validate all unit tests pass
- After step 3, manually test a ranked match and verify ELO change differs based on score margin
- After step 7c, create a calibration session with 4-6 players, play through rounds, verify:
  - No repeat matchups in early rounds
  - Byes rotate fairly for odd player counts
  - ELO deltas shown correctly in standings
  - Completed session shows final state
