import { db } from '../database';

interface UserRow {
    id: number;
    username: string;
    is_admin: number;
}

// Check admin user status
db.get<UserRow>(
    'SELECT id, username, is_admin FROM users WHERE username = ?',
    ['admin'],
    (err, row) => {
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
        } else {
            console.log('Admin user not found');
        }
    }
); 