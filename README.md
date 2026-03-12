# TennisRoyale

A comprehensive real-time tennis tournament management system designed for running live tournaments. Built with Node.js, Express, SQLite, and WebSocket support for real-time updates.

## Features

### High Priority Features (Implemented)

#### 🏆 Live Scoring & Auto-Brackets
- Real-time score updates via WebSocket
- Automatic bracket advancement
- Round-robin pool match generation
- Pool standings with game differential
- Standard tournament seeding (1v8, 4v5, 3v6, 2v7)

#### 📱 On-site QR Check-in
- Unique QR codes for each registration
- Fast scan-based check-in
- Manual check-in override
- Check-in status dashboard
- No-show tracking

#### 🎾 Court Allocation & Scheduling
- Court management with surface types
- Match scheduling with court assignment
- Conflict detection
- Live court status (current match, upcoming matches)
- Bulk court creation

#### 💳 Payments & Waivers
- Multiple payment methods (cash, M-Pesa, card, bank transfer)
- Automatic receipt generation
- Payment waiver support
- Refund processing
- Liability waivers with digital signatures
- Medical forms and emergency contacts

### Medium Priority Features (Implemented)

#### 📊 Audit Logs & Exports
- Complete audit trail (who changed what and when)
- JSON and CSV exports
- Tournament data export
- Financial reports
- Bracket export
- Match history

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **QR Codes**: qrcode library
- **Testing**: Jest + Supertest

## Quick Start

```bash
# Clone and install
cd server
npm install

# Start the server
npm start  # Runs on port 3001

# Run tests
npm test
```

## API Endpoints

### Tournaments
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/:id` - Get tournament
- `PUT /api/tournaments/:id` - Update tournament
- `POST /api/tournaments/:id/open-registration` - Open registration
- `POST /api/tournaments/:id/close-registration` - Close registration
- `POST /api/tournaments/:id/start` - Start tournament
- `POST /api/tournaments/:id/complete` - Complete tournament
- `POST /api/tournaments/:id/archive` - Archive tournament
- `GET /api/tournaments/:id/standings` - Get standings

### Players
- `GET /api/players` - List players
- `POST /api/players` - Create player
- `GET /api/players/:id` - Get player
- `PUT /api/players/:id` - Update player
- `GET /api/players/:id/tournaments` - Get player's tournaments

### Registrations
- `GET /api/registrations` - List registrations
- `POST /api/registrations` - Register player
- `GET /api/registrations/:id` - Get registration
- `GET /api/registrations/by-qr/:qr_code` - Find by QR code

### Pools
- `GET /api/pools` - List pools
- `POST /api/pools` - Create pool
- `POST /api/pools/auto-generate` - Auto-generate pools
- `POST /api/pools/:id/add-player` - Add player to pool
- `GET /api/pools/:id/standings` - Get pool standings

### Matches
- `GET /api/matches` - List matches
- `POST /api/matches` - Create match
- `POST /api/matches/:id/start` - Start match
- `POST /api/matches/:id/score` - Update score (live)
- `POST /api/matches/:id/forfeit` - Forfeit match
- `POST /api/matches/:id/advance-winner` - Advance to next round
- `POST /api/matches/generate-pool-matches` - Generate round-robin
- `POST /api/matches/generate-bracket` - Generate bracket from pools

### Courts
- `GET /api/courts` - List courts
- `POST /api/courts` - Create court
- `POST /api/courts/bulk-create` - Create multiple courts
- `POST /api/courts/:id/assign-match` - Assign match to court
- `GET /api/courts/:id/schedule` - Get court schedule

### Check-in
- `POST /api/checkin/scan` - QR code check-in
- `POST /api/checkin/manual` - Manual check-in
- `GET /api/checkin/generate-qr/:registration_id` - Generate QR
- `GET /api/checkin/status/:tournament_id` - Check-in status
- `POST /api/checkin/mark-no-show` - Mark no-show
- `POST /api/checkin/undo` - Undo check-in

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `POST /api/payments/:id/refund` - Process refund
- `POST /api/payments/waive` - Waive payment
- `GET /api/payments/tournament/:id/summary` - Payment summary
- `GET /api/payments/:id/receipt` - Get receipt

### Waivers
- `GET /api/waivers` - List waivers
- `POST /api/waivers` - Create waiver
- `POST /api/waivers/:id/sign` - Sign waiver
- `POST /api/waivers/create-for-tournament` - Create for all registrations
- `GET /api/waivers/tournament/:id/status` - Waiver status

### Exports
- `GET /api/exports/tournament/:id` - Full export
- `GET /api/exports/tournament/:id/registrations` - Registrations (JSON/CSV)
- `GET /api/exports/tournament/:id/matches` - Matches (JSON/CSV)
- `GET /api/exports/tournament/:id/bracket` - Bracket structure
- `GET /api/exports/tournament/:id/standings` - Standings (JSON/CSV)
- `GET /api/exports/tournament/:id/financial` - Financial report

### Audit
- `GET /api/audit` - List audit logs
- `GET /api/audit/record/:table/:id` - Record history
- `GET /api/audit/tournament/:id` - Tournament audit
- `GET /api/audit/match/:id` - Match audit (for disputes)
- `GET /api/audit/stats/summary` - Audit statistics

## WebSocket Events

Connect to `ws://localhost:3001/ws` and subscribe to tournaments:

```javascript
// Subscribe to tournament updates
ws.send(JSON.stringify({ type: 'subscribe', tournamentId: 1 }));

// Receive events:
// - tournament_started
// - tournament_completed
// - match_started
// - score_update
// - match_completed
// - match_forfeited
// - bracket_updated
// - player_checked_in
// - court_updated
// - match_scheduled
```

## Tournament Lifecycle

```
draft → registration_open → registration_closed → in_progress → completed → archived
```

## Database Schema

- **tournaments** - Tournament details and status
- **players** - Player master list
- **registrations** - Tournament enrollments with QR codes
- **pools** - Group play divisions
- **pool_players** - Pool memberships with standings
- **courts** - Venue courts
- **matches** - Match details with scores
- **payments** - Payment records
- **waivers** - Liability and medical forms
- **audit_logs** - Complete audit trail

## Testing

```bash
npm test           # Run all tests
npm test -- --coverage  # With coverage report
```

## License

MIT
