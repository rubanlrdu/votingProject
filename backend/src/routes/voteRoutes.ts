import express from 'express';
import { db } from '../database';
import { sendVoteTransaction } from '../blockchain';
import { User } from '../types';

const router = express.Router();

// Middleware to check if user is logged in
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Get user voting status
router.get('/user/status', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        const user = await new Promise<User>((resolve, reject) => {
            db.get('SELECT has_voted FROM users WHERE id = ?', [req.session.user?.id], (err, row) => {
                if (err) reject(err);
                else resolve(row as User);
            });
        });
        res.json({ has_voted: user.has_voted });
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
});

// Get all candidates
router.get('/candidates', async (req: express.Request, res: express.Response) => {
    try {
        const candidates = await new Promise((resolve, reject) => {
            db.all('SELECT id, name, date_of_birth, party, image_url FROM candidates', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Submit votes
router.post('/vote', requireAuth, async (req: express.Request, res: express.Response) => {
    console.log('Vote submission request:', {
        session: req.session,
        cookies: req.cookies,
        headers: req.headers
    });

    const { scores } = req.body;
    console.log('Received vote submission:', { 
        scores, 
        userId: req.session.user?.id,
        sessionId: req.sessionID
    });

    if (!req.session.user) {
        console.log('Unauthorized: No user in session', {
            session: req.session,
            cookies: req.cookies
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user.id;

    if (!scores || typeof scores !== 'object') {
        console.log('Invalid scores format:', scores);
        return res.status(400).json({ error: 'Invalid scores format' });
    }

    try {
        // Check if user has already voted
        const user = await new Promise<User>((resolve, reject) => {
            db.get('SELECT has_voted FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    console.error('Database error checking user status:', err);
                    reject(err);
                } else {
                    console.log('User status:', row);
                    resolve(row as User);
                }
            });
        });

        if (user.has_voted) {
            console.log('User has already voted:', userId);
            return res.status(403).json({ error: 'User has already voted' });
        }

        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve(null);
            });
        });

        try {
            // Insert votes
            for (const [candidateId, score] of Object.entries(scores)) {
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO votes (user_id, candidate_id, score) VALUES (?, ?, ?)',
                        [userId, parseInt(candidateId), score],
                        (err) => {
                            if (err) reject(err);
                            else resolve(null);
                        }
                    );
                });
            }

            // Mark user as voted
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE users SET has_voted = TRUE WHERE id = ?',
                    [userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve(null);
                    }
                );
            });

            // Commit transaction
            await new Promise((resolve, reject) => {
                db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve(null);
                });
            });

            // Create vote summary for blockchain
            const voteSummary = JSON.stringify(scores);
            const candidateId = parseInt(Object.keys(scores)[0]); // Get the first candidate ID

            // Send to blockchain and wait for confirmation
            const transactionHash = await sendVoteTransaction(userId, candidateId);
            console.log('Blockchain transaction successful:', transactionHash);

            res.json({ 
                message: 'Vote submitted successfully',
                data: {
                    transactionHash
                }
            });
        } catch (error) {
            // Rollback transaction on error
            await new Promise((resolve) => {
                db.run('ROLLBACK', () => resolve(null));
            });
            throw error;
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        // Send more detailed error message
        res.status(500).json({ 
            error: 'Failed to submit vote',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

export default router; 