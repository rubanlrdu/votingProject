// @ts-ignore
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ResetPasswordNewPasswordPage.module.css';

const ResetPasswordNewPasswordPage: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Get username and resetToken from URL parameters
    const searchParams = new URLSearchParams(location.search);
    const username = searchParams.get('username');
    const resetToken = searchParams.get('resetToken');

    // Redirect if no username
    useEffect(() => {
        if (!username) {
            navigate('/forgot-password');
        }
    }, [username, navigate]);

    // Password validation
    const validatePassword = (password: string): { isValid: boolean; error?: string } => {
        if (password.length < 8) {
            return { isValid: false, error: 'Password must be at least 8 characters long' };
        }
        // Add more validation rules as needed (e.g., require numbers, special characters, etc.)
        return { isValid: true };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // Validate password complexity
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            setError(validation.error || 'Invalid password');
            setLoading(false);
            return;
        }

        try {
            // Call reset endpoint
            const response = await axios.post('/api/auth/forgot-password/reset', {
                username,
                newPassword,
                resetToken // Include token if available
            });

            if (response.data.message) {
                setSuccess(true);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    navigate('/login', { 
                        state: { message: 'Password has been reset successfully. Please log in with your new password.' }
                    });
                }, 2000);
            }
        } catch (err) {
            setError('Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!username) {
        return null; // Will redirect via useEffect
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.description}>Please enter your new password below.</p>

            {success ? (
                <div className={styles.success}>
                    Password reset successful! Redirecting to login...
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword" className={styles.label}>New Password:</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="Enter new password"
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="Confirm new password"
                            className={styles.input}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.buttonGroup}>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`${styles.button} ${styles.submitButton}`}
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => navigate('/login')}
                            className={`${styles.button} ${styles.cancelButton}`}
                        >
                            Cancel
                        </button>
                    </div>

                    <div className={styles.requirements}>
                        <p className={styles.requirementsTitle}>Password requirements:</p>
                        <ul className={styles.requirementsList}>
                            <li>At least 8 characters long</li>
                            <li>Must contain at least one uppercase letter</li>
                            <li>Must contain at least one number</li>
                            <li>Must contain at least one special character</li>
                        </ul>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ResetPasswordNewPasswordPage; 