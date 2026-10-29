import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast, uid, fmtDate, todayISO } from '../services/api';

export default function FeedbackView() {
  const { session, activeClinic } = useAuth();
  const clinicId = session?.profile?.activeClinicId || 'demo';

  const [tickets, setTickets] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Form State
  const [category, setCategory] = useState('feature_request');
  const [priority, setPriority] = useState('Normal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTickets();
  }, [clinicId]);

  const loadTickets = () => {
    // Attempt backend fetch
    apiFetch('/feedback/my-tickets').then((res) => {
      if (res && res.success && res.data) {
        setTickets(res.data);
      }
    }).catch(() => {
      // Local fallback
      const raw = localStorage.getItem('clinic_support_tickets');
      if (raw) setTickets(JSON.parse(raw));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Subject and description are required.', 'error');
      return;
    }

    const year = new Date().getFullYear();
    const count = tickets.length + 1;
    const ticketNo = `TKT-${year}-${String(count).padStart(4, '0')}`;

    const newTicket = {
      id: `tkt_${uid()}`,
      ticketNo,
      doctorName: session?.profile?.name || 'Dr. Chirag Paghdal',
      clinicName: activeClinic?.name || 'Dhyey Clinic',
      category,
      priority,
      subject: subject.trim(),
      message: message.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem('clinic_support_tickets', JSON.stringify(updated));
    showToast(`Support ticket #${ticketNo} submitted successfully.`);

    // Backend sync
    apiFetch('/feedback', {
      method: 'POST',
      body: newTicket,
    }).catch(() => {});

    setIsCreating(false);
    setSubject('');
    setMessage('');
  };

  const handleSendReply = (ticketId) => {
    if (!replyText.trim()) return;

    const updated = tickets.map((t) => {
      if (t.id === ticketId || t._id === ticketId || t.ticketNo === ticketId) {
        const replies = t.replies || [];
        replies.push({
          senderName: session?.profile?.name || 'Doctor',
          senderRole: 'doctor',
          message: replyText.trim(),
          createdAt: new Date().toISOString(),
        });
        return { ...t, replies, lastReplyAt: new Date().toISOString() };
      }
      return t;
    });

    setTickets(updated);
    localStorage.setItem('clinic_support_tickets', JSON.stringify(updated));
    showToast('Reply added to ticket.');
    setReplyText('');

    if (selectedTicket) {
      const cur = updated.find((t) => t.ticketNo === selectedTicket.ticketNo);
      if (cur) setSelectedTicket(cur);
    }

    apiFetch(`/feedback/${ticketId}/reply`, {
      method: 'POST',
      body: { message: replyText.trim() },
    }).catch(() => {});
  };

  return (
    <div className="cms-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
            <i className="fa-solid fa-headset" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>
            Help, Support &amp; Feature Feedback (F8)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Submit enhancement requests, technical issue tickets, or doctor workspace suggestions
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setIsCreating(!isCreating)}
        >
          <i className={`fa-solid ${isCreating ? 'fa-xmark' : 'fa-plus'}`}></i>
          {isCreating ? 'Close Form' : 'New Ticket (F8)'}
        </button>
      </div>

      {isCreating && (
        <div className="cms-card" style={{ marginBottom: '24px', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: 'var(--primary)' }}>
            Submit Doctor Support Request
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Category
                </label>
                <select className="cms-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="feature_request">Feature Request / Enhancement</option>
                  <option value="bug_report">Technical Issue / Bug Report</option>
                  <option value="general_feedback">General Feedback &amp; Usage Support</option>
                </select>
              </div>

              <div>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Priority Level
                </label>
                <select className="cms-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent / Critical OPD blocker</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Subject / Summary <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="e.g. Request for auto-calculation on dosage duration"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="cms-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 700 }}>
                  Detailed Description <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="cms-input"
                  rows="4"
                  placeholder="Describe your suggestion or technical error with details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="cms-btn cms-btn-outline" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Submit Support Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      <div className="cms-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text)' }}>
          Your Submitted Support Tickets ({tickets.length})
        </h3>

        {tickets.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tickets submitted yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map((t) => (
              <div
                key={t.ticketNo}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="cms-pill font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                      #{t.ticketNo}
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{t.subject}</strong>
                    <span className="cms-pill" style={{ fontSize: '11px' }}>
                      {t.priority} Priority
                    </span>
                  </div>

                  <span className={`cms-pill ${t.status === 'Resolved' ? 'cms-badge-paid' : 'cms-badge-due'}`}>
                    {t.status || 'Pending'}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t.message}
                </p>

                {/* Replies Thread */}
                {t.replies && t.replies.length > 0 && (
                  <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Conversation ({t.replies.length} replies):
                    </div>
                    {t.replies.map((r, rIdx) => (
                      <div key={rIdx} style={{ fontSize: '12.5px', marginBottom: '6px' }}>
                        <strong>{r.senderName}: </strong>
                        <span>{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="cms-input"
                    placeholder="Type reply message..."
                    value={selectedTicket?.ticketNo === t.ticketNo ? replyText : ''}
                    onFocus={() => setSelectedTicket(t)}
                    onChange={(e) => {
                      setSelectedTicket(t);
                      setReplyText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendReply(t.id || t._id || t.ticketNo);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => handleSendReply(t.id || t._id || t.ticketNo)}
                    style={{ fontSize: '12px' }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
