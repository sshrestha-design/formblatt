// ── Precision 4-Stage PDF Form Field Auto-Detector (js/auto-detector.js) ──
import { state } from "./state.js";
import { saveHistory } from "./storage-manager.js";

const SEMANTIC_DICTIONARY = [
    // Invoice & Billing Specific Fields
    { regex: /invoice\s*n(?:o|um|umber)?|inv\s*#|factura/i, id: "invoice_number_input", title: "Invoice Number", type: "textField", autofill: "invoice_num", score: 12 },
    { regex: /po\s*n(?:o|um|umber)?|p\.o\.\s*#|purchase\s*order/i, id: "po_number_input", title: "PO Number", type: "textField", score: 12 },
    { regex: /due\s*date|payment\s*due/i, id: "due_date_input", title: "Due Date", type: "dateField", score: 12 },
    { regex: /invoice\s*date|issue\s*date|date\s*of\s*issue/i, id: "invoice_date_input", title: "Invoice Date", type: "dateField", score: 12 },
    { regex: /bill\s*to|billed\s*to|invoice\s*to|client\s*name|customer/i, id: "bill_to_input", title: "Bill To", type: "textField", multiline: true, score: 12 },
    { regex: /ship\s*to|deliver\s*to|shipping\s*address/i, id: "ship_to_input", title: "Ship To", type: "textField", multiline: true, score: 10 },
    { regex: /vat\s*(?:id|num|number)?|tax\s*id|gstin|ein\s*num/i, id: "tax_id_input", title: "Tax ID / VAT", type: "textField", score: 10 },
    { regex: /payment\s*terms|\bterms\b/i, id: "payment_terms_input", title: "Payment Terms", type: "textField", score: 10 },
    { regex: /subtotal|sub-total/i, id: "subtotal_input", title: "Subtotal", type: "textField", score: 10 },
    { regex: /discount/i, id: "discount_input", title: "Discount", type: "textField", score: 10 },
    { regex: /shipping|freight/i, id: "shipping_fee_input", title: "Shipping Fee", type: "textField", score: 10 },
    { regex: /total\s*amount|amount\s*due|balance\s*due|^total\b/i, id: "total_amount_input", title: "Total Amount", type: "textField", score: 12 },
    { regex: /item\s*description|description|item/i, id: "description_input", title: "Description", type: "textField", score: 11 },
    { regex: /unit\s*price|rate|\bprice\b/i, id: "unit_price_input", title: "Unit Price", type: "textField", score: 11 },
    { regex: /qty|quantity/i, id: "quantity_input", title: "Quantity", type: "textField", score: 11 },
    { regex: /amount|line\s*total/i, id: "line_amount_input", title: "Line Amount", type: "textField", score: 11 },
    { regex: /\btax\b|sales\s*tax/i, id: "tax_amount_input", title: "Tax", type: "textField", score: 11 },

    // Tax & Financial Forms (IRS W-9, W-4, 1099, Banking, Direct Deposit, Loans)
    { regex: /routing\s*n(?:o|um|umber)?|aba\s*routing|transit\s*n(?:o|um|umber)?/i, id: "routing_number_input", title: "Routing Number", type: "textField", score: 12 },
    { regex: /account\s*n(?:o|um|umber)?|bank\s*account/i, id: "account_number_input", title: "Account Number", type: "textField", score: 12 },
    { regex: /taxpayer\s*id|tin\b|ein\b/i, id: "taxpayer_id_input", title: "Taxpayer ID / EIN", type: "textField", score: 12 },
    { regex: /ssn|social\s*security/i, id: "ssn_input", title: "Social Security Number (SSN)", type: "textField", score: 12 },
    { regex: /filing\s*status|marital\s*status/i, id: "filing_status_input", title: "Filing / Marital Status", type: "dropdown", score: 10 },
    { regex: /gross\s*income|annual\s*income|net\s*income/i, id: "annual_income_input", title: "Annual Income", type: "textField", score: 10 },

    // Healthcare & Medical Forms (Patient Intake, Insurance Claims, HIPAA)
    { regex: /patient\s*name/i, id: "patient_name_input", title: "Patient Name", type: "textField", autofill: "name", score: 12 },
    { regex: /patient\s*id|mrn\b|medical\s*record/i, id: "patient_id_input", title: "Patient ID / MRN", type: "textField", score: 12 },
    { regex: /insurance\s*(?:company|provider|carrier|plan)/i, id: "insurance_provider_input", title: "Insurance Provider", type: "textField", score: 12 },
    { regex: /policy\s*n(?:o|um|umber)?|group\s*n(?:o|um|umber)?|member\s*id/i, id: "insurance_policy_input", title: "Policy / Member ID", type: "textField", score: 12 },
    { regex: /primary\s*care|pcp|physician|doctor/i, id: "physician_name_input", title: "Primary Care Physician", type: "textField", score: 10 },
    { regex: /medical\s*history|allergies|medications/i, id: "medical_history_input", title: "Medical History / Allergies", type: "textField", multiline: true, score: 10 },

    // HR & Employment Forms (I-9, Onboarding, NDAs, Timecards)
    { regex: /employee\s*id|staff\s*id|worker\s*id/i, id: "employee_id_input", title: "Employee ID", type: "textField", score: 12 },
    { regex: /hire\s*date|start\s*date|employment\s*date/i, id: "hire_date_input", title: "Hire Date", type: "dateField", score: 10 },
    { regex: /manager\s*name|supervisor/i, id: "manager_name_input", title: "Manager / Supervisor", type: "textField", score: 10 },
    { regex: /hours\s*worked|overtime\s*hours/i, id: "hours_worked_input", title: "Hours Worked", type: "textField", score: 10 },
    { regex: /work\s*authorization|visa\s*status|citizenship/i, id: "work_auth_input", title: "Work Authorization", type: "textField", score: 10 },

    // Real Estate, Rental & Property Management (Lease Agreements, Rental Apps)
    { regex: /property\s*address|premises|unit\s*#|apt\s*#/i, id: "property_address_input", title: "Property Address", type: "textField", autofill: "address1", score: 12 },
    { regex: /monthly\s*rent|rent\s*amount/i, id: "monthly_rent_input", title: "Monthly Rent", type: "textField", score: 12 },
    { regex: /security\s*deposit|deposit\s*amount/i, id: "security_deposit_input", title: "Security Deposit", type: "textField", score: 10 },
    { regex: /landlord|lessor/i, id: "landlord_name_input", title: "Landlord Name", type: "textField", score: 10 },
    { regex: /tenant|lessee/i, id: "tenant_name_input", title: "Tenant Name", type: "textField", score: 10 },
    { regex: /lease\s*start|move-?in\s*date/i, id: "move_in_date_input", title: "Move-In Date", type: "dateField", score: 10 },

    // Legal, Contracts & Agreements (NDAs, SLA, Release Forms)
    { regex: /effective\s*date|execution\s*date/i, id: "effective_date_input", title: "Effective Date", type: "dateField", score: 12 },
    { regex: /disclosing\s*party|party\s*a/i, id: "disclosing_party_input", title: "Disclosing Party", type: "textField", score: 10 },
    { regex: /receiving\s*party|party\s*b/i, id: "receiving_party_input", title: "Receiving Party", type: "textField", score: 10 },
    { regex: /governing\s*law|jurisdiction/i, id: "governing_law_input", title: "Governing Law", type: "textField", score: 10 },
    { regex: /witness\s*signature/i, id: "witness_signature_input", title: "Witness Signature", type: "signature", score: 12 },

    // Standard Person & Contact Fields
    { regex: /first\s*name/i, id: "first_name_input", title: "First Name", type: "textField", autofill: "first_name", score: 10 },
    { regex: /last\s*name|surname/i, id: "last_name_input", title: "Last Name", type: "textField", autofill: "last_name", score: 10 },
    { regex: /full\s*name|^name\b/i, id: "full_name_input", title: "Full Name", type: "textField", score: 10 },
    { regex: /location|city|ort|standort/i, id: "location_input", title: "Location", type: "textField", autofill: "city", score: 10 },
    { regex: /e-?p?mail/i, id: "email_address_input", title: "Email Address", type: "textField", autofill: "email", score: 10 },
    { regex: /\bphone\b|\bmobile\b|\bcell\b|\btelephone\b|\btel\b/i, id: "phone_number_input", title: "Phone Number", type: "textField", autofill: "phone", score: 10 },
    { regex: /street|address\s*line/i, id: "street_address_input", title: "Street Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /address/i, id: "address_input", title: "Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /state|province|region|bundesland/i, id: "state_input", title: "State / Province", type: "textField", autofill: "state", score: 10 },
    { regex: /zip|postal|postcode|plz/i, id: "zip_code_input", title: "Zip Code", type: "textField", autofill: "zip", score: 10 },
    { regex: /country|land/i, id: "country_input", title: "Country", type: "textField", autofill: "country", score: 10 },
    { regex: /date\s*of\s*birth|dob|birth\s*date/i, id: "date_of_birth_input", title: "Date of Birth", type: "dateField", score: 10 },
    { regex: /signature|sign\s*here|authorized\s*sign/i, id: "signature_input", title: "Applicant Signature", type: "signature", score: 10 },
    { regex: /^date\b|date\s*signed|today.?s\s*date/i, id: "date_signed_input", title: "Date Signed", type: "dateField", score: 10 },
    { regex: /company|organization|employer/i, id: "company_name_input", title: "Company Name", type: "textField", autofill: "company", score: 10 },
    { regex: /title|position|occupation|role/i, id: "job_title_input", title: "Job Title", type: "textField", score: 10 },
    { regex: /comments|notes|remarks|message|description|explanation/i, id: "comments_input", title: "Additional Comments", type: "textField", multiline: true, score: 10 }
];

const CONTACT_OR_RESUME_KEYWORDS = /(?:@|\.(?:com|org|net|io|edu|gov|co|uk|de)|https?:\/\/|\+?\d{2,4}[-\s]?\d{3,4}|\b(?:linkedin|github|twitter|portfolio|behance|dribbble|email|phone|location|tel|mobile|website|experience|education|skills|projects|summary|profile|awards|languages|hobbies)\b)/i;

function isHeadingLabel(text) {
    if (!text) return false;
    const clean = text.trim().replace(/[:_.\s-]+$/, "");
    if (!clean || clean.length < 2) return false;

    if (/(?:invoice\s*n|inv\s*#|bill\s*to|ship\s*to|due\s*date|po\s*number|p\.o\.\s*#|subtotal|amount\s*due|balance\s*due|total\s*amount|payment\s*terms|\bterms\b|\bdue\b)/i.test(clean)) {
        return false;
    }

    if (/^(?:job|contract|location|contact|details|summary|profile|education|experience|skills|hobbies|languages|references)$/i.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        return true;
    }

    if (/(?:pdf|form|example|sample|demonstration|section|part|chapter|header|heading|overview|instructions|notice|declaration|statement|agreement|terms|conditions|general|personal|employment|contact|applicant|signature\s*section|certification|schedule|table\s*of\s*contents|disclaimer|privacy|policy|service|scope|appendix|exhibit|attachment|document|summary|profile|record|details|information|page)/i.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        const isFieldKeyword = /^(?:first\s*name|last\s*name|full\s*name|name|email|phone|address|city|state|zip|date|dob|ssn|ein|title|company|country)$/i.test(clean);
        if (!isFieldKeyword) return true;
    }

    if (/^\d+[\.\)]\s*/.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) return true;
    if (/^(?:SECTION|PART|CHAPTER|HEADER|TITLE|SCHEDULE|EXHIBIT|APPENDIX)\s*[\dABCDEFIVX]+/i.test(clean)) return true;

    if (/^[A-Z0-9\s\-\/\&]{5,}$/.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        const isShortFieldLabel = /^(?:SSN|EIN|DOB|NAME|CITY|ZIP|DATE|STATE|PHONE|EMAIL|TITLE|AGE|FAX|ID|QTY|PRICE|TAX|TOTAL|SUBTOTAL|INVOICE)$/i.test(clean);
        if (!isShortFieldLabel) return true;
    }

    return false;
}

// ============================================================================
// STAGE 1: Spatial Obstacle & Text Occupancy Grid (Blocked Text Zones)
// ============================================================================
export class TextOccupancyGrid {
    constructor(rawBlocks, pageHeight) {
        this.pageHeight = pageHeight;
        this.rawBlocks = rawBlocks;
        this.titleBlocks = rawBlocks.filter(tb => {
            const str = (tb.str || "").trim();
            if (!str) return false;
            return (tb.height >= 16) || /^(?:invoice|factura|statement|receipt|w-?9|tax\s*form|purchase\s*order)$/i.test(str);
        });
        this.sectionTabBlocks = rawBlocks.filter(tb => {
            const str = (tb.str || "").trim();
            return /^(?:from|to|billed?\s*to|ship\s*to|payment\s*terms|terms|due|invoice\s*to|remit\s*to)$/i.test(str);
        });
    }

    isBlocked(box) {
        // Strict title collision: reject any box that touches a document title
        for (let tb of this.titleBlocks) {
            const xOverlap = Math.max(0, Math.min(box.x + box.width, tb.x + tb.width) - Math.max(box.x, tb.x));
            const yOverlap = Math.max(0, Math.min(box.y + box.height, tb.y + tb.height) - Math.max(box.y, tb.y));
            if (xOverlap > 0 && yOverlap > 0) return true;
        }

        // Strict section tab collision: reject any box that sits directly over a section tab/prompt
        for (let sb of this.sectionTabBlocks) {
            const xOverlap = Math.max(0, Math.min(box.x + box.width, sb.x + sb.width) - Math.max(box.x, sb.x));
            const yOverlap = Math.max(0, Math.min(box.y + box.height, sb.y + sb.height) - Math.max(box.y, sb.y));
            const overlapArea = xOverlap * yOverlap;
            const blockArea = sb.width * sb.height;
            if (overlapArea > (blockArea * 0.4) && box.width < 60) return true;
        }

        // Reject boxes placed in empty top margin
        if (box.y < 45 && !box.type?.includes("signature")) return true;

        return false;
    }
}

// ============================================================================
// STAGE 2: Topological Table & Grid Solver (2D Matrix Projector)
// ============================================================================
export class TopologicalTableSolver {
    static solveGrid(fields, rawBlocks, pageNum, usedNames) {
        // 1. Find table header rows in rawBlocks
        const headerBlocks = rawBlocks.filter(tb => {
            const text = (tb.str || "").trim();
            return /item|description|details|quantity|\bqty\b|unit|price|rate|amount|line\s*total|\btotal\b/i.test(text);
        }).sort((a, b) => a.x - b.x);

        const headerRows = [];
        headerBlocks.forEach(hb => {
            let hr = headerRows.find(r => Math.abs(r.y - hb.y) <= 15);
            if (!hr) {
                hr = { y: hb.y, height: hb.height, blocks: [] };
                headerRows.push(hr);
            }
            hr.blocks.push(hb);
        });

        // Find the header row that contains at least 2 table columns
        const mainHeaderRow = headerRows.find(hr => hr.blocks.length >= 2);
        if (!mainHeaderRow) return fields;

        const tableTopY = Math.round(mainHeaderRow.y + mainHeaderRow.height + 4);
        
        // Find bottom boundary of this specific table
        const footerBlock = rawBlocks.find(tb => {
            const text = (tb.str || "").trim();
            return /subtotal|tax|balance\s*due|total\s*due/i.test(text) && tb.y > tableTopY;
        });
        const tableBottomY = footerBlock ? Math.round(footerBlock.y - 8) : Math.min(tableTopY + 280, 750);

        // Build column definitions strictly from the table header blocks & table boundaries
        const colBands = [];
        const sortedHeaderBlocks = [...mainHeaderRow.blocks].sort((a, b) => a.x - b.x);

        // Find table left and right bounds
        const leftAnchor = rawBlocks.find(tb => /^(?:from|terms|notes|bill\s*to)$/i.test((tb.str || "").trim()));
        const tableLeftX = leftAnchor ? Math.round(leftAnchor.x) : Math.round(sortedHeaderBlocks[0].x - 45);

        const tableRightX = footerBlock 
            ? Math.round(footerBlock.x + footerBlock.width + 55) 
            : Math.round(sortedHeaderBlocks[sortedHeaderBlocks.length - 1].x + sortedHeaderBlocks[sortedHeaderBlocks.length - 1].width + 30);

        const colHeaderMap = {
            "Item Description": "Description",
            "Description": "Description",
            "Quantity": "Quantity",
            "Qty": "Quantity",
            "Price": "Unit Price",
            "Unit Price": "Unit Price",
            "Rate": "Unit Price",
            "Amount": "Line Amount",
            "Total": "Line Amount"
        };

        for (let i = 0; i < sortedHeaderBlocks.length; i++) {
            const hb = sortedHeaderBlocks[i];
            const nextHb = sortedHeaderBlocks[i + 1];
            
            let colX, colW;
            if (i === 0) {
                // First column (Description): spans from table left border to next column
                colX = Math.max(10, tableLeftX);
                colW = nextHb ? Math.max(50, Math.round((nextHb.x - 4) - colX)) : Math.round(hb.width + 30);
            } else if (nextHb) {
                // Middle columns (Quantity, Price): span between header bounds
                colX = Math.round(hb.x - 4);
                colW = Math.max(35, Math.round((nextHb.x - 4) - colX));
            } else {
                // Last column (Amount): spans to table right boundary
                colX = Math.round(hb.x - 4);
                colW = Math.max(40, Math.round(tableRightX - colX));
            }

            const headerKey = (hb.str || "").trim();
            colBands.push({
                x: colX,
                width: colW,
                headerText: colHeaderMap[headerKey] || headerKey || "Column"
            });
        }

        // Find row positions strictly inside [tableTopY, tableBottomY]
        const textInTable = rawBlocks.filter(tb => tb.y >= (tableTopY - 2) && (tb.y + tb.height) <= (tableBottomY + 15));
        
        const rawYs = textInTable.map(tb => Math.round(tb.y - 2)).sort((a, b) => a - b);
        const sampledRowYs = [];
        rawYs.forEach(y => {
            if (!sampledRowYs.some(sy => Math.abs(sy - y) <= 6)) {
                sampledRowYs.push(y);
            }
        });

        let tableRows = [];
        if (sampledRowYs.length >= 3) {
            // Calculate median row step / pitch from sampled text entries ($0.00 lines)
            const deltas = [];
            for (let i = 1; i < sampledRowYs.length; i++) {
                deltas.push(sampledRowYs[i] - sampledRowYs[i - 1]);
            }
            const medianPitch = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] || 24;

            // If the first sampled text row is below tableTopY, back-project any blank preceding row(s)
            while (sampledRowYs[0] - tableTopY > (medianPitch * 0.8)) {
                sampledRowYs.unshift(Math.round(sampledRowYs[0] - medianPitch));
            }

            for (let r = 0; r < 10; r++) {
                const rY = sampledRowYs[r] !== undefined ? sampledRowYs[r] : Math.round(sampledRowYs[0] + r * medianPitch);
                if (rY + 16 <= (tableBottomY + 12)) {
                    tableRows.push({ y: rY, height: 16 });
                }
            }
        } else {
            const totalH = tableBottomY - tableTopY;
            const numRows = Math.min(10, Math.max(6, Math.round(totalH / 24)));
            const rowPitch = totalH / numRows;
            for (let r = 0; r < numRows; r++) {
                const rY = Math.round(tableTopY + r * rowPitch + (rowPitch - 16) / 2);
                tableRows.push({ y: rY, height: 16 });
            }
        }

        // Filter out any previous fields that were inside the table header or data region
        const headerMinY = Math.round(mainHeaderRow.y - 12);
        const resultFields = fields.filter(f => f.y < headerMinY || f.y > tableBottomY);

        // Generate fields for all rows and columns
        tableRows.forEach((row, rowIndex) => {
            colBands.forEach(col => {
                const colHeader = col.headerText || "Column";
                const sem = DirectionalRaycaster.resolveSemanticProperties(`${colHeader}_${rowIndex + 1}`, "textField", usedNames);

                const newField = {
                    id: Date.now() + Math.random(),
                    type: "textField",
                    name: sem.name,
                    x: Math.max(10, col.x),
                    y: Math.max(10, row.y),
                    width: col.width,
                    height: 16,
                    page: pageNum,
                    borderStyle: "solid",
                    fillStyle: "white",
                    multiline: false,
                    autofill: sem.autofill || "",
                    dataFormat: "text"
                };

                resultFields.push(newField);
            });
        });

        // Generate table summary fields (Subtotal, Tax, Balance Due) if present
        const summaryKeywords = [
            { regex: /subtotal/i, name: "subtotal_input" },
            { regex: /\btax\b|sales\s*tax/i, name: "tax_amount_input" },
            { regex: /balance\s*due|amount\s*due|\btotal\b/i, name: "balance_due_input" }
        ];

        summaryKeywords.forEach(kw => {
            const block = rawBlocks.find(tb => kw.regex.test((tb.str || "").trim()) && tb.y >= (tableTopY + 40));
            if (block) {
                const amountCol = colBands[colBands.length - 1];
                const sumX = amountCol ? amountCol.x : Math.round(block.x + block.width + 10);
                const sumW = amountCol ? amountCol.width : 80;
                const sem = DirectionalRaycaster.resolveSemanticProperties(kw.name, "textField", usedNames);

                if (!resultFields.some(f => Math.abs(f.y - block.y) <= 12 && Math.abs(f.x - sumX) <= 30)) {
                    resultFields.push({
                        id: Date.now() + Math.random(),
                        type: "textField",
                        name: sem.name,
                        x: Math.max(10, sumX),
                        y: Math.max(10, Math.round(block.y - 2)),
                        width: sumW,
                        height: 16,
                        page: pageNum,
                        borderStyle: "solid",
                        fillStyle: "white",
                        multiline: false,
                        dataFormat: "text"
                    });
                }
            }
        });

        // Generate Notes field if Notes section exists below table
        const notesBlock = rawBlocks.find(tb => /^notes\b/i.test((tb.str || "").trim()) && tb.y > (tableBottomY - 10));
        if (notesBlock && !resultFields.some(f => Math.abs(f.y - notesBlock.y) <= 60 && f.multiline)) {
            const sem = DirectionalRaycaster.resolveSemanticProperties("notes_input", "textField", usedNames);
            resultFields.push({
                id: Date.now() + Math.random(),
                type: "textField",
                name: sem.name,
                x: Math.max(10, tableLeftX),
                y: Math.max(10, Math.round(notesBlock.y + notesBlock.height + 6)),
                width: Math.max(200, Math.round(tableRightX - tableLeftX)),
                height: 48,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: true,
                dataFormat: "text"
            });
        }

        return resultFields;
    }
}

// ============================================================================
// STAGE 3: Directional Raycasting & Local Context Decay
// ============================================================================
export class DirectionalRaycaster {
    static findLabelForBox(box, rawBlocks) {
        const boxMidY = box.y + (box.height / 2);

        // 1. Top Ray: Look up for stacked labels within max 24px
        const topBlocks = rawBlocks.filter(tb => {
            if (isHeadingLabel(tb.str) || isArtifactString(tb.str)) return false;
            const isAbove = tb.y < box.y && (box.y - (tb.y + tb.height)) <= 24;
            const isAlignedX = (tb.x + tb.width >= box.x - 15) && (tb.x <= box.x + box.width + 15);
            return isAbove && isAlignedX;
        }).sort((a, b) => (box.y - (a.y + a.height)) - (box.y - (b.y + b.height)));

        for (let tb of topBlocks) {
            const decoded = sanitizeAndDecodeLabel(tb.str);
            if (decoded) return tb.str;
        }

        // 2. Left Ray: Look left for inline labels within max 100px
        const leftBlocks = rawBlocks.filter(tb => {
            if (isHeadingLabel(tb.str) || isArtifactString(tb.str)) return false;
            const tbMidY = tb.y + (tb.height / 2);
            const isSameRow = Math.abs(tbMidY - boxMidY) <= 12;
            const isToLeft = (tb.x + tb.width) <= (box.x + 18) && (box.x - (tb.x + tb.width)) <= 100;
            return isSameRow && isToLeft;
        }).sort((a, b) => {
            const distA = box.x - (a.x + a.width);
            const distB = box.x - (b.x + b.width);
            return distA - distB;
        });

        for (let tb of leftBlocks) {
            const decoded = sanitizeAndDecodeLabel(tb.str);
            if (decoded) return tb.str;
        }

        // 3. Score-weighted proximity search strictly within 30px radius
        let bestLabel = null;
        let highestScore = -1;

        for (let tb of rawBlocks) {
            if (isHeadingLabel(tb.str) || isArtifactString(tb.str)) continue;
            const decoded = sanitizeAndDecodeLabel(tb.str);
            if (!decoded) continue;

            const tbMidY = tb.y + (tb.height / 2);
            const distLeft = (box.x - (tb.x + tb.width));
            const distTop = (box.y - (tb.y + tb.height));

            const isLeft = distLeft >= -18 && distLeft <= 30 && Math.abs(tbMidY - boxMidY) <= 14;
            const isTop = (tb.x + tb.width >= box.x - 15) && (tb.x <= box.x + box.width + 15) && distTop >= 0 && distTop <= 20;

            if (isLeft || isTop) {
                const distance = isLeft ? distLeft : distTop;
                const matchConfidence = decoded.score || 10;
                const score = matchConfidence / (Math.pow(Math.max(1, distance), 2));
                if (score > highestScore) {
                    highestScore = score;
                    bestLabel = tb.str;
                }
            }
        }

        return bestLabel;
    }

    static resolveSemanticProperties(rawLabel, defaultType = "textField", usedNames = new Set()) {
        let clean = (rawLabel || "").trim().replace(/[:_.\s-]+$/, "");
        let baseId = "";
        let type = defaultType;
        let multiline = false;
        let autofill = "";
        let defaultValue = "";

        const match = sanitizeAndDecodeLabel(clean);
        if (match) {
            baseId = match.id;
            if (match.type) type = match.type;
            if (match.multiline) multiline = true;
            if (match.autofill) autofill = match.autofill;
            if (type === "dateField") defaultValue = "MM/DD/YYYY";
        }

        if (!baseId) {
            if (type === "signature") baseId = "signature";
            else if (type === "checkBox") baseId = "checkbox";
            else if (type === "dateField") { baseId = "date"; defaultValue = "MM/DD/YYYY"; }
            else baseId = "text_field";
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
}

// ============================================================================
// STAGE 4: Underline & Baseline Snapper
// ============================================================================
export class UnderlineBaselineSnapper {
    static snapToUnderline(lineCanvasY, canvasX, canvasW, lineHeight = 24) {
        const height = Math.max(18, Math.min(24, Math.round(lineHeight * 0.8)));
        const y = Math.round(lineCanvasY - height - 1);
        return {
            x: Math.max(10, Math.round(canvasX)),
            y: Math.max(10, y),
            width: Math.round(canvasW),
            height
        };
    }
}

// ── Main Auto-Detect Engine Controller ──────────────────────────────
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
                    x: tx,
                    y: viewport.height - ty - fontHeight,
                    width: item.width,
                    height: fontHeight,
                    str: (item.str || "").trim()
                };
            }).filter(tb => tb.str.length > 0);

            const occupancyGrid = new TextOccupancyGrid(rawBlocks, viewport.height);

            // Engine 0: Native AcroForm Annotation Reader
            const acroFormFields = await extractExistingAnnotations(page, viewport, pageNum, usedNames);

            // Engine 1: Vector Drawing Path Detection
            const vectorElements = await extractVectorPaths(page, viewport, rawBlocks, occupancyGrid);

            // Engine 2: Semantic Text Layout & Keyword Detection
            const textElements = scanTextLayout(rawBlocks, viewport, pageNum, occupancyGrid);

            // Engine 3: Fusion & Directional Raycasting
            let merged = fuseDetections(acroFormFields, vectorElements, textElements, rawBlocks, viewport, pageNum, usedNames, occupancyGrid);

            // Engine 4: Topological Table Grid Solver
            merged = TopologicalTableSolver.solveGrid(merged, rawBlocks, pageNum, usedNames);
            newFields.push(...merged);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        state.fields = state.fields.filter(f => !pagesToScan.includes(f.page || 1));
        
        const uniqueNewFields = [];
        for (let nf of newFields) {
            if (!isOverlappingAny(nf, uniqueNewFields)) {
                uniqueNewFields.push(nf);
            }
        }

        state.fields.push(...uniqueNewFields);
        state.selectedFieldIds.clear();
        uniqueNewFields.forEach(f => state.selectedFieldIds.add(f.id));
        saveHistory();
        totalDetected = uniqueNewFields.length;
    }

    return totalDetected;
}

// ── Helper: Extract Native AcroForms ─────────────────────────────────
async function extractExistingAnnotations(page, viewport, pageNum, usedNames) {
    const fields = [];
    try {
        const annotations = await page.getAnnotations();
        if (!annotations || annotations.length === 0) return fields;

        for (let annot of annotations) {
            if (annot.subtype !== "Widget" && !annot.fieldName) continue;

            const rect = annot.rect;
            const [x1, y1, x2, y2] = rect;
            const canvasX = Math.round(x1);
            const canvasY = Math.round(viewport.height - y2);
            const canvasW = Math.round(x2 - x1);
            const canvasH = Math.round(y2 - y1);

            let type = "textField";
            let multiline = false;

            if (annot.fieldType === "Btn") {
                if (annot.checkBox || (annot.fieldFlags & 16)) type = "checkBox";
                else if (annot.radioButton || (annot.fieldFlags & 32768)) type = "radioGroup";
                else type = "signature";
            } else if (annot.fieldType === "Tx") {
                if (annot.fieldFlags & 4096) multiline = true;
            } else if (annot.fieldType === "Ch") {
                type = "dropdown";
            }

            const rawName = annot.fieldName || annot.alternativeText || `acro_${fields.length + 1}`;
            const sem = DirectionalRaycaster.resolveSemanticProperties(rawName, type, usedNames);

            fields.push({
                id: Date.now() + Math.random(),
                type: sem.type || type,
                name: sem.name,
                x: Math.max(10, canvasX),
                y: Math.max(10, canvasY),
                width: Math.max(20, canvasW),
                height: Math.max(16, canvasH),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: multiline || sem.multiline || false,
                autofill: sem.autofill || "",
                ...(annot.fieldValue ? { defaultValue: String(annot.fieldValue) } : {})
            });
        }
    } catch(err) {
        console.warn("AcroForm annotation extraction warning:", err);
    }
    return fields;
}

// ── Helper: Extract Vector Path Elements & Underlines ────────────────
async function extractVectorPaths(page, viewport, rawBlocks, occupancyGrid) {
    const vectorElements = [];
    const rawLines = [];
    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    try {
        const opList = await page.getOperatorList();
        if (!opList || !opList.fnArray) return vectorElements;

        const { fnArray, argsArray } = opList;
        const OPS = (typeof pdfjsLib !== "undefined" && pdfjsLib.OPS) ? pdfjsLib.OPS : {};

        let currentMatrix = [1, 0, 0, 1, 0, 0];
        const matrixStack = [];

        for (let i = 0; i < fnArray.length; i++) {
            const fn = fnArray[i];
            const args = argsArray[i];

            if (fn === OPS.save) {
                matrixStack.push([...currentMatrix]);
            } else if (fn === OPS.restore) {
                if (matrixStack.length > 0) currentMatrix = matrixStack.pop();
            } else if (fn === OPS.transform && args) {
                const [a1, b1, c1, d1, e1, f1] = currentMatrix;
                const [a2, b2, c2, d2, e2, f2] = args;
                currentMatrix = [
                    a1 * a2 + c1 * b2,
                    b1 * a2 + d1 * b2,
                    a1 * c2 + c1 * d2,
                    b1 * c2 + d1 * d2,
                    a1 * e2 + c1 * f2 + e1,
                    b1 * e2 + d1 * f2 + f1
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
                        if (dx >= 40 && dy <= 4 && dx < (pageWidth * 0.95)) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const [tx, ty] = applyMatrix(minX, minY, currentMatrix);
                            const lineCanvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasW = dx * Math.abs(currentMatrix[0] || 1);

                            // Discard lines in top margin
                            if (lineCanvasY >= 55 && lineCanvasY <= (pageHeight * 0.96) && canvasX >= 5 && canvasX <= (pageWidth - 20) && canvasW >= 40) {
                                const snapped = UnderlineBaselineSnapper.snapToUnderline(lineCanvasY, canvasX, canvasW);
                                if (!occupancyGrid.isBlocked(snapped)) {
                                    rawLines.push(snapped);
                                }
                            }
                        }
                        lastX = curX;
                        lastY = curY;
                    } else if (op === OPS.rectangle) {
                        const rx = pathArgs[argIdx++];
                        const ry = pathArgs[argIdx++];
                        const rw = pathArgs[argIdx++];
                        const rh = pathArgs[argIdx++];

                        const [tx, ty] = applyMatrix(rx, ry, currentMatrix);
                        const boxW = Math.abs(rw * (currentMatrix[0] || 1));
                        const boxH = Math.abs(rh * (currentMatrix[3] || 1));
                        const canvasY = pageHeight - ty - boxH;
                        const canvasX = tx;

                        // Discard boxes in top 55px margin or tall narrow vertical tabs (From, To tabs)
                        if (canvasY < 55 || canvasY >= (pageHeight * 0.94)) continue;
                        if (boxW < 45 && boxH >= 24) continue;

                        // Discard outer grouping containers that enclose 2 or more text lines
                        if (boxH >= 35 && boxW >= 80 && rawBlocks) {
                            const contained = rawBlocks.filter(tb => 
                                tb.x >= (canvasX - 5) && (tb.x + tb.width) <= (canvasX + boxW + 5) &&
                                tb.y >= (canvasY - 5) && (tb.y + tb.height) <= (canvasY + boxH + 5)
                            );
                            if (contained.length >= 2) continue;
                        }

                        if (boxW >= 22 && boxH >= 12 && boxH <= 160 && boxW <= (pageWidth * 0.92)) {
                            if (boxW < 22 && boxH < 22) continue;
                            if (boxW >= (pageWidth * 0.40) && boxH <= 40) continue;

                            const box = {
                                type: "text_box",
                                x: Math.max(10, Math.round(canvasX)),
                                y: Math.max(10, Math.round(canvasY)),
                                width: Math.round(boxW),
                                height: Math.round(boxH)
                            };

                            if (!occupancyGrid.isBlocked(box)) {
                                vectorElements.push(box);
                            }
                        }
                    }
                }
            } else if (fn === OPS.rectangle && args) {
                const [rx, ry, rw, rh] = args;
                const [tx, ty] = applyMatrix(rx, ry, currentMatrix);
                const boxW = Math.abs(rw * (currentMatrix[0] || 1));
                const boxH = Math.abs(rh * (currentMatrix[3] || 1));
                const canvasY = pageHeight - ty - boxH;
                const canvasX = tx;

                if (canvasY < 55 || canvasY >= (pageHeight * 0.94)) continue;
                if (boxW < 45 && boxH >= 24) continue;

                // Discard outer grouping containers that enclose 2 or more text lines
                if (boxH >= 35 && boxW >= 80 && rawBlocks) {
                    const contained = rawBlocks.filter(tb => 
                        tb.x >= (canvasX - 5) && (tb.x + tb.width) <= (canvasX + boxW + 5) &&
                        tb.y >= (canvasY - 5) && (tb.y + tb.height) <= (canvasY + boxH + 5)
                    );
                    if (contained.length >= 2) continue;
                }

                if (boxW >= 22 && boxH >= 15 && boxH <= 160 && boxW <= (pageWidth * 0.92)) {
                    if (boxW < 22 && boxH < 22) continue;
                    if (boxW >= (pageWidth * 0.40) && boxH <= 40) continue;

                    const box = {
                        type: "text_box",
                        x: Math.max(10, Math.round(canvasX)),
                        y: Math.max(10, Math.round(canvasY)),
                        width: Math.round(boxW),
                        height: Math.round(boxH)
                    };

                    if (!occupancyGrid.isBlocked(box)) {
                        vectorElements.push(box);
                    }
                }
            }
        }

        if (rawLines.length > 0) {
            rawLines.forEach(l => vectorElements.push(l));
        }
    } catch(err) {
        console.warn("Vector extraction warning:", err);
    }

    return vectorElements;
}

function applyMatrix(x, y, m) {
    return [
        m[0] * x + m[2] * y + m[4],
        m[1] * x + m[3] * y + m[5]
    ];
}

// ── Helper: Scan Text Layout & Colon Prompts ─────────────────────────
function scanTextLayout(rawBlocks, viewport, pageNum, occupancyGrid) {
    const detected = [];
    const pageWidth = viewport.width;

    if (rawBlocks.length === 0) return { detected, lines: [] };

    const lines = clusterIntoLines(rawBlocks);

    for (let line of lines) {
        const text = line.str.trim();

        if (isHeadingLabel(text)) continue;
        if (line.y < 45 && !line.str.includes(":") && !/[_]{3,}/.test(line.str)) continue;
        if (CONTACT_OR_RESUME_KEYWORDS.test(text) && !text.includes(":")) continue;

        if (/^(\[\s*\]|\(\s*\)|[☐□✓])$/.test(text)) {
            const nextOption = lines.find(l => 
                l.x > (line.x + line.width) && (l.x - (line.x + line.width)) <= 35 && Math.abs(l.y - line.y) <= 8
            );
            const optLabel = nextOption ? nextOption.str.trim() : "checkbox";

            detected.push({
                type: "checkBox",
                rawLabel: optLabel,
                x: Math.max(10, Math.round(line.x)),
                y: Math.max(10, Math.round(line.y)),
                width: 20,
                height: 20,
                borderStyle: "solid",
                fillStyle: "white"
            });
            continue;
        }

        if (/[_]{3,}/.test(text) || /[.]{4,}/.test(text)) {
            const cleanLabel = text.replace(/[_.]/g, "").replace(/[:\s]+$/, "").trim();
            const labelWidth = cleanLabel.length > 0 ? (line.width * (cleanLabel.length / text.length)) : 0;
            const startX = Math.round(line.x + labelWidth + (labelWidth > 0 ? 6 : 0));
            const availableW = Math.max(80, (line.x + line.width) - startX);

            const isSig = /signature|sign/i.test(cleanLabel);
            const isDate = /date|dob/i.test(cleanLabel);

            detected.push({
                type: isSig ? "signature" : (isDate ? "dateField" : "textField"),
                rawLabel: cleanLabel || "text",
                x: Math.max(10, startX),
                y: Math.max(10, Math.round(line.y - 1)),
                width: Math.round(Math.min(availableW, pageWidth - startX - 20)),
                height: isSig ? 44 : 24,
                borderStyle: "solid",
                fillStyle: "white",
                ...(isDate ? { defaultValue: "MM/DD/YYYY" } : {})
            });
            continue;
        }

        // ── Placeholder Lines (Company Name, Client Name, Address 1, Terms, Due Date) ──
        const isPlaceholderLine = /^(?:company\s*name|client\s*name|client\s*email(?:\s*address)?|address\s*\d*|street\s*address|client\s*address\s*\d*|city,\s*state,\s*zip|zip\s*code|terms|due\s*date)$/i.test(text);
        if (isPlaceholderLine) {
            const isDate = /date|dob/i.test(text);
            detected.push({
                type: isDate ? "dateField" : "textField",
                rawLabel: text,
                x: Math.max(10, Math.round(line.x - 2)),
                y: Math.max(10, Math.round(line.y - 1)),
                width: Math.round(Math.max(105, Math.min(135, line.width + 25))),
                height: 16,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                ...(isDate ? { defaultValue: "MM/DD/YYYY" } : {})
            });
            continue;
        }

        const hasExplicitColon = text.endsWith(":") || text.includes(":");
        if (hasExplicitColon) {
            const parts = text.split(":");
            const labelPart = parts[0].trim();
            const afterColon = (parts[1] || "").trim();

            if (isHeadingLabel(labelPart)) continue;
            if (/^(?:from|to|terms|due)$/i.test(labelPart)) continue;

            const isBillShip = /bill\s*to|ship\s*to|billed\s*to|deliver\s*to/i.test(labelPart);
            if (isBillShip) {
                const targetX = Math.round(line.x);
                const targetY = Math.round(line.y + line.height + 4);
                const availableWidth = Math.min(280, pageWidth - targetX - 35);

                detected.push({
                    type: "textField",
                    rawLabel: labelPart,
                    x: Math.max(10, targetX),
                    y: Math.max(10, targetY),
                    width: Math.round(availableWidth),
                    height: 60,
                    borderStyle: "solid",
                    fillStyle: "white",
                    multiline: true
                });
                continue;
            }

            const targetX = Math.round(line.x + line.width + 6);
            const targetY = Math.round(line.y - 1);

            const rightNeighbor = lines.find(other => 
                other !== line && 
                Math.abs(other.y - line.y) <= 8 && 
                other.x > (line.x + line.width + 6)
            );

            let fieldWidth = 160;
            if (rightNeighbor) {
                fieldWidth = Math.max(50, Math.min(200, (rightNeighbor.x - 10) - targetX));
            } else {
                fieldWidth = Math.min(240, Math.max(80, pageWidth - targetX - 35));
            }

            if (targetX < (pageWidth - 30) && line.y > 45) {
                const isSig = /signature|sign/i.test(labelPart);
                const isDate = /date|dob/i.test(labelPart);
                const isMulti = /comments|notes|remarks|description|message/i.test(labelPart);

                detected.push({
                    type: isSig ? "signature" : (isDate ? "dateField" : "textField"),
                    rawLabel: labelPart,
                    x: targetX,
                    y: targetY,
                    width: Math.round(fieldWidth),
                    height: isSig ? 44 : (isMulti ? 60 : 24),
                    borderStyle: "solid",
                    fillStyle: "white",
                    multiline: isMulti,
                    ...(afterColon.length > 0 ? { defaultValue: afterColon } : (isDate ? { defaultValue: "MM/DD/YYYY" } : {}))
                });
            }
        }
    }

    return { detected, lines };
}

// ── Helper: Label Sanitization & Decoding ────────────────────────────
function sanitizeAndDecodeLabel(rawLabel) {
    if (!rawLabel) return null;
    const cleanStr = rawLabel.trim();
    if (!cleanStr || cleanStr.length < 2) return null;

    const exactClean = cleanStr.replace(/^\d+[\.\s\)]*/, "").replace(/[:_.\s-]+$/, "").trim();
    for (const item of SEMANTIC_DICTIONARY) {
        if (item.regex.test(exactClean)) {
            return {
                id: item.id,
                title: item.title,
                type: item.type || "textField",
                multiline: item.multiline || false,
                autofill: item.autofill || "",
                score: item.score || 10
            };
        }
    }

    if (isArtifactString(cleanStr)) {
        const priorityShifts = [29, -29, 3, -3, 1, -1];
        for (const shift of priorityShifts) {
            let res = "";
            for (let i = 0; i < cleanStr.length; i++) {
                const code = cleanStr.charCodeAt(i);
                const ch = cleanStr[i];
                if (ch === "v" && shift === 29) res += ":";
                else if (ch === " ") res += " ";
                else {
                    const target = code + shift;
                    if (target >= 32 && target <= 126) res += String.fromCharCode(target);
                    else res += ch;
                }
            }

            const clean = res.replace(/^\d+[\.\s\)]*/, "").replace(/[:_.\s-]+$/, "").trim();
            if (!clean || clean.length < 2 || isArtifactString(clean)) continue;

            for (const item of SEMANTIC_DICTIONARY) {
                if (shift !== 0 && item.type === "checkBox") continue;
                if (item.regex.test(clean)) {
                    return {
                        id: item.id,
                        title: item.title,
                        type: item.type || "textField",
                        multiline: item.multiline || false,
                        autofill: item.autofill || "",
                        score: item.score || 10
                    };
                }
            }
        }
    }

    const words = exactClean.split(/\s+/).filter(w => /^[a-zA-Z0-9\/\-\(\)]+$/.test(w));
    if (words.length >= 1 && words.length <= 6) {
        const cleanWords = words.map(w => w.replace(/[^a-zA-Z0-9]/g, "")).filter(w => w.length > 0);
        if (cleanWords.length > 0) {
            const cleanId = cleanWords.join("_").toLowerCase() + "_input";
            const title = cleanWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            return { id: cleanId, title: title, type: "textField", score: 5 };
        }
    }

    return null;
}

function isArtifactString(str) {
    if (!str) return false;
    const clean = str.trim();
    if (clean.length <= 1) return false;
    if (/^\d+(_\d+)*$/.test(clean) || (clean.replace(/[^0-9]/g, "").length / clean.length) > 0.35) return true;
    if (/^[a-zA-Z]{3,}\d+$/.test(clean)) return true;

    const lettersOnly = clean.replace(/[^a-zA-Z]/g, "");
    if (lettersOnly.length >= 4) {
        const vowels = lettersOnly.match(/[aeiouyAEIOUY]/g) || [];
        const vowelRatio = vowels.length / lettersOnly.length;
        if (vowelRatio < 0.22 || /[^aeiouyAEIOUY\s]{5,}/.test(lettersOnly)) return true;
    }
    return false;
}

// ── Helper: Fuse Detections with Directional Raycasting ───────────────
function fuseDetections(acroFormFields, vectorElements, textResult, rawBlocks, viewport, pageNum, usedNames, occupancyGrid) {
    const fused = [...acroFormFields];
    const { detected: textDetections } = textResult;

    for (let ve of vectorElements) {
        if (occupancyGrid.isBlocked(ve)) continue;
        if (isOverlappingAny(ve, fused)) continue;

        const rawLabel = DirectionalRaycaster.findLabelForBox(ve, rawBlocks);
        // If a vector box has no associated label and is in the header area or very large, discard it!
        if (!rawLabel && (ve.y < 120 || (ve.width * ve.height) > 5000)) continue;
        if (ve.width < 36 && ve.height >= 28) continue;

        const effectiveLabel = rawLabel || `field_${usedNames.size + 1}`;
        if (isHeadingLabel(effectiveLabel)) continue;
        if (/^(?:from|to|bill\s*from|bill\s*to)$/i.test(effectiveLabel) && ve.width < 50) continue;

        const sem = DirectionalRaycaster.resolveSemanticProperties(effectiveLabel, "textField", usedNames);
        let finalType = sem.type;
        if ((finalType === "checkBox" || finalType === "radioGroup") && (ve.width > 35 || ve.height > 35 || Math.abs(ve.width - ve.height) > 12)) {
            finalType = "textField";
        }

        fused.push({
            id: Date.now() + Math.random(),
            type: finalType,
            name: sem.name,
            x: ve.x,
            y: ve.y,
            width: ve.width,
            height: ve.height,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: sem.multiline || ve.height >= 45,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            ...(sem.defaultValue ? { defaultValue: sem.defaultValue } : {})
        });
    }

    for (let td of textDetections) {
        if (occupancyGrid.isBlocked(td)) continue;

        const isCovered = fused.some(f => {
            const xOverlap = Math.max(0, Math.min(td.x + td.width, f.x + f.width) - Math.max(td.x, f.x));
            const yOverlap = Math.max(0, Math.min(td.y + td.height, f.y + f.height) - Math.max(td.y, f.y));
            return (xOverlap * yOverlap) > 0;
        });

        if (!isCovered) {
            const rawLabel = (td.rawLabel && td.rawLabel !== "text") ? td.rawLabel : (DirectionalRaycaster.findLabelForBox(td, rawBlocks) || `field_${usedNames.size + 1}`);
            if (isHeadingLabel(rawLabel)) continue;
            const sem = DirectionalRaycaster.resolveSemanticProperties(rawLabel, td.type, usedNames);

            fused.push({
                id: Date.now() + Math.random(),
                type: td.type || sem.type,
                name: sem.name,
                x: td.x,
                y: td.y,
                width: td.width,
                height: td.height,
                page: pageNum,
                borderStyle: td.borderStyle || "solid",
                fillStyle: td.fillStyle || "white",
                multiline: td.multiline || sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: sem.dataFormat || "text",
                ...(td.defaultValue || sem.defaultValue ? { defaultValue: td.defaultValue || sem.defaultValue } : {})
            });
        }
    }

    return fused;
}

// ── Utilities ────────────────────────────────────────────────────────
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
            const reasonableGap = b.x >= currentLine.x && (b.x - (currentLine.x + currentLine.width)) <= 35;

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

function isOverlappingAny(field, list) {
    return list.some(existing => {
        if (field.id && existing.id && field.id === existing.id) return false;
        if ((existing.page || 1) !== (field.page || 1)) return false;

        const xOverlap = Math.max(0, Math.min(field.x + field.width, existing.x + existing.width) - Math.max(field.x, existing.x));
        const yOverlap = Math.max(0, Math.min(field.y + field.height, existing.y + existing.height) - Math.max(field.y, existing.y));
        const overlapArea = Math.max(0, xOverlap) * Math.max(0, yOverlap);

        if (overlapArea <= 0) return false;

        const fieldArea = field.width * field.height;
        const existingArea = existing.width * existing.height;
        const minArea = Math.min(fieldArea, existingArea);

        return minArea > 0 && (overlapArea / minArea) > 0.45;
    });
}
