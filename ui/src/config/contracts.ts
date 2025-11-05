// Contract addresses - Update these after deployment
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Hardhat local - update after deployment
  11155111: "0x96F07ec5a7027050232441Bcca412EF98533ee6F", // Sepolia - deployed contract address
};

// Contract ABI will be generated from the compiled contract
// For now, we'll import it dynamically
export const getContractAddress = (chainId: number): string => {
  return CONTRACT_ADDRESSES[chainId] || "";
};


