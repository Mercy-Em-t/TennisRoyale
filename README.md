# TennisRoyale

Tennis tournament management system with state-driven architecture.

## State Management

### Entity States

| Entity      | Possible States                                |
| ----------- | ---------------------------------------------- |
| Player/Team | `registered`, `active`, `eliminated`           |
| Match       | `scheduled`, `in_progress`, `completed`, `canceled` |
| Tournament  | `registration_open`, `in_progress`, `completed` |

### Player Journey Flow

1. Player registers → status = `registered`
2. Player assigned a match → Match created with status = `scheduled`
3. Match starts → Match status = `in_progress`, Player status = `active`
4. Match ends → Result recorded, Match status = `completed`
5. Winner returns to `registered` (ready for next match), Loser set to `eliminated`
6. New match created for winner → repeat from step 2

### Match Lifecycle

Matches are stateless units that can be created and repeated infinitely. Each match:
- Has Team A and Team B (teams are valid with 1 member for singles)
- Produces a result with a winner and loser
- Records results progressively toward tournament completion
- Supports context metadata (round number, reason/bracket type)

## Getting Started

```bash
cd server
npm install
npm start    # Starts server on port 3001
npm test     # Runs test suite
```

## API Endpoints

### Players
- `POST /api/players` — Create a player/team
- `GET /api/players` — List all players
- `GET /api/players/:id` — Get player details
- `PATCH /api/players/:id/status` — Update player state
- `POST /api/players/:id/members` — Add team members (team type only)

### Tournaments
- `POST /api/tournaments` — Create a tournament
- `GET /api/tournaments` — List all tournaments
- `GET /api/tournaments/:id` — Get tournament with players and matches
- `PATCH /api/tournaments/:id/state` — Update tournament state
- `POST /api/tournaments/:id/register` — Register a player
- `GET /api/tournaments/:id/players` — List registered players

### Matches
- `POST /api/matches` — Create a match
- `GET /api/matches` — List matches (optional `?tournament_id=`)
- `GET /api/matches/:id` — Get match with result
- `PATCH /api/matches/:id/status` — Update match state
- `POST /api/matches/:id/result` — Record match result (winner/loser)
- `GET /api/matches/tournament/:tournament_id/results` — Get all results for a tournament
