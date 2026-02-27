# Tennis Matchups — Product Requirements

A mobile-first web app for a high school tennis coach to track player rankings and run fair matchups. The app uses an Elo rating system so stronger players face stronger opponents and weaker players get evenly matched games.

---

## Tech Stack & Constraints

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript (already scaffolded with Vite) |
| Styling | Tailwind CSS (needs to be installed) |
| Routing | Client-side — use React Router |
| State persistence | All app state lives in `localStorage`. On page load, hydrate state from `localStorage`. No backend. |
| Target devices | **Mobile-first**. No hover-dependent interactions. All tap/click targets should be comfortably sized (min 44×44 px). |

---

## Data Model

### Player
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (UUID) | Unique identifier |
| `name` | `string` | Display name |
| `elo` | `number` | Starts at **1200** for every new player |
| `wins` | `number` | Lifetime win count |
| `losses` | `number` | Lifetime loss count |
| `createdAt` | `string` (ISO 8601) | When the player was added |

### Match Record
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (UUID) | Unique identifier |
| `player1Id` | `string` | |
| `player2Id` | `string` | |
| `player1Score` | `number` | Numeric score |
| `player2Score` | `number` | Numeric score |
| `winnerId` | `string` | Must be `player1Id` or `player2Id` |
| `eloChange` | `number` | Absolute Elo points exchanged |
| `timestamp` | `string` (ISO 8601) | |
| `context` | `"ranked"` \| `"tournament"` | Where the match was recorded |
| `tournamentId?` | `string` | Set when `context === "tournament"` |

### Tournament
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (UUID) | |
| `name` | `string` | User-provided or auto-generated name |
| `status` | `"in_progress"` \| `"completed"` | |
| `playerIds` | `string[]` | Players participating |
| `winnersRounds` | `Round[]` | Winners bracket rounds |
| `losersRounds` | `Round[]` | Losers bracket rounds |
| `grandFinal` | `Matchup \| null` | Final match |
| `createdAt` | `string` (ISO 8601) | |

A `Round` is an array of `Matchup` objects. A `Matchup` contains:
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `player1Id` | `string \| null` | `null` = TBD (waiting on prior round) |
| `player2Id` | `string \| null` | |
| `winnerId` | `string \| null` | Set when the match is recorded |
| `player1Score` | `number \| null` | |
| `player2Score` | `number \| null` | |
| `isBye` | `boolean` | If `true`, the present player auto-advances |

---

## Elo Rating Algorithm

Use the standard Elo formula:

1. **Expected score**: `E_a = 1 / (1 + 10^((R_b - R_a) / 400))`
2. **New rating**: `R_a' = R_a + K * (S_a - E_a)` where `S_a = 1` for a win, `0` for a loss.
3. **K-factor**: Use `K = 32` (standard for casual/club play).

Both players' Elo ratings update after every recorded match (ranked or tournament).

---

## Navigation

- **Fixed top bar** with the app name/logo on the left and a **hamburger menu icon** on the left.
- Tapping the hamburger opens a **slide-out side panel** (overlay, not push) listing the pages:
  1. Player Manager
  2. Tournament Manager — **disabled** if fewer than 2 players exist. Show muted helper text: _"Add at least 2 players first"_
  3. Ranked Match Manager — **disabled** if fewer than 2 players exist. Same helper text.
  4. _(spacer or divider)_
  5. Export Data
  6. **Clear All Data** — styled in red at the bottom of the menu.
- Tapping outside the panel or tapping a menu item closes it.
- The currently active page should be visually highlighted in the menu.

---

## Views

### 1. Player Manager (`/`)

This is the default/home view.

#### Empty state (0 players)
- Centered message: _"No players yet"_ with a subheading like _"Add your first players to get started."_
- A prominent **"Add Players"** button below the text.

#### List state (1+ players)
- A list/card view of all players, each row showing:
  - Player name
  - Current Elo rating
  - Win/loss record (e.g. "5W - 3L")
- List should be sorted by Elo (highest first) by default.
- A **floating action button (FAB)** or top-bar button labeled **"+ Add Player"** is always visible.
- Each player row should be tappable to open a detail/edit view or action sheet with options:
  - Rename player
  - Delete player (with confirmation)

#### Add Player Modal
- A modal/bottom-sheet with a single text input for the player's name and a "Add" button.
- On successful add:
  - Clear the input field.
  - Show a **toast notification**: _"[Name] added!"_
  - **Keep the modal open** so the coach can rapidly add multiple players.
- A close/dismiss button to exit the modal.
- Pressing Enter in the input should submit (same as tapping "Add").

### 2. Tournament Manager (`/tournaments`)

#### Tournament List View
- Shows a list of past and current tournaments.
- A button to **"Create Tournament"**.
- Each tournament entry shows: name, status (in progress / completed), date, number of players.

#### Create Tournament Flow
1. User taps "Create Tournament".
2. A screen/modal to:
   - Enter a tournament name (optional — auto-generate a default like "Tournament #3").
   - Select which players to include (multi-select checklist of all registered players, all selected by default).
3. On confirmation, generate a **double-elimination bracket**:
   - **Winners bracket**: If there are N players, determine how many byes are needed to fill the bracket to the next power of 2. Seed players by Elo (highest Elo gets most favorable position / bye). First round matchups pair top-seeded vs bottom-seeded.
   - **Losers bracket**: Losers from each winners round drop into the losers bracket. Standard double-elimination flow.
   - **Grand final**: Winner of losers bracket faces winner of winners bracket.

#### Bracket View
- Display the bracket visually. At minimum, show a clear round-by-round progression for both winners and losers brackets.
- Each matchup is tappable.

#### Record Match Modal (from tapping a matchup)
- Shows the two player names.
- Numeric score input for each player.
- A way to **declare the winner** (e.g., tap on the player's name/side, or a radio-style selector).
- "Save" button to record the result.
- On save:
  - Update Elo ratings for both players.
  - Advance the winner to the next round.
  - Move the loser to the losers bracket (or eliminate from losers bracket if already there).
  - Create a `MatchRecord` entry.

### 3. Ranked Match Manager (`/ranked`)

A simple view to record a one-off match between two players.

#### Flow
1. **Select Player 1** — dropdown or searchable list of all players.
2. **Select Player 2** — same list, excluding Player 1.
3. **Enter scores** — numeric input for each player.
4. **Declare winner** — explicit selection (don't infer from score alone since tennis scoring can vary).
5. **Submit** — validates inputs, updates Elo, creates a `MatchRecord`, shows confirmation toast.

#### Match History
- Below the form (or in a tab), show a scrollable list of recent ranked matches with:
  - Player names
  - Score
  - Elo change (e.g. "+12 / -12")
  - Date

---

## Export & Import Data

### Export
- Accessible from the hamburger menu.
- When tapped:
  1. Serialize the entire app state (players, matches, tournaments) to JSON.
  2. Compress/encode it (e.g. base64 or URI-safe encoding).
  3. Generate a URL with the encoded state as a query parameter: `https://<domain>/?data=<encoded>`
  4. Copy the URL to the clipboard and show a toast: _"Share link copied!"_
  5. Alternatively, display the URL in a modal so the user can manually copy it.

### Import (via URL)
- On page load, check for a `data` query parameter.
- If present:
  1. Decode and validate the data.
  2. **Show a confirmation modal**: _"This will replace all existing data. Are you sure?"_
  3. If confirmed: clear `localStorage`, load the imported state, remove the query parameter from the URL (via `replaceState`).
  4. If declined: remove the query parameter and keep existing state.

### Clear All Data
- Accessible from the hamburger menu (red text, at the bottom).
- On tap, show a **confirmation modal**: _"This will permanently delete all players, matches, and tournaments. This cannot be undone. Are you sure?"_
- Requires explicit confirmation (e.g. type "DELETE" or tap a red "Yes, delete everything" button).
- On confirm: wipe `localStorage` and reset app to the empty/initial state.

---

## Style & Tone

- The app should feel **polished and slightly over-the-top serious** — like a professional esports analytics dashboard, but for high school tennis. Think dramatic stat labels, bold typography, maybe some subtle competitive flair (e.g. "UNRANKED" badge for new players, flame icon for win streaks). The humor comes from the contrast between the seriousness of the UI and the casual context.
- Use a **dark or deep-colored theme** to reinforce the "serious" feel.
- Clean, modern UI with good spacing and readable fonts.
- Animations/transitions should be smooth but not distracting (page transitions, modal opens, toast slides).
- Error states and empty states should have personality (witty microcopy).

---

## Out of Scope (for now)

- User authentication / accounts
- Backend / database — everything is client-side
- Multiplayer / real-time sync
- Print bracket functionality
- Undo/redo for match results
