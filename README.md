# Southern Charm - Sleeper Fantasy Football App

A Next.js App Router application that integrates with the Sleeper public API to display fantasy football league information.

## Features

- Search for users by Sleeper username
- View all leagues for a user in the current NFL season
- View detailed league information, rosters, and weekly matchups
- Clean and simple UI with loading states and error handling

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

The app includes server-side API routes that proxy requests to the Sleeper API:

- `/api/user/[username]` - Get user information by username
- `/api/leagues/[userId]` - Get leagues for a user (supports `season` and `sport` query params)
- `/api/league/[leagueId]` - Get league details
- `/api/rosters/[leagueId]` - Get rosters for a league
- `/api/matchups/[leagueId]` - Get matchups for a league and week (requires `week` query param)

## Pages

- `/` - Home page with username input
- `/leagues` - List of leagues for a user (requires `userId` query param)
- `/league/[leagueId]` - League details, rosters, and matchups with week selector

