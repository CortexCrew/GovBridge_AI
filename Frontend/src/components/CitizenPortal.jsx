import React, { useState } from 'react';
import { 
  FileText, AlertCircle, Award, CheckCircle2, Clock, XCircle, 
  Search, ArrowRight, ShieldCheck, Download, Eye, Sparkles, Trash2, UserCheck, Plus
} from 'lucide-react';

export default function CitizenPortal({ 
  user, applications = [], complaints = [], onApplyCertificate, onRaiseComplaint, onDeleteComplaint, onOpenAuth 
}) {
  const [activeTab, setActiveTab] = useState('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);

  const safeApplications = Array.isArray(applications) ? applications : [];
  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  // Supported certificate types matching backend validator strictly
  const services = [
    { id: 1, title: 'Income Certificate', dept: 'Revenue Department', code: 'REV-01', time: '3-5 Days', icon: FileText, color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' },
    { id: 2, title: 'Community Certificate', dept: 'Social Welfare Department', code: 'SWD-02', time: '5-7 Days', icon: ShieldCheck, color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30' },
    { id: 3, title: 'Nativity Certificate', dept: 'Revenue Department', code: 'REV-03', time: '2-4 Days', icon: FileText, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 4, title: 'Birth Certificate', dept: 'Public Health Department', code: 'SAN-04', time: '1-2 Days', icon: Award, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30' },
    { id: 5, title: 'Residence Certificate', dept: 'Revenue Department', code: 'REV-05', time: '2-3 Days', icon: UserCheck, color: 'from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/30' },
  ];

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.dept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 lg:p-12 border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-glow pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen e-Governance Platform
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Direct Access to Government Services, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Simplified.</span>
          </h1>
          <p className="text-slate-300 text-base lg:text-lg leading-relaxed">
            Apply for official certificates, store verified documents in your Digital Locker, and raise civic complaints with automatic priority routing.
          </p>

          {/* Quick Search */}
          <div className="relative pt-2 max-w-xl">
            <Search className="absolute left-4 top-6 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search services (e.g. Income Certificate, Birth Certificate)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl glass-input text-sm text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'services'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Apply for Services
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>My Applications & Digital Locker</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
              {safeApplications.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'complaints'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>Civic Complaints</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
              {safeComplaints.length}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={user ? onRaiseComplaint : onOpenAuth}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-sm font-medium transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Raise Complaint</span>
          </button>
        </div>
      </div>

      {/* Tab Content: Services Grid */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} border flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-slate-400">{service.code}</span>
                    <h3 className="text-lg font-bold text-white tracking-tight">{service.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400">{service.dept}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> {service.time}
                  </span>
                  <button
                    onClick={() => user ? onApplyCertificate(service) : onOpenAuth()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content: Applications & Digital Locker */}
      {activeTab === 'applications' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your Certificate Applications & Digital Locker</h2>
          </div>

          {safeApplications.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No applications submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-xs font-mono text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">App ID</th>
                    <th className="px-4 py-3">Certificate Type</th>
                    <th className="px-4 py-3">Submission Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {safeApplications.map((app) => (
                    <tr key={app.id || app.application_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-emerald-400 font-medium">
                        #{app.id || app.application_id}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-white">
                        {app.certificate_type}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                        {new Date(app.application_date || app.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          app.status === 'Approved' || app.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : app.status === 'Rejected' || app.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {(app.status === 'Approved' || app.status === 'APPROVED') && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {(app.status === 'Rejected' || app.status === 'REJECTED') && <XCircle className="w-3.5 h-3.5" />}
                          {app.status !== 'Approved' && app.status !== 'APPROVED' && app.status !== 'Rejected' && app.status !== 'REJECTED' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedApplication(app)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(app.status === 'Approved' || app.status === 'APPROVED') && (
                          <button
                            onClick={() => alert(`Downloading verified certificate for Application #${app.id || app.application_id}`)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            title="Download Certificate"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Complaints List */}
      {activeTab === 'complaints' && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your Raised Complaints</h2>
            <button
              onClick={user ? onRaiseComplaint : onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-md shadow-amber-900/30"
            >
              <Plus className="w-4 h-4" /> Raise Civic Complaint
            </button>
          </div>

          {safeComplaints.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No complaints logged.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeComplaints.map((c) => {
                const resolvedMap = JSON.parse(localStorage.getItem('resolved_complaints') || '{}');
                const cId = c.id || c.complaint_id;
                const isResolved = 
                  Boolean(resolvedMap[cId]) ||
                  String(c.status || '').toUpperCase() === 'RESOLVED' || 
                  String(c.complaint_status || '').toUpperCase() === 'RESOLVED' || 
                  String(c.status || '').toUpperCase() === 'CLOSED' ||
                  Boolean(c.resolution_notes) ||
                  Boolean(c.remarks);
                return (
                  <div key={c.id || c.complaint_id} className="glass-card rounded-xl p-5 space-y-3 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {c.category || 'Civic Issue'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                          isResolved 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isResolved ? 'RESOLVED' : (c.status || 'PENDING')}
                        </span>
                        {onDeleteComplaint && (
                          <button
                            onClick={() => onDeleteComplaint(c.id || c.complaint_id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Withdraw Complaint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-base">{c.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                    {(c.remarks || c.resolution_notes || c.notes) && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                        <strong>Resolution Note:</strong> {c.remarks || c.resolution_notes || c.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 space-y-4 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Application Details #{selectedApplication.id || selectedApplication.application_id}</h3>
              <button onClick={() => setSelectedApplication(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Type:</strong> {selectedApplication.certificate_type}</p>
              <p><strong>Status:</strong> {selectedApplication.status}</p>
              {selectedApplication.remarks && (
                <p className="text-amber-300"><strong>Officer Remarks:</strong> {selectedApplication.remarks}</p>
              )}
            </div>
            <div className="pt-4 flex justify-end">
              <button onClick={() => setSelectedApplication(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
