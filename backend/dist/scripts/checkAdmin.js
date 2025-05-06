"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../database");
// Check admin user status
database_1.db.get('SELECT id, username, is_admin FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
        console.error('Error checking admin user:', err);
        return;
    }
    if (row) {
        console.log('Admin user found:', {
            id: row.id,
            username: row.username,
            is_admin: row.is_admin,
            is_admin_type: typeof row.is_admin
        });
    }
    else {
        console.log('Admin user not found');
    }
});
