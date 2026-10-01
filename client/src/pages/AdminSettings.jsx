import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  ShieldCheck,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminSettings() {
  const [chapterName, setChapterName] = useState('BNI Jubilant – Chennai CBD A');
  const [defaultStartTime, setDefaultStartTime] = useState('08:00');
  const [graceMinutes, setGraceMinutes] = useState(0);
  const [requirePhoneLast4OnSearch, setRequirePhoneLast4OnSearch] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSettings();
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
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      await api.updateSettings({
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

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Loading chapter configuration..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading text-bni-charcoal">
          Chapter & Meeting Settings
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Configure meeting timing rules, grace periods, and check-in security
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

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-stone-200 space-y-6">
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

        {/* Meeting Start Time */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
            Meeting Start Time (24h format HH:mm IST)
          </label>
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
          <p className="text-[11px] text-stone-400 mt-1">
            Members checking in after this time will be marked as "Late".
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
        <div className="pt-4">
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
    </div>
  );
}
