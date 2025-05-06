import { db } from './database';
import bcrypt from 'bcrypt';

export const initializeSampleData = async () => {
    db.serialize(async () => {
        // Insert admin user
        const adminUsername = 'admin';
        const adminPassword = 'admin123'; // Change this to a secure password in production
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        // Check if admin user already exists
        db.get('SELECT id FROM users WHERE username = ?', [adminUsername], async (err, row) => {
            if (err) {
                console.error('Error checking admin user:', err);
                return;
            }

            if (!row) {
                // Insert admin user if not exists
                db.run(
                    'INSERT INTO users (username, password_hash, face_descriptors, has_voted, is_admin) VALUES (?, ?, NULL, 0, ?)',
                    [adminUsername, passwordHash, 1],
                    function(err) {
                        if (err) {
                            console.error('Error creating admin user:', err);
                        } else {
                            console.log('Admin user created successfully');
                        }
                    }
                );
            } else {
                console.log('Admin user already exists');
            }
        });

        // Insert sample candidates
        const candidates = [
            { name: 'Candidate 1' },
            { name: 'Candidate 2' },
            { name: 'Candidate 3' }
        ];

        // Check each candidate before inserting
        candidates.forEach(candidate => {
            db.get('SELECT id FROM candidates WHERE name = ?', [candidate.name], (err, row) => {
                if (err) {
                    console.error('Error checking candidate:', err);
                    return;
                }

                if (!row) {
                    // Insert candidate if not exists
                    db.run('INSERT INTO candidates (name) VALUES (?)', [candidate.name], function(err) {
                        if (err) {
                            console.error('Error inserting candidate:', err);
                        } else {
                            console.log(`Candidate '${candidate.name}' created successfully`);
                        }
                    });
                } else {
                    console.log(`Candidate '${candidate.name}' already exists`);
                }
            });
        });

        console.log('Sample data initialization completed');
    });
};

// Run the initialization
initializeSampleData(); 