import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function SuccessCheckmark({ isLate = false }) {
  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: isLate
          ? ['#C9A24B', '#F59E0B', '#CF2030']
          : ['#10B981', '#C9A24B', '#CF2030', '#34D399'],
      });
    } catch (e) {
      // ignore
    }
  }, [isLate]);

  return (
    <div className="flex items-center justify-center my-4">
      <div
        className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg animate-scale-in ${
          isLate
            ? 'bg-amber-50 border-4 border-amber-400'
            : 'bg-emerald-50 border-4 border-emerald-500'
        }`}
      >
        <svg
          className={`w-14 h-14 ${isLate ? 'text-amber-600' : 'text-emerald-600'}`}
          viewBox="0 0 52 52"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="animate-check-stroke"
            d="M14 27 l8 8 l16 -16"
          />
        </svg>
      </div>
    </div>
  );
}
