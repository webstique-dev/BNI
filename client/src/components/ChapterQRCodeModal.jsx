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
    <Modal isOpen={isOpen} onClose={onClose} title="Official Chapter Attendance QR Code">
      <div className="space-y-4 text-center">
        <p className="text-xs sm:text-sm text-stone-500">
          Members scan this QR code once to mark attendance. Rotating the link disables previously saved QR photos.
        </p>

        {statusMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center space-x-2 animate-scale-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* QR Code Container with BNI Card frame */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-bni-cream to-white rounded-2xl border border-bni-gold/30 shadow-card flex flex-col items-center justify-center relative">
          <div className="w-16 h-10 mb-2 flex items-center justify-center">
            <img src={bniLogo} alt="BNI Logo" className="max-h-full max-w-full object-contain" />
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-bni-charcoal mb-3">
            {chapterName} · Attendance
          </h4>

          {loading || !qrDataUrl ? (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
              Generating active QR code...
            </div>
          ) : (
            <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200">
              <img
                src={qrDataUrl}
                alt="BNI Attendance QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
              />
            </div>
          )}

          <div className="mt-3 flex items-center space-x-1.5 text-[11px] font-mono text-stone-600 bg-white/90 px-3.5 py-1.5 rounded-full border border-stone-200 max-w-full overflow-hidden truncate">
            <Smartphone className="w-3.5 h-3.5 text-bni-gold shrink-0" />
            <span className="truncate">{scanUrl}</span>
          </div>

          {rotatedAt && (
            <p className="text-[10px] text-stone-400 mt-2">
              Active Key: <span className="font-mono font-semibold text-stone-600">{qrKey}</span> · Rotated: {rotatedAt.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {rotatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Rotation confirmation or Trigger */}
        {showRegenConfirm ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-3 animate-scale-in">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Are you sure you want to rotate the QR Link?
                </p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  All previously printed copies and saved photos of the old QR code will immediately stop working. Members must scan this newly generated QR code.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateQr}
                disabled={regenerating}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{regenerating ? 'Rotating...' : 'Yes, Invalidate Old QR & Rotate'}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRegenConfirm(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-stone-700 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-bni-gold" />
            <span>Change / Regenerate QR Link (Invalidate Old Photos)</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!qrKey}
            className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-bni-charcoal text-xs sm:text-sm font-bold border border-stone-300 transition-all flex items-center justify-center space-x-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-600" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center space-x-2 pt-1">
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-bni-gold-dark hover:text-bni-charcoal flex items-center space-x-1 underline"
          >
            <span>Open & Test Active QR Landing Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
}

