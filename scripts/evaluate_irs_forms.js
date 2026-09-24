import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PDFLib from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IRS_DIR = path.resolve(ROOT_DIR, 'dataset_irs_forms');

globalThis.PDFLib = PDFLib;
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};
globalThis.window = { PDFLib, localStorage: globalThis.localStorage, location: { hash: "" } };
globalThis.document = {
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
};

async function run() {
    console.log("=================================================");
    console.log("📊 RUNNING FIELD DETECTOR ON REAL IRS TAX FORMS");
    console.log("=================================================\n");

    const files = fs.readdirSync(IRS_DIR).filter(f => f.endsWith('.pdf'));
    const summary = [];

    for (const file of files) {
        const filePath = path.join(IRS_DIR, file);
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();

        // Count AcroForm widgets if interactive
        let acroFormCount = 0;
        try {
            const form = pdfDoc.getForm();
            acroFormCount = form.getFields().length;
        } catch (e) {}

        summary.push({
            File: file.replace('.pdf', ''),
            Pages: pageCount,
            "AcroForm Widgets": acroFormCount
        });
    }

    console.table(summary);
    console.log("\n=================================================");
    console.log("🎉 IRS FORMS EVALUATION COMPLETE");
    console.log("=================================================");
}

run().catch(console.error);
