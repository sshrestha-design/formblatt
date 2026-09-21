// ── Formblatt Form Data Export / Import Engine (js/core/data-exporter.js) ──
// 100% Client-side zero-telemetry JSON & CSV Form Data Exporter/Importer.

import { state } from "./state.js";
import { evaluateCalculations } from "./state.js";
import { showToast } from "../utils/toast.js";
import { renderOverlays } from "../ui/overlay-manager.js";

/**
 * Escapes a single CSV value according to RFC-4180 rules.
 * @param {string|number|boolean|null|undefined} val 
 * @returns {string}
 */
export function escapeCsvValue(val) {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Robust RFC-4180 compliant CSV parser.
 * Handles quoted cells with commas, multiline strings, and escaped quotes.
 * @param {string} text 
 * @returns {string[][]} Array of string rows
 */
export function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (insideQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped double quote ("")
                    currentCell += '"';
                    i++;
                } else {
                    // End of quoted string
                    insideQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === ",") {
                currentRow.push(currentCell.trim());
                currentCell = "";
            } else if (char === "\r" || char === "\n") {
                if (char === "\r" && nextChar === "\n") {
                    i++;
                }
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = "";
            } else {
                currentCell += char;
            }
        }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Exports current form field data as structured JSON.
 * @param {Array} [fields=state.fields]
 * @param {string} [filename="form-data.json"]
 * @returns {string} The JSON string
 */
export function exportFormDataAsJson(fields = state.fields, filename = "form-data.json") {
    const dataMap = {};
    const fieldDetails = [];

    fields.forEach(f => {
        const key = f.name || f.id;
        const val = (f.type === "checkbox" || f.type === "radio") ? Boolean(f.checked) : (f.value || "");
        dataMap[key] = val;
        fieldDetails.push({
            id: f.id,
            name: f.name || f.id,
            type: f.type,
            page: f.page || 1,
            value: val
        });
    });

    const exportPayload = {
        _meta: {
            app: "Formblatt",
            version: "2.8",
            exportedAt: new Date().toISOString(),
            totalFields: fields.length
        },
        data: dataMap,
        fields: fieldDetails
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);

    if (typeof window !== "undefined" && typeof document !== "undefined" && typeof document.createElement === "function") {
        downloadBlob(new Blob([jsonStr], { type: "application/json;charset=utf-8;" }), filename);
        showToast("Form data exported as JSON", "success");
    }

    return jsonStr;
}

/**
 * Exports current form field data as RFC-4180 CSV.
 * @param {Array} [fields=state.fields]
 * @param {string} [filename="form-data.csv"]
 * @param {"row"|"table"} [format="row"]
 * @returns {string} The CSV string
 */
export function exportFormDataAsCsv(fields = state.fields, filename = "form-data.csv", format = "row") {
    let csvContent = "";

    if (format === "table") {
        // Detailed 5-column schema table
        const headers = ["Field Name", "Field ID", "Type", "Page", "Value"];
        const rows = fields.map(f => {
            const val = (f.type === "checkbox" || f.type === "radio") ? (f.checked ? "Yes" : "No") : (f.value || "");
            return [f.name || f.id, f.id, f.type, f.page || 1, val].map(escapeCsvValue).join(",");
        });
        csvContent = [headers.join(","), ...rows].join("\r\n");
    } else {
        // Bulk single-record data row (header row + values row)
        const headerRow = fields.map(f => escapeCsvValue(f.name || f.id)).join(",");
        const valueRow = fields.map(f => {
            const val = (f.type === "checkbox" || f.type === "radio") ? (f.checked ? "true" : "false") : (f.value || "");
            return escapeCsvValue(val);
        }).join(",");
        csvContent = `${headerRow}\r\n${valueRow}`;
    }

    if (typeof window !== "undefined" && typeof document !== "undefined" && typeof document.createElement === "function") {
        downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), filename);
        showToast("Form data exported as CSV", "success");
    }

    return csvContent;
}

/**
 * Imports JSON or CSV text data and applies values to matching fields.
 * @param {string} textContent Raw file text
 * @param {"json"|"csv"|"auto"} format
 * @param {Object} [stateRef=state]
 * @returns {{ success: boolean, count: number, total: number }}
 */
export function importFormData(textContent, format = "auto", stateRef = state) {
    if (!textContent || typeof textContent !== "string") {
        return { success: false, count: 0, total: stateRef.fields ? stateRef.fields.length : 0 };
    }

    const trimmed = textContent.trim();
    let detectedFormat = format;
    if (detectedFormat === "auto") {
        detectedFormat = (trimmed.startsWith("{") || trimmed.startsWith("[")) ? "json" : "csv";
    }

    const keyValues = new Map();

    if (detectedFormat === "json") {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.data && typeof parsed.data === "object") {
                Object.entries(parsed.data).forEach(([k, v]) => keyValues.set(k.toLowerCase().trim(), v));
            } else if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    const key = item.name || item.id || item.fieldName || item.Field;
                    const val = item.value !== undefined ? item.value : item.Value;
                    if (key) keyValues.set(String(key).toLowerCase().trim(), val);
                });
            } else if (typeof parsed === "object") {
                Object.entries(parsed).forEach(([k, v]) => {
                    if (k !== "_meta" && k !== "fields") {
                        keyValues.set(k.toLowerCase().trim(), v);
                    }
                });
            }
        } catch (e) {
            console.error("JSON parse error:", e);
            if (typeof document !== "undefined") showToast("Failed to parse JSON file.", "error");
            return { success: false, count: 0, total: stateRef.fields.length };
        }
    } else {
        // CSV Parsing
        try {
            const rows = parseCsv(trimmed);
            if (rows.length === 0) {
                return { success: false, count: 0, total: stateRef.fields.length };
            }

            const header = rows[0].map(h => h.toLowerCase().trim());
            const isTableFormat = header.includes("field name") || header.includes("fieldname") || (header.includes("name") && header.includes("value"));

            if (isTableFormat && rows.length > 1) {
                const nameIdx = header.findIndex(h => h === "field name" || h === "fieldname" || h === "name" || h === "field");
                const valIdx = header.findIndex(h => h === "value" || h === "val");
                for (let r = 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (row[nameIdx]) {
                        keyValues.set(row[nameIdx].toLowerCase().trim(), row[valIdx] !== undefined ? row[valIdx] : "");
                    }
                }
            } else if (rows.length >= 2) {
                // Header row + data row
                const dataRow = rows[1];
                header.forEach((colName, idx) => {
                    if (colName && idx < dataRow.length) {
                        keyValues.set(colName, dataRow[idx]);
                    }
                });
            }
        } catch (e) {
            console.error("CSV parse error:", e);
            if (typeof document !== "undefined") showToast("Failed to parse CSV file.", "error");
            return { success: false, count: 0, total: stateRef.fields.length };
        }
    }

    if (keyValues.size === 0) {
        if (typeof document !== "undefined") showToast("No compatible form fields found in file.", "warning");
        return { success: false, count: 0, total: stateRef.fields.length };
    }

    // Apply values to state.fields
    let matchedCount = 0;
    stateRef.fields.forEach(f => {
        const nameKey = (f.name || "").toLowerCase().trim();
        const idKey = (f.id || "").toLowerCase().trim();

        let val = undefined;
        if (nameKey && keyValues.has(nameKey)) {
            val = keyValues.get(nameKey);
        } else if (idKey && keyValues.has(idKey)) {
            val = keyValues.get(idKey);
        }

        if (val !== undefined) {
            matchedCount++;
            if (f.type === "checkbox" || f.type === "radio") {
                const isChecked = val === true || val === "true" || val === "1" || val === "on" || val === "yes" || val === "Yes" || val === "checked";
                f.checked = isChecked;
                f.value = isChecked ? "Yes" : "Off";
                f.defaultValue = f.value;
            } else {
                f.value = String(val);
                f.defaultValue = String(val);
            }
        }
    });

    // Run dynamic formula evaluation to calculate totals & derived fields
    evaluateCalculations(stateRef.fields);

    // Refresh UI overlays & active inputs
    if (typeof window !== "undefined" && typeof document !== "undefined" && typeof document.querySelector === "function") {
        renderOverlays();
        // Sync any active DOM input fields in Fill Mode
        stateRef.fields.forEach(f => {
            const inputEl = document.querySelector(`#overlay_${f.id} input, #overlay_${f.id} textarea, #overlay_${f.id} select`);
            if (inputEl) {
                if (f.type === "checkbox" || f.type === "radio") {
                    inputEl.checked = Boolean(f.checked);
                } else {
                    inputEl.value = f.value || "";
                }
            }
        });
        showToast(`Successfully imported data for ${matchedCount} field${matchedCount === 1 ? "" : "s"}!`, "success");
    }

    return { success: true, count: matchedCount, total: stateRef.fields.length };
}

/**
 * Helper to trigger client-side file download.
 */
function downloadBlob(blob, filename) {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof document.createElement !== "function") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
