import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Clock, X, HeartHandshake } from 'lucide-react';

/**
 * Soft, friendly toast popup for member login arrival messages.
 * Automatically dismisses after `duration` ms.
 * Non-blocking and mobile-responsive.
 */
export default function PunctualityToast({
  message,
  punctuality = 'on_time',
  memberName = '',
  duration = 6000,
  onClose,
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Fade/slide in immediately
    const enterTimer = setTimeout(() => setVisible(true), 50);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    const dismissTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearInterval(interval);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  function handleClose() {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  }

  if (!message) return null;

  // Visual styles by punctuality status
  const config = {
    early: {
      title: memberName ? `Welcome early, ${memberName}!` : 'Early Arrival',
      bgGradient: 'from-emerald-700 via-emerald-800 to-teal-900',
      borderColor: 'border-emerald-400/40',
      badgeBg: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30',
      icon: <Sparkles className="w-5 h-5 text-emerald-300 shrink-0 animate-pulse" />,
      progressBar: 'bg-emerald-400',
      label: 'Early Bird',
    },
    on_time: {
      title: memberName ? `Welcome, ${memberName}!` : 'Punctual Arrival',
      bgGradient: 'from-emerald-800 via-teal-900 to-stone-900',
      borderColor: 'border-teal-400/40',
      badgeBg: 'bg-teal-400/20 text-teal-200 border-teal-400/30',
      icon: <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />,
      progressBar: 'bg-teal-400',
      label: 'Right On Time',
    },
    late: {
      title: memberName ? `Welcome, ${memberName}!` : 'Chapter Greeting',
      bgGradient: 'from-amber-700 via-amber-800 to-stone-900',
      borderColor: 'border-amber-400/40',
      badgeBg: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
      icon: <Clock className="w-5 h-5 text-amber-300 shrink-0" />,
      progressBar: 'bg-amber-400',
      label: 'Late Check-in',
    },
  };

  const style = config[punctuality] || config.on_time;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md transition-all duration-300 transform pointer-events-auto select-none ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${style.bgGradient} text-white shadow-2xl border ${style.borderColor} p-4 sm:p-4.5 backdrop-blur-md`}
      >
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5 p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 shrink-0">
              {style.icon}
            </div>

            <div className="flex-1 pr-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-heading font-bold text-sm tracking-wide text-white">
                  {style.title}
                </h4>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badgeBg}`}
                >
                  {style.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-100 font-medium leading-snug mt-1 text-balance">
                {message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Countdown Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
          <div
            className={`h-full ${style.progressBar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
