// ── Canvas Overlay Rendering & Visual Elements (js/overlay-manager.js) ─
import { state, getFieldsForCurrentPage } from "./state.js";
import { FIELD_TYPE_LABELS } from "./constants.js";
import { openSignatureModal } from "./signature-pad.js";
import { makeScrubbableAndScrollable } from "./properties-panel.js";
import { saveHistory } from "./storage-manager.js";

export function getFieldCssFont(field) {
    let fam = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    let weight = "400";
    let style = "normal";
    let letterSpacing = "normal";

    const family = field?.fontFamily || "helvetica";
    if (family === "times") {
        fam = "'Times New Roman', Times, Georgia, serif";
    } else if (family === "courier") {
        fam = "'Courier New', Courier, monospace";
        letterSpacing = "0.5px";
    } else if (family === "helvetica-bold") {
        fam = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        weight = "700";
    } else if (family === "times-italic") {
        fam = "'Times New Roman', Times, Georgia, serif";
        style = "italic";
    } else if (family === "inter") {
        fam = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
        weight = "500";
    } else if (family === "carlito") {
        fam = "'Carlito', Calibri, sans-serif";
    } else if (family === "roboto-mono") {
        fam = "'Roboto Mono', monospace";
        letterSpacing = "0.2px";
    } else if (family === "ibm-plex-mono") {
        fam = "'IBM Plex Mono', monospace";
        letterSpacing = "0.3px";
    } else if (family === "caveat") {
        fam = "'Caveat', cursive";
        weight = "600";
    } else if (family === "cedarville") {
        fam = "'Cedarville Cursive', cursive";
    }

    return { fam, weight, style, letterSpacing };
}

function getFillInputFontSize(field, fallback = 12) {
    const explicit = Number(field?.fontSize);
    if (Number.isFinite(explicit) && explicit >= 6) return explicit;
    return fallback;
}

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
        const isSelected = state.selectedFieldIds.has(f.id);
        const isMultiSelected = isSelected && state.selectedFieldIds.size > 1;
        div.className = "field-overlay" + (isSelected ? (isMultiSelected ? " selected multi-selected" : " selected") : "");
        div.id = `overlay_${f.id}`;
        div.style.left = f.x + "px";
        div.style.top = f.y + "px";
        div.style.width = f.width + "px";
        div.style.height = f.height + "px";

        // ── LIVE INTERACTIVE FILL & TEST MODE ────────────────────────────
        if (state.editorMode === "fill") {
            div.classList.add("fill-mode");

            const isChoice = (f.type === "checkBox" || f.type === "radioGroup");
            if (isChoice) {
                div.style.border = "none";
                div.style.background = "transparent";
                div.style.boxShadow = "none";
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.justifyContent = "center";
            } else {
                div.style.border = f.borderStyle === "none" ? "1.5px dashed #94A3B8" : "1.5px solid #94A3B8";
                div.style.borderRadius = "3px";
                div.style.background = "rgba(255, 255, 255, 0.98)";
                div.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(148,163,184,0.18)";
            }

            if (f.type === "checkBox") {
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "fill-input-checkbox";
                cb.checked = !!f.defaultChecked;
                cb.style.cssText = "width: 14px; height: 14px; margin: 0; cursor: pointer; accent-color: #2563eb;";
                cb.addEventListener("change", () => {
                    f.defaultChecked = cb.checked;
                    f.value = cb.checked ? (f.value || "Yes") : "";
                    saveHistory();
                });
                div.appendChild(cb);
            } else if (f.type === "radioGroup") {
                const rb = document.createElement("input");
                rb.type = "radio";
                rb.name = f.name || "radiogroup";
                rb.className = "fill-input-radio";
                rb.value = f.radioValue || f.value || `option_${f.id}`;
                rb.checked = !!f.defaultChecked;
                rb.style.cssText = "width: 14px; height: 14px; margin: 0; cursor: pointer; accent-color: #2563eb;";
                rb.addEventListener("change", () => {
                    const groupFields = state.fields.filter(item => item.name === f.name);
                    groupFields.forEach(item => { item.defaultChecked = (item.id === f.id); });
                    saveHistory();
                });
                div.appendChild(rb);
            } else if (f.type === "dropdown") {
                const sel = document.createElement("select");
                sel.className = "fill-input-select";
                const dropdownFontSize = getFillInputFontSize(f, Math.min(12, Math.max(8, f.height - 4)));
                const { fam, weight, style: fontStyle } = getFieldCssFont(f);
                sel.style.cssText = `width: 100%; height: 100%; border: none; background: transparent; font-size: ${dropdownFontSize}px; font-family: ${fam}; font-weight: ${weight}; font-style: ${fontStyle}; padding: 0 4px; outline: none; cursor: pointer; color: #0f172a; appearance: none; -webkit-appearance: none; text-align: ${f.textAlignment || 'left'};`;
                const opts = (f.options && f.options.length) ? f.options : ["Select..."];
                opts.forEach(opt => {
                    const optEl = document.createElement("option");
                    optEl.value = opt;
                    optEl.textContent = opt;
                    if (opt === (f.value || f.defaultValue)) optEl.selected = true;
                    sel.appendChild(optEl);
                });
                sel.addEventListener("change", () => {
                    f.value = sel.value;
                    f.defaultValue = sel.value;
                    saveHistory();
                });
                div.appendChild(sel);
            } else if (f.type === "signature") {
                if (f.signatureImage) {
                    div.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                            <img src="${f.signatureImage}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
                            <button class="fill-clear-sig-btn" title="Clear signature" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:#ef4444; color:#fff; border:none; font-size:9px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
                        </div>
                    `;
                    div.querySelector(".fill-clear-sig-btn")?.addEventListener("click", e => {
                        e.stopPropagation();
                        f.signatureImage = null;
                        renderOverlays(handlers);
                        saveHistory();
                    });
                } else {
                    const signBtn = document.createElement("div");
                    signBtn.className = "fill-sign-prompt";
                    signBtn.style.cssText = "width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#2563eb; cursor:pointer; font-size:11px; font-weight:600; background:rgba(239,246,255,0.8);";
                    signBtn.innerHTML = `<span>Sign Here</span>`;
                    signBtn.addEventListener("click", e => {
                        e.stopPropagation();
                        openSignatureModal(f, () => {
                            renderOverlays(handlers);
                            saveHistory();
                        });
                    });
                    div.appendChild(signBtn);
                }
            } else if (f.type === "dateField" || f.dataFormat === "date") {
                const dateInput = document.createElement("input");
                dateInput.type = "date";
                dateInput.className = "fill-input-date";
                dateInput.value = f.value || f.defaultValue || "";
                const dateFontSize = getFillInputFontSize(f, Math.min(12, Math.max(8, f.height - 4)));
                const { fam, weight, style: fontStyle } = getFieldCssFont(f);
                dateInput.style.cssText = `width: 100%; height: 100%; border: none; background: transparent; font-size: ${dateFontSize}px; font-family: ${fam}; font-weight: ${weight}; font-style: ${fontStyle}; padding: 0 4px; outline: none; box-sizing: border-box; color: #0f172a; text-align: ${f.textAlignment || 'left'};`;
                dateInput.addEventListener("input", () => {
                    f.value = dateInput.value;
                    f.defaultValue = dateInput.value;
                    saveHistory();
                });
                div.appendChild(dateInput);
            } else if (f.multiline) {
                const ta = document.createElement("textarea");
                ta.className = "fill-input-textarea";
                ta.value = f.value || f.defaultValue || "";
                ta.placeholder = f.placeholder || "";
                const textareaFontSize = getFillInputFontSize(f, Math.min(12, Math.max(10, f.height / 3)));
                const { fam, weight, style: fontStyle } = getFieldCssFont(f);
                ta.style.cssText = `width: 100%; height: 100%; border: none; background: transparent; font-size: ${textareaFontSize}px; font-family: ${fam}; font-weight: ${weight}; font-style: ${fontStyle}; padding: 4px; outline: none; resize: none; box-sizing: border-box; line-height: 1.3; color: #0f172a; text-align: ${f.textAlignment || 'left'};`;
                ta.addEventListener("input", () => {
                    f.value = ta.value;
                    f.defaultValue = ta.value;
                    saveHistory();
                });
                div.appendChild(ta);
            } else {
                const inp = document.createElement("input");
                inp.type = f.dataFormat === "email" ? "email" : (f.dataFormat === "phone" ? "tel" : (f.dataFormat === "number" ? "number" : "text"));
                inp.className = "fill-input-text";
                inp.value = f.value || f.defaultValue || "";
                inp.placeholder = f.placeholder || "";
                const inputFontSize = getFillInputFontSize(f, Math.min(12, Math.max(8, f.height - 4)));
                const { fam, weight, style: fontStyle } = getFieldCssFont(f);
                inp.style.cssText = `width: 100%; height: 100%; border: none; background: transparent; font-size: ${inputFontSize}px; font-family: ${fam}; font-weight: ${weight}; font-style: ${fontStyle}; padding: 0 5px; outline: none; box-sizing: border-box; text-align: ${f.textAlignment || 'left'}; color: #0f172a; appearance: none; -webkit-appearance: none;`;

                if (f.dataFormat === "currency") {
                    inp.addEventListener("blur", () => {
                        let val = inp.value.trim().replace(/[^0-9.-]/g, "");
                        if (val && !isNaN(Number(val))) {
                            inp.value = "$" + Number(val).toFixed(2);
                            f.value = inp.value;
                            f.defaultValue = inp.value;
                        }
                    });
                }

                inp.addEventListener("input", () => {
                    f.value = inp.value;
                    f.defaultValue = inp.value;
                    saveHistory();
                });
                div.appendChild(inp);
            }

            container.appendChild(div);
            return;
        }

        // Border & fill styles (Design Mode - WCAG 2.1 / 2.2 AA Compliant)
        if (f.type === "radioGroup") {
            div.style.borderRadius = "50%";
            if (isSelected) {
                if (isMultiSelected) {
                    div.style.border = "1px solid #93C5FD";
                    div.style.background = "rgba(239, 246, 255, 0.50)";
                    div.style.boxShadow = "none";
                } else {
                    div.style.border = "2px solid #1D4ED8";
                    div.style.background = "#EFF6FF";
                    div.style.boxShadow = "0 0 0 3px rgba(29, 78, 216, 0.20)";
                }
            } else {
                div.style.border = "1.5px solid #94A3B8";
                div.style.background = "#F8FAFC";
                div.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
            }
        } else if (f.type === "checkBox") {
            div.style.borderRadius = "3px";
            if (isSelected) {
                if (isMultiSelected) {
                    div.style.border = "1px solid #93C5FD";
                    div.style.background = "rgba(239, 246, 255, 0.50)";
                    div.style.boxShadow = "none";
                } else {
                    div.style.border = "2px solid #1D4ED8";
                    div.style.background = "#EFF6FF";
                    div.style.boxShadow = "0 0 0 3px rgba(29, 78, 216, 0.20)";
                }
            } else {
                div.style.border = "1.5px solid #94A3B8";
                div.style.background = "#F8FAFC";
                div.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
            }
        } else {
            div.style.borderRadius = "3px";
            if (isSelected) {
                if (isMultiSelected) {
                    div.style.border = "1px solid #93C5FD";
                    div.style.background = "rgba(239, 246, 255, 0.50)";
                    div.style.boxShadow = "none";
                } else {
                    div.style.border = "2px solid #1D4ED8";
                    div.style.background = "#EFF6FF";
                    div.style.boxShadow = "0 0 0 3px rgba(29, 78, 216, 0.22)";
                }
            } else {
                if (f.borderStyle === "none") {
                    div.style.border = "1.5px dashed #94A3B8";
                } else if (f.borderStyle === "thick") {
                    div.style.border = "2px solid #64748B";
                } else {
                    div.style.border = "1.5px solid #94A3B8";
                }

                if (f.fillStyle === "tint") {
                    div.style.background = "rgba(219, 234, 254, 0.50)";
                } else if (f.fillStyle === "yellow") {
                    div.style.background = "rgba(254, 249, 195, 0.45)";
                } else if (f.fillStyle === "transparent") {
                    div.style.background = "rgba(255, 255, 255, 0.05)";
                } else {
                    div.style.background = "#F8FAFC";
                }
                div.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
            }
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
                        <span style="font-size:10.5px; font-weight:600; font-family:'Inter', sans-serif; background:rgba(224,242,254,0.65); padding:2px 7px; border-radius:3px; border:1px dashed #60a5fa; box-shadow:0 1px 2px rgba(0,0,0,0.05);">Sign</span>
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
            if (f.defaultChecked) {
                if (f.checkboxMark === "x") {
                    div.innerHTML = `<svg class="animated-checkmark-svg" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"></line><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"></line></svg>`;
                } else {
                    div.innerHTML = `<svg class="animated-checkmark-svg" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6.5 12 13 4"></polyline></svg>`;
                }
            } else {
                div.innerHTML = "";
            }
        } else if (f.type === "radioGroup") {
            div.innerHTML = f.defaultChecked ? `<div class="animated-radio-dot"></div>` : "";
        } else {
            const label = document.createElement("span");
            label.className = "overlay-label";
            label.style.width = "100%";
            label.style.textAlign = f.textAlignment || "left";

            let { fam, weight, style, letterSpacing } = getFieldCssFont(f);

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
                const displayText = f.value || f.defaultValue || (f.options && f.options.length ? f.options[0] : "Select...");
                label.textContent = displayText;
                label.style.color = (f.value || f.defaultValue) ? "#0f172a" : "rgba(100, 116, 139, 0.7)";
                
                const arrow = document.createElement("span");
                arrow.style.cssText = "font-size:8.5px; color:#64748b; margin-left:auto; padding-right:4px; flex-shrink:0; pointer-events:none; user-select:none;";
                arrow.textContent = "▼";
                div.style.display = "flex";
                div.style.alignItems = "center";
                div.style.justifyContent = "space-between";
                div.appendChild(label);
                div.appendChild(arrow);
            } else {
                const isRealVal = (f.value !== undefined && f.value !== "");
                const isFormatPlaceholder = f.defaultValue && /^(?:YYYY[-/]MM[-/]DD|MM[-/]DD[-/]YYYY|MM[-/]YY)$/i.test(f.defaultValue.trim());
                
                if (isRealVal) {
                    label.textContent = f.value;
                    label.style.color = "#0f172a";
                    label.style.fontStyle = (style === "italic") ? "italic" : "normal";
                    label.style.fontWeight = weight || "500";
                    label.style.opacity = "1.0";
                } else if (f.defaultValue && !isFormatPlaceholder) {
                    label.textContent = f.defaultValue;
                    label.style.color = "#64748b";
                    label.style.fontStyle = "italic";
                    label.style.fontWeight = "400";
                    label.style.opacity = "0.85";
                    label.title = "Default / Placeholder Value";
                } else {
                    // Do NOT show blocking text inside box; keep 100% see-through!
                    label.textContent = "";
                }
                div.appendChild(label);
            }
        }

        if (f.hidden) {
            div.classList.add("is-hidden");
        }
        if (f.locked) {
            div.classList.add("is-locked");
            const lockBadge = document.createElement("span");
            lockBadge.className = "field-locked-badge";
            lockBadge.style.cssText = "position: absolute; top: -14px; right: 0; background: #fffbeb; border: 1px solid #fde68a; border-radius: 3px; padding: 1px 4px; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 60;";
            lockBadge.innerHTML = `<i data-lucide="lock" style="width: 10px; height: 10px; color: #d97706;"></i>`;
            div.appendChild(lockBadge);
        }

        // Add non-blocking top-floating badge
        if (f.type !== "checkBox" && f.type !== "radioGroup") {
            const floatingBadge = document.createElement("span");
            floatingBadge.className = "field-floating-badge";
            floatingBadge.textContent = formatFieldDisplayName(f);
            div.appendChild(floatingBadge);
        }

        // 8 Interactive Corner & Edge Resize Handles on the Field Box Itself
        if (isSelected && !isMultiSelected && !f.locked) {
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
                handle.addEventListener("pointerdown", e => {
                    if (e.pointerType !== "touch") return;
                    e.stopPropagation();
                    e.preventDefault();
                    if (handlers.onResizeStart) handlers.onResizeStart(e, f, h.dir);
                    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
                });
                div.appendChild(handle);
            });
        }

        // Accessibility & Keyboard Navigation
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

        // Canvas ↔ Layer Hover Sync
        div.addEventListener("mouseenter", () => {
            const layerItem = document.querySelector(`.layer-item[data-field-id="${f.id}"]`);
            if (layerItem) layerItem.classList.add("canvas-hover-highlight");
        });
        div.addEventListener("mouseleave", () => {
            const layerItem = document.querySelector(`.layer-item[data-field-id="${f.id}"]`);
            if (layerItem) layerItem.classList.remove("canvas-hover-highlight");
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
        div.addEventListener("pointerdown", e => {
            if (e.pointerType !== "touch") return;
            if (handlers.onFieldMouseDown) handlers.onFieldMouseDown(e, f);
            if (div.setPointerCapture) div.setPointerCapture(e.pointerId);
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
            { dir: "e", cursor: "ew-resize", style: "top: calc(50% - 3.75px); right: -4px;" },
            { dir: "s", cursor: "ns-resize", style: "bottom: -4px; left: calc(50% - 3.75px);" }
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
