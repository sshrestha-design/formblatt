// ── Universal Toast Notification Utility (js/toast.js) ─────────
export function showToast(msg, type = "info") {
    const existing = document.getElementById("justformsToastNotification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "justformsToastNotification";
    toast.className = `jf-toast jf-toast-${type}`;

    let iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    let bg = "#0f172a";
    let border = "rgba(255, 255, 255, 0.15)";
    let textCol = "#ffffff";

    if (type === "warning") {
        bg = "#fffbeb";
        border = "#fde68a";
        textCol = "#92400e";
        iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#b45309" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (type === "error") {
        bg = "#fef2f2";
        border = "#fecaca";
        textCol = "#991b1b";
        iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#dc2626" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === "success") {
        bg = "#f0fdf4";
        border = "#bbf7d0";
        textCol = "#166534";
        iconHtml = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#16a34a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    }

    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 100000;
        background: ${bg};
        color: ${textCol};
        border: 1px solid ${border};
        padding: 10px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
        transition: opacity 0.25s ease, transform 0.25s ease;
        pointer-events: none;
    `;

    toast.innerHTML = `${iconHtml}<span>${msg}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(12px) scale(0.95)";
        setTimeout(() => toast.remove(), 280);
    }, 3200);
}
