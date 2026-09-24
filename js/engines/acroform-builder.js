// ── pdf-lib AcroForm Compiler & Exporter (js/engines/acroform-builder.js) ─
import { state, sortFieldsByReadingOrder, evaluateCalculations } from "../core/state.js";
import { showToast } from "../utils/toast.js";
import { loadPdfLibraries } from "./pdf-engine.js";

function checkboxAppearanceProvider(mark) {
    if (mark !== "x") return undefined;
    return (checkBox, widget) => {
        const rectangle = widget.getRectangle();
        const ap = widget.getAppearanceCharacteristics?.();
        const bs = widget.getBorderStyle?.();
        const borderWidth = bs?.getWidth?.() ?? 0;
        const width = rectangle.width - borderWidth;
        const height = rectangle.height - borderWidth;
        const borderColor = PDFLib.rgb(0, 0, 0);
        const markColor = PDFLib.rgb(0, 0, 0);
        const rawBg = ap?.getBackgroundColor?.();
        let backgroundColor = undefined;
        if (Array.isArray(rawBg)) {
            if (rawBg.length === 3) backgroundColor = PDFLib.rgb(rawBg[0], rawBg[1], rawBg[2]);
            else if (rawBg.length === 1) backgroundColor = PDFLib.grayscale(rawBg[0]);
            else if (rawBg.length === 4) backgroundColor = PDFLib.cmyk(rawBg[0], rawBg[1], rawBg[2], rawBg[3]);
        } else if (rawBg && typeof rawBg === "object" && "type" in rawBg) {
            backgroundColor = rawBg;
        }
        // filled: false ensures the unchecked ("off") appearance contains ONLY the box outline and background, never a checkmark
        const outline = PDFLib.drawCheckBox({
            x: borderWidth / 2, y: borderWidth / 2, width, height,
            thickness: 1.5, borderWidth, borderColor, markColor,
            color: backgroundColor, filled: false
        });
        const markOperators = [
            ...PDFLib.drawLine({ start: { x: width * 0.22, y: height * 0.22 }, end: { x: width * 0.78, y: height * 0.78 }, thickness: 1.5, color: markColor }),
            ...PDFLib.drawLine({ start: { x: width * 0.22, y: height * 0.78 }, end: { x: width * 0.78, y: height * 0.22 }, thickness: 1.5, color: markColor })
        ];
        const on = [...outline, ...markOperators];
        return {
            normal: { on, off: outline },
            down: { on, off: outline }
        };
    };
}

// Maps an autofill role to a human-readable label for the PDF's /TU
// tooltip, which is what Chrome's and Acrobat's native form-fill features
// key off to suggest saved name/email/address/etc. Two naming schemes are
// covered on purpose: the short ids used by the manual field-properties UI
// (first_name, address1, zip...) AND the HTML `autocomplete` tokens that
// auto-detector.js's GENERIC_PATTERNS actually emits (given-name,
// address-line1, postal-code...). Previously only the short-id scheme was
// covered here, so nearly every auto-detected contact field's tooltip
// silently fell back to the raw token itself (e.g. literally "given-name")
// instead of a readable label — which defeats native autofill matching
// rather than helping it.
const AUTOFILL_ROLE_TITLES = {
    name: "Full Name", first_name: "First Name", last_name: "Last Name",
    email: "Email Address", phone: "Phone Number", address1: "Street Address",
    city: "City", state: "State / Province", zip: "Zip / Postal Code",
    country: "Country", company: "Company Name", job_title: "Job Title", dob: "Date of Birth",
    // HTML autocomplete-token aliases (what auto-detector.js actually sets)
    "given-name": "First Name", "family-name": "Last Name", "tel": "Phone Number",
    "address-line1": "Street Address", "address-level2": "City", "address-level1": "State / Province",
    "postal-code": "Zip / Postal Code", "country-name": "Country",
    "organization": "Company Name", "organization-title": "Job Title"
};

function resolveAutofillTooltip(f) {
    const autofillRole = f.autofill || "";
    if (f.tooltip) return f.tooltip;
    if (!autofillRole) return "";
    return AUTOFILL_ROLE_TITLES[autofillRole] || autofillRole;
}

export function compileFormulaToAcroJs(field, allFields = []) {
    const calcType = field.calculationType || "none";
    if (calcType === "none") return "";

    const targets = Array.isArray(field.calculationFields) 
        ? field.calculationFields 
        : (field.calculationFields ? String(field.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);

    if (calcType === "sum") {
        const fieldList = targets.map(fn => JSON.stringify(fn.replace(/[^a-zA-Z0-9_-]/g, "_"))).join(", ");
        return `if (typeof AFSimple_Calculate === "function") { AFSimple_Calculate("SUM", new Array(${fieldList})); } else { var s = 0; var flds = [${fieldList}]; for (var i = 0; i < flds.length; i++) { var f = this.getField(flds[i]); if (f && f.value !== null && f.value !== undefined && f.value !== "") { var v = parseFloat(("" + f.value).replace(/[^0-9.-]/g, "")); if (!isNaN(v)) s += v; } } event.value = s; }`;
    }

    if (calcType === "prod") {
        const fieldList = targets.map(fn => JSON.stringify(fn.replace(/[^a-zA-Z0-9_-]/g, "_"))).join(", ");
        return `if (typeof AFSimple_Calculate === "function") { AFSimple_Calculate("PRD", new Array(${fieldList})); } else { var p = 1, found = false; var flds = [${fieldList}]; for (var i = 0; i < flds.length; i++) { var f = this.getField(flds[i]); if (f && f.value !== null && f.value !== undefined && f.value !== "") { var v = parseFloat(("" + f.value).replace(/[^0-9.-]/g, "")); if (!isNaN(v)) { p *= v; found = true; } } } event.value = found ? p : 0; }`;
    }

    if (calcType === "tax") {
        const baseField = (field.calculationTaxBaseField || targets[0] || "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const rate = parseFloat(field.calculationTaxRate) || 0;
        return `var f = this.getField("${baseField}"); var v = 0; if (f && f.value !== null && f.value !== undefined && f.value !== "") { var num = parseFloat(("" + f.value).replace(/[^0-9.-]/g, "")); if (!isNaN(num)) v = num; } event.value = Math.round(v * (${rate} / 100) * 100) / 100;`;
    }

    if (calcType === "discount") {
        const baseField = (field.calculationDiscountBaseField || targets[0] || "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const rate = parseFloat(field.calculationDiscountRate) || 0;
        return `var f = this.getField("${baseField}"); var v = 0; if (f && f.value !== null && f.value !== undefined && f.value !== "") { var num = parseFloat(("" + f.value).replace(/[^0-9.-]/g, "")); if (!isNaN(num)) v = num; } event.value = Math.round(v * (${rate} / 100) * 100) / 100;`;
    }

    if (calcType === "custom" && field.calculationFormula) {
        const expr = field.calculationFormula.trim();
        const tokens = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        const reserved = new Set(["Math", "Number", "parseInt", "parseFloat", "min", "max", "round", "abs", "floor", "ceil", "SUM", "PROD", "true", "false", "null", "undefined"]);
        const uniqueTokens = Array.from(new Set(tokens)).filter(t => !reserved.has(t));
        
        let jsPre = "";
        uniqueTokens.forEach(tok => {
            const sanitizedTok = tok.replace(/[^a-zA-Z0-9_-]/g, "_");
            jsPre += `var ${sanitizedTok} = (function(th){ var f = th.getField("${sanitizedTok}"); if(!f || f.value === null || f.value === undefined || f.value === "") return 0; var num = parseFloat(("" + f.value).replace(/[^0-9.-]/g, "")); return !isNaN(num) ? num : 0; })(this);\n`;
        });
        return `${jsPre}try { event.value = (${expr}); } catch(e) { event.value = 0; }`;
    }

    return "";
}

function applyTextFieldAppearance(fieldObj, font, fontSize, textAlignment = "left") {
    if (!fieldObj || !font) return;

    // PDF /DA formatting must be: "0 0 0 rg /FontName size Tf"
    const fontName = font.name || "Helvetica";
    const appearance = `0 0 0 rg /${fontName} ${fontSize} Tf`;

    try {
        fieldObj.acroField.dict.set(
            PDFLib.PDFName.of("DA"),
            PDFLib.PDFString.of(appearance)
        );
    } catch (err) {
        console.warn("Could not set field DA explicitly:", err);
    }

    try { fieldObj.setFontSize(fontSize); } catch (e) {}

    // PDF 1.7 / ISO 32000-1 §12.7.4.3: Quadding /Q
    // 0 = Left-justified, 1 = Centered, 2 = Right-justified
    const qVal = textAlignment === "right" ? 2 : (textAlignment === "center" ? 1 : 0);

    try {
        fieldObj.acroField?.dict?.set?.(PDFLib.PDFName.of("Q"), PDFLib.PDFNumber.of(qVal));
    } catch (e) {}

    try {
        const widgets = fieldObj.acroField?.getWidgets?.() || [];
        widgets.forEach(widget => {
            try { widget.setDefaultAppearance(appearance); } catch (e) {}
            try { widget.dict.set(PDFLib.PDFName.of("DA"), PDFLib.PDFString.of(appearance)); } catch (e) {}
            try { widget.dict.set(PDFLib.PDFName.of("Q"), PDFLib.PDFNumber.of(qVal)); } catch (e) {}
        });
    } catch (err) {
        console.warn("Could not set widget appearance explicitly:", err);
    }
}

export async function buildPdf(pdfBytesOrOptions = {}, maybeFields = null, maybeOptions = {}) {
    let sourceBytes = state.originalPdfBytes;
    let targetFields = state.fields;
    let opts = {};

    if (pdfBytesOrOptions instanceof Uint8Array || ArrayBuffer.isView(pdfBytesOrOptions) || Array.isArray(pdfBytesOrOptions)) {
        sourceBytes = pdfBytesOrOptions;
        if (Array.isArray(maybeFields)) targetFields = maybeFields;
        if (typeof maybeOptions === "object" && maybeOptions !== null) opts = maybeOptions;
    } else if (typeof pdfBytesOrOptions === "object" && pdfBytesOrOptions !== null) {
        opts = pdfBytesOrOptions;
        if (opts.pdfBytes) sourceBytes = opts.pdfBytes;
        if (Array.isArray(opts.fields)) targetFields = opts.fields;
    }

    // Pre-evaluate calculations to ensure current field values are computed before PDF export
    try {
        if (Array.isArray(targetFields)) {
            evaluateCalculations(targetFields);
        }
    } catch(e) {
        console.warn("Could not pre-evaluate calculations before PDF export:", e);
    }

    if (!sourceBytes) throw new Error("No PDF loaded.");
    await loadPdfLibraries();

    const pdfLib = typeof window !== "undefined" ? (window.PDFLib || globalThis.PDFLib) : (typeof PDFLib !== "undefined" ? PDFLib : null);
    if (!pdfLib) throw new Error("PDF-Lib not initialized.");
    const { PDFDocument, StandardFonts, rgb } = pdfLib;

    // Load source document and create a pristine target document with copied pages.
    // This completely eliminates circular AcroForm trees, XFA stream recursion, and duplicate widget
    // annotations present in pre-designed/fillable forms, preventing "Maximum call stack size exceeded" errors.
    const loadedSource = await PDFDocument.load(sourceBytes.slice(), { ignoreEncryption: true });
    const doc = await PDFDocument.create();
    
    // Register fontkit if present in environment
    if (typeof window !== "undefined" && window.fontkit) {
        try { doc.registerFontkit(window.fontkit); } catch(e) {}
    }

    const pageIndices = loadedSource.getPageIndices();
    const copiedPages = await doc.copyPages(loadedSource, pageIndices);

    for (const cp of copiedPages) {
        // Enforce ISO-compliant logical row tab order (/Tabs /R) for Acrobat, Chrome, Preview, etc.
        try {
            cp.node.set(pdfLib.PDFName.of("Tabs"), pdfLib.PDFName.of("R"));
        } catch(e) {}

        // Strip residual widget annotations from copied page nodes so old form fields don't linger
        const annotsRaw = cp.node.get(pdfLib.PDFName.of("Annots"));
        if (annotsRaw) {
            const annots = doc.context.lookup(annotsRaw);
            if (annots instanceof pdfLib.PDFArray) {
                const nonWidgets = [];
                for (let i = 0; i < annots.size(); i++) {
                    const annotRef = annots.get(i);
                    const annotDict = doc.context.lookup(annotRef);
                    if (annotDict && annotDict.get) {
                        const subtype = annotDict.get(pdfLib.PDFName.of("Subtype"));
                        if (subtype && subtype.toString() === "/Widget") continue;
                    }
                    nonWidgets.push(annotRef);
                }
                if (nonWidgets.length === 0) {
                    cp.node.delete(pdfLib.PDFName.of("Annots"));
                } else {
                    cp.node.set(pdfLib.PDFName.of("Annots"), doc.context.obj(nonWidgets));
                }
            }
        }
        doc.addPage(cp);
    }

    const form = doc.getForm();
    const pages = doc.getPages();
    pages.forEach(p => {
        try {
            p.node.set(pdfLib.PDFName.of("Tabs"), pdfLib.PDFName.of("R"));
        } catch(e) {}
    });
    const usedNames = new Set();

    // Embed Standard Vector Fonts for razor-sharp vector rendering
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
    const times = await doc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const courier = await doc.embedFont(StandardFonts.Courier);
    const courierBold = await doc.embedFont(StandardFonts.CourierBold);
    const courierOblique = await doc.embedFont(StandardFonts.CourierOblique);

    const resolveFont = (fam) => {
        switch (fam) {
            case "times": return times;
            case "times-bold": return timesBold;
            case "times-italic": return timesItalic;
            case "courier": return courier;
            case "courier-bold": return courierBold;
            case "courier-oblique": return courierOblique;
            case "helvetica-bold": return helveticaBold;
            case "helvetica-oblique": return helveticaOblique;
            case "roboto-mono":
            case "ibm-plex-mono": return courier;
            case "caveat":
            case "cedarville": return timesItalic;
            case "inter":
            case "carlito":
            case "helvetica":
            default: return helvetica;
        }
    };

    // Populate AcroForm default resource font dictionary safely
    try {
        const acroForm = doc.catalog.getOrCreateAcroForm();
        const acroFormDict = acroForm.dict;
        let drRaw = acroFormDict.get(PDFLib.PDFName.of("DR"));
        let drDict = drRaw ? doc.context.lookup(drRaw) : null;
        if (!drDict || !(drDict instanceof PDFLib.PDFDict)) {
            drDict = doc.context.obj({});
            acroFormDict.set(PDFLib.PDFName.of("DR"), drDict);
        }
        let fontRaw = drDict.get(PDFLib.PDFName.of("Font"));
        let fontDict = fontRaw ? doc.context.lookup(fontRaw) : null;
        if (!fontDict || !(fontDict instanceof PDFLib.PDFDict)) {
            fontDict = doc.context.obj({});
            drDict.set(PDFLib.PDFName.of("Font"), fontDict);
        }
        const embeddedFonts = [helvetica, helveticaBold, helveticaOblique, times, timesBold, timesItalic, courier, courierBold, courierOblique];
        embeddedFonts.forEach(ef => {
            if (ef && ef.name && ef.ref) {
                fontDict.set(PDFLib.PDFName.of(ef.name), ef.ref);
            }
        });
    } catch (e) {
        console.warn("Could not register fonts in AcroForm DR dictionary:", e);
    }

    const calcOrderRefs = [];
    const calcOrderMap = new Map();
    const fieldsToCompile = (opts && opts.preserveExplicitOrder) ? targetFields : sortFieldsByReadingOrder(targetFields);
    for (let f of fieldsToCompile) {
        const pageIdx = Math.max(0, Math.min(pages.length - 1, (f.page || 1) - 1));
        const page = pages[pageIdx] || pages[0];
        if (!page) continue;
        const pageHeight = page.getHeight();
        
        let nm = (f.name || `field_${f.id}`).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        if (f.autofill && (!f.name || f.name.startsWith("field_") || f.name.startsWith("textField_") || f.name.startsWith("input_"))) {
            nm = f.autofill;
        }
        if (f.type !== "radioGroup" && f.type !== "radio") {
            if (!nm || usedNames.has(nm)) {
                nm = `${nm || "field"}_${f.id}`;
            }
            usedNames.add(nm);
        } else if (!nm) {
            nm = `radioGroup_${f.id}`;
        }

        // Coordinate inversion (PDF origin is bottom-left)
        const pdfY = pageHeight - f.y - f.height;
        const common = {
            x: f.x,
            y: pdfY,
            width: f.width,
            height: f.height
        };

        if (f.borderStyle === "none") {
            common.borderWidth = 0;
            common.borderColor = undefined;
        } else {
            common.borderWidth = 1;
            common.borderColor = rgb(0.6, 0.6, 0.6);
        }

        if (f.fillStyle === "tint") {
            common.backgroundColor = rgb(0.93, 0.96, 1.0);
            if (f.borderStyle !== "none") common.borderColor = rgb(0.5, 0.7, 0.95);
        } else if (f.fillStyle === "yellow") {
            common.backgroundColor = rgb(1.0, 0.99, 0.88);
            if (f.borderStyle !== "none") common.borderColor = rgb(0.85, 0.75, 0.35);
        } else if (f.fillStyle === "transparent") {
            common.backgroundColor = undefined;
        } else {
            common.backgroundColor = rgb(1.0, 1.0, 1.0);
        }

        try {
            if (f.type === "staticText" || f.type === "label") {
                const font = resolveFont(f.fontFamily || (f.fontWeight === "bold" ? "helvetica-bold" : "helvetica"));
                const fontSize = (f.fontSize && parseInt(f.fontSize) >= 4) ? parseInt(f.fontSize) : 14;
                const textContent = f.defaultValue || f.label || f.value || f.name || "Text / Heading";

                if (common.backgroundColor) {
                    page.drawRectangle({
                        x: f.x,
                        y: pdfY,
                        width: f.width,
                        height: f.height,
                        color: common.backgroundColor,
                        borderColor: common.borderColor,
                        borderWidth: common.borderWidth || 0
                    });
                }

                let textX = f.x + 4;
                let textY = pdfY + (f.height - fontSize) / 2 + 1;
                try {
                    const textWidth = font.widthOfTextAtSize(textContent, fontSize);
                    if (f.textAlignment === "center") {
                        textX = f.x + (f.width - textWidth) / 2;
                    } else if (f.textAlignment === "right") {
                        textX = f.x + f.width - textWidth - 4;
                    }
                } catch (e) {}

                page.drawText(textContent, {
                    x: Math.max(f.x, textX),
                    y: Math.max(pdfY, textY),
                    size: fontSize,
                    font: font,
                    color: rgb(0.06, 0.09, 0.16)
                });
                continue;
            }

            if (f.type === "textField" || f.type === "dateField" || f.type === "date" || f.type === "number") {
                let tf;
                try { tf = form.getTextField(nm); } catch { tf = form.createTextField(nm); }

                try { if (f.multiline) tf.enableMultiline(); } catch(e) {}
                try { if (f.readOnly) tf.enableReadOnly(); } catch(e) {}
                try { if (f.required) tf.enableRequired(); } catch(e) {}
                try { if (f.maxLength) tf.setMaxLength(f.maxLength); } catch(e) {}
                
                if (f.isComb && f.maxLength > 1) {
                    try {
                        const len = parseInt(f.maxLength, 10);
                        tf.setMaxLength(len);
                        // PDF 1.7 / ISO 32000-1 §12.7.4.3: Bit 25 is Comb (1 << 24 = 16777216)
                        const currentFlags = tf.acroField.getFlags();
                        tf.acroField.setFlags(currentFlags | (1 << 24));
                    } catch (combErr) {
                        console.warn("Could not set comb flag on text field:", combErr);
                    }
                }

                // Calculation Script (/AA << /C << /S /JavaScript /JS (...) >> >>)
                if (f.calculationType && f.calculationType !== "none") {
                    try {
                        const jsCode = compileFormulaToAcroJs(f, targetFields);
                        if (jsCode) {
                            const jsAction = doc.context.obj({
                                S: PDFLib.PDFName.of("JavaScript"),
                                JS: PDFLib.PDFString.of(jsCode)
                            });
                            const aaDict = doc.context.obj({
                                C: jsAction
                            });
                            tf.acroField.dict.set(PDFLib.PDFName.of("AA"), aaDict);
                            if (tf.acroField.ref) {
                                calcOrderRefs.push(tf.acroField.ref);
                                calcOrderMap.set(nm, { ref: tf.acroField.ref, field: f });
                            }
                            f._aaDict = aaDict;
                        }
                    } catch (calcErr) {
                        console.warn("Could not attach calculation script to field:", calcErr);
                    }
                }
                
                // Attach Currency Formatting Action (/F) & Keystroke Action (/K)
                if (f.dataFormat === "currency") {
                    try {
                        const sym = f.currencySymbol || "$";
                        const pos = f.currencyPosition || (sym === "€" ? "suffix" : "prefix");
                        const dec = f.currencyDecimals !== undefined ? Number(f.currencyDecimals) : 2;
                        const isPrepend = (pos === "prefix");

                        const formatScript = `if (typeof AFNumber_Format === "function") { AFNumber_Format(${dec}, 0, 0, 0, ${JSON.stringify(sym)}, ${isPrepend}); } else if (event.value !== null && event.value !== "") { var n = parseFloat(("" + event.value).replace(/[^0-9.-]/g, "")); if (!isNaN(n)) { var formatted = n.toFixed(${dec}); event.value = ${isPrepend} ? (${JSON.stringify(sym)} + formatted) : (formatted + " " + ${JSON.stringify(sym)}); } }`;
                        const formatAction = doc.context.obj({
                            S: PDFLib.PDFName.of("JavaScript"),
                            JS: PDFLib.PDFString.of(formatScript)
                        });

                        const keystrokeScript = `if (typeof AFNumber_Keystroke === "function") { AFNumber_Keystroke(${dec}, 0, 0, 0, ${JSON.stringify(sym)}, ${isPrepend}); }`;
                        const keystrokeAction = doc.context.obj({
                            S: PDFLib.PDFName.of("JavaScript"),
                            JS: PDFLib.PDFString.of(keystrokeScript)
                        });

                        let aaDict = f._aaDict;
                        if (!aaDict) {
                            aaDict = doc.context.obj({});
                            tf.acroField.dict.set(PDFLib.PDFName.of("AA"), aaDict);
                            f._aaDict = aaDict;
                        }
                        aaDict.set(PDFLib.PDFName.of("F"), formatAction);
                        aaDict.set(PDFLib.PDFName.of("K"), keystrokeAction);
                    } catch (fmtErr) {
                        console.warn("Could not attach format script to field:", fmtErr);
                    }
                }

                // Enhanced PDF Viewer Autofill Descriptor (/TU)
                const autoFillTooltip = resolveAutofillTooltip(f);
                try { tf.setToolTip(autoFillTooltip || f.name.replace(/_/g, " ")); } catch(e) {}
                let align = f.textAlignment;
                if (!align) {
                    if (f.dataFormat === "currency" || f.dataFormat === "number" || (f.calculationType && f.calculationType !== "none")) {
                        align = "right";
                    } else {
                        align = "left";
                    }
                }
                f.textAlignment = align;

                // Select font & font size
                const font = resolveFont(f.fontFamily);
                const fontSize = (f.fontSize && parseInt(f.fontSize) >= 4) ? parseInt(f.fontSize) : 11;
                try { tf.setFontSize(fontSize); } catch(e) {}

                try {
                    if (PDFLib.TextAlignment && tf.setAlignment) {
                        if (align === "center") tf.setAlignment(PDFLib.TextAlignment.Center);
                        else if (align === "right") tf.setAlignment(PDFLib.TextAlignment.Right);
                        else tf.setAlignment(PDFLib.TextAlignment.Left);
                    }
                } catch(e) {}

                // Set text value if present
                let textVal = (f.value !== undefined && f.value !== "") ? f.value : f.defaultValue;
                if (textVal !== undefined && textVal !== "") {
                    if (f.dataFormat === "currency") {
                        const sym = f.currencySymbol || "$";
                        const pos = f.currencyPosition || (sym === "€" ? "suffix" : "prefix");
                        const dec = f.currencyDecimals !== undefined ? Number(f.currencyDecimals) : 2;
                        const isPrepend = (pos === "prefix");
                        const raw = String(textVal).trim();
                        if (!raw.includes(sym) && !isNaN(Number(raw.replace(/,/g, "")))) {
                            const n = Number(raw.replace(/,/g, ""));
                            textVal = isPrepend ? `${sym}${n.toFixed(dec)}` : `${n.toFixed(dec)} ${sym}`;
                        }
                    }
                    try { tf.setText(String(textVal)); } catch(e) {}
                }

                // Add to page and compile vector appearance
                tf.addToPage(page, common);
                if (f._aaDict) {
                    const widgets = tf.acroField.getWidgets() || [];
                    widgets.forEach(w => {
                        try { w.dict.set(PDFLib.PDFName.of("AA"), f._aaDict); } catch(e) {}
                    });
                }
                try { tf.updateAppearances(font); } catch(e) {}
                applyTextFieldAppearance(tf, font, fontSize, align);

            } else if (f.type === "checkBox") {
                let cb;
                try { cb = form.getCheckBox(nm); } catch { cb = form.createCheckBox(nm); }
                try { if (f.readOnly) cb.enableReadOnly(); } catch(e) {}
                try { if (f.required) cb.enableRequired(); } catch(e) {}
                try { const cbTooltip = resolveAutofillTooltip(f); if (cbTooltip) cb.setToolTip(cbTooltip); } catch(e) {}
                cb.addToPage(page, common);
                if (f.defaultChecked || f.checked) {
                    try { cb.check(); } catch(e) {}
                } else {
                    try { cb.uncheck(); } catch(e) {}
                }
                const customProvider = checkboxAppearanceProvider(f.checkboxMark);
                try {
                    if (customProvider) {
                        cb.updateAppearances(customProvider);
                    } else {
                        cb.updateAppearances();
                    }
                } catch(e) {
                    console.warn("Could not set checkbox appearance:", e);
                }

            } else if (f.type === "dropdown") {
                let dd;
                try { dd = form.getDropdown(nm); } catch { dd = form.createDropdown(nm); }
                const opts = (f.options && f.options.length) ? f.options : ["Option 1"];
                try { dd.addOptions(opts); } catch(e) {}
                try { if (f.required) dd.enableRequired(); } catch(e) {}
                try { const ddTooltip = resolveAutofillTooltip(f); if (ddTooltip) dd.setToolTip(ddTooltip); } catch(e) {}
                
                const font = resolveFont(f.fontFamily);
                const fontSize = (f.fontSize && parseInt(f.fontSize) >= 4) ? parseInt(f.fontSize) : 11;
                try { dd.setFontSize(fontSize); } catch(e) {}
                if (!f.textAlignment) f.textAlignment = "left";
                try {
                    if (PDFLib.TextAlignment && dd.setAlignment) {
                        if (f.textAlignment === "center") dd.setAlignment(PDFLib.TextAlignment.Center);
                        else if (f.textAlignment === "right") dd.setAlignment(PDFLib.TextAlignment.Right);
                        else dd.setAlignment(PDFLib.TextAlignment.Left);
                    }
                } catch(e) {}

                dd.addToPage(page, common);

                try {
                    const chosen = (f.value !== undefined && f.value !== "") ? f.value : f.defaultValue;
                    if (chosen && opts.includes(chosen)) dd.select(chosen);
                    else if (opts.length > 0) dd.select(opts[0]);
                } catch(e) {}

                try { dd.updateAppearances(font); } catch(e) {}
                applyTextFieldAppearance(dd, font, fontSize, f.textAlignment || "left");

            } else if (f.type === "radioGroup" || f.type === "radio") {
                let rg;
                const rgName = f.radioGroup || nm;
                try { rg = form.getRadioGroup(rgName); } catch { rg = form.createRadioGroup(rgName); }
                const optionValue = f.exportValue || f.radioValue || f.value || `option_${f.id}`;
                rg.addOptionToPage(optionValue, page, common);
                if (f.defaultChecked || f.checked) {
                    try { rg.select(optionValue); } catch(e) {}
                }

            } else if (f.type === "signature") {
                const sigData = f.signatureImage || f.signatureData;
                if (sigData) {
                    // Pre-signed by form creator: embed stamp
                    try {
                        let pngBytes;
                        if (typeof sigData === "string" && sigData.startsWith("data:")) {
                            const base64Data = sigData.split(",")[1];
                            const binaryString = atob(base64Data);
                            pngBytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                pngBytes[i] = binaryString.charCodeAt(i);
                            }
                        } else {
                            pngBytes = sigData;
                        }
                        const pngImage = await doc.embedPng(pngBytes);
                        page.drawImage(pngImage, {
                            x: f.x,
                            y: pdfY,
                            width: f.width,
                            height: f.height
                        });
                    } catch(sigErr) {
                        console.error("Signature embed error:", sigErr);
                    }
                } else {
                    // Signable Form Field for Recipient: Draw baseline & create interactive field
                    page.drawLine({
                        start: { x: f.x + 2, y: pdfY + 6 },
                        end: { x: f.x + f.width - 2, y: pdfY + 6 },
                        thickness: 1,
                        color: rgb(0.6, 0.6, 0.6)
                    });
                    page.drawText("X", {
                        x: f.x + 4,
                        y: pdfY + 8,
                        size: 9,
                        color: rgb(0.4, 0.4, 0.4)
                    });

                    let tf;
                    try { tf = form.getTextField(nm); } catch { tf = form.createTextField(nm); }
                    try { tf.setToolTip(f.tooltip || "Click or type to sign document"); } catch(e) {}
                    try { if (f.required) tf.enableRequired(); } catch(e) {}
                    tf.addToPage(page, {
                        ...common,
                        y: pdfY + 8,
                        height: Math.max(20, f.height - 10),
                        backgroundColor: undefined
                    });
                    try { tf.updateAppearances(helvetica); } catch(e) {}
                }
            }
        } catch(fieldErr) {
            console.error(`Error adding field:`, fieldErr);
        }
    }

    // Attach Calculation Order Array (/CO) to AcroForm Catalog Dictionary
    if (calcOrderRefs.length > 0) {
        try {
            // Topologically sort calculated fields so upstream calculations evaluate before downstream dependencies
            const sortedCalcRefs = [];
            const visited = new Set();
            const visiting = new Set();

            function getFieldDeps(f) {
                if (!f) return [];
                const targets = Array.isArray(f.calculationFields)
                    ? f.calculationFields
                    : (f.calculationFields ? String(f.calculationFields).split(",").map(s => s.trim()).filter(Boolean) : []);
                if (f.calculationType === "sum" || f.calculationType === "prod") {
                    return targets.map(t => t.replace(/[^a-zA-Z0-9_-]/g, "_"));
                }
                if (f.calculationType === "tax" && f.calculationTaxBaseField) {
                    return [f.calculationTaxBaseField.replace(/[^a-zA-Z0-9_-]/g, "_")];
                }
                if (f.calculationType === "discount" && f.calculationDiscountBaseField) {
                    return [f.calculationDiscountBaseField.replace(/[^a-zA-Z0-9_-]/g, "_")];
                }
                if (f.calculationType === "custom" && f.calculationFormula) {
                    const tokens = f.calculationFormula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                    return tokens.map(t => t.replace(/[^a-zA-Z0-9_-]/g, "_"));
                }
                return [];
            }

            function visitField(name) {
                if (visited.has(name) || visiting.has(name)) return;
                visiting.add(name);
                const item = calcOrderMap.get(name);
                if (item) {
                    const deps = getFieldDeps(item.field);
                    for (const dep of deps) {
                        if (calcOrderMap.has(dep)) {
                            visitField(dep);
                        }
                    }
                    visited.add(name);
                    sortedCalcRefs.push(item.ref);
                }
                visiting.delete(name);
            }

            for (const name of calcOrderMap.keys()) {
                visitField(name);
            }

            const finalOrderRefs = sortedCalcRefs.length === calcOrderRefs.length ? sortedCalcRefs : calcOrderRefs;
            const acroForm = doc.catalog.getOrCreateAcroForm();
            acroForm.dict.set(PDFLib.PDFName.of("CO"), doc.context.obj(finalOrderRefs));
            // Trigger calculation engine initialization on document open
            const openJsAction = doc.context.obj({
                S: PDFLib.PDFName.of("JavaScript"),
                JS: PDFLib.PDFString.of("this.calculate = true; try { this.calculateNow(); } catch(e) {}")
            });
            doc.catalog.set(PDFLib.PDFName.of("OpenAction"), openJsAction);
        } catch(coErr) {
            console.warn("Could not set calculation order array /CO:", coErr);
        }
    }

    if (opts && opts.flatten) {
        try {
            form.flatten();
        } catch(flattenErr) {
            console.warn("Could not flatten form fields:", flattenErr);
        }
    }

    return await doc.save({ useObjectStreams: false });
}

export async function downloadAcroForm(customFilename) {
    try {
        const bytes = await buildPdf();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const name = customFilename || state.fileName || "interactive_form.pdf";
        a.download = name.endsWith(".pdf") ? name : `${name}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error("PDF Export error:", err);
        showToast("Failed to export PDF: " + err.message, "error");
    }
}

export async function downloadFlattenedPdf(customFilename) {
    try {
        const bytes = await buildPdf({ flatten: true });
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const baseName = (customFilename || state.fileName || "document").replace(/\.pdf$/i, "");
        a.download = `${baseName}_flattened.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error("Flattened PDF Export error:", err);
        showToast("Failed to export flattened PDF: " + err.message, "error");
    }
}
