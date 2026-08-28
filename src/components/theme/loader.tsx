"use client";

import { useEffect, useState } from "react";

export function GlobalLoader({
  duration = 6000,
  onComplete,
}: {
  duration?: number;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 0.15, 0.3, 0.45].map((delay, i) => (
          <span
            key={i}
            className="h-4 w-4 bg-[#e6dfd0]"
            style={{
              animation: "boxPulse 1s ease-in-out infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes boxPulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
