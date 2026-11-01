import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Statusbar from './components/Statusbar';

import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import FamilyRegView from './views/FamilyRegView';
import PatientRegView from './views/PatientRegView';
import ConsultationView from './views/ConsultationView';
import MastersView from './views/MastersView';
import CertificatesView from './views/CertificatesView';
import ReportsView from './views/ReportsView';

export default function App() {
  const { isAuthenticated } = useAuth();

  const [currentView, setCurrentView] = useState('dashboard');
  const [currentSelection, setCurrentSelection] = useState({
    familyId: null,
    patientId: null,
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('clinic_theme') || 'light');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('clinic_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const navigateTo = (view, selection = null) => {
    if (selection) {
      setCurrentSelection(selection);
    }
    setCurrentView(view);
  };

  const handleSelectPatient = (famId, patId) => {
    setCurrentSelection({ familyId: famId, patientId: patId });
    setCurrentView('case');
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    function handleKeyDown(e) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');

      if (e.key === 'Escape') {
        const modal = document.querySelector('.cms-modal-backdrop');
        if (modal) {
          e.preventDefault();
          modal.remove();
          return;
        }
        if (isInput) {
          activeEl.blur();
          return;
        }
      }

      if (isInput && !e.altKey && !e.ctrlKey && !e.key.startsWith('F')) {
        return;
      }

      if (e.key === 'F1') { e.preventDefault(); navigateTo('family'); }
      if (e.key === 'F2') { e.preventDefault(); navigateTo('patient'); }
      if (e.key === 'F3') { e.preventDefault(); navigateTo('case'); }
      if (e.key === 'F4') { e.preventDefault(); navigateTo('dashboard'); }
      if (e.key === 'F5') { e.preventDefault(); navigateTo('reports'); }
      if (e.key === 'F6') { e.preventDefault(); navigateTo('certificates'); }
      if (e.key === 'F7') { e.preventDefault(); navigateTo('masters'); }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const search = document.getElementById('cms-top-search');
        if (search) {
          search.focus();
          search.select();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={navigateTo} />;
      case 'family':
        return (
          <FamilyRegView
            onNavigate={navigateTo}
            onSelectPatient={handleSelectPatient}
          />
        );
      case 'patient':
        return (
          <PatientRegView
            initialFamilyId={currentSelection.familyId}
            initialPatientId={currentSelection.patientId || currentSelection.editPatientId}
            onNavigate={navigateTo}
            onSelectPatient={handleSelectPatient}
          />
        );
      case 'case':
        return (
          <ConsultationView
            initialSelection={currentSelection}
            onNavigate={navigateTo}
          />
        );
      case 'masters':
        return <MastersView />;
      case 'certificates':
        return <CertificatesView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView onNavigate={navigateTo} />;
    }
  };

  // Security: Block all access to protected views if user is not authenticated
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="cms-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Workspace Area */}
      <main className="cms-main-container">
        <Topbar
          onToggleSidebar={() => {
            if (window.innerWidth <= 768) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          onSelectPatient={handleSelectPatient}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <section className="cms-content-area" id="cms-view-container">
          {renderActiveView()}
        </section>

        <Statusbar />
      </main>
    </div>
  );
}
