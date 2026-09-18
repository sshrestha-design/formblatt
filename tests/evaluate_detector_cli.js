// ── Formblatt CLI Form Detection Benchmark & Evaluation Runner ────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PDFLib from 'pdf-lib';
import { generateEmployeeOnboardingPdf, generateMedicalIntakePdf, generateCommercialInvoicePdf } from './generate_test_pdfs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '..');

globalThis.PDFLib = PDFLib;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};
global.window = { PDFLib, localStorage: global.localStorage, location: { hash: "" } };
global.document = {
    getElementById: () => null,
    createElement: (tag) => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {},
        getContext: () => ({
            getImageData: () => ({ data: new Uint8ClampedArray(100) }),
            putImageData: () => {},
            drawImage: () => {},
            fillRect: () => {},
            clearRect: () => {},
            strokeRect: () => {}
        })
    }),
    querySelectorAll: () => []
};

async function runCliEvaluation() {
    console.log("=================================================");
    console.log("📊 FORMBLATT FORM FIELD DETECTION BENCHMARK SUITE");
    console.log("=================================================\n");

    const { state } = await import(path.join(WEB_DIR, 'js', 'state.js'));
    const { autoDetectFields } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

    const testSuites = [
        {
            name: "Employee Onboarding & Direct Deposit",
            generate: generateEmployeeOnboardingPdf,
            expectedMinFields: 10,
            expectedKeywords: ["name", "dob", "ssn", "phone", "email", "signature", "date"]
        },
        {
            name: "Medical Clinic Intake & Health History",
            generate: generateMedicalIntakePdf,
            expectedMinFields: 12,
            expectedKeywords: ["name", "dob", "phone", "allergies", "medications", "signature", "date"]
        },
        {
            name: "Commercial Service Invoice",
            generate: generateCommercialInvoicePdf,
            expectedMinFields: 15,
            expectedKeywords: ["invoice", "date", "due_date", "subtotal", "tax", "total", "signature"]
        }
    ];

    const results = [];

    for (const test of testSuites) {
        console.log(`🔍 Testing: ${test.name}...`);
        const pdfBytes = await test.generate();

        // Load into mock PDF doc structure for detector
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();

        state.pdfBytes = pdfBytes;
        state.totalPages = pageCount;
        state.currentPageNum = 1;
        state.fields = [];

        // Mock PDF.js page structure
        state.pdfDoc = {
            numPages: pageCount,
            getPage: async (num) => {
                const p = pdfDoc.getPage(num - 1);
                const { width, height } = p.getSize();
                return {
                    getViewport: ({ scale = 1 }) => ({ width: width * scale, height: height * scale }),
                    getAnnotations: async () => [],
                    getTextContent: async () => {
                        // Extract text approximate representation
                        return { items: [] };
                    },
                    getOperatorList: async () => ({ fnArray: [], argsArray: [] }),
                    render: () => ({ promise: Promise.resolve() })
                };
            }
        };

        const count = await autoDetectFields("current");
        console.log(`   • Fields Detected : ${state.fields.length}`);

        results.push({
            name: test.name,
            detected: state.fields.length,
            fields: state.fields.map(f => ({ name: f.name, type: f.type, x: f.x, y: f.y, w: f.width, h: f.height }))
        });
    }

    console.log("\n=================================================");
    console.log("📈 EVALUATION SUMMARY TABLE");
    console.log("=================================================");
    console.table(results.map(r => ({
        "Benchmark Document": r.name,
        "Detections Count": r.detected
    })));

    console.log("\n💡 To visually inspect, mark right/wrong, and calculate live Precision/Recall/F1 scores, open:");
    console.log("👉 /evaluate.html or /tests/evaluate.html in your web browser.\n");
}

runCliEvaluation().catch(err => {
    console.error("Evaluation error:", err);
});
