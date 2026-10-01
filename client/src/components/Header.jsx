import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';

export default function Header({ showAdminLink = true, subtitle = 'Jubilant · Chennai CBD A' }) {
  return (
    <header className="w-full bg-white border-b border-bni-gold/20 shadow-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Chapter Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="relative flex items-center">
            {/* BNI Brand Badge */}
            <div className="w-12 h-10 bg-gradient-to-br from-bni-red to-bni-red-dark rounded-lg flex items-center justify-center shadow-md text-white font-extrabold text-xl tracking-tight transition-transform group-hover:scale-105 border border-bni-gold/40">
              BNI
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-heading font-bold text-lg sm:text-xl text-bni-charcoal tracking-tight">
                JUBILANT
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-bni-gold-light text-bni-gold-dark border border-bni-gold/30">
                CBD A
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium tracking-wide">
              {subtitle}
            </p>
          </div>
        </Link>

        {/* Right Action */}
        <div className="flex items-center space-x-2">
          {showAdminLink && (
            <Link
              to="/admin"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-bni-red hover:bg-bni-red-light transition-colors border border-stone-200"
              title="Chapter Admin Portal"
            >
              <Shield className="w-3.5 h-3.5 text-bni-gold" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
