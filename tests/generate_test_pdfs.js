// ── Test PDF Generator for Form Detection Benchmarking ──────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PDFLib from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.resolve(__dirname, 'samples');

if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
        _data: {},
        getItem(k) { return this._data[k] ?? null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; },
        clear() { this._data = {}; }
    };
}
if (typeof globalThis.window === 'undefined') {
    globalThis.window = { PDFLib, localStorage: globalThis.localStorage, location: { hash: "" } };
}

const { PDFDocument, StandardFonts, rgb } = PDFLib;

// Helper: draw an underline
function drawUnderline(page, x, y, width, color) {
    page.drawLine({
        start: { x, y },
        end: { x: x + width, y },
        thickness: 0.8,
        color: color || rgb(0.2, 0.2, 0.2)
    });
}

// Helper: draw an outline box
function drawBox(page, x, y, width, height, strokeColor, fillColor) {
    page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: strokeColor || rgb(0.3, 0.35, 0.4),
        borderWidth: 1,
        color: fillColor || rgb(0.98, 0.98, 1)
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Employee Onboarding & Direct Deposit Form
// ─────────────────────────────────────────────────────────────────────────────
export async function generateEmployeeOnboardingPdf() {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const dark = rgb(0.1, 0.15, 0.25);
    const gray = rgb(0.4, 0.45, 0.5);
    const lightLine = rgb(0.75, 0.8, 0.85);

    // Title
    page.drawText("EMPLOYEE ONBOARDING & DIRECT DEPOSIT ENROLLMENT", { x: 45, y: height - 45, size: 14, font: fontBold, color: dark });
    page.drawText("Confidential Human Resources & Payroll Records", { x: 45, y: height - 60, size: 9, font: fontRegular, color: gray });
    page.drawLine({ start: { x: 45, y: height - 68 }, end: { x: 550, y: height - 68 }, thickness: 1.5, color: dark });

    // Section 1: Personal Details
    page.drawText("1. Personal & Contact Information", { x: 45, y: height - 88, size: 10.5, font: fontBold, color: dark });

    // Full Name
    page.drawText("Full Legal Name:", { x: 45, y: height - 110, size: 9, font: fontBold, color: dark });
    drawBox(page, 140, height - 118, 220, 22, lightLine, rgb(1, 1, 1));

    // DOB
    page.drawText("Date of Birth:", { x: 375, y: height - 110, size: 9, font: fontBold, color: dark });
    drawBox(page, 445, height - 118, 105, 22, lightLine, rgb(1, 1, 1));

    // SSN
    page.drawText("Social Security #:", { x: 45, y: height - 145, size: 9, font: fontBold, color: dark });
    drawBox(page, 140, height - 153, 140, 22, lightLine, rgb(1, 1, 1));

    // Phone
    page.drawText("Phone Number:", { x: 295, y: height - 145, size: 9, font: fontBold, color: dark });
    drawBox(page, 375, height - 153, 175, 22, lightLine, rgb(1, 1, 1));

    // Email
    page.drawText("Email Address:", { x: 45, y: height - 180, size: 9, font: fontBold, color: dark });
    drawBox(page, 140, height - 188, 220, 22, lightLine, rgb(1, 1, 1));

    // Job Title
    page.drawText("Job Title:", { x: 375, y: height - 180, size: 9, font: fontBold, color: dark });
    drawBox(page, 425, height - 188, 125, 22, lightLine, rgb(1, 1, 1));

    // Street Address Underline Style
    page.drawText("Home Street Address:", { x: 45, y: height - 215, size: 9, font: fontBold, color: dark });
    drawUnderline(page, 155, height - 217, 395, lightLine);

    // City, State, Zip
    page.drawText("City:", { x: 45, y: height - 245, size: 9, font: fontBold, color: dark });
    drawUnderline(page, 75, height - 247, 160, lightLine);

    page.drawText("State:", { x: 250, y: height - 245, size: 9, font: fontBold, color: dark });
    drawUnderline(page, 285, height - 247, 85, lightLine);

    page.drawText("ZIP Code:", { x: 385, y: height - 245, size: 9, font: fontBold, color: dark });
    drawUnderline(page, 440, height - 247, 110, lightLine);

    // Section 2: Direct Deposit
    page.drawLine({ start: { x: 45, y: height - 270 }, end: { x: 550, y: height - 270 }, thickness: 1, color: lightLine });
    page.drawText("2. Direct Deposit Bank Information", { x: 45, y: height - 290, size: 10.5, font: fontBold, color: dark });

    page.drawText("Bank Name:", { x: 45, y: height - 315, size: 9, font: fontBold, color: dark });
    drawBox(page, 140, height - 323, 220, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Account Type:", { x: 375, y: height - 315, size: 9, font: fontBold, color: dark });
    drawBox(page, 445, height - 320, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("Checking", { x: 465, y: height - 316, size: 8.5, font: fontRegular, color: dark });

    drawBox(page, 510, height - 320, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("Savings", { x: 528, y: height - 316, size: 8.5, font: fontRegular, color: dark });

    page.drawText("Routing Number (9 Digits):", { x: 45, y: height - 350, size: 9, font: fontBold, color: dark });
    drawBox(page, 175, height - 358, 150, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Account Number:", { x: 340, y: height - 350, size: 9, font: fontBold, color: dark });
    drawBox(page, 425, height - 358, 125, 22, lightLine, rgb(1, 1, 1));

    // Section 3: Tax Withholding & Status
    page.drawLine({ start: { x: 45, y: height - 380 }, end: { x: 550, y: height - 380 }, thickness: 1, color: lightLine });
    page.drawText("3. Marital Status & Elections", { x: 45, y: height - 400, size: 10.5, font: fontBold, color: dark });

    drawBox(page, 45, height - 425, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("Single or Married filing separately", { x: 65, y: height - 421, size: 8.5, font: fontRegular, color: dark });

    drawBox(page, 240, height - 425, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("Married filing jointly", { x: 260, y: height - 421, size: 8.5, font: fontRegular, color: dark });

    drawBox(page, 400, height - 425, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("Head of Household", { x: 420, y: height - 421, size: 8.5, font: fontRegular, color: dark });

    // Section 4: Emergency Contact
    page.drawLine({ start: { x: 45, y: height - 450 }, end: { x: 550, y: height - 450 }, thickness: 1, color: lightLine });
    page.drawText("4. Emergency Contact", { x: 45, y: height - 470, size: 10.5, font: fontBold, color: dark });

    page.drawText("Emergency Contact Name:", { x: 45, y: height - 495, size: 9, font: fontBold, color: dark });
    drawBox(page, 180, height - 503, 180, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Relationship:", { x: 375, y: height - 495, size: 9, font: fontBold, color: dark });
    drawBox(page, 445, height - 503, 105, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Emergency Phone:", { x: 45, y: height - 530, size: 9, font: fontBold, color: dark });
    drawBox(page, 180, height - 538, 180, 22, lightLine, rgb(1, 1, 1));

    // Section 5: Authorization & Signature
    page.drawLine({ start: { x: 45, y: height - 560 }, end: { x: 550, y: height - 560 }, thickness: 1, color: lightLine });
    page.drawText("5. Employee Acknowledgment & Authorization", { x: 45, y: height - 580, size: 10.5, font: fontBold, color: dark });

    page.drawText("I hereby authorize the company to deposit my net earnings into the bank account indicated above.", { x: 45, y: height - 598, size: 8, font: fontOblique, color: gray });

    page.drawText("Employee Signature:", { x: 45, y: height - 635, size: 9, font: fontBold, color: dark });
    drawBox(page, 45, height - 695, 270, 50, dark, rgb(0.97, 0.98, 1));
    page.drawText("Sign inside the box", { x: 55, y: height - 685, size: 7.5, font: fontOblique, color: gray });

    page.drawText("Date Signed:", { x: 340, y: height - 635, size: 9, font: fontBold, color: dark });
    drawBox(page, 340, height - 665, 210, 24, lightLine, rgb(1, 1, 1));

    return await doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Medical Clinic Intake & Health History Form
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMedicalIntakePdf() {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const dark = rgb(0.08, 0.12, 0.2);
    const gray = rgb(0.35, 0.4, 0.48);
    const lightLine = rgb(0.75, 0.8, 0.85);

    // Title
    page.drawText("ST. JUDE COMMUNITY HEALTH CLINIC", { x: 45, y: height - 42, size: 14, font: fontBold, color: dark });
    page.drawText("New Patient Registration & Health Assessment", { x: 45, y: height - 56, size: 9, font: fontRegular, color: gray });
    page.drawLine({ start: { x: 45, y: height - 64 }, end: { x: 550, y: height - 64 }, thickness: 1.5, color: dark });

    // Patient Info
    page.drawText("Patient Name (Last, First, Middle):", { x: 45, y: height - 85, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 110, 310, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Date of Birth (MM/DD/YYYY):", { x: 370, y: height - 85, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 370, height - 110, 180, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Primary Phone:", { x: 45, y: height - 135, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 160, 180, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Email Address:", { x: 240, y: height - 135, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 240, height - 160, 190, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Gender:", { x: 445, y: height - 135, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 445, height - 160, 105, 22, lightLine, rgb(1, 1, 1));

    // Health History Checklist
    page.drawLine({ start: { x: 45, y: height - 180 }, end: { x: 550, y: height - 180 }, thickness: 1, color: lightLine });
    page.drawText("Medical History Checklist (Check all that apply):", { x: 45, y: height - 200, size: 9.5, font: fontBold, color: dark });

    const conditions = [
        ["High Blood Pressure", "Asthma / Respiratory", "Diabetes Type 1/2"],
        ["Heart Disease", "Allergies to Medications", "Arthritis / Joint Pain"],
        ["Kidney Disease", "Thyroid Disorder", "Previous Surgeries"]
    ];

    conditions.forEach((row, rIdx) => {
        const yPos = height - 225 - (rIdx * 24);
        row.forEach((cond, cIdx) => {
            const xPos = 45 + (cIdx * 170);
            drawBox(page, xPos, yPos, 14, 14, dark, rgb(1, 1, 1));
            page.drawText(cond, { x: xPos + 20, y: yPos + 3, size: 8, font: fontRegular, color: dark });
        });
    });

    // Known Allergies
    page.drawText("List Known Drug & Food Allergies:", { x: 45, y: height - 310, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 355, 505, 40, lightLine, rgb(1, 1, 1));

    // Current Medications
    page.drawText("List Current Medications & Dosages:", { x: 45, y: height - 375, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 420, 505, 40, lightLine, rgb(1, 1, 1));

    // Insurance Provider
    page.drawText("Insurance Carrier Name:", { x: 45, y: height - 445, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 470, 240, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Policy / Member ID #:", { x: 300, y: height - 445, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 300, height - 470, 150, 22, lightLine, rgb(1, 1, 1));

    page.drawText("Group #:", { x: 465, y: height - 445, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 465, height - 470, 85, 22, lightLine, rgb(1, 1, 1));

    // Consent
    page.drawLine({ start: { x: 45, y: height - 495 }, end: { x: 550, y: height - 495 }, thickness: 1, color: lightLine });
    drawBox(page, 45, height - 520, 14, 14, dark, rgb(1, 1, 1));
    page.drawText("I consent to outpatient medical evaluation and acknowledge receipt of HIPAA privacy notice.", { x: 68, y: height - 516, size: 8, font: fontRegular, color: dark });

    // Signature
    page.drawText("Patient or Guardian Signature:", { x: 45, y: height - 550, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, height - 610, 270, 50, dark, rgb(0.97, 0.98, 1));

    page.drawText("Date:", { x: 340, y: height - 550, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 340, height - 580, 210, 24, lightLine, rgb(1, 1, 1));

    return await doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Commercial Service & Product Invoice
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCommercialInvoicePdf() {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const dark = rgb(0.1, 0.15, 0.25);
    const gray = rgb(0.4, 0.45, 0.5);
    const tableHeaderBg = rgb(0.92, 0.94, 0.97);
    const lightLine = rgb(0.75, 0.8, 0.85);

    // Header
    page.drawText("INVOICE", { x: 45, y: height - 50, size: 22, font: fontBold, color: dark });
    page.drawText("Acme Consulting & Engineering Solutions LLC", { x: 45, y: height - 68, size: 9, font: fontRegular, color: gray });

    // Invoice Meta Right Box
    page.drawText("Invoice Number:", { x: 380, y: height - 42, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 460, height - 48, 90, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Invoice Date:", { x: 380, y: height - 68, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 460, height - 74, 90, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Payment Due Date:", { x: 360, y: height - 94, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 460, height - 100, 90, 20, lightLine, rgb(1, 1, 1));

    // Billed To
    page.drawLine({ start: { x: 45, y: height - 110 }, end: { x: 550, y: height - 110 }, thickness: 1.5, color: dark });
    page.drawText("Billed To (Client / Customer):", { x: 45, y: height - 128, size: 9.5, font: fontBold, color: dark });

    page.drawText("Company / Name:", { x: 45, y: height - 148, size: 8.5, font: fontRegular, color: dark });
    drawBox(page, 130, height - 154, 210, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Street Address:", { x: 45, y: height - 174, size: 8.5, font: fontRegular, color: dark });
    drawBox(page, 130, height - 180, 210, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Email Address:", { x: 360, y: height - 148, size: 8.5, font: fontRegular, color: dark });
    drawBox(page, 430, height - 154, 120, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Phone Number:", { x: 360, y: height - 174, size: 8.5, font: fontRegular, color: dark });
    drawBox(page, 430, height - 180, 120, 20, lightLine, rgb(1, 1, 1));

    // Line Items Table Header
    const tableTop = height - 215;
    page.drawRectangle({ x: 45, y: tableTop - 20, width: 505, height: 20, color: tableHeaderBg });
    page.drawText("Description", { x: 52, y: tableTop - 14, size: 8.5, font: fontBold, color: dark });
    page.drawText("Qty", { x: 335, y: tableTop - 14, size: 8.5, font: fontBold, color: dark });
    page.drawText("Unit Price ($)", { x: 395, y: tableTop - 14, size: 8.5, font: fontBold, color: dark });
    page.drawText("Amount ($)", { x: 485, y: tableTop - 14, size: 8.5, font: fontBold, color: dark });

    // 4 Item Rows
    for (let r = 0; r < 4; r++) {
        const rowY = tableTop - 45 - (r * 28);
        drawBox(page, 45, rowY, 280, 22, lightLine, rgb(1, 1, 1));
        drawBox(page, 330, rowY, 55, 22, lightLine, rgb(1, 1, 1));
        drawBox(page, 390, rowY, 75, 22, lightLine, rgb(1, 1, 1));
        drawBox(page, 470, rowY, 80, 22, lightLine, rgb(1, 1, 1));
    }

    // Totals Section
    const totalsTop = tableTop - 175;
    page.drawText("Subtotal:", { x: 400, y: totalsTop - 10, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 460, totalsTop - 16, 90, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Tax / VAT:", { x: 400, y: totalsTop - 36, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 460, totalsTop - 42, 90, 20, lightLine, rgb(1, 1, 1));

    page.drawText("Total Due:", { x: 400, y: totalsTop - 64, size: 9.5, font: fontBold, color: dark });
    drawBox(page, 460, totalsTop - 70, 90, 22, dark, rgb(0.95, 0.97, 1));

    // Comments / Notes
    page.drawText("Payment Instructions & Bank Wire Notes:", { x: 45, y: totalsTop - 10, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, totalsTop - 70, 330, 55, lightLine, rgb(1, 1, 1));

    // Sign off
    page.drawText("Authorized Representative Signature:", { x: 45, y: totalsTop - 105, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 45, totalsTop - 160, 250, 48, dark, rgb(0.97, 0.98, 1));

    page.drawText("Date:", { x: 320, y: totalsTop - 105, size: 8.5, font: fontBold, color: dark });
    drawBox(page, 320, totalsTop - 135, 230, 24, lightLine, rgb(1, 1, 1));

    return await doc.save();
}

// Generate all test PDF files to disk
export async function buildAllTestPdfs() {
    console.log("🛠️ Generating test PDF benchmarks...");
    const onboardingBytes = await generateEmployeeOnboardingPdf();
    fs.writeFileSync(path.join(SAMPLES_DIR, 'employee_onboarding.pdf'), onboardingBytes);

    const medicalBytes = await generateMedicalIntakePdf();
    fs.writeFileSync(path.join(SAMPLES_DIR, 'medical_intake.pdf'), medicalBytes);

    const invoiceBytes = await generateCommercialInvoicePdf();
    fs.writeFileSync(path.join(SAMPLES_DIR, 'commercial_invoice.pdf'), invoiceBytes);

    const { createTemplatePdf } = await import('../js/templates-engine.js');
    const w9Bytes = await createTemplatePdf('w9');
    fs.writeFileSync(path.join(SAMPLES_DIR, 'w9_tax_form.pdf'), w9Bytes);

    const ndaBytes = await createTemplatePdf('nda');
    fs.writeFileSync(path.join(SAMPLES_DIR, 'nda_agreement.pdf'), ndaBytes);

    console.log(`✅ Generated 5 sample test PDFs into ${SAMPLES_DIR}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    buildAllTestPdfs().then(() => {
        console.log("Done generating PDFs.");
    });
}
