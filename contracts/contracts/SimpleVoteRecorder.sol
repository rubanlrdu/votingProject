// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleVoteRecorder {
    // Event emitted when a vote is recorded
    event VoteRecorded(address indexed voter, uint256 timestamp);
    
    // Contract owner
    address public owner;
    
    // Constructor to set the contract owner
    constructor() {
        owner = msg.sender;
    }
    
    // Function to record a vote
    function recordVoteTransaction() public {
        emit VoteRecorded(msg.sender, block.timestamp);
    }
} 