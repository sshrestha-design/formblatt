// ── History & Project Storage (js/storage-manager.js) ──────────
import { state } from "./state.js";

export function uint8ArrayToBase64(bytes) {
    if (!bytes) return null;
    let binary = "";
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
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

export function saveHistory() {
    const snapshot = JSON.stringify({ fields: state.fields, groups: state.groups || [] });
    if (state.historyIndex >= 0 && state.history[state.historyIndex] === snapshot) {
        return;
    }
    state.historyIndex++;
    state.history = state.history.slice(0, state.historyIndex);
    state.history.push(snapshot);
}

export function undo(onRestore) {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const parsed = JSON.parse(state.history[state.historyIndex]);
        if (Array.isArray(parsed)) {
            state.fields = parsed;
        } else {
            state.fields = parsed.fields || [];
            state.groups = parsed.groups || [];
        }
        if (onRestore) onRestore();
    }
}

export function redo(onRestore) {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const parsed = JSON.parse(state.history[state.historyIndex]);
        if (Array.isArray(parsed)) {
            state.fields = parsed;
        } else {
            state.fields = parsed.fields || [];
            state.groups = parsed.groups || [];
        }
        if (onRestore) onRestore();
    }
}

export function exportProjectJson(customFileName) {
    let pdfBase64 = null;
    if (state.originalPdfBytes && state.originalPdfBytes.length > 0) {
        pdfBase64 = uint8ArrayToBase64(state.originalPdfBytes);
    }

    const projectData = {
        appName: "JustForms",
        version: "2.5",
        date: new Date().toISOString(),
        fileName: state.fileName || "interactive_form.pdf",
        totalPages: state.totalPages,
        groups: state.groups || [],
        fields: state.fields || [],
        pdfBase64: pdfBase64
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    let baseName = customFileName;
    if (!baseName) {
        baseName = (state.fileName || "interactive_form").replace(/\.pdf$/i, "");
    }
    baseName = baseName.replace(/\.jform$/i, "").replace(/\.justforms$/i, "");

    a.download = `${baseName}.jform`;
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
                const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
                const loadedDoc = await loadingTask.promise;
                state.originalPdfBytes = pdfBytes;
                state.pdfDoc = loadedDoc;
                state.totalPages = state.pdfDoc.numPages;
                state.fileName = data.fileName || file.name.replace(/\.(justforms\.json|json)$/i, ".pdf");

                const fileNameInput = document.getElementById("fileNameInput");
                if (fileNameInput) fileNameInput.value = state.fileName;

                state.fields = fieldsToRestore;
                state.groups = groupsToRestore;
                state.selectedFieldIds.clear();

                const es = document.getElementById("emptyState");
                if (es) es.style.display = "none";

                import("./pdf-engine.js").then(async mod => {
                    await mod.goToPage(1);
                    saveHistory();
                    import("./landing-controller.js").then(landingMod => {
                        landingMod.showEditorScreen(onLoaded);
                    });
                });
                return;
            }
        }

        // 2. If PDF is ALREADY loaded in state, apply fields onto current PDF
        if (state.pdfDoc && fieldsToRestore.length > 0) {
            state.fields = fieldsToRestore;
            state.groups = groupsToRestore;
            state.selectedFieldIds.clear();
            saveHistory();
            if (onLoaded) onLoaded();
            return;
        }

        // 3. Fallback: Project JSON has no embedded PDF and no PDF is currently open
        if (fieldsToRestore.length > 0) {
            state.fields = fieldsToRestore;
            state.groups = groupsToRestore;
            state.selectedFieldIds.clear();
            saveHistory();
            alert(`Project fields loaded (${fieldsToRestore.length} fields)! Please upload the corresponding PDF document ("${data.fileName || "original PDF"}") to view the canvas background.`);
            if (onLoaded) onLoaded();
        }
    } catch(err) {
        console.error("Failed to load project file:", err);
        alert("Failed to load project file: " + (err.message || err));
    }
}
