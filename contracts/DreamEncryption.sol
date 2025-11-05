// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title DreamEncryption - Encrypted dream storage with FHE-protected interpretation count
/// @notice Stores client-side encrypted dream text (AES-GCM) and FHE-encrypted interpretation count
/// @dev Dream text is stored as bytes (encrypted client-side), interpretation count is FHE-encrypted
contract DreamEncryption is SepoliaConfig {
    struct Dream {
        address owner;
        bytes encryptedData; // Client-side AES-GCM encrypted dream text
        euint32 interpretationCount; // FHE-encrypted interpretation count
        uint64 createdAt; // Unix timestamp in seconds
    }

    Dream[] private _dreams;
    mapping(address => uint256[]) private _dreamsOf;

    event DreamSubmitted(uint256 indexed id, address indexed owner, uint64 createdAt);
    event InterpretationCountIncremented(uint256 indexed id, address indexed interpreter, uint64 timestamp);

    /// @notice Submit a new encrypted dream
    /// @param encryptedData The client-side AES-GCM encrypted dream text (as bytes)
    /// @param encCount External encrypted uint32 for interpretation count (initialized to 0)
    /// @param inputProof The Zama input proof for `encCount`
    function submitDream(
        bytes calldata encryptedData,
        externalEuint32 encCount,
        bytes calldata inputProof
    ) external {
        require(encryptedData.length > 0, "Empty dream data");

        euint32 interpretationCount = FHE.fromExternal(encCount, inputProof);

        Dream memory dream;
        dream.owner = msg.sender;
        dream.encryptedData = encryptedData;
        dream.interpretationCount = interpretationCount;
        dream.createdAt = uint64(block.timestamp);

        // Persist and index
        _dreams.push(dream);
        uint256 id = _dreams.length - 1;
        _dreamsOf[msg.sender].push(id);

        // ACL: allow contract and user to access the encrypted interpretation count
        FHE.allowThis(_dreams[id].interpretationCount);
        FHE.allow(_dreams[id].interpretationCount, msg.sender);

        emit DreamSubmitted(id, msg.sender, dream.createdAt);
    }

    /// @notice Get total number of dreams
    /// @return count Total number of dreams
    function getDreamCount() external view returns (uint256 count) {
        return _dreams.length;
    }

    /// @notice Get dream count for a specific owner
    /// @param owner The address to query for
    /// @return count Number of dreams owned by the address
    function getDreamCountByOwner(address owner) external view returns (uint256 count) {
        return _dreamsOf[owner].length;
    }

    /// @notice Get dream IDs for a specific owner
    /// @param owner The address to query for
    /// @return ids Array of dream IDs owned by the address
    function getDreamIdsByOwner(address owner) external view returns (uint256[] memory ids) {
        return _dreamsOf[owner];
    }

    /// @notice Get metadata for a dream by ID
    /// @param id The dream ID
    /// @return owner Owner address
    /// @return createdAt Timestamp (seconds)
    function getDreamMeta(uint256 id)
        external
        view
        returns (address owner, uint64 createdAt)
    {
        Dream storage dream = _dreams[id];
        return (dream.owner, dream.createdAt);
    }

    /// @notice Get the encrypted data for a dream by ID
    /// @param id The dream ID
    /// @return encryptedData The AES-GCM encrypted dream text bytes
    function getDreamData(uint256 id) external view returns (bytes memory encryptedData) {
        return _dreams[id].encryptedData;
    }

    /// @notice Get the FHE-encrypted interpretation count for a dream by ID
    /// @param id The dream ID
    /// @return encCount The FHE-encrypted interpretation count
    function getInterpretationCount(uint256 id) external view returns (euint32 encCount) {
        return _dreams[id].interpretationCount;
    }

    /// @notice Increment the interpretation count for a dream
    /// @param id The dream ID
    /// @param increment External encrypted uint32 increment value (typically 1)
    /// @param inputProof The Zama input proof for `increment`
    function incrementInterpretationCount(
        uint256 id,
        externalEuint32 increment,
        bytes calldata inputProof
    ) external {
        require(id < _dreams.length, "Invalid dream ID");

        euint32 encryptedIncrement = FHE.fromExternal(increment, inputProof);
        _dreams[id].interpretationCount = FHE.add(_dreams[id].interpretationCount, encryptedIncrement);

        // Ensure access rights are maintained
        FHE.allowThis(_dreams[id].interpretationCount);
        FHE.allow(_dreams[id].interpretationCount, msg.sender);

        emit InterpretationCountIncremented(id, msg.sender, uint64(block.timestamp));
    }
}


