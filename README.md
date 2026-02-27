# Court IQ

A mobile-first web app for tracking tennis player rankings and running fair tournaments within your group.

## Features

- **Player Roster & Elo Ratings** -- Add players to your group and track skill ratings using the Elo system (K=32). Ratings update automatically after every match.
- **Double-Elimination Tournaments** -- Generate seeded brackets (by Elo or random), run a full winners/losers bracket, and crown a champion through a grand final. Supports any player count with automatic bye handling.
- **Ranked Matches** -- Record one-off matches outside of tournaments. Elo ratings update the same way.
- **Data Portability** -- Export your full state as a shareable URL or import someone else's data. Everything is stored client-side in localStorage.

## Getting Started

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) on your phone or browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run preview` | Preview production build |

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, React Router v7, Vitest
