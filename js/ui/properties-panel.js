// ── Right Properties Inspector & Alignment (js/ui/properties-panel.js) ─
import { state, getSelectedField, setSelectedField, duplicateSelectedFields, createGroupForSelected, ungroupSelected } from "../core/state.js";
import { saveHistory } from "../core/storage-manager.js";
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
        labelEl = inputEl.closest(".prop-field")?.querySelector("label") || inputEl.closest(".form-group")?.querySelector("label") || inputEl.previousElementSibling;
    }

    // 1. Mouse Wheel in Number Input: ONLY active when the input is explicitly focused
    // When unfocused, wheel events pass through cleanly to scroll the inspector sidebar without mutating values.
    inputEl.addEventListener("wheel", e => {
        if (document.activeElement !== inputEl) return;
        e.preventDefault();
        const currentVal = parseFloat(inputEl.value) || min;
        const multiplier = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
        const dir = e.deltaY < 0 ? 1 : -1;
        const newVal = Math.max(min, Math.min(max, Math.round((currentVal + dir * step * multiplier) * 10) / 10));
        inputEl.value = newVal;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        if (onUpdate) onUpdate(newVal);
    }, { passive: false });

    // 2. Click & Drag Scrubbing on Label
    if (labelEl) {
        labelEl.classList.add("scrubbable");
        labelEl.title = "Click & drag left/right to scrub value (Shift: 10x, Alt: 0.1x)";

        labelEl.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const startX = e.clientX;
            const startVal = parseFloat(inputEl.value) || 0;
            document.body.classList.add("is-scrubbing");

            const labelText = labelEl.textContent.replace(/[↔\s\(px\)pt]/gi, "").trim() || "Value";
            let hud = document.getElementById("vernierHud");
            if (!hud) {
                hud = document.createElement("div");
                hud.id = "vernierHud";
                hud.className = "vernier-hud";
                document.body.appendChild(hud);
            }

            let hasMoved = false;

            const onMouseMove = ev => {
                const deltaX = ev.clientX - startX;
                if (Math.abs(deltaX) > 1) hasMoved = true;
                const multiplier = ev.shiftKey ? 10 : (ev.altKey ? 0.1 : 1);
                const rawVal = startVal + deltaX * (step * 0.5) * multiplier;
                const newVal = Math.max(min, Math.min(max, Math.round(rawVal)));
                inputEl.value = newVal;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                if (onUpdate) onUpdate(newVal);

                const delta = newVal - startVal;
                const deltaSign = delta > 0 ? `+${delta}` : `${delta}`;
                hud.innerHTML = `<span class="vernier-axis">${labelText}:</span> <span class="vernier-val">${newVal}</span> ${delta !== 0 ? `<span class="vernier-delta">(Δ${deltaSign})</span>` : ""}`;
                hud.style.left = `${ev.clientX + 14}px`;
                hud.style.top = `${ev.clientY - 28}px`;
                hud.classList.add("visible");
            };

            const onMouseUp = () => {
                document.body.classList.remove("is-scrubbing");
                if (hud) hud.classList.remove("visible");
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

export function sanitizePdfFieldName(name) {
    if (!name || typeof name !== "string") return "field_1";
    let sanitized = name
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!sanitized) return "field_1";
    if (/^\d/.test(sanitized)) {
        sanitized = `f_${sanitized}`;
    }
    return sanitized;
}

export function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function updateFormulaLivePreview(field) {
    if (typeof document === "undefined") return;
    const previewCard = document.getElementById("calcPreviewCard");
    const previewStatus = document.getElementById("calcPreviewStatus");
    const previewExpr = document.getElementById("calcPreviewExpr");
    const previewVal = document.getElementById("calcPreviewVal");
    if (!previewCard || !previewStatus || !previewExpr || !previewVal) return;

    if (!field || !field.calculationType || field.calculationType === "none") {
        previewCard.style.display = "none";
        return;
    }

    previewCard.style.display = "flex";

    const getSampleVal = (name) => {
        const found = (state.fields || []).find(f => f.name === name || f.id === name);
        if (found) {
            const raw = found.value !== undefined && found.value !== "" ? found.value : found.defaultValue;
            const num = parseFloat(String(raw || "").replace(/[^0-9.-]/g, ""));
            if (!isNaN(num) && num !== 0) return num;
        }
        return 10;
    };

    let evaluatedVal = 0;
    let expressionString = "";
    let isValid = true;
    let errorMessage = "";

    const targets = Array.isArray(field.calculationFields)
        ? field.calculationFields
        : (field.calculationFields ? String(field.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);

    if (field.calculationType === "sum") {
        if (targets.length === 0) {
            expressionString = "No fields selected";
            evaluatedVal = 0;
        } else {
            const sampleVals = targets.map(t => getSampleVal(t));
            expressionString = sampleVals.join(" + ");
            evaluatedVal = sampleVals.reduce((a, b) => a + b, 0);
        }
    } else if (field.calculationType === "prod") {
        if (targets.length === 0) {
            expressionString = "No fields selected";
            evaluatedVal = 0;
        } else {
            const sampleVals = targets.map(t => getSampleVal(t));
            expressionString = sampleVals.join(" × ");
            evaluatedVal = sampleVals.reduce((a, b) => a * b, 1);
        }
    } else if (field.calculationType === "tax") {
        const baseName = field.calculationTaxBaseField || targets[0] || "subtotal";
        const rate = parseFloat(field.calculationTaxRate !== undefined ? field.calculationTaxRate : 10);
        const baseVal = getSampleVal(baseName);
        expressionString = `${baseVal} × ${rate}%`;
        evaluatedVal = baseVal * (rate / 100);
    } else if (field.calculationType === "discount") {
        const baseName = field.calculationDiscountBaseField || targets[0] || "subtotal";
        const rate = parseFloat(field.calculationDiscountRate !== undefined ? field.calculationDiscountRate : 10);
        const baseVal = getSampleVal(baseName);
        expressionString = `${baseVal} × ${rate}%`;
        evaluatedVal = baseVal * (rate / 100);
    } else if (field.calculationType === "custom" && field.calculationFormula) {
        const rawFormula = field.calculationFormula.trim();
        if (!rawFormula) {
            expressionString = "Empty formula";
            evaluatedVal = 0;
        } else {
            const tokens = rawFormula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            const reserved = new Set(["Math", "Number", "parseInt", "parseFloat", "min", "max", "round", "abs", "floor", "ceil", "SUM", "PROD", "true", "false", "null", "undefined"]);
            let substitutedExpr = rawFormula;
            tokens.forEach(tok => {
                if (!reserved.has(tok)) {
                    const sample = getSampleVal(tok);
                    substitutedExpr = substitutedExpr.replace(new RegExp(`\\b${tok}\\b`, "g"), `${sample}`);
                }
            });
            expressionString = substitutedExpr;
            try {
                if (/^[0-9+\-*/().\s]+$/.test(substitutedExpr)) {
                    evaluatedVal = Function(`"use strict"; return (${substitutedExpr})`)();
                    if (!Number.isFinite(evaluatedVal)) {
                        isValid = false;
                        errorMessage = "Division by zero or invalid";
                    }
                } else {
                    isValid = false;
                    errorMessage = "Incomplete expression";
                }
            } catch (err) {
                isValid = false;
                errorMessage = "Incomplete expression";
            }
        }
    } else if (field.calculationType === "custom") {
        expressionString = "Type or insert formula";
        evaluatedVal = 0;
    }

    if (isValid) {
        previewStatus.className = "calc-preview-status status-valid";
        previewStatus.textContent = "✓ Valid";
        previewExpr.textContent = expressionString;
        previewVal.textContent = (Number.isFinite(evaluatedVal) && !Number.isInteger(evaluatedVal)) ? Number(evaluatedVal).toFixed(2) : String(evaluatedVal);
        previewVal.style.display = "inline";
    } else {
        previewStatus.className = "calc-preview-status status-error";
        previewStatus.textContent = `⚠️ ${errorMessage || "Incomplete"}`;
        previewExpr.textContent = expressionString;
        previewVal.style.display = "none";
    }
}

let panelOnFieldUpdated = null;
let lastHandledPickTime = 0;
export let isPickingCalcField = false;

export function syncFieldChange(updater, immediate = false, actionName = null) {
    const field = getSelectedField();
    if (!field) return;
    updater(field);
    saveHistory(immediate, actionName);
    if (panelOnFieldUpdated) panelOnFieldUpdated(field);
}

export const updateCalcVisibility = (calcType) => {
    const calcFieldsGroup = document.getElementById("calcFieldsGroup");
    const calcTaxGroup = document.getElementById("calcTaxGroup");
    const calcDiscountGroup = document.getElementById("calcDiscountGroup");
    const calcFormulaGroup = document.getElementById("calcFormulaGroup");
    const calcOperatorsGroup = document.getElementById("calcOperatorsGroup");
    const calcFieldChipsGroup = document.getElementById("calcFieldChipsGroup");
    const calcPreviewCard = document.getElementById("calcPreviewCard");

    if (calcFieldsGroup) calcFieldsGroup.style.display = (calcType === "sum" || calcType === "prod") ? "block" : "none";
    if (calcTaxGroup) calcTaxGroup.style.display = (calcType === "tax") ? "flex" : "none";
    if (calcDiscountGroup) calcDiscountGroup.style.display = (calcType === "discount") ? "flex" : "none";
    if (calcFormulaGroup) calcFormulaGroup.style.display = (calcType === "custom") ? "block" : "none";
    if (calcOperatorsGroup) calcOperatorsGroup.style.display = (calcType === "custom") ? "flex" : "none";
    if (calcFieldChipsGroup) calcFieldChipsGroup.style.display = (calcType !== "none") ? "flex" : "none";
    if (calcPreviewCard) calcPreviewCard.style.display = (calcType !== "none") ? "flex" : "none";
};

export const populateBaseFieldOptions = (currentField) => {
    if (!currentField) return;
    const calcTaxBaseField = document.getElementById("calcTaxBaseField");
    const calcDiscountBaseField = document.getElementById("calcDiscountBaseField");
    const otherFields = (state.fields || []).filter(f => f.id !== currentField.id && (f.type === "textField" || f.type === "number" || !f.type));
    const buildOptionsHtml = (selectedVal) => {
        if (otherFields.length === 0) return '<option value="">(No other fields on page)</option>';
        return otherFields.map(f => {
            const name = f.name || f.id;
            const isSel = (selectedVal === name || selectedVal === f.id);
            return `<option value="${escapeHtml(name)}" ${isSel ? "selected" : ""}>${escapeHtml(name)}</option>`;
        }).join("");
    };

    if (calcTaxBaseField) {
        calcTaxBaseField.innerHTML = buildOptionsHtml(currentField.calculationTaxBaseField || otherFields[0]?.name || otherFields[0]?.id || "");
    }
    if (calcDiscountBaseField) {
        calcDiscountBaseField.innerHTML = buildOptionsHtml(currentField.calculationDiscountBaseField || otherFields[0]?.name || otherFields[0]?.id || "");
    }
};

export const renderFormulaFieldChips = (currentField) => {
    const tray = document.getElementById("calcFieldChipsTray");
    const countEl = document.getElementById("calcAvailableFieldsCount");
    if (!tray || !currentField) return;

    tray.innerHTML = "";
    const otherFields = (state.fields || []).filter(f => f.id !== currentField.id && (f.type === "textField" || f.type === "number" || !f.type));
    if (countEl) countEl.textContent = `${otherFields.length} field${otherFields.length === 1 ? "" : "s"}`;

    const currentTargets = Array.isArray(currentField.calculationFields)
        ? currentField.calculationFields
        : (currentField.calculationFields ? String(currentField.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);

    otherFields.forEach(f => {
        const fieldName = f.name || f.id;
        const isSelected = currentTargets.includes(fieldName);

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `calc-chip-btn ${isSelected ? "selected" : ""}`;
        chip.innerHTML = `<span class="chip-plus">${isSelected ? "✓" : "+"}</span><span>${escapeHtml(fieldName)}</span>`;
        chip.title = `Insert ${fieldName}`;

        chip.addEventListener("click", e => {
            e.preventDefault();
            handleFieldChipClicked(fieldName);
        });

        tray.appendChild(chip);
    });
};

export const handleFieldChipClicked = (fieldName) => {
    const field = getSelectedField();
    if (!field) return;

    // If calculation type is not set or none, auto-switch to sum so target fields work immediately
    if (!field.calculationType || field.calculationType === "none") {
        field.calculationType = "sum";
        const fieldCalcType = document.getElementById("fieldCalcType");
        if (fieldCalcType) fieldCalcType.value = "sum";
        updateCalcVisibility("sum");
    }

    const fieldCalcTargetFields = document.getElementById("fieldCalcTargetFields");
    const calcTaxBaseField = document.getElementById("calcTaxBaseField");
    const calcDiscountBaseField = document.getElementById("calcDiscountBaseField");

    if (field.calculationType === "sum" || field.calculationType === "prod") {
        let targets = Array.isArray(field.calculationFields)
            ? [...field.calculationFields]
            : (field.calculationFields ? String(field.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);
        
        if (targets.includes(fieldName)) {
            targets = targets.filter(t => t !== fieldName);
        } else {
            targets.push(fieldName);
        }
        field.calculationFields = targets;
        if (fieldCalcTargetFields) fieldCalcTargetFields.value = targets.join(", ");
        syncFieldChange(f => f.calculationFields = targets, true, "Update Target Fields");
        renderFormulaFieldChips(field);
        updateFormulaLivePreview(field);
    } else if (field.calculationType === "tax") {
        field.calculationTaxBaseField = fieldName;
        if (calcTaxBaseField) calcTaxBaseField.value = fieldName;
        syncFieldChange(f => f.calculationTaxBaseField = fieldName, true, "Set Base Tax Field");
        renderFormulaFieldChips(field);
        updateFormulaLivePreview(field);
    } else if (field.calculationType === "discount") {
        field.calculationDiscountBaseField = fieldName;
        if (calcDiscountBaseField) calcDiscountBaseField.value = fieldName;
        syncFieldChange(f => f.calculationDiscountBaseField = fieldName, true, "Set Base Discount Field");
        renderFormulaFieldChips(field);
        updateFormulaLivePreview(field);
    } else {
        // Custom Formula
        insertTokenIntoFormula(fieldName);
    }
};

export const insertTokenIntoFormula = (token) => {
    const input = document.getElementById("fieldCalcFormula");
    if (!input) return;
    const start = input.selectionStart !== null ? input.selectionStart : input.value.length;
    const end = input.selectionEnd !== null ? input.selectionEnd : input.value.length;
    const before = input.value.substring(0, start);
    const after = input.value.substring(end);

    const needLeadingSpace = before.length > 0 && !/[\s(+\-*/]$/.test(before) && !/^\s/.test(token);
    const needTrailingSpace = after.length > 0 && !/^[\s)+\-*/]/.test(after) && !/\s$/.test(token);

    const insertion = `${needLeadingSpace ? " " : ""}${token}${needTrailingSpace ? " " : ""}`;
    input.value = before + insertion + after;
    const newPos = start + insertion.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();

    syncFieldChange(f => {
        f.calculationFormula = input.value;
    }, true, "Insert Formula Token");
    updateFormulaLivePreview(getSelectedField());
};

export const setCanvasPickMode = (active) => {
    isPickingCalcField = !!active;
    document.body.classList.toggle("is-picking-calc-field", isPickingCalcField);
    const calcPickFromCanvasBtn = document.getElementById("calcPickFromCanvasBtn");
    const calcFormulaCanvasPickBtn = document.getElementById("calcFormulaCanvasPickBtn");
    calcPickFromCanvasBtn?.classList.toggle("active", isPickingCalcField);
    calcFormulaCanvasPickBtn?.classList.toggle("active", isPickingCalcField);

    let hud = document.getElementById("calcPickerHud");
    if (isPickingCalcField) {
        if (!hud) {
            hud = document.createElement("div");
            hud.id = "calcPickerHud";
            hud.className = "calc-picker-hud";
            hud.innerHTML = `
                <span class="calc-picker-hud-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                    Pick on Canvas Active
                </span>
                <span>Click any field on the canvas to add to calculation</span>
                <button type="button" class="calc-picker-hud-done-btn" id="calcPickerDoneBtn">Done (Esc)</button>
            `;
            document.body.appendChild(hud);
            document.getElementById("calcPickerDoneBtn")?.addEventListener("click", () => setCanvasPickMode(false));
        } else {
            hud.style.display = "flex";
        }
    } else {
        if (hud) hud.style.display = "none";
    }
};

export const handleCanvasFieldPick = e => {
    if (!isPickingCalcField) return;
    const fieldEl = e.target.closest(".field-overlay");
    if (!fieldEl) return;

    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();

    const now = Date.now();
    if (now - lastHandledPickTime < 180) return;
    lastHandledPickTime = now;

    const fieldId = fieldEl.id?.replace(/^overlay_/, "") || fieldEl.dataset?.id;
    const targetField = (state.fields || []).find(f => String(f.id) === String(fieldId));
    if (targetField) {
        handleFieldChipClicked(targetField.name || targetField.id);
        fieldEl.classList.remove("just-picked-flash");
        void fieldEl.offsetWidth;
        fieldEl.classList.add("just-picked-flash");
        setTimeout(() => fieldEl.classList.remove("just-picked-flash"), 400);
    }
};

if (typeof window !== "undefined") {
    window.addEventListener("mousedown", handleCanvasFieldPick, true);
    window.addEventListener("pointerdown", handleCanvasFieldPick, true);
    window.addEventListener("click", handleCanvasFieldPick, true);
    window.addEventListener("keydown", e => {
        if (e.key === "Escape" && isPickingCalcField) {
            setCanvasPickMode(false);
        }
    });
}

export function initPropertiesPanel(onFieldUpdated, onFieldDeleted) {
    panelOnFieldUpdated = onFieldUpdated;
    const syncChange = syncFieldChange;

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
    const posXInput = document.getElementById("posX");
    const posYInput = document.getElementById("posY");
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const dropdownOptions = document.getElementById("dropdownOptions");
    const fieldDefaultChecked = document.getElementById("fieldDefaultChecked");
    const fieldCheckboxMark = document.getElementById("fieldCheckboxMark");

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
        } else if (newType === "staticText") {
            if (!field.defaultValue && !field.label) field.defaultValue = "Heading / Label";
            if (!field.fontSize) field.fontSize = 16;
            field.height = Math.max(field.height, 28);
        }

        saveHistory(true, `Change Field Type to ${newType}`);
        populateProperties(field);
        if (onFieldUpdated) onFieldUpdated(field);
    });

    const fieldAutofill = document.getElementById("fieldAutofill");
    fieldAutofill?.addEventListener("change", e => syncChange(f => f.autofill = e.target.value, true, "Set Autofill Token"));

    const updateHeaderFieldName = (val) => {
        const badge = document.getElementById("propFieldTypeBadge");
        if (badge) {
            const displayName = val.trim() || state.selectedField?.autofill || (state.selectedField?.type === "staticText" ? "Heading Text" : state.selectedField?.id) || "Field";
            badge.textContent = displayName;
            badge.title = val.trim();
        }
    };

    fieldNameInput?.addEventListener("input", e => {
        syncChange(f => f.name = e.target.value, false);
        updateHeaderFieldName(e.target.value);
    });
    fieldNameInput?.addEventListener("change", e => {
        const clean = sanitizePdfFieldName(e.target.value);
        e.target.value = clean;
        syncChange(f => f.name = clean, true, "Rename Field");
        updateHeaderFieldName(clean);
    });
    fieldDefaultVal?.addEventListener("input", e => syncChange(f => {
        f.defaultValue = e.target.value;
        if (f.type === "staticText" || f.type === "label") {
            f.label = e.target.value;
        }
    }, false));
    fieldDefaultVal?.addEventListener("change", e => syncChange(f => {
        f.defaultValue = e.target.value;
        if (f.type === "staticText" || f.type === "label") {
            f.label = e.target.value;
        }
    }, true, "Set Default Value"));
    fieldFontFamily?.addEventListener("change", e => syncChange(f => f.fontFamily = e.target.value, true, "Change Font Family"));
    
    fontSizeInput?.addEventListener("input", e => {
        const raw = e.target.value.trim();
        const val = raw === "" ? null : parseInt(raw);
        updateQuickSizeButtons(val, "quick-size-btn");
        if (val === null || (val >= 6 && val <= 120)) {
            syncChange(f => f.fontSize = val, false);
        }
    });
    fontSizeInput?.addEventListener("change", e => {
        const raw = e.target.value.trim();
        const val = raw === "" ? null : parseInt(raw);
        if (val === null || (val >= 6 && val <= 120)) {
            syncChange(f => f.fontSize = val, true, "Set Font Size");
        }
    });

    document.querySelectorAll(".quick-size-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const size = parseInt(btn.dataset.size);
            if (fontSizeInput) fontSizeInput.value = size;
            updateQuickSizeButtons(size, "quick-size-btn");
            syncChange(f => f.fontSize = size, true, `Set Font Size to ${size}pt`);
        });
    });

    textAlignmentSelect?.addEventListener("change", e => syncChange(f => f.textAlignment = e.target.value, true, "Change Text Alignment"));
    borderStyleSelect?.addEventListener("change", e => syncChange(f => f.borderStyle = e.target.value, true, "Change Border Style"));
    fillStyleSelect?.addEventListener("change", e => syncChange(f => f.fillStyle = e.target.value, true, "Change Fill Style"));
    
    posXInput?.addEventListener("input", e => syncChange(f => f.x = parseFloat(e.target.value) || 0, false));
    posXInput?.addEventListener("change", e => syncChange(f => f.x = parseFloat(e.target.value) || 0, true, "Position X"));
    posYInput?.addEventListener("input", e => syncChange(f => f.y = parseFloat(e.target.value) || 0, false));
    posYInput?.addEventListener("change", e => syncChange(f => f.y = parseFloat(e.target.value) || 0, true, "Position Y"));

    widthInput?.addEventListener("input", e => syncChange(f => f.width = Math.max(16, parseInt(e.target.value) || f.width), false));
    widthInput?.addEventListener("change", e => syncChange(f => f.width = Math.max(16, parseInt(e.target.value) || f.width), true, "Set Width"));
    heightInput?.addEventListener("input", e => syncChange(f => f.height = Math.max(16, parseInt(e.target.value) || f.height), false));
    heightInput?.addEventListener("change", e => syncChange(f => f.height = Math.max(16, parseInt(e.target.value) || f.height), true, "Set Height"));
    fieldRequired?.addEventListener("change", e => syncChange(f => f.required = e.target.checked, true, "Toggle Required"));
    fieldReadOnly?.addEventListener("change", e => syncChange(f => f.readOnly = e.target.checked, true, "Toggle Read Only"));
    fieldMultiline?.addEventListener("change", e => syncChange(f => f.multiline = e.target.checked, true, "Toggle Multiline"));
    
    const fieldIsComb = document.getElementById("fieldIsComb");
    fieldIsComb?.addEventListener("change", e => {
        syncChange(f => {
            f.isComb = e.target.checked;
            if (f.isComb && (!f.maxLength || f.maxLength < 1)) {
                f.maxLength = 10;
                if (fieldMaxLength) fieldMaxLength.value = 10;
            }
        }, true, "Toggle Comb Characters");
    });

    fieldMaxLength?.addEventListener("input", e => syncChange(f => f.maxLength = parseInt(e.target.value) || null, false));
    fieldMaxLength?.addEventListener("change", e => syncChange(f => f.maxLength = parseInt(e.target.value) || null, true, "Set Max Length"));
    fieldTooltip?.addEventListener("input", e => syncChange(f => f.tooltip = e.target.value, false));
    fieldTooltip?.addEventListener("change", e => syncChange(f => f.tooltip = e.target.value, true, "Set Tooltip"));
    autofillType?.addEventListener("change", e => syncChange(f => f.autofill = e.target.value, true, "Set Autofill"));
    fieldDefaultChecked?.addEventListener("change", e => syncChange(f => f.defaultChecked = e.target.checked, true, "Toggle Checked"));
    fieldCheckboxMark?.addEventListener("change", e => syncChange(f => f.checkboxMark = e.target.value, true, "Set Checkbox Style"));

    // ── Visual Formula & Calculation Builder Listeners ───────────────────────
    const fieldCalcType = document.getElementById("fieldCalcType");
    const fieldCalcTargetFields = document.getElementById("fieldCalcTargetFields");
    const fieldCalcFormula = document.getElementById("fieldCalcFormula");
    const calcTaxBaseField = document.getElementById("calcTaxBaseField");
    const calcTaxRateInput = document.getElementById("calcTaxRateInput");
    const calcDiscountBaseField = document.getElementById("calcDiscountBaseField");
    const calcDiscountRateInput = document.getElementById("calcDiscountRateInput");
    const calcPickFromCanvasBtn = document.getElementById("calcPickFromCanvasBtn");
    const calcFormulaCanvasPickBtn = document.getElementById("calcFormulaCanvasPickBtn");

    calcPickFromCanvasBtn?.addEventListener("click", () => {
        const field = getSelectedField();
        if (field && (!field.calculationType || field.calculationType === "none")) {
            field.calculationType = "sum";
            if (fieldCalcType) fieldCalcType.value = "sum";
            updateCalcVisibility("sum");
            populateBaseFieldOptions(field);
            renderFormulaFieldChips(field);
        }
        setCanvasPickMode(!isPickingCalcField);
    });

    calcFormulaCanvasPickBtn?.addEventListener("click", () => {
        const field = getSelectedField();
        if (field && (!field.calculationType || field.calculationType === "none")) {
            field.calculationType = "custom";
            if (fieldCalcType) fieldCalcType.value = "custom";
            updateCalcVisibility("custom");
            populateBaseFieldOptions(field);
            renderFormulaFieldChips(field);
        }
        setCanvasPickMode(!isPickingCalcField);
    });

    fieldCalcType?.addEventListener("change", e => {
        const val = e.target.value;
        updateCalcVisibility(val);
        const field = getSelectedField();
        if (field) {
            field.calculationType = val;
            if (val === "tax") {
                if (field.calculationTaxRate === undefined) field.calculationTaxRate = 10;
                if (!field.calculationTaxBaseField) {
                    const other = (state.fields || []).find(f => f.id !== field.id);
                    if (other) field.calculationTaxBaseField = other.name || other.id;
                }
            } else if (val === "discount") {
                if (field.calculationDiscountRate === undefined) field.calculationDiscountRate = 10;
                if (!field.calculationDiscountBaseField) {
                    const other = (state.fields || []).find(f => f.id !== field.id);
                    if (other) field.calculationDiscountBaseField = other.name || other.id;
                }
            }
            populateBaseFieldOptions(field);
            renderFormulaFieldChips(field);
            updateFormulaLivePreview(field);
            syncChange(f => {
                f.calculationType = val;
                if (field.calculationTaxRate !== undefined) f.calculationTaxRate = field.calculationTaxRate;
                if (field.calculationTaxBaseField) f.calculationTaxBaseField = field.calculationTaxBaseField;
                if (field.calculationDiscountRate !== undefined) f.calculationDiscountRate = field.calculationDiscountRate;
                if (field.calculationDiscountBaseField) f.calculationDiscountBaseField = field.calculationDiscountBaseField;
            }, true, "Change Calculation Type");
        }
    });

    fieldCalcTargetFields?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationFields = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            renderFormulaFieldChips(f);
            updateFormulaLivePreview(f);
        }, false);
    });
    fieldCalcTargetFields?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationFields = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            renderFormulaFieldChips(f);
            updateFormulaLivePreview(f);
        }, true, "Set Calculation Fields");
    });

    calcTaxBaseField?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationTaxBaseField = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Tax Base Field");
    });
    calcTaxRateInput?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationTaxRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, false);
    });
    calcTaxRateInput?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationTaxRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, true, "Set Tax Rate");
    });

    calcDiscountBaseField?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationDiscountBaseField = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Discount Base Field");
    });
    calcDiscountRateInput?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationDiscountRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, false);
    });
    calcDiscountRateInput?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationDiscountRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, true, "Set Discount Rate");
    });

    fieldCalcFormula?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationFormula = e.target.value;
            updateFormulaLivePreview(f);
        }, false);
    });
    fieldCalcFormula?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationFormula = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Calculation Formula");
    });

    // Operator Buttons
    document.querySelectorAll(".calc-op-btn[data-op]").forEach(btn => {
        btn.addEventListener("click", () => {
            const op = btn.dataset.op;
            if (op) insertTokenIntoFormula(op);
        });
    });

    document.getElementById("calcOpBackspace")?.addEventListener("click", () => {
        if (!fieldCalcFormula) return;
        const input = fieldCalcFormula;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (start !== end) {
            input.value = input.value.substring(0, start) + input.value.substring(end);
            input.setSelectionRange(start, start);
        } else if (start > 0) {
            input.value = input.value.substring(0, start - 1) + input.value.substring(start);
            input.setSelectionRange(start - 1, start - 1);
        }
        input.focus();
        syncChange(f => f.calculationFormula = input.value, true, "Backspace Formula");
        updateFormulaLivePreview(getSelectedField());
    });

    document.getElementById("calcOpClear")?.addEventListener("click", () => {
        if (!fieldCalcFormula) return;
        fieldCalcFormula.value = "";
        fieldCalcFormula.focus();
        syncChange(f => f.calculationFormula = "", true, "Clear Formula");
        updateFormulaLivePreview(getSelectedField());
    });

    fieldCalcTargetFields?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationFields = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            renderFormulaFieldChips(f);
            updateFormulaLivePreview(f);
        }, false);
    });
    fieldCalcTargetFields?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationFields = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            renderFormulaFieldChips(f);
            updateFormulaLivePreview(f);
        }, true, "Set Calculation Fields");
    });

    calcTaxBaseField?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationTaxBaseField = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Tax Base Field");
    });
    calcTaxRateInput?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationTaxRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, false);
    });
    calcTaxRateInput?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationTaxRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, true, "Set Tax Rate");
    });

    calcDiscountBaseField?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationDiscountBaseField = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Discount Base Field");
    });
    calcDiscountRateInput?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationDiscountRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, false);
    });
    calcDiscountRateInput?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationDiscountRate = parseFloat(e.target.value) || 0;
            updateFormulaLivePreview(f);
        }, true, "Set Discount Rate");
    });

    fieldCalcFormula?.addEventListener("input", e => {
        syncChange(f => {
            f.calculationFormula = e.target.value;
            updateFormulaLivePreview(f);
        }, false);
    });
    fieldCalcFormula?.addEventListener("change", e => {
        syncChange(f => {
            f.calculationFormula = e.target.value;
            updateFormulaLivePreview(f);
        }, true, "Set Calculation Formula");
    });

    // Operator Buttons
    document.querySelectorAll(".calc-op-btn[data-op]").forEach(btn => {
        btn.addEventListener("click", () => {
            const op = btn.dataset.op;
            if (op) insertTokenIntoFormula(op);
        });
    });

    document.getElementById("calcOpBackspace")?.addEventListener("click", () => {
        if (!fieldCalcFormula) return;
        const input = fieldCalcFormula;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (start !== end) {
            input.value = input.value.substring(0, start) + input.value.substring(end);
            input.setSelectionRange(start, start);
        } else if (start > 0) {
            input.value = input.value.substring(0, start - 1) + input.value.substring(start);
            input.setSelectionRange(start - 1, start - 1);
        }
        input.focus();
        syncChange(f => f.calculationFormula = input.value, true, "Backspace Formula");
        updateFormulaLivePreview(getSelectedField());
    });

    document.getElementById("calcOpClear")?.addEventListener("click", () => {
        if (!fieldCalcFormula) return;
        fieldCalcFormula.value = "";
        fieldCalcFormula.focus();
        syncChange(f => f.calculationFormula = "", true, "Clear Formula");
        updateFormulaLivePreview(getSelectedField());
    });

    // Enable Scrubbing and Scrolling on Number Inputs
    makeScrubbableAndScrollable(posXInput, null, { min: -2000, max: 5000, step: 1 });
    makeScrubbableAndScrollable(posYInput, null, { min: -2000, max: 5000, step: 1 });
    makeScrubbableAndScrollable(widthInput, null, { min: 16, max: 2000, step: 1 });
    makeScrubbableAndScrollable(heightInput, null, { min: 16, max: 1000, step: 1 });
    makeScrubbableAndScrollable(fontSizeInput, null, { min: 6, max: 120, step: 1 });
    makeScrubbableAndScrollable(fieldMaxLength, null, { min: 1, max: 5000, step: 1 });

    // Ensure scrolling the inspector sidebar naturally unfocuses inputs to prevent accidental value mutation
    document.querySelectorAll(".prop-panel-body").forEach(panel => {
        panel.addEventListener("scroll", () => {
            if (document.activeElement && document.activeElement.tagName === "INPUT" && panel.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        }, { passive: true });
    });

    const PRESET_OPTIONS = {
        "yes-no": ["Yes", "No"],
        "titles": ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."],
        "employment": ["Full-Time", "Part-Time", "Contract", "Freelance", "Internship"],
        "priority": ["Low", "Medium", "High", "Critical / Urgent"],
        "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "ratings": ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]
    };

    let selectedDropdownChoiceIndex = null;
    let isDropdownBulkEditMode = false;

    function updateDropdownCount(opts) {
        const countEl = document.getElementById("dropdownOptionsCount");
        if (countEl) {
            const count = opts ? opts.length : 0;
            countEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
        }
    }

    function renderDropdownChoiceList(field) {
        const listEl = document.getElementById("dropdownChoicesList");
        if (!listEl) return;
        const opts = (field && field.options) || [];
        updateDropdownCount(opts);

        if (selectedDropdownChoiceIndex !== null && (selectedDropdownChoiceIndex < 0 || selectedDropdownChoiceIndex >= opts.length)) {
            selectedDropdownChoiceIndex = opts.length > 0 ? Math.max(0, opts.length - 1) : null;
        }

        if (opts.length === 0) {
            listEl.innerHTML = '<div class="dd-choice-empty">No choices added yet. Type above &amp; press Enter.</div>';
        } else {
            listEl.innerHTML = opts.map((opt, idx) => {
                const isSel = idx === selectedDropdownChoiceIndex;
                const isDef = field.defaultValue === opt;
                return `
                    <div class="dd-choice-item ${isSel ? "selected" : ""}" data-idx="${idx}" title="Click to select, double-click to set default">
                        <span class="dd-choice-idx">${idx + 1}</span>
                        <span class="dd-choice-text">${escapeHtml(opt)}</span>
                        ${isDef ? '<span class="dd-choice-default-tag" title="Default Selected Option">Default</span>' : ""}
                        <button type="button" class="dd-choice-del-btn" data-del-idx="${idx}" title="Delete &quot;${escapeHtml(opt)}&quot;" aria-label="Delete option ${escapeHtml(opt)}">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `;
            }).join("");
        }

        const upBtn = document.getElementById("ddMoveUpBtn");
        const downBtn = document.getElementById("ddMoveDownBtn");
        const delBtn = document.getElementById("ddDeleteSelectedBtn");
        if (upBtn) upBtn.disabled = (selectedDropdownChoiceIndex === null || selectedDropdownChoiceIndex <= 0);
        if (downBtn) downBtn.disabled = (selectedDropdownChoiceIndex === null || selectedDropdownChoiceIndex >= opts.length - 1);
        if (delBtn) delBtn.disabled = (selectedDropdownChoiceIndex === null || opts.length === 0);

        if (dropdownOptions) {
            dropdownOptions.value = opts.join("\n");
        }

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function addDropdownChoiceFromInput() {
        const input = document.getElementById("newDropdownItemInput");
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;
        const field = getSelectedField();
        if (!field || field.type !== "dropdown") return;
        if (!field.options) field.options = [];
        field.options.push(val);
        if (!field.defaultValue) {
            field.defaultValue = val;
            setVal("fieldDefaultValue", val);
        }
        selectedDropdownChoiceIndex = field.options.length - 1;
        input.value = "";
        renderDropdownChoiceList(field);
        saveHistory();
        if (onFieldUpdated) onFieldUpdated(field);
    }

    document.getElementById("addDropdownItemBtn")?.addEventListener("click", addDropdownChoiceFromInput);
    document.getElementById("newDropdownItemInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            addDropdownChoiceFromInput();
        }
    });

    document.getElementById("dropdownChoicesList")?.addEventListener("click", e => {
        const delBtn = e.target.closest("[data-del-idx]");
        const field = getSelectedField();
        if (!field || field.type !== "dropdown" || !field.options) return;

        if (delBtn) {
            e.stopPropagation();
            const delIdx = parseInt(delBtn.dataset.delIdx, 10);
            if (!isNaN(delIdx) && delIdx >= 0 && delIdx < field.options.length) {
                const deletedVal = field.options[delIdx];
                field.options.splice(delIdx, 1);
                if (field.defaultValue === deletedVal) {
                    field.defaultValue = field.options[0] || "";
                    setVal("fieldDefaultValue", field.defaultValue);
                }
                if (selectedDropdownChoiceIndex !== null) {
                    if (selectedDropdownChoiceIndex === delIdx) {
                        selectedDropdownChoiceIndex = field.options.length > 0 ? Math.min(delIdx, field.options.length - 1) : null;
                    } else if (selectedDropdownChoiceIndex > delIdx) {
                        selectedDropdownChoiceIndex--;
                    }
                }
                renderDropdownChoiceList(field);
                saveHistory();
                if (onFieldUpdated) onFieldUpdated(field);
            }
            return;
        }

        const item = e.target.closest(".dd-choice-item");
        if (item) {
            const idx = parseInt(item.dataset.idx, 10);
            if (!isNaN(idx)) {
                selectedDropdownChoiceIndex = idx;
                renderDropdownChoiceList(field);
            }
        }
    });

    document.getElementById("dropdownChoicesList")?.addEventListener("dblclick", e => {
        const item = e.target.closest(".dd-choice-item");
        const field = getSelectedField();
        if (!item || !field || field.type !== "dropdown" || !field.options) return;
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx) && field.options[idx]) {
            field.defaultValue = field.options[idx];
            setVal("fieldDefaultValue", field.defaultValue);
            selectedDropdownChoiceIndex = idx;
            renderDropdownChoiceList(field);
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        }
    });

    document.getElementById("ddMoveUpBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field || field.type !== "dropdown" || !field.options) return;
        if (selectedDropdownChoiceIndex !== null && selectedDropdownChoiceIndex > 0) {
            const temp = field.options[selectedDropdownChoiceIndex];
            field.options[selectedDropdownChoiceIndex] = field.options[selectedDropdownChoiceIndex - 1];
            field.options[selectedDropdownChoiceIndex - 1] = temp;
            selectedDropdownChoiceIndex--;
            renderDropdownChoiceList(field);
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        }
    });

    document.getElementById("ddMoveDownBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field || field.type !== "dropdown" || !field.options) return;
        if (selectedDropdownChoiceIndex !== null && selectedDropdownChoiceIndex < field.options.length - 1) {
            const temp = field.options[selectedDropdownChoiceIndex];
            field.options[selectedDropdownChoiceIndex] = field.options[selectedDropdownChoiceIndex + 1];
            field.options[selectedDropdownChoiceIndex + 1] = temp;
            selectedDropdownChoiceIndex++;
            renderDropdownChoiceList(field);
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        }
    });

    document.getElementById("ddDeleteSelectedBtn")?.addEventListener("click", () => {
        const field = getSelectedField();
        if (!field || field.type !== "dropdown" || !field.options) return;
        if (selectedDropdownChoiceIndex !== null && selectedDropdownChoiceIndex >= 0 && selectedDropdownChoiceIndex < field.options.length) {
            const deletedVal = field.options[selectedDropdownChoiceIndex];
            field.options.splice(selectedDropdownChoiceIndex, 1);
            if (field.defaultValue === deletedVal) {
                field.defaultValue = field.options[0] || "";
                setVal("fieldDefaultValue", field.defaultValue);
            }
            selectedDropdownChoiceIndex = field.options.length > 0 ? Math.min(selectedDropdownChoiceIndex, field.options.length - 1) : null;
            renderDropdownChoiceList(field);
            saveHistory();
            if (onFieldUpdated) onFieldUpdated(field);
        }
    });

    document.getElementById("toggleDropdownViewModeBtn")?.addEventListener("click", () => {
        isDropdownBulkEditMode = !isDropdownBulkEditMode;
        const choicesContainer = document.getElementById("dropdownChoicesContainer");
        const addRow = document.getElementById("dropdownAddRow");
        const bulkContainer = document.getElementById("dropdownBulkEditContainer");
        const toggleBtn = document.getElementById("toggleDropdownViewModeBtn");

        if (choicesContainer) choicesContainer.style.display = isDropdownBulkEditMode ? "none" : "flex";
        if (addRow) addRow.style.display = isDropdownBulkEditMode ? "none" : "flex";
        if (bulkContainer) bulkContainer.style.display = isDropdownBulkEditMode ? "block" : "none";
        if (toggleBtn) {
            toggleBtn.classList.toggle("active", isDropdownBulkEditMode);
            toggleBtn.title = isDropdownBulkEditMode ? "Switch to interactive choice list" : "Switch to bulk text editor";
        }

        const field = getSelectedField();
        if (field && field.type === "dropdown") {
            if (!isDropdownBulkEditMode && dropdownOptions) {
                field.options = dropdownOptions.value.split("\n").map(s => s.trim()).filter(Boolean);
                renderDropdownChoiceList(field);
            }
        }
    });

    dropdownOptions?.addEventListener("input", e => {
        syncChange(f => {
            f.options = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
            updateDropdownCount(f.options);
            if (!isDropdownBulkEditMode) {
                renderDropdownChoiceList(f);
            }
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
            selectedDropdownChoiceIndex = 0;
            renderDropdownChoiceList(field);
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

    // Delete single field with poof animation
    document.getElementById("deleteFieldBtn")?.addEventListener("click", async () => {
        const field = getSelectedField();
        if (!field) return;
        const overlay = document.querySelector(`.field-overlay[data-id="${field.id}"]`);
        if (overlay) overlay.classList.add("field-deleting");
        await new Promise(res => setTimeout(res, 120));
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

// Lightweight width/height-only sync, used during live drag/resize on the
// canvas (fires at mousemove frequency). Unlike populateProperties(), this
// touches only the two inputs that can actually change mid-drag/resize —
// position (x/y) isn't shown in this panel at all, and everything else
// (badges, signature buttons, typography, dropdown options, checkboxes)
// is unaffected by moving or resizing a field, so re-syncing it on every
// mousemove was pure wasted reflow.
export function syncDimensionInputsLive(field) {
    if (!field) return;
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    if (widthInput && document.activeElement !== widthInput) widthInput.value = field.width || "";
    if (heightInput && document.activeElement !== heightInput) heightInput.value = field.height || "";
}

export function populateProperties(field) {
    const emptyPanel = document.getElementById("rightPanelEmpty");
    const singleProps = document.getElementById("fieldProps");
    const multiProps = document.getElementById("multiSelectProps");
    const countBadge = document.getElementById("multiSelectedCountBadge");
    const fallbackField = field || (state.selectedFieldIds.size === 0 ? getSelectedField() : null);

    if (state.selectedFieldIds.size > 1) {
        if (emptyPanel) emptyPanel.style.display = "none";
        if (singleProps) singleProps.style.display = "none";
        if (multiProps) {
            multiProps.style.display = "flex";
            if (countBadge) countBadge.textContent = `${state.selectedFieldIds.size} Selected`;
            
            const selectedFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
            const multiReq = document.getElementById("multiFieldRequired");
            if (multiReq) {
                multiReq.checked = selectedFields.length > 0 && selectedFields.every(f => f.required);
            }

            const multiReadOnly = document.getElementById("multiFieldReadOnly");
            if (multiReadOnly) {
                multiReadOnly.checked = selectedFields.length > 0 && selectedFields.every(f => f.readOnly);
            }

            // Sync text alignment
            const alignInput = document.getElementById("multiTextAlignment");
            if (alignInput && document.activeElement !== alignInput) {
                const commonAlign = selectedFields[0]?.textAlignment;
                const allSameAlign = selectedFields.every(f => f.textAlignment === commonAlign);
                alignInput.value = (allSameAlign && commonAlign) ? commonAlign : "";
                alignInput.classList.toggle("is-mixed", !allSameAlign || !commonAlign);
            }

            // Sync font family input if not actively focused
            const ffInput = document.getElementById("multiFontFamily");
            if (ffInput && document.activeElement !== ffInput) {
                const commonFam = selectedFields[0]?.fontFamily;
                const allSameFam = selectedFields.every(f => f.fontFamily === commonFam);
                ffInput.value = (allSameFam && commonFam) ? commonFam : "";
                ffInput.classList.toggle("is-mixed", !allSameFam || !commonFam);
            }

            // Sync font size input if not actively focused by user
            const fsInput = document.getElementById("multiFontSize");
            if (fsInput && document.activeElement !== fsInput) {
                const firstSize = selectedFields[0]?.fontSize;
                const allHaveSameExplicitSize = selectedFields.every(f => f.fontSize === firstSize);
                if (allHaveSameExplicitSize && firstSize) {
                    fsInput.value = firstSize;
                    fsInput.classList.remove("is-mixed");
                    updateQuickSizeButtons(firstSize, "multi-quick-size-btn");
                } else {
                    fsInput.value = "";
                    fsInput.classList.add("is-mixed");
                    updateQuickSizeButtons(null, "multi-quick-size-btn");
                }
            }

            // Sync width and height inputs if not actively focused
            const wInput = document.getElementById("multiFieldWidth");
            if (wInput && document.activeElement !== wInput) {
                const firstW = selectedFields[0]?.width;
                const allSameW = selectedFields.every(f => f.width === firstW);
                if (allSameW && firstW) {
                    wInput.value = firstW;
                    wInput.classList.remove("is-mixed");
                } else {
                    wInput.value = "";
                    wInput.classList.add("is-mixed");
                }
            }

            const hInput = document.getElementById("multiFieldHeight");
            if (hInput && document.activeElement !== hInput) {
                const firstH = selectedFields[0]?.height;
                const allSameH = selectedFields.every(f => f.height === firstH);
                if (allSameH && firstH) {
                    hInput.value = firstH;
                    hInput.classList.remove("is-mixed");
                } else {
                    hInput.value = "";
                    hInput.classList.add("is-mixed");
                }
            }

            // Sync default value input if not actively focused
            const defInput = document.getElementById("multiDefaultValue");
            if (defInput && document.activeElement !== defInput) {
                const commonVal = selectedFields[0]?.defaultValue;
                const allSameVal = selectedFields.every(f => f.defaultValue === commonVal);
                if (allSameVal && commonVal) {
                    defInput.value = commonVal;
                    defInput.classList.remove("is-mixed");
                } else {
                    defInput.value = "";
                    defInput.classList.toggle("is-mixed", selectedFields.some(f => f.defaultValue));
                }
            }

            // Sync border select
            const borderInput = document.getElementById("multiBorderStyle");
            if (borderInput && document.activeElement !== borderInput) {
                const commonBorder = selectedFields[0]?.borderStyle;
                const allSameBorder = selectedFields.every(f => f.borderStyle === commonBorder);
                borderInput.value = (allSameBorder && commonBorder) ? commonBorder : "";
                borderInput.classList.toggle("is-mixed", !allSameBorder || !commonBorder);
            }

            // Sync fill select
            const fillInput = document.getElementById("multiFillStyle");
            if (fillInput && document.activeElement !== fillInput) {
                const commonFill = selectedFields[0]?.fillStyle;
                const allSameFill = selectedFields.every(f => f.fillStyle === commonFill);
                fillInput.value = (allSameFill && commonFill) ? commonFill : "";
                fillInput.classList.toggle("is-mixed", !allSameFill || !commonFill);
            }

            // Sync Checkbox specific options if selection contains checkboxes
            const multiCheckboxGroup = document.getElementById("multiCheckboxGroup");
            const checkboxFields = selectedFields.filter(f => f.type === "checkBox");
            if (multiCheckboxGroup) {
                multiCheckboxGroup.style.display = checkboxFields.length > 0 ? "flex" : "none";
                if (checkboxFields.length > 0) {
                    const markInput = document.getElementById("multiCheckboxMark");
                    if (markInput && document.activeElement !== markInput) {
                        const firstMark = checkboxFields[0]?.checkboxMark || "check";
                        const allSameMark = checkboxFields.every(f => (f.checkboxMark || "check") === firstMark);
                        markInput.value = allSameMark ? firstMark : "";
                        markInput.classList.toggle("is-mixed", !allSameMark);
                    }

                    const multiDefChecked = document.getElementById("multiFieldDefaultChecked");
                    if (multiDefChecked) {
                        const allChecked = checkboxFields.every(f => !!f.defaultChecked);
                        const allUnchecked = checkboxFields.every(f => !f.defaultChecked);
                        multiDefChecked.checked = allChecked;
                        multiDefChecked.indeterminate = (!allChecked && !allUnchecked);
                    }
                }
            }
        }
        if (typeof lucide !== "undefined") lucide.createIcons();
        return;
    }

    if (!fallbackField) {
        if (emptyPanel) emptyPanel.style.display = "flex";
        if (singleProps) singleProps.style.display = "none";
        if (multiProps) multiProps.style.display = "none";

        const clearText = id => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.value = "";
        };
        const clearChecked = id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        };

        [
            "fieldType", "fieldName", "fieldDefaultValue", "fieldFontFamily", "fontSize",
            "textAlignment", "fieldTooltip", "autofillType", "fieldAutofill",
            "fieldBorderStyle", "borderStyleSelect", "fieldFillStyle", "fillStyleSelect",
            "posX", "posY", "width", "height", "dropdownOptions"
        ].forEach(clearText);

        [
            "fieldRequired", "fieldReadOnly", "fieldMultiline", "fieldDefaultChecked"
        ].forEach(clearChecked);

        document.querySelectorAll(".quick-size-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".multi-quick-size-btn").forEach(btn => btn.classList.remove("active"));
        return;
    }

    if (emptyPanel) emptyPanel.style.display = "none";
    if (multiProps) multiProps.style.display = "none";
    if (singleProps) singleProps.style.display = "flex";

    const badge = document.getElementById("propFieldTypeBadge");
    if (badge) {
        const fieldDisplayName = (fallbackField.name && fallbackField.name.trim())
            ? fallbackField.name.trim()
            : (fallbackField.autofill || fallbackField.id || "Field");
        badge.textContent = fieldDisplayName;
        badge.title = fallbackField.name || fieldDisplayName;
    }

    const detBadge = document.getElementById("inspectorDetectionBadge");
    if (detBadge) {
        const src = fallbackField.detectedBy || "";
        const conf = fallbackField.confidence ? Math.round(fallbackField.confidence * 100) + "%" : "";
        if (src.includes("neural") || src.includes("ffdnet")) {
            detBadge.textContent = `⚡ FFDNet (${conf})`;
            detBadge.style.backgroundColor = "#e0e7ff";
            detBadge.style.color = "#3730a3";
            detBadge.style.display = "inline-flex";
        } else if (src.includes("vector")) {
            detBadge.textContent = `📐 Vector (${conf || "98%"})`;
            detBadge.style.backgroundColor = "#dcfce7";
            detBadge.style.color = "#166534";
            detBadge.style.display = "inline-flex";
        } else if (src.includes("scanned") || src.includes("ocr")) {
            detBadge.textContent = `🔍 OCR (${conf || "85%"})`;
            detBadge.style.backgroundColor = "#fef3c7";
            detBadge.style.color = "#92400e";
            detBadge.style.display = "inline-flex";
        } else {
            detBadge.style.display = "none";
        }
    }

    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if (el && document.activeElement !== el) el.value = val || ""; 
    };
    const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    setVal("fieldType", fallbackField.type);
    setVal("fieldName", fallbackField.name || "");
    setVal("fieldDefaultValue", fallbackField.defaultValue || (fallbackField.type === "staticText" || fallbackField.type === "label" ? fallbackField.label : "") || "");
    setVal("fieldFontFamily", fallbackField.fontFamily || "helvetica");
    setVal("fontSize", fallbackField.fontSize || "");
    
    const activeSize = (fallbackField.fontSize && fallbackField.fontSize >= 6) ? fallbackField.fontSize : 11;
    updateQuickSizeButtons(activeSize, "quick-size-btn");

    setVal("textAlignment", fallbackField.textAlignment || "left");
    setVal("fieldTooltip", fallbackField.tooltip || "");
    setVal("autofillType", fallbackField.autofill || "");
    setVal("fieldAutofill", fallbackField.autofill || "");
    setVal("fieldBorderStyle", fallbackField.borderStyle || "solid");
    setVal("borderStyleSelect", fallbackField.borderStyle || "solid");
    setVal("fieldFillStyle", fallbackField.fillStyle || "white");
    setVal("fillStyleSelect", fallbackField.fillStyle || "white");
    setVal("posX", Math.round(fallbackField.x ?? 0));
    setVal("posY", Math.round(fallbackField.y ?? 0));
    setVal("width", fallbackField.width || "");
    setVal("height", fallbackField.height || "");
    setChecked("fieldRequired", fallbackField.required);
    setChecked("fieldReadOnly", fallbackField.readOnly);
    setChecked("fieldMultiline", fallbackField.multiline);
    setChecked("fieldIsComb", fallbackField.isComb);
    setVal("fieldMaxLength", fallbackField.maxLength || "");
    setChecked("fieldDefaultChecked", fallbackField.defaultChecked);
    setVal("fieldCheckboxMark", fallbackField.checkboxMark || "check");

    // Calculation properties
    setVal("fieldCalcType", fallbackField.calculationType || "none");
    setVal("fieldCalcTargetFields", Array.isArray(fallbackField.calculationFields) ? fallbackField.calculationFields.join(", ") : (fallbackField.calculationFields || ""));
    setVal("fieldCalcFormula", fallbackField.calculationFormula || "");
    setVal("calcTaxRateInput", fallbackField.calculationTaxRate !== undefined ? fallbackField.calculationTaxRate : 10);
    setVal("calcDiscountRateInput", fallbackField.calculationDiscountRate !== undefined ? fallbackField.calculationDiscountRate : 10);

    // Calculation drawer and groups visibility
    const accCalculation = document.getElementById("accCalculation");
    const calcFieldsGroup = document.getElementById("calcFieldsGroup");
    const calcTaxGroup = document.getElementById("calcTaxGroup");
    const calcDiscountGroup = document.getElementById("calcDiscountGroup");
    const calcFormulaGroup = document.getElementById("calcFormulaGroup");
    const calcOperatorsGroup = document.getElementById("calcOperatorsGroup");
    const calcFieldChipsGroup = document.getElementById("calcFieldChipsGroup");
    const calcPreviewCard = document.getElementById("calcPreviewCard");
    const calcType = fallbackField.calculationType || "none";

    if (accCalculation) {
        accCalculation.style.display = (fallbackField.type === "textField" || fallbackField.type === "number") ? "block" : "none";
    }
    if (calcFieldsGroup) {
        calcFieldsGroup.style.display = (calcType === "sum" || calcType === "prod") ? "block" : "none";
    }
    if (calcTaxGroup) {
        calcTaxGroup.style.display = (calcType === "tax") ? "flex" : "none";
    }
    if (calcDiscountGroup) {
        calcDiscountGroup.style.display = (calcType === "discount") ? "flex" : "none";
    }
    if (calcFormulaGroup) {
        calcFormulaGroup.style.display = (calcType === "custom") ? "block" : "none";
    }
    if (calcOperatorsGroup) {
        calcOperatorsGroup.style.display = (calcType === "custom") ? "flex" : "none";
    }
    if (calcFieldChipsGroup) {
        calcFieldChipsGroup.style.display = (calcType !== "none") ? "flex" : "none";
    }
    if (calcPreviewCard) {
        calcPreviewCard.style.display = (calcType !== "none") ? "flex" : "none";
    }

    // Populate base field selectors, dynamic chips, and live preview
    populateBaseFieldOptions(fallbackField);
    renderFormulaFieldChips(fallbackField);
    updateFormulaLivePreview(fallbackField);

    // Signature controls visibility
    const sigGroup = document.getElementById("signatureActionsGroup");
    const propClearSig = document.getElementById("propClearSignatureBtn");
    const propOpenSigSpan = document.querySelector("#propOpenSignatureBtn span");
    if (sigGroup) {
        sigGroup.style.display = fallbackField.type === "signature" ? "block" : "none";
        if (fallbackField.type === "signature") {
            if (propClearSig) propClearSig.style.display = fallbackField.signatureImage ? "block" : "none";
            if (propOpenSigSpan) propOpenSigSpan.textContent = fallbackField.signatureImage ? "Redraw / Retype Signature" : "Pre-sign Document";
        }
    }

    // Typography accordion visibility
    const accTypography = document.getElementById("accTypography");
    if (accTypography) {
        accTypography.style.display = (fallbackField.type === "textField" || fallbackField.type === "dropdown" || fallbackField.type === "dateField" || fallbackField.type === "staticText" || fallbackField.type === "label") ? "block" : "none";
    }

    const defValLabel = document.querySelector('label[for="fieldDefaultValue"]');
    if (defValLabel) {
        defValLabel.textContent = (fallbackField.type === "staticText" || fallbackField.type === "label") ? "Text Content" : "Default Value";
    }

    const multilineGroup = document.getElementById("multilineGroup");
    if (multilineGroup) {
        multilineGroup.style.display = (fallbackField.type === "textField") ? "flex" : "none";
    }

    const combGroup = document.getElementById("combGroup");
    if (combGroup) {
        combGroup.style.display = (fallbackField.type === "textField" || fallbackField.type === "dateField" || fallbackField.type === "number") ? "flex" : "none";
    }

    const ddGroup = document.getElementById("dropdownOptionsGroup");
    if (ddGroup) {
        ddGroup.style.display = fallbackField.type === "dropdown" ? "block" : "none";
        if (fallbackField.type === "dropdown") {
            renderDropdownChoiceList(fallbackField);
        }
    }

    const checkGroup = document.getElementById("defaultCheckedGroup");
    if (checkGroup) {
        checkGroup.style.display = (fallbackField.type === "checkBox" || fallbackField.type === "radioGroup") ? "flex" : "none";
    }
    const checkboxMarkGroup = document.getElementById("checkboxMarkGroup");
    if (checkboxMarkGroup) {
        checkboxMarkGroup.style.display = fallbackField.type === "checkBox" ? "flex" : "none";
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function initMultiSelectTools(onUpdated) {
    const getSelected = () => state.fields.filter(f => state.selectedFieldIds.has(f.id));
    const batchUpdate = (mutator, immediate = false) => {
        const sel = getSelected();
        if (sel.length === 0) return;
        sel.forEach(mutator);
        saveHistory(immediate);
        if (onUpdated) onUpdated();
    };

    // ── Batch Field Type Conversion ──────────────────────────────────
    const convertBatchType = (newType) => {
        if (!newType) return;
        const sel = getSelected();
        if (sel.length === 0) return;

        sel.forEach(f => {
            f.type = newType;
            if (newType === "signature") {
                f.height = Math.max(f.height, 44);
                f.width = Math.max(f.width, 140);
            } else if (newType === "checkBox" || newType === "radioGroup") {
                f.width = 16;
                f.height = 16;
            } else if (newType === "dateField") {
                if (!f.defaultValue) f.defaultValue = "YYYY-MM-DD";
                f.height = Math.max(f.height, 22);
            } else if (newType === "textField") {
                f.height = Math.max(f.height, 22);
                if (f.defaultValue === "YYYY-MM-DD") f.defaultValue = "";
            } else if (newType === "staticText") {
                if (!f.defaultValue) f.defaultValue = "Heading / Label";
                if (!f.fontSize) f.fontSize = 16;
                f.height = Math.max(f.height, 28);
            } else if (newType === "dropdown") {
                if (!f.options || f.options.length === 0) {
                    f.options = ["Option 1", "Option 2", "Option 3"];
                }
            }
        });

        saveHistory(true);
        if (onUpdated) onUpdated();
    };

    const multiTypeSelect = document.getElementById("multiFieldType");
    if (multiTypeSelect) {
        multiTypeSelect.addEventListener("change", e => {
            convertBatchType(e.target.value);
            e.target.value = "";
        });
    }

    document.querySelectorAll(".multi-type-quick-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetType = btn.dataset.type;
            if (targetType) convertBatchType(targetType);
        });
    });

    // ── Field Dimensions & Sizing (Batch Sizing) ─────────────────────
    const multiWInput = document.getElementById("multiFieldWidth");
    if (multiWInput) {
        multiWInput.addEventListener("input", e => {
            multiWInput.classList.remove("is-mixed");
            const raw = e.target.value.trim();
            const val = raw === "" ? null : parseInt(raw);
            if (val !== null && val >= 16 && val <= 2000) {
                batchUpdate(f => f.width = val, false);
            }
        });
        multiWInput.addEventListener("change", e => {
            const raw = e.target.value.trim();
            const val = raw === "" ? null : parseInt(raw);
            if (val !== null && val >= 16 && val <= 2000) {
                batchUpdate(f => f.width = val, true);
            }
        });
        makeScrubbableAndScrollable(multiWInput, null, { min: 16, max: 2000, step: 2 });
    }

    const multiHInput = document.getElementById("multiFieldHeight");
    if (multiHInput) {
        multiHInput.addEventListener("input", e => {
            multiHInput.classList.remove("is-mixed");
            const raw = e.target.value.trim();
            const val = raw === "" ? null : parseInt(raw);
            if (val !== null && val >= 16 && val <= 1000) {
                batchUpdate(f => f.height = val, false);
            }
        });
        multiHInput.addEventListener("change", e => {
            const raw = e.target.value.trim();
            const val = raw === "" ? null : parseInt(raw);
            if (val !== null && val >= 16 && val <= 1000) {
                batchUpdate(f => f.height = val, true);
            }
        });
        makeScrubbableAndScrollable(multiHInput, null, { min: 16, max: 1000, step: 1 });
    }

    // Match Width (Equalize Width)
    document.getElementById("multiMatchWidthBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const primary = (state.lastSelectedFieldId && sel.find(f => f.id === state.lastSelectedFieldId)) || sel[0];
        if (!primary) return;
        const targetW = primary.width;
        if (multiWInput) {
            multiWInput.value = targetW;
            multiWInput.classList.remove("is-mixed");
        }
        batchUpdate(f => f.width = targetW);
    });

    // Match Height (Equalize Height)
    document.getElementById("multiMatchHeightBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const primary = (state.lastSelectedFieldId && sel.find(f => f.id === state.lastSelectedFieldId)) || sel[0];
        if (!primary) return;
        const targetH = primary.height;
        if (multiHInput) {
            multiHInput.value = targetH;
            multiHInput.classList.remove("is-mixed");
        }
        batchUpdate(f => f.height = targetH);
    });

    // Match Both (Equalize Width & Height)
    document.getElementById("multiMatchBothBtn")?.addEventListener("click", () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const primary = (state.lastSelectedFieldId && sel.find(f => f.id === state.lastSelectedFieldId)) || sel[0];
        if (!primary) return;
        const targetW = primary.width;
        const targetH = primary.height;
        if (multiWInput) {
            multiWInput.value = targetW;
            multiWInput.classList.remove("is-mixed");
        }
        if (multiHInput) {
            multiHInput.value = targetH;
            multiHInput.classList.remove("is-mixed");
        }
        batchUpdate(f => {
            f.width = targetW;
            f.height = targetH;
        });
    });

    // Preset Height Buttons
    document.querySelectorAll(".multi-quick-height-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const h = parseInt(btn.dataset.height);
            if (multiHInput) multiHInput.value = h;
            batchUpdate(f => f.height = h);
        });
    });

    // ── Batch Border & Fill Style Dropdowns ───────────────────────────
    const multiBorderInput = document.getElementById("multiBorderStyle");
    multiBorderInput?.addEventListener("change", e => {
        multiBorderInput.classList.remove("is-mixed");
        const val = e.target.value;
        if (val) {
            batchUpdate(f => f.borderStyle = val, true);
        }
    });

    const multiFillInput = document.getElementById("multiFillStyle");
    multiFillInput?.addEventListener("change", e => {
        multiFillInput.classList.remove("is-mixed");
        const val = e.target.value;
        if (val) {
            batchUpdate(f => f.fillStyle = val, true);
        }
    });

    // ── Batch Text, Typography & Alignment ───────────────────────────
    document.getElementById("multiDefaultValue")?.addEventListener("input", e => {
        e.target.classList.remove("is-mixed");
        const val = e.target.value;
        batchUpdate(f => {
            f.defaultValue = val;
            if (f.type === "staticText" || f.type === "label") {
                f.label = val;
            }
        });
    });

    document.getElementById("multiFontFamily")?.addEventListener("change", e => {
        e.target.classList.remove("is-mixed");
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
        e.target.classList.remove("is-mixed");
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
            if (fsInput) {
                fsInput.value = size;
                fsInput.classList.remove("is-mixed");
            }
            updateQuickSizeButtons(size, "multi-quick-size-btn");
            batchUpdate(f => {
                if (f.type === "textField" || f.type === "dropdown") {
                    f.fontSize = size;
                }
            });
        });
    });

    document.getElementById("multiTextAlignment")?.addEventListener("change", e => {
        e.target.classList.remove("is-mixed");
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

    // ── Batch Read-Only Toggle ───────────────────────────────────────
    document.getElementById("multiFieldReadOnly")?.addEventListener("change", e => {
        const ro = e.target.checked;
        batchUpdate(f => f.readOnly = ro);
    });

    // ── Batch Checkbox Options (Mark Style & Checked State) ──────────
    const multiMarkSelect = document.getElementById("multiCheckboxMark");
    multiMarkSelect?.addEventListener("change", e => {
        multiMarkSelect.classList.remove("is-mixed");
        const val = e.target.value;
        if (val) {
            batchUpdate(f => {
                if (f.type === "checkBox") f.checkboxMark = val;
            }, true);
        }
    });

    document.querySelectorAll(".multi-mark-quick-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mark = btn.dataset.mark;
            if (mark) {
                if (multiMarkSelect) {
                    multiMarkSelect.value = mark;
                    multiMarkSelect.classList.remove("is-mixed");
                }
                batchUpdate(f => {
                    if (f.type === "checkBox") f.checkboxMark = mark;
                }, true);
            }
        });
    });

    document.getElementById("multiFieldDefaultChecked")?.addEventListener("change", e => {
        const chk = e.target.checked;
        batchUpdate(f => {
            if (f.type === "checkBox" || f.type === "radioGroup") f.defaultChecked = chk;
        }, true);
    });

    // ── Alignment Tools ──────────────────────────────────────────────
    document.getElementById("alignLeftBtn")?.addEventListener("click", () => alignSelectedFields("left", onUpdated));
    document.getElementById("alignCenterBtn")?.addEventListener("click", () => alignSelectedFields("center", onUpdated));
    document.getElementById("alignRightBtn")?.addEventListener("click", () => alignSelectedFields("right", onUpdated));
    document.getElementById("alignTopBtn")?.addEventListener("click", () => alignSelectedFields("top", onUpdated));
    document.getElementById("alignMiddleBtn")?.addEventListener("click", () => alignSelectedFields("middle", onUpdated));
    document.getElementById("alignBottomBtn")?.addEventListener("click", () => alignSelectedFields("bottom", onUpdated));

    // ── Spacing Distribution Tools (Even Spacing) ────────────────────
    document.getElementById("distributeVerticalBtn")?.addEventListener("click", () => distributeSelectedFields("vertical", onUpdated));
    document.getElementById("distributeHorizontalBtn")?.addEventListener("click", () => distributeSelectedFields("horizontal", onUpdated));

    // ── Duplicate All Selected ───────────────────────────────────────
    document.getElementById("multiDuplicateBtn")?.addEventListener("click", () => {
        const dups = duplicateSelectedFields();
        if (dups.length > 0) {
            saveHistory();
            if (onUpdated) onUpdated();
        }
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
        state.selectedFieldId = null;
        saveHistory();
        if (onUpdated) onUpdated();
    });
}

export function alignSelectedFields(direction, onUpdated) {
    const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
    if (sel.length < 2) return;
    if (direction === "left") {
        const minX = Math.min(...sel.map(f => f.x));
        sel.forEach(f => f.x = minX);
    } else if (direction === "center") {
        const avgCenter = sel.reduce((sum, f) => sum + (f.x + f.width / 2), 0) / sel.length;
        sel.forEach(f => f.x = Math.round(avgCenter - f.width / 2));
    } else if (direction === "right") {
        const maxRight = Math.max(...sel.map(f => f.x + f.width));
        sel.forEach(f => f.x = maxRight - f.width);
    } else if (direction === "top") {
        const minY = Math.min(...sel.map(f => f.y));
        sel.forEach(f => f.y = minY);
    } else if (direction === "middle") {
        const avgMiddle = sel.reduce((sum, f) => sum + (f.y + f.height / 2), 0) / sel.length;
        sel.forEach(f => f.y = Math.round(avgMiddle - f.height / 2));
    } else if (direction === "bottom") {
        const maxBottom = Math.max(...sel.map(f => f.y + f.height));
        sel.forEach(f => f.y = maxBottom - f.height);
    }
    saveHistory();
    if (onUpdated) onUpdated();
}

export function distributeSelectedFields(axis, onUpdated) {
    const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
    if (sel.length < 3) return;
    if (axis === "vertical") {
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
    } else if (axis === "horizontal") {
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
    }
    saveHistory();
    if (onUpdated) onUpdated();
}
