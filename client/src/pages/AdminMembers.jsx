import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Upload,
  Search,
  Smartphone,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(''); // '' | 'true' | 'false'
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // CSV Import state
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [csvImportResult, setCsvImportResult] = useState(null);

  useEffect(() => {
    loadMembers();
  }, [search, activeFilter]);

  async function loadMembers() {
    try {
      setLoading(true);
      const res = await api.getMembers({ search, isActive: activeFilter });
      if (res.success) {
        setMembers(res.members || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setName('');
    setPhone('');
    setCompany('');
    setCategory('');
    setErrorMessage('');
    setIsAddModalOpen(true);
  }

  function openEditModal(m) {
    setSelectedMember(m);
    setName(m.name);
    setPhone(m.phone);
    setCompany(m.company || '');
    setCategory(m.category || '');
    setErrorMessage('');
    setIsEditModalOpen(true);
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage('');
    try {
      await api.createMember({ name, phone, company, category });
      setIsAddModalOpen(false);
      setMessage('Member added successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadMembers();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add member.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdateMember(e) {
    e.preventDefault();
    if (!selectedMember) return;
    setFormSubmitting(true);
    setErrorMessage('');
    try {
      await api.updateMember(selectedMember._id, { name, phone, company, category });
      setIsEditModalOpen(false);
      setMessage('Member updated successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadMembers();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update member.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleToggleActive(member) {
    try {
      await api.toggleMemberActive(member._id);
      await loadMembers();
      setMessage(`Member ${member.isActive ? 'deactivated' : 'activated'}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  }

  async function handleResetDevices(member) {
    if (!window.confirm(`Reset all linked devices for ${member.name}? They will need to identify themselves with their phone next time.`)) {
      return;
    }
    try {
      const res = await api.resetMemberDevices(member._id);
      setMessage(res.message || 'Devices reset successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadMembers();
    } catch (err) {
      alert(err.message || 'Failed to reset devices');
    }
  }

  async function handleDeleteMember(member) {
    if (!window.confirm(`Are you sure you want to permanently delete ${member.name}? All attendance records will be removed.`)) {
      return;
    }
    try {
      await api.deleteMember(member._id);
      setMessage('Member deleted successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadMembers();
    } catch (err) {
      alert(err.message || 'Failed to delete member');
    }
  }

  async function handleCsvImport(e) {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage('');
    setCsvImportResult(null);

    try {
      let res;
      if (csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);
        res = await api.importMembersCsv(formData);
      } else if (csvText.trim()) {
        res = await api.importMembersCsvText(csvText.trim());
      } else {
        setErrorMessage('Please select a CSV file or paste CSV content.');
        setFormSubmitting(false);
        return;
      }

      setCsvImportResult(res);
      await loadMembers();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to import CSV.');
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-bni-charcoal">
            Chapter Members Directory
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Manage members, phone numbers, classifications, and linked devices
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setCsvFile(null);
              setCsvText('');
              setCsvImportResult(null);
              setErrorMessage('');
              setIsCsvModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 shadow-2xs text-xs font-semibold text-stone-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-bni-gold" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-bni-red to-bni-red-dark hover:from-bni-red-dark hover:to-bni-red text-white shadow-xs text-xs font-bold transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2 animate-scale-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-card border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === '' ? 'bg-bni-charcoal text-white' : 'text-stone-500 hover:text-stone-800 bg-stone-100'
            }`}
          >
            All Members
          </button>
          <button
            onClick={() => setActiveFilter('true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'true' ? 'bg-emerald-700 text-white' : 'text-stone-500 hover:text-stone-800 bg-stone-100'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setActiveFilter('false')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'false' ? 'bg-rose-700 text-white' : 'text-stone-500 hover:text-stone-800 bg-stone-100'
            }`}
          >
            Inactive
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-bni-charcoal outline-none focus:border-bni-red"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl shadow-card border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner text="Loading chapter members..." />
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm">
            No members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-100 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Company & Classification</th>
                  <th className="py-3.5 px-4">Linked Devices</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {members.map((m) => (
                  <tr key={m._id} className="hover:bg-bni-cream/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-bni-red-light text-bni-red font-bold text-xs flex items-center justify-center shrink-0 border border-bni-red/20">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-bni-charcoal leading-tight">
                            {m.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-stone-600 font-medium">
                      +91 {m.phone}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-stone-700">
                        {m.company || '—'}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {m.category || ''}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                        <Smartphone className="w-3.5 h-3.5 text-bni-gold" />
                        <span>{m.deviceCount || 0} device(s)</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-500 border border-stone-200">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => handleResetDevices(m)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-bni-gold hover:bg-stone-100 transition-colors"
                          title="Reset Linked Devices"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(m)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.isActive
                              ? 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={m.isActive ? 'Deactivate Member' : 'Activate Member'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Chapter Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Member Name <span className="text-bni-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number <span className="text-bni-red">*</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 9840123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Chartered Accountants"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Classification
            </label>
            <input
              type="text"
              placeholder="e.g. Chartered Accountant"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-bni-red text-white text-xs font-bold shadow hover:bg-bni-red-dark disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member"
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Member Name <span className="text-bni-red">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number <span className="text-bni-red">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Classification
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm outline-none focus:border-bni-red"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-bni-red text-white text-xs font-bold shadow hover:bg-bni-red-dark disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Update Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import Members from CSV"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCsvImport} className="space-y-4">
          <p className="text-xs text-stone-500">
            Upload a CSV file or paste CSV text with headers:{' '}
            <code className="bg-stone-100 px-1 py-0.5 rounded text-bni-charcoal font-semibold">
              name, phone, company, category
            </code>
          </p>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          {csvImportResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
              <p className="font-bold">{csvImportResult.message}</p>
              {csvImportResult.errors?.length > 0 && (
                <ul className="list-disc list-inside text-rose-600 text-[11px] pt-1">
                  {csvImportResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Option A: Select CSV File
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files[0] || null)}
              className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-bni-gold-light file:text-bni-gold-dark hover:file:bg-bni-gold/20"
            />
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="shrink-0 mx-4 text-stone-400 text-xs font-semibold">OR</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Option B: Paste CSV Text
            </label>
            <textarea
              rows={5}
              placeholder="name,phone,company,category&#10;Ramesh Kumar,9840112345,Apex CA,Chartered Accountant&#10;Priya Sundaram,9840223456,Sundaram Legal,Lawyer"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs outline-none focus:border-bni-red"
            />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-bni-charcoal text-white text-xs font-bold shadow hover:bg-stone-800 disabled:opacity-50"
            >
              {formSubmitting ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
