/**
 * SafetyService.js
 * Enforces conflict-of-interest rules for the "Universal Player" architecture.
 */
export const SafetyService = {
    /**
     * Prevents an Official/Admin from refereeing a match they are playing in.
     */
    canRefereeMatch: (userId, match) => {
        if (!userId || !match) return false;
        const participants = match.participantsArray || [];
        // RULE: You cannot be a referee if you are in the participants array.
        return !participants.includes(userId);
    },

    /**
     * Prevents an Admin from approving their own tournament registration.
     */
    canApproveRegistration: (adminId, registrantId) => {
        if (!adminId || !registrantId) return false;
        // RULE: You cannot approve your own entry.
        return adminId !== registrantId;
    },

    /**
     * General permission check for sensitive actions.
     */
    hasElevatedAccess: (userId, tournament, requiredRole = 'admin') => {
        if (!userId || !tournament) return false;

        // Ownership check
        if (tournament.hostId === userId) return true;

        // Contextual role check (mock/placeholder for granular staff subcollection)
        if (tournament.staff && tournament.staff[userId] === requiredRole) return true;

        return false;
    }
};

export default SafetyService;
