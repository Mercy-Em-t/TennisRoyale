# TennisRoyale

A full-featured tennis tournament management system.

## Features

- **Tournament Lifecycle**: Create tournaments, open/close registrations, close tournaments after finals
- **Player Registration**: Register players with name and email, support late registrations
- **Pool Management**: Drag-and-drop players into pools with seeding, publish pools when ready
- **Match Generation**: Auto-generate round-robin matches within pools
- **Late Registration**: Open late registration during a tournament, append late players to existing pools with automatic match generation
- **Match Scheduling**: Schedule matches with date/time
- **Match Scoring**: Record match scores with automatic winner determination
- **Bracket Advancement**: Advance top pool players to knockout bracket stages (quarterfinal → semifinal → final)
- **Export & Archive**: Export full tournament data as JSON, archive completed tournaments

## Tech Stack

- **Backend**: Node.js, Express, SQLite (via better-sqlite3)
- **Frontend**: React, Vite, React Router
- **Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend)

## Getting Started

### Prerequisites

- Node.js 18+ 

### Setup

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running

```bash
# Start the backend server (port 3001)
cd server
npm start

# In another terminal, start the frontend dev server (port 5173)
cd client
npm run dev
```

The frontend dev server proxies API requests to the backend at `http://localhost:3001`.

### Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

## API Endpoints

### Tournaments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments` | Create tournament |
| GET | `/api/tournaments` | List tournaments |
| GET | `/api/tournaments/:id` | Get tournament |
| PATCH | `/api/tournaments/:id/open-registration` | Open registration |
| PATCH | `/api/tournaments/:id/close-registration` | Close registration |
| PATCH | `/api/tournaments/:id/open-late-registration` | Open late registration |
| PATCH | `/api/tournaments/:id/close-late-registration` | Close late registration |
| PATCH | `/api/tournaments/:id/close` | Close tournament |
| GET | `/api/tournaments/:id/export` | Export tournament data |
| POST | `/api/tournaments/:id/archive` | Archive tournament |

### Registrations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments/:id/registrations` | Register player |
| GET | `/api/tournaments/:id/registrations` | List registrations |

### Pools
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments/:id/pools` | Create pools with player assignments |
| GET | `/api/tournaments/:id/pools` | Get pools |
| PUT | `/api/tournaments/:id/pools/:poolId/players` | Update pool players (drag-and-drop seeding) |
| PATCH | `/api/tournaments/:id/publish-pools` | Publish pools |
| POST | `/api/tournaments/:id/append-late-registrations` | Append late registrations to pools |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments/:id/generate-matches` | Generate round-robin matches |
| GET | `/api/tournaments/:id/matches` | List matches |
| PATCH | `/api/tournaments/matches/:matchId/schedule` | Schedule a match |
| PATCH | `/api/tournaments/matches/:matchId/score` | Score a match |
| POST | `/api/tournaments/:id/advance-bracket` | Advance bracket stage |

## Tournament Workflow

1. **Create** a tournament
2. **Open registration** and register players
3. **Close registration**
4. **Create pools** by dragging players into pool groups and setting seed positions
5. **Publish pools** when satisfied with assignments
6. **Generate matches** (creates round-robin matches within each pool)
7. **Schedule** and **score** matches
8. Optionally **open late registration** to add more players during the tournament
9. **Advance bracket** to create knockout rounds from pool winners
10. **Close tournament** after all matches are complete
11. **Export** and **archive** tournament data
