// @ts-ignore
import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/auth/forgot-password/validate-user', {
                username,
                date_of_birth: dateOfBirth
            });

            if (response.data.success) {
                // Navigate to face verification page with username as a route parameter
                navigate(`/reset-password/face-verify?username=${encodeURIComponent(username)}`);
            } else {
                setError('Invalid information or account not eligible for facial password reset.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1>Forgot Password</h1>
            <div className={styles.guideInfo}>
                <h3>Password Reset Procedure:</h3>
                <ol>
                    <li>Enter your username and date of birth</li>
                    <li>Complete face verification</li>
                    <li>Set your new password</li>
                </ol>
            </div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="dateOfBirth">Date of Birth:</label>
                    <input
                        type="date"
                        id="dateOfBirth"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div className={styles.buttonContainer}>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Loading...' : 'Submit'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => navigate('/login')}
                        className={styles.backButton}
                    >
                        Back to Login
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ForgotPasswordPage; 