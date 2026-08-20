// ── Precision Semantic PDF Form Field Auto-Detector (js/auto-detector.js) ─
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
    { regex: /payment\s*terms|terms/i, id: "payment_terms_input", title: "Payment Terms", type: "textField", score: 10 },
    { regex: /subtotal|sub-total/i, id: "subtotal_input", title: "Subtotal", type: "textField", score: 10 },
    { regex: /discount/i, id: "discount_input", title: "Discount", type: "textField", score: 10 },
    { regex: /shipping|freight/i, id: "shipping_fee_input", title: "Shipping Fee", type: "textField", score: 10 },
    { regex: /total\s*amount|amount\s*due|balance\s*due|^total\b/i, id: "total_amount_input", title: "Total Amount", type: "textField", score: 12 },
    { regex: /unit\s*price|rate|price/i, id: "unit_price_input", title: "Unit Price", type: "textField", score: 10 },
    { regex: /qty|quantity/i, id: "quantity_input", title: "Quantity", type: "textField", score: 10 },
    { regex: /amount|line\s*total/i, id: "line_amount_input", title: "Line Amount", type: "textField", score: 10 },

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

    // Education & Student Enrollment
    { regex: /student\s*id|enrolment\s*n(?:o|um|umber)?/i, id: "student_id_input", title: "Student ID", type: "textField", score: 12 },
    { regex: /parent\s*name|guardian\s*name/i, id: "parent_name_input", title: "Parent / Guardian Name", type: "textField", score: 10 },
    { regex: /grade\s*level|school\s*year/i, id: "grade_level_input", title: "Grade Level", type: "textField", score: 10 },

    // Government & Licensing (Passports, Driving Licenses)
    { regex: /passport\s*n(?:o|um|umber)?/i, id: "passport_number_input", title: "Passport Number", type: "textField", score: 12 },
    { regex: /driver.?s?\s*license|dl\s*n(?:o|um|umber)?/i, id: "dl_number_input", title: "Driver's License Number", type: "textField", score: 12 },
    { regex: /expiry\s*date|expiration\s*date/i, id: "expiration_date_input", title: "Expiration Date", type: "dateField", score: 10 },

    // Standard Person & Contact Fields
    { regex: /first\s*name/i, id: "first_name_input", title: "First Name", type: "textField", autofill: "first_name", score: 10 },
    { regex: /last\s*name|surname/i, id: "last_name_input", title: "Last Name", type: "textField", autofill: "last_name", score: 10 },
    { regex: /full\s*name|^name\b/i, id: "full_name_input", title: "Full Name", type: "textField", score: 10 },
    { regex: /location|city|ort|standort/i, id: "location_input", title: "Location", type: "textField", autofill: "city", score: 10 },
    { regex: /applied\s*for|applied\s*job|position\s*applied|target\s*role/i, id: "applied_job_input", title: "Applied Job", type: "textField", score: 10 },
    { regex: /contract|contract\s*type/i, id: "contract_type_input", title: "Contract Type", type: "textField", score: 10 },
    { regex: /availability|available\s*from|start\s*date|commence/i, id: "availability_input", title: "Availability", type: "textField", score: 10 },
    { regex: /department|dept|division/i, id: "department_input", title: "Department", type: "textField", score: 10 },
    { regex: /social\s*media|social|website|linkedin|portfolio/i, id: "social_media_input", title: "Social Media", type: "textField", score: 10 },
    { regex: /proposed\s*salary|desired\s*salary/i, id: "proposed_salary_input", title: "Proposed Salary", type: "textField", score: 10 },
    { regex: /expected\s*salary/i, id: "expected_salary_input", title: "Expected Salary", type: "textField", score: 10 },
    { regex: /degree|qualification|major|bachelor|master|phd|diploma/i, id: "degree_input", title: "Degree / Major", type: "textField", score: 10 },
    { regex: /salary|remuneration/i, id: "salary_input", title: "Salary", type: "textField", score: 5 },
    { regex: /university|college|school|institution/i, id: "university_input", title: "University", type: "textField", score: 10 },
    { regex: /experience|years\s*of\s*experience/i, id: "experience_input", title: "Years of Experience", type: "textField", score: 10 },
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
    { regex: /reference|referee/i, id: "reference_input", title: "Reference", type: "textField", score: 10 },
    { regex: /comments|notes|remarks|message|description|explanation/i, id: "comments_input", title: "Additional Comments", type: "textField", multiline: true, score: 10 },
    { regex: /emergency\s*contact/i, id: "emergency_contact_input", title: "Emergency Contact", type: "textField", score: 10 },
    { regex: /ssn|social\s*security/i, id: "ssn_input", title: "SSN", type: "textField", score: 10 },
    { regex: /gender|sex/i, id: "gender_input", title: "Gender", type: "textField", score: 10 },
    { regex: /notice\s*period/i, id: "notice_period_input", title: "Notice Period", type: "textField", score: 10 },
    { regex: /\byes\b/i, id: "opt_yes", title: "Yes", type: "checkBox", score: 10 },
    { regex: /\bno\b/i, id: "opt_no", title: "No", type: "checkBox", score: 10 }
];

const CONTACT_OR_RESUME_KEYWORDS = /(?:@|\.(?:com|org|net|io|edu|gov|co|uk|de)|https?:\/\/|\+?\d{2,4}[-\s]?\d{3,4}|\b(?:linkedin|github|twitter|portfolio|behance|dribbble|email|phone|location|tel|mobile|website|experience|education|skills|projects|summary|profile|awards|languages|hobbies)\b)/i;

const FORM_CHOICE_KEYWORDS = /\b(?:yes|no|male|female|other|agree|accept|single|married|full\s*time|part\s*time|contract|mr|mrs|ms|dr|option|decline)\b/i;

const HEADING_PATTERNS = /^(?:section|part|chapter|header|heading|overview|instructions|notice|declaration|statement|agreement|terms\s*and\s*conditions|general\s*information|personal\s*information|employment\s*history|contact\s*details|applicant\s*information|signature\s*section|certification|schedule|table\s*of\s*contents|disclaimer|privacy\s*policy|terms\s*of\s*service|scope\s*of\s*work)\b/i;

function isHeadingLabel(text) {
    if (!text) return false;
    const clean = text.trim().replace(/[:_.\s-]+$/, "");
    if (!clean || clean.length < 2) return false;

    // Never classify invoice fields as headings
    if (/(?:invoice\s*n|inv\s*#|bill\s*to|ship\s*to|due\s*date|po\s*number|p\.o\.\s*#|subtotal|amount\s*due|balance\s*due|total\s*amount|payment\s*terms)/i.test(clean)) {
        return false;
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

    // ALL CAPS text without colons or underlines (e.g. "PDF FORM EXAMPLE", "TAXPAYER IDENTIFICATION NUMBER")
    if (/^[A-Z0-9\s\-\/\&]{5,}$/.test(clean) && !text.includes(":") && !/[_]{3,}/.test(text)) {
        const isShortFieldLabel = /^(?:SSN|EIN|DOB|NAME|CITY|ZIP|DATE|STATE|PHONE|EMAIL|TITLE|AGE|FAX|ID|QTY|PRICE|TAX|TOTAL|SUBTOTAL|INVOICE)$/i.test(clean);
        if (!isShortFieldLabel) {
            return true;
        }
    }

    return false;
}

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
            
            // Raw text items in canvas coordinate space
            const rawBlocks = textContent.items.map(item => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontHeight = Math.abs(item.transform[3]) || item.height || 12;
                const x = tx;
                const y = viewport.height - ty - fontHeight;
                const width = item.width;
                const height = fontHeight;
                const str = (item.str || "").trim();
                return { x, y, width, height, str };
            }).filter(tb => tb.str.length > 0);

            // Engine 0: Native AcroForm Annotation Reader
            const acroFormFields = await extractExistingAnnotations(page, viewport, pageNum, usedNames);

            // Engine 1: Vector Drawing Path Detection
            const vectorElements = await extractVectorPaths(page, viewport, rawBlocks);

            // Engine 2: Semantic Text Layout & Keyword Detection
            const textElements = scanTextLayout(rawBlocks, viewport, pageNum);

            // Engine 3: Fusion & Semantic AcroForm ID Resolution
            const merged = fuseDetections(acroFormFields, vectorElements, textElements, rawBlocks, viewport, pageNum, usedNames);
            newFields.push(...merged);
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    if (newFields.length > 0) {
        const existingPageFields = state.fields.filter(f => pagesToScan.includes(f.page || 1));
        const nonOverlapping = newFields.filter(nf => !isOverlappingAny(nf, state.fields));
        
        if (nonOverlapping.length > 0) {
            state.fields.push(...nonOverlapping);
            state.selectedFieldIds.clear();
            nonOverlapping.forEach(f => state.selectedFieldIds.add(f.id));
            saveHistory();
            totalDetected = nonOverlapping.length;
        } else if (existingPageFields.length > 0) {
            // User re-ran auto-detect on current page: refresh fields with latest names & labels
            state.fields = state.fields.filter(f => !pagesToScan.includes(f.page || 1));
            state.fields.push(...newFields);
            state.selectedFieldIds.clear();
            newFields.forEach(f => state.selectedFieldIds.add(f.id));
            saveHistory();
            totalDetected = newFields.length;
        }
    }

    return totalDetected;
}

// ── Engine 0: Native AcroForm Annotation Extraction ─────────────────
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

            if (canvasW < 10 || canvasH < 8) continue;

            let type = "textField";
            let multiline = false;

            if (annot.fieldType === "Btn") {
                type = "checkBox";
            } else if (annot.fieldType === "Sig") {
                type = "signature";
            } else if (annot.fieldType === "Ch") {
                type = "dropdown";
            } else if (annot.fieldType === "Tx") {
                type = "textField";
                multiline = canvasH >= 40 || !!annot.multiLine;
            }

            const rawName = annot.fieldName || annot.alternativeText || `acro_${fields.length + 1}`;
            const sem = resolveSemanticProperties(rawName, type, usedNames);

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

// ── Engine 1: Vector Drawing Path Extraction ─────────────────────────
async function extractVectorPaths(page, viewport, rawBlocks) {
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
                        if (dx >= 20 && dy <= 3.5 && dx < (pageWidth * 0.95)) {
                            const minX = Math.min(lastX, curX);
                            const minY = Math.min(lastY, curY);
                            const [tx, ty] = applyMatrix(minX, minY, currentMatrix);
                            const lineCanvasY = pageHeight - ty;
                            const canvasX = tx;
                            const canvasW = dx * Math.abs(currentMatrix[0] || 1);

                            if (lineCanvasY >= (pageHeight * 0.02) && lineCanvasY <= (pageHeight * 0.93) && canvasX >= 5 && canvasX <= (pageWidth - 20) && canvasW >= 20) {
                                // Skip decorative full-width section divider lines (line width >= 65% of page width without prompt label)
                                const isDecorativeDivider = canvasW >= (pageWidth * 0.65) || canvasW >= 380;
                                const hasPromptLabel = rawBlocks.some(tb => {
                                    const isNearY = Math.abs((tb.y + tb.height / 2) - lineCanvasY) <= 18;
                                    const isNearX = Math.abs(tb.x - canvasX) <= 120;
                                    return isNearY && isNearX && (tb.str.includes(":") || /[_]{3,}/.test(tb.str));
                                });

                                if (!isDecorativeDivider || hasPromptLabel) {
                                    rawLines.push({
                                        x: Math.max(10, Math.round(canvasX)),
                                        y: Math.round(lineCanvasY),
                                        width: Math.round(Math.min(canvasW, pageWidth - canvasX - 15))
                                    });
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

                        if (canvasY >= (pageHeight * 0.02) && canvasY <= (pageHeight * 0.93) && boxW >= 20 && boxH >= 12 && boxH <= 200 && boxW <= (pageWidth * 0.95)) {
                            vectorElements.push({
                                type: "text_box",
                                x: Math.max(10, Math.round(canvasX)),
                                y: Math.max(10, Math.round(canvasY)),
                                width: Math.round(boxW),
                                height: Math.round(boxH)
                            });
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

                if (canvasY >= (pageHeight * 0.16) && boxW >= 45 && boxH >= 15 && boxH <= 160 && boxW <= (pageWidth * 0.92)) {
                    vectorElements.push({
                        type: "text_box",
                        x: Math.max(10, Math.round(canvasX)),
                        y: Math.max(10, Math.round(canvasY)),
                        width: Math.round(boxW),
                        height: Math.round(boxH)
                    });
                }
            }
        }

        // Process horizontal lines into table row cells and standalone underlines
        if (rawLines.length > 0) {
            const sortedLines = [...rawLines].sort((a, b) => a.y - b.y);
            const uniqueLines = [];
            for (const l of sortedLines) {
                if (!uniqueLines.some(u => Math.abs(u.y - l.y) <= 3 && Math.abs(u.x - l.x) <= 12)) {
                    uniqueLines.push(l);
                }
            }

            const usedIndices = new Set();
            // 1. Detect stacked lines forming table row cells
            for (let i = 0; i < uniqueLines.length - 1; i++) {
                const top = uniqueLines[i];
                const bot = uniqueLines[i + 1];
                const gap = bot.y - top.y;

                if (gap >= 14 && gap <= 45 && Math.abs(top.x - bot.x) <= 25) {
                    vectorElements.push({
                        type: "table_cell",
                        x: Math.max(top.x, bot.x),
                        y: top.y,
                        width: Math.min(top.width, bot.width),
                        height: gap
                    });
                    usedIndices.add(i);
                    usedIndices.add(i + 1);
                }
            }

            // 2. Standalone single underlines (no paired line within cell height)
            for (let i = 0; i < uniqueLines.length; i++) {
                if (!usedIndices.has(i)) {
                    const l = uniqueLines[i];
                    vectorElements.push({
                        type: "line",
                        x: l.x,
                        y: Math.max(10, l.y - 24),
                        width: l.width,
                        height: 24
                    });
                }
            }
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

// ── Engine 2: Semantic Text Layout & Keyword Scanning ────────────────
function scanTextLayout(rawBlocks, viewport, pageNum) {
    const detected = [];
    const pageWidth = viewport.width;

    if (rawBlocks.length === 0) return { detected, lines: [] };

    const lines = clusterIntoLines(rawBlocks);
    const fontHeights = lines.map(l => l.height).sort((a, b) => a - b);
    const medianFontHeight = fontHeights[Math.floor(fontHeights.length / 2)] || 12;

    for (let line of lines) {
        const text = line.str.trim();

        // Skip giant banner headers (font height > 2.2x median) and section titles
        if (line.height > (medianFontHeight * 2.2)) continue;
        if (isHeadingLabel(text)) continue;

        // Skip top margin areas (top 2% of page) unless there is an explicit colon or underline
        if (line.y < (viewport.height * 0.02) && !line.str.includes(":") && !/[_]{3,}/.test(line.str)) continue;

        // Skip contact rows (emails, phones, locations, social links, headers)
        if (CONTACT_OR_RESUME_KEYWORDS.test(text) && !text.includes(":")) continue;

        // A. True Checkbox Markers in text: "[ ]", "☐", "□", "( )"
        if (/^(\[\s*\]|\(\s*\)|[☐□✓])$/.test(text)) {
            // Find option text to the right
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

        // B. Blank Text Underlines (e.g. "Full Name: ____________________")
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

        // C. Explicit Colon Labels with Genuine Blank Space to the Right
        const hasExplicitColon = text.endsWith(":") || text.includes(":");
        if (hasExplicitColon) {
            const parts = text.split(":");
            const labelPart = parts[0].trim();
            const afterColon = (parts[1] || "").trim();

            // If text already exists after the colon (e.g. "Name: John Doe" or "Email: sagar@gmail.com"), ignore it
            if (afterColon.length > 0) continue;

            // Verify no other text line sits to the right
            const hasRightNeighbor = lines.some(other => {
                if (other === line) return false;
                const sameRow = Math.abs(other.y - line.y) <= 8;
                const isRight = other.x > (line.x + line.width + 6);
                return sameRow && isRight;
            });

            if (!hasRightNeighbor && line.x < (pageWidth * 0.6)) {
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

// ── Helper: Check if string is OCR / subset-font garbled artifact ────
function isArtifactString(str) {
    if (!str || str.length < 2) return true;
    if (/^\d+(_\d+)*$/.test(str) || (str.replace(/[^0-9]/g, "").length / str.length) > 0.35) return true;
    
    // Subset font encoded character artifacts like "ilhogb46", "llhogb37", "abcde12"
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

// ── Sanitize, Decode Subset-Font Artifacts, and Classify Label ───────
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
                        autofill: item.autofill || ""
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

// ── Helper: Find Nearest Static Text Label for Any Bounding Box ──────
function findNearbyLabelForBox(box, rawBlocks) {
    const boxMidY = box.y + (box.height / 2);

    // 1. Text block on the same row to the left (vertical center within 14px of boxMidY)
    const leftBlocks = rawBlocks.filter(tb => {
        const tbMidY = tb.y + (tb.height / 2);
        const isSameRow = Math.abs(tbMidY - boxMidY) <= 14;
        const isToLeft = (tb.x + tb.width) <= (box.x + 18) && (box.x - (tb.x + tb.width)) <= 250;
        return isSameRow && isToLeft;
    }).sort((a, b) => {
        const dYa = Math.abs((a.y + a.height / 2) - boxMidY);
        const dYb = Math.abs((b.y + b.height / 2) - boxMidY);
        if (Math.abs(dYa - dYb) > 3) return dYa - dYb;
        return (box.x - (a.x + a.width)) - (box.x - (b.x + b.width));
    });

    for (let tb of leftBlocks) {
        if (isHeadingLabel(tb.str)) continue;
        const decoded = sanitizeAndDecodeLabel(tb.str);
        if (decoded) return tb.str;
    }

    if (leftBlocks.length > 0) {
        const combined = leftBlocks.map(b => b.str).join(" ");
        if (!isHeadingLabel(combined)) {
            const decoded = sanitizeAndDecodeLabel(combined);
            if (decoded) return combined;
        }
    }

    // 2. Text block directly above the box
    const aboveBlocks = rawBlocks.filter(tb => {
        const isAbove = tb.y < box.y && (box.y - (tb.y + tb.height)) <= 35;
        const isAligned = Math.abs(tb.x - box.x) <= 80 || (tb.x >= box.x && (tb.x + tb.width) <= (box.x + box.width + 30));
        return isAbove && isAligned;
    }).sort((a, b) => (box.y - (a.y + a.height)) - (box.y - (b.y + b.height)));

    for (let tb of aboveBlocks) {
        if (isHeadingLabel(tb.str)) continue;
        const decoded = sanitizeAndDecodeLabel(tb.str);
        if (decoded) return tb.str;
    }

    // 3. Fallback: closest text block within 150px
    let bestMatch = null;
    let minDistance = Infinity;
    for (let tb of rawBlocks) {
        if (isHeadingLabel(tb.str)) continue;
        const decoded = sanitizeAndDecodeLabel(tb.str);
        if (!decoded) continue;

        const tbMidY = tb.y + (tb.height / 2);
        const isLeft = (tb.x + tb.width) <= (box.x + 18) && (box.x - (tb.x + tb.width)) <= 250 && Math.abs(tbMidY - boxMidY) <= 20;
        const isAbove = Math.abs(tb.x - box.x) <= 80 && tb.y <= box.y && (box.y - (tb.y + tb.height)) <= 35;
        if (isLeft || isAbove) {
            const dist = isLeft ? (box.x - (tb.x + tb.width)) : ((box.y - (tb.y + tb.height)) * 1.5);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = tb.str;
            }
        }
    }

    return bestMatch;
}

// ── Engine 3: Fusion & Semantic AcroForm ID Resolution ───────────────
function fuseDetections(acroFormFields, vectorElements, textResult, rawBlocks, viewport, pageNum, usedNames) {
    const fused = [...acroFormFields];
    const { detected: textDetections, lines } = textResult;

    // 1. Process Vector Elements and pair with closest text labels
    for (let ve of vectorElements) {
        if (overlapsAnyText(ve, rawBlocks)) continue;

        // Skip vector boxes or lines that sit near/under section headings
        const isHeadingVector = rawBlocks.some(tb => {
            const isNearY = Math.abs((tb.y + tb.height / 2) - (ve.y + ve.height / 2)) <= 25 || (tb.y < ve.y && (ve.y - tb.y) <= 30);
            const isNearX = Math.abs(tb.x - ve.x) <= 120 || (tb.x + tb.width >= ve.x - 10 && tb.x <= ve.x + ve.width + 10);
            return isNearY && isNearX && isHeadingLabel(tb.str);
        });
        if (isHeadingVector) continue;

        const rawLabel = findNearbyLabelForBox(ve, rawBlocks) || `field_${usedNames.size + 1}`;
        if (isHeadingLabel(rawLabel)) continue;

        const sem = resolveSemanticProperties(rawLabel, "textField", usedNames);

        fused.push({
            id: Date.now() + Math.random(),
            type: sem.type,
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
            ...(sem.defaultValue ? { defaultValue: sem.defaultValue } : {})
        });
    }

    // 2. Add text-based detections that were NOT covered by vector elements
    for (let td of textDetections) {
        if (overlapsAnyText(td, rawBlocks)) continue;

        const isCovered = fused.some(f => {
            const xOverlap = Math.max(0, Math.min(td.x + td.width, f.x + f.width) - Math.max(td.x, f.x));
            const yOverlap = Math.max(0, Math.min(td.y + td.height, f.y + f.height) - Math.max(td.y, f.y));
            return (xOverlap * yOverlap) > 0;
        });

        if (!isCovered) {
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
                autofill: sem.autofill || "",
                ...(td.defaultValue || sem.defaultValue ? { defaultValue: td.defaultValue || sem.defaultValue } : {})
            });
        }
    }

    return fused;
}

// ── Resolve Semantic AcroForm ID and Field Properties ────────────────
function resolveSemanticProperties(rawLabel, defaultType = "textField", usedNames = new Set()) {
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

// ── Check if bounding box overlaps any printed text on the page ──────
function overlapsAnyText(box, rawBlocks) {
    return rawBlocks.some(tb => {
        if (/^[_.\s-]+$/.test(tb.str)) return false;
        const xOverlap = Math.max(0, Math.min(box.x + box.width, tb.x + tb.width) - Math.max(box.x, tb.x));
        const yOverlap = Math.max(0, Math.min(box.y + box.height, tb.y + tb.height) - Math.max(box.y, tb.y));
        const overlapArea = xOverlap * yOverlap;
        const tbArea = tb.width * tb.height;
        return tbArea > 0 && (overlapArea / tbArea) > 0.35;
    });
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
        if (existing.page !== field.page) return false;
        const xOverlap = Math.max(0, Math.min(field.x + field.width, existing.x + existing.width) - Math.max(field.x, existing.x));
        const yOverlap = Math.max(0, Math.min(field.y + field.height, existing.y + existing.height) - Math.max(field.y, existing.y));
        const overlapArea = xOverlap * yOverlap;
        const fieldArea = field.width * field.height;
        return (overlapArea / fieldArea) > 0.35;
    });
}
