import React, { useState, useEffect } from 'react';
import styles from './ResultsPage.module.css';

interface CandidateResult {
    id: number;
    name: string;
    totalScore: number;
    voteCount: number;
}

interface ResultsResponse {
    status: 'published' | 'pending';
    results?: CandidateResult[];
}

const ResultsPage: React.FC = () => {
    const [results, setResults] = useState<CandidateResult[] | null>(null);
    const [status, setStatus] = useState<'loading' | 'published' | 'pending'>('loading');
    const [error, setError] = useState<string>('');

    const fetchResults = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/results', {
                credentials: 'include'
            });

            if (response.status === 403) {
                setStatus('pending');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch results');
            }

            const data: ResultsResponse = await response.json();
            if (data.status === 'published' && data.results) {
                setResults(data.results);
                setStatus('published');
            } else {
                setStatus('pending');
            }
        } catch (err) {
            console.error('Error fetching results:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch results');
        }
    };

    // Fetch results initially and every 30 seconds
    useEffect(() => {
        fetchResults();
        const interval = setInterval(fetchResults, 30000);
        return () => clearInterval(interval);
    }, []);

    const renderContent = () => {
        if (error) {
            return <div className={styles.error}>{error}</div>;
        }

        if (status === 'loading') {
            return <div className={styles.loading}>Loading results...</div>;
        }

        if (status === 'pending') {
            return (
                <div className={styles.pending}>
                    <h2>Results Not Yet Published</h2>
                    <p>The election results have not been published yet. Please check back later.</p>
                    <button 
                        onClick={fetchResults}
                        className={styles.refreshButton}
                    >
                        Refresh Results
                    </button>
                </div>
            );
        }

        return (
            <div className={styles.results}>
                <h2>Election Results</h2>
                <div className={styles.resultsList}>
                    {results?.map((candidate, index) => (
                        <div key={candidate.id} className={styles.resultItem}>
                            <div className={styles.rank}>#{index + 1}</div>
                            <div className={styles.candidateInfo}>
                                <h3>{candidate.name}</h3>
                                <div className={styles.stats}>
                                    <span>Total Score: {candidate.totalScore}</span>
                                    <span>Votes: {candidate.voteCount}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={fetchResults}
                    className={styles.refreshButton}
                >
                    Refresh Results
                </button>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Election Results</h1>
            {renderContent()}
        </div>
    );
};

export default ResultsPage; 