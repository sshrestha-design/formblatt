// ── Central Application State (js/state.js) ─────────────────────

export const state = {
    // Document
    pdfDoc: null,
    originalPdfBytes: null,
    currentPageNum: 1,
    totalPages: 1,
    fileName: "interactive_form.pdf",
    docCategory: "General Form",
    pdfHash: "",

    // Viewport & Zoom
    currentScale: 1.0,
    currentTransformScale: 1.0,
    panOffset: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },

    // Fields & Selection
    fields: [],
    groups: [],
    groupCounter: 1,
    selectedFieldIds: new Set(),
    lastSelectedFieldId: null,
    fieldCounter: 1,
    activeTool: "select",
    editorMode: "design", // "design" | "fill"
    clipboard: [],
    formulaClipboard: null,

    // History (Undo / Redo)
    history: [],
    historyIndex: -1,

    // Drag / Resize / Marquee State
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    initialFieldPositions: new Map(),
    isDuplicating: false,
    hasClonedDuringDrag: false,

    isResizing: false,
    resizeFieldId: null,
    resizeStartPos: { x: 0, y: 0 },
    resizeStartDim: { width: 0, height: 0 },

    isLassoing: false,
    isLassoAdditive: false,
    initialLassoSelectedIds: null,
    lassoStart: { x: 0, y: 0 },

    // Preview
    currentPreviewUrl: null,

    // Smart Alignment & Snapping Guides
    guidesEnabled: localStorage.getItem("justforms_guides_enabled") !== "false"
};

export function getSelectedField() {
    if (state.selectedFieldIds.size === 1) {
        const id = Array.from(state.selectedFieldIds)[0];
        return state.fields.find(f => f.id === id) || null;
    }

    if (state.selectedFieldIds.size === 0) {
        const fallbackField = state.fields.find(f => f.id === state.lastSelectedFieldId)
            || state.fields.find(f => (f.page || 1) === state.currentPageNum)
            || state.fields[0]
            || null;
        if (fallbackField && state.lastSelectedFieldId === null) {
            state.lastSelectedFieldId = fallbackField.id;
        }
        return fallbackField;
    }

    return null;
}

export function setSelectedField(fieldOrId) {
    state.selectedFieldIds.clear();
    if (fieldOrId) {
        const id = typeof fieldOrId === "object" ? fieldOrId.id : fieldOrId;
        state.selectedFieldIds.add(id);
        state.lastSelectedFieldId = id;
    }
}

export function getFieldsForCurrentPage() {
    return state.fields.filter(f => (f.page || 1) === state.currentPageNum);
}

export function createGroupForSelected(customName) {
    const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
    if (sel.length === 0) return null;

    const groupId = "grp_" + Date.now();
    const groupName = customName || ("Group " + (state.groupCounter++));
    const group = {
        id: groupId,
        name: groupName,
        collapsed: false,
        page: state.currentPageNum
    };

    if (!state.groups) state.groups = [];
    state.groups.push(group);

    sel.forEach(f => f.groupId = groupId);
    return group;
}

export function ungroupSelected() {
    const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
    if (sel.length === 0) return;

    sel.forEach(f => delete f.groupId);
    cleanupEmptyGroups();
}

export function ungroupGroup(groupId) {
    state.fields.forEach(f => {
        if (f.groupId === groupId) delete f.groupId;
    });
    if (state.groups) {
        state.groups = state.groups.filter(g => g.id !== groupId);
    }
}

export function toggleGroupCollapsed(groupId) {
    if (!state.groups) return;
    const g = state.groups.find(grp => grp.id === groupId);
    if (g) g.collapsed = !g.collapsed;
}

export function selectGroup(groupId) {
    state.selectedFieldIds.clear();
    state.fields.forEach(f => {
        if (f.groupId === groupId) {
            state.selectedFieldIds.add(f.id);
        }
    });
}

export function deleteGroupAndFields(groupId) {
    state.fields = state.fields.filter(f => f.groupId !== groupId);
    if (state.groups) {
        state.groups = state.groups.filter(g => g.id !== groupId);
    }
    state.selectedFieldIds.clear();
}

export function cleanupEmptyGroups() {
    if (!state.groups) return;
    const activeGroupIds = new Set(state.fields.map(f => f.groupId).filter(Boolean));
    state.groups = state.groups.filter(g => activeGroupIds.has(g.id));
}

let idCounter = 1;
export function generateFieldId(prefix = "fld") {
    idCounter++;
    return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).substring(2, 8)}`;
}

export function copySelectedFields() {
    const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
    if (sel.length === 0) return;
    state.clipboard = JSON.parse(JSON.stringify(sel));
}

/**
 * Resolves the effective group identifier for a radio button.
 * Radios sharing the same group name form a single mutually exclusive choice set.
 */
export function getRadioGroupName(field) {
    if (!field) return "radio_group_1";
    return (field.radioGroup || field.name || "").trim() || "radio_group_1";
}

/**
 * Returns all fields in the document that belong to the same radio group as the target field.
 */
export function getRadioGroupFields(field, allFields = state.fields) {
    if (!field || (field.type !== "radioGroup" && field.type !== "radio")) return [];
    const groupName = getRadioGroupName(field);
    return allFields.filter(f => (f.type === "radioGroup" || f.type === "radio") && getRadioGroupName(f) === groupName);
}

/**
 * Selects a specific radio button choice.
 * In single mode (default): deselects all other choices in the SAME radio group.
 * In multi mode: just toggles the clicked choice independently.
 * Strictly preserves the selection state of all OTHER radio groups.
 */
export function selectRadioOption(field, allFields = state.fields) {
    if (!field || (field.type !== "radioGroup" && field.type !== "radio")) return;
    const groupName = getRadioGroupName(field);
    if (!field.radioGroup) field.radioGroup = groupName;
    if (!field.name) field.name = groupName;

    const groupFields = allFields.filter(f => (f.type === "radioGroup" || f.type === "radio") && getRadioGroupName(f) === groupName);

    // Check if this group is in multi-select mode
    const isMulti = groupFields.some(f => f.radioGroupMulti === true);

    if (isMulti) {
        // Multi mode: just toggle this one field
        field.defaultChecked = !field.defaultChecked;
        field.checked = field.defaultChecked;
    } else {
        // Single mode: exclusive — deselect all siblings, select only clicked
        groupFields.forEach(f => {
            const isTarget = (f.id === field.id);
            f.defaultChecked = isTarget;
            f.checked = isTarget;
            if (isTarget) {
                f.value = f.exportValue || f.radioValue || f.value || "Yes";
            }
        });
    }
}

/**
 * Sets the selection mode for an entire radio group.
 * mode: "single" (default, exclusive) or "multi" (allow multiple).
 */
export function setRadioGroupMode(field, mode, allFields = state.fields) {
    if (!field) return;
    const groupName = getRadioGroupName(field);
    const isMulti = (mode === "multi");
    allFields
        .filter(f => (f.type === "radioGroup" || f.type === "radio") && getRadioGroupName(f) === groupName)
        .forEach(f => { f.radioGroupMulti = isMulti; });
}

export function pasteClipboardFields() {
    if (!state.clipboard || state.clipboard.length === 0) return [];
    const newIds = [];
    state.clipboard.forEach(orig => {
        const clone = JSON.parse(JSON.stringify(orig));
        clone.id = generateFieldId();
        if (orig.type === "radioGroup" || orig.type === "radio") {
            const groupName = getRadioGroupName(orig);
            clone.radioGroup = groupName;
            clone.name = groupName;
            const siblings = state.fields.filter(f => (f.type === "radioGroup" || f.type === "radio") && getRadioGroupName(f) === groupName);
            clone.exportValue = `Option ${siblings.length + 1}`;
            clone.radioValue = clone.exportValue;
            clone.value = clone.exportValue;
            clone.defaultChecked = false;
            clone.checked = false;
        } else {
            clone.name = (orig.name || "field") + "_copy";
        }
        clone.x = Math.max(0, orig.x + 15);
        clone.y = Math.max(0, orig.y + 15);
        clone.page = state.currentPageNum;
        state.fields.push(clone);
        newIds.push(clone.id);
    });
    state.clipboard.forEach(c => { c.x += 15; c.y += 15; });
    state.selectedFieldIds.clear();
    newIds.forEach(id => state.selectedFieldIds.add(id));
    return newIds;
}

export function duplicateSelectedFields() {
    copySelectedFields();
    return pasteClipboardFields();
}

export function setEditorMode(mode = "design") {
    state.editorMode = mode;
    if (mode === "fill") {
        state.activeTool = "select";
    }
}

export function clearAllTestValues() {
    state.fields.forEach(f => {
        f.value = "";
        f.defaultValue = "";
        f.defaultChecked = false;
        f.signatureImage = null;
    });
}

export function setGuidesEnabled(enabled) {
    state.guidesEnabled = !!enabled;
    localStorage.setItem("justforms_guides_enabled", state.guidesEnabled ? "true" : "false");
}

export function toggleGuides() {
    setGuidesEnabled(!state.guidesEnabled);
    return state.guidesEnabled;
}

export function updateDocumentTitle(customName) {
    const defaultTitle = "Formblatt: Free Interactive PDF Form Creator & AcroForm Editor";
    if (typeof document === "undefined" || !document) return;
    
    const editor = typeof document.getElementById === "function" ? document.getElementById("appEditorScreen") : null;
    const bodyHasClass = document.body && document.body.classList && typeof document.body.classList.contains === "function" && document.body.classList.contains("editor-active");
    const editorHasClass = editor && editor.classList && typeof editor.classList.contains === "function" && editor.classList.contains("active");
    const editorIsVisible = editor && editor.style && (editor.style.display === "flex" || editor.style.display === "block");
    const isEditorActive = Boolean(editor && (bodyHasClass || editorHasClass || editorIsVisible));
    if (!isEditorActive) {
        document.title = defaultTitle;
        return;
    }
    
    const name = customName !== undefined ? customName : state.fileName;
    if (name && typeof name === "string" && name.trim()) {
        document.title = `${name.trim()} – Formblatt`;
    } else {
        document.title = defaultTitle;
    }
}

export function sortFieldsByReadingOrder(fields, yTolerance = 10) {
    if (!Array.isArray(fields)) return [];
    return [...fields].sort((a, b) => {
        const pageA = a.page || 1;
        const pageB = b.page || 1;
        if (pageA !== pageB) return pageA - pageB;

        const yDiff = (a.y || 0) - (b.y || 0);
        if (Math.abs(yDiff) > yTolerance) {
            return yDiff; // Top to bottom (smaller y is higher up)
        }
        return (a.x || 0) - (b.x || 0); // Left to right within same visual row
    });
}

export function evaluateCalculations(fields = state.fields) {
    if (!Array.isArray(fields)) return;
    const calcFields = fields.filter(f => f.calculationType && f.calculationType !== "none");
    if (calcFields.length === 0) return;

    const getVal = (name) => {
        if (!name) return 0;
        const clean = String(name).trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
        const found = fields.find(f => {
            const fName = (f.name || "").trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
            return fName === clean || f.id === name;
        });
        if (!found) return 0;
        const val = found.value !== undefined && found.value !== "" ? found.value : found.defaultValue;
        const num = parseFloat(String(val || "").replace(/[^0-9.-]/g, ""));
        return isNaN(num) ? 0 : num;
    };

    for (let pass = 0; pass < 5; pass++) {
        let changed = false;
        for (const f of calcFields) {
            let res = 0;
            const targets = Array.isArray(f.calculationFields) 
                ? f.calculationFields 
                : (f.calculationFields ? String(f.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);

            if (f.calculationType === "sum") {
                res = targets.reduce((sum, t) => sum + getVal(t), 0);
            } else if (f.calculationType === "prod") {
                if (targets.length === 0) res = 0;
                else res = targets.reduce((prod, t) => prod * getVal(t), 1);
            } else if (f.calculationType === "tax") {
                const baseVal = getVal(f.calculationTaxBaseField || targets[0] || "");
                const rate = parseFloat(f.calculationTaxRate) || 0;
                res = baseVal * (rate / 100);
            } else if (f.calculationType === "discount") {
                const baseVal = getVal(f.calculationDiscountBaseField || targets[0] || "");
                const rate = parseFloat(f.calculationDiscountRate) || 0;
                res = baseVal * (rate / 100);
            } else if ((f.calculationType === "custom" || f.calculationFormula) && f.calculationFormula) {
                const expr = f.calculationFormula.trim();
                const tokens = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                const reserved = new Set(["Math", "Number", "parseInt", "parseFloat", "min", "max", "round", "abs", "floor", "ceil", "SUM", "PROD", "true", "false", "null", "undefined"]);
                let evalExpr = expr;
                tokens.forEach(tok => {
                    if (!reserved.has(tok)) {
                        const val = getVal(tok);
                        evalExpr = evalExpr.replace(new RegExp(`\\b${tok}\\b`, "g"), `(${val})`);
                    }
                });
                try {
                    if (/^[0-9+\-*/().\s]+$/.test(evalExpr)) {
                        res = Function(`"use strict"; return (${evalExpr})`)();
                    }
                } catch(e) {
                    res = 0;
                }
            }

            const formattedRes = (Number.isFinite(res) && !Number.isInteger(res)) ? Math.round(res * 100) / 100 : (Number.isFinite(res) ? res : 0);
            const strRes = String(formattedRes);
            if (f.value !== strRes) {
                f.value = strRes;
                f.defaultValue = strRes;
                changed = true;

                if (typeof document !== "undefined" && typeof document.querySelector === "function") {
                    const overlayInput = document.querySelector(`#overlay_${f.id} input, #overlay_${f.id} textarea`);
                    if (overlayInput && overlayInput.value !== strRes && document.activeElement !== overlayInput) {
                        overlayInput.value = strRes;
                    }
                    const overlayLabel = document.querySelector(`#overlay_${f.id} .overlay-label`);
                    if (overlayLabel) {
                        overlayLabel.textContent = strRes;
                        overlayLabel.style.color = "#0f172a";
                        overlayLabel.style.opacity = "1.0";
                    }
                }
            }
        }
        if (!changed) break;
    }
}

/**
 * Finds fields in the same column positioned vertically below the source field.
 */
export function getVerticallyAlignedColumnSiblings(sourceField, allFields = state.fields) {
    if (!sourceField) return [];
    const page = sourceField.page || 1;
    return allFields
        .filter(f => {
            if (f.id === sourceField.id) return false;
            if ((f.page || 1) !== page) return false;
            // Vertically below
            if (f.y <= sourceField.y + 4) return false;
            // Horizontally aligned (same column) within 8px tolerance
            if (Math.abs(f.x - sourceField.x) > 8) return false;
            // Similar width within 16px tolerance
            if (Math.abs(f.width - sourceField.width) > 16) return false;
            return true;
        })
        .sort((a, b) => a.y - b.y);
}

/**
 * Propagates the calculation recipe from sourceField to targetField with smart relative mapping.
 */
export function propagateFormulaToField(sourceField, targetField, allFields = state.fields) {
    if (!sourceField || !targetField || !sourceField.calculationType || sourceField.calculationType === "none") {
        return false;
    }

    targetField.calculationType = sourceField.calculationType;
    if (sourceField.calculationTaxRate !== undefined) targetField.calculationTaxRate = sourceField.calculationTaxRate;
    if (sourceField.calculationDiscountRate !== undefined) targetField.calculationDiscountRate = sourceField.calculationDiscountRate;
    if (sourceField.dataFormat) targetField.dataFormat = sourceField.dataFormat;
    if (sourceField.textAlignment) targetField.textAlignment = sourceField.textAlignment;
    targetField.readOnly = true;

    // Helper to find relative mapped dependency field name
    const mapDependency = (srcDepName) => {
        if (!srcDepName) return "";
        const srcDepField = allFields.find(f => (f.name || f.id) === srcDepName);

        // Strategy 1: Number substitution (e.g. item_qty_1 -> item_qty_2)
        const srcNameMatch = (sourceField.name || "").match(/(\d+)/);
        const tgtNameMatch = (targetField.name || "").match(/(\d+)/);
        if (srcNameMatch && tgtNameMatch) {
            const srcIdx = srcNameMatch[1];
            const tgtIdx = tgtNameMatch[1];
            if (srcDepName.includes(srcIdx)) {
                const candidateName = srcDepName.replace(new RegExp(`(?<=^|[^0-9])${srcIdx}(?=[^0-9]|$)`, "g"), tgtIdx);
                const found = allFields.find(f => (f.name || f.id) === candidateName);
                if (found) return found.name || found.id;
            }
        }

        // Strategy 2: Spatial relative offset matching (same relative column on target row)
        if (srcDepField) {
            const relDx = srcDepField.x - sourceField.x;
            const targetY = targetField.y;
            const targetPage = targetField.page || 1;
            // Find field on the target's row with matching relative dx
            const rowFields = allFields.filter(f => (f.page || 1) === targetPage && Math.abs(f.y - targetY) < Math.max(24, targetField.height + 6));
            const bestMatch = rowFields.find(f => Math.abs((f.x - targetField.x) - relDx) < 12);
            if (bestMatch) return bestMatch.name || bestMatch.id;
        }

        // Strategy 3: Row-index offset matching
        if (srcDepField) {
            const depColSiblings = allFields
                .filter(f => (f.page || 1) === (srcDepField.page || 1) && Math.abs(f.x - srcDepField.x) < 8)
                .sort((a, b) => a.y - b.y);
            const srcRowIdx = allFields
                .filter(f => (f.page || 1) === (sourceField.page || 1) && Math.abs(f.x - sourceField.x) < 8)
                .sort((a, b) => a.y - b.y)
                .findIndex(f => f.id === sourceField.id);
            const tgtRowIdx = allFields
                .filter(f => (f.page || 1) === (targetField.page || 1) && Math.abs(f.x - targetField.x) < 8)
                .sort((a, b) => a.y - b.y)
                .findIndex(f => f.id === targetField.id);

            if (srcRowIdx !== -1 && tgtRowIdx !== -1 && depColSiblings[tgtRowIdx]) {
                return depColSiblings[tgtRowIdx].name || depColSiblings[tgtRowIdx].id;
            }
        }

        return srcDepName;
    };

    // Apply mapping according to calculation type
    if (sourceField.calculationType === "sum" || sourceField.calculationType === "prod") {
        const srcTargets = Array.isArray(sourceField.calculationFields)
            ? sourceField.calculationFields
            : (sourceField.calculationFields ? String(sourceField.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);
        targetField.calculationFields = srcTargets.map(mapDependency);
    } else if (sourceField.calculationType === "tax") {
        targetField.calculationTaxBaseField = mapDependency(sourceField.calculationTaxBaseField);
    } else if (sourceField.calculationType === "discount") {
        targetField.calculationDiscountBaseField = mapDependency(sourceField.calculationDiscountBaseField);
    } else if (sourceField.calculationType === "custom") {
        let formula = sourceField.calculationFormula || "";
        const tokens = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        const uniqueTokens = Array.from(new Set(tokens));
        uniqueTokens.forEach(tok => {
            const mapped = mapDependency(tok);
            if (mapped && mapped !== tok) {
                const regex = new RegExp(`\\b${tok}\\b`, "g");
                formula = formula.replace(regex, mapped);
            }
        });
        targetField.calculationFormula = formula;
    }

    return true;
}

/**
 * Fills formula from sourceField down to all aligned column siblings below it.
 */
export function fillFormulaDownColumn(sourceField, allFields = state.fields) {
    if (!sourceField) return [];
    const siblings = getVerticallyAlignedColumnSiblings(sourceField, allFields);
    if (siblings.length === 0) return [];

    siblings.forEach(targetField => {
        propagateFormulaToField(sourceField, targetField, allFields);
    });

    evaluateCalculations(allFields);
    return siblings;
}

/**
 * Copies the calculation formula recipe to state.formulaClipboard.
 */
export function copyFormulaRecipe(sourceField) {
    if (!sourceField || !sourceField.calculationType || sourceField.calculationType === "none") {
        return null;
    }
    state.formulaClipboard = JSON.parse(JSON.stringify(sourceField));
    return state.formulaClipboard;
}

/**
 * Pastes formula recipe from state.formulaClipboard to target fields.
 */
export function pasteFormulaRecipeToFields(targetFields, allFields = state.fields) {
    if (!state.formulaClipboard || !Array.isArray(targetFields) || targetFields.length === 0) {
        return 0;
    }
    let count = 0;
    targetFields.forEach(targetField => {
        if (targetField.id === state.formulaClipboard.id) return;
        if (propagateFormulaToField(state.formulaClipboard, targetField, allFields)) {
            count++;
        }
    });
    if (count > 0) {
        evaluateCalculations(allFields);
    }
    return count;
}

