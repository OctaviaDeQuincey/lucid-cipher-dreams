import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useDreamContract } from "@/hooks/useDreamContract";
import { useFhevm } from "@/hooks/useFhevm";
import { encryptText } from "@/utils/encryption";
import { ethers } from "ethers";

export const DreamSubmission = () => {
  const [dream, setDream] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const { address } = useAccount();
  const { contract, isReady, contractAddress } = useDreamContract();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm();

  const handleSubmit = async () => {
    if (!dream.trim()) {
      toast.error("Please enter your dream first");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isReady || !contract) {
      toast.error("Contract not ready. Please ensure you're on the correct network.");
      return;
    }

    if (fhevmStatus !== 'ready' || !fhevmInstance) {
      toast.error("FHEVM not initialized. Please wait...");
      return;
    }

    setIsEncrypting(true);

    try {
      // Step 1: Encrypt dream text using AES-GCM
      toast.info("Encrypting dream text...");
      const encryptedText = await encryptText(dream, address.toLowerCase());
      // Store encrypted text as UTF-8 bytes (includes the colon separator "iv:encryptedData")
      const encryptedData = ethers.toUtf8Bytes(encryptedText);

      // Step 2: Use contract address from hook
      if (!contractAddress) {
        throw new Error("Contract address not found. Please update the contract address in config/contracts.ts");
      }

      // Step 3: Encrypt initial interpretation count (0) using FHEVM
      toast.info("Encrypting interpretation count...");
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(contractAddress, address)
        .add32(0)
        .encrypt();

      // Format handle to bytes32 (ensure it's a hex string)
      let handleHex: string;
      if (typeof encryptedInput.handles[0] === 'string') {
        handleHex = encryptedInput.handles[0];
        if (!handleHex.startsWith('0x')) {
          handleHex = '0x' + handleHex;
        }
      } else if (encryptedInput.handles[0] instanceof Uint8Array) {
        handleHex = ethers.hexlify(encryptedInput.handles[0]);
      } else {
        handleHex = String(encryptedInput.handles[0]);
        if (!handleHex.startsWith('0x')) {
          handleHex = '0x' + handleHex;
        }
      }

      // Format inputProof to bytes
      let proofHex: string;
      if (typeof encryptedInput.inputProof === 'string') {
        proofHex = encryptedInput.inputProof;
        if (!proofHex.startsWith('0x')) {
          proofHex = '0x' + proofHex;
        }
      } else if (encryptedInput.inputProof instanceof Uint8Array) {
        proofHex = ethers.hexlify(encryptedInput.inputProof);
      } else {
        proofHex = String(encryptedInput.inputProof);
        if (!proofHex.startsWith('0x')) {
          proofHex = '0x' + proofHex;
        }
      }

      // Step 4: Submit to contract
      toast.info("Submitting to blockchain...");
      const tx = await contract.submitDream(
        encryptedData,
        handleHex,
        proofHex
      );

      toast.info("Waiting for confirmation...");
      await tx.wait();

      toast.success("Dream encrypted and submitted!", {
        description: "Your dream token has been created"
      });

      setDream("");
    } catch (error: any) {
      console.error("Submission error:", error);

      let errorMessage = "Failed to submit dream";
      let description = "An unexpected error occurred";

      if (error.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction cancelled";
          description = "You cancelled the transaction";
        } else if (error.message.includes("network")) {
          errorMessage = "Network error";
          description = "Please check your connection and try again";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds";
          description = "You don't have enough ETH for gas fees";
        } else {
          description = error.message;
        }
      }

      toast.error(errorMessage, { description });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="glass-panel rounded-3xl p-8 space-y-6 dream-glow">
          <div className="space-y-2">
            <h2 className="font-space text-3xl font-bold bg-gradient-to-r from-dream-violet to-dream-cyan bg-clip-text text-transparent">
              Submit Your Dream
            </h2>
            <p className="text-muted-foreground">
              Record your dream fragment and encrypt it into a coded dream token
            </p>
          </div>

          <Textarea
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder="Describe your dream... Every detail matters in the dream realm."
            className="min-h-[200px] glass-panel border-dream-violet/30 focus:border-dream-cyan/50 resize-none text-foreground placeholder:text-muted-foreground"
            maxLength={5000}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{dream.length} / 5000 characters</span>
            {!address && (
              <span className="text-yellow-500">Connect wallet to submit</span>
            )}
            {fhevmStatus === 'loading' && (
              <span className="text-blue-500">Initializing encryption...</span>
            )}
            {fhevmStatus === 'error' && (
              <span className="text-red-500">Encryption error</span>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isEncrypting || !address || !isReady || fhevmStatus !== 'ready'}
            className="w-full bg-gradient-to-r from-dream-violet to-dream-cyan hover:opacity-90 transition-opacity font-space gap-2 py-6 text-lg"
          >
            {isEncrypting ? (
              <>
                <Lock className="w-5 h-5 animate-pulse" />
                Encrypting Dream...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Encrypt & Submit Dream
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
};


