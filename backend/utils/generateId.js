/**
 * ID Generation and Formatting Utilities
 */

const pad = (n, len = 2) => String(n || 0).padStart(len, '0');

const todayISO = () => new Date().toISOString().slice(0, 10);

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const parts = String(iso).slice(0, 10).split('-');
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Case ID format: patientId + case serial no (2-digit padded)
 * e.g. Patient 101, Visit 1 -> 10101
 * Supports makeCaseId(famId, patId, visitNum) and makeCaseId(patId, visitNum)
 */
const makeCaseId = (arg1, arg2, arg3) => {
  if (arg3 !== undefined) {
    const patId = String(arg2 || '').trim();
    const v = pad(String(arg3).replace(/\D/g, '') || arg3, 2);
    return `${patId}${v}`;
  }
  const patId = String(arg1 || '').trim();
  const v = pad(String(arg2).replace(/\D/g, '') || arg2, 2);
  return `${patId}${v}`;
};

module.exports = {
  pad,
  todayISO,
  nowTime,
  fmtDate,
  fmtMoney,
  uid,
  makeCaseId,
};
