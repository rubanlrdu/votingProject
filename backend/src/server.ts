import express from 'express';
import cors from 'cors';
import session from 'express-session';
import SQLiteStore from 'connect-sqlite3';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import { initializeSampleData } from './initDb';
import authRouter from './routes/authRoutes';
import adminRouter from './routes/adminRoutes';
import voteRouter from './routes/voteRoutes';
import resultsRouter from './routes/resultsRoutes';

// Load environment variables
dotenv.config();

// Debug log environment variables
console.log('Environment variables loaded:', {
    GANACHE_RPC_URL: process.env.GANACHE_RPC_URL,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    SIGNER_PRIVATE_KEY_EXISTS: !!process.env.SIGNER_PRIVATE_KEY
});

const app = express();
const port = process.env.PORT || 3001;

// Initialize database
initializeDatabase();
initializeSampleData();

// Create SQLiteStore instance
const SQLiteStoreInstance = SQLiteStore(session);

// Middleware
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true // Allow credentials (cookies, authorization headers, etc)
}));
app.use(express.json());

// Session configuration
app.use(session({
    store: new SQLiteStoreInstance({
        db: 'voting_app.db',
        table: 'sessions',
        dir: '.',
    }) as session.Store,
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use environment variable in production
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/vote', voteRouter);
app.use('/api/results', resultsRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 