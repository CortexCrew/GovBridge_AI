import React, { useState, useEffect } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { getFieldsForCertificate, getDocumentGuidance } from '../config/certificateFields';

export default function ApplicationModal({ isOpen, service, user, onClose, onSubmit }) {
  const [applicantName, setApplicantName] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setApplicantName(user?.name || '');
      setFieldValues({});
      setFiles([]);
    }
  }, [isOpen, user, service?.title]);

  if (!isOpen || !service) return null;

  const fields = getFieldsForCertificate(service.title);
  const documentGuidance = getDocumentGuidance(service.title);
  const inputClass = 'w-full p-2.5 rounded-xl glass-input text-xs';

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const applicationData = {};
    fields.forEach((field) => {
      const value = fieldValues[field.key];
      if (value === undefined || value === '') return;
      applicationData[field.key] = field.type === 'number' ? Number(value) : value;
    });
    onSubmit({
      certificate_type: service.title,
      applicant_name: applicantName,
      application_data: applicationData,
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
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className={inputClass}
            />
          </div>

          {fields.map((field) => (
            <div className="space-y-1" key={field.key}>
              <label className="text-xs font-semibold text-slate-300" htmlFor={`field-${field.key}`}>
                {field.label}{!field.required && <span className="text-slate-500"> (optional)</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`field-${field.key}`}
                  rows={2}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                  className={inputClass}
                />
              ) : field.type === 'select' ? (
                <select
                  id={`field-${field.key}`}
                  required={field.required}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {field.options.map((option) => (
                    <option value={option} key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.key}`}
                  type={field.type}
                  min={field.type === 'number' ? 0 : undefined}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          {/* File Upload Section */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Upload Supporting Documents</label>
            {documentGuidance && (
              <p className="text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Documents expected: </span>{documentGuidance}
              </p>
            )}
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
