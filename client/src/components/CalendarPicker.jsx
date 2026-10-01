import React, { useState, useRef, useEffect } from 'react';
import Calendar from 'react-calendar';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

/**
 * Custom Styled React Calendar Picker for BNI Attendance
 */
export default function CalendarPicker({ value, onChange, label = 'Select Date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse string 'YYYY-MM-DD' into Date object
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    const [y, m, d] = dStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const selectedDate = typeof value === 'string' ? parseDate(value) : value || new Date();

  // Format Date to YYYY-MM-DD string
  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleDateChange(newDate) {
    const formatted = formatDateStr(newDate);
    onChange(formatted);
    setIsOpen(false);
  }

  function handleSelectToday() {
    const today = new Date();
    onChange(formatDateStr(today));
    setIsOpen(false);
  }

  const displayDateText = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 shadow-2xs text-xs sm:text-sm font-semibold text-bni-charcoal transition-all group"
      >
        <CalendarIcon className="w-4 h-4 text-bni-gold group-hover:text-bni-red transition-colors shrink-0" />
        <span className="tracking-tight">{displayDateText}</span>
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-bni-gold/30 p-4 w-[320px] animate-scale-in">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-bni-gold" />
              <span>{label}</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bni-calendar-wrapper">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              nextLabel={<ChevronRight className="w-4 h-4 text-bni-charcoal" />}
              prevLabel={<ChevronLeft className="w-4 h-4 text-bni-charcoal" />}
              next2Label={null}
              prev2Label={null}
              className="custom-bni-calendar border-none font-sans"
            />
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-3 py-1.5 rounded-lg bg-bni-gold-light text-bni-gold-dark hover:bg-bni-gold/20 text-xs font-bold transition-colors"
            >
              Jump to Today
            </button>
            <span className="text-[11px] text-stone-400 font-mono">Asia/Kolkata</span>
          </div>
        </div>
      )}
    </div>
  );
}
