import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Fuse from 'fuse.js';
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
  Phone,
  Hash,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import SuccessCheckmark from '../components/SuccessCheckmark';
import StatusBadge from '../components/StatusBadge';
import PunctualityToast from '../components/PunctualityToast';
import { SearchResultSkeleton } from '../components/Skeleton';
import { api } from '../services/api';

export default function FindName() {
  const [query, setQuery] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Public settings
  const [publicInfo, setPublicInfo] = useState({
    requirePhoneLast4OnSearch: true,
  });

  // Selected member for check-in modal
  const [selectedMember, setSelectedMember] = useState(null);
  const [phoneLast4, setPhoneLast4] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Success state
  const [checkInResult, setCheckInResult] = useState(null);

  useEffect(() => {
    loadPublicInfoAndMembers();
  }, []);

  async function loadPublicInfoAndMembers() {
    try {
      setInitialLoading(true);
      const [infoRes, membersRes] = await Promise.all([
        api.getPublicInfo().catch(() => null),
        api.searchMembers('__all__').catch(() => null),
      ]);

      if (infoRes?.success) {
        setPublicInfo(infoRes);
      }
      if (membersRes?.success && Array.isArray(membersRes.results)) {
        setAllMembers(membersRes.results);
      }
    } catch (e) {
      console.error('Error loading members:', e);
    } finally {
      setInitialLoading(false);
    }
  }

  // Setup Fuse.js index for instantaneous client-side search
  const fuse = useMemo(() => {
    return new Fuse(allMembers, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'last4', weight: 0.3 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [allMembers]);

  // Compute matched results instantly from memory
  const results = useMemo(() => {
    const q = query.trim();
    if (!q || q.length < 1) return [];

    // If numbers entered (like last 4 digits)
    const digitsOnly = q.replace(/\D/g, '');
    if (digitsOnly.length >= 2) {
      const phoneMatches = allMembers.filter(
        (m) => m.last4?.includes(digitsOnly) || m.maskedPhone?.includes(digitsOnly)
      );
      if (phoneMatches.length > 0) return phoneMatches.slice(0, 10);
    }

    if (fuse && allMembers.length > 0) {
      const fuseResults = fuse.search(q);
      return fuseResults.slice(0, 10).map((r) => r.item);
    }

    // Fallback simple filter
    const lower = q.toLowerCase();
    return allMembers
      .filter((m) => m.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [query, fuse, allMembers]);

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
  }

  return (
    <div className="min-h-screen flex flex-col bg-bni-cream selection:bg-bni-red selection:text-white">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        {/* Navigation back */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-600 hover:text-bni-red transition-colors py-1.5 px-3 rounded-lg hover:bg-stone-100/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scan Page</span>
          </Link>
        </div>

        {/* If Check-in succeeded */}
        {checkInResult ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30 text-center animate-scale-in">
            {checkInResult.punctualityMessage && (
              <PunctualityToast
                message={checkInResult.punctualityMessage}
                punctuality={checkInResult.punctuality}
                memberName={checkInResult.member?.name}
              />
            )}

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

            {/* Polite arrival message banner */}
            {checkInResult.punctualityMessage && (
              <div
                className={`mt-4 p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-start space-x-2.5 transition-all text-left ${
                  checkInResult.punctuality === 'late'
                    ? 'bg-amber-50/90 border border-amber-200/80 text-amber-900'
                    : 'bg-emerald-50/90 border border-emerald-200/80 text-emerald-900'
                }`}
              >
                {checkInResult.punctuality === 'early' && (
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {checkInResult.punctuality === 'on_time' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {checkInResult.punctuality === 'late' && (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{checkInResult.punctualityMessage}</span>
              </div>
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
                  Search by member name or last 4 digits of phone.
                </p>
              </div>

              {/* Fast Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bni-gold" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh or 2345..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-base font-medium text-bni-charcoal outline-none transition-all placeholder:text-stone-300 shadow-2xs"
                />
              </div>
            </div>

            {/* Skeleton Loading while fetching directory */}
            {initialLoading && <SearchResultSkeleton count={3} />}

            {/* Results List */}
            {!initialLoading && query.trim().length >= 1 && results.length === 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 text-center animate-scale-in">
                <p className="text-sm font-semibold text-stone-700">No member found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Could not find "{query}". Try searching by first name or phone digits.
                </p>
                <Link
                  to="/"
                  className="mt-3 inline-block text-xs font-semibold text-bni-red hover:underline"
                >
                  Register with your phone number →
                </Link>
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card border border-stone-200 divide-y divide-stone-100 overflow-hidden animate-scale-in">
                <div className="px-4 py-2.5 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Select your name to check in</span>
                  <span className="text-bni-gold-dark font-mono font-semibold">{results.length} found</span>
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
                      <div className="flex items-center space-x-2 text-xs text-stone-500 mt-0.5 font-medium">
                        {member.maskedPhone && (
                          <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                            {member.maskedPhone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-bni-red-light text-bni-red group-hover:bg-bni-red group-hover:text-white transition-all shadow-xs">
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
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="• • • •"
                      value={phoneLast4}
                      onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoFocus
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-center tracking-widest text-lg font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                    >
                      {showPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
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
