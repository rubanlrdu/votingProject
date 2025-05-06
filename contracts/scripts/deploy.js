const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const SimpleVoteRecorder = await hre.ethers.getContractFactory("SimpleVoteRecorder");
  
  // Deploy the contract
  console.log("Deploying SimpleVoteRecorder...");
  const voteRecorder = await SimpleVoteRecorder.deploy();
  
  // Wait for deployment to complete
  await voteRecorder.waitForDeployment();
  
  // Get the deployed contract address
  const address = await voteRecorder.getAddress();
  console.log("SimpleVoteRecorder deployed to:", address);
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 