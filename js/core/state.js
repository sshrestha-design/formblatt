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

export function pasteClipboardFields() {
    if (!state.clipboard || state.clipboard.length === 0) return [];
    const newIds = [];
    state.clipboard.forEach(orig => {
        const clone = JSON.parse(JSON.stringify(orig));
        clone.id = generateFieldId();
        clone.name = (orig.name || "field") + "_copy";
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
                }
            }
        }
        if (!changed) break;
    }
}

