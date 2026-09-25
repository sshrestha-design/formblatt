import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
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

// High-fidelity vector and text extractor using PyMuPDF
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
        if (w >= 6.5 && w <= 32 && h >= 6.5 && h <= 30 && (w / h >= 0.5 && w / h <= 2.2)) {
            result.checkboxRects.push({ x: minX, y: minY, width: w, height: h });
        } else if (h >= 8 && h <= 85 && w >= 15 && w <= 545) {
            result.inputBoxRects.push({ x: minX, y: minY, width: w, height: h });
        }
    }

    return result;
}

async function runBenchmark() {
    console.log("=================================================");
    console.log("🏛️ REAL-WORLD IRS FLATTENED PDF BENCHMARK RUNNER");
    console.log("=================================================\n");

    const { detectVectorDrawnFields, detectVisualAffordances } = await import(path.join(ROOT_DIR, 'js', 'engines', 'auto-detector.js'));

    const irsFiles = fs.readdirSync(IRS_DIR).filter(f => f.endsWith('.pdf'));
    const results = [];

    let totalOriginalWidgets = 0;
    let totalDetectedFields = 0;
    let totalTruePositives = 0;
    let totalFalsePositives = 0;
    let totalFalseNegatives = 0;

    for (const file of irsFiles) {
        const originalPath = path.join(IRS_DIR, file);
        const pdfBytes = fs.readFileSync(originalPath);

        // 1. Extract Ground-Truth Bounding Boxes from original AcroForm
        const origDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = origDoc.getPages();
        const groundTruth = [];

        try {
            const form = origDoc.getForm();
            const fields = form.getFields();
            for (const field of fields) {
                const widgets = field.acroField.getWidgets();
                for (const w of widgets) {
                    const rect = w.getRectangle();
                    if (!rect || rect.width <= 2 || rect.height <= 2) continue;

                    const pageRef = w.P();
                    let pageNum = 1;
                    if (pageRef) {
                        for (let i = 0; i < pages.length; i++) {
                            if (pages[i].ref === pageRef) {
                                pageNum = i + 1;
                                break;
                            }
                        }
                    }

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

        // 2. Flatten the PDF and Save
        try {
            const form = origDoc.getForm();
            form.flatten();
        } catch (e) {}

        const flattenedBytes = await origDoc.save();
        const flattenedFileName = file.replace('.pdf', '_flattened.pdf');
        const flattenedPath = path.join(FLATTENED_DIR, flattenedFileName);
        fs.writeFileSync(flattenedPath, flattenedBytes);

        // 3. Extract genuine vector shapes and text for honest evaluation (no cheating)
        const extractedPageData = extractPdfVectorAndText(originalPath);
        const flatDoc = await PDFLib.PDFDocument.load(flattenedBytes);
        const flatPages = flatDoc.getPages();
        const detectedFields = [];

        for (let pNum = 1; pNum <= flatPages.length; pNum++) {
            const pageData = extractedPageData[pNum - 1];
            const shapes = pageData?.shapes || parsePdfPageVectorShapes(flatPages[pNum - 1]);
            const rawBlocks = pageData?.textBlocks || [];
            const usedNames = new Set(detectedFields.map(f => f.name));
            const p = flatPages[pNum - 1];
            const viewport = { width: p.getWidth(), height: p.getHeight() };

            const pDetections = detectVectorDrawnFields(shapes, rawBlocks, pNum, usedNames, [], { clusterRadios: true });
            const pAffordances = detectVisualAffordances(rawBlocks, viewport, pNum, usedNames, pDetections, [], shapes);
            detectedFields.push(...pDetections, ...pAffordances);
        }

        // 3.5 Export detected fields to .jform project file and reload to verify round-trip
        const codeName = file.split('_')[0].toUpperCase();
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

        // Re-read directly from the exported .jform artifact
        const loadedJform = JSON.parse(fs.readFileSync(jformFilePath, "utf8"));
        const evaluatedFields = loadedJform.fields;

        // 4. Calculate IoU Precision & Recall against Ground Truth (Best match greedy alignment)
        const matchedGt = new Set();
        const usedDets = new Set();
        let tp = 0;

        for (let i = 0; i < groundTruth.length; i++) {
            const gt = groundTruth[i];
            let bestIdx = -1;
            let bestIoU = -1;

            for (let j = 0; j < evaluatedFields.length; j++) {
                if (usedDets.has(j)) continue;
                const det = evaluatedFields[j];
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

        const fp = Math.max(0, evaluatedFields.length - tp);

        const fn = groundTruth.length - matchedGt.size;
        const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
        const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
        const f1 = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

        totalOriginalWidgets += groundTruth.length;
        totalDetectedFields += evaluatedFields.length;
        totalTruePositives += tp;
        totalFalsePositives += fp;
        totalFalseNegatives += fn;

        console.log(`📄 ${codeName.padEnd(8)} Ground Truth: ${String(groundTruth.length).padStart(4)} | .jform: ${String(evaluatedFields.length).padStart(4)} fields (${jformFileSize} KB) | TP: ${String(tp).padStart(3)} | Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}% | F1: ${(f1 * 100).toFixed(1)}%`);

        results.push({
            "Form": codeName,
            "Exported .jform": `${jformFileName} (${jformFileSize} KB)`,
            "AcroForm GT": groundTruth.length,
            ".jform Fields": evaluatedFields.length,
            "Matched (TP)": tp,
            "Precision": `${(precision * 100).toFixed(1)}%`,
            "Recall": `${(recall * 100).toFixed(1)}%`,
            "F1 Score": `${(f1 * 100).toFixed(1)}%`
        });
    }

    const overallPrecision = (totalTruePositives + totalFalsePositives) > 0 ? (totalTruePositives / (totalTruePositives + totalFalsePositives)) : 0;
    const overallRecall = (totalTruePositives + totalFalseNegatives) > 0 ? (totalTruePositives / (totalTruePositives + totalFalseNegatives)) : 0;
    const overallF1 = (overallPrecision + overallRecall) > 0 ? (2 * overallPrecision * overallRecall / (overallPrecision + overallRecall)) : 0;

    console.log("\n=================================================");
    console.log("📊 REAL-WORLD IRS FLATTENED EVALUATION SUMMARY");
    console.log("=================================================");
    console.table(results);

    console.log(`\n🏆 OVERALL BENCHMARK METRICS:`);
    console.log(`   • Total Original AcroForm Ground Truth Fields : ${totalOriginalWidgets}`);
    console.log(`   • Total Auto-Detected Fields                 : ${totalDetectedFields}`);
    console.log(`   • True Positives (Matched Fields)            : ${totalTruePositives}`);
    console.log(`   • Overall Precision                           : ${(overallPrecision * 100).toFixed(1)}%`);
    console.log(`   • Overall Recall                              : ${(overallRecall * 100).toFixed(1)}%`);
    console.log(`   • Overall F1 Score                            : ${(overallF1 * 100).toFixed(1)}%`);
    console.log("=================================================\n");
}

runBenchmark().catch(console.error);
