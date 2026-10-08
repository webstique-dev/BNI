import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Phone,
  User,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  QrCode,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import Header from '../components/Header';
import SuccessCheckmark from '../components/SuccessCheckmark';
import StatusBadge from '../components/StatusBadge';
import PunctualityToast from '../components/PunctualityToast';
import { Preloader } from '../components/Skeleton';
import { api } from '../services/api';

export default function Home() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Extract possible parameters from QR codes
  const urlPhone = searchParams.get('phone') || searchParams.get('p') || searchParams.get('mobile');
  const urlToken = searchParams.get('token') || searchParams.get('t') || searchParams.get('deviceToken');
  const urlQr = searchParams.get('qr') || searchParams.get('k') || searchParams.get('code');

  const [stage, setStage] = useState('checking'); // 'checking' | 'success' | 'phone_input' | 'register_input' | 'invalid_qr'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrErrorMessage, setQrErrorMessage] = useState('');
  const [publicInfo, setPublicInfo] = useState(null);
  const [activeQrKey, setActiveQrKey] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return (
          urlQr ||
          sessionStorage.getItem('bni_qr_key') ||
          localStorage.getItem('bni_qr_key') ||
          ''
        );
      }
    } catch (e) {}
    return urlQr || '';
  });

  // Data states
  const [result, setResult] = useState(null); // { member, checkInAt, status, alreadyMarked, checkInTimeFormatted, punctuality, punctualityMessage }
  const [phone, setPhone] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return urlPhone || localStorage.getItem('bni_member_phone') || '';
      }
    } catch (e) {}
    return urlPhone || '';
  });
  const [name, setName] = useState('');

  useEffect(() => {
    api.getPublicInfo().then((res) => {
      if (res?.success) setPublicInfo(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // If URL contains QR key, persist it
    if (urlQr && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('bni_qr_key', urlQr);
        localStorage.setItem('bni_qr_key', urlQr);
        setActiveQrKey(urlQr);
      } catch (e) {}
    }

    // If URL contains token, persist it
    if (urlToken && typeof window !== 'undefined') {
      try {
        localStorage.setItem('bni_device_token', urlToken);
      } catch (e) {}
    }

    // First validate QR key with server if QR security is active
    initiateCheckInFlow(urlQr || activeQrKey);
  }, [location.key, urlPhone, urlToken, urlQr]);

  async function initiateCheckInFlow(qrKeyToUse) {
    setStage('checking');
    setError('');
    setQrErrorMessage('');

    const effectiveKey =
      qrKeyToUse ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('bni_qr_key') || localStorage.getItem('bni_qr_key')
        : '');

    try {
      // Validate QR code first
      const valRes = await api.validateQr(effectiveKey);
      if (!valRes?.valid) {
        setQrErrorMessage(
          valRes?.message ||
            'This attendance QR code is invalid or has expired. Please scan the current chapter QR code displayed at the registration desk.'
        );
        setStage('invalid_qr');
        return;
      }
    } catch (err) {
      // If validation explicitly reports invalid QR
      if (err?.data?.invalidQr || err?.status === 403) {
        setQrErrorMessage(
          err.message ||
            'This attendance QR code is invalid or has expired. Please scan the current chapter QR code displayed at the registration desk.'
        );
        setStage('invalid_qr');
        return;
      }
    }

    // If explicit phone is in QR URL, check in with phone immediately
    if (urlPhone) {
      const cleanUrlPhone = urlPhone.replace(/\D/g, '');
      if (cleanUrlPhone.length === 10) {
        checkInDirectlyByPhone(cleanUrlPhone);
        return;
      }
    }

    // Always attempt device recognition on QR scan
    attemptDeviceCheckIn();
  }

  async function checkInDirectlyByPhone(cleanPhone) {
    setStage('checking');
    setLoading(true);
    setError('');
    try {
      const res = await api.checkInByPhone(cleanPhone);
      if (res.success) {
        if (res.isNew) {
          setPhone(res.phone || cleanPhone);
          setStage('register_input');
        } else {
          setResult(res);
          setStage('success');
        }
      } else {
        setStage('phone_input');
      }
    } catch (err) {
      if (err?.data?.invalidQr || err?.status === 403) {
        setQrErrorMessage(err.message);
        setStage('invalid_qr');
      } else {
        setError(err.message || 'Check-in failed');
        setStage('phone_input');
      }
    } finally {
      setLoading(false);
    }
  }

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
      if (err?.data?.invalidQr || err?.status === 403) {
        setQrErrorMessage(err.message);
        setStage('invalid_qr');
      } else {
        // 401 or unrecognized device -> prompt for phone
        setStage('phone_input');
      }
    }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.checkInByPhone(cleanPhone);
      if (res.success) {
        if (res.isNew) {
          // Member not found in database, prompt to register
          setPhone(res.phone || cleanPhone);
          setStage('register_input');
        } else {
          // Member recognized & checked in!
          setResult(res);
          setStage('success');
        }
      }
    } catch (err) {
      if (err?.data?.invalidQr || err?.status === 403) {
        setQrErrorMessage(err.message);
        setStage('invalid_qr');
      } else {
        setError(err.message || 'Check-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.registerAndCheckIn({
        phone: cleanPhone,
        name: trimmedName,
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
        {/* <div className="mb-6 text-center">
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-bni-gold/40 text-bni-charcoal shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-bni-gold" />
            <span>Weekly Chapter Meeting Attendance</span>
          </span>
        </div> */}

        {/* 1. AUTO DEVICE CHECKING STATE */}
        {stage === 'checking' && (
          <div className="w-full bg-white rounded-3xl p-6 shadow-card border border-bni-gold/20 text-center">
            <Preloader text="Recognizing your device..." />
          </div>
        )}

        {/* 1.5. INVALID / EXPIRED QR CODE STATE */}
        {stage === 'invalid_qr' && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-rose-200 text-center animate-scale-in">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-heading font-bold text-bni-charcoal">
              Scan Official Chapter QR
            </h2>

            <div className="my-4 p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-left space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-rose-900 leading-relaxed">
                {qrErrorMessage ||
                  'This attendance QR code is invalid or has expired. Saved photos of old QR codes no longer work.'}
              </p>
              <p className="text-xs text-rose-800/90 leading-relaxed">
                To mark your attendance, please scan the current official chapter QR code displayed on the registration desk or banner in the meeting hall.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-bni-charcoal hover:bg-stone-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 text-bni-gold" />
                <span>Retry / Refresh Page</span>
              </button>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-stone-400">
                  {publicInfo?.chapterName || 'BNI Jubilant Chapter'} · Dynamic QR Security
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {stage === 'success' && result && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-bni-gold/30 text-center animate-scale-in">
            {result.punctualityMessage && (
              <PunctualityToast
                message={result.punctualityMessage}
                punctuality={result.punctuality}
                memberName={result.member?.name}
              />
            )}

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

            {/* Polite arrival message banner */}
            {result.punctualityMessage && (
              <div
                className={`mt-4 p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-start space-x-2.5 transition-all text-left ${
                  result.punctuality === 'late'
                    ? 'bg-amber-50/90 border border-amber-200/80 text-amber-900'
                    : 'bg-emerald-50/90 border border-emerald-200/80 text-emerald-900'
                }`}
              >
                {result.punctuality === 'early' && (
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {result.punctuality === 'on_time' && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {result.punctuality === 'late' && (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{result.punctualityMessage}</span>
              </div>
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

            <div className="mt-6">
              <button
                onClick={handleForgetDevice}
                className="w-full py-2.5 px-3 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-xl transition-colors text-xs font-medium flex items-center justify-center space-x-1.5"
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
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-semibold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="9840123456"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      setError('');
                    }}
                    autoFocus
                    className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-lg font-semibold text-bni-charcoal outline-none transition-all tracking-wider placeholder:text-stone-300"
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
                to={`/find${activeQrKey ? `?qr=${encodeURIComponent(activeQrKey)}` : ''}`}
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

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-bni-red">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-300 focus:border-bni-red focus:ring-2 focus:ring-bni-red/20 text-sm font-medium text-bni-charcoal outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={`+91 ${phone}`}
                  disabled
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 text-sm font-semibold outline-none cursor-not-allowed tracking-wider"
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
        <p>
          {publicInfo?.chapterName || 'BNI Jubilant Chapter · Chennai CBD A'} · Weekly Meeting at{' '}
          {(() => {
            const timeStr = publicInfo?.defaultStartTime || '08:00';
            const [h, m] = timeStr.split(':').map(Number);
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
          })()}{' '}
          IST
        </p>
      </footer>
    </div>
  );
}
