/**
 * RatingService.ts
 * 
 * Implements the Elo rating system for the sports network.
 * Ra' = Ra + K * (Sa - Ea)
 * Ea = 1 / (1 + 10^((Rb-Ra)/400))
 */

export const DEFAULT_RATING = 1500;
export const K_FACTOR = 32;

export interface PlayerStats {
    matchesPlayed: number;
    wins: number;
    losses: number;
    rating: number;
    recentForm: string[];
}

export class RatingService {
    /**
     * Calculate the expected score for player A vs player B.
     */
    static getExpectedScore(ratingA: number, ratingB: number): number {
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    /**
     * Calculate the new rating for a player after a match.
     * @param actualScore - 1 for win, 0.5 for draw, 0 for loss
     */
    static calculateNewRating(currentRating: number, opponentRating: number, actualScore: number) {
        const expectedScore = this.getExpectedScore(currentRating, opponentRating);
        const delta = Math.round(K_FACTOR * (actualScore - expectedScore));
        const newRating = currentRating + delta;
        return { newRating, delta };
    }

    /**
     * Update the career stats and recent form for a player.
     */
    static updatePlayerCareer(currentStats: Partial<PlayerStats>, result: 'W' | 'L'): PlayerStats {
        const isWin = result === 'W';
        const stats: PlayerStats = {
            matchesPlayed: (currentStats.matchesPlayed || 0) + 1,
            wins: (currentStats.wins || 0) + (isWin ? 1 : 0),
            losses: (currentStats.losses || 0) + (isWin ? 0 : 1),
            rating: currentStats.rating || DEFAULT_RATING,
            recentForm: [result, ...(currentStats.recentForm || [])].slice(0, 5)
        };
        return stats;
    }
}
