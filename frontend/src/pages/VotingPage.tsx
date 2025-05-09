import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FaceVerification from '../components/FaceVerification';
import styles from './VotingPage.module.css';

interface Candidate {
    id: number;
    name: string;
    date_of_birth?: string;
    party?: string;
    image_url?: string;
}

const VotingPage: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [scores, setScores] = useState<{ [key: number]: number }>({});
    const [hasVoted, setHasVoted] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [showFaceVerification, setShowFaceVerification] = useState<boolean>(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        // Redirect if not logged in or if admin
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.isAdmin) {
            navigate('/admin');
            return;
        }

        // Fetch candidates and user status
        const fetchData = async () => {
            try {
                const [candidatesRes, statusRes] = await Promise.all([
                    fetch('http://localhost:3001/api/vote/candidates', {
                        credentials: 'include',
                    }),
                    fetch('http://localhost:3001/api/vote/user/status', {
                        credentials: 'include',
                    }),
                ]);

                if (!candidatesRes.ok || !statusRes.ok) {
                    throw new Error('Failed to fetch data');
                }

                const candidatesData = await candidatesRes.json();
                const statusData = await statusRes.json();

                setCandidates(candidatesData);
                setHasVoted(statusData.has_voted);

                // Initialize scores with default value of 5
                const initialScores: { [key: number]: number } = {};
                candidatesData.forEach((candidate: Candidate) => {
                    initialScores[candidate.id] = 5;
                });
                setScores(initialScores);
            } catch (error) {
                setError('Failed to load voting data');
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [user, navigate]);

    const handleScoreChange = (candidateId: number, value: string) => {
        const score = parseInt(value);
        if (score >= 1 && score <= 10) {
            setScores(prev => ({
                ...prev,
                [candidateId]: score,
            }));
        }
    };

    const initiateVoting = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setShowFaceVerification(true);
    };

    const handleSubmitVote = async () => {
        setIsSubmitting(true);
        setError('');
        setMessage('');

        console.log('Submitting vote with:', {
            scores,
            user,
            session: document.cookie
        });

        try {
            const response = await fetch('http://localhost:3001/api/vote/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ scores }),
            });

            console.log('Vote submission response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.status === 403) {
                setError('You have already voted');
                setHasVoted(true);
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { details: errorText };
                }
                console.error('Vote submission failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.details || 'Failed to submit vote');
            }

            const data = await response.json();
            setMessage(`Vote submitted successfully! Transaction Hash: ${data.data.transactionHash}`);
            setHasVoted(true);
        } catch (error) {
            setError('Failed to submit vote. Please try again.');
            console.error('Error submitting vote:', error);
        } finally {
            setIsSubmitting(false);
            setShowFaceVerification(false);
        }
    };

    const handleVerificationSuccess = () => {
        // When face verification succeeds, proceed to submit the vote
        handleSubmitVote();
    };

    const handleVerificationFail = () => {
        setError('Face verification failed. Unable to submit vote.');
        setIsSubmitting(false);
        setShowFaceVerification(false);
    };

    const handleCancelVerification = () => {
        setShowFaceVerification(false);
        setIsSubmitting(false);
    };

    // Calculate age from date of birth
    const calculateAge = (dateString: string | undefined): string => {
        if (!dateString) return '-';
        try {
            const birthDate = new Date(dateString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            return age.toString();
        } catch (error) {
            return '-';
        }
    };

    if (hasVoted) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Voting Status</h1>
                <div className={styles.message}>
                    You have already submitted your vote. Thank you for participating!
                </div>
                
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Vote for Candidates</h1>
            <button 
                onClick={() => navigate('/')}
                className={styles.homeButton}
            >
                Back to Home
            </button>
            
            {error && <div className={styles.error}>{error}</div>}
            {message && <div className={styles.success}>{message}</div>}

            {showFaceVerification ? (
                <div className={styles.verificationContainer}>
                    <FaceVerification 
                        userId={user?.id.toString() || ''}
                        onVerificationSuccess={handleVerificationSuccess}
                        onVerificationFail={handleVerificationFail}
                    />
                    <button 
                        onClick={handleCancelVerification}
                        className={styles.cancelButton}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <form onSubmit={initiateVoting} className={styles.form}>
                    {candidates.map(candidate => (
                        <div key={candidate.id} className={styles.candidateCard}>
                            <div className={styles.candidateInfo}>
                                {candidate.image_url && (
                                    <div className={styles.imageContainer}>
                                        <img 
                                            src={candidate.image_url} 
                                            alt={candidate.name}
                                            className={styles.candidateImage}
                                        />
                                    </div>
                                )}
                                <div className={styles.candidateDetails}>
                                    <h3 className={styles.candidateName}>{candidate.name}</h3>
                                    {candidate.party && <p className={styles.candidateParty}>Party: {candidate.party}</p>}
                                    {candidate.date_of_birth && (
                                        <p className={styles.candidateAge}>
                                            Age: {calculateAge(candidate.date_of_birth)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className={styles.scoreControl}>
                                <label className={styles.scoreLabel}>
                                    Your Score:
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={scores[candidate.id] || 5}
                                        onChange={(e) => handleScoreChange(candidate.id, e.target.value)}
                                        className={styles.input}
                                        disabled={isSubmitting}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={styles.submitButton}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default VotingPage; 