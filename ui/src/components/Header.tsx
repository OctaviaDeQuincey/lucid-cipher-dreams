import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import logo from "/logo.svg";

export const Header = () => {
  const chainId = useChainId();

  const getNetworkName = (id: number) => {
    switch (id) {
      case 31337: return "Hardhat";
      case 11155111: return "Sepolia";
      default: return "Unknown";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <nav className="glass-panel rounded-2xl px-6 py-3 mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="DreCate Logo" className="w-10 h-10 dream-glow" />
          <div>
            <h1 className="font-space text-2xl font-bold bg-gradient-to-r from-dream-violet to-dream-cyan bg-clip-text text-transparent">
              DreCate
            </h1>
            {chainId && (
              <p className="text-xs text-muted-foreground">
                Network: {getNetworkName(chainId)}
              </p>
            )}
          </div>
        </div>

        <ConnectButton
          showBalance={{ smallScreen: false, largeScreen: true }}
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
        />
      </nav>
    </header>
  );
};


