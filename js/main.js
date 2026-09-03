import { state, getSelectedField, setSelectedField, getFieldsForCurrentPage, copySelectedFields, pasteClipboardFields, duplicateSelectedFields, createGroupForSelected, ungroupSelected, setEditorMode, clearAllTestValues, toggleGuides, setGuidesEnabled } from "./state.js";
import { renderPage, goToPage, setTransformScale, fitToWidth, fitToPage, updateTopBarDocInfo } from "./pdf-engine.js";
import { buildPdf, downloadAcroForm } from "./acroform-builder.js";
import { renderLayers, updateLayerSelectionDOM } from "./layers-panel.js";
import { initPropertiesPanel, populateProperties, syncDimensionInputsLive } from "./properties-panel.js";
import { renderOverlays, updateOverlayPositionsDirectly } from "./overlay-manager.js";
import { initCanvasController, handleFieldMouseDown, handleResizeStart } from "./canvas-controller.js";
import { initLandingController, showLandingScreen, renderLandingReviews, loadTemplate } from "./landing-controller.js";
import { initSignaturePad } from "./signature-pad.js";
import { autoDetectFields } from "./auto-detector.js";
import { saveHistory, undo, redo, exportProjectJson, importProjectJson } from "./storage-manager.js";
import { showToast } from "./toast.js";
import { triggerHaptic } from "./haptics.js";
import { initTooltips } from "./tooltip.js";

// Initialize Vercel Analytics event queue
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Full UI Refresh Handler
function refreshUI() {
    renderOverlays({
        onFieldMouseDown: (e, field) => handleFieldMouseDown(e, field, canvasHandlers),
        onResizeStart: (e, field, direction) => handleResizeStart(e, field, direction),
        onUpdated: () => refreshUI()
    });
    renderLayers(
        selected => {
            populateProperties(selected);
            renderOverlays(overlayHandlers);
        },
        () => refreshUI()
    );
    populateProperties(getSelectedField());
    updateToolIndicator();
    updateModeIndicator();
    if (typeof lucide !== "undefined") lucide.createIcons();
}

export function updateToolIndicator() {
    if (typeof document === "undefined") return;
    const activeBtn = document.querySelector(".segmented-toolbar .tool-btn.active");
    const indicator = document.getElementById("toolIndicator");
    if (activeBtn && indicator) {
        indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        indicator.style.width = `${activeBtn.offsetWidth}px`;
        indicator.style.opacity = "1";
    }
}

export function updateModeIndicator() {
    if (typeof document === "undefined") return;
    const activeBtn = document.querySelector(".mode-segmented-toggle .mode-toggle-btn.active");
    const indicator = document.getElementById("modeIndicator");
    if (activeBtn && indicator) {
        indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        indicator.style.width = `${activeBtn.offsetWidth}px`;
        indicator.style.opacity = "1";
        if (activeBtn.id === "modeFillBtn") {
            indicator.style.background = "#2563eb";
            indicator.style.borderColor = "#1d4ed8";
        } else {
            indicator.style.background = "#ffffff";
            indicator.style.borderColor = "#bfdbfe";
        }
    }
}

export async function deleteSelectedFieldsWithPoof() {
    if (state.selectedFieldIds.size === 0) return;
    const deletedCount = state.selectedFieldIds.size;
    const targetIds = Array.from(state.selectedFieldIds);

    // Apply smooth poof animation class to selected field DOM elements
    const overlayContainer = document.getElementById("overlayContainer");
    if (overlayContainer) {
        targetIds.forEach(id => {
            const el = overlayContainer.querySelector(`.field-overlay[data-id="${id}"]`);
            if (el) el.classList.add("field-deleting");
        });
    }

    triggerHaptic(10);
    await new Promise(res => setTimeout(res, 120));

    state.fields = state.fields.filter(f => !targetIds.includes(f.id));
    setSelectedField(null);
    saveHistory();
    refreshUI();
    showUndoToast(deletedCount > 1 ? `${deletedCount} fields removed` : "Field removed");
}

export function switchEditorMode(mode = "design") {
    if (mode === "fill" && !state.pdfDoc) {
        showToast("Please upload a PDF document first before testing form fields.", "warning");
        return;
    }
    setEditorMode(mode);
    const isFill = (mode === "fill");
    document.body.classList.toggle("mode-fill", isFill);

    const modeDesignBtn = document.getElementById("modeDesignBtn");
    const modeFillBtn = document.getElementById("modeFillBtn");
    const fillModeBanner = document.getElementById("fillModeBanner");

    if (modeDesignBtn) modeDesignBtn.classList.toggle("active", !isFill);
    if (modeFillBtn) {
        modeFillBtn.classList.toggle("active", isFill);
        modeFillBtn.classList.toggle("mode-fill-active", isFill);
    }
    if (fillModeBanner) {
        fillModeBanner.style.display = isFill ? "flex" : "none";
    }

    updateModeIndicator();
    refreshUI();
}

const overlayHandlers = {
    onFieldMouseDown: (e, field) => handleFieldMouseDown(e, field, canvasHandlers),
    onResizeStart: (e, field, direction) => handleResizeStart(e, field, direction),
    onUpdated: () => refreshUI()
};

const canvasHandlers = {
    onSelectionChange: () => {
        triggerHaptic();
        populateProperties(getSelectedField());
        renderOverlays(overlayHandlers);
        updateLayerSelectionDOM();
    },
    onFieldCreated: field => {
        triggerHaptic(12);
        refreshUI();
    },
    onFieldMoving: () => {
        updateOverlayPositionsDirectly();
        // Lightweight sync during live drag/resize (fires per mousemove) —
        // full populateProperties() here was the source of the canvas jank,
        // re-touching ~25 unrelated DOM nodes on every tick.
        syncDimensionInputsLive(getSelectedField());
    },
    onFieldUpdated: () => {
        refreshUI();
    },
    onRerender: () => {
        refreshUI();
    }
};

// ── Application Bootstrap ──────────────────────────────────────
const bootstrapApp = async () => {
    // Initialize Subsystems
    initSignaturePad();
    initPropertiesPanel(
        () => refreshUI(),
        () => refreshUI()
    );
    initCanvasController(canvasHandlers);
    initLandingController(() => refreshUI());
    initUiZoomGuard();
    initTooltips();
    if (typeof lucide !== "undefined") lucide.createIcons();

    let lastMousePos = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
    window.addEventListener("mousemove", e => {
        lastMousePos = { clientX: e.clientX, clientY: e.clientY };
    }, { passive: true });

    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
        btn.addEventListener("click", () => {
            triggerHaptic();
            document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            updateToolIndicator();
            state.activeTool = btn.dataset.tool;
            document.body.classList.toggle("tool-hand", state.activeTool === "hand");

            state.isDragging = false;
            state.isResizing = false;
            state.isLassoing = false;
            state.isPanning = false;

            if (state.activeTool !== "select" && state.activeTool !== "hand") {
                document.body.classList.add("placing-mode");
                window.dispatchEvent(new MouseEvent("mousemove", {
                    clientX: lastMousePos.clientX,
                    clientY: lastMousePos.clientY
                }));
            } else {
                document.body.classList.remove("placing-mode");
            }
        });
    });

    window.addEventListener("resize", () => {
        updateToolIndicator();
        updateModeIndicator();
    });

    // Header Dropdown Menus Setup (File & Edit)
    const setupMenuDropdown = (btnId, dropdownId) => {
        const btn = document.getElementById(btnId);
        const dropdown = document.getElementById(dropdownId);
        if (btn && dropdown) {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                document.querySelectorAll(".dropdown-menu").forEach(dm => {
                    if (dm !== dropdown) dm.classList.remove("active");
                });
                dropdown.classList.toggle("active");
            });
            dropdown.querySelectorAll(".dropdown-item").forEach(item => {
                item.addEventListener("click", () => setTimeout(() => dropdown.classList.remove("active"), 100));
            });
        }
    };
    setupMenuDropdown("fileMenuBtn", "fileMenuDropdown");
    setupMenuDropdown("editMenuBtn", "editMenuDropdown");

    document.addEventListener("click", e => {
        document.querySelectorAll(".dropdown-menu").forEach(dm => {
            if (!dm.contains(e.target)) dm.classList.remove("active");
        });
    });

    // File Menu Actions
    document.getElementById("newBlankDocMenuBtn")?.addEventListener("click", () => {
        loadTemplate("blank", () => {
            refreshUI();
        });
    });
    document.getElementById("saveProjectMenuBtn")?.addEventListener("click", exportProjectJson);
    document.getElementById("loadProjectMenuBtn")?.addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) importProjectJson(file, () => refreshUI());
        e.target.value = "";
    });

    // Edit Menu Actions
    document.getElementById("menuUndoBtn")?.addEventListener("click", () => undo(refreshUI));
    document.getElementById("menuRedoBtn")?.addEventListener("click", () => redo(refreshUI));
    document.getElementById("menuCutBtn")?.addEventListener("click", () => {
        if (state.selectedFieldIds.size === 0) return;
        copySelectedFields();
        const deletedCount = state.selectedFieldIds.size;
        state.fields = state.fields.filter(f => !state.selectedFieldIds.has(f.id));
        setSelectedField(null);
        saveHistory();
        refreshUI();
        showUndoToast(deletedCount > 1 ? `${deletedCount} fields cut` : "Field cut");
    });
    document.getElementById("menuCopyBtn")?.addEventListener("click", () => {
        if (state.selectedFieldIds.size === 0) return;
        copySelectedFields();
        showToast(state.selectedFieldIds.size > 1 ? `${state.selectedFieldIds.size} fields copied` : "Field copied");
    });
    document.getElementById("menuPasteBtn")?.addEventListener("click", () => {
        const pasted = pasteClipboardFields();
        if (pasted.length > 0) {
            saveHistory();
            refreshUI();
        }
    });
    document.getElementById("menuDuplicateBtn")?.addEventListener("click", () => {
        if (state.selectedFieldIds.size === 0) return;
        const dups = duplicateSelectedFields();
        if (dups.length > 0) {
            saveHistory();
            refreshUI();
        }
    });
    document.getElementById("menuSelectAllBtn")?.addEventListener("click", () => {
        const currentPageFields = getFieldsForCurrentPage();
        if (currentPageFields.length === 0) return;
        state.selectedFieldIds.clear();
        currentPageFields.forEach(f => state.selectedFieldIds.add(f.id));
        state.lastSelectedFieldId = currentPageFields[0]?.id || null;
        refreshUI();
    });
    document.getElementById("menuDeselectAllBtn")?.addEventListener("click", () => {
        state.selectedFieldIds.clear();
        state.lastSelectedFieldId = null;
        refreshUI();
    });
    document.getElementById("menuDeleteBtn")?.addEventListener("click", () => {
        deleteSelectedFieldsWithPoof();
    });
    document.getElementById("quickUndoBtn")?.addEventListener("click", () => {
        document.getElementById("menuUndoBtn")?.click();
    });
    document.getElementById("quickRedoBtn")?.addEventListener("click", () => {
        document.getElementById("menuRedoBtn")?.click();
    });
    document.getElementById("quickDeleteBtn")?.addEventListener("click", () => {
        document.getElementById("menuDeleteBtn")?.click();
    });

    // Keyboard Shortcuts & Help Modal Controls
    const shortcutsModal = document.getElementById("shortcutsModal");
    const openShortcutsModal = () => {
        if (shortcutsModal) {
            shortcutsModal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    };
    const closeShortcutsModal = () => {
        if (shortcutsModal) shortcutsModal.style.display = "none";
    };

    document.getElementById("shortcutsHelpBtn")?.addEventListener("click", openShortcutsModal);
    document.getElementById("shortcutsMenuBtn")?.addEventListener("click", openShortcutsModal);
    document.getElementById("landingShortcutsBtn")?.addEventListener("click", openShortcutsModal);
    document.getElementById("closeShortcutsBtn")?.addEventListener("click", closeShortcutsModal);
    document.getElementById("shortcutsDoneBtn")?.addEventListener("click", closeShortcutsModal);

    if (shortcutsModal) {
        shortcutsModal.addEventListener("click", e => {
            if (e.target === shortcutsModal) closeShortcutsModal();
        });
    }

    // User Suggestions & Review Modal Controls
    const feedbackModal = document.getElementById("feedbackModal");
    let currentRating = 5;

    const openFeedbackModal = () => {
        if (feedbackModal) {
            const formEl = document.getElementById("feedbackForm");
            const successEl = document.getElementById("feedbackSuccessState");
            if (formEl) formEl.style.display = "flex";
            if (successEl) successEl.style.display = "none";
            feedbackModal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    };
    const closeFeedbackModal = () => {
        if (feedbackModal) feedbackModal.style.display = "none";
    };

    document.getElementById("landingFeedbackBtn")?.addEventListener("click", openFeedbackModal);
    document.getElementById("footerFeedbackBtn")?.addEventListener("click", openFeedbackModal);
    document.getElementById("feedbackMenuBtn")?.addEventListener("click", openFeedbackModal);
    document.getElementById("closeFeedbackBtn")?.addEventListener("click", closeFeedbackModal);
    document.getElementById("cancelFeedbackBtn")?.addEventListener("click", closeFeedbackModal);
    document.getElementById("doneFeedbackBtn")?.addEventListener("click", closeFeedbackModal);

    if (feedbackModal) {
        feedbackModal.addEventListener("click", e => {
            if (e.target === feedbackModal) closeFeedbackModal();
        });
    }

    // Star Rating Interactivity
    const starSpans = document.querySelectorAll("#starRatingBox span");
    const updateStars = rating => {
        currentRating = rating;
        starSpans.forEach(span => {
            const r = parseInt(span.dataset.rating, 10);
            span.classList.toggle("active", r <= rating);
        });
    };
    updateStars(5);

    starSpans.forEach(span => {
        span.addEventListener("click", () => updateStars(parseInt(span.dataset.rating, 10)));
    });

    // Submit Feedback Form (In-Browser AJAX - No Mail App Required!)
    document.getElementById("feedbackForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const submitBtn = e.target.querySelector("button[type='submit']");
        const category = document.getElementById("feedbackCategory")?.value || "General Review";
        const sender = document.getElementById("feedbackSender")?.value.trim() || "Anonymous User";
        const message = document.getElementById("feedbackMessage")?.value.trim() || "";

        if (!message) return;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Sending...</span>`;
        }

        const payload = {
            name: sender,
            email: sender.includes("@") ? sender : "sagar.shrestha23@gmail.com",
            _subject: `[Formblatt Feedback] ${category} (${currentRating} Stars)`,
            rating: `${currentRating} / 5 Stars`,
            category: category,
            message: message,
            _captcha: "false",
            _template: "table"
        };

        // Local storage backup
        try {
            const savedReviews = JSON.parse(localStorage.getItem("justforms_reviews") || "[]");
            savedReviews.unshift({ date: new Date().toISOString(), rating: currentRating, category, sender, message });
            localStorage.setItem("justforms_reviews", JSON.stringify(savedReviews.slice(0, 50)));
            renderLandingReviews();
        } catch(err) {}

        // Send via background fetch (No Mail App Popups!)
        try {
            await fetch("https://formsubmit.co/ajax/sagar.shrestha23@gmail.com", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch(err) {
            console.warn("Background fetch warning (saved locally):", err);
        }

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i data-lucide="send" style="width:14px; height:14px;"></i> Send Feedback`;
        }

        const formEl = document.getElementById("feedbackForm");
        const successEl = document.getElementById("feedbackSuccessState");
        if (formEl && successEl) {
            formEl.style.display = "none";
            successEl.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        } else {
            closeFeedbackModal();
        }

        showNoticeToast("Thank you! Your feedback has been sent to Sagar Shrestha.", "heart");

        const msgInput = document.getElementById("feedbackMessage");
        if (msgInput) msgInput.value = "";
    });

    // Page Navigation Buttons
    document.getElementById("prevPageBtn")?.addEventListener("click", () => goToPage(state.currentPageNum - 1, refreshUI));
    document.getElementById("nextPageBtn")?.addEventListener("click", () => goToPage(state.currentPageNum + 1, refreshUI));

    // Floating Notice Toast Notification Helper
    function showNoticeToast(msg) {
        const existing = document.querySelector(".notice-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "notice-toast";
        toast.innerHTML = `<span>${msg}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translate(-50%, 15px) scale(0.94)";
            setTimeout(() => toast.remove(), 350);
        }, 3000);
    }

    // Smart Alignment & Snapping Guides Toggle
    function syncGuidesUI(enabled = state.guidesEnabled) {
        const btn = document.getElementById("toggleGuidesBtn");
        if (btn) {
            btn.classList.toggle("active", enabled);
            btn.title = `Smart Alignment Guides: ${enabled ? "ON" : "OFF"} (Ctrl/Cmd+;)`;
            btn.style.color = enabled ? "#2563eb" : "#94a3b8";
        }
        const menuText = document.getElementById("toggleGuidesMenuText");
        if (menuText) {
            menuText.textContent = `Smart Guides: ${enabled ? "ON" : "OFF"}`;
        }
        const ctxText = document.getElementById("ctxGuidesText");
        if (ctxText) {
            ctxText.textContent = `Snap Guides: ${enabled ? "ON" : "OFF"}`;
        }
    }

    const toggleGuidesAction = () => {
        const enabled = toggleGuides();
        syncGuidesUI(enabled);
        if (!enabled) {
            const v = document.getElementById("vAlignLine");
            const h = document.getElementById("hAlignLine");
            const dot = document.getElementById("snapPointDot");
            if (v) v.style.display = "none";
            if (h) h.style.display = "none";
            if (dot) dot.style.display = "none";
            document.querySelectorAll(".spacing-badge, .align-line").forEach(el => el.style.display = "none");
        }
        showNoticeToast(enabled ? "Smart Alignment Guides: ON" : "Smart Alignment Guides: OFF");
    };

    document.getElementById("toggleGuidesBtn")?.addEventListener("click", toggleGuidesAction);
    document.getElementById("toggleGuidesMenuBtn")?.addEventListener("click", toggleGuidesAction);
    syncGuidesUI(state.guidesEnabled);

    // Auto-Detect Fields Action
    const autoDetectBtn = document.getElementById("autoDetectBtn");
    autoDetectBtn?.addEventListener("click", async () => {
        if (!state.pdfDoc) {
            showToast("Please load a PDF document first.", "warning");
            return;
        }

        const originalHtml = autoDetectBtn.innerHTML;
        autoDetectBtn.disabled = true;
        autoDetectBtn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 13px; height: 13px;"></i> Scanning...`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        const canvasContainer = document.getElementById("canvasContainer");
        let scanHud = null;
        let statusPill = null;

        if (canvasContainer) {
            scanHud = document.createElement("div");
            scanHud.className = "scan-hud";
            scanHud.innerHTML = `
                <div class="scan-overlay"></div>
                <div class="scan-line"></div>
                <div class="scan-status-pill">
                    <i data-lucide="scan" style="width: 14px; height: 14px; color: #38bdf8;"></i>
                    <span id="scanStatusText">Analyzing vector layout & grid...</span>
                </div>
            `;
            canvasContainer.appendChild(scanHud);
            if (typeof lucide !== "undefined") lucide.createIcons();
            statusPill = document.getElementById("scanStatusText");
        }

        try {
            // Stage 1: Vector layout & table grid
            await new Promise(r => setTimeout(r, 240));
            if (statusPill) statusPill.textContent = "Scanning static text baselines & labels...";

            // Stage 2: Execute actual field auto-detection
            const countPromise = autoDetectFields("current");
            await new Promise(r => setTimeout(r, 260));
            if (statusPill) statusPill.textContent = "Synthesizing interactive AcroForm fields...";
            
            const count = await countPromise;
            await new Promise(r => setTimeout(r, 220));

            if (scanHud) {
                scanHud.style.opacity = "0";
                scanHud.style.transition = "opacity 0.2s ease";
                setTimeout(() => scanHud.remove(), 200);
            }

            if (count > 0) {
                refreshUI();
                
                // Staggered indigo scan wave animation on newly detected field overlays
                const overlayContainer = document.getElementById("overlayContainer");
                if (overlayContainer) {
                    overlayContainer.querySelectorAll(".field-overlay").forEach((el, idx) => {
                        el.classList.add("field-scan-wave");
                        el.style.animationDelay = `${idx * 40}ms`;
                        setTimeout(() => {
                            el.classList.remove("field-scan-wave");
                            el.style.animationDelay = "";
                        }, 1200 + (idx * 40));
                    });
                }

                showNoticeToast(`Detected ${count} form field${count > 1 ? 's' : ''}`);
                if (window.va) {
                    window.va("event", { name: "auto_detect_completed", data: { count } });
                }
            } else {
                showNoticeToast("No new form fields detected on this page");
            }
        } catch(err) {
            if (scanHud) scanHud.remove();
            console.error("Auto detect failed:", err);
            showToast("Auto-detect failed: " + err.message, "error");
        } finally {
            autoDetectBtn.disabled = false;
            autoDetectBtn.innerHTML = originalHtml;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // Export and Preview Buttons
    document.getElementById("generatePdfBtn")?.addEventListener("click", () => {
        triggerHaptic(12);
        openExportModal();
    });
    document.getElementById("previewDownloadBtn")?.addEventListener("click", openExportModal);

    // ── 2-Step Export Modal & Toast Controller ──────────────────────
    const exportModal = document.getElementById("exportModal");
    const exportFilenameInput = document.getElementById("exportFilenameInput");
    const closeExportModalBtn = document.getElementById("closeExportModalBtn");
    const cancelExportBtn = document.getElementById("cancelExportBtn");
    const confirmExportBtn = document.getElementById("confirmExportBtn");
    const confirmExportBtnText = document.getElementById("confirmExportBtnText");
    const exportSuccessToast = document.getElementById("exportSuccessToast");
    const toastFilenameDesc = document.getElementById("toastFilenameDesc");
    const dismissToastBtn = document.getElementById("dismissToastBtn");
    let toastTimeout = null;

    function sanitizeFilename(name) {
        return (name || "").replace(/[/\\?%*:|"<>]/g, "-").trim();
    }

    function openExportModal() {
        if (!state.originalPdfBytes) {
            showToast("Please upload a PDF document before exporting.", "warning");
            return;
        }

        const rawName = (state.pdfFileName || "document.pdf").replace(/\.pdf$/i, "");
        const defaultName = sanitizeFilename(rawName) + "_fillable";
        if (exportFilenameInput) {
            exportFilenameInput.value = defaultName;
        }

        if (exportModal) {
            exportModal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
            setTimeout(() => {
                exportFilenameInput?.focus();
                exportFilenameInput?.select();
            }, 50);
        }
    }

    function closeExportModal() {
        if (exportModal) exportModal.style.display = "none";
    }

    // Live input sanitization
    exportFilenameInput?.addEventListener("input", e => {
        const start = e.target.selectionStart;
        const cleaned = sanitizeFilename(e.target.value);
        if (cleaned !== e.target.value) {
            e.target.value = cleaned;
            try { e.target.setSelectionRange(start, start); } catch(ex){}
        }
    });

    closeExportModalBtn?.addEventListener("click", closeExportModal);
    cancelExportBtn?.addEventListener("click", closeExportModal);

    // Export Mode Selection styling toggles
    const acroformRadio = document.querySelector('input[name="exportMode"][value="acroform"]');
    const flattenRadio = document.querySelector('input[name="exportMode"][value="flatten"]');
    const labelAcroFormOption = document.getElementById("labelAcroFormOption");
    const labelFlattenOption = document.getElementById("labelFlattenOption");

    function updateExportModeStyle() {
        if (acroformRadio && acroformRadio.checked) {
            if (labelAcroFormOption) { labelAcroFormOption.style.border = "1.5px solid #2563eb"; labelAcroFormOption.style.background = "#eff6ff"; }
            if (labelFlattenOption) { labelFlattenOption.style.border = "1px solid #e2e8f0"; labelFlattenOption.style.background = "#ffffff"; }
        } else if (flattenRadio && flattenRadio.checked) {
            if (labelFlattenOption) { labelFlattenOption.style.border = "1.5px solid #2563eb"; labelFlattenOption.style.background = "#eff6ff"; }
            if (labelAcroFormOption) { labelAcroFormOption.style.border = "1px solid #e2e8f0"; labelAcroFormOption.style.background = "#ffffff"; }
        }
    }
    acroformRadio?.addEventListener("change", updateExportModeStyle);
    flattenRadio?.addEventListener("change", updateExportModeStyle);

    // Export Form Submission Handler
    document.getElementById("exportModalForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!state.originalPdfBytes) return;

        const rawVal = exportFilenameInput?.value || "";
        const customName = sanitizeFilename(rawVal) || "fillable_document";

        const selectedMode = document.querySelector('input[name="exportMode"]:checked')?.value || "acroform";
        const isFlatten = selectedMode === "flatten";
        const includeJsonBackup = document.getElementById("exportIncludeProjectJson")?.checked || false;

        // Set Loading & Disabled State with Morphing Spinner
        if (confirmExportBtn) confirmExportBtn.disabled = true;
        if (confirmExportBtn) {
            confirmExportBtn.innerHTML = '<i data-lucide="loader-2" class="export-spinner" style="width: 14px; height: 14px;"></i> <span>Generating AcroForm...</span>';
            if (typeof lucide !== "undefined") lucide.createIcons();
        }

        try {
            const bytes = await buildPdf({ flatten: isFlatten });
            const blob = new Blob([bytes], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${customName}.pdf`;
            a.click();
            URL.revokeObjectURL(url);

            if (includeJsonBackup) {
                exportProjectJson();
            }

            // Success Morph: Emerald Green Checkmark Bounce
            confirmExportBtn.style.background = "#16a34a";
            confirmExportBtn.style.borderColor = "#15803d";
            confirmExportBtn.innerHTML = '<i data-lucide="check" class="export-check-bounce" style="width: 15px; height: 15px; color: #ffffff;"></i> <span>Exported!</span>';
            if (typeof lucide !== "undefined") lucide.createIcons();
            triggerHaptic(20);

            setTimeout(() => {
                closeExportModal();
                showExportToast(customName);
                setTimeout(() => {
                    if (confirmExportBtn) {
                        confirmExportBtn.style.background = "";
                        confirmExportBtn.style.borderColor = "";
                        confirmExportBtn.disabled = false;
                        confirmExportBtn.innerHTML = '<i data-lucide="download" style="width: 14px; height: 14px;"></i> <span id="confirmExportBtnText">Download PDF</span>';
                        if (typeof lucide !== "undefined") lucide.createIcons();
                    }
                }, 400);
            }, 750);
        } catch (err) {
            console.error("Export Error:", err);
            showToast("Failed to export PDF: " + err.message, "error");
            if (confirmExportBtn) {
                confirmExportBtn.disabled = false;
                confirmExportBtn.style.background = "";
                confirmExportBtn.style.borderColor = "";
                confirmExportBtn.innerHTML = '<i data-lucide="download" style="width: 14px; height: 14px;"></i> <span id="confirmExportBtnText">Download PDF</span>';
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    });

    function showExportToast(filename) {
        if (!exportSuccessToast) return;
        if (toastFilenameDesc) {
            toastFilenameDesc.textContent = `Saved as ${filename}.pdf to your Downloads folder.`;
        }
        exportSuccessToast.style.display = "flex";
        if (typeof lucide !== "undefined") lucide.createIcons();

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            exportSuccessToast.style.display = "none";
        }, 4000);
    }

    dismissToastBtn?.addEventListener("click", () => {
        if (exportSuccessToast) exportSuccessToast.style.display = "none";
        if (toastTimeout) clearTimeout(toastTimeout);
    });

    // ── Save Project (.formblatt) Modal Controller ──────────────────
    const saveProjectModal = document.getElementById("saveProjectModal");
    const closeSaveProjectModalBtn = document.getElementById("closeSaveProjectModalBtn");
    const cancelSaveProjectBtn = document.getElementById("cancelSaveProjectBtn");
    const saveReplaceNameDisplay = document.getElementById("saveReplaceNameDisplay");
    const saveReplaceRadio = document.querySelector('input[name="saveProjectAction"][value="replace"]');
    const saveNewCopyRadio = document.querySelector('input[name="saveProjectAction"][value="new_copy"]');
    const labelSaveReplaceOption = document.getElementById("labelSaveReplaceOption");
    const labelSaveNewCopyOption = document.getElementById("labelSaveNewCopyOption");
    const saveNewCopyInputContainer = document.getElementById("saveNewCopyInputContainer");
    const saveNewCopyFilenameInput = document.getElementById("saveNewCopyFilenameInput");

    function openSaveProjectModal() {
        if (!saveProjectModal) return;
        const currentBase = (state.fileName || "interactive_form").replace(/\.pdf$/i, "").replace(/\.formblatt$/i, "").replace(/\.fblatt$/i, "").replace(/\.jform$/i, "").replace(/\.justforms$/i, "");
        
        if (saveReplaceNameDisplay) {
            saveReplaceNameDisplay.textContent = `${currentBase}.formblatt`;
        }
        if (saveNewCopyFilenameInput) {
            saveNewCopyFilenameInput.value = `${currentBase}_copy`;
        }

        if (saveReplaceRadio) saveReplaceRadio.checked = true;
        updateSaveActionStyle();

        saveProjectModal.style.display = "flex";
        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function closeSaveProjectModal() {
        if (saveProjectModal) saveProjectModal.style.display = "none";
    }

    function updateSaveActionStyle() {
        if (saveReplaceRadio && saveReplaceRadio.checked) {
            if (labelSaveReplaceOption) { labelSaveReplaceOption.style.border = "1.5px solid #2563eb"; labelSaveReplaceOption.style.background = "#eff6ff"; }
            if (labelSaveNewCopyOption) { labelSaveNewCopyOption.style.border = "1px solid #e2e8f0"; labelSaveNewCopyOption.style.background = "#ffffff"; }
            if (saveNewCopyInputContainer) saveNewCopyInputContainer.style.display = "none";
        } else if (saveNewCopyRadio && saveNewCopyRadio.checked) {
            if (labelSaveNewCopyOption) { labelSaveNewCopyOption.style.border = "1.5px solid #2563eb"; labelSaveNewCopyOption.style.background = "#eff6ff"; }
            if (labelSaveReplaceOption) { labelSaveReplaceOption.style.border = "1px solid #e2e8f0"; labelSaveReplaceOption.style.background = "#ffffff"; }
            if (saveNewCopyInputContainer) saveNewCopyInputContainer.style.display = "block";
            setTimeout(() => {
                saveNewCopyFilenameInput?.focus();
                saveNewCopyFilenameInput?.select();
            }, 50);
        }
    }

    saveReplaceRadio?.addEventListener("change", updateSaveActionStyle);
    saveNewCopyRadio?.addEventListener("change", updateSaveActionStyle);
    closeSaveProjectModalBtn?.addEventListener("click", closeSaveProjectModal);
    cancelSaveProjectBtn?.addEventListener("click", closeSaveProjectModal);

    document.getElementById("saveProjectMenuBtn")?.addEventListener("click", openSaveProjectModal);

    document.getElementById("saveProjectModalForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const isNewCopy = saveNewCopyRadio && saveNewCopyRadio.checked;
        let targetName = null;
        if (isNewCopy && saveNewCopyFilenameInput) {
            targetName = sanitizeFilename(saveNewCopyFilenameInput.value) || "interactive_form_copy";
        } else {
            targetName = (state.fileName || "interactive_form").replace(/\.pdf$/i, "");
        }

        exportProjectJson(targetName);
        closeSaveProjectModal();
        showExportToast(`${targetName}.jform`);
    });

    // Close Modals on ESC Key or Save Shortcut ⌘S
    window.addEventListener("keydown", e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            openSaveProjectModal();
        } else if (e.key === "Escape") {
            if (exportModal && exportModal.style.display !== "none") closeExportModal();
            if (saveProjectModal && saveProjectModal.style.display !== "none") closeSaveProjectModal();
            const leaveModal = document.getElementById("leaveEditorModal");
            if (leaveModal && leaveModal.style.display !== "none") leaveModal.style.display = "none";
        }
    });

    // ── Top Bar Inline Rename Controller ───────────────────────────
    const docTitleInline = document.getElementById("docTitleInline");
    const docTitleInlineInput = document.getElementById("docTitleInlineInput");

    function commitInlineRename() {
        if (!docTitleInlineInput || !docTitleInline) return;
        let val = docTitleInlineInput.value.replace(/[/\\?%*:|"<>]/g, "-").trim();
        if (!val) val = "interactive_form.pdf";
        if (!val.endsWith(".pdf")) val += ".pdf";
        
        state.fileName = val;
        docTitleInlineInput.style.display = "none";
        docTitleInline.style.display = "inline";
        updateTopBarDocInfo();
    }

    docTitleInline?.addEventListener("click", () => {
        if (!docTitleInlineInput) return;
        docTitleInlineInput.value = state.fileName || "interactive_form.pdf";
        docTitleInline.style.display = "none";
        docTitleInlineInput.style.display = "inline-block";
        docTitleInlineInput.focus();
        docTitleInlineInput.select();
    });

    docTitleInlineInput?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            commitInlineRename();
        } else if (e.key === "Escape") {
            docTitleInlineInput.style.display = "none";
            if (docTitleInline) docTitleInline.style.display = "inline";
        }
    });

    docTitleInlineInput?.addEventListener("blur", commitInlineRename);

    // ── Mode Switcher & Fill & Test Mode Actions ────────────────────
    document.getElementById("modeDesignBtn")?.addEventListener("click", () => {
        triggerHaptic();
        switchEditorMode("design");
    });
    document.getElementById("modeFillBtn")?.addEventListener("click", () => {
        triggerHaptic();
        switchEditorMode("fill");
    });
    document.getElementById("fillExitBtn")?.addEventListener("click", () => switchEditorMode("design"));
    document.getElementById("fillResetDataBtn")?.addEventListener("click", () => {
        if (confirm("Reset and clear all entered test data?")) {
            clearAllTestValues();
            refreshUI();
        }
    });
    document.getElementById("fillExportPdfBtn")?.addEventListener("click", async () => {
        await downloadAcroForm();
    });

    const previewBtn = document.getElementById("previewBtn");
    const previewModal = document.getElementById("previewModal");
    const previewIframe = document.getElementById("previewIframe");
    const closePreviewBtn = document.getElementById("closePreviewBtn");

    previewBtn?.addEventListener("click", async () => {
        if (!state.originalPdfBytes) { showToast("Please upload a PDF first.", "warning"); return; }
        try {
            const bytes = await buildPdf();
            if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
            state.currentPreviewUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            if (previewModal) previewModal.style.display = "flex";
            if (previewIframe) previewIframe.src = state.currentPreviewUrl;
            if (typeof lucide !== "undefined") lucide.createIcons();
        } catch(e) {
            console.error("Preview failed:", e);
            showToast("Preview failed: " + e.message, "error");
        }
    });

    document.getElementById("previewNewTabBtn")?.addEventListener("click", () => {
        if (state.currentPreviewUrl) window.open(state.currentPreviewUrl, "_blank");
    });

    closePreviewBtn?.addEventListener("click", () => {
        if (previewModal) previewModal.style.display = "none";
        if (previewIframe) previewIframe.src = "";
    });

    // ── Unsaved Changes Protection (Browser Refresh / Close Safety) ────
    window.addEventListener("beforeunload", e => {
        if (state.fields && state.fields.length > 0) {
            e.preventDefault();
            e.returnValue = "Your form fields are saved in browser storage. Are you sure you want to leave?";
            return e.returnValue;
        }
    });

    // ── Group Selected Button (Left Layers Header) ───────────────────
    document.getElementById("groupSelectedBtn")?.addEventListener("click", () => {
        if (state.selectedFieldIds.size > 0) {
            const grp = createGroupForSelected();
            if (grp) {
                saveHistory();
                refreshUI();
            }
        } else {
            showToast("Please select one or more fields to create a group.", "warning");
        }
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", e => {
        // Only enable keyboard shortcuts when the editor screen is active
        const editorScreen = document.getElementById("appEditorScreen");
        if (!editorScreen || editorScreen.style.display === "none") {
            return;
        }

        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
            return;
        }

        // Select All Fields on Current Page (Ctrl+A / Cmd+A)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
            e.preventDefault();
            const pageFields = state.fields.filter(f => (f.page || 1) === state.currentPageNum);
            if (pageFields.length > 0) {
                state.selectedFieldIds.clear();
                pageFields.forEach(f => state.selectedFieldIds.add(f.id));
                refreshUI();
            }
            return;
        }

        // Group / Ungroup (Ctrl+G / Cmd+G)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
            e.preventDefault();
            if (e.shiftKey) {
                ungroupSelected();
                saveHistory();
                refreshUI();
            } else if (state.selectedFieldIds.size > 0) {
                const grp = createGroupForSelected();
                if (grp) {
                    saveHistory();
                    refreshUI();
                }
            }
            return;
        }

        // Copy (Ctrl+C / Cmd+C)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
            e.preventDefault();
            copySelectedFields();
            return;
        }

        // Paste (Ctrl+V / Cmd+V)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
            e.preventDefault();
            const pasted = pasteClipboardFields();
            if (pasted.length > 0) {
                saveHistory();
                refreshUI();
            }
            return;
        }

        // Duplicate (Ctrl+D / Cmd+D)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
            e.preventDefault();
            const dups = duplicateSelectedFields();
            if (dups.length > 0) {
                saveHistory();
                refreshUI();
            }
            return;
        }

        // Undo / Redo
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) redo(refreshUI);
            else undo(refreshUI);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
            e.preventDefault();
            redo(refreshUI);
            return;
        }

        // Toggle Smart Guides (Ctrl+; / Cmd+;)
        if ((e.ctrlKey || e.metaKey) && (e.key === ";" || e.key === ":")) {
            e.preventDefault();
            toggleGuidesAction();
            return;
        }

        // Toggle Left Sidebar (Ctrl+\ / Cmd+\)
        if ((e.ctrlKey || e.metaKey) && (e.key === "\\" || e.code === "Backslash")) {
            e.preventDefault();
            toggleLeftSidebar();
            return;
        }

        // Toggle Right Properties Sidebar (Ctrl+/ / Cmd+/ or Ctrl+] / Cmd+])
        if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.key === "]" || e.code === "Slash" || e.code === "BracketRight")) {
            e.preventDefault();
            toggleRightSidebar();
            return;
        }

        // Zoom In (Ctrl++ / Cmd++)
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
            e.preventDefault();
            setTransformScale(state.currentScale + 0.15, refreshUI);
            return;
        }

        // Zoom Out (Ctrl+- / Cmd+-)
        if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_")) {
            e.preventDefault();
            setTransformScale(state.currentScale - 0.15, refreshUI);
            return;
        }

        // Reset Zoom 100% (Ctrl+0 / Cmd+0)
        if ((e.ctrlKey || e.metaKey) && e.key === "0") {
            e.preventDefault();
            setTransformScale(1.0, refreshUI);
            return;
        }

        // Fit to Width (Ctrl+9 / Cmd+9)
        if ((e.ctrlKey || e.metaKey) && e.key === "9") {
            e.preventDefault();
            fitToWidth(refreshUI);
            return;
        }

        // Escape exits Fill Mode if active
        if (e.key === "Escape" && state.editorMode === "fill") {
            e.preventDefault();
            switchEditorMode("design");
            return;
        }

        // Delete Selected
        if (e.key === "Backspace" || e.key === "Delete") {
            if (state.selectedFieldIds.size > 0) {
                e.preventDefault();
                deleteSelectedFieldsWithPoof();
            }
            return;
        }

        // Page Navigation Shortcuts
        if (e.key === "[" || e.key === "PageUp") {
            e.preventDefault();
            goToPage(state.currentPageNum - 1, refreshUI);
            return;
        }
        if (e.key === "]" || e.key === "PageDown") {
            e.preventDefault();
            goToPage(state.currentPageNum + 1, refreshUI);
            return;
        }

        // Arrow Keys Precision Nudging (Shift = 10px, Normal = 1px)
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            if (state.selectedFieldIds.size > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === "ArrowLeft" ? -step : (e.key === "ArrowRight" ? step : 0);
                const dy = e.key === "ArrowUp" ? -step : (e.key === "ArrowDown" ? step : 0);

                state.selectedFieldIds.forEach(id => {
                    const f = state.fields.find(item => item.id === id);
                    if (f && (f.page || 1) === state.currentPageNum) {
                        f.x = Math.max(0, Math.round(f.x + dx));
                        f.y = Math.max(0, Math.round(f.y + dy));
                    }
                });
                saveHistory();
                refreshUI();
                return;
            }
        }

        // Help / Shortcuts Modal Toggle
        if (e.key === "?" || (e.shiftKey && e.key === "/")) {
            e.preventDefault();
            if (shortcutsModal && shortcutsModal.style.display === "flex") {
                closeShortcutsModal();
            } else {
                openShortcutsModal();
            }
            return;
        }

        // Tool Shortcuts
        const toolKeys = {
            v: "select",
            h: "hand",
            t: "textField",
            d: "dropdown",
            c: "checkBox",
            r: "radioGroup",
            s: "signature"
        };
        const key = e.key.toLowerCase();
        if (toolKeys[key]) {
            const btn = document.querySelector(`.tool-btn[data-tool="${toolKeys[key]}"]`);
            if (btn) btn.click();
        }
    });

    // Toggle Sidebar & Panels (In-Panel Headers + Toolbar Controls)
    document.getElementById("toggleSidebarBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleLeftSidebar();
    });
    document.getElementById("collapseLeftPanelBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleLeftSidebar();
    });
    document.getElementById("collapseRightPanelBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleRightSidebar();
    });
    document.getElementById("collapseRightEmptyBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleRightSidebar();
    });
    document.getElementById("collapseMultiPropsBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleRightSidebar();
    });
    document.getElementById("toggleRightSidebarBtn")?.addEventListener("click", () => {
        triggerHaptic();
        toggleRightSidebar();
    });

    // Zoom & View Controls
    document.getElementById("zoomInBtn")?.addEventListener("click", () => setTransformScale(state.currentScale + 0.15, refreshUI));
    document.getElementById("zoomOutBtn")?.addEventListener("click", () => setTransformScale(state.currentScale - 0.15, refreshUI));
    document.getElementById("fitWidthQuickBtn")?.addEventListener("click", () => fitToWidth(refreshUI));
    document.getElementById("fitPageQuickBtn")?.addEventListener("click", () => fitToPage(refreshUI));
    document.getElementById("zoomFitWidthBtn")?.addEventListener("click", () => fitToWidth(refreshUI));
    document.getElementById("zoomFitPageBtn")?.addEventListener("click", () => fitToPage(refreshUI));

    document.querySelectorAll(".zoom-preset-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const z = parseFloat(btn.dataset.zoom);
            if (!isNaN(z)) setTransformScale(z, refreshUI);
        });
    });

    setupMenuDropdown("zoomLevelDisplay", "zoomDropdownMenu");

    // Initialize Draggable Panel Resizers
    initPanelResizers();
    initMobileEditorLayout();

    // Default to landing screen
    showLandingScreen(true, true);
    if (typeof lucide !== "undefined") lucide.createIcons();
};

function initUiZoomGuard() {
    const isCanvasGesture = target => target?.closest("#centerCanvas, #canvasContainer");
    const preventBrowserWheelZoom = e => {
        if ((e.ctrlKey || e.metaKey) && !isCanvasGesture(e.target)) e.preventDefault();
    };
    const preventBrowserGestureZoom = e => {
        if (!isCanvasGesture(e.target)) e.preventDefault();
    };

    // Keep browser-level pinch/Ctrl+wheel zoom from resizing the editor UI.
    document.addEventListener("wheel", preventBrowserWheelZoom, { capture: true, passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach(type => {
        document.addEventListener(type, preventBrowserGestureZoom, { capture: true, passive: false });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
    bootstrapApp();
}
function initPanelResizers() {
    const leftPanel = document.querySelector(".left-panel");
    const leftResizer = document.getElementById("leftPanelResizer");
    const rightPanel = document.querySelector(".right-panel");
    const rightResizer = document.getElementById("rightPanelResizer");
    const expandBtn = document.getElementById("expandLeftPanelWidthBtn");

    const applyLeftWidth = (w) => {
        if (!leftPanel) return;
        const clamped = Math.max(200, Math.min(700, Math.round(w)));
        const px = `${clamped}px`;
        leftPanel.style.width = px;
        leftPanel.style.minWidth = px;
        leftPanel.style.maxWidth = px;
        leftPanel.style.setProperty("--left-panel-width", px);
    };

    const applyRightWidth = (w) => {
        if (!rightPanel) return;
        const clamped = Math.max(220, Math.min(700, Math.round(w)));
        const px = `${clamped}px`;
        rightPanel.style.width = px;
        rightPanel.style.minWidth = px;
        rightPanel.style.maxWidth = px;
        rightPanel.style.setProperty("--right-panel-width", px);
    };

    // Restore saved panel widths from localStorage or apply comfortable default
    try {
        const savedLeft = localStorage.getItem("justforms_left_panel_width");
        if (savedLeft && leftPanel) {
            const val = parseInt(savedLeft, 10);
            if (!isNaN(val) && val >= 200 && val <= 700) {
                applyLeftWidth(val);
            } else {
                applyLeftWidth(300);
            }
        } else {
            applyLeftWidth(300);
        }

        const savedRight = localStorage.getItem("justforms_right_panel_width");
        if (savedRight && rightPanel) {
            const val = parseInt(savedRight, 10);
            if (!isNaN(val) && val >= 220 && val <= 700) {
                applyRightWidth(val);
            } else {
                applyRightWidth(300);
            }
        } else {
            applyRightWidth(300);
        }
    } catch (e) {}

    // Quick Width Toggle Button in Layers Header
    if (expandBtn && leftPanel) {
        expandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const currentW = leftPanel.getBoundingClientRect().width;
            const targetW = currentW < 380 ? 440 : 300;
            applyLeftWidth(targetW);
            try { localStorage.setItem("justforms_left_panel_width", targetW.toString()); } catch (e) {}
        });
    }

    // Left Panel Resizer Logic
    if (leftPanel) {
        let isDragging = false;
        let startX = 0;
        let startWidth = 0;

        const startLeftDrag = (clientX) => {
            isDragging = true;
            startX = clientX;
            startWidth = leftPanel.getBoundingClientRect().width || 300;

            if (leftResizer) leftResizer.classList.add("is-resizing");
            leftPanel.classList.add("is-resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";

            const onMove = (e) => {
                if (!isDragging) return;
                const currentX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : startX);
                const deltaX = currentX - startX;
                const maxAllowed = Math.min(700, Math.floor(window.innerWidth * 0.6));
                const newWidth = Math.max(200, Math.min(maxAllowed, Math.round(startWidth + deltaX)));
                applyLeftWidth(newWidth);
            };

            const onEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                if (leftResizer) leftResizer.classList.remove("is-resizing");
                leftPanel.classList.remove("is-resizing");
                document.body.style.cursor = "";
                document.body.style.userSelect = "";

                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onEnd);
                window.removeEventListener("pointercancel", onEnd);
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onEnd);
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);

                const finalW = parseInt(leftPanel.style.width, 10);
                if (!isNaN(finalW)) {
                    try { localStorage.setItem("justforms_left_panel_width", finalW.toString()); } catch (e) {}
                }
            };

            window.addEventListener("pointermove", onMove, { passive: false });
            window.addEventListener("pointerup", onEnd);
            window.addEventListener("pointercancel", onEnd);
            window.addEventListener("mousemove", onMove, { passive: false });
            window.addEventListener("mouseup", onEnd);
            window.addEventListener("touchmove", onMove, { passive: false });
            window.addEventListener("touchend", onEnd);
        };

        if (leftResizer) {
            leftResizer.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                startLeftDrag(e.clientX);
            });

            leftResizer.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                startLeftDrag(e.clientX);
            });

            leftResizer.addEventListener("touchstart", (e) => {
                if (e.touches && e.touches[0]) {
                    startLeftDrag(e.touches[0].clientX);
                }
            }, { passive: true });

            leftResizer.addEventListener("dblclick", (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyLeftWidth(300);
                try { localStorage.setItem("justforms_left_panel_width", "300px"); } catch (e) {}
            });
        }

        // Also enable direct drag along the right border of the left panel card itself
        leftPanel.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            const rect = leftPanel.getBoundingClientRect();
            if (e.clientX >= rect.right - 12 && e.clientX <= rect.right + 6) {
                e.preventDefault();
                e.stopPropagation();
                startLeftDrag(e.clientX);
            }
        });
    }

    // Right Panel Resizer Logic
    if (rightPanel) {
        let isDragging = false;
        let startX = 0;
        let startWidth = 0;

        const startRightDrag = (clientX) => {
            isDragging = true;
            startX = clientX;
            startWidth = rightPanel.getBoundingClientRect().width || 300;

            if (rightResizer) rightResizer.classList.add("is-resizing");
            rightPanel.classList.add("is-resizing");
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";

            const onMove = (e) => {
                if (!isDragging) return;
                const currentX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : startX);
                const deltaX = startX - currentX;
                const maxAllowed = Math.min(700, Math.floor(window.innerWidth * 0.6));
                const newWidth = Math.max(220, Math.min(maxAllowed, Math.round(startWidth + deltaX)));
                applyRightWidth(newWidth);
            };

            const onEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                if (rightResizer) rightResizer.classList.remove("is-resizing");
                rightPanel.classList.remove("is-resizing");
                document.body.style.cursor = "";
                document.body.style.userSelect = "";

                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onEnd);
                window.removeEventListener("pointercancel", onEnd);
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onEnd);
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);

                const finalW = parseInt(rightPanel.style.width, 10);
                if (!isNaN(finalW)) {
                    try { localStorage.setItem("justforms_right_panel_width", finalW.toString()); } catch (e) {}
                }
            };

            window.addEventListener("pointermove", onMove, { passive: false });
            window.addEventListener("pointerup", onEnd);
            window.addEventListener("pointercancel", onEnd);
            window.addEventListener("mousemove", onMove, { passive: false });
            window.addEventListener("mouseup", onEnd);
            window.addEventListener("touchmove", onMove, { passive: false });
            window.addEventListener("touchend", onEnd);
        };

        if (rightResizer) {
            rightResizer.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                startRightDrag(e.clientX);
            });

            rightResizer.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                startRightDrag(e.clientX);
            });

            rightResizer.addEventListener("touchstart", (e) => {
                if (e.touches && e.touches[0]) {
                    startRightDrag(e.touches[0].clientX);
                }
            }, { passive: true });

            rightResizer.addEventListener("dblclick", (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyRightWidth(300);
                try { localStorage.setItem("justforms_right_panel_width", "300px"); } catch (e) {}
            });
        }

        // Also enable direct drag along the left border of the right panel card itself
        rightPanel.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            const rect = rightPanel.getBoundingClientRect();
            if (e.clientX >= rect.left - 6 && e.clientX <= rect.left + 12) {
                e.preventDefault();
                e.stopPropagation();
                startRightDrag(e.clientX);
            }
        });
    }
}
function toggleLeftSidebar() {
    const leftPanel = document.querySelector(".left-panel");
    const toggleBtn = document.getElementById("toggleSidebarBtn");
    const resizer = document.getElementById("leftPanelResizer");
    if (!leftPanel) return;

    leftPanel.classList.toggle("collapsed");
    const isCollapsed = leftPanel.classList.contains("collapsed");
    if (resizer) resizer.style.display = isCollapsed ? "none" : "flex";

    if (toggleBtn) {
        toggleBtn.setAttribute("data-tooltip", isCollapsed ? "Expand Layers" : "Collapse Layers");
        toggleBtn.setAttribute("data-kbd", "⌘\\");
        toggleBtn.setAttribute("aria-label", isCollapsed ? "Expand Layers" : "Collapse Layers");
        toggleBtn.title = isCollapsed ? "Expand Layers (⌘\\)" : "Collapse Layers (⌘\\)";
        toggleBtn.innerHTML = isCollapsed
            ? `<i data-lucide="panel-left-open" style="width: 14px; height: 14px; color: #2563eb;"></i>`
            : `<i data-lucide="panel-left-close" style="width: 14px; height: 14px; color: #475569;"></i>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
    }
}

function toggleRightSidebar() {
    const rightPanel = document.querySelector(".right-panel");
    const toggleBtn = document.getElementById("toggleRightSidebarBtn");
    const resizer = document.getElementById("rightPanelResizer");
    if (!rightPanel) return;

    rightPanel.classList.toggle("collapsed");
    const isCollapsed = rightPanel.classList.contains("collapsed");
    if (resizer) resizer.style.display = isCollapsed ? "none" : "flex";

    if (toggleBtn) {
        toggleBtn.setAttribute("data-tooltip", isCollapsed ? "Expand Properties" : "Collapse Properties");
        toggleBtn.setAttribute("data-kbd", "⌘/");
        toggleBtn.setAttribute("aria-label", isCollapsed ? "Expand Properties" : "Collapse Properties");
        toggleBtn.title = isCollapsed ? "Expand Properties (⌘/)" : "Collapse Properties (⌘/)";
        toggleBtn.innerHTML = isCollapsed
            ? `<i data-lucide="panel-right-open" style="width: 14px; height: 14px; color: #2563eb;"></i>`
            : `<i data-lucide="panel-right-close" style="width: 14px; height: 14px; color: #475569;"></i>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
    }
}

function initMobileEditorLayout() {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const leftPanel = document.querySelector(".left-panel");
    const rightPanel = document.querySelector(".right-panel");
    if (!leftPanel || !rightPanel) return;

    document.addEventListener("pointerdown", e => {
        if (!mediaQuery.matches) return;
        if (e.target.closest(".left-panel, .right-panel, #toggleSidebarBtn, #toggleRightSidebarBtn")) return;

        if (!leftPanel.classList.contains("collapsed")) toggleLeftSidebar();
        if (!rightPanel.classList.contains("collapsed")) toggleRightSidebar();
    }, true);

    const applyLayout = (isMobile) => {
        if (isMobile) {
            if (!document.body.dataset.mobilePanelState) {
                document.body.dataset.mobilePanelState = JSON.stringify({
                    leftOpen: !leftPanel.classList.contains("collapsed"),
                    rightOpen: !rightPanel.classList.contains("collapsed")
                });
            }
            leftPanel.classList.add("collapsed");
            rightPanel.classList.add("collapsed");
        } else {
            const savedState = document.body.dataset.mobilePanelState;
            if (!savedState) return;
            const panelState = JSON.parse(savedState);
            leftPanel.classList.toggle("collapsed", !panelState.leftOpen);
            rightPanel.classList.toggle("collapsed", !panelState.rightOpen);
            delete document.body.dataset.mobilePanelState;
        }
    };

    applyLayout(mediaQuery.matches);
    mediaQuery.addEventListener("change", (event) => applyLayout(event.matches));
}

// Transient Undo Toast Notification
function showUndoToast(msg) {
    let toast = document.getElementById("transientUndoToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "transientUndoToast";
        toast.className = "transient-undo-toast";
        toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 1100; background: #0f172a; color: #ffffff; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); transition: opacity 0.25s ease;";
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <span>${msg}</span>
        <button id="toastUndoBtn" style="background: #2563eb; color: #ffffff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            Undo (Ctrl+Z)
        </button>
    `;
    toast.style.display = "flex";
    toast.style.opacity = "1";

    document.getElementById("toastUndoBtn")?.addEventListener("click", () => {
        undo(refreshUI);
        toast.style.display = "none";
    });

    clearTimeout(window.undoToastTimeout);
    window.undoToastTimeout = setTimeout(() => {
        if (toast) toast.style.display = "none";
    }, 4500);
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
