import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export const Footer = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate decoding progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Hide footer randomly after completion
          setTimeout(() => {
            setIsVisible(Math.random() > 0.3);
          }, 2000);
          return 0;
        }
        return prev + Math.random() * 15;
      });
    }, 800);

    // Toggle visibility randomly
    const visibilityInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsVisible(prev => !prev);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(visibilityInterval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto glass-panel rounded-2xl p-6 space-y-3 animate-fade-in pointer-events-auto">
        <div className="flex items-center justify-between">
          <span className="font-space text-sm text-dream-violet">
            Decoding Dreams
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-2 bg-muted/50"
        />
        
        <p className="text-xs text-muted-foreground text-center">
          Processing encrypted dream interpretations using FHE technology
        </p>
      </div>
    </footer>
  );
};



