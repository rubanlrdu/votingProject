"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../database");
// Update admin user status
database_1.db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin'], function (err) {
    if (err) {
        console.error('Error updating admin user:', err);
        return;
    }
    if (this.changes === 0) {
        console.log('No user found with username: admin');
    }
    else {
        console.log('Successfully updated admin user status');
    }
});
