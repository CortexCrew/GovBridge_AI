import React, { useState } from 'react';
import { 
  Building2, CheckCircle, XCircle, Clock, ShieldCheck, AlertCircle, 
  FileText, Check, X, ArrowUpRight, MessageSquare, Filter, RefreshCw
} from 'lucide-react';

export default function OfficerPortal({ 
  officer, applications, complaints, onReviewCertificate, onResolveComplaint, onOpenAuth 
}) {
  const [activeTab, setActiveTab] = useState('certificates');
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reviewMode, setReviewMode] = useState(null); // 'approve' | 'reject' | null

  if (!officer) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto my-12 border border-slate-800 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Government Officer Authentication Required</h2>
          <p className="text-slate-400 text-sm">
            Please log in with your official Department credentials to access the Officer Review Workbench & Department Analytics.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-900/40 hover:opacity-90 transition-all"
        >
          Officer Sign In
        </button>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW');
  const approvedApps = applications.filter(a => a.status === 'APPROVED');
  const pendingComplaints = complaints.filter(c => c.status !== 'RESOLVED');

  const handleConfirmReview = (status) => {
    if (!selectedApp) return;
    if (status === 'REJECTED' && !rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    onReviewCertificate(selectedApp.id || selectedApp.application_id, status, rejectReason);
    setSelectedApp(null);
    setRejectReason('');
    setReviewMode(null);
  };

  const handleConfirmResolve = () => {
    if (!selectedComplaint) return;
    if (!resolutionNotes.trim()) {
      alert('Please enter resolution notes.');
      return;
    }
    onResolveComplaint(selectedComplaint.id || selectedComplaint.complaint_id, 'RESOLVED', resolutionNotes);
    setSelectedComplaint(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Officer Header & Department Info */}
      <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{officer.name || 'Senior Officer'}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold">
                {officer.role || 'OFFICER'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Department ID #{officer.department_id || 1} • Official Email: {officer.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">System Status</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected to PostgreSQL Database
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Pending Applications</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-amber-400 font-heading">{pendingApps.length}</span>
            <Clock className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-xs text-slate-500">Requires review & validation</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Approved Certificates</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-emerald-400 font-heading">{approvedApps.length}</span>
            <CheckCircle className="w-6 h-6 text-emerald-400/60" />
          </div>
          <p className="text-xs text-slate-500">Issued & synced with Digital Locker</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Department Complaints</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-cyan-400 font-heading">{pendingComplaints.length}</span>
            <AlertCircle className="w-6 h-6 text-cyan-400/60" />
          </div>
          <p className="text-xs text-slate-500">Active citizen grievances</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase">SLA Compliance</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-teal-400 font-heading">98.4%</span>
            <ShieldCheck className="w-6 h-6 text-teal-400/60" />
          </div>
          <p className="text-xs text-slate-500">Average resolution under 48h</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'certificates'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Certificate Review Workbench ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'complaints'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Department Complaints ({complaints.length})
          </button>
        </div>
      </div>

      {/* Applications Table */}
      {activeTab === 'certificates' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Incoming Certificate Applications</h2>
            <span className="text-xs text-slate-400 font-mono">Assigned Department ID #{officer.department_id || 1}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-mono text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">App ID</th>
                  <th className="px-4 py-3">Certificate Type</th>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map((app) => (
                  <tr key={app.id || app.application_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-cyan-400 font-semibold">
                      #{app.id || app.application_id}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {app.certificate_type}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {app.applicant_name || app.name || 'Citizen'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                      {new Date(app.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => { setSelectedApp(app); setReviewMode('approve'); }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setSelectedApp(app); setReviewMode('reject'); }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Complaints List */}
      {activeTab === 'complaints' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Department Complaints List</h2>
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id || c.complaint_id} className="glass-card rounded-xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      #{c.id || c.complaint_id} • {c.category || 'Civic'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Priority: {c.priority || 'MEDIUM'}</span>
                  </div>
                  <h3 className="font-bold text-white text-base">{c.title}</h3>
                  <p className="text-xs text-slate-400">{c.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedComplaint(c)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-md shadow-cyan-900/30"
                  >
                    Resolve Complaint
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Certificate Modal */}
      {selectedApp && reviewMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {reviewMode === 'approve' ? 'Approve Application' : 'Reject Application'} #{selectedApp.id || selectedApp.application_id}
              </h3>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-sm text-slate-300">
              <strong>Certificate Type:</strong> {selectedApp.certificate_type}
            </p>

            {reviewMode === 'reject' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Mandatory Rejection Reason:</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State clear reasons why the application is rejected..."
                  className="w-full p-3 rounded-xl glass-input text-xs"
                />
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={() => setSelectedApp(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReview(reviewMode === 'approve' ? 'APPROVED' : 'REJECTED')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${
                  reviewMode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {reviewMode === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Complaint Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-4 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Resolve Complaint #{selectedComplaint.id || selectedComplaint.complaint_id}</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Resolution Notes:</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken by department to resolve..."
                className="w-full p-3 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={() => setSelectedComplaint(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
