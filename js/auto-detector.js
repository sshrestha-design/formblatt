// ── Universal Geometric Form Field Auto-Detector (js/auto-detector.js) ──
// Pure geometric, typographical, and heuristic-based form field extraction.
// Zero hardcoded document titles, company names, or domain-specific constants.

import { state, generateFieldId } from "./state.js";
import { saveHistory } from "./storage-manager.js";

// ============================================================================
// 1. GENERIC SEMANTIC RESOLVER
// ============================================================================
const GENERIC_PATTERNS = [
    // Dates
    { regex: /due\s*date|payment\s*due/i, id: "due_date", type: "dateField" },
    { regex: /expiration\s*date|exp\s*date|expiry/i, id: "expiration_date", type: "dateField" },
    { regex: /date\s*approved|approval\s*date/i, id: "date_approved", type: "dateField" },
    { regex: /birth\s*date|\bdob\b|date\s*of\s*birth/i, id: "dob", type: "dateField" },
    { regex: /\bdate\b|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)|yyyy\s*-\s*mm\s*-\s*dd/i, id: "date", type: "dateField" },
    
    // Signatures
    { regex: /signature|sign\s*here|signed\s*by|^sign\b/i, id: "signature", type: "signature" },

    // Financial & Numbers
    { regex: /invoice\s*(?:#|no|number|num)/i, id: "invoice_number", type: "textField", autofill: "invoice_num" },
    { regex: /po\s*(?:#|no|number|num)|purchase\s*order/i, id: "po_number", type: "textField" },
    { regex: /subtotal/i, id: "subtotal", type: "textField" },
    { regex: /tax|vat|gst/i, id: "tax", type: "textField" },
    { regex: /total|balance\s*due|amount\s*due/i, id: "total", type: "textField" },
    { regex: /amount|price|rate|cost|fee|charge/i, id: "amount", type: "textField" },
    { regex: /\bqty\b|quantity|units/i, id: "quantity", type: "textField" },
    { regex: /routing|iban|swift|bsb/i, id: "routing_number", type: "textField" },
    { regex: /account\s*(?:#|no|number|num)/i, id: "account_number", type: "textField" },
    { regex: /ssn|social\s*security|tax\s*id|ein|national\s*id/i, id: "ssn", type: "textField" },

    // Contact Details
    { regex: /first\s*name|given\s*name|forename/i, id: "first_name", type: "textField", autofill: "given-name" },
    { regex: /last\s*name|surname|family\s*name/i, id: "last_name", type: "textField", autofill: "family-name" },
    { regex: /full\s*name|^name\b/i, id: "full_name", type: "textField", autofill: "name" },
    { regex: /e-?mail/i, id: "email", type: "textField", autofill: "email" },
    { regex: /phone|telephone|mobile|cell|fax|tel\b/i, id: "phone", type: "textField", autofill: "tel" },
    { regex: /street\s*address|address\s*line|home\s*address/i, id: "street_address", type: "textField", autofill: "address-line1" },
    { regex: /city/i, id: "city", type: "textField", autofill: "address-level2" },
    { regex: /state|province|region/i, id: "state", type: "textField", autofill: "address-level1" },
    { regex: /zip|postal\s*code|postcode/i, id: "zip_code", type: "textField", autofill: "postal-code" },
    { regex: /country/i, id: "country", type: "textField", autofill: "country-name" },
    { regex: /company|organization|employer|institution/i, id: "organization", type: "textField", autofill: "organization" },
    { regex: /title|role|position|designation/i, id: "job_title", type: "textField", autofill: "organization-title" },
    { regex: /department|division|unit/i, id: "department", type: "textField" },
    
    // Table Line Items & Description
    { regex: /item\s*description|item\s*details|^description\b/i, id: "item_description", type: "textField" },

    // Notes & Multiline Freeform
    { regex: /comments|notes|remarks|explanation|justification|feedback|details/i, id: "comments", type: "textField", multiline: true },

    // ------------------------------------------------------------------
    // Devanagari / Nepali equivalents. Same idea as the English table
    // above: match on the semantic keyword, independent of script. Order
    // matters (first match wins) so more specific phrases sit above the
    // bare word they contain (e.g. "जन्म मिति" before plain "मिति").
    // ------------------------------------------------------------------
    { regex: /जन्म\s*मिति/, id: "dob", type: "dateField" },
    { regex: /मिति|मितिः/, id: "date", type: "dateField" },
    { regex: /दस्तखत|हस्ताक्षर/, id: "signature", type: "signature" },
    { regex: /टेलिफोन|फोन|मोबाइल|सम्पर्क\s*नं/, id: "phone", type: "textField", autofill: "tel" },
    { regex: /इमेल|ईमेल/, id: "email", type: "textField", autofill: "email" },
    { regex: /ठेगाना|घर\s*ठेगाना/, id: "address", type: "textField", autofill: "address-line1" },
    { regex: /जिल्ला/, id: "district", type: "textField", autofill: "address-level1" },
    { regex: /गाउँपालिका|नगरपालिका|वडा/, id: "municipality", type: "textField" },
    { regex: /नाम\s*,?\s*थर|पूरा\s*नाम|आवेदकको\s*नाम|निवेदकको\s*नाम/, id: "full_name", type: "textField", autofill: "name" },
    { regex: /^नाम\b/, id: "full_name", type: "textField", autofill: "name" },
    { regex: /नागरिकता\s*(?:नं|नंबर|प्रमाण)/, id: "citizenship_number", type: "textField" },
    { regex: /परिचय\s*पत्र|राहदानी\s*नं/, id: "id_number", type: "textField" },
    { regex: /संख्या|नं\.?\s*$|नम्बर/, id: "number", type: "textField" }
];

function resolveSemanticProps(rawLabel, defaultType = "textField", usedNames = new Set()) {
    const clean = (rawLabel || "").trim().replace(/[:_.\s-]+$/, "");
    let baseId = "";
    let type = defaultType;
    let multiline = false;
    let autofill = "";
    let dataFormat = "text";

    for (const item of GENERIC_PATTERNS) {
        if (item.regex.test(clean)) {
            baseId = item.id;
            if (item.type) type = item.type;
            if (item.multiline) multiline = true;
            if (item.autofill) autofill = item.autofill;
            break;
        }
    }

    // Determine semantic data format
    if (type === "dateField" || /date|dob/i.test(baseId || clean)) {
        dataFormat = "date";
    } else if (/amount|price|subtotal|tax|total|cost|fee|rate/i.test(baseId || clean)) {
        dataFormat = "currency";
    } else if (/qty|quantity|units|hours|miles|number|num|#|ssn|zip|postal/i.test(baseId || clean)) {
        dataFormat = "number";
    } else if (/email/i.test(baseId || clean)) {
        dataFormat = "email";
    } else if (/phone|tel|mobile|cell|fax/i.test(baseId || clean)) {
        dataFormat = "phone";
    }

    if (!baseId) {
        // NOTE: strip only whitespace/punctuation here, never non-Latin
        // letters. A naive `[^a-z0-9\s]` filter treats every non-ASCII
        // script (Devanagari, Arabic, CJK, ...) as noise and erases the
        // label down to "", which is how every unmatched field on a
        // Devanagari form used to collapse to the same generic id. The
        // \p{L}/\p{N} Unicode property classes (with the "u" flag) keep
        // letters/digits from ANY script instead.
        const slugify = (s) => {
            const words = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).slice(0, 3);
            return words.length > 0 && words[0].length > 0 ? words.join("_") : "";
        };
        if (type === "signature") {
            baseId = "signature";
        } else if (type === "checkBox") {
            baseId = slugify(clean) || "checkbox";
        } else if (type === "radioGroup") {
            baseId = slugify(clean) || "option";
        } else if (type === "dateField") {
            baseId = "date";
        } else {
            baseId = slugify(clean) || "field";
        }
    }

    let finalId = baseId;
    let counter = 1;
    while (usedNames.has(finalId)) {
        counter++;
        finalId = `${baseId}_${counter}`;
    }
    usedNames.add(finalId);

    return { name: finalId, type, multiline, autofill, dataFormat };
}

// ============================================================================
// 2. UNIVERSAL STATIC TEXT & BANNER HEURISTICS (Zero Hardcoded Names)
// ============================================================================
function isUniversalStaticText(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // 1. Numbered section banners (e.g. "1. SECTION TITLE", "Section A: Requirements")
    if (/^(?:section\s+[a-z0-9]|\d+[\.\)])\s+[A-Za-z\s\&\(\)\/\-]+$/i.test(clean) && !clean.includes(":") && !/[_]{2,}/.test(clean)) {
        return true;
    }

    // 2. Long sentences, paragraphs, or legal disclaimer text (high word count)
    if (clean.length > 75 || clean.split(/\s+/).length > 12 || (clean.endsWith(".") && clean.split(/\s+/).length > 5)) {
        return true;
    }

    // 3. Pure instruction in parentheses (e.g. "(Please print clearly)", "(Check all that apply)")
    if (/^\([^)]+\)$/.test(clean) && !clean.includes(":")) {
        return true;
    }

    // 4. Pure single numbers or list indices (e.g. "1", "2", "3")
    if (/^\d+$/.test(clean)) {
        return true;
    }

    // 5. Standalone currency symbols
    if (/^[\$\€\£\¥]$/.test(clean)) {
        return true;
    }

    return false;
}

// ============================================================================
// 2.5 EXISTING ACROFORM WIDGET PASSTHROUGH
// ============================================================================
export async function getExistingWidgetFields(page, viewport, pageNum, usedNames = new Set()) {
    let annotations;
    try {
        annotations = await page.getAnnotations({ intent: "display" });
    } catch (err) {
        console.warn("Failed to read annotations on page " + pageNum + ":", err);
        return [];
    }

    if (!Array.isArray(annotations)) return [];
    const widgets = annotations.filter(a => {
        return a.subtype === "Widget" && Array.isArray(a.rect) && a.rect.length === 4 &&
            (a.fieldName || a.alternativeText || a.id);
    });
    const fields = [];

    for (const w of widgets) {
        const [x0, y0, x1, y1] = w.rect;
        const left = Math.min(x0, x1);
        const right = Math.max(x0, x1);
        const top = viewport.height - Math.max(y0, y1);
        const bottom = viewport.height - Math.min(y0, y1);

        const fieldFlags = w.fieldFlags || 0;
        const isRadio = (w.checkBox === false && w.radioButton === true) || (!!(fieldFlags & 32768));
        const isCheckbox = w.checkBox === true || (w.fieldType === "Btn" && !isRadio && !(fieldFlags & 65536));
        const isMultiline = !!(fieldFlags & 4096);

        let type = "textField";
        let options = undefined;
        let defaultValue = undefined;

        if (w.fieldType === "Btn") {
            type = isRadio ? "radioGroup" : "checkBox";
        } else if (w.fieldType === "Sig") {
            type = "signature";
        } else if (w.fieldType === "Ch") {
            type = "dropdown";
            options = Array.isArray(w.options)
                ? w.options.map(o => typeof o === "string" ? o : (o.displayValue || o.exportValue || ""))
                : ["Select...", "Option 1", "Option 2"];
            defaultValue = w.fieldValue || (options.length > 0 ? options[0] : "Select...");
        } else if (/date/i.test(w.fieldName || "")) {
            type = "dateField";
        }

        const sourceName = w.fieldName || w.alternativeText || w.id || "field";
        const semanticNames = isRadio ? new Set() : usedNames;
        const sem = resolveSemanticProps(sourceName, type, semanticNames);
        const fieldName = isRadio
            ? sourceName
            : (usedNames.has(sourceName) ? sem.name : sourceName);
        if (!isRadio) usedNames.add(fieldName);

        fields.push({
            id: generateFieldId(),
            type,
            // Keep the PDF field name when possible. This makes exported
            // fields stable and prevents native viewer autofill from losing
            // the original field identity.
            name: fieldName || sem.name,
            value: w.buttonValue || w.fieldValue || "",
            ...(type === "dropdown" ? { options, defaultValue } : {}),
            x: Math.max(0, Math.round(left)),
            y: Math.max(0, Math.round(top)),
            width: Math.max(10, Math.round(right - left)),
            height: Math.max(10, Math.round(bottom - top)),
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: isMultiline || sem.multiline || false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            sourcedFrom: "acroform",
            sourceFieldName: sourceName
        });
    }

    return fields;
}

export async function importExistingAcroFormFields(scope = "all") {
    if (!state.pdfDoc) return 0;
    const pagesToScan = scope === "current"
        ? [state.currentPageNum]
        : Array.from({ length: state.totalPages }, (_, i) => i + 1);
    const imported = [];
    const usedNames = new Set(state.fields.map(field => field.name));

    for (const pageNum of pagesToScan) {
        const page = await state.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        imported.push(...await getExistingWidgetFields(page, viewport, pageNum, usedNames));
    }

    const existing = state.fields.filter(field => !pagesToScan.includes(field.page || 1));
    const current = state.fields.filter(field => pagesToScan.includes(field.page || 1));
    const merged = [...existing, ...current];
    for (const field of imported) {
        if (!isOverlapping(field, merged, 0.2)) merged.push(field);
    }
    state.fields = merged;
    return imported.length;
}

function isOverlapping(field, list, threshold = 0.35) {
    return list.some(existing => {
        if (field.id && existing.id && field.id === existing.id) return false;
        if ((existing.page || 1) !== (field.page || 1)) return false;

        const xOverlap = Math.max(0, Math.min(field.x + field.width, existing.x + existing.width) - Math.max(field.x, existing.x));
        const yOverlap = Math.max(0, Math.min(field.y + field.height, existing.y + existing.height) - Math.max(field.y, existing.y));
        const overlapArea = xOverlap * yOverlap;
        if (overlapArea <= 0) return false;

        const fieldArea = field.width * field.height;
        const existingArea = existing.width * existing.height;
        const minArea = Math.min(fieldArea, existingArea);
        const unionArea = fieldArea + existingArea - overlapArea;
        const iou = unionArea > 0 ? overlapArea / unionArea : 0;
        const centerDistance = Math.hypot(
            (field.x + field.width / 2) - (existing.x + existing.width / 2),
            (field.y + field.height / 2) - (existing.y + existing.height / 2)
        );
        const similarSize = field.width / existing.width > 0.65 &&
            field.width / existing.width < 1.5 &&
            field.height / existing.height > 0.65 &&
            field.height / existing.height < 1.5;

        return minArea > 0 && (
            (overlapArea / minArea) > threshold ||
            (iou >= 0.15 && similarSize) ||
            (centerDistance <= 6 && similarSize)
        );
    });
}

// ============================================================================
// 3. MAIN AUTO-DETECT CONTROLLER
// ============================================================================
export async function autoDetectFields(scope = "current") {
    if (!state.pdfDoc) {
        alert("Please load a PDF document first.");
        return 0;
    }

    const pagesToScan = scope === "all"
        ? Array.from({ length: state.totalPages }, (_, i) => i + 1)
        : [state.currentPageNum];

    let totalDetected = 0;
    const newFields = [];
    const usedNames = new Set(state.fields.map(f => f.name));

    for (let pageNum of pagesToScan) {
        try {
            const page = await state.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            // 1. Authoritative AcroForm passthrough — real widgets are trusted
            // as-is, but a page having SOME real widgets doesn't mean the
            // rest of the page has no blank fields left to detect. We run
            // geometric detection seeded with the widget rects as occupied space.
            const widgetFields = await getExistingWidgetFields(page, viewport, pageNum, usedNames);
            const boundaryLines = await detectTableGridLines(page);

            const textContent = await page.getTextContent();
            
            const rawBlocks = textContent.items.map(item => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontHeight = Math.abs(item.transform[3]) || item.height || 12;
                return {
                    x: Math.round(tx),
                    y: Math.round(viewport.height - ty - fontHeight),
                    width: Math.round(item.width),
                    height: Math.round(fontHeight),
                    str: (item.str || "").trim()
                };
            }).filter(tb => tb.str.length > 0);

            // 2. Lattice table detection — find ruling-line grids on the
            // rendered page and build fields directly from their exact cell
            // bounds. This runs before the stream/heuristic table detection
            // inside detectVisualAffordances; anywhere it succeeds, the
            // region gets registered so the heuristic never re-guesses a
            // second, competing table over the same area.
            const latticeResult = await detectLatticeTableFields(page, rawBlocks, pageNum, usedNames, boundaryLines);
            const boundaryFields = boundaryLines[0]
                ? detectUnderlineFields(boundaryLines[0], rawBlocks, pageNum, usedNames, [...state.fields, ...widgetFields])
                : [];

            const seedFields = [...widgetFields, ...latticeResult.fields, ...boundaryFields];
            const geometricFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, seedFields, latticeResult.regions);
            newFields.push(...widgetFields, ...latticeResult.fields, ...boundaryFields, ...geometricFields);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        // Keep manually placed/template fields. Only replace fields produced
        // by an earlier detector run, then use their rectangles as occupied
        // space so rerunning detection cannot duplicate existing widgets.
        const preservedFields = state.fields.filter(f => {
            const pageIsScanned = pagesToScan.includes(f.page || 1);
            const isDetectorField = Boolean(f.detectedBy || f.sourcedFrom === "acroform");
            return !pageIsScanned || !isDetectorField;
        });

        const finalUnique = [];
        for (let f of newFields) {
            if (!isOverlapping(f, preservedFields, 0.35) &&
                !isOverlapping(f, finalUnique, 0.35)) {
                finalUnique.push(f);
            }
        }

        state.fields = [...preservedFields, ...finalUnique];
        state.selectedFieldIds.clear();
        if (state.lastSelectedFieldId === null) {
            state.lastSelectedFieldId = state.fields.find(f => (f.page || 1) === state.currentPageNum)?.id
                || state.fields[0]?.id
                || null;
        }
        saveHistory();
        totalDetected = finalUnique.length;

        // Debug aid: which heuristic produced each field. Open devtools
        // console after running Auto-Detect to see this table — it's the
        // fastest way to pin down which affordance is generating a
        // specific stray/misplaced field (match it by x/y against what
        // you see on the canvas).
        console.table(finalUnique.map(f => ({
            id: f.id,
            type: f.type,
            name: f.name,
            page: f.page,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            detectedBy: f.detectedBy || f.sourcedFrom || "unknown"
        })));
    }

    return totalDetected;
}

// Shared column-keyword vocabulary, used by both the new lattice
// (ruling-line) table detector and the existing stream (text-position)
// heuristic further down.
const TABLE_COL_DEFS = [
    { regex: /^item\s*(?:#|no|num)?$/i, id: "item_no", name: "item" },
    { regex: /^(?:sku|part\s*#|code)$/i, id: "sku", name: "sku" },
    { regex: /description|particulars|details|goods|services|purpose|attendees/i, id: "description", name: "description" },
    { regex: /^(?:qty|quantity|units|hours|miles|count)$/i, id: "qty", name: "quantity" },
    { regex: /unit\s*price|price|rate|unit\s*cost|fee|charge/i, id: "unit_price", name: "price" },
    { regex: /^taxable$/i, id: "taxable", name: "taxable" },
    { regex: /^(?:amount|total|line\s*total|ext\s*price)$/i, id: "amount", name: "amount" },
    { regex: /category|expense\s*type/i, id: "category", name: "category" },
    { regex: /merchant|vendor|payee|supplier/i, id: "merchant", name: "merchant" },
    { regex: /receipt/i, id: "receipt", name: "receipt" },
    { regex: /^date$/i, id: "date", name: "date" },
    { regex: /school|institution|college/i, id: "school", name: "school" },
    { regex: /degree|major|diploma/i, id: "degree", name: "degree" },
    { regex: /graduated|graduation|year/i, id: "year", name: "year" },
    { regex: /gpa|honors|grade/i, id: "gpa", name: "gpa" },
    { regex: /employer|company/i, id: "employer", name: "employer" },
    { regex: /position|job\s*title|role/i, id: "job_title", name: "job_title" },
    { regex: /medication|drug|medicine/i, id: "medication", name: "medication" },
    { regex: /dosage|frequency/i, id: "dosage", name: "dosage" },
    { regex: /physician|doctor/i, id: "physician", name: "physician" }
];

function matchColumnKeyword(text) {
    for (const col of TABLE_COL_DEFS) {
        if (col.regex.test(text)) return col;
    }
    return null;
}

// ============================================================================
// 3.7 LATTICE TABLE DETECTION (ruling-line based, not text-position guessing)
// ============================================================================
// The stream/heuristic approach (Affordance 4 below) infers table structure
// purely from text positions — cluster words into rows, guess column
// boundaries, match header keywords. That's inherently approximate: it has
// to guess row spacing, column widths, and vocabulary, and every bug we've
// chased in this file (ghost fields, missing rows, cross-column bleed) traces
// back to one of those guesses being wrong for a particular layout.
//
// Most real tables are drawn with actual ruling lines — that's what the grid
// borders visible on the page ARE. If we detect those lines directly, we get
// exact row/column boundaries with no guessing at all: cell membership
// becomes a simple point-in-rect test instead of a proximity heuristic.
//
// This combines PDF content-stream operators with a rendered-pixel fallback.
// Operators provide precise vector boundaries; raster scanning still catches
// lines emitted through less common PDF constructs.
async function detectTableGridLines(page) {
    const RENDER_SCALE = 2; // enough resolution for thin ruling lines, cheap to scan
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    let canvas, ctx;
    try {
        canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        ctx = canvas.getContext("2d", { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
        console.error("Table-grid render failed, falling back to text-based table detection:", err);
        return [];
    }

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
        console.error("Could not read rendered pixels for table detection:", err);
        return [];
    }

    const { data, width, height } = imageData;
    const DARK_THRESHOLD = 200; // luminance below this counts as "ink"
    const isDark = (x, y) => {
        const idx = (y * width + x) * 4;
        const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        return luminance < DARK_THRESHOLD;
    };

    // A real ruling line produces one very long contiguous run of dark
    // pixels along its row/column. Scattered text produces many short runs
    // instead, so a length threshold cleanly separates the two.
    const MIN_LINE_RUN = 120 * RENDER_SCALE;
    const MIN_BOUNDARY_RUN = 40 * RENDER_SCALE;

    const rowBestRun = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
        let run = 0, best = 0;
        for (let x = 0; x < width; x++) {
            if (isDark(x, y)) { run++; if (run > best) best = run; }
            else run = 0;
        }
        rowBestRun[y] = best;
    }

    const colBestRun = new Array(width).fill(0);
    for (let x = 0; x < width; x++) {
        let run = 0, best = 0;
        for (let y = 0; y < height; y++) {
            if (isDark(x, y)) { run++; if (run > best) best = run; }
            else run = 0;
        }
        colBestRun[x] = best;
    }

    function findLineSegments(minRun, horizontal) {
        const segments = [];
        const limit = horizontal ? height : width;
        for (let offset = 0; offset < limit; offset++) {
            let bestStart = -1, bestEnd = -1, runStart = -1;
            const span = horizontal ? width : height;
            for (let cursor = 0; cursor <= span; cursor++) {
                const dark = cursor < span && (horizontal ? isDark(cursor, offset) : isDark(offset, cursor));
                if (dark && runStart < 0) runStart = cursor;
                if ((!dark || cursor === span) && runStart >= 0) {
                    if (cursor - runStart > bestEnd - bestStart) {
                        bestStart = runStart;
                        bestEnd = cursor;
                    }
                    runStart = -1;
                }
            }
            if (bestEnd - bestStart >= minRun) {
                segments.push({ offset, start: bestStart, end: bestEnd });
            }
        }

        const merged = [];
        for (const segment of segments) {
            const previous = merged[merged.length - 1];
            if (previous &&
                segment.offset - previous.offset <= 3 &&
                segment.start <= previous.end + 6 &&
                segment.end >= previous.start - 6) {
                previous.offset = Math.round((previous.offset + segment.offset) / 2);
                previous.start = Math.min(previous.start, segment.start);
                previous.end = Math.max(previous.end, segment.end);
            } else {
                merged.push({ ...segment });
            }
        }
        return merged;
    }

    const horizontalLines = findLineSegments(MIN_BOUNDARY_RUN, true);
    const verticalLines = findLineSegments(MIN_BOUNDARY_RUN, false);
    const vectorLines = await getVectorBoundaryLines(page, RENDER_SCALE);
    horizontalLines.push(...vectorLines.horizontal);
    verticalLines.push(...vectorLines.vertical);

    function mergeAdjacent(candidates, maxGap = 3) {
        const merged = [];
        let clusterStart = null, clusterEnd = null;
        for (const c of candidates) {
            if (clusterStart === null) {
                clusterStart = clusterEnd = c;
            } else if (c - clusterEnd <= maxGap) {
                clusterEnd = c;
            } else {
                merged.push(Math.round((clusterStart + clusterEnd) / 2));
                clusterStart = clusterEnd = c;
            }

            async function getVectorBoundaryLines(page, scale = 2) {
                const result = { horizontal: [], vertical: [] };
                if (!page.getOperatorList || typeof pdfjsLib === "undefined" || !pdfjsLib.OPS) return result;

                let operatorList;
                try {
                    operatorList = await page.getOperatorList();
                } catch (err) {
                    console.warn("Could not read PDF drawing operators:", err);
                    return result;
                }

                const OPS = pdfjsLib.OPS;
                const stack = [];
                let matrix = [1, 0, 0, 1, 0, 0];
                let pathStart = null;
                let current = null;
                const multiply = (left, right) => [
                    left[0] * right[0] + left[2] * right[1],
                    left[1] * right[0] + left[3] * right[1],
                    left[0] * right[2] + left[2] * right[3],
                    left[1] * right[2] + left[3] * right[3],
                    left[0] * right[4] + left[2] * right[5] + left[4],
                    left[1] * right[4] + left[3] * right[5] + left[5]
                ];
                const point = (x, y) => {
                    const pdfPoint = [
                        matrix[0] * x + matrix[2] * y + matrix[4],
                        matrix[1] * x + matrix[3] * y + matrix[5]
                    ];
                    const viewportPoint = page.getViewport({ scale }).convertToViewportPoint(...pdfPoint);
                    return { x: viewportPoint[0], y: viewportPoint[1] };
                };
                const addSegment = (a, b) => {
                    if (!a || !b) return;
                    const dx = Math.abs(a.x - b.x);
                    const dy = Math.abs(a.y - b.y);
                    if (dx >= 80 && dy <= 3) result.horizontal.push({ offset: Math.round((a.y + b.y) / 2), start: Math.round(Math.min(a.x, b.x)), end: Math.round(Math.max(a.x, b.x)) });
                    if (dy >= 80 && dx <= 3) result.vertical.push({ offset: Math.round((a.x + b.x) / 2), start: Math.round(Math.min(a.y, b.y)), end: Math.round(Math.max(a.y, b.y)) });
                };

                for (let i = 0; i < operatorList.fnArray.length; i++) {
                    const fn = operatorList.fnArray[i];
                    const args = operatorList.argsArray[i] || [];
                    if (fn === OPS.save) stack.push(matrix);
                    else if (fn === OPS.restore) matrix = stack.pop() || matrix;
                    else if (fn === OPS.transform) matrix = multiply(matrix, args);
                    else if (fn === OPS.moveTo) {
                        current = point(args[0], args[1]);
                        pathStart = current;
                    } else if (fn === OPS.lineTo) {
                        const next = point(args[0], args[1]);
                        addSegment(current, next);
                        current = next;
                    } else if (fn === OPS.rectangle) {
                        const [x, y, w, h] = args;
                        const p1 = point(x, y), p2 = point(x + w, y);
                        const p3 = point(x + w, y + h), p4 = point(x, y + h);
                        addSegment(p1, p2);
                        addSegment(p2, p3);
                        addSegment(p3, p4);
                        addSegment(p4, p1);
                        current = p1;
                        pathStart = p1;
                    } else if (fn === OPS.closePath && current && pathStart) {
                        addSegment(current, pathStart);
                        current = pathStart;
                    }
                }
                return result;
            }
        }
        if (clusterStart !== null) merged.push(Math.round((clusterStart + clusterEnd) / 2));
        return merged;
    }

    const hCandidates = [];
    for (let y = 0; y < height; y++) if (rowBestRun[y] >= MIN_LINE_RUN) hCandidates.push(y);
    const vCandidates = [];
    for (let x = 0; x < width; x++) if (colBestRun[x] >= MIN_LINE_RUN) vCandidates.push(x);

    const hLinesPx = mergeAdjacent(hCandidates);
    const vLinesPx = mergeAdjacent(vCandidates);

    // Need at least 2 rows (3 horizontal boundaries) and 2 columns (3
    // vertical boundaries) to call this a real table grid rather than a
    // stray horizontal rule under a title or a single vertical divider.
    if (hLinesPx.length < 3 || vLinesPx.length < 3) {
        return [{ rowsY: [], colsX: [], horizontalLines, verticalLines }];
    }

    // Convert back from render-pixel space to the same viewport-scale-1.0,
    // top-left-origin coordinate space that rawBlocks and fields already use.
    const rowsY = hLinesPx.map(y => y / RENDER_SCALE).sort((a, b) => a - b);
    const colsX = vLinesPx.map(x => x / RENDER_SCALE).sort((a, b) => a - b);

    return [{ rowsY, colsX, horizontalLines, verticalLines }];
}

// Builds fields directly from a detected ruling-line grid: the header row's
// text (row 0) names each column, and every EMPTY cell in the data rows
// below it becomes a field sized exactly to that cell — no guessed spacing,
// no guessed width, because the grid lines already give us the true bounds.
function buildFieldsFromTableGrid(grid, rawBlocks, pageNum, usedNames) {
    const { rowsY, colsX } = grid;
    if (rowsY.length < 3 || colsX.length < 3) return { fields: [], region: null };

    const CELL_PAD = 2;
    const numCols = colsX.length - 1;
    const numRows = rowsY.length - 1;

    // Check robust bounding-box overlap so no static text is covered
    const textInCell = (x0, y0, x1, y1) => rawBlocks.filter(tb => {
        const overlapX = Math.max(0, Math.min(x1, tb.x + tb.width) - Math.max(x0, tb.x));
        const overlapY = Math.max(0, Math.min(y1, tb.y + tb.height) - Math.max(y0, tb.y));
        return (overlapX > 2 && overlapY > 2);
    });

    // Calculate row heights to find the median table row height
    const allRowHeights = [];
    for (let r = 0; r < numRows; r++) {
        const h = rowsY[r + 1] - rowsY[r];
        if (h >= 10 && h <= 80) allRowHeights.push(h);
    }
    allRowHeights.sort((a, b) => a - b);
    const medianRowH = allRowHeights.length > 0 
        ? allRowHeights[Math.floor(allRowHeights.length / 2)]
        : 22;

    // Header row = row 0. Name each column from its header cell's text,
    // matched against the shared keyword vocabulary, falling back to the
    // header's own text (sanitized) so untranslated vocabulary still works.
    const columns = [];
    for (let c = 0; c < numCols; c++) {
        const x0 = colsX[c], x1 = colsX[c + 1];
        const y0 = rowsY[0], y1 = rowsY[1];
        const headerText = textInCell(x0, y0, x1, y1).sort((a, b) => a.x - b.x).map(tb => tb.str).join(" ").trim();
        const known = headerText ? matchColumnKeyword(headerText) : null;
        const cleanName = headerText.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `col_${c + 1}`;
        columns.push({
            id: known ? known.id : cleanName,
            name: known ? known.name : (headerText || `Column ${c + 1}`),
            x0, x1
        });
    }

    const fields = [];
    for (let r = 1; r < numRows; r++) { // skip header row (r=0)
        const y0 = rowsY[r], y1 = rowsY[r + 1];
        const cellH = y1 - y0;

        // GUARD 1: Table row height sanity check
        // If a row is significantly taller than the median row height of the table (e.g. 117px gap vs 20px rows),
        // it is an inter-section layout gap between the table and notes/footer, NOT a table data row!
        if (cellH > Math.max(38, medianRowH * 2.0)) {
            continue;
        }

        for (const col of columns) {
            const x0 = col.x0, x1 = col.x1;
            const cellW = x1 - x0;
            if (cellW < 12 || cellH < 10) continue; // too small to be a usable field

            // GUARD 2: Don't overwrite a cell that has static text (like $ symbol, BALANCE DUE, Tax, etc.)
            const existingText = textInCell(x0, y0, x1, y1);
            if (existingText.some(tb => tb.str.replace(/[\s.,$]/g, "").length > 0)) continue;

            const isCheckboxCol = /^(?:taxable|receipt)$/i.test(col.id) || /^(?:taxable|receipt)$/i.test(col.name);
            const sem = resolveSemanticProps(col.name, isCheckboxCol ? "checkBox" : "textField", usedNames);

            const field = isCheckboxCol ? {
                id: generateFieldId(),
                type: "checkBox",
                name: sem.name,
                x: Math.round(x0 + cellW / 2 - 8),
                y: Math.round(y0 + cellH / 2 - 8),
                width: 16,
                height: 16,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: "",
                dataFormat: "text",
                detectedBy: `affordance4b_lattice_col-${col.id}_row-${r}`
            } : {
                id: generateFieldId(),
                type: "textField",
                name: sem.name,
                x: Math.round(x0 + CELL_PAD),
                y: Math.round(y0 + CELL_PAD),
                width: Math.round(cellW - CELL_PAD * 2),
                height: Math.round(cellH - CELL_PAD * 2),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: sem.autofill || "",
                dataFormat: (col.id === "amount" || col.id === "unit_price") ? "currency" : ((col.id === "qty") ? "number" : "text"),
                detectedBy: `affordance4b_lattice_col-${col.id}_row-${r}`
            };
            fields.push(field);
        }
    }

    const region = {
        xMin: colsX[0] - 5,
        xMax: colsX[colsX.length - 1] + 5,
        yMin: rowsY[0] - 5,
        yMax: rowsY[rowsY.length - 1] + 5
    };

    return { fields, region };
}

async function detectLatticeTableFields(page, rawBlocks, pageNum, usedNames, detectedGrids = null) {
    let grids;
    try {
        grids = detectedGrids || await detectTableGridLines(page);
    } catch (err) {
        console.error("Lattice table detection failed, falling back to text-based table detection:", err);
        return { fields: [], regions: [] };
    }

    const allFields = [];
    const regions = [];
    for (const grid of grids) {
        if (!grid.rowsY?.length || !grid.colsX?.length) continue;
        const { fields, region } = buildFieldsFromTableGrid(grid, rawBlocks, pageNum, usedNames);
        if (fields.length > 0 && region) {
            allFields.push(...fields);
            regions.push(region);
        }
    }
    return { fields: allFields, regions };
}

function detectUnderlineFields(grid, rawBlocks, pageNum, usedNames, existingFields) {
    const fields = [];
    const horizontalLines = grid?.horizontalLines || [];
    const verticalLines = grid?.verticalLines || [];

    for (const line of horizontalLines) {
        const x = line.start / 2;
        const width = (line.end - line.start) / 2;
        const y = line.offset / 2;
        if (width < 40) continue;

        // Table borders have several vertical intersections. A lone rule is
        // more likely to be an underline or a single blank form boundary.
        const intersections = verticalLines.filter(v => {
            const vx = v.offset / 2;
            return vx >= x - 3 && vx <= x + width + 3;
        }).length;
        if (intersections >= 3) continue;

        const pairedBoundary = horizontalLines.find(other =>
            other.offset > line.offset &&
            other.offset - line.offset >= 24 &&
            other.offset - line.offset <= 160 &&
            Math.abs(other.start - line.start) <= 8 &&
            Math.abs(other.end - line.end) <= 8
        );
        const endpointIntersections = verticalLines.filter(v => {
            const vx = v.offset / 2;
            return Math.abs(vx - x) <= 3 || Math.abs(vx - (x + width)) <= 3;
        }).length;
        if (pairedBoundary && endpointIntersections >= 2) {
            // A closed rectangle is one field, not two underline fields.
            if (line.offset > pairedBoundary.offset) continue;
        }

        const isBox = Boolean(pairedBoundary && endpointIntersections >= 2);
        const fieldHeight = isBox
            ? Math.round((pairedBoundary.offset - line.offset) / 2)
            : 22;
        const candidate = {
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(isBox ? y : y - 22)),
            width: Math.round(width),
            height: Math.max(16, fieldHeight),
            page: pageNum
        };
        if (candidate.width < 40 || isOverlapping(candidate, existingFields, 0.2) ||
            isOverlapping(candidate, fields, 0.5)) continue;

        const nearbyLabel = rawBlocks
            .filter(tb => tb.y + tb.height <= y + 3 && tb.y + tb.height >= y - 45 &&
                tb.x + tb.width <= x + 12 && x - (tb.x + tb.width) <= 180)
            .sort((a, b) => (y - (a.y + a.height)) - (y - (b.y + b.height)))[0];
        const label = nearbyLabel?.str || "";
        // A standalone decorative rule has no form affordance. Require a
        // nearby, non-banner label unless the pixels clearly form a closed box.
        if (!isBox && (!label || isUniversalStaticText(label))) continue;
        const sem = resolveSemanticProps(label || "field", "textField", usedNames);
        fields.push({
            id: generateFieldId(),
            type: /signature|sign\s*here/i.test(label) ? "signature" : "textField",
            name: sem.name,
            x: candidate.x,
            y: candidate.y,
            width: candidate.width,
            height: candidate.height,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            detectedBy: "boundary_underline"
        });
    }
    return fields;
}

// ============================================================================
// 4. DETECTION PIPELINE
// ============================================================================
function detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, existingFields = [], preRegisteredTableRegions = []) {
    const fields = [...existingFields];
    const seedCount = existingFields.length;
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textLines = clusterIntoLines(rawBlocks);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Standalone & Labelled Checkboxes & Radios (with Fieldset Groups)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        // Skip date format placeholder brackets like [ YYYY - MM - DD ]
        if (/\[\s*(?:yyyy|mm|dd)[^\]]*\]/i.test(line.str)) {
            continue;
        }

        // Detect group prompt / legend if line starts with "Prompt:" before choices
        let linePrompt = "";
        const colonIdx = line.str.indexOf(":");
        if (colonIdx !== -1) {
            const beforeColon = line.str.slice(0, colonIdx).trim();
            if (beforeColon.length < 35 && !isUniversalStaticText(beforeColon)) {
                linePrompt = beforeColon;
            }
        }

        let wIdx = 0;
        while (wIdx < line.items.length) {
            const item = line.items[wIdx];
            const str = item.str.trim();

            const isDiscreteSymbol = str === "☐" || str === "□" || str === "✓" || str === "✔" || str === "○" || str === "●" || str === "■" || str === "☑";
            const isBracketPair = (str === "[" && wIdx + 1 < line.items.length && line.items[wIdx + 1].str === "]") || /^\[\s*\]$/.test(str);
            const isParenPair = (str === "(" && wIdx + 1 < line.items.length && line.items[wIdx + 1].str === ")") || /^\(\s*\)$/.test(str);

            const isOpen = isDiscreteSymbol || isBracketPair || isParenPair;
            if (isOpen) {
                const markerX = item.x;
                const markerY = item.y;
                const markerType = (str === "(" || str === "○" || str === "●" || isParenPair) ? "radioGroup" : "checkBox";

                // Advance index past closing bracket/paren if separate item
                if (wIdx + 1 < line.items.length && (line.items[wIdx + 1].str === ")" || line.items[wIdx + 1].str === "]")) {
                    wIdx++;
                }

                let optLabel = "";
                if (wIdx + 1 < line.items.length && !["(", "[", "☐", "□", "✓", "✔", "○", "●", "■", "☑"].includes(line.items[wIdx + 1].str)) {
                    optLabel = line.items[wIdx + 1].str;
                    if (wIdx + 2 < line.items.length && !["(", "[", "☐", "□", "✓", "✔", "○", "●", "■", "☑", ":"].includes(line.items[wIdx + 2].str)) {
                        optLabel += " " + line.items[wIdx + 2].str;
                    }
                } else {
                    optLabel = "option";
                }

                pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, "affordance1_checkbox_radio");
            } else if (str.length > 3) {
                // Slow path: the marker wasn't its own isolated text item — it's
                // embedded inside a longer run (e.g. pdf.js/the source PDF emitted
                // "[ ] Hardware Malfunction / Physical Repair" as ONE text item).
                // The exact-match checks above never see this, so without this
                // fallback the entire line silently gets no field at all. Scan the
                // raw item string for marker patterns and estimate their on-page
                // position proportionally within the item's bounding box.
                const embeddedMatches = [...item.str.matchAll(/(\[\s*\]|\(\s*\)|[☐□✓✔☑○●■])/g)];
                for (const m of embeddedMatches) {
                    const markerStr = m[0];
                    const markerType = /^\(|[○●]/.test(markerStr) ? "radioGroup" : "checkBox";
                    const charFrac = item.str.length > 0 ? (m.index / item.str.length) : 0;
                    const markerX = Math.round(item.x + charFrac * item.width);
                    const markerY = item.y;

                    let optLabel = item.str.slice(m.index + markerStr.length).trim();
                    optLabel = optLabel.split(/\s+/).slice(0, 4).join(" ");
                    if (!optLabel && wIdx + 1 < line.items.length) {
                        optLabel = line.items[wIdx + 1].str;
                    }
                    if (!optLabel) optLabel = "option";

                    pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, "affordance1_checkbox_radio_embedded");
                }
            }
            wIdx++;
        }

        function pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, detectedBy) {
            if (isUniversalStaticText(optLabel)) return;
            const isRadio = markerType === "radioGroup";
            const effectiveLabel = linePrompt ? (isRadio ? linePrompt : `${linePrompt} ${optLabel}`) : optLabel;
            const sem = resolveSemanticProps(effectiveLabel, isRadio ? "radioGroup" : "checkBox", isRadio ? new Set() : usedNames);

            const newField = {
                id: generateFieldId(),
                type: isRadio ? "radioGroup" : "checkBox",
                name: sem.name,
                value: optLabel,
                x: Math.max(10, markerX),
                y: Math.max(10, markerY),
                width: 16,
                height: 16,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: "",
                dataFormat: "text",
                detectedBy: detectedBy
            };

            if (!isOverlapping(newField, fields, 0.4)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 2: Key-Value Prompts with Colons (Label: _____)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (isUniversalStaticText(text)) continue;

        const promptMatches = [...text.matchAll(/([a-zA-Z0-9\s\/\(\)\.\-\#\$\&]+?):/g)];
        for (let i = 0; i < promptMatches.length; i++) {
            const m = promptMatches[i];
            const cleanLabel = m[1].trim();
            if (isUniversalStaticText(cleanLabel)) continue;

            const textAfterColon = text.slice(m.index + m[0].length).trim();

            // 1. Skip if choices (checkboxes/radios) immediately follow
            if (/^(?:\[\s*\]|\(\s*\)|[☐□✓✔☑○●■])/.test(textAfterColon)) continue;
            if (/select\s*all|select\s*one/i.test(cleanLabel)) continue;

            // 2. Skip if this is already-filled static text (e.g. "REF: FRM-7745", "REVISION: 2.4", "STATUS: BLANK")
            const nextPromptInLine = textAfterColon.search(/[a-zA-Z0-9\s\/\(\)\.\-\#\$\&]+?:/);
            const valueChunk = nextPromptInLine !== -1 ? textAfterColon.slice(0, nextPromptInLine).trim() : textAfterColon;
            const isAlreadyFilledStatic = valueChunk.length > 0 && !valueChunk.startsWith("_") && !valueChunk.startsWith("-") && !valueChunk.startsWith(".");
            if (isAlreadyFilledStatic) continue;

            const isSig = /signature|sign\s*here/i.test(cleanLabel);
            const isDate = /date|dob|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i.test(cleanLabel);
            const isMulti = /comments|notes|remarks|responsibilities|description/i.test(cleanLabel);

            // Find physical right edge of THIS specific prompt
            const matchEnd = m.index + m[0].length;
            let charOffset = 0;
            let promptEndX = line.x + line.width;
            for (const it of line.items) {
                const itStart = charOffset;
                const itEnd = charOffset + it.str.length;
                if (matchEnd - 1 >= itStart && matchEnd - 1 <= itEnd) {
                    promptEndX = it.x + it.width;
                    break;
                }
                charOffset += it.str.length + 1;
            }

            const targetX = Math.round(promptEndX + 6);
            let targetY = Math.max(0, Math.round(line.y - (isSig ? 6 : 2)));
            let targetH = isSig ? 38 : (isMulti ? 50 : 20);

            // Strict horizontal collision avoidance: clamp available width against ALL text blocks on the page
            let maxAllowedX = pageWidth - 25;
            for (const tb of rawBlocks) {
                if (tb.x > targetX + 2) {
                    const vOverlap = Math.max(0, Math.min(targetY + targetH, tb.y + tb.height) - Math.max(targetY, tb.y));
                    if (vOverlap > 3) {
                        maxAllowedX = Math.min(maxAllowedX, tb.x);
                    }
                }
            }

            // Skip choice group headers (prompts with checkboxes directly below
            // them). Bounded to THIS prompt's own column (promptEndX..maxAllowedX)
            // rather than a fixed absolute pixel window — in a multi-column row
            // (e.g. "Manager:" | "Claim Period (Start):" | "Claim Period (End):" |
            // "Direct Deposit? [ ] YES [ ] NO"), a fixed +140px window can reach
            // into the NEXT column's checkboxes and wrongly skip a prompt that
            // has nothing to do with them.
            const hasCheckboxesBelow = rawBlocks.some(tb => {
                const isBelow = tb.y > line.y && (tb.y - line.y) <= 22;
                const isAligned = tb.x >= promptEndX - 15 && tb.x < maxAllowedX;
                const isBox = /^[(\[]|☐|□|✓|✔|☑|○|●|■/.test(tb.str);
                return isBelow && isAligned && isBox;
            });
            if (hasCheckboxesBelow) continue;

            const availableW = maxAllowedX - targetX - 8;
            if (availableW < 30) {
                // Insufficient space before next column / text; avoid label collision
                continue;
            }

            const sem = resolveSemanticProps(cleanLabel, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);
            const fieldType = isSig ? "signature" : (isDate ? "dateField" : sem.type);
            const fieldName = sem.name;
            const isSingleOnLine = (maxAllowedX >= pageWidth - 45);

            // Calculate optimal natural field width
            let preferredW = 160;
            if (isDate || /date|dob/i.test(fieldName)) {
                preferredW = 95;
            } else if (isSig) {
                preferredW = 180;
            } else if (/phone|tel|fax|mobile/i.test(fieldName)) {
                preferredW = 130;
            } else if (/state/i.test(fieldName)) {
                preferredW = 55;
            } else if (/zip|postal|code/i.test(fieldName)) {
                preferredW = 75;
            } else if (/ssn|social|tax_id|ein/i.test(fieldName)) {
                preferredW = 110;
            } else if (/amount|price|unit|qty|quantity/i.test(fieldName)) {
                preferredW = 85;
            } else if (isMulti || (isSingleOnLine && /comments|notes|description|responsibilities|address|street/i.test(fieldName))) {
                preferredW = Math.min(380, availableW);
            }

            const targetW = Math.max(35, Math.min(preferredW, availableW));

            // Strict vertical collision avoidance: clamp targetH against text blocks below
            let maxAllowedY = pageHeight - 25;
            for (const tb of rawBlocks) {
                if (tb.y > targetY + 4) {
                    const hOverlap = Math.max(0, Math.min(targetX + targetW, tb.x + tb.width) - Math.max(targetX, tb.x));
                    if (hOverlap > 8) {
                        maxAllowedY = Math.min(maxAllowedY, tb.y);
                    }
                }
            }
            // Also clamp against the next line of text ANYWHERE on the page,
            // regardless of x-overlap. In a stacked label:value block (e.g. a
            // multi-line address section), each row's field starts at a
            // different x depending on how long that row's own label is — a
            // long label like "Attention / Accounts Payable:" pushes its
            // field's x well past where the next row's (shorter) label text
            // sits, so the x-overlap check above never sees it and the
            // field's default height is free to bleed down into the next
            // row's space, colliding with (and silently dropping) that row's
            // own field. A field should never extend past the next line of
            // text on the page, whatever its x-position.
            let nextLineY = null;
            for (const otherLine of textLines) {
                if (otherLine.y > line.y + 2 && (nextLineY === null || otherLine.y < nextLineY)) {
                    nextLineY = otherLine.y;
                }
            }
            if (nextLineY !== null) {
                maxAllowedY = Math.min(maxAllowedY, nextLineY - 2);
            }
            targetH = Math.max(16, Math.min(targetH, maxAllowedY - targetY - 2));

            const newField = {
                id: generateFieldId(),
                type: fieldType,
                name: fieldName,
                x: Math.max(10, targetX),
                y: targetY,
                width: Math.round(targetW),
                height: Math.round(targetH),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: isMulti || sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: isDate ? "date" : (sem.dataFormat || "text"),
                detectedBy: "affordance2_colon_prompt"
            };

            if (!isOverlapping(newField, fields, 0.35)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 3: Multi-Line Open Questions & Feedback Prompts (Question?)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (isUniversalStaticText(text)) continue;

        if (/\?$/.test(text) && !text.includes(":") && !/(\[\s*\]|\(\s*\)|[☐□✓✔☑○●■])/.test(text)) {
            // Skip if question is followed by choice markers anywhere on or below
            const hasRatingScaleBelow = rawBlocks.some(tb => {
                return tb.y > line.y && tb.y <= line.y + 40 && (/^[(\[]|☐|□|✓|✔|☑|○|●|■/.test(tb.str));
            });
            if (hasRatingScaleBelow) continue;

            const targetAreaY = Math.max(10, Math.round(line.y + line.height + 2));

            // Clamp height against the next text block below
            let nextBlockY = viewport.height - 35;
            for (const tb of rawBlocks) {
                if (tb.y > targetAreaY + 2) {
                    nextBlockY = Math.min(nextBlockY, tb.y);
                }
            }

            const availH = Math.round(nextBlockY - targetAreaY - 6);
            if (availH < 18) continue; // Not enough vertical room without overlapping next question

            const sem = resolveSemanticProps(text.slice(0, 30), "textField", usedNames);
            const areaField = {
                id: generateFieldId(),
                type: "textField",
                name: sem.name,
                x: Math.max(10, line.x),
                y: targetAreaY,
                width: Math.round(pageWidth - line.x - 45),
                height: Math.min(45, Math.max(22, availH)),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: true,
                autofill: "",
                dataFormat: "text",
                detectedBy: "affordance3_open_question"
            };

            if (!isOverlapping(areaField, fields, 0.35)) {
                fields.push(areaField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 4: Table Grid Line Items (Invoices, POs, Estimates, Orders)
    // ------------------------------------------------------------------------
    // Guards against detecting the SAME table more than once. Any other line
    // on the page that happens to contain 2+ column keywords (a repeated
    // label, stray text near the table, etc.) would otherwise spin up an
    // independent second "table" with its own guessed boundaries and its own
    // synthetic row spacing — producing stray fields that don't line up with
    // the real grid, floating inside or just past it.
    const processedTableRegions = [...preRegisteredTableRegions];
    const regionsOverlap = (a, b) => {
        const xOverlap = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
        const yOverlap = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
        return xOverlap > 0 && yOverlap > 0;
    };

    for (const line of textLines) {
        const text = line.str.toLowerCase();
        if (line.items.length < 2) continue;

        const tableColDefs = TABLE_COL_DEFS;

        const matchedCols = [];
        for (const item of line.items) {
            for (const col of tableColDefs) {
                if (col.regex.test(item.str) && !matchedCols.some(m => m.id === col.id)) {
                    matchedCols.push({ ...col, x: item.x, width: item.width, y: item.y, height: item.height });
                    break;
                }
            }
        }

        // A table header line has at least 2 distinct column keywords
        if (matchedCols.length >= 2 && !text.includes(":")) {
            matchedCols.sort((a, b) => a.x - b.x);

            // Skip this header if it falls inside a table region we've
            // already built fields for — this is very likely a stray
            // repeated label rather than a genuinely separate table.
            const candidateRegion = {
                xMin: matchedCols[0].x - 10,
                xMax: matchedCols[matchedCols.length - 1].x + 130,
                yMin: line.y - 5,
                yMax: line.y + 400 // generous: real table body extends well below the header
            };
            if (processedTableRegions.some(r => regionsOverlap(r, candidateRegion))) {
                continue;
            }

            const columns = [];
            for (let c = 0; c < matchedCols.length; c++) {
                const current = matchedCols[c];
                const next = matchedCols[c + 1];
                const colStartX = Math.max(10, current.x - 4);
                const colEndX = next ? Math.max(colStartX + 25, next.x - 6) : Math.min(pageWidth - 25, current.x + 120);
                columns.push({
                    id: current.id,
                    name: current.name,
                    x: colStartX,
                    width: Math.max(25, colEndX - colStartX)
                });
            }

            const tableTopY = line.y + line.height + 4;
            let tableBottomY = pageHeight - 40;

            for (const tb of rawBlocks) {
                if (tb.y > tableTopY + 15) {
                    if (/^(?:subtotal|total|balance|amount\s*due|tax|vat|gst|discount|notes|terms|payment|authorized|signature|thank\s*you|eforms)/i.test(tb.str) || (tb.str.includes(":") && !tb.str.includes("http"))) {
                        tableBottomY = Math.min(tableBottomY, tb.y - 6);
                    }
                }
            }

            const tableHeight = tableBottomY - tableTopY;
            if (tableHeight >= 30) {
                // Record the real bounds of this table now that we know
                // them, so any later header line that overlaps this region
                // gets skipped instead of spawning a competing table.
                processedTableRegions.push({
                    xMin: columns[0].x - 10,
                    xMax: columns[columns.length - 1].x + columns[columns.length - 1].width + 10,
                    yMin: tableTopY - 5,
                    yMax: tableBottomY + 5
                });
                // Find existing row indices or placeholder rows
                const rowMarkers = rawBlocks.filter(tb => {
                    return tb.y >= tableTopY && tb.y <= tableBottomY && (/^\d+$/.test(tb.str) || /^\$\s*0(?:\.00)?$/.test(tb.str) || tb.str === "[");
                });

                let rowYs = [];
                if (rowMarkers.length >= 2) {
                    const sortedY = rowMarkers.map(m => m.y).sort((a, b) => a - b);
                    for (const y of sortedY) {
                        if (!rowYs.some(ry => Math.abs(ry - y) <= 14)) {
                            rowYs.push(y);
                        }
                    }

                    // Filter out any row marker separated by a large gap from the previous table rows
                    if (rowYs.length >= 2) {
                        const cleanedRowYs = [rowYs[0]];
                        const deltas = [];
                        for (let i = 1; i < rowYs.length; i++) {
                            deltas.push(rowYs[i] - rowYs[i - 1]);
                        }
                        deltas.sort((a, b) => a - b);
                        const medianDelta = deltas[Math.floor(deltas.length / 2)] || 22;

                        for (let i = 1; i < rowYs.length; i++) {
                            const gap = rowYs[i] - cleanedRowYs[cleanedRowYs.length - 1];
                            if (gap <= Math.max(34, medianDelta * 1.6)) {
                                cleanedRowYs.push(rowYs[i]);
                            } else {
                                // Table body has ended; stop accepting rows from below
                                break;
                            }
                        }
                        rowYs = cleanedRowYs;
                    }
                }

                if (rowYs.length === 0) {
                    const rowCount = Math.min(8, Math.max(2, Math.floor(tableHeight / 24)));
                    const rowHeight = tableHeight / rowCount;
                    for (let r = 0; r < rowCount; r++) {
                        rowYs.push(Math.round(tableTopY + r * rowHeight));
                    }
                }

                let cellHeight = 18;
                if (rowYs.length >= 2) {
                    const medianRowGap = (rowYs[rowYs.length - 1] - rowYs[0]) / (rowYs.length - 1);
                    cellHeight = Math.min(24, Math.max(15, Math.round(medianRowGap - 4)));
                }

                for (let rIdx = 0; rIdx < rowYs.length; rIdx++) {
                    const rowY = rowYs[rIdx];
                    const rowNum = rIdx + 1;

                    // Never place a field that bleeds past the bottom of the table
                    if (rowY + cellHeight > tableBottomY - 4) {
                        continue;
                    }

                    for (const col of columns) {
                        if (col.id === "item_no") continue;

                        const isCheckboxCol = (col.id === "taxable" || col.id === "receipt");
                        const cellType = isCheckboxCol ? "checkBox" : "textField";
                        const sem = resolveSemanticProps(`${col.name}_${rowNum}`, cellType, usedNames);

                        const cellWidth = isCheckboxCol ? 16 : col.width;
                        const cellX = isCheckboxCol ? Math.round(col.x + Math.max(0, (col.width - 16) / 2)) : col.x;
                        const currentCellH = isCheckboxCol ? 16 : cellHeight;

                        // Static text collision check: never place a field over existing static text
                        const textCollisions = rawBlocks.filter(tb => {
                            const overlapX = Math.max(0, Math.min(cellX + cellWidth, tb.x + tb.width) - Math.max(cellX, tb.x));
                            const overlapY = Math.max(0, Math.min(rowY + currentCellH, tb.y + tb.height) - Math.max(rowY, tb.y));
                            return overlapX > 2 && overlapY > 2;
                        });
                        if (textCollisions.some(tb => tb.str.replace(/[\s.,$]/g, "").length > 0)) {
                            continue;
                        }

                        const cellField = {
                            id: generateFieldId(),
                            type: cellType,
                            name: sem.name,
                            x: cellX,
                            y: rowY,
                            width: cellWidth,
                            height: cellHeight,
                            page: pageNum,
                            borderStyle: "solid",
                            fillStyle: "white",
                            multiline: false,
                            autofill: "",
                            dataFormat: (col.id === "amount" || col.id === "unit_price") ? "currency" : ((col.id === "qty") ? "number" : "text"),
                            detectedBy: `affordance4_table_col-${col.id}_row-${rowNum}`
                        };

                        if (!isOverlapping(cellField, fields, 0.35)) {
                            fields.push(cellField);
                        }
                    }
                }
            }
        }
    }

    return fields.slice(seedCount);
}

// ============================================================================
// 4. LINE CLUSTERING UTILITY (Font-Relative Tolerances)
// ============================================================================
function clusterIntoLines(blocks) {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => (Math.abs(a.y - b.y) <= 4 ? a.x - b.x : a.y - b.y));
    const lines = [];
    let currentLine = null;

    for (let b of sorted) {
        const fontH = Math.max(6, b.height || 12);

        if (!currentLine) {
            currentLine = { ...b, items: [b] };
        } else {
            const refFontH = Math.max(6, currentLine.height || fontH);
            const baselineTolerance = Math.max(6, refFontH * 0.5);
            const gapTolerance = Math.max(60, refFontH * 4);

            const sameBaseline = Math.abs(currentLine.y - b.y) <= baselineTolerance;
            const reasonableGap = b.x >= currentLine.x && (b.x - (currentLine.x + currentLine.width)) <= gapTolerance;

            if (sameBaseline && reasonableGap) {
                currentLine.str += " " + b.str;
                currentLine.width = (b.x + b.width) - currentLine.x;
                currentLine.height = Math.max(currentLine.height, b.height);
                currentLine.items.push(b);
            } else {
                lines.push(currentLine);
                currentLine = { ...b, items: [b] };
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}
