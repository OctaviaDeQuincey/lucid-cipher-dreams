import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { useMemo, useState, useEffect } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { getContractAddress } from '@/config/contracts';
import type { DreamEncryption } from '@/types/contracts';

// Temporary ABI - will be replaced with generated types
// Note: externalEuint32 is compiled as bytes32 (handle) in the ABI
const DREAM_ENCRYPTION_ABI = [
  'function submitDream(bytes encryptedData, bytes32 encCount, bytes inputProof) external',
  'function getDreamCount() external view returns (uint256)',
  'function getDreamCountByOwner(address owner) external view returns (uint256)',
  'function getDreamIdsByOwner(address owner) external view returns (uint256[])',
  'function getDreamMeta(uint256 id) external view returns (address owner, uint64 createdAt)',
  'function getDreamData(uint256 id) external view returns (bytes)',
  'function getInterpretationCount(uint256 id) external view returns (bytes32)',
  'function incrementInterpretationCount(uint256 id, bytes32 increment, bytes inputProof) external',
  'event DreamSubmitted(uint256 indexed id, address indexed owner, uint64 createdAt)',
  'event InterpretationCountIncremented(uint256 indexed id, address indexed interpreter, uint64 timestamp)',
] as const;

export function useDreamContract() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [contract, setContract] = useState<DreamEncryption | null>(null);

  // Create contract with signer (async)
  useEffect(() => {
    if (!walletClient || !chainId || !address) {
      setContract(null);
      return;
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      setContract(null);
      return;
    }

    const createContract = async () => {
      try {
        const provider = new BrowserProvider(walletClient as any);
        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, DREAM_ENCRYPTION_ABI, signer) as unknown as DreamEncryption;
        setContract(contractInstance);
      } catch (error) {
        console.error('Failed to create contract with signer:', error);
        setContract(null);
      }
    };

    createContract();
  }, [walletClient, chainId, address]);

  const contractReadOnly = useMemo(() => {
    if (!publicClient || !chainId) return null;

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) return null;

    // Get RPC URL from publicClient transport
    const transport = (publicClient as any).transport;
    let rpcUrl: string;
    
    if (typeof transport === 'object' && transport?.url) {
      rpcUrl = transport.url;
    } else if (chainId === 31337) {
      rpcUrl = 'http://127.0.0.1:8545';
    } else {
      rpcUrl = `https://sepolia.infura.io/v3/${process.env.VITE_INFURA_API_KEY || ''}`;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new Contract(contractAddress, DREAM_ENCRYPTION_ABI, provider) as unknown as DreamEncryption;
  }, [publicClient, chainId]);

  return {
    contract,
    contractReadOnly,
    contractAddress: chainId ? getContractAddress(chainId) : null,
    isReady: !!contract && !!address,
  };
}



