import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Database connection
const dbPath = path.resolve(__dirname, '../voting_app.db');
const db = new sqlite3.Database(dbPath);

// Admin credentials from environment variables
const adminUsername = process.env.INITIAL_ADMIN_USER || 'admin';
const adminPassword = process.env.INITIAL_ADMIN_PASS || 'adminpassword';
const adminFullName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

async function createAdmin() {
  console.log('Starting admin user creation process...');
  
  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Check if admin already exists
    db.get('SELECT id FROM users WHERE username = ?', [adminUsername], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        closeConnection(1);
        return;
      }
      
      if (row) {
        console.log(`Admin user '${adminUsername}' already exists!`);
        closeConnection(0);
        return;
      }
      
      // Insert admin user
      db.run(
        `INSERT INTO users (
          username, 
          password_hash, 
          is_admin, 
          full_name, 
          address, 
          mobile_number, 
          date_of_birth, 
          application_status, 
          has_voted
        ) VALUES (?, ?, TRUE, ?, ?, ?, ?, 'Approved', FALSE)`,
        [
          adminUsername, 
          hashedPassword, 
          adminFullName, 
          'System Address', 
          '000-000-0000', 
          '1970-01-01'
        ],
        function(err) {
          if (err) {
            console.error('Failed to create admin user:', err);
            closeConnection(1);
            return;
          }
          
          console.log(`Admin user '${adminUsername}' created successfully with ID: ${this.lastID}`);
          closeConnection(0);
        }
      );
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    closeConnection(1);
  }
}

function closeConnection(code: number) {
  db.close((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
      process.exit(1);
    }
    process.exit(code);
  });
}

// Execute the function
createAdmin(); 