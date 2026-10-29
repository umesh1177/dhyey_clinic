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
                  name: session.profile.clinicName || 'Dhyey Clinic & Hospital',
                };
      setActiveClinic(c);
    } else {
      setActiveClinic(null);
    }
  }, [session]);

  const login = async (username, password) => {
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: { username, password },
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
        throw new Error(res.message || 'Login failed');
      }
    } catch (err) {
      return fallbackLocalLogin(username, password);
    }
  };

  const fallbackLocalLogin = (username, password) => {
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (u === 'dhyey' && p === '123') {
      const doctorSession = {
        role: 'doctor',
        profile: {
          id: 'demo',
          username: 'dhyey',
          name: 'Dr. Chirag Paghdal',
          degree: 'B.H.M.S.',
          regNo: 'G-9035',
          clinics: [
            { id: 'CLN-001', name: 'Dhyey Main Clinic', address: '101, Medical Enclave, CG Road, Ahmedabad' },
            { id: 'CLN-002', name: 'Satellite Wellness Centre', address: '304, Titanium City Centre, Satellite, Ahmedabad' },
          ],
          activeClinicId: 'CLN-001',
          role: 'doctor',
        },
        token: 'mock-doctor-token',
      };
      setAuthSession(doctorSession);
      setSession(doctorSession);
      showToast('Signed in as Dr. Chirag Paghdal');
      return doctorSession;
    }

    if (u === 'mehul' && (p === '123' || p === 'password123')) {
      const doctorSession = {
        role: 'doctor',
        profile: {
          id: 'doc_mehul',
          username: 'mehul',
          name: 'Dr. Mehul Shah',
          degree: 'M.D. (Medicine)',
          regNo: 'G-8821',
          clinics: [{ id: 'CLN-001', name: 'Dhyey Main Clinic' }],
          activeClinicId: 'CLN-001',
          role: 'doctor',
        },
        token: 'mock-doctor-mehul-token',
      };
      setAuthSession(doctorSession);
      setSession(doctorSession);
      showToast('Signed in as Dr. Mehul Shah');
      return doctorSession;
    }

    throw new Error('Invalid username or password');
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
