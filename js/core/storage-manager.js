// ── History & Project Storage (js/core/storage-manager.js) ──────────
import { state } from "./state.js";
import { loadPdfLibraries } from "../engines/pdf-engine.js";

export function uint8ArrayToBase64(bytes) {
    if (!bytes || bytes.length === 0) return null;
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const len = bytes.length;
    let base64 = "";
    let i = 0;
    for (i = 0; i < len - 2; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        base64 += chars[b0 >> 2];
        base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
        base64 += chars[((b1 & 15) << 2) | (b2 >> 6)];
        base64 += chars[b2 & 63];
    }
    if (i < len) {
        const b0 = bytes[i];
        base64 += chars[b0 >> 2];
        if (i === len - 1) {
            base64 += chars[(b0 & 3) << 4];
            base64 += "==";
        } else {
            const b1 = bytes[i + 1];
            base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
            base64 += chars[(b1 & 15) << 2];
            base64 += "=";
        }
    }
    return base64;
}

export function base64ToUint8Array(base64) {
    if (!base64) return null;
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

let historyDebounceTimer = null;

export function safeJsonStringify(value, space = 2) {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, current) => {
        if (typeof current === "function") return undefined;
        if (current instanceof Set) return Array.from(current.values());
        if (current instanceof Map) return Object.fromEntries(current.entries());
        if (typeof current === "object" && current !== null) {
            if (seen.has(current)) return "[Circular]";
            seen.add(current);
        }
        return current;
    }, space);
}

export function saveHistory(arg1 = false, arg2 = null) {
    let immediate = false;
    let actionName = null;

    if (typeof arg1 === "string") {
        actionName = arg1;
        immediate = Boolean(arg2);
    } else {
        immediate = Boolean(arg1);
        actionName = typeof arg2 === "string" ? arg2 : null;
    }

    if (immediate) {
        if (historyDebounceTimer) {
            clearTimeout(historyDebounceTimer);
            historyDebounceTimer = null;
        }
        commitHistorySnapshot(actionName);
        return;
    }

    // Debounce rapid continuous stream of updates (sliders, scrubbing, typing)
    if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(() => {
        commitHistorySnapshot(actionName);
        historyDebounceTimer = null;
    }, 350);
}

function commitHistorySnapshot(actionName = null) {
    const rawSnapshot = safeJsonStringify({ fields: state.fields, groups: state.groups || [] });
    const currentEntry = state.historyIndex >= 0 ? state.history[state.historyIndex] : null;
    const currentRaw = typeof currentEntry === "object" && currentEntry !== null ? currentEntry.snapshot : currentEntry;

    if (currentRaw === rawSnapshot) {
        return;
    }

    const defaultName = actionName || "Edit";
    state.historyIndex++;
    state.history = state.history.slice(0, state.historyIndex);
    state.history.push({ snapshot: rawSnapshot, name: defaultName });

    saveRecentProjectMetadata();
}

const DB_NAME = "FormblattRecentDB";
const DB_VERSION = 1;
const STORE_NAME = "recent_project_store";

function openRecentDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function saveRecentProjectMetadata() {
    if (typeof localStorage === "undefined") return;
    try {
        if (!state.pdfDoc && (!state.fields || state.fields.length === 0)) return;
        const lastEdited = new Date().toISOString();
        const meta = {
            fileName: state.fileName || "Untitled_Form.pdf",
            lastEdited,
            fieldCount: (state.fields || []).length,
            pageCount: state.totalPages || 1
        };
        localStorage.setItem("formblatt_recent_project", JSON.stringify(meta));

        if (typeof indexedDB !== "undefined") {
            try {
                const db = await openRecentDb();
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                let pdfBuffer = null;
                if (state.originalPdfBytes && state.originalPdfBytes.byteLength > 0) {
                    pdfBuffer = state.originalPdfBytes.buffer.slice(
                        state.originalPdfBytes.byteOffset,
                        state.originalPdfBytes.byteOffset + state.originalPdfBytes.byteLength
                    );
                }
                const snapshot = {
                    fileName: meta.fileName,
                    lastEdited,
                    fieldCount: meta.fieldCount,
                    pageCount: meta.pageCount,
                    fields: state.fields || [],
                    groups: state.groups || [],
                    pdfBytes: pdfBuffer
                };
                store.put(snapshot, "current_project");
            } catch (idbErr) {
                console.warn("Could not save recent project to IndexedDB:", idbErr);
            }
        }
    } catch (e) {}
}

export async function loadRecentProjectSnapshot() {
    let snapshot = null;
    if (typeof indexedDB !== "undefined") {
        try {
            const db = await openRecentDb();
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get("current_project");
            snapshot = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (idbErr) {
            console.warn("Could not query IndexedDB for recent project:", idbErr);
        }
    }

    if (!snapshot) {
        const meta = getRecentProjectMetadata();
        if (!meta) return false;
        snapshot = {
            fileName: meta.fileName || "interactive_form.pdf",
            fields: [],
            groups: [],
            pdfBytes: null
        };
    }

    try {
        const pdfEngineMod = await import("../engines/pdf-engine.js");
        const { loadPdfLibraries, analyzePdfDocument, goToPage } = pdfEngineMod;
        await loadPdfLibraries();

        let pdfBytes = null;
        if (snapshot.pdfBytes && snapshot.pdfBytes.byteLength > 0) {
            pdfBytes = new Uint8Array(snapshot.pdfBytes);
        } else {
            // Build default blank A4 canvas document if original PDF bytes were not stored
            let pdfLib = typeof window !== "undefined" ? (window.PDFLib || globalThis.PDFLib) : (typeof PDFLib !== "undefined" ? PDFLib : globalThis.PDFLib);
            if (!pdfLib) {
                try {
                    pdfLib = await import("pdf-lib");
                } catch (e) {}
            }
            if (pdfLib && pdfLib.PDFDocument) {
                const doc = await pdfLib.PDFDocument.create();
                doc.addPage([595.28, 841.89]);
                pdfBytes = await doc.save();
            }
        }

        if (!pdfBytes) return false;

        let loadedDoc = null;
        let pdfjs = typeof window !== "undefined" ? (window.pdfjsLib || globalThis.pdfjsLib) : (typeof pdfjsLib !== "undefined" ? pdfjsLib : globalThis.pdfjsLib);
        if (pdfjs && typeof pdfjs.getDocument === "function") {
            const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
            loadedDoc = await loadingTask.promise;
        } else {
            loadedDoc = { numPages: 1 };
        }

        state.originalPdfBytes = pdfBytes;
        state.pdfDoc = loadedDoc;
        state.totalPages = loadedDoc.numPages;
        state.currentPageNum = 1;
        state.fileName = snapshot.fileName || "interactive_form.pdf";
        state.fields = snapshot.fields || [];
        state.groups = snapshot.groups || [];
        state.selectedFieldIds.clear();
        state.lastSelectedFieldId = state.fields[0]?.id || null;

        await analyzePdfDocument(pdfBytes);

        const fileNameInput = document.getElementById("fileNameInput");
        if (fileNameInput) fileNameInput.value = state.fileName;

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";

        const landingMod = await import("../controllers/landing-controller.js");
        await landingMod.showEditorScreen();
        await goToPage(1);

        return true;
    } catch (err) {
        console.error("Failed to restore recent project snapshot:", err);
        return false;
    }
}

export function getRecentProjectMetadata() {
    if (typeof localStorage === "undefined") return null;
    try {
        const raw = localStorage.getItem("formblatt_recent_project");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && parsed.fileName) {
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function clearRecentProjectMetadata() {
    if (typeof localStorage !== "undefined") {
        try {
            localStorage.removeItem("formblatt_recent_project");
        } catch (e) {}
    }
    if (typeof indexedDB !== "undefined") {
        try {
            const db = await openRecentDb();
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.delete("current_project");
        } catch (e) {}
    }
}

export function getUndoActionName() {
    if (state.historyIndex > 0 && state.historyIndex < state.history.length) {
        const entry = state.history[state.historyIndex];
        return typeof entry === "object" && entry?.name ? entry.name : "Edit";
    }
    return null;
}

export function getRedoActionName() {
    if (state.historyIndex >= 0 && state.historyIndex < state.history.length - 1) {
        const entry = state.history[state.historyIndex + 1];
        return typeof entry === "object" && entry?.name ? entry.name : "Edit";
    }
    return null;
}

export function undo(onRestore) {
    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }
    if (state.historyIndex > 0) {
        const actionUndone = getUndoActionName() || "Action";
        state.historyIndex--;
        const entry = state.history[state.historyIndex];
        const rawJson = typeof entry === "object" && entry !== null && entry.snapshot ? entry.snapshot : entry;
        const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
        if (Array.isArray(parsed)) {
            state.fields = parsed;
        } else {
            state.fields = parsed.fields || [];
            state.groups = parsed.groups || [];
        }
        if (onRestore) onRestore();
        return actionUndone;
    }
    return null;
}

export function redo(onRestore) {
    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const entry = state.history[state.historyIndex];
        const actionRedone = typeof entry === "object" && entry?.name ? entry.name : "Action";
        const rawJson = typeof entry === "object" && entry !== null && entry.snapshot ? entry.snapshot : entry;
        const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
        if (Array.isArray(parsed)) {
            state.fields = parsed;
        } else {
            state.fields = parsed.fields || [];
            state.groups = parsed.groups || [];
        }
        if (onRestore) onRestore();
        return actionRedone;
    }
    return null;
}

export function exportProjectJson(customFileName) {
    let pdfBase64 = null;
    if (state.originalPdfBytes && state.originalPdfBytes.length > 0) {
        pdfBase64 = uint8ArrayToBase64(state.originalPdfBytes);
    }

    const projectData = {
        appName: "Formblatt",
        version: "2.5",
        date: new Date().toISOString(),
        fileName: state.fileName || "interactive_form.pdf",
        totalPages: state.totalPages,
        groups: state.groups || [],
        fields: state.fields || [],
        pdfBase64: pdfBase64
    };

    const blob = new Blob([safeJsonStringify(projectData, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    let baseName = customFileName;
    if (!baseName) {
        baseName = (state.fileName || "interactive_form").replace(/\.pdf$/i, "");
    }
    baseName = baseName.replace(/\.formblatt$/i, "").replace(/\.fblatt$/i, "").replace(/\.jform$/i, "").replace(/\.justforms$/i, "");

    a.download = `${baseName}.formblatt`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function importProjectJson(file, onLoaded) {
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        const fieldsToRestore = Array.isArray(data.fields) ? data.fields : [];
        const groupsToRestore = Array.isArray(data.groups) ? data.groups : [];

        // 1. If project file contains embedded PDF bytes, load the PDF background directly!
        if (data.pdfBase64) {
            const pdfBytes = base64ToUint8Array(data.pdfBase64);
            if (pdfBytes && pdfBytes.length > 0) {
                await loadPdfLibraries();
                const pdfjs = typeof window !== "undefined" ? (window.pdfjsLib || globalThis.pdfjsLib) : (typeof pdfjsLib !== "undefined" ? pdfjsLib : null);
                if (!pdfjs) throw new Error("PDF.js library could not be loaded");
                const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
                const loadedDoc = await loadingTask.promise;
                state.originalPdfBytes = pdfBytes;
                state.pdfDoc = loadedDoc;
                state.totalPages = state.pdfDoc.numPages;
                state.fileName = data.fileName || file.name.replace(/\.(formblatt|justforms\.json|json)$/i, ".pdf");

                const fileNameInput = document.getElementById("fileNameInput");
                if (fileNameInput) fileNameInput.value = state.fileName;

                state.fields = fieldsToRestore;
                state.groups = groupsToRestore;
                state.selectedFieldIds.clear();
                state.lastSelectedFieldId = state.fields[0]?.id || null;

                const es = document.getElementById("emptyState");
                if (es) es.style.display = "none";

                const pdfEngineMod = await import("../engines/pdf-engine.js");
                await pdfEngineMod.loadPdfLibraries();
                await pdfEngineMod.analyzePdfDocument(pdfBytes);
                const landingMod = await import("../controllers/landing-controller.js");
                landingMod.showEditorScreen(onLoaded);
                return;
            }
        }

        // 2. If PDF is ALREADY loaded in state, apply fields onto current PDF
        if (state.pdfDoc && fieldsToRestore.length > 0) {
            state.fields = fieldsToRestore;
            state.groups = groupsToRestore;
            state.selectedFieldIds.clear();
            state.lastSelectedFieldId = state.fields[0]?.id || null;
            saveHistory();
            if (onLoaded) onLoaded();
            return;
        }

        // 3. Fallback: Project JSON has no embedded PDF and no PDF is currently open
        if (fieldsToRestore.length > 0) {
            state.fields = fieldsToRestore;
            state.groups = groupsToRestore;
            state.selectedFieldIds.clear();
            state.lastSelectedFieldId = state.fields[0]?.id || null;
            saveHistory();
            alert(`Project fields loaded (${fieldsToRestore.length} fields)! Please upload the corresponding PDF document ("${data.fileName || "original PDF"}") to view the canvas background.`);
            if (onLoaded) onLoaded();
        }
    } catch(err) {
        console.error("Failed to load project file:", err);
        alert("Failed to load project file: " + (err.message || err));
    }
}
