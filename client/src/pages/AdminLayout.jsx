import React from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  QrCode,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Preloader } from '../components/Skeleton';
import bniLogo from '../assests/BNI_Jubilant_Chennai_CBD_logo.png';

export default function AdminLayout() {
  const { admin, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-bni-cream flex items-center justify-center">
        <Preloader text="Loading Admin Portal..." />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/members', label: 'Members', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-bni-charcoal">
      {/* Top Admin Header */}
      <header className="bg-bni-charcoal text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-auto flex items-center justify-center">
                <img
                  src={bniLogo}
                  alt="BNI Jubilant Logo"
                  className="h-9 w-auto object-contain brightness-110"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold tracking-tight font-heading">
                    JUBILANT
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-bni-gold text-bni-charcoal">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-normal">
                  Chennai CBD A Chapter
                </p>
              </div>
            </div>

            {/* Right: Quick actions & Logout */}
            <div className="flex items-center space-x-3">
              <NavLink
                to="/"
                target="_blank"
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors border border-stone-700"
                title="Open Member QR Scan Page"
              >
                <QrCode className="w-3.5 h-3.5 text-bni-gold" />
                <span>Open QR Landing</span>
              </NavLink>

              <div className="h-6 w-px bg-stone-700 hidden sm:block" />

              <div className="flex items-center space-x-2">
                <span className="text-xs text-stone-300 hidden md:inline">
                  {admin.name || admin.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-colors border border-rose-900/50"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-stone-800 bg-stone-900/90 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-bni-red text-white shadow-xs'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
