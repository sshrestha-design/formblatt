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

// ============================================================================
// 2.5 EXISTING ACROFORM WIDGET PASSTHROUGH
// ============================================================================
async function getExistingWidgetFields(page, viewport, pageNum, usedNames) {
    let annotations;
    try {
        annotations = await page.getAnnotations({ intent: "display" });
    } catch (err) {
        console.warn("Failed to read annotations on page " + pageNum + ":", err);
        return [];
    }

    if (!Array.isArray(annotations)) return [];
    const widgets = annotations.filter(a => a.subtype === "Widget" && a.rect && a.fieldName);
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

        const sem = resolveSemanticProps(w.fieldName || w.alternativeText || "field", type, isRadio ? new Set() : usedNames);

        fields.push({
            id: generateFieldId(),
            type,
            name: sem.name,
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
            sourcedFrom: "acroform"
        });
    }

    return fields;
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

            // 1. Authoritative AcroForm passthrough — real widgets are trusted
            // as-is, but a page having SOME real widgets doesn't mean the
            // rest of the page has no blank fields left to detect. We run
            // geometric detection seeded with the widget rects as occupied space.
            const widgetFields = await getExistingWidgetFields(page, viewport, pageNum, usedNames);

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

            const geometricFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, widgetFields);
            newFields.push(...widgetFields, ...geometricFields);
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

// ============================================================================
// 4. DETECTION PIPELINE
// ============================================================================
function detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, existingFields = []) {
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
    const processedTableRegions = [];
    const regionsOverlap = (a, b) => {
        const xOverlap = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
        const yOverlap = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
        return xOverlap > 0 && yOverlap > 0;
    };

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
                    if (/^(?:subtotal|total|notes|terms|payment|authorized|signature)/i.test(tb.str) || (tb.str.includes(":") && !tb.str.includes("http"))) {
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
                        if (col.id === "item_no") continue;

                        const isCheckboxCol = (col.id === "taxable" || col.id === "receipt");
                        const cellType = isCheckboxCol ? "checkBox" : "textField";
                        const sem = resolveSemanticProps(`${col.name}_${rowNum}`, cellType, usedNames);

                        const cellWidth = isCheckboxCol ? 16 : col.width;
                        const cellX = isCheckboxCol ? Math.round(col.x + Math.max(0, (col.width - 16) / 2)) : col.x;

                        const cellField = {
                            id: generateFieldId(),
                            type: cellType,
                            name: sem.name,
                            x: cellX,
                            y: rowY,
                            width: cellWidth,
                            height: isCheckboxCol ? 16 : 18,
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
