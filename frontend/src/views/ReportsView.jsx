import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fmtDate, fmtMoney, todayISO } from '../services/api';

const REPORT_TABS = [
  { key: 'area', label: 'Area-wise', icon: 'fa-location-dot' },
  { key: 'refDoctor', label: 'Ref. Doctor', icon: 'fa-user-doctor' },
  { key: 'patientHistory', label: 'Patient History', icon: 'fa-user-clock' },
  { key: 'dailyCollections', label: 'Daily Collections', icon: 'fa-indian-rupee-sign' },
  { key: 'monthlyIncome', label: 'Monthly Income', icon: 'fa-calendar-days' },
];

export default function ReportsView({ onNavigate }) {
  const { session } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [activeTab, setActiveTab] = useState('area');
  const [areaSearch, setAreaSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [patDocSearch, setPatDocSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [areaGroups, setAreaGroups] = useState({});
  const [docGroups, setDocGroups] = useState({});
  const [historyList, setHistoryList] = useState([]);
  const [dailyList, setDailyList] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ totalBilled: 0, totalReceived: 0, totalDue: 0 });

  useEffect(() => {
    loadReports();
  }, [clinicId]);

  const loadReports = async () => {
    try {
      const res = await apiFetch('/families');
      const famList = res.data || [];

      // 1. Group by Area
      const areas = {};
      famList.forEach((f) => {
        const a = (f.area || 'VASTRAPUR').toUpperCase();
        if (!areas[a]) areas[a] = [];
        Object.values(f.patients || {}).forEach((p) => {
          areas[a].push({
            id: p.id || p.patId,
            name: p.name,
            headName: f.headName,
            due: Number(p.due) || 0,
            familyId: f.id || f.famId,
          });
        });
      });
      setAreaGroups(areas);

      // 2. Group by Referring Doctor
      const docs = {};
      const allVisits = [];
      famList.forEach((f) => {
        Object.values(f.patients || {}).forEach((p) => {
          (p.visits || []).forEach((v) => {
            const doc = v.reference || 'Self';
            if (!docs[doc]) docs[doc] = [];
            const item = {
              date: v.date || todayISO(),
              caseId: v.caseId || '—',
              patientName: p.name,
              headName: f.headName || p.name,
              diagnosis: v.diagnosis || 'Clinical Consultation',
              complaint: v.complaint || '—',
              charge: Number(v.charge) || 0,
              received: Number(v.received) || 0,
              due: Number(v.due) || 0,
              patientId: p.id || p.patId,
              familyId: f.id || f.famId,
            };
            docs[doc].push(item);
            allVisits.push(item);
          });
        });
      });

      setDocGroups(docs);

      // 3. Patient History List
      allVisits.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setHistoryList(allVisits);

      // 4. Daily Collections & Monthly
      setDailyList(allVisits);
      const billed = allVisits.reduce((s, v) => s + (Number(v.charge) || 0), 0);
      const rec = allVisits.reduce((s, v) => s + (Number(v.received) || 0), 0);
      const due = allVisits.reduce((s, v) => s + (Number(v.due) || 0), 0);
      setMonthlyStats({ totalBilled: billed, totalReceived: rec, totalDue: due });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="cms-page-container" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* ── TOP TABS BAR (Exact Screenshot 3 format) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  background: isActive ? 'var(--primary)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                }}
              >
                <i className={`fa-solid ${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
            borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <i className="fa-solid fa-print" /> Print Report
        </button>
      </div>

      {/* ── TAB 1: AREA-WISE PATIENT LIST & DUES (Screenshot 3) ── */}
      {activeTab === 'area' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
              Area-wise Patient List &amp; Dues
            </h3>
            <input
              type="text"
              className="cms-input"
              placeholder="Search by area name..."
              value={areaSearch}
              onChange={e => setAreaSearch(e.target.value)}
              style={{ width: '100%', height: '36px', fontSize: '13px', borderRadius: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(areaGroups).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px' }}>
                No patients registered in any area
              </div>
            ) : Object.keys(areaGroups)
              .filter(a => !areaSearch || a.toLowerCase().includes(areaSearch.toLowerCase()))
              .map((areaName) => {
                const pats = areaGroups[areaName];
                return (
                  <div key={areaName} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }} />
                        <span>{areaName}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {pats.length} Patient(s)
                      </span>
                    </div>

                    <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT ID</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT NAME</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>FAMILY HEAD</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DUE AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pats.map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                              <td className="font-mono" style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{p.id}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '12.5px', color: 'var(--text)' }}>{p.name}</td>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{p.headName}</td>
                              <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: p.due > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                                {p.due > 0 ? `₹${p.due}` : 'Nil'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 2: REF. DOCTOR (Screenshot 4) ── */}
      {activeTab === 'refDoctor' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
              Referred Patients by Doctor
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input
                type="text"
                className="cms-input"
                placeholder="Search by doctor name..."
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                style={{ height: '36px', fontSize: '13px', borderRadius: '6px' }}
              />
              <input
                type="text"
                className="cms-input"
                placeholder="Search by patient name..."
                value={patDocSearch}
                onChange={e => setPatDocSearch(e.target.value)}
                style={{ height: '36px', fontSize: '13px', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(docGroups).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px' }}>
                No doctor referral visits recorded
              </div>
            ) : Object.keys(docGroups)
              .filter(d => !docSearch || d.toLowerCase().includes(docSearch.toLowerCase()))
              .map((drName) => {
                const visits = docGroups[drName].filter(v => !patDocSearch || v.patientName.toLowerCase().includes(patDocSearch.toLowerCase()));
                return (
                  <div key={drName} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-user-doctor" style={{ color: 'var(--primary)' }} />
                        <span>{drName}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {visits.length} Visit(s)
                      </span>
                    </div>

                    <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DATE</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CASE ID</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT NAME</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DIAGNOSIS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map((v, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{fmtDate(v.date)}</td>
                              <td className="font-mono" style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--primary)' }}>{v.caseId}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '12.5px', color: 'var(--text)' }}>{v.patientName}</td>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text)' }}>{v.diagnosis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 3: PATIENT HISTORY (Screenshot 5) ── */}
      {activeTab === 'patientHistory' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
              Patient Visit History Finder
            </h3>
            <input
              type="text"
              className="cms-input"
              placeholder="Type patient name or ID to filter visit history..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{ width: '100%', height: '36px', fontSize: '13px', borderRadius: '6px' }}
            />
          </div>

          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DATE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CASE ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT NAME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DIAGNOSIS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>COMPLAINT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CHARGE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DUE</th>
                </tr>
              </thead>
              <tbody>
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No patient visit history found
                    </td>
                  </tr>
                ) : (
                  historyList
                    .filter(h => !historySearch || (h.patientName || '').toLowerCase().includes(historySearch.toLowerCase()) || (h.patientId && h.patientId.includes(historySearch)))
                    .map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{fmtDate(item.date)}</td>
                        <td className="font-mono" style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>{item.caseId}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '12.5px', color: 'var(--text)' }}>{item.patientName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1',
                            borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600
                          }}>
                            {item.diagnosis}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text)', maxWidth: '220px' }}>{item.complaint}</td>
                        <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12.5px' }}>₹{item.charge}</td>
                        <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700, color: item.due > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                          {item.due > 0 ? `₹${item.due}` : 'Nil'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: DAILY COLLECTIONS ── */}
      {/* ── TAB 4: DAILY COLLECTIONS (Exact Screenshot 4) ── */}
      {activeTab === 'dailyCollections' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                Payment Collections Log
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                Total: {fmtMoney(dailyList.reduce((s, v) => s + (Number(v.received) || 0), 0))}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', background: '#fff'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>{fmtDate(todayISO())}</span>
              <i className="fa-regular fa-calendar" style={{ color: '#64748b' }} />
            </div>
          </div>

          <div className="cms-table-responsive" style={{ overflowX: 'auto' }}>
            <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DATE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CASE ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PATIENT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>FAMILY HEAD</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>RECEIVED AMOUNT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DUE</th>
                </tr>
              </thead>
              <tbody>
                {dailyList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No payment collections recorded for this period
                    </td>
                  </tr>
                ) : (
                  dailyList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                      <td style={{ padding: '10px 12px', fontSize: '12px' }}>{fmtDate(item.date)}</td>
                      <td className="font-mono" style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>{item.caseId}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '12.5px' }}>{item.patientName}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>{item.headName}</td>
                      <td className="font-mono" style={{ padding: '10px 12px', color: '#059669', fontWeight: 800, fontSize: '12.5px' }}>{fmtMoney(item.received)}</td>
                      <td className="font-mono" style={{ padding: '10px 12px', color: item.due > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: item.due > 0 ? 800 : 500, fontSize: '12.5px' }}>
                        {item.due > 0 ? fmtMoney(item.due) : 'Nil'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: MONTHLY INCOME ── */}
      {activeTab === 'monthlyIncome' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Monthly Income &amp; Financial Overview
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>Total Revenue Received</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>₹{monthlyStats.totalReceived.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8' }}>Total Billed</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>₹{monthlyStats.totalBilled.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>Total Outstanding Due</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>₹{monthlyStats.totalDue.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
