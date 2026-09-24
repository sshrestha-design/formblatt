// ── Starter Sample Templates & Vector Generator (js/engines/templates-engine.js) ─
import { loadPdfLibraries } from "./pdf-engine.js";

function generateWeeklyScheduleFields() {
    const days = ["mon", "tue", "wed", "thu", "fri"];
    const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const hours = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];

    const fields = [
        { id: 1, type: "textField", name: "department", x: 450, y: 28, width: 140, height: 20, borderStyle: "solid", fillStyle: "white", tooltip: "Department Name" },
        { id: 2, type: "textField", name: "week_of", x: 605, y: 28, width: 165, height: 20, borderStyle: "solid", fillStyle: "white", tooltip: "Week Starting / Dates" }
    ];

    let fieldId = 3;
    days.forEach((day, dIdx) => {
        const dayY = 65 + dIdx * 102;
        for (let r = 1; r <= 4; r++) {
            const rowY = dayY + 32 + (r - 1) * 16;
            // Name
            fields.push({
                id: fieldId++,
                type: "textField",
                name: `${day}_name_${r}`,
                x: 20,
                y: rowY,
                width: 90,
                height: 16,
                borderStyle: "solid",
                fillStyle: "white",
                tooltip: `${dayLabels[dIdx]} Employee ${r} Name`
            });
            // 11 Hourly time slots
            hours.forEach((h, hIdx) => {
                fields.push({
                    id: fieldId++,
                    type: "textField",
                    name: `${day}_${h}_${r}`,
                    x: 110 + hIdx * 50,
                    y: rowY,
                    width: 50,
                    height: 16,
                    borderStyle: "solid",
                    fillStyle: "white",
                    tooltip: `${dayLabels[dIdx]} ${h.toUpperCase()} - Emp ${r}`
                });
            });
            // Sick? Checkbox
            fields.push({
                id: fieldId++,
                type: "checkBox",
                name: `${day}_sick_${r}`,
                x: 675,
                y: rowY + 1,
                width: 14,
                height: 14,
                defaultChecked: false,
                tooltip: `${dayLabels[dIdx]} Sick / Absent - Emp ${r}`
            });
            // Total Hours
            fields.push({
                id: fieldId++,
                type: "textField",
                name: `${day}_total_${r}`,
                x: 705,
                y: rowY,
                width: 65,
                height: 16,
                borderStyle: "solid",
                fillStyle: "white",
                dataFormat: "number",
                textAlignment: "right",
                tooltip: `${dayLabels[dIdx]} Total Hours - Emp ${r}`
            });
        }
    });
    return fields;
}

export const STARTER_TEMPLATES = {
    blank: {
        title: "Blank Document (Letter)",
        description: "Fresh blank PDF canvas ready for adding custom interactive form fields and signatures from scratch.",
        fields: []
    },
    weeklySchedule: {
        title: "Weekly Employee Shift Schedule",
        description: "Comprehensive 5-day Monday–Friday employee shift schedule with 14 hourly time-slots, sick day checkboxes, and total hours.",
        fields: generateWeeklyScheduleFields()
    },
    w9: {
        title: "Form W-9: Request for Taxpayer Identification",
        description: "Standard IRS-compliant taxpayer identification form with comb boxes, classification radios, and certification.",
        fields: [
            { id: 1, type: "textField", name: "taxpayer_full_name", x: 45, y: 76, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "name", tooltip: "Full Name (as shown on tax return)" },
            { id: 2, type: "textField", name: "business_name", x: 45, y: 114, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Business Name / Disregarded Entity Name" },
            
            // Line 3: Federal Tax Classification Mutually Exclusive Radio Group
            { id: 3, type: "radioGroup", radioGroup: "tax_classification", exportValue: "Individual", defaultChecked: true, x: 52, y: 158, width: 13, height: 13, tooltip: "Individual / sole proprietor or single-member LLC" },
            { id: 4, type: "radioGroup", radioGroup: "tax_classification", exportValue: "C_Corp", x: 185, y: 158, width: 13, height: 13, tooltip: "C Corporation" },
            { id: 5, type: "radioGroup", radioGroup: "tax_classification", exportValue: "S_Corp", x: 275, y: 158, width: 13, height: 13, tooltip: "S Corporation" },
            { id: 6, type: "radioGroup", radioGroup: "tax_classification", exportValue: "Partnership", x: 360, y: 158, width: 13, height: 13, tooltip: "Partnership" },
            { id: 7, type: "radioGroup", radioGroup: "tax_classification", exportValue: "Trust_Estate", x: 450, y: 158, width: 13, height: 13, tooltip: "Trust / estate" },
            { id: 8, type: "radioGroup", radioGroup: "tax_classification", exportValue: "LLC", x: 52, y: 182, width: 13, height: 13, tooltip: "Limited liability company" },
            { id: 9, type: "textField", name: "llc_tax_classification", x: 440, y: 178, width: 25, height: 18, borderStyle: "solid", fillStyle: "white", maxLength: 1, textAlignment: "center", tooltip: "LLC tax classification: C=C corp, S=S corp, P=Partnership" },
            { id: 10, type: "radioGroup", radioGroup: "tax_classification", exportValue: "Other", x: 475, y: 182, width: 13, height: 13, tooltip: "Other classification" },

            // Line 4: Exemptions
            { id: 11, type: "textField", name: "exempt_payee_code", x: 320, y: 220, width: 45, height: 18, borderStyle: "solid", fillStyle: "white", tooltip: "Exempt Payee Code (if any)" },
            { id: 12, type: "textField", name: "fatca_code", x: 495, y: 220, width: 50, height: 18, borderStyle: "solid", fillStyle: "white", tooltip: "Exemption from FATCA reporting code (if any)" },

            // Lines 5 & 6: Address & Requester
            { id: 13, type: "textField", name: "address", x: 45, y: 254, width: 340, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "address1", tooltip: "Street Address (number, street, and apt. or suite no.)" },
            { id: 14, type: "textField", name: "city_state_zip", x: 45, y: 292, width: 340, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "postal-code", tooltip: "City, State, and ZIP Code" },
            { id: 15, type: "textField", name: "requester_name_address", x: 395, y: 254, width: 155, height: 60, multiline: true, borderStyle: "solid", fillStyle: "white", tooltip: "Requester's name and address (optional)" },
            { id: 16, type: "textField", name: "account_numbers", x: 45, y: 330, width: 505, height: 20, borderStyle: "solid", fillStyle: "white", tooltip: "List account number(s) here (optional)" },

            // Part I: Taxpayer Identification Number (TIN) - Comb Boxes (Transparent fill)
            { id: 17, type: "textField", name: "ssn", x: 335, y: 395, width: 215, height: 24, borderStyle: "solid", fillStyle: "transparent", isComb: true, maxLength: 9, dataFormat: "ssn", tooltip: "Social Security Number (9 digits)" },
            { id: 18, type: "textField", name: "ein", x: 335, y: 440, width: 215, height: 24, borderStyle: "solid", fillStyle: "transparent", isComb: true, maxLength: 9, dataFormat: "tin", tooltip: "Employer Identification Number (9 digits)" },

            // Part II: Certification & Signature
            { id: 19, type: "signature", name: "taxpayer_signature", x: 145, y: 524, width: 220, height: 42, borderStyle: "none", fillStyle: "tint", tooltip: "Sign Here: Taxpayer Digital Signature" },
            { id: 20, type: "dateField", name: "sign_date", x: 405, y: 532, width: 145, height: 24, borderStyle: "solid", fillStyle: "white", dataFormat: "date", tooltip: "Date Signed" }
        ]
    },
    nda: {
        title: "Mutual Non-Disclosure Agreement",
        description: "Bilateral confidentiality agreement with dual signature blocks, term dropdown, and trade secret protections.",
        fields: [
            { id: 1, type: "textField", name: "disclosing_party", x: 45, y: 93, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Apex Innovations Inc.", tooltip: "Disclosing Party Legal Name" },
            { id: 2, type: "textField", name: "receiving_party", x: 310, y: 93, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Vanguard Tech Partners LLC", tooltip: "Receiving Party Legal Name" },
            { id: 3, type: "dateField", name: "effective_date", x: 45, y: 135, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-04-01", tooltip: "Effective Date" },
            { id: 4, type: "dropdown", name: "governing_jurisdiction", x: 310, y: 135, width: 240, height: 22, options: ["State of Delaware", "State of California", "State of New York", "United Kingdom", "European Union"], defaultValue: "State of Delaware", borderStyle: "solid", fillStyle: "tint", tooltip: "Governing Jurisdiction & Law" },
            { id: 5, type: "dropdown", name: "confidentiality_term", x: 45, y: 177, width: 240, height: 22, options: ["1 Year", "2 Years", "3 Years", "5 Years", "Indefinite"], defaultValue: "3 Years", borderStyle: "solid", fillStyle: "tint", tooltip: "Confidentiality Term Length" },

            // Scope Checkboxes
            { id: 6, type: "checkBox", name: "scope_trade_secrets", x: 45, y: 226, width: 14, height: 14, defaultChecked: true, tooltip: "Trade Secrets Protected" },
            { id: 7, type: "checkBox", name: "scope_source_code", x: 210, y: 226, width: 14, height: 14, defaultChecked: true, tooltip: "Source Code & Algorithms Protected" },
            { id: 8, type: "checkBox", name: "scope_financial_data", x: 380, y: 226, width: 14, height: 14, defaultChecked: true, tooltip: "Financial & Customer Data Protected" },

            // Discloser Execution Block
            { id: 9, type: "textField", name: "signer1_name", x: 45, y: 286, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", value: "Sarah Jenkins", tooltip: "Discloser Representative Name" },
            { id: 10, type: "textField", name: "signer1_title", x: 45, y: 326, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", value: "Chief Technology Officer", tooltip: "Discloser Representative Title" },
            { id: 11, type: "signature", name: "discloser_signature", x: 45, y: 366, width: 240, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Discloser Digital Signature" },
            { id: 12, type: "dateField", name: "date1_signed", x: 45, y: 434, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-04-01", tooltip: "Discloser Date Signed" },

            // Recipient Execution Block
            { id: 13, type: "textField", name: "signer2_name", x: 310, y: 286, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", value: "Michael Chang", tooltip: "Recipient Representative Name" },
            { id: 14, type: "textField", name: "signer2_title", x: 310, y: 326, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", value: "Managing Partner", tooltip: "Recipient Representative Title" },
            { id: 15, type: "signature", name: "recipient_signature", x: 310, y: 366, width: 240, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Recipient Digital Signature" },
            { id: 16, type: "dateField", name: "date2_signed", x: 310, y: 434, width: 240, height: 20, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-04-01", tooltip: "Recipient Date Signed" }
        ]
    },
    intake: {
        title: "Patient Intake & HIPAA Consent Form",
        description: "Confidential healthcare registration form with Yes/No screening radio pairs, HIPAA privacy release, and insurance coverage.",
        fields: [
            // Section 1: Patient Demographics
            { id: 1, type: "textField", name: "patient_full_name", x: 45, y: 105, width: 330, height: 22, borderStyle: "solid", fillStyle: "white", value: "Eleanor Vance", autofill: "name", tooltip: "Patient Full Legal Name" },
            { id: 2, type: "dateField", name: "patient_dob", x: 385, y: 105, width: 165, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "1988-06-14", autofill: "bday", tooltip: "Date of Birth (YYYY-MM-DD)" },
            { id: 3, type: "textField", name: "patient_phone", x: 45, y: 143, width: 180, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "phone", dataFormat: "phone", value: "(415) 555-0142", tooltip: "Primary Phone Number" },
            { id: 4, type: "textField", name: "patient_email", x: 235, y: 143, width: 190, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "email", dataFormat: "email", value: "eleanor.vance@example.com", tooltip: "Email Address" },
            
            // Biological Sex Mutually Exclusive Radios
            { id: 5, type: "radioGroup", radioGroup: "patient_sex", exportValue: "M", x: 462, y: 147, width: 12, height: 12, tooltip: "Male" },
            { id: 6, type: "radioGroup", radioGroup: "patient_sex", exportValue: "F", defaultChecked: true, x: 495, y: 147, width: 12, height: 12, tooltip: "Female" },

            { id: 7, type: "textField", name: "patient_address", x: 45, y: 181, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "address1", value: "452 Pine Hill Road, San Francisco, CA 94109", tooltip: "Street Address, City, State, ZIP" },
            { id: 8, type: "textField", name: "emergency_contact_name", x: 45, y: 219, width: 300, height: 22, borderStyle: "solid", fillStyle: "white", value: "Thomas Vance (Spouse)", tooltip: "Emergency Contact Name & Relationship" },
            { id: 9, type: "textField", name: "emergency_contact_phone", x: 355, y: 219, width: 195, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "phone", value: "(415) 555-0199", tooltip: "Emergency Contact Phone Number" },

            // Section 2: Clinical Screening & Health History (Mutually Exclusive Yes/No pairs)
            { id: 10, type: "radioGroup", radioGroup: "history_smoke", exportValue: "No", defaultChecked: true, x: 465, y: 279, width: 12, height: 12, tooltip: "No Tobacco/Smoking" },
            { id: 11, type: "radioGroup", radioGroup: "history_smoke", exportValue: "Yes", x: 515, y: 279, width: 12, height: 12, tooltip: "Yes Tobacco/Smoking" },
            
            { id: 12, type: "radioGroup", radioGroup: "history_htn", exportValue: "No", defaultChecked: true, x: 465, y: 301, width: 12, height: 12, tooltip: "No Hypertension" },
            { id: 13, type: "radioGroup", radioGroup: "history_htn", exportValue: "Yes", x: 515, y: 301, width: 12, height: 12, tooltip: "Yes Hypertension" },

            { id: 14, type: "radioGroup", radioGroup: "history_diabetes", exportValue: "No", defaultChecked: true, x: 465, y: 323, width: 12, height: 12, tooltip: "No Diabetes" },
            { id: 15, type: "radioGroup", radioGroup: "history_diabetes", exportValue: "Yes", x: 515, y: 323, width: 12, height: 12, tooltip: "Yes Diabetes" },

            { id: 16, type: "textField", name: "primary_care_physician", x: 45, y: 357, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", value: "Dr. Sarah Chen, MD (Bayfront Medical)", tooltip: "Primary Care Doctor / Clinic Name" },
            { id: 17, type: "textField", name: "known_allergies", x: 305, y: 357, width: 245, height: 22, borderStyle: "solid", fillStyle: "white", value: "Penicillin, Latex (Mild hives)", tooltip: "Known Allergies (Drugs, Foods, Latex)" },
            { id: 18, type: "textField", name: "current_medications", x: 45, y: 395, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", value: "Multivitamin daily, Ibuprofen 200mg as needed", tooltip: "Current Medications & Dosages" },
            { id: 19, type: "textField", name: "medical_conditions_notes", x: 45, y: 433, width: 505, height: 34, multiline: true, borderStyle: "solid", fillStyle: "white", value: "Mild seasonal allergies. No history of major surgeries.", tooltip: "Pre-existing Conditions / Medical Notes" },

            // Section 3: Health Insurance
            { id: 20, type: "textField", name: "insurance_provider", x: 45, y: 497, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Blue Shield of California", tooltip: "Insurance Provider / Plan Name" },
            { id: 21, type: "textField", name: "insurance_member_id", x: 295, y: 497, width: 150, height: 22, borderStyle: "solid", fillStyle: "white", value: "BSC-894102941", tooltip: "Policy / Member ID #" },
            { id: 22, type: "textField", name: "insurance_group_num", x: 455, y: 497, width: 95, height: 22, borderStyle: "solid", fillStyle: "white", value: "GRP-90214", tooltip: "Group #" },

            // Section 4: HIPAA & Informed Consent
            { id: 23, type: "checkBox", name: "hipaa_consent_ack", x: 45, y: 556, width: 14, height: 14, defaultChecked: true, required: true, tooltip: "HIPAA Notice of Privacy Practices Acknowledgement" },
            { id: 24, type: "checkBox", name: "treatment_consent_ack", x: 45, y: 592, width: 14, height: 14, defaultChecked: true, required: true, tooltip: "Informed Treatment Consent" },

            // Section 5: Signature & Authorization
            { id: 25, type: "signature", name: "patient_or_guardian_signature", x: 45, y: 642, width: 250, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Patient / Legal Guardian Signature" },
            { id: 26, type: "dropdown", name: "signer_relationship", x: 310, y: 642, width: 240, height: 22, options: ["Self (Patient)", "Parent / Legal Guardian", "Healthcare Power of Attorney", "Authorized Representative"], defaultValue: "Self (Patient)", borderStyle: "solid", fillStyle: "tint", tooltip: "Relationship to Patient" },
            { id: 27, type: "dateField", name: "date_signed", x: 310, y: 682, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", tooltip: "Date Signed" }
        ]
    },
    job: {
        title: "Employment Application Form",
        description: "Comprehensive applicant screening form with work authorization radio pairs, salary formatting, and signature.",
        fields: [
            { id: 1, type: "textField", name: "candidate_full_name", x: 45, y: 93, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "name", value: "Alexandra Chen", tooltip: "Candidate Full Legal Name" },
            { id: 2, type: "textField", name: "candidate_phone", x: 45, y: 135, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "phone", dataFormat: "phone", value: "(415) 555-0133", tooltip: "Contact Phone Number" },
            { id: 3, type: "textField", name: "candidate_email", x: 310, y: 135, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "email", dataFormat: "email", value: "alexandra.chen@example.com", tooltip: "Email Address" },
            { id: 4, type: "textField", name: "position_applied", x: 45, y: 177, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Senior Full-Stack Engineer", tooltip: "Position Applied For" },
            { id: 5, type: "dateField", name: "available_date", x: 310, y: 177, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-05-01", tooltip: "Available Start Date" },

            // Desired Employment Type Radios
            { id: 6, type: "radioGroup", radioGroup: "employment_type", exportValue: "Full-Time", defaultChecked: true, x: 160, y: 211, width: 13, height: 13, tooltip: "Full-Time" },
            { id: 7, type: "radioGroup", radioGroup: "employment_type", exportValue: "Part-Time", x: 250, y: 211, width: 13, height: 13, tooltip: "Part-Time" },
            { id: 8, type: "radioGroup", radioGroup: "employment_type", exportValue: "Contract", x: 340, y: 211, width: 13, height: 13, tooltip: "Contract / Freelance" },
            { id: 9, type: "textField", name: "expected_salary", x: 310, y: 243, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "currency", textAlignment: "right", value: "165000.00", tooltip: "Expected Annual Salary ($ USD)" },

            // Work Authorization & Sponsorship Radios
            { id: 10, type: "radioGroup", radioGroup: "work_authorized", exportValue: "Yes", defaultChecked: true, x: 420, y: 299, width: 13, height: 13, tooltip: "Legally authorized to work in the US: Yes" },
            { id: 11, type: "radioGroup", radioGroup: "work_authorized", exportValue: "No", x: 475, y: 299, width: 13, height: 13, tooltip: "Legally authorized to work in the US: No" },
            { id: 12, type: "radioGroup", radioGroup: "sponsorship_required", exportValue: "No", defaultChecked: true, x: 420, y: 325, width: 13, height: 13, tooltip: "Visa sponsorship required: No" },
            { id: 13, type: "radioGroup", radioGroup: "sponsorship_required", exportValue: "Yes", x: 475, y: 325, width: 13, height: 13, tooltip: "Visa sponsorship required: Yes" },

            // Execution & Signatures
            { id: 14, type: "signature", name: "applicant_signature", x: 45, y: 404, width: 260, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Applicant Signature" },
            { id: 15, type: "dateField", name: "application_date", x: 325, y: 404, width: 225, height: 24, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", tooltip: "Application Date" }
        ]
    },
    lease: {
        title: "Residential Lease Agreement",
        description: "Standard rental agreement with rent terms, reactive move-in cost sum calculation, pet policy radios, and dual signatures.",
        fields: [
            { id: 1, type: "textField", name: "landlord_name", x: 45, y: 95, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Oakwood Properties LLC", tooltip: "Landlord / Lessor Legal Name" },
            { id: 2, type: "textField", name: "tenant_name", x: 310, y: 95, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Sarah M. Jenkins", tooltip: "Tenant / Lessee Legal Name" },
            { id: 3, type: "textField", name: "property_address", x: 45, y: 137, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "address1", value: "742 Evergreen Terrace, Unit 3B, Springfield, OR 97477", tooltip: "Property Address & Unit Number" },
            
            // Term Dates
            { id: 4, type: "dateField", name: "lease_start_date", x: 45, y: 179, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-04-01", tooltip: "Lease Commencement Date" },
            { id: 5, type: "dateField", name: "lease_end_date", x: 310, y: 179, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2027-03-31", tooltip: "Lease Expiration Date" },

            // Financial Schedule with Reactive Calculation: total_move_in = monthly_rent + security_deposit
            { id: 6, type: "textField", name: "monthly_rent", x: 52, y: 227, width: 148, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "currency", textAlignment: "right", value: "2850.00", tooltip: "Monthly Rent ($ USD)" },
            { id: 7, type: "textField", name: "security_deposit", x: 215, y: 227, width: 155, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "currency", textAlignment: "right", value: "2850.00", tooltip: "Security Deposit ($ USD)" },
            { id: 8, type: "textField", name: "total_move_in", x: 385, y: 227, width: 155, height: 22, borderStyle: "solid", fillStyle: "yellow", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "sum", calculationFields: ["monthly_rent", "security_deposit"], value: "5700.00", tooltip: "Total Move-in Funds Due (Rent + Deposit)" },

            // Pet Policy Radios
            { id: 9, type: "radioGroup", radioGroup: "pet_policy", exportValue: "No_Pets", defaultChecked: true, x: 150, y: 273, width: 13, height: 13, tooltip: "No Pets Allowed" },
            { id: 10, type: "radioGroup", radioGroup: "pet_policy", exportValue: "Pets_Permitted", x: 250, y: 273, width: 13, height: 13, tooltip: "Pets Permitted" },

            // Utilities Included Checkboxes
            { id: 11, type: "checkBox", name: "util_water", x: 150, y: 303, width: 13, height: 13, defaultChecked: true, tooltip: "Water Included" },
            { id: 12, type: "checkBox", name: "util_gas", x: 220, y: 303, width: 13, height: 13, defaultChecked: false, tooltip: "Gas Included" },
            { id: 13, type: "checkBox", name: "util_electric", x: 285, y: 303, width: 13, height: 13, defaultChecked: false, tooltip: "Electricity Included" },
            { id: 14, type: "checkBox", name: "util_trash", x: 375, y: 303, width: 13, height: 13, defaultChecked: true, tooltip: "Trash / Waste Included" },
            { id: 15, type: "checkBox", name: "util_internet", x: 445, y: 303, width: 13, height: 13, defaultChecked: false, tooltip: "Internet Included" },

            // Dual Signatures
            { id: 16, type: "signature", name: "landlord_signature", x: 45, y: 354, width: 240, height: 50, borderStyle: "none", fillStyle: "tint", tooltip: "Landlord Signature" },
            { id: 17, type: "signature", name: "tenant_signature", x: 310, y: 354, width: 240, height: 50, borderStyle: "none", fillStyle: "tint", tooltip: "Tenant Signature" },
            { id: 18, type: "dateField", name: "lease_signed_date", x: 45, y: 428, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", tooltip: "Date Signed" }
        ]
    },
    rental: {
        title: "Tenant Rental Application Form",
        description: "Comprehensive screening form with SSN comb box, income verification, background screening radios, and credit check consent.",
        fields: [
            { id: 1, type: "textField", name: "applicant_full_name", x: 45, y: 93, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "name", value: "David K. Miller", tooltip: "Applicant Full Legal Name" },
            { id: 2, type: "textField", name: "current_address", x: 45, y: 135, width: 505, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "address1", value: "820 Broadway, Apt 4B, Seattle, WA 98122", tooltip: "Current Street Address, City, State, ZIP" },
            { id: 3, type: "textField", name: "phone_number", x: 45, y: 177, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "phone", dataFormat: "phone", value: "(206) 555-0187", tooltip: "Primary Phone Number" },
            { id: 4, type: "textField", name: "email_address", x: 310, y: 177, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", autofill: "email", dataFormat: "email", value: "david.miller@example.com", tooltip: "Email Address" },

            // SSN Comb Box (Transparent fill so drawn 9-box guides show) & Date of Birth
            { id: 5, type: "textField", name: "applicant_ssn", x: 45, y: 219, width: 240, height: 22, borderStyle: "solid", fillStyle: "transparent", isComb: true, maxLength: 9, dataFormat: "ssn", tooltip: "Social Security Number (9 digits)" },
            { id: 6, type: "dateField", name: "date_of_birth", x: 310, y: 219, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "1992-11-03", tooltip: "Date of Birth" },

            // Employment & Income
            { id: 7, type: "textField", name: "employer_name", x: 45, y: 261, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Pacific Northwest Software Inc.", tooltip: "Employer / Company Name" },
            { id: 8, type: "textField", name: "monthly_income", x: 310, y: 261, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "currency", textAlignment: "right", value: "8500.00", tooltip: "Monthly Gross Income ($ USD)" },
            { id: 9, type: "textField", name: "position_title", x: 45, y: 303, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", value: "Senior Systems Engineer", tooltip: "Occupation / Job Title" },
            { id: 10, type: "dateField", name: "desired_move_in", x: 310, y: 303, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-05-01", tooltip: "Desired Move-In Date" },

            // Background Screening Radios (Mutually Exclusive Yes/No pairs)
            { id: 11, type: "radioGroup", radioGroup: "background_evicted", exportValue: "No", defaultChecked: true, x: 420, y: 359, width: 13, height: 13, tooltip: "Ever been evicted: No" },
            { id: 12, type: "radioGroup", radioGroup: "background_evicted", exportValue: "Yes", x: 475, y: 359, width: 13, height: 13, tooltip: "Ever been evicted: Yes" },
            { id: 13, type: "radioGroup", radioGroup: "background_bankruptcy", exportValue: "No", defaultChecked: true, x: 420, y: 385, width: 13, height: 13, tooltip: "Ever declared bankruptcy: No" },
            { id: 14, type: "radioGroup", radioGroup: "background_bankruptcy", exportValue: "Yes", x: 475, y: 385, width: 13, height: 13, tooltip: "Ever declared bankruptcy: Yes" },

            // Credit Check Consent Checkbox
            { id: 15, type: "checkBox", name: "background_check_consent", x: 45, y: 422, width: 14, height: 14, defaultChecked: true, required: true, tooltip: "Credit & Background Screening Consent" },

            // Signature & Execution
            { id: 16, type: "signature", name: "applicant_signature", x: 45, y: 460, width: 260, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Applicant Signature of Authorization" },
            { id: 17, type: "dateField", name: "application_date", x: 325, y: 460, width: 225, height: 24, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", tooltip: "Application Date" }
        ]
    },
    invoice: {
        title: "Standard Commercial Invoice",
        description: "Professional billing invoice with reactive AcroForm calculations for line items, subtotal, tax, and balance due.",
        fields: [
            // Meta Header
            { id: 1, type: "textField", name: "invoice_number", x: 425, y: 36, width: 120, height: 18, borderStyle: "solid", fillStyle: "white", value: "INV-2026-001", textAlignment: "right", tooltip: "Invoice Number (e.g. INV-2026-001)" },
            { id: 2, type: "dateField", name: "invoice_date", x: 425, y: 58, width: 120, height: 18, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", textAlignment: "right", tooltip: "Invoice Date" },
            { id: 3, type: "dateField", name: "due_date", x: 425, y: 80, width: 120, height: 18, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-04-24", textAlignment: "right", tooltip: "Payment Due Date" },
            { id: 4, type: "textField", name: "po_number", x: 425, y: 102, width: 120, height: 18, borderStyle: "solid", fillStyle: "white", value: "PO-98432", textAlignment: "right", tooltip: "P.O. / Reference Number" },

            // Billed By (Seller)
            { id: 5, type: "textField", name: "seller_company_name", x: 52, y: 162, width: 226, height: 20, borderStyle: "solid", fillStyle: "white", value: "Acme Creative Studio LLC", tooltip: "Seller Business Name" },
            { id: 6, type: "textField", name: "seller_address", x: 52, y: 187, width: 226, height: 20, borderStyle: "solid", fillStyle: "white", value: "100 Market St, Suite 400, San Francisco, CA 94105", tooltip: "Seller Address, City, State, ZIP" },
            { id: 7, type: "textField", name: "seller_tax_id", x: 52, y: 212, width: 226, height: 20, borderStyle: "solid", fillStyle: "white", value: "Tax ID / EIN: 12-3456789", tooltip: "Seller Tax ID / EIN / VAT #" },

            // Billed To (Client)
            { id: 8, type: "textField", name: "client_company_name", x: 307, y: 162, width: 236, height: 20, borderStyle: "solid", fillStyle: "white", value: "Global Logistics Corp", autofill: "name", tooltip: "Client Company / Individual Name" },
            { id: 9, type: "textField", name: "client_address", x: 307, y: 187, width: 236, height: 20, borderStyle: "solid", fillStyle: "white", value: "750 Lexington Ave, New York, NY 10022", autofill: "address1", tooltip: "Client Address, City, State, ZIP" },
            { id: 10, type: "textField", name: "client_email_phone", x: 307, y: 212, width: 236, height: 20, borderStyle: "solid", fillStyle: "white", value: "billing@globallogistics.com • (212) 555-0190", autofill: "email", tooltip: "Client Email & Phone" },

            // Terms & Currency
            { id: 11, type: "dropdown", name: "payment_terms", x: 135, y: 248, width: 145, height: 22, options: ["Due on Receipt", "Net 15", "Net 30", "Net 60", "Due End of Month"], defaultValue: "Net 30", borderStyle: "solid", fillStyle: "tint", tooltip: "Payment Terms" },
            { id: 12, type: "dropdown", name: "currency_code", x: 395, y: 248, width: 155, height: 22, options: ["USD ($)", "EUR (€)", "GBP (£)", "CAD ($)", "AUD ($)", "JPY (¥)"], defaultValue: "USD ($)", borderStyle: "solid", fillStyle: "tint", tooltip: "Billing Currency" },

            // Itemized Line Items (4 Rows) with Reactive Calculations (Amount = Qty * Price)
            { id: 13, type: "textField", name: "item_desc_1", x: 48, y: 304, width: 278, height: 24, borderStyle: "solid", fillStyle: "white", value: "Enterprise UI/UX Design System Consultation", tooltip: "Item 1 Description" },
            { id: 14, type: "textField", name: "item_qty_1", x: 333, y: 304, width: 54, height: 24, borderStyle: "solid", fillStyle: "white", value: "40", dataFormat: "number", textAlignment: "right", tooltip: "Qty 1" },
            { id: 15, type: "textField", name: "item_price_1", x: 393, y: 304, width: 69, height: 24, borderStyle: "solid", fillStyle: "white", value: "150.00", dataFormat: "currency", textAlignment: "right", tooltip: "Price 1" },
            { id: 16, type: "textField", name: "item_amount_1", x: 468, y: 304, width: 78, height: 24, borderStyle: "solid", fillStyle: "white", value: "6000.00", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "prod", calculationFields: ["item_qty_1", "item_price_1"], tooltip: "Amount 1 (Qty * Price)" },

            { id: 17, type: "textField", name: "item_desc_2", x: 48, y: 339, width: 278, height: 24, borderStyle: "solid", fillStyle: "white", value: "Accessible PDF Form Architecture & Automation", tooltip: "Item 2 Description" },
            { id: 18, type: "textField", name: "item_qty_2", x: 333, y: 339, width: 54, height: 24, borderStyle: "solid", fillStyle: "white", value: "25", dataFormat: "number", textAlignment: "right", tooltip: "Qty 2" },
            { id: 19, type: "textField", name: "item_price_2", x: 393, y: 339, width: 69, height: 24, borderStyle: "solid", fillStyle: "white", value: "175.00", dataFormat: "currency", textAlignment: "right", tooltip: "Price 2" },
            { id: 20, type: "textField", name: "item_amount_2", x: 468, y: 339, width: 78, height: 24, borderStyle: "solid", fillStyle: "white", value: "4375.00", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "prod", calculationFields: ["item_qty_2", "item_price_2"], tooltip: "Amount 2 (Qty * Price)" },

            { id: 21, type: "textField", name: "item_desc_3", x: 48, y: 374, width: 278, height: 24, borderStyle: "solid", fillStyle: "white", value: "AcroForm Interactive Field Engineering", tooltip: "Item 3 Description" },
            { id: 22, type: "textField", name: "item_qty_3", x: 333, y: 374, width: 54, height: 24, borderStyle: "solid", fillStyle: "white", value: "15", dataFormat: "number", textAlignment: "right", tooltip: "Qty 3" },
            { id: 23, type: "textField", name: "item_price_3", x: 393, y: 374, width: 69, height: 24, borderStyle: "solid", fillStyle: "white", value: "160.00", dataFormat: "currency", textAlignment: "right", tooltip: "Price 3" },
            { id: 24, type: "textField", name: "item_amount_3", x: 468, y: 374, width: 78, height: 24, borderStyle: "solid", fillStyle: "white", value: "2400.00", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "prod", calculationFields: ["item_qty_3", "item_price_3"], tooltip: "Amount 3 (Qty * Price)" },

            { id: 25, type: "textField", name: "item_desc_4", x: 48, y: 409, width: 278, height: 24, borderStyle: "solid", fillStyle: "white", value: "Cloud Infrastructure Setup & Maintenance", tooltip: "Item 4 Description" },
            { id: 26, type: "textField", name: "item_qty_4", x: 333, y: 409, width: 54, height: 24, borderStyle: "solid", fillStyle: "white", value: "10", dataFormat: "number", textAlignment: "right", tooltip: "Qty 4" },
            { id: 27, type: "textField", name: "item_price_4", x: 393, y: 409, width: 69, height: 24, borderStyle: "solid", fillStyle: "white", value: "125.00", dataFormat: "currency", textAlignment: "right", tooltip: "Price 4" },
            { id: 28, type: "textField", name: "item_amount_4", x: 468, y: 409, width: 78, height: 24, borderStyle: "solid", fillStyle: "white", value: "1250.00", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "prod", calculationFields: ["item_qty_4", "item_price_4"], tooltip: "Amount 4 (Qty * Price)" },

            // Notes & Payment Instructions (Left Bottom)
            { id: 29, type: "textField", name: "payment_instructions", x: 45, y: 474, width: 265, height: 56, multiline: true, borderStyle: "solid", fillStyle: "white", value: "Wire Transfer: Bank of America\nRouting / ABA: 026009593\nAccount: 483019284102\nSWIFT: BOFAUS3N", tooltip: "Bank Wire / Remittance Instructions" },
            { id: 30, type: "textField", name: "invoice_notes", x: 45, y: 550, width: 265, height: 56, multiline: true, borderStyle: "solid", fillStyle: "white", value: "Thank you for your business. Payment due within 30 days.\nLate payments subject to 1.5% monthly finance charge.", tooltip: "Terms & Customer Notes" },

            // Totals Breakdown (Right Bottom) with Reactive Calculations
            { id: 31, type: "textField", name: "subtotal_amount", x: 435, y: 464, width: 105, height: 22, borderStyle: "solid", fillStyle: "white", value: "14025.00", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "sum", calculationFields: ["item_amount_1", "item_amount_2", "item_amount_3", "item_amount_4"], tooltip: "Subtotal Amount (Sum of Line Items)" },
            { id: 32, type: "textField", name: "discount_amount", x: 435, y: 492, width: 105, height: 22, borderStyle: "solid", fillStyle: "white", value: "500.00", dataFormat: "currency", textAlignment: "right", tooltip: "Discount / Credits" },
            { id: 33, type: "textField", name: "tax_amount", x: 435, y: 520, width: 105, height: 22, borderStyle: "solid", fillStyle: "white", value: "1192.13", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "tax", calculationTaxBaseField: "subtotal_amount", calculationTaxRate: 8.5, tooltip: "Sales Tax / VAT (8.5%)" },
            { id: 34, type: "textField", name: "shipping_handling", x: 435, y: 548, width: 105, height: 22, borderStyle: "solid", fillStyle: "white", value: "0.00", dataFormat: "currency", textAlignment: "right", tooltip: "Shipping & Handling" },
            { id: 35, type: "textField", name: "balance_due", x: 435, y: 578, width: 105, height: 26, borderStyle: "solid", fillStyle: "yellow", value: "14717.13", readOnly: true, dataFormat: "currency", textAlignment: "right", calculationType: "custom", calculationFormula: "subtotal_amount - discount_amount + tax_amount + shipping_handling", tooltip: "TOTAL BALANCE DUE" },

            // Authorization & Signature
            { id: 36, type: "signature", name: "client_signature", x: 45, y: 654, width: 240, height: 50, borderStyle: "none", fillStyle: "tint", tooltip: "Customer / Authorized Representative Signature" },
            { id: 37, type: "textField", name: "signer_name_title", x: 300, y: 654, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", value: "Marcus Vance, Chief Procurement Officer", tooltip: "Signer Full Name & Title" },
            { id: 38, type: "dateField", name: "signed_date", x: 300, y: 694, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", dataFormat: "date", value: "2026-03-24", tooltip: "Date Signed" }
        ]
    }
};

export async function createTemplatePdf(key) {
    await loadPdfLibraries();
    const pdfLib = typeof window !== "undefined" ? (window.PDFLib || globalThis.PDFLib) : (typeof PDFLib !== "undefined" ? PDFLib : null);
    if (!pdfLib) throw new Error("PDF-Lib not initialized.");
    const { PDFDocument, StandardFonts, rgb } = pdfLib;
    const doc = await PDFDocument.create();
    const isLandscape = key === "weeklySchedule";
    const page = isLandscape ? doc.addPage([792, 612]) : doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const dark = rgb(0.09, 0.13, 0.20);
    const gray = rgb(0.40, 0.45, 0.52);
    const lineGray = rgb(0.80, 0.83, 0.88);

    if (key === "blank") {
        return await doc.save();
    } else if (key === "weeklySchedule") {
        const navy = rgb(0.12, 0.23, 0.54);
        const white = rgb(1, 1, 1);
        const lightBlue = rgb(0.92, 0.95, 0.98);

        // Header Title & Meta
        page.drawText("WEEKLY SCHEDULE", { x: 20, y: height - 42, size: 20, font: fontBold, color: dark });
        page.drawText("Department:", { x: 380, y: height - 38, size: 9, font: fontBold, color: dark });
        page.drawText("Week:", { x: 560, y: height - 38, size: 9, font: fontBold, color: dark });

        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const colXs = [20, 110, 160, 210, 260, 310, 360, 410, 460, 510, 560, 610, 660, 705, 770];
        const headers = ["Name", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "Sick?", "Total"];

        days.forEach((day, dIdx) => {
            const dayY = 65 + dIdx * 102;
            const bannerY = height - (dayY + 16);
            // Day Banner
            page.drawRectangle({ x: 20, y: bannerY, width: 750, height: 16, color: navy });
            const dayText = day.toUpperCase();
            const textW = fontBold.widthOfTextAtSize(dayText, 10);
            page.drawText(dayText, { x: 20 + (750 - textW) / 2, y: bannerY + 4, size: 10, font: fontBold, color: white });

            // Column Headers Row
            const headerY = height - (dayY + 32);
            page.drawRectangle({ x: 20, y: headerY, width: 750, height: 16, color: lightBlue });
            headers.forEach((h, hIdx) => {
                const x1 = colXs[hIdx];
                const x2 = colXs[hIdx + 1];
                const colW = x2 - x1;
                const w = fontBold.widthOfTextAtSize(h, 7.5);
                page.drawText(h, { x: x1 + (colW - w) / 2, y: headerY + 4, size: 7.5, font: fontBold, color: dark });
            });

            // 4 Rows
            for (let r = 0; r < 4; r++) {
                const rowY = height - (dayY + 48 + r * 16);
                if (r % 2 === 1) {
                    page.drawRectangle({ x: 20, y: rowY, width: 750, height: 16, color: rgb(0.97, 0.98, 1.0) });
                }
                // Horizontal row line
                page.drawLine({ start: { x: 20, y: rowY }, end: { x: 770, y: rowY }, thickness: 0.5, color: lineGray });
            }

            // Vertical dividers for table
            for (let c = 0; c < colXs.length; c++) {
                const vx = colXs[c];
                page.drawLine({ start: { x: vx, y: height - (dayY + 96) }, end: { x: vx, y: headerY + 16 }, thickness: 0.5, color: lineGray });
            }

            // Outer border
            page.drawRectangle({ x: 20, y: height - (dayY + 96), width: 750, height: 80, borderColor: dark, borderWidth: 1 });
        });

        // Footer
        page.drawLine({ start: { x: 20, y: 32 }, end: { x: 770, y: 32 }, thickness: 0.75, color: lineGray });
        page.drawText("Weekly Employee Schedule", { x: 20, y: 20, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "w9") {
        const white = rgb(1, 1, 1);

        // Official IRS Header
        page.drawText("Form W-9", { x: 45, y: height - 36, size: 18, font: fontBold, color: dark });
        page.drawText("(Rev. March 2024)", { x: 135, y: height - 34, size: 8.5, font: fontRegular, color: gray });
        page.drawText("Department of the Treasury / Internal Revenue Service", { x: 330, y: height - 34, size: 8, font: fontRegular, color: gray });
        page.drawText("Request for Taxpayer Identification Number and Certification", { x: 45, y: height - 52, size: 11, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 58 }, end: { x: 550, y: height - 58 }, thickness: 1.5, color: dark });

        // Line 1 & 2 Labels
        page.drawText("1 Name (as shown on your income tax return). Name is required on this line; do not leave this line blank.", { x: 45, y: height - 67, size: 7.5, font: fontBold, color: dark });
        page.drawText("2 Business name/disregarded entity name, if different from above", { x: 45, y: height - 105, size: 7.5, font: fontBold, color: dark });

        // Line 3: Federal Tax Classification Panel
        page.drawText("3 Check appropriate box for federal tax classification of the person whose name is entered on line 1. Check only one box.", { x: 45, y: height - 146, size: 7.5, font: fontBold, color: dark });
        page.drawRectangle({ x: 45, y: height - 204, width: 505, height: 50, color: rgb(0.98, 0.98, 1.0), borderColor: lineGray, borderWidth: 0.5 });
        
        // Radio Labels
        page.drawText("Individual/sole proprietor", { x: 69, y: height - 168, size: 7.5, font: fontRegular, color: dark });
        page.drawText("C Corporation", { x: 202, y: height - 168, size: 7.5, font: fontRegular, color: dark });
        page.drawText("S Corporation", { x: 292, y: height - 168, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Partnership", { x: 377, y: height - 168, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Trust/estate", { x: 467, y: height - 168, size: 7.5, font: fontRegular, color: dark });

        page.drawText("Limited liability company (LLC). Enter tax classification (C=C corp, S=S corp, P=Partnership):", { x: 69, y: height - 192, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Other", { x: 492, y: height - 192, size: 7.5, font: fontRegular, color: dark });

        // Line 4: Exemptions
        page.drawText("4 Exemptions (codes apply only to certain entities, not individuals):", { x: 45, y: height - 216, size: 7.5, font: fontBold, color: dark });
        page.drawText("Exempt payee code:", { x: 235, y: height - 232, size: 7.5, font: fontRegular, color: dark });
        page.drawText("FATCA exemption code:", { x: 380, y: height - 232, size: 7.5, font: fontRegular, color: dark });

        // Line 5, 6, Requester, Account Numbers
        page.drawText("5 Address (number, street, and apt. or suite no.)", { x: 45, y: height - 245, size: 7.5, font: fontBold, color: dark });
        page.drawText("Requester's name and address (optional):", { x: 395, y: height - 245, size: 7.5, font: fontBold, color: dark });
        page.drawText("6 City, state, and ZIP code", { x: 45, y: height - 283, size: 7.5, font: fontBold, color: dark });
        page.drawText("7 List account number(s) here (optional)", { x: 45, y: height - 321, size: 7.5, font: fontBold, color: dark });

        // Part I: Taxpayer Identification Number (TIN)
        page.drawRectangle({ x: 45, y: height - 368, width: 505, height: 16, color: dark });
        page.drawText("Part I   Taxpayer Identification Number (TIN)", { x: 52, y: height - 364, size: 9, font: fontBold, color: white });
        page.drawText("Enter your TIN in the appropriate box. The TIN provided must match the name given on line 1 to avoid backup withholding.", { x: 45, y: height - 382, size: 7, font: fontRegular, color: gray });

        page.drawText("Social security number", { x: 45, y: height - 408, size: 8.5, font: fontBold, color: dark });
        page.drawText("Employer identification number", { x: 45, y: height - 454, size: 8.5, font: fontBold, color: dark });
        page.drawText("— OR —", { x: 275, y: height - 432, size: 8, font: fontBold, color: gray });

        // Outer box and Comb Cell Guides for SSN (3-2-4)
        page.drawRectangle({ x: 335, y: height - 419, width: 215, height: 24, borderColor: dark, borderWidth: 1 });
        for (let i = 1; i < 9; i++) {
            const vx = 335 + i * (215 / 9);
            const isDash = (i === 3 || i === 5);
            page.drawLine({ start: { x: vx, y: height - 419 }, end: { x: vx, y: height - 395 }, thickness: isDash ? 1.2 : 0.5, color: isDash ? dark : lineGray });
        }
        // Outer box and Comb Cell Guides for EIN (2-7)
        page.drawRectangle({ x: 335, y: height - 464, width: 215, height: 24, borderColor: dark, borderWidth: 1 });
        for (let i = 1; i < 9; i++) {
            const vx = 335 + i * (215 / 9);
            const isDash = (i === 2);
            page.drawLine({ start: { x: vx, y: height - 464 }, end: { x: vx, y: height - 440 }, thickness: isDash ? 1.2 : 0.5, color: isDash ? dark : lineGray });
        }

        // Part II: Certification
        page.drawRectangle({ x: 45, y: height - 486, width: 505, height: 16, color: dark });
        page.drawText("Part II  Certification", { x: 52, y: height - 482, size: 9, font: fontBold, color: white });
        page.drawText("Under penalties of perjury, I certify that: 1. The number shown on this form is my correct taxpayer identification number;", { x: 45, y: height - 500, size: 7, font: fontRegular, color: dark });
        page.drawText("2. I am not subject to backup withholding; 3. I am a U.S. citizen or other U.S. person; and 4. The FATCA code(s) entered are correct.", { x: 45, y: height - 510, size: 7, font: fontRegular, color: gray });

        page.drawText("Sign Here", { x: 45, y: height - 535, size: 10, font: fontBold, color: dark });
        page.drawText("Signature of U.S. person", { x: 45, y: height - 547, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Date Signed", { x: 405, y: height - 522, size: 8.5, font: fontBold, color: dark });

        // Footer
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Form W-9 (Rev. March 2024)", { x: 45, y: 26, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Cat. No. 10231X", { x: 275, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "nda") {
        const white = rgb(1, 1, 1);
        const navy = rgb(0.12, 0.16, 0.28);

        // Header Banner
        page.drawRectangle({ x: 45, y: height - 70, width: 505, height: 42, color: navy });
        page.drawText("MUTUAL NON-DISCLOSURE AGREEMENT", { x: 60, y: height - 52, size: 15, font: fontBold, color: white });
        page.drawText("Standard Confidentiality & Non-Disclosure Agreement", { x: 60, y: height - 64, size: 7.5, font: fontRegular, color: rgb(0.80, 0.85, 0.95) });

        // Section 1: Parties
        page.drawText("Disclosing Party Legal Name", { x: 45, y: height - 85, size: 8, font: fontBold, color: dark });
        page.drawText("Receiving Party Legal Name", { x: 310, y: height - 85, size: 8, font: fontBold, color: dark });
        page.drawText("Effective Date of Agreement", { x: 45, y: height - 127, size: 8, font: fontBold, color: dark });
        page.drawText("Governing Jurisdiction & Law", { x: 310, y: height - 127, size: 8, font: fontBold, color: dark });
        page.drawText("Confidentiality Term Length", { x: 45, y: height - 169, size: 8, font: fontBold, color: dark });

        // Section 2: Scope
        page.drawLine({ start: { x: 45, y: height - 210 }, end: { x: 550, y: height - 210 }, thickness: 1, color: lineGray });
        page.drawText("PROTECTED INFORMATION SCOPE:", { x: 45, y: height - 221, size: 8.5, font: fontBold, color: dark });
        page.drawText("Trade Secrets", { x: 65, y: height - 237, size: 8, font: fontRegular, color: dark });
        page.drawText("Source Code & Algorithms", { x: 230, y: height - 237, size: 8, font: fontRegular, color: dark });
        page.drawText("Financial & Customer Data", { x: 400, y: height - 237, size: 8, font: fontRegular, color: dark });

        // Section 3: Dual Signatures
        page.drawLine({ start: { x: 45, y: height - 256 }, end: { x: 550, y: height - 256 }, thickness: 1, color: lineGray });
        page.drawText("DISCLOSING PARTY EXECUTION", { x: 45, y: height - 268, size: 8.5, font: fontBold, color: dark });
        page.drawText("RECIPIENT PARTY EXECUTION", { x: 310, y: height - 268, size: 8.5, font: fontBold, color: dark });

        page.drawText("Representative Full Name", { x: 45, y: height - 279, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Representative Full Name", { x: 310, y: height - 279, size: 7.5, font: fontRegular, color: gray });

        page.drawText("Official Title", { x: 45, y: height - 319, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Official Title", { x: 310, y: height - 319, size: 7.5, font: fontRegular, color: gray });

        page.drawText("Digital Signature", { x: 45, y: height - 359, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Digital Signature", { x: 310, y: height - 359, size: 7.5, font: fontRegular, color: gray });

        page.drawText("Date Signed", { x: 45, y: height - 427, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Date Signed", { x: 310, y: height - 427, size: 7.5, font: fontRegular, color: gray });

        // Footer
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Mutual Non-Disclosure Agreement", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "intake") {
        const white = rgb(1, 1, 1);
        const teal = rgb(0.08, 0.45, 0.52);
        const lightTeal = rgb(0.88, 0.94, 0.96);

        // Header Banner
        page.drawRectangle({ x: 45, y: height - 68, width: 505, height: 42, color: teal });
        page.drawText("PATIENT INTAKE & MEDICAL REGISTRATION", { x: 58, y: height - 50, size: 15, font: fontBold, color: white });
        page.drawText("Patient Registration & Health Questionnaire", { x: 58, y: height - 62, size: 7.5, font: fontRegular, color: rgb(0.85, 0.95, 0.98) });

        // Section 1: Demographics
        page.drawRectangle({ x: 45, y: height - 88, width: 505, height: 16, color: lightTeal });
        page.drawText("1. PATIENT DEMOGRAPHICS & CONTACT INFORMATION", { x: 52, y: height - 84, size: 8, font: fontBold, color: dark });

        page.drawText("Full Legal Name (First, Middle, Last)", { x: 45, y: height - 97, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Date of Birth (YYYY-MM-DD)", { x: 385, y: height - 97, size: 7.5, font: fontRegular, color: gray });

        page.drawText("Primary Phone Number", { x: 45, y: height - 135, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Email Address", { x: 235, y: height - 135, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Sex:", { x: 435, y: height - 156, size: 7.5, font: fontBold, color: dark });
        page.drawText("M", { x: 477, y: height - 156, size: 7.5, font: fontRegular, color: dark });
        page.drawText("F", { x: 510, y: height - 156, size: 7.5, font: fontRegular, color: dark });

        page.drawText("Residential Address (Street, City, State, ZIP)", { x: 45, y: height - 173, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Emergency Contact Name & Relationship", { x: 45, y: height - 211, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Emergency Contact Phone", { x: 355, y: height - 211, size: 7.5, font: fontRegular, color: gray });

        // Section 2: Clinical Screening & Health History
        page.drawRectangle({ x: 45, y: height - 256, width: 505, height: 16, color: lightTeal });
        page.drawText("2. MEDICAL SCREENING & CLINICAL HISTORY", { x: 52, y: height - 252, size: 8, font: fontBold, color: dark });
        page.drawText("No", { x: 466, y: height - 273, size: 7.5, font: fontBold, color: dark });
        page.drawText("Yes", { x: 514, y: height - 273, size: 7.5, font: fontBold, color: dark });

        page.drawText("Do you currently smoke, vape, or use tobacco products?", { x: 45, y: height - 288, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Have you ever been diagnosed with hypertension or heart disease?", { x: 45, y: height - 310, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Have you ever been diagnosed with diabetes or endocrine disorder?", { x: 45, y: height - 332, size: 7.5, font: fontRegular, color: dark });

        page.drawText("Primary Care Physician / Clinic Name", { x: 45, y: height - 349, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Known Drug / Environmental Allergies", { x: 305, y: height - 349, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Current Medications & Dosages", { x: 45, y: height - 387, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Pre-existing Medical Conditions / Chronic Illnesses / Notes", { x: 45, y: height - 425, size: 7.5, font: fontRegular, color: gray });

        // Section 3: Health Insurance
        page.drawRectangle({ x: 45, y: height - 482, width: 505, height: 16, color: lightTeal });
        page.drawText("3. HEALTH INSURANCE & BILLING COVERAGE", { x: 52, y: height - 478, size: 8, font: fontBold, color: dark });
        page.drawText("Insurance Provider / Plan Name", { x: 45, y: height - 489, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Policy / Member ID #", { x: 295, y: height - 489, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Group #", { x: 455, y: height - 489, size: 7.5, font: fontRegular, color: gray });

        // Section 4: HIPAA & Informed Consent
        page.drawRectangle({ x: 45, y: height - 534, width: 505, height: 16, color: lightTeal });
        page.drawText("4. HIPAA PRIVACY NOTICE & TREATMENT CONSENT", { x: 52, y: height - 530, size: 8, font: fontBold, color: dark });
        page.drawText("HIPAA Notice Acknowledgement: I acknowledge receipt of the Privacy Practices Notice and authorize", { x: 68, y: height - 562, size: 7, font: fontRegular, color: dark });
        page.drawText("the confidential use and disclosure of my protected health information (PHI) for medical care and billing.", { x: 68, y: height - 572, size: 7, font: fontRegular, color: gray });

        page.drawText("Informed Treatment Consent: I voluntarily consent to outpatient examination, diagnostic procedures,", { x: 68, y: height - 598, size: 7, font: fontRegular, color: dark });
        page.drawText("and medical treatment as deemed necessary by attending healthcare clinical professionals.", { x: 68, y: height - 608, size: 7, font: fontRegular, color: gray });

        // Section 5: Signature & Authorization
        page.drawRectangle({ x: 45, y: height - 624, width: 505, height: 16, color: lightTeal });
        page.drawText("5. SIGNATURE & AUTHORIZATION", { x: 52, y: height - 620, size: 8, font: fontBold, color: dark });

        page.drawText("Patient / Legal Guardian Digital Signature", { x: 45, y: height - 634, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Signer Relationship to Patient", { x: 310, y: height - 634, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Date Signed", { x: 310, y: height - 674, size: 7.5, font: fontRegular, color: gray });

        // Footer Notice
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Confidential Healthcare Record", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "job") {
        const white = rgb(1, 1, 1);
        const navy = rgb(0.10, 0.18, 0.36);

        // Header Banner
        page.drawRectangle({ x: 45, y: height - 70, width: 505, height: 42, color: navy });
        page.drawText("EMPLOYMENT APPLICATION FORM", { x: 60, y: height - 52, size: 15, font: fontBold, color: white });
        page.drawText("Application for Employment", { x: 60, y: height - 64, size: 7.5, font: fontRegular, color: rgb(0.80, 0.85, 0.95) });

        // Candidate Info
        page.drawText("Candidate Full Legal Name", { x: 45, y: height - 85, size: 8, font: fontBold, color: dark });
        page.drawText("Contact Phone Number", { x: 45, y: height - 127, size: 8, font: fontBold, color: dark });
        page.drawText("Email Address", { x: 310, y: height - 127, size: 8, font: fontBold, color: dark });

        page.drawText("Position Applied For", { x: 45, y: height - 169, size: 8, font: fontBold, color: dark });
        page.drawText("Available Start Date", { x: 310, y: height - 169, size: 8, font: fontBold, color: dark });

        page.drawText("Desired Employment Type:", { x: 45, y: height - 219, size: 8, font: fontBold, color: dark });
        page.drawText("Full-Time", { x: 180, y: height - 219, size: 8, font: fontRegular, color: dark });
        page.drawText("Part-Time", { x: 270, y: height - 219, size: 8, font: fontRegular, color: dark });
        page.drawText("Contract", { x: 360, y: height - 219, size: 8, font: fontRegular, color: dark });
        page.drawText("Expected Annual Salary ($ USD)", { x: 310, y: height - 235, size: 8, font: fontBold, color: dark });

        // Work Authorization
        page.drawLine({ start: { x: 45, y: height - 275 }, end: { x: 550, y: height - 275 }, thickness: 1, color: lineGray });
        page.drawText("LEGAL WORK ELIGIBILITY & AUTHORIZATION", { x: 45, y: height - 288, size: 8.5, font: fontBold, color: dark });
        page.drawText("Yes", { x: 420, y: height - 285, size: 7.5, font: fontBold, color: dark });
        page.drawText("No", { x: 475, y: height - 285, size: 7.5, font: fontBold, color: dark });

        page.drawText("Are you legally authorized to work in the United States without visa restriction?", { x: 45, y: height - 307, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Will you now or in the future require employment visa sponsorship (e.g. H-1B)?", { x: 45, y: height - 333, size: 7.5, font: fontRegular, color: dark });

        // Attestation & Signatures
        page.drawLine({ start: { x: 45, y: height - 355 }, end: { x: 550, y: height - 355 }, thickness: 1, color: lineGray });
        page.drawText("APPLICANT ATTESTATION & SIGNATURE", { x: 45, y: height - 368, size: 8.5, font: fontBold, color: dark });
        page.drawText("I certify that all statements in this application are true and complete to the best of my knowledge.", { x: 45, y: height - 378, size: 7, font: fontRegular, color: gray });

        page.drawText("Applicant Digital Signature", { x: 45, y: height - 396, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Application Date", { x: 325, y: height - 396, size: 7.5, font: fontRegular, color: gray });

        // Footer
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Application for Employment", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "lease") {
        const white = rgb(1, 1, 1);
        const navy = rgb(0.12, 0.20, 0.35);

        // Header Banner
        page.drawRectangle({ x: 45, y: height - 70, width: 505, height: 42, color: navy });
        page.drawText("RESIDENTIAL LEASE AGREEMENT", { x: 60, y: height - 52, size: 15, font: fontBold, color: white });
        page.drawText("Standard Residential Tenancy Contract", { x: 60, y: height - 64, size: 7.5, font: fontRegular, color: rgb(0.80, 0.85, 0.95) });

        // Parties & Premises
        page.drawText("Landlord / Lessor Legal Name", { x: 45, y: height - 87, size: 8, font: fontBold, color: dark });
        page.drawText("Tenant / Lessee Legal Name", { x: 310, y: height - 87, size: 8, font: fontBold, color: dark });
        page.drawText("Leased Premises / Property Address & Unit Number", { x: 45, y: height - 129, size: 8, font: fontBold, color: dark });

        // Term Dates
        page.drawText("Lease Commencement Date", { x: 45, y: height - 171, size: 8, font: fontBold, color: dark });
        page.drawText("Lease Expiration Date", { x: 310, y: height - 171, size: 8, font: fontBold, color: dark });

        // Financial Schedule Card (Monthly Rent, Security Deposit, Total Move-in)
        page.drawRectangle({ x: 45, y: height - 258, width: 505, height: 46, color: rgb(0.98, 0.98, 1.0), borderColor: lineGray, borderWidth: 0.5 });
        page.drawText("Monthly Rent ($ USD)", { x: 52, y: height - 219, size: 8, font: fontBold, color: dark });
        page.drawText("Security Deposit ($ USD)", { x: 215, y: height - 219, size: 8, font: fontBold, color: dark });
        page.drawText("Total Move-in Due (Rent+Deposit)", { x: 385, y: height - 219, size: 8, font: fontBold, color: dark });

        // Pet Policy & Utilities
        page.drawText("Pet Policy:", { x: 45, y: height - 281, size: 8, font: fontBold, color: dark });
        page.drawText("No Pets Allowed", { x: 170, y: height - 281, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Pets Permitted", { x: 270, y: height - 281, size: 7.5, font: fontRegular, color: dark });

        page.drawText("Included Utilities:", { x: 45, y: height - 311, size: 8, font: fontBold, color: dark });
        page.drawText("Water", { x: 170, y: height - 311, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Gas", { x: 240, y: height - 311, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Electric", { x: 305, y: height - 311, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Trash", { x: 395, y: height - 311, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Internet", { x: 465, y: height - 311, size: 7.5, font: fontRegular, color: dark });

        // Dual Execution
        page.drawLine({ start: { x: 45, y: height - 336 }, end: { x: 550, y: height - 336 }, thickness: 1, color: lineGray });
        page.drawText("Landlord Digital Signature", { x: 45, y: height - 346, size: 8, font: fontBold, color: dark });
        page.drawText("Tenant Digital Signature", { x: 310, y: height - 346, size: 8, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 45, y: height - 420, size: 8, font: fontBold, color: dark });

        // Footer
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Residential Tenancy Agreement", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "rental") {
        const white = rgb(1, 1, 1);
        const navy = rgb(0.14, 0.22, 0.40);

        // Header Banner
        page.drawRectangle({ x: 45, y: height - 70, width: 505, height: 42, color: navy });
        page.drawText("TENANT RENTAL APPLICATION", { x: 60, y: height - 52, size: 15, font: fontBold, color: white });
        page.drawText("Application for Tenancy", { x: 60, y: height - 64, size: 7.5, font: fontRegular, color: rgb(0.80, 0.85, 0.95) });

        // Applicant Info
        page.drawText("Applicant Full Legal Name", { x: 45, y: height - 85, size: 8, font: fontBold, color: dark });
        page.drawText("Current Street Address, City, State, ZIP", { x: 45, y: height - 127, size: 8, font: fontBold, color: dark });
        page.drawText("Primary Phone Number", { x: 45, y: height - 169, size: 8, font: fontBold, color: dark });
        page.drawText("Email Address", { x: 310, y: height - 169, size: 8, font: fontBold, color: dark });

        // SSN Comb Box & DOB
        page.drawText("Social Security Number (9 Digits)", { x: 45, y: height - 211, size: 8, font: fontBold, color: dark });
        page.drawText("Date of Birth", { x: 310, y: height - 211, size: 8, font: fontBold, color: dark });

        // Draw SSN Comb Guides
        page.drawRectangle({ x: 45, y: height - 241, width: 240, height: 22, borderColor: dark, borderWidth: 1 });
        for (let i = 1; i < 9; i++) {
            const vx = 45 + i * (240 / 9);
            const isDash = (i === 3 || i === 5);
            page.drawLine({ start: { x: vx, y: height - 241 }, end: { x: vx, y: height - 219 }, thickness: isDash ? 1.2 : 0.5, color: isDash ? dark : lineGray });
        }

        // Employment & Financials
        page.drawText("Employer / Company Name", { x: 45, y: height - 253, size: 8, font: fontBold, color: dark });
        page.drawText("Monthly Gross Income ($ USD)", { x: 310, y: height - 253, size: 8, font: fontBold, color: dark });
        page.drawText("Occupation / Position Title", { x: 45, y: height - 295, size: 8, font: fontBold, color: dark });
        page.drawText("Desired Move-In Date", { x: 310, y: height - 295, size: 8, font: fontBold, color: dark });

        // Screening Questionnaire (Mutually Exclusive Yes/No)
        page.drawLine({ start: { x: 45, y: height - 338 }, end: { x: 550, y: height - 338 }, thickness: 1, color: lineGray });
        page.drawText("BACKGROUND SCREENING QUESTIONNAIRE", { x: 45, y: height - 350, size: 8.5, font: fontBold, color: dark });
        page.drawText("No", { x: 420, y: height - 348, size: 7.5, font: fontBold, color: dark });
        page.drawText("Yes", { x: 475, y: height - 348, size: 7.5, font: fontBold, color: dark });

        page.drawText("Have you ever been evicted from a tenancy or asked to vacate?", { x: 45, y: height - 367, size: 7.5, font: fontRegular, color: dark });
        page.drawText("Have you ever declared bankruptcy or had a repossession?", { x: 45, y: height - 393, size: 7.5, font: fontRegular, color: dark });

        // Credit Check Authorization
        page.drawLine({ start: { x: 45, y: height - 414 }, end: { x: 550, y: height - 414 }, thickness: 1, color: lineGray });
        page.drawText("I authorize property management to conduct comprehensive credit and background screening.", { x: 68, y: height - 430, size: 7.5, font: fontRegular, color: dark });

        // Signature & Date
        page.drawText("Applicant Signature of Authorization", { x: 45, y: height - 452, size: 8, font: fontBold, color: dark });
        page.drawText("Application Date", { x: 325, y: height - 452, size: 8, font: fontBold, color: dark });

        // Footer
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Application for Residential Tenancy", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
        page.drawText("Page 1 of 1", { x: 505, y: 26, size: 7.5, font: fontRegular, color: gray });

    } else if (key === "invoice") {
        const white = rgb(1, 1, 1);
        const navyHeader = rgb(0.09, 0.15, 0.28);
        const navyTable = rgb(0.12, 0.23, 0.54);

        // Header Banner (Height extended to 104 pt to cleanly house all 4 meta items in white text)
        page.drawRectangle({ x: 45, y: height - 128, width: 505, height: 104, color: navyHeader });
        page.drawText("COMMERCIAL INVOICE", { x: 60, y: height - 60, size: 20, font: fontBold, color: white });
        page.drawText("Payment Due Upon Receipt", { x: 60, y: height - 76, size: 7.5, font: fontRegular, color: rgb(0.75, 0.85, 0.98) });

        // Meta Header Labels (All 4 in white bold 7.5 pt)
        page.drawText("INVOICE #:", { x: 345, y: height - 48, size: 7.5, font: fontBold, color: white });
        page.drawText("INVOICE DATE:", { x: 345, y: height - 70, size: 7.5, font: fontBold, color: white });
        page.drawText("DUE DATE:", { x: 345, y: height - 92, size: 7.5, font: fontBold, color: white });
        page.drawText("P.O. / REF #:", { x: 345, y: height - 114, size: 7.5, font: fontBold, color: white });

        // Section 1: Bill By & Bill To Panels
        page.drawRectangle({ x: 45, y: height - 238, width: 240, height: 96, color: rgb(0.98, 0.98, 1.0), borderColor: lineGray, borderWidth: 0.5 });
        page.drawText("BILLED BY (SELLER / VENDOR)", { x: 52, y: height - 154, size: 8, font: fontBold, color: dark });

        page.drawRectangle({ x: 300, y: height - 238, width: 250, height: 96, color: rgb(0.98, 0.98, 1.0), borderColor: lineGray, borderWidth: 0.5 });
        page.drawText("BILLED TO (CLIENT / BUYER)", { x: 307, y: height - 154, size: 8, font: fontBold, color: dark });

        // Section 2: Terms & Currency Bar
        page.drawText("Payment Terms:", { x: 45, y: height - 262, size: 8, font: fontBold, color: dark });
        page.drawText("Billing Currency:", { x: 300, y: height - 262, size: 8, font: fontBold, color: dark });

        // Section 3: Itemized Table Box Grid
        page.drawRectangle({ x: 45, y: height - 444, width: 505, height: 164, borderColor: dark, borderWidth: 1 });
        
        // Header Row Bar
        page.drawRectangle({ x: 45, y: height - 304, width: 505, height: 24, color: navyTable });
        page.drawText("Item / Service Description", { x: 52, y: height - 291, size: 8.5, font: fontBold, color: white });
        page.drawText("Qty / Hrs", { x: 340, y: height - 291, size: 8.5, font: fontBold, color: white });
        page.drawText("Unit Price", { x: 405, y: height - 291, size: 8.5, font: fontBold, color: white });
        page.drawText("Total Amount", { x: 480, y: height - 291, size: 8.5, font: fontBold, color: white });

        // Column Dividers
        page.drawLine({ start: { x: 330, y: height - 444 }, end: { x: 330, y: height - 280 }, thickness: 0.75, color: dark });
        page.drawLine({ start: { x: 390, y: height - 444 }, end: { x: 390, y: height - 280 }, thickness: 0.75, color: dark });
        page.drawLine({ start: { x: 465, y: height - 444 }, end: { x: 465, y: height - 280 }, thickness: 0.75, color: dark });

        // Row Separators & Zebra Striping
        page.drawLine({ start: { x: 45, y: height - 339 }, end: { x: 550, y: height - 339 }, thickness: 0.5, color: lineGray });
        page.drawRectangle({ x: 45, y: height - 374, width: 505, height: 35, color: rgb(0.97, 0.98, 1.0) });
        page.drawLine({ start: { x: 45, y: height - 374 }, end: { x: 550, y: height - 374 }, thickness: 0.5, color: lineGray });
        page.drawLine({ start: { x: 45, y: height - 409 }, end: { x: 550, y: height - 409 }, thickness: 0.5, color: lineGray });
        page.drawRectangle({ x: 45, y: height - 444, width: 505, height: 35, color: rgb(0.97, 0.98, 1.0) });

        // Section 4: Left Remittance & Customer Notes
        page.drawText("PAYMENT INSTRUCTIONS & BANK DETAILS:", { x: 45, y: height - 466, size: 7.5, font: fontBold, color: dark });
        page.drawText("TERMS & CONDITIONS / NOTES:", { x: 45, y: height - 542, size: 7.5, font: fontBold, color: dark });

        // Section 4: Right Totals Breakdown Card
        page.drawRectangle({ x: 325, y: height - 612, width: 225, height: 152, color: rgb(0.98, 0.99, 1.0), borderColor: lineGray, borderWidth: 0.75 });
        page.drawText("Subtotal:", { x: 335, y: height - 476, size: 8.5, font: fontBold, color: dark });
        page.drawText("Discount / Credits:", { x: 335, y: height - 504, size: 8.5, font: fontBold, color: dark });
        page.drawText("Sales Tax (8.5%):", { x: 335, y: height - 532, size: 8.5, font: fontBold, color: dark });
        page.drawText("Shipping & Freight:", { x: 335, y: height - 560, size: 8.5, font: fontBold, color: dark });

        // Highlight Balance Due Bar
        page.drawRectangle({ x: 325, y: height - 612, width: 225, height: 38, color: rgb(0.92, 0.95, 1.0) });
        page.drawText("TOTAL BALANCE DUE:", { x: 335, y: height - 594, size: 9, font: fontBold, color: dark });

        // Section 5: Signature Authorization
        page.drawLine({ start: { x: 45, y: height - 634 }, end: { x: 550, y: height - 634 }, thickness: 0.75, color: lineGray });
        page.drawText("Customer / Authorized Representative Signature", { x: 45, y: height - 646, size: 8, font: fontBold, color: dark });
        page.drawText("Signer Full Legal Name & Title", { x: 300, y: height - 646, size: 8, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 300, y: height - 688, size: 8, font: fontBold, color: dark });

        // Footer Notice
        page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: 0.75, color: lineGray });
        page.drawText("Thank you for your business.", { x: 45, y: 26, size: 7.5, font: fontRegular, color: gray });
    }

    return await doc.save();
}
