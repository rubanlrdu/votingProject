import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

const db: Database = new sqlite3.Database('voting_app.db');

export const initializeDatabase = (): void => {
    db.serialize(() => {
        // Create users table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NULL,
                address TEXT NULL,
                mobile_number TEXT NULL,
                id_proof_filename TEXT NULL,
                face_descriptors TEXT NULL,
                date_of_birth TEXT NULL,
                application_status TEXT DEFAULT 'Pending',
                rejection_reason TEXT NULL,
                has_voted BOOLEAN DEFAULT FALSE,
                is_admin BOOLEAN DEFAULT FALSE
            )
        `, (err: Error | null) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table created or already exists');
                
                // Add new columns if they don't exist
                const newColumns = [
                    'full_name TEXT NULL',
                    'address TEXT NULL',
                    'mobile_number TEXT NULL',
                    'id_proof_filename TEXT NULL',
                    'face_descriptors TEXT NULL',
                    'date_of_birth TEXT NULL',
                    'application_status TEXT DEFAULT "Pending"',
                    'rejection_reason TEXT NULL'
                ];

                newColumns.forEach(column => {
                    const columnName = column.split(' ')[0];
                    db.run(`PRAGMA table_info(users)`, (err: Error | null) => {
                        if (err) {
                            console.error('Error checking table schema:', err);
                            return;
                        }

                        // Check if column exists
                        db.get(`SELECT name FROM pragma_table_info('users') WHERE name = ?`, [columnName], (err: Error | null, row: any) => {
                            if (err) {
                                console.error('Error checking column:', err);
                                return;
                            }

                            if (!row) {
                                // Column doesn't exist, add it
                                db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err: Error | null) => {
                                    if (err) {
                                        console.error(`Error adding column ${columnName}:`, err);
                                    } else {
                                        console.log(`Added column ${columnName} to users table`);
                                    }
                                });
                            }
                        });
                    });
                });
            }
        });

        // Create candidates table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                date_of_birth TEXT NULL,
                party TEXT NULL,
                image_url TEXT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating candidates table:', err);
            } else {
                console.log('Candidates table created or already exists');
                
                // Check if age column exists and replace it with date_of_birth
                db.get(`SELECT name FROM pragma_table_info('candidates') WHERE name = 'age'`, (err: Error | null, row: any) => {
                    if (err) {
                        console.error('Error checking for age column:', err);
                        return;
                    }
                    
                    if (row) {
                        // First, add date_of_birth column if it doesn't exist
                        db.get(`SELECT name FROM pragma_table_info('candidates') WHERE name = 'date_of_birth'`, (err: Error | null, dobRow: any) => {
                            if (err) {
                                console.error('Error checking for date_of_birth column:', err);
                                return;
                            }
                            
                            if (!dobRow) {
                                db.run(`ALTER TABLE candidates ADD COLUMN date_of_birth TEXT NULL`, (err: Error | null) => {
                                    if (err) {
                                        console.error('Error adding date_of_birth column:', err);
                                    } else {
                                        console.log('Added date_of_birth column to candidates table');
                                        
                                        // Due to SQLite limitations, we can't drop a column directly
                                        // To "remove" the age column, we need to:
                                        // 1. Create a new table without the age column
                                        // 2. Copy data from the old table to the new one
                                        // 3. Drop the old table
                                        // 4. Rename the new table to the original name
                                        
                                        console.log('Migrating data to remove age column...');
                                        db.run(`
                                            CREATE TABLE candidates_new (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                name TEXT NOT NULL UNIQUE,
                                                date_of_birth TEXT NULL,
                                                party TEXT NULL,
                                                image_url TEXT NULL
                                            )
                                        `, (err: Error | null) => {
                                            if (err) {
                                                console.error('Error creating new candidates table:', err);
                                                return;
                                            }
                                            
                                            // Copy data
                                            db.run(`
                                                INSERT INTO candidates_new (id, name, party, image_url)
                                                SELECT id, name, party, image_url FROM candidates
                                            `, (err: Error | null) => {
                                                if (err) {
                                                    console.error('Error copying candidate data:', err);
                                                    return;
                                                }
                                                
                                                // Drop old table
                                                db.run('DROP TABLE candidates', (err: Error | null) => {
                                                    if (err) {
                                                        console.error('Error dropping old candidates table:', err);
                                                        return;
                                                    }
                                                    
                                                    // Rename new table
                                                    db.run('ALTER TABLE candidates_new RENAME TO candidates', (err: Error | null) => {
                                                        if (err) {
                                                            console.error('Error renaming new candidates table:', err);
                                                        } else {
                                                            console.log('Successfully migrated candidates table, removing age column');
                                                        }
                                                    });
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        // Create votes table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (candidate_id) REFERENCES candidates(id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating votes table:', err);
            } else {
                console.log('Votes table created or already exists');
            }
        });

        // Create election_state table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS election_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                results_published BOOLEAN DEFAULT FALSE
            )
        `, (err) => {
            if (err) {
                console.error('Error creating election_state table:', err);
            } else {
                console.log('Election state table created or already exists');
                // Initialize with a single row if not exists
                db.run(`INSERT OR IGNORE INTO election_state (id, results_published) VALUES (1, FALSE)`, (err) => {
                    if (err) {
                        console.error('Error initializing election_state:', err);
                    } else {
                        console.log('Election state initialized');
                    }
                });
            }
        });
    });
};

export { db }; 