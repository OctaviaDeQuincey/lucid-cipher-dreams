import { useEffect, useState } from 'react';
import { useChainId, useWalletClient } from 'wagmi';
import { getContractAddress } from '@/config/contracts';

// Simple FHEVM instance type for local development
export interface FhevmInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => {
    add32: (value: number) => {
      encrypt: () => Promise<{
        handles: any[];
        inputProof: string;
      }>;
    };
  };
  userDecryptEuint?: (type: string | number, encrypted: any, contractAddress: string, userAddress: any) => Promise<number>;
}

interface UseFhevmOptions {
  enabled?: boolean;
}

export function useFhevm(options: UseFhevmOptions = {}) {
  const { enabled = true } = options;
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !walletClient || !chainId) {
      setStatus('idle');
      setInstance(null);
      return;
    }

    const initializeFhevm = async () => {
      setStatus('loading');
      setError(null);

      try {
        // Get contract address for current chain
        const contractAddress = getContractAddress(chainId);
        if (!contractAddress) {
          throw new Error(`Contract not deployed on chain ${chainId}. Please deploy the contract first.`);
        }

        // For local Hardhat network, use mock FHEVM
        if (chainId === 31337 || chainId === 1337) {
          // Dynamically import mock utils to avoid including in production bundle
          const { MockFhevmInstance } = await import('@fhevm/mock-utils');
          const { JsonRpcProvider } = await import('ethers');
          
          const provider = new JsonRpcProvider('http://127.0.0.1:8545');
          
          // Fetch FHEVM metadata from Hardhat node
          let metadata;
          try {
            const response = await fetch('http://127.0.0.1:8545', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'fhevm_relayer_metadata',
                params: [],
                id: 1,
              }),
            });
            const result = await response.json();
            metadata = result.result;
          } catch (e) {
            console.error('Failed to fetch FHEVM metadata:', e);
            throw new Error('Cannot connect to FHEVM Hardhat node. Make sure Hardhat node is running with FHEVM plugin.');
          }

          if (!metadata || !metadata.ACLAddress) {
            throw new Error('Invalid FHEVM metadata from Hardhat node');
          }

          const mockInstance = await MockFhevmInstance.create(provider, provider, {
            aclContractAddress: metadata.ACLAddress,
            chainId: chainId,
            gatewayChainId: 55815,
            inputVerifierContractAddress: metadata.InputVerifierAddress,
            kmsContractAddress: metadata.KMSVerifierAddress,
            verifyingContractAddressDecryption: metadata.verifyingContractAddressDecryption || '0x5ffdaAB0373E62E2ea2944776209aEf29E631A64',
            verifyingContractAddressInputVerification: metadata.verifyingContractAddressInputVerification || '0x812b06e1CDCE800494b79fFE4f925A504a9A9810',
          });

          setInstance(mockInstance as any);
          setStatus('ready');
        } else {
          // For Sepolia or other networks, use @zama-fhe/relayer-sdk
          const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/bundle');
          
          await initSDK();
          
          const config = chainId === 11155111 ? SepoliaConfig : {
            ...SepoliaConfig,
            chainId: chainId,
          };

          const zamaInstance = await createInstance(config);
          setInstance(zamaInstance as any);
          setStatus('ready');
        }
      } catch (err) {
        console.error('FHEVM initialization error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize FHEVM'));
        setStatus('error');
      }
    };

    initializeFhevm();
  }, [enabled, walletClient, chainId]);

  return {
    instance,
    status,
    error,
  };
}
