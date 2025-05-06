import { db } from '../database';

const username = 'admin';

// Update user to admin
db.run(
    'UPDATE users SET is_admin = TRUE WHERE username = ?',
    [username],
    function(err) {
        if (err) {
            console.error('Error updating user:', err);
            return;
        }
        if (this.changes === 0) {
            console.log('No user found with username:', username);
        } else {
            console.log('Successfully made user an admin:', username);
        }
    }
); 