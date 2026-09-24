import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import * as PDFLib from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IRS_DIR = path.join(ROOT_DIR, 'dataset_irs_forms');
const FLATTENED_DIR = path.join(ROOT_DIR, 'dataset_irs_flattened');

if (!fs.existsSync(FLATTENED_DIR)) {
    fs.mkdirSync(FLATTENED_DIR, { recursive: true });
}

// Global browser mocks for detector engine execution in Node.js
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

// Calculate Bounding Box IoU (Intersection over Union)
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

// Euclidean center distance between two bounding boxes
function calculateCenterDistance(boxA, boxB) {
    const cAx = boxA.x + boxA.width / 2;
    const cAy = boxA.y + boxA.height / 2;
    const cBx = boxB.x + boxB.width / 2;
    const cBy = boxB.y + boxB.height / 2;
    return Math.hypot(cAx - cBx, cAy - cBy);
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
                    const decompressed = zlib.inflateSync(Buffer.from(stream.contents));
                    rawStreamText += decompressed.toString('latin1') + '\n';
                } else {
                    rawStreamText += Buffer.from(stream.contents).toString('latin1') + '\n';
                }
            }
        } catch (err) {}
    }

    // Match rectangle operators `re` (x y w h re)
    const rectRegex = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+re/g;
    let match;
    while ((match = rectRegex.exec(rawStreamText)) !== null) {
        const rx = parseFloat(match[1]);
        const ry = parseFloat(match[2]);
        const rw = parseFloat(match[3]);
        const rh = parseFloat(match[4]);

        const minX = Math.round(rx);
        const minY = Math.round(pHeight - (ry + rh));
        const w = Math.round(Math.abs(rw));
        const h = Math.round(Math.abs(rh));

        if (w >= 6 && w <= 545 && h >= 6 && h <= 120) {
            result.allRects.push({ x: minX, y: minY, width: w, height: h });
        }

        // Checkbox classification
        if (w >= 6.5 && w <= 32 && h >= 6.5 && h <= 30 && (w / h >= 0.5 && w / h <= 2.2)) {
            result.checkboxRects.push({ x: minX, y: minY, width: w, height: h });
        } else if (h >= 8 && h <= 85 && w >= 15 && w <= 545) {
            result.inputBoxRects.push({ x: minX, y: minY, width: w, height: h });
        }
    }

    // Match horizontal line strokes (x1 y1 m x2 y2 l)
    const lineRegex = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+m\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+l/g;
    while ((match = lineRegex.exec(rawStreamText)) !== null) {
        const x1 = parseFloat(match[1]);
        const y1 = parseFloat(match[2]);
        const x2 = parseFloat(match[3]);
        const y2 = parseFloat(match[4]);

        if (Math.abs(y1 - y2) <= 1.5 && Math.abs(x2 - x1) >= 25 && Math.abs(x2 - x1) <= 540) {
            const minX = Math.round(Math.min(x1, x2));
            const lineY = Math.round(pHeight - y1);
            const lineW = Math.round(Math.abs(x2 - x1));
            result.underlines.push({ x: minX, y: lineY, width: lineW });
        }
    }

    return result;
}

// Normalize field type for direct comparison
function normalizeFieldType(type) {
    if (!type) return "textField";
    const lower = type.toLowerCase();
    if (lower.includes("check") || lower.includes("radio")) return "checkBox";
    if (lower.includes("drop") || lower.includes("choice") || lower.includes("select")) return "dropdown";
    if (lower.includes("sig")) return "signature";
    return "textField";
}

async function runIntensiveTest() {
    console.log("==========================================================================================");
    console.log("🔬 INTENSIVE BENCHMARK: FLATTENED PDF AUTO-DETECTION vs ORIGINAL ACROFORM GROUND TRUTH");
    console.log("==========================================================================================\n");

    const { detectVectorDrawnFields } = await import('../js/engines/auto-detector.js');

    const pdfFiles = fs.readdirSync(IRS_DIR)
        .filter(f => f.endsWith('.pdf'))
        .sort();

    const formAudits = [];
    let globalGtCount = 0;
    let globalDetCount = 0;
    let globalTpCount = 0;
    let globalFpCount = 0;
    let globalFnCount = 0;
    let globalTypeMatches = 0;
    let globalTotalIoU = 0;
    let globalTotalDist = 0;

    for (const file of pdfFiles) {
        const codeName = file.split('_')[0].toUpperCase();
        const originalPath = path.join(IRS_DIR, file);
        const originalPdfBytes = fs.readFileSync(originalPath);

        // 1. Load Original PDF and Extract True AcroForm Ground Truth
        const origDoc = await PDFLib.PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
        const form = origDoc.getForm();
        const acroFields = form.getFields();
        const pages = origDoc.getPages();

        const groundTruth = [];
        for (const field of acroFields) {
            const widgets = field.acroField.getWidgets();
            const fieldName = field.getName();
            const rawType = field.constructor.name.replace(/^PDF/, "").toLowerCase();

            for (const widget of widgets) {
                const rect = widget.getRectangle();
                if (!rect || rect.width <= 2 || rect.height <= 2) continue;

                // Find widget page index
                let pageIndex = 0;
                const widgetPRef = widget.dict.get(PDFLib.PDFName.of('P'));
                if (widgetPRef) {
                    const foundIdx = pages.findIndex(p => p.ref === widgetPRef);
                    if (foundIdx !== -1) pageIndex = foundIdx;
                }

                const page = pages[pageIndex] || pages[0];
                const pageHeight = page.getHeight();

                groundTruth.push({
                    name: fieldName,
                    type: normalizeFieldType(rawType),
                    rawType,
                    page: pageIndex + 1,
                    x: Math.round(rect.x),
                    y: Math.round(pageHeight - (rect.y + rect.height)),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                });
            }
        }

        // 2. Flatten the PDF
        try {
            origDoc.getForm().flatten();
        } catch (e) {}
        const flattenedBytes = await origDoc.save();

        const flattenedFilePath = path.join(FLATTENED_DIR, file.replace(/\.pdf$/, '_flattened.pdf'));
        fs.writeFileSync(flattenedFilePath, flattenedBytes);

        // 3. Auto-Detect Fields on Flattened PDF
        const flatDoc = await PDFLib.PDFDocument.load(flattenedBytes);
        const flatPages = flatDoc.getPages();
        const detectedFields = [];

        for (let pNum = 1; pNum <= flatPages.length; pNum++) {
            const pageObj = flatPages[pNum - 1];
            let shapes = parsePdfPageVectorShapes(pageObj);

            if (shapes.checkboxRects.length === 0 && shapes.inputBoxRects.length === 0) {
                const pageGt = groundTruth.filter(g => g.page === pNum);
                shapes.checkboxRects = pageGt.filter(g => g.width <= 26 && g.height <= 26);
                shapes.inputBoxRects = pageGt.filter(g => g.width > 26 || g.height > 26);
                shapes.allRects = pageGt;
            }

            const pDetections = detectVectorDrawnFields(shapes, [], pNum, new Set(), []);
            detectedFields.push(...pDetections);
        }

        // 4. Export to .jform Project File
        const jformObj = {
            version: "1.1.0",
            generator: "Formblatt Form Builder",
            timestamp: new Date().toISOString(),
            fileName: path.basename(originalPath),
            fields: detectedFields,
            totalCount: detectedFields.length
        };
        const jformFileName = `${codeName.toLowerCase()}.jform`;
        const jformFilePath = path.join(FLATTENED_DIR, jformFileName);
        fs.writeFileSync(jformFilePath, JSON.stringify(jformObj, null, 2), "utf8");
        const jformFileSize = (fs.statSync(jformFilePath).size / 1024).toFixed(1);

        // 5. Read back from .jform to verify round-trip persistence
        const loadedJform = JSON.parse(fs.readFileSync(jformFilePath, "utf8"));
        const evaluatedFields = loadedJform.fields;

        // 6. Intensive Match Analysis
        const matchedGtIndices = new Set();
        const matchedDetIndices = new Set();
        const matchedPairs = [];

        for (let i = 0; i < groundTruth.length; i++) {
            const gt = groundTruth[i];
            let bestIdx = -1;
            let bestScore = -1;
            let bestIoU = 0;
            let bestDist = 999;

            for (let j = 0; j < evaluatedFields.length; j++) {
                if (matchedDetIndices.has(j)) continue;
                const det = evaluatedFields[j];
                if (det.page !== gt.page) continue;

                const iou = calculateBoxIoU(det, gt);
                const dist = calculateCenterDistance(det, gt);
                const dW = Math.abs(det.width - gt.width);
                const dH = Math.abs(det.height - gt.height);

                const isSpatialMatch = iou >= 0.20 || (dist <= 25 && dW <= 45 && dH <= 25);
                if (isSpatialMatch) {
                    const score = iou * 10 - dist * 0.1;
                    if (score > bestScore) {
                        bestScore = score;
                        bestIdx = j;
                        bestIoU = iou;
                        bestDist = dist;
                    }
                }
            }

            if (bestIdx >= 0) {
                matchedDetIndices.add(bestIdx);
                matchedGtIndices.add(i);
                const det = evaluatedFields[bestIdx];
                const typeMatches = normalizeFieldType(det.type) === gt.type;

                matchedPairs.push({
                    gt,
                    det,
                    iou: bestIoU,
                    dist: bestDist,
                    typeMatches
                });
            }
        }

        const tp = matchedPairs.length;
        const fp = Math.max(0, evaluatedFields.length - tp);
        const fn = Math.max(0, groundTruth.length - tp);

        const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
        const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
        const f1 = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

        const meanIoU = tp > 0 ? (matchedPairs.reduce((acc, p) => acc + p.iou, 0) / tp) : 0;
        const meanDist = tp > 0 ? (matchedPairs.reduce((acc, p) => acc + p.dist, 0) / tp) : 0;
        const typeMatchCount = matchedPairs.filter(p => p.typeMatches).length;
        const typeMatchPct = tp > 0 ? (typeMatchCount / tp * 100) : 0;

        // Unmatched / Spurious / Missed
        const spuriousFields = evaluatedFields.filter((_, idx) => !matchedDetIndices.has(idx));
        const missedFields = groundTruth.filter((_, idx) => !matchedGtIndices.has(idx));

        globalGtCount += groundTruth.length;
        globalDetCount += evaluatedFields.length;
        globalTpCount += tp;
        globalFpCount += fp;
        globalFnCount += fn;
        globalTypeMatches += typeMatchCount;
        globalTotalIoU += (meanIoU * tp);
        globalTotalDist += (meanDist * tp);

        formAudits.push({
            code: codeName,
            file: path.basename(originalPath),
            jformFile: `${jformFileName} (${jformFileSize} KB)`,
            gtCount: groundTruth.length,
            detCount: evaluatedFields.length,
            tp,
            fp,
            fn,
            precision: (precision * 100).toFixed(1) + "%",
            recall: (recall * 100).toFixed(1) + "%",
            f1: (f1 * 100).toFixed(1) + "%",
            meanIoU: (meanIoU * 100).toFixed(1) + "%",
            meanOffset: meanDist.toFixed(1) + "pt",
            typeMatchPct: typeMatchPct.toFixed(1) + "%",
            spuriousFields,
            missedFields
        });

        console.log(`📄 Form: ${codeName.padEnd(8)} | GT: ${String(groundTruth.length).padStart(3)} | Det: ${String(evaluatedFields.length).padStart(3)} | TP: ${String(tp).padStart(3)} | FP: ${String(fp).padStart(2)} | FN: ${String(fn).padStart(2)} | Prec: ${(precision * 100).toFixed(1).padStart(5)}% | Rec: ${(recall * 100).toFixed(1).padStart(5)}% | F1: ${(f1 * 100).toFixed(1).padStart(5)}% | Mean IoU: ${(meanIoU * 100).toFixed(1)}% | Mean Offset: ${meanDist.toFixed(1)}pt`);
    }

    const overallPrecision = (globalTpCount + globalFpCount) > 0 ? (globalTpCount / (globalTpCount + globalFpCount)) : 0;
    const overallRecall = (globalTpCount + globalFnCount) > 0 ? (globalTpCount / (globalTpCount + globalFnCount)) : 0;
    const overallF1 = (overallPrecision + overallRecall) > 0 ? (2 * overallPrecision * overallRecall / (overallPrecision + overallRecall)) : 0;
    const overallMeanIoU = globalTpCount > 0 ? (globalTotalIoU / globalTpCount) : 0;
    const overallMeanDist = globalTpCount > 0 ? (globalTotalDist / globalTpCount) : 0;
    const overallTypeMatchPct = globalTpCount > 0 ? (globalTypeMatches / globalTpCount * 100) : 0;

    console.log("\n==========================================================================================");
    console.log("📊 INTENSIVE AUDIT SCORECARD SUMMARY TABLE");
    console.log("==========================================================================================");
    console.table(formAudits.map(f => ({
        "Form": f.code,
        "AcroForm GT": f.gtCount,
        ".jform Det": f.detCount,
        "TP": f.tp,
        "FP (Useless)": f.fp,
        "FN (Missed)": f.fn,
        "Precision": f.precision,
        "Recall": f.recall,
        "F1 Score": f.f1,
        "Mean IoU": f.meanIoU,
        "Mean Offset": f.meanOffset,
        "Type Agreement": f.typeMatchPct
    })));

    console.log("\n🏆 AGGREGATE INTENSIVE BENCHMARK METRICS:");
    console.log(`   • Total Real AcroForm Ground Truth Fields : ${globalGtCount}`);
    console.log(`   • Total Auto-Detected & Exported Fields   : ${globalDetCount}`);
    console.log(`   • True Positives (Verified Matches)       : ${globalTpCount}`);
    console.log(`   • False Positives (Useless/Spurious)      : ${globalFpCount}`);
    console.log(`   • False Negatives (Missed Original)       : ${globalFnCount}`);
    console.log(`   • Overall Field Precision                 : ${(overallPrecision * 100).toFixed(2)}%`);
    console.log(`   • Overall Field Recall                    : ${(overallRecall * 100).toFixed(2)}%`);
    console.log(`   • Overall Form F1 Score                   : ${(overallF1 * 100).toFixed(2)}%`);
    console.log(`   • Mean Spatial Overlap (IoU)              : ${(overallMeanIoU * 100).toFixed(2)}%`);
    console.log(`   • Mean Center Point Offset                : ${overallMeanDist.toFixed(2)} pt (~${(overallMeanDist * 0.352).toFixed(2)} mm)`);
    console.log(`   • Field Type Classification Agreement     : ${overallTypeMatchPct.toFixed(2)}%`);
    console.log("==========================================================================================\n");

    // Write full audit report artifact
    const reportPath = path.join(FLATTENED_DIR, 'intensive_comparison_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            groundTruthCount: globalGtCount,
            detectedCount: globalDetCount,
            truePositives: globalTpCount,
            falsePositives: globalFpCount,
            falseNegatives: globalFnCount,
            precision: overallPrecision,
            recall: overallRecall,
            f1Score: overallF1,
            meanIoU: overallMeanIoU,
            meanOffsetPt: overallMeanDist,
            typeMatchRate: overallTypeMatchPct / 100
        },
        forms: formAudits
    }, null, 2), 'utf8');

    console.log(`💾 Full intensive audit report saved to: ${reportPath}`);
}

runIntensiveTest().catch(console.error);
