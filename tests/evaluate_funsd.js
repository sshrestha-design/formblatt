// ── FUNSD Benchmark Evaluator for Formblatt Field Detector ──────────────
// Tests Formblatt's detector against ICDAR FUNSD (Form Understanding in Noisy Scanned Documents)
// Dataset path: /Users/sagarshrestha/Downloads/dataset/testing_data

import fs from 'fs';
import path from 'path';
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
    if (!fs.existsSync(annotationsDir)) {
        console.error(`❌ Dataset path not found: ${annotationsDir}`);
        process.exit(1);
    }

    const jsonFiles = fs.readdirSync(annotationsDir).filter(f => f.endsWith('.json'));
    console.log(`📁 Loaded ${jsonFiles.length} ground-truth test annotations from FUNSD.\n`);

    const { detectVectorDrawnFields, detectUnderlineFields, detectVisualAffordances } = await import(path.join(WEB_DIR, 'js', 'engines', 'auto-detector.js'));

    let totalTP = 0;
    let totalFP = 0;
    let totalFN = 0;

    const fileScores = [];

    for (let idx = 0; idx < jsonFiles.length; idx++) {
        const file = jsonFiles[idx];
        const filePath = path.join(annotationsDir, file);
        const rawJson = fs.readFileSync(filePath, 'utf8');
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

        // 3. Mock page viewport & vector shapes for scanner evaluation
        const viewport = { width: 1000, height: 1000 };
        const pageNum = 1;
        const usedNames = new Set();
        const vectorShapes = { checkboxRects: [], inputBoxRects: [], allRects: [], underlines: [] };

        // 4. Run Formblatt detector logic
        const drawnFields = detectVectorDrawnFields(vectorShapes, rawBlocks, pageNum, usedNames, []);
        const underlineFields = detectUnderlineFields({ horizontalLines: [], verticalLines: [] }, rawBlocks, pageNum, usedNames, drawnFields);
        const visualFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, [...drawnFields, ...underlineFields], [], vectorShapes);

        const detectedFields = visualFields;

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
    console.log("📈 EVALUATION SCORECARD FOR FORMS (FUNSD TEST SUITE)");
    console.log("==========================================================================");
    console.table(fileScores.slice(0, 15)); // Show sample of top 15 test files

    console.log("\n==========================================================================");
    console.log("🎯 GLOBAL BENCHMARK METRICS OVER 50 REAL-WORLD FORMS:");
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
