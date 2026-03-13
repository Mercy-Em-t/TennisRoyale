/**
 * RatingService.js
 * 
 * Implements the Elo rating system for the sports network.
 * Ra' = Ra + K * (Sa - Ea)
 * Ea = 1 / (1 + 10^((Rb-Ra)/400))
 */

const DEFAULT_RATING = 1500;
const K_FACTOR = 32;

/**
 * Calculate the expected score for player A vs player B.
 * @param {number} ratingA - Current rating of player A
 * @param {number} ratingB - Current rating of player B
 * @returns {number} Expected score for player A (0 to 1)
 */
export const getExpectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculate the new rating for a player after a match.
 * @param {number} currentRating - Current rating of the player
 * @param {number} opponentRating - Current rating of the opponent
 * @param {number} actualScore - 1 for win, 0.5 for draw, 0 for loss
 * @returns {object} { newRating, delta }
 */
export const calculateNewRating = (currentRating, opponentRating, actualScore) => {
    const expectedScore = getExpectedScore(currentRating, opponentRating);
    const delta = Math.round(K_FACTOR * (actualScore - expectedScore));
    const newRating = currentRating + delta;
    return { newRating, delta };
};

/**
 * Update the career stats and recent form for a player.
 * @param {object} currentStats - Current careerStats object
 * @param {string[]} recentForm - Current recentForm array
 * @param {string} result - 'W' or 'L'
 * @returns {object} { newStats, newForm }
 */
export const updatePlayerCareer = (currentStats, recentForm, result) => {
    const isWin = result === 'W';
    const newStats = {
        ...currentStats,
        matchesPlayed: (currentStats.matchesPlayed || 0) + 1,
        wins: (currentStats.wins || 0) + (isWin ? 1 : 0),
        losses: (currentStats.losses || 0) + (isWin ? 0 : 1),
    };

    // Keep only the last 5 results in recent form
    const newForm = [result, ...(recentForm || [])].slice(0, 5);

    return { newStats, newForm };
};

export default {
    DEFAULT_RATING,
    K_FACTOR,
    getExpectedScore,
    calculateNewRating,
    updatePlayerCareer,
};
