import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../database';
import { Candidate } from '../types';
import path from 'path';
import fs from 'fs';

const router = Router();

// Set up ID proof upload directory
const ID_PROOF_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'id_proofs');

// Admin middleware
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};

// Apply admin middleware to all routes
router.use(isAdmin);

// ID proof file serving endpoint
router.get('/id-proof/:filename', (req, res) => {
    const { filename } = req.params;
    if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) { // Basic sanitization
        return res.status(400).send('Invalid filename.');
    }
    const filePath = path.join(ID_PROOF_UPLOAD_DIR, filename);

    // Check if file exists before attempting to send
    // fs.access is better but for simplicity:
    // res.sendFile will handle non-existent files by erroring,
    // which express default error handler will catch.
    // For production, add fs.access check.

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error sending file:", err);
            if (!res.headersSent) {
               if ((err as any).code === 'ENOENT') {
                    res.status(404).send('File not found.');
               } else {
                    res.status(500).send('Error serving file.');
               }
            }
        }
    });
});

// Helper function to validate date format (YYYY-MM-DD)
const isValidDateFormat = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
};

// Validation helper functions
const validateCandidateInput = (data: Partial<Candidate>): { isValid: boolean; error?: string } => {
    if (data.name && (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100)) {
        return { isValid: false, error: 'Name must be between 2 and 100 characters' };
    }

    if (data.date_of_birth && (typeof data.date_of_birth !== 'string' || !isValidDateFormat(data.date_of_birth))) {
        return { isValid: false, error: 'Date of birth must be a valid date in YYYY-MM-DD format' };
    }

    if (data.party && (typeof data.party !== 'string' || data.party.length > 100)) {
        return { isValid: false, error: 'Party name must be less than 100 characters' };
    }

    if (data.image_url && (typeof data.image_url !== 'string' || data.image_url.length > 500)) {
        return { isValid: false, error: 'Image URL must be less than 500 characters' };
    }

    return { isValid: true };
};

// Publish election results
router.post('/publish-results', (req, res) => {
    db.run('UPDATE election_state SET results_published = TRUE WHERE id = 1', (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ success: true, message: 'Results published successfully' });
    });
});

// Add new candidate
router.post('/candidates', (req, res) => {
    const { name, date_of_birth, party, image_url } = req.body;

    // Validate required fields
    if (!name) {
        return res.status(400).json({ error: 'Candidate name is required' });
    }

    // Validate all input fields
    const validation = validateCandidateInput({ name, date_of_birth, party, image_url });
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    // Check if candidate already exists
    db.get('SELECT id FROM candidates WHERE name = ?', [name], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (row) {
            return res.status(409).json({ error: 'Candidate already exists' });
        }

        // Insert new candidate
        db.run(
            'INSERT INTO candidates (name, date_of_birth, party, image_url) VALUES (?, ?, ?, ?)',
            [name, date_of_birth || null, party || null, image_url || null],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                res.status(201).json({
                    id: this.lastID,
                    name,
                    date_of_birth,
                    party,
                    image_url
                });
            }
        );
    });
});

// Get all candidates
router.get('/candidates', (req: Request, res: Response) => {
    db.all('SELECT id, name, date_of_birth, party, image_url FROM candidates', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json(rows);
    });
});

// Update candidate
router.put('/candidates/:id', (req, res) => {
    const candidateId = parseInt(req.params.id);
    const { name, date_of_birth, party, image_url } = req.body;

    if (isNaN(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Validate input fields
    const validation = validateCandidateInput({ name, date_of_birth, party, image_url });
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    // Check if candidate exists
    db.get('SELECT id FROM candidates WHERE id = ?', [candidateId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // If name is being updated, check for duplicates
        if (name) {
            db.get('SELECT id FROM candidates WHERE name = ? AND id != ?', [name, candidateId], (err, existing) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (existing) {
                    return res.status(409).json({ error: 'Candidate name already exists' });
                }

                updateCandidate();
            });
        } else {
            updateCandidate();
        }
    });

    function updateCandidate() {
        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (date_of_birth !== undefined) {
            updates.push('date_of_birth = ?');
            values.push(date_of_birth);
        }
        if (party !== undefined) {
            updates.push('party = ?');
            values.push(party);
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            values.push(image_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(candidateId);

        db.run(
            `UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`,
            values,
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Candidate not found' });
                }

                // Return updated candidate
                db.get('SELECT id, name, date_of_birth, party, image_url FROM candidates WHERE id = ?', [candidateId], (err, candidate) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    res.json(candidate);
                });
            }
        );
    }
});

// Delete candidate
router.delete('/candidates/:id', (req, res) => {
    const candidateId = parseInt(req.params.id);

    if (isNaN(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Check if candidate exists
    db.get('SELECT id FROM candidates WHERE id = ?', [candidateId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Delete candidate
        db.run('DELETE FROM candidates WHERE id = ?', [candidateId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(204).send();
        });
    });
});

// Get all users (voters)
router.get('/users', (req, res) => {
    db.all('SELECT id, username, has_voted, is_admin FROM users', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json(rows);
    });
});

// Get all pending user applications
router.get('/users/pending', (req, res) => {
    db.all(
        `SELECT id, username, full_name, address, mobile_number, date_of_birth, id_proof_filename, face_descriptors 
         FROM users 
         WHERE application_status = 'Pending'`, 
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.json(rows);
        }
    );
});

// Approve a user application
router.post('/users/:id/approve', (req, res) => {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user application status to 'Approved'
        db.run(
            'UPDATE users SET application_status = ?, rejection_reason = NULL WHERE id = ?',
            ['Approved', userId],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({ 
                    success: true, 
                    message: 'User application approved successfully' 
                });
            }
        );
    });
});

// Reject a user application
router.post('/users/:id/reject', (req, res) => {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user application status to 'Rejected' with optional reason
        db.run(
            'UPDATE users SET application_status = ?, rejection_reason = ? WHERE id = ?',
            ['Rejected', reason || null, userId],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({ 
                    success: true, 
                    message: 'User application rejected successfully' 
                });
            }
        );
    });
});

export default router; 