import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as PDFLib from 'pdf-lib';

globalThis.PDFLib = PDFLib;
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};
globalThis.window = { PDFLib, localStorage: globalThis.localStorage, location: { hash: '' } };
globalThis.document = {
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
};

const ROOT_DIR = process.cwd();
const { detectVectorDrawnFields, detectVisualAffordances } = await import('../js/engines/auto-detector.js');

function extractWithFitz(pdfPath) {
    const cmd = `python3 -c "
import fitz, json
doc = fitz.open('${pdfPath}')
out = []
for pno, page in enumerate(doc):
    checkboxes = []
    inputs = []
    all_rects = []
    underlines = []
    for d in page.get_drawings():
        r = d['rect']
        w = round(r.width, 1)
        h = round(r.height, 1)
        if w < 6 or h < 0.5: continue
        item = {'x': round(r.x0, 1), 'y': round(r.y0, 1), 'width': w, 'height': h}
        if 6 <= w <= 555 and 6 <= h <= 120: all_rects.append(item)
        if 6.5 <= w <= 32 and 6.5 <= h <= 30 and (0.5 <= w/h <= 2.2):
            checkboxes.append(item)
        elif 8 <= h <= 85 and 15 <= w <= 555:
            inputs.append(item)
        elif h <= 3 and w >= 25:
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
        'shapes': {'checkboxRects': checkboxes, 'inputBoxRects': inputs, 'allRects': all_rects, 'underlines': underlines},
        'textBlocks': words
    })
print(json.dumps(out))
"`;
    return JSON.parse(execSync(cmd, { maxBuffer: 32 * 1024 * 1024 }).toString());
}

const testFiles = [
    'dataset_irs_forms/f1040_form_1040___us_individual_income_tax_return.pdf',
    'dataset_irs_forms/fw9_form_w_9___request_for_taxpayer_identification.pdf',
    'dataset_clinical_forms/cms_l564.pdf',
    'dataset_clinical_forms/va_10_10ez.pdf'
];

for (const file of testFiles) {
    console.log(`\n========================================`);
    console.log(`Auditing: ${path.basename(file)}`);
    console.log(`========================================`);
    const pagesData = extractWithFitz(file);

    for (const pData of pagesData) {
        const detected = detectVectorDrawnFields(pData.shapes, pData.textBlocks, pData.page, new Set(), []);
        console.log(`Page ${pData.page}: Detected ${detected.length} fields (Checkboxes: ${detected.filter(f => f.type === 'checkBox').length}, Inputs: ${detected.filter(f => f.type !== 'checkBox').length})`);
        for (const f of detected) {
            // Check if name contains line number or section
            if (f.name.includes('part') || f.name.includes('section') || /\b\d+[a-z]?\b/i.test(f.name) || f.width > 300) {
                console.log(`   Candidate: [${f.type}] name="${f.name}" x=${f.x} y=${f.y} w=${f.width} h=${f.height}`);
            }
        }
    }
}
