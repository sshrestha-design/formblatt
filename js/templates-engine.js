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
        description: "Professional commercial billing invoice with seller/buyer details, itemized line items, calculations, and signature authorization.",
        fields: [
            // Meta Header
            { id: 1, type: "textField", name: "invoice_number", x: 420, y: 35, width: 130, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Invoice Number (e.g. INV-2026-001)" },
            { id: 2, type: "dateField", name: "invoice_date", x: 420, y: 60, width: 130, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Invoice Date" },
            { id: 3, type: "dateField", name: "due_date", x: 420, y: 85, width: 130, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Payment Due Date" },
            { id: 4, type: "textField", name: "po_number", x: 420, y: 110, width: 130, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "P.O. / Reference Number" },

            // Billed By (Seller)
            { id: 5, type: "textField", name: "seller_company_name", x: 45, y: 160, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Seller Business Name" },
            { id: 6, type: "textField", name: "seller_address", x: 45, y: 188, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Seller Address, City, State, ZIP" },
            { id: 7, type: "textField", name: "seller_tax_id", x: 45, y: 216, width: 240, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Seller Tax ID / EIN / VAT #" },

            // Billed To (Client)
            { id: 8, type: "textField", name: "client_company_name", x: 300, y: 160, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Client Company / Individual Name", autofill: "name" },
            { id: 9, type: "textField", name: "client_address", x: 300, y: 188, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Client Address, City, State, ZIP", autofill: "address1" },
            { id: 10, type: "textField", name: "client_email_phone", x: 300, y: 216, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Client Email & Phone", autofill: "email" },

            // Terms & Currency
            { id: 11, type: "dropdown", name: "payment_terms", x: 135, y: 246, width: 150, height: 22, options: ["Due on Receipt", "Net 15", "Net 30", "Net 60", "Due End of Month"], borderStyle: "solid", fillStyle: "tint", tooltip: "Payment Terms" },
            { id: 12, type: "dropdown", name: "currency_code", x: 360, y: 246, width: 190, height: 22, options: ["USD ($)", "EUR (€)", "GBP (£)", "CAD ($)", "AUD ($)", "JPY (¥)"], borderStyle: "solid", fillStyle: "tint", tooltip: "Billing Currency" },

            // Itemized Line Items (4 Rows)
            { id: 13, type: "textField", name: "item_desc_1", x: 48, y: 312, width: 278, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Item 1 Description" },
            { id: 14, type: "textField", name: "item_qty_1", x: 333, y: 312, width: 54, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Qty 1" },
            { id: 15, type: "textField", name: "item_price_1", x: 393, y: 312, width: 69, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Price 1" },
            { id: 16, type: "textField", name: "item_amount_1", x: 468, y: 312, width: 78, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Amount 1" },

            { id: 17, type: "textField", name: "item_desc_2", x: 48, y: 347, width: 278, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Item 2 Description" },
            { id: 18, type: "textField", name: "item_qty_2", x: 333, y: 347, width: 54, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Qty 2" },
            { id: 19, type: "textField", name: "item_price_2", x: 393, y: 347, width: 69, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Price 2" },
            { id: 20, type: "textField", name: "item_amount_2", x: 468, y: 347, width: 78, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Amount 2" },

            { id: 21, type: "textField", name: "item_desc_3", x: 48, y: 382, width: 278, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Item 3 Description" },
            { id: 22, type: "textField", name: "item_qty_3", x: 333, y: 382, width: 54, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Qty 3" },
            { id: 23, type: "textField", name: "item_price_3", x: 393, y: 382, width: 69, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Price 3" },
            { id: 24, type: "textField", name: "item_amount_3", x: 468, y: 382, width: 78, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Amount 3" },

            { id: 25, type: "textField", name: "item_desc_4", x: 48, y: 417, width: 278, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Item 4 Description" },
            { id: 26, type: "textField", name: "item_qty_4", x: 333, y: 417, width: 54, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Qty 4" },
            { id: 27, type: "textField", name: "item_price_4", x: 393, y: 417, width: 69, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Price 4" },
            { id: 28, type: "textField", name: "item_amount_4", x: 468, y: 417, width: 78, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Amount 4" },

            // Notes & Payment Instructions (Left Bottom)
            { id: 29, type: "textField", name: "payment_instructions", x: 45, y: 476, width: 270, height: 50, multiline: true, borderStyle: "solid", fillStyle: "white", tooltip: "Bank Wire / Payment Instructions" },
            { id: 30, type: "textField", name: "invoice_notes", x: 45, y: 544, width: 270, height: 45, multiline: true, borderStyle: "solid", fillStyle: "white", tooltip: "Terms & Customer Notes" },

            // Totals Breakdown (Right Bottom)
            { id: 31, type: "textField", name: "subtotal_amount", x: 435, y: 460, width: 115, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Subtotal Amount" },
            { id: 32, type: "textField", name: "discount_amount", x: 435, y: 486, width: 115, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Discount / Credits" },
            { id: 33, type: "textField", name: "tax_amount", x: 435, y: 512, width: 115, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Sales Tax / VAT" },
            { id: 34, type: "textField", name: "shipping_handling", x: 435, y: 538, width: 115, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Shipping & Handling" },
            { id: 35, type: "textField", name: "balance_due", x: 435, y: 566, width: 115, height: 26, borderStyle: "solid", fillStyle: "yellow", tooltip: "TOTAL BALANCE DUE" },

            // Authorization & Signature
            { id: 36, type: "signature", name: "client_signature", x: 45, y: 632, width: 240, height: 48, borderStyle: "none", fillStyle: "tint", tooltip: "Customer / Authorized Representative Signature" },
            { id: 37, type: "textField", name: "signer_name_title", x: 300, y: 632, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Signer Full Name & Title" },
            { id: 38, type: "dateField", name: "signed_date", x: 300, y: 668, width: 250, height: 22, borderStyle: "solid", fillStyle: "white", tooltip: "Date Signed" }
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
        // Main Header
        page.drawText("COMMERCIAL INVOICE", { x: 45, y: height - 46, size: 17, font: fontBold, color: dark });
        page.drawText("Original Commercial Billing & Tax Summary Document", { x: 45, y: height - 60, size: 8.5, font: fontRegular, color: gray });

        // Meta Header Labels
        page.drawText("INVOICE #:", { x: 350, y: height - 48, size: 8, font: fontBold, color: dark });
        page.drawText("INVOICE DATE:", { x: 350, y: height - 73, size: 8, font: fontBold, color: dark });
        page.drawText("DUE DATE:", { x: 350, y: height - 98, size: 8, font: fontBold, color: dark });
        page.drawText("P.O. / REF #:", { x: 350, y: height - 123, size: 8, font: fontBold, color: dark });

        page.drawLine({ start: { x: 45, y: height - 138 }, end: { x: 550, y: height - 138 }, thickness: 1.2, color: dark });

        // Section 1: Bill From & Bill To
        page.drawText("BILLED BY (SELLER / VENDOR)", { x: 45, y: height - 152, size: 8.5, font: fontBold, color: dark });
        page.drawText("BILLED TO (CLIENT / BUYER)", { x: 300, y: height - 152, size: 8.5, font: fontBold, color: dark });

        // Section 2: Terms & Currency Bar
        page.drawText("Payment Terms:", { x: 45, y: height - 258, size: 8.5, font: fontBold, color: dark });
        page.drawText("Billing Currency:", { x: 275, y: height - 258, size: 8.5, font: fontBold, color: dark });

        // Section 3: Itemized Table Box Grid
        page.drawRectangle({ x: 45, y: height - 445, width: 505, height: 160, borderColor: dark, borderWidth: 1 });
        // Header Row line
        page.drawLine({ start: { x: 45, y: height - 308 }, end: { x: 550, y: height - 308 }, thickness: 1, color: dark });
        // Column Vertical Dividers
        page.drawLine({ start: { x: 330, y: height - 445 }, end: { x: 330, y: height - 285 }, thickness: 0.75, color: dark });
        page.drawLine({ start: { x: 390, y: height - 445 }, end: { x: 390, y: height - 285 }, thickness: 0.75, color: dark });
        page.drawLine({ start: { x: 465, y: height - 445 }, end: { x: 465, y: height - 285 }, thickness: 0.75, color: dark });

        // Row Separators
        page.drawLine({ start: { x: 45, y: height - 340 }, end: { x: 550, y: height - 340 }, thickness: 0.5, color: lineGray });
        page.drawLine({ start: { x: 45, y: height - 375 }, end: { x: 550, y: height - 375 }, thickness: 0.5, color: lineGray });
        page.drawLine({ start: { x: 45, y: height - 410 }, end: { x: 550, y: height - 410 }, thickness: 0.5, color: lineGray });

        page.drawText("Item / Service Description", { x: 55, y: height - 300, size: 9, font: fontBold, color: dark });
        page.drawText("Qty / Hrs", { x: 342, y: height - 300, size: 9, font: fontBold, color: dark });
        page.drawText("Unit Price", { x: 405, y: height - 300, size: 9, font: fontBold, color: dark });
        page.drawText("Total Amount", { x: 480, y: height - 300, size: 9, font: fontBold, color: dark });

        // Section 4: Left Notes & Payment Info
        page.drawText("PAYMENT INSTRUCTIONS & BANK DETAILS:", { x: 45, y: height - 468, size: 7.5, font: fontBold, color: dark });
        page.drawText("TERMS & CONDITIONS / NOTES:", { x: 45, y: height - 536, size: 7.5, font: fontBold, color: dark });

        // Section 4: Right Totals Breakdown
        page.drawText("Subtotal:", { x: 375, y: height - 472, size: 8.5, font: fontBold, color: dark });
        page.drawText("Discount / Credits:", { x: 335, y: height - 498, size: 8.5, font: fontBold, color: dark });
        page.drawText("Sales Tax / VAT:", { x: 346, y: height - 524, size: 8.5, font: fontBold, color: dark });
        page.drawText("Shipping / Freight:", { x: 335, y: height - 550, size: 8.5, font: fontBold, color: dark });
        page.drawText("BALANCE DUE:", { x: 345, y: height - 580, size: 10, font: fontBold, color: dark });

        // Section 5: Signature Authorization
        page.drawLine({ start: { x: 45, y: height - 612 }, end: { x: 550, y: height - 612 }, thickness: 0.75, color: lineGray });
        page.drawText("Client / Authorized Representative Signature", { x: 45, y: height - 624, size: 8, font: fontBold, color: dark });
        page.drawText("Signer Full Name & Title", { x: 300, y: height - 624, size: 8, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 300, y: height - 660, size: 8, font: fontBold, color: dark });

        // Footer Notice
        page.drawLine({ start: { x: 45, y: 46 }, end: { x: 550, y: 46 }, thickness: 0.75, color: lineGray });
        page.drawText("THANK YOU FOR YOUR BUSINESS • COMMERCIAL INVOICE GENERATED VIA JUSTFORMS • ZERO CLOUD STORAGE", { x: 45, y: 34, size: 6.8, font: fontBold, color: gray });
    }

    return await doc.save();
}
