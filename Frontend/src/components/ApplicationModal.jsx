import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { getFieldsForCertificate, getRequiredDocuments } from '../config/certificateFields';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function DocumentUploadSlot({ doc, file, error, onFileChange, onRemove }) {
  const inputRef = useRef(null);
  const hasFile = !!file;
  const hasError = !!error;

  const borderColor = hasError
    ? 'border-rose-500/60'
    : hasFile
    ? 'border-emerald-500/60'
    : 'border-slate-700 hover:border-emerald-500/40';

  const bgColor = hasError
    ? 'bg-rose-500/5'
    : hasFile
    ? 'bg-emerald-500/5'
    : 'bg-slate-900/40 hover:bg-slate-800/40';

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} transition-all duration-200 overflow-hidden`}>
      <input
        ref={inputRef}
        type="file"
        accept={doc.accept}
        className="hidden"
        id={`doc-upload-${doc.key}`}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileChange(doc.key, e.target.files[0]);
          }
        }}
      />

      <div className="flex items-center gap-3 p-3">
        {/* Icon / Status */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          hasFile && !hasError ? 'bg-emerald-500/15 text-emerald-400'
          : hasError ? 'bg-rose-500/15 text-rose-400'
          : 'bg-slate-800 text-slate-500'
        }`}>
          {hasFile && !hasError ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : hasError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>

        {/* Label + file info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200 truncate">{doc.label}</span>
            {doc.required ? (
              <span className="text-[10px] font-mono text-rose-400 flex-shrink-0">Required</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">Optional</span>
            )}
          </div>

          {hasFile && !hasError && (
            <p className="text-[11px] text-emerald-400 font-mono truncate mt-0.5">
              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
          {hasError && (
            <p className="text-[11px] text-rose-400 font-mono mt-0.5">{error}</p>
          )}
          {!hasFile && !hasError && (
            <p className="text-[10px] text-slate-500 mt-0.5">PDF, JPG or PNG · Max {MAX_FILE_SIZE_MB}MB</p>
          )}
        </div>

        {/* Action button */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {hasFile ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => onRemove(doc.key)}
                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationModal({ isOpen, service, user, onClose, onSubmit }) {
  const [applicantName, setApplicantName] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  // fileMap: { [docKey]: File }
  const [fileMap, setFileMap] = useState({});
  // errorMap: { [docKey]: string }
  const [errorMap, setErrorMap] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApplicantName(user?.name || '');
      setFieldValues({});
      setFileMap({});
      setErrorMap({});
      setSubmitError('');
    }
  }, [isOpen, user, service?.title]);

  if (!isOpen || !service) return null;

  const fields = getFieldsForCertificate(service.title);
  const requiredDocs = getRequiredDocuments(service.title);
  const inputClass = 'w-full p-2.5 rounded-xl glass-input text-xs';

  const handleFileChange = (docKey, file) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMap((prev) => ({
        ...prev,
        [docKey]: `File too large — max ${MAX_FILE_SIZE_MB}MB (this file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      }));
      setFileMap((prev) => {
        const next = { ...prev };
        delete next[docKey];
        return next;
      });
      return;
    }
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    setFileMap((prev) => ({ ...prev, [docKey]: file }));
  };

  const handleRemove = (docKey) => {
    setFileMap((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    // Validate required documents
    const missingDocs = requiredDocs
      .filter((doc) => doc.required && !fileMap[doc.key])
      .map((doc) => doc.label);

    if (missingDocs.length > 0) {
      setSubmitError(`Please upload the following required document(s): ${missingDocs.join(', ')}`);
      return;
    }

    // Check for any active size errors
    const hasErrors = Object.keys(errorMap).length > 0;
    if (hasErrors) {
      setSubmitError('Please fix file size errors before submitting.');
      return;
    }

    const applicationData = {};
    fields.forEach((field) => {
      const value = fieldValues[field.key];
      if (value === undefined || value === '') return;
      applicationData[field.key] = field.type === 'number' ? Number(value) : value;
    });

    // Flatten all uploaded files into an array for the backend
    const files = Object.values(fileMap);

    onSubmit({
      certificate_type: service.title,
      applicant_name: applicantName,
      application_data: applicationData,
      files,
    });
    onClose();
  };

  const uploadedCount = Object.keys(fileMap).length;
  const requiredCount = requiredDocs.filter((d) => d.required).length;
  const requiredUploaded = requiredDocs.filter((d) => d.required && fileMap[d.key]).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        {/* Header */}
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
          {/* Applicant Name */}
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

          {/* Dynamic Fields */}
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

          {/* Per-Document Upload Section */}
          {requiredDocs.length > 0 && (
            <div className="space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Supporting Documents</label>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  requiredUploaded === requiredCount
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {uploadedCount} of {requiredDocs.length} uploaded · {requiredUploaded}/{requiredCount} required
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${requiredDocs.length > 0 ? (uploadedCount / requiredDocs.length) * 100 : 0}%` }}
                />
              </div>

              {/* Individual document slots */}
              <div className="space-y-2">
                {requiredDocs.map((doc) => (
                  <DocumentUploadSlot
                    key={doc.key}
                    doc={doc}
                    file={fileMap[doc.key] || null}
                    error={errorMap[doc.key] || null}
                    onFileChange={handleFileChange}
                    onRemove={handleRemove}
                  />
                ))}
              </div>

              <p className="text-[10px] text-slate-500 font-mono">
                Accepted: PDF, JPG, PNG · Max {MAX_FILE_SIZE_MB}MB per document
              </p>
            </div>
          )}

          {/* Submit-level error */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300">{submitError}</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/30 transition-colors">
              Submit Application
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
