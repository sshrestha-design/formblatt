// ── Precision Semantic PDF Form Field Auto-Detector (js/auto-detector.js) ─────────
// Multi-Engine PDF Form Field Recognition Pipeline:
// Engine 0: Native AcroForm Widget Annotation Parser (Widget flags, Choice options, Radio Groups)
// Engine 1: Vector Path Analysis (Grid intersections, curves, dynamic baseline calculations)
// Engine 2: Spatial Text Layout & Character Comb Clustering (3-Way Label Association & Comb Grids)
// Engine 3: IoU Fusion, Semantic Property Resolution & Non-Destructive State Sync

import { state } from "./state.js";
import { saveHistory } from "./storage-manager.js";

// ── Expanded Semantic Dictionary with Patterns & Input Format Masks ──────────
const SEMANTIC_DICTIONARY = [
    // Invoice & Billing Specific Fields
    { regex: /invoice\s*n(?:o|um|umber)?|inv\s*#|factura/i, id: "invoice_number_input", title: "Invoice Number", type: "textField", autofill: "invoice_num", score: 12 },
    { regex: /po\s*n(?:o|um|umber)?|p\.o\.\s*#|purchase\s*order/i, id: "po_number_input", title: "PO Number", type: "textField", score: 12 },
    { regex: /due\s*date|payment\s*due/i, id: "due_date_input", title: "Due Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 12 },
    { regex: /invoice\s*date|issue\s*date|date\s*of\s*issue/i, id: "invoice_date_input", title: "Invoice Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 12 },
    { regex: /bill\s*to|billed\s*to|invoice\s*to|client\s*name|customer/i, id: "bill_to_input", title: "Bill To", type: "textField", multiline: true, score: 12 },
    { regex: /ship\s*to|deliver\s*to|shipping\s*address/i, id: "ship_to_input", title: "Ship To", type: "textField", multiline: true, score: 10 },
    { regex: /vat\s*(?:id|num|number)?|tax\s*id|gstin|ein\s*num/i, id: "tax_id_input", title: "Tax ID / VAT", type: "textField", score: 10 },
    { regex: /payment\s*terms|terms/i, id: "payment_terms_input", title: "Payment Terms", type: "textField", score: 10 },
    { regex: /subtotal|sub-total/i, id: "subtotal_input", title: "Subtotal", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /discount/i, id: "discount_input", title: "Discount", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /shipping|freight/i, id: "shipping_fee_input", title: "Shipping Fee", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /total\s*amount|amount\s*due|balance\s*due|^total\b/i, id: "total_amount_input", title: "Total Amount", type: "textField", formatMask: "$#,##0.00", score: 12 },
    { regex: /unit\s*price|rate|price/i, id: "unit_price_input", title: "Unit Price", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /qty|quantity/i, id: "quantity_input", title: "Quantity", type: "textField", score: 10 },
    { regex: /amount|line\s*total/i, id: "line_amount_input", title: "Line Amount", type: "textField", formatMask: "$#,##0.00", score: 10 },

    // Financial & Tax Forms (IRS W-9, W-4, 1099, Banking, Direct Deposit)
    { regex: /routing\s*n(?:o|um|umber)?|aba\s*routing|transit\s*n(?:o|um|umber)?/i, id: "routing_number_input", title: "Routing Number", type: "textField", formatMask: "#########", score: 12 },
    { regex: /account\s*n(?:o|um|umber)?|bank\s*account/i, id: "account_number_input", title: "Account Number", type: "textField", score: 12 },
    { regex: /taxpayer\s*id|tin\b|ein\b/i, id: "taxpayer_id_input", title: "Taxpayer ID / EIN", type: "textField", formatMask: "##-#######", score: 12 },
    { regex: /ssn|social\s*security/i, id: "ssn_input", title: "Social Security Number (SSN)", type: "textField", formatMask: "###-##-####", score: 12 },
    { regex: /filing\s*status|marital\s*status/i, id: "filing_status_input", title: "Filing / Marital Status", type: "dropdown", options: ["Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household"], score: 10 },
    { regex: /gross\s*income|annual\s*income|net\s*income/i, id: "annual_income_input", title: "Annual Income", type: "textField", formatMask: "$#,##0.00", score: 10 },

    // Phone Extensions & Fax Numbers
    { regex: /ext(?:ension)?|x\d{1,5}/i, id: "phone_extension_input", title: "Phone Extension", type: "textField", formatMask: "Ext. ###", score: 10 },
    { regex: /fax\s*(?:n(?:o|um|umber)?)?/i, id: "fax_number_input", title: "Fax Number", type: "textField", formatMask: "(###) ###-####", autofill: "fax", score: 10 },

    // Passwords & PIN Codes
    { regex: /pin\b|pin\s*code|security\s*code|passcode/i, id: "pin_code_input", title: "PIN Code", type: "textField", isPassword: true, score: 12 },
    { regex: /password|secret/i, id: "password_input", title: "Password", type: "textField", isPassword: true, score: 12 },

    // Healthcare & Medical Forms (Patient Intake, Insurance Claims, HIPAA)
    { regex: /patient\s*name/i, id: "patient_name_input", title: "Patient Name", type: "textField", autofill: "name", score: 12 },
    { regex: /patient\s*id|mrn\b|medical\s*record/i, id: "patient_id_input", title: "Patient ID / MRN", type: "textField", score: 12 },
    { regex: /insurance\s*(?:company|provider|carrier|plan)/i, id: "insurance_provider_input", title: "Insurance Provider", type: "textField", score: 12 },
    { regex: /policy\s*n(?:o|um|umber)?|group\s*n(?:o|um|umber)?|member\s*id/i, id: "insurance_policy_input", title: "Policy / Member ID", type: "textField", score: 12 },
    { regex: /primary\s*care|pcp|physician|doctor/i, id: "physician_name_input", title: "Primary Care Physician", type: "textField", score: 10 },
    { regex: /medical\s*history|allergies|medications/i, id: "medical_history_input", title: "Medical History / Allergies", type: "textField", multiline: true, score: 10 },

    // HR & Employment Forms (I-9, Onboarding, NDAs, Timecards)
    { regex: /employee\s*id|staff\s*id|worker\s*id/i, id: "employee_id_input", title: "Employee ID", type: "textField", score: 12 },
    { regex: /hire\s*date|start\s*date|employment\s*date/i, id: "hire_date_input", title: "Hire Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 10 },
    { regex: /manager\s*name|supervisor/i, id: "manager_name_input", title: "Manager / Supervisor", type: "textField", score: 10 },
    { regex: /hours\s*worked|overtime\s*hours/i, id: "hours_worked_input", title: "Hours Worked", type: "textField", score: 10 },
    { regex: /work\s*authorization|visa\s*status|citizenship/i, id: "work_auth_input", title: "Work Authorization", type: "textField", score: 10 },

    // Real Estate, Rental & Property Management (Lease Agreements, Rental Apps)
    { regex: /property\s*address|premises|unit\s*#|apt\s*#/i, id: "property_address_input", title: "Property Address", type: "textField", autofill: "address1", score: 12 },
    { regex: /monthly\s*rent|rent\s*amount/i, id: "monthly_rent_input", title: "Monthly Rent", type: "textField", formatMask: "$#,##0.00", score: 12 },
    { regex: /security\s*deposit|deposit\s*amount/i, id: "security_deposit_input", title: "Security Deposit", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /landlord|lessor/i, id: "landlord_name_input", title: "Landlord Name", type: "textField", score: 10 },
    { regex: /tenant|lessee/i, id: "tenant_name_input", title: "Tenant Name", type: "textField", score: 10 },
    { regex: /lease\s*start|move-?in\s*date/i, id: "move_in_date_input", title: "Move-In Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 10 },

    // Legal, Contracts & Agreements (NDAs, SLA, Release Forms, Notary)
    { regex: /effective\s*date|execution\s*date/i, id: "effective_date_input", title: "Effective Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 12 },
    { regex: /disclosing\s*party|party\s*a/i, id: "disclosing_party_input", title: "Disclosing Party", type: "textField", score: 10 },
    { regex: /receiving\s*party|party\s*b/i, id: "receiving_party_input", title: "Receiving Party", type: "textField", score: 10 },
    { regex: /governing\s*law|jurisdiction/i, id: "governing_law_input", title: "Governing Law", type: "textField", score: 10 },
    { regex: /witness\s*signature/i, id: "witness_signature_input", title: "Witness Signature", type: "signature", score: 12 },
    { regex: /witness\s*name/i, id: "witness_name_input", title: "Witness Name", type: "textField", score: 10 },
    { regex: /initials?|sign\s*initials/i, id: "initials_input", title: "Initials", type: "textField", score: 10 },
    { regex: /notary|seal|notary\s*public/i, id: "notary_seal_input", title: "Notary Public / Seal", type: "textField", score: 10 },

    // Education & Student Enrollment
    { regex: /student\s*id|enrolment\s*n(?:o|um|umber)?/i, id: "student_id_input", title: "Student ID", type: "textField", score: 12 },
    { regex: /parent\s*name|guardian\s*name/i, id: "parent_name_input", title: "Parent / Guardian Name", type: "textField", score: 10 },
    { regex: /grade\s*level|school\s*year/i, id: "grade_level_input", title: "Grade Level", type: "textField", score: 10 },

    // Government & Licensing (Passports, Driver's Licenses)
    { regex: /passport\s*n(?:o|um|umber)?/i, id: "passport_number_input", title: "Passport Number", type: "textField", score: 12 },
    { regex: /driver.?s?\s*license|dl\s*n(?:o|um|umber)?/i, id: "dl_number_input", title: "Driver's License Number", type: "textField", score: 12 },
    { regex: /expiry\s*date|expiration\s*date/i, id: "expiration_date_input", title: "Expiration Date", type: "dateField", formatMask: "MM/DD/YYYY", score: 10 },

    // Standard Names & Prefixes
    { regex: /prefix|salutation|title\s*\(mr|mrs\)/i, id: "prefix_input", title: "Prefix / Title", type: "dropdown", options: ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."], score: 10 },
    { regex: /first\s*name/i, id: "first_name_input", title: "First Name", type: "textField", autofill: "first_name", score: 10 },
    { regex: /middle\s*name|middle\s*initial/i, id: "middle_name_input", title: "Middle Name", type: "textField", autofill: "additional_name", score: 10 },
    { regex: /last\s*name|surname/i, id: "last_name_input", title: "Last Name", type: "textField", autofill: "last_name", score: 10 },
    { regex: /suffix|\b(?:jr|sr|iii|iv)\b/i, id: "suffix_input", title: "Suffix", type: "dropdown", options: ["Jr.", "Sr.", "II", "III", "IV"], score: 10 },
    { regex: /full\s*name|^name\b/i, id: "full_name_input", title: "Full Name", type: "textField", autofill: "name", score: 10 },

    // General Contact Fields
    { regex: /location|city|ort|standort/i, id: "location_input", title: "Location", type: "textField", autofill: "city", score: 10 },
    { regex: /applied\s*for|applied\s*job|position\s*applied|target\s*role/i, id: "applied_job_input", title: "Applied Job", type: "textField", score: 10 },
    { regex: /contract|contract\s*type/i, id: "contract_type_input", title: "Contract Type", type: "textField", score: 10 },
    { regex: /availability|available\s*from|start\s*date|commence/i, id: "availability_input", title: "Availability", type: "textField", score: 10 },
    { regex: /department|dept|division/i, id: "department_input", title: "Department", type: "textField", score: 10 },
    { regex: /social\s*media|social|website|linkedin|portfolio/i, id: "social_media_input", title: "Social Media", type: "textField", score: 10 },
    { regex: /proposed\s*salary|desired\s*salary/i, id: "proposed_salary_input", title: "Proposed Salary", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /expected\s*salary/i, id: "expected_salary_input", title: "Expected Salary", type: "textField", formatMask: "$#,##0.00", score: 10 },
    { regex: /degree|qualification|major|bachelor|master|phd|diploma/i, id: "degree_input", title: "Degree / Major", type: "textField", score: 10 },
    { regex: /salary|remuneration/i, id: "salary_input", title: "Salary", type: "textField", formatMask: "$#,##0.00", score: 5 },
    { regex: /university|college|school|institution/i, id: "university_input", title: "University", type: "textField", score: 10 },
    { regex: /experience|years\s*of\s*experience/i, id: "experience_input", title: "Years of Experience", type: "textField", score: 10 },
    { regex: /e-?p?mail/i, id: "email_address_input", title: "Email Address", type: "textField", autofill: "email", score: 10 },
    { regex: /\bphone\b|\bmobile\b|\bcell\b|\btelephone\b|\btel\b/i, id: "phone_number_input", title: "Phone Number", type: "textField", formatMask: "(###) ###-####", autofill: "phone", score: 10 },
    { regex: /street|address\s*line/i, id: "street_address_input", title: "Street Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /address/i, id: "address_input", title: "Address", type: "textField", autofill: "address1", score: 10 },
    { regex: /state|province|region|bundesland/i, id: "state_input", title: "State / Province", type: "textField", autofill: "state", score: 10 },
    { regex: /zip|postal|postcode|plz/i, id: "zip_code_input", title: "Zip Code", type: "textField", formatMask: "#####", autofill: "zip", score: 10 },
    { regex: /country|land/i, id: "country_input", title: "Country", type: "textField", autofill: "country", score: 10 },
    { regex: /date\s*of\s*birth|dob|birth\s*date/i, id: "date_of_birth_input", title: "Date of Birth", type: "dateField", formatMask: "MM/DD/YYYY", autofill: "bday", score: 10 },
    { regex: /signature|sign\s*here|authorized\s*sign/i, id: "signature_input", title: "Applicant Signature", type: "signature", score: 10 },
    { regex: /^date\b|date\s*signed|today.?s\s*date/i, id: "date_signed_input", title: "Date Signed", type: "dateField", formatMask: "MM/DD/YYYY", score: 10 },
    { regex: /company|organization|employer/i, id: "company_name_input", title: "Company Name", type: "textField", autofill: "company", score: 10 },
    { regex: /title|position|occupation|role/i, id: "job_title_input", title: "Job Title", type: "textField", score: 10 },
    { regex: /reference|referee/i, id: "reference_input", title: "Reference", type: "textField", score: 10 },
    { regex: /comments|notes|remarks|message|description|explanation/i, id: "comments_input", title: "Additional Comments", type: "textField", multiline: true, score: 10 },
    { regex: /emergency\s*contact/i, id: "emergency_contact_input", title: "Emergency Contact", type: "textField", score: 10 },
    { regex: /gender|sex/i, id: "gender_input", title: "Gender", type: "dropdown", options: ["Male", "Female", "Non-binary", "Prefer not to say"], score: 10 },
    { regex: /notice\s*period/i, id: "notice_period_input", title: "Notice Period", type: "textField", score: 10 },
    { regex: /\byes\b/i, id: "opt_yes", title: "Yes", type: "checkBox", score: 10 },
    { regex: /\bno\b/i, id: "opt_no", title: "No", type: "checkBox", score: 10 }
];

const CONTACT_OR_RESUME_KEYWORDS = /(?:@|\.(?:com|org|net|io|edu|gov|co|uk|de)|https?:\/\/|\+?\d{2,4}[-\s]?\d{3,4}|\b(?:linkedin|github|twitter|portfolio|behance|dribbble|email|phone|location|tel|mobile|website|experience|education|skills|projects|summary|profile|awards|languages|hobbies)\b)/i;

// Helper: Determine if label text is a section title or heading rule
function isHeadingLabel(text) {
    if (!text) return false;
    const clean = text.trim().replace(/[:_.\s-]+$/, "");
    if (!clean || clean.length < 2) return false;

    // Never classify invoice fields as headings
    if (/(?:invoice\s*n|inv\s*#|bill\s*to|ship\s*to|due\s*date|po\s*number|p\.o\.\s*#|subtotal|amount\s*due|balance\s*due|total\s*amount|payment\s*terms)/i.test(clean)) {
        return false;
    }

    // Short section titles like "JOB", "CONTRACT", "LOCATION", "CONTACT", "DETAILS", "NOTES"
    if (/^(?:job|contract|location|contact|details|notes|summary|profile|education|experience|skills|hobbies|languages|references)$/i.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        return true;
    }

    // Explicit heading & title keywords without colons or underlines
    if (/(?:pdf|form|example|sample|demonstration|section|part|chapter|header|heading|overview|instructions|notice|declaration|statement|agreement|terms|conditions|general|personal|employment|contact|applicant|signature\s*section|certification|schedule|table\s*of\s*contents|disclaimer|privacy|policy|service|scope|appendix|exhibit|attachment|document|summary|description|profile|record|details|information|page)/i.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        const isFieldKeyword = /^(?:first\s*name|last\s*name|full\s*name|name|email|phone|address|city|state|zip|date|dob|ssn|ein|title|company|country)$/i.test(clean);
        if (!isFieldKeyword) {
            return true;
        }
    }

    // Numbered headings like "1. Personal Information" or "2) Employment Details"
    if (/^\d+[\.\)]\s*/.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        return true;
    }

    // Roman numerals or section numbering like "PART I", "PART 1", "SECTION A", "CHAPTER 2"
    if (/^(?:SECTION|PART|CHAPTER|HEADER|TITLE|SCHEDULE|EXHIBIT|APPENDIX)\s*[\dABCDEFIVX]+/i.test(clean)) {
        return true;
    }

    // ALL CAPS text without colons or underlines (e.g. "JOB", "CONTRACT", "PDF FORM EXAMPLE")
    if (/^[A-Z0-9\s\-\/\&]{3,}$/.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        const isShortFieldLabel = /^(?:SSN|EIN|DOB|NAME|CITY|ZIP|DATE|STATE|PHONE|EMAIL|TITLE|AGE|FAX|ID|QTY|PRICE|TAX|TOTAL|SUBTOTAL|INVOICE)$/i.test(clean);
        if (!isShortFieldLabel) {
            return true;
        }
    }

    return false;
}

// ── Main Auto-Detection Entrypoint (Non-Destructive State Sync) ────────────
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
            
            // Extract raw text items in canvas coordinate space
            const rawBlocks = textContent.items.map(item => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontHeight = Math.abs(item.transform[3]) || item.height || 12;
                const x = tx;
                const y = viewport.height - ty - fontHeight;
                const width = item.width;
                const height = fontHeight;
                const str = (item.str || "").trim();
                return { x, y, width, height, fontHeight, str };
            }).filter(tb => tb.str.length > 0);

            // Engine 0: Native AcroForm Annotation Reader (Widget flags, choice options, radio groups)
            const acroFormFields = await extractExistingAnnotations(page, viewport, pageNum, usedNames);

            // Engine 1: Vector Drawing Path Extraction & Coordinate Grid Intersections
            const vectorElements = await extractVectorPaths(page, viewport, rawBlocks);

            // Engine 2: Spatial Text Layout, Character Comb Grids & 3-Way Label Association
            const textElements = scanTextLayout(rawBlocks, viewport, pageNum);

            // Engine 3: IoU Fusion & Semantic Property Resolution
            const merged = fuseDetections(acroFormFields, vectorElements, textElements, rawBlocks, viewport, pageNum, usedNames);
            newFields.push(...merged);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        // Non-destructive page sync: Preserve fields flagged as user-edited/manual
        const userManualFields = state.fields.filter(f => f.isManual || f.userEdited || f.isCustom);
        const autoFieldsToKeep = state.fields.filter(f => !pagesToScan.includes(f.page || 1) && !userManualFields.includes(f));
        
        const nonOverlappingNew = newFields.filter(nf => !isOverlappingAnyIoU(nf, userManualFields, 0.30));

        state.fields = [...userManualFields, ...autoFieldsToKeep, ...nonOverlappingNew];
        state.selectedFieldIds.clear();
        nonOverlappingNew.forEach(f => state.selectedFieldIds.add(f.id));
        saveHistory();
        totalDetected = nonOverlappingNew.length;
    }

    return totalDetected;
}

// ── Engine 0: Native AcroForm Annotation Extraction ────────────────────────
async function extractExistingAnnotations(page, viewport, pageNum, usedNames) {
    const fields = [];
    try {
        const annotations = await page.getAnnotations();
        if (!annotations || annotations.length === 0) return fields;

        for (let annot of annotations) {
            if (annot.subtype !== "Widget" && !annot.fieldName) continue;

            const rect = annot.rect;
            if (!rect || rect.length < 4) continue;

            const pdfX = rect[0];
            const pdfY = rect[1];
            const pdfW = Math.abs(rect[2] - rect[0]);
            const pdfH = Math.abs(rect[3] - rect[1]);

            const canvasX = Math.round(pdfX);
            const canvasY = Math.round(viewport.height - pdfY - pdfH);
            const canvasW = Math.round(pdfW);
            const canvasH = Math.round(pdfH);

            if (canvasW < 8 || canvasH < 6) continue;

            // Extract Widget Flags directly from annot.fieldFlags
            const flags = annot.fieldFlags || 0;
            const readOnly = !!(flags & 0x1);
            const required = !!(flags & 0x2);
            const multilineFlag = !!(flags & 0x1000);
            const passwordFlag = !!(flags & 0x2000);
            const isRadioFlag = !!(flags & 0x8000);
            const isPushButtonFlag = !!(flags & 0x10000);
            const isCombFlag = !!(flags & 0x100000);
            const maxLen = annot.maxLen || annot.maxLength || null;

            let type = "textField";

            // Extract Option list for Choice (Ch) fields
            let extractedOptions = [];
            if (Array.isArray(annot.options)) {
                extractedOptions = annot.options.map(opt => typeof opt === "object" ? (opt.displayValue || opt.exportValue || "") : String(opt));
            } else if (Array.isArray(annot.opt)) {
                extractedOptions = annot.opt.map(opt => typeof opt === "object" ? (opt.displayValue || opt.exportValue || "") : String(opt));
            }

            // Distinguish Radio Buttons from Checkboxes
            let exportValue = annot.buttonValue || annot.exportValue || annot.appearanceState || "choice";
            if (annot.fieldType === "Btn") {
                if (isRadioFlag || annot.radioButton) {
                    type = "radioGroup";
                } else if (!isPushButtonFlag) {
                    type = "checkBox";
                } else {
                    continue; // Skip push buttons
                }
            } else if (annot.fieldType === "Sig") {
                type = "signature";
            } else if (annot.fieldType === "Ch") {
                type = "dropdown";
            } else if (annot.fieldType === "Tx") {
                type = "textField";
            }

            const rawName = annot.fieldName || annot.alternativeText || `acro_${fields.length + 1}`;
            const sem = resolveSemanticProperties(rawName, type, usedNames);

            fields.push({
                id: Date.now() + Math.random(),
                type: sem.type || type,
                name: sem.name,
                x: Math.max(10, canvasX),
                y: Math.max(10, canvasY),
                width: Math.max(18, canvasW),
                height: Math.max(14, canvasH),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                readOnly: readOnly,
                required: required,
                multiline: multilineFlag || canvasH >= 40 || sem.multiline || false,
                isPassword: passwordFlag || sem.isPassword || false,
                comb: isCombFlag || sem.comb || false,
                maxLen: maxLen || sem.maxLen || null,
                options: extractedOptions.length > 0 ? extractedOptions : (sem.options || []),
                exportValue: type === "radioGroup" ? exportValue : undefined,
                autofill: sem.autofill || "",
                ...(annot.fieldValue ? { defaultValue: String(annot.fieldValue) } : {})
            });
        }
    } catch(err) {
        console.warn("AcroForm annotation extraction warning:", err);
    }
    return fields;
}

// ── Engine 1: Vector Drawing Path & Coordinate Grid Extraction ─────────────
async function extractVectorPaths(page, viewport, rawBlocks) {
    const vectorElements = [];
    const horizLines = [];
    const vertLines = [];
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
            } else if ((fn === OPS.constructPath || fn === OPS.closePath || fn === OPS.bezierCurveTo || fn === OPS.curveTo) && args) {
                // Support path operations including closePath & bezier curves
                const pathOps = args[0] || [];
                const pathArgs = args[1] || [];
                let argIdx = 0;
                let subpathStartX = 0, subpathStartY = 0;
                let lastX = 0, lastY = 0;

                for (let p = 0; p < pathOps.length; p++) {
                    const op = pathOps[p];
                    if (op === OPS.moveTo) {
                        subpathStartX = pathArgs[argIdx++];
                        subpathStartY = pathArgs[argIdx++];
                        lastX = subpathStartX;
                        lastY = subpathStartY;
                    } else if (op === OPS.lineTo) {
                        const curX = pathArgs[argIdx++];
                        const curY = pathArgs[argIdx++];
                        
                        const dx = Math.abs(curX - lastX);
                        const dy = Math.abs(curY - lastY);
                        
                        // Horizontal segment tracking
                        if (dx >= 15 && dy <= 3.5 && dx < (pageWidth * 0.95)) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const [tx, ty] = applyMatrix(minX, minY, currentMatrix);
                            const lineCanvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasW = dx * Math.abs(currentMatrix[0] || 1);

                            if (lineCanvasY >= 10 && lineCanvasY <= (pageHeight - 15) && canvasX >= 5 && canvasW >= 15) {
                                horizLines.push({
                                    x: Math.max(10, Math.round(canvasX)),
                                    y: Math.round(lineCanvasY),
                                    width: Math.round(canvasW)
                                });
                            }
                        }

                        // Vertical segment tracking
                        if (dy >= 12 && dx <= 3.5 && dy < (pageHeight * 0.90)) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const [tx, ty] = applyMatrix(minX, minY, currentMatrix);
                            const lineCanvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasH = dy * Math.abs(currentMatrix[3] || 1);

                            if (canvasX >= 5 && canvasX <= (pageWidth - 10) && canvasH >= 12) {
                                vertLines.push({
                                    x: Math.round(canvasX),
                                    y: Math.round(lineCanvasY - canvasH),
                                    height: Math.round(canvasH)
                                });
                            }
                        }

                        lastX = curX;
                        lastY = curY;
                    } else if (op === OPS.closePath) {
                        // ClosePath: Connect last position back to subpath start
                        lastX = subpathStartX;
                        lastY = subpathStartY;
                    } else if (op === OPS.bezierCurveTo || op === OPS.curveTo) {
                        // Advance 6 Bezier control point arguments
                        argIdx += 6;
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

                        if (canvasY >= 10 && canvasY <= (pageHeight - 15) && boxW >= 12 && boxH >= 10 && boxH <= 250 && boxW <= (pageWidth * 0.95)) {
                            // Classify Vector Checkboxes / Radio buttons vs Text Boxes
                            const isSquareShape = Math.abs(boxW - boxH) <= 5 && boxW <= 24 && boxH <= 24;
                            vectorElements.push({
                                type: isSquareShape ? "checkBox" : "text_box",
                                x: Math.max(10, Math.round(canvasX)),
                                y: Math.max(10, Math.round(canvasY)),
                                width: Math.round(boxW),
                                height: Math.round(boxH)
                            });
                        }
                    }
                }
            } else if (fn === OPS.rectangle && args) {
                // Support standalone 're' PDF rectangle operators
                const [rx, ry, rw, rh] = args;
                const [tx, ty] = applyMatrix(rx, ry, currentMatrix);
                const boxW = Math.abs(rw * (currentMatrix[0] || 1));
                const boxH = Math.abs(rh * (currentMatrix[3] || 1));
                const canvasY = pageHeight - ty - boxH;
                const canvasX = tx;

                if (canvasY >= 10 && canvasY <= (pageHeight - 15) && boxW >= 12 && boxH >= 10 && boxH <= 250 && boxW <= (pageWidth * 0.95)) {
                    const isSquareShape = Math.abs(boxW - boxH) <= 5 && boxW <= 24 && boxH <= 24;
                    vectorElements.push({
                        type: isSquareShape ? "checkBox" : "text_box",
                        x: Math.max(10, Math.round(canvasX)),
                        y: Math.max(10, Math.round(canvasY)),
                        width: Math.round(boxW),
                        height: Math.round(boxH)
                    });
                }
            }
        }

        // ── Grid Intersection: Multi-Column Table Cell Construction ────────
        if (horizLines.length > 0 && vertLines.length > 0) {
            const sortedH = [...horizLines].sort((a, b) => a.y - b.y);
            const sortedV = [...vertLines].sort((a, b) => a.x - b.x);

            // Intersect horizontal lines y_i & vertical lines x_j to form grid cells
            for (let i = 0; i < sortedH.length - 1; i++) {
                const topH = sortedH[i];
                const botH = sortedH[i + 1];
                const cellHeight = botH.y - topH.y;

                if (cellHeight >= 14 && cellHeight <= 50) {
                    // Find vertical lines spanning between topH and botH
                    const colBoundaries = sortedV.filter(v => 
                        (v.y <= topH.y + 5) && ((v.y + v.height) >= botH.y - 5) &&
                        v.x >= Math.min(topH.x, botH.x) - 5 && v.x <= Math.max(topH.x + topH.width, botH.x + botH.width) + 5
                    );

                    if (colBoundaries.length >= 2) {
                        for (let c = 0; c < colBoundaries.length - 1; c++) {
                            const leftV = colBoundaries[c];
                            const rightV = colBoundaries[c + 1];
                            const cellWidth = rightV.x - leftV.x;

                            if (cellWidth >= 20 && cellWidth <= (pageWidth * 0.90)) {
                                vectorElements.push({
                                    type: "table_cell",
                                    x: Math.round(leftV.x),
                                    y: Math.round(topH.y),
                                    width: Math.round(cellWidth),
                                    height: Math.round(cellHeight)
                                });
                            }
                        }
                    }
                }
            }
        }

        // ── Standalone Underline Analysis with Dynamic Baseline & Height Positioning ──
        if (horizLines.length > 0) {
            const sortedLines = [...horizLines].sort((a, b) => a.y - b.y);
            const uniqueLines = [];
            for (const l of sortedLines) {
                if (!uniqueLines.some(u => Math.abs(u.y - l.y) <= 3 && Math.abs(u.x - l.x) <= 12)) {
                    uniqueLines.push(l);
                }
            }

            for (let l of uniqueLines) {
                // Find static text label sitting to the left or above this line
                const lineMidY = l.y;
                const leftLabel = rawBlocks.find(tb => {
                    const isNearY = Math.abs((tb.y + tb.height / 2) - lineMidY) <= 16 || (tb.y < l.y && (l.y - tb.y) <= 25);
                    const isLeft = tb.x <= (l.x + l.width * 0.6) && (tb.x + tb.width) >= (l.x - 12);
                    return isNearY && isLeft;
                });

                // Skip section headings (e.g. "JOB", "CONTRACT", "LOCATION")
                if (leftLabel && isHeadingLabel(leftLabel.str)) continue;

                // Dynamic Field Height & Baseline Positioning
                const labelFontHeight = leftLabel ? (leftLabel.fontHeight || leftLabel.height || 12) : 12;
                const dynamicHeight = Math.max(20, Math.min(36, Math.round(labelFontHeight * 1.8)));

                let startX = l.x;
                if (leftLabel && leftLabel.x < (l.x + l.width - 30)) {
                    startX = Math.max(l.x, Math.round(leftLabel.x + leftLabel.width + 6));
                }
                const fieldW = Math.max(45, Math.round((l.x + l.width) - startX));

                if (fieldW >= 35 && startX < (pageWidth - 30)) {
                    vectorElements.push({
                        type: "line",
                        x: Math.max(10, startX),
                        y: Math.max(10, Math.round(l.y - dynamicHeight)),
                        width: Math.min(fieldW, pageWidth - startX - 15),
                        height: dynamicHeight
                    });
                }
            }
        }
    } catch(err) {
        console.warn("Vector extraction warning:", err);
    }

    return vectorElements;
}

// Coordinate Matrix Multiplication Helper
function applyMatrix(x, y, m) {
    return [
        m[0] * x + m[2] * y + m[4],
        m[1] * x + m[3] * y + m[5]
    ];
}

// ── Engine 2: Spatial Text Layout & Character Comb Clustering ──────────────
function scanTextLayout(rawBlocks, viewport, pageNum) {
    const detected = [];
    const pageWidth = viewport.width;

    if (rawBlocks.length === 0) return { detected, lines: [] };

    // Cluster into lines respecting multi-column gutters
    const lines = clusterIntoLinesWithGutters(rawBlocks);
    const fontHeights = lines.map(l => l.height).sort((a, b) => a - b);
    const medianFontHeight = fontHeights[Math.floor(fontHeights.length / 2)] || 12;

    // ── Comb / Character Grid Recognition ──────────────────────────────────
    // Scan for consecutive horizontally adjacent character boxes (width 12-25px, gap < 4px)
    const smallCharBoxes = rawBlocks.filter(b => b.width >= 10 && b.width <= 26 && b.height >= 12 && b.height <= 30);
    if (smallCharBoxes.length >= 3) {
        const sortedChars = [...smallCharBoxes].sort((a, b) => Math.abs(a.y - b.y) <= 4 ? a.x - b.x : a.y - b.y);
        let currentGroup = [];

        for (let b of sortedChars) {
            if (currentGroup.length === 0) {
                currentGroup.push(b);
            } else {
                const prev = currentGroup[currentGroup.length - 1];
                const sameRow = Math.abs(prev.y - b.y) <= 4;
                const gap = b.x - (prev.x + prev.width);

                if (sameRow && gap >= -2 && gap <= 5) {
                    currentGroup.push(b);
                } else {
                    if (currentGroup.length >= 3) {
                        const minX = currentGroup[0].x;
                        const minY = currentGroup[0].y;
                        const totalW = (currentGroup[currentGroup.length - 1].x + currentGroup[currentGroup.length - 1].width) - minX;
                        const avgH = Math.round(currentGroup.reduce((s, c) => s + c.height, 0) / currentGroup.length);

                        detected.push({
                            type: "textField",
                            comb: true,
                            maxLen: currentGroup.length,
                            rawLabel: "comb_field",
                            x: Math.max(10, Math.round(minX)),
                            y: Math.max(10, Math.round(minY)),
                            width: Math.round(totalW),
                            height: Math.max(22, avgH + 4),
                            borderStyle: "solid",
                            fillStyle: "white"
                        });
                    }
                    currentGroup = [b];
                }
            }
        }
        if (currentGroup.length >= 3) {
            const minX = currentGroup[0].x;
            const minY = currentGroup[0].y;
            const totalW = (currentGroup[currentGroup.length - 1].x + currentGroup[currentGroup.length - 1].width) - minX;
            const avgH = Math.round(currentGroup.reduce((s, c) => s + c.height, 0) / currentGroup.length);

            detected.push({
                type: "textField",
                comb: true,
                maxLen: currentGroup.length,
                rawLabel: "comb_field",
                x: Math.max(10, Math.round(minX)),
                y: Math.max(10, Math.round(minY)),
                width: Math.round(totalW),
                height: Math.max(22, avgH + 4),
                borderStyle: "solid",
                fillStyle: "white"
            });
        }
    }

    for (let line of lines) {
        const text = line.str.trim();

        // Skip banner headers & section titles
        if (line.height > (medianFontHeight * 2.2)) continue;
        if (isHeadingLabel(text)) continue;

        // Skip contact rows without explicit colons
        if (CONTACT_OR_RESUME_KEYWORDS.test(text) && !text.includes(":")) continue;

        // Checkbox Markers: "[ ]", "☐", "□", "( )"
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

        // Blank Text Underlines (e.g. "Full Name: ____________________")
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
                height: isSig ? 44 : 26,
                borderStyle: "solid",
                fillStyle: "white",
                ...(isDate ? { defaultValue: "MM/DD/YYYY" } : {})
            });
            continue;
        }

        // Explicit Colon Labels with Genuine Blank Space to the Right
        const hasExplicitColon = text.endsWith(":") || text.includes(":");
        if (hasExplicitColon) {
            const parts = text.split(":");
            const labelPart = parts[0].trim();
            const afterColon = (parts[1] || "").trim();

            if (afterColon.length > 0) continue;

            const hasRightNeighbor = lines.some(other => {
                if (other === line) return false;
                const sameRow = Math.abs(other.y - line.y) <= 8;
                const isRight = other.x > (line.x + line.width + 6);
                return sameRow && isRight;
            });

            if (!hasRightNeighbor && line.x < (pageWidth * 0.65)) {
                const targetX = Math.round(line.x + line.width + 6);
                const targetY = Math.round(line.y - 1);
                const availableWidth = Math.max(80, pageWidth - targetX - 35);

                const isSig = /signature|sign/i.test(labelPart);
                const isDate = /date|dob/i.test(labelPart);
                const isMulti = /comments|notes|remarks|description|message/i.test(labelPart);

                const fieldWidth = Math.min(isMulti ? 380 : 250, availableWidth);

                if (fieldWidth >= 60 && targetX < (pageWidth - 40)) {
                    detected.push({
                        type: isSig ? "signature" : (isDate ? "dateField" : "textField"),
                        rawLabel: labelPart,
                        x: targetX,
                        y: targetY,
                        width: Math.round(fieldWidth),
                        height: isSig ? 44 : (isMulti ? 60 : 26),
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

// ── 3-Way Spatial Association (Left, Above, Below) ─────────────────────────
function findNearbyLabelForBox(box, rawBlocks) {
    let bestMatch = null;
    let minDistance = Infinity;
    const boxMidY = box.y + (box.height / 2);

    for (let tb of rawBlocks) {
        if (isHeadingLabel(tb.str)) continue;
        const decoded = sanitizeAndDecodeLabel(tb.str);
        if (!decoded) continue;

        const tbMidY = tb.y + (tb.height / 2);

        // 1. Left Association: Label sits to the left of the input box
        const isLeft = (tb.x + tb.width) <= (box.x + 18) && (box.x - (tb.x + tb.width)) <= 250 && Math.abs(tbMidY - boxMidY) <= 20;
        
        // 2. Above Association: Label sits directly above the input box
        const isAbove = Math.abs(tb.x - box.x) <= 80 && tb.y < box.y && (box.y - (tb.y + tb.height)) <= 35;
        
        // 3. Below Association: Label sits directly below the input line (e.g., "(Print Name)", "(Signature)", "(Date)")
        const isBelow = Math.abs(tb.x - box.x) <= 80 && tb.y > box.y && (tb.y - (box.y + box.height)) <= 25;

        if (isLeft || isAbove || isBelow) {
            let dist = Infinity;
            if (isLeft) dist = box.x - (tb.x + tb.width);
            else if (isAbove) dist = (box.y - (tb.y + tb.height)) * 1.4;
            else if (isBelow) dist = (tb.y - (box.y + box.height)) * 1.5;

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = tb.str;
            }
        }
    }

    return bestMatch;
}

// ── Engine 3: Fusion & IoU Overlap Deduplication ────────────────────────────
function fuseDetections(acroFormFields, vectorElements, textResult, rawBlocks, viewport, pageNum, usedNames) {
    const fused = [...acroFormFields];
    const { detected: textDetections } = textResult;

    // 1. Process Vector Elements and pair with closest text labels
    for (let ve of vectorElements) {
        if (overlapsAnyText(ve, rawBlocks)) continue;

        // Skip vector elements under section headings
        const isHeadingVector = rawBlocks.some(tb => {
            const isNearY = Math.abs((tb.y + tb.height / 2) - (ve.y + ve.height / 2)) <= 25 || (tb.y < ve.y && (ve.y - tb.y) <= 30);
            const isNearX = Math.abs(tb.x - ve.x) <= 120 || (tb.x + tb.width >= ve.x - 10 && tb.x <= ve.x + ve.width + 10);
            return isNearY && isNearX && isHeadingLabel(tb.str);
        });
        if (isHeadingVector) continue;

        const rawLabel = findNearbyLabelForBox(ve, rawBlocks) || `field_${usedNames.size + 1}`;
        if (isHeadingLabel(rawLabel)) continue;

        const sem = resolveSemanticProperties(rawLabel, ve.type === "checkBox" ? "checkBox" : "textField", usedNames);

        fused.push({
            id: Date.now() + Math.random(),
            type: ve.type === "checkBox" ? "checkBox" : sem.type,
            name: sem.name,
            x: ve.x,
            y: ve.y,
            width: ve.width,
            height: ve.height,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: sem.multiline || ve.height >= 45,
            formatMask: sem.formatMask || "",
            autofill: sem.autofill || "",
            ...(sem.defaultValue ? { defaultValue: sem.defaultValue } : {})
        });
    }

    // 2. Add text-based detections using IoU deduplication
    for (let td of textDetections) {
        if (overlapsAnyText(td, rawBlocks)) continue;

        const isCoveredIoU = fused.some(f => {
            const iou = calculateIoU(td, f);
            const sameRow = Math.abs(td.y - f.y) <= 16;
            const sameArea = Math.abs(td.x - f.x) <= 220;
            return iou > 0.30 || (sameRow && sameArea);
        });

        if (!isCoveredIoU) {
            const rawLabel = (td.rawLabel && td.rawLabel !== "text") ? td.rawLabel : (findNearbyLabelForBox(td, rawBlocks) || `field_${usedNames.size + 1}`);
            if (isHeadingLabel(rawLabel)) continue;
            const sem = resolveSemanticProperties(rawLabel, td.type, usedNames);

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
                comb: td.comb || sem.comb || false,
                maxLen: td.maxLen || sem.maxLen || null,
                formatMask: sem.formatMask || "",
                autofill: sem.autofill || "",
                ...(td.defaultValue || sem.defaultValue ? { defaultValue: td.defaultValue || sem.defaultValue } : {})
            });
        }
    }

    return fused;
}

// ── Standardized Intersection over Union (IoU) Calculation ─────────────────
function calculateIoU(boxA, boxB) {
    const xOverlap = Math.max(0, Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x));
    const yOverlap = Math.max(0, Math.min(boxA.y + boxA.height, boxB.y + boxB.height) - Math.max(boxA.y, boxB.y));
    const intersectionArea = xOverlap * yOverlap;

    if (intersectionArea <= 0) return 0;

    const areaA = boxA.width * boxA.height;
    const areaB = boxB.width * boxB.height;
    const unionArea = areaA + areaB - intersectionArea;

    return unionArea > 0 ? (intersectionArea / unionArea) : 0;
}

// ── Resolve Semantic Properties & Formatting Masks ─────────────────────────
function resolveSemanticProperties(rawLabel, defaultType = "textField", usedNames = new Set()) {
    let clean = (rawLabel || "").trim().replace(/[:_.\s-]+$/, "");
    let baseId = "";
    let type = defaultType;
    let multiline = false;
    let autofill = "";
    let formatMask = "";
    let defaultValue = "";
    let options = [];
    let isPassword = false;
    let comb = false;
    let maxLen = null;

    const match = sanitizeAndDecodeLabel(clean);
    if (match) {
        baseId = match.id;
        if (match.type) type = match.type;
        if (match.multiline) multiline = true;
        if (match.autofill) autofill = match.autofill;
        if (match.formatMask) formatMask = match.formatMask;
        if (match.options) options = match.options;
        if (match.isPassword) isPassword = true;
        if (match.comb) comb = true;
        if (match.maxLen) maxLen = match.maxLen;
        if (type === "dateField") defaultValue = "MM/DD/YYYY";
    }

    if (!baseId) {
        if (type === "signature") baseId = "signature";
        else if (type === "checkBox") baseId = "checkbox";
        else if (type === "radioGroup") baseId = "radio_option";
        else if (type === "dropdown") baseId = "select_option";
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

    return { name: finalId, type, multiline, autofill, formatMask, defaultValue, options, isPassword, comb, maxLen };
}

// ── Check if bounding box overlaps un-fillable printed text ────────────────
function overlapsAnyText(box, rawBlocks) {
    return rawBlocks.some(tb => {
        // Ignore lines, underscores, dots, and placeholders inside box
        if (/^[_.\s-]+$/.test(tb.str)) return false;
        
        // Ignore light placeholder text printed inside box (e.g. "Enter email", "Signature", "MM/DD/YYYY")
        if (/(?:enter|type|print|sign|signature|mm\/dd\/yyyy|here|optional)/i.test(tb.str) &&
            tb.x >= box.x - 5 && (tb.x + tb.width) <= (box.x + box.width + 5) &&
            tb.y >= box.y - 5 && (tb.y + tb.height) <= (box.y + box.height + 5)) {
            return false;
        }

        const xOverlap = Math.max(0, Math.min(box.x + box.width, tb.x + tb.width) - Math.max(box.x, tb.x));
        const yOverlap = Math.max(0, Math.min(box.y + box.height, tb.y + tb.height) - Math.max(box.y, tb.y));
        const overlapArea = xOverlap * yOverlap;
        const tbArea = tb.width * tb.height;

        return tbArea > 0 && (overlapArea / tbArea) > 0.12;
    });
}

// ── Helper: Check if string is OCR / subset-font garbled artifact ──────────
function isArtifactString(str) {
    if (!str || str.length < 2) return true;
    if (/^\d+(_\d+)*$/.test(str) || (str.replace(/[^0-9]/g, "").length / str.length) > 0.35) return true;
    
    // Subset font character artifacts like "ilhogb46", "llhogb37", "abcde12"
    if (/^[a-zA-Z]{3,}\d+$/.test(str)) return true;

    const lettersOnly = str.replace(/[^a-zA-Z]/g, "");
    if (lettersOnly.length >= 4) {
        const vowels = lettersOnly.match(/[aeiouyAEIOUY]/g) || [];
        const vowelRatio = vowels.length / lettersOnly.length;
        if (vowelRatio < 0.25 || /[^aeiouyAEIOUY\s]{5,}/.test(lettersOnly)) {
            return true;
        }
    }
    return false;
}

// ── Sanitize, Decode Subset-Font Artifacts, and Classify Label ─────────────
function sanitizeAndDecodeLabel(rawLabel) {
    if (!rawLabel) return null;
    
    const priorityShifts = [0, 29, -29, 3, -3, 1, -1, 4, -4, 2, -2];
    const otherShifts = [];
    for (let s = -40; s <= 40; s++) {
        if (!priorityShifts.includes(s)) otherShifts.push(s);
    }
    const allShifts = [...priorityShifts, ...otherShifts];

    let bestMatch = null;
    let bestScore = -1;

    for (const shift of allShifts) {
        let res = "";
        for (let i = 0; i < rawLabel.length; i++) {
            const code = rawLabel.charCodeAt(i);
            const ch = rawLabel[i];
            if (ch === "v" && shift === 29) res += ":";
            else if (ch === " ") res += " ";
            else {
                const target = code + shift;
                if (target >= 32 && target <= 126) res += String.fromCharCode(target);
                else res += ch;
            }
        }

        const clean = res.replace(/^\d+[\.\s\)]*/, "")
                         .replace(/[:_.\s-]+$/, "")
                         .trim();
        if (!clean || clean.length < 2) continue;

        for (const item of SEMANTIC_DICTIONARY) {
            if (item.regex.test(clean)) {
                const score = item.score || 10;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        id: item.id,
                        title: item.title,
                        type: item.type || "textField",
                        multiline: item.multiline || false,
                        autofill: item.autofill || "",
                        formatMask: item.formatMask || "",
                        options: item.options || [],
                        isPassword: item.isPassword || false
                    };
                }
            }
        }
    }

    if (bestMatch) return bestMatch;

    // Direct words fallback
    for (const shift of priorityShifts) {
        let res = "";
        for (let i = 0; i < rawLabel.length; i++) {
            const code = rawLabel.charCodeAt(i);
            const ch = rawLabel[i];
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

        const words = clean.split(/\s+/).filter(w => /^[a-zA-Z0-9\/\-\(\)]+$/.test(w));
        if (words.length >= 1 && words.length <= 6) {
            const cleanWords = words.map(w => w.replace(/[^a-zA-Z0-9]/g, "")).filter(w => w.length > 0);
            if (cleanWords.length > 0) {
                const cleanId = cleanWords.join("_").toLowerCase() + "_input";
                const title = cleanWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                return { id: cleanId, title: title, type: "textField" };
            }
        }
    }

    return null;
}

// ── Multi-Column Column Boundary Aware Text Line Clustering ────────────────
function clusterIntoLinesWithGutters(blocks) {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => (Math.abs(a.y - b.y) <= 4 ? a.x - b.x : a.y - b.y));
    const lines = [];
    let currentLine = null;

    for (let b of sorted) {
        if (!currentLine) {
            currentLine = { ...b, items: [b] };
        } else {
            const sameBaseline = Math.abs(currentLine.y - b.y) <= 6;
            // Column Gutter Guard: Prevent merging text items across wide gaps (> 35px)
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

// Check if candidate field overlaps any manual user field using IoU threshold
function isOverlappingAnyIoU(field, list, threshold = 0.30) {
    return list.some(existing => {
        if (existing.page !== field.page) return false;
        const iou = calculateIoU(field, existing);
        return iou > threshold;
    });
}
