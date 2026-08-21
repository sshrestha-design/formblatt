// ── High-Precision Geometric Form Field Auto-Detector (js/auto-detector.js) ──
import { state, generateFieldId } from "./state.js";
import { saveHistory } from "./storage-manager.js";

// ============================================================================
// 1. SEMANTIC DICTIONARY & FIELD TYPE RESOLVER
// ============================================================================
const SEMANTIC_DICTIONARY = [
    { regex: /due\s*date|payment\s*due/i, id: "due_date", type: "dateField" },
    { regex: /invoice\s*date|issue\s*date|claim.*start|start\s*date/i, id: "invoice_date", type: "dateField" },
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
    { regex: /description\s*of\s*goods|business\s*purpose|purpose|attendees/i, id: "description", type: "textField" },
    { regex: /\bqty\b|quantity/i, id: "quantity", type: "textField" },
    { regex: /unit\s*price|price|rate/i, id: "unit_price", type: "textField" },
    { regex: /line\s*total/i, id: "line_total", type: "textField" },

    // Contact & Details
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
    if (/^(?:FINANCE\s*&\s*COMPLIANCE|EXPENSE\s*REIMBURSEMENT|TECHSUMMIT|GLOBAL\s*CONFERENCE|EMPLOYMENT\s*APPLICATION|APPLICATION\s*FORM|PATIENT\s*INTAKE|NON-DISCLOSURE|AGREEMENT|INVOICE\s*TEMPLATE|CLAIM\s*FORM|COMMERCIAL\s*INVOICE|APEX\s*ENTERPRISES|URBAN\s*LIVING|NEXUS\s*CLIENT|VALLEY\s*HEALTH|INDUSTRIAL\s*SAFETY|BILL\s*TO|SHIP\s*TO|ITEMIZED\s*PRODUCTS|SCHEDULE\s*A)/i.test(clean)) {
        return true;
    }

    // 4. Subtitles & Instructions
    if (/^(?:Corporate Travel|2026 Global Technology|Personal Vehicle Mileage Log|Access to all|General sessions|Hands-on technical|Valid student|Select all that apply|Select One|Attach All Original Receipts|Pre-Operation Safety|Individual Tenant|Enterprise Helpdesk|Schedule A|Client Experience|Billing Statement|Confidential Health)/i.test(clean)) {
        return true;
    }

    // 5. Parenthesized instructions
    if (/^\((?:Attach All|Select all|Select one|Check all|Rate 1)\b/i.test(clean)) return true;

    // 6. Printed Static Rates / Banking Constants
    if (/Standard Reimbursement Rate:\s*\$[\d\.]+\s*\/\s*mile/i.test(clean)) return true;
    if (/^(?:Bank:|Routing\s*#:?\s*\d+|Account\s*#:?\s*[\d-]+|Payment\s*Terms:\s*Net\s*\d+)/i.test(clean)) return true;

    // 7. Pure Row Line Numbers
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

            const vectorGeometry = await extractVectorGeometry(page, viewport);
            const pageFields = detectVisualAffordances(rawBlocks, vectorGeometry, viewport, pageNum, usedNames);
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
        
        // DO NOT select all fields to keep canvas clean & un-cluttered
        state.selectedFieldIds.clear();
        saveHistory();
        totalDetected = finalUnique.length;
    }

    return totalDetected;
}

// ============================================================================
// 3. VECTOR GEOMETRY EXTRACTOR (Table Grid Lines)
// ============================================================================
async function extractVectorGeometry(page, viewport) {
    const hLines = [];
    const vLines = [];
    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    try {
        const opList = await page.getOperatorList();
        if (!opList || !opList.fnArray) return { hLines, vLines };

        const { fnArray, argsArray } = opList;
        const OPS = (typeof pdfjsLib !== "undefined" && pdfjsLib.OPS) ? pdfjsLib.OPS : {};

        let matrix = [1, 0, 0, 1, 0, 0];
        const mStack = [];

        for (let i = 0; i < fnArray.length; i++) {
            const fn = fnArray[i];
            const args = argsArray[i];

            if (fn === OPS.save) mStack.push([...matrix]);
            else if (fn === OPS.restore) { if (mStack.length > 0) matrix = mStack.pop(); }
            else if (fn === OPS.transform && args) {
                const [a1, b1, c1, d1, e1, f1] = matrix;
                const [a2, b2, c2, d2, e2, f2] = args;
                matrix = [
                    a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
                    a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
                    a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1
                ];
            } else if (fn === OPS.constructPath && args) {
                const [pathOps, pathArgs] = args;
                let argIdx = 0;
                let lastX = 0, lastY = 0;

                for (let p = 0; p < pathOps.length; p++) {
                    const op = pathOps[p];
                    if (op === OPS.moveTo) {
                        lastX = pathArgs[argIdx++];
                        lastY = pathArgs[argIdx++];
                    } else if (op === OPS.lineTo) {
                        const curX = pathArgs[argIdx++];
                        const curY = pathArgs[argIdx++];
                        const dx = Math.abs(curX - lastX);
                        const dy = Math.abs(curY - lastY);

                        if (dx >= 35 && dy <= 3) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const tx = matrix[0] * minX + matrix[2] * minY + matrix[4];
                            const ty = matrix[1] * minX + matrix[3] * minY + matrix[5];
                            const canvasY = pageHeight - ty;
                            if (canvasY >= 35 && canvasY <= (pageHeight - 20)) {
                                hLines.push(Math.round(canvasY));
                            }
                        } else if (dy >= 18 && dx <= 3) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const tx = matrix[0] * minX + matrix[2] * minY + matrix[4];
                            if (tx >= 25 && tx <= (pageWidth - 20)) {
                                vLines.push(Math.round(tx));
                            }
                        }
                        lastX = curX;
                        lastY = curY;
                    } else if (op === OPS.rectangle) {
                        const rx = pathArgs[argIdx++];
                        const ry = pathArgs[argIdx++];
                        const rw = pathArgs[argIdx++];
                        const rh = pathArgs[argIdx++];
                        const tx = matrix[0] * rx + matrix[2] * ry + matrix[4];
                        const ty = matrix[1] * rx + matrix[3] * ry + matrix[5];
                        const boxW = Math.abs(rw * (matrix[0] || 1));
                        const boxH = Math.abs(rh * (matrix[3] || 1));
                        const canvasY = pageHeight - ty - boxH;

                        if (boxH <= 3 && boxW >= 35) hLines.push(Math.round(canvasY + boxH));
                        else if (boxW <= 3 && boxH >= 18) vLines.push(Math.round(tx));
                    }
                }
            } else if (fn === OPS.rectangle && args) {
                const [rx, ry, rw, rh] = args;
                const tx = matrix[0] * rx + matrix[2] * ry + matrix[4];
                const ty = matrix[1] * rx + matrix[3] * ry + matrix[5];
                const boxW = Math.abs(rw * (matrix[0] || 1));
                const boxH = Math.abs(rh * (matrix[3] || 1));
                const canvasY = pageHeight - ty - boxH;

                if (boxH <= 3 && boxW >= 35) hLines.push(Math.round(canvasY + boxH));
                else if (boxW <= 3 && boxH >= 18) vLines.push(Math.round(tx));
            }
        }
    } catch(err) {
        console.warn("Vector extraction warning:", err);
    }

    return {
        yLevels: [...new Set(hLines)].sort((a, b) => a - b),
        xLevels: [...new Set(vLines)].sort((a, b) => a - b)
    };
}

// ============================================================================
// 4. DETECTION PIPELINE
// ============================================================================
function detectVisualAffordances(rawBlocks, vectorGeometry, viewport, pageNum, usedNames) {
    const fields = [];
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textLines = clusterIntoLines(rawBlocks);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Checkbox & Radio Glyphs
    // ------------------------------------------------------------------------
    const cbGlyphRegex = /(\[\s*\]|\(\s*\)|[☐□✓✔✗✘\u25A0-\u25AF\u25CB-\u25EF\u25C6\u25C7\u25FC\u25FD\u25FE\u25FF\u2B1C\u2B1D\u2B24\u2B55\u2713\u2714\u2717\u2718\u2756]|\bTaxable\b)\s*([a-zA-Z0-9\s\/\(\)\,\.\-\+\$\#]+?)(?=(?:\[\s*\]|\(\s*\)|[☐□✓✔✗✘\u25A0-\u25AF\u25CB-\u25EF\u25C6\u25C7\u25FC\u25FD\u25FE\u25FF\u2B1C\u2B1D\u2B24\u2B55\u2713\u2714\u2717\u2718\u2756]|\b(?:First Name|Last Name|Job|Total|Date|Signature|Qty|Unit Price)\b|$|(?<=\s)[A-Z][a-zA-Z\s\/]+:))/g;

    for (const line of textLines) {
        const text = line.str.trim();
        let match;
        while ((match = cbGlyphRegex.exec(text)) !== null) {
            const optLabel = match[2].trim();
            if (isTitleOrStatic(optLabel)) continue;

            const charIdx = match.index;
            let charX = line.x;
            let runningLen = 0;
            for (const it of line.items) {
                if (charIdx >= runningLen && charIdx < runningLen + it.str.length + 1) {
                    const localOffset = charIdx - runningLen;
                    charX = Math.round(it.x + (localOffset / Math.max(1, it.str.length)) * it.width);
                    break;
                }
                runningLen += it.str.length + 1;
            }

            const charY = Math.round(line.y + (line.height - 16) / 2);
            const isRadio = match[1].includes("(") || /^(?:mr|ms|dr|prof|visa|mc|amex|credit|wire|purchase|all-access|standard|workshop|student|1|2|3|4|5)/i.test(optLabel);
            const sem = resolveSemanticProps(optLabel, isRadio ? "radioGroup" : "checkBox", usedNames);

            const newField = {
                id: generateFieldId(),
                type: isRadio ? "radioGroup" : "checkBox",
                name: sem.name,
                x: Math.max(10, charX),
                y: Math.max(10, charY),
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

    // ------------------------------------------------------------------------
    // AFFORDANCE 2: Prompts, Underlines & Sliced Inputs
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (isTitleOrStatic(text)) continue;

        // Match prompt colons
        const promptMatches = [...text.matchAll(/([a-zA-Z0-9\s\/\(\)\.\-\#\$\&]+?):/g)];
        for (let i = 0; i < promptMatches.length; i++) {
            const m = promptMatches[i];
            const cleanLabel = m[1].trim();
            if (isTitleOrStatic(cleanLabel)) continue;

            const textAfter = text.slice(m.index + m[0].length);
            if (/^[\s]*(?:\[\s*\]|\(\s*\)|[☐□✓✔○●■])/.test(textAfter)) {
                continue;
            }
            if (/select\s*all|select\s*one/i.test(cleanLabel)) continue;

            const matchStart = m.index;
            let startX = line.x;
            let runningLen = 0;
            for (const it of line.items) {
                if (matchStart >= runningLen && matchStart < runningLen + it.str.length + 1) {
                    const localOff = matchStart - runningLen;
                    startX = Math.round(it.x + (localOff / Math.max(1, it.str.length)) * it.width);
                    break;
                }
                runningLen += it.str.length + 1;
            }

            const labelW = Math.max(30, Math.round((m[0].length / Math.max(1, text.length)) * line.width));
            const isSig = /signature|sign/i.test(cleanLabel);
            const isDate = /date|dob|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i.test(cleanLabel);
            const isMulti = /comments|notes|remarks|responsibilities|description/i.test(cleanLabel);

            let targetX = startX + labelW + 4;
            let targetW = isDate ? 110 : (isSig ? 220 : (isMulti ? 320 : 160));
            let targetY = line.y + (isSig ? -10 : 0);
            let targetH = isSig ? 44 : (isMulti ? 55 : 22);

            // Clamp to next prompt
            if (i < promptMatches.length - 1) {
                const nextMatch = promptMatches[i + 1];
                const nextMatchStart = nextMatch.index;
                let nextX = line.x + line.width;
                let runL = 0;
                for (const it of line.items) {
                    if (nextMatchStart >= runL && nextMatchStart < runL + it.str.length + 1) {
                        const lOff = nextMatchStart - runL;
                        nextX = Math.round(it.x + (lOff / Math.max(1, it.str.length)) * it.width);
                        break;
                    }
                    runL += it.str.length + 1;
                }
                targetW = Math.min(targetW, Math.max(40, nextX - targetX - 6));
            } else {
                targetW = Math.min(targetW, pageWidth - targetX - 25);
            }

            const sem = resolveSemanticProps(cleanLabel, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);

            const newField = {
                id: generateFieldId(),
                type: isSig ? "signature" : (isDate ? "dateField" : sem.type),
                name: sem.name,
                x: Math.max(10, Math.round(targetX)),
                y: Math.max(10, Math.round(targetY)),
                width: Math.round(targetW),
                height: targetH,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: isMulti || sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: sem.dataFormat || "text",
                ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
            };

            if (!isOverlapping(newField, fields, 0.35)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 3: Structured Vector Table Cells (Grid Lines)
    // ------------------------------------------------------------------------
    const { yLevels, xLevels } = vectorGeometry;
    if (yLevels.length >= 2 && xLevels.length >= 2) {
        for (let rIdx = 0; rIdx < yLevels.length - 1; rIdx++) {
            const yTop = yLevels[rIdx];
            const yBot = yLevels[rIdx + 1];
            const rowH = yBot - yTop;
            if (rowH < 14 || rowH > 35) continue;

            for (let cIdx = 0; cIdx < xLevels.length - 1; cIdx++) {
                const xLeft = xLevels[cIdx];
                const xRight = xLevels[cIdx + 1];
                const colW = xRight - xLeft;
                if (colW < 25 || colW > (pageWidth * 0.45)) continue;

                // Check text inside cell
                const cellWords = rawBlocks.filter(tb => 
                    tb.x >= xLeft - 2 && (tb.x + tb.width) <= xRight + 4 &&
                    tb.y >= yTop - 2 && tb.y <= yBot + 2
                );
                const cellText = cellWords.map(w => w.str).join(" ").trim();
                if (isTitleOrStatic(cellText)) continue;

                const cellBox = { x: xLeft, y: yTop, width: colW, height: rowH };
                if (isOverlapping(cellBox, fields, 0.4)) continue;

                // Find column header above this cell
                let colHeader = "";
                for (const tb of rawBlocks) {
                    if (Math.abs(tb.x - xLeft) <= 30 && tb.y < yTop && (yTop - tb.y) <= 120 && !isTitleOrStatic(tb.str)) {
                        colHeader = tb.str;
                    }
                }

                const lbl = cellText || colHeader || "cell";
                if (isTitleOrStatic(lbl)) continue;

                const isDate = /date|dob/i.test(lbl);
                const sem = resolveSemanticProps(lbl, isDate ? "dateField" : "textField", usedNames);

                const newField = {
                    id: generateFieldId(),
                    type: isDate ? "dateField" : sem.type,
                    name: sem.name,
                    x: Math.max(10, Math.round(xLeft + 2)),
                    y: Math.max(10, Math.round(yTop + 2)),
                    width: Math.round(colW - 4),
                    height: Math.round(rowH - 4),
                    page: pageNum,
                    borderStyle: "solid",
                    fillStyle: "white",
                    multiline: sem.multiline || false,
                    autofill: sem.autofill || "",
                    dataFormat: "text",
                    ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
                };

                if (!isOverlapping(newField, fields, 0.35)) {
                    fields.push(newField);
                }
            }
        }
    }

    return fields;
}

// ============================================================================
// 5. LINE CLUSTERING UTILITY
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
