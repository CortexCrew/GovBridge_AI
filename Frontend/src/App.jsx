import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenPortal from './components/CitizenPortal';
import OfficerPortal from './components/OfficerPortal';
import AuthModal from './components/AuthModal';
import ApplicationModal from './components/ApplicationModal';
import ComplaintModal from './components/ComplaintModal';
import UserProfileModal from './components/UserProfileModal';
import { apiRequest } from './services/api';

export default function App() {
  const [activePortal, setActivePortal] = useState('citizen'); // 'citizen' | 'officer'
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authTab, setAuthTab] = useState('citizen_login');
  const [selectedService, setSelectedService] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Applications & Complaints State
  const [applications, setApplications] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check stored token and restore user profile on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const profileRes = await apiRequest('/auth/profile');
      if (profileRes && profileRes.success && profileRes.data) {
        setUser(profileRes.data);
        if (profileRes.data.role === 'OFFICER') {
          setActivePortal('officer');
        }
      }
    };
    restoreSession();
  }, []);

  // Open Auth Modal with specific initial tab
  const handleOpenAuth = (tab = 'citizen_login') => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  // Fetch live applications & complaints from backend API
  const fetchData = async () => {
    if (!user) return;

    // Applications
    const appEndpoint = user.role === 'OFFICER' 
      ? '/certificates/officer/applications' 
      : '/certificates/my-applications';
    const appRes = await apiRequest(appEndpoint);
    if (appRes && appRes.success && Array.isArray(appRes.data)) {
      setApplications(appRes.data);
    }

    // Complaints
    const compEndpoint = user.role === 'OFFICER'
      ? '/complaints'
      : '/complaints';
    const compRes = await apiRequest(compEndpoint);
    if (compRes && (compRes.success || Array.isArray(compRes))) {
      const list = Array.isArray(compRes) ? compRes : compRes.data || [];
      const resolvedMap = JSON.parse(localStorage.getItem('resolved_complaints') || '{}');

      const updatedList = list.map(c => {
        const cId = c.id || c.complaint_id;
        if (resolvedMap[cId]) {
          return { ...c, ...resolvedMap[cId] };
        }
        return c;
      });
      setComplaints(updatedList);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Auth Callbacks
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    showToast(`Welcome, ${userData.name || 'User'}! Authenticated successfully.`);
    if (userData.role === 'OFFICER') {
      setActivePortal('officer');
    } else {
      setActivePortal('citizen');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setApplications([]);
    setComplaints([]);
    setActivePortal('citizen');
    showToast('Logged out successfully.');
  };

  // Profile Callbacks
  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    showToast('Profile details updated successfully!');
  };

  const handleAccountDeleted = () => {
    handleLogout();
    showToast('Your account has been deleted.', 'error');
  };

  // Citizen Application Handler
  const handleApplySubmit = async (appData) => {
    const formData = new FormData();
    formData.append('certificate_type', appData.certificate_type);
    
    if (appData.files && appData.files.length > 0) {
      appData.files.forEach(file => formData.append('documents', file));
    }

    const res = await apiRequest('/certificates/apply', {
      method: 'POST',
      body: formData
    });

    const newApp = {
      id: res && (res.application_id || res.data?.id) ? (res.application_id || res.data?.id) : Math.floor(100 + Math.random() * 900),
      certificate_type: appData.certificate_type,
      status: 'Pending',
      created_at: new Date().toISOString(),
      applicant_name: user?.name || 'Citizen',
    };

    setApplications([newApp, ...applications]);
    showToast(`Application for ${appData.certificate_type} submitted successfully!`);
  };

  // Citizen Complaint Handler (POST /api/complaints)
  const handleComplaintSubmit = async (complaintData) => {
    const res = await apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        title: complaintData.title,
        description: complaintData.description
      })
    });

    const newComplaint = {
      id: res && (res.complaint_id || res.id) ? (res.complaint_id || res.id) : Math.floor(500 + Math.random() * 900),
      title: complaintData.title,
      description: complaintData.description,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    setComplaints([newComplaint, ...complaints]);
    showToast('Civic complaint logged successfully!');
  };

  // Citizen Delete Complaint Handler (DELETE /api/complaints/:id)
  const handleDeleteComplaint = async (complaintId) => {
    await apiRequest(`/complaints/${complaintId}`, {
      method: 'DELETE'
    });

    setComplaints(complaints.filter(c => (c.id !== complaintId && c.complaint_id !== complaintId)));
    showToast(`Complaint #${complaintId} withdrawn.`);
  };

  // Officer Review Handler (PATCH /api/certificates/:id/review)
  const handleReviewCertificate = async (appId, status, remarks = '') => {
    await apiRequest(`/certificates/${appId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks })
    });

    setApplications(applications.map(app => 
      (app.id === appId || app.application_id === appId)
        ? { ...app, status, remarks }
        : app
    ));

    showToast(`Application #${appId} marked as ${status}.`);
  };

  // Officer Resolve Handler
  const handleResolveComplaint = async (complaintId, status, resolutionNotes) => {
    await apiRequest(`/complaints/${complaintId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED', remarks: resolutionNotes })
    });

    const resolvedMap = JSON.parse(localStorage.getItem('resolved_complaints') || '{}');
    resolvedMap[complaintId] = {
      status: 'RESOLVED',
      complaint_status: 'RESOLVED',
      remarks: resolutionNotes,
      resolution_notes: resolutionNotes
    };
    localStorage.setItem('resolved_complaints', JSON.stringify(resolvedMap));

    setComplaints(complaints.map(c => 
      Number(c.id || c.complaint_id) === Number(complaintId)
        ? { ...c, status: 'RESOLVED', complaint_status: 'RESOLVED', remarks: resolutionNotes, resolution_notes: resolutionNotes }
        : c
    ));

    showToast(`Complaint #${complaintId} marked as RESOLVED.`);
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
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
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
            onDeleteComplaint={handleDeleteComplaint}
            onOpenAuth={() => handleOpenAuth('citizen_login')}
          />
        ) : (
          <OfficerPortal 
            officer={user}
            applications={applications}
            complaints={complaints}
            onReviewCertificate={handleReviewCertificate}
            onResolveComplaint={handleResolveComplaint}
            onOpenAuth={() => handleOpenAuth('officer_login')}
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
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <UserProfileModal 
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={handleProfileUpdated}
        onAccountDeleted={handleAccountDeleted}
      />

      <ApplicationModal 
        isOpen={!!selectedService}
        service={selectedService}
        user={user}
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
