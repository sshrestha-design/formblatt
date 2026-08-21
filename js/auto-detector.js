// ── Geometric-First PDF Form Field Auto-Detector (js/auto-detector.js) ──
// SimplePDF / Acrobat visual affordance architecture
import { state, generateFieldId } from "./state.js";
import { saveHistory } from "./storage-manager.js";

// ============================================================================
// 1. SEMANTIC DICTIONARY & AUTOFILL RESOLVER
// ============================================================================
const SEMANTIC_DICTIONARY = [
    // Invoice & Payment
    { regex: /invoice\s*n(?:o|um|umber)?|inv\s*#|factura/i, id: "invoice_number", title: "Invoice Number", type: "textField", autofill: "invoice_num" },
    { regex: /po\s*n(?:o|um|umber)?|p\.o\.\s*#|purchase\s*order/i, id: "po_number", title: "PO Number", type: "textField" },
    { regex: /due\s*date|payment\s*due/i, id: "due_date", title: "Due Date", type: "dateField" },
    { regex: /invoice\s*date|issue\s*date|date\s*of\s*issue/i, id: "invoice_date", title: "Invoice Date", type: "dateField" },
    { regex: /credit\s*card\s*number|card\s*number|account\s*number/i, id: "credit_card_number", title: "Credit Card Number", type: "textField", autofill: "cc-number" },
    { regex: /cardholder\s*(?:full\s*)?name|name\s*on\s*card/i, id: "cardholder_name", title: "Cardholder Name", type: "textField", autofill: "cc-name" },
    { regex: /expiration\s*date|exp\s*date|exp\s*\.?\s*date/i, id: "expiration_date", title: "Expiration Date", type: "dateField", autofill: "cc-exp" },
    { regex: /cvv|cvc|security\s*code/i, id: "cvv", title: "CVV / CVC", type: "textField", autofill: "cc-csc" },
    { regex: /billing\s*(?:street\s*)?address/i, id: "billing_address", title: "Billing Address", type: "textField", autofill: "address1" },
    { regex: /total\s*reimbursement|total\s*amount|total\s*authorized|balance\s*due|amount\s*due|^total\b/i, id: "total_amount", title: "Total Amount", type: "textField" },
    { regex: /total\s*itemized\s*expenses|itemized\s*expenses/i, id: "total_itemized_expenses", title: "Total Itemized Expenses", type: "textField" },
    { regex: /mileage\s*total|mileage\s*allowance/i, id: "mileage_total_amount", title: "Mileage Total Amount", type: "textField" },
    { regex: /less\s*cash\s*advance|cash\s*advance/i, id: "cash_advance_received", title: "Cash Advance Received", type: "textField" },
    { regex: /total\s*business\s*miles|miles\s*driven/i, id: "total_business_miles", title: "Total Business Miles", type: "textField" },

    // Expense & Claim Form Fields
    { regex: /employee\s*full\s*name|employee\s*name/i, id: "employee_full_name", title: "Employee Full Name", type: "textField", autofill: "name" },
    { regex: /employee\s*id|staff\s*id|badge\s*#/i, id: "employee_id", title: "Employee ID #", type: "textField" },
    { regex: /department|division/i, id: "department_division", title: "Department / Division", type: "textField", autofill: "organization-title" },
    { regex: /cost\s*center\s*code|cost\s*center/i, id: "cost_center_code", title: "Cost Center Code", type: "textField" },
    { regex: /manager\s*\/?\s*approver\s*name|manager\s*name|approver\s*name/i, id: "manager_approver_name", title: "Manager / Approver Name", type: "textField", autofill: "name" },
    { regex: /claim\s*period\s*\(?start\s*date\)?|start\s*date|claim\s*start/i, id: "claim_period_start_date", title: "Claim Period (Start Date)", type: "dateField" },
    { regex: /claim\s*period\s*\(?end\s*date\)?|end\s*date|claim\s*end/i, id: "claim_period_end_date", title: "Claim Period (End Date)", type: "dateField" },
    { regex: /direct\s*deposit\s*on\s*file|direct\s*deposit/i, id: "direct_deposit_on_file", title: "Direct Deposit on File", type: "checkBox" },

    // Employment & HR Fields
    { regex: /position\s*(?:applied\s*for|desired|title)|applied\s*position/i, id: "position_applied_for", title: "Position Applied For", type: "textField" },
    { regex: /desired\s*(?:salary|wage|pay)|hourly\s*(?:rate|wage)|pay\s*rate/i, id: "desired_salary", title: "Desired Salary", type: "textField" },
    { regex: /supervisor\s*(?:name\s*)?(?:&|\/|\s*and\s*)?\s*title|supervisor\s*name/i, id: "supervisor_name_title", title: "Supervisor Name & Title", type: "textField" },
    { regex: /key\s*responsibilities|responsibilities|job\s*duties|duties/i, id: "key_responsibilities", title: "Key Responsibilities", type: "textField", multiline: true },
    { regex: /reason\s*for\s*leaving/i, id: "reason_for_leaving", title: "Reason for Leaving", type: "textField", multiline: true },
    { regex: /previous\s*employer|employer\s*name|company\s*name/i, id: "employer_name", title: "Employer / Company Name", type: "textField", autofill: "organization" },
    { regex: /dates\s*employed|employment\s*dates/i, id: "dates_employed", title: "Dates Employed", type: "textField" },
    { regex: /starting\s*pay|starting\s*salary/i, id: "starting_pay", title: "Starting Pay", type: "textField" },
    { regex: /ending\s*pay|ending\s*salary/i, id: "ending_pay", title: "Ending Pay", type: "textField" },
    { regex: /high\s*school|college|university|school\s*name/i, id: "school_name", title: "School Name", type: "textField" },
    { regex: /degree\s*(?:&|\/|\s*and\s*)?\s*major|highest\s*degree|major/i, id: "degree_major", title: "Degree & Major", type: "textField" },
    { regex: /graduation\s*year/i, id: "graduation_year", title: "Graduation Year", type: "textField" },

    // Signatures & Dates
    { regex: /employee\s*certification\s*signature|employee\s*signature|applicant\s*signature|cardholder\s*\/?\s*attendee\s*signature|witness\s*signature|^signature\b|sign\s*here|authorized\s*sign/i, id: "signature", title: "Signature", type: "signature" },
    { regex: /manager\s*\/?\s*approver\s*signature|approver\s*signature|supervisor\s*signature/i, id: "approver_signature", title: "Approver Signature", type: "signature" },
    { regex: /date\s*approved|approval\s*date/i, id: "date_approved", title: "Date Approved", type: "dateField" },
    { regex: /^date\b|date\s*signed|today.?s\s*date|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i, id: "date_signed", title: "Date", type: "dateField" },

    // Person & Contact Fields
    { regex: /first\s*name/i, id: "first_name", title: "First Name", type: "textField", autofill: "first_name" },
    { regex: /last\s*name|surname/i, id: "last_name", title: "Last Name", type: "textField", autofill: "last_name" },
    { regex: /\bm\.?i\.?\b|middle\s*initial|middle\s*name/i, id: "middle_initial", title: "Middle Initial", type: "textField" },
    { regex: /full\s*legal\s*name|legal\s*name|full\s*name|^name\b/i, id: "full_name", title: "Full Name", type: "textField", autofill: "name" },
    { regex: /street\s*address|home\s*address|address\s*line/i, id: "street_address", title: "Street Address", type: "textField", autofill: "address1" },
    { regex: /city,\s*state,\s*postal\s*code|city,\s*state,\s*zip|city\s*state\s*zip/i, id: "city_state_zip", title: "City, State, Zip", type: "textField" },
    { regex: /city|location/i, id: "city", title: "City", type: "textField", autofill: "city" },
    { regex: /state|province/i, id: "state_region", title: "State", type: "textField", autofill: "state" },
    { regex: /postal\s*code|zip\s*code|zip\b/i, id: "zip_code", title: "Zip Code", type: "textField", autofill: "zip" },
    { regex: /e-?p?mail/i, id: "email_address", title: "Email Address", type: "textField", autofill: "email" },
    { regex: /primary\s*phone|cell\s*phone|mobile\s*phone|\bphone\b|\bmobile\b/i, id: "phone_number", title: "Phone Number", type: "textField", autofill: "phone" },
    { regex: /date\s*of\s*birth|dob|birth\s*date/i, id: "date_of_birth", title: "Date of Birth", type: "dateField" },
    { regex: /comments|notes|remarks|message|description/i, id: "comments", title: "Comments", type: "textField", multiline: true }
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
            if (type === "dateField") defaultValue = "YYYY-MM-DD";
            break;
        }
    }

    if (!baseId) {
        if (type === "signature") baseId = "signature";
        else if (type === "checkBox") {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
            baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "checkbox";
        } else if (type === "dateField") {
            baseId = "date";
            defaultValue = "YYYY-MM-DD";
        } else {
            const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 4);
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
            
            // Extract positioned text items
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

            // Extract vector lines & path drawings
            const vectorGeometry = await extractVectorGeometry(page, viewport);

            // Run 4-Affordance Geometric Detection Pipeline
            const pageFields = detectVisualAffordances(rawBlocks, vectorGeometry, viewport, pageNum, usedNames);
            newFields.push(...pageFields);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        state.fields = state.fields.filter(f => !pagesToScan.includes(f.page || 1));
        
        // Final spatial deduplication
        const finalUnique = [];
        for (let f of newFields) {
            if (!isOverlapping(f, finalUnique, 0.35)) {
                finalUnique.push(f);
            }
        }

        state.fields.push(...finalUnique);
        state.selectedFieldIds.clear();
        finalUnique.forEach(f => state.selectedFieldIds.add(f.id));
        saveHistory();
        totalDetected = finalUnique.length;
    }

    return totalDetected;
}

// ============================================================================
// 3. VECTOR GEOMETRY EXTRACTOR (Strokes, Rectangles & Underlines)
// ============================================================================
async function extractVectorGeometry(page, viewport) {
    const lines = [];
    const boxes = [];
    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    try {
        const opList = await page.getOperatorList();
        if (!opList || !opList.fnArray) return { lines, boxes };

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

                        if (dx >= 25 && dy <= 3) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const tx = matrix[0] * minX + matrix[2] * minY + matrix[4];
                            const ty = matrix[1] * minX + matrix[3] * minY + matrix[5];
                            const canvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasW = dx * Math.abs(matrix[0] || 1);

                            if (canvasY >= 35 && canvasY <= (pageHeight - 20) && canvasW >= 25) {
                                lines.push({ x: Math.round(canvasX), y: Math.round(canvasY), width: Math.round(canvasW) });
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
                        const canvasX = tx;

                        // Check for thin horizontal line drawn as filled rectangle
                        if (boxH <= 3 && boxW >= 25 && boxW < (pageWidth * 0.96)) {
                            lines.push({ x: Math.round(canvasX), y: Math.round(canvasY + boxH), width: Math.round(boxW) });
                            continue;
                        }

                        // Check for small discrete input box or table cell
                        if (boxW >= 12 && boxH >= 12 && boxH <= 45 && boxW <= (pageWidth * 0.40)) {
                            boxes.push({
                                x: Math.round(canvasX),
                                y: Math.round(canvasY),
                                width: Math.round(boxW),
                                height: Math.round(boxH)
                            });
                        }
                    }
                }
            } else if (fn === OPS.rectangle && args) {
                const [rx, ry, rw, rh] = args;
                const tx = matrix[0] * rx + matrix[2] * ry + matrix[4];
                const ty = matrix[1] * rx + matrix[3] * ry + matrix[5];
                const boxW = Math.abs(rw * (matrix[0] || 1));
                const boxH = Math.abs(rh * (matrix[3] || 1));
                const canvasY = pageHeight - ty - boxH;
                const canvasX = tx;

                if (boxH <= 3 && boxW >= 25 && boxW < (pageWidth * 0.96)) {
                    lines.push({ x: Math.round(canvasX), y: Math.round(canvasY + boxH), width: Math.round(boxW) });
                } else if (boxW >= 12 && boxH >= 12 && boxH <= 45 && boxW <= (pageWidth * 0.40)) {
                    boxes.push({
                        x: Math.round(canvasX),
                        y: Math.round(canvasY),
                        width: Math.round(boxW),
                        height: Math.round(boxH)
                    });
                }
            }
        }
    } catch(err) {
        console.warn("Vector extraction warning:", err);
    }

    return { lines, boxes };
}

// ============================================================================
// 4. VISUAL AFFORDANCE FORM FIELD DETECTOR
// ============================================================================
function detectVisualAffordances(rawBlocks, vectorGeometry, viewport, pageNum, usedNames) {
    const fields = [];
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    // Cluster text items into visual lines
    const textLines = clusterIntoLines(rawBlocks);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Checkbox & Radio Glyphs
    // ------------------------------------------------------------------------
    const cbGlyphRegex = /(\[\s*\]|\(\s*\)|[☐□✓✔✗✘\u25A0-\u25AF\u25CB-\u25EF\u25C6\u25C7\u25FC\u25FD\u25FE\u25FF\u2B1C\u2B1D\u2B24\u2B55\u2713\u2714\u2717\u2718\u2756]|\[\s*[xX•*]\s*\]|\(\s*[xX•*•]\s*\))\s*([a-zA-Z0-9\s\/\(\)\,\.\-\+\$\#]+?)(?=(?:\[\s*\]|\(\s*\)|[☐□✓✔✗✘\u25A0-\u25AF\u25CB-\u25EF\u25C6\u25C7\u25FC\u25FD\u25FE\u25FF\u2B1C\u2B1D\u2B24\u2B55\u2713\u2714\u2717\u2718\u2756]|\[\s*[xX•*]\s*\]|\(\s*[xX•*•]\s*\)|$|\b(?:First Name|Last Name|Cost Center|Employee|Manager|Date|Signature|Badge|Job|Total|Direct Deposit)\b|(?<=\s)[A-Z][a-zA-Z\s\/]+:))/g;

    for (const line of textLines) {
        const text = line.str.trim();
        let match;
        while ((match = cbGlyphRegex.exec(text)) !== null) {
            const optLabel = match[2].trim();
            const charIdx = match.index;
            const charX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const charY = Math.round(line.y + (line.height - 16) / 2);

            const sem = resolveSemanticProps(optLabel, "checkBox", usedNames);
            fields.push({
                id: generateFieldId(),
                type: "checkBox",
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
            });
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 2: Fill-in Underlines, Dotted Lines & Dashed Runs
    // ------------------------------------------------------------------------
    const underlineRegex = /([_]{2,}|(?:_\s*){3,}|[.]{3,}|[-–—]{3,})/g;

    for (const line of textLines) {
        const text = line.str.trim();
        if (isSectionHeader(text)) continue;

        let ulMatch;
        while ((ulMatch = underlineRegex.exec(text)) !== null) {
            const charIdx = ulMatch.index;
            const matchLen = ulMatch[0].length;

            const textBefore = text.slice(0, charIdx);
            const labelMatch = textBefore.match(/([a-zA-Z0-9\s\/\(\)\.\-\#\$X]+?)[:\s]*$/);
            const rawLabel = labelMatch ? labelMatch[1].replace(/^[X\s]+/, "").trim() : "fill_line";

            const startX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const width = Math.max(65, Math.round((matchLen / Math.max(1, text.length)) * line.width));

            const isSig = /signature|sign/i.test(rawLabel) || /^X\s*$/i.test(textBefore.trim());
            const isDate = /date|dob|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i.test(rawLabel);

            const sem = resolveSemanticProps(rawLabel, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);

            fields.push({
                id: generateFieldId(),
                type: isSig ? "signature" : (isDate ? "dateField" : sem.type),
                name: sem.name,
                x: Math.max(10, startX),
                y: Math.max(10, Math.round(line.y - (isSig ? 12 : 2))),
                width: Math.min(width, pageWidth - startX - 20),
                height: isSig ? 44 : 24,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: sem.dataFormat || "text",
                ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
            });
        }
    }

    // Also snap vector horizontal lines (Underlines drawn as vector strokes)
    for (const vLine of vectorGeometry.lines) {
        if (fields.some(f => Math.abs(f.y + f.height - vLine.y) <= 8 && Math.abs(f.x - vLine.x) <= 25)) continue;

        // Find nearest text label to the left or immediately above
        const labelBlock = rawBlocks.find(tb => {
            const isToLeft = (tb.x + tb.width) <= (vLine.x + 15) && (vLine.x - (tb.x + tb.width)) <= 180 && Math.abs(tb.y - (vLine.y - 18)) <= 14;
            const isAbove = Math.abs(tb.x - vLine.x) <= 40 && tb.y < vLine.y && (vLine.y - tb.y) <= 28;
            return isToLeft || isAbove;
        });

        const rawLabel = labelBlock ? labelBlock.str : "line_input";
        if (isSectionHeader(rawLabel)) continue;

        const isSig = /signature|sign/i.test(rawLabel) || /^X\b/i.test(rawLabel);
        const isDate = /date|dob/i.test(rawLabel);

        const sem = resolveSemanticProps(rawLabel, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);

        fields.push({
            id: generateFieldId(),
            type: isSig ? "signature" : (isDate ? "dateField" : sem.type),
            name: sem.name,
            x: Math.max(10, vLine.x),
            y: Math.max(10, Math.round(vLine.y - (isSig ? 38 : 22))),
            width: Math.min(vLine.width, pageWidth - vLine.x - 20),
            height: isSig ? 44 : 24,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: sem.multiline || false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
        });
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 3: Bracket Input Boxes & Vector Form / Table Cells
    // ------------------------------------------------------------------------
    const bracketBoxRegex = /\[\s*([-–—\s]{2,}|MM\s*\/\s*YY|DD\s*\/\s*MM|YYYY|YY|CVC|CVV|\$\s*|\s{2,})\s*\]/gi;

    for (const line of textLines) {
        const text = line.str.trim();
        let bbMatch;
        while ((bbMatch = bracketBoxRegex.exec(text)) !== null) {
            const charIdx = bbMatch.index;
            const matchLen = bbMatch[0].length;

            const boxX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const boxW = Math.max(50, Math.round((matchLen / Math.max(1, text.length)) * line.width));
            const boxY = Math.round(line.y - 1);

            const textBefore = text.slice(0, charIdx);
            const labelMatch = textBefore.match(/([a-zA-Z0-9\s\/\(\)\.\-\#\$]+?):\s*$/);
            const rawLabel = labelMatch ? labelMatch[1].trim() : "input_box";

            const isDate = /expiration|date|dob|mm\s*\/\s*yy/i.test(bbMatch[1] + " " + rawLabel);
            const isCVV = /cvv|cvc/i.test(rawLabel);

            const sem = resolveSemanticProps(rawLabel, isDate ? "dateField" : "textField", usedNames);

            fields.push({
                id: generateFieldId(),
                type: isDate ? "dateField" : "textField",
                name: sem.name,
                x: Math.max(10, boxX),
                y: Math.max(10, boxY),
                width: Math.round(isCVV ? Math.min(boxW, 65) : boxW),
                height: 22,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: isCVV ? "cc-csc" : sem.autofill,
                dataFormat: "text",
                ...(isDate ? { defaultValue: "MM/YY" } : {})
            });
        }
    }

    // Vector Table & Form Cells (Discrete drawn cell boxes)
    for (const box of vectorGeometry.boxes) {
        if (fields.some(f => isOverlappingBox(f, box, 0.4))) continue;

        // Find label inside top or to left of cell
        const insideLabel = rawBlocks.find(tb => 
            tb.x >= box.x - 2 && (tb.x + tb.width) <= box.x + box.width + 4 &&
            tb.y >= box.y - 2 && tb.y <= box.y + 16
        );
        const leftLabel = rawBlocks.find(tb =>
            (tb.x + tb.width) <= box.x + 8 && (box.x - (tb.x + tb.width)) <= 140 &&
            Math.abs(tb.y - box.y) <= 12
        );

        const rawLabel = insideLabel ? insideLabel.str : (leftLabel ? leftLabel.str : "cell");
        if (isSectionHeader(rawLabel)) continue;

        const isDate = /date|dob/i.test(rawLabel);
        const sem = resolveSemanticProps(rawLabel, isDate ? "dateField" : "textField", usedNames);

        fields.push({
            id: generateFieldId(),
            type: isDate ? "dateField" : sem.type,
            name: sem.name,
            x: Math.max(10, box.x + 2),
            y: Math.max(10, box.y + 2),
            width: Math.max(30, box.width - 4),
            height: Math.max(16, box.height - 4),
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: sem.multiline || box.height >= 40,
            autofill: sem.autofill || "",
            dataFormat: "text",
            ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
        });
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 4: Key-Value Colon Prompts & Multi-Column Slices
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (isSectionHeader(text)) continue;
        if (!text.includes(":")) continue;

        const labelRegex = /([a-zA-Z0-9\s\/\(\)\.\-\#\$\&]+?):/g;
        const labelMatches = [...text.matchAll(labelRegex)];

        for (let i = 0; i < labelMatches.length; i++) {
            const match = labelMatches[i];
            const nextMatch = labelMatches[i + 1];
            const labelPart = match[1].trim();

            if (isSectionHeader(labelPart)) continue;
            if (/^(?:from|to|terms|due)$/i.test(labelPart)) continue;

            const matchEndIdx = match.index + match[0].length;
            const nextStartIdx = nextMatch ? nextMatch.index : text.length;

            // Check if label already has a complete printed constant (e.g. "$0.670 / mile", "FRM-7160", "2.4")
            const textAfter = text.slice(matchEndIdx, nextStartIdx).trim();
            const isPrintedConstant = !nextMatch && textAfter.length > 0 &&
                !/^[_.\-—\s\[\(\$\€\£\¥]+$/.test(textAfter) &&
                !/^[\$\€\£\¥]\s*$/.test(textAfter) &&
                !/^(?:miles|usd|eur|aud|cad|gbp)$/i.test(textAfter) &&
                /[a-zA-Z0-9]{2,}/.test(textAfter);

            if (isPrintedConstant) continue;

            // Check if followed by checkboxes/radios (Group headers like "Direct Deposit on File? [ ] YES [ ] NO", "Prefix: ( ) Mr")
            const isFollowedByCheckbox = /^\s*(?:\[\s*\]|\(\s*\)|[☐□✓✔✗✘\u25A0-\u25AF\u25CB-\u25EF\u25C6\u25C7\u25FC\u25FD\u25FE\u25FF\u2B1C\u2B1D\u2B24\u2B55\u2713\u2714\u2717\u2718\u2756])/i.test(textAfter);
            if (isFollowedByCheckbox) continue;

            // Calculate precise bounds
            const labelEndX = line.x + (matchEndIdx / Math.max(1, text.length)) * line.width;
            const nextLabelX = nextMatch
                ? (line.x + (nextStartIdx / Math.max(1, text.length)) * line.width)
                : (line.x + line.width);

            const targetX = Math.round(labelEndX + 4);
            let targetW = Math.max(45, Math.round(nextLabelX - targetX - 6));

            if (!nextMatch) {
                const rightNeighbor = textLines.find(other => 
                    other !== line && Math.abs(other.y - line.y) <= 8 && other.x > targetX
                );
                if (rightNeighbor) {
                    targetW = Math.max(45, Math.min(220, (rightNeighbor.x - 8) - targetX));
                } else {
                    targetW = Math.min(240, Math.max(60, pageWidth - targetX - 30));
                }
            }

            const isSig = /signature|sign/i.test(labelPart);
            const isDate = /date|dob|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)/i.test(labelPart);
            const isMulti = /comments|notes|remarks|allergies|medications|responsibilities|reason\s*for|description|message/i.test(labelPart);

            const sem = resolveSemanticProps(labelPart, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);

            const newField = {
                id: generateFieldId(),
                type: isSig ? "signature" : (isDate ? "dateField" : sem.type),
                name: sem.name,
                x: Math.max(10, targetX),
                y: Math.max(10, Math.round(line.y - (isSig ? 10 : 2))),
                width: Math.round(targetW),
                height: isSig ? 44 : (isMulti ? 55 : 24),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: isMulti || sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: sem.dataFormat || "text",
                ...(isDate ? { defaultValue: "YYYY-MM-DD" } : {})
            };

            if (!fields.some(f => isOverlapping(f, [newField], 0.35))) {
                fields.push(newField);
            }
        }
    }

    return fields;
}

// ============================================================================
// 5. UTILITIES (Line Clustering, Section Header & Collision Solvers)
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

function isSectionHeader(text) {
    if (!text) return false;
    const clean = text.trim();
    if (clean.length < 2) return false;

    // Numbered Section Banners (e.g. "1. EMPLOYEE & CLAIM DETAILS", "2. ITEMIZED EXPENSE ENTRIES")
    if (/^\d+[\.\)]\s*[A-Z\s\&\(\)\/]+$/i.test(clean) && !clean.includes(":") && !/[_]{2,}/.test(clean)) {
        return true;
    }

    // Document header metadata
    if (/^(?:FORM\s*REF|REVISION|STATUS)\s*:/i.test(clean)) {
        return true;
    }

    if (/^(?:FINANCE\s*&\s*COMPLIANCE|EXPENSE\s*REIMBURSEMENT\s*CLAIM|EMPLOYMENT\s*APPLICATION|TECHSUMMIT|PATIENT\s*INTAKE|APPLICATION\s*FORM)$/i.test(clean)) {
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

function isOverlappingBox(f, box, threshold = 0.4) {
    const xOverlap = Math.max(0, Math.min(f.x + f.width, box.x + box.width) - Math.max(f.x, box.x));
    const yOverlap = Math.max(0, Math.min(f.y + f.height, box.y + box.height) - Math.max(f.y, box.y));
    const overlapArea = xOverlap * yOverlap;
    if (overlapArea <= 0) return false;
    const minArea = Math.min(f.width * f.height, box.width * box.height);
    return minArea > 0 && (overlapArea / minArea) > threshold;
}
