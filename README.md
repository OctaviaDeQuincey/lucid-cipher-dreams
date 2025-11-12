# Lucid Cipher Dreams (DreCate)

Dream Encryption Game - Record, encrypt and share dreams with Fully Homomorphic Encryption (FHE).

## 🎥 Demo Video

Watch the project demo: [lucid-cipher-dreams.mp4](https://github.com/OctaviaDeQuincey/lucid-cipher-dreams/blob/main/lucid-cipher-dreams.mp4)

## 🌐 Live Demo

- **Vercel Deployment**: [https://lucid-cipher-dreams.vercel.app/](https://lucid-cipher-dreams.vercel.app/)
- **GitHub Repository**: [https://github.com/OctaviaDeQuincey/lucid-cipher-dreams.git](https://github.com/OctaviaDeQuincey/lucid-cipher-dreams.git)

## 📋 Overview

Lucid Cipher Dreams (DreCate) is a full-stack decentralized application that combines:
- **Smart Contracts**: Solidity contracts using FHEVM (Fully Homomorphic Encryption Virtual Machine) for homomorphic encryption
- **Frontend**: React + TypeScript + Vite with RainbowKit wallet integration
- **Encryption**: Client-side AES-GCM encryption for dream text, FHE for interpretation counts

The application allows users to:
- Submit encrypted dreams to the blockchain
- View all encrypted dreams in a gallery
- Decrypt and interpret their own dreams
- Track interpretation counts using FHE (without revealing the actual count)

## 🏗️ Project Structure

```
lucid-cipher-dreams/
├── contracts/          # Solidity smart contracts
│   └── DreamEncryption.sol
├── deploy/            # Deployment scripts
│   └── deploy.ts
├── test/              # Test files (local and Sepolia)
│   ├── DreamEncryption.ts
│   └── DreamEncryptionSepolia.ts
├── tasks/             # Hardhat tasks
│   └── DreamEncryption.ts
├── ui/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # React hooks (contract, FHEVM)
│   │   ├── utils/         # Utilities (encryption)
│   │   └── config/        # Configuration (wagmi, contracts)
│   └── package.json
├── hardhat.config.ts  # Hardhat configuration
├── package.json
└── README.md
```

## ✨ Features

### Smart Contract
- Submit encrypted dreams with FHE-protected interpretation counts
- Retrieve dream metadata and encrypted data
- Increment interpretation counts using FHE operations
- Access control lists (ACL) for FHE-encrypted data

### Frontend
- **Dream Submission**: Encrypt and submit dreams to blockchain
- **Dream Gallery**: View all encrypted dreams with metadata
- **Dream Interpretation**: Decrypt and interpret dreams (increments FHE count)
- **Rainbow Wallet**: Integrated wallet connection
- **FHEVM Integration**: Homomorphic encryption support for local and Sepolia networks

## 🔐 Encryption & Decryption Logic

### Dream Text Encryption (AES-GCM)

Dream text is encrypted client-side using **AES-GCM** (Advanced Encryption Standard - Galois/Counter Mode) before submission to the blockchain.

#### Encryption Process:
1. **Key Derivation**: 
   - Uses wallet address as the seed
   - Derives a 256-bit AES key using PBKDF2 (Password-Based Key Derivation Function 2)
   - Parameters:
     - Salt: `'drecate-salt'` (fixed salt for deterministic key derivation)
     - Iterations: `100,000`
     - Hash: `SHA-256`
     - Key length: `256 bits`

2. **Encryption**:
   - Generates a random 12-byte IV (Initialization Vector) for each encryption
   - Encrypts plaintext using AES-GCM with the derived key
   - Combines IV and encrypted data as hex strings: `ivHex:encryptedHex`

3. **Storage**:
   - Encrypted data is stored on-chain as `bytes`
   - Format: `iv:encryptedData` (both as hex strings, concatenated with `:`)

#### Decryption Process:
1. **Parse Ciphertext**: Split the encrypted data by `:` to get IV and encrypted content
2. **Key Derivation**: Derive the same key using wallet address (same process as encryption)
3. **Decrypt**: Use AES-GCM decryption with the derived key and IV
4. **Result**: Original plaintext dream content

**Key Points**:
- Only the wallet address owner can decrypt their dreams (key is derived from their address)
- Each encryption uses a unique IV, ensuring different ciphertexts for the same plaintext
- Encryption/decryption happens entirely client-side - no plaintext is ever sent to the blockchain

### Interpretation Count Encryption (FHE)

Interpretation counts are encrypted using **Fully Homomorphic Encryption (FHE)** provided by Zama's FHEVM.

#### FHE Encryption Process:
1. **Initialization**: 
   - When submitting a dream, the interpretation count is initialized to 0 (FHE-encrypted)
   - Uses `externalEuint32` type from FHEVM
   - Requires an input proof for verification

2. **Homomorphic Operations**:
   - Increment operation: `FHE.add(encryptedCount, encryptedIncrement)`
   - Operations are performed on encrypted data without decryption
   - Result remains encrypted

3. **Access Control**:
   - ACL (Access Control List) permissions are set for:
     - Contract itself: `FHE.allowThis()`
     - Dream owner: `FHE.allow(encryptedData, owner)`
   - Only authorized parties can perform operations on encrypted data

4. **Decryption**:
   - Decryption happens client-side using FHEVM instance
   - Only authorized users can decrypt the interpretation count
   - Uses `userDecryptEuint()` method from FHEVM SDK

**Key Points**:
- Interpretation counts remain encrypted on-chain
- Operations (increment) can be performed without revealing the count
- Privacy is maintained - no one can see the actual count without proper authorization

## 📝 Smart Contract

### Contract Addresses

- **Local Network (Hardhat)**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Chain ID: 31337)
- **Sepolia Testnet**: `0x96F07ec5a7027050232441Bcca412EF98533ee6F` (Chain ID: 11155111)

### Contract Code

```solidity
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
    }
}
```

### Key Functions

#### `submitDream(bytes encryptedData, externalEuint32 encCount, bytes inputProof)`

Submit a new encrypted dream to the blockchain.

* **Parameters**:  
   * `encryptedData`: AES-GCM encrypted dream text (as bytes)  
   * `encCount`: FHE-encrypted uint32 for interpretation count (initialized to 0)  
   * `inputProof`: Zama FHEVM input proof for `encCount`
* **Storage**:  
   * Encrypted dream data stored on-chain  
   * FHE-encrypted interpretation count initialized to 0  
   * Owner address and timestamp recorded  
   * ACL permissions set for owner and contract

#### `getDreamCount() → uint256`

Get the total number of dreams in the system.

#### `getDreamCountByOwner(address owner) → uint256`

Get the number of dreams owned by a specific address.

#### `getDreamIdsByOwner(address owner) → uint256[]`

Get all dream IDs owned by a specific address.

#### `getDreamMeta(uint256 id) → (address owner, uint64 createdAt)`

Get metadata for a dream: owner address and creation timestamp.

#### `getDreamData(uint256 id) → bytes`

Get the encrypted dream data (AES-GCM encrypted bytes).

#### `getInterpretationCount(uint256 id) → euint32`

Get the FHE-encrypted interpretation count for a dream.

#### `incrementInterpretationCount(uint256 id, externalEuint32 increment, bytes inputProof)`

Increment the interpretation count using homomorphic addition.

* **Operation**: `encryptedCount = FHE.add(encryptedCount, encryptedIncrement)`
* **Access Control**: Only accessible by contract or owner

## 🚀 Setup & Installation

### Prerequisites

* **Node.js** >= 20
* **npm** >= 7.0.0
* **MetaMask** or compatible Web3 wallet
* **Sepolia ETH** (for testnet testing) - Get from [Sepolia Faucet](https://sepoliafaucet.com/)

### Backend (Smart Contracts)

1. **Install dependencies**:

```bash
npm install
```

2. **Compile contracts**:

```bash
npm run compile
```

3. **Run local tests**:

```bash
npm run test
```

4. **Deploy to local network**:

```bash
# Terminal 1: Start local Hardhat node (with FHEVM support)
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat deploy --network localhost
```

5. **Deploy to Sepolia testnet**:

```bash
# Set environment variables (not saved to files)
export PRIVATE_KEY="your_private_key"
export INFURA_API_KEY="your_infura_key"

# Deploy
npm run deploy:sepolia
```

### Frontend

1. **Navigate to UI directory**:

```bash
cd ui
```

2. **Install dependencies**:

```bash
npm install
```

3. **Update contract addresses** (if needed):  
   * Update `ui/src/config/contracts.ts` with deployed addresses  
   * Default addresses are already configured for local and Sepolia

4. **Start development server**:

```bash
npm run dev
```

5. **Build for production**:

```bash
npm run build
```

## 🎯 Usage

### 1. Connect Wallet

* Click the "Connect Wallet" button in the top-right corner
* Select your wallet (Rainbow, MetaMask, etc.)
* Switch to **Sepolia testnet** (Chain ID: 11155111) or local Hardhat network (Chain ID: 31337)

### 2. Submit a Dream

1. Navigate to "Submit Your Dream" section
2. Enter your dream description in the text area
3. Click "Encrypt & Submit Dream"
4. Wait for encryption and transaction confirmation
5. Your dream is now stored on-chain (encrypted)

### 3. View Dream Gallery

* All submitted dreams are displayed in the gallery
* Each card shows:
   * Encrypted token (first 32 characters)
   * Timestamp (relative time)
   * Interpretation count (FHE-encrypted)
   * Owner address

### 4. Interpret a Dream

1. Click "Interpret Dream" on your own dream card
2. The system will:
   * Verify ownership
   * Decrypt the dream text (using your wallet address)
   * Display the decrypted content
   * Increment the interpretation count (FHE operation)
3. View interpretation statistics in the dialog

## 🔧 Development

### Testing

```bash
# Local network tests
npm run test

# Sepolia network tests (requires deployment)
npm run test:sepolia
```

### Code Quality

```bash
# Lint
npm run lint

# Format code
npm run prettier:write

# Type checking
npm run typechain
```

### Gas Reporting

```bash
REPORT_GAS=true npm run test
```

## 🔐 Security Considerations

1. **Dream Encryption**:
   * Dreams are encrypted client-side before submission
   * Only the owner (using their wallet address) can decrypt
   * Encryption key is derived from wallet address (PBKDF2)

2. **FHE Protection**:
   * Interpretation counts remain encrypted on-chain
   * Operations performed without decryption
   * Access Control Lists (ACL) restrict access

3. **On-chain Storage**:
   * Only encrypted data is stored on-chain
   * No plaintext dream content is ever stored
   * Metadata (owner, timestamp) is public by design

## 📚 Technology Stack

### Backend

* **Solidity** ^0.8.24
* **Hardhat** ^2.26.0
* **FHEVM** (@fhevm/solidity, @fhevm/hardhat-plugin)
* **Ethers.js** ^6.15.0

### Frontend

* **React** ^18.x
* **TypeScript** ^5.8.3
* **Vite** ^5.x
* **Wagmi** ^2.x (Ethereum React hooks)
* **RainbowKit** (Wallet connection UI)
* **Tailwind CSS** (Styling)
* **Shadcn UI** (Component library)

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

* **Live Demo**: [https://lucid-cipher-dreams.vercel.app/](https://lucid-cipher-dreams.vercel.app/)
* **GitHub Repository**: [https://github.com/OctaviaDeQuincey/lucid-cipher-dreams.git](https://github.com/OctaviaDeQuincey/lucid-cipher-dreams.git)
* **Sepolia Contract**: [Etherscan](https://sepolia.etherscan.io/address/0x96F07ec5a7027050232441Bcca412EF98533ee6F)
* **FHEVM Documentation**: [Zama FHEVM](https://docs.zama.ai/fhevm)

---

**Built with ❤️ using FHEVM and Zama's fully homomorphic encryption technology**
