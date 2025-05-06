import { db } from '../database';

// Update admin user status
db.run(
    'UPDATE users SET is_admin = 1 WHERE username = ?',
    ['admin'],
    function(err) {
        if (err) {
            console.error('Error updating admin user:', err);
            return;
        }
        if (this.changes === 0) {
            console.log('No user found with username: admin');
        } else {
            console.log('Successfully updated admin user status');
        }
    }
); 