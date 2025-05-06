import { ethers } from 'ethers';

export async function sendVoteTransaction(userId: number, candidateId: number): Promise<string> {
    try {
        // Debug logging
        console.log('Environment variables:', {
            GANACHE_RPC_URL: process.env.GANACHE_RPC_URL,
            CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
            SIGNER_PRIVATE_KEY_LENGTH: process.env.SIGNER_PRIVATE_KEY?.length
        });

        const privateKey = process.env.SIGNER_PRIVATE_KEY || '';
        console.log('Private key details:', {
            exists: !!privateKey,
            length: privateKey.length,
            startsWith0x: privateKey.startsWith('0x'),
            firstChars: privateKey.substring(0, 6),
            lastChars: privateKey.substring(privateKey.length - 4),
            isHex: /^0x[0-9a-fA-F]+$/.test(privateKey)
        });

        // Create ethers provider
        const provider = new ethers.JsonRpcProvider(process.env.GANACHE_RPC_URL || 'http://127.0.0.1:8545');

        // Validate private key format
        if (!privateKey) {
            throw new Error('Private key is not set in environment variables');
        }

        if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
            throw new Error('Private key must be a 32-byte hex string with 0x prefix');
        }

        // Create wallet from private key and connect to provider
        const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        console.log('Cleaned private key details:', {
            length: cleanPrivateKey.length,
            firstChars: cleanPrivateKey.substring(0, 6),
            lastChars: cleanPrivateKey.substring(cleanPrivateKey.length - 4)
        });

        const wallet = new ethers.Wallet(cleanPrivateKey, provider);
        console.log('Wallet created successfully:', {
            address: wallet.address,
            provider: provider.constructor.name
        });

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

        // Create contract instance
        const contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS || '',
            contractABI,
            wallet
        );

        // Call the recordVoteTransaction function
        console.log('Recording vote transaction...');
        const tx = await contract.recordVoteTransaction();
        console.log('Transaction sent:', tx.hash);

        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error in blockchain transaction:', error);
        throw error;
    }
} 