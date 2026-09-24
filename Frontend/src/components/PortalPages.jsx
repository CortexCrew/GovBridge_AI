import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, FileText, FolderLock, LayoutDashboard, Plus, Search, ShieldCheck, UserRound } from 'lucide-react';
import { certificateApi, complaintApi, downloadLockerFile, lockerApi, officerApi } from '../services/api';

const count = (items, value) => items.filter(x => String(x.status || x.complaint_status || '').toUpperCase() === value).length;
const idOf = x => x.id || x.complaint_id || x.application_id;
const Status = ({ value }) => <span className={`status status-${String(value || 'PENDING').toLowerCase().replaceAll(' ', '-')}`}>{value || 'Pending'}</span>;
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function PortalHeader({ title, subtitle, icon: Icon, children, onBack }) { return <header className="portal-header"><div className="portal-heading"><span className="portal-mark"><Icon size={20}/></span><div><p className="eyebrow">GovBridge citizen services</p><h1>{title}</h1><p>{subtitle}</p></div></div><div className="portal-header-actions"><button className="btn btn-secondary portal-back" onClick={onBack || (() => window.history.back())}><ArrowLeft size={16}/> Back</button>{children}</div></header>; }
function Stats({ complaints, applications }) { const data = [['Total complaints', complaints.length], ['Pending', count(complaints, 'PENDING')], ['In progress', count(complaints, 'IN PROGRESS')], ['Resolved', count(complaints, 'RESOLVED')], ['Certificate applications', applications.length]]; return <div className="stats-grid">{data.map(([label, value]) => <article key={label}><b>{value}</b><span>{label}</span></article>)}</div>; }
function Empty({ icon: Icon, title, copy, action }) { return <div className="empty-state"><Icon size={34}/><h3>{title}</h3><p>{copy}</p>{action}</div>; }
function Filter({ value, onChange, placeholder }) { return <label className="filter"><Search size={16}/><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/></label>; }
function SelectFilter({ value, onChange, label, options }) { return <label className="select-filter"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}><option value="">All</option>{options.map(option => <option value={option} key={option}>{option}</option>)}</select></label>; }

export function CitizenPages({ path, user, complaints, applications, onComplaint, onCertificate, onCertificates, onProfile, onNavigate, onBack }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const matchedComplaints = useMemo(() => complaints.filter(x => `${x.title} ${x.category} ${idOf(x)}`.toLowerCase().includes(query.toLowerCase())), [complaints, query]);
  const matchedApps = useMemo(() => applications.filter(x => `${x.certificate_type} ${idOf(x)}`.toLowerCase().includes(query.toLowerCase())), [applications, query]);
  if (!user) return <Empty icon={ShieldCheck} title="Sign in to continue" copy="Your requests and personal information are protected." action={<button className="btn btn-saffron" onClick={() => window.history.pushState({}, '', '/login')}>Sign in</button>}/>;
  if (path === '/citizen/dashboard') return <div className="portal-page"><PortalHeader title={`Good morning, ${user.name || 'Citizen'}`} subtitle="Let’s build a better India together." icon={LayoutDashboard}/><section className="dashboard-voice"><div><p className="eyebrow">Your voice matters</p><h2>Services and requests, within reach.</h2><p>Access government services, track your requests and stay connected.</p></div><div className="dashboard-actions"><button className="btn btn-secondary" onClick={onCertificates}>Apply for a certificate <ArrowRight size={16}/></button><button className="btn btn-secondary" onClick={() => onNavigate('/citizen/digital-locker')}>Digital Locker <FolderLock size={16}/></button><button className="btn btn-saffron" onClick={onComplaint}>Raise a complaint <ArrowRight size={16}/></button></div></section><Stats complaints={complaints} applications={applications}/><div className="two-panels"><ListPanel title="Recent complaints" items={complaints.slice(0,4)} type="complaint" empty="No complaints yet." onSelect={item => onNavigate(`/citizen/complaints/${idOf(item)}`)}/><ListPanel title="Recent applications" items={applications.slice(0,4)} type="application" empty="No certificate applications yet."/></div></div>;
  if (path === '/citizen/complaints/new') return <div className="portal-page"><PortalHeader title="Raise a complaint" subtitle="Tell us about the issue. GovBridge AI will analyze and route it to the appropriate department." icon={AlertCircle} onBack={onBack}/><div className="ai-flow"><b>Complaint</b><i/> <b>AI analysis</b><i/> <b>Category · priority · department</b><i/> <b>Department routing</b></div><section className="form-callout"><h2>Ready to report an issue?</h2><p>You will not be asked to choose a department, officer, category or priority.</p><button className="btn btn-saffron" onClick={onComplaint}>Open complaint form</button></section></div>;
  if (path.startsWith('/citizen/complaints/')) { const complaintId = path.split('/').pop(); const item = complaints.find(x => String(idOf(x)) === complaintId); return <ComplaintDetail item={item} complaintId={complaintId} />; }
  if (path === '/citizen/complaints') return <div className="portal-page"><PortalHeader title="My complaints" subtitle="Track the issues you have reported." icon={AlertCircle}><button className="btn btn-saffron" onClick={onComplaint}><Plus size={16}/> Raise complaint</button></PortalHeader><Filter value={query} onChange={setQuery} placeholder="Search complaints..."/>{matchedComplaints.length ? <ComplaintTable items={matchedComplaints} onSelect={setSelected}/> : <Empty icon={AlertCircle} title="You haven't raised any complaints yet." copy="When you report an issue, its department and status will appear here." action={<button className="btn btn-saffron" onClick={onComplaint}>Raise a complaint</button>}/>} {selected && <ComplaintDetail item={selected} compact onClose={() => setSelected(null)}/>}</div>;
  if (path === '/citizen/certificates/applications') return <ApplicationsPage items={matchedApps} query={query} setQuery={setQuery}/>;
  if (path.startsWith('/citizen/certificates/') && path !== '/citizen/certificates/apply') return <CertificateDetail id={path.split('/').pop()} fallback={applications.find(x => String(idOf(x)) === path.split('/').pop())}/>;
  if (path === '/citizen/digital-locker') return <DigitalLockerPage/>;
  if (path === '/citizen/profile') return <div className="portal-page"><PortalHeader title="My profile" subtitle="Manage your personal, contact and address information." icon={UserRound}/><button className="btn btn-secondary" onClick={onProfile}>View and edit profile</button></div>;
  return <CertificateServices onCertificate={onCertificate}/>;
}

function ListPanel({ title, items, type, empty, onSelect }) { return <section className="list-panel"><h2>{title}</h2>{items.length ? items.map(x => { const content = <><div><b>{type === 'complaint' ? x.title : x.certificate_type}</b><small>#{idOf(x)} · {date(x.created_at || x.application_date)}</small></div><Status value={x.status || x.complaint_status}/></>; return onSelect ? <button className="mini-row mini-row-action" key={idOf(x)} onClick={() => onSelect(x)}>{content}</button> : <div className="mini-row" key={idOf(x)}>{content}</div>; }) : <p>{empty}</p>}</section>; }
function ComplaintTable({ items, onSelect }) { return <div className="data-table complaint-table"><div className="table-head"><span>ID</span><span>Issue</span><span>Category</span><span>Priority</span><span>Department</span><span>Status</span><span>Created</span></div>{items.map(x => <button className="table-row" onClick={() => onSelect(x)} key={idOf(x)}><span>#{idOf(x)}</span><span><b>{x.title}</b><small>{x.description || 'No description'}</small></span><span>{x.category || 'Processing'}</span><span>{x.priority || 'Processing'}</span><span>{x.department_name || x.department || 'Routing pending'}</span><Status value={x.status || x.complaint_status}/><span>{date(x.created_at)}</span></button>)}</div>; }
function ComplaintDetail({ item, complaintId: requestedId, compact, onClose }) {
  const [details, setDetails] = useState(item);
  const [history, setHistory] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState('');
  const complaintId = requestedId || idOf(item || {});

  useEffect(() => {
    if (!complaintId) return;
    complaintApi.detail(complaintId).then((response) => {
      if (response.success) {
        const data = response.data || {};
        setDetails(data.complaint || data);
        setHistory(data.history || []);
        setAssignment(data.assignment || null);
      } else {
        setError(response.message || 'Unable to load complaint details.');
      }
    });
  }, [complaintId]);

  if (!details) return <div className="portal-page"><PortalHeader title="Complaint details" subtitle="This complaint was not found." icon={AlertCircle}/></div>;
  return <section className={compact ? 'detail-modal' : 'portal-page'}>
    <PortalHeader title="Complaint details" subtitle={`Request #${idOf(details)}`} icon={AlertCircle}>{compact && <button className="text-link" onClick={onClose}>Close</button>}</PortalHeader>
    <div className="detail-grid"><article><small>Title</small><h2>{details.title}</h2><p>{details.description}</p><p><b>Created:</b> {date(details.created_at)}</p><p><b>Updated:</b> {date(details.updated_at)}</p></article><article><small>AI analysis</small><p><b>Category:</b> {details.category || 'Processing'}</p><p><b>Priority:</b> {details.priority || 'Processing'}</p><p><b>Department:</b> {details.department_name || details.department || 'Processing'}</p><p><b>Summary:</b> {details.ai_summary || details.summary || 'No AI summary returned.'}</p></article></div>
    <section className="complaint-assignment"><small>Assignment</small>{assignment ? <p><b>{assignment.officer_name || `Officer #${assignment.officer_id}`}</b><span>{assignment.department_name || 'Assigned officer'} · {assignment.status}</span></p> : <p>No officer has been assigned yet.</p>}</section>
    {history.length ? <div className="status-timeline">{history.map((event) => <span className="active" key={event.history_id}>{String(event.new_status).replaceAll('_', ' ')}<small>{event.remarks || 'Status recorded'}</small><small>{date(event.created_at)}</small></span>)}</div> : <p className="api-note">No complaint history has been recorded yet.</p>}
    {error && <p className="api-note">{error}</p>}
  </section>;
}
function CertificateServices({ onCertificate }) { const types=['Income Certificate','Community Certificate','Nativity Certificate','Birth Certificate','Residence Certificate']; return <div className="portal-page"><PortalHeader title="Certificate services" subtitle="Apply for essential government certificates online." icon={FileText}/><div className="certificate-grid">{types.map(type => <article className="certificate-card" key={type}><FileText size={26}/><h3>{type}</h3><p>Submit a secure application with up to five supporting documents.</p><button onClick={() => onCertificate({ title:type })}>Apply <ArrowRight size={15}/></button></article>)}</div></div>; }
function ApplicationsPage({ items, query, setQuery }) { return <div className="portal-page"><PortalHeader title="My certificate applications" subtitle="Track the status of your certificate requests." icon={FileText}/><Filter value={query} onChange={setQuery} placeholder="Search certificate applications..."/>{items.length ? <div className="data-table"><div className="table-head"><span>ID</span><span>Certificate type</span><span>Applied</span><span>Status</span></div>{items.map(x => <div className="table-row" key={idOf(x)}><span>#{idOf(x)}</span><span><b>{x.certificate_type}</b></span><span>{date(x.application_date || x.created_at)}</span><Status value={x.status}/></div>)}</div> : <Empty icon={FileText} title="No certificate applications yet." copy="Start an application to see it here."/>}</div>; }
function CertificateDetail({ id, fallback }) { const [item, setItem]=useState(fallback), [error,setError]=useState(''); React.useEffect(()=>{certificateApi.detail(id).then(r=>{if(r.success) setItem(r.data || r.application); else setError('Unable to load application details.');});},[id]); return <div className="portal-page"><PortalHeader title="Application details" subtitle={`Application #${id}`} icon={FileText}/>{item ? <div className="detail-grid"><article><small>Certificate type</small><h2>{item.certificate_type}</h2><p><b>Applied:</b> {date(item.application_date || item.created_at)}</p><p><b>Status:</b> <Status value={item.status}/></p></article><article><small>Review</small><p>{item.remarks || 'No officer remarks yet.'}</p><p className="api-note">Documents are displayed when returned by the existing application-details API.</p></article></div> : <Empty icon={FileText} title="Loading application" copy={error || 'Retrieving the current application details...'}/>}</div>; }

export function OfficerComplaintsPage({ complaints }) {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(complaints.map(item => item.category).filter(Boolean))];
  const filtered = complaints.filter(item => (!status || String(item.status).toUpperCase() === status) && (!priority || String(item.priority).toUpperCase() === priority) && (!category || item.category === category));
  if (selected) return <OfficerComplaintDetail id={selected} onBack={() => setSelected(null)} />;
  return <div className="portal-page officer-page"><PortalHeader title="Department complaints" subtitle="Complaints routed to your department." icon={AlertCircle}/>{complaints.length ? <><div className="complaint-filters"><SelectFilter label="Status" value={status} onChange={setStatus} options={['PENDING', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']}/><SelectFilter label="Priority" value={priority} onChange={setPriority} options={['LOW', 'MEDIUM', 'HIGH']}/><SelectFilter label="Category" value={category} onChange={setCategory} options={categories}/></div>{filtered.length ? <ComplaintTable items={filtered} onSelect={item => setSelected(idOf(item))}/> : <Empty icon={AlertCircle} title="No matching complaints" copy="Try changing the current filters."/>}</> : <Empty icon={AlertCircle} title="No department complaints" copy="Complaints routed to your department appear here."/>}</div>;
}

function OfficerComplaintDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  const [departmentOfficers, setDepartmentOfficers] = useState([]);
  const [officerLoadError, setOfficerLoadError] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');
  const load = () => complaintApi.officerDetail(id).then(response => {
    if (!response.success) {
      setMessage(response.message || 'Unable to load complaint.');
      return;
    }
    setData(response.data);
    setStatus(String(response.data.complaint?.status || 'PENDING').toUpperCase().replaceAll(' ', '_'));
    setOfficerId(response.data.assignment?.officer_id ? String(response.data.assignment.officer_id) : '');
  });
  useEffect(() => {
    load();
    officerApi.departmentOfficers().then(response => {
      if (response.success) setDepartmentOfficers(response.data || []);
      else setOfficerLoadError(response.message || 'Unable to load department officers.');
    });
  }, [id]);
  if (!data) return <div className="portal-page"><PortalHeader title="Complaint details" subtitle={message || 'Loading complaint...'} icon={AlertCircle}/></div>;
  const complaint = data.complaint;
  const saveAssignment = async () => { const response = await complaintApi.assign(id, Number(officerId)); setMessage(response.success ? 'Complaint assigned successfully.' : response.message || 'Unable to assign complaint.'); if (response.success) load(); };
  const saveStatus = async () => { const response = await complaintApi.updateStatus(id, { status, remarks }); setMessage(response.success ? 'Complaint status updated.' : response.message || 'Unable to update status.'); if (response.success) load(); };
  const aiAnalysisMissing = !complaint.category && !complaint.priority && !complaint.ai_summary;
  return <div className="portal-page officer-page"><PortalHeader title="Complaint details" subtitle={`Request #${id}`} icon={AlertCircle}><button className="text-link" onClick={onBack}>Back to complaints</button></PortalHeader><div className="detail-grid"><article><small>Citizen complaint</small><h2>{complaint.title}</h2><p>{complaint.description}</p><p><b>Citizen:</b> {complaint.citizen_name || 'Citizen'}</p><p><b>Department:</b> {complaint.department_name || complaint.department || 'Not routed'}</p></article><article><small>AI analysis</small>{aiAnalysisMissing && <p className="api-note">AI analysis is unavailable for this complaint. It was saved before AI routing completed, so category, priority and summary were not stored.</p>}<p><b>Category:</b> {complaint.category || 'Not available'}</p><p><b>Priority:</b> {complaint.priority || 'Not available'}</p><p><b>Summary:</b> {complaint.ai_summary || 'Not available'}</p><p><b>Status:</b> <Status value={complaint.status}/></p></article></div><div className="detail-grid officer-actions"><article><h3>Assignment</h3><p>{data.assignment ? `Assigned to ${data.assignment.officer_name || `#${data.assignment.officer_id}`}` : 'No active assignment.'}</p>{officerLoadError && <p className="api-note">{officerLoadError}</p>}<label>Assign to officer<select value={officerId} onChange={event => setOfficerId(event.target.value)} disabled={!departmentOfficers.length}><option value="">{departmentOfficers.length ? 'Select an officer' : 'No officers available'}</option>{departmentOfficers.map(item => <option value={item.officer_id} key={item.officer_id}>{item.name} · Officer #{item.officer_id}</option>)}</select></label><button className="btn btn-secondary" onClick={saveAssignment} disabled={!officerId}>Assign officer</button></article><article><h3>Update status</h3><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="ESCALATED">Escalated</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label><label>Remarks<textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows="3" placeholder="Record what was checked, changed or communicated to the citizen." /></label><button className="btn btn-saffron" onClick={saveStatus}>Save status</button></article></div>{data.history?.length ? <div className="status-timeline">{data.history.map(event => <span className="active" key={event.history_id}>{event.new_status}<small>{event.remarks || ''}</small></span>)}</div> : <p className="api-note">No history recorded.</p>}{message && <p className="api-note">{message}</p>}</div>;
}

const sourceLabel = source => source === 'issued_certificate' ? 'Issued certificate' : 'Uploaded document';

function DigitalLockerPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    lockerApi.list().then(response => {
      if (response.success) setItems(response.data || []);
      else { setItems([]); setError(response.message || 'Unable to load your Digital Locker.'); }
    });
  }, []);

  const download = async item => { const result = await downloadLockerFile(item); setMessage(result.success ? '' : result.message); };
  const visible = (items || []).filter(item => !source || sourceLabel(item.source) === source);

  return <div className="portal-page">
    <PortalHeader title="Digital Locker" subtitle="Certificates issued to you and the documents you submitted, in one place." icon={FolderLock}/>
    {items === null ? <p className="api-note">Loading your Digital Locker...</p>
      : !items.length ? <Empty icon={FolderLock} title="Your Digital Locker is empty." copy={error || 'Certificates issued by officers and documents you upload with applications will appear here.'}/>
      : <>
        <div className="complaint-filters"><SelectFilter label="Type" value={source} onChange={setSource} options={['Issued certificate', 'Uploaded document']}/></div>
        {message && <p className="api-note">{message}</p>}
        {visible.length ? <div className="data-table">
          <div className="table-head"><span>Certificate</span><span>Source</span><span>Added</span><span>File</span></div>
          {visible.map(item => <div className="table-row" key={`${item.source}-${item.download_url}`}>
            <span><b>{item.certificate_type}</b><small>{item.file_name} · Application #{item.application_id}</small></span>
            <span><span className={`status ${item.source === 'issued_certificate' ? 'status-approved' : ''}`}>{sourceLabel(item.source)}</span></span>
            <span>{date(item.uploaded_at)}</span>
            <button className="text-link" onClick={() => download(item)}>Download</button>
          </div>)}
        </div> : <Empty icon={FolderLock} title="No matching files" copy="Try changing the filter."/>}
      </>}
  </div>;
}

const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;
const CERTIFICATE_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function OfficerCertificatesPage({ applications, onReview }) {
  const [selectedId, setSelectedId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const current = applications.find(x => idOf(x) === selectedId);
  const isPending = app => String(app.status).toUpperCase() === 'PENDING';

  const open = app => { setSelectedId(idOf(app)); setRemarks(''); setFile(null); setFileError(''); };
  const close = () => setSelectedId(null);
  const pickFile = event => {
    const picked = event.target.files[0] || null;
    setFile(null);
    if (!picked) { setFileError(''); return; }
    if (!CERTIFICATE_FILE_TYPES.includes(picked.type)) { setFileError('Upload a PDF, JPEG or PNG file.'); return; }
    if (picked.size > MAX_CERTIFICATE_BYTES) { setFileError('The file must be 5MB or smaller.'); return; }
    setFileError('');
    setFile(picked);
  };
  const decide = async status => {
    const ok = await onReview(idOf(current), status, remarks.trim(), status === 'Approved' ? file : null);
    if (ok) close();
  };

  if (current) return <div className="portal-page officer-page">
    <PortalHeader title="Review application" subtitle={`${current.certificate_type} · Application #${idOf(current)}`} icon={FileText} onBack={close}/>
    <div className="detail-grid">
      <article><small>Application</small><h2>{current.certificate_type}</h2><p><b>Applied:</b> {date(current.application_date)}</p><p><b>Status:</b> <Status value={current.status}/></p>{current.remarks && <p><b>Officer remarks:</b> {current.remarks}</p>}</article>
    </div>
    {isPending(current) ? <section className="detail-grid officer-actions"><article>
      <h3>Decision</h3>
      <label>Officer remarks<textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows="3" placeholder="Record verification notes for this decision."/></label>
      <label>Approved certificate (required to approve)<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={pickFile}/></label>
      {fileError && <p className="api-note">{fileError}</p>}
      {file && <p className="api-note">Selected: {file.name}</p>}
      <button className="btn btn-saffron" onClick={() => decide('Approved')} disabled={!remarks.trim() || !file}>Approve and issue certificate</button>
      {' '}
      <button className="btn btn-secondary" onClick={() => decide('Rejected')} disabled={!remarks.trim()}>Reject</button>
    </article></section> : <p className="api-note">This application has already been reviewed.</p>}
  </div>;

  return <div className="portal-page officer-page">
    <PortalHeader title="Certificate applications" subtitle="Review certificate applications submitted by citizens." icon={FileText}/>
    {applications.length ? <div className="data-table">
      <div className="table-head"><span>ID</span><span>Certificate type</span><span>Applied</span><span>Status</span></div>
      {applications.map(x => <button className="table-row" key={idOf(x)} onClick={() => open(x)}>
        <span>#{idOf(x)}</span><span><b>{x.certificate_type}</b><small>{isPending(x) ? 'Awaiting review' : 'Reviewed'}</small></span><span>{date(x.application_date)}</span><Status value={x.status}/>
      </button>)}
    </div> : <Empty icon={FileText} title="No applications to review" copy="Applications for the certificate types you handle appear here."/>}
  </div>;
}

export function OfficerPages({ path, officer, complaints, applications, onReview, onNavigate }) { if (!officer) return <Empty icon={ShieldCheck} title="Officer authentication required" copy="Sign in with authorized department credentials."/>; if (path.startsWith('/officer/complaints/')) return <OfficerComplaintDetail id={path.split('/').pop()} onBack={() => onNavigate('/officer/complaints')}/>; if (path === '/officer/certificates') return <OfficerCertificatesPage applications={applications} onReview={onReview}/>; if (path === '/officer/complaints') return <OfficerComplaintsPage complaints={complaints}/>; return <div className="portal-page officer-page"><PortalHeader title={`Welcome, ${officer.name || 'Officer'}`} subtitle={`${officer.department_name || 'Department'} · ${officer.role || 'OFFICER'}`} icon={LayoutDashboard}/><Stats complaints={complaints} applications={applications}/><div className="two-panels"><ListPanel title="Recent department complaints" items={complaints.slice(0,4)} type="complaint" empty="No complaints routed to this department." onSelect={item => onNavigate(`/officer/complaints/${idOf(item)}`)}/><ListPanel title="Recent applications" items={applications.slice(0,4)} type="application" empty="No applications to review." onSelect={() => onNavigate('/officer/certificates')}/></div></div>; }
