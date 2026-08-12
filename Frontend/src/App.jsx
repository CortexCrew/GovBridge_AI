import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenPortal from './components/CitizenPortal';
import OfficerPortal from './components/OfficerPortal';
import AuthModal from './components/AuthModal';
import ApplicationModal from './components/ApplicationModal';
import ComplaintModal from './components/ComplaintModal';
import { apiRequest } from './services/api';

export default function App() {
  const [activePortal, setActivePortal] = useState('citizen'); // 'citizen' | 'officer'
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Applications & Complaints State
  const [applications, setApplications] = useState([
    {
      id: 101,
      certificate_type: 'Income Certificate',
      status: 'APPROVED',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      applicant_name: 'Sukanthan Suresh',
      department_id: 1
    },
    {
      id: 102,
      certificate_type: 'Birth Certificate',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      applicant_name: 'Sukanthan Suresh',
      department_id: 2
    }
  ]);

  const [complaints, setComplaints] = useState([
    {
      id: 501,
      title: 'Road Potholes on Civil Lines Main Road',
      category: 'Public Works (Roads)',
      description: 'Dangerous potholes causing traffic congestion and accidents.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      department_id: 1
    }
  ]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch live applications & complaints from backend API
  const fetchApplications = async () => {
    const endpoint = user?.role === 'OFFICER' 
      ? '/certificates/officer/applications' 
      : '/certificates/my-applications';
    const res = await apiRequest(endpoint);
    if (res && res.success && Array.isArray(res.data)) {
      setApplications(res.data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  // Auth Callbacks
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    showToast(`Welcome back, ${userData.name || 'User'}! Authenticated successfully.`);
    if (userData.role === 'OFFICER') {
      setActivePortal('officer');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActivePortal('citizen');
    showToast('Logged out successfully.');
  };

  // Citizen Application Handler
  const handleApplySubmit = async (appData) => {
    const formData = new FormData();
    formData.append('certificate_type', appData.certificate_type);
    formData.append('department_id', appData.department_id);
    formData.append('application_data', JSON.stringify(appData.application_data));
    
    if (appData.files && appData.files.length > 0) {
      appData.files.forEach(file => formData.append('documents', file));
    }

    const res = await apiRequest('/certificates/apply', {
      method: 'POST',
      body: formData
    });

    const newApp = {
      id: res && res.application_id ? res.application_id : Math.floor(100 + Math.random() * 900),
      certificate_type: appData.certificate_type,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      applicant_name: user?.name || 'Sukanthan Suresh',
      department_id: appData.department_id
    };

    setApplications([newApp, ...applications]);
    showToast(`Application for ${appData.certificate_type} submitted successfully!`);
  };

  // Citizen Complaint Handler
  const handleComplaintSubmit = async (complaintData) => {
    const res = await apiRequest('/complaints/raise', {
      method: 'POST',
      body: JSON.stringify(complaintData)
    });

    const newComplaint = {
      id: res && res.complaint_id ? res.complaint_id : Math.floor(500 + Math.random() * 900),
      ...complaintData,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    setComplaints([newComplaint, ...complaints]);
    showToast('Civic complaint logged with automatic AI priority assignment.');
  };

  // Officer Review Handler
  const handleReviewCertificate = async (appId, status, rejectionReason = '') => {
    await apiRequest(`/certificates/${appId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejection_reason: rejectionReason })
    });

    setApplications(applications.map(app => 
      (app.id === appId || app.application_id === appId)
        ? { ...app, status, rejection_reason: rejectionReason }
        : app
    ));

    showToast(`Application #${appId} marked as ${status}.`);
  };

  // Officer Resolve Handler
  const handleResolveComplaint = async (complaintId, status, resolutionNotes) => {
    await apiRequest(`/officers/complaints/${complaintId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes: resolutionNotes })
    });

    setComplaints(complaints.map(c => 
      (c.id === complaintId || c.complaint_id === complaintId)
        ? { ...c, status, resolution_notes: resolutionNotes }
        : c
    ));

    showToast(`Complaint #${complaintId} marked as ${status}.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2 ${
            toast.type === 'error' 
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/30' 
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar 
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activePortal === 'citizen' ? (
          <CitizenPortal 
            user={user}
            applications={applications}
            complaints={complaints}
            onApplyCertificate={(service) => setSelectedService(service)}
            onRaiseComplaint={() => setIsComplaintModalOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        ) : (
          <OfficerPortal 
            officer={user}
            applications={applications}
            complaints={complaints}
            onReviewCertificate={handleReviewCertificate}
            onResolveComplaint={handleResolveComplaint}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 GovBridge AI — Digital e-Governance Platform. University Project.</p>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ApplicationModal 
        isOpen={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onSubmit={handleApplySubmit}
      />

      <ComplaintModal 
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onSubmit={handleComplaintSubmit}
      />

    </div>
  );
}
