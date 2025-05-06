"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const connect_sqlite3_1 = __importDefault(require("connect-sqlite3"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const initDb_1 = require("./initDb");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const voteRoutes_1 = __importDefault(require("./routes/voteRoutes"));
const resultsRoutes_1 = __importDefault(require("./routes/resultsRoutes"));
// Load environment variables
dotenv_1.default.config();
// Debug log environment variables
console.log('Environment variables loaded:', {
    GANACHE_RPC_URL: process.env.GANACHE_RPC_URL,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    SIGNER_PRIVATE_KEY_EXISTS: !!process.env.SIGNER_PRIVATE_KEY
});
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Initialize database
(0, database_1.initializeDatabase)();
(0, initDb_1.initializeSampleData)();
// Create SQLiteStore instance
const SQLiteStoreInstance = (0, connect_sqlite3_1.default)(express_session_1.default);
// Middleware
app.use((0, cors_1.default)({
    origin: true, // Allow all origins in development
    credentials: true // Allow credentials (cookies, authorization headers, etc)
}));
app.use(express_1.default.json());
// Session configuration
app.use((0, express_session_1.default)({
    store: new SQLiteStoreInstance({
        db: 'voting_app.db',
        table: 'sessions',
        dir: '.',
    }),
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/vote', voteRoutes_1.default);
app.use('/api/results', resultsRoutes_1.default);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
