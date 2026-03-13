/**
 * Tennis Scoring Engine
 * Handles different match formats and game/set logic.
 */

export const FORMATS = {
    SHORT_SET: 'short_set',
    FULL_SET: 'full_set',
    KNOCKOUT_7: 'knockout_7',
    KNOCKOUT_11: 'knockout_11'
};

export const calculateGameScore = (points1, points2, isTieBreak = false) => {
    if (isTieBreak) {
        return { score1: points1, score2: points2 };
    }

    const scores = ['0', '15', '30', '40', 'AD'];

    if (points1 < 3 && points2 < 3) {
        return { score1: scores[points1], score2: scores[points2] };
    }

    if (points1 === points2) return { score1: '40', score2: '40' }; // Deuce
    if (points1 > points2) return { score1: points1 - points2 >= 2 ? 'Game' : 'AD', score2: '40' };
    return { score1: '40', score2: points2 - points1 >= 2 ? 'Game' : 'AD' };
};

export const checkSetWinner = (games1, games2, format) => {
    if (format === FORMATS.SHORT_SET) {
        // First to 4, win by 2. TB at 4-4.
        if (games1 >= 4 && games1 - games2 >= 2) return 1;
        if (games2 >= 4 && games2 - games1 >= 2) return 2;
        if (games1 === 5 && games2 === 4) return 1; // 5-4 win if win by 2 is reached? 
        // Usually TB is at 4-4, winner of TB wins set 5-4.
        return 0;
    }

    if (format === FORMATS.FULL_SET) {
        // First to 6, win by 2. TB at 6-6.
        if (games1 >= 6 && games1 - games2 >= 2) return 1;
        if (games2 >= 6 && games2 - games1 >= 2) return 2;
        return 0;
    }

    return 0;
};

export const isTieBreakNeeded = (games1, games2, format) => {
    if (format === FORMATS.SHORT_SET) return games1 === 4 && games2 === 4;
    if (format === FORMATS.FULL_SET) return games1 === 6 && games2 === 6;
    return false;
};
