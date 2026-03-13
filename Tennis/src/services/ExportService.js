/**
 * ExportService — JSON & CSV export of tournament data
 * ─────────────────────────────────────────────────────────────
 * Usage:
 *   import ExportService from '../services/ExportService';
 *   await ExportService.exportTournamentJSON(tournamentId);
 *   await ExportService.exportPoolsCSV(tournamentId, pools);
 */

import { db } from './firebase';
import {
    doc, getDoc, collection, getDocs
} from 'firebase/firestore';

const ExportService = {

    /** Trigger a browser download of any string content */
    _download(filename, content, mime = 'application/json') {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /** Convert array-of-objects to CSV string */
    _toCSV(rows) {
        if (!rows.length) return '';
        const headers = Object.keys(rows[0]);
        const lines = [
            headers.join(','),
            ...rows.map(row =>
                headers.map(h => {
                    const val = row[h] ?? '';
                    const str = String(val).replace(/"/g, '""');
                    return `"${str}"`;
                }).join(',')
            )
        ];
        return lines.join('\r\n');
    },

    /**
     * Export the full tournament document + participants + matches as JSON.
     */
    async exportTournamentJSON(tournamentId) {
        const tRef = doc(db, 'tournaments', tournamentId);
        const tSnap = await getDoc(tRef);
        if (!tSnap.exists()) throw new Error('Tournament not found');

        const [pSnap, mSnap] = await Promise.all([
            getDocs(collection(db, `tournaments/${tournamentId}/participants`)),
            getDocs(collection(db, `tournaments/${tournamentId}/matches`)),
        ]);

        const payload = {
            tournament: { id: tSnap.id, ...tSnap.data() },
            participants: pSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            matches: mSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            exportedAt: new Date().toISOString(),
        };

        const name = tSnap.data().name?.replace(/\s+/g, '_') || tournamentId;
        this._download(
            `${name}_backup_${Date.now()}.json`,
            JSON.stringify(payload, null, 2),
        );
    },

    /**
     * Export pool standings as CSV.
     * Expects `pools` as an array of { poolName, standings: [] }
     */
    exportPoolsCSV(tournamentName, pools) {
        const rows = [];
        pools.forEach(({ poolName, standings }) => {
            standings.forEach(player => {
                rows.push({
                    Pool: poolName,
                    Name: player.name || player.displayName || '',
                    Played: player.played ?? '',
                    Won: player.won ?? '',
                    Lost: player.lost ?? '',
                    Points: player.points ?? '',
                    SetRatio: player.setRatio ?? '',
                    GameRatio: player.gameRatio ?? '',
                });
            });
        });
        const name = (tournamentName || 'tournament').replace(/\s+/g, '_');
        this._download(
            `${name}_pools_${Date.now()}.csv`,
            this._toCSV(rows),
            'text/csv',
        );
    },

    /**
     * Export match results as CSV.
     */
    exportMatchesCSV(tournamentName, matches) {
        const rows = matches.map(m => ({
            MatchId: m.id,
            Court: m.courtAssigned ?? '',
            PlayerA: m.playerA_Name ?? m.playerA_Id ?? '',
            PlayerB: m.playerB_Name ?? m.playerB_Id ?? '',
            Status: m.status ?? '',
            VerifiedScore: m.verifiedScore
                ? JSON.stringify(m.verifiedScore)
                : '',
        }));
        const name = (tournamentName || 'tournament').replace(/\s+/g, '_');
        this._download(
            `${name}_matches_${Date.now()}.csv`,
            this._toCSV(rows),
            'text/csv',
        );
    },
};

export default ExportService;
