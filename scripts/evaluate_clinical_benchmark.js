import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import zlib from 'zlib';
import * as PDFLib from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CLINICAL_DIR = path.join(ROOT_DIR, 'dataset_clinical_forms');
const FLATTENED_DIR = path.join(ROOT_DIR, 'dataset_clinical_flattened');

if (!fs.existsSync(FLATTENED_DIR)) {
    fs.mkdirSync(FLATTENED_DIR, { recursive: true });
}

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

// Calculate Bounding Box IoU
function calculateBoxIoU(boxA, boxB) {
    const x1 = Math.max(boxA.x, boxB.x);
    const y1 = Math.max(boxA.y, boxB.y);
    const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea === 0) return 0;

    const areaA = boxA.width * boxA.height;
    const areaB = boxB.width * boxB.height;
    const unionArea = areaA + areaB - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
}

// Fallback high-fidelity vector & text extractor using PyMuPDF
function extractPdfVectorAndText(pdfPath) {
    const cmd = `python3 -c "
import fitz, json, sys

doc = fitz.open('${pdfPath}')
out = []
for pno, page in enumerate(doc):
    checkboxes = []
    inputs = []
    all_rects = []
    underlines = []

    for d in page.get_drawings():
        fill = d.get('fill')
        color = d.get('color')
        if (fill == (1.0, 1.0, 1.0) or fill == [1.0, 1.0, 1.0]) and (color == (1.0, 1.0, 1.0) or color == [1.0, 1.0, 1.0] or color is None):
            continue
        r = d['rect']
        w = round(r.width, 1)
        h = round(r.height, 1)
        if w < 6 or h < 0.5:
            continue
        item = {'x': round(r.x0, 1), 'y': round(r.y0, 1), 'width': w, 'height': h}
        is_closed = bool(d.get('closePath') or any(it[0] == 're' for it in d.get('items', [])) or len(d.get('items', [])) >= 4)
        if 6 <= w <= 555 and 6 <= h <= 120 and is_closed:
            all_rects.append(item)
        if 6.5 <= w <= 32 and 6.5 <= h <= 30 and (0.5 <= w/h <= 2.2) and is_closed:
            checkboxes.append(item)
        elif 8 <= h <= 85 and 15 <= w <= 555 and is_closed:
            inputs.append(item)
        elif h <= 3 and 25 <= w <= 380:
            underlines.append(item)

    words = []
    for w in page.get_text('words'):
        words.append({
            'x': round(w[0], 1),
            'y': round(w[1], 1),
            'width': round(w[2] - w[0], 1),
            'height': round(w[3] - w[1], 1),
            'str': w[4]
        })

    out.append({
        'page': pno + 1,
        'shapes': {
            'checkboxRects': checkboxes,
            'inputBoxRects': inputs,
            'allRects': all_rects,
            'underlines': underlines
        },
        'textBlocks': words
    })

print(json.dumps(out))
"`;
    try {
        const jsonStr = execSync(cmd, { maxBuffer: 32 * 1024 * 1024 }).toString();
        return JSON.parse(jsonStr);
    } catch (e) {
        return [];
    }
}

// Parse PDF content streams for vector shapes directly in Node
function parsePdfPageVectorShapes(page) {
    const result = { checkboxRects: [], inputBoxRects: [], allRects: [], underlines: [] };
    const pHeight = page.getHeight();

    let streams = [];
    try {
        const contentsObj = page.node.Contents();
        if (contentsObj) {
            if (typeof contentsObj.array === 'function') {
                streams = contentsObj.array();
            } else if (Array.isArray(contentsObj)) {
                streams = contentsObj;
            } else {
                streams = [contentsObj];
            }
        }
    } catch (e) {}

    let rawStreamText = '';
    for (const stream of streams) {
        try {
            if (typeof stream.getBytes === 'function') {
                const bytes = stream.getBytes();
                rawStreamText += new TextDecoder('latin1').decode(bytes) + '\n';
            } else if (stream.contents) {
                if (stream.dict && stream.dict.get(PDFLib.PDFName.of('Filter'))?.name === 'FlateDecode') {
                    const decomp = zlib.inflateSync(Buffer.from(stream.contents));
                    rawStreamText += new TextDecoder('latin1').decode(decomp) + '\n';
                } else {
                    rawStreamText += new TextDecoder('latin1').decode(stream.contents) + '\n';
                }
            }
        } catch (e) {}
    }

    const rePattern = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+re\b/g;
    let match;
    while ((match = rePattern.exec(rawStreamText)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const w = parseFloat(match[3]);
        const h = parseFloat(match[4]);

        const absW = Math.abs(w);
        const absH = Math.abs(h);
        const normX = w < 0 ? x + w : x;
        const normY = h < 0 ? y + h : y;

        const canvasY = pHeight - (normY + absH);

        if (absW >= 6 && absW <= 555 && absH >= 6 && absH <= 120) {
            result.allRects.push({ x: normX, y: canvasY, width: absW, height: absH });
        }
        if (absW >= 6.5 && absW <= 32 && absH >= 6.5 && absH <= 30 && (absW / absH >= 0.5 && absW / absH <= 2.2)) {
            result.checkboxRects.push({ x: normX, y: canvasY, width: absW, height: absH });
        } else if (absH >= 8 && absH <= 85 && absW >= 15 && absW <= 555) {
            result.inputBoxRects.push({ x: normX, y: canvasY, width: absW, height: absH });
        }
    }

    return result;
}

async function runClinicalBenchmark() {
    console.log("=================================================");
    console.log("🏥 REAL-WORLD CLINICAL & HEALTHCARE BENCHMARK");
    console.log("=================================================\n");

    const { detectVectorDrawnFields } = await import('../js/engines/auto-detector.js');

    const files = fs.readdirSync(CLINICAL_DIR).filter(f => f.endsWith('.pdf')).sort();
    const benchmarkResults = [];

    for (const file of files) {
        const originalPath = path.join(CLINICAL_DIR, file);
        const pdfBytes = fs.readFileSync(originalPath);
        const origDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = origDoc.getPages();
        const codeName = path.basename(file, '.pdf');

        // 1. Extract Ground Truth Form Fields from original AcroForm
        const groundTruth = [];
        try {
            const form = origDoc.getForm();
            const fields = form.getFields();

            for (const field of fields) {
                const widgets = field.acroField.getWidgets();
                for (const widget of widgets) {
                    const rect = widget.getRectangle();
                    if (!rect || rect.width <= 2 || rect.height <= 2) continue;

                    const pageRef = widget.P();
                    let pageNum = -1;
                    if (pageRef) {
                        for (let i = 0; i < pages.length; i++) {
                            if (pages[i].ref === pageRef) {
                                pageNum = i + 1;
                                break;
                            }
                        }
                    }

                    // Skip orphan/off-screen widgets with no bound page
                    if (pageNum === -1) continue;

                    const pHeight = pages[pageNum - 1].getHeight();
                    groundTruth.push({
                        name: field.getName(),
                        page: pageNum,
                        x: Math.round(rect.x),
                        y: Math.round(pHeight - (rect.y + rect.height)),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    });
                }
            }
        } catch (e) {}

        const isAcroForm = groundTruth.length > 0;

        // 2. Flatten if AcroForm, or use directly if Flat
        let evalDocBytes = pdfBytes;
        if (isAcroForm) {
            try {
                const form = origDoc.getForm();
                form.flatten();
            } catch (e) {}
            evalDocBytes = await origDoc.save();
        }

        const flattenedFileName = isAcroForm ? file.replace('.pdf', '_flattened.pdf') : file;
        const flattenedPath = path.join(FLATTENED_DIR, flattenedFileName);
        fs.writeFileSync(flattenedPath, evalDocBytes);

        // Extract genuine vector shapes and text for all forms without ground truth cheating
        const extractedPageData = extractPdfVectorAndText(originalPath);

        // 3. Run Formblatt Vector Field Detector on the PDF
        const flatDoc = await PDFLib.PDFDocument.load(evalDocBytes);
        const flatPages = flatDoc.getPages();
        const detectedFields = [];

        for (let pNum = 1; pNum <= flatPages.length; pNum++) {
            const pageData = extractedPageData[pNum - 1];
            const shapes = pageData?.shapes || parsePdfPageVectorShapes(flatPages[pNum - 1]);
            const rawBlocks = pageData?.textBlocks || [];

            const pDetections = detectVectorDrawnFields(shapes, rawBlocks, pNum, new Set(), []);
            detectedFields.push(...pDetections);
        }

        // 4. Export detected fields to .jform project file
        const jformObj = {
            version: "1.1.0",
            generator: "Formblatt Form Builder",
            timestamp: new Date().toISOString(),
            fileName: path.basename(originalPath),
            formType: isAcroForm ? "acroform_flattened" : "flat_clinical_checklist",
            fields: detectedFields,
            totalCount: detectedFields.length
        };
        const jformFileName = `${codeName}.jform`;
        const jformFilePath = path.join(FLATTENED_DIR, jformFileName);
        fs.writeFileSync(jformFilePath, JSON.stringify(jformObj, null, 2), "utf8");
        const jformFileSize = (fs.statSync(jformFilePath).size / 1024).toFixed(1);

        // 5. Evaluate Against Ground Truth (for AcroForm documents)
        let tp = 0;
        let precision = 0;
        let recall = 0;
        let f1 = 0;

        if (isAcroForm) {
            const matchedGt = new Set();
            const usedDets = new Set();

            for (let i = 0; i < groundTruth.length; i++) {
                const gt = groundTruth[i];
                let bestIdx = -1;
                let bestIoU = -1;

                for (let j = 0; j < detectedFields.length; j++) {
                    if (usedDets.has(j)) continue;
                    const det = detectedFields[j];
                    if (det.page !== gt.page) continue;

                    const iou = calculateBoxIoU(det, gt);
                    const dist = Math.hypot(det.x - gt.x, det.y - gt.y);
                    if (iou >= 0.20 || (dist <= 25 && Math.abs(det.width - gt.width) <= 45 && Math.abs(det.height - gt.height) <= 25)) {
                        if (iou > bestIoU) {
                            bestIoU = iou;
                            bestIdx = j;
                        }
                    }
                }

                if (bestIdx >= 0) {
                    usedDets.add(bestIdx);
                    matchedGt.add(i);
                    tp++;
                }
            }

            precision = detectedFields.length > 0 ? tp / detectedFields.length : 0;
            recall = groundTruth.length > 0 ? tp / groundTruth.length : 0;
            f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

            console.log(`📄 ${codeName.padEnd(30)} | GT: ${String(groundTruth.length).padStart(3)} | Det: ${String(detectedFields.length).padStart(3)} | TP: ${String(tp).padStart(3)} | Prec: ${(precision*100).toFixed(1)}% | Rec: ${(recall*100).toFixed(1)}% | F1: ${(f1*100).toFixed(1)}%`);
        } else {
            console.log(`📋 ${codeName.padEnd(30)} | FLAT CHECKLIST | Det: ${String(detectedFields.length).padStart(3)} fields detected (${jformFileSize} KB .jform)`);
        }

        benchmarkResults.push({
            form: codeName,
            isAcroForm,
            pages: pages.length,
            gtCount: groundTruth.length,
            detCount: detectedFields.length,
            tp,
            precision: isAcroForm ? (precision * 100).toFixed(1) + '%' : 'N/A (Flat)',
            recall: isAcroForm ? (recall * 100).toFixed(1) + '%' : 'N/A (Flat)',
            f1: isAcroForm ? (f1 * 100).toFixed(1) + '%' : 'N/A (Flat)',
            jformFile: `${jformFileName} (${jformFileSize} KB)`
        });
    }

    console.log("\n=================================================");
    console.log("📊 CLINICAL FORMS EVALUATION SCORECARD");
    console.log("=================================================");
    console.table(benchmarkResults);

    const acroResults = benchmarkResults.filter(r => r.isAcroForm);
    const totalGt = acroResults.reduce((sum, r) => sum + r.gtCount, 0);
    const totalDet = acroResults.reduce((sum, r) => sum + r.detCount, 0);
    const totalTp = acroResults.reduce((sum, r) => sum + r.tp, 0);
    const overallPrecision = totalDet > 0 ? (totalTp / totalDet * 100).toFixed(1) : 0;
    const overallRecall = totalGt > 0 ? (totalTp / totalGt * 100).toFixed(1) : 0;
    const overallF1 = (parseFloat(overallPrecision) + parseFloat(overallRecall)) > 0
        ? (2 * parseFloat(overallPrecision) * parseFloat(overallRecall) / (parseFloat(overallPrecision) + parseFloat(overallRecall))).toFixed(1)
        : 0;

    console.log("\n🏆 OVERALL CLINICAL ACROFORM BENCHMARK METRICS:");
    console.log(`   • Total Original AcroForm Ground Truth Fields : ${totalGt}`);
    console.log(`   • Total Auto-Detected Fields                 : ${totalDet}`);
    console.log(`   • True Positives (Matched Fields)            : ${totalTp}`);
    console.log(`   • Overall Precision                           : ${overallPrecision}%`);
    console.log(`   • Overall Recall                              : ${overallRecall}%`);
    console.log(`   • Overall F1 Score                            : ${overallF1}%`);

    const flatResults = benchmarkResults.filter(r => !r.isAcroForm);
    const totalFlatFields = flatResults.reduce((sum, r) => sum + r.detCount, 0);
    console.log("\n📋 FLAT CLINICAL CHECKLISTS SUMMARY:");
    console.log(`   • Checklists Evaluated                       : ${flatResults.length}`);
    console.log(`   • Total Vector Fields Detected               : ${totalFlatFields}`);
    console.log("=================================================\n");
}

runClinicalBenchmark().catch(console.error);
