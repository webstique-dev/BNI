import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import Modal from './Modal';
import bniLogo from '../assests/BNI_Jubilant_Chennai_CBD_logo.png';
import { api } from '../services/api';

export default function ChapterQRCodeModal({ isOpen, onClose, onQrUpdated }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrKey, setQrKey] = useState('');
  const [rotatedAt, setRotatedAt] = useState(null);
  const [chapterName, setChapterName] = useState('BNI Jubilant – Chennai CBD A');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const scanUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?qr=${encodeURIComponent(qrKey || '')}`
      : `/?qr=${qrKey || ''}`;

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    } else {
      setShowRegenConfirm(false);
      setStatusMessage('');
    }
  }, [isOpen]);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res?.success && res.settings) {
        setQrKey(res.settings.qrKey || '');
        setRotatedAt(res.settings.qrRotatedAt ? new Date(res.settings.qrRotatedAt) : null);
        if (res.settings.chapterName) setChapterName(res.settings.chapterName);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !qrKey) return;

    QRCode.toDataURL(scanUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#1C1917',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [isOpen, scanUrl, qrKey]);

  async function handleRegenerateQr() {
    try {
      setRegenerating(true);
      setShowRegenConfirm(false);
      const res = await api.regenerateQrKey();
      if (res?.success && res.settings) {
        setQrKey(res.settings.qrKey);
        setRotatedAt(new Date(res.settings.qrRotatedAt || Date.now()));
        setStatusMessage('New QR code generated! All previously saved photos of old QR codes are now invalid.');
        setTimeout(() => setStatusMessage(''), 5000);
        if (typeof onQrUpdated === 'function') {
          onQrUpdated(res.settings);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to regenerate QR code.');
    } finally {
      setRegenerating(false);
    }
  }

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `BNI_Attendance_QR_${qrKey || 'chapter'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Chapter Attendance QR Code"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {statusMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2 animate-scale-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 2-Column Horizontal Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* LEFT: QR Code Card */}
          <div className="p-5 bg-gradient-to-b from-bni-cream to-white rounded-2xl border border-bni-gold/30 shadow-card flex flex-col items-center justify-between text-center">
            <div className="w-full flex flex-col items-center">
              <div className="w-14 h-9 mb-1.5 flex items-center justify-center">
                <img src={bniLogo} alt="BNI Logo" className="max-h-full max-w-full object-contain" />
              </div>

              <h4 className="text-[11px] font-bold uppercase tracking-wider text-bni-charcoal mb-2.5">
                {chapterName} · Attendance
              </h4>

              {loading || !qrDataUrl ? (
                <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                  Generating active QR code...
                </div>
              ) : (
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-stone-200">
                  <img
                    src={qrDataUrl}
                    alt="BNI Attendance QR Code"
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="w-full mt-3 space-y-1.5">
              <div className="flex items-center justify-center space-x-1 text-[11px] font-mono text-stone-600 bg-white/95 px-3 py-1 rounded-full border border-stone-200 truncate">
                <Smartphone className="w-3.5 h-3.5 text-bni-gold shrink-0" />
                <span className="truncate max-w-[210px]">{scanUrl}</span>
              </div>

              {rotatedAt && (
                <p className="text-[10px] text-stone-400">
                  Active Key: <span className="font-mono font-semibold text-stone-600">{qrKey}</span> · Rotated: {rotatedAt.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {rotatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Actions & Anti-Cheating Controls */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Active Chapter Link</span>
                </span>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  Members scan this QR code once to mark attendance. Returning members are recognized in under a second.
                </p>
              </div>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!qrKey}
                  className="py-2.5 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-bni-charcoal text-xs font-bold border border-stone-300 transition-all flex items-center justify-center space-x-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-600" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-0.5">
                <a
                  href={scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-bni-gold-dark hover:text-bni-charcoal inline-flex items-center space-x-1 underline"
                >
                  <span>Open & Test Active QR Landing Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Anti-Cheating & Invalidation Section */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-left space-y-2.5">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Photo Anti-Cheating Protection
                </h5>
              </div>

              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                If you change or rotate this QR code, any saved screenshots or photos of old QR codes will be blocked immediately.
              </p>

              {showRegenConfirm ? (
                <div className="pt-2 border-t border-amber-200 space-y-2 animate-scale-in">
                  <div className="flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-amber-900 leading-snug">
                      Are you sure? Old QR photos will stop working immediately.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRegenConfirm(false)}
                      className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateQr}
                      disabled={regenerating}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                      <span>{regenerating ? 'Rotating...' : 'Yes, Rotate'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRegenConfirm(true)}
                  className="w-full py-2 px-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Change / Regenerate QR Link</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-stone-400 text-center">
              Tip: Download and print this QR code for meeting registration desks and table tents.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

