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
    
    // Notes & Multiline Freeform
    { regex: /comments|notes|remarks|description|explanation|justification|feedback|details/i, id: "comments", type: "textField", multiline: true }
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
        if (type === "signature") {
            baseId = "signature";
        } else if (type === "checkBox") {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "checkbox";
        } else if (type === "radioGroup") {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "option";
        } else if (type === "dateField") {
            baseId = "date";
        } else {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "field";
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

        return minArea > 0 && (overlapArea / minArea) > threshold;
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

            const pageFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames);
            newFields.push(...pageFields);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        state.fields = state.fields.filter(f => !pagesToScan.includes(f.page || 1));
        
        const finalUnique = [];
        for (let f of newFields) {
            if (!isOverlapping(f, finalUnique, 0.35)) {
                finalUnique.push(f);
            }
        }

        state.fields.push(...finalUnique);
        state.selectedFieldIds.clear();
        saveHistory();
        totalDetected = finalUnique.length;
    }

    return totalDetected;
}

// ============================================================================
// 4. DETECTION PIPELINE
// ============================================================================
function detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames) {
    const fields = [];
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textLines = clusterIntoLines(rawBlocks);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Standalone & Labelled Checkboxes & Radios (with Fieldset Groups)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
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

                if (!isUniversalStaticText(optLabel)) {
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
                        dataFormat: "text"
                    };

                    if (!isOverlapping(newField, fields, 0.4)) {
                        fields.push(newField);
                    }
                }
            }
            wIdx++;
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

            // Skip choice group headers (prompts with checkboxes directly below them)
            const hasCheckboxesBelow = rawBlocks.some(tb => {
                const isBelow = tb.y > line.y && (tb.y - line.y) <= 22;
                const isAligned = tb.x >= promptEndX - 60 && tb.x <= promptEndX + 140;
                const isBox = /^[(\[]|☐|□|✓|✔|☑|○|●|■/.test(tb.str);
                return isBelow && isAligned && isBox;
            });
            if (hasCheckboxesBelow) continue;

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
                dataFormat: isDate ? "date" : (sem.dataFormat || "text")
            };

            if (!isOverlapping(newField, fields, 0.35)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 3: Multi-Line Open Questions & Feedback Prompts (Question?)
    // ------------------------------------------------------------------------
    for (const block of rawBlocks) {
        const text = block.str.trim();
        if (isUniversalStaticText(text)) continue;

        if (/\?$/.test(text) && !text.includes(":") && !/(\[\s*\]|\(\s*\)|[☐□✓✔☑○●■])/.test(text)) {
            // Skip if question is part of a rating scale with choice markers below
            const hasRatingScaleBelow = rawBlocks.some(tb => {
                return tb.y > block.y && tb.y <= block.y + 40 && (/^[(\[]|☐|□|✓|✔|☑|○|●|■/.test(tb.str));
            });
            if (hasRatingScaleBelow) continue;

            const targetAreaY = Math.max(10, Math.round(block.y + block.height + 2));

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
                x: Math.max(10, block.x),
                y: targetAreaY,
                width: Math.round(pageWidth - block.x - 45),
                height: Math.min(45, Math.max(22, availH)),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: true,
                autofill: "",
                dataFormat: "text"
            };

            if (!isOverlapping(areaField, fields, 0.35)) {
                fields.push(areaField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 4: Table Grid Line Items (Invoices, POs, Estimates, Orders)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.toLowerCase();
        if (line.items.length < 2) continue;

        const tableColDefs = [
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
                    if (/^(?:subtotal|total|notes|terms|payment|authorized|signature)/i.test(tb.str) || (tb.str.includes(":") && !tb.str.includes("http"))) {
                        tableBottomY = Math.min(tableBottomY, tb.y - 6);
                    }
                }
            }

            const tableHeight = tableBottomY - tableTopY;
            if (tableHeight >= 30) {
                // Find existing row indices or placeholder rows
                const rowMarkers = rawBlocks.filter(tb => {
                    return tb.y >= tableTopY && tb.y <= tableBottomY && (/^\d+$/.test(tb.str) || /^\$\s*0(?:\.00)?$/.test(tb.str) || tb.str === "[");
                });

                let rowYs = [];
                if (rowMarkers.length >= 2) {
                    const sortedY = rowMarkers.map(m => m.y).sort((a, b) => a - b);
                    for (const y of sortedY) {
                        if (!rowYs.some(ry => Math.abs(ry - y) <= 6)) {
                            rowYs.push(y);
                        }
                    }
                }

                if (rowYs.length === 0) {
                    const rowCount = Math.min(8, Math.max(2, Math.floor(tableHeight / 24)));
                    const rowHeight = tableHeight / rowCount;
                    for (let r = 0; r < rowCount; r++) {
                        rowYs.push(Math.round(tableTopY + r * rowHeight));
                    }
                }

                for (let rIdx = 0; rIdx < rowYs.length; rIdx++) {
                    const rowY = rowYs[rIdx];
                    const rowNum = rIdx + 1;

                    for (const col of columns) {
                        if (col.id === "item_no" || col.id === "taxable") continue;

                        const sem = resolveSemanticProps(`${col.name}_${rowNum}`, "textField", usedNames);
                        const cellField = {
                            id: generateFieldId(),
                            type: "textField",
                            name: sem.name,
                            x: col.x,
                            y: rowY,
                            width: col.width,
                            height: 18,
                            page: pageNum,
                            borderStyle: "solid",
                            fillStyle: "white",
                            multiline: false,
                            autofill: "",
                            dataFormat: (col.id === "amount" || col.id === "unit_price") ? "currency" : ((col.id === "qty") ? "number" : "text")
                        };

                        if (!isOverlapping(cellField, fields, 0.35)) {
                            fields.push(cellField);
                        }
                    }
                }
            }
        }
    }

    return fields;
}

// ============================================================================
// 4. LINE CLUSTERING UTILITY
// ============================================================================
function clusterIntoLines(blocks) {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => (Math.abs(a.y - b.y) <= 4 ? a.x - b.x : a.y - b.y));
    const lines = [];
    let currentLine = null;

    for (let b of sorted) {
        if (!currentLine) {
            currentLine = { ...b, items: [b] };
        } else {
            const sameBaseline = Math.abs(currentLine.y - b.y) <= 6;
            const reasonableGap = b.x >= currentLine.x && (b.x - (currentLine.x + currentLine.width)) <= 40;

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
