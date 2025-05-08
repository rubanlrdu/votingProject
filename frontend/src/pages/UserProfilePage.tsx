import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SimpleFaceEnrollment from '../components/SimpleFaceEnrollment';
import styles from './UserProfilePage.module.css';

interface UserProfileData {
  id: number;
  username: string;
  full_name: string | null;
  address: string | null;
  mobile_number: string | null;
  date_of_birth: string | null;
  application_status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason: string | null;
  face_descriptors: string | null;
}

const UserProfilePage: React.FC = () => {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [hasFaceDescriptor, setHasFaceDescriptor] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user profile data
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

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
  }, [user, navigate]);

  const handleEnrollmentComplete = (success: boolean) => {
    if (success) {
      setHasFaceDescriptor(true);
      setShowFaceEnrollment(false);
      // Refresh profile data
      window.location.reload();
    }
  };

  if (isLoading) {
    return <div className={styles.container}><p className={styles.loading}>Loading your profile...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  }

  if (!profileData) {
    return <div className={styles.container}><p className={styles.error}>Unable to load profile data</p></div>;
  }

  const isProfileComplete = 
    hasFaceDescriptor && 
    profileData.full_name && 
    profileData.address && 
    profileData.mobile_number && 
    profileData.date_of_birth;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Profile</h1>
      
      
      <div className={styles.profileCard}>
        <h2 className={styles.subtitle}>Account Information</h2>
        <p><strong>Username:</strong> {profileData.username}</p>
        <p><strong>Full Name:</strong> {profileData.full_name || 'Not provided'}</p>
        <p><strong>Date of Birth:</strong> {profileData.date_of_birth || 'Not provided'}</p>
        <p><strong>Address:</strong> {profileData.address || 'Not provided'}</p>
        <p><strong>Mobile Number:</strong> {profileData.mobile_number || 'Not provided'}</p>
        
        <div className={styles.statusSection}>
          <h3>Application Status: <span className={styles[profileData.application_status.toLowerCase()]}>{profileData.application_status}</span></h3>
          {profileData.rejection_reason && (
            <p className={styles.rejectionReason}>Reason: {profileData.rejection_reason}</p>
          )}
        </div>
        
        <div className={styles.faceSection}>
          <h3>Face Recognition Status</h3>
          {hasFaceDescriptor ? (
            <p className={styles.successText}>✅ Face data has been enrolled</p>
          ) : (
            <>
              <p className={styles.warningText}>⚠️ Face data has not been enrolled</p>
              <p>Enrolling your face data will help in verification during voting.</p>
              <button 
                className={styles.enrollButton}
                onClick={() => setShowFaceEnrollment(true)}
              >
                Enroll Your Face Now
              </button>
            </>
          )}
        </div>
        
        {!isProfileComplete && profileData.application_status === 'Pending' && (
          <div className={styles.completionRequirement}>
            <h3>Complete Your Profile</h3>
            <p>To be considered for approval, you must complete the following:</p>
            <ul>
              {!profileData.full_name && <li>Provide your full name</li>}
              {!profileData.date_of_birth && <li>Provide your date of birth</li>}
              {!profileData.address && <li>Provide your address</li>}
              {!profileData.mobile_number && <li>Provide your mobile number</li>}
              {!hasFaceDescriptor && <li>Enroll your face data</li>}
            </ul>
          </div>
        )}
      </div>
      
      {showFaceEnrollment && (
        <div className={styles.faceEnrollmentContainer}>
          <SimpleFaceEnrollment 
            userId={profileData.id.toString()} 
            onEnrollmentComplete={handleEnrollmentComplete} 
          />
          <button 
            className={styles.cancelButton}
            onClick={() => setShowFaceEnrollment(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage; 