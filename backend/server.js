require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const port = process.env.PORT || 3000;

// In-memory Set to store usernames of users who have already voted
const usersWhoVoted = new Set();

// In-memory store for votes
const voteStore = {
  item1: { totalScore: 0, voteCount: 0 },
  item2: { totalScore: 0, voteCount: 0 },
  item3: { totalScore: 0, voteCount: 0 }
};

// In-memory user database
const users = {
  'alice': 'password123',
  'bob': 'securepass',
  'charlie': 'vote4me'
};

// Contract ABI
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "VoteRecorded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "recordVoteTransaction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Middleware
app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Vote Recording API is running!' });
});

// Results endpoint
app.get('/api/results', (req, res) => {
  try {
    const results = {};
    
    // Calculate averages and format response
    for (const [itemId, data] of Object.entries(voteStore)) {
      results[itemId] = {
        ...data,
        averageScore: data.voteCount > 0 
          ? parseFloat((data.totalScore / data.voteCount).toFixed(2))
          : 0
      };
    }
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
});

// Vote endpoint
app.post('/api/vote', async (req, res) => {
  try {
    const { scores, username } = req.body;

    // Check if the user has already voted
    if (usersWhoVoted.has(username)) {
      return res.status(403).json({ success: false, message: 'User has already voted' });
    }

    // Update vote store
    for (const [itemId, score] of Object.entries(scores)) {
      if (voteStore[itemId]) {
        voteStore[itemId].totalScore += score;
        voteStore[itemId].voteCount += 1;
      }
    }

    // Create ethers provider
    const provider = new ethers.JsonRpcProvider(process.env.GANACHE_RPC_URL);

    // Create wallet from private key and connect to provider
    const wallet = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY, provider);

    // Create contract instance
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      wallet
    );

    // Log the contract and wallet info
    console.log('Wallet address:', wallet.address);
    console.log('Contract address:', contract.target);
    console.log('Connected to network:', await provider.getNetwork());
    console.log('Received vote with scores:', scores);

    // Call the recordVoteTransaction function
    console.log('Recording vote transaction...');
    const tx = await contract.recordVoteTransaction();
    console.log('Transaction sent:', tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction mined:', receipt.hash);

    // Add user to the set of users who have voted
    usersWhoVoted.add(username);

    res.status(200).json({ 
      success: true, 
      message: 'Vote recorded successfully',
      data: { 
        scores,
        walletAddress: wallet.address,
        contractAddress: contract.target,
        transactionHash: receipt.hash
      }
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing vote',
      error: error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Check if the username exists and the password matches
  if (users[username] && users[username] === password) {
    res.json({ success: true, username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Connected to Ganache at: ${process.env.GANACHE_RPC_URL}`);
  console.log(`Contract address: ${process.env.CONTRACT_ADDRESS}`);
}); 