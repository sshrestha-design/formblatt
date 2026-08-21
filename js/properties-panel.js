// ── Right Properties Inspector & Alignment (js/properties-panel.js) ─
import { state, getSelectedField, setSelectedField, duplicateSelectedFields, createGroupForSelected, ungroupSelected } from "./state.js";
import { saveHistory } from "./storage-manager.js";
import { openSignatureModal } from "./signature-pad.js";

function updateQuickSizeButtons(size, btnClass = "quick-size-btn") {
    const s = size ? parseInt(size) : null;
    document.querySelectorAll(`.${btnClass}`).forEach(btn => {
        const btnSize = parseInt(btn.dataset.size);
        btn.classList.toggle("active", s !== null && btnSize === s);
    });
}

export function makeScrubbableAndScrollable(inputEl, labelEl = null, { min = 1, max = 2000, step = 1, onUpdate } = {}) {
    if (!inputEl) return;

    if (!labelEl) {
        labelEl = inputEl.closest(".form-group")?.querySelector("label") || inputEl.previousElementSibling;
    }

    // 1. Mouse Wheel / Trackpad Scroll in Number Input
    inputEl.addEventListener("wheel", e => {
        e.preventDefault();
        const currentVal = parseFloat(inputEl.value) || min;
        const multiplier = e.shiftKey ? 10 : 1;
        const dir = e.deltaY < 0 ? 1 : -1;
        const newVal = Math.max(min, Math.min(max, currentVal + dir * step * multiplier));
        inputEl.value = newVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        if (onUpdate) onUpdate(newVal);
    }, { passive: false });

    // 2. Click & Drag Scrubbing on Label
    if (labelEl) {
        labelEl.classList.add("scrubbable");
        labelEl.title = "Click & drag left/right to adjust value, or scroll with mouse wheel";

        labelEl.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const startX = e.clientX;
            const startVal = parseFloat(inputEl.value) || min;
            document.body.classList.add("is-scrubbing");

            let hasMoved = false;

            const onMouseMove = ev => {
                const deltaX = ev.clientX - startX;
                if (Math.abs(deltaX) > 2) hasMoved = true;
                const multiplier = ev.shiftKey ? 10 : (ev.altKey ? 0.1 : 1);
                const newVal = Math.max(min, Math.min(max, Math.round(startVal + deltaX * (step * 0.5) * multiplier)));
                inputEl.value = newVal;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                if (onUpdate) onUpdate(newVal);
            };

            const onMouseUp = () => {
                document.body.classList.remove("is-scrubbing");
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
                if (hasMoved) {
                    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                }
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }
}

export function initPropertiesPanel(onFieldUpdated, onFieldDeleted) {
    const fieldNameInput = document.getElementById("fieldName");
    const fieldDefaultVal = document.getElementById("fieldDefaultValue");
    const fieldRequired = document.getElementById("fieldRequired");
    const fieldReadOnly = document.getElementById("fieldReadOnly");
    const fieldMultiline = document.getElementById("fieldMultiline");
    const fieldMaxLength = document.getElementById("fieldMaxLength");
    const fieldTooltip = document.getElementById("fieldTooltip");
    const autofillType = document.getElementById("autofillType");
    const fieldFontFamily = document.getElementById("fieldFontFamily");
    const fontSizeInput = document.getElementById("fontSize");
    const textAlignmentSelect = document.getElementById("textAlignment");
    const borderStyleSelect = document.getElementById("fieldBorderStyle") || document.getElementById("borderStyleSelect");
    const fillStyleSelect = document.getElementById("fieldFillStyle") || document.getElementById("fillStyleSelect");
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const dropdownOptions = document.getElementById("dropdownOptions");
    const fieldDefaultChecked = document.getElementById("fieldDefaultChecked");

    const syncChange = updater => {
        const field = getSelectedField();
        if (!field) return;
        updater(field);
        saveHistory();
        if (onFieldUpdated) onFieldUpdated(field);
    };

    const fieldTypeSelect = document.getElementById("fieldType");
    fieldTypeSelect?.addEventListener("change", e => {
        const newType = e.target.value;
        const field = getSelectedField();
        if (!field) return;

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
        populateProperties(field);
        if (onFieldUpdated) onFieldUpdated(field);
    });

    const fieldAutofill = document.getElementById("fieldAutofill");
    fieldAutofill?.addEventListener("change", e => syncChange(f => f.autofill = e.target.value));

    fieldNameInput?.addEventListener("input", e => syncChange(f => f.name = e.target.value));
    fieldDefaultVal?.addEventListener("input", e => syncChange(f => f.defaultValue = e.target.value));
    fieldFontFamily?.addEventListener("change", e => syncChange(f => f.fontFamily = e.target.value));
    
    fontSizeInput?.addEventListener("input", e => {
        const raw = e.target.value.trim();
        const val = raw === "" ? null : parseInt(raw);
        updateQuickSizeButtons(val, "quick-size-btn");
        if (val === null || (val >= 6 && val <= 120)) {
            syncChange(f => f.fontSize = val);
        }
    });

    document.querySelectorAll(".quick-size-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const size = parseInt(btn.dataset.size);
            if (fontSizeInput) fontSizeInput.value = size;
            updateQuickSizeButtons(size, "quick-size-btn");
            syncChange(f => f.fontSize = size);
        });
    });

    textAlignmentSelect?.addEventListener("change", e => syncChange(f => f.textAlignment = e.target.value));
    borderStyleSelect?.addEventListener("change", e => syncChange(f => f.borderStyle = e.target.value));
    fillStyleSelect?.addEventListener("change", e => syncChange(f => f.fillStyle = e.target.value));
    widthInput?.addEventListener("input", e => syncChange(f => f.width = Math.max(16, parseInt(e.target.value) || f.width)));
    heightInput?.addEventListener("input", e => syncChange(f => f.height = Math.max(16, parseInt(e.target.value) || f.height)));
    fieldRequired?.addEventListener("change", e => syncChange(f => f.required = e.target.checked));
    fieldReadOnly?.addEventListener("change", e => syncChange(f => f.readOnly = e.target.checked));
    fieldMultiline?.addEventListener("change", e => syncChange(f => f.multiline = e.target.checked));
    fieldMaxLength?.addEventListener("input", e => syncChange(f => f.maxLength = parseInt(e.target.value) || null));
    fieldTooltip?.addEventListener("input", e => syncChange(f => f.tooltip = e.target.value));
    autofillType?.addEventListener("change", e => syncChange(f => f.autofill = e.target.value));
    fieldDefaultChecked?.addEventListener("change", e => syncChange(f => f.defaultChecked = e.target.checked));

    // Enable Scrubbing and Scrolling on Number Inputs
    makeScrubbableAndScrollable(widthInput, null, { min: 16, max: 2000, step: 1 });
    makeScrubbableAndScrollable(heightInput, null, { min: 16, max: 1000, step: 1 });
    makeScrubbableAndScrollable(fontSizeInput, null, { min: 6, max: 120, step: 1 });
    makeScrubbableAndScrollable(fieldMaxLength, null, { min: 1, max: 5000, step: 1 });

    const PRESET_OPTIONS = {
        "yes-no": ["Yes", "No"],
        "titles": ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."],
        "employment": ["Full-Time", "Part-Time", "Contract", "Freelance", "Internship"],
        "priority": ["Low", "Medium", "High", "Critical / Urgent"],
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "ratings": ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]
    };

    function updateDropdownCount(opts) {
        const countEl = document.getElementById("dropdownOptionsCount");
        if (countEl) {
            const count = opts ? opts.length : 0;
            countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
        }
    }

    dropdownOptions?.addEventListener("input", e => {
        syncChange(f => {
            f.options = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
            updateDropdownCount(f.options);
        });
    });

    document.querySelectorAll(".preset-pill-btn[data-preset]").forEach(btn => {
        btn.addEventListener("click", () => {
            const presetKey = btn.dataset.preset;
            const presetList = PRESET_OPTIONS[presetKey];
            if (!presetList) return;
            const field = getSelectedField();
            if (!field || field.type !== "dropdown") return;
            field.options = [...presetList];
            if (!field.defaultValue || !presetList.includes(field.defaultValue)) {
                field.defaultValue = presetList[0];
            }
            if (dropdownOptions) dropdownOptions.value = presetList.join("\n");
            setVal("fieldDefaultValue", field.defaultValue);
            updateDropdownCount(field.options);
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        });
    });

    // Signature Action Buttons in properties panel
    document.getElementById("propOpenSignatureBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field || field.type !== "signature") return;
        openSignatureModal(field, () => {
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        });
    });

    document.getElementById("propClearSignatureBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field || field.type !== "signature") return;
        field.signatureImage = null;
        saveHistory();
        if (onFieldUpdated) onFieldUpdated(field);
    });

    // Duplicate single field
    document.getElementById("duplicateFieldBtn")?.addEventListener("click", () => {
        const dups = duplicateSelectedFields();
        if (dups.length > 0) {
            saveHistory();
            if (onFieldUpdated) onFieldUpdated();
        }
    });

    // Delete single field
    document.getElementById("deleteFieldBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field) return;
        state.fields = state.fields.filter(f => f.id !== field.id);
        setSelectedField(null);
        saveHistory();
        if (onFieldDeleted) onFieldDeleted();
    });

    // Initialize Collapsible Accordions in Properties Panel
    document.querySelectorAll(".prop-accordion-header").forEach(header => {
        header.addEventListener("click", () => {
            const acc = header.closest(".prop-accordion");
            if (acc) acc.classList.toggle("collapsed");
        });
    });

    // Multi-select Batch Styling and Alignment Tools
    initMultiSelectTools(onFieldUpdated);
}

export function populateProperties(field) {
    const emptyPanel = document.getElementById("rightPanelEmpty");
    const singleProps = document.getElementById("fieldProps");
    const multiProps = document.getElementById("multiSelectProps");
    const countBadge = document.getElementById("multiSelectedCountBadge");

    if (state.selectedFieldIds.size > 1) {
        if (emptyPanel) emptyPanel.style.display = "none";
        if (singleProps) singleProps.style.display = "none";
        if (multiProps) {
            multiProps.style.display = "block";
            if (countBadge) countBadge.textContent = `${state.selectedFieldIds.size} Selected`;
            
            const selectedFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
            const multiReq = document.getElementById("multiFieldRequired");
            if (multiReq) {
                multiReq.checked = selectedFields.length > 0 && selectedFields.every(f => f.required);
            }

            // Sync text alignment
            const alignInput = document.getElementById("multiTextAlignment");
            if (alignInput && document.activeElement !== alignInput) {
                const commonAlign = selectedFields[0]?.textAlignment;
                const allSameAlign = selectedFields.every(f => f.textAlignment === commonAlign);
                alignInput.value = (allSameAlign && commonAlign) ? commonAlign : "";
            }

            // Sync font family input if not actively focused
            const ffInput = document.getElementById("multiFontFamily");
            if (ffInput && document.activeElement !== ffInput) {
                const commonFam = selectedFields[0]?.fontFamily;
                const allSameFam = selectedFields.every(f => f.fontFamily === commonFam);
                ffInput.value = (allSameFam && commonFam) ? commonFam : "";
            }

            // Sync font size input if not actively focused by user
            const fsInput = document.getElementById("multiFontSize");
            if (fsInput && document.activeElement !== fsInput) {
                const firstSize = selectedFields[0]?.fontSize;
                const allHaveSameExplicitSize = selectedFields.every(f => f.fontSize === firstSize);
                if (allHaveSameExplicitSize && firstSize) {
                    fsInput.value = firstSize;
                    updateQuickSizeButtons(firstSize, "multi-quick-size-btn");
                } else {
                    fsInput.value = "";
                    updateQuickSizeButtons(null, "multi-quick-size-btn");
                }
            }

            // Sync default value input if not actively focused
            const defInput = document.getElementById("multiDefaultValue");
            if (defInput && document.activeElement !== defInput) {
                const commonVal = selectedFields[0]?.defaultValue;
                const allSameVal = selectedFields.every(f => f.defaultValue === commonVal);
                defInput.value = (allSameVal && commonVal) ? commonVal : "";
            }
        }
        if (typeof lucide !== "undefined") lucide.createIcons();
        return;
    }

    if (!field) {
        if (emptyPanel) emptyPanel.style.display = "flex";
        if (singleProps) singleProps.style.display = "none";
        if (multiProps) multiProps.style.display = "none";
        return;
    }

    if (emptyPanel) emptyPanel.style.display = "none";
    if (multiProps) multiProps.style.display = "none";
    if (singleProps) singleProps.style.display = "block";

    const badge = document.getElementById("propFieldTypeBadge");
    if (badge) {
        const labels = {
            textField: "Text Field",
            dateField: "Date Field",
            dropdown: "Drop Down",
            checkBox: "Check Box",
            radioGroup: "Radio Group",
            signature: "Signature"
        };
        badge.textContent = labels[field.type] || "Field";
    }

    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if (el && document.activeElement !== el) el.value = val || ""; 
    };
    const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    setVal("fieldType", field.type);
    setVal("fieldName", field.name || "");
    setVal("fieldDefaultValue", field.defaultValue || "");
    setVal("fieldFontFamily", field.fontFamily || "helvetica");
    setVal("fontSize", field.fontSize || "");
    
    const activeSize = (field.fontSize && field.fontSize >= 6) ? field.fontSize : 11;
    updateQuickSizeButtons(activeSize, "quick-size-btn");

    setVal("textAlignment", field.textAlignment || "left");
    setVal("fieldTooltip", field.tooltip || "");
    setVal("autofillType", field.autofill || "");
    setVal("fieldAutofill", field.autofill || "");
    setVal("fieldBorderStyle", field.borderStyle || "solid");
    setVal("borderStyleSelect", field.borderStyle || "solid");
    setVal("fieldFillStyle", field.fillStyle || "white");
    setVal("fillStyleSelect", field.fillStyle || "white");
    setVal("width", field.width || "");
    setVal("height", field.height || "");
    setChecked("fieldRequired", field.required);
    setChecked("fieldReadOnly", field.readOnly);
    setChecked("fieldMultiline", field.multiline);
    setChecked("fieldDefaultChecked", field.defaultChecked);

    // Signature controls visibility
    const sigGroup = document.getElementById("signatureActionsGroup");
    const propClearSig = document.getElementById("propClearSignatureBtn");
    const propOpenSigSpan = document.querySelector("#propOpenSignatureBtn span");
    if (sigGroup) {
        sigGroup.style.display = field.type === "signature" ? "block" : "none";
        if (field.type === "signature") {
            if (propClearSig) propClearSig.style.display = field.signatureImage ? "block" : "none";
            if (propOpenSigSpan) propOpenSigSpan.textContent = field.signatureImage ? "Redraw / Retype Signature" : "Pre-sign Document";
        }
    }

    // Typography accordion visibility
    const accTypography = document.getElementById("accTypography");
    if (accTypography) {
        accTypography.style.display = (field.type === "textField" || field.type === "dropdown" || field.type === "dateField") ? "block" : "none";
    }

    const multilineGroup = document.getElementById("multilineGroup");
    if (multilineGroup) {
        multilineGroup.style.display = (field.type === "textField") ? "flex" : "none";
    }

    const ddGroup = document.getElementById("dropdownOptionsGroup");
    if (ddGroup) {
        ddGroup.style.display = field.type === "dropdown" ? "block" : "none";
        if (field.type === "dropdown") {
            const opts = field.options || [];
            setVal("dropdownOptions", opts.join("\n"));
            const countEl = document.getElementById("dropdownOptionsCount");
            if (countEl) countEl.textContent = `${opts.length} ${opts.length === 1 ? 'item' : 'items'}`;
        }
    }

    const checkGroup = document.getElementById("defaultCheckedGroup");
    if (checkGroup) {
        checkGroup.style.display = (field.type === "checkBox" || field.type === "radioGroup") ? "flex" : "none";
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function initMultiSelectTools(onUpdated) {
    const getSelected = () => state.fields.filter(f => state.selectedFieldIds.has(f.id));
    const batchUpdate = mutator => {
        const sel = getSelected();
        if (sel.length === 0) return;
        sel.forEach(mutator);
        saveHistory();
        if (onUpdated) onUpdated();
    };

    // ── 1-Click Batch Border Changes ─────────────────────────────────
    document.getElementById("multiBorderSolidBtn")?.addEventListener("click", () => batchUpdate(f => f.borderStyle = "solid"));
    document.getElementById("multiBorderNoneBtn")?.addEventListener("click", () => batchUpdate(f => f.borderStyle = "none"));

    // ── 1-Click Batch Box Fill / Background ──────────────────────────
    document.getElementById("multiFillWhiteBtn")?.addEventListener("click", () => batchUpdate(f => f.fillStyle = "white"));
    document.getElementById("multiFillTintBtn")?.addEventListener("click", () => batchUpdate(f => f.fillStyle = "tint"));
    document.getElementById("multiFillYellowBtn")?.addEventListener("click", () => batchUpdate(f => f.fillStyle = "yellow"));
    document.getElementById("multiFillTransBtn")?.addEventListener("click", () => batchUpdate(f => f.fillStyle = "transparent"));

    // ── Batch Text, Typography & Alignment ───────────────────────────
    document.getElementById("multiDefaultValue")?.addEventListener("input", e => {
        const val = e.target.value;
        batchUpdate(f => {
            if (f.type === "textField") {
                f.defaultValue = val;
            }
        });
    });

    document.getElementById("multiFontFamily")?.addEventListener("change", e => {
        const val = e.target.value;
        if (val) {
            batchUpdate(f => {
                if (f.type === "textField" || f.type === "dropdown") {
                    f.fontFamily = val;
                }
            });
        }
    });

    document.getElementById("multiFontSize")?.addEventListener("input", e => {
        const raw = e.target.value.trim();
        const val = raw === "" ? null : parseInt(raw);
        updateQuickSizeButtons(val, "multi-quick-size-btn");
        if (val === null || (val >= 6 && val <= 120)) {
            batchUpdate(f => {
                if (f.type === "textField" || f.type === "dropdown") {
                    f.fontSize = val;
                }
            });
        }
    });

    const multiFsInput = document.getElementById("multiFontSize");
    if (multiFsInput) {
        makeScrubbableAndScrollable(multiFsInput, null, { min: 6, max: 120, step: 1 });
    }

    document.querySelectorAll(".multi-quick-size-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const size = parseInt(btn.dataset.size);
            const fsInput = document.getElementById("multiFontSize");
            if (fsInput) fsInput.value = size;
            updateQuickSizeButtons(size, "multi-quick-size-btn");
            batchUpdate(f => {
                if (f.type === "textField" || f.type === "dropdown") {
                    f.fontSize = size;
                }
            });
        });
    });

    document.getElementById("multiTextAlignment")?.addEventListener("change", e => {
        const val = e.target.value;
        if (val) {
            batchUpdate(f => {
                if (f.type === "textField" || f.type === "dropdown") {
                    f.textAlignment = val;
                }
            });
        }
    });

    // ── Batch Required Toggle ────────────────────────────────────────
    document.getElementById("multiFieldRequired")?.addEventListener("change", e => {
        const req = e.target.checked;
        batchUpdate(f => f.required = req);
    });

    // ── Alignment Tools ──────────────────────────────────────────────
    document.getElementById("alignLeftBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const minX = Math.min(...sel.map(f => f.x));
        sel.forEach(f => f.x = minX);
        saveHistory();
        if (onUpdated) onUpdated();
    });

    document.getElementById("alignCenterBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const avgCenter = sel.reduce((sum, f) => sum + (f.x + f.width / 2), 0) / sel.length;
        sel.forEach(f => f.x = Math.round(avgCenter - f.width / 2));
        saveHistory();
        if (onUpdated) onUpdated();
    });

    document.getElementById("alignRightBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const maxRight = Math.max(...sel.map(f => f.x + f.width));
        sel.forEach(f => f.x = maxRight - f.width);
        saveHistory();
        if (onUpdated) onUpdated();
    });

    document.getElementById("alignTopBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const minY = Math.min(...sel.map(f => f.y));
        sel.forEach(f => f.y = minY);
        saveHistory();
        if (onUpdated) onUpdated();
    });

    document.getElementById("alignMiddleBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const avgMiddle = sel.reduce((sum, f) => sum + (f.y + f.height / 2), 0) / sel.length;
        sel.forEach(f => f.y = Math.round(avgMiddle - f.height / 2));
        saveHistory();
        if (onUpdated) onUpdated();
    });

    document.getElementById("alignBottomBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const maxBottom = Math.max(...sel.map(f => f.y + f.height));
        sel.forEach(f => f.y = maxBottom - f.height);
        saveHistory();
        if (onUpdated) onUpdated();
    });

    // ── Spacing Distribution Tools (Even Spacing) ────────────────────
    document.getElementById("distributeVerticalBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 3) return;
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
        if (onUpdated) onUpdated();
    });

    document.getElementById("distributeHorizontalBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 3) return;
        sel.sort((a, b) => a.x - b.x);
        const first = sel[0];
        const last = sel[sel.length - 1];
        const totalSpan = (last.x + last.width) - first.x;
        const totalItemsWidth = sel.reduce((sum, f) => sum + f.width, 0);
        const totalGap = totalSpan - totalItemsWidth;
        const gap = totalGap / (sel.length - 1);
        
        let currentX = first.x;
        for (let i = 0; i < sel.length; i++) {
            if (i > 0) {
                currentX += sel[i - 1].width + gap;
                sel[i].x = Math.round(currentX);
            }
        }
        saveHistory();
        if (onUpdated) onUpdated();
    });

    // ── Group Selected Fields ─────────────────────────────────────────
    document.getElementById("multiGroupBtn")?.addEventListener("click", () => {
        const grp = createGroupForSelected();
        if (grp) {
            saveHistory();
            if (onUpdated) onUpdated();
        }
    });

    // ── Ungroup Selected Fields ───────────────────────────────────────
    document.getElementById("multiUngroupBtn")?.addEventListener("click", () => {
        ungroupSelected();
        saveHistory();
        if (onUpdated) onUpdated();
    });

    // ── Delete All Selected ──────────────────────────────────────────
    document.getElementById("deleteMultiBtn")?.addEventListener("click", () => {
        state.fields = state.fields.filter(f => !state.selectedFieldIds.has(f.id));
        state.selectedFieldIds.clear();
        saveHistory();
        if (onUpdated) onUpdated();
    });
}
