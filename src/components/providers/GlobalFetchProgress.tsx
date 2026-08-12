"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

const IDLE = 0;
const START = 8;
const CEILING = 90;
const COMPLETE = 100;

export default function GlobalFetchProgress() {
  const active = useIsFetching() + useIsMutating() > 0;
  const [progress, setProgress] = useState(IDLE);

  useEffect(() => {
    if (active) {
      const tick = setInterval(() => {
        setProgress((current) => {
          if (current === IDLE) return START;
          if (current >= CEILING) return current;
          return current + Math.max(1, (CEILING - current) * 0.08);
        });
      }, 60);
      return () => clearInterval(tick);
    }

    let reset: ReturnType<typeof setTimeout> | undefined;
    const complete = setTimeout(() => {
      setProgress((current) => (current === IDLE ? IDLE : COMPLETE));
      reset = setTimeout(() => setProgress(IDLE), 220);
    }, 0);

    return () => {
      clearTimeout(complete);
      if (reset) clearTimeout(reset);
    };
  }, [active]);

  if (progress === IDLE) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: 3 }}
    >
      <div
        className="h-full bg-blue-600 transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= COMPLETE ? 0 : 1,
          boxShadow: "0 0 8px rgba(37,99,235,0.6), 0 0 4px rgba(37,99,235,0.6)",
        }}
      />
    </div>
  );
}
