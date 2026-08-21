// ── Precision 4-Stage PDF Form Field Auto-Detector (js/auto-detector.js) ──
import { state, generateFieldId } from "./state.js";
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
    { regex: /total\s*authorized\s*amount|total\s*amount|amount\s*due|balance\s*due|^total\b/i, id: "total_amount_input", title: "Total Amount", type: "textField", score: 12 },
    { regex: /item\s*description|description|item/i, id: "description_input", title: "Description", type: "textField", score: 11 },
    { regex: /unit\s*price|rate|\bprice\b/i, id: "unit_price_input", title: "Unit Price", type: "textField", score: 11 },
    { regex: /qty|quantity/i, id: "quantity_input", title: "Quantity", type: "textField", score: 11 },
    { regex: /amount|line\s*total/i, id: "line_amount_input", title: "Line Amount", type: "textField", score: 11 },
    { regex: /\btax\b|sales\s*tax/i, id: "tax_amount_input", title: "Tax", type: "textField", score: 11 },

    // Credit Card & Payment Processing
    { regex: /credit\s*card\s*number|card\s*number|account\s*number/i, id: "credit_card_number_input", title: "Credit Card Number", type: "textField", autofill: "cc-number", score: 12 },
    { regex: /cardholder\s*(?:full\s*)?name|name\s*on\s*card/i, id: "cardholder_name_input", title: "Cardholder Full Name", type: "textField", autofill: "cc-name", score: 12 },
    { regex: /expiration\s*date|exp\s*date|exp\s*\.?\s*date/i, id: "expiration_date_input", title: "Expiration Date", type: "dateField", autofill: "cc-exp", score: 12 },
    { regex: /cvv|cvc|security\s*code/i, id: "cvv_input", title: "CVV / CVC", type: "textField", autofill: "cc-csc", score: 12 },
    { regex: /billing\s*(?:street\s*)?address/i, id: "billing_address_input", title: "Billing Street Address", type: "textField", autofill: "address1", score: 12 },

    // Tax & Financial Forms (IRS W-9, W-4, 1099, Banking, Direct Deposit, Loans)
    { regex: /routing\s*n(?:o|um|umber)?|aba\s*routing|transit\s*n(?:o|um|umber)?/i, id: "routing_number_input", title: "Routing Number", type: "textField", score: 12 },
    { regex: /taxpayer\s*id|tin\b|ein\b/i, id: "taxpayer_id_input", title: "Taxpayer ID / EIN", type: "textField", score: 12 },
    { regex: /ssn|social\s*security/i, id: "ssn_input", title: "Social Security Number", type: "textField", score: 12 },
    { regex: /filing\s*status|marital\s*status/i, id: "marital_status_input", title: "Marital Status", type: "textField", score: 10 },
    { regex: /legal\s*sex|gender/i, id: "legal_sex_input", title: "Legal Sex", type: "textField", score: 10 },
    { regex: /preferred\s*language|language/i, id: "preferred_language_input", title: "Preferred Language", type: "textField", score: 10 },
    { regex: /gross\s*income|annual\s*income|net\s*income/i, id: "annual_income_input", title: "Annual Income", type: "textField", score: 10 },

    // Healthcare & Medical Forms (Patient Intake, Insurance Claims, HIPAA)
    { regex: /patient\s*name/i, id: "patient_name_input", title: "Patient Name", type: "textField", autofill: "name", score: 12 },
    { regex: /patient\s*id|mrn\b|medical\s*record/i, id: "patient_id_input", title: "Patient ID / MRN", type: "textField", score: 12 },
    { regex: /emergency\s*contact\s*name|emergency\s*contact/i, id: "emergency_contact_name", title: "Emergency Contact Name", type: "textField", autofill: "name", score: 12 },
    { regex: /emergency\s*phone/i, id: "emergency_phone_input", title: "Emergency Phone", type: "textField", autofill: "phone", score: 12 },
    { regex: /relationship\s*to\s*patient|relationship\s*to\s*policyholder|\brelationship\b/i, id: "relationship_input", title: "Relationship", type: "textField", score: 10 },
    { regex: /primary\s*insurance|insurance\s*(?:company|provider|carrier|plan)/i, id: "insurance_provider_input", title: "Insurance Provider", type: "textField", score: 12 },
    { regex: /policy\s*(?:\/|\s*)member\s*id|policy\s*n(?:o|um|umber)?|member\s*id/i, id: "insurance_policy_input", title: "Policy / Member ID", type: "textField", score: 12 },
    { regex: /group\s*n(?:o|um|umber)?/i, id: "group_number_input", title: "Group Number", type: "textField", score: 12 },
    { regex: /policyholder\s*name/i, id: "policyholder_name_input", title: "Policyholder Name", type: "textField", autofill: "name", score: 12 },
    { regex: /policyholder\s*dob|policyholder\s*date\s*of\s*birth/i, id: "policyholder_dob_input", title: "Policyholder DOB", type: "dateField", score: 12 },
    { regex: /known\s*allergies|allergies/i, id: "allergies_input", title: "Known Allergies", type: "textField", multiline: true, score: 11 },
    { regex: /reaction\s*&?\s*severity|reaction/i, id: "reaction_severity_input", title: "Reaction & Severity", type: "textField", multiline: true, score: 11 },
    { regex: /current\s*prescription|prescription\s*medications|medications/i, id: "medications_input", title: "Current Medications", type: "textField", multiline: true, score: 11 },
    { regex: /reason\s*for\s*medication|prescribing\s*physician/i, id: "prescribing_physician_input", title: "Prescribing Physician / Reason", type: "textField", multiline: true, score: 11 },
    { regex: /accessibility\s*accommodations|accommodations/i, id: "accessibility_accommodations_input", title: "Accessibility Accommodations", type: "textField", multiline: true, score: 11 },

    // HR & Employment & Conference Registration Forms
    { regex: /prefix/i, id: "prefix_input", title: "Prefix", type: "textField", score: 10 },
    { regex: /badge\s*name|nickname/i, id: "badge_name_input", title: "Badge Name / Nickname", type: "textField", score: 11 },
    { regex: /job\s*title|role/i, id: "job_title_input", title: "Job Title / Role", type: "textField", autofill: "organization-title", score: 11 },
    { regex: /organization|company/i, id: "organization_input", title: "Organization / Company", type: "textField", autofill: "organization", score: 11 },
    { regex: /work\s*email|business\s*email/i, id: "work_email_input", title: "Work Email Address", type: "textField", autofill: "email", score: 12 },
    { regex: /mobile\s*phone|cell\s*phone/i, id: "mobile_phone_input", title: "Mobile Phone Number", type: "textField", autofill: "phone", score: 12 },
    { regex: /country\s*(?:\/|\s*)region|country/i, id: "country_region_input", title: "Country / Region", type: "textField", autofill: "country", score: 11 },

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
    { regex: /\bm\.?i\.?\b|middle\s*initial/i, id: "middle_initial_input", title: "Middle Initial", type: "textField", score: 10 },
    { regex: /full\s*name|^name\b/i, id: "full_name_input", title: "Full Name", type: "textField", autofill: "name", score: 10 },
    { regex: /city,\s*state,\s*postal\s*code|city,\s*state,\s*zip|city\s*state\s*zip/i, id: "city_state_zip_input", title: "City, State, Postal Code", type: "textField", score: 10 },
    { regex: /location|city|ort|standort/i, id: "location_input", title: "Location", type: "textField", autofill: "city", score: 10 },
    { regex: /e-?p?mail/i, id: "email_address_input", title: "Email Address", type: "textField", autofill: "email", score: 10 },
    { regex: /primary\s*phone|home\s*phone|cell\s*phone|\bphone\b|\bmobile\b|\bcell\b|\btelephone\b|\btel\b/i, id: "phone_number_input", title: "Phone Number", type: "textField", autofill: "phone", score: 10 },
    { regex: /street\s*address|home\s*address|address\s*line/i, id: "street_address_input", title: "Street Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /address/i, id: "address_input", title: "Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /state|province|region|bundesland/i, id: "state_input", title: "State / Province", type: "textField", autofill: "state", score: 10 },
    { regex: /postal\s*code|zip\s*code|zip|postal|postcode|plz/i, id: "zip_code_input", title: "Postal Code", type: "textField", autofill: "zip", score: 10 },
    { regex: /date\s*of\s*birth|dob|birth\s*date|\(mm\/dd\/yyyy\)/i, id: "date_of_birth_input", title: "Date of Birth", type: "dateField", score: 10 },
    { regex: /cardholder\s*\/?\s*attendee\s*signature|signature|sign\s*here|authorized\s*sign/i, id: "signature_input", title: "Signature", type: "signature", score: 10 },
    { regex: /^date\b|date\s*signed|today.?s\s*date/i, id: "date_signed_input", title: "Date Signed", type: "dateField", score: 10 },
    { regex: /comments|notes|remarks|message|description|explanation/i, id: "comments_input", title: "Additional Comments", type: "textField", multiline: true, score: 10 }
];

const CONTACT_OR_RESUME_KEYWORDS = /(?:@|\.(?:com|org|net|io|edu|gov|co|uk|de)|https?:\/\/|\+?\d{2,4}[-\s]?\d{3,4}|\b(?:linkedin|github|twitter|portfolio|behance|dribbble|website|experience|education|skills|projects|summary|profile|awards|languages|hobbies)\b)/i;

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

    // Numbered headings like "1. ATTENDEE INFORMATION", "2. REGISTRATION PASS TYPE"
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
            return (tb.height >= 18) || /^(?:invoice|factura|statement|receipt|w-?9|tax\s*form|purchase\s*order)$/i.test(str);
        });
        this.sectionTabBlocks = rawBlocks.filter(tb => {
            const str = (tb.str || "").trim();
            return /^(?:from|to|billed?\s*to|ship\s*to|payment\s*terms|terms|due|invoice\s*to|remit\s*to)$/i.test(str);
        });
    }

    isBlocked(box) {
        for (let tb of this.titleBlocks) {
            const xOverlap = Math.max(0, Math.min(box.x + box.width, tb.x + tb.width) - Math.max(box.x, tb.x));
            const yOverlap = Math.max(0, Math.min(box.y + box.height, tb.y + tb.height) - Math.max(box.y, tb.y));
            if (xOverlap > 0 && yOverlap > 0) return true;
        }

        if (box.y < 40 && !box.type?.includes("signature")) return true;

        return false;
    }
}

// ============================================================================
// STAGE 2: Topological Table & Grid Solver (2D Matrix Projector)
// ============================================================================
export class TopologicalTableSolver {
    static solveGrid(fields, rawBlocks, pageNum, usedNames) {
        const headerBlocks = rawBlocks.filter(tb => {
            const text = (tb.str || "").trim();
            return /^(?:item|description|item\s*description|qty|quantity|unit\s*price|price|rate|amount|line\s*total)$/i.test(text);
        }).sort((a, b) => a.x - b.x);

        const headerRows = [];
        headerBlocks.forEach(hb => {
            let hr = headerRows.find(r => Math.abs(r.y - hb.y) <= 8);
            if (!hr) {
                hr = { y: hb.y, height: hb.height, blocks: [] };
                headerRows.push(hr);
            }
            hr.blocks.push(hb);
        });

        // Require at least 3 distinct invoice table column headers on the same line
        const mainHeaderRow = headerRows.find(hr => {
            if (hr.blocks.length < 3) return false;
            const texts = hr.blocks.map(b => (b.str || "").trim().toLowerCase());
            const hasDesc = texts.some(t => t.includes("desc") || t.includes("item"));
            const hasQtyOrPrice = texts.some(t => t.includes("qty") || t.includes("quant") || t.includes("price") || t.includes("rate") || t.includes("amount"));
            return hasDesc && hasQtyOrPrice;
        });
        if (!mainHeaderRow) return fields;

        const tableTopY = Math.round(mainHeaderRow.y + mainHeaderRow.height + 4);
        
        const footerBlock = rawBlocks.find(tb => {
            const text = (tb.str || "").trim();
            return /subtotal|tax|balance\s*due|total\s*due/i.test(text) && tb.y > tableTopY;
        });
        const tableBottomY = footerBlock ? Math.round(footerBlock.y - 8) : Math.min(tableTopY + 280, 750);

        const colBands = [];
        const sortedHeaderBlocks = [...mainHeaderRow.blocks].sort((a, b) => a.x - b.x);

        const leftAnchor = rawBlocks.find(tb => /^(?:from|terms|bill\s*to)$/i.test((tb.str || "").trim()));
        const tableLeftX = leftAnchor ? Math.round(leftAnchor.x) : 138;

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
                colX = Math.max(10, tableLeftX + 2);
                colW = nextHb ? Math.max(50, Math.round((nextHb.x - 4) - colX)) : Math.round(hb.width + 30);
            } else if (nextHb) {
                colX = Math.round(hb.x - 2);
                colW = Math.max(30, Math.round((nextHb.x - 4) - colX));
            } else {
                colX = Math.round(hb.x - 2);
                colW = Math.max(35, Math.round(tableRightX - 2 - colX));
            }

            const headerKey = (hb.str || "").trim();
            colBands.push({
                x: colX,
                width: colW,
                headerText: colHeaderMap[headerKey] || headerKey || "Column"
            });
        }

        const totalH = tableBottomY - tableTopY;
        const numRows = Math.max(10, Math.min(12, Math.round(totalH / 18.5)));
        const rowPitch = totalH / numRows;
        const tableRows = [];
        for (let r = 0; r < numRows; r++) {
            const rY = Math.round(tableTopY + (r * rowPitch) + 2);
            tableRows.push({ y: rY, height: 14 });
        }

        const headerMinY = Math.round(mainHeaderRow.y - 12);
        const resultFields = fields.filter(f => f.y < headerMinY || f.y > tableBottomY);

        tableRows.forEach((row, rowIndex) => {
            colBands.forEach(col => {
                const colHeader = col.headerText || "Column";
                const sem = DirectionalRaycaster.resolveSemanticProperties(`${colHeader}_${rowIndex + 1}`, "textField", usedNames);

                const newField = {
                    id: generateFieldId(),
                    type: "textField",
                    name: sem.name,
                    x: Math.max(10, col.x),
                    y: Math.max(10, row.y),
                    width: col.width,
                    height: row.height,
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

        return resultFields;
    }
}

// ============================================================================
// STAGE 3: Directional Raycasting & Local Context Decay
// ============================================================================
export class DirectionalRaycaster {
    static findLabelForBox(box, rawBlocks) {
        const boxMidY = box.y + (box.height / 2);

        // 1. Inside top of box: Look for text inside the box upper area
        const insideTop = rawBlocks.filter(tb => {
            if (isHeadingLabel(tb.str) || isArtifactString(tb.str)) return false;
            return tb.x >= (box.x - 4) && (tb.x + tb.width) <= (box.x + box.width + 4) &&
                   tb.y >= (box.y - 2) && tb.y <= (box.y + 18);
        });
        if (insideTop.length > 0) {
            const decoded = sanitizeAndDecodeLabel(insideTop[0].str);
            if (decoded) return insideTop[0].str;
        }

        // 2. Top Ray: Look up for stacked labels within max 24px
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

        // 3. Left Ray: Look left for inline labels within max 120px
        const leftBlocks = rawBlocks.filter(tb => {
            if (isHeadingLabel(tb.str) || isArtifactString(tb.str)) return false;
            const tbMidY = tb.y + (tb.height / 2);
            const isSameRow = Math.abs(tbMidY - boxMidY) <= 14;
            const isToLeft = (tb.x + tb.width) <= (box.x + 18) && (box.x - (tb.x + tb.width)) <= 120;
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

        return null;
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
            if (type === "dateField") defaultValue = match.defaultValue || "MM/DD/YYYY";
        }

        if (!baseId) {
            if (type === "signature") baseId = "signature";
            else if (type === "checkBox") {
                const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3);
                baseId = words.length > 0 && words[0].length > 0 ? words.join("_") : "checkbox";
            }
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

            // Engine 2: Semantic Text Layout & Checkbox / Colon Detection
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
                id: generateFieldId(),
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
                        if (dx >= 35 && dy <= 4 && dx < (pageWidth * 0.96)) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const [tx, ty] = applyMatrix(minX, minY, currentMatrix);
                            const lineCanvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasW = dx * Math.abs(currentMatrix[0] || 1);

                            if (lineCanvasY >= 45 && lineCanvasY <= (pageHeight * 0.96) && canvasX >= 5 && canvasX <= (pageWidth - 15)) {
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

                        // Check for thin horizontal line drawn as filled rectangle
                        if (boxH <= 3 && boxW >= 35 && boxW < (pageWidth * 0.96)) {
                            const lineCanvasY = canvasY + boxH;
                            if (lineCanvasY >= 45 && lineCanvasY <= (pageHeight * 0.96) && canvasX >= 5) {
                                const snapped = UnderlineBaselineSnapper.snapToUnderline(lineCanvasY, canvasX, boxW);
                                if (!occupancyGrid.isBlocked(snapped)) {
                                    rawLines.push(snapped);
                                }
                            }
                            continue;
                        }

                        if (canvasY < 45 || canvasY >= (pageHeight * 0.96)) continue;
                        if (boxW < 20 || boxH < 12) continue;
                        if (boxW >= (pageWidth * 0.94) && boxH >= (pageHeight * 0.85)) continue; // skip whole page border

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
            } else if (fn === OPS.rectangle && args) {
                const [rx, ry, rw, rh] = args;
                const [tx, ty] = applyMatrix(rx, ry, currentMatrix);
                const boxW = Math.abs(rw * (currentMatrix[0] || 1));
                const boxH = Math.abs(rh * (currentMatrix[3] || 1));
                const canvasY = pageHeight - ty - boxH;
                const canvasX = tx;

                if (boxH <= 3 && boxW >= 35 && boxW < (pageWidth * 0.96)) {
                    const lineCanvasY = canvasY + boxH;
                    if (lineCanvasY >= 45 && lineCanvasY <= (pageHeight * 0.96) && canvasX >= 5) {
                        const snapped = UnderlineBaselineSnapper.snapToUnderline(lineCanvasY, canvasX, boxW);
                        if (!occupancyGrid.isBlocked(snapped)) {
                            rawLines.push(snapped);
                        }
                    }
                    continue;
                }

                if (canvasY < 45 || canvasY >= (pageHeight * 0.96)) continue;
                if (boxW < 20 || boxH < 12) continue;
                if (boxW >= (pageWidth * 0.94) && boxH >= (pageHeight * 0.85)) continue;

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

// ── Helper: Precision 4-Phase Semantic Text Layout & Element Parser ──
function scanTextLayout(rawBlocks, viewport, pageNum, occupancyGrid) {
    const detected = [];
    const pageWidth = viewport.width;

    if (rawBlocks.length === 0) return { detected, lines: [] };

    const lines = clusterIntoLines(rawBlocks);

    for (let line of lines) {
        const text = line.str.trim();

        if (isHeadingLabel(text)) continue;
        if (line.y < 40 && !line.str.includes(":") && !/[_]{3,}/.test(line.str)) continue;
        if (CONTACT_OR_RESUME_KEYWORDS.test(text) && !text.includes(":")) continue;

        // Tracks consumed character ranges [start, end] on this line to prevent collisions
        const consumedRanges = [];

        // -------------------------------------------------------------
        // Phase 1: Checkbox & Radio Button Extraction
        // -------------------------------------------------------------
        const cbRegex = /(\[\s*\]|\(\s*\)|[☐□✓\u25A2\u25A1\u25EF\u25CB]|\[\s*[xX]\s*\]|\(\s*[•*]\s*\))\s*([a-zA-Z0-9\s\/\(\)\,\.\-\+\$\#]+?)(?=(?:\[\s*\]|\(\s*\)|[☐□✓\u25A2\u25A1\u25EF\u25CB]|\[\s*[xX]\s*\]|\(\s*[•*]\s*\)|$|\b(?:First Name|Last Name|Cardholder|Card Type|Expiration|CVV|Billing|City|Date|Signature|Badge|Job|Organization|Work|Mobile|Country)\b|(?<=\s)[A-Z][a-zA-Z\s\/]+:))/g;
        
        let cbMatch;
        while ((cbMatch = cbRegex.exec(text)) !== null) {
            const marker = cbMatch[1];
            const optLabel = cbMatch[2].trim();
            const charIdx = cbMatch.index;
            const matchLen = cbMatch[0].length;
            
            consumedRanges.push({ start: charIdx, end: charIdx + matchLen, type: "checkbox" });

            const charX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const charY = Math.round(line.y + (line.height - 16) / 2);

            if (optLabel && optLabel.length > 0 && !isHeadingLabel(optLabel)) {
                detected.push({
                    type: "checkBox",
                    rawLabel: optLabel,
                    x: Math.max(10, charX),
                    y: Math.max(10, charY),
                    width: 16,
                    height: 16,
                    borderStyle: "solid",
                    fillStyle: "white"
                });
            }
        }

        // -------------------------------------------------------------
        // Phase 2: Bracket Input Boxes (e.g. [ - - - ], [ MM / YY ], [   ])
        // -------------------------------------------------------------
        const bracketBoxRegex = /\[\s*([-–—\s]{2,}|MM\s*\/\s*YY|DD\s*\/\s*MM|YYYY|YY|CVC|CVV|\s{2,})\s*\]/gi;
        let bbMatch;
        while ((bbMatch = bracketBoxRegex.exec(text)) !== null) {
            const charIdx = bbMatch.index;
            const matchLen = bbMatch[0].length;
            consumedRanges.push({ start: charIdx, end: charIdx + matchLen, type: "bracketBox" });

            const boxX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const boxW = Math.max(50, Math.round((matchLen / Math.max(1, text.length)) * line.width));
            const boxY = Math.round(line.y - 1);

            const textBefore = text.slice(0, charIdx);
            const labelBeforeMatch = textBefore.match(/([a-zA-Z0-9\s\/\(\)\.\-\#]+?):\s*$/);
            const rawLabel = labelBeforeMatch ? labelBeforeMatch[1].trim() : "input_box";

            const isDate = /expiration|date|dob|mm\s*\/\s*yy/i.test(bbMatch[1] + " " + rawLabel);
            const isCVV = /cvv|cvc/i.test(rawLabel);

            detected.push({
                type: isDate ? "dateField" : "textField",
                rawLabel: rawLabel,
                x: Math.max(10, boxX),
                y: Math.max(10, boxY),
                width: Math.round(isCVV ? Math.min(boxW, 65) : boxW),
                height: 22,
                borderStyle: "solid",
                fillStyle: "white",
                ...(isDate ? { defaultValue: "MM/YY" } : {})
            });
        }

        // -------------------------------------------------------------
        // Phase 3: Underlines & Signatures (e.g. "Signature: X ________________", "Date: _______")
        // -------------------------------------------------------------
        const underlineRegex = /([_]{3,}|[.]{4,})/g;
        let ulMatch;
        while ((ulMatch = underlineRegex.exec(text)) !== null) {
            const charIdx = ulMatch.index;
            const matchLen = ulMatch[0].length;
            consumedRanges.push({ start: charIdx, end: charIdx + matchLen, type: "underline" });

            const textBefore = text.slice(0, charIdx);
            const labelBeforeMatch = textBefore.match(/([a-zA-Z0-9\s\/\(\)\.\-\#X]+?)[:\s]*$/);
            const rawLabel = labelBeforeMatch ? labelBeforeMatch[1].replace(/^[X\s]+/, "").trim() : "underline_field";

            const startX = Math.round(line.x + (charIdx / Math.max(1, text.length)) * line.width);
            const width = Math.max(80, Math.round((matchLen / Math.max(1, text.length)) * line.width));

            const isSig = /signature|sign/i.test(rawLabel);
            const isDate = /date|dob|\(mm\/dd\/yyyy\)/i.test(rawLabel);

            detected.push({
                type: isSig ? "signature" : (isDate ? "dateField" : "textField"),
                rawLabel: rawLabel,
                x: Math.max(10, startX),
                y: Math.max(10, Math.round(line.y - (isSig ? 8 : 1))),
                width: Math.min(width, pageWidth - startX - 25),
                height: isSig ? 44 : 24,
                borderStyle: "solid",
                fillStyle: "white",
                ...(isDate ? { defaultValue: "MM/DD/YYYY" } : {})
            });
        }

        // -------------------------------------------------------------
        // Phase 4: Text Prompt / Colon Labels (e.g. "First Name:", "Badge Name / Nickname:", "Work Email Address:")
        // -------------------------------------------------------------
        if (text.includes(":")) {
            const labelRegex = /([a-zA-Z0-9\s\/\(\)\.\-\#\$]+?):/g;
            const labelMatches = [...text.matchAll(labelRegex)];

            for (let i = 0; i < labelMatches.length; i++) {
                const match = labelMatches[i];
                const nextMatch = labelMatches[i + 1];
                const labelPart = match[1].trim();

                if (isHeadingLabel(labelPart)) continue;
                if (/^(?:from|to|terms|due)$/i.test(labelPart)) continue;

                const matchStartIdx = match.index;
                const matchEndIdx = match.index + match[0].length;

                // Check if this label is followed immediately by checkboxes/radios or bracket boxes
                const followedByCheckbox = consumedRanges.some(r => 
                    r.type === "checkbox" && r.start >= matchEndIdx && (r.start - matchEndIdx) <= 25
                );
                if (followedByCheckbox) {
                    // Group title like "Prefix:", "Payment Method:", "Card Type:", "Dietary Requirements:" -> DO NOT create text field
                    continue;
                }

                const followedByUnderline = consumedRanges.some(r => 
                    r.type === "underline" && r.start >= matchEndIdx && (r.start - matchEndIdx) <= 25
                );
                if (followedByUnderline) {
                    continue;
                }

                const insideConsumed = consumedRanges.some(r => matchStartIdx >= r.start && matchEndIdx <= r.end);
                if (insideConsumed) continue;

                // Calculate field bounds
                const nextStartIdx = nextMatch ? nextMatch.index : text.length;
                const labelEndX = line.x + (matchEndIdx / Math.max(1, text.length)) * line.width;
                const nextLabelX = nextMatch 
                    ? (line.x + (nextStartIdx / Math.max(1, text.length)) * line.width)
                    : (line.x + line.width);

                const targetX = Math.round(labelEndX + 4);
                let targetW = Math.max(45, Math.round(nextLabelX - targetX - 6));

                if (!nextMatch) {
                    const rightNeighbor = lines.find(other => 
                        other !== line && 
                        Math.abs(other.y - line.y) <= 8 && 
                        other.x > targetX
                    );
                    if (rightNeighbor) {
                        targetW = Math.max(45, Math.min(200, (rightNeighbor.x - 10) - targetX));
                    } else {
                        targetW = Math.min(240, Math.max(60, pageWidth - targetX - 35));
                    }
                }

                const isSig = /signature|sign/i.test(labelPart);
                const isDate = /date|dob|\(mm\/dd\/yyyy\)|\(yyyy-mm-dd\)/i.test(labelPart);
                const isMulti = /comments|notes|remarks|allergies|medications|responsibilities|reason\s*for|description|message/i.test(labelPart);

                if (targetX < (pageWidth - 25) && line.y > 40) {
                    detected.push({
                        type: isSig ? "signature" : (isDate ? "dateField" : "textField"),
                        rawLabel: labelPart,
                        x: Math.max(10, targetX),
                        y: Math.max(10, Math.round(line.y - 1)),
                        width: Math.round(targetW),
                        height: isSig ? 44 : (isMulti ? 55 : 24),
                        borderStyle: "solid",
                        fillStyle: "white",
                        multiline: isMulti,
                        ...(isDate ? { defaultValue: "MM/DD/YYYY" } : {})
                    });
                }
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
                defaultValue: item.defaultValue || "",
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
                        defaultValue: item.defaultValue || "",
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

function fuseDetections(acroFormFields, vectorElements, textResult, rawBlocks, viewport, pageNum, usedNames, occupancyGrid) {
    const fused = [...acroFormFields];
    const { detected: textDetections } = textResult;

    for (let td of textDetections) {
        if (occupancyGrid.isBlocked(td)) continue;
        if (isOverlappingAny(td, fused)) continue;

        const rawLabel = (td.rawLabel && td.rawLabel !== "text") ? td.rawLabel : (DirectionalRaycaster.findLabelForBox(td, rawBlocks) || `field_${usedNames.size + 1}`);
        if (isHeadingLabel(rawLabel)) continue;
        const sem = DirectionalRaycaster.resolveSemanticProperties(rawLabel, td.type, usedNames);

        fused.push({
            id: generateFieldId(),
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

    for (let ve of vectorElements) {
        if (occupancyGrid.isBlocked(ve)) continue;
        if (isOverlappingAny(ve, fused)) continue;

        const touchesExisting = fused.some(f => {
            const xOverlap = Math.max(0, Math.min(ve.x + ve.width, f.x + f.width) - Math.max(ve.x, f.x));
            const yOverlap = Math.max(0, Math.min(ve.y + ve.height, f.y + f.height) - Math.max(ve.y, f.y));
            return (xOverlap > 0 && yOverlap > 0);
        });
        if (touchesExisting) continue;

        if (ve.width > (viewport.width * 0.38) && ve.height > 25) continue;
        if (ve.height > 35) continue;

        const rawLabel = DirectionalRaycaster.findLabelForBox(ve, rawBlocks);
        if (!rawLabel) continue;

        const effectiveLabel = rawLabel;
        if (isHeadingLabel(effectiveLabel)) continue;
        if (/^(?:from|to|bill\s*from|bill\s*to)$/i.test(effectiveLabel) && ve.width < 50) continue;

        const sem = DirectionalRaycaster.resolveSemanticProperties(effectiveLabel, "textField", usedNames);
        let finalType = sem.type;
        if ((finalType === "checkBox" || finalType === "radioGroup") && (ve.width > 35 || ve.height > 35 || Math.abs(ve.width - ve.height) > 12)) {
            finalType = "textField";
        }

        fused.push({
            id: generateFieldId(),
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
