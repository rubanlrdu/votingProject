"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var database_1 = require("../database");
// Initialize database connection
console.log('Connecting to database...');
// Query all users
database_1.db.all('SELECT * FROM users', [], function (err, rows) {
    if (err) {
        console.error('Error querying users:', err);
        process.exit(1);
    }
    console.log('Total users found:', rows.length);
    console.log('User records:');
    rows.forEach(function (row, index) {
        console.log("User ".concat(index + 1, ":"));
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
