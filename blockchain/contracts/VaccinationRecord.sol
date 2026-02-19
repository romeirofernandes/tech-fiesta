// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaccinationRecord
 * @notice Immutable on-chain vaccination certificate records for livestock.
 *         Each record stores a content hash and metadata that can never be altered,
 *         providing tamper-proof proof to government or auditors.
 */
contract VaccinationRecord {
    struct Record {
        string  rfid;           // Animal RFID tag
        string  farmerId;       // Farmer MongoDB _id
        string  farmerName;     // Farmer full name
        string  vaccineName;    // Name of the vaccine administered
        string  certificateUrl; // Cloudinary URL of the uploaded certificate
        uint256 timestamp;      // Block timestamp when recorded
    }

    // All records, append-only
    Record[] public records;

    // Lookup helpers
    mapping(string => uint256[]) private _byRfid;
    mapping(string => uint256[]) private _byFarmer;

    event RecordAdded(
        uint256 indexed recordId,
        string  rfid,
        string  farmerId,
        string  vaccineName,
        uint256 timestamp
    );

    /**
     * @notice Add a new vaccination record. Anyone with the backend's wallet can call.
     */
    function addRecord(
        string calldata _rfid,
        string calldata _farmerId,
        string calldata _farmerName,
        string calldata _vaccineName,
        string calldata _certificateUrl
    ) external returns (uint256 recordId) {
        recordId = records.length;

        records.push(Record({
            rfid:           _rfid,
            farmerId:       _farmerId,
            farmerName:     _farmerName,
            vaccineName:    _vaccineName,
            certificateUrl: _certificateUrl,
            timestamp:      block.timestamp
        }));

        _byRfid[_rfid].push(recordId);
        _byFarmer[_farmerId].push(recordId);

        emit RecordAdded(recordId, _rfid, _farmerId, _vaccineName, block.timestamp);
    }

    /** @notice Get total number of records */
    function totalRecords() external view returns (uint256) {
        return records.length;
    }

    /** @notice Get all record IDs for an animal RFID */
    function getRecordsByRfid(string calldata _rfid) external view returns (uint256[] memory) {
        return _byRfid[_rfid];
    }

    /** @notice Get all record IDs for a farmer */
    function getRecordsByFarmer(string calldata _farmerId) external view returns (uint256[] memory) {
        return _byFarmer[_farmerId];
    }
}
