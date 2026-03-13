/**
 * Bracket & Pool Engine
 * Handles Round Robin rankings and Knockout draw generation.
 */

export interface PlayerStats {
    id: string | number;
    name: string;
    points: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
}

export interface MatchResult {
    player1_id: string | number;
    player2_id: string | number;
    score_player1: number; // games or sets based on usage
    score_player2: number;
    winner_id: string | number;
    status: string;
}

export class BracketEngine {

    /**
     * Ranks players based on match results (typically for Pool/Round Robin phase)
     * Criteria: Points > Set Ratio > Game Ratio
     */
    static rankPlayers(participants: any[], matches: any[]): PlayerStats[] {
        const statsMap = new Map<string | number, PlayerStats>();

        participants.forEach(p => {
            statsMap.set(p.id, {
                id: p.id,
                name: p.name || p.displayName,
                points: 0,
                setsWon: 0,
                setsLost: 0,
                gamesWon: 0,
                gamesLost: 0
            });
        });

        matches.filter(m => m.status === 'completed' || m.status === 'closed').forEach(m => {
            const s1 = statsMap.get(m.player1_id);
            const s2 = statsMap.get(m.player2_id);

            if (!s1 || !s2) return;

            // Update Points (Win = 2, Loss = 0)
            if (m.winner_id === m.player1_id) {
                s1.points += 2;
            } else if (m.winner_id === m.player2_id) {
                s2.points += 2;
            }

            // Update Game/Set stats
            // In newtennis, score_player1/2 usually refers to SETS in the main match table
            const p1Score = Number(m.score_player1) || 0;
            const p2Score = Number(m.score_player2) || 0;

            s1.setsWon += p1Score;
            s1.setsLost += p2Score;
            s2.setsWon += p2Score;
            s2.setsLost += p1Score;

            // Note: If we had detailed game-by-game data, we would update gamesWon/Lost here
        });

        return Array.from(statsMap.values()).sort((a, b) => {
            // 1. Points
            if (b.points !== a.points) return b.points - a.points;

            // 2. Set Ratio
            const aSetRatio = a.setsWon / (a.setsLost || 1);
            const bSetRatio = b.setsWon / (b.setsLost || 1);
            if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;

            // 3. Game Ratio (if available)
            const aGameRatio = a.gamesWon / (a.gamesLost || 1);
            const bGameRatio = b.gamesWon / (b.gamesLost || 1);
            return bGameRatio - aGameRatio;
        });
    }

    /**
     * Generates a balanced knockout bracket (Single Elimination)
     */
    static generateKnockoutDraw(players: any[]) {
        const count = players.length;
        if (count === 0) return { size: 0, slots: [] };

        // Find nearest power of 2
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(count)));
        const slots = new Array(bracketSize).fill(null);

        // Basic placement (can be enhanced with seeding logic)
        players.forEach((player, index) => {
            slots[index] = player;
        });

        return {
            size: bracketSize,
            slots,
            byes: bracketSize - count
        };
    }
}
