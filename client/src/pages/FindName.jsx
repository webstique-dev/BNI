import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  KeyRound,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import SuccessCheckmark from '../components/SuccessCheckmark';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../services/api';

export default function FindName() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Public settings (e.g. requirePhoneLast4)
  const [publicInfo, setPublicInfo] = useState({
    requirePhoneLast4OnSearch: true,
  });

  // Selected member for check-in modal
  const [selectedMember, setSelectedMember] = useState(null);
  const [phoneLast4, setPhoneLast4] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Success state
  const [checkInResult, setCheckInResult] = useState(null);

  useEffect(() => {
    loadPublicInfo();
  }, []);

  async function loadPublicInfo() {
    try {
      const res = await api.getPublicInfo();
      if (res.success) {
        setPublicInfo(res);
      }
    } catch (e) {
      // ignore
    }
  }

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const res = await api.searchMembers(query.trim());
        if (res.success) {
          setResults(res.results || []);
        }
      } catch (err) {
        setSearchError(err.message || 'Error searching members.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelectMember(member) {
    setSelectedMember(member);
    setPhoneLast4('');
    setModalError('');
  }

  async function handleConfirmCheckIn(e) {
    e.preventDefault();
    if (!selectedMember) return;

    if (publicInfo.requirePhoneLast4OnSearch) {
      if (!phoneLast4 || phoneLast4.trim().length !== 4) {
        setModalError('Please enter the last 4 digits of your phone number.');
        return;
      }
    }

    setSubmitting(true);
    setModalError('');
    try {
      const res = await api.checkInBySearch({
        memberId: selectedMember.id,
        phoneLast4: phoneLast4.trim(),
        rememberDevice,
      });

      if (res.success) {
        setCheckInResult(res);
        setSelectedMember(null);
      }
    } catch (err) {
      setModalError(err.message || 'Check-in failed. Please check the last 4 digits.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setCheckInResult(null);
    setQuery('');
    setResults([]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-bni-cream selection:bg-bni-red selection:text-white">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        {/* Navigation back */}
        <div className="mb-4">
          <Link
            to="/?mode=manual"
            state={{ manual: true }}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-600 hover:text-bni-red transition-colors py-1.5 px-3 rounded-lg hover:bg-stone-100/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scan Page</span>
          </Link>
        </div>

        {/* If Check-in succeeded */}
        {checkInResult ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30 text-center animate-scale-in">
            <SuccessCheckmark isLate={checkInResult.status === 'late'} />

            {checkInResult.alreadyMarked && (
              <div className="mb-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                <span>You were already marked today</span>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-bni-charcoal mt-1">
              Welcome, {checkInResult.member?.name}!
            </h2>

            {checkInResult.member?.company && (
              <p className="text-sm font-medium text-bni-gold-dark mt-0.5">
                {checkInResult.member.company}
              </p>
            )}

            <div className="my-6 p-4 rounded-2xl bg-bni-cream/80 border border-bni-gold/20 flex items-center justify-between">
              <div className="text-left">
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">
                  Check-in Time
                </p>
                <p className="text-lg font-bold text-bni-charcoal">
                  {checkInResult.checkInTimeFormatted || new Date(checkInResult.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <StatusBadge status={checkInResult.status} size="md" />
              </div>
            </div>

            {rememberDevice && (
              <p className="text-xs text-stone-400 font-medium">
                ✨ Device remembered! Next week you will be recognized automatically.
              </p>
            )}

            <button
              onClick={handleReset}
              className="mt-6 w-full py-3.5 px-4 rounded-xl bg-bni-charcoal hover:bg-stone-800 text-white font-semibold text-sm transition-colors"
            >
              Search another member
            </button>
          </div>
        ) : (
          /* Search Interface */
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-card border border-bni-gold/30">
              <div className="mb-4">
                <h2 className="text-2xl font-heading font-bold text-bni-charcoal">
                  Find Your Name
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                  Type at least 2 characters to search chapter members.
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-base font-medium text-bni-charcoal outline-none transition-all placeholder:text-stone-300"
                />
              </div>
            </div>

            {/* Results List */}
            {searching && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 text-center">
                <LoadingSpinner size="sm" text="Searching chapter roster..." />
              </div>
            )}

            {searchError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 text-center">
                <p className="text-sm font-semibold text-stone-700">No member found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Could not find "{query}". Try searching by first name or check your spelling.
                </p>
                <Link
                  to="/?mode=manual"
                  state={{ manual: true }}
                  className="mt-3 inline-block text-xs font-semibold text-bni-red hover:underline"
                >
                  Register with your phone number →
                </Link>
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Select your name to check in
                </div>
                {results.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-bni-cream/80 transition-colors group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-bni-charcoal group-hover:text-bni-red transition-colors">
                        {member.name}
                      </h4>
                      {member.company && (
                        <p className="text-xs text-stone-500 mt-0.5 font-medium">
                          {member.company}
                          {member.category ? ` • ${member.category}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-bni-red-light text-bni-red group-hover:bg-bni-red group-hover:text-white transition-all">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title="Confirm Attendance"
        >
          {selectedMember && (
            <form onSubmit={handleConfirmCheckIn} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-bni-cream border border-bni-gold/30 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-bni-red text-white flex items-center justify-center font-bold text-sm">
                  {selectedMember.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-bni-charcoal">
                    {selectedMember.name}
                  </h4>
                  {selectedMember.company && (
                    <p className="text-xs text-stone-500">{selectedMember.company}</p>
                  )}
                </div>
              </div>

              {publicInfo.requirePhoneLast4OnSearch && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Last 4 Digits of Mobile Number <span className="text-bni-red">*</span>
                  </label>
                  <p className="text-[11px] text-stone-500 mb-1.5">
                    For security verification, enter the last 4 digits of your registered phone.
                  </p>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="• • • •"
                      value={phoneLast4}
                      onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-center tracking-widest text-lg font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Remember this device checkbox */}
              <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-bni-red focus:ring-bni-red"
                />
                <span className="text-xs text-stone-600">
                  <strong className="text-bni-charcoal font-semibold">Remember this phone</strong>
                  <span className="block text-stone-400">
                    One-scan automatic check-in next time you scan the QR code.
                  </span>
                </span>
              </label>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="w-1/3 py-3 px-3 rounded-xl border border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Marking...' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </main>
    </div>
  );
}
