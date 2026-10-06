import React, { useState, useEffect, useCallback } from 'react';
import { Landmark } from 'lucide-react';
import './App.css';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ApplicationModal from './components/ApplicationModal';
import ComplaintModal from './components/ComplaintModal';
import UserProfileModal from './components/UserProfileModal';
import { LandingPage, InfoPage, UnauthorizedPage } from './components/PublicPages';
import { CitizenPages, OfficerComplaintsPage, OfficerPages } from './components/PortalPages';
import { apiRequest } from './services/api';

const getTokenPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

export default function App() {
  const [activePortal, setActivePortal] = useState('citizen'); // 'citizen' | 'officer'
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authTab, setAuthTab] = useState('citizen_login');
  const [selectedService, setSelectedService] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Applications & Complaints State
  const [applications, setApplications] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check stored token and restore user profile on mount
  useEffect(() => {
    const handleExpiredSession = () => handleLogout();
    window.addEventListener('auth:expired', handleExpiredSession);

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const tokenPayload = getTokenPayload(token);
      const isOfficer = tokenPayload?.role === 'OFFICER' || tokenPayload?.officer_id !== undefined;
      const sessionRes = await apiRequest(isOfficer ? '/officer/dashboard' : '/auth/profile');
      const restoredUser = isOfficer
        ? sessionRes?.data?.officer
        : sessionRes?.user || sessionRes?.data;
      if (sessionRes && sessionRes.success && restoredUser) {
        setUser(restoredUser);
        if (isOfficer || restoredUser.role === 'OFFICER') {
          setActivePortal('officer');
        }
      }
    };
    restoreSession();
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, []);

  // Deep links should open the correct authentication experience, too.
  useEffect(() => {
    if (currentPath === '/login') { setAuthTab('citizen_login'); setIsAuthOpen(true); }
    if (currentPath === '/register' || currentPath === '/verify-otp') { setAuthTab('citizen_register'); setIsAuthOpen(true); }
    if (currentPath === '/officer/login') { setAuthTab('officer_login'); setIsAuthOpen(true); }
  }, [currentPath]);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const displayedPortal = currentPath.startsWith('/officer') ? 'officer' : activePortal;

  // Open Auth Modal with specific initial tab
  const handleOpenAuth = (tab = 'citizen_login') => {
    setAuthTab(tab);
    setIsAuthOpen(true);
    navigate(tab === 'officer_login' ? '/officer/login' : tab === 'citizen_register' ? '/register' : '/login');
  };

  const renderContent = () => {
    if (currentPath === '/') return <LandingPage navigate={navigate} openAuth={handleOpenAuth} user={user} />;
    if (['/services', '/about', '/help'].includes(currentPath)) return <InfoPage type={currentPath.slice(1)} navigate={navigate} openAuth={handleOpenAuth} user={user} />;
    if (currentPath === '/unauthorized') return <UnauthorizedPage navigate={navigate} />;
    if (currentPath.startsWith('/citizen') && user?.role === 'OFFICER') return <UnauthorizedPage navigate={navigate} />;
    if (currentPath.startsWith('/officer') && user && user.role !== 'OFFICER' && currentPath !== '/officer/login') return <UnauthorizedPage navigate={navigate} />;
    if (currentPath.startsWith('/citizen')) return <CitizenPages path={currentPath} user={user} applications={applications} complaints={complaints} onCertificate={(service) => { setSelectedService(service); navigate('/citizen/certificates/apply'); }} onCertificates={() => navigate('/citizen/certificates')} onComplaint={() => { setIsComplaintModalOpen(true); navigate('/citizen/complaints/new'); }} onProfile={() => setIsProfileOpen(true)} onNavigate={navigate} onBack={() => { setIsComplaintModalOpen(false); navigate('/citizen/dashboard'); }} />;
    if (currentPath === '/officer/complaints' && user?.role === 'OFFICER') return <OfficerComplaintsPage complaints={complaints} />;
    if (currentPath.startsWith('/officer')) return <OfficerPages path={currentPath} officer={user} applications={applications} complaints={complaints} onReview={handleReviewCertificate} onNavigate={navigate} />;
    return <div className="empty-page"><Landmark /><h1>Page not found</h1><button className="btn btn-secondary" onClick={() => navigate('/')}>Return home</button></div>;
  };

  // Fetch live applications & complaints from backend API
  const fetchData = useCallback(async () => {
    if (!user) return;

    // Applications
    const appEndpoint = user.role === 'OFFICER' 
      ? '/certificates/officer/applications' 
      : '/certificates/my-applications';
    const appRes = await apiRequest(appEndpoint);
    if (appRes && appRes.success && Array.isArray(appRes.data || appRes.applications)) {
      setApplications(appRes.data || appRes.applications);
    }

    // Complaints
    const compEndpoint = user.role === 'OFFICER' ? '/officer/complaints' : '/complaints';
    const compRes = await apiRequest(compEndpoint);
    if (compRes && (compRes.success || Array.isArray(compRes))) {
      const list = Array.isArray(compRes) ? compRes : compRes.data || compRes.complaints || [];
      setComplaints(list);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auth Callbacks
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    showToast(`Welcome, ${userData.name || 'User'}! Authenticated successfully.`);
    if (userData.role === 'OFFICER') {
      setActivePortal('officer');
      navigate('/officer/dashboard');
    } else {
      setActivePortal('citizen');
      navigate('/citizen/dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setApplications([]);
    setComplaints([]);
    setActivePortal('citizen');
    navigate('/');
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
    if (appData.application_data && Object.keys(appData.application_data).length > 0) {
      formData.append('application_data', JSON.stringify(appData.application_data));
    }
    
    if (appData.files && appData.files.length > 0) {
      appData.files.forEach(file => formData.append('documents', file));
    }

    const res = await apiRequest('/certificates/apply', {
      method: 'POST',
      body: formData
    });

    if (res && res.success) {
      await fetchData();
      showToast(`Application for ${appData.certificate_type} submitted successfully!`);
    } else {
      throw new Error(res?.message || 'Unable to submit certificate application.');
    }
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

    if (res && res.success) {
      await fetchData();
      showToast('Civic complaint logged successfully!');
    } else {
      throw new Error(res?.message || 'Unable to submit complaint.');
    }
  };

  // Citizen Delete Complaint Handler (DELETE /api/complaints/:id)
  const _handleDeleteComplaint = async (complaintId) => {
    const res = await apiRequest(`/complaints/${complaintId}`, {
      method: 'DELETE'
    });

    if (res && res.success) {
      setComplaints(complaints.filter(c => (c.id !== complaintId && c.complaint_id !== complaintId)));
      showToast(`Complaint #${complaintId} withdrawn.`);
    } else {
      showToast(res?.message || 'Unable to withdraw complaint.', 'error');
    }
  };

  // Officer Review Handler (PATCH /api/certificates/:id/review)
  const handleReviewCertificate = async (appId, status, remarks = '', certificateFile = null) => {
    let body;
    if (certificateFile) {
      body = new FormData();
      body.append('status', status);
      body.append('remarks', remarks);
      body.append('certificate', certificateFile);
    } else {
      body = JSON.stringify({ status, remarks });
    }

    const res = await apiRequest(`/certificates/${appId}/review`, {
      method: 'PATCH',
      body
    });

    if (res && res.success) {
      setApplications(applications.map(app =>
        (app.id === appId || app.application_id === appId)
          ? { ...app, status, remarks }
          : app
      ));
      fetchData();
      showToast(`Application #${appId} marked as ${status}.`);
      return true;
    }

    showToast(res?.error || res?.message || 'Unable to review application.', 'error');
    return false;
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
        activePortal={displayedPortal}
        setActivePortal={setActivePortal}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onNavigate={navigate}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {renderContent()}
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
        onClose={() => { setIsComplaintModalOpen(false); if (currentPath === '/citizen/complaints/new') navigate('/citizen/dashboard'); }}
        onSubmit={handleComplaintSubmit}
      />

    </div>
  );
}
