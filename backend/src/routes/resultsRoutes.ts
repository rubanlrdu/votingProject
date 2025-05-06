import { Router } from 'express';
import { db } from '../database';

const router = Router();

interface ElectionState {
    results_published: boolean;
}

interface VoteResult {
    id: number;
    name: string;
    total_score: number;
    vote_count: number;
}

router.get('/', (req, res) => {
    // First check if results are published
    db.get('SELECT results_published FROM election_state WHERE id = 1', (err, state: ElectionState) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!state || !state.results_published) {
            return res.status(403).json({ 
                error: 'Results have not been published yet',
                status: 'pending'
            });
        }

        // If results are published, calculate and return them
        const query = `
            SELECT 
                c.id,
                c.name,
                SUM(v.score) as total_score,
                COUNT(v.id) as vote_count
            FROM candidates c
            LEFT JOIN votes v ON v.candidate_id = c.id
            GROUP BY c.id
            ORDER BY total_score DESC
        `;

        db.all(query, (err, results: VoteResult[]) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.json({
                status: 'published',
                results: results.map(row => ({
                    id: row.id,
                    name: row.name,
                    totalScore: row.total_score || 0,
                    voteCount: row.vote_count || 0
                }))
            });
        });
    });
});

export default router; 