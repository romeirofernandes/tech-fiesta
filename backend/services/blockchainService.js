/**
 * Blockchain Service — interact with VaccinationRecord smart contract on Polygon Amoy.
 *
 * Required .env variables:
 *   POLYGON_RPC_URL          – RPC endpoint (default: Amoy public RPC)
 *   BLOCKCHAIN_PRIVATE_KEY   – Backend wallet private key (holds testnet POL for gas)
 *   VACCINATION_CONTRACT_ADDRESS – Deployed contract address
 */
const { ethers } = require('ethers');

// Minimal ABI — only the functions we call
const CONTRACT_ABI = [
  'function addRecord(string _rfid, string _farmerId, string _farmerName, string _vaccineName, string _certificateUrl) external returns (uint256 recordId)',
  'function records(uint256) view returns (string rfid, string farmerId, string farmerName, string vaccineName, string certificateUrl, uint256 timestamp)',
  'function totalRecords() view returns (uint256)',
  'function getRecordsByRfid(string _rfid) view returns (uint256[])',
  'function getRecordsByFarmer(string _farmerId) view returns (uint256[])',
  'event RecordAdded(uint256 indexed recordId, string rfid, string farmerId, string vaccineName, uint256 timestamp)',
];

let _provider = null;
let _wallet = null;
let _contract = null;

function _ensureInitialized() {
  if (_contract) return;

  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const contractAddress = process.env.VACCINATION_CONTRACT_ADDRESS;

  if (!privateKey) throw new Error('BLOCKCHAIN_PRIVATE_KEY not set in .env');
  if (!contractAddress) throw new Error('VACCINATION_CONTRACT_ADDRESS not set in .env');

  _provider = new ethers.JsonRpcProvider(rpcUrl);
  _wallet = new ethers.Wallet(privateKey, _provider);
  _contract = new ethers.Contract(contractAddress, CONTRACT_ABI, _wallet);

  console.log(`[Blockchain] Connected to ${rpcUrl}`);
  console.log(`[Blockchain] Wallet: ${_wallet.address}`);
  console.log(`[Blockchain] Contract: ${contractAddress}`);
}

/**
 * Write a vaccination record on-chain.
 * @returns {{ txHash: string, recordId: number, blockNumber: number, explorerUrl: string }}
 */
async function addVaccinationRecord({ rfid, farmerId, farmerName, vaccineName, certificateUrl }) {
  _ensureInitialized();

  console.log(`[Blockchain] Submitting record for animal ${rfid}...`);

  const tx = await _contract.addRecord(rfid, farmerId, farmerName, vaccineName, certificateUrl);
  console.log(`[Blockchain] Tx sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`[Blockchain] Confirmed in block ${receipt.blockNumber}`);

  // Parse the RecordAdded event to get the recordId
  let recordId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = _contract.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'RecordAdded') {
        recordId = Number(parsed.args.recordId);
        break;
      }
    } catch (_) {
      // skip logs from other contracts
    }
  }

  // Only generate a real explorer URL when connected to Amoy testnet
  const rpcUrl = process.env.POLYGON_RPC_URL || '';
  const isAmoy = rpcUrl.includes('polygon') || rpcUrl.includes('amoy');
  const explorerUrl = isAmoy
    ? `https://amoy.polygonscan.com/tx/${tx.hash}`
    : null;

  return {
    txHash: tx.hash,
    recordId,
    blockNumber: receipt.blockNumber,
    explorerUrl,
    network: isAmoy ? 'polygon-amoy' : 'localhost',
  };
}

/**
 * Read a specific record by its on-chain ID.
 */
async function getRecord(recordId) {
  _ensureInitialized();

  const r = await _contract.records(recordId);
  return {
    rfid: r.rfid,
    farmerId: r.farmerId,
    farmerName: r.farmerName,
    vaccineName: r.vaccineName,
    certificateUrl: r.certificateUrl,
    timestamp: Number(r.timestamp),
  };
}

/**
 * Get all on-chain records for an animal RFID.
 */
async function getRecordsByRfid(rfid) {
  _ensureInitialized();

  const ids = await _contract.getRecordsByRfid(rfid);
  const results = [];
  for (const id of ids) {
    results.push({ recordId: Number(id), ...(await getRecord(Number(id))) });
  }
  return results;
}

/**
 * Get all records with pagination (reads directly from chain).
 * @param {number} page - 1-based page number
 * @param {number} limit - records per page
 * @returns {{ records: Array, total: number, page: number, totalPages: number }}
 */
async function getAllRecordsPaginated(page = 1, limit = 10) {
  _ensureInitialized();

  const total = Number(await _contract.totalRecords());
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Records are 0-indexed on-chain; show newest first
  const startIdx = Math.max(total - safePage * limit, 0);
  const endIdx = total - (safePage - 1) * limit;

  const results = [];
  for (let i = endIdx - 1; i >= startIdx; i--) {
    const r = await _contract.records(i);
    results.push({
      recordId: i,
      rfid: r.rfid,
      farmerId: r.farmerId,
      farmerName: r.farmerName,
      vaccineName: r.vaccineName,
      certificateUrl: r.certificateUrl,
      timestamp: Number(r.timestamp),
    });
  }

  return { records: results, total, page: safePage, totalPages };
}

/**
 * Get the wallet address and balance (for diagnostics / setup check).
 */
async function getWalletInfo() {
  _ensureInitialized();

  const balance = await _provider.getBalance(_wallet.address);
  return {
    address: _wallet.address,
    balancePOL: ethers.formatEther(balance),
  };
}

module.exports = {
  addVaccinationRecord,
  getRecord,
  getRecordsByRfid,
  getAllRecordsPaginated,
  getWalletInfo,
};
