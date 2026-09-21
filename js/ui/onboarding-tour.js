// ── Interactive Onboarding Tour (js/onboarding-tour.js) ───────────

let currentTourStep = 0;
let tourOverlayElement = null;

const TOUR_STEPS = [
    {
        targetId: "segmentedToolbar",
        title: "1. Select Creation Tools",
        description: "Choose interactive fields (Text, Checkbox, Signature) or click Auto-Detect to scan form lines automatically.",
        position: "bottom"
    },
    {
        targetId: "layersList",
        title: "2. Manage Layers & Groups",
        description: "View placed elements in the left sidebar, group related fields together, and double-click to rename layers.",
        position: "right"
    },
    {
        targetId: "generatePdfBtn",
        title: "3. Test & Export Fillable PDF",
        description: "Switch to Preview mode to test inputs, then click Export AcroForm to save a fillable PDF compatible with Adobe & Apple Preview.",
        position: "bottom-left"
    }
];

export function startOnboardingTour() {
    currentTourStep = 0;
    showStep(currentTourStep);
}

function showStep(stepIndex) {
    closeTour();
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    const target = document.getElementById(step.targetId) || document.querySelector("." + step.targetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();

    tourOverlayElement = document.createElement("div");
    tourOverlayElement.className = "onboarding-tour-popover";
    tourOverlayElement.style.cssText = `
        position: fixed;
        z-index: 9999;
        width: 310px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(2, 132, 199, 0.3);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: inherit;
        animation: popoverFade 0.2s ease-out forwards;
    `;

    // Position popover
    if (step.position === "bottom") {
        tourOverlayElement.style.top = (rect.bottom + 12) + "px";
        tourOverlayElement.style.left = Math.max(16, rect.left + (rect.width / 2) - 155) + "px";
    } else if (step.position === "right") {
        tourOverlayElement.style.top = Math.max(16, rect.top + 20) + "px";
        tourOverlayElement.style.left = (rect.right + 14) + "px";
    } else {
        tourOverlayElement.style.top = (rect.bottom + 12) + "px";
        tourOverlayElement.style.left = Math.max(16, rect.right - 310) + "px";
    }

    tourOverlayElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">Step ${stepIndex + 1} of ${TOUR_STEPS.length}</span>
            <button type="button" class="tour-close-btn" style="background: none; border: none; cursor: pointer; color: #94a3b8; padding: 2px;">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        </div>
        <div>
            <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #0f172a;">${step.title}</h4>
            <p style="margin: 0; font-size: 12.5px; color: #475569; line-height: 1.45;">${step.description}</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="tour-skip-btn" style="background: none; border: none; font-size: 12px; color: #64748b; cursor: pointer; font-weight: 500;">Skip Tour</button>
            <div style="display: flex; gap: 6px;">
                ${stepIndex > 0 ? '<button type="button" class="tour-prev-btn btn-secondary" style="padding: 4px 10px; font-size: 11.5px;">Back</button>' : ''}
                <button type="button" class="tour-next-btn btn-primary" style="padding: 4px 14px; font-size: 11.5px; font-weight: 600;">${stepIndex === TOUR_STEPS.length - 1 ? 'Got it!' : 'Next'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(tourOverlayElement);
    if (typeof lucide !== "undefined") lucide.createIcons();

    tourOverlayElement.querySelector(".tour-close-btn")?.addEventListener("click", closeTour);
    tourOverlayElement.querySelector(".tour-skip-btn")?.addEventListener("click", closeTour);
    tourOverlayElement.querySelector(".tour-prev-btn")?.addEventListener("click", () => {
        currentTourStep--;
        showStep(currentTourStep);
    });
    tourOverlayElement.querySelector(".tour-next-btn")?.addEventListener("click", () => {
        if (currentTourStep < TOUR_STEPS.length - 1) {
            currentTourStep++;
            showStep(currentTourStep);
        } else {
            closeTour();
        }
    });
}

export function closeTour() {
    if (tourOverlayElement && tourOverlayElement.parentNode) {
        tourOverlayElement.parentNode.removeChild(tourOverlayElement);
    }
    tourOverlayElement = null;
}
