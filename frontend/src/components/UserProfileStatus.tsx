import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from './UserProfileStatus.module.css';

interface UserProfileData {
    id: number;
    username: string;
    application_status: 'Pending' | 'Approved' | 'Rejected';
    rejection_reason: string | null;
    has_voted: boolean;
    is_admin: boolean;
    face_descriptors: string | null;
}

const UserProfileStatus: React.FC = () => {
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasFaceDescriptor, setHasFaceDescriptor] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const fetchUserProfile = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                const response = await fetch('http://localhost:3001/api/auth/me', {
                    credentials: 'include',
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch profile data');
                }
                
                const data = await response.json();
                setProfileData(data);
                setHasFaceDescriptor(!!data.face_descriptors);
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError('Failed to load your profile data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchUserProfile();
    }, [user]);

    if (!user || !profileData) {
        return null;
    }

    if (isLoading) {
        return <div className={styles.statusContainer}><p className={styles.loading}>Loading application status...</p></div>;
    }

    if (error) {
        return <div className={styles.statusContainer}><p className={styles.error}>{error}</p></div>;
    }

    let statusMessage = '';
    let statusClass = '';
    let additionalInfo = null;

    switch (profileData.application_status) {
        case 'Pending':
            statusMessage = 'Your application is pending review.';
            statusClass = styles.pending;
            
            // Check if face enrollment is needed
            if (!hasFaceDescriptor) {
                additionalInfo = (
                    <div className={styles.additionalInfo}>
                        <p>⚠️ Your face data is not enrolled. Complete your profile to proceed.</p>
                        <Link to="/profile" className={styles.completeProfileButton}>
                            Complete Your Profile
                        </Link>
                    </div>
                );
            }
            break;
        case 'Approved':
            statusMessage = 'Your application has been approved. You can now proceed to vote after verification.';
            statusClass = styles.approved;
            break;
        case 'Rejected':
            statusMessage = `Your application was rejected.${profileData.rejection_reason ? ` Reason: ${profileData.rejection_reason}` : ''}`;
            statusClass = styles.rejected;
            break;
        default:
            statusMessage = 'Your application status is unknown.';
            statusClass = styles.unknown;
    }

    return (
        <div className={styles.statusContainer}>
            <h3 className={styles.statusTitle}>Application Status</h3>
            <div className={`${styles.statusMessage} ${statusClass}`}>
                {statusMessage}
            </div>
            
            {additionalInfo}
            
            {profileData.application_status === 'Approved' && hasFaceDescriptor && (
                <div className={styles.actionContainer}>
                    <Link to="/vote" className={styles.voteButton}>
                        Proceed to Voting Page
                    </Link>
                </div>
            )}
        </div>
    );
};

export default UserProfileStatus; 