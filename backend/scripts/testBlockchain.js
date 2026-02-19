/**
 * Quick test script for the blockchain vaccination record flow.
 * Run: node scripts/testBlockchain.js
 */
require('dotenv').config();
const bc = require('../services/blockchainService');

async function main() {
  console.log('=== STEP 1: Check wallet ===');
  const info = await bc.getWalletInfo();
  console.log('Wallet:', info.address);
  console.log('Balance:', info.balancePOL, 'ETH (fake/free — no real money)');
  console.log('');

  console.log('=== STEP 2: Write vaccination record to blockchain ===');
  const result = await bc.addVaccinationRecord({
    rfid: 'RFID-COW-42',
    farmerId: '507f1f77bcf86cd799439011',
    farmerName: 'Rajesh Kumar',
    vaccineName: 'FMD Vaccine',
    certificateUrl: 'https://res.cloudinary.com/dxrb00q4u/image/upload/v1/vaccination-certificates/test.jpg',
  });
  console.log('Transaction Hash:', result.txHash);
  console.log('Block Number:', result.blockNumber);
  console.log('Record ID:', result.recordId);
  console.log('Explorer URL:', result.explorerUrl);
  console.log('');

  console.log('=== STEP 3: Read it back from blockchain (IMMUTABLE) ===');
  const record = await bc.getRecord(result.recordId);
  console.log('RFID:', record.rfid);
  console.log('Farmer:', record.farmerName, '(' + record.farmerId + ')');
  console.log('Vaccine:', record.vaccineName);
  console.log('Certificate:', record.certificateUrl);
  console.log('Timestamp:', new Date(record.timestamp * 1000).toISOString());
  console.log('');

  console.log('=== STEP 4: Query all records for this animal ===');
  const allRecords = await bc.getRecordsByRfid('RFID-COW-42');
  console.log('Total records for RFID-COW-42:', allRecords.length);
  console.log('');

  console.log('SUCCESS! Record is now immutable on the blockchain.');
  console.log('Nobody can modify or delete it. Government/auditor can verify anytime.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
