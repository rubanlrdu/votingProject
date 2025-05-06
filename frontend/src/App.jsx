import { useState } from 'react'

function App() {
  const [votingItems, setVotingItems] = useState([
    { id: 'item1', name: 'Option A' },
    { id: 'item2', name: 'Option B' },
    { id: 'item3', name: 'Option C' }
  ]);

  const [scores, setScores] = useState({
    item1: 5,
    item2: 5,
    item3: 5
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleScoreChange = (itemId, value) => {
    setScores(prevScores => ({
      ...prevScores,
      [itemId]: parseInt(value) || 0
    }));
  };

  const handleVoteSubmit = async () => {
    try {
      setIsSubmitting(true);
      setMessage({ text: '', type: '' });
      
      const response = await fetch('http://localhost:3000/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scores }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit vote');
      }

      setMessage({
        text: `Vote submitted! Tx Hash: ${data.data.transactionHash}`,
        type: 'success'
      });
    } catch (error) {
      setMessage({
        text: error.message || 'An error occurred while submitting your vote',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <h1>Voting App</h1>
      <div>
        {votingItems.map(item => (
          <div key={item.id} style={{ marginBottom: '1rem' }}>
            <h3>{item.name}</h3>
            <input
              type="number"
              min="1"
              max="10"
              value={scores[item.id]}
              onChange={(e) => handleScoreChange(item.id, e.target.value)}
              style={{ padding: '0.5rem', marginTop: '0.5rem' }}
            />
          </div>
        ))}
        <button 
          onClick={handleVoteSubmit}
          disabled={isSubmitting}
          style={{
            padding: '0.75rem 1.5rem',
            marginTop: '1rem',
            backgroundColor: isSubmitting ? '#cccccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Vote'}
        </button>
        {message.text && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            borderRadius: '4px',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default App 