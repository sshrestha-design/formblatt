// ── Global Floating Micro-Tooltip Controller (js/tooltip.js) ───────────

let tooltipEl = null;
let activeTarget = null;
let showTimer = null;

export function initTooltips() {
    if (typeof document === "undefined") return;

    // Create singleton tooltip container in body
    tooltipEl = document.getElementById("appTooltip");
    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.id = "appTooltip";
        tooltipEl.className = "app-tooltip";
        tooltipEl.setAttribute("role", "tooltip");
        tooltipEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(tooltipEl);
    }

    // Attach passive global delegation listeners
    document.addEventListener("pointerenter", handlePointerEnter, true);
    document.addEventListener("pointerleave", handlePointerLeave, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("pointerdown", hideTooltip, true);
    window.addEventListener("scroll", hideTooltip, { passive: true, capture: true });
}

function getTooltipTarget(target) {
    if (!target || !(target instanceof Element)) return null;
    return target.closest("[data-tooltip]");
}

function handlePointerEnter(e) {
    const el = getTooltipTarget(e.target);
    if (!el) return;
    scheduleShow(el, 150);
}

function handlePointerLeave(e) {
    const el = getTooltipTarget(e.target);
    if (el && el === activeTarget) {
        hideTooltip();
    }
}

function handleFocusIn(e) {
    const el = getTooltipTarget(e.target);
    if (el) scheduleShow(el, 50);
}

function handleFocusOut() {
    hideTooltip();
}

function scheduleShow(el, delay = 150) {
    clearTimeout(showTimer);
    activeTarget = el;
    showTimer = setTimeout(() => {
        if (activeTarget === el) {
            renderTooltip(el);
        }
    }, delay);
}

export function hideTooltip() {
    clearTimeout(showTimer);
    activeTarget = null;
    if (tooltipEl) {
        tooltipEl.classList.remove("visible");
        tooltipEl.setAttribute("aria-hidden", "true");
    }
}

function renderTooltip(el) {
    if (!tooltipEl || !el || !document.body.contains(el)) return;

    const text = el.getAttribute("data-tooltip");
    if (!text || !text.trim()) return;

    const kbd = el.getAttribute("data-kbd");
    const pos = el.getAttribute("data-tooltip-pos") || "bottom";

    tooltipEl.innerHTML = `
        <span class="app-tooltip-text">${escapeHtml(text)}</span>
        ${kbd ? `<kbd class="app-tooltip-kbd">${escapeHtml(kbd)}</kbd>` : ""}
    `;

    tooltipEl.classList.add("visible");
    tooltipEl.setAttribute("aria-hidden", "false");

    const targetRect = el.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    let top = 0;
    let left = 0;

    if (pos === "top") {
        top = targetRect.top - tooltipRect.height - 7;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
    } else if (pos === "left") {
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 7;
    } else if (pos === "right") {
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 7;
    } else { // default "bottom"
        top = targetRect.bottom + 7;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
    }

    // Viewport clamping
    const margin = 8;
    if (left < margin) left = margin;
    if (left + tooltipRect.width > window.innerWidth - margin) {
        left = window.innerWidth - margin - tooltipRect.width;
    }

    if (pos === "bottom" && top + tooltipRect.height > window.innerHeight - margin) {
        top = targetRect.top - tooltipRect.height - 7;
    } else if (pos === "top" && top < margin) {
        top = targetRect.bottom + 7;
    }

    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.left = `${Math.round(left)}px`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
