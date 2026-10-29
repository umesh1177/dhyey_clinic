/**
 * =========================================================
 * DOCTOR HELPDESK, CLINIC REQUESTS & ADMIN FEEDBACK CONTROLLER
 * Feature Requests, Clinic Registration Requests, Bug Reports,
 * Live Admin Reply Threads, Status Tracking & Fast Resolution
 * =========================================================
 */

import {
  fmtDate,
  todayISO,
  showToast,
  apiFetch,
  getLocalDB,
  saveLocalDB,
  getAuthSession,
  setAuthSession,
  pad,
  defaultFeedbacks,
} from './api.js';

export async function renderFeedbackView(container) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const doctorName = session?.profile?.name || session?.user?.name || 'Dr. Chirag Paghdal';
  const activeClinic = (session?.profile?.clinics || []).find((c) => c.id === clinicId) || {
    id: clinicId,
    name: 'Dhyey Clinic & Hospital',
  };

  const db = getLocalDB(clinicId);
  if (!db.feedbacks || db.feedbacks.length === 0) {
    db.feedbacks = [...defaultFeedbacks];
    saveLocalDB(db, clinicId);
  }

  // Load tickets from API with local fallback
  let tickets = db.feedbacks || defaultFeedbacks;
  try {
    const res = await apiFetch('/feedback');
    if (res && res.data) {
      tickets = res.data;
      db.feedbacks = tickets;
      saveLocalDB(db, clinicId);
    }
  } catch (e) {}

  // State
  let selectedCategory = 'clinic_request';
  let activeFilter = 'all';
  let searchQuery = '';
  let activeFollowupTicketId = null;

  // Category Configuration
  const categoryConfigs = {
    clinic_request: {
      label: 'Request New Clinic Registration',
      shortLabel: 'Clinic Request',
      icon: 'fa-hospital',
      color: 'var(--primary)',
      bg: 'var(--primary-soft)',
      desc: 'Request the admin to add a new hospital branch, satellite OPD, or secondary consultation clinic to your doctor account.',
      placeholder: 'Describe your new clinic requirement, opening schedule, and facilities...',
    },
    feature_request: {
      label: 'Feature Request / Enhancement Suggestion',
      shortLabel: 'Feature Request',
      icon: 'fa-lightbulb',
      color: '#8b5cf6',
      bg: '#ede9fe',
      desc: 'Suggest new clinical tools, custom prescription layouts, SMS/WhatsApp integrations, or UI improvements for future updates.',
      placeholder: 'Describe the feature you would like to see, why it is beneficial for your OPD, and how you envision it working...',
    },
    bug_report: {
      label: 'Technical Issue / Bug Report',
      shortLabel: 'Bug Report',
      icon: 'fa-triangle-exclamation',
      color: '#ef4444',
      bg: '#fee2e2',
      desc: 'Report glitches, printing alignment issues, shortcut conflicts, or unexpected behavior to the engineering team.',
      placeholder: 'Describe what happened, the expected behavior, and steps to reproduce the issue...',
    },
    general_feedback: {
      label: 'General Feedback & Support Query',
      shortLabel: 'General Feedback',
      icon: 'fa-comments',
      color: '#06b6d4',
      bg: '#cffafe',
      desc: 'Send general comments, appreciation, billing queries, or administrative questions directly to the portal team.',
      placeholder: 'Type your feedback, query, or comments for the administrator here...',
    },
  };

  function computeStats() {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === 'Pending').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
    const clinicReqs = tickets.filter((t) => t.category === 'clinic_request').length;
    return { total, pending, inProgress, resolved, clinicReqs };
  }

  function render() {
    const stats = computeStats();

    // Filter tickets
    let filtered = [...tickets];
    if (activeFilter === 'pending') {
      filtered = filtered.filter((t) => t.status === 'Pending');
    } else if (activeFilter === 'in_progress') {
      filtered = filtered.filter((t) => t.status === 'In Progress');
    } else if (activeFilter === 'resolved') {
      filtered = filtered.filter((t) => t.status === 'Resolved' || t.status === 'Closed');
    } else if (activeFilter === 'clinic_request') {
      filtered = filtered.filter((t) => t.category === 'clinic_request');
    } else if (activeFilter === 'feature_request') {
      filtered = filtered.filter((t) => t.category === 'feature_request');
    } else if (activeFilter === 'bug_report') {
      filtered = filtered.filter((t) => t.category === 'bug_report');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          (t.ticketNo || '').toLowerCase().includes(q) ||
          (t.subject || '').toLowerCase().includes(q) ||
          (t.message || '').toLowerCase().includes(q) ||
          (t.categoryLabel || '').toLowerCase().includes(q) ||
          (t.metaDetails?.requestedClinicName || '').toLowerCase().includes(q) ||
          (t.replies || []).some((r) => (r.message || '').toLowerCase().includes(q))
      );
    }

    container.innerHTML = `
      <div class="cms-feedback-container" style="display: flex; flex-direction: column; gap: 16px; max-width: 1350px; margin: 0 auto; width: 100%;">
        
        <!-- Header & KPI Banner -->
        <div class="cms-card" style="padding: 16px 20px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(37,99,235,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 16px;">
                <i class="fa-solid fa-headset"></i>
              </div>
              <h1 class="font-display" style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0;">
                Doctor Helpdesk &amp; Feedback
              </h1>
            </div>
            
            <a href="#section-compose-ticket" id="btn-scroll-compose" class="cms-btn cms-btn-primary" style="padding: 8px 16px; font-size: 12.5px; font-weight: 700; border-radius: var(--radius-md);">
              <i class="fa-solid fa-paper-plane"></i> Send New Request / Feedback
            </a>
          </div>

          <!-- KPI Stats Bar -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            <div style="background: var(--bg); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; gap: 14px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(37,99,235,0.12); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 17px;">
                <i class="fa-solid fa-ticket"></i>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Requests</div>
                <div style="font-size: 20px; font-weight: 800; color: var(--text-main); line-height: 1.2;">${stats.total}</div>
              </div>
            </div>

            <div style="background: var(--bg); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; gap: 14px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245,158,11,0.12); color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 17px;">
                <i class="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pending Admin Review</div>
                <div style="font-size: 20px; font-weight: 800; color: #d97706; line-height: 1.2;">${stats.pending}</div>
              </div>
            </div>

            <div style="background: var(--bg); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; gap: 14px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(16,185,129,0.12); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 17px;">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Resolved &amp; Answered</div>
                <div style="font-size: 20px; font-weight: 800; color: #059669; line-height: 1.2;">${stats.resolved}</div>
              </div>
            </div>

            <div style="background: var(--bg); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; gap: 14px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(99,102,241,0.12); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 17px;">
                <i class="fa-solid fa-hospital-user"></i>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Clinic Requests</div>
                <div style="font-size: 20px; font-weight: 800; color: #4f46e5; line-height: 1.2;">${stats.clinicReqs}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content 2-Column Grid -->
        <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 24px; align-items: start;">
          
          <!-- LEFT COLUMN: Requests History & Conversation Feed -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Filters & Search Toolbar -->
            <div class="cms-card" style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
                <div class="cms-card-title" style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-inbox" style="color: var(--primary);"></i>
                  <span>Support Requests &amp; Admin Replies</span>
                  <span class="cms-pill" style="background: var(--bg); color: var(--text-muted); font-size: 11px; padding: 2px 8px;">${filtered.length} Items</span>
                </div>

                <!-- Search Input -->
                <div style="position: relative; min-width: 220px;">
                  <input type="text" id="feedback-search-input" class="cms-input" placeholder="Search ticket #, subject, replies..." value="${searchQuery}" style="padding-left: 32px; font-size: 12.5px; height: 34px;" />
                  <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 11px; top: 10px; font-size: 12px; color: var(--text-muted);"></i>
                  ${searchQuery ? `<button type="button" id="btn-clear-search" style="position: absolute; right: 8px; top: 8px; border: none; background: none; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
              </div>

              <!-- Filter Tabs -->
              <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'all' ? 'active-filter' : ''}" data-filter="all" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  All (${stats.total})
                </button>
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'pending' ? 'active-filter' : ''}" data-filter="pending" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; margin-right: 4px;"></span> Pending (${stats.pending})
                </button>
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'resolved' ? 'active-filter' : ''}" data-filter="resolved" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 4px;"></span> Resolved (${stats.resolved})
                </button>
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'clinic_request' ? 'active-filter' : ''}" data-filter="clinic_request" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  <i class="fa-solid fa-hospital" style="margin-right: 4px;"></i> Clinic Requests
                </button>
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'feature_request' ? 'active-filter' : ''}" data-filter="feature_request" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  <i class="fa-solid fa-lightbulb" style="margin-right: 4px;"></i> Features
                </button>
                <button type="button" class="cms-btn cms-btn-ghost feedback-filter-btn ${activeFilter === 'bug_report' ? 'active-filter' : ''}" data-filter="bug_report" style="font-size: 12px; padding: 5px 12px; border-radius: 999px;">
                  <i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i> Bug Reports
                </button>
              </div>
            </div>

            <!-- Tickets Feed List -->
            <div id="feedback-tickets-list" style="display: flex; flex-direction: column; gap: 14px;">
              ${
                filtered.length === 0
                  ? `
                <div class="cms-card" style="padding: 48px 24px; text-align: center; color: var(--text-muted);">
                  <div style="font-size: 42px; color: var(--border-focus); margin-bottom: 12px;"><i class="fa-solid fa-comments-dollar"></i></div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">No Tickets Found</h3>
                  <p style="font-size: 13px; max-width: 420px; margin: 0 auto 16px auto;">
                    ${searchQuery ? `No requests matching "${searchQuery}". Try clearing search.` : 'You have not submitted any requests in this category yet.'}
                  </p>
                  <button type="button" id="btn-empty-create" class="cms-btn cms-btn-primary" style="padding: 7px 16px; font-size: 12.5px;">
                    <i class="fa-solid fa-plus"></i> Create New Support Ticket
                  </button>
                </div>
              `
                  : filtered
                      .map((t) => {
                        const cfg = categoryConfigs[t.category] || categoryConfigs.general_feedback;
                        const hasReplies = t.replies && t.replies.length > 0;
                        const isClinicApproved = t.metaDetails?.clinicApproved || false;
                        const isExpanded = activeFollowupTicketId === t.id;

                        let statusBadge = '';
                        if (t.status === 'Pending') {
                          statusBadge = `<span class="cms-pill" style="background: #fef3c7; color: #92400e; font-weight: 700; border: 1px solid #fde68a;"><i class="fa-solid fa-hourglass-half"></i> Pending Review</span>`;
                        } else if (t.status === 'In Progress') {
                          statusBadge = `<span class="cms-pill" style="background: #e0e7ff; color: #3730a3; font-weight: 700; border: 1px solid #c7d2fe;"><i class="fa-solid fa-spinner fa-spin"></i> In Progress</span>`;
                        } else if (t.status === 'Resolved') {
                          statusBadge = `<span class="cms-pill cms-badge-paid" style="font-weight: 700;"><i class="fa-solid fa-check-double"></i> Resolved / Answered</span>`;
                        } else {
                          statusBadge = `<span class="cms-pill" style="background: var(--bg); color: var(--text-muted); font-weight: 700;"><i class="fa-solid fa-lock"></i> Closed</span>`;
                        }

                        let priorityBadge = '';
                        if (t.priority === 'Urgent') {
                          priorityBadge = `<span class="cms-pill" style="background: #fee2e2; color: #b91c1c; font-weight: 700; border: 1px solid #fca5a5;"><i class="fa-solid fa-bolt"></i> Urgent</span>`;
                        } else if (t.priority === 'High') {
                          priorityBadge = `<span class="cms-pill" style="background: #ffedd5; color: #c2410c; font-weight: 700;"><i class="fa-solid fa-arrow-up"></i> High</span>`;
                        } else {
                          priorityBadge = `<span class="cms-pill" style="background: var(--bg); color: var(--text-muted); font-weight: 600;">${t.priority}</span>`;
                        }

                        return `
                    <div class="cms-card feedback-ticket-card" id="card-${t.id}" style="border: 1px solid var(--border); transition: all 0.2s ease; padding: 18px 20px;">
                      
                      <!-- Ticket Header Top Bar -->
                      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span class="font-mono" style="font-weight: 800; font-size: 13px; color: var(--primary); background: rgba(37,99,235,0.08); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(37,99,235,0.2);">
                            ${t.ticketNo || t.id}
                          </span>
                          <span class="cms-pill" style="background: ${cfg.bg}; color: ${cfg.color}; font-weight: 700; font-size: 11.5px; border-radius: 6px;">
                            <i class="fa-solid ${cfg.icon}"></i> ${t.categoryLabel || cfg.label}
                          </span>
                          ${priorityBadge}
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                          ${statusBadge}
                          <span style="font-size: 11.5px; color: var(--text-muted);">
                            <i class="fa-regular fa-clock"></i> ${fmtDate(t.createdAt || todayISO())}
                          </span>
                        </div>
                      </div>

                      <!-- Ticket Subject & Message -->
                      <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin: 0 0 8px 0; line-height: 1.4;">
                        ${t.subject}
                      </h3>
                      
                      <div style="font-size: 13.5px; color: var(--text-main); line-height: 1.6; white-space: pre-wrap; background: var(--bg); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 12px;">
                        ${t.message}
                      </div>

                      <!-- Meta Details Card (For Clinic Registration Request or Bug Details) -->
                      ${
                        t.category === 'clinic_request' && t.metaDetails?.requestedClinicName
                          ? `
                        <div style="background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(37,99,235,0.06) 100%); border: 1px dashed rgba(16,185,129,0.4); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px;">
                          <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #059669; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <span><i class="fa-solid fa-hospital"></i> Requested Clinic Branch Details</span>
                            ${
                              isClinicApproved
                                ? `<span class="cms-pill cms-badge-paid" style="font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> Activated in Doctor Profile</span>`
                                : `<span class="cms-pill" style="background: #fef3c7; color: #92400e; font-size: 10.5px;"><i class="fa-solid fa-clock"></i> Awaiting Admin Setup</span>`
                            }
                          </div>
                          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 12.5px;">
                            <div><b>Clinic Name:</b> ${t.metaDetails.requestedClinicName}</div>
                            <div><b>City / Area:</b> ${t.metaDetails.clinicCity || 'Not specified'}</div>
                            <div><b>Address:</b> ${t.metaDetails.clinicAddress || 'Standard location'}</div>
                            <div><b>Phone:</b> ${t.metaDetails.clinicPhone || 'Doctor contact'}</div>
                          </div>
                        </div>
                      `
                          : ''
                      }

                      ${
                        t.category === 'bug_report' && (t.metaDetails?.affectedModule || t.metaDetails?.deviceInfo)
                          ? `
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239,68,68,0.3); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 12px; font-size: 12px; display: flex; gap: 16px; flex-wrap: wrap;">
                          ${t.metaDetails.affectedModule ? `<div><b>Affected Module:</b> <span class="cms-pill" style="background: #fee2e2; color: #991b1b; font-weight: 700;">${t.metaDetails.affectedModule}</span></div>` : ''}
                          ${t.metaDetails.deviceInfo ? `<div><b>System/Browser:</b> ${t.metaDetails.deviceInfo}</div>` : ''}
                        </div>
                      `
                          : ''
                      }

                      <!-- Official Admin Replies & Conversation Thread -->
                      <div style="margin-top: 14px;">
                        <div style="font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                          <span><i class="fa-solid fa-reply-all"></i> Admin Conversation &amp; Official Replies</span>
                          <span style="font-weight: 600; font-size: 11px;">${(t.replies || []).length} reply</span>
                        </div>

                        ${
                          hasReplies
                            ? `
                          <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${t.replies
                              .map(
                                (r) => `
                              <div style="background: ${r.senderRole === 'admin' ? 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(16,185,129,0.06) 100%)' : 'var(--bg)'}; border: 1px solid ${r.senderRole === 'admin' ? 'rgba(37,99,235,0.25)' : 'var(--border)'}; border-left: 4px solid ${r.senderRole === 'admin' ? 'var(--primary)' : '#64748b'}; border-radius: var(--radius-md); padding: 12px 14px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                  <div style="display: flex; align-items: center; gap: 8px;">
                                    ${
                                      r.senderRole === 'admin'
                                        ? `<span class="cms-pill cms-badge-paid" style="font-size: 10px; padding: 2px 7px;"><i class="fa-solid fa-user-shield"></i> Official Admin Reply</span>`
                                        : `<span class="cms-pill" style="background: var(--surface); color: var(--text-main); font-size: 10px;"><i class="fa-solid fa-user-doctor"></i> Doctor Note</span>`
                                    }
                                    <b style="font-size: 12.5px; color: var(--text-main);">${r.senderName || (r.senderRole === 'admin' ? 'System Administrator' : doctorName)}</b>
                                  </div>
                                  <span style="font-size: 11px; color: var(--text-muted);">
                                    <i class="fa-regular fa-clock"></i> ${fmtDate(r.createdAt || todayISO())}
                                  </span>
                                </div>
                                <div style="font-size: 13px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap;">
                                  ${r.message}
                                </div>
                              </div>
                            `
                              )
                              .join('')}
                          </div>
                        `
                            : `
                          <div style="background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-md); padding: 10px 14px; font-size: 12.5px; color: #92400e; display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-clock-rotate-left fa-spin" style="font-size: 14px;"></i>
                            <span>Ticket is queued with System Administration. You will receive an official response here once reviewed.</span>
                          </div>
                        `
                        }
                      </div>

                      <!-- Quick Doctor Follow-up / Reply Trigger -->
                      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11.5px; color: var(--text-muted);">
                          Clinic: <b>${t.clinicName || activeClinic.name}</b>
                        </span>
                        
                        <button type="button" class="cms-btn cms-btn-ghost btn-toggle-followup" data-id="${t.id}" style="font-size: 12px; padding: 4px 10px;">
                          <i class="fa-solid fa-paper-plane"></i> ${isExpanded ? 'Cancel Reply' : 'Add Follow-up / Message'}
                        </button>
                      </div>

                      <!-- Expandable Follow-up Box -->
                      ${
                        isExpanded
                          ? `
                        <form class="doctor-followup-form" data-id="${t.id}" style="margin-top: 12px; background: var(--surface); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--primary); display: flex; flex-direction: column; gap: 10px;">
                          <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">
                            <i class="fa-solid fa-comment-dots" style="color: var(--primary);"></i> Send Follow-up Message on Ticket #${t.ticketNo || t.id}:
                          </div>
                          <textarea class="cms-input followup-text" rows="2" placeholder="Write your follow-up note or additional information for admin..." required style="resize: vertical; font-size: 13px;"></textarea>
                          <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" class="cms-btn cms-btn-ghost btn-cancel-followup" data-id="${t.id}" style="font-size: 12px; padding: 5px 12px;">Cancel</button>
                            <button type="submit" class="cms-btn cms-btn-primary" style="font-size: 12px; padding: 5px 14px;">
                              <i class="fa-solid fa-paper-plane"></i> Send Reply
                            </button>
                          </div>
                        </form>
                      `
                          : ''
                      }
                    </div>
                  `;
                      })
                      .join('')
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: Send New Request / Complaint Form Composer -->
          <div id="section-compose-ticket" style="position: sticky; top: 16px;">
            <div class="cms-card" style="border: 1px solid rgba(37,99,235,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.06); padding: 22px;">
              
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                  <i class="fa-solid fa-paper-plane"></i>
                </div>
                <div>
                  <h2 class="font-display" style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0;">
                    Send Complaint / Support Request
                  </h2>
                </div>
              </div>
              <p style="font-size: 12.5px; color: var(--text-muted); margin: 0 0 16px 0;">
                Your message is directly delivered to the administrator with high priority.
              </p>

              <!-- Category Picker Grid -->
              <div style="margin-bottom: 16px;">
                <label class="cms-label" style="font-weight: 700; margin-bottom: 8px; display: block;">
                  Select Request Category <span style="color: red;">*</span>
                </label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  ${Object.entries(categoryConfigs)
                    .map(
                      ([catKey, cfg]) => `
                    <div class="category-select-card ${selectedCategory === catKey ? 'active-cat-card' : ''}" data-category="${catKey}" style="cursor: pointer; border: 1.5px solid ${selectedCategory === catKey ? 'var(--primary)' : 'var(--border)'}; background: ${selectedCategory === catKey ? 'rgba(37,99,235,0.06)' : 'var(--surface)'}; padding: 10px 12px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 10px; transition: all 0.2s ease;">
                      <div style="width: 28px; height: 28px; border-radius: 6px; background: ${cfg.bg}; color: ${cfg.color}; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;">
                        <i class="fa-solid ${cfg.icon}"></i>
                      </div>
                      <div style="font-size: 12px; font-weight: 700; color: var(--text-main); line-height: 1.3;">
                        ${cfg.shortLabel}
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px; padding: 6px 10px; background: var(--bg); border-radius: 6px;">
                  <i class="fa-solid fa-circle-info" style="color: var(--primary);"></i> ${categoryConfigs[selectedCategory].desc}
                </div>
              </div>

              <!-- Interactive Form -->
              <form id="cms-feedback-submit-form" style="display: flex; flex-direction: column; gap: 14px;">
                
                <!-- Dynamic Fields: Clinic Registration -->
                ${
                  selectedCategory === 'clinic_request'
                    ? `
                  <div style="background: rgba(37,99,235,0.04); border: 1px solid rgba(37,99,235,0.2); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 12px; font-weight: 800; color: var(--primary); text-transform: uppercase;">
                      <i class="fa-solid fa-hospital"></i> New Clinic Setup Specifications:
                    </div>
                    
                    <div class="cms-form-group">
                      <label class="cms-label">Requested Clinic / Hospital Name <span style="color: red;">*</span></label>
                      <input type="text" id="req-clinic-name" class="cms-input" placeholder="e.g. Dhyey Family Clinic - Bopal Branch" required />
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      <div class="cms-form-group">
                        <label class="cms-label">City / Locality <span style="color: red;">*</span></label>
                        <input type="text" id="req-clinic-city" class="cms-input" placeholder="e.g. Ahmedabad (Bopal)" required />
                      </div>
                      <div class="cms-form-group">
                        <label class="cms-label">Branch Contact Number</label>
                        <input type="text" id="req-clinic-phone" class="cms-input" placeholder="e.g. 9876543210" />
                      </div>
                    </div>

                    <div class="cms-form-group">
                      <label class="cms-label">Full Address / Landmark</label>
                      <input type="text" id="req-clinic-address" class="cms-input" placeholder="e.g. 2nd Floor, Apex Hub, Near ISRO" />
                    </div>
                  </div>
                `
                    : ''
                }

                <!-- Dynamic Fields: Bug Report -->
                ${
                  selectedCategory === 'bug_report'
                    ? `
                  <div style="background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 12px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
                      <i class="fa-solid fa-bug"></i> Bug &amp; Diagnostic Details:
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      <div class="cms-form-group">
                        <label class="cms-label">Affected Screen / Tab <span style="color: red;">*</span></label>
                        <select id="req-bug-module" class="cms-select" required>
                          <option value="Dashboard">Dashboard (KPIs / Tables)</option>
                          <option value="Family Registration">Family Registration (Head Directory)</option>
                          <option value="Add Member">Add Family Member</option>
                          <option value="Patient Record">Patient Record &amp; OPD Consultation</option>
                          <option value="Prescription">Prescription Print &amp; PDF</option>
                          <option value="Medical Certificate">Medical Certificate Tab</option>
                          <option value="Billing">Billing &amp; Receipts</option>
                          <option value="Master Data">Master Data &amp; Shortcuts</option>
                          <option value="Other">Other / System General</option>
                        </select>
                      </div>

                      <div class="cms-form-group">
                        <label class="cms-label">Severity Level</label>
                        <select id="req-bug-severity" class="cms-select">
                          <option value="Normal">Normal - Minor annoyance</option>
                          <option value="High">High - Important feature glitch</option>
                          <option value="Urgent">Critical - Blocking Patient Flow</option>
                        </select>
                      </div>
                    </div>
                  </div>
                `
                    : ''
                }

                <!-- Dynamic Fields: Feature Request -->
                ${
                  selectedCategory === 'feature_request'
                    ? `
                  <div style="background: rgba(139,92,246,0.04); border: 1px solid rgba(139,92,246,0.2); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 12px; font-weight: 800; color: #7c3aed; text-transform: uppercase;">
                      <i class="fa-solid fa-lightbulb"></i> Feature Specification:
                    </div>
                    
                    <div class="cms-form-group">
                      <label class="cms-label">Target Module / Area</label>
                      <input type="text" id="req-feature-module" class="cms-input" placeholder="e.g. WhatsApp Integration, Lab Reports, Billing Analytics" />
                    </div>
                  </div>
                `
                    : ''
                }

                <!-- Subject Field -->
                <div class="cms-form-group">
                  <label class="cms-label" style="font-weight: 700;">Subject / Request Headline <span style="color: red;">*</span></label>
                  <input type="text" id="feedback-subject" class="cms-input" placeholder="${selectedCategory === 'clinic_request' ? 'e.g. Request to register Satellite Branch clinic' : selectedCategory === 'bug_report' ? 'e.g. Prescription print preview not fitting A4' : 'e.g. Suggestion for WhatsApp prescription summary'}" required />
                </div>

                <!-- Priority Level -->
                <div class="cms-form-group">
                  <label class="cms-label" style="font-weight: 700;">Priority Level</label>
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                    <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; font-size: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg);">
                      <input type="radio" name="req-priority" value="Low" /> Low
                    </label>
                    <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; font-size: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg);">
                      <input type="radio" name="req-priority" value="Normal" checked /> Normal
                    </label>
                    <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; font-size: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg);">
                      <input type="radio" name="req-priority" value="High" /> High
                    </label>
                    <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; font-size: 12px; border: 1px solid #fca5a5; border-radius: var(--radius-sm); background: #fee2e2; color: #991b1b; font-weight: 700;">
                      <input type="radio" name="req-priority" value="Urgent" /> Urgent
                    </label>
                  </div>
                </div>

                <!-- Detailed Description Textarea -->
                <div class="cms-form-group">
                  <label class="cms-label" style="font-weight: 700;">Detailed Description &amp; Notes <span style="color: red;">*</span></label>
                  <textarea id="feedback-message" class="cms-input" rows="4" placeholder="${categoryConfigs[selectedCategory].placeholder}" required style="resize: vertical; font-size: 13px; line-height: 1.5;"></textarea>
                </div>

                <!-- Submit Button -->
                <div style="margin-top: 6px; display: flex; gap: 10px;">
                  <button type="submit" id="btn-submit-feedback" class="cms-btn cms-btn-primary" style="flex: 1; padding: 10px 18px; font-weight: 800; font-size: 13.5px; border-radius: var(--radius-md);">
                    <i class="fa-solid fa-paper-plane"></i> Send Request to Admin
                  </button>
                  <button type="reset" class="cms-btn cms-btn-ghost" style="padding: 10px 14px; font-size: 12.5px;">
                    Reset
                  </button>
                </div>

                <div style="font-size: 11px; color: var(--text-muted); text-align: center;">
                  <i class="fa-solid fa-shield-halved"></i> Messages are encrypted &amp; logged directly to Admin Support System.
                </div>
              </form>
            </div>
          </div>

        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Category select cards
    container.querySelectorAll('.category-select-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectedCategory = card.dataset.category;
        render();
      });
    });

    // Filter buttons
    container.querySelectorAll('.feedback-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    // Search input
    const searchInput = container.querySelector('#feedback-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    const clearSearchBtn = container.querySelector('#btn-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        render();
      });
    }

    const emptyCreateBtn = container.querySelector('#btn-empty-create');
    if (emptyCreateBtn) {
      emptyCreateBtn.addEventListener('click', () => {
        const composeEl = container.querySelector('#section-compose-ticket');
        if (composeEl) composeEl.scrollIntoView({ behavior: 'smooth' });
        const subjInput = container.querySelector('#feedback-subject');
        if (subjInput) subjInput.focus();
      });
    }

    // Toggle follow-up composer
    container.querySelectorAll('.btn-toggle-followup').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        activeFollowupTicketId = activeFollowupTicketId === id ? null : id;
        render();
      });
    });

    container.querySelectorAll('.btn-cancel-followup').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFollowupTicketId = null;
        render();
      });
    });

    // Submit follow-up reply form
    container.querySelectorAll('.doctor-followup-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.dataset.id;
        const textarea = form.querySelector('.followup-text');
        const text = textarea?.value?.trim();
        if (!text) return;

        try {
          const res = await apiFetch(`/feedback/${id}/reply`, {
            method: 'POST',
            body: {
              message: text,
              senderRole: 'doctor',
              senderName: doctorName,
            },
          });

          showToast('Follow-up message sent to admin!');
          activeFollowupTicketId = null;

          // Update local state
          const ticketIndex = tickets.findIndex((t) => t.id === id || t.ticketNo === id || t._id === id);
          if (ticketIndex !== -1 && res?.data) {
            tickets[ticketIndex] = { ...tickets[ticketIndex], ...res.data, id: res.data._id || res.data.id || id };
          }
          db.feedbacks = tickets;
          saveLocalDB(db, clinicId);

          render();
        } catch (err) {
          showToast(err.message || 'Error sending reply', 'error');
        }
      });
    });

    // Main Ticket Submission Form
    const submitForm = container.querySelector('#cms-feedback-submit-form');
    if (submitForm) {
      submitForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subject = container.querySelector('#feedback-subject').value.trim();
        const message = container.querySelector('#feedback-message').value.trim();
        const priorityEl = container.querySelector('input[name="req-priority"]:checked');
        const priority = priorityEl ? priorityEl.value : 'Normal';

        if (!subject || !message) {
          showToast('Please fill in subject and description', 'error');
          return;
        }

        const metaDetails = {};
        if (selectedCategory === 'clinic_request') {
          metaDetails.requestedClinicName = container.querySelector('#req-clinic-name')?.value?.trim() || '';
          metaDetails.clinicCity = container.querySelector('#req-clinic-city')?.value?.trim() || '';
          metaDetails.clinicPhone = container.querySelector('#req-clinic-phone')?.value?.trim() || '';
          metaDetails.clinicAddress = container.querySelector('#req-clinic-address')?.value?.trim() || '';
          metaDetails.clinicApproved = false;
        } else if (selectedCategory === 'bug_report') {
          metaDetails.affectedModule = container.querySelector('#req-bug-module')?.value || 'System General';
          metaDetails.deviceInfo = `${navigator.userAgent.substring(0, 40)} | Screen: ${window.innerWidth}x${window.innerHeight}`;
        } else if (selectedCategory === 'feature_request') {
          metaDetails.targetModule = container.querySelector('#req-feature-module')?.value?.trim() || 'General';
        }

        const payload = {
          category: selectedCategory,
          categoryLabel: categoryConfigs[selectedCategory].label,
          priority,
          subject,
          message,
          metaDetails,
          doctorName,
          clinicName: activeClinic.name,
        };

        try {
          const res = await apiFetch('/feedback', {
            method: 'POST',
            body: payload,
          });

          showToast('Request submitted successfully! Admin will review and reply.');

          const fallbackTicketNo = `TKT-${new Date().getFullYear()}-${String((tickets.length || 0) + 1).padStart(4, '0')}`;
          const fallbackId = 'tkt-' + Math.random().toString(36).slice(2, 10);
          const rawTicket = res?.data || {};

          const createdTicket = {
            id: rawTicket._id || rawTicket.id || fallbackId,
            _id: rawTicket._id,
            ticketNo: rawTicket.ticketNo || fallbackTicketNo,
            doctorId: rawTicket.doctorId || session?.profile?.id || 'demo',
            doctorName: rawTicket.doctorName || doctorName,
            clinicId: rawTicket.clinicId || activeClinic.id || clinicId,
            clinicName: rawTicket.clinicName || activeClinic.name,
            category: rawTicket.category || selectedCategory,
            categoryLabel: rawTicket.categoryLabel || categoryConfigs[selectedCategory].label,
            priority: rawTicket.priority || priority,
            subject: rawTicket.subject || subject,
            message: rawTicket.message || message,
            metaDetails: rawTicket.metaDetails || metaDetails,
            status: rawTicket.status || 'Pending',
            replies: rawTicket.replies || [],
            createdAt: rawTicket.createdAt || new Date().toISOString(),
          };

          tickets.unshift(createdTicket);
          db.feedbacks = tickets;
          saveLocalDB(db, clinicId);

          submitForm.reset();
          render();

          // Scroll to top of list
          const listEl = container.querySelector('#feedback-tickets-list');
          if (listEl) listEl.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
          showToast(err.message || 'Failed to submit request', 'error');
        }
      });
    }
  }

  render();
}
