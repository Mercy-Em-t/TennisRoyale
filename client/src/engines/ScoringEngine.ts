/**
 * Tennis Scoring Engine
 * Handles modern match formats, game logic, and set rules.
 * Optimized for the Royale interface.
 */

export enum MatchFormat {
    SHORT_SET = 'short_set',
    FULL_SET = 'full_set',
    KNOCKOUT_7 = 'knockout_7',
    KNOCKOUT_11 = 'knockout_11'
}

export interface MatchScore {
    pointsA: number;
    pointsB: number;
    gamesA: number;
    gamesB: number;
    setsA: number;
    setsB: number;
    isTieBreak: boolean;
}

const POINT_LABELS = ['0', '15', '30', '40', 'AD'];

export class ScoringEngine {

    /**
     * Translates numeric points to Tennis display strings
     */
    static getPointLabel(pointsA: number, pointsB: number, isTieBreak: boolean = false): { labelA: string; labelB: string } {
        if (isTieBreak) {
            return { labelA: pointsA.toString(), labelB: pointsB.toString() };
        }

        // Standard Tennis Scoring
        if (pointsA >= 3 && pointsB >= 3) {
            if (pointsA === pointsB) return { labelA: '40', labelB: '40' };
            if (pointsA > pointsB) return { labelA: 'AD', labelB: '40' };
            return { labelA: '40', labelB: 'AD' };
        }

        return {
            labelA: POINT_LABELS[Math.min(pointsA, 3)],
            labelB: POINT_LABELS[Math.min(pointsB, 3)]
        };
    }

    /**
     * Determines if a point wins the game
     */
    static checkGameWinner(pointsA: number, pointsB: number, isTieBreak: boolean = false): 'A' | 'B' | null {
        if (isTieBreak) {
            if (pointsA >= 7 && pointsA - pointsB >= 2) return 'A';
            if (pointsB >= 7 && pointsB - pointsA >= 2) return 'B';
            return null;
        }

        // Standard Game
        if (pointsA >= 4 && pointsA - pointsB >= 2) return 'A';
        if (pointsB >= 4 && pointsB - pointsA >= 2) return 'B';
        return null;
    }

    /**
     * Determines if a game wins the set
     */
    static checkSetWinner(gamesA: number, gamesB: number, format: MatchFormat): 'A' | 'B' | null {
        const winThreshold = format === MatchFormat.SHORT_SET ? 4 : 6;

        // standard win
        if (gamesA >= winThreshold && gamesA - gamesB >= 2) return 'A';
        if (gamesB >= winThreshold && gamesB - gamesA >= 2) return 'B';

        // Tie-break win (7-6 or 5-4)
        if (gamesA === winThreshold + 1 && gamesB === winThreshold) return 'A';
        if (gamesB === winThreshold + 1 && gamesA === winThreshold) return 'B';

        return null;
    }

    /**
     * Returns true if the next game should be a tie-break
     */
    static isTieBreakNeeded(gamesA: number, gamesB: number, format: MatchFormat): boolean {
        const threshold = format === MatchFormat.SHORT_SET ? 4 : 6;
        return gamesA === threshold && gamesB === threshold;
    }

    /**
     * Helper to update full match state after a point
     */
    static updateScore(score: MatchScore, winner: 'A' | 'B', format: MatchFormat): MatchScore {
        const next = { ...score };

        if (winner === 'A') next.pointsA++;
        else next.pointsB++;

        const gameWinner = this.checkGameWinner(next.pointsA, next.pointsB, next.isTieBreak);

        if (gameWinner) {
            if (gameWinner === 'A') next.gamesA++;
            else next.gamesB++;

            next.pointsA = 0;
            next.pointsB = 0;
            next.isTieBreak = false;

            const setWinner = this.checkSetWinner(next.gamesA, next.gamesB, format);
            if (setWinner) {
                if (setWinner === 'A') next.setsA++;
                else next.setsB++;

                next.gamesA = 0;
                next.gamesB = 0;
            } else if (this.isTieBreakNeeded(next.gamesA, next.gamesB, format)) {
                next.isTieBreak = true;
            }
        }

        return next;
    }
}
