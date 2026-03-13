/**
 * ExportService.ts
 * 
 * Handles data portability and backup protocols.
 */

export class ExportService {
    /**
     * Trigger a browser download of content.
     */
    private static download(filename: string, content: string, mime: string = 'application/json') {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Convert JSON array to CSV matrix.
     */
    private static toCSV(rows: any[]): string {
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
    }

    /**
     * Export tournament data for administrative offline use.
     */
    static exportTournamentJSON(tournamentId: string, data: any) {
        const name = (data.tournament?.name || tournamentId).replace(/\s+/g, '_');
        this.download(
            `${name}_LOGICAL_BACKUP_${Date.now()}.json`,
            JSON.stringify(data, null, 2)
        );
    }

    /**
     * Export match results in CSV protocol.
     */
    static exportMatchesCSV(tournamentName: string, matches: any[]) {
        const name = tournamentName.replace(/\s+/g, '_');
        const rows = matches.map(m => ({
            MatchId: m.id,
            Court: m.court || '',
            EntityA: m.player1_name || '',
            EntityB: m.player2_name || '',
            Result: `${m.score_player1}-${m.score_player2}`,
            Status: m.status
        }));
        this.download(
            `${name}_MATCH_MATRIX_${Date.now()}.csv`,
            this.toCSV(rows),
            'text/csv'
        );
    }
}
