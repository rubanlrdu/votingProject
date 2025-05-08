import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import RealtimePhotoCapture from '../components/RealtimePhotoCapture';

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [address, setAddress] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [idProofFile, setIdProofFile] = useState<File | null>(null);
    const [realtimePhotoFile, setRealtimePhotoFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSuccessfulRegistration = () => {
        navigate('/login', { 
            state: { 
                message: 'Registration successful! After login, please complete your profile by enrolling your face for verification.' 
            } 
        });
    };

    const validatePassword = (pass: string) => {
        if (pass.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate password before submission
        if (!validatePassword(password)) {
            setIsLoading(false);
            return;
        }

        // Check if real-time photo is captured
        if (!realtimePhotoFile) {
            setError('Please capture a real-time photo.');
            setIsLoading(false);
            return;
        }

        try {
            // Create FormData object instead of direct JSON
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            formData.append('full_name', fullName);
            formData.append('date_of_birth', dateOfBirth);
            formData.append('address', address);
            formData.append('mobile_number', mobileNumber);
            
            // Add ID proof file if selected
            if (idProofFile) {
                formData.append('idProof', idProofFile);
            }

            // Add real-time photo file
            formData.append('realtimePhoto', realtimePhotoFile);

            const response = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                // Don't set Content-Type header when sending FormData
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Registration failed');
            }

            // Registration successful, redirect to login with message
            setMessage('Registration successful! Your application is pending review.');
            handleSuccessfulRegistration();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <h1 className={styles.title}>Register</h1>
                {error && <div className={styles.error}>{error}</div>}
                {message && <div className={styles.message}>{message}</div>}
                <div className={styles.infoMessage}>
                    <p>Registration is a two-step process:</p>
                    <ol>
                        <li>Create your account with basic information</li>
                        <li>After login, you'll need to enroll your face for verification</li>
                    </ol>
                    <p>Your application will be reviewed by an administrator once all steps are completed.</p>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Username*</label>
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
                        <label htmlFor="password">Password*</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                validatePassword(e.target.value);
                            }}
                            required
                            className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
                        />
                        {passwordError && <div className={styles.error}>{passwordError}</div>}
                        <p className={styles.helpText}>Password must be at least 8 characters long</p>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="fullName">Full Name*</label>
                        <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="Enter your legal full name"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="dateOfBirth">Date of Birth* (must be 18+)</label>
                        <input
                            type="date"
                            id="dateOfBirth"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            required
                            className={styles.input}
                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="address">Address*</label>
                        <textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className={`${styles.input} ${styles.textarea}`}
                            rows={3}
                            placeholder="Enter your complete address"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="mobileNumber">Mobile Number*</label>
                        <input
                            type="tel"
                            id="mobileNumber"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="Example: +1 5555555555"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="idProof">National ID Proof (Image or PDF)*</label>
                        <input
                            type="file"
                            id="idProof"
                            name="idProof"
                            accept=".jpg, .jpeg, .png, .pdf"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setIdProofFile(e.target.files[0]);
                                } else {
                                    setIdProofFile(null);
                                }
                            }}
                            className={styles.input}
                            required
                        />
                        {idProofFile && <p className={styles.fileDetails}>Selected file: {idProofFile.name}</p>}
                        <p className={styles.helpText}>Please upload a clear image or PDF of your National ID. Maximum file size: 5MB</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Real-time Photo*</label>
                        <RealtimePhotoCapture
                            onPhotoCaptured={(file) => {
                                setRealtimePhotoFile(file);
                            }}
                        />
                        {realtimePhotoFile && (
                            <div className={styles.photoPreview}>
                                <p>Real-time photo captured:</p>
                                <img 
                                    src={URL.createObjectURL(realtimePhotoFile)} 
                                    alt="Real-time capture preview" 
                                    style={{maxWidth: '200px', borderRadius: '4px'}} 
                                />
                            </div>
                        )}
                        <p className={styles.helpText}>Please take a clear photo of yourself for verification purposes.</p>
                    </div>

                    <p className={styles.disclaimer}>
                        Fields marked with * are required. Your personal information will be used
                        for verification purposes only. <strong>Face enrollment will be required after
                        registration</strong> to complete your profile.
                    </p>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p className={styles.loginLink}>
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className={styles.linkButton}
                    >
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage; 