"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.initializeDatabase = void 0;
var sqlite3_1 = __importDefault(require("sqlite3"));
var db = new sqlite3_1.default.Database('voting_app.db');
exports.db = db;
var initializeDatabase = function () {
    db.serialize(function () {
        // Create users table if it doesn't exist
        db.run("\n            CREATE TABLE IF NOT EXISTS users (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                username TEXT UNIQUE NOT NULL,\n                password_hash TEXT NOT NULL,\n                full_name TEXT NULL,\n                address TEXT NULL,\n                mobile_number TEXT NULL,\n                id_proof_filename TEXT NULL,\n                face_descriptors TEXT NULL,\n                date_of_birth TEXT NULL,\n                application_status TEXT DEFAULT 'Pending',\n                rejection_reason TEXT NULL,\n                has_voted BOOLEAN DEFAULT FALSE,\n                is_admin BOOLEAN DEFAULT FALSE\n            )\n        ", function (err) {
            if (err) {
                console.error('Error creating users table:', err);
            }
            else {
                console.log('Users table created or already exists');
                // Add new columns if they don't exist
                var newColumns = [
                    'full_name TEXT NULL',
                    'address TEXT NULL',
                    'mobile_number TEXT NULL',
                    'id_proof_filename TEXT NULL',
                    'face_descriptors TEXT NULL',
                    'date_of_birth TEXT NULL',
                    'application_status TEXT DEFAULT "Pending"',
                    'rejection_reason TEXT NULL'
                ];
                newColumns.forEach(function (column) {
                    var columnName = column.split(' ')[0];
                    db.run("PRAGMA table_info(users)", function (err) {
                        if (err) {
                            console.error('Error checking table schema:', err);
                            return;
                        }
                        // Check if column exists
                        db.get("SELECT name FROM pragma_table_info('users') WHERE name = ?", [columnName], function (err, row) {
                            if (err) {
                                console.error('Error checking column:', err);
                                return;
                            }
                            if (!row) {
                                // Column doesn't exist, add it
                                db.run("ALTER TABLE users ADD COLUMN ".concat(column), function (err) {
                                    if (err) {
                                        console.error("Error adding column ".concat(columnName, ":"), err);
                                    }
                                    else {
                                        console.log("Added column ".concat(columnName, " to users table"));
                                    }
                                });
                            }
                        });
                    });
                });
            }
        });
        // Create candidates table if it doesn't exist
        db.run("\n            CREATE TABLE IF NOT EXISTS candidates (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                name TEXT NOT NULL UNIQUE,\n                date_of_birth TEXT NULL,\n                party TEXT NULL,\n                image_url TEXT NULL\n            )\n        ", function (err) {
            if (err) {
                console.error('Error creating candidates table:', err);
            }
            else {
                console.log('Candidates table created or already exists');
                // Check if age column exists and replace it with date_of_birth
                db.get("SELECT name FROM pragma_table_info('candidates') WHERE name = 'age'", function (err, row) {
                    if (err) {
                        console.error('Error checking for age column:', err);
                        return;
                    }
                    if (row) {
                        // First, add date_of_birth column if it doesn't exist
                        db.get("SELECT name FROM pragma_table_info('candidates') WHERE name = 'date_of_birth'", function (err, dobRow) {
                            if (err) {
                                console.error('Error checking for date_of_birth column:', err);
                                return;
                            }
                            if (!dobRow) {
                                db.run("ALTER TABLE candidates ADD COLUMN date_of_birth TEXT NULL", function (err) {
                                    if (err) {
                                        console.error('Error adding date_of_birth column:', err);
                                    }
                                    else {
                                        console.log('Added date_of_birth column to candidates table');
                                        // Due to SQLite limitations, we can't drop a column directly
                                        // To "remove" the age column, we need to:
                                        // 1. Create a new table without the age column
                                        // 2. Copy data from the old table to the new one
                                        // 3. Drop the old table
                                        // 4. Rename the new table to the original name
                                        console.log('Migrating data to remove age column...');
                                        db.run("\n                                            CREATE TABLE candidates_new (\n                                                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                                                name TEXT NOT NULL UNIQUE,\n                                                date_of_birth TEXT NULL,\n                                                party TEXT NULL,\n                                                image_url TEXT NULL\n                                            )\n                                        ", function (err) {
                                            if (err) {
                                                console.error('Error creating new candidates table:', err);
                                                return;
                                            }
                                            // Copy data
                                            db.run("\n                                                INSERT INTO candidates_new (id, name, party, image_url)\n                                                SELECT id, name, party, image_url FROM candidates\n                                            ", function (err) {
                                                if (err) {
                                                    console.error('Error copying candidate data:', err);
                                                    return;
                                                }
                                                // Drop old table
                                                db.run('DROP TABLE candidates', function (err) {
                                                    if (err) {
                                                        console.error('Error dropping old candidates table:', err);
                                                        return;
                                                    }
                                                    // Rename new table
                                                    db.run('ALTER TABLE candidates_new RENAME TO candidates', function (err) {
                                                        if (err) {
                                                            console.error('Error renaming new candidates table:', err);
                                                        }
                                                        else {
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
        db.run("\n            CREATE TABLE IF NOT EXISTS votes (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                user_id INTEGER NOT NULL,\n                candidate_id INTEGER NOT NULL,\n                score INTEGER NOT NULL,\n                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,\n                FOREIGN KEY (user_id) REFERENCES users(id),\n                FOREIGN KEY (candidate_id) REFERENCES candidates(id)\n            )\n        ", function (err) {
            if (err) {
                console.error('Error creating votes table:', err);
            }
            else {
                console.log('Votes table created or already exists');
            }
        });
        // Create election_state table if it doesn't exist
        db.run("\n            CREATE TABLE IF NOT EXISTS election_state (\n                id INTEGER PRIMARY KEY CHECK (id = 1),\n                results_published BOOLEAN DEFAULT FALSE\n            )\n        ", function (err) {
            if (err) {
                console.error('Error creating election_state table:', err);
            }
            else {
                console.log('Election state table created or already exists');
                // Initialize with a single row if not exists
                db.run("INSERT OR IGNORE INTO election_state (id, results_published) VALUES (1, FALSE)", function (err) {
                    if (err) {
                        console.error('Error initializing election_state:', err);
                    }
                    else {
                        console.log('Election state initialized');
                    }
                });
            }
        });
    });
};
exports.initializeDatabase = initializeDatabase;
