import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FaceVerification from '../components/FaceVerification';
import styles from './LoginPage.module.css';

interface LocationState {
  message?: string;
}

interface UserData {
  id: number;
  username: string;
  isAdmin: boolean;
  application_status: string;
  has_voted?: boolean;
}

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const { 
        login, 
        isAuthenticated, 
        logout, 
        requireFaceVerification, 
        setRequireFaceVerification,
        completeFaceVerification 
    } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for message from registration
    useEffect(() => {
        const state = location.state as LocationState;
        if (state?.message) {
            setSuccessMessage(state.message);
            // Clear the state after reading it
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    // Redirect if already logged in and face verification is not required
    useEffect(() => {
        if (isAuthenticated && !requireFaceVerification) {
            navigate('/vote');
        }
    }, [isAuthenticated, requireFaceVerification, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Check application status
            if (data.application_status === 'Approved' && !data.isAdmin) {
                // For approved non-admin users, check if face verification is required
                const profileResponse = await fetch('http://localhost:3001/api/auth/me', {
                    credentials: 'include',
                });
                
                if (!profileResponse.ok) {
                    throw new Error('Failed to fetch user profile');
                }
                
                const profileData = await profileResponse.json();
                
                if (profileData.face_descriptors) {
                    // User has face data, require verification
                    setRequireFaceVerification(true);
                    setUserData(data);
                    return;
                }
            }

            // For users who don't need face verification, proceed normally
            login(data);
            navigate('/vote');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerificationSuccess = () => {
        if (userData) {
            // Complete the login process using the new function
            completeFaceVerification(userData);
            setSuccessMessage('Face verification successful!');
            
            // Navigate to vote page immediately
            navigate('/vote');
        }
    };
    
    const handleVerificationFail = () => {
        setError('Face verification failed. Please try again or contact support.');
        setRequireFaceVerification(false);
        
        // Log the user out as a security measure
        logout();
    };

    return (
        <div className={styles.outerContainer}>
            <div className={styles.leftText}>
                <h1>
                    Vote from <br />
                    your <span className={styles.highlight}>home.</span>
                </h1>
                <p className={styles.subtitle}>
                    Self Tallying Voting Platform Integrated with Blockchain.
                </p>
            </div>
            <div className={styles.container}>
                <div className={`${styles.formContainer} ${requireFaceVerification ? styles.verificationActive : ''}`}>
                    {!requireFaceVerification ? (
                        <>
                            <h1 className={styles.title}>Login</h1>
                            
                            {error && <div className={styles.error}>{error}</div>}
                            {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
                            
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="username">Username</label>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="password">Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className={styles.input}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={styles.button}
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                                <p>
                                    <a href="/forgot-password">Forgot Password?</a>
                                </p>
                            </form>
                            <p className={styles.registerLink}>
                                Don't have an account?{' '}
                                <button
                                    onClick={() => navigate('/register')}
                                    className={styles.linkButton}
                                >
                                    Register
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className={styles.title}>Face Verification Required</h1>
                            <p className={styles.verificationMessage}>
                                Please verify your identity to complete login.
                            </p>
                            {error && <div className={styles.error}>{error}</div>}
                            {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
                            
                            <div className={styles.verificationContainer}>
                                {userData && (
                                    <FaceVerification
                                        userId={userData.id.toString()}
                                        onVerificationSuccess={handleVerificationSuccess}
                                        onVerificationFail={handleVerificationFail}
                                    />
                                )}
                            </div>
                            
                            <button
                                onClick={() => {
                                    setRequireFaceVerification(false);
                                    logout();
                                }}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage; 