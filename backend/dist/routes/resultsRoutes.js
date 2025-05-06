"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    // First check if results are published
    database_1.db.get('SELECT results_published FROM election_state WHERE id = 1', (err, state) => {
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
        database_1.db.all(query, (err, results) => {
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
exports.default = router;
