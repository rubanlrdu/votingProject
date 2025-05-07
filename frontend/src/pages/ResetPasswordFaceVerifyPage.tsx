// @ts-ignore
import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FaceVerification from '../components/FaceVerification';

const ResetPasswordFaceVerifyPage: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Retrieve username from route parameters or navigation state
    const searchParams = new URLSearchParams(location.search);
    const username = searchParams.get('username');

    if (!username) {
        return <div>Error: Username not provided.</div>;
    }

    const handleVerificationSuccess = () => {
        // Navigate to new password page with username
        navigate(`/reset-password/new-password?username=${encodeURIComponent(username)}`);
    };

    const handleVerificationFail = () => {
        setError('Face verification failed. Please try again.');
    };

    return (
        <div>
            <h1>Reset Password - Face Verification</h1>
            <p>Please look at the camera for face verification.</p>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <FaceVerification
                userId={username} // FaceVerification will use this to call the verify-face endpoint
                onVerificationSuccess={handleVerificationSuccess}
                onVerificationFail={handleVerificationFail}
                mode="password-reset"
            />
            <button onClick={() => navigate('/forgot-password')}>
                Back to Forgot Password
            </button>
        </div>
    );
};

export default ResetPasswordFaceVerifyPage; 