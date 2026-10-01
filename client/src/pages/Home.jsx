import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Phone,
  User,
  Building,
  Briefcase,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import Header from '../components/Header';
import SuccessCheckmark from '../components/SuccessCheckmark';
import StatusBadge from '../components/StatusBadge';
import { Preloader } from '../components/Skeleton';
import { api } from '../services/api';

export default function Home() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isManualMode = searchParams.get('mode') === 'manual' || location.state?.manual;

  const [stage, setStage] = useState(isManualMode ? 'phone_input' : 'checking'); // 'checking' | 'success' | 'phone_input' | 'register_input'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data states
  const [result, setResult] = useState(null); // { member, checkInAt, status, alreadyMarked, checkInTimeFormatted }
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (isManualMode) {
      setStage('phone_input');
    } else {
      attemptDeviceCheckIn();
    }
  }, [location.key, isManualMode]);

  async function attemptDeviceCheckIn() {
    setStage('checking');
    setError('');
    try {
      const res = await api.checkInByDevice();
      if (res.success) {
        setResult(res);
        setStage('success');
      } else {
        setStage('phone_input');
      }
    } catch (err) {
      // 401 or no device cookie
      setStage('phone_input');
    }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.checkInByPhone(phone);
      if (res.success) {
        if (res.isNew) {
          // Member not found in database, prompt to register
          setPhone(res.phone || phone);
          setStage('register_input');
        } else {
          // Member recognized & checked in!
          setResult(res);
          setStage('success');
        }
      }
    } catch (err) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.registerAndCheckIn({
        phone,
        name: name.trim(),
        company: company.trim(),
        category: category.trim(),
      });

      if (res.success) {
        setResult(res);
        setStage('success');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStage('phone_input');
    setResult(null);
    setPhone('');
    setName('');
    setCompany('');
    setCategory('');
    setError('');
  }

  async function handleForgetDevice() {
    try {
      await api.forgetDevice();
    } catch (e) {
      // ignore
    }
    handleReset();
  }

  return (
    <div className="min-h-screen flex flex-col bg-bni-cream selection:bg-bni-red selection:text-white">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        {/* TOP BADGE */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-bni-gold/40 text-bni-charcoal shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-bni-gold" />
            <span>Weekly Chapter Meeting Attendance</span>
          </span>
        </div>

        {/* 1. AUTO DEVICE CHECKING STATE */}
        {stage === 'checking' && (
          <div className="w-full bg-white rounded-3xl p-6 shadow-card border border-bni-gold/20 text-center">
            <Preloader text="Recognizing your device..." />
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {stage === 'success' && result && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30 text-center animate-scale-in">
            <SuccessCheckmark isLate={result.status === 'late'} />

            {result.alreadyMarked && (
              <div className="mb-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
                <CheckCircle className="w-3.5 h-3.5 text-stone-500" />
                <span>You were already marked today</span>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-bni-charcoal mt-1">
              Welcome, {result.member?.name}!
            </h2>

            {result.member?.company && (
              <p className="text-sm font-medium text-bni-gold-dark mt-0.5">
                {result.member.company}
                {result.member.category ? ` • ${result.member.category}` : ''}
              </p>
            )}

            <div className="my-6 p-4 rounded-2xl bg-bni-cream/80 border border-bni-gold/20 flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">
                  Check-in Time
                </p>
                <p className="text-lg font-bold text-bni-charcoal">
                  {result.checkInTimeFormatted || new Date(result.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <StatusBadge status={result.status} size="md" />
              </div>
            </div>

            <div className="pt-2 text-xs text-stone-400 font-medium">
              Device linked securely for future one-scan check-ins.
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleReset}
                className="w-full py-3.5 px-4 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors text-sm flex items-center justify-center space-x-2 shadow-2xs"
              >
                <RefreshCw className="w-4 h-4 text-bni-gold" />
                <span>Mark for another member</span>
              </button>

              <button
                onClick={handleForgetDevice}
                className="w-full py-2 px-3 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium flex items-center justify-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Not {result.member?.name}? Switch phone / Unlink device</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. PHONE NUMBER INPUT STATE */}
        {stage === 'phone_input' && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-bni-red-light text-bni-red rounded-2xl flex items-center justify-center mx-auto mb-3 border border-bni-red/20 shadow-xs">
                <Phone className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-bni-charcoal">
                Enter Your Phone
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Enter your registered 10-digit mobile number to mark today's attendance.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-medium text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="98401 23456"
                    maxLength={14}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    autoFocus
                    className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-lg font-medium text-bni-charcoal outline-none transition-all tracking-wider placeholder:text-stone-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white font-bold text-base shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Checking...</span>
                ) : (
                  <>
                    <span>Confirm & Mark Attendance</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-stone-100 text-center">
              <Link
                to="/find"
                className="text-xs sm:text-sm font-semibold text-bni-gold-dark hover:text-bni-charcoal transition-colors inline-flex items-center space-x-1"
              >
                <Search className="w-4 h-4 text-bni-gold" />
                <span>Can't remember phone? Find your name instead</span>
              </Link>
            </div>
          </div>
        )}

        {/* 4. NEW MEMBER REGISTRATION STATE */}
        {stage === 'register_input' && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-bni-gold-light text-bni-gold-dark rounded-2xl flex items-center justify-center mx-auto mb-3 border border-bni-gold/30">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-bni-charcoal">
                Welcome to Jubilant!
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Your phone is new to our chapter. Please enter your name to register and mark attendance.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-bni-red">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-sm font-medium text-bni-charcoal outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 text-sm font-medium outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Company / Firm Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Chartered Accountants"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-sm font-medium text-bni-charcoal outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Business Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chartered Accountant"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-sm font-medium text-bni-charcoal outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white font-bold text-base shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <button
              onClick={() => setStage('phone_input')}
              className="mt-4 w-full text-center text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors py-1"
            >
              ← Back to phone entry
            </button>
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-center text-xs text-stone-400 border-t border-stone-200/50">
        <p>BNI Jubilant Chapter · Chennai CBD A · Weekly Meeting at 8:00 AM IST</p>
      </footer>
    </div>
  );
}
