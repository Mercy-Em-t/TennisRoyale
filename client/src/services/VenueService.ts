import api from '../api';

export interface Venue {
    id: string;
    name: string;
    address: string;
    courtCount: number;
    verified: boolean;
    activeTournaments: string[];
}

export class VenueService {
    /**
     * Get all verified venues for the network.
     */
    static async getVerifiedVenues(): Promise<Venue[]> {
        // Implementation would call API
        return [];
    }

    /**
     * Get details for a specific venue.
     */
    static async getVenue(venueId: string): Promise<Venue | null> {
        // Implementation would call API
        return null;
    }

    /**
     * Link a tournament node to a physical venue.
     */
    static async linkTournamentToVenue(tournamentId: string, venueId: string) {
        // Implementation would call API
    }
}
