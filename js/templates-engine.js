// ── Starter Sample Templates & Vector Generator (js/templates-engine.js) ─
export const STARTER_TEMPLATES = {
    w9: {
        title: "Form W-9: Request for Taxpayer Identification",
        description: "Standard IRS-compliant taxpayer identification and certification form.",
        fields: [
            { id: 1, type: "textField", name: "taxpayer_full_name", x: 45, y: 105, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Full Name" },
            { id: 2, type: "textField", name: "business_name", x: 45, y: 155, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Business Name / Disregarded Entity" },
            { id: 3, type: "dropdown", name: "tax_classification", x: 45, y: 205, width: 505, height: 28, options: ["Individual / Sole proprietor", "C Corporation", "S Corporation", "Partnership", "Trust / Estate", "LLC"], borderStyle: "solid", fillStyle: "tint" },
            { id: 4, type: "textField", name: "address", x: 45, y: 255, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Street Address", autofill: "address1" },
            { id: 5, type: "textField", name: "city_state_zip", x: 45, y: 305, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "City, State, and ZIP Code" },
            { id: 6, type: "textField", name: "ssn_or_ein", x: 45, y: 390, width: 245, height: 30, borderStyle: "solid", fillStyle: "yellow", tooltip: "Social Security Number / Employer ID" },
            { id: 7, type: "signature", name: "taxpayer_signature", x: 45, y: 505, width: 260, height: 55, borderStyle: "none", fillStyle: "tint", tooltip: "Sign Here" },
            { id: 8, type: "dateField", name: "sign_date", x: 325, y: 518, width: 225, height: 30, borderStyle: "solid", fillStyle: "white", tooltip: "Date" }
        ]
    },
    nda: {
        title: "Mutual Non-Disclosure Agreement",
        description: "Two-party confidentiality agreement with dual signature blocks and date fields.",
        fields: [
            { id: 1, type: "textField", name: "disclosing_party", x: 45, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Disclosing Party Name" },
            { id: 2, type: "textField", name: "receiving_party", x: 310, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Receiving Party Name" },
            { id: 3, type: "dateField", name: "effective_date", x: 45, y: 155, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Effective Date" },
            { id: 4, type: "dropdown", name: "governing_jurisdiction", x: 310, y: 155, width: 240, height: 28, options: ["State of California", "State of New York", "State of Delaware", "United Kingdom", "European Union"], borderStyle: "solid", fillStyle: "tint" },
            { id: 5, type: "checkBox", name: "includes_trade_secrets", x: 45, y: 220, width: 20, height: 20, defaultChecked: true },
            { id: 6, type: "textField", name: "signer1_title", x: 45, y: 310, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Discloser Title" },
            { id: 7, type: "signature", name: "discloser_signature", x: 45, y: 358, width: 240, height: 55, borderStyle: "none", fillStyle: "tint" },
            { id: 8, type: "textField", name: "signer2_title", x: 310, y: 310, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Recipient Title" },
            { id: 9, type: "signature", name: "recipient_signature", x: 310, y: 358, width: 240, height: 55, borderStyle: "none", fillStyle: "tint" }
        ]
    },
    intake: {
        title: "Patient Intake & HIPAA Consent Form",
        description: "Confidential healthcare registration form with medical history, insurance details, and HIPAA privacy release.",
        fields: [
            // Section 1: Demographics
            { id: 1, type: "textField", name: "patient_full_name", x: 45, y: 110, width: 320, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Patient Full Legal Name", autofill: "name" },
            { id: 2, type: "dateField", name: "patient_dob", x: 385, y: 110, width: 165, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Date of Birth (MM/DD/YYYY)", autofill: "bday" },
            { id: 3, type: "textField", name: "patient_phone", x: 45, y: 155, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Primary Phone Number", autofill: "phone" },
            { id: 4, type: "textField", name: "patient_email", x: 310, y: 155, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Email Address", autofill: "email" },
            { id: 5, type: "textField", name: "patient_address", x: 45, y: 200, width: 320, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Street Address, City, State, ZIP", autofill: "address1" },
            { id: 6, type: "dropdown", name: "patient_gender", x: 385, y: 200, width: 165, height: 26, options: ["Female", "Male", "Non-Binary", "Other", "Prefer not to disclose"], borderStyle: "solid", fillStyle: "tint", tooltip: "Gender / Identity" },
            { id: 7, type: "textField", name: "emergency_contact_name", x: 45, y: 245, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Emergency Contact Name & Relationship" },
            { id: 8, type: "textField", name: "emergency_contact_phone", x: 310, y: 245, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Emergency Contact Phone Number" },

            // Section 2: Medical History & Insurance
            { id: 9, type: "textField", name: "primary_care_physician", x: 45, y: 310, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Primary Care Doctor / Clinic Name" },
            { id: 10, type: "textField", name: "known_allergies", x: 310, y: 310, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Known Allergies (Penicillin, Latex, etc.)" },
            { id: 11, type: "textField", name: "current_medications", x: 45, y: 355, width: 505, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Current Medications & Dosages" },
            { id: 12, type: "textField", name: "medical_conditions_notes", x: 45, y: 400, width: 505, height: 38, multiline: true, borderStyle: "solid", fillStyle: "white", tooltip: "Pre-existing Medical Conditions / Chronic Illnesses" },
            { id: 13, type: "textField", name: "insurance_provider", x: 45, y: 458, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Insurance Provider / Plan Name" },
            { id: 14, type: "textField", name: "insurance_member_id", x: 310, y: 458, width: 140, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Policy / Member ID #" },
            { id: 15, type: "textField", name: "insurance_group_num", x: 465, y: 458, width: 85, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Group #" },

            // Section 3: HIPAA & Consent Checkboxes
            { id: 16, type: "checkBox", name: "hipaa_consent_ack", x: 45, y: 518, width: 16, height: 16, defaultChecked: true, tooltip: "HIPAA Notice Acknowledgement" },
            { id: 17, type: "checkBox", name: "treatment_consent_ack", x: 45, y: 554, width: 16, height: 16, defaultChecked: true, tooltip: "Medical Treatment Consent" },

            // Section 4: Signature & Date
            { id: 18, type: "signature", name: "patient_or_guardian_signature", x: 45, y: 622, width: 240, height: 50, borderStyle: "none", fillStyle: "tint", tooltip: "Patient / Guardian Signature" },
            { id: 19, type: "dropdown", name: "signer_relationship", x: 310, y: 622, width: 240, height: 26, options: ["Self (Patient)", "Parent / Legal Guardian", "Healthcare Power of Attorney", "Authorized Representative"], borderStyle: "solid", fillStyle: "tint", tooltip: "Relationship to Patient" },
            { id: 20, type: "dateField", name: "date_signed", x: 310, y: 666, width: 240, height: 26, borderStyle: "solid", fillStyle: "white", tooltip: "Date Signed" }
        ]
    },
    job: {
        title: "Employment Application Form",
        description: "Comprehensive applicant screening form with employment verification and signature.",
        fields: [
            { id: 1, type: "textField", name: "candidate_full_name", x: 45, y: 105, width: 505, height: 28, borderStyle: "solid", fillStyle: "white" },
            { id: 2, type: "textField", name: "position_applied", x: 45, y: 155, width: 240, height: 28, borderStyle: "solid", fillStyle: "white" },
            { id: 3, type: "dateField", name: "available_date", x: 310, y: 155, width: 240, height: 28, borderStyle: "solid", fillStyle: "white" },
            { id: 4, type: "dropdown", name: "employment_type", x: 45, y: 205, width: 240, height: 28, options: ["Full-Time", "Part-Time", "Contract / Freelance", "Internship"], borderStyle: "solid", fillStyle: "tint" },
            { id: 5, type: "textField", name: "expected_salary", x: 310, y: 205, width: 240, height: 28, borderStyle: "solid", fillStyle: "white" },
            { id: 6, type: "checkBox", name: "work_authorization", x: 45, y: 255, width: 20, height: 20, defaultChecked: true },
            { id: 7, type: "signature", name: "applicant_signature", x: 45, y: 335, width: 260, height: 55, borderStyle: "none", fillStyle: "tint" },
            { id: 8, type: "dateField", name: "application_date", x: 325, y: 348, width: 225, height: 30, borderStyle: "solid", fillStyle: "white" }
        ]
    },
    lease: {
        title: "Residential Lease Agreement",
        description: "Standard rental contract with rent terms, deposit, lease dates, and dual signatures.",
        fields: [
            { id: 1, type: "textField", name: "landlord_name", x: 45, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Landlord Legal Name" },
            { id: 2, type: "textField", name: "tenant_name", x: 310, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Tenant Legal Name" },
            { id: 3, type: "textField", name: "property_address", x: 45, y: 155, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Property Address & Unit Number", autofill: "address1" },
            { id: 4, type: "textField", name: "monthly_rent", x: 45, y: 205, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Monthly Rent ($)" },
            { id: 5, type: "textField", name: "security_deposit", x: 310, y: 205, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Security Deposit ($)" },
            { id: 6, type: "dateField", name: "lease_start_date", x: 45, y: 255, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Lease Commencement Date" },
            { id: 7, type: "dateField", name: "lease_end_date", x: 310, y: 255, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Lease Expiration Date" },
            { id: 8, type: "signature", name: "landlord_signature", x: 45, y: 365, width: 240, height: 55, borderStyle: "none", fillStyle: "tint", tooltip: "Landlord Signature" },
            { id: 9, type: "signature", name: "tenant_signature", x: 310, y: 365, width: 240, height: 55, borderStyle: "none", fillStyle: "tint", tooltip: "Tenant Signature" },
            { id: 10, type: "dateField", name: "lease_signed_date", x: 45, y: 445, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Date Signed" }
        ]
    },
    rental: {
        title: "Rental & Tenant Application Form",
        description: "Comprehensive screening form with income verification and credit check consent.",
        fields: [
            { id: 1, type: "textField", name: "applicant_full_name", x: 45, y: 105, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Applicant Full Name", autofill: "name" },
            { id: 2, type: "textField", name: "current_address", x: 45, y: 155, width: 505, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Current Street Address", autofill: "address1" },
            { id: 3, type: "textField", name: "phone_number", x: 45, y: 205, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Phone Number", autofill: "phone" },
            { id: 4, type: "textField", name: "email_address", x: 310, y: 205, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Email Address", autofill: "email" },
            { id: 5, type: "textField", name: "employer_name", x: 45, y: 255, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Employer Name" },
            { id: 6, type: "textField", name: "monthly_income", x: 310, y: 255, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Monthly Income ($)" },
            { id: 7, type: "textField", name: "emergency_contact", x: 45, y: 305, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Emergency Contact" },
            { id: 8, type: "dateField", name: "desired_move_in", x: 310, y: 305, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", tooltip: "Move-In Date" },
            { id: 9, type: "checkBox", name: "background_check_consent", x: 45, y: 355, width: 20, height: 20, defaultChecked: true },
            { id: 10, type: "signature", name: "applicant_signature", x: 45, y: 430, width: 260, height: 55, borderStyle: "none", fillStyle: "tint" },
            { id: 11, type: "dateField", name: "application_date", x: 325, y: 443, width: 225, height: 30, borderStyle: "solid", fillStyle: "white" }
        ]
    },
    invoice: {
        title: "Standard Commercial Invoice",
        description: "Clean invoice template with billing addresses, itemized line items, totals, and notes.",
        fields: [
            { id: 1, type: "dateField", name: "invoice_date", x: 410, y: 55, width: 140, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Date" },
            { id: 2, type: "textField", name: "invoice_number", x: 410, y: 88, width: 140, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Invoice Number" },
            { id: 3, type: "textField", name: "company_name", x: 45, y: 135, width: 220, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Company Name" },
            { id: 4, type: "textField", name: "company_email", x: 45, y: 165, width: 220, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Company Email / Address" },
            { id: 5, type: "textField", name: "client_name", x: 310, y: 135, width: 240, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Client Name" },
            { id: 6, type: "textField", name: "client_email", x: 310, y: 165, width: 240, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Client Email / Address" },
            { id: 7, type: "textField", name: "payment_terms", x: 45, y: 225, width: 220, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Payment Terms" },
            { id: 8, type: "dateField", name: "due_date", x: 310, y: 225, width: 240, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Payment Due Date" },
            
            // Itemized Line Items inside Table Box
            { id: 9, type: "textField", name: "item_desc_1", x: 50, y: 315, width: 295, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Item 1 Description" },
            { id: 10, type: "textField", name: "item_qty_1", x: 355, y: 315, width: 55, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Qty" },
            { id: 11, type: "textField", name: "item_price_1", x: 420, y: 315, width: 55, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Price" },
            { id: 12, type: "textField", name: "item_amount_1", x: 485, y: 315, width: 60, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Amount" },

            { id: 13, type: "textField", name: "item_desc_2", x: 50, y: 350, width: 295, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Item 2 Description" },
            { id: 14, type: "textField", name: "item_qty_2", x: 355, y: 350, width: 55, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Qty" },
            { id: 15, type: "textField", name: "item_price_2", x: 420, y: 350, width: 55, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Price" },
            { id: 16, type: "textField", name: "item_amount_2", x: 485, y: 350, width: 60, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Amount" },

            // Totals Grid below Table Box
            { id: 17, type: "textField", name: "subtotal_amount", x: 425, y: 435, width: 125, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Subtotal" },
            { id: 18, type: "textField", name: "tax_amount", x: 425, y: 468, width: 125, height: 24, borderStyle: "solid", fillStyle: "white", tooltip: "Tax" },
            { id: 19, type: "textField", name: "balance_due", x: 425, y: 504, width: 125, height: 28, borderStyle: "solid", fillStyle: "yellow", tooltip: "Balance Due" },
            
            // Notes Box
            { id: 20, type: "textField", name: "invoice_notes", x: 45, y: 575, width: 505, height: 75, multiline: true, borderStyle: "solid", fillStyle: "white", tooltip: "Notes & Terms" }
        ]
    }
};

export async function createTemplatePdf(key) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const dark = rgb(0.09, 0.13, 0.20);
    const gray = rgb(0.40, 0.45, 0.52);
    const lineGray = rgb(0.80, 0.83, 0.88);

    if (key === "w9") {
        page.drawText("Form W-9", { x: 45, y: height - 48, size: 20, font: fontBold, color: dark });
        page.drawText("(Rev. March 2026)", { x: 155, y: height - 46, size: 9, font: fontRegular, color: gray });
        page.drawText("Request for Taxpayer Identification Number and Certification", { x: 45, y: height - 68, size: 11.5, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("1. Name (as shown on your income tax return)", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("2. Business name/disregarded entity name, if different from above", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("3. Check appropriate box for federal tax classification (select from dropdown)", { x: 45, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("4. Address (number, street, and apt. or suite no.)", { x: 45, y: height - 245, size: 8.5, font: fontBold, color: dark });
        page.drawText("5. City, state, and ZIP code", { x: 45, y: height - 295, size: 8.5, font: fontBold, color: dark });

        page.drawLine({ start: { x: 45, y: height - 345 }, end: { x: 550, y: height - 345 }, thickness: 1, color: lineGray });
        page.drawText("Part I: Taxpayer Identification Number (TIN)", { x: 45, y: height - 365, size: 10.5, font: fontBold, color: dark });
        page.drawText("Enter your TIN in the box below (Social Security Number or Employer ID Number):", { x: 45, y: height - 380, size: 8.5, font: fontRegular, color: gray });

        page.drawLine({ start: { x: 45, y: height - 435 }, end: { x: 550, y: height - 435 }, thickness: 1, color: lineGray });
        page.drawText("Part II: Certification & Execution", { x: 45, y: height - 455, size: 10.5, font: fontBold, color: dark });
        page.drawText("Under penalties of perjury, I certify that the number shown on this form is my correct TIN.", { x: 45, y: height - 470, size: 8, font: fontOblique, color: gray });
        page.drawText("Sign Here: Taxpayer Digital Signature", { x: 45, y: height - 495, size: 8.5, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 325, y: height - 495, size: 8.5, font: fontBold, color: dark });

    } else if (key === "nda") {
        page.drawText("MUTUAL NON-DISCLOSURE AGREEMENT", { x: 45, y: height - 48, size: 16, font: fontBold, color: dark });
        page.drawText("Standard Bilateral Confidentiality & Proprietary Information Protection Agreement", { x: 45, y: height - 66, size: 9, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("Disclosing Party Legal Name", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Receiving Party Legal Name", { x: 310, y: height - 95, size: 8.5, font: fontBold, color: dark });

        page.drawText("Effective Date of Agreement", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Governing Jurisdiction & Law", { x: 310, y: height - 145, size: 8.5, font: fontBold, color: dark });

        page.drawText("Confidentiality Scope & Trade Secrets:", { x: 45, y: height - 198, size: 9.5, font: fontBold, color: dark });
        page.drawText("Agreement covers proprietary technical data, trade secrets, business models, and customer records.", { x: 75, y: height - 228, size: 8.5, font: fontRegular, color: gray });

        page.drawLine({ start: { x: 45, y: height - 260 }, end: { x: 550, y: height - 260 }, thickness: 1, color: lineGray });
        page.drawText("Authorized Signatures & Execution", { x: 45, y: height - 280, size: 10.5, font: fontBold, color: dark });
        page.drawText("Disclosing Representative Title", { x: 45, y: height - 300, size: 8.5, font: fontRegular, color: dark });
        page.drawText("Recipient Representative Title", { x: 310, y: height - 300, size: 8.5, font: fontRegular, color: dark });
        page.drawText("Discloser Digital Signature:", { x: 45, y: height - 348, size: 8.5, font: fontBold, color: dark });
        page.drawText("Recipient Digital Signature:", { x: 310, y: height - 348, size: 8.5, font: fontBold, color: dark });

    } else if (key === "intake") {
        // Main Title Header
        page.drawText("PATIENT INTAKE & HIPAA CONSENT FORM", { x: 45, y: height - 44, size: 15, font: fontBold, color: dark });
        page.drawText("Confidential Patient Medical Registration • HIPAA Notice of Privacy Practices & Consent", { x: 45, y: height - 58, size: 8.5, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 66 }, end: { x: 550, y: height - 66 }, thickness: 1.5, color: dark });

        // Section 1: Demographics
        page.drawText("1. Patient Demographics & Contact Information", { x: 45, y: height - 84, size: 9.5, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 88 }, end: { x: 550, y: height - 88 }, thickness: 0.75, color: lineGray });

        page.drawText("Patient Full Legal Name (First, Middle, Last)", { x: 45, y: height - 104, size: 8, font: fontBold, color: dark });
        page.drawText("Date of Birth (MM/DD/YYYY)", { x: 385, y: height - 104, size: 8, font: fontBold, color: dark });

        page.drawText("Primary Phone Number", { x: 45, y: height - 149, size: 8, font: fontBold, color: dark });
        page.drawText("Email Address", { x: 310, y: height - 149, size: 8, font: fontBold, color: dark });

        page.drawText("Residential Address (Street, City, State, ZIP)", { x: 45, y: height - 194, size: 8, font: fontBold, color: dark });
        page.drawText("Gender / Identity", { x: 385, y: height - 194, size: 8, font: fontBold, color: dark });

        page.drawText("Emergency Contact Name & Relationship", { x: 45, y: height - 239, size: 8, font: fontBold, color: dark });
        page.drawText("Emergency Contact Phone", { x: 310, y: height - 239, size: 8, font: fontBold, color: dark });

        // Section 2: Medical History & Insurance
        page.drawText("2. Medical History & Insurance Coverage", { x: 45, y: height - 284, size: 9.5, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 288 }, end: { x: 550, y: height - 288 }, thickness: 0.75, color: lineGray });

        page.drawText("Primary Care Physician / Clinic", { x: 45, y: height - 304, size: 8, font: fontBold, color: dark });
        page.drawText("Known Drug / Environmental Allergies", { x: 310, y: height - 304, size: 8, font: fontBold, color: dark });

        page.drawText("Current Medications & Dosages", { x: 45, y: height - 349, size: 8, font: fontBold, color: dark });
        page.drawText("Pre-existing Medical Conditions / Chronic Illnesses / Notes", { x: 45, y: height - 394, size: 8, font: fontBold, color: dark });

        page.drawText("Insurance Provider / Plan Name", { x: 45, y: height - 452, size: 8, font: fontBold, color: dark });
        page.drawText("Policy / Member ID #", { x: 310, y: height - 452, size: 8, font: fontBold, color: dark });
        page.drawText("Group #", { x: 465, y: height - 452, size: 8, font: fontBold, color: dark });

        // Section 3: HIPAA & Consent
        page.drawText("3. HIPAA Privacy Authorization & Consent to Treatment", { x: 45, y: height - 498, size: 9.5, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 502 }, end: { x: 550, y: height - 502 }, thickness: 0.75, color: lineGray });

        page.drawText("HIPAA Notice of Privacy Practices: I acknowledge receipt of the Privacy Notice and authorize", { x: 70, y: height - 522, size: 7.5, font: fontRegular, color: dark });
        page.drawText("the confidential use and disclosure of my protected health information (PHI) for medical care and billing.", { x: 70, y: height - 533, size: 7.5, font: fontRegular, color: gray });

        page.drawText("Informed Treatment Consent: I voluntarily consent to outpatient examination, diagnostic procedures,", { x: 70, y: height - 558, size: 7.5, font: fontRegular, color: dark });
        page.drawText("and medical treatment as deemed necessary by attending healthcare clinical professionals.", { x: 70, y: height - 569, size: 7.5, font: fontRegular, color: gray });

        // Section 4: Signature & Authorization
        page.drawText("4. Authorization & Signatures", { x: 45, y: height - 596, size: 9.5, font: fontBold, color: dark });
        page.drawLine({ start: { x: 45, y: height - 600 }, end: { x: 550, y: height - 600 }, thickness: 0.75, color: lineGray });

        page.drawText("Patient / Legal Guardian Digital Signature", { x: 45, y: height - 616, size: 8, font: fontBold, color: dark });
        page.drawText("Signer Relationship to Patient", { x: 310, y: height - 616, size: 8, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 310, y: height - 660, size: 8, font: fontBold, color: dark });

        // Footer Notice
        page.drawLine({ start: { x: 45, y: 46 }, end: { x: 550, y: 46 }, thickness: 0.75, color: lineGray });
        page.drawText("CONFIDENTIAL HEALTHCARE RECORD • HIPAA COMPLIANT PATIENT ONBOARDING • ZERO CLOUD STORAGE", { x: 45, y: 34, size: 7, font: fontBold, color: gray });

    } else if (key === "job") {
        page.drawText("EMPLOYMENT APPLICATION FORM", { x: 45, y: height - 48, size: 16, font: fontBold, color: dark });
        page.drawText("Equal Opportunity Employer • Candidate Screening & Application", { x: 45, y: height - 66, size: 9, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("Candidate Full Legal Name", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Position Applied For", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Available Start Date", { x: 310, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Desired Employment Type", { x: 45, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Expected Annual / Hourly Salary", { x: 310, y: height - 195, size: 8.5, font: fontBold, color: dark });

        page.drawText("I certify that I am legally authorized to work in the country without sponsorship.", { x: 75, y: height - 262, size: 8.5, font: fontRegular, color: gray });

        page.drawLine({ start: { x: 45, y: height - 305 }, end: { x: 550, y: height - 305 }, thickness: 1, color: lineGray });
        page.drawText("Applicant Digital Signature", { x: 45, y: height - 325, size: 8.5, font: fontBold, color: dark });
        page.drawText("Date Submitted", { x: 325, y: height - 325, size: 8.5, font: fontBold, color: dark });

    } else if (key === "lease") {
        page.drawText("RESIDENTIAL LEASE AGREEMENT", { x: 45, y: height - 48, size: 16, font: fontBold, color: dark });
        page.drawText("Standard Property Rental Terms, Rent Schedule & Security Deposit Agreement", { x: 45, y: height - 66, size: 9, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("Landlord / Lessor Legal Name", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Tenant / Lessee Legal Name", { x: 310, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Leased Premises / Property Address & Unit Number", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Monthly Rent Amount ($ USD)", { x: 45, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Security Deposit Amount ($ USD)", { x: 310, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Lease Commencement Date", { x: 45, y: height - 245, size: 8.5, font: fontBold, color: dark });
        page.drawText("Lease Expiration Date", { x: 310, y: height - 245, size: 8.5, font: fontBold, color: dark });

        page.drawLine({ start: { x: 45, y: height - 335 }, end: { x: 550, y: height - 335 }, thickness: 1, color: lineGray });
        page.drawText("Landlord Digital Signature", { x: 45, y: height - 355, size: 8.5, font: fontBold, color: dark });
        page.drawText("Tenant Digital Signature", { x: 310, y: height - 355, size: 8.5, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 45, y: height - 435, size: 8.5, font: fontBold, color: dark });

    } else if (key === "rental") {
        page.drawText("TENANT RENTAL APPLICATION", { x: 45, y: height - 48, size: 16, font: fontBold, color: dark });
        page.drawText("Property Management Screening & Credit Check Authorization", { x: 45, y: height - 66, size: 9, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("Applicant Full Legal Name", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Current Street Address, City, State, ZIP", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Phone Number", { x: 45, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Email Address", { x: 310, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Employer / Company Name", { x: 45, y: height - 245, size: 8.5, font: fontBold, color: dark });
        page.drawText("Monthly Gross Income ($ USD)", { x: 310, y: height - 245, size: 8.5, font: fontBold, color: dark });
        page.drawText("Emergency Contact Name & Phone", { x: 45, y: height - 295, size: 8.5, font: fontBold, color: dark });
        page.drawText("Desired Move-In Date", { x: 310, y: height - 295, size: 8.5, font: fontBold, color: dark });

        page.drawText("I authorize background screening, credit check, and landlord reference verification.", { x: 75, y: height - 362, size: 8.5, font: fontRegular, color: gray });

        page.drawLine({ start: { x: 45, y: height - 400 }, end: { x: 550, y: height - 400 }, thickness: 1, color: lineGray });
        page.drawText("Applicant Signature of Authorization", { x: 45, y: height - 420, size: 8.5, font: fontBold, color: dark });
        page.drawText("Application Date", { x: 325, y: height - 420, size: 8.5, font: fontBold, color: dark });

    } else if (key === "invoice") {
        page.drawText("INVOICE", { x: 420, y: height - 55, size: 26, font: fontBold, color: dark });
        page.drawText("DATE:", { x: 350, y: height - 71, size: 9, font: fontBold, color: dark });
        page.drawText("INVOICE #:", { x: 345, y: height - 104, size: 9, font: fontBold, color: dark });

        page.drawText("FROM:", { x: 45, y: height - 125, size: 9, font: fontBold, color: dark });
        page.drawText("TO:", { x: 310, y: height - 125, size: 9, font: fontBold, color: dark });

        page.drawText("TERMS:", { x: 45, y: height - 215, size: 9, font: fontBold, color: dark });
        page.drawText("DUE DATE:", { x: 310, y: height - 215, size: 9, font: fontBold, color: dark });

        // Itemized Table Box Grid (Top: y = height - 280, Bottom: y = height - 410, Height: 130px)
        page.drawRectangle({ x: 45, y: height - 410, width: 505, height: 130, borderColor: dark, borderWidth: 1.2 });
        // Header Row Line (y = height - 305)
        page.drawLine({ start: { x: 45, y: height - 305 }, end: { x: 550, y: height - 305 }, thickness: 1, color: dark });
        // Column Vertical Dividers
        page.drawLine({ start: { x: 350, y: height - 410 }, end: { x: 350, y: height - 280 }, thickness: 1, color: dark });
        page.drawLine({ start: { x: 415, y: height - 410 }, end: { x: 415, y: height - 280 }, thickness: 1, color: dark });
        page.drawLine({ start: { x: 480, y: height - 410 }, end: { x: 480, y: height - 280 }, thickness: 1, color: dark });

        page.drawText("Item Description", { x: 135, y: height - 298, size: 10, font: fontBold, color: dark });
        page.drawText("Qty", { x: 370, y: height - 298, size: 10, font: fontBold, color: dark });
        page.drawText("Price", { x: 435, y: height - 298, size: 10, font: fontBold, color: dark });
        page.drawText("Amount", { x: 495, y: height - 298, size: 10, font: fontBold, color: dark });

        // Totals Grid (Cleanly placed below the Table Box)
        page.drawText("Subtotal:", { x: 360, y: height - 451, size: 9, font: fontBold, color: dark });
        page.drawText("Tax:", { x: 385, y: height - 484, size: 9, font: fontBold, color: dark });
        page.drawText("BALANCE DUE:", { x: 310, y: height - 521, size: 11.5, font: fontBold, color: dark });

        // Notes Box (Cleanly placed below the Totals Grid)
        page.drawText("Notes & Special Considerations", { x: 45, y: height - 565, size: 11, font: fontBold, color: dark });
    }

    return await doc.save();
}
