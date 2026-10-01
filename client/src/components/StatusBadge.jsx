import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md', className = '' }) {
  const normStatus = String(status).toLowerCase();

  if (normStatus === 'present') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        } ${className}`}
      >
        <CheckCircle2 className={`mr-1 text-emerald-600 ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
        Present
      </span>
    );
  }

  if (normStatus === 'late') {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-xs ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        } ${className}`}
      >
        <Clock className={`mr-1 text-amber-600 ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
        Late
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${className}`}
    >
      <XCircle className={`mr-1 text-rose-500 ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      Absent
    </span>
  );
}
