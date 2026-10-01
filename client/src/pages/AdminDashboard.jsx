import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Download,
  RefreshCw,
  Search,
  UserPlus,
  Trash2,
  Check,
  AlertCircle,
  CalendarDays,
  QrCode,
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CalendarPicker from '../components/CalendarPicker';
import ChapterQRCodeModal from '../components/ChapterQRCodeModal';
import { StatsSkeleton, TableSkeleton } from '../components/Skeleton';

export default function AdminDashboard() {
  // Today's date in local Asia/Kolkata or user date
  const getInitialDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getInitialDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'present' | 'late' | 'absent'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const autoRefreshTimerRef = useRef(null);

  useEffect(() => {
    loadAttendance(date);

    // Auto-refresh every 15s
    autoRefreshTimerRef.current = setInterval(() => {
      loadAttendance(date, true);
    }, 15000);

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [date]);

  async function loadAttendance(targetDate, isBackground = false) {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.getAttendance(targetDate);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleMarkManual(memberId, status = 'present') {
    setActionLoading((prev) => ({ ...prev, [memberId]: true }));
    setMessage('');
    try {
      await api.markManualAttendance({
        memberId,
        date,
        status,
        notes: 'Marked manually by admin',
      });
      await loadAttendance(date, true);
      setMessage('Attendance updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update attendance');
    } finally {
      setActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  }

  async function handleDeleteAttendance(attendanceId, memberId) {
    if (!window.confirm('Are you sure you want to remove this attendance record? The member will be marked as Absent.')) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, [memberId]: true }));
    try {
      await api.deleteAttendance(attendanceId);
      await loadAttendance(date, true);
      setMessage('Attendance record removed.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to delete attendance record');
    } finally {
      setActionLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  }

  // Filter list by activeTab and searchQuery
  let displayedList = [];
  if (data) {
    if (activeTab === 'present') {
      displayedList = data.present || [];
    } else if (activeTab === 'late') {
      displayedList = data.late || [];
    } else if (activeTab === 'absent') {
      displayedList = data.absent || [];
    } else {
      // 'all'
      displayedList = [
        ...(data.present || []),
        ...(data.late || []),
        ...(data.absent || []),
      ];
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedList = displayedList.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.phone?.includes(q)
    );
  }

  const counts = data?.counts || { present: 0, late: 0, absent: 0, total: 0 };
  const attendanceRate = counts.total > 0
    ? Math.round(((counts.present + counts.late) / counts.total) * 100)
    : 0;

  const [exporting, setExporting] = useState(false);

  async function handleExportExcel() {
    setExporting(true);
    try {
      await api.downloadAttendanceExcel({ date, type: 'daily' });
    } catch (err) {
      alert(err.message || 'Failed to export Excel report');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-bni-charcoal">
            Chapter Attendance Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Real-time live check-ins for BNI Jubilant · Meeting at {data?.meeting?.startTime || '08:00 AM'}
          </p>
        </div>

        {/* Date picker & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <CalendarPicker
            value={date}
            onChange={(newDate) => setDate(newDate)}
            label="Meeting Date"
          />

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-bni-charcoal hover:bg-stone-800 text-white shadow-xs text-xs font-bold transition-all"
            title="View & Download Official Chapter QR Code"
          >
            <QrCode className="w-4 h-4 text-bni-gold" />
            <span>Chapter QR Code</span>
          </button>

          <button
            onClick={() => loadAttendance(date)}
            disabled={refreshing || loading}
            className="p-2.5 bg-white hover:bg-stone-50 rounded-xl border border-stone-300 shadow-2xs text-stone-600 hover:text-bni-charcoal transition-colors disabled:opacity-50"
            title="Refresh attendance data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-bni-red' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 shadow-2xs text-xs font-semibold text-stone-700 hover:text-bni-charcoal transition-colors disabled:opacity-50"
            title="Download formatted Excel (.xlsx) report"
          >
            <Download className="w-4 h-4 text-bni-gold" />
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Official Chapter QR Code Modal */}
      <ChapterQRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Success Notification Banner */}
      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2 animate-scale-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Stat Cards Grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-scale-in">
          {/* Present Card */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Present (On Time)
              </p>
              <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
                {counts.present}
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Before {data?.meeting?.startTime || '08:00'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Late Card */}
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Late Check-ins
              </p>
              <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
                {counts.late}
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                After {data?.meeting?.startTime || '08:00'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Absent Card */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Absent
              </p>
              <h3 className="text-3xl font-extrabold text-bni-charcoal mt-1">
                {counts.absent}
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Not checked in yet
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Total Members & Rate Card */}
          <div className="bg-white rounded-2xl p-5 border border-bni-gold/30 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-bni-gold-dark uppercase tracking-wider">
                Turnout Rate
              </p>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <h3 className="text-3xl font-extrabold text-bni-charcoal">
                  {attendanceRate}%
                </h3>
                <span className="text-xs text-stone-500 font-medium">
                  ({counts.present + counts.late}/{counts.total})
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {counts.total} active members
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-bni-gold-light flex items-center justify-center text-bni-gold-dark">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Attendance List Section */}
      <div className="bg-white rounded-3xl shadow-card border border-stone-200 overflow-hidden">
        {/* Filter bar & Search */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'all', label: `All (${counts.total})` },
              { id: 'present', label: `Present (${counts.present})` },
              { id: 'late', label: `Late (${counts.late})` },
              { id: 'absent', label: `Absent (${counts.absent})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-bni-charcoal shadow-2xs'
                    : 'text-stone-500 hover:text-bni-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search member name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-bni-charcoal outline-none focus:border-bni-red"
            />
          </div>
        </div>

        {/* Attendance Table */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : displayedList.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm">
            No records found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {displayedList.map((item) => {
                  const mId = item.memberId?._id || item.memberId;
                  const isActionLoading = actionLoading[mId];

                  return (
                    <tr
                      key={mId}
                      className="hover:bg-bni-cream/50 transition-colors"
                    >
                      {/* Name & Phone */}
                      <td className="py-3.5 px-4 font-semibold text-bni-charcoal">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 border border-stone-200">
                            {item.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-bni-charcoal leading-tight">
                              {item.name}
                            </p>
                            <p className="text-xs text-stone-400 font-normal">
                              +91 {item.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      {/* Check-in Time */}
                      <td className="py-3.5 px-4 text-xs font-medium text-stone-600">
                        {item.checkInTimeFormatted || (item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4 text-xs text-stone-500 capitalize">
                        {item.method ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            {item.method}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'absent' ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleMarkManual(mId, 'present')}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50"
                              title="Mark as Present"
                            >
                              Mark Present
                            </button>
                            <button
                              onClick={() => handleMarkManual(mId, 'late')}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold border border-amber-200 transition-colors disabled:opacity-50"
                              title="Mark as Late"
                            >
                              Mark Late
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteAttendance(item.attendanceId, mId)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove attendance (set to absent)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
