import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, ExternalLink, Sparkles, Smartphone } from 'lucide-react';
import Modal from './Modal';
import bniLogo from '../assests/BNI_Jubilant_Chennai_CBD_logo.png';

export default function ChapterQRCodeModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef(null);

  const scanUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

  useEffect(() => {
    if (!isOpen) return;

    // Generate high-resolution QR Code
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
  }, [isOpen, scanUrl]);

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
    a.download = 'BNI_Jubilant_Official_Attendance_QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Chapter QR Code">
      <div className="space-y-5 text-center">
        <p className="text-xs sm:text-sm text-stone-500">
          Members scan this QR code once to mark attendance. Returning members are recognized automatically on the same device.
        </p>

        {/* QR Code Container with BNI Card frame */}
        <div className="p-6 bg-gradient-to-b from-bni-cream to-white rounded-2xl border border-bni-gold/30 shadow-card flex flex-col items-center justify-center">
          <div className="w-16 h-10 mb-2 flex items-center justify-center">
            <img src={bniLogo} alt="BNI Jubilant" className="max-h-full max-w-full object-contain" />
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-bni-charcoal mb-3">
            BNI Jubilant · Chapter Attendance
          </h4>

          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200">
              <img
                src={qrDataUrl}
                alt="BNI Attendance QR Code"
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-stone-400 text-xs">
              Generating high-res QR code...
            </div>
          )}

          <div className="mt-3 flex items-center space-x-1 text-[11px] font-mono text-stone-500 bg-white/80 px-3 py-1 rounded-full border border-stone-200">
            <Smartphone className="w-3.5 h-3.5 text-bni-gold" />
            <span>{scanUrl}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
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

        <p className="text-[11px] text-stone-400">
          Tip: Download and print this QR code for meeting registration desks, roll-up banners, and table tents.
        </p>
      </div>
    </Modal>
  );
}
