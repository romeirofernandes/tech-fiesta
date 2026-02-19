const hre = require("hardhat");

async function main() {
  console.log("Deploying VaccinationRecord contract...");

  const VaccinationRecord = await hre.ethers.getContractFactory("VaccinationRecord");
  const contract = await VaccinationRecord.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`VaccinationRecord deployed to: ${address}`);
  console.log("\n>> Add this to your backend .env file:");
  console.log(`VACCINATION_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
