import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Lock, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useDreamContract } from "@/hooks/useDreamContract";
import { useFhevm } from "@/hooks/useFhevm";
import { decryptText } from "@/utils/encryption";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";

interface Dream {
  id: number;
  encryptedToken: string;
  timestamp: string;
  interpretationCount: number;
  owner: string;
}

export const DreamGallery = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [decryptedText, setDecryptedText] = useState<string>("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const { address } = useAccount();
  const { contract, contractReadOnly, contractAddress, isReady } = useDreamContract();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm();

  const loadDreams = async () => {
    if (!contractReadOnly || !contractAddress) return;

    setLoading(true);
    try {
      const count = await contractReadOnly.getDreamCount();
      const dreamCount = Number(count);

      if (dreamCount === 0) {
        setDreams([]);
        return;
      }

      const dreamsList: Dream[] = [];
      for (let i = 0; i < dreamCount; i++) {
        try {
          const [owner, createdAt] = await contractReadOnly.getDreamMeta(i);
          const encryptedData = await contractReadOnly.getDreamData(i);
          const encryptedCount = await contractReadOnly.getInterpretationCount(i);

          // Decrypt interpretation count if we have FHEVM instance
          let interpretationCount = 0;
          if (fhevmInstance && fhevmStatus === 'ready' && address) {
            try {
              // Decrypt euint32 - using FHEVM instance method
              // Note: For local Hardhat node, decryption should work directly
              // The API may vary, so we use type assertion for flexibility
              interpretationCount = await (fhevmInstance as any).userDecryptEuint?.(
                'euint32',
                encryptedCount,
                contractAddress,
                address
              ) || 0;
            } catch (e) {
              // If decryption fails, count remains 0
              console.warn(`Failed to decrypt count for dream ${i}:`, e);
            }
          }

          // Get first 32 chars of encrypted data as token display
          const encryptedToken = ethers.hexlify(encryptedData).substring(0, 66);

          dreamsList.push({
            id: i,
            encryptedToken,
            timestamp: formatDistanceToNow(new Date(Number(createdAt) * 1000), { addSuffix: true }),
            interpretationCount,
            owner: owner,
          });
        } catch (error) {
          console.error(`Error loading dream ${i}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      dreamsList.sort((a, b) => {
        // Extract timestamp from string if possible, otherwise reverse order
        return dreamsList.indexOf(b) - dreamsList.indexOf(a);
      });

      setDreams(dreamsList);
      setFilteredDreams(dreamsList);
    } catch (error) {
      console.error("Error loading dreams:", error);
      toast.error("Failed to load dreams");
    } finally {
      setLoading(false);
    }
  };

  // Filter dreams based on selected filter
  useEffect(() => {
    if (filter === 'mine' && address) {
      setFilteredDreams(dreams.filter(dream => dream.owner.toLowerCase() === address.toLowerCase()));
    } else {
      setFilteredDreams(dreams);
    }
  }, [dreams, filter, address]);

  useEffect(() => {
    if (contractReadOnly && contractAddress) {
      loadDreams();
      // Refresh every 30 seconds
      const interval = setInterval(loadDreams, 30000);
      return () => clearInterval(interval);
    }
  }, [contractReadOnly, contractAddress, fhevmStatus]);

  const handleInterpret = async (dream: Dream) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!contract || !isReady || !contractAddress || !fhevmInstance || fhevmStatus !== 'ready') {
      toast.error("Contract or FHEVM not ready. Please ensure you're connected to the correct network.");
      return;
    }

    setIsDecrypting(true);
    setDecryptedText("");

    try {
      // Step 1: Get encrypted data from contract (use readOnly for reading)
      if (!contractReadOnly) {
        throw new Error("Contract not available");
      }
      const encryptedData = await contractReadOnly.getDreamData(dream.id);
      
      // Step 2: Verify this is the owner's dream
      if (address?.toLowerCase() !== dream.owner.toLowerCase()) {
        toast.error("Cannot decrypt this dream. Only the owner can decrypt it.");
        return;
      }
      
      // Step 3: Convert bytes back to string format (iv:encryptedData)
      const encryptedText = ethers.toUtf8String(encryptedData);
      
      // Step 4: Decrypt using AES-GCM with owner's address
      try {
        const decrypted = await decryptText(encryptedText, address.toLowerCase());
        setDecryptedText(decrypted);
      } catch (decryptError) {
        console.error("Decryption error:", decryptError);
        toast.error("Failed to decrypt dream. Please try again.");
        return;
      }

      // Step 3: Increment interpretation count
      toast.info("Recording interpretation...");
      const encryptedInput = await fhevmInstance
        .createEncryptedInput(contractAddress, address)
        .add32(1)
        .encrypt();

      // Format handle to bytes32
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

      const tx = await contract.incrementInterpretationCount(
        dream.id,
        handleHex,
        proofHex
      );

      await tx.wait();

      // Reload dreams to update count
      await loadDreams();

      toast.success("Dream interpreted successfully!");
      setSelectedDream(dream);
    } catch (error: any) {
      console.error("Interpretation error:", error);
      toast.error("Failed to interpret dream", {
        description: error.message || "Unknown error"
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToken = (id: number, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div>
            <h2 className="font-space text-4xl font-bold bg-gradient-to-r from-dream-violet to-dream-cyan bg-clip-text text-transparent">
              Dream Gallery
            </h2>
            <p className="text-muted-foreground">
              Explore encrypted dreams waiting to be interpreted
            </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="glass-panel"
              >
                All Dreams
              </Button>
              <Button
                variant={filter === 'mine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('mine')}
                className="glass-panel"
                disabled={!address}
              >
                My Dreams
              </Button>
            </div>
          </div>

          {loading && dreams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading dreams...</p>
            </div>
          ) : filteredDreams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No dreams yet. Be the first to submit one!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDreams.map((dream, index) => (
                <div
                  key={dream.id}
                  className="glass-panel rounded-2xl p-6 space-y-4 hover:dream-glow transition-all duration-300 animate-float"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-dream-violet" />
                    <span className="text-sm text-muted-foreground">
                      Encrypted Dream Token
                    </span>
                  </div>

                  <div className="font-mono text-sm text-dream-cyan break-all bg-muted/30 p-3 rounded-lg flex items-center justify-between gap-2">
                    <span className="flex-1 truncate">{dream.encryptedToken}...</span>
                    <button
                      onClick={() => copyToken(dream.id, dream.encryptedToken)}
                      className="flex-shrink-0 p-1 hover:bg-muted rounded"
                    >
                      {copiedId === dream.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{dream.timestamp}</span>
                    <span>{dream.interpretationCount} interpretations</span>
                  </div>

                  <Button
                    onClick={() => handleInterpret(dream)}
                    disabled={isDecrypting || !address || !isReady || fhevmStatus !== 'ready'}
                    className="w-full bg-gradient-to-r from-dream-violet/20 to-dream-cyan/20 hover:from-dream-violet/30 hover:to-dream-cyan/30 border border-dream-violet/30 font-space gap-2"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4" />
                    {isDecrypting ? "Decrypting..." : "Interpret Dream"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!selectedDream && !!decryptedText} onOpenChange={() => {
        setSelectedDream(null);
        setDecryptedText("");
      }}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-dream-violet to-dream-cyan bg-clip-text text-transparent">
              Dream Interpretation
            </DialogTitle>
            <DialogDescription>
              Decrypted dream content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Dream Content:</p>
              <p className="text-foreground whitespace-pre-wrap">{decryptedText}</p>
            </div>
            {selectedDream && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Interpreted {selectedDream.interpretationCount} times</span>
                <span>{selectedDream.timestamp}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


