import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DreamParticles } from "@/components/DreamParticles";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { DreamSubmission } from "@/components/DreamSubmission";
import { DreamGallery } from "@/components/DreamGallery";

const App = () => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background relative overflow-x-hidden">
        <DreamParticles />
        <Header />
        <main>
          <Hero />
          <DreamSubmission />
          <DreamGallery />
        </main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
};

export default App;



