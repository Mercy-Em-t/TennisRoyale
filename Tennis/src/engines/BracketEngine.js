/**
 * Bracket & Pool Engine
 * Handles Round Robin rankings and Knockout bracket generation.
 */

export const rankPlayers = (participants, matches) => {
    // participants: array of { uid, displayName }
    // matches: array of { playerA_Id, playerB_Id, verifiedScore, status }

    const stats = participants.map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
    }));

    matches.filter(m => m.status === 'completed').forEach(m => {
        // Basic logic for ranking
        const score = m.verifiedScore; // { playerA: { sets: 2, games: 12 }, playerB: { sets: 1, games: 10 } }
        const pA = stats.find(s => s.uid === m.playerA_Id);
        const pB = stats.find(s => s.uid === m.playerB_Id);

        if (score.playerA.sets > score.playerB.sets) {
            pA.points += 2;
        } else {
            pB.points += 2;
        }

        pA.setsWon += score.playerA.sets;
        pA.setsLost += score.playerB.sets;
        pA.gamesWon += score.playerA.games;
        pA.gamesLost += score.playerB.games;

        pB.setsWon += score.playerB.sets;
        pB.setsLost += score.playerA.sets;
        pB.gamesWon += score.playerB.games;
        pB.gamesLost += score.playerA.games;
    });

    // Ranking Criteria: Points > Set Ratio > Game Ratio
    return stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;

        const aSetRatio = a.setsWon / (a.setsLost || 1);
        const bSetRatio = b.setsWon / (b.setsLost || 1);
        if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;

        const aGameRatio = a.gamesWon / (a.gamesLost || 1);
        const bGameRatio = b.gamesWon / (b.gamesLost || 1);
        return bGameRatio - aGameRatio;
    });
};

export const generateBracket = (advancingPlayers) => {
    const count = advancingPlayers.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(count))); // 2, 4, 8, 16, 32
    const byes = bracketSize - count;

    return {
        bracketSize,
        byes,
        slots: Array.from({ length: bracketSize }, (_, i) => advancingPlayers[i] || null)
    };
};
