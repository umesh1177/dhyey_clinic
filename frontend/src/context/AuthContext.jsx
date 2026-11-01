import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, getAuthSession, setAuthSession, showToast, uid } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getAuthSession());
  const [activeClinic, setActiveClinic] = useState(null);

  useEffect(() => {
    if (session?.profile) {
      const clinicId = session.profile.activeClinicId || 'CLN-001';
      const c = (session.profile.clinics || []).find((item) => item.id === clinicId) ||
                session.profile.clinics?.[0] || {
                  id: 'CLN-001',
                  name: session.profile.clinicName || 'Umesh Pal Clinic',
                };
      setActiveClinic(c);
    } else {
      setActiveClinic(null);
    }
  }, [session]);

  // Handle unauthorized events across the application
  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null);
      setAuthSession(null);
      showToast('Session expired. Please log in again.', 'warning');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
    });

    if (res && res.success) {
      const sessionData = {
        token: res.token,
        role: 'doctor',
        profile: res.user,
      };
      setAuthSession(sessionData);
      setSession(sessionData);
      showToast(`Welcome back, ${res.user.name || res.user.username}!`);
      return sessionData;
    } else {
      throw new Error(res?.message || 'Invalid username or password');
    }
  };

  const logout = () => {
    setAuthSession(null);
    setSession(null);
    showToast('Signed out successfully');
  };

  const switchClinic = async (newClinicId) => {
    if (!session?.profile) return;
    const updated = {
      ...session,
      profile: {
        ...session.profile,
        activeClinicId: newClinicId,
      },
    };
    setAuthSession(updated);
    setSession(updated);

    try {
      await apiFetch('/auth/switch-clinic', {
        method: 'POST',
        body: { clinicId: newClinicId },
      });
    } catch (e) {}

    showToast('Switched active clinic');
  };

  const addClinic = async (clinicName) => {
    if (!clinicName || !clinicName.trim()) return;
    if (!session?.profile) return;

    const newClinic = { id: `CLN-${uid().toUpperCase().slice(0, 4)}`, name: clinicName.trim() };
    const clinics = [...(session.profile.clinics || []), newClinic];
    const updated = {
      ...session,
      profile: {
        ...session.profile,
        clinics,
        activeClinicId: newClinic.id,
      },
    };
    setAuthSession(updated);
    setSession(updated);

    try {
      await apiFetch('/auth/add-clinic', {
        method: 'POST',
        body: { name: clinicName.trim() },
      });
    } catch (e) {}

    showToast(`Clinic "${clinicName}" created`);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        activeClinic,
        isAuthenticated: !!session?.token,
        login,
        logout,
        switchClinic,
        addClinic,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
