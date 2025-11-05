import { Lock, Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-24">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-block">
          <div className="flex items-center gap-2 px-4 py-2 glass-panel rounded-full mb-6 animate-pulse-glow">
            <Sparkles className="w-4 h-4 text-dream-cyan" />
            <span className="text-sm font-space text-muted-foreground">
              Powered by FHE Technology
            </span>
          </div>
        </div>
        
        <h1 className="font-space text-6xl md:text-7xl lg:text-8xl font-bold leading-tight">
          <span className="bg-gradient-to-r from-dream-violet via-dream-cyan to-dream-violet-light bg-clip-text text-transparent text-glow animate-float">
            Dream, Encode,
          </span>
          <br />
          <span className="bg-gradient-to-r from-dream-cyan via-dream-violet to-dream-cyan-light bg-clip-text text-transparent text-glow">
            and Awaken the
          </span>
          <br />
          <span className="bg-gradient-to-r from-dream-violet-light via-dream-cyan-light to-dream-violet bg-clip-text text-transparent text-glow">
            Hidden Meaning
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Record your dreams, encrypt them into tokens, and let others interpret them through 
          fully homomorphic encryption without revealing the original text.
        </p>

        <div className="flex items-center justify-center gap-3 pt-4">
          <div className="w-16 h-16 glass-panel rounded-2xl flex items-center justify-center dream-glow animate-pulse-glow">
            <Lock className="w-8 h-8 text-dream-violet" />
          </div>
        </div>
      </div>
    </section>
  );
};



