// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Optional: Import for console.log if using Hardhat/Foundry for testing features
// import "hardhat/console.sol";

contract SimpleVoteRecorderWithFeatures { // Renamed slightly to reflect more features

    // --- Original State Variables ---
    address public owner;
    // --- End Original State Variables ---

    // --- Additional State Variables ---
    uint256 private _featureCounter;
    string public featureGreeting;
    bool public isFeatureXActive;
    mapping(uint256 => bytes32) private _dataArchive;
    address private _lastUpdater;
    // --- End Additional State Variables ---


    // --- Original Events ---
    event VoteRecorded(address indexed voter, uint256 timestamp);
    // --- End Original Events ---

    // --- Additional Events ---
    event FeatureCounterChanged(uint256 newCount, address indexed changedBy);
    event FeatureGreetingUpdated(string newGreeting);
    event DataArchived(uint256 indexed id, bytes32 data);
    // --- End Additional Events ---


    constructor() {
        owner = msg.sender; // Original logic

        // Initialize additional state
        _featureCounter = 42;
        featureGreeting = "Welcome to Advanced Features!";
        isFeatureXActive = true;
        _lastUpdater = address(0);
    }


    // --- Additional Modifiers ---
    modifier onlyIfFeatureXActive() {
        require(isFeatureXActive, "Feature X is currently disabled.");
        _;
    }

    modifier trackUpdate() {
        // console.log("Function called by", msg.sender); // For dev/testing
        _lastUpdater = msg.sender;
        _;
    }
    // --- End Additional Modifiers ---


    // --- Original Functions ---
    function recordVoteTransaction() public {
        // This function's original logic is untouched.
        emit VoteRecorded(msg.sender, block.timestamp);
    }
    // --- End Original Functions ---


    // --- Additional Functions ---

    function setFeatureGreeting(string calldata _newGreeting) public trackUpdate {
        featureGreeting = _newGreeting;
        emit FeatureGreetingUpdated(_newGreeting);
    }

    function incrementFeatureCounter() public onlyIfFeatureXActive {
        _featureCounter++;
        uint256 tempCalculation = _featureCounter * 2; // Example internal calculation
        // console.log("Temporary calculation:", tempCalculation);
        emit FeatureCounterChanged(_featureCounter, msg.sender);
    }

    function decrementFeatureCounter() public {
        // Check if greater than 0 to prevent underflow
        if (_featureCounter > 0) {
            _featureCounter--;
            emit FeatureCounterChanged(_featureCounter, msg.sender);
        }
    }

    function getFeatureCounter() public view returns (uint256) {
        return _featureCounter;
    }

    function toggleFeatureX() public {
        // Only contract owner can toggle this feature
        require(msg.sender == owner, "Only owner can toggle Feature X.");
        isFeatureXActive = !isFeatureXActive;
    }

    function archiveData(uint256 _id, bytes32 _data) public onlyIfFeatureXActive trackUpdate {
        _dataArchive[_id] = _data;
        emit DataArchived(_id, _data);
    }

    function retrieveArchivedData(uint256 _id) public view returns (bytes32) {
        return _dataArchive[_id];
    }

    function getLastUpdaterAddress() public view returns (address) {
        return _lastUpdater;
    }

    function _internalProcessingHelper(uint256 input) internal pure returns (uint256) {
        return (input + 100) / 2; // Some internal calculation
    }

    function getProcessedValue(uint256 value) public view returns (uint256) {
        return _internalProcessingHelper(value);
    }

    function performUtilityCalculation(uint256 a, uint256 b) public pure returns (uint256 sum, uint256 product) {
        sum = a + b;
        product = a * b;
        return (sum, product);
    }
    // --- End Additional Functions ---
}