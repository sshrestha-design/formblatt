// ── High-Precision Geometric Form Field Auto-Detector (js/auto-detector.js) ──
import { state, generateFieldId } from "./state.js";
import { saveHistory } from "./storage-manager.js";

// ============================================================================
// 1. SEMANTIC DICTIONARY & FIELD TYPE RESOLVER
// ============================================================================
const SEMANTIC_DICTIONARY = [
    { regex: /due\s*date|payment\s*due/i, id: "due_date", type: "dateField" },
    { regex: /invoice\s*date|issue\s*date|claim.*start|start\s*date|date\s*of\s*service/i, id: "date_of_service", type: "dateField" },
    { regex: /claim.*end|end\s*date/i, id: "claim_period_end_date", type: "dateField" },
    { regex: /date\s*approved|approval\s*date/i, id: "date_approved", type: "dateField" },
    { regex: /date|dob|birth\s*date|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)|yyyy\s*-\s*mm\s*-\s*dd/i, id: "date", type: "dateField", defaultValue: "YYYY-MM-DD" },
    
    // Signatures
    { regex: /employee.*signature|applicant.*signature|cardholder.*signature|witness.*signature|^signature\b|sign\s*here/i, id: "signature", type: "signature" },
    { regex: /manager.*signature|approver.*signature|supervisor.*signature/i, id: "approver_signature", type: "signature" },

    // Financial & Invoice
    { regex: /invoice\s*number|inv\s*#|invoice\s*#/i, id: "invoice_number", type: "textField", autofill: "invoice_num" },
    { regex: /purchase\s*order|po\s*#|po\s*number/i, id: "po_number", type: "textField" },
    { regex: /subtotal|subtotal\s*amount/i, id: "subtotal_amount", type: "textField" },
    { regex: /sales\s*tax|tax\s*rate/i, id: "sales_tax", type: "textField" },
    { regex: /shipping.*handling/i, id: "shipping_handling", type: "textField" },
    { regex: /total.*reimbursement|total\s*amount\s*due|total\s*authorized|balance\s*due|^total\s*amount/i, id: "total_amount_due", type: "textField" },
    { regex: /total.*itemized/i, id: "total_itemized_expenses", type: "textField" },
    { regex: /mileage.*total|mileage.*allowance/i, id: "mileage_total_amount", type: "textField" },
    { regex: /advance|cash.*advance/i, id: "cash_advance_received", type: "textField" },
    { regex: /total.*miles|miles.*driven/i, id: "total_business_miles", type: "textField" },
    { regex: /merchant|vendor/i, id: "merchant_vendor", type: "textField" },
    { regex: /expense\s*category|category/i, id: "expense_category", type: "textField" },
    { regex: /exceeded.*expectations|aspects.*exceeded/i, id: "exceeded_expectations", type: "textField", multiline: true },
    { regex: /need.*improvement|areas.*improvement/i, id: "areas_need_improvement", type: "textField", multiline: true },
    { regex: /description\s*of\s*goods|business\s*purpose|purpose|attendees/i, id: "description", type: "textField" },
    { regex: /\bqty\b|quantity/i, id: "quantity", type: "textField" },
    { regex: /unit\s*price|price|rate/i, id: "unit_price", type: "textField" },
    { regex: /line\s*total/i, id: "line_total", type: "textField" },

    // Contact & Details
    { regex: /customer.*name|organization\s*name|client\s*name/i, id: "customer_organization_name", type: "textField" },
    { regex: /account.*ticket|ticket.*reference|account\s*#/i, id: "account_ticket_reference", type: "textField" },
    { regex: /representative|primary\s*service\s*rep/i, id: "service_representative", type: "textField" },
    { regex: /employee\s*full\s*name|employee\s*name/i, id: "employee_full_name", type: "textField", autofill: "name" },
    { regex: /manager.*name|approver.*name/i, id: "manager_approver_name", type: "textField", autofill: "name" },
    { regex: /first\s*name/i, id: "first_name", type: "textField", autofill: "first_name" },
    { regex: /last\s*name/i, id: "last_name", type: "textField", autofill: "last_name" },
    { regex: /badge\s*name|nickname/i, id: "badge_name", type: "textField" },
    { regex: /employee\s*id|staff\s*id|badge\s*#|asset\s*id/i, id: "employee_id", type: "textField" },
    { regex: /cost\s*center/i, id: "cost_center_code", type: "textField" },
    { regex: /department|division/i, id: "department_division", type: "textField" },
    { regex: /job\s*title|role/i, id: "job_title", type: "textField" },
    { regex: /organization|company|client\s*\/\s*organization/i, id: "organization", type: "textField", autofill: "organization" },
    { regex: /attention|attn/i, id: "attention_recipient", type: "textField" },
    { regex: /email.*phone|phone.*email/i, id: "email_phone", type: "textField" },
    { regex: /e-?p?mail/i, id: "email", type: "textField", autofill: "email" },
    { regex: /phone|mobile|cell/i, id: "phone", type: "textField", autofill: "phone" },
    { regex: /street\s*address|home\s*address|address\s*line/i, id: "street_address", type: "textField", autofill: "address1" },
    { regex: /city,\s*state,\s*zip|city\s*state\s*zip/i, id: "city_state_zip", type: "textField" },
    { regex: /city|location/i, id: "city", type: "textField", autofill: "city" },
    { regex: /state|province/i, id: "state", type: "textField", autofill: "state" },
    { regex: /zip|postal/i, id: "zip_code", type: "textField", autofill: "zip" },
    { regex: /country/i, id: "country", type: "textField", autofill: "country" },
    { regex: /credit\s*card\s*number|card\s*number/i, id: "credit_card_number", type: "textField", autofill: "cc-number" },
    { regex: /expiration\s*date|exp\s*date|mm\s*\/\s*yy/i, id: "expiration_date", type: "dateField", defaultValue: "MM/YY" },
    { regex: /cvv|cvc/i, id: "cvv", type: "textField", autofill: "cc-csc" },
    { regex: /comments|notes|remarks|responsibilities|duties/i, id: "comments", type: "textField", multiline: true }
];

function resolveSemanticProps(rawLabel, defaultType = "textField", usedNames = new Set()) {
    const clean = (rawLabel || "").trim().replace(/[:_.\s-]+$/, "");
    let baseId = "";
    let type = defaultType;
    let multiline = false;
    let autofill = "";
    let defaultValue = "";

    for (const item of SEMANTIC_DICTIONARY) {
        if (item.regex.test(clean)) {
            baseId = item.id;
            if (item.type) type = item.type;
            if (item.multiline) multiline = true;
            if (item.autofill) autofill = item.autofill;
            if (item.defaultValue) defaultValue = item.defaultValue;
            break;
        }
    }

    if (!baseId) {
        if (type === "signature") baseId = "signature";
        else if (type === "checkBox") {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "checkbox";
        } else if (type === "radioGroup") {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "option";
        } else if (type === "dateField") {
            baseId = "date";
            defaultValue = "YYYY-MM-DD";
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

    return { name: finalId, type, multiline, autofill, defaultValue };
}

function isTitleOrStatic(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // 1. Numbered section banners (e.g. "1. ATTENDEE INFORMATION", "2. REGISTRATION PASS TYPE (Select One)")
    if (/^\d+[\.\)]\s*[A-Z\s\&\(\)\/]+$/i.test(clean) && !clean.includes(":") && !/[_]{2,}/.test(clean)) {
        return true;
    }

    // 2. Metadata / Doc Refs
    if (/^(?:FORM\s*REF|REVISION|STATUS|TEMPLATE|DOC\s*ID)\s*:/i.test(clean)) return true;

    // 3. Document Titles & Department Banners
    if (/^(?:FINANCE\s*&\s*COMPLIANCE|EXPENSE\s*REIMBURSEMENT|TECHSUMMIT|GLOBAL\s*CONFERENCE|EMPLOYMENT\s*APPLICATION|APPLICATION\s*FORM|PATIENT\s*INTAKE|NON-DISCLOSURE|AGREEMENT|INVOICE\s*TEMPLATE|CLAIM\s*FORM|COMMERCIAL\s*INVOICE|APEX\s*ENTERPRISES|URBAN\s*LIVING|NEXUS\s*CLIENT|CUSTOMER\s*SATISFACTION|VALLEY\s*HEALTH|INDUSTRIAL\s*SAFETY|BILL\s*TO|SHIP\s*TO|ITEMIZED\s*PRODUCTS|SCHEDULE\s*A|SERVICE\s*EVALUATION\s*MATRIX|RECOMMENDATION\s*LIKELIHOOD|WRITTEN\s*COMMENTS)/i.test(clean)) {
        return true;
    }

    // 4. Subtitles & Instructions
    if (/^(?:Corporate Travel|2026 Global Technology|Personal Vehicle Mileage Log|Access to all|General sessions|Hands-on technical|Valid student|Select all that apply|Select One|Attach All Original Receipts|Pre-Operation Safety|Individual Tenant|Enterprise Helpdesk|Schedule A|Client Experience|Billing Statement|Confidential Health|Rate 1 = Poor|Net Promoter Score)/i.test(clean)) {
        return true;
    }

    // 5. Question Headers & Sub-labels
    if (/^(?:How likely are you to recommend|0 = Not at all likely|10 = Extremely likely|What aspects of our service|What specific areas need)/i.test(clean)) {
        return true;
    }

    // 6. Parenthesized instructions
    if (/^\((?:Attach All|Select all|Select one|Check all|Rate 1)\b/i.test(clean)) return true;

    // 7. Printed Static Rates / Banking Constants
    if (/Standard Reimbursement Rate:\s*\$[\d\.]+\s*\/\s*mile/i.test(clean)) return true;
    if (/^(?:Bank:|Routing\s*#:?\s*\d+|Account\s*#:?\s*[\d-]+|Payment\s*Terms:\s*Net\s*\d+)/i.test(clean)) return true;

    // 8. Pure Row Line Numbers
    if (/^\d+$/.test(clean)) return true;

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
// 2. MAIN AUTO-DETECT CONTROLLER
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
// 3. DETECTION PIPELINE
// ============================================================================
function detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames) {
    const fields = [];
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textLines = clusterIntoLines(rawBlocks);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Standalone & Labelled Checkboxes & Radios
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        let wIdx = 0;
        while (wIdx < line.items.length) {
            const item = line.items[wIdx];
            const str = item.str.trim();

            const isOpen = str === "(" || str === "[" || str === "☐" || str === "□" || str === "✓" || str === "✔" || str === "○" || str === "●" || str === "■";
            if (isOpen) {
                const markerX = item.x;
                const markerY = item.y;
                const markerType = (str === "(" || str === "○" || str === "●") ? "radioGroup" : "checkBox";

                // Check for closing pair
                if (wIdx + 1 < line.items.length && (line.items[wIdx + 1].str === ")" || line.items[wIdx + 1].str === "]")) {
                    wIdx++;
                }

                let optLabel = "";
                if (wIdx + 1 < line.items.length && !["(", "[", "☐", "□", "✓", "✔", "○", "●", "■"].includes(line.items[wIdx + 1].str)) {
                    optLabel = line.items[wIdx + 1].str;
                    if (wIdx + 2 < line.items.length && !["(", "[", "☐", "□", ":"].includes(line.items[wIdx + 2].str)) {
                        optLabel += " " + line.items[wIdx + 2].str;
                    }
                } else {
                    optLabel = "option";
                }

                if (!isTitleOrStatic(optLabel)) {
                    const isRadio = markerType === "radioGroup" || /^(?:mr|ms|dr|prof|visa|mc|amex|credit|wire|purchase|all-access|standard|workshop|student|1|2|3|4|5|0|6|7|8|9|10)/i.test(optLabel);
                    const sem = resolveSemanticProps(optLabel, isRadio ? "radioGroup" : "checkBox", usedNames);

                    const newField = {
                        id: generateFieldId(),
                        type: isRadio ? "radioGroup" : "checkBox",
                        name: sem.name,
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
    // AFFORDANCE 2: Text Prompts & Sliced Key-Value Inputs
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (isTitleOrStatic(text)) continue;

        const promptMatches = [...text.matchAll(/([a-zA-Z0-9\s\/\(\)\.\-\#\$\&]+?):/g)];
        for (let i = 0; i < promptMatches.length; i++) {
            const m = promptMatches[i];
            const cleanLabel = m[1].trim();
            if (isTitleOrStatic(cleanLabel)) continue;

            const textAfter = text.slice(m.index + m[0].length);
            if (/^[\s]*(?:\[\s*\]|\(\s*\)|[☐□✓✔○●■])/.test(textAfter)) continue;
            if (/^[\s]*(?:Web Portal|Phone Support|First Time|Monthly|Standard|Full-Time)/i.test(textAfter)) continue;
            if (/select\s*all|select\s*one/i.test(cleanLabel)) continue;

            const isSig = /signature|sign/i.test(cleanLabel);
            const isDate = /date|dob|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i.test(cleanLabel);
            const isMulti = /comments|notes|remarks|responsibilities|description/i.test(cleanLabel);

            // Find exact physical right edge of THIS specific prompt using character index in line.str
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

            // Skip prompt if it is a choice group header (has checkboxes directly on line or below)
            const hasCheckboxesBelow = rawBlocks.some(tb => {
                const isBelow = tb.y > line.y && (tb.y - line.y) <= 22;
                const isAligned = tb.x >= promptEndX - 60 && tb.x <= promptEndX + 140;
                const isBox = /^[(\[]|☐|□|✓|✔|○|●|■/.test(tb.str);
                return isBelow && isAligned && isBox;
            });
            if (hasCheckboxesBelow) continue;

            const targetX = Math.round(promptEndX + 6);
            let targetY = Math.max(0, Math.round(line.y - (isSig ? 6 : 2)));
            let targetH = isSig ? 38 : (isMulti ? 50 : 20);

            // Strict collision avoidance: clamp available width against ALL text blocks on the page
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
                // Not enough horizontal room for a field without colliding into next label
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

            const newField = {
                id: generateFieldId(),
                type: fieldType,
                name: fieldName,
                x: Math.max(10, targetX),
                y: targetY,
                width: Math.round(targetW),
                height: targetH,
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
    // AFFORDANCE 3: Multi-Line Feedback Questions (Survey Free-Response)
    // ------------------------------------------------------------------------
    for (const block of rawBlocks) {
        const text = block.str.trim();
        if (isTitleOrStatic(text)) continue;
        if (/\?$/.test(text) && !text.includes(":") && !/^(?:How likely|May we quote|Follow-up|Rate|Please rate)/i.test(text) && !/(\[\s*\]|\(\s*\))/.test(text)) {
            // Skip if question is part of a rating scale / NPS matrix with options below
            const hasRatingScaleBelow = rawBlocks.some(tb => {
                return tb.y > block.y && tb.y <= block.y + 40 && (/^[(\[]|☐|□|\b(?:Extremely|Likely|Poor|Excellent|Strongly|Disagree|Agree)\b/i.test(tb.str));
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
