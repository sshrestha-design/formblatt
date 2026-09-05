// ── Interactive Digital Signature Pad (js/signature-pad.js) ──
import { state } from "./state.js";
import { showToast } from "./toast.js";

let signatureModal, signatureCanvas, sigCtx, signatureTypeInput;
let isDrawingSig = false;
let sigMode = "draw"; // "draw" | "type"
let currentSigField = null;
let hasDrawnOnCanvas = false;

export function initSignaturePad() {
    signatureModal = document.getElementById("signatureModal");
    signatureCanvas = document.getElementById("signatureCanvas");
    signatureTypeInput = document.getElementById("sigTypeInput") || document.getElementById("signatureTypeInput");

    if (!signatureCanvas) return;
    sigCtx = signatureCanvas.getContext("2d");
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#0f172a";

    let lastX = 0, lastY = 0;

    const getCoords = e => {
        const rect = signatureCanvas.getBoundingClientRect();
        const scaleX = signatureCanvas.width / rect.width;
        const scaleY = signatureCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDraw = e => {
        isDrawingSig = true;
        hasDrawnOnCanvas = true;
        const coords = getCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    };

    const draw = e => {
        if (!isDrawingSig || !sigCtx) return;
        const coords = getCoords(e);
        sigCtx.beginPath();
        sigCtx.moveTo(lastX, lastY);
        sigCtx.lineTo(coords.x, coords.y);
        sigCtx.stroke();
        lastX = coords.x;
        lastY = coords.y;
    };

    const stopDraw = () => {
        isDrawingSig = false;
    };

    // Mouse events
    signatureCanvas.addEventListener("mousedown", startDraw);
    signatureCanvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDraw);

    // Touch events for mobile/stylus/trackpad
    signatureCanvas.addEventListener("touchstart", e => {
        e.preventDefault();
        const t = e.touches[0];
        startDraw({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });

    signatureCanvas.addEventListener("touchmove", e => {
        e.preventDefault();
        const t = e.touches[0];
        draw({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });

    signatureCanvas.addEventListener("touchend", stopDraw);

    // Clear Signature
    const clearBtn = document.getElementById("clearSigBtn") || document.getElementById("clearSignatureBtn");
    clearBtn?.addEventListener("click", clearCanvas);

    // Tab switcher (Draw vs Type)
    const sigDrawTab = document.getElementById("tabDrawBtn") || document.getElementById("sigDrawTab");
    const sigTypeTab = document.getElementById("tabTypeBtn") || document.getElementById("sigTypeTab");
    const sigDrawArea = document.getElementById("sigDrawPanel") || document.getElementById("sigDrawArea");
    const sigTypeArea = document.getElementById("sigTypePanel") || document.getElementById("sigTypeArea");

    sigDrawTab?.addEventListener("click", () => {
        sigMode = "draw";
        sigDrawTab.style.background = "#eff6ff";
        sigDrawTab.style.color = "#2563eb";
        sigDrawTab.style.fontWeight = "600";
        sigTypeTab.style.background = "transparent";
        sigTypeTab.style.color = "#64748b";
        sigTypeTab.style.fontWeight = "500";
        if (sigDrawArea) sigDrawArea.style.display = "block";
        if (sigTypeArea) sigTypeArea.style.display = "none";
    });

    sigTypeTab?.addEventListener("click", () => {
        sigMode = "type";
        sigTypeTab.style.background = "#eff6ff";
        sigTypeTab.style.color = "#2563eb";
        sigTypeTab.style.fontWeight = "600";
        sigDrawTab.style.background = "transparent";
        sigDrawTab.style.color = "#64748b";
        sigDrawTab.style.fontWeight = "500";
        if (sigDrawArea) sigDrawArea.style.display = "none";
        if (sigTypeArea) sigTypeArea.style.display = "block";
        signatureTypeInput?.focus();
    });

    // Cursive live preview
    const sigTypePreview = document.getElementById("sigTypePreview");
    signatureTypeInput?.addEventListener("input", e => {
        if (sigTypePreview) {
            sigTypePreview.textContent = e.target.value || "Your Signature";
        }
    });

    // Close Modal
    const closeBtn = document.getElementById("closeSignatureBtn");
    const cancelBtn = document.getElementById("cancelSigBtn");
    closeBtn?.addEventListener("click", closeSignatureModal);
    cancelBtn?.addEventListener("click", closeSignatureModal);
}

export function openSignatureModal(field, onAdopt) {
    currentSigField = field;
    if (signatureModal) signatureModal.style.display = "flex";
    clearCanvas();
    if (signatureTypeInput) {
        signatureTypeInput.value = "";
    }
    const sigTypePreview = document.getElementById("sigTypePreview");
    if (sigTypePreview) sigTypePreview.textContent = "Your Signature";

    // Switch to Draw by default
    const sigDrawTab = document.getElementById("tabDrawBtn") || document.getElementById("sigDrawTab");
    if (sigDrawTab) sigDrawTab.click();

    // Adopt Signature
    const adoptBtn = document.getElementById("applySigBtn") || document.getElementById("adoptSignatureBtn");
    if (adoptBtn) {
        adoptBtn.onclick = () => {
            let dataUrl = null;
            if (sigMode === "draw") {
                if (!hasDrawnOnCanvas) {
                    showToast("Please draw your signature above the line first.", "warning");
                    return;
                }
                dataUrl = signatureCanvas.toDataURL("image/png");
            } else {
                const text = (signatureTypeInput?.value || "").trim();
                if (!text) {
                    showToast("Please type your signature first.", "warning");
                    return;
                }
                // Render text onto an offscreen canvas sized to match the target
                // field's aspect ratio, so acroform-builder.js doesn't have to
                // stretch/squash it when it draws the image at f.width/f.height.
                const fieldW = (currentSigField && currentSigField.width) || 200;
                const fieldH = (currentSigField && currentSigField.height) || 60;
                const RENDER_SCALE = 3; // supersample for a crisp PNG
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = Math.max(1, Math.round(fieldW * RENDER_SCALE));
                tempCanvas.height = Math.max(1, Math.round(fieldH * RENDER_SCALE));
                const tCtx = tempCanvas.getContext("2d");
                const fontSize = Math.round(tempCanvas.height * 0.5);
                tCtx.font = `italic ${fontSize}px "Caveat", "Cedarville Cursive", cursive, serif`;
                tCtx.fillStyle = "#0f172a";
                tCtx.textAlign = "center";
                tCtx.textBaseline = "middle";
                tCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
                dataUrl = tempCanvas.toDataURL("image/png");
            }

            if (currentSigField) {
                currentSigField.signatureImage = dataUrl;
            }
            closeSignatureModal();
            if (onAdopt) onAdopt(currentSigField);
        };
    }
}

export function closeSignatureModal() {
    if (signatureModal) signatureModal.style.display = "none";
}

function clearCanvas() {
    hasDrawnOnCanvas = false;
    if (sigCtx && signatureCanvas) {
        sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}
