import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'dataset_irs_forms');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 10 Official Real-World IRS PDF Form URLs
const IRS_FORMS = [
    { code: "fw4", name: "Form W-4 - Employee Withholding Certificate", url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf" },
    { code: "fw9", name: "Form W-9 - Request for Taxpayer Identification", url: "https://www.irs.gov/pub/irs-pdf/fw9.pdf" },
    { code: "f1040", name: "Form 1040 - US Individual Income Tax Return", url: "https://www.irs.gov/pub/irs-pdf/f1040.pdf" },
    { code: "f941", name: "Form 941 - Employer Quarterly Tax Return", url: "https://www.irs.gov/pub/irs-pdf/f941.pdf" },
    { code: "f1099nec", name: "Form 1099-NEC - Nonemployee Compensation", url: "https://www.irs.gov/pub/irs-pdf/f1099nec.pdf" },
    { code: "f8822", name: "Form 8822 - Change of Address", url: "https://www.irs.gov/pub/irs-pdf/f8822.pdf" },
    { code: "f1040es", name: "Form 1040-ES - Estimated Tax for Individuals", url: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf" },
    { code: "f4506t", name: "Form 4506-T - Request for Transcript of Tax Return", url: "https://www.irs.gov/pub/irs-pdf/f4506t.pdf" },
    { code: "f8962", name: "Form 8962 - Premium Tax Credit", url: "https://www.irs.gov/pub/irs-pdf/f8962.pdf" },
    { code: "f2848", name: "Form 2848 - Power of Attorney & Declaration", url: "https://www.irs.gov/pub/irs-pdf/f2848.pdf" }
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (targetUrl) => {
            https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    return request(response.headers.location);
                }
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(dest));
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => reject(err));
            });
        };
        request(url);
    });
}

async function run() {
    console.log("=================================================");
    console.log("🏛️ FETCHING REAL-WORLD IRS PDF FORMS DATASET");
    console.log("=================================================\n");

    for (const item of IRS_FORMS) {
        const destPath = path.join(OUTPUT_DIR, `${item.code}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
        process.stdout.write(`📥 Fetching ${item.code.toUpperCase()} (${item.name})... `);
        try {
            await downloadFile(item.url, destPath);
            const stats = fs.statSync(destPath);
            console.log(`✅ Success (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }

    console.log("\n=================================================");
    console.log(`🎉 OFFICIAL IRS FORMS DATASET DOWNLOADED TO:`);
    console.log(`👉 ${OUTPUT_DIR}`);
    console.log("=================================================");
}

run();
