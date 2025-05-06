"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSampleData = void 0;
const database_1 = require("./database");
const bcrypt_1 = __importDefault(require("bcrypt"));
const initializeSampleData = async () => {
    database_1.db.serialize(async () => {
        // Insert admin user
        const adminUsername = 'admin';
        const adminPassword = 'admin123'; // Change this to a secure password in production
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(adminPassword, saltRounds);
        // Check if admin user already exists
        database_1.db.get('SELECT id FROM users WHERE username = ?', [adminUsername], async (err, row) => {
            if (err) {
                console.error('Error checking admin user:', err);
                return;
            }
            if (!row) {
                // Insert admin user if not exists
                database_1.db.run('INSERT INTO users (username, password_hash, face_descriptors, has_voted, is_admin) VALUES (?, ?, NULL, 0, ?)', [adminUsername, passwordHash, 1], function (err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    }
                    else {
                        console.log('Admin user created successfully');
                    }
                });
            }
            else {
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
            database_1.db.get('SELECT id FROM candidates WHERE name = ?', [candidate.name], (err, row) => {
                if (err) {
                    console.error('Error checking candidate:', err);
                    return;
                }
                if (!row) {
                    // Insert candidate if not exists
                    database_1.db.run('INSERT INTO candidates (name) VALUES (?)', [candidate.name], function (err) {
                        if (err) {
                            console.error('Error inserting candidate:', err);
                        }
                        else {
                            console.log(`Candidate '${candidate.name}' created successfully`);
                        }
                    });
                }
                else {
                    console.log(`Candidate '${candidate.name}' already exists`);
                }
            });
        });
        console.log('Sample data initialization completed');
    });
};
exports.initializeSampleData = initializeSampleData;
// Run the initialization
(0, exports.initializeSampleData)();
