"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const blockchain_1 = require("../blockchain");
const router = express_1.default.Router();
// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
// Get user voting status
router.get('/user/status', requireAuth, async (req, res) => {
    try {
        const user = await new Promise((resolve, reject) => {
            var _a;
            database_1.db.get('SELECT has_voted FROM users WHERE id = ?', [(_a = req.session.user) === null || _a === void 0 ? void 0 : _a.id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
        res.json({ has_voted: user.has_voted });
    }
    catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
});
// Get all candidates
router.get('/candidates', async (req, res) => {
    try {
        const candidates = await new Promise((resolve, reject) => {
            database_1.db.all('SELECT id, name, date_of_birth, party, image_url FROM candidates', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        res.json(candidates);
    }
    catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});
// Submit votes
router.post('/vote', requireAuth, async (req, res) => {
    var _a;
    console.log('Vote submission request:', {
        session: req.session,
        cookies: req.cookies,
        headers: req.headers
    });
    const { scores } = req.body;
    console.log('Received vote submission:', {
        scores,
        userId: (_a = req.session.user) === null || _a === void 0 ? void 0 : _a.id,
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
        const user = await new Promise((resolve, reject) => {
            database_1.db.get('SELECT has_voted FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    console.error('Database error checking user status:', err);
                    reject(err);
                }
                else {
                    console.log('User status:', row);
                    resolve(row);
                }
            });
        });
        if (user.has_voted) {
            console.log('User has already voted:', userId);
            return res.status(403).json({ error: 'User has already voted' });
        }
        // Start transaction
        await new Promise((resolve, reject) => {
            database_1.db.run('BEGIN TRANSACTION', (err) => {
                if (err)
                    reject(err);
                else
                    resolve(null);
            });
        });
        try {
            // Insert votes
            for (const [candidateId, score] of Object.entries(scores)) {
                await new Promise((resolve, reject) => {
                    database_1.db.run('INSERT INTO votes (user_id, candidate_id, score) VALUES (?, ?, ?)', [userId, parseInt(candidateId), score], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve(null);
                    });
                });
            }
            // Mark user as voted
            await new Promise((resolve, reject) => {
                database_1.db.run('UPDATE users SET has_voted = TRUE WHERE id = ?', [userId], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(null);
                });
            });
            // Commit transaction
            await new Promise((resolve, reject) => {
                database_1.db.run('COMMIT', (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(null);
                });
            });
            // Create vote summary for blockchain
            const voteSummary = JSON.stringify(scores);
            const candidateId = parseInt(Object.keys(scores)[0]); // Get the first candidate ID
            // Send to blockchain and wait for confirmation
            const transactionHash = await (0, blockchain_1.sendVoteTransaction)(userId, candidateId);
            console.log('Blockchain transaction successful:', transactionHash);
            res.json({
                message: 'Vote submitted successfully',
                data: {
                    transactionHash
                }
            });
        }
        catch (error) {
            // Rollback transaction on error
            await new Promise((resolve) => {
                database_1.db.run('ROLLBACK', () => resolve(null));
            });
            throw error;
        }
    }
    catch (error) {
        console.error('Error submitting vote:', error);
        // Send more detailed error message
        res.status(500).json({
            error: 'Failed to submit vote',
            details: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});
exports.default = router;
