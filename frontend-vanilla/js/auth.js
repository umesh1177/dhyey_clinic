/**
 * =========================================================
 * AUTHENTICATION & DOCTOR PROFILE LOGIC
 * =========================================================
 */

import { apiFetch, getAuthSession, setAuthSession, showToast, uid } from './api.js';

export function initAuth() {
  const session = getAuthSession();
  return session;
}

export async function loginUser(username, password) {
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
      showToast(`Welcome back, ${res.user.name || res.user.username}!`);
      return sessionData;
    } else {
      throw new Error(res.message || 'Login failed');
    }
  } catch (err) {
    // Local Master DB Fallback for seamless offline experience
    return fallbackLocalLogin(username, password);
  }
}

function fallbackLocalLogin(username, password) {
  const u = username.trim().toLowerCase();
  const p = password.trim();

  // Doctor Chirag Demo Account
  if (u === 'dhyey' && p === '123') {
    const doctorSession = {
      role: 'doctor',
      profile: {
        id: 'demo',
        username: 'dhyey',
        name: 'Dr. Chirag Paghdal',
        degree: 'B.H.M.S.',
        regNo: 'G-9035',
        clinics: [{ id: 'demo', name: 'Dhyey Clinic & Nursing Home' }],
        activeClinicId: 'demo',
        role: 'doctor',
      },
      token: 'mock-doctor-token',
    };
    setAuthSession(doctorSession);
    showToast('Signed in as Dr. Chirag Paghdal');
    return doctorSession;
  }

  // Doctor Mehul Demo Account
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
    showToast('Signed in as Dr. Mehul Shah');
    return doctorSession;
  }

  throw new Error('Invalid username or password');
}

export function logoutUser() {
  localStorage.removeItem('clinic-auth-session');
  setAuthSession(null);
  sessionStorage.clear();
  showToast('Signed out successfully');
  const isInsidePages = window.location.pathname.includes('/pages/');
  setTimeout(() => {
    window.location.href = isInsidePages ? 'login.html?logout=true' : 'pages/login.html?logout=true';
  }, 150);
}

export async function switchDoctorClinic(newClinicId) {
  const session = getAuthSession();
  if (!session || !session.profile) return;

  session.profile.activeClinicId = newClinicId;
  setAuthSession(session);

  try {
    await apiFetch('/auth/switch-clinic', {
      method: 'POST',
      body: { clinicId: newClinicId },
    });
  } catch (e) {}

  showToast('Switched active clinic');
  window.location.reload();
}

export async function addDoctorClinic(clinicName) {
  if (!clinicName || !clinicName.trim()) return;
  const session = getAuthSession();
  if (!session || !session.profile) return;

  const newClinic = { id: uid(), name: clinicName.trim() };
  if (!session.profile.clinics) session.profile.clinics = [];
  session.profile.clinics.push(newClinic);
  session.profile.activeClinicId = newClinic.id;
  setAuthSession(session);

  try {
    await apiFetch('/auth/add-clinic', {
      method: 'POST',
      body: { name: clinicName.trim() },
    });
  } catch (e) {}

  showToast(`Clinic "${clinicName}" created`);
  window.location.reload();
}
