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
        title: "Client Registration & Service Intake Form",
        description: "Fast customer onboarding form with autofill-friendly contact inputs.",
        fields: [
            { id: 1, type: "textField", name: "first_name", x: 45, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", autofill: "first_name" },
            { id: 2, type: "textField", name: "last_name", x: 310, y: 105, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", autofill: "last_name" },
            { id: 3, type: "textField", name: "email", x: 45, y: 155, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", autofill: "email" },
            { id: 4, type: "textField", name: "phone", x: 310, y: 155, width: 240, height: 28, borderStyle: "solid", fillStyle: "white", autofill: "phone" },
            { id: 5, type: "dropdown", name: "service_package", x: 45, y: 205, width: 505, height: 28, options: ["Standard Consulting", "Enterprise Agreement", "Design Sprint", "Custom SLA"], borderStyle: "solid", fillStyle: "tint" },
            { id: 6, type: "textField", name: "project_notes", x: 45, y: 255, width: 505, height: 60, multiline: true, borderStyle: "solid", fillStyle: "white" },
            { id: 7, type: "signature", name: "client_signature", x: 45, y: 365, width: 260, height: 55, borderStyle: "none", fillStyle: "tint" },
            { id: 8, type: "dateField", name: "date_signed", x: 325, y: 378, width: 225, height: 30, borderStyle: "solid", fillStyle: "white" }
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
            { id: 9, type: "textField", name: "item_desc_1", x: 50, y: 310, width: 320, height: 24, borderStyle: "solid", fillStyle: "white" },
            { id: 10, type: "textField", name: "item_qty_1", x: 380, y: 310, width: 70, height: 24, borderStyle: "solid", fillStyle: "white" },
            { id: 11, type: "textField", name: "item_price_1", x: 460, y: 310, width: 85, height: 24, borderStyle: "solid", fillStyle: "white" },
            { id: 12, type: "textField", name: "subtotal_amount", x: 410, y: 415, width: 135, height: 24, borderStyle: "solid", fillStyle: "white" },
            { id: 13, type: "textField", name: "tax_amount", x: 410, y: 445, width: 135, height: 24, borderStyle: "solid", fillStyle: "white" },
            { id: 14, type: "textField", name: "balance_due", x: 410, y: 480, width: 135, height: 28, borderStyle: "solid", fillStyle: "yellow" },
            { id: 15, type: "textField", name: "invoice_notes", x: 45, y: 550, width: 505, height: 75, multiline: true, borderStyle: "solid", fillStyle: "white" }
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
        page.drawText("CLIENT INTAKE & REGISTRATION FORM", { x: 45, y: height - 48, size: 16, font: fontBold, color: dark });
        page.drawText("Please complete all contact details and select your requested consulting service package.", { x: 45, y: height - 66, size: 9, font: fontRegular, color: gray });
        page.drawLine({ start: { x: 45, y: height - 76 }, end: { x: 550, y: height - 76 }, thickness: 1.5, color: dark });

        page.drawText("First Name", { x: 45, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Last Name", { x: 310, y: height - 95, size: 8.5, font: fontBold, color: dark });
        page.drawText("Email Address", { x: 45, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Phone Number", { x: 310, y: height - 145, size: 8.5, font: fontBold, color: dark });
        page.drawText("Requested Service Package", { x: 45, y: height - 195, size: 8.5, font: fontBold, color: dark });
        page.drawText("Project Requirements & Special Notes", { x: 45, y: height - 245, size: 8.5, font: fontBold, color: dark });

        page.drawLine({ start: { x: 45, y: height - 335 }, end: { x: 550, y: height - 335 }, thickness: 1, color: lineGray });
        page.drawText("Client Signature of Authorization", { x: 45, y: height - 355, size: 8.5, font: fontBold, color: dark });
        page.drawText("Date Signed", { x: 325, y: height - 355, size: 8.5, font: fontBold, color: dark });

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
        page.drawText("DATE:", { x: 350, y: height - 73, size: 9, font: fontBold, color: dark });
        page.drawText("INVOICE #:", { x: 345, y: height - 105, size: 9, font: fontBold, color: dark });

        page.drawText("FROM:", { x: 45, y: height - 125, size: 9, font: fontBold, color: dark });
        page.drawText("TO:", { x: 310, y: height - 125, size: 9, font: fontBold, color: dark });

        page.drawText("TERMS:", { x: 45, y: height - 215, size: 9, font: fontBold, color: dark });
        page.drawText("DUE DATE:", { x: 310, y: height - 215, size: 9, font: fontBold, color: dark });

        // Itemized Table Box Grid
        page.drawRectangle({ x: 45, y: height - 440, width: 505, height: 160, borderColor: dark, borderWidth: 1.2 });
        page.drawLine({ start: { x: 45, y: height - 305 }, end: { x: 550, y: height - 305 }, thickness: 1, color: dark });
        page.drawLine({ start: { x: 375, y: height - 440 }, end: { x: 375, y: height - 280 }, thickness: 1, color: dark });
        page.drawLine({ start: { x: 455, y: height - 440 }, end: { x: 455, y: height - 280 }, thickness: 1, color: dark });

        page.drawText("Item Description", { x: 120, y: height - 298, size: 10, font: fontBold, color: dark });
        page.drawText("Qty", { x: 390, y: height - 298, size: 10, font: fontBold, color: dark });
        page.drawText("Price / Amount", { x: 468, y: height - 298, size: 10, font: fontBold, color: dark });

        // Totals Grid
        page.drawText("Subtotal:", { x: 345, y: height - 430, size: 9, font: fontBold, color: dark });
        page.drawText("Tax:", { x: 370, y: height - 460, size: 9, font: fontBold, color: dark });
        page.drawText("BALANCE DUE:", { x: 310, y: height - 498, size: 12, font: fontBold, color: dark });

        // Notes Box
        page.drawText("Notes & Special Considerations", { x: 45, y: height - 535, size: 12, font: fontBold, color: dark });
    }

    return await doc.save();
}
