// ── FUNSD Benchmark Evaluator for Formblatt Field Detector ──────────────
// Tests Formblatt's detector against ICDAR FUNSD (Form Understanding in Noisy Scanned Documents)
// Dataset path: /Users/sagarshrestha/Downloads/dataset/testing_data

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '..');
const DATASET_DIR = '/Users/sagarshrestha/Downloads/dataset/testing_data';

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};
global.window = { localStorage: global.localStorage, location: { hash: "" } };
global.document = {
    getElementById: () => null,
    createElement: (tag) => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {}
    }),
    querySelectorAll: () => []
};

// Pure Node.js PNG Grayscale decoder
function decodePngGrayscale(buf) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const idatChunks = [];
    let pos = 8;
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        if (type === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
        pos += 12 + len;
    }
    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const rawPixels = new Uint8Array(width * height);
    const bytesPerScanline = 1 + width;
    let prevRow = new Uint8Array(width);
    for (let y = 0; y < height; y++) {
        const filterType = decompressed[y * bytesPerScanline];
        const row = new Uint8Array(width);
        const srcOffset = y * bytesPerScanline + 1;
        for (let x = 0; x < width; x++) {
            const val = decompressed[srcOffset + x];
            if (filterType === 0) row[x] = val;
            else if (filterType === 1) row[x] = (val + (x > 0 ? row[x - 1] : 0)) & 0xff;
            else if (filterType === 2) row[x] = (val + prevRow[x]) & 0xff;
            else if (filterType === 3) row[x] = (val + Math.floor(((x > 0 ? row[x - 1] : 0) + prevRow[x]) / 2)) & 0xff;
            else if (filterType === 4) {
                const a = x > 0 ? row[x - 1] : 0, b = prevRow[x], c = x > 0 ? prevRow[x - 1] : 0;
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                let pr = (pa <= pb && pa <= pc) ? a : ((pb <= pc) ? b : c);
                row[x] = (val + pr) & 0xff;
            }
        }
        rawPixels.set(row, y * width);
        prevRow = row;
    }
    return { width, height, data: rawPixels };
}

// Helper: Calculate Box Intersection over Union (IoU)
function calculateBoxIoU(boxA, boxB) {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea === 0) return 0;

    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;
    return interArea / (boxAArea + boxBArea - interArea);
}

// Helper: Check if boxA overlaps significantly with boxB
function isBoxMatching(detected, groundTruth, iouThreshold = 0.20) {
    const iou = calculateBoxIoU(detected, groundTruth);
    if (iou >= iouThreshold) return true;

    // Secondary check: Center of detected box inside ground truth box or vice versa
    const detCenterX = detected.x + detected.width / 2;
    const detCenterY = detected.y + detected.height / 2;
    const insideGT = detCenterX >= groundTruth.x - 10 && detCenterX <= groundTruth.x + groundTruth.width + 10 &&
                     detCenterY >= groundTruth.y - 10 && detCenterY <= groundTruth.y + groundTruth.height + 10;
    return insideGT;
}

async function runFunsdBenchmark() {
    console.log("==========================================================================");
    console.log("📊 FUNSD (Form Understanding in Noisy Scanned Documents) BENCHMARK SUITE");
    console.log("==========================================================================\n");

    const annotationsDir = path.join(DATASET_DIR, 'annotations');
    const imagesDir = path.join(DATASET_DIR, 'images');

    if (!fs.existsSync(annotationsDir)) {
        console.error(`❌ Dataset path not found: ${annotationsDir}`);
        process.exit(1);
    }

    const jsonFiles = fs.readdirSync(annotationsDir).filter(f => f.endsWith('.json'));
    console.log(`📁 Loaded ${jsonFiles.length} ground-truth test annotations and images from FUNSD.\n`);

    const { binarizeImageData, detectScannedBoxContours, detectScannedHorizontalLines } = await import(path.join(WEB_DIR, 'js', 'engines', 'ocr-engine.js'));
    const { detectVectorDrawnFields, detectUnderlineFields, detectVisualAffordances } = await import(path.join(WEB_DIR, 'js', 'engines', 'auto-detector.js'));

    let totalTP = 0;
    let totalFP = 0;
    let totalFN = 0;

    const fileScores = [];

    for (let idx = 0; idx < jsonFiles.length; idx++) {
        const file = jsonFiles[idx];
        const fileId = file.replace('.json', '');
        const jsonPath = path.join(annotationsDir, file);
        const imgPath = path.join(imagesDir, `${fileId}.png`);

        const rawJson = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(rawJson);

        const formItems = data.form || [];

        // 1. Extract ground truth answers (fillable field targets)
        const groundTruthAnswers = formItems
            .filter(item => item.label === 'answer' || item.label === 'question')
            .map(item => {
                const [x0, y0, x1, y1] = item.box;
                return {
                    id: item.id,
                    x: x0,
                    y: y0,
                    width: Math.max(10, x1 - x0),
                    height: Math.max(10, y1 - y0),
                    text: item.text,
                    label: item.label
                };
            });

        // 2. Build rawBlocks text format from ground-truth word tokens
        const rawBlocks = [];
        for (const item of formItems) {
            for (const w of (item.words || [])) {
                if (!w.text || !w.box) continue;
                const [x0, y0, x1, y1] = w.box;
                rawBlocks.push({
                    x: x0,
                    y: y0,
                    width: Math.max(4, x1 - x0),
                    height: Math.max(4, y1 - y0),
                    str: w.text.trim()
                });
            }
        }

        // 3. Decode scanned PNG image pixels and perform binarization & contour analysis
        let scannedBoxes = [];
        let scannedLines = [];
        if (fs.existsSync(imgPath)) {
            const pngBuf = fs.readFileSync(imgPath);
            const img = decodePngGrayscale(pngBuf);
            const rgba = new Uint8ClampedArray(img.width * img.height * 4);
            for (let i = 0; i < img.data.length; i++) {
                const p = img.data[i];
                rgba[i * 4] = p;
                rgba[i * 4 + 1] = p;
                rgba[i * 4 + 2] = p;
                rgba[i * 4 + 3] = 255;
            }
            const binary = binarizeImageData({ width: img.width, height: img.height, data: rgba });
            const rawBoxes = detectScannedBoxContours(binary, img.width, img.height);
            scannedLines = detectScannedHorizontalLines(binary, img.width, img.height);

            // Filter out scanned boxes that are already full of printed text
            scannedBoxes = rawBoxes.filter(box => {
                const innerText = rawBlocks.filter(tb => {
                    const cx = tb.x + tb.width / 2;
                    const cy = tb.y + tb.height / 2;
                    return cx >= box.x && cx <= box.x + box.width &&
                           cy >= box.y && cy <= box.y + box.height;
                });
                // If box contains 2+ text words, it's a printed text paragraph/header, not a blank form input
                return innerText.length < 2;
            });
        }

        const checkboxRects = scannedBoxes.filter(b => b.isSquare);
        const inputBoxRects = scannedBoxes.filter(b => !b.isSquare);

        const viewport = { width: 1000, height: 1000 };
        const pageNum = 1;
        const usedNames = new Set();
        const vectorShapes = { checkboxRects, inputBoxRects, allRects: scannedBoxes, underlines: scannedLines };

        // 4. Run Formblatt detector pipeline
        const drawnFields = detectVectorDrawnFields(vectorShapes, rawBlocks, pageNum, usedNames, []);
        const underlineFields = detectUnderlineFields({ horizontalLines: scannedLines.map(y => ({ start: 0, end: 1000, offset: y * 2 })), verticalLines: [] }, rawBlocks, pageNum, usedNames, drawnFields);
        const visualFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, [...drawnFields, ...underlineFields], [], vectorShapes);

        const detectedFields = [...drawnFields, ...underlineFields, ...visualFields];

        // 5. Evaluate Matches (TP, FP, FN)
        let tp = 0;
        let fp = 0;
        let fn = 0;

        const matchedGT = new Set();

        for (const det of detectedFields) {
            let matched = false;
            for (let i = 0; i < groundTruthAnswers.length; i++) {
                if (matchedGT.has(i)) continue;
                const gt = groundTruthAnswers[i];
                if (isBoxMatching(det, gt)) {
                    matched = true;
                    matchedGT.add(i);
                    break;
                }
            }
            if (matched) {
                tp++;
            } else {
                fp++;
            }
        }

        fn = groundTruthAnswers.length - matchedGT.size;

        totalTP += tp;
        totalFP += fp;
        totalFN += fn;

        const precision = (tp + fp) > 0 ? (tp / (tp + fp)) : 0;
        const recall = (tp + fn) > 0 ? (tp / (tp + fn)) : 0;
        const f1 = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

        fileScores.push({
            file,
            gtCount: groundTruthAnswers.length,
            detCount: detectedFields.length,
            tp,
            fp,
            fn,
            f1: (f1 * 100).toFixed(1) + '%'
        });
    }

    const globalPrecision = (totalTP + totalFP) > 0 ? (totalTP / (totalTP + totalFP)) : 0;
    const globalRecall = (totalTP + totalFN) > 0 ? (totalTP / (totalTP + totalFN)) : 0;
    const globalF1 = (globalPrecision + globalRecall) > 0 ? (2 * globalPrecision * globalRecall / (globalPrecision + globalRecall)) : 0;

    console.log("==========================================================================");
    console.log("📈 EVALUATION SCORECARD FOR SCANNED FORMS (FUNSD TEST SUITE)");
    console.log("==========================================================================");
    console.table(fileScores.slice(0, 15)); // Show sample of top 15 test files

    console.log("\n==========================================================================");
    console.log("🎯 GLOBAL BENCHMARK METRICS WITH SCANNED CONTOUR OCR PIPELINE:");
    console.log(`   • Total Ground-Truth Fields : ${totalTP + totalFN}`);
    console.log(`   • True Positives (TP)      : ${totalTP}`);
    console.log(`   • False Positives (FP)     : ${totalFP}`);
    console.log(`   • False Negatives (FN)     : ${totalFN}`);
    console.log("--------------------------------------------------------------------------");
    console.log(`   • PRECISION                : ${(globalPrecision * 100).toFixed(2)}%`);
    console.log(`   • RECALL                   : ${(globalRecall * 100).toFixed(2)}%`);
    console.log(`   • F1-SCORE                 : ${(globalF1 * 100).toFixed(2)}%`);
    console.log("==========================================================================\n");
}

runFunsdBenchmark().catch(err => {
    console.error("Benchmark error:", err);
    process.exit(1);
});
