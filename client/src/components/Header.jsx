import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles } from 'lucide-react';
import bniLogo from '../assests/BNI_Jubilant_Chennai_CBD_logo.png';

export default function Header({ showAdminLink = true, subtitle = 'Jubilant · Chennai CBD A' }) {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="w-full bg-white border-b border-bni-gold/20 shadow-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Logo & Chapter Brand */}
        <Link to="/" className="flex items-center group">
          <div className="relative flex items-center">
            {!imgError ? (
              <img
                src={bniLogo}
                alt="BNI Jubilant Logo"
                onError={() => setImgError(true)}
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-12 h-10 bg-gradient-to-br from-bni-red to-bni-red-dark rounded-lg flex items-center justify-center shadow-md text-white font-extrabold text-xl tracking-tight border border-bni-gold/40">
                BNI
              </div>
            )}
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
