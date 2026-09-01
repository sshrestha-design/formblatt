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
