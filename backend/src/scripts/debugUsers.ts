import { db } from '../database';

// Define the user record type
interface UserRecord {
    id: number;
    username: string;
    password_hash: string;
    full_name: string | null;
    address: string | null;
    mobile_number: string | null;
    id_proof_filename: string | null;
    face_descriptors: string | null;
    date_of_birth: string | null;
    application_status: string;
    rejection_reason: string | null;
    has_voted: number;
    is_admin: number;
}

// Initialize database connection
console.log('Connecting to database...');

// Query all users
db.all<UserRecord>('SELECT * FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error querying users:', err);
        process.exit(1);
    }

    console.log('Total users found:', rows.length);
    console.log('User records:');
    
    rows.forEach((row, index) => {
        console.log(`User ${index + 1}:`);
        console.log('  ID:', row.id);
        console.log('  Username:', row.username);
        console.log('  Full Name:', row.full_name);
        console.log('  Date of Birth:', row.date_of_birth);
        console.log('  Address:', row.address);
        console.log('  Mobile Number:', row.mobile_number);
        console.log('  Application Status:', row.application_status);
        console.log('  Has Face Descriptors:', !!row.face_descriptors);
        console.log('  Is Admin:', !!row.is_admin);
        console.log('-----------------------------------');
    });

    process.exit(0);
}); 