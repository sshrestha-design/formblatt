// ── Formblatt Application Bootstrap (js/main.js) ───────────────────
import { state } from "./state.js";
import { initLandingController, showLandingScreen, renderLandingReviews, loadTemplate } from "./landing-controller.js";
import { initGradientWaves } from "./gradient-waves.js";
import { initTooltips } from "./tooltip.js";
import { showToast } from "./toast.js";
import { triggerHaptic } from "./haptics.js";
import { initCommandPalette } from "./command-palette.js";

// Initialize Vercel Analytics event queue
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// ── UI Zoom Guard ──────────────────────────────────────────────────
function initUiZoomGuard() {
    let lastTouchEnd = 0;
    document.addEventListener("touchend", e => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
}

// ── Main App Initialization ─────────────────────────────────────────
function bootstrapApp() {
    // 1. Initialize Landing Page Controller
    initLandingController(() => {
        import("./editor-app.js").then(editor => editor.refreshUI());
    });

    // 2. Initialize Command Palette (⌘K / Ctrl+K)
    initCommandPalette();

    // 3. Prevent mobile browser double-tap pinch zoom
    initUiZoomGuard();

    // 4. Initialize dynamic tooltips & accessibility
    initTooltips();

    // 5. Initialize Interactive Gradient Waves Canvas Background
    initGradientWaves();

    // 5. Global Shortcuts Modal
    const bindModal = (triggerIds, modalId, closeBtnIds = []) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const openModal = () => {
            modal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        };
        const closeModal = () => {
            modal.style.display = "none";
        };
        const triggers = Array.isArray(triggerIds) ? triggerIds : [triggerIds];
        triggers.forEach(id => {
            document.getElementById(id)?.addEventListener("click", openModal);
        });
        closeBtnIds.forEach(id => {
            document.getElementById(id)?.addEventListener("click", closeModal);
        });
        modal.addEventListener("click", e => {
            if (e.target === modal) closeModal();
        });
    };

    bindModal(["shortcutsBtn", "menuShortcutsBtn"], "shortcutsModal", ["closeShortcutsModalBtn", "shortcutsModalCloseIcon"]);
    bindModal(["feedbackBtn"], "feedbackModal", ["closeFeedbackModalBtn", "feedbackModalCloseIcon"]);

    // 6. Feedback Modal Form Submission
    const feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
        feedbackForm.addEventListener("submit", e => {
            e.preventDefault();
            const emailInput = document.getElementById("feedbackEmail");
            const msgInput = document.getElementById("feedbackMessage");
            const email = emailInput?.value.trim() || "";
            const msg = msgInput?.value.trim() || "";

            if (!msg) {
                showToast("Please enter your feedback message.", "warning");
                return;
            }

            try {
                if (window.va) {
                    window.va("event", {
                        name: "user_feedback",
                        data: {
                            email: email || "anonymous",
                            feedback: msg,
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            } catch (err) {
                console.warn("[Analytics] Feedback track error:", err);
            }

            const feedbackModal = document.getElementById("feedbackModal");
            if (feedbackModal) feedbackModal.style.display = "none";
            if (emailInput) emailInput.value = "";
            if (msgInput) msgInput.value = "";
            showToast("Thank you for your feedback! We review every message.", "success");
        });
    }

    // 7. Render dynamic customer reviews
    renderLandingReviews();

    // 8. Handle direct deep link to specific starter templates (e.g. #template=w9)
    if (window.location.hash.startsWith("#template=")) {
        const tplKey = window.location.hash.replace("#template=", "");
        if (tplKey && tplKey !== "blank") {
            loadTemplate(tplKey, () => {
                import("./editor-app.js").then(editor => editor.refreshUI());
            });
        }
    } else if (window.location.hash === "#editor" && !state.pdfDoc) {
        // Clean up any stale #editor hash from previous sessions without auto-opening blank canvas
        try {
            history.replaceState({ screen: "landing" }, "", window.location.pathname);
        } catch (e) {}
    }
}

// ── Bootstrap Execution ─────────────────────────────────────────────
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
    bootstrapApp();
}

// ── Progressive Web App (PWA) Offline Engine ────────────────────────
if ("serviceWorker" in navigator && !window.location.host.startsWith("localhost")) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then(reg => {
            console.log("[PWA] Service Worker registered for offline execution:", reg.scope);
        }).catch(err => {
            console.warn("[PWA] Service Worker registration failed:", err);
        });
    });
}

// ── User-Intent & Idle Prefetch for Editor & PDF Engines ──────────────────
let hasPrefetched = false;
export const prefetchEditorAndLibraries = () => {
    if (hasPrefetched) return;
    hasPrefetched = true;
    import("./editor-app.js");
    import("./pdf-engine.js").then(pdf => pdf.loadPdfLibraries?.());
};

function attachIntentPrefetch() {
    const triggerIds = ["navUploadBtn", "heroBrowseBtn", "heroOpenProjectBtn", "heroDropzone", "landingPdfUpload", "heroPdfUpload"];
    const triggerElements = triggerIds.map(id => document.getElementById(id)).filter(Boolean);
    const templateCards = document.querySelectorAll(".template-card, .sol-grid .tile, .sample-card");

    const onIntent = () => {
        prefetchEditorAndLibraries();
        cleanup();
    };

    const cleanup = () => {
        triggerElements.forEach(el => {
            el.removeEventListener("pointerenter", onIntent);
            el.removeEventListener("touchstart", onIntent);
            el.removeEventListener("focus", onIntent);
        });
        templateCards.forEach(el => {
            el.removeEventListener("pointerenter", onIntent);
            el.removeEventListener("touchstart", onIntent);
        });
    };

    triggerElements.forEach(el => {
        el.addEventListener("pointerenter", onIntent, { passive: true, once: true });
        el.addEventListener("touchstart", onIntent, { passive: true, once: true });
        el.addEventListener("focus", onIntent, { passive: true, once: true });
    });
    templateCards.forEach(el => {
        el.addEventListener("pointerenter", onIntent, { passive: true, once: true });
        el.addEventListener("touchstart", onIntent, { passive: true, once: true });
    });
}

if (document.readyState === "complete") {
    attachIntentPrefetch();
} else {
    window.addEventListener("load", attachIntentPrefetch, { once: true });
}
