import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText } from 'lucide-react';

export default function ApplicationModal({ isOpen, service, user, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    applicant_name: '',
    income: '',
    purpose: '',
    address: ''
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        applicant_name: user?.name || '',
        income: '',
        purpose: '',
        address: ''
      });
      setFiles([]);
    }
  }, [isOpen, user]);

  if (!isOpen || !service) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      certificate_type: service.title,
      department_id: service.id === 1 ? 1 : 2,
      application_data: formData,
      files
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Apply for {service.title}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{service.dept}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Applicant Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full legal name"
              value={formData.applicant_name}
              onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Annual Income (₹)</label>
              <input
                type="number"
                required
                placeholder="e.g. 250000"
                value={formData.income}
                onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Purpose of Application</label>
              <input
                type="text"
                required
                placeholder="e.g. Higher Education Scholarship"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Permanent Address</label>
            <textarea
              rows={2}
              required
              placeholder="Enter complete residential address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Upload Supporting Documents (Aadhaar / Ration Card / Income Proof)</label>
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-4 text-center cursor-pointer transition-colors glass-panel">
              <input
                type="file"
                multiple
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto" />
                <span className="text-xs font-semibold text-slate-300 block">
                  {files.length > 0 ? `${files.length} file(s) selected` : 'Click to select supporting document PDFs/Images'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">Max size: 5MB per document</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/30">
              Submit Application
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
