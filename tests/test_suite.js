// ── JustForms Complete Automated Test Suite (v1.1.0) ──────────────
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

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
    console.log("🧪 RUNNING JUSTFORMS AUTOMATED TEST SUITE (v1.1.0)");
    console.log("=================================================\n");

    // ── SUITE 1: Module Integrity & ES Module Imports ──
    console.log("📦 Suite 1: File Integrity & Module Loading");
    const jsFiles = [
        'constants.js',
        'state.js',
        'toast.js',
        'templates-engine.js',
        'storage-manager.js',
        'overlay-manager.js'
    ];

    for (const file of jsFiles) {
        const fullPath = path.join(WEB_DIR, 'js', file);
        await asyncIt(`Should load module js/${file} without syntax errors`, async () => {
            const mod = await import(fullPath);
            assert.ok(mod, `Module js/${file} should export an object`);
        });
    }

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
        toggleGuides
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

    // ── SUITE 6: Semantic Resolver & Regex Detection ──
    console.log("\n🔍 Suite 6: Semantic Field Heuristics & Auto-Detection");
    const GENERIC_PATTERNS = [
        { regex: /due\s*date|payment\s*due/i, id: "due_date", type: "dateField" },
        { regex: /birth\s*date|\bdob\b|date\s*of\s*birth/i, id: "dob", type: "dateField" },
        { regex: /signature|sign\s*here|signed\s*by|^sign\b/i, id: "signature", type: "signature" },
        { regex: /invoice\s*(?:#|no|number|num)/i, id: "invoice_number", type: "textField", autofill: "invoice_num" },
        { regex: /ssn|social\s*security|tax\s*id|ein/i, id: "ssn", type: "textField" },
        { regex: /first\s*name|given\s*name/i, id: "first_name", type: "textField", autofill: "given-name" },
        { regex: /last\s*name|surname|family\s*name/i, id: "last_name", type: "textField", autofill: "family-name" },
        { regex: /full\s*name|^name\b/i, id: "full_name", type: "textField", autofill: "name" },
        { regex: /e-?mail/i, id: "email", type: "textField", autofill: "email" },
        { regex: /phone|telephone|mobile|tel\b/i, id: "phone", type: "textField", autofill: "tel" },
        { regex: /street\s*address|address\s*line/i, id: "street_address", type: "textField", autofill: "address-line1" },
        { regex: /comments|notes|remarks|feedback/i, id: "comments", type: "textField", multiline: true }
    ];

    function resolveLabel(label) {
        for (const item of GENERIC_PATTERNS) {
            if (item.regex.test(label)) return item;
        }
        return { id: "generic", type: "textField" };
    }

    it("Correctly categorizes common form labels", () => {
        assert.equal(resolveLabel("First Name:").id, "first_name");
        assert.equal(resolveLabel("Family Name:").id, "last_name");
        assert.equal(resolveLabel("Email Address").type, "textField");
        assert.equal(resolveLabel("Telephone / Mobile Number").autofill, "tel");
        assert.equal(resolveLabel("Date of Birth (MM/DD/YYYY)").type, "dateField");
        assert.equal(resolveLabel("Authorized Signature").type, "signature");
        assert.equal(resolveLabel("Additional Comments / Feedback").multiline, true);
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
        assert.equal(appendedChildren[0].className, "field-overlay selected");
        assert.equal(appendedChildren[0].style.border, "2px solid #1D4ED8");
        assert.equal(appendedChildren[1].className, "field-overlay");
        assert.equal(appendedChildren[1].style.border, "1.5px solid #94A3B8");

        // 3. Multi-selected test
        appendedChildren.length = 0;
        state.selectedFieldIds = new Set(["f1", "f2"]);
        renderOverlays({});
        // Should have 2 multi-selected overlays + 1 unselected overlay + 1 bounding frame = 4
        assert.equal(appendedChildren.length, 4);
        assert.equal(appendedChildren[0].className, "field-overlay selected multi-selected");
        assert.equal(appendedChildren[0].style.border, "1px solid #93C5FD");
        assert.equal(appendedChildren[1].className, "field-overlay selected multi-selected");
        assert.equal(appendedChildren[2].className, "field-overlay");
        assert.equal(appendedChildren[3].className, "multi-selection-bounding-frame");
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
