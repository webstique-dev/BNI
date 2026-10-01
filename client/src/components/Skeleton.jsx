import React from 'react';
import bniLogo from '../assests/BNI_Jubilant_Chennai_CBD_logo.png';

/**
 * Animated Shimmer Skeleton primitive
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%] rounded-xl ${className}`}
    />
  );
}

/**
 * Full page preloader with BNI logo
 */
export function Preloader({ text = 'Loading BNI Jubilant...' }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-white shadow-card border border-bni-gold/40 p-2 flex items-center justify-center pulse-gold">
          <img
            src={bniLogo}
            alt="BNI Jubilant Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute -inset-1.5 rounded-3xl border-2 border-bni-red/20 animate-spin border-t-bni-red" />
      </div>
      <h3 className="text-base font-bold font-heading text-bni-charcoal tracking-wide">
        {text}
      </h3>
      <p className="text-xs text-stone-400 mt-1">Chennai CBD A Chapter</p>
    </div>
  );
}

/**
 * Search results list skeleton
 */
export function SearchResultSkeleton({ count = 4 }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-stone-200 divide-y divide-stone-100 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1 mr-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Stats Cards Skeleton for Dashboard
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-card flex items-center justify-between"
        >
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0 ml-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table rows skeleton loader
 */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center space-x-4 py-2">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 hidden sm:block" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3 hidden sm:block" />
          </div>
          <Skeleton className="w-16 h-7 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
