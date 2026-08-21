// ── Canvas Overlay Rendering & Visual Elements (js/overlay-manager.js) ─
import { state, getFieldsForCurrentPage } from "./state.js";
import { FIELD_TYPE_LABELS } from "./constants.js";
import { openSignatureModal } from "./signature-pad.js";
import { makeScrubbableAndScrollable } from "./properties-panel.js";
import { saveHistory } from "./storage-manager.js";

export function formatFieldDisplayName(f) {
    if (!f) return "Field";
    const raw = f.name || FIELD_TYPE_LABELS[f.type] || "Text Field";
    return raw
        .replace(/_input$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

export function renderOverlays(handlers) {
    const container = document.getElementById("overlayContainer");
    if (!container) return;
    container.innerHTML = "";

    const pageFields = getFieldsForCurrentPage();

    pageFields.forEach(f => {
        const div = document.createElement("div");
        div.className = "field-overlay" + (state.selectedFieldIds.has(f.id) ? " selected" : "");
        div.id = `overlay_${f.id}`;
        div.style.left = f.x + "px";
        div.style.top = f.y + "px";
        div.style.width = f.width + "px";
        div.style.height = f.height + "px";

        // Border & fill styles
        if (f.borderStyle === "none") {
            div.style.border = "1.5px dashed rgba(148, 163, 184, 0.5)";
            div.style.background = "rgba(248, 250, 252, 0.15)";
        } else if (f.borderStyle === "thick") {
            div.style.border = "2.5px solid #3b82f6";
        } else {
            div.style.border = "1.5px solid rgba(59, 130, 246, 0.65)";
        }

        if (f.fillStyle === "tint") {
            div.style.background = "rgba(224, 242, 254, 0.25)";
        } else if (f.fillStyle === "yellow") {
            div.style.background = "rgba(254, 249, 195, 0.30)";
        } else if (f.fillStyle === "transparent") {
            div.style.background = "rgba(255, 255, 255, 0.05)";
        } else {
            div.style.background = "rgba(239, 246, 255, 0.20)";
        }

        // Alignment and typography
        if (f.textAlignment === "center") {
            div.style.justifyContent = "center";
        } else if (f.textAlignment === "right") {
            div.style.justifyContent = "flex-end";
        } else {
            div.style.justifyContent = "flex-start";
        }

        // Special render for signature fields
        if (f.type === "signature") {
            if (f.signatureImage) {
                div.innerHTML = `
                    <div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                        <img src="${f.signatureImage}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="sig-prompt-badge" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#2563eb; cursor:pointer;">
                        <span style="font-size:10.5px; font-weight:600; font-family:'Inter', sans-serif; background:rgba(224,242,254,0.65); padding:2px 7px; border-radius:3px; border:1px dashed #60a5fa; box-shadow:0 1px 2px rgba(0,0,0,0.05);">✍ Sign</span>
                    </div>
                `;
            }

            const triggerSign = e => {
                e.stopPropagation();
                openSignatureModal(f, () => {
                    renderOverlays(handlers);
                    if (handlers.onUpdated) handlers.onUpdated(f);
                });
            };

            div.addEventListener("dblclick", triggerSign);
            const badge = div.querySelector(".sig-prompt-badge");
            if (badge) badge.addEventListener("click", triggerSign);
        } else if (f.type === "checkBox") {
            div.innerHTML = `<span style="font-size:12px; color:#2563eb; font-weight:bold;">${f.defaultChecked ? "✓" : ""}</span>`;
        } else if (f.type === "radioGroup") {
            div.innerHTML = f.defaultChecked ? `<div style="width:8px; height:8px; border-radius:50%; background:#2563eb;"></div>` : "";
        } else {
            const label = document.createElement("span");
            label.className = "overlay-label";
            label.style.width = "100%";
            label.style.textAlign = f.textAlignment || "left";

            let fam = "'Carlito', Calibri, 'Inter', sans-serif";
            let weight = "500";
            let style = "normal";
            let letterSpacing = "normal";

            if (f.fontFamily === "times") {
                fam = "'Times New Roman', Times, Georgia, serif";
            } else if (f.fontFamily === "courier") {
                fam = "'Courier New', Courier, 'Roboto Mono', monospace";
                letterSpacing = "0.5px";
            } else if (f.fontFamily === "helvetica-bold") {
                fam = "'Carlito', Calibri, 'Inter', sans-serif";
                weight = "800";
            } else if (f.fontFamily === "times-italic") {
                fam = "'Times New Roman', Times, Georgia, serif";
                style = "italic";
            }

            label.style.fontFamily = fam;
            label.style.fontWeight = weight;
            label.style.fontStyle = style;
            label.style.letterSpacing = letterSpacing;
            const targetFontSize = (f.fontSize && f.fontSize >= 6) ? f.fontSize : 11;
            const responsiveSize = f.width < 80 ? Math.min(targetFontSize, 9.5) : Math.min(targetFontSize, Math.max(9, f.height - 6));
            label.style.fontSize = responsiveSize + "px";
            label.style.lineHeight = "1.2";
            label.style.boxSizing = "border-box";
            label.style.padding = f.width < 70 ? "0 3px" : "0 6px";
            label.style.whiteSpace = "nowrap";
            label.style.overflow = "hidden";
            label.style.textOverflow = "ellipsis";

            if (f.type === "dropdown") {
                const displayText = f.defaultValue || (f.options && f.options.length ? f.options[0] : "Select...");
                label.textContent = displayText;
                label.style.color = f.defaultValue ? "#0f172a" : "rgba(100, 116, 139, 0.7)";
                
                const arrow = document.createElement("span");
                arrow.style.cssText = "font-size:8.5px; color:#64748b; margin-left:auto; padding-right:4px; flex-shrink:0; pointer-events:none; user-select:none;";
                arrow.textContent = "▼";
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.justifyContent = "space-between";
                div.appendChild(label);
                div.appendChild(arrow);
            } else {
                const isFormatPlaceholder = f.defaultValue && /^(?:YYYY[-/]MM[-/]DD|MM[-/]DD[-/]YYYY|MM[-/]YY)$/i.test(f.defaultValue.trim());
                if (f.defaultValue && !isFormatPlaceholder) {
                    label.textContent = f.defaultValue;
                    label.style.color = "#0f172a";
                } else {
                    // Do NOT show blocking text inside box; keep 100% see-through!
                    label.textContent = "";
                }
                div.appendChild(label);
            }
        }

        // Add non-blocking top-floating badge
        if (f.type !== "checkBox" && f.type !== "radioGroup") {
            const floatingBadge = document.createElement("span");
            floatingBadge.className = "field-floating-badge";
            floatingBadge.textContent = formatFieldDisplayName(f);
            div.appendChild(floatingBadge);
        }

        const isSelected = state.selectedFieldIds.has(f.id);
        const isMultiSelect = state.selectedFieldIds.size > 1;

        // 8 Interactive Corner & Edge Resize Handles on the Field Box Itself
        if (isSelected && !isMultiSelect) {
            const resizeHandles = [
                { dir: "nw", className: "handle-nw", title: "Resize Top-Left" },
                { dir: "n",  className: "handle-n",  title: "Resize Top" },
                { dir: "ne", className: "handle-ne", title: "Resize Top-Right" },
                { dir: "e",  className: "handle-e",  title: "Resize Right" },
                { dir: "se", className: "handle-se", title: "Resize Bottom-Right" },
                { dir: "s",  className: "handle-s",  title: "Resize Bottom" },
                { dir: "sw", className: "handle-sw", title: "Resize Bottom-Left" },
                { dir: "w",  className: "handle-w",  title: "Resize Left" }
            ];

            resizeHandles.forEach(h => {
                const handle = document.createElement("div");
                handle.className = `resize-handle ${h.className}`;
                handle.title = h.title;
                handle.addEventListener("mousedown", e => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (handlers.onResizeStart) handlers.onResizeStart(e, f, h.dir);
                });
                div.appendChild(handle);
            });
        }

        // Accessibility & Keyboard Navigation (Form Design Patterns Ch. 1 & 3)
        div.tabIndex = 0;
        div.setAttribute("role", f.type === "checkBox" ? "checkbox" : (f.type === "radioGroup" ? "radio" : (f.type === "dropdown" ? "combobox" : "textbox")));
        div.setAttribute("aria-label", f.name || "Form field");
        if (f.type === "checkBox") {
            div.setAttribute("aria-checked", f.defaultChecked ? "true" : "false");
        }

        div.addEventListener("focus", () => {
            if (!state.selectedFieldIds.has(f.id)) {
                state.selectedFieldIds.clear();
                state.selectedFieldIds.add(f.id);
                renderOverlays(handlers);
                if (handlers.onSelect) handlers.onSelect(f);
            }
        });

        div.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                if (f.type === "checkBox") {
                    e.preventDefault();
                    f.defaultChecked = !f.defaultChecked;
                    renderOverlays(handlers);
                    if (handlers.onUpdated) handlers.onUpdated(f);
                } else if (f.type === "signature" && !f.signatureImage) {
                    e.preventDefault();
                    openSignatureModal(f, () => {
                        renderOverlays(handlers);
                        if (handlers.onUpdated) handlers.onUpdated(f);
                    });
                }
            }
        });

        div.addEventListener("mousedown", e => {
            if (handlers.onFieldMouseDown) handlers.onFieldMouseDown(e, f);
        });

        container.appendChild(div);
    });

    // Multi-Selection Bounding Frame with unified Figma/Canva-style resize handles
    const selectedFieldsOnPage = pageFields.filter(f => state.selectedFieldIds.has(f.id));
    if (selectedFieldsOnPage.length > 1) {
        const minX = Math.min(...selectedFieldsOnPage.map(f => f.x));
        const minY = Math.min(...selectedFieldsOnPage.map(f => f.y));
        const maxX = Math.max(...selectedFieldsOnPage.map(f => f.x + f.width));
        const maxY = Math.max(...selectedFieldsOnPage.map(f => f.y + f.height));

        const groupFrame = document.createElement("div");
        groupFrame.className = "multi-selection-bounding-frame";
        groupFrame.style.left = (minX - 3) + "px";
        groupFrame.style.top = (minY - 3) + "px";
        groupFrame.style.width = (maxX - minX + 6) + "px";
        groupFrame.style.height = (maxY - minY + 6) + "px";

        const handles = [
            { dir: "se", cursor: "se-resize", style: "bottom: -4px; right: -4px;" },
            { dir: "e", cursor: "ew-resize", style: "top: calc(50% - 4px); right: -4px;" },
            { dir: "s", cursor: "ns-resize", style: "bottom: -4px; left: calc(50% - 4px);" }
        ];

        handles.forEach(h => {
            const handleEl = document.createElement("div");
            handleEl.className = `group-resize-handle group-handle-${h.dir}`;
            handleEl.style.cssText = h.style;
            handleEl.title = `Drag to resize all selected fields (${h.dir === 'e' ? 'Width' : h.dir === 's' ? 'Height' : 'Width & Height'})`;
            handleEl.addEventListener("mousedown", e => {
                e.stopPropagation();
                if (handlers.onResizeStart) {
                    const anchorField = selectedFieldsOnPage.find(f => f.id === state.lastSelectedFieldId) || selectedFieldsOnPage[0];
                    handlers.onResizeStart(e, anchorField, h.dir);
                }
            });
            groupFrame.appendChild(handleEl);
        });

        container.appendChild(groupFrame);
    }
}

export function updateOverlayPositionsDirectly() {
    const pageFields = getFieldsForCurrentPage();
    
    state.selectedFieldIds.forEach(id => {
        const f = pageFields.find(item => item.id === id);
        if (f) {
            const overlayEl = document.getElementById(`overlay_${f.id}`);
            if (overlayEl) {
                overlayEl.style.left = f.x + "px";
                overlayEl.style.top = f.y + "px";
                overlayEl.style.width = f.width + "px";
                overlayEl.style.height = f.height + "px";
            }
        }
    });

    const selectedFieldsOnPage = pageFields.filter(f => state.selectedFieldIds.has(f.id));
    if (selectedFieldsOnPage.length > 1) {
        const frame = document.querySelector(".multi-selection-bounding-frame");
        if (frame) {
            const minX = Math.min(...selectedFieldsOnPage.map(f => f.x));
            const minY = Math.min(...selectedFieldsOnPage.map(f => f.y));
            const maxX = Math.max(...selectedFieldsOnPage.map(f => f.x + f.width));
            const maxY = Math.max(...selectedFieldsOnPage.map(f => f.y + f.height));
            frame.style.left = (minX - 3) + "px";
            frame.style.top = (minY - 3) + "px";
            frame.style.width = (maxX - minX + 6) + "px";
            frame.style.height = (maxY - minY + 6) + "px";
        }
    }
}

export function openFieldQuickDimensionHUD(field, overlayEl, handlers) {
    document.querySelectorAll(".canvas-quick-dimension-hud").forEach(h => h.remove());

    const container = document.getElementById("canvasContainer");
    if (!container) return;

    overlayEl = document.getElementById(`overlay_${field.id}`) || overlayEl;

    const hud = document.createElement("div");
    hud.className = "canvas-quick-dimension-hud";
    hud.id = "canvasQuickDimensionHUD";

    const TYPE_LABELS = {
        textField: "Text",
        dropdown: "Dropdown",
        checkBox: "Checkbox",
        radioGroup: "Radio",
        dateField: "Date",
        signature: "Signature"
    };

    const typeLabel = TYPE_LABELS[field.type] || "Field";

    let valueControlHtml = "";
    if (field.type === "textField" || field.type === "dateField") {
        valueControlHtml = `<input type="text" class="hud-val-input" id="hudValueInput" value="${field.defaultValue || ''}" placeholder="Enter value...">`;
    } else if (field.type === "dropdown") {
        const opts = field.options && field.options.length ? field.options : ["Option 1", "Option 2", "Option 3"];
        const optHtml = opts.map(o => `<option value="${o}" ${field.defaultValue === o ? "selected" : ""}>${o}</option>`).join("");
        valueControlHtml = `<select class="hud-val-select" id="hudDropdownSelect">${optHtml}</select>`;
    } else if (field.type === "checkBox" || field.type === "radioGroup") {
        valueControlHtml = `
            <label style="display:inline-flex; align-items:center; gap:5px; font-size:11.5px; color:#475569; margin:0; cursor:pointer; font-weight:500; height:28px; padding:0 4px;">
                <input type="checkbox" id="hudDefaultCheckedInput" ${field.defaultChecked ? "checked" : ""} style="cursor:pointer; accent-color:#0284c7;">
                Checked
            </label>
        `;
    } else if (field.type === "signature") {
        valueControlHtml = `
            <button type="button" id="hudSignBtn" style="background:#0284c7; color:#fff; font-weight:600; border:none; border-radius:6px; font-size:11.5px; padding:0 10px; height:28px; cursor:pointer;">
                ${field.signatureImage ? "Redraw Signature" : "Pre-sign"}
            </button>
        `;
    }

    const showFontSize = (field.type === "textField" || field.type === "dropdown" || field.type === "dateField");

    hud.innerHTML = `
        <select id="hudTypeSelect" title="Change Field Type" style="background:#eff6ff; color:#0284c7; border:1px solid #bae6fd; font-size:11px; font-weight:700; border-radius:6px; padding:2px 6px; cursor:pointer; outline:none;">
            <option value="textField" ${field.type === "textField" ? "selected" : ""}>Text</option>
            <option value="dateField" ${field.type === "dateField" ? "selected" : ""}>Date</option>
            <option value="dropdown" ${field.type === "dropdown" ? "selected" : ""}>Dropdown</option>
            <option value="checkBox" ${field.type === "checkBox" ? "selected" : ""}>Checkbox</option>
            <option value="radioGroup" ${field.type === "radioGroup" ? "selected" : ""}>Radio</option>
            <option value="signature" ${field.type === "signature" ? "selected" : ""}>Signature</option>
        </select>
        <span class="hud-divider"></span>
        <div class="hud-val-container">
            ${valueControlHtml}
        </div>
        <span class="hud-divider"></span>
        <div class="hud-input-badge">
            <span class="hud-badge-label" id="hudWidthLabel" title="Click & drag or scroll width">W</span>
            <input type="number" id="hudWidthInput" class="hud-badge-input" min="16" max="2000" value="${field.width}">
            <span class="hud-badge-unit">px</span>
        </div>
        <div class="hud-input-badge">
            <span class="hud-badge-label" id="hudHeightLabel" title="Click & drag or scroll height">H</span>
            <input type="number" id="hudHeightInput" class="hud-badge-input" min="16" max="1000" value="${field.height}">
            <span class="hud-badge-unit">px</span>
        </div>
        ${showFontSize ? `
        <div class="hud-input-badge" id="hudFontSizeGroup">
            <span class="hud-badge-label" id="hudFontSizeLabel" title="Click & drag or scroll font size">Size</span>
            <input type="number" id="hudFontSizeInput" class="hud-badge-input" min="6" max="120" value="${field.fontSize || 11}">
            <span class="hud-badge-unit">pt</span>
        </div>
        ` : ''}
        <span class="hud-divider"></span>
        <button type="button" class="hud-confirm-btn" id="hudCloseBtn" title="Done (Enter or Esc)">Done</button>
    `;

    container.appendChild(hud);

    // Dynamic positioning based on actual rendered size:
    const realW = hud.offsetWidth || 330;
    const realH = hud.offsetHeight || 38;
    const contW = container.offsetWidth || 800;
    const contH = container.offsetHeight || 1000;

    let hudX = Math.max(8, Math.min(contW - realW - 8, field.x + (field.width / 2) - (realW / 2)));
    let hudY = field.y >= (realH + 10) ? (field.y - realH - 8) : (field.y + field.height + 8);
    hudY = Math.max(8, Math.min(contH - realH - 8, hudY));

    hud.style.left = `${hudX}px`;
    hud.style.top = `${hudY}px`;

    const typeSelect = hud.querySelector("#hudTypeSelect");
    const wInput = hud.querySelector("#hudWidthInput");
    const hInput = hud.querySelector("#hudHeightInput");
    const fsInput = hud.querySelector("#hudFontSizeInput");
    const valInput = hud.querySelector("#hudValueInput");
    const ddSelect = hud.querySelector("#hudDropdownSelect");
    const chkInput = hud.querySelector("#hudDefaultCheckedInput");
    const signBtn = hud.querySelector("#hudSignBtn");
    const wLabel = hud.querySelector("#hudWidthLabel");
    const hLabel = hud.querySelector("#hudHeightLabel");
    const fsLabel = hud.querySelector("#hudFontSizeLabel");
    const closeBtn = hud.querySelector("#hudCloseBtn");

    typeSelect?.addEventListener("change", e => {
        const newType = e.target.value;
        field.type = newType;
        if (newType === "signature") {
            field.height = Math.max(field.height, 36);
        } else if (newType === "checkBox" || newType === "radioGroup") {
            if (field.width > 60 || field.height > 60) {
                field.width = 20;
                field.height = 20;
            }
        } else if (newType === "dropdown" && (!field.options || field.options.length === 0)) {
            field.options = ["Option 1", "Option 2", "Option 3"];
        }
        saveHistory();
        renderOverlays(handlers);
        if (handlers.onUpdated) handlers.onUpdated(field);
        const newOverlay = document.getElementById(`overlay_${field.id}`);
        if (newOverlay) openFieldQuickDimensionHUD(field, newOverlay, handlers);
    });

    const refreshOverlayVisuals = () => {
        overlayEl.style.width = `${field.width}px`;
        overlayEl.style.height = `${field.height}px`;

        const label = overlayEl.querySelector(".overlay-label");
        if (label) {
            if (field.type === "dropdown") {
                label.textContent = field.defaultValue || (field.options && field.options[0]) || formatFieldDisplayName(field);
                label.style.color = field.defaultValue ? "#0f172a" : "#475569";
            } else {
                if (field.defaultValue) {
                    label.textContent = field.defaultValue;
                    label.style.color = "#0f172a";
                } else {
                    label.textContent = formatFieldDisplayName(field);
                    label.style.color = "#64748b";
                }
            }
            if (field.fontSize) {
                label.style.fontSize = `${field.fontSize}px`;
            }
        }

        if (field.type === "checkBox") {
            overlayEl.innerHTML = `<span style="font-size:12px; color:#0284c7; font-weight:bold;">${field.defaultChecked ? "✓" : ""}</span>`;
        } else if (field.type === "radioGroup") {
            overlayEl.innerHTML = field.defaultChecked ? `<div style="width:8px; height:8px; border-radius:50%; background:#0284c7;"></div>` : "";
        }

        // Sync right properties panel
        const propW = document.getElementById("width");
        const propH = document.getElementById("height");
        const propName = document.getElementById("fieldName");
        const propVal = document.getElementById("fieldDefaultValue");
        const propFs = document.getElementById("fontSize");
        const propChk = document.getElementById("fieldDefaultChecked");

        if (propW) propW.value = field.width;
        if (propH) propH.value = field.height;
        if (propName) propName.value = field.name || "";
        if (propVal) propVal.value = field.defaultValue || "";
        if (propFs && field.fontSize) propFs.value = field.fontSize;
        if (propChk) propChk.checked = !!field.defaultChecked;
    };

    const syncFieldDim = () => {
        field.width = Math.max(16, parseInt(wInput?.value) || field.width);
        field.height = Math.max(16, parseInt(hInput?.value) || field.height);
        refreshOverlayVisuals();
    };

    const syncFontSize = () => {
        if (fsInput) {
            const raw = fsInput.value.trim();
            const val = raw === "" ? null : parseInt(raw);
            if (val === null || (val >= 6 && val <= 120)) {
                field.fontSize = val;
                refreshOverlayVisuals();
            }
        }
    };

    // Scrubbing and Scrolling on HUD inputs
    makeScrubbableAndScrollable(wInput, wLabel, { min: 16, max: 2000, step: 1, onUpdate: syncFieldDim });
    makeScrubbableAndScrollable(hInput, hLabel, { min: 16, max: 1000, step: 1, onUpdate: syncFieldDim });
    if (fsInput) {
        makeScrubbableAndScrollable(fsInput, fsLabel, { min: 6, max: 120, step: 1, onUpdate: syncFontSize });
    }

    wInput?.addEventListener("input", syncFieldDim);
    hInput?.addEventListener("input", syncFieldDim);
    fsInput?.addEventListener("input", syncFontSize);

    valInput?.addEventListener("input", e => {
        field.defaultValue = e.target.value;
        refreshOverlayVisuals();
    });

    ddSelect?.addEventListener("change", e => {
        field.defaultValue = e.target.value;
        refreshOverlayVisuals();
    });

    chkInput?.addEventListener("change", e => {
        field.defaultChecked = e.target.checked;
        refreshOverlayVisuals();
    });

    signBtn?.addEventListener("click", () => {
        closeHUD();
        openSignatureModal(field, () => {
            renderOverlays(handlers);
            if (handlers.onUpdated) handlers.onUpdated(field);
        });
    });

    const closeHUD = () => {
        hud.remove();
        saveHistory();
        if (handlers.onUpdated) handlers.onUpdated(field);
    };

    closeBtn?.addEventListener("click", e => {
        e.stopPropagation();
        closeHUD();
    });

    hud.addEventListener("mousedown", e => e.stopPropagation());
    hud.addEventListener("click", e => e.stopPropagation());

    const onKeyDown = ev => {
        if (ev.key === "Enter" || ev.key === "Escape") {
            window.removeEventListener("keydown", onKeyDown);
            closeHUD();
        }
    };
    window.addEventListener("keydown", onKeyDown);

    const onDocClick = ev => {
        if (!hud.contains(ev.target) && ev.target !== overlayEl) {
            window.removeEventListener("mousedown", onDocClick);
            window.removeEventListener("keydown", onKeyDown);
            closeHUD();
        }
    };
    setTimeout(() => window.addEventListener("mousedown", onDocClick), 50);

    // Focus Value input first if present, otherwise Width input
    if (valInput) {
        valInput.focus();
        valInput.select();
    } else if (wInput) {
        wInput.focus();
        wInput.select();
    }
}
