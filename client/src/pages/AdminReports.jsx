import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import CalendarPicker from '../components/CalendarPicker';
import { StatsSkeleton, TableSkeleton } from '../components/Skeleton';

export default function AdminReports() {
  const getInitialDate = (daysAgo = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [from, setFrom] = useState(getInitialDate(30)); // default last 30 days
  const [to, setTo] = useState(getInitialDate(0));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReports();
  }, [from, to]);

  async function loadReports() {
    try {
      setLoading(true);
      const res = await api.getReports({ from, to });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }

  function setPreset(days) {
    setTo(getInitialDate(0));
    setFrom(getInitialDate(days));
  }

  const reports = data?.reports || [];
  const summary = data?.summary || {
    totalMembers: 0,
    totalMeetings: 0,
    overallRate: 0,
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
  };

  const [exporting, setExporting] = useState(false);

  async function handleExportExcel() {
    setExporting(true);
    try {
      await api.downloadAttendanceExcel({ from, to, type: 'summary' });
    } catch (err) {
      alert(err.message || 'Failed to export Excel report');
    } finally {
      setExporting(false);
    }
  }

  const filteredReports = reports.filter(
    (r) =>
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-bni-charcoal">
            Chapter Attendance Analytics
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Per-member attendance rate, punctuality, and meeting summaries
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white shadow-xs text-xs font-bold transition-all disabled:opacity-50"
          title="Download formatted Excel (.xlsx) report"
        >
          <Download className="w-4 h-4 text-bni-gold" />
          <span>{exporting ? 'Exporting...' : 'Export Analytics Excel'}</span>
        </button>
      </div>

      {/* Date Range Selector & Presets */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-stone-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* React Calendar range pickers */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-stone-700">
            <span className="text-stone-400">Date Range:</span>
            
            <CalendarPicker
              value={from}
              onChange={(newDate) => setFrom(newDate)}
              label="From Date"
            />

            <span className="text-stone-400 font-bold px-1">to</span>

            <CalendarPicker
              value={to}
              onChange={(newDate) => setTo(newDate)}
              label="To Date"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setPreset(0)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setPreset(7)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset(30)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-bni-gold-light text-bni-gold-dark hover:bg-bni-gold/20 transition-colors font-bold"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPreset(90)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              Last 3 Months
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
          <div className="bg-white rounded-2xl p-5 border border-bni-gold/30 shadow-card">
            <p className="text-xs font-semibold text-bni-gold-dark uppercase tracking-wider">
              Overall Attendance Rate
            </p>
            <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
              {summary.overallRate}%
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Across {summary.totalMeetings} meeting(s) in period
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-card">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              On-Time Check-ins
            </p>
            <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
              {summary.totalPresent}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Punctual arrivals
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-card">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Late Check-ins
            </p>
            <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
              {summary.totalLate}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Past grace cutoff
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-card">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Total Absences
            </p>
            <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
              {summary.totalAbsent}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Missed meeting slots
            </p>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white rounded-3xl shadow-card border border-stone-200 overflow-hidden">
        {/* Search header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold font-heading text-bni-charcoal flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-bni-gold" />
            <span>Member Breakdown</span>
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-medium outline-none focus:border-bni-red"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm">
            No member records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Meetings</th>
                  <th className="py-3.5 px-4">On-Time</th>
                  <th className="py-3.5 px-4">Late</th>
                  <th className="py-3.5 px-4">Absent</th>
                  <th className="py-3.5 px-4 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredReports.map((r) => {
                  const pct = r.attendancePercentage || 0;
                  let colorClass = 'bg-emerald-500 text-emerald-700';
                  if (pct < 60) colorClass = 'bg-rose-500 text-rose-700';
                  else if (pct < 85) colorClass = 'bg-amber-500 text-amber-700';

                  return (
                    <tr key={r.memberId} className="hover:bg-bni-cream/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-sm text-bni-charcoal">{r.name}</p>
                        <p className="text-xs text-stone-400">+91 {r.phone}</p>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-stone-700">
                        {r.totalMeetings}
                      </td>

                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                        {r.onTimeCount}
                      </td>

                      <td className="py-3.5 px-4 text-amber-700 font-semibold">
                        {r.lateCount}
                      </td>

                      <td className="py-3.5 px-4 text-rose-700 font-semibold">
                        {r.absentCount}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${colorClass.split(' ')[0]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-10 text-right ${colorClass.split(' ')[1]}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
