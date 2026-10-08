import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  ShieldCheck,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Shield,
  Trash2,
  Lock,
  User,
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ChapterQRCodeModal from '../components/ChapterQRCodeModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminSettings() {
  const { admin: currentAdmin } = useAuth();

  const [chapterName, setChapterName] = useState('BNI Jubilant – Chennai CBD A');
  const [defaultStartTime, setDefaultStartTime] = useState('08:00');
  const [graceMinutes, setGraceMinutes] = useState(0);
  const [requirePhoneLast4OnSearch, setRequirePhoneLast4OnSearch] = useState(true);
  const [qrKey, setQrKey] = useState('');
  const [qrRotatedAt, setQrRotatedAt] = useState(null);
  const [qrSecurityEnabled, setQrSecurityEnabled] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Admin users list
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [adminFormSubmitting, setAdminFormSubmitting] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSettings();
    loadAdmins();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setChapterName(res.settings.chapterName || 'BNI Jubilant – Chennai CBD A');
        setDefaultStartTime(res.settings.defaultStartTime || '08:00');
        setGraceMinutes(res.settings.graceMinutes ?? 0);
        setRequirePhoneLast4OnSearch(res.settings.requirePhoneLast4OnSearch ?? true);
        setQrKey(res.settings.qrKey || 'bni-jubilant-official');
        setQrRotatedAt(res.settings.qrRotatedAt ? new Date(res.settings.qrRotatedAt) : null);
        setQrSecurityEnabled(res.settings.qrSecurityEnabled ?? true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmins() {
    try {
      setLoadingAdmins(true);
      const res = await api.getAdmins();
      if (res.success && res.admins) {
        setAdmins(res.admins);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      const res = await api.updateSettings({
        chapterName,
        defaultStartTime,
        graceMinutes: Number(graceMinutes),
        requirePhoneLast4OnSearch,
      });
      setMessage('Chapter settings saved successfully.');
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateQr() {
    try {
      setRegeneratingQr(true);
      setShowRegenConfirm(false);
      const res = await api.regenerateQrKey();
      if (res?.success && res.settings) {
        setQrKey(res.settings.qrKey);
        setQrRotatedAt(new Date(res.settings.qrRotatedAt || Date.now()));
        setMessage('New Chapter QR Link generated! Previous QR links and photos are now invalid.');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to regenerate QR code');
    } finally {
      setRegeneratingQr(false);
    }
  }

  function handleCopyQrLink() {
    const fullLink = `${window.location.origin}/?qr=${encodeURIComponent(qrKey || '')}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setAdminFormSubmitting(true);
    setAdminActionError('');

    try {
      const res = await api.createAdmin({
        username: newAdminUsername.trim(),
        password: newAdminPassword,
        name: newAdminName.trim(),
      });

      if (res.success) {
        setIsAddAdminOpen(false);
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminName('');
        setMessage(res.message || 'Admin account created.');
        setTimeout(() => setMessage(''), 3500);
        await loadAdmins();
      }
    } catch (err) {
      setAdminActionError(err.message || 'Failed to create admin.');
    } finally {
      setAdminFormSubmitting(false);
    }
  }

  async function handleDeleteAdmin(adminToDelete) {
    if (!window.confirm(`Are you sure you want to remove admin "${adminToDelete.username}"?`)) {
      return;
    }

    try {
      const res = await api.deleteAdmin(adminToDelete._id);
      setMessage(res.message || 'Admin removed.');
      setTimeout(() => setMessage(''), 3500);
      await loadAdmins();
    } catch (err) {
      alert(err.message || 'Failed to delete admin');
    }
  }

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading chapter configuration..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-heading text-bni-charcoal">
          Chapter & Meeting Settings
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Configure meeting timing rules, grace periods, check-in security, and admin accounts
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center space-x-2 animate-scale-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Chapter & Meeting Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-stone-200 space-y-6">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="text-lg font-bold font-heading text-bni-charcoal flex items-center space-x-2">
            <Building className="w-5 h-5 text-bni-gold" />
            <span>Meeting Configuration</span>
          </h3>
        </div>

        {/* Chapter Name */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
            Chapter Title
          </label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm font-medium text-bni-charcoal outline-none focus:border-bni-red"
            />
          </div>
        </div>

        {/* Expected Member Login Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Expected Member Login Time (Default: 8:00 AM)
            </label>
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-bni-gold/15 text-bni-gold-dark border border-bni-gold/30">
              {(() => {
                if (!defaultStartTime || !defaultStartTime.includes(':')) return '8:00 AM';
                const [h, m] = defaultStartTime.split(':').map(Number);
                const period = h >= 12 ? 'PM' : 'AM';
                const displayH = h % 12 || 12;
                return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
              })()}
            </span>
          </div>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="time"
              value={defaultStartTime}
              onChange={(e) => setDefaultStartTime(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 text-sm font-semibold text-bni-charcoal outline-none focus:border-bni-red"
            />
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
            Baseline expected time for chapter meetings. When members log in, their actual arrival time is dynamically compared against this configured time to show early, on-time, or late arrival messages.
          </p>
        </div>

        {/* Grace Minutes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
            Grace Period (Minutes)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={graceMinutes}
            onChange={(e) => setGraceMinutes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-medium text-bni-charcoal outline-none focus:border-bni-red"
          />
          <p className="text-[11px] text-stone-400 mt-1">
            Additional buffer time before check-ins are classified as Late. (0 = strict start time).
          </p>
        </div>

        {/* Require Phone Last 4 Digits on Search */}
        <div className="pt-2 border-t border-stone-100">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requirePhoneLast4OnSearch}
              onChange={(e) => setRequirePhoneLast4OnSearch(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-stone-300 text-bni-red focus:ring-bni-red"
            />
            <div>
              <span className="text-sm font-bold text-bni-charcoal flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-bni-gold" />
                <span>Require Last 4 Digits of Phone on Search</span>
              </span>
              <p className="text-xs text-stone-500 mt-0.5">
                When a member uses the "Pick your name" search page, prompt them to verify the last 4 digits of their phone to prevent false check-ins.
              </p>
            </div>
          </label>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* 2. Attendance QR Code Link & Security Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-stone-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold font-heading text-bni-charcoal flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-bni-gold" />
              <span>Attendance QR Link & Security</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Change the QR link so saved photos of previous QR codes immediately stop working
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white text-xs font-bold transition-all shadow-xs"
            >
              <QrCode className="w-4 h-4" />
              <span>Preview & Print QR</span>
            </button>
          </div>
        </div>

        {/* Live QR Link Display */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider block">
                Active QR Attendance URL
              </span>
              <p className="text-xs text-stone-500">
                The URL encoded inside the chapter meeting QR code.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyQrLink}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-bni-charcoal text-xs font-bold transition-colors shadow-2xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <a
                href={`${window.location.origin}/?qr=${encodeURIComponent(qrKey || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200 font-mono text-xs text-bni-charcoal break-all flex items-center justify-between">
            <span>{`${window.location.origin}/?qr=${qrKey || ''}`}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-sans font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 ml-2">
              Active
            </span>
          </div>

          {qrRotatedAt && (
            <p className="text-[11px] text-stone-500">
              Last rotated: <span className="font-semibold text-stone-700">{qrRotatedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {qrRotatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          )}
        </div>

        {/* Change QR Code Button & Security Info */}
        <div className="pt-2 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Photo Anti-Cheating Protection
                </h4>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed max-w-md">
                The chapter QR code remains permanent and never changes automatically. It changes only when you explicitly click and confirm below.
              </p>
            </div>

            {!showRegenConfirm && (
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change / Regenerate QR Link</span>
              </button>
            )}
          </div>

          {showRegenConfirm && (
            <div className="pt-2 border-t border-amber-200 text-left space-y-2 animate-scale-in">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                  Are you sure you want to change the QR code? Any printed codes or saved photos of the current QR code will stop working immediately.
                </p>
              </div>
              <div className="flex items-center space-x-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateQr}
                  disabled={regeneratingQr}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingQr ? 'animate-spin' : ''}`} />
                  <span>{regeneratingQr ? 'Rotating...' : 'Yes, Invalidate Old QR & Change'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Admin Accounts Management Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-stone-200 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-bni-charcoal flex items-center space-x-2">
              <Shield className="w-5 h-5 text-bni-gold" />
              <span>Chapter Administrators</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Authorized logins with access to attendance reports and chapter records
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewAdminUsername('');
              setNewAdminPassword('');
              setNewAdminName('');
              setAdminActionError('');
              setIsAddAdminOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-bni-charcoal hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-bni-gold" />
            <span>Create Admin</span>
          </button>
        </div>

        {loadingAdmins ? (
          <LoadingSpinner size="sm" text="Loading admin accounts..." />
        ) : admins.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">No admins listed.</p>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
            {admins.map((adm) => (
              <div
                key={adm._id}
                className="p-4 flex items-center justify-between hover:bg-stone-50/60 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-bni-gold-light text-bni-gold-dark font-bold text-sm flex items-center justify-center border border-bni-gold/30">
                    {adm.name ? adm.name.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-sm text-bni-charcoal">{adm.name || 'Chapter Admin'}</p>
                      {currentAdmin?.username === adm.username && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 font-mono">@{adm.username}</p>
                  </div>
                </div>

                <div>
                  {currentAdmin?.username !== adm.username && admins.length > 1 && (
                    <button
                      onClick={() => handleDeleteAdmin(adm)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        title="Create Chapter Admin"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <p className="text-xs text-stone-500">
            Create a new authorized login credential for chapter directors or attendance coordinators.
          </p>

          {adminActionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {adminActionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Admin Name / Role <span className="text-bni-red">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="e.g. Attendance Coordinator"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Username <span className="text-bni-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. coordinator"
              value={newAdminUsername}
              onChange={(e) => setNewAdminUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Password <span className="text-bni-red">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showNewAdminPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
              />
              <button
                type="button"
                onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
              >
                {showNewAdminPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAddAdminOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adminFormSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white text-xs font-bold shadow hover:bg-bni-red-dark disabled:opacity-50"
            >
              {adminFormSubmitting ? 'Creating...' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Chapter Official QR Modal */}
      <ChapterQRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onQrUpdated={(newSettings) => {
          setQrKey(newSettings.qrKey);
          setQrRotatedAt(new Date(newSettings.qrRotatedAt || Date.now()));
        }}
      />
    </div>
  );
}
