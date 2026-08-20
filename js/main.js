// ── Main Application Orchestrator (js/main.js) ─────────────────
import { state, getSelectedField, setSelectedField, copySelectedFields, pasteClipboardFields, duplicateSelectedFields, createGroupForSelected, ungroupSelected } from "./state.js";
import { renderPage, goToPage, setTransformScale, updateTopBarDocInfo } from "./pdf-engine.js";
import { buildPdf, downloadAcroForm } from "./acroform-builder.js";
import { renderLayers, updateLayerSelectionDOM } from "./layers-panel.js";
import { initPropertiesPanel, populateProperties } from "./properties-panel.js";
import { renderOverlays } from "./overlay-manager.js";
import { initCanvasController, handleFieldMouseDown, handleResizeStart } from "./canvas-controller.js";
import { initLandingController, showLandingScreen, renderLandingReviews } from "./landing-controller.js";
import { initSignaturePad } from "./signature-pad.js";
import { autoDetectFields } from "./auto-detector.js";
import { saveHistory, undo, redo, exportProjectJson, importProjectJson } from "./storage-manager.js";

// Initialize Vercel Analytics event queue
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Full UI Refresh Handler
function refreshUI() {
    renderOverlays({
        onFieldMouseDown: (e, field) => handleFieldMouseDown(e, field, canvasHandlers),
        onResizeStart: (e, field) => handleResizeStart(e, field),
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
    if (typeof lucide !== "undefined") lucide.createIcons();
}

const overlayHandlers = {
    onFieldMouseDown: (e, field) => handleFieldMouseDown(e, field, canvasHandlers),
    onResizeStart: (e, field) => handleResizeStart(e, field),
    onUpdated: () => refreshUI()
};

const canvasHandlers = {
    onSelectionChange: () => {
        populateProperties(getSelectedField());
        renderOverlays(overlayHandlers);
        updateLayerSelectionDOM();
    },
    onFieldCreated: field => {
        refreshUI();
    },
    onFieldMoving: () => {
        renderOverlays(overlayHandlers);
        populateProperties(getSelectedField());
    },
    onFieldUpdated: () => {
        refreshUI();
    },
    onRerender: () => {
        refreshUI();
    }
};

// ── Application Bootstrap ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Subsystems
    initSignaturePad();
    initPropertiesPanel(
        () => refreshUI(),
        () => refreshUI()
    );
    initCanvasController(canvasHandlers);
    initLandingController(() => refreshUI());

    // Toolbar Tool Selection Buttons
    document.querySelectorAll(".tool-btn[data-tool]").forEach(btn => {
        btn.addEventListener("click", e => {
            document.querySelectorAll(".tool-btn[data-tool]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeTool = btn.dataset.tool;

            const stamp = document.getElementById("floatingToolStamp");
            if (state.activeTool !== "select" && state.activeTool !== "hand") {
                document.body.classList.add("placing-mode");
                if (stamp) {
                    stamp.style.display = "flex";
                    stamp.style.left = `${e.clientX || 200}px`;
                    stamp.style.top = `${e.clientY || 100}px`;
                    stamp.innerHTML = `<span>Click canvas to place</span>`;
                }
            } else {
                document.body.classList.remove("placing-mode");
                if (stamp) stamp.style.display = "none";
            }
        });
    });

    // File Menu Actions
    const fileMenuBtn = document.getElementById("fileMenuBtn");
    const fileMenuDropdown = document.getElementById("fileMenuDropdown");
    if (fileMenuBtn && fileMenuDropdown) {
        fileMenuBtn.addEventListener("click", e => {
            e.stopPropagation();
            fileMenuDropdown.classList.toggle("active");
        });
        document.addEventListener("click", e => {
            if (!fileMenuDropdown.contains(e.target)) fileMenuDropdown.classList.remove("active");
        });
        fileMenuDropdown.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", () => setTimeout(() => fileMenuDropdown.classList.remove("active"), 100));
        });
    }

    document.getElementById("saveProjectMenuBtn")?.addEventListener("click", exportProjectJson);
    document.getElementById("loadProjectMenuBtn")?.addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) importProjectJson(file, () => refreshUI());
        e.target.value = "";
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
            email: sender.includes("@") ? sender : "sshresthadesigns@gmail.com",
            _subject: `[JustForms Feedback] ${category} (${currentRating} Stars)`,
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
            await fetch("https://formsubmit.co/ajax/sshresthadesigns@gmail.com", {
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

    // Auto-Detect Fields Action
    const autoDetectBtn = document.getElementById("autoDetectBtn");
    autoDetectBtn?.addEventListener("click", async () => {
        if (!state.pdfDoc) {
            alert("Please load a PDF document first.");
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

        const t1 = setTimeout(() => {
            if (statusPill) statusPill.textContent = "Scanning static text baselines & labels...";
        }, 300);

        const t2 = setTimeout(() => {
            if (statusPill) statusPill.textContent = "Synthesizing interactive AcroForm fields...";
        }, 600);

        try {
            const count = await autoDetectFields("current");

            clearTimeout(t1);
            clearTimeout(t2);
            if (scanHud) scanHud.remove();

            if (count > 0) {
                refreshUI();
                
                // Staggered pop-in animation on newly spawned field overlays
                const overlayContainer = document.getElementById("overlayContainer");
                if (overlayContainer) {
                    overlayContainer.querySelectorAll(".field-overlay").forEach((el, idx) => {
                        el.classList.add("field-spawned");
                        el.style.animationDelay = `${idx * 30}ms`;
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
            clearTimeout(t1);
            clearTimeout(t2);
            if (scanHud) scanHud.remove();
            console.error("Auto detect failed:", err);
            alert("Auto-detect failed: " + err.message);
        } finally {
            autoDetectBtn.disabled = false;
            autoDetectBtn.innerHTML = originalHtml;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // Export and Preview Buttons
    document.getElementById("generatePdfBtn")?.addEventListener("click", openExportModal);
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
            alert("Please upload a PDF document before exporting.");
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

        // Set Loading & Disabled State
        if (confirmExportBtn) confirmExportBtn.disabled = true;
        if (confirmExportBtnText) confirmExportBtnText.innerHTML = 'Generating AcroForm...';

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

            closeExportModal();
            showExportToast(customName);
        } catch (err) {
            console.error("Export Error:", err);
            alert("Failed to export PDF: " + err.message);
        } finally {
            if (confirmExportBtn) confirmExportBtn.disabled = false;
            if (confirmExportBtnText) confirmExportBtnText.textContent = "Download PDF";
            if (typeof lucide !== "undefined") lucide.createIcons();
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

    // ── Save Project (.justforms) Modal Controller ──────────────────
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
        const currentBase = (state.fileName || "interactive_form").replace(/\.pdf$/i, "").replace(/\.justforms$/i, "");
        
        if (saveReplaceNameDisplay) {
            saveReplaceNameDisplay.textContent = `${currentBase}.justforms`;
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
        showExportToast(`${targetName}.justforms`);
    });

    // Close Modals on ESC Key or Save Shortcut ⌘S
    window.addEventListener("keydown", e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            openSaveProjectModal();
        } else if (e.key === "Escape") {
            if (exportModal && exportModal.style.display !== "none") closeExportModal();
            if (saveProjectModal && saveProjectModal.style.display !== "none") closeSaveProjectModal();
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

    const previewBtn = document.getElementById("previewBtn");
    const previewModal = document.getElementById("previewModal");
    const previewIframe = document.getElementById("previewIframe");
    const closePreviewBtn = document.getElementById("closePreviewBtn");

    previewBtn?.addEventListener("click", async () => {
        if (!state.originalPdfBytes) { alert("Please upload a PDF first."); return; }
        try {
            const bytes = await buildPdf();
            if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
            state.currentPreviewUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            if (previewModal) previewModal.style.display = "flex";
            if (previewIframe) previewIframe.src = state.currentPreviewUrl;
            if (typeof lucide !== "undefined") lucide.createIcons();
        } catch(e) {
            console.error("Preview failed:", e);
            alert("Preview failed: " + e.message);
        }
    });

    document.getElementById("previewNewTabBtn")?.addEventListener("click", () => {
        if (state.currentPreviewUrl) window.open(state.currentPreviewUrl, "_blank");
    });

    closePreviewBtn?.addEventListener("click", () => {
        if (previewModal) previewModal.style.display = "none";
        if (previewIframe) previewIframe.src = "";
    });

    // Context Menu Actions & Right Click Integration
    window.addEventListener("contextmenu", e => {
        const canvasContainer = document.getElementById("canvasContainer");
        const targetField = e.target.closest(".field-overlay");
        
        if (targetField || (canvasContainer && canvasContainer.contains(e.target))) {
            e.preventDefault();
            
            if (targetField) {
                const rawId = targetField.id.replace("overlay_", "");
                const numId = Number(rawId);
                const fieldId = !isNaN(numId) ? numId : rawId;
                if (!state.selectedFieldIds.has(fieldId) && !state.selectedFieldIds.has(String(fieldId)) && !state.selectedFieldIds.has(Number(fieldId))) {
                    setSelectedField(fieldId);
                    refreshUI();
                }
            }

            if (state.selectedFieldIds.size === 0) return;

            const ctxMenu = document.getElementById("contextMenu");
            if (ctxMenu) {
                const multiTools = document.getElementById("ctxMultiTools");
                if (multiTools) {
                    multiTools.style.display = state.selectedFieldIds.size >= 2 ? "block" : "none";
                }

                const ctxGroup = document.getElementById("ctxGroup");
                if (ctxGroup) {
                    const selFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                    const isAllInGroup = selFields.length > 0 && selFields.every(f => f.groupId);
                    ctxGroup.innerHTML = `
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="${isAllInGroup ? 'folder-minus' : 'folder-plus'}" style="width: 13px; height: 13px; color: #0284c7;"></i>
                            ${isAllInGroup ? 'Ungroup Selection' : 'Group Selection'}
                        </span>
                        <kbd style="font-size: 10px; color: #94a3b8;">Ctrl+G</kbd>
                    `;
                }

                ctxMenu.style.display = "block";
                ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 210) + "px";
                ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 230) + "px";
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    });

    window.addEventListener("click", e => {
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu && !ctxMenu.contains(e.target)) {
            ctxMenu.style.display = "none";
        }
    });

    document.getElementById("ctxGroup")?.addEventListener("click", () => {
        const selFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
        const isAllInGroup = selFields.length > 0 && selFields.every(f => f.groupId);
        if (isAllInGroup) {
            ungroupSelected();
        } else {
            createGroupForSelected();
        }
        saveHistory();
        refreshUI();
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
    });

    document.getElementById("ctxDuplicate")?.addEventListener("click", () => {
        const dups = duplicateSelectedFields();
        if (dups.length > 0) {
            saveHistory();
            refreshUI();
        }
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
    });

    document.getElementById("ctxAlignLeft")?.addEventListener("click", () => {
        const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
        if (sel.length >= 2) {
            const minX = Math.min(...sel.map(f => f.x));
            sel.forEach(f => f.x = minX);
            saveHistory();
            refreshUI();
        }
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
    });

    document.getElementById("ctxDistributeV")?.addEventListener("click", () => {
        const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
        if (sel.length >= 3) {
            sel.sort((a, b) => a.y - b.y);
            const first = sel[0];
            const last = sel[sel.length - 1];
            const totalSpan = (last.y + last.height) - first.y;
            const totalItemsHeight = sel.reduce((sum, f) => sum + f.height, 0);
            const totalGap = totalSpan - totalItemsHeight;
            const gap = totalGap / (sel.length - 1);
            
            let currentY = first.y;
            for (let i = 0; i < sel.length; i++) {
                if (i > 0) {
                    currentY += sel[i - 1].height + gap;
                    sel[i].y = Math.round(currentY);
                }
            }
            saveHistory();
            refreshUI();
        }
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
    });

    document.getElementById("ctxSelectAll")?.addEventListener("click", () => {
        const pageFields = state.fields.filter(f => (f.page || 1) === state.currentPageNum);
        if (pageFields.length > 0) {
            state.selectedFieldIds.clear();
            pageFields.forEach(f => state.selectedFieldIds.add(f.id));
            refreshUI();
        }
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
    });

    document.getElementById("ctxDelete")?.addEventListener("click", () => {
        if (state.selectedFieldIds.size > 0) {
            state.fields = state.fields.filter(f => !state.selectedFieldIds.has(f.id));
            setSelectedField(null);
            saveHistory();
            refreshUI();
        }
        const ctxMenu = document.getElementById("contextMenu");
        if (ctxMenu) ctxMenu.style.display = "none";
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
            alert("Please select one or more fields to create a group.");
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

        // Delete Selected
        if (e.key === "Backspace" || e.key === "Delete") {
            if (state.selectedFieldIds.size > 0) {
                e.preventDefault();
                state.fields = state.fields.filter(f => !state.selectedFieldIds.has(f.id));
                setSelectedField(null);
                saveHistory();
                refreshUI();
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

    // Default to landing screen
    showLandingScreen();
    if (typeof lucide !== "undefined") lucide.createIcons();
});
