import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminPage.module.css';

interface Candidate {
    id: number;
    name: string;
    date_of_birth?: string;
    party?: string;
    image_url?: string;
}

interface User {
    id: number;
    username: string;
    has_voted: boolean;
    is_admin: boolean;
}

interface PendingUser {
    id: number;
    username: string;
    full_name: string | null;
    address: string | null;
    mobile_number: string | null;
    date_of_birth: string | null;
    id_proof_filename: string | null;
    face_descriptors: string | null;
}

interface NewCandidate {
    name: string;
    date_of_birth: string;
    party: string;
    image_url: string;
}

type AdminTab = 'dashboard' | 'applications';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [newCandidate, setNewCandidate] = useState<NewCandidate>({
        name: '',
        date_of_birth: '',
        party: '',
        image_url: ''
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [publishError, setPublishError] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [userToReject, setUserToReject] = useState<number | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.isAdmin) {
            navigate('/');
            return;
        }

        fetchCandidates();
        fetchUsers();
    }, [user, navigate]);

    useEffect(() => {
        if (activeTab === 'applications') {
            fetchPendingUsers();
        }
    }, [activeTab]);

    const fetchCandidates = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/admin/candidates', {
                credentials: 'include',
            });
            const data = await response.json();
            setCandidates(data);
        } catch (err) {
            console.error('Error fetching candidates:', err);
            setError('Failed to fetch candidates');
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/admin/users', {
                credentials: 'include',
            });
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchPendingUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('http://localhost:3001/api/admin/users/pending', {
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch pending applications');
            }
            
            const data = await response.json();
            setPendingUsers(data);
        } catch (err) {
            console.error('Error fetching pending applications:', err);
            setError('Failed to fetch pending applications');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePublishResults = async () => {
        setIsPublishing(true);
        setPublishError('');
        
        try {
            const response = await fetch('http://localhost:3001/api/admin/publish-results', {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to publish results');
            }

            setPublishSuccess(true);
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Failed to publish results');
            setPublishSuccess(false);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleAddCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCandidate.name.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/admin/candidates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(newCandidate),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add candidate');
            }

            setNewCandidate({
                name: '',
                date_of_birth: '',
                party: '',
                image_url: ''
            });
            fetchCandidates();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add candidate');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveUser = async (userId: number) => {
        try {
            setIsLoading(true);
            setError('');
            setSuccessMessage('');
            
            const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/approve`, {
                method: 'POST',
                credentials: 'include',
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to approve user');
            }
            
            setSuccessMessage('User approved successfully');
            fetchPendingUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve user');
        } finally {
            setIsLoading(false);
        }
    };

    const openRejectDialog = (userId: number) => {
        setUserToReject(userId);
        setRejectionReason('');
    };

    const closeRejectDialog = () => {
        setUserToReject(null);
        setRejectionReason('');
    };

    const handleRejectUser = async () => {
        if (!userToReject) return;
        
        try {
            setIsLoading(true);
            setError('');
            setSuccessMessage('');
            
            const response = await fetch(`http://localhost:3001/api/admin/users/${userToReject}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ reason: rejectionReason.trim() || null }),
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to reject user');
            }
            
            setSuccessMessage('User rejected successfully');
            fetchPendingUsers();
            closeRejectDialog();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCandidate = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this candidate?')) {
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            const response = await fetch(`http://localhost:3001/api/admin/candidates/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete candidate');
            }

            fetchCandidates();
            setSuccessMessage('Candidate deleted successfully');

            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete candidate');
        } finally {
            setIsLoading(false);
        }
    };

    // Format date of birth to DD/MM/YYYY format
    const formatDate = (dateString: string | null): string => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Admin Dashboard</h1>
            <button 
                onClick={() => navigate('/')}
                className={styles.homeButton}
            >
                Back to Home
            </button>
            
            <div className={styles.tabs}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'dashboard' ? styles.active : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'applications' ? styles.active : ''}`}
                    onClick={() => setActiveTab('applications')}
                >
                    Applications
                </button>
            </div>
            
            {activeTab === 'dashboard' && (
                <>
                    <section className={styles.section}>
                        <h2>Election Results</h2>
                        {publishError && <div className={styles.error}>{publishError}</div>}
                        {publishSuccess && (
                            <div className={styles.success}>
                                Results have been published successfully!
                            </div>
                        )}
                        <button
                            onClick={handlePublishResults}
                            disabled={isPublishing || publishSuccess}
                            className={`${styles.button} ${styles.publishButton}`}
                        >
                            {isPublishing ? 'Publishing...' : publishSuccess ? 'Results Published' : 'Publish Results'}
                        </button>
                    </section>

                    <section className={styles.section}>
                        <h2>Candidates</h2>
                        {error && <div className={styles.error}>{error}</div>}
                        {successMessage && <div className={styles.success}>{successMessage}</div>}
                        
                        <form onSubmit={handleAddCandidate} className={styles.form}>
                            <div className={styles.formGroup}>
                                <input
                                    type="text"
                                    value={newCandidate.name}
                                    onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Candidate name"
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <input
                                    type="date"
                                    value={newCandidate.date_of_birth}
                                    onChange={(e) => setNewCandidate(prev => ({ ...prev, date_of_birth: e.target.value }))}
                                    placeholder="Date of Birth"
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <input
                                    type="text"
                                    value={newCandidate.party}
                                    onChange={(e) => setNewCandidate(prev => ({ ...prev, party: e.target.value }))}
                                    placeholder="Party"
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <input
                                    type="text"
                                    value={newCandidate.image_url}
                                    onChange={(e) => setNewCandidate(prev => ({ ...prev, image_url: e.target.value }))}
                                    placeholder="Image URL"
                                    className={styles.input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={styles.button}
                            >
                                {isLoading ? 'Adding...' : 'Add Candidate'}
                            </button>
                        </form>

                        <div className={styles.candidatesTable}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Name</th>
                                        <th>Date of Birth</th>
                                        <th>Party</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map(candidate => (
                                        <tr key={candidate.id}>
                                            <td className={styles.imageCell}>
                                                {candidate.image_url ? (
                                                    <img 
                                                        src={candidate.image_url} 
                                                        alt={candidate.name}
                                                        className={styles.candidateImage}
                                                    />
                                                ) : (
                                                    <div className={styles.noImage}>No Image</div>
                                                )}
                                            </td>
                                            <td>{candidate.name}</td>
                                            <td>{candidate.date_of_birth ? formatDate(candidate.date_of_birth) : '-'}</td>
                                            <td>{candidate.party || '-'}</td>
                                            <td>
                                                <button 
                                                    className={`${styles.button} ${styles.deleteButton}`}
                                                    onClick={() => handleDeleteCandidate(candidate.id)}
                                                    disabled={isLoading}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2>Users</h2>
                        <div className={styles.usersList}>
                            {users.map(user => (
                                <div key={user.id} className={styles.userItem}>
                                    <span className={styles.username}>{user.username}</span>
                                    <span className={styles.userStatus}>
                                        {user.has_voted ? 'Voted' : 'Not Voted'}
                                        {user.is_admin && ' (Admin)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
            
            {activeTab === 'applications' && (
                <section className={styles.section}>
                    <h2>Pending User Applications</h2>
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={styles.backButton}
                    >
                        Back to Dashboard
                    </button>
                    
                    {error && <div className={styles.error}>{error}</div>}
                    {successMessage && <div className={styles.success}>{successMessage}</div>}
                    
                    {isLoading && <div className={styles.loading}>Loading applications...</div>}
                    
                    {!isLoading && pendingUsers.length === 0 ? (
                        <div className={styles.emptyMessage}>No pending applications</div>
                    ) : (
                        <div className={styles.applicationsTable}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Address</th>
                                        <th>Mobile</th>
                                        <th>Date of Birth</th>
                                        <th>ID Proof</th>
                                        <th>Face Data</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.username}</td>
                                            <td>{user.full_name || '-'}</td>
                                            <td>{user.address || '-'}</td>
                                            <td>{user.mobile_number || '-'}</td>
                                            <td>{formatDate(user.date_of_birth)}</td>
                                            <td>
                                                {user.id_proof_filename ? (
                                                    <div>
                                                        {/\.(jpe?g|png)$/i.test(user.id_proof_filename) ? (
                                                            <img
                                                                src={`http://localhost:3001/api/admin/id-proof/${user.id_proof_filename}`}
                                                                alt={`${user.username}'s ID Proof`}
                                                                style={{ maxWidth: '200px', maxHeight: '200px', display: 'block', marginTop: '5px' }}
                                                                className={styles.idProofImage}
                                                            />
                                                        ) : /\.(pdf)$/i.test(user.id_proof_filename) ? (
                                                            <a
                                                                href={`http://localhost:3001/api/admin/id-proof/${user.id_proof_filename}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={styles.pdfLink}
                                                            >
                                                                View PDF Proof
                                                            </a>
                                                        ) : (
                                                            <span>Unsupported proof format</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    'Not uploaded'
                                                )}
                                            </td>
                                            <td>{user.face_descriptors ? 'Available' : 'Not captured'}</td>
                                            <td className={styles.actionButtons}>
                                                <button 
                                                    className={`${styles.button} ${styles.approveButton}`}
                                                    onClick={() => handleApproveUser(user.id)}
                                                    disabled={isLoading}
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    className={`${styles.button} ${styles.rejectButton}`}
                                                    onClick={() => openRejectDialog(user.id)}
                                                    disabled={isLoading}
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {userToReject && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modalContent}>
                                <h3>Reject Application</h3>
                                <p>You are about to reject this user application. You may optionally provide a reason.</p>
                                <textarea
                                    className={styles.textArea}
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Reason for rejection (optional)"
                                    rows={4}
                                />
                                <div className={styles.modalButtons}>
                                    <button 
                                        className={`${styles.button} ${styles.cancelButton}`}
                                        onClick={closeRejectDialog}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className={`${styles.button} ${styles.rejectButton}`}
                                        onClick={handleRejectUser}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Rejecting...' : 'Confirm Reject'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default AdminPage; 