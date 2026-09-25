// ── Dataset-25 Evaluator ─────────────────────────────────────────────────────
// Runs Formblatt auto-detector vs 25 synthetic forms (ground truth = .jform).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as PDFLib from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '..');
const DS_DIR     = path.join(ROOT_DIR, 'dataset_25_forms');
const EXTRACT_PY = path.join(__dirname, 'extract_shapes.py');

// ── Browser shims ────────────────────────────────────────────────────────────
globalThis.PDFLib = PDFLib;
globalThis.localStorage = {
    _data: {},
    getItem(k)    { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear()       { this._data = {}; }
};
globalThis.window   = { PDFLib, localStorage: globalThis.localStorage, location: { hash: '' } };
globalThis.document = {
    getElementById:  () => null,
    createElement:   () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
};

// ── IoU helper ───────────────────────────────────────────────────────────────
function iou(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width,  b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (!inter) return 0;
    return inter / (a.width * a.height + b.width * b.height - inter);
}

function isMatch(det, gt) {
    if (iou(det, gt) >= 0.25) return true;
    const cx = det.x + det.width  / 2;
    const cy = det.y + det.height / 2;
    return cx >= gt.x - 6 && cx <= gt.x + gt.width  + 6
        && cy >= gt.y - 6 && cy <= gt.y + gt.height + 6;
}

// ── PyMuPDF shape extractor (via helper script) ───────────────────────────────
function extractShapes(pdfPath) {
    try {
        const raw = execSync(`python3 "${EXTRACT_PY}" "${pdfPath}"`,
            { maxBuffer: 16 * 1024 * 1024 }).toString();
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

// ── Main evaluator ────────────────────────────────────────────────────────────
async function evaluate() {
    const { detectVectorDrawnFields, detectVisualAffordances, reconstructTableGridBoxes }
        = await import('../js/engines/auto-detector.js');

    const pdfs = fs.readdirSync(DS_DIR)
        .filter(f => f.endsWith('.pdf'))
        .sort();

    console.log('='.repeat(74));
    console.log('📂  DATASET-25 INTERNAL BENCHMARK  (ground truth = .jform files)');
    console.log('='.repeat(74) + '\n');

    const classStats = {};
    let gTotal = 0, dTotal = 0, tpTotal = 0;

    for (const pdfFile of pdfs) {
        const pdfPath   = path.join(DS_DIR, pdfFile);
        const jformPath = pdfPath.replace('.pdf', '.jform');
        if (!fs.existsSync(jformPath)) continue;

        const jform = JSON.parse(fs.readFileSync(jformPath, 'utf8'));
        const gt    = jform.fields || [];

        // Extract shapes via PyMuPDF
        const pageData = extractShapes(pdfPath);

        // Load PDF with pdf-lib for page dimensions
        const pdfBytes  = fs.readFileSync(pdfPath);
        const pdfDoc    = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const flatPages = pdfDoc.getPages();

        const detected = [];
        for (let pNum = 1; pNum <= flatPages.length; pNum++) {
            const pd = pageData[pNum - 1];
            const shapes = pd?.shapes || {
                checkboxRects: [], inputBoxRects: [], allRects: [],
                underlines: [], hLines: [], vLines: []
            };

            // Only run grid reconstruction on pages that lack direct rect-drawn fields (IRS-style forms).
            // If a page already has ≥3 drawn inputBoxRects, it doesn't need line-based grid inference.
            if (shapes.hLines?.length >= 2 && shapes.inputBoxRects.length <= 2) {
                const gridBoxes = reconstructTableGridBoxes(shapes.hLines, shapes.vLines || []);
                shapes.inputBoxRects.push(...gridBoxes);
                shapes.allRects.push(...gridBoxes);
            }

            const rawBlocks = pd?.textBlocks || [];
            const usedNames = new Set(detected.map(f => f.name));
            const p         = flatPages[pNum - 1];
            const viewport  = { width: p.getWidth(), height: p.getHeight() };

            const vecDets = detectVectorDrawnFields(shapes, rawBlocks, pNum, usedNames, [], { clusterRadios: true });
            vecDets.forEach(f => usedNames.add(f.name));
            const affDets = detectVisualAffordances(rawBlocks, viewport, pNum, usedNames, vecDets, [], shapes);
            detected.push(...vecDets, ...affDets);
        }

        // ── Match detected vs ground truth ───────────────────────────────────
        const gtUsed  = new Set();
        const detUsed = new Set();
        let tp = 0;

        for (let gi = 0; gi < gt.length; gi++) {
            let bestDi = -1, bestScore = -1;
            for (let di = 0; di < detected.length; di++) {
                if (detUsed.has(di)) continue;
                if (isMatch(detected[di], gt[gi])) {
                    const v = iou(detected[di], gt[gi]);
                    if (v > bestScore) { bestScore = v; bestDi = di; }
                }
            }
            if (bestDi !== -1) {
                tp++;
                detUsed.add(bestDi);
                gtUsed.add(gi);
                const cls = gt[gi].type || 'textField';
                if (!classStats[cls]) classStats[cls] = { tp: 0, fp: 0, fn: 0 };
                classStats[cls].tp++;
            }
        }

        const fp = detected.length - tp;
        const fn = gt.length - tp;

        // Accumulate per-class FP/FN
        for (const [di, f] of detected.entries()) {
            if (detUsed.has(di)) continue;
            const cls = f.type || 'textField';
            if (!classStats[cls]) classStats[cls] = { tp: 0, fp: 0, fn: 0 };
            classStats[cls].fp++;
        }
        for (const [gi, f] of gt.entries()) {
            if (gtUsed.has(gi)) continue;
            const cls = f.type || 'textField';
            if (!classStats[cls]) classStats[cls] = { tp: 0, fp: 0, fn: 0 };
            classStats[cls].fn++;
        }

        gTotal  += gt.length;
        dTotal  += detected.length;
        tpTotal += tp;

        const prec = detected.length ? (tp / detected.length * 100).toFixed(1) : '0.0';
        const rec  = gt.length       ? (tp / gt.length       * 100).toFixed(1) : '0.0';
        const f1v  = (tp + 0.5 * (fp + fn)) > 0
            ? (tp / (tp + 0.5 * (fp + fn)) * 100).toFixed(1) : '0.0';

        const icon = fp === 0 && fn === 0 ? '✅' : fp > 0 && fn > 0 ? '⚠️ ' : fp > 0 ? '👻' : '🔍';
        const name = pdfFile.replace('form_', '').replace('.pdf', '').padEnd(44);
        console.log(`${icon} ${name} GT:${String(gt.length).padStart(3)} Det:${String(detected.length).padStart(3)} TP:${String(tp).padStart(3)} FP:${String(fp).padStart(2)} FN:${String(fn).padStart(2)} │ P:${prec.padStart(5)}% R:${rec.padStart(5)}% F1:${f1v.padStart(5)}%`);

        if (fp > 0) {
            const ghosts = detected.filter((_, i) => !detUsed.has(i))
                .map(f => `"${(f.label || f.name || '').substring(0, 24)}"`).slice(0, 5);
            console.log(`      👻 Ghosts  : ${ghosts.join(' | ')}`);
        }
        if (fn > 0) {
            const missed = gt.filter((_, i) => !gtUsed.has(i));
            const summary = [...new Set(missed.map(f => f.type || 'textField'))]
                .map(t => `${t}(${missed.filter(f => (f.type || 'textField') === t).length})`);
            const names = missed.slice(0, 4).map(f => `"${(f.name || '').substring(0, 20)}"`);
            console.log(`      🔍 Missed  : ${summary.join(', ')} → ${names.join(', ')}`);
        }
    }

    // ── Global Summary ────────────────────────────────────────────────────────
    const fp   = dTotal - tpTotal;
    const fn   = gTotal - tpTotal;
    const gP   = dTotal ? (tpTotal / dTotal * 100).toFixed(1) : '0.0';
    const gR   = gTotal ? (tpTotal / gTotal * 100).toFixed(1) : '0.0';
    const gF1  = (tpTotal + 0.5*(fp+fn)) > 0
        ? (tpTotal / (tpTotal + 0.5*(fp+fn)) * 100).toFixed(1) : '0.0';

    console.log('\n' + '='.repeat(74));
    console.log('🏆  GLOBAL RESULTS  (25 generated forms, ground truth = .jform)');
    console.log('='.repeat(74));
    console.log(`   GT Fields          : ${gTotal}`);
    console.log(`   Auto-Detected      : ${dTotal}`);
    console.log(`   True Positives     : ${tpTotal}`);
    console.log(`   False Positives 👻 : ${fp}  (ghost fields)`);
    console.log(`   False Negatives 🔍 : ${fn}  (missed fields)`);
    console.log(`   PRECISION          : ${gP}%`);
    console.log(`   RECALL             : ${gR}%`);
    console.log(`   F1 SCORE           : ${gF1}%`);

    console.log('\n📊  PER-CLASS BREAKDOWN:');
    for (const [cls, s] of Object.entries(classStats)) {
        const p  = (s.tp+s.fp) ? (s.tp/(s.tp+s.fp)*100).toFixed(1) : '0.0';
        const r  = (s.tp+s.fn) ? (s.tp/(s.tp+s.fn)*100).toFixed(1) : '0.0';
        const f1 = (s.tp+0.5*(s.fp+s.fn)) > 0
            ? (s.tp/(s.tp+0.5*(s.fp+s.fn))*100).toFixed(1) : '0.0';
        console.log(`   ${cls.padEnd(14)} TP:${String(s.tp).padStart(3)} FP:${String(s.fp).padStart(3)} FN:${String(s.fn).padStart(3)}  P:${p}%  R:${r}%  F1:${f1}%`);
    }
    console.log('='.repeat(74));
}

evaluate().catch(e => { console.error(e); process.exit(1); });
