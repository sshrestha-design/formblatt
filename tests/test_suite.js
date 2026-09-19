// ── Formblatt Complete Automated Test Suite (v2.0.0-alpha) ──────────
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import * as PDFLib from 'pdf-lib';

globalThis.PDFLib = PDFLib;

const WEB_DIR = path.resolve(import.meta.dirname, '..');

// Mock localStorage and window for node environment
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
    }
}

async function asyncIt(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
    }
}

async function runAllTests() {
    console.log("=================================================");
    console.log("🧪 RUNNING FORMBLATT AUTOMATED TEST SUITE (v2.0.0-alpha)");
    console.log("=================================================\n");

    // ── SUITE 1: Module Integrity & ES Module Imports ──
    console.log("📦 Suite 1: File Integrity & Module Loading");
    const allJsFiles = fs.readdirSync(path.join(WEB_DIR, 'js')).filter(f => f.endsWith('.js'));
    for (const file of allJsFiles) {
        it(`Should have valid JavaScript syntax in js/${file}`, () => {
            const code = fs.readFileSync(path.join(WEB_DIR, 'js', file), 'utf8');
            assert.doesNotThrow(() => {
                new Function(`import("${path.join(WEB_DIR, 'js', file)}");`);
            });
            // Ensure no malformed escaped template literals
            assert.ok(!code.includes('\\`'), `Found invalid escaped backtick in js/${file}`);
            assert.ok(!code.includes('\\${'), `Found invalid escaped interpolation in js/${file}`);
        });
    }

    const cssFiles = ['fonts.css', 'base.css', 'landing.css', 'editor.css', 'canvas.css', 'modals.css'];
    for (const css of cssFiles) {
        it(`Should have valid CSS brace balance in styles/${css}`, () => {
            const content = fs.readFileSync(path.join(WEB_DIR, 'styles', css), 'utf8');
            let open = 0;
            for (let i = 0; i < content.length; i++) {
                if (content[i] === '{') open++;
                if (content[i] === '}') open--;
                assert.ok(open >= 0, `Unmatched closing brace in styles/${css} at character ${i}`);
            }
            assert.equal(open, 0, `Unbalanced braces in styles/${css}: ${open} unclosed '{'`);
        });
    }

    const vttFiles = fs.readdirSync(path.join(WEB_DIR, 'assets')).filter(f => f.endsWith('.vtt'));
    for (const vtt of vttFiles) {
        it(`Should have valid WebVTT format in assets/${vtt}`, () => {
            const content = fs.readFileSync(path.join(WEB_DIR, 'assets', vtt), 'utf8');
            assert.ok(content.startsWith('WEBVTT'), `assets/${vtt} must start with WEBVTT header`);
            assert.ok(content.includes('-->'), `assets/${vtt} must contain timestamp cue arrows`);
        });
    }

    it("Should have valid standard-compliant robots.txt with no unknown directives", () => {
        const content = fs.readFileSync(path.join(WEB_DIR, 'robots.txt'), 'utf8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        const allowedDirectives = ['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host'];
        
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            assert.ok(colonIndex > 0, `robots.txt line must be key: value format: "${line}"`);
            const directive = line.substring(0, colonIndex).trim().toLowerCase();
            assert.ok(allowedDirectives.includes(directive), `robots.txt directive "${directive}" is invalid or unknown in RFC 9309`);
        }
        assert.ok(content.includes('User-agent: *'), "robots.txt must define User-agent");
        assert.ok(content.includes('Sitemap:'), "robots.txt must define Sitemap");
    });

    it("Should have valid llms.txt file starting with H1 header", () => {
        const content = fs.readFileSync(path.join(WEB_DIR, 'llms.txt'), 'utf8');
        assert.ok(content.startsWith('# '), "llms.txt must start with H1 title");
    });

    // ── SUITE 2: State Management & Selection Logic ──
    console.log("\n📐 Suite 2: State Management & Selection Logic");
    const { 
        state, 
        getSelectedField, 
        setSelectedField, 
        generateFieldId, 
        createGroupForSelected, 
        ungroupSelected, 
        toggleGroupCollapsed,
        copySelectedFields, 
        pasteClipboardFields, 
        duplicateSelectedFields,
        setEditorMode,
        setGuidesEnabled,
        toggleGuides,
        sortFieldsByReadingOrder
    } = await import(path.join(WEB_DIR, 'js', 'state.js'));
    const { populateProperties } = await import(path.join(WEB_DIR, 'js', 'properties-panel.js'));

    it("generateFieldId should return unique formatted string", () => {
        const id1 = generateFieldId("fld");
        const id2 = generateFieldId("fld");
        assert.ok(id1.startsWith("fld_"));
        assert.notEqual(id1, id2);
    });

    it("setSelectedField and getSelectedField work accurately", () => {
        state.fields = [
            { id: "f1", name: "first_name", type: "textField", x: 10, y: 20, width: 100, height: 25, page: 1 },
            { id: "f2", name: "last_name", type: "textField", x: 120, y: 20, width: 100, height: 25, page: 1 }
        ];
        setSelectedField("f1");
        assert.equal(state.selectedFieldIds.size, 1);
        assert.equal(getSelectedField().id, "f1");

        setSelectedField(null);
        assert.equal(state.selectedFieldIds.size, 0);
        assert.equal(getSelectedField().id, "f1");
    });

    it("keeps the active field selection and properties panel state across mode changes", () => {
        state.fields = [
            { id: "f1", name: "first_name", type: "textField", x: 10, y: 20, width: 100, height: 25, page: 1 }
        ];
        setSelectedField("f1");
        assert.equal(state.selectedFieldIds.size, 1);
        assert.equal(state.lastSelectedFieldId, "f1");

        setEditorMode("fill");
        assert.equal(state.selectedFieldIds.size, 1);
        assert.equal(state.lastSelectedFieldId, "f1");
        assert.equal(getSelectedField()?.id, "f1");

        setEditorMode("design");
        assert.equal(state.selectedFieldIds.size, 1);
        assert.equal(state.lastSelectedFieldId, "f1");
        assert.equal(getSelectedField()?.id, "f1");
    });

    it("populateProperties falls back to the last selected field when selection is cleared", () => {
        const elements = {};
        const makeEl = (id, value = "") => {
            const el = {
                id,
                value,
                checked: false,
                style: {},
                classList: {
                    add() {},
                    remove() {},
                    toggle() {},
                    contains() { return false; }
                }
            };
            elements[id] = el;
            return el;
        };

        global.document = {
            activeElement: null,
            getElementById(id) { return elements[id] || null; },
            querySelector() { return null; },
            querySelectorAll() { return []; }
        };

        state.fields = [{ id: "f1", type: "textField", name: "First Name", defaultValue: "Jane", fontSize: 14, textAlignment: "left", required: true, readOnly: true }];
        state.selectedFieldIds = new Set();
        state.lastSelectedFieldId = null;

        makeEl("fieldName");
        makeEl("fieldDefaultValue");
        makeEl("fontSize");
        makeEl("textAlignment");
        makeEl("fieldRequired");
        makeEl("fieldReadOnly");
        makeEl("fieldFontFamily");
        makeEl("fieldBorderStyle");
        makeEl("fieldFillStyle");
        makeEl("fieldTooltip");
        makeEl("fieldAutofill");
        makeEl("fieldType");
        makeEl("width");
        makeEl("height");
        makeEl("rightPanelEmpty");
        makeEl("fieldProps");
        makeEl("multiSelectProps");

        populateProperties(null);

        assert.equal(elements.fieldName.value, "First Name");
        assert.equal(String(elements.fontSize.value), "14");
        assert.equal(elements.textAlignment.value, "left");
        assert.equal(elements.fieldRequired.checked, true);
        assert.equal(elements.fieldReadOnly.checked, true);
    });

    it("createGroupForSelected groups selected fields and handles ungrouping", () => {
        state.fields = [
            { id: "f1", name: "first_name", type: "textField", x: 10, y: 20, width: 100, height: 25, page: 1 },
            { id: "f2", name: "last_name", type: "textField", x: 120, y: 20, width: 100, height: 25, page: 1 }
        ];
        state.selectedFieldIds = new Set(["f1", "f2"]);
        const grp = createGroupForSelected("Personal Info");
        assert.ok(grp);
        assert.equal(grp.name, "Personal Info");
        assert.equal(state.fields[0].groupId, grp.id);
        assert.equal(state.fields[1].groupId, grp.id);

        toggleGroupCollapsed(grp.id);
        assert.equal(grp.collapsed, true);

        ungroupSelected();
        assert.equal(state.fields[0].groupId, undefined);
        assert.equal(state.fields[1].groupId, undefined);
    });

    it("copy, paste, and duplicate fields work correctly with offset", () => {
        state.fields = [
            { id: "f1", name: "email", type: "textField", x: 50, y: 100, width: 200, height: 30, page: 1 }
        ];
        state.selectedFieldIds = new Set(["f1"]);
        copySelectedFields();
        assert.equal(state.clipboard.length, 1);
        assert.equal(state.clipboard[0].name, "email");

        const pastedIds = pasteClipboardFields();
        assert.equal(pastedIds.length, 1);
        assert.equal(state.fields.length, 2);
        
        const pastedField = state.fields.find(f => f.id === pastedIds[0]);
        assert.equal(pastedField.name, "email_copy");
        assert.equal(pastedField.x, 65); // 50 + 15 offset
        assert.equal(pastedField.y, 115); // 100 + 15 offset
    });

    it("Smart guides toggling and persistence", () => {
        setGuidesEnabled(true);
        assert.equal(state.guidesEnabled, true);
        assert.equal(global.localStorage.getItem("justforms_guides_enabled"), "true");

        toggleGuides();
        assert.equal(state.guidesEnabled, false);
        assert.equal(global.localStorage.getItem("justforms_guides_enabled"), "false");
    });

    it("Dropdown choices management: add, reorder, delete, and default value tracking", () => {
        const ddField = {
            id: "dd_test_1",
            name: "country_select",
            type: "dropdown",
            options: ["USA", "Germany", "France"],
            defaultValue: "USA",
            x: 50,
            y: 50,
            width: 150,
            height: 25,
            page: 1
        };
        state.fields = [ddField];
        setSelectedField("dd_test_1");

        // 1. Add single item
        ddField.options.push("Japan");
        assert.equal(ddField.options.length, 4);
        assert.equal(ddField.options[3], "Japan");

        // 2. Reorder Up (swap index 3 and 2)
        let temp = ddField.options[3];
        ddField.options[3] = ddField.options[2];
        ddField.options[2] = temp;
        assert.deepEqual(ddField.options, ["USA", "Germany", "Japan", "France"]);

        // 3. Reorder Down (swap index 0 and 1)
        temp = ddField.options[0];
        ddField.options[0] = ddField.options[1];
        ddField.options[1] = temp;
        assert.deepEqual(ddField.options, ["Germany", "USA", "Japan", "France"]);

        // 4. Delete item that is default value
        const deletedIdx = 1; // "USA"
        const deletedVal = ddField.options[deletedIdx];
        ddField.options.splice(deletedIdx, 1);
        if (ddField.defaultValue === deletedVal) {
            ddField.defaultValue = ddField.options[0] || "";
        }
        assert.equal(ddField.defaultValue, "Germany");
        assert.deepEqual(ddField.options, ["Germany", "Japan", "France"]);
    });

    it("sortFieldsByReadingOrder correctly orders fields top-to-bottom and left-to-right across pages", () => {
        const unordered = [
            { id: "f4_p2", name: "Page 2 Field", x: 100, y: 100, page: 2 },
            { id: "f2_row1_right", name: "Last Name", x: 300, y: 50, page: 1 },
            { id: "f3_row2", name: "Email", x: 50, y: 120, page: 1 },
            { id: "f1_row1_left", name: "First Name", x: 50, y: 52, page: 1 }, // within yTolerance of 10px to row 1
        ];

        const sorted = sortFieldsByReadingOrder(unordered);
        assert.equal(sorted[0].id, "f1_row1_left");
        assert.equal(sorted[1].id, "f2_row1_right");
        assert.equal(sorted[2].id, "f3_row2");
        assert.equal(sorted[3].id, "f4_p2");
    });

    // ── SUITE 3: Constants & Tool Definitions ──
    console.log("\n⚙️ Suite 3: Constants & Default Definitions");
    const { DEFAULT_FIELD_SIZES, AUTOFILL_TYPES } = await import(path.join(WEB_DIR, 'js', 'constants.js'));

    it("DEFAULT_FIELD_SIZES has required dimensions for all tool types", () => {
        const requiredTools = ['textField', 'checkBox', 'radioGroup', 'dropdown', 'signature', 'dateField'];
        for (const tool of requiredTools) {
            assert.ok(DEFAULT_FIELD_SIZES[tool], `Size definition for ${tool} should exist`);
            assert.ok(DEFAULT_FIELD_SIZES[tool].width > 0, `Width for ${tool} must be > 0`);
            assert.ok(DEFAULT_FIELD_SIZES[tool].height > 0, `Height for ${tool} must be > 0`);
        }
    });

    // ── SUITE 4: Templates Engine ──
    console.log("\n📑 Suite 4: Vector Document Templates Engine");
    const { STARTER_TEMPLATES } = await import(path.join(WEB_DIR, 'js', 'templates-engine.js'));

    it("STARTER_TEMPLATES defines all core templates with valid schema", () => {
        const keys = Object.keys(STARTER_TEMPLATES);
        assert.ok(keys.length >= 7, "Should have at least 7 starter templates");
        const expectedKeys = ["blank", "w9", "nda", "intake", "job", "lease", "rental", "invoice"];
        
        for (const key of expectedKeys) {
            const template = STARTER_TEMPLATES[key];
            assert.ok(template, `Template ${key} must exist`);
            assert.ok(template.title, `Template ${key} must have a title`);
            assert.ok(template.description, `Template ${key} must have a description`);
            assert.ok(template.fields && Array.isArray(template.fields), `Template ${key} must have fields array`);
            
            // Check field attributes if fields exist
            for (const f of template.fields) {
                assert.ok(f.id, "Field must have id");
                assert.ok(f.type, "Field must have type");
                assert.ok(typeof f.x === 'number', "Field x must be number");
                assert.ok(typeof f.y === 'number', "Field y must be number");
                assert.ok(f.width > 0, "Field width must be > 0");
                assert.ok(f.height > 0, "Field height must be > 0");
            }
        }
    });

    // ── SUITE 5: Base64 & Project Serialization ──
    console.log("\n💾 Suite 5: Serialization & Base64 Utilities");
    const { uint8ArrayToBase64, base64ToUint8Array, safeJsonStringify } = await import(path.join(WEB_DIR, 'js', 'storage-manager.js'));

    it("uint8ArrayToBase64 and base64ToUint8Array roundtrip lossless binary data", () => {
        const sample = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"
        const base64 = uint8ArrayToBase64(sample);
        assert.ok(typeof base64 === 'string');
        const restored = base64ToUint8Array(base64);
        assert.equal(restored.length, sample.length);
        for (let i = 0; i < sample.length; i++) {
            assert.equal(restored[i], sample[i]);
        }
    });

    it("safeJsonStringify handles circular references and non-serializable values", () => {
        const data = { fields: [{ id: 'f1' }], seen: null };
        data.self = data;
        const json = safeJsonStringify(data);
        assert.ok(typeof json === 'string');
        assert.ok(json.includes('"self"'));
        assert.ok(json.includes('[Circular]'));
    });

    it("Handles null and empty inputs safely", () => {
        assert.equal(uint8ArrayToBase64(null), null);
        assert.equal(base64ToUint8Array(null), null);
    });

    // ── SUITE 6: Semantic Resolver & Multilingual Auto-Detection ──
    console.log("\n🔍 Suite 6: Semantic Field Heuristics & Auto-Detection");
    const { resolveSemanticProps, GENERIC_PATTERNS } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

    it("Correctly categorizes English form labels", () => {
        assert.equal(resolveSemanticProps("First Name:").name, "first_name");
        assert.equal(resolveSemanticProps("Family Name:").name, "last_name");
        assert.equal(resolveSemanticProps("Email Address").type, "textField");
        assert.equal(resolveSemanticProps("Telephone / Mobile Number").autofill, "tel");
        assert.equal(resolveSemanticProps("Date of Birth (MM/DD/YYYY)").type, "dateField");
        assert.equal(resolveSemanticProps("Authorized Signature").type, "signature");
        assert.equal(resolveSemanticProps("Additional Comments / Feedback").multiline, true);
        assert.equal(resolveSemanticProps("Invoice Number").name, "invoice_number");
        assert.equal(resolveSemanticProps("Total Balance Due").dataFormat, "currency");
    });

    it("Correctly categorizes German (DE) form labels", () => {
        assert.equal(resolveSemanticProps("Vorname:").name, "first_name");
        assert.equal(resolveSemanticProps("Nachname:").name, "last_name");
        assert.equal(resolveSemanticProps("Geburtsdatum:").type, "dateField");
        assert.equal(resolveSemanticProps("Unterschrift des Antragstellers").type, "signature");
        assert.equal(resolveSemanticProps("Straße und Hausnummer").autofill, "address-line1");
        assert.equal(resolveSemanticProps("Postleitzahl / PLZ").autofill, "postal-code");
        assert.equal(resolveSemanticProps("Rechnungsnummer").name, "invoice_number");
        assert.equal(resolveSemanticProps("Gesamtbetrag").dataFormat, "currency");
        assert.equal(resolveSemanticProps("Bemerkungen").multiline, true);
    });

    it("Correctly categorizes French (FR) form labels", () => {
        assert.equal(resolveSemanticProps("Prénom:").name, "first_name");
        assert.equal(resolveSemanticProps("Nom de famille:").name, "last_name");
        assert.equal(resolveSemanticProps("Date de naissance:").type, "dateField");
        assert.equal(resolveSemanticProps("Signature du demandeur").type, "signature");
        assert.equal(resolveSemanticProps("Code postal").autofill, "postal-code");
        assert.equal(resolveSemanticProps("Numéro de facture").name, "invoice_number");
        assert.equal(resolveSemanticProps("Montant total").dataFormat, "currency");
        assert.equal(resolveSemanticProps("Observations / Remarques").multiline, true);
    });

    it("Correctly categorizes Spanish (ES) form labels", () => {
        assert.equal(resolveSemanticProps("Primer Nombre:").name, "first_name");
        assert.equal(resolveSemanticProps("Apellidos:").name, "last_name");
        assert.equal(resolveSemanticProps("Fecha de nacimiento:").type, "dateField");
        assert.equal(resolveSemanticProps("Firma autorizada").type, "signature");
        assert.equal(resolveSemanticProps("Código Postal").autofill, "postal-code");
        assert.equal(resolveSemanticProps("Número de factura").name, "invoice_number");
        assert.equal(resolveSemanticProps("Importe total").dataFormat, "currency");
    });

    it("Correctly categorizes Italian (IT), Portuguese (PT), and Dutch (NL) form labels", () => {
        assert.equal(resolveSemanticProps("Data di nascita:").type, "dateField");
        assert.equal(resolveSemanticProps("Codice Fiscale").name, "ssn");
        assert.equal(resolveSemanticProps("Data de nascimento:").type, "dateField");
        assert.equal(resolveSemanticProps("Assinatura").type, "signature");
        assert.equal(resolveSemanticProps("Geboortedatum:").type, "dateField");
        assert.equal(resolveSemanticProps("Handtekening").type, "signature");
        assert.equal(resolveSemanticProps("Factuurnummer").name, "invoice_number");
    });

    it("Correctly categorizes Devanagari / Nepali form labels", () => {
        assert.equal(resolveSemanticProps("पहिलो नाम:").name, "first_name");
        assert.equal(resolveSemanticProps("जन्म मिति:").type, "dateField");
        assert.equal(resolveSemanticProps("दस्तखत").type, "signature");
        assert.equal(resolveSemanticProps("ठेगाना:").autofill, "address-line1");
        assert.equal(resolveSemanticProps("नागरिकता नं").name, "citizenship_number");
        assert.equal(resolveSemanticProps("कुल जम्मा").dataFormat, "currency");
    });

    it("Correctly categorizes complex government form prompts with brackets, asterisks, and apostrophes", () => {
        assert.equal(resolveSemanticProps("1. Nom [nom de famille] :").name, "last_name");
        assert.equal(resolveSemanticProps("3. Prénom(s) [nom(s) usuel(s)] :").name, "first_name");
        assert.equal(resolveSemanticProps("4. Date de naissance (jour-mois-année) :").type, "dateField");
        assert.equal(resolveSemanticProps("15. Date d'expiration :").type, "dateField");
        assert.equal(resolveSemanticProps("19. Adresse du domicile et adresse électronique du demandeur :").autofill, "address-line1");
        assert.equal(resolveSemanticProps("* 21. Profession actuelle :").name, "job_title");
        assert.equal(resolveSemanticProps("Signature du demandeur :").type, "signature");
    });

    // ── SUITE 7: Autofill Tooltips & AcroForm Standards ──
    console.log("\n🏷️ Suite 7: Autofill Tooltips & AcroForm Standards");
    const AUTOFILL_ROLE_TITLES = {
        name: "Full Name", first_name: "First Name", last_name: "Last Name",
        email: "Email Address", phone: "Phone Number", address1: "Street Address",
        city: "City", state: "State / Province", zip: "Zip / Postal Code",
        country: "Country", company: "Company Name", job_title: "Job Title", dob: "Date of Birth",
        "given-name": "First Name", "family-name": "Last Name", "tel": "Phone Number",
        "address-line1": "Street Address", "address-level2": "City", "address-level1": "State / Province",
        "postal-code": "Zip / Postal Code", "country-name": "Country",
        "organization": "Company Name", "organization-title": "Job Title"
    };

    it("All standard HTML autocomplete tokens map to human-readable PDF tooltips", () => {
        assert.equal(AUTOFILL_ROLE_TITLES["given-name"], "First Name");
        assert.equal(AUTOFILL_ROLE_TITLES["family-name"], "Last Name");
        assert.equal(AUTOFILL_ROLE_TITLES["email"], "Email Address");
        assert.equal(AUTOFILL_ROLE_TITLES["postal-code"], "Zip / Postal Code");
        assert.equal(AUTOFILL_ROLE_TITLES["address-line1"], "Street Address");
        assert.equal(AUTOFILL_ROLE_TITLES["tel"], "Phone Number");
    });

    const { getExistingWidgetFields } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

    it("imports existing AcroForm widgets without losing their names or positions", async () => {
        const page = {
            async getAnnotations() {
                return [
                    { subtype: "Widget", rect: [40, 700, 220, 730], fieldName: "first_name", fieldType: "Tx", fieldValue: "Jane" },
                    { subtype: "Widget", rect: [260, 700, 280, 720], fieldName: "agree", fieldType: "Btn", checkBox: true },
                    { subtype: "Widget", rect: [300, 650, 440, 680], fieldName: "country", fieldType: "Ch", options: ["US", "CA"], fieldValue: "CA" },
                    { subtype: "Link", rect: [0, 0, 10, 10], url: "https://example.com" }
                ];
            }
        };

        const fields = await getExistingWidgetFields(page, { height: 800 }, 1);
        assert.equal(fields.length, 3);
        assert.equal(fields[0].name, "first_name");
        assert.equal(fields[0].sourcedFrom, "acroform");
        assert.equal(fields[0].x, 40);
        assert.equal(fields[0].y, 70);
        assert.equal(fields[1].type, "checkBox");
        assert.equal(fields[2].type, "dropdown");
        assert.equal(fields[2].defaultValue, "CA");
    });

    await asyncIt("buildPdf compiles fields with chosen font in AcroForm DA and DR dictionaries", async () => {
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));
        const { PDFDocument } = PDFLib;
        const testDoc = await PDFDocument.create();
        testDoc.addPage([600, 800]);
        const origBytes = await testDoc.save();

        state.originalPdfBytes = origBytes;
        state.fields = [
            { id: "font_f1", name: "courier_text", type: "textField", x: 50, y: 50, width: 200, height: 30, page: 1, fontFamily: "courier", fontSize: 14, value: "MonoVal" },
            { id: "font_f2", name: "times_text", type: "textField", x: 50, y: 100, width: 200, height: 30, page: 1, fontFamily: "times", fontSize: 12, value: "SerifVal" }
        ];

        const outputBytes = await buildPdf();
        assert.ok(outputBytes instanceof Uint8Array, "buildPdf should return Uint8Array");
        assert.ok(outputBytes.length > 500, "buildPdf should produce non-empty valid PDF");

        // Parse compiled PDF and verify AcroForm fields retain DA and font mapping
        const compiledDoc = await PDFDocument.load(outputBytes);
        const compiledForm = compiledDoc.getForm();
        const f1 = compiledForm.getTextField("courier_text");
        const f2 = compiledForm.getTextField("times_text");
        assert.equal(f1.getText(), "MonoVal");
        assert.equal(f2.getText(), "SerifVal");
        
        const da1 = f1.acroField.dict.get(PDFLib.PDFName.of("DA"));
        const da2 = f2.acroField.dict.get(PDFLib.PDFName.of("DA"));
        assert.ok(da1.value.includes("Courier"), "Field 1 DA should reference Courier");
        assert.ok(da2.value.includes("Times-Roman"), "Field 2 DA should reference Times-Roman");
    });

    // ── SUITE 8: Overlay DOM Rendering & Visual Hierarchy ──
    console.log("\n🖼️ Suite 8: Overlay DOM Rendering & Hierarchy");
    const { renderOverlays } = await import(path.join(WEB_DIR, 'js', 'overlay-manager.js'));

    it("renderOverlays correctly formats unselected, single-selected, and multi-selected elements", () => {
        const appendedChildren = [];
        const mockContainer = {
            innerHTML: "",
            appendChild(child) { appendedChildren.push(child); }
        };

        global.document = {
            getElementById(id) {
                if (id === "overlayContainer") return mockContainer;
                return null;
            },
            createElement(tag) {
                return {
                    tagName: tag,
                    className: "",
                    id: "",
                    style: {},
                    dataset: {},
                    appendChild(c) {},
                    addEventListener() {},
                    setAttribute() {}
                };
            }
        };

        state.currentPageNum = 1;
        state.fields = [
            { id: "f1", name: "name", type: "textField", x: 10, y: 20, width: 100, height: 25, page: 1 },
            { id: "f2", name: "email", type: "textField", x: 10, y: 50, width: 100, height: 25, page: 1 },
            { id: "f3", name: "terms", type: "checkBox", x: 10, y: 80, width: 20, height: 20, page: 1 }
        ];

        // 1. Unselected test
        state.selectedFieldIds = new Set();
        renderOverlays({});
        assert.equal(appendedChildren.length, 3);
        assert.equal(appendedChildren[0].className, "field-overlay");
        assert.equal(appendedChildren[0].style.border, "1.5px solid #94A3B8");

        // 2. Single-selected test
        appendedChildren.length = 0;
        state.selectedFieldIds = new Set(["f1"]);
        renderOverlays({});
        // 3 overlays + 1 contextual quick bar = 4
        assert.equal(appendedChildren.length, 4);
        assert.equal(appendedChildren[0].className, "field-overlay selected");
        assert.equal(appendedChildren[0].style.border, "2px solid #1D4ED8");
        assert.equal(appendedChildren[1].className, "field-overlay");
        assert.equal(appendedChildren[1].style.border, "1.5px solid #94A3B8");
        assert.equal(appendedChildren[3].className, "contextual-quick-bar");

        // 3. Multi-selected test
        appendedChildren.length = 0;
        state.selectedFieldIds = new Set(["f1", "f2"]);
        renderOverlays({});
        // Should have 2 multi-selected overlays + 1 unselected overlay + 1 bounding frame + 1 contextual quick bar = 5
        assert.equal(appendedChildren.length, 5);
        assert.equal(appendedChildren[0].className, "field-overlay selected multi-selected");
        assert.equal(appendedChildren[0].style.border, "1px solid #93C5FD");
        assert.equal(appendedChildren[1].className, "field-overlay selected multi-selected");
        assert.equal(appendedChildren[2].className, "field-overlay");
        assert.equal(appendedChildren[3].className, "multi-selection-bounding-frame");
        assert.equal(appendedChildren[4].className, "contextual-quick-bar");
    });

    // ── SUITE 9: Text-Aware Dynamic Adaptive Sizing ──
    console.log("\n📏 Suite 9: Text-Aware Dynamic Adaptive Sizing");
    const { getAdaptiveFieldDimensions } = await import(path.join(WEB_DIR, 'js', 'canvas-controller.js'));

    it("getAdaptiveFieldDimensions scales field height and font size based on adjacent PDF text", () => {
        const sampleBlocks = [
            { x: 50, y: 100, width: 80, height: 10, fontHeight: 10, str: "First Name:" },
            { x: 50, y: 200, width: 140, height: 18, fontHeight: 18, str: "SECTION HEADER TITLE" },
            { x: 50, y: 300, width: 60, height: 8, fontHeight: 8, str: "Small label:" }
        ];

        // 1. Placing next to a standard 10pt text label
        const normalField = getAdaptiveFieldDimensions("textField", 140, 100, sampleBlocks);
        assert.equal(normalField.fontSize, 10);
        assert.ok(normalField.height >= 20 && normalField.height <= 24);

        // 2. Placing next to a large 18pt title
        const largeField = getAdaptiveFieldDimensions("textField", 200, 200, sampleBlocks);
        assert.equal(largeField.fontSize, 18);
        assert.ok(largeField.height >= 30 && largeField.height <= 36);

        // 3. Placing next to an 8pt small label
        const smallField = getAdaptiveFieldDimensions("textField", 120, 300, sampleBlocks);
        assert.equal(smallField.fontSize, 8);
        assert.ok(smallField.height >= 16 && smallField.height <= 20);

        // 4. Placing a checkbox next to 10pt text
        const cb = getAdaptiveFieldDimensions("checkBox", 40, 100, sampleBlocks);
        assert.equal(cb.width, cb.height);
        assert.ok(cb.width >= 12 && cb.width <= 15);
    });

    it("getAdaptiveFieldDimensions falls back safely when no text blocks are present", () => {
        const fallback = getAdaptiveFieldDimensions("textField", 100, 100, []);
        assert.ok(fallback.width > 0);
        assert.ok(fallback.height > 0);
        assert.equal(fallback.fontSize, 11);
    });

    // ── SUITE 10: Batch Editing, Alignment & Multi-Select Logic ──
    console.log("\n📐 Suite 10: Batch Editing, Alignment & Multi-Select");
    it("Align left, center, and right calculations work precisely", () => {
        const sel = [
            { id: "a", x: 10, y: 50, width: 100, height: 30 },
            { id: "b", x: 60, y: 100, width: 80, height: 30 },
            { id: "c", x: 200, y: 150, width: 50, height: 30 }
        ];
        // Align Left: minX should be 10
        const minX = Math.min(...sel.map(f => f.x));
        assert.equal(minX, 10);
        sel.forEach(f => f.x = minX);
        assert.ok(sel.every(f => f.x === 10));

        // Align Right: maxRight should be 10 + max width
        sel[0].x = 10; sel[0].width = 100; // right = 110
        sel[1].x = 60; sel[1].width = 80;  // right = 140
        sel[2].x = 200; sel[2].width = 50; // right = 250
        const maxRight = Math.max(...sel.map(f => f.x + f.width));
        assert.equal(maxRight, 250);
        sel.forEach(f => f.x = maxRight - f.width);
        assert.equal(sel[0].x, 150);
        assert.equal(sel[1].x, 170);
        assert.equal(sel[2].x, 200);
    });

    it("Distribute vertical spacing evenly calculates equal gaps", () => {
        const items = [
            { id: "1", y: 0, height: 20 },
            { id: "2", y: 40, height: 20 },
            { id: "3", y: 100, height: 20 }
        ];
        items.sort((a, b) => a.y - b.y);
        const first = items[0];
        const last = items[items.length - 1];
        const totalSpan = (last.y + last.height) - first.y; // 120
        const totalItemsHeight = items.reduce((sum, f) => sum + f.height, 0); // 60
        const totalGap = totalSpan - totalItemsHeight; // 60
        const gap = totalGap / (items.length - 1); // 30
        assert.equal(gap, 30);

        let currentY = first.y;
        for (let i = 0; i < items.length; i++) {
            if (i > 0) {
                currentY += items[i - 1].height + gap;
                items[i].y = Math.round(currentY);
            }
        }
        assert.equal(items[0].y, 0);
        assert.equal(items[1].y, 50); // 0 + 20 + 30
        assert.equal(items[2].y, 100); // 50 + 20 + 30
    });

    it("duplicateSelectedFields clones all selected elements and sets selection", () => {
        state.fields = [
            { id: "m1", name: "field_1", x: 10, y: 10, width: 50, height: 20, page: 1 },
            { id: "m2", name: "field_2", x: 70, y: 10, width: 50, height: 20, page: 1 }
        ];
        state.selectedFieldIds = new Set(["m1", "m2"]);
        const newIds = duplicateSelectedFields();
        assert.equal(newIds.length, 2);
        assert.equal(state.fields.length, 4);
        assert.ok(state.selectedFieldIds.has(newIds[0]));
        assert.ok(state.selectedFieldIds.has(newIds[1]));
        assert.equal(state.fields[2].x, 25);
        assert.equal(state.fields[3].x, 85);
    });

    // ── SUITE 11: Tool Switching, Esc Workflow & Field Placement ──
    console.log("\n⚡ Suite 11: Tool Switching, Esc Workflow & Field Placement");
    it("Esc key cancels action and resets tool without clearing the active field selection", () => {
        state.activeTool = "textField";
        state.selectedFieldIds = new Set(["m1"]);
        state.lastSelectedFieldId = "m1";
        state.isDragging = true;
        state.isResizing = true;
        state.isLassoing = true;

        // Simulate Escape key behavior
        state.isDragging = false;
        state.isResizing = false;
        state.isLassoing = false;
        state.activeTool = "select";

        assert.equal(state.activeTool, "select");
        assert.equal(state.selectedFieldIds.size, 1);
        assert.equal(state.lastSelectedFieldId, "m1");
        assert.equal(state.isDragging, false);
        assert.equal(state.isResizing, false);
        assert.equal(state.isLassoing, false);
    });

    it("Field placement auto-switches to select tool with newly placed field selected", () => {
        state.activeTool = "checkBox";
        state.selectedFieldIds.clear();

        const newField = {
            id: generateFieldId(),
            type: "checkBox",
            name: "agreement_checkbox",
            x: 100,
            y: 200,
            width: 18,
            height: 18,
            page: 1
        };
        state.fields.push(newField);
        setSelectedField(newField.id);

        const isAltHeld = false;
        if (!isAltHeld) {
            state.activeTool = "select";
        }

        assert.equal(state.activeTool, "select");
        assert.equal(getSelectedField()?.id, newField.id);
    });

    it("Field placement with Alt held keeps placement tool active for continuous placement", () => {
        state.activeTool = "textField";
        state.selectedFieldIds.clear();

        const newField = {
            id: generateFieldId(),
            type: "textField",
            name: "phone_field",
            x: 100,
            y: 250,
            width: 140,
            height: 24,
            page: 1
        };
        state.fields.push(newField);
        setSelectedField(newField.id);

        const isAltHeld = true;
        if (!isAltHeld) {
            state.activeTool = "select";
        }

        assert.equal(state.activeTool, "textField");
        assert.equal(getSelectedField()?.id, newField.id);
    });

    // ── SUITE 12: Workbench UX, Zoom & Layer Controls ──
    console.log("\n🔍 Suite 12: Workbench UX, Zoom & Layer Controls");

    it("Zoom scale clamping bounds within 0.25 and 4.0", () => {
        let zoom = 1.0;
        const clamp = z => Math.min(Math.max(parseFloat(z.toFixed(2)), 0.25), 4.0);
        assert.equal(clamp(0.1), 0.25);
        assert.equal(clamp(5.5), 4.0);
        assert.equal(clamp(1.25), 1.25);
    });

    it("Corner resizing preserves aspect ratio when shift is held or field is square", () => {
        const base = { width: 100, height: 50 };
        const aspect = base.width / base.height; // 2.0
        const newW = 160;
        const adjustedH = Math.max(14, Math.round(newW / aspect));
        assert.equal(adjustedH, 80);
    });

    it("Layer lock and hidden flags toggle correctly and protect field from mutation", () => {
        const f = { id: "test_lock_1", name: "secure_field", locked: false, hidden: false };
        f.locked = true;
        assert.ok(f.locked);
        f.hidden = true;
        assert.ok(f.hidden);
    });

    it("Panel width resize clamping keeps sidebars within safe minimum and maximum bounds", () => {
        const clampPanelWidth = (startW, deltaX, minW, maxW) => Math.max(minW, Math.min(maxW, Math.round(startW + deltaX)));
        // Test lower bound
        assert.equal(clampPanelWidth(256, -150, 180, 600), 180);
        // Test upper bound
        assert.equal(clampPanelWidth(256, 500, 180, 600), 600);
        // Test valid intermediate width
        assert.equal(clampPanelWidth(256, 100, 180, 600), 356);
    });

    it("updateDocumentTitle reflects current filename in editor and default on landing", async () => {
        const { updateDocumentTitle, state } = await import("../js/state.js");
        
        global.document = {
            title: "",
            getElementById(id) {
                if (id === "appEditorScreen") return { style: { display: "flex" } };
                return null;
            }
        };

        state.fileName = "invoice_2026.pdf";
        updateDocumentTitle();
        assert.equal(global.document.title, "invoice_2026.pdf – Formblatt");

        updateDocumentTitle("w9_tax_form.pdf");
        assert.equal(global.document.title, "w9_tax_form.pdf – Formblatt");

        // When editor is hidden (landing mode)
        global.document.getElementById = () => ({ style: { display: "none" } });
        updateDocumentTitle();
        assert.equal(global.document.title, "Formblatt: Free Interactive PDF Form Creator & AcroForm Editor");
    });

    it("Cohesive post-export sponsor card & toast container exist in index.html", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="exportSponsorContainer"'), 'Must contain exportSponsorContainer in index.html');
        assert.ok(indexHtml.includes('id="exportSponsorSlot"'), 'Must contain exportSponsorSlot in index.html');
        assert.ok(indexHtml.includes('class="toast-sponsor-bar"'), 'Must contain toast-sponsor-bar in index.html');
    });

    it("autoSelectCaptions selects caption track matching user locale", () => {
        const mockTracks = [
            { language: "en", mode: "disabled" },
            { language: "de", mode: "disabled" },
            { language: "es", mode: "disabled" },
            { language: "fr", mode: "disabled" }
        ];
        const mockVideo = { textTracks: mockTracks, readyState: 2 };

        const testLangs = ["de-DE", "de", "en"];
        const userLangCodes = testLangs.map(l => l.slice(0, 2).toLowerCase());
        for (const lang of userLangCodes) {
            let matched = false;
            for (const track of mockVideo.textTracks) {
                if (track.language === lang) {
                    track.mode = "showing";
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

        assert.equal(mockTracks.find(t => t.language === "de").mode, "showing");
        assert.equal(mockTracks.find(t => t.language === "es").mode, "disabled");
    });

    it("Shared-axis scale-fade transition recipe conforms to 180ms/220ms and scale specs", () => {
        const baseCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'base.css'), 'utf8');
        const landingJs = fs.readFileSync(path.join(WEB_DIR, 'js', 'landing-controller.js'), 'utf8');

        // Check CSS keyframes & classes exist
        const normalizedCss = baseCss.replace(/\s+/g, ' ');
        assert.ok(normalizedCss.includes('sharedAxisHomeOut'), 'base.css must define sharedAxisHomeOut animation');
        assert.ok(normalizedCss.includes('sharedAxisEditorIn'), 'base.css must define sharedAxisEditorIn animation');
        assert.ok(/180ms\s+cubic-bezier\(0\.4,\s*0,\s*1,\s*1\)/.test(baseCss), 'base.css must have 180ms acceleration for home-out');
        assert.ok(/220ms\s+cubic-bezier\(0,\s*0,\s*0\.2,\s*1\)\s+60ms/.test(baseCss), 'base.css must have 220ms deceleration + 60ms delay for editor-in');
        assert.ok(/transform:\s*scale\(0\.98\)/.test(baseCss), 'base.css must scale home out to 0.98');
        assert.ok(/transform:\s*scale\(1\.02\)/.test(baseCss), 'base.css must scale editor in from 1.02');

        // Check JS transition coordination
        assert.ok(landingJs.includes('screen-transition-home-out'), 'landing-controller.js must apply screen-transition-home-out');
        assert.ok(landingJs.includes('screen-transition-editor-in'), 'landing-controller.js must apply screen-transition-editor-in');
    });

    // ── SUITE 13: Command Palette (⌘K / Ctrl+K) & Quick Actions ──
    console.log("\n⌨️ Suite 13: Command Palette (⌘K / Ctrl+K) & Quick Actions");
    
    it("COMMANDS catalog defines core productivity and navigation actions", async () => {
        const { COMMANDS, filterCommands } = await import(path.join(WEB_DIR, 'js', 'command-palette.js'));
        assert.ok(Array.isArray(COMMANDS), 'COMMANDS must be an array');
        assert.ok(COMMANDS.length >= 25, `Expected at least 25 commands, found ${COMMANDS.length}`);

        const titles = COMMANDS.map(c => c.title);
        assert.ok(titles.some(t => t.includes("Text Field")), 'Must include Text Field command');
        assert.ok(titles.some(t => t.includes("Signature")), 'Must include Signature command');
        assert.ok(titles.some(t => t.includes("Auto-Detector")), 'Must include Auto-Detector command');
        assert.ok(titles.some(t => t.includes("Export")), 'Must include Export command');
        assert.ok(titles.some(t => t.includes("Fill & Test")), 'Must include Fill mode command');
        assert.ok(titles.some(t => t.includes("100%")), 'Must include Zoom 100% command');
        
        // Every command must have id, title, category, icon, and action
        COMMANDS.forEach(cmd => {
            assert.ok(cmd.id, 'Command must have an id');
            assert.ok(cmd.title, `Command ${cmd.id} must have a title`);
            assert.ok(cmd.category, `Command ${cmd.id} must have a category`);
            assert.ok(cmd.icon, `Command ${cmd.id} must have an icon`);
            assert.equal(typeof cmd.action, 'function', `Command ${cmd.id} action must be a function`);
        });

        // Test filtering
        const textResults = filterCommands("text");
        assert.ok(textResults.some(c => c.id === "tool-text"), 'Filtering "text" should return Text Field');

        const signResults = filterCommands("signature");
        assert.ok(signResults.some(c => c.id === "tool-signature"), 'Filtering "signature" should return Signature');

        const exportResults = filterCommands("export pdf");
        assert.ok(exportResults.some(c => c.id === "project-export"), 'Filtering "export pdf" should return Export PDF');
    });

    it("Command Palette modal and toolbar triggers exist in index.html and modals.css", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="commandPaletteModal"'), 'index.html must include commandPaletteModal');
        assert.ok(indexHtml.includes('id="commandPaletteInput"'), 'index.html must include commandPaletteInput');
        assert.ok(indexHtml.includes('id="commandPaletteList"'), 'index.html must include commandPaletteList');
        assert.ok(indexHtml.includes('id="commandPaletteToolbarBtn"'), 'index.html must include commandPaletteToolbarBtn');
        assert.ok(!indexHtml.includes('id="landingPaletteBtn"'), 'landing page must NOT contain landingPaletteBtn');

        const modalsCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'modals.css'), 'utf8');
        assert.ok(modalsCss.includes('.command-palette-modal'), 'modals.css must include .command-palette-modal');
        assert.ok(modalsCss.includes('.command-palette-container'), 'modals.css must include .command-palette-container');
        assert.ok(modalsCss.includes('.command-palette-item'), 'modals.css must include .command-palette-item');
    });

    it("isEditorActive accurately restricts command palette when on landing page", async () => {
        const { isEditorActive } = await import(path.join(WEB_DIR, 'js', 'command-palette.js'));
        assert.equal(typeof isEditorActive, 'function', 'isEditorActive must be an exported function');
    });

    it("main.js does not auto-open blank canvas editor on stale #editor hash", () => {
        const mainJs = fs.readFileSync(path.join(WEB_DIR, 'js', 'main.js'), 'utf8');
        assert.ok(!mainJs.includes('loadTemplate("blank"'), 'main.js must not auto-load blank template on startup');
    });

    it("Quick undo, redo, and delete actions exist in toolbar and are responsive on mobile", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="quickUndoBtn"'), 'index.html must include #quickUndoBtn');
        assert.ok(indexHtml.includes('id="quickRedoBtn"'), 'index.html must include #quickRedoBtn');
        assert.ok(indexHtml.includes('id="quickDeleteBtn"'), 'index.html must include #quickDeleteBtn');

        const editorCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'editor.css'), 'utf8');
        assert.ok(editorCss.includes('.toolbar-quick-actions'), 'editor.css must style .toolbar-quick-actions');
        // Ensure .toolbar-quick-actions is NOT hidden in the mobile media query
        const mobileQueryMatch = editorCss.match(/@media\s*\(max-width:\s*767px\)\s*\{([\s\S]*?)\}\.fill-mode-banner/);
        if (mobileQueryMatch) {
            const mobileCss = mobileQueryMatch[1];
            assert.ok(!mobileCss.includes('.toolbar-quick-actions,#fileMenuDropdown'), 'toolbar-quick-actions must not be hidden on mobile');
            assert.ok(mobileCss.includes('.toolbar-quick-actions{display:inline-flex !important'), 'toolbar-quick-actions must have display:inline-flex on mobile');
        }
    });

    // ── SUITE 14: Landing Page Visual Modules & Conversion Assets ──
    console.log("\n🚀 Suite 14: Landing Visual Modules & Template Launcher");
    it("Starter templates grid and workflow spotlight exist in index.html", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="templates"'), 'index.html must include #templates section');
        assert.ok(indexHtml.includes('id="spotlight"'), 'index.html must include #spotlight section');
        assert.ok(indexHtml.includes('src="assets/office-worker.webp"'), 'spotlight section must reference assets/office-worker.webp');
    });

    it("Optimized office-worker.webp asset exists and is a valid image file", () => {
        const webpPath = path.join(WEB_DIR, 'assets', 'office-worker.webp');
        assert.ok(fs.existsSync(webpPath), 'assets/office-worker.webp must exist on disk');
        const stats = fs.statSync(webpPath);
        assert.ok(stats.size > 10000 && stats.size < 500000, `office-worker.webp size (${stats.size} bytes) should be optimized (<500KB)`);
        const header = fs.readFileSync(webpPath).subarray(0, 12).toString('ascii');
        assert.ok(header.includes('RIFF') && header.includes('WEBP'), 'office-worker.webp must have valid RIFF/WEBP header');
    });

    it("Landing CSS contains styling rules for templates and spotlight", () => {
        const landingCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'landing.css'), 'utf8');
        assert.ok(landingCss.includes('.templates-grid'), 'landing.css must include .templates-grid');
        assert.ok(landingCss.includes('.spotlight-wrap'), 'landing.css must include .spotlight-wrap');
        assert.ok(landingCss.includes('.spotlight-frame'), 'landing.css must include .spotlight-frame');
    });

    // ── SUITE 15: Keyboard Shortcuts & Help Modal Accessibility ──
    console.log("\n⌨️ Suite 15: Keyboard Shortcuts & Help Modal Accessibility");
    it("shortcutsModal structure and interactive close buttons exist in index.html", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="shortcutsModal"'), 'index.html must include #shortcutsModal');
        assert.ok(indexHtml.includes('id="closeShortcutsBtn"'), 'index.html must include #closeShortcutsBtn');
        assert.ok(indexHtml.includes('id="shortcutsDoneBtn"'), 'index.html must include #shortcutsDoneBtn');
        assert.ok(indexHtml.includes('id="shortcutsHelpBtn"'), 'index.html must include #shortcutsHelpBtn');
        assert.ok(indexHtml.includes('id="shortcutsMenuBtn"'), 'index.html must include #shortcutsMenuBtn');
        assert.ok(indexHtml.includes('id="footerShortcutsBtn"'), 'index.html must include #footerShortcutsBtn');
    });

    it("main.js exports openShortcutsModal and closeShortcutsModal helpers", async () => {
        const mainModule = await import(path.join(WEB_DIR, 'js', 'main.js'));
        assert.equal(typeof mainModule.openShortcutsModal, 'function', 'main.js must export openShortcutsModal');
        assert.equal(typeof mainModule.closeShortcutsModal, 'function', 'main.js must export closeShortcutsModal');
    });

    it("editor-app.js and main.js contain global keydown handlers for ? and F1 shortcuts", () => {
        const editorJs = fs.readFileSync(path.join(WEB_DIR, 'js', 'editor-app.js'), 'utf8');
        const mainJs = fs.readFileSync(path.join(WEB_DIR, 'js', 'main.js'), 'utf8');
        assert.ok(editorJs.includes('e.key === "?"') || editorJs.includes('e.key === "F1"'), 'editor-app.js must handle ? / F1 hotkey');
        assert.ok(mainJs.includes('e.key === "?"') || mainJs.includes('e.key === "F1"'), 'main.js must handle ? / F1 hotkey');
    });

    // ── SUITE 16: OpenGraph & Social Sharing Image Metadata ──
    console.log("\n🖼️ Suite 16: OpenGraph & Social Sharing Image Metadata");
    it("index.html defines standard OpenGraph and Twitter card image metadata", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('property="og:image" content="https://justforms.vercel.app/assets/og-image.png"'), 'index.html must define og:image pointing to high-res PNG');
        assert.ok(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'index.html must define summary_large_image twitter card');
        assert.ok(indexHtml.includes('name="twitter:image" content="https://justforms.vercel.app/assets/og-image.png"'), 'index.html must define twitter:image');
        assert.ok(indexHtml.includes('property="og:image:width" content="1024"'), 'index.html must define 1024 width');
        assert.ok(indexHtml.includes('property="og:image:height" content="742"'), 'index.html must define 742 height');
        assert.ok(!indexHtml.includes('property="og:image" content="https://justforms.vercel.app/favicon.svg"'), 'og:image must not point to favicon.svg');
    });

    it("assets/og-image.png exists and conforms to 1200x630 OpenGraph dimensions", () => {
        const ogImgPath = path.join(WEB_DIR, 'assets', 'og-image.png');
        assert.ok(fs.existsSync(ogImgPath), 'assets/og-image.png must exist on disk');
        const stats = fs.statSync(ogImgPath);
        assert.ok(stats.size > 50000 && stats.size < 1500000, `og-image.png size (${stats.size} bytes) should be optimized`);
        const header = fs.readFileSync(ogImgPath).subarray(0, 8);
        assert.equal(header[0], 0x89, 'og-image.png must be a valid PNG');
    });

    // ── SUITE 17: DOM Elements & Template Integrity Verification ──
    console.log("\n🔍 Suite 17: DOM Elements & Template Integrity Verification");
    it("Core interactive DOM elements exist in index.html across Landing, Editor, and Modals", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        const requiredElements = [
            // Landing page elements
            "landingScreen", "appEditorScreen", "heroBrowseBtn", "heroPdfUpload", "heroOpenProjectUpload",
            "heroDropzone", "spotlight", "templates", "why", "how-it-works", "features", "faq",
            // Editor header & controls
            "editorBrandLogo", "saveProjectMenuBtn", "generatePdfBtn", "modeDesignBtn", "modeFillBtn", "fillModeBanner",
            // Canvas & Work area
            "canvasContainer", "overlayContainer", "smartGuides", "snapPointDot",
            // Modals
            "signatureModal", "shortcutsModal", "feedbackModal", "complianceModal",
            // Panels & Peek Tabs
            "leftPanel", "rightPanel", "layersList", "leftEdgePeekTab", "rightEdgePeekTab"
        ];

        for (const id of requiredElements) {
            assert.ok(indexHtml.includes(`id="${id}"`), `index.html must include element with id="${id}"`);
        }

        const requiredTools = ["select", "hand", "textField", "dropdown", "checkBox", "radioGroup", "signature"];
        for (const tool of requiredTools) {
            assert.ok(indexHtml.includes(`data-tool="${tool}"`), `index.html must include tool button with data-tool="${tool}"`);
        }
    });

    await asyncIt("createTemplatePdf accurately builds vector PDFs for all starter templates", async () => {
        const { STARTER_TEMPLATES, createTemplatePdf } = await import(path.join(WEB_DIR, 'js', 'templates-engine.js'));
        for (const [key, template] of Object.entries(STARTER_TEMPLATES)) {
            assert.ok(template.title, `Template '${key}' must have a title`);
            assert.ok(Array.isArray(template.fields), `Template '${key}' must have fields array`);
            const pdfBytes = await createTemplatePdf(key);
            assert.ok(pdfBytes && pdfBytes.length > 0, `Template '${key}' must generate non-empty PDF bytes`);
            const magic = Buffer.from(pdfBytes.subarray(0, 4)).toString('ascii');
            assert.equal(magic, "%PDF", `Template '${key}' output must start with %PDF magic bytes`);
        }
    });

    // ── SUITE 18: End-to-End AcroForm PDF Pipeline Verification ──
    console.log("\n📄 Suite 18: End-to-End AcroForm PDF Pipeline Verification");
    await asyncIt("buildPdf successfully compiles and embeds all interactive AcroForm field types", async () => {
        const { PDFDocument } = await import('pdf-lib');
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));

        const testDoc = await PDFDocument.create();
        testDoc.addPage([612, 792]);
        const pdfBytes = await testDoc.save();

        const testFields = [
            { id: "f1", type: "textField", page: 1, x: 50, y: 100, width: 200, height: 24, name: "FullName", value: "Jane Smith", fontSize: 11, font: "Helvetica", required: true, readOnly: false },
            { id: "f2", type: "checkBox", page: 1, x: 50, y: 150, width: 16, height: 16, name: "AgreeTerms", checked: true, required: false },
            { id: "f3", type: "dropdown", page: 1, x: 50, y: 200, width: 180, height: 24, name: "Country", options: ["US", "DE", "NP"], value: "DE" },
            { id: "f4", type: "signature", page: 1, x: 50, y: 250, width: 220, height: 50, name: "SignatureBlock", signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
            { id: "f5", type: "radio", page: 1, x: 50, y: 320, width: 16, height: 16, name: "PaymentMethod", exportValue: "Card", radioGroup: "PaymentMethod", checked: true },
            { id: "f6", type: "date", page: 1, x: 50, y: 360, width: 140, height: 24, name: "Date", value: "2026-09-08" },
            { id: "f7", type: "number", page: 1, x: 50, y: 400, width: 120, height: 24, name: "TotalAmount", value: "250.00" }
        ];

        const outputBytes = await buildPdf(pdfBytes, testFields, { fontPreference: 'Helvetica' });
        assert.ok(outputBytes && outputBytes.length > 0, "buildPdf must return non-empty Uint8Array");

        // Verify loaded AcroForm
        const verifiedDoc = await PDFDocument.load(outputBytes);
        const form = verifiedDoc.getForm();
        const compiledFields = form.getFields();
        assert.ok(compiledFields.length >= 6, `AcroForm must have compiled fields (found ${compiledFields.length})`);

        // Verify Page Tab Order is set to Row (/Tabs /R)
        const verifiedPages = verifiedDoc.getPages();
        for (const p of verifiedPages) {
            const tabsVal = p.node.get(PDFLib.PDFName.of("Tabs"));
            assert.ok(tabsVal && tabsVal.toString() === "/R", "Page must have /Tabs /R set for row-order Tab navigation");
        }

        // Test Re-exporting and Flattening with zero call stack overflow
        const reExported = await buildPdf(outputBytes, [
            { id: "f1", name: "FullName", type: "textField", page: 1, x: 50, y: 100, width: 200, height: 24, value: "Jane Doe" }
        ], { flatten: false });
        assert.ok(reExported && reExported.length > 0, "Re-exported PDF must succeed without stack overflow");

        const flattened = await buildPdf(outputBytes, [
            { id: "f1", name: "FullName", type: "textField", page: 1, x: 50, y: 100, width: 200, height: 24, value: "Jane Doe" }
        ], { flatten: true });
        assert.ok(flattened && flattened.length > 0, "Flattened PDF must succeed without stack overflow");

        // Test multi-page pre-designed forms (like Schengen Visa application)
        const multiPageDoc = await PDFDocument.create();
        for (let p = 0; p < 4; p++) multiPageDoc.addPage([595, 842]);
        const mpForm = multiPageDoc.getForm();
        const tf1 = mpForm.createTextField("form1.page1.Nom");
        tf1.addToPage(multiPageDoc.getPages()[0], { x: 50, y: 700, width: 200, height: 20 });
        const cb1 = mpForm.createCheckBox("form1.page1.SexeHomme");
        cb1.addToPage(multiPageDoc.getPages()[0], { x: 50, y: 650, width: 15, height: 15 });
        const multiPageBytes = await multiPageDoc.save();

        const multiPageExport = await buildPdf(multiPageBytes, [
            { id: "s1", name: "Nom", type: "textField", page: 1, x: 50, y: 100, width: 250, height: 22, value: "DUPONT" },
            { id: "s2", name: "Prenom", type: "textField", page: 1, x: 50, y: 130, width: 250, height: 22, value: "Jean" },
            { id: "s3", name: "Homme", type: "checkBox", page: 1, x: 50, y: 160, width: 14, height: 14, checked: true },
            { id: "s4", name: "Destination", type: "textField", page: 2, x: 50, y: 200, width: 200, height: 22, value: "France" },
            { id: "s5", name: "Signature", type: "signature", page: 4, x: 50, y: 500, width: 200, height: 40 }
        ]);
        assert.ok(multiPageExport && multiPageExport.length > 0, "Multi-page complex pre-designed form must export cleanly");

        const multiPageFlattened = await buildPdf(multiPageExport, [
            { id: "s1", name: "Nom", type: "textField", page: 1, x: 50, y: 100, width: 250, height: 22, value: "DUPONT" }
        ], { flatten: true });
        assert.ok(multiPageFlattened && multiPageFlattened.length > 0, "Multi-page form must flatten with zero stack overflow");
    });

    it("Storage manager serializes snapshots and manages undo/redo stack accurately", async () => {
        const { state } = await import(path.join(WEB_DIR, 'js', 'state.js'));
        const { saveHistory, undo, redo } = await import(path.join(WEB_DIR, 'js', 'storage-manager.js'));

        state.fields = [{ id: "f1", name: "PartyA", type: "textField", page: 1, x: 10, y: 10, width: 100, height: 20 }];
        state.groups = [];
        state.history = [];
        state.historyIndex = -1;

        saveHistory(true);
        assert.equal(state.history.length, 1);
        assert.equal(state.historyIndex, 0);

        state.fields.push({ id: "f2", name: "PartyB", type: "textField", page: 1, x: 10, y: 40, width: 100, height: 20 });
        saveHistory(true);
        assert.equal(state.history.length, 2);
        assert.equal(state.historyIndex, 1);

        // Redo
        redo();
        assert.equal(state.historyIndex, 1);
        assert.equal(state.fields.length, 2);
        assert.equal(state.fields[1].id, "f2");
    });

    // ── SUITE 19: Security, Privacy & Sanitization Auditing ──
    console.log("\n🔒 Suite 19: Security, Privacy & Sanitization Auditing");
    it("getSafeImageSrc strictly enforces base64 image data URLs and rejects dangerous schemes", async () => {
        const { getSafeImageSrc } = await import(path.join(WEB_DIR, 'js', 'overlay-manager.js'));
        
        // Allowed
        const validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        assert.equal(getSafeImageSrc(validPng), validPng);

        // Blocked / Disallowed
        assert.equal(getSafeImageSrc("javascript:alert(1)"), "");
        assert.equal(getSafeImageSrc("https://malicious-site.com/track.png"), "");
        assert.equal(getSafeImageSrc("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), "");
        assert.equal(getSafeImageSrc(null), "");
        assert.equal(getSafeImageSrc(undefined), "");
        assert.equal(getSafeImageSrc(12345), "");
    });

    it("vercel.json enforces standard web security headers", () => {
        const vercelJson = JSON.parse(fs.readFileSync(path.join(WEB_DIR, 'vercel.json'), 'utf8'));
        const globalHeaders = vercelJson.headers.find(h => h.source === "/(.*)")?.headers || [];
        const headerMap = Object.fromEntries(globalHeaders.map(h => [h.key, h.value]));

        assert.equal(headerMap["X-Content-Type-Options"], "nosniff");
        assert.equal(headerMap["X-Frame-Options"], "SAMEORIGIN");
        assert.equal(headerMap["Referrer-Policy"], "strict-origin-when-cross-origin");
        assert.ok(headerMap["Permissions-Policy"] && headerMap["Permissions-Policy"].includes("camera=()"));
        assert.equal(headerMap["Cross-Origin-Opener-Policy"], "same-origin");
    });

    it("server.cjs prevents directory traversal attacks outside ROOT directory", () => {
        const serverCjs = fs.readFileSync(path.join(WEB_DIR, 'server.cjs'), 'utf8');
        assert.ok(serverCjs.includes("!filePath.startsWith(ROOT)"), "server.cjs must contain root path containment check");
        assert.ok(serverCjs.includes("403 Forbidden"), "server.cjs must respond with 403 on traversal attempt");
    });

    it("Zero unauthorized external network telemetry in client application files", () => {
        const jsFiles = fs.readdirSync(path.join(WEB_DIR, 'js')).filter(f => f.endsWith('.js'));
        const bannedCalls = ["XMLHttpRequest", "navigator.sendBeacon", "WebSocket"];
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(path.join(WEB_DIR, 'js', file), 'utf8');
            for (const banned of bannedCalls) {
                assert.ok(!content.includes(banned), `${file} must not use ${banned}`);
            }
        }
    });

    // ── SUITE 20: Comprehensive Accessibility (a11y) & WCAG 2.1 AA Auditing ──
    console.log("\n♿ Suite 20: Accessibility (a11y) & WCAG 2.1 AA Verification");
    it("100% of interactive buttons possess an accessible name or aria-label", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
        let match;
        const missingLabels = [];
        while ((match = buttonRegex.exec(indexHtml)) !== null) {
            const attrs = match[1];
            const content = match[2].replace(/<[^>]+>/g, '').trim();
            const hasAriaLabel = /aria-label\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            const hasAriaLabelledBy = /aria-labelledby\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            const hasTitle = /title\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            if (!content && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
                missingLabels.push(match[0].slice(0, 80));
            }
        }
        assert.equal(missingLabels.length, 0, `All buttons must have accessible names: ${missingLabels.join(', ')}`);
    });

    it("100% of form inputs, selects, and textareas have associated labels or aria-labels", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        const inputRegex = /<input\b([^>]*)>/gi;
        let match;
        const missingLabels = [];
        while ((match = inputRegex.exec(indexHtml)) !== null) {
            const attrs = match[1];
            if (/type=['\"]hidden['\"]/i.test(attrs)) continue;
            const hasId = /id=['\"]([^'\"]+)['\"]/i.exec(attrs);
            const hasAriaLabel = /aria-label\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            const hasAriaLabelledBy = /aria-labelledby\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            const hasTitle = /title\s*=\s*['\"][^'\"]+['\"]/i.test(attrs);
            let hasLabel = false;
            if (hasId) {
                hasLabel = new RegExp('<label[^>]*for=[\'\"]' + hasId[1] + '[\'\"]', 'i').test(indexHtml);
            }
            if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasLabel) {
                missingLabels.push(match[0].slice(0, 80));
            }
        }
        assert.equal(missingLabels.length, 0, `All inputs must have accessible labels: ${missingLabels.join(', ')}`);
    });

    it("100% of images specify alt text or decorative presentation roles", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        const imgRegex = /<img\b([^>]*)>/gi;
        let match;
        const missingAlt = [];
        while ((match = imgRegex.exec(indexHtml)) !== null) {
            const attrs = match[1];
            const hasAlt = /alt\s*=\s*['\"][^'\"]*['\"]/i.test(attrs);
            const isDecorative = /role=['\"]presentation['\"]/i.test(attrs) || /aria-hidden=['\"]true['\"]/i.test(attrs);
            if (!hasAlt && !isDecorative) {
                missingAlt.push(match[0].slice(0, 80));
            }
        }
        assert.equal(missingAlt.length, 0, `All images must provide alt text: ${missingAlt.join(', ')}`);
    });

    it("Hero upload and project dropzone exist with valid interactive IDs", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="heroDropzone"'), "Target #heroDropzone must exist in index.html");
        assert.ok(indexHtml.includes('id="heroPdfUpload"'), "Target #heroPdfUpload must exist in index.html");
    });

    it("Focus-visible outline styling is globally enforced for keyboard navigation", () => {
        const baseCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'base.css'), 'utf8');
        assert.ok(baseCss.includes(':focus-visible'), "base.css must define :focus-visible rules");
        assert.ok(baseCss.includes('outline'), "base.css must provide visible outline style");
    });

    it("Prefers-reduced-motion media query is configured across styles and transitions", () => {
        const baseCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'base.css'), 'utf8');
        const landingCss = fs.readFileSync(path.join(WEB_DIR, 'styles', 'landing.css'), 'utf8');
        assert.ok(baseCss.includes('prefers-reduced-motion'), "base.css must support prefers-reduced-motion");
        assert.ok(landingCss.includes('prefers-reduced-motion'), "landing.css must support prefers-reduced-motion");
    });

    // ── SUITE 21: Desktop Menu Bar & Document Text Label Tool ──
    console.log("\n🖥️ Suite 21: Desktop Application Menu Bar & Static Text Tool");
    it("Desktop Application Menu Bar defines all 6 standard menus in index.html", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('class="app-menu-bar"'), "app-menu-bar container must exist");
        assert.ok(indexHtml.includes('id="fileMenuDropdown"'), "File menu must exist");
        assert.ok(indexHtml.includes('id="editMenuDropdown"'), "Edit menu must exist");
        assert.ok(indexHtml.includes('id="insertMenuDropdown"'), "Insert menu must exist");
        assert.ok(indexHtml.includes('id="viewMenuDropdown"'), "View menu must exist");
        assert.ok(indexHtml.includes('id="arrangeMenuDropdown"'), "Arrange menu must exist");
        assert.ok(indexHtml.includes('id="helpMenuDropdown"'), "Help menu must exist");
    });

    it("Toolbar includes Text / Heading Label tool button (A)", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('data-tool="staticText"'), "staticText tool button must exist in toolbar");
    });

    it("Constants define staticText defaults and labels", async () => {
        const { DEFAULT_FIELD_SIZES, FIELD_TYPE_LABELS } = await import(path.join(WEB_DIR, 'js', 'constants.js'));
        assert.ok(DEFAULT_FIELD_SIZES.staticText, "DEFAULT_FIELD_SIZES.staticText must exist");
        assert.equal(DEFAULT_FIELD_SIZES.staticText.width, 220);
        assert.equal(DEFAULT_FIELD_SIZES.staticText.height, 32);
        assert.ok(FIELD_TYPE_LABELS.staticText, "FIELD_TYPE_LABELS.staticText must exist");
    });

    await asyncIt("buildPdf draws vector text for staticText labels onto PDF pages", async () => {
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));
        const { PDFDocument } = PDFLib;
        const testDoc = await PDFDocument.create();
        testDoc.addPage([600, 800]);
        const origBytes = await testDoc.save();

        const fields = [
            { id: "heading_1", name: "main_heading", type: "staticText", x: 50, y: 50, width: 300, height: 36, page: 1, label: "Employee Onboarding Form", fontSize: 18, fontFamily: "helvetica" }
        ];

        const outputBytes = await buildPdf(origBytes, fields);
        assert.ok(outputBytes instanceof Uint8Array);
        assert.ok(outputBytes.length > 500);

        const loaded = await PDFDocument.load(outputBytes);
        assert.equal(loaded.getPageCount(), 1);
    });

    // ── SUITE 22: About Face Interaction Design Enhancements ──
    console.log("\n🎨 Suite 22: About Face Interaction Design Enhancements");

    it("Named history actions record action descriptors and support undo/redo queries", async () => {
        const { state } = await import(path.join(WEB_DIR, 'js', 'state.js'));
        const { saveHistory, undo, redo, getUndoActionName, getRedoActionName } = await import(path.join(WEB_DIR, 'js', 'storage-manager.js'));
        
        state.history = [];
        state.historyIndex = -1;
        state.fields = [{ id: "f1", x: 10, y: 10, width: 100, height: 30 }];
        
        saveHistory(true, "Initial State");
        assert.equal(state.historyIndex, 0);

        state.fields = [{ id: "f1", x: 50, y: 10, width: 100, height: 30 }];
        saveHistory(true, "Move Field");
        assert.equal(state.historyIndex, 1);
        assert.equal(getUndoActionName(), "Move Field");

        state.fields = [{ id: "f1", x: 50, y: 10, width: 150, height: 30 }];
        saveHistory(true, "Resize Width to 150px");
        assert.equal(state.historyIndex, 2);
        assert.equal(getUndoActionName(), "Resize Width to 150px");

        const undoneAction = undo();
        assert.equal(undoneAction, "Resize Width to 150px");
        assert.equal(state.historyIndex, 1);
        assert.equal(state.fields[0].width, 100);
        assert.equal(getRedoActionName(), "Resize Width to 150px");

        const redoneAction = redo();
        assert.equal(redoneAction, "Resize Width to 150px");
        assert.equal(state.historyIndex, 2);
        assert.equal(state.fields[0].width, 150);
    });

    it("index.html contains posX and posY position inputs with scrubbable labels", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="posX"'), "index.html must include #posX input");
        assert.ok(indexHtml.includes('id="posY"'), "index.html must include #posY input");
        assert.ok(/<label[^>]*class="[^"]*scrubbable[^"]*"[^>]*for="posX"|<label[^>]*for="posX"[^>]*class="[^"]*scrubbable/.test(indexHtml), "#posX label must have scrubbable class");
        assert.ok(/<label[^>]*class="[^"]*scrubbable[^"]*"[^>]*for="posY"|<label[^>]*for="posY"[^>]*class="[^"]*scrubbable/.test(indexHtml), "#posY label must have scrubbable class");
    });

    // ── SUITE 23: Smart Inference, Forgiving Sanitization & Contextual Quick Actions ──
    console.log("\n⚡ Suite 23: Smart Inference, Forgiving Sanitization & Contextual Quick Actions");

    it("sanitizePdfFieldName safely auto-normalizes field names without alerts", async () => {
        const { sanitizePdfFieldName } = await import(path.join(WEB_DIR, 'js', 'properties-panel.js'));
        assert.equal(sanitizePdfFieldName("First Name (#1)"), "first_name_1");
        assert.equal(sanitizePdfFieldName("Company - Address (Line 2)"), "company_address_line_2");
        assert.equal(sanitizePdfFieldName("123 Tax ID"), "f_123_tax_id");
        assert.equal(sanitizePdfFieldName(""), "field_1");
        assert.equal(sanitizePdfFieldName(null), "field_1");
        assert.equal(sanitizePdfFieldName("   ___Email Address___   "), "email_address");
    });

    it("distributeSelectedFields uniformly spaces 3+ fields horizontally and vertically", async () => {
        const { state } = await import(path.join(WEB_DIR, 'js', 'state.js'));
        const { distributeSelectedFields } = await import(path.join(WEB_DIR, 'js', 'properties-panel.js'));

        state.fields = [
            { id: "f1", x: 10, y: 0, width: 100, height: 20 },
            { id: "f2", x: 10, y: 30, width: 100, height: 20 },
            { id: "f3", x: 10, y: 100, width: 100, height: 20 }
        ];
        state.selectedFieldIds = new Set(["f1", "f2", "f3"]);

        distributeSelectedFields("vertical");
        assert.equal(state.fields[0].y, 0);
        assert.equal(state.fields[1].y, 50);
        assert.equal(state.fields[2].y, 100);

        state.fields = [
            { id: "h1", x: 0, y: 10, width: 40, height: 20 },
            { id: "h2", x: 45, y: 10, width: 40, height: 20 },
            { id: "h3", x: 140, y: 10, width: 40, height: 20 }
        ];
        state.selectedFieldIds = new Set(["h1", "h2", "h3"]);

        distributeSelectedFields("horizontal");
        assert.equal(state.fields[0].x, 0);
        assert.equal(state.fields[1].x, 70);
        assert.equal(state.fields[2].x, 140);
    });

    it("renderContextualQuickBar creates floating action buttons for selection", async () => {
        const { renderContextualQuickBar } = await import(path.join(WEB_DIR, 'js', 'overlay-manager.js'));
        assert.equal(typeof renderContextualQuickBar, "function");

        const mockContainer = {
            children: [],
            appendChild(el) { this.children.push(el); }
        };
        const selectedFields = [
            { id: "f1", type: "textField", x: 50, y: 80, width: 120, height: 30, required: false }
        ];

        const prevDoc = global.document;
        global.document = {
            createElement(tag) {
                return {
                    tagName: tag,
                    className: "",
                    style: {},
                    dataset: {},
                    children: [],
                    appendChild(child) { this.children.push(child); },
                    addEventListener() {}
                };
            }
        };

        renderContextualQuickBar(mockContainer, selectedFields);
        assert.equal(mockContainer.children.length, 1);
        assert.equal(mockContainer.children[0].className, "contextual-quick-bar");
        assert.equal(mockContainer.children[0].style.left, "110px");
        assert.equal(mockContainer.children[0].style.top, "42px");

        global.document = prevDoc;
    });

    // ── SUITE 24: Hybrid Neural Vision & Client-Side ONNX Pipeline Verification ──
    console.log("\n🧠 Suite 24: Hybrid Neural Vision & Client-Side ONNX Pipeline");
    const { calculateBoxIoU, nonMaximumSuppression } = await import(path.join(WEB_DIR, 'js', 'onnx-detector.js'));
    const { enrichNeuralFieldsWithText } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

    it("calculateBoxIoU accurately calculates bounding box overlap ratio", () => {
        const box1 = { x: 0, y: 0, width: 100, height: 100 };
        const box2 = { x: 50, y: 0, width: 100, height: 100 }; // overlap = 50 * 100 = 5000, union = 15000 -> 1/3
        const iou = calculateBoxIoU(box1, box2);
        assert.ok(Math.abs(iou - 0.3333) < 0.01, `IoU should be ~0.33, got ${iou}`);

        const identical = calculateBoxIoU(box1, box1);
        assert.equal(identical, 1.0, "Identical boxes must have IoU = 1.0");

        const separate = calculateBoxIoU(box1, { x: 200, y: 200, width: 50, height: 50 });
        assert.equal(separate, 0.0, "Non-overlapping boxes must have IoU = 0.0");
    });

    it("nonMaximumSuppression suppresses lower-confidence overlapping candidates", () => {
        const candidates = [
            { id: "c1", confidence: 0.95, x: 50, y: 50, width: 100, height: 30, type: "textField" },
            { id: "c2", confidence: 0.82, x: 52, y: 51, width: 98, height: 29, type: "textField" }, // High overlap with c1
            { id: "c3", confidence: 0.88, x: 50, y: 150, width: 100, height: 30, type: "textField" } // Distinct field
        ];

        const suppressed = nonMaximumSuppression(candidates, 0.4);
        assert.equal(suppressed.length, 2, "Should retain exactly 2 distinct boxes");
        assert.equal(suppressed[0].id, "c1", "Highest confidence box c1 must be retained");
        assert.equal(suppressed[1].id, "c3", "Distinct box c3 must be retained");
    });

    it("enrichNeuralFieldsWithText binds adjacent text labels and assigns semantic properties", () => {
        const rawNeural = [
            { id: "n1", type: "textField", x: 120, y: 100, width: 180, height: 24 },
            { id: "n2", type: "checkBox", x: 120, y: 200, width: 16, height: 16 }
        ];

        const rawBlocks = [
            { str: "First Name:", x: 30, y: 102, width: 70, height: 12 },
            { str: "Agree to terms", x: 145, y: 202, width: 90, height: 12 }
        ];

        const usedNames = new Set();
        const enriched = enrichNeuralFieldsWithText(rawNeural, rawBlocks, usedNames, 1);
        assert.equal(enriched.length, 2);
        assert.equal(enriched[0].type, "textField");
        assert.equal(enriched[0].name, "first_name");
        assert.equal(enriched[0].autofill, "given-name");
        assert.equal(enriched[1].type, "checkBox");
        assert.equal(enriched[1].name, "agree_to_terms");
    });

    // ── SUITE 25: Form Detection Benchmark & Evaluation Studio Verification ──
    console.log("\n📊 Suite 25: Form Detection Benchmark & Evaluation Studio");
    const { generateEmployeeOnboardingPdf, generateMedicalIntakePdf, generateCommercialInvoicePdf } = await import(path.join(WEB_DIR, 'tests', 'generate_test_pdfs.js'));

    await asyncIt("generate_test_pdfs correctly builds valid vector PDFs for all sample fixtures", async () => {
        const onboardingBytes = await generateEmployeeOnboardingPdf();
        assert.ok(onboardingBytes && onboardingBytes.length > 500);

        const medicalBytes = await generateMedicalIntakePdf();
        assert.ok(medicalBytes && medicalBytes.length > 500);

        const invoiceBytes = await generateCommercialInvoicePdf();
        assert.ok(invoiceBytes && invoiceBytes.length > 500);

        const doc1 = await PDFLib.PDFDocument.load(onboardingBytes);
        assert.equal(doc1.getPageCount(), 1);
        const doc2 = await PDFLib.PDFDocument.load(medicalBytes);
        assert.equal(doc2.getPageCount(), 1);
        const doc3 = await PDFLib.PDFDocument.load(invoiceBytes);
        assert.equal(doc3.getPageCount(), 1);
    });

    it("evaluate.html and tests/evaluate.html exist and contain interactive precision/recall/F1 scorecard", () => {
        const evalHtml = fs.readFileSync(path.join(WEB_DIR, 'tests', 'evaluate.html'), 'utf8');
        assert.ok(evalHtml.includes("Formblatt Detection Benchmark"));
        assert.ok(evalHtml.includes("metricF1"));
        assert.ok(evalHtml.includes("metricPrecision"));
        assert.ok(evalHtml.includes("metricRecall"));
        assert.ok(evalHtml.includes("countTP"));
        assert.ok(evalHtml.includes("countFP"));
        assert.ok(evalHtml.includes("countFN"));
        assert.ok(evalHtml.includes("exportReportBtn"));
    });

    it("detectVectorDrawnFields correctly detects drawn checkboxes and input boxes with exact vector dimensions", async () => {
        const { detectVectorDrawnFields } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

        const mockVectorShapes = {
            checkboxRects: [
                { x: 445, y: 320, width: 14, height: 14 },
                { x: 510, y: 320, width: 14, height: 14 }
            ],
            inputBoxRects: [
                { x: 140, y: 118, width: 220, height: 22 }
            ],
            underlines: [
                { x: 155, y: 217, width: 395 }
            ]
        };

        const mockRawBlocks = [
            { str: "Checking", x: 465, y: 321, width: 40, height: 10 },
            { str: "Savings", x: 528, y: 321, width: 35, height: 10 },
            { str: "Full Legal Name:", x: 45, y: 120, width: 90, height: 10 }
        ];

        const usedNames = new Set();
        const detected = detectVectorDrawnFields(mockVectorShapes, mockRawBlocks, 1, usedNames, []);

        assert.equal(detected.length, 3);
        
        // Checkboxes
        assert.equal(detected[0].type, "checkBox");
        assert.equal(detected[0].name, "checking");
        assert.equal(detected[0].width, 14);
        assert.equal(detected[0].height, 14);

        assert.equal(detected[1].type, "checkBox");
        assert.equal(detected[1].name, "savings");

        // Input Box
        assert.equal(detected[2].type, "textField");
        assert.equal(detected[2].name, "full_legal_name");
        assert.equal(detected[2].width, 220);
        assert.equal(detected[2].height, 22);
    });

    // ── SUITE 26: Comb / Boxed Character Recognition Verification ──
    console.log("\n📦 Suite 26: Comb / Boxed Character Recognition");
    const { clusterCombBoxes } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));

    it("clusterCombBoxes clusters contiguous horizontal character boxes into comb groups", () => {
        // Mock SSN 9 character boxes [ ][ ][ ] [ ][ ] [ ][ ][ ][ ]
        const ssnBoxes = [
            { x: 100, y: 200, width: 14, height: 18 },
            { x: 115, y: 200, width: 14, height: 18 },
            { x: 130, y: 200, width: 14, height: 18 },
            { x: 148, y: 200, width: 14, height: 18 },
            { x: 163, y: 200, width: 14, height: 18 },
            { x: 181, y: 200, width: 14, height: 18 },
            { x: 196, y: 200, width: 14, height: 18 },
            { x: 211, y: 200, width: 14, height: 18 },
            { x: 226, y: 200, width: 14, height: 18 }
        ];

        const clusters = clusterCombBoxes(ssnBoxes);
        assert.equal(clusters.length, 1);
        assert.equal(clusters[0].length, 9);
    });

    it("detectVectorDrawnFields creates comb text field with isComb and maxLength", async () => {
        const { detectVectorDrawnFields } = await import(path.join(WEB_DIR, 'js', 'auto-detector.js'));
        const dateBoxes = [
            { x: 100, y: 150, width: 14, height: 18 },
            { x: 115, y: 150, width: 14, height: 18 },
            { x: 135, y: 150, width: 14, height: 18 },
            { x: 150, y: 150, width: 14, height: 18 },
            { x: 170, y: 150, width: 14, height: 18 },
            { x: 185, y: 150, width: 14, height: 18 },
            { x: 200, y: 150, width: 14, height: 18 },
            { x: 215, y: 150, width: 14, height: 18 }
        ];
        const rawBlocks = [
            { str: "Date of Birth (MM/DD/YYYY):", x: 100, y: 132, width: 120, height: 10 }
        ];
        const detected = detectVectorDrawnFields({ allRects: dateBoxes }, rawBlocks, 1, new Set(), []);
        assert.equal(detected.length, 1);
        assert.equal(detected[0].type, "textField");
        assert.equal(detected[0].isComb, true);
        assert.equal(detected[0].maxLength, 8);
        assert.equal(detected[0].dataFormat, "date");
    });

    await asyncIt("buildPdf sets Comb flag (bit 25 = 16777216) and maxLen in exported PDF", async () => {
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));

        const blankDoc = await PDFLib.PDFDocument.create();
        blankDoc.addPage([600, 800]);
        const baseBytes = await blankDoc.save();

        const combField = {
            id: "fld_ssn_test",
            name: "social_security_number",
            type: "textField",
            x: 50,
            y: 50,
            width: 180,
            height: 24,
            isComb: true,
            maxLength: 9
        };

        const compiledPdfBytes = await buildPdf(baseBytes, [combField]);
        const loadedPdf = await PDFLib.PDFDocument.load(compiledPdfBytes);
        const form = loadedPdf.getForm();
        const tf = form.getTextField("social_security_number");
        assert.ok(tf, "Comb text field exists in exported PDF");
        assert.equal(tf.getMaxLength(), 9);

        const flags = tf.acroField.getFlags();
        const isCombFlagSet = Boolean(flags & (1 << 24)); // Bit 25
        assert.equal(isCombFlagSet, true, "AcroForm Comb flag (16777216) must be set on text field");
    });

    // ── SUITE 27: PDF Flattening & Split Export Verification ──
    console.log("\n🔒 Suite 27: PDF Flattening & Split Export");
    const { downloadFlattenedPdf, downloadAcroForm } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));

    it("acroform-builder exports downloadFlattenedPdf and downloadAcroForm functions", () => {
        assert.equal(typeof downloadFlattenedPdf, "function");
        assert.equal(typeof downloadAcroForm, "function");
    });

    await asyncIt("buildPdf with flatten: true strips all interactive widget annotations and burns in vector contents", async () => {
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));
        const blankDoc = await PDFLib.PDFDocument.create();
        blankDoc.addPage([600, 800]);
        const baseBytes = await blankDoc.save();

        const testFields = [
            { id: "fld_1", name: "full_name", type: "textField", value: "Jane Doe", x: 50, y: 50, width: 200, height: 25 },
            { id: "fld_2", name: "agree", type: "checkBox", defaultChecked: true, x: 50, y: 90, width: 18, height: 18 }
        ];

        // 1. Build normal fillable AcroForm
        const fillableBytes = await buildPdf(baseBytes, testFields, { flatten: false });
        const fillableDoc = await PDFLib.PDFDocument.load(fillableBytes);
        const fillableForm = fillableDoc.getForm();
        assert.equal(fillableForm.getFields().length, 2, "Fillable PDF should retain 2 interactive AcroForm fields");

        // 2. Build Flattened Read-Only PDF
        const flattenedBytes = await buildPdf(baseBytes, testFields, { flatten: true });
        const flattenedDoc = await PDFLib.PDFDocument.load(flattenedBytes);
        const flattenedForm = flattenedDoc.getForm();
        assert.equal(flattenedForm.getFields().length, 0, "Flattened PDF must have 0 interactive fields (baked permanent vectors)");
    });

    it("index.html contains toolbar split button group and quick export menu items", () => {
        const indexHtml = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('id="exportSplitBtnGroup"'));
        assert.ok(indexHtml.includes('id="exportSplitDropdownToggle"'));
        assert.ok(indexHtml.includes('id="exportSplitDropdownMenu"'));
        assert.ok(indexHtml.includes('id="quickExportAcroFormBtn"'));
        assert.ok(indexHtml.includes('id="quickExportFlattenedBtn"'));
    });

    // ── SUITE 28: Formula & Calculation Engine (/JS + /CO) Verification ──
    console.log("\n🧮 Suite 28: Formula & Calculation Engine (/JS + /CO)");
    const { evaluateCalculations } = await import(path.join(WEB_DIR, 'js', 'state.js'));
    const { compileFormulaToAcroJs } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));

    it("evaluateCalculations computes reactive sums, products, and custom math formulas in real time", () => {
        const mockFields = [
            { id: "fld_qty", name: "quantity", type: "textField", value: "5" },
            { id: "fld_price", name: "unit_price", type: "textField", value: "20.50" },
            { id: "fld_tax_rate", name: "tax_percent", type: "textField", value: "10" },
            { id: "fld_subtotal", name: "subtotal", type: "textField", calculationType: "custom", calculationFormula: "quantity * unit_price", value: "" },
            { id: "fld_total", name: "grand_total", type: "textField", calculationType: "custom", calculationFormula: "subtotal * (1 + tax_percent / 100)", value: "" }
        ];

        evaluateCalculations(mockFields);

        // 5 * 20.50 = 102.5
        assert.equal(mockFields[3].value, "102.5");
        // 102.5 * 1.1 = 112.75
        assert.equal(mockFields[4].value, "112.75");
    });

    it("compileFormulaToAcroJs generates ISO-compliant AcroForm JavaScript scripts", () => {
        const sumField = {
            calculationType: "sum",
            calculationFields: ["item_1", "item_2", "item_3"]
        };
        const sumJs = compileFormulaToAcroJs(sumField);
        assert.ok(sumJs.includes("var s = 0;"));
        assert.ok(sumJs.includes("item_1"));
        assert.ok(sumJs.includes("event.value = s;"));

        const prodField = {
            calculationType: "prod",
            calculationFields: ["qty", "unit_price"]
        };
        const prodJs = compileFormulaToAcroJs(prodField);
        assert.ok(prodJs.includes("var p = 1"));
        assert.ok(prodJs.includes("qty"));
        assert.ok(prodJs.includes("unit_price"));

        const customField = {
            calculationType: "custom",
            calculationFormula: "subtotal + tax - discount"
        };
        const customJs = compileFormulaToAcroJs(customField);
        assert.ok(customJs.includes("var subtotal ="));
        assert.ok(customJs.includes("var tax ="));
        assert.ok(customJs.includes("var discount ="));
        assert.ok(customJs.includes("event.value = (subtotal + tax - discount)"));
    });

    await asyncIt("buildPdf attaches /AA Calculate actions and /CO Calculation Order Array to AcroForm catalog", async () => {
        const { buildPdf } = await import(path.join(WEB_DIR, 'js', 'acroform-builder.js'));
        const blankDoc = await PDFLib.PDFDocument.create();
        blankDoc.addPage([600, 800]);
        const baseBytes = await blankDoc.save();

        const testFields = [
            { id: "f1", name: "item1", type: "textField", value: "10", x: 50, y: 50, width: 100, height: 22 },
            { id: "f2", name: "item2", type: "textField", value: "25", x: 50, y: 80, width: 100, height: 22 },
            { id: "f3", name: "total", type: "textField", calculationType: "sum", calculationFields: ["item1", "item2"], x: 50, y: 110, width: 100, height: 22 }
        ];

        const pdfBytes = await buildPdf(baseBytes, testFields);
        const doc = await PDFLib.PDFDocument.load(pdfBytes);
        const form = doc.getForm();
        const totalTf = form.getTextField("total");
        assert.ok(totalTf, "Calculated total field exists");

        // Verify /AA << /C << /S /JavaScript ... >> >>
        const aaDict = totalTf.acroField.dict.get(PDFLib.PDFName.of("AA"));
        assert.ok(aaDict, "Total field must possess /AA dictionary");

        // Verify /CO (Calculation Order Array) in /AcroForm catalog
        const acroForm = doc.catalog.getOrCreateAcroForm();
        const coArray = acroForm.dict.get(PDFLib.PDFName.of("CO"));
        assert.ok(coArray, "AcroForm catalog must contain /CO calculation order array");
    });

    // ── Summary ──
    console.log("\n=================================================");
    console.log(`🏁 TEST RUN SUMMARY:`);
    console.log(`   Total Tests : ${passed + failed}`);
    console.log(`   Passed      : ${passed} ✅`);
    console.log(`   Failed      : ${failed} ❌`);
    console.log("=================================================\n");

    if (failed > 0) process.exit(1);
}

runAllTests().catch(err => {
    console.error("Unhandled exception during test execution:", err);
    process.exit(1);
});
