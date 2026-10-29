/**
 * =========================================================
 * DHYEY CLINIC MANAGEMENT SYSTEM - PWA CONTROLLER
 * Service Worker Registration, Install Banner & Network Status Alerts
 * =========================================================
 */

let deferredPrompt = null;

export function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateToast(newWorker);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Listen for Install Prompt (beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured');

    // Show custom install button/banner
    renderInstallBanner();
  });

  // 3. Listen for App Installation Completion
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[PWA] App installed successfully');
    removeInstallBanner();
    showPwaToast('🎉 Dhyey Clinic App installed on your device!', 'success');
  });

  // 4. Listen for Online / Offline Connectivity
  window.addEventListener('offline', () => {
    showPwaToast('⚠️ You are currently offline. Running on local cache.', 'warning', 6000);
    updateNetworkStatusBadge(false);
  });

  window.addEventListener('online', () => {
    showPwaToast('✅ Internet connection restored. Syncing data...', 'success', 4000);
    updateNetworkStatusBadge(true);
  });

  // Initial check
  if (!navigator.onLine) {
    updateNetworkStatusBadge(false);
  }
}

/**
 * Render custom Install App Banner / Header Button
 */
function renderInstallBanner() {
  if (document.getElementById('cms-pwa-install-btn')) return;

  // Option A: If topbar right container exists, append a sleek install button
  const topbarRight = document.querySelector('.cms-topbar-right') || document.querySelector('.top-nav-actions');
  if (topbarRight) {
    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.id = 'cms-pwa-install-btn';
    installBtn.className = 'cms-btn cms-btn-ghost';
    installBtn.style.cssText = `
      padding: 6px 12px;
      font-size: 12px;
      background: linear-gradient(135deg, rgba(13, 110, 253, 0.12), rgba(2, 132, 199, 0.18));
      color: #0d6efd;
      border: 1px solid rgba(13, 110, 253, 0.3);
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    `;
    installBtn.innerHTML = `<i class="fa-solid fa-download"></i> <span>Install App</span>`;
    installBtn.title = 'Install Dhyey Clinic Management System on your PC or Phone';
    
    installBtn.addEventListener('click', promptInstall);
    topbarRight.insertBefore(installBtn, topbarRight.firstChild);
    return;
  }

  // Option B: Floating Bottom-Right Banner if no topbar
  const banner = document.createElement('div');
  banner.id = 'cms-pwa-floating-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--surface, #ffffff);
    color: var(--text, #1e293b);
    border: 1.5px solid var(--border, #e2e8f0);
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 12px 30px -5px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 10000;
    max-width: 380px;
    animation: slideUp 0.3s ease;
  `;
  banner.innerHTML = `
    <div style="width: 36px; height: 36px; border-radius: 8px; background: #0d6efd; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
      <i class="fa-solid fa-hospital"></i>
    </div>
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: 800; font-size: 13px; margin-bottom: 2px;">Install Dhyey Clinic</div>
      <div style="font-size: 11.5px; color: var(--text-muted, #64748b);">Fast access, offline records & desktop shortcut.</div>
    </div>
    <div style="display: flex; gap: 6px;">
      <button type="button" id="btn-pwa-install-now" style="background: #0d6efd; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">Install</button>
      <button type="button" id="btn-pwa-dismiss" style="background: transparent; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; padding: 4px;">&times;</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('btn-pwa-install-now')?.addEventListener('click', promptInstall);
  document.getElementById('btn-pwa-dismiss')?.addEventListener('click', () => {
    banner.remove();
  });
}

/**
 * Trigger browser native install prompt
 */
export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  deferredPrompt = null;
  removeInstallBanner();
}

/**
 * Clean up install UI once installed or dismissed
 */
function removeInstallBanner() {
  document.getElementById('cms-pwa-install-btn')?.remove();
  document.getElementById('cms-pwa-floating-banner')?.remove();
}

/**
 * Toast Notification for PWA Events
 */
function showPwaToast(msg, type = 'info', duration = 4000) {
  const existing = document.getElementById('cms-pwa-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cms-pwa-toast';
  const colors = {
    success: { bg: '#10b981', icon: 'fa-circle-check' },
    warning: { bg: '#f59e0b', icon: 'fa-triangle-exclamation' },
    error: { bg: '#ef4444', icon: 'fa-circle-xmark' },
    info: { bg: '#0d6efd', icon: 'fa-circle-info' }
  };
  const c = colors[type] || colors.info;

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #ffffff;
    border-left: 4px solid ${c.bg};
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    z-index: 10001;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.25s ease;
  `;
  toast.innerHTML = `<i class="fa-solid ${c.icon}" style="color: ${c.bg};"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Update indicator when a new version is waiting
 */
function showUpdateToast(worker) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #0d6efd;
    color: #ffffff;
    border-radius: 8px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 10002;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  toast.innerHTML = `
    <i class="fa-solid fa-cloud-arrow-down"></i>
    <span>A new version of Dhyey Clinic is ready!</span>
    <button id="btn-pwa-reload" style="background: #ffffff; color: #0d6efd; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 800; cursor: pointer;">Update Now</button>
  `;
  document.body.appendChild(toast);

  document.getElementById('btn-pwa-reload')?.addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
}

/**
 * Network Status indicator in TopBar if available
 */
function updateNetworkStatusBadge(isOnline) {
  let badge = document.getElementById('cms-network-status-badge');
  if (!badge) {
    const topbarLeft = document.querySelector('.cms-topbar-left');
    if (topbarLeft) {
      badge = document.createElement('span');
      badge.id = 'cms-network-status-badge';
      topbarLeft.appendChild(badge);
    }
  }

  if (badge) {
    badge.className = 'cms-pill';
    badge.style.cssText = `
      font-size: 10.5px;
      padding: 2px 8px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: ${isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)'};
      color: ${isOnline ? '#059669' : '#dc2626'};
      border: 1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
    `;
    badge.innerHTML = `<i class="fa-solid ${isOnline ? 'fa-signal' : 'fa-plane'}"></i> ${isOnline ? 'Online' : 'Offline Mode'}`;
  }
}

// Auto-initialize when loaded as module or script
if (typeof window !== 'undefined') {
  initPWA();
}
