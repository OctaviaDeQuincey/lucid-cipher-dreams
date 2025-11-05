import { ConnectButton } from "@rainbow-me/rainbowkit";
import logo from "/logo.svg";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <nav className="glass-panel rounded-2xl px-6 py-3 mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="DreCate Logo" className="w-10 h-10 dream-glow" />
          <h1 className="font-space text-2xl font-bold bg-gradient-to-r from-dream-violet to-dream-cyan bg-clip-text text-transparent">
            DreCate
          </h1>
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


