"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../database");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Set up ID proof upload directory
const ID_PROOF_UPLOAD_DIR = path_1.default.join(__dirname, '..', '..', 'uploads', 'id_proofs');
// Ensure upload directory exists
if (!fs_1.default.existsSync(ID_PROOF_UPLOAD_DIR)) {
    fs_1.default.mkdirSync(ID_PROOF_UPLOAD_DIR, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, ID_PROOF_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename: e.g., timestamp + originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Create multer upload instance with file filter for images
const uploadIdProof = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf/; // Allow PDF too
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
}).single('idProof'); // 'idProof' must match the field name in FormData
// Validation helper functions
const validateMobileNumber = (mobile) => {
    // Basic validation: 10 digits, optionally with country code
    const mobileRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return mobileRegex.test(mobile);
};
const validateAddress = (address) => {
    // Basic validation: non-empty, reasonable length
    return address.length >= 5 && address.length <= 200;
};
const validateFullName = (name) => {
    // Basic validation: non-empty, reasonable length, only letters and spaces
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name);
};
// Helper function to validate date format (YYYY-MM-DD)
const isValidDateFormat = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString))
        return false;
    const date = new Date(dateString);
    const isValid = date instanceof Date && !isNaN(date.getTime());
    if (!isValid)
        return false;
    // Additional validation (e.g., must be at least 18 years old)
    const today = new Date();
    const birthDate = new Date(dateString);
    const age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    // If birth month is after current month or 
    // birth month is current month but birth day is after current day,
    // then subtract 1 from age
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
    }
    return age >= 18;
};
router.post('/register', (req, res) => {
    uploadIdProof(req, res, async (err) => {
        if (err instanceof multer_1.default.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ message: "File upload error: " + err.message });
        }
        else if (err) {
            // An unknown error occurred when uploading.
            return res.status(500).json({ message: "Unknown file upload error: " + err.message });
        }
        // File upload was successful (or no file was provided, which is fine if optional)
        const { username, password, isAdmin, full_name, address, mobile_number, date_of_birth } = req.body;
        const idProofFile = req.file; // Contains file info if uploaded
        console.log('Registration attempt:', {
            username,
            isAdmin,
            full_name,
            address,
            mobile_number,
            date_of_birth,
            id_proof_filename: idProofFile ? idProofFile.filename : null
        });
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        // Validate new fields
        if (full_name && !validateFullName(full_name)) {
            return res.status(400).json({ error: 'Invalid full name format' });
        }
        if (address && !validateAddress(address)) {
            return res.status(400).json({ error: 'Invalid address format' });
        }
        if (mobile_number && !validateMobileNumber(mobile_number)) {
            return res.status(400).json({ error: 'Invalid mobile number format' });
        }
        if (date_of_birth && !isValidDateFormat(date_of_birth)) {
            return res.status(400).json({ error: 'Invalid date of birth format (should be YYYY-MM-DD) or user must be at least 18 years old' });
        }
        try {
            // Check if username exists
            database_1.db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (row) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                try {
                    // Hash password
                    const saltRounds = 10;
                    const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
                    // Convert isAdmin to integer (0 or 1)
                    const isAdminInt = isAdmin ? 1 : 0;
                    console.log('Inserting user with isAdmin:', isAdminInt);
                    // Insert new user with additional fields
                    database_1.db.run(`INSERT INTO users (
                            username, 
                            password_hash, 
                            full_name,
                            address,
                            mobile_number,
                            date_of_birth,
                            id_proof_filename,
                            application_status,
                            has_voted, 
                            is_admin
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?)`, [
                        username,
                        passwordHash,
                        full_name || null,
                        address || null,
                        mobile_number || null,
                        date_of_birth || null,
                        idProofFile ? idProofFile.filename : null,
                        isAdminInt
                    ], function (err) {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        console.log('User registered successfully:', {
                            username,
                            isAdmin: isAdminInt,
                            full_name,
                            date_of_birth,
                            application_status: 'Pending'
                        });
                        res.status(201).json({
                            message: 'User registered successfully',
                            userId: this.lastID,
                            application_status: 'Pending'
                        });
                    });
                }
                catch (hashError) {
                    console.error('Password hashing error:', hashError);
                    return res.status(500).json({ error: 'Internal server error' });
                }
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt for user:', username);
    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
        // Find user by username
        database_1.db.get(`SELECT id, username, password_hash, is_admin, application_status, has_voted 
             FROM users WHERE username = ?`, [username], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!user) {
                console.log('Login failed - User not found:', username);
                return res.status(401).json({ error: 'Invalid username or password' });
            }
            console.log('User found:', { id: user.id, username: user.username, is_admin: user.is_admin });
            try {
                // Compare passwords
                const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
                if (!passwordMatch) {
                    console.log('Login failed - Invalid password for user:', username);
                    return res.status(401).json({ error: 'Invalid username or password' });
                }
                // Regenerate session
                req.session.regenerate((err) => {
                    if (err) {
                        console.error('Session regeneration error:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    // Store user info in session
                    const userSession = {
                        id: user.id,
                        username: user.username,
                        isAdmin: user.is_admin === 1, // Explicitly check for 1 since SQLite stores booleans as integers
                        application_status: user.application_status,
                        has_voted: user.has_voted === 1
                    };
                    console.log('Setting session user:', userSession);
                    req.session.user = userSession;
                    // Send success response
                    res.json(userSession);
                });
            }
            catch (compareError) {
                console.error('Password comparison error:', compareError);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});
router.get('/session', (req, res) => {
    console.log('Session route - Session data:', req.session);
    if (req.session.user) {
        console.log('Session route - User data:', req.session.user);
        // Ensure we return complete user data from session
        const userData = {
            ...req.session.user,
            // If application_status is not already in session, default to checking in DB
            // But this should be there after our login modification
        };
        res.json({ user: userData });
    }
    else {
        console.log('Session route - No user in session');
        res.status(401).json({ user: null });
    }
});
// Get current logged-in user's full profile data
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.user.id;
    database_1.db.get(`SELECT id, username, full_name, address, mobile_number, date_of_birth,
         id_proof_filename, face_descriptors, application_status, 
         rejection_reason, has_voted, is_admin 
         FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Convert is_admin to boolean for consistency
        const userData = {
            ...user,
            is_admin: user.is_admin === 1,
            isAdmin: user.is_admin === 1,
            has_voted: user.has_voted === 1
        };
        // Remove password hash for security
        delete userData.password_hash;
        res.json(userData);
    });
});
// Face recognition enrollment endpoint
router.post('/enroll-face', (req, res) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.user.id;
    const { faceDescriptor } = req.body;
    // Validate descriptor is an array of numbers
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
        return res.status(400).json({ error: 'Invalid face descriptor format. Expected non-empty array.' });
    }
    // Check that all elements are numbers
    const allNumbers = faceDescriptor.every(item => typeof item === 'number' && !isNaN(item));
    if (!allNumbers) {
        return res.status(400).json({ error: 'Invalid face descriptor. All elements must be numbers.' });
    }
    try {
        // Convert descriptor to JSON string
        const descriptorJson = JSON.stringify(faceDescriptor);
        // Update user record with face descriptor
        database_1.db.run('UPDATE users SET face_descriptors = ? WHERE id = ?', [descriptorJson, userId], function (err) {
            if (err) {
                console.error('Database error when updating face descriptor:', err);
                return res.status(500).json({ error: 'Failed to save face descriptor' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            console.log(`Face descriptor updated for user ID: ${userId}`);
            res.status(200).json({ message: 'Face enrolled successfully' });
        });
    }
    catch (error) {
        console.error('Error enrolling face:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Check if user has face descriptor enrolled
router.get('/face-status', (req, res) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.user.id;
    database_1.db.get('SELECT face_descriptors FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error when checking face descriptor:', err);
            return res.status(500).json({ error: 'Failed to check face enrollment status' });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        const hasEnrolledFace = row.face_descriptors !== null && row.face_descriptors !== '';
        res.json({
            enrolled: hasEnrolledFace
        });
    });
});
// Face recognition verification endpoint
router.post('/verify-face', (req, res) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.user.id;
    const { faceDescriptor, liveDescriptor } = req.body;
    // Use liveDescriptor if provided, otherwise use faceDescriptor for backward compatibility
    const descriptorToVerify = liveDescriptor || faceDescriptor;
    // Validate descriptor is an array of numbers
    if (!Array.isArray(descriptorToVerify) || descriptorToVerify.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid face descriptor format. Expected non-empty array.'
        });
    }
    // Check that all elements are numbers
    const allNumbers = descriptorToVerify.every(item => typeof item === 'number' && !isNaN(item));
    if (!allNumbers) {
        return res.status(400).json({
            success: false,
            error: 'Invalid face descriptor. All elements must be numbers.'
        });
    }
    try {
        // Retrieve user's enrolled face descriptor
        database_1.db.get('SELECT face_descriptors FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) {
                console.error('Database error when retrieving face descriptor:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to verify face'
                });
            }
            if (!row) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            if (!row.face_descriptors) {
                return res.status(400).json({
                    success: false,
                    verified: false,
                    message: 'No face data has been enrolled for this user'
                });
            }
            try {
                // Parse the stored descriptor
                const storedDescriptor = JSON.parse(row.face_descriptors);
                // OPTION 1: FULL IMPLEMENTATION - Calculate Euclidean distance between the descriptors
                // Lower distances indicate better matches
                let distance = 0;
                for (let i = 0; i < descriptorToVerify.length; i++) {
                    const diff = descriptorToVerify[i] - storedDescriptor[i];
                    distance += diff * diff;
                }
                distance = Math.sqrt(distance);
                // Define threshold for verification
                // Face-api.js typically uses 0.6 as a threshold for recognition
                const threshold = 0.6;
                const verified = distance < threshold;
                console.log(`Face verification for user ${userId}: distance=${distance.toFixed(4)}, threshold=${threshold}, verified=${verified}`);
                // Return both new and old response formats for compatibility
                res.json({
                    success: verified, // New format
                    verified, // Old format
                    distance,
                    threshold,
                    message: verified ? 'Face verified successfully' : 'Face does not match enrolled data'
                });
                /* OPTION 2: SIMULATION - Uncomment this block and comment out the above code to simulate verification
                // For simulation, we just check if stored_descriptors exists, which it does if we get here
                const simulated = true;  // Always succeed for demo purposes
                console.log(`Face verification SIMULATION for user ${userId}: verified=${simulated}`);
                
                res.json({
                  success: simulated,
                  verified: simulated,
                  message: simulated ? 'Face verified successfully (SIMULATED)' : 'Face verification failed (SIMULATED)'
                });
                */
            }
            catch (parseError) {
                console.error('Error parsing stored face descriptor:', parseError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to process stored face data'
                });
            }
        });
    }
    catch (error) {
        console.error('Error verifying face:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Validate user for forgot password (facial reset)
router.post('/forgot-password/validate-user', (req, res) => {
    const { username, date_of_birth } = req.body;
    // Basic validation
    if (!username || !date_of_birth) {
        return res.status(400).json({ error: 'Username and date of birth are required.' });
    }
    // Validate date format (reuse helper if available)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date_of_birth)) {
        return res.status(400).json({ error: 'Invalid date of birth format. Use YYYY-MM-DD.' });
    }
    // Query user by username
    database_1.db.get(`SELECT id, username, date_of_birth, face_descriptors FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            // Do not reveal if user exists
            return res.status(404).json({ error: 'Invalid information or account not eligible for facial password reset.' });
        }
        // Compare date_of_birth (string compare is fine for YYYY-MM-DD)
        if (user.date_of_birth !== date_of_birth) {
            return res.status(403).json({ error: 'Invalid information or account not eligible for facial password reset.' });
        }
        // Check if face_descriptors is present and non-empty
        if (!user.face_descriptors) {
            return res.status(403).json({ error: 'Invalid information or account not eligible for facial password reset.' });
        }
        // Success: user is eligible for facial reset
        return res.json({ success: true, userId: user.id });
    });
});
// Forgot password face verification endpoint
router.post('/forgot-password/verify-face', (req, res) => {
    const { username, userId, liveDescriptor } = req.body;
    // Validate input
    if ((!username && !userId) || !Array.isArray(liveDescriptor) || liveDescriptor.length === 0) {
        return res.status(400).json({ success: false, error: 'username or userId and a non-empty liveDescriptor array are required.' });
    }
    // Build query
    let query = '';
    let param;
    if (userId) {
        query = 'SELECT id, username, face_descriptors FROM users WHERE id = ?';
        param = userId;
    }
    else {
        query = 'SELECT id, username, face_descriptors FROM users WHERE username = ?';
        param = username;
    }
    // Fetch user and stored descriptor
    database_1.db.get(query, [param], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
        if (!user || !user.face_descriptors) {
            return res.status(404).json({ success: false, error: 'User not found or no face data enrolled.' });
        }
        let storedDescriptor;
        try {
            storedDescriptor = JSON.parse(user.face_descriptors);
        }
        catch (parseError) {
            console.error('Error parsing stored face descriptor:', parseError);
            return res.status(500).json({ success: false, error: 'Failed to process stored face data' });
        }
        // Compare descriptors (Euclidean distance, threshold 0.6 as in /verify-face)
        let distance = 0;
        for (let i = 0; i < liveDescriptor.length; i++) {
            const diff = liveDescriptor[i] - storedDescriptor[i];
            distance += diff * diff;
        }
        distance = Math.sqrt(distance);
        const threshold = 0.6;
        const verified = distance < threshold;
        if (verified) {
            return res.json({ success: true, userId: user.id, username: user.username });
        }
        else {
            return res.json({ success: false });
        }
    });
});
// Forgot password reset endpoint
router.post('/forgot-password/reset', async (req, res) => {
    const { username, userId, newPassword, resetToken } = req.body;
    // Validate input
    if ((!username && !userId) || !newPassword) {
        return res.status(400).json({ error: 'username or userId and newPassword are required.' });
    }
    // Validate newPassword (e.g., minimum length)
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    // If resetToken is provided, validate it (simulated here)
    if (resetToken) {
        // Simulate token validation (replace with actual token validation logic)
        const isValidToken = true; // Replace with actual validation
        if (!isValidToken) {
            return res.status(403).json({ error: 'Invalid or expired reset token.' });
        }
    }
    // Build query to find user
    let query = '';
    let param;
    if (userId) {
        query = 'SELECT id FROM users WHERE id = ?';
        param = userId;
    }
    else {
        query = 'SELECT id FROM users WHERE username = ?';
        param = username;
    }
    // Fetch user
    database_1.db.get(query, [param], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        try {
            // Hash newPassword
            const saltRounds = 10;
            const passwordHash = await bcrypt_1.default.hash(newPassword, saltRounds);
            // Update user's password_hash
            database_1.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id], function (err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to update password.' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found.' });
                }
                // If using a reset token, invalidate it here (simulated)
                if (resetToken) {
                    // Simulate token invalidation (replace with actual logic)
                    console.log('Reset token invalidated for user:', user.id);
                }
                return res.json({ message: 'Password updated successfully.' });
            });
        }
        catch (hashError) {
            console.error('Password hashing error:', hashError);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
});
exports.default = router;
