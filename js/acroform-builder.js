// ── pdf-lib AcroForm Compiler & Exporter (js/acroform-builder.js) ─
import { state } from "./state.js";
import { showToast } from "./toast.js";

function checkboxAppearanceProvider(mark) {
    return (checkBox, widget) => {
        const rectangle = widget.getRectangle();
        const ap = widget.getAppearanceCharacteristics?.();
        const bs = widget.getBorderStyle?.();
        const borderWidth = bs?.getWidth?.() ?? 0;
        const width = rectangle.width - borderWidth;
        const height = rectangle.height - borderWidth;
        const borderColor = PDFLib.rgb(0, 0, 0);
        const markColor = PDFLib.rgb(0, 0, 0);
        const backgroundColor = ap?.getBackgroundColor?.();
        const outline = PDFLib.drawCheckBox({
            x: borderWidth / 2, y: borderWidth / 2, width, height,
            thickness: 1.5, borderWidth, borderColor, markColor,
            color: backgroundColor, filled: false
        });
        const markOperators = mark === "x"
            ? [
                ...PDFLib.drawLine({ start: { x: width * 0.25, y: height * 0.25 }, end: { x: width * 0.75, y: height * 0.75 }, thickness: 1.5, color: markColor }),
                ...PDFLib.drawLine({ start: { x: width * 0.25, y: height * 0.75 }, end: { x: width * 0.75, y: height * 0.25 }, thickness: 1.5, color: markColor })
            ]
            : PDFLib.drawCheckMark({ x: width / 2, y: height / 2, size: Math.min(width, height) / 2, thickness: 1.5, color: markColor });
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

function applyTextFieldAppearance(fieldObj, font, fontSize, fontFamily = "Helvetica") {
    if (!fieldObj) return;

    const family = {
        helvetica: "Helvetica",
        "helvetica-bold": "Helvetica-Bold",
        times: "Times-Roman",
        "times-italic": "Times-Italic",
        courier: "Courier"
    }[fontFamily] || "Helvetica";

    const appearance = `(0 0 0 rg /${family} ${fontSize} Tf)`;

    try {
        fieldObj.acroField.dict.set(
            PDFLib.PDFName.of("DA"),
            PDFLib.PDFString.of(appearance)
        );
    } catch (err) {
        console.warn("Could not set field DA explicitly:", err);
    }

    try { fieldObj.setFontSize(fontSize); } catch (e) {}

    try {
        fieldObj.acroField?.dict?.set?.(PDFLib.PDFName.of("Q"), PDFLib.PDFNumber.of(0));
    } catch (e) {}

    try {
        const widgets = fieldObj.acroField?.getWidgets?.() || [];
        widgets.forEach(widget => {
            try { widget.setDefaultAppearance(appearance); } catch (e) {}
            try { widget.dict.set(PDFLib.PDFName.of("DA"), PDFLib.PDFString.of(appearance)); } catch (e) {}
            try { widget.dict.set(PDFLib.PDFName.of("Q"), PDFLib.PDFNumber.of(0)); } catch (e) {}
        });
    } catch (err) {
        console.warn("Could not set widget appearance explicitly:", err);
    }
}

export async function buildPdf(options = {}) {
    if (!state.originalPdfBytes) throw new Error("No PDF loaded.");

    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    // Load fresh slice of bytes
    const doc = await PDFDocument.load(state.originalPdfBytes.slice(), { ignoreEncryption: true });
    const form = doc.getForm();
    const pages = doc.getPages();
    const usedNames = new Set();

    // Embed Standard Vector Fonts for razor-sharp vector rendering
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const times = await doc.embedFont(StandardFonts.TimesRoman);
    const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const courier = await doc.embedFont(StandardFonts.Courier);

    for (let f of state.fields) {
        const pageIdx = (f.page || 1) - 1;
        const page = pages[pageIdx] || pages[0];
        const pageHeight = page.getHeight();
        
        let nm = (f.name || `field_${f.id}`).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        if (f.autofill && (!f.name || f.name.startsWith("field_") || f.name.startsWith("textField_") || f.name.startsWith("input_"))) {
            nm = f.autofill;
        }
        // NOTE: radioGroup fields are exempt from the collision-rename below.
        // Multiple option fields in the SAME group are *supposed* to share one
        // name — that shared name is exactly how pdf-lib knows they belong to
        // the same mutually-exclusive RadioGroup (see form.getRadioGroup(nm) /
        // rg.addOptionToPage(...) further down). Force-renaming every option
        // after the first would silently split each row into isolated,
        // single-option radio groups instead of one real group.
        if (f.type !== "radioGroup") {
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
            if (f.type === "textField" || f.type === "dateField") {
                let tf;
                try { tf = form.getTextField(nm); } catch { tf = form.createTextField(nm); }

                try { if (f.multiline) tf.enableMultiline(); } catch(e) {}
                try { if (f.readOnly) tf.enableReadOnly(); } catch(e) {}
                try { if (f.required) tf.enableRequired(); } catch(e) {}
                try { if (f.maxLength) tf.setMaxLength(f.maxLength); } catch(e) {}
                
                // Enhanced PDF Viewer Autofill Descriptor (/TU)
                const autoFillTooltip = resolveAutofillTooltip(f);
                try { tf.setToolTip(autoFillTooltip || f.name.replace(/_/g, " ")); } catch(e) {}
                if (!f.textAlignment) f.textAlignment = "left";

                // Select font & font size
                let font = helvetica;
                if (f.fontFamily === "times") font = times;
                else if (f.fontFamily === "courier") font = courier;
                else if (f.fontFamily === "helvetica-bold") font = helveticaBold;
                else if (f.fontFamily === "times-italic") font = timesItalic;

                const fontSize = (f.fontSize && parseInt(f.fontSize) >= 4) ? parseInt(f.fontSize) : 11;
                try { tf.setFontSize(fontSize); } catch(e) {}

                try {
                    if (PDFLib.TextAlignment && tf.setAlignment) {
                        if (f.textAlignment === "center") tf.setAlignment(PDFLib.TextAlignment.Center);
                        else if (f.textAlignment === "right") tf.setAlignment(PDFLib.TextAlignment.Right);
                        else if (f.textAlignment === "left") tf.setAlignment(PDFLib.TextAlignment.Left);
                    }
                } catch(e) {}

                // Set text value if present
                const textVal = (f.value !== undefined && f.value !== "") ? f.value : f.defaultValue;
                if (textVal !== undefined && textVal !== "") {
                    try { tf.setText(String(textVal)); } catch(e) {}
                }

                // Add to page and compile vector appearance
                tf.addToPage(page, common);
                try { tf.updateAppearances(font); } catch(e) {}
                applyTextFieldAppearance(tf, font, fontSize, f.fontFamily || "helvetica");

            } else if (f.type === "checkBox") {
                let cb;
                try { cb = form.getCheckBox(nm); } catch { cb = form.createCheckBox(nm); }
                try { if (f.readOnly) cb.enableReadOnly(); } catch(e) {}
                try { if (f.required) cb.enableRequired(); } catch(e) {}
                try { const cbTooltip = resolveAutofillTooltip(f); if (cbTooltip) cb.setToolTip(cbTooltip); } catch(e) {}
                cb.addToPage(page, common);
                if (f.defaultChecked) {
                    try { cb.check(); } catch(e) {}
                }
                try { cb.updateAppearances(checkboxAppearanceProvider(f.checkboxMark || "check")); } catch(e) {
                    console.warn("Could not set checkbox appearance:", e);
                }

            } else if (f.type === "dropdown") {
                let dd;
                try { dd = form.getDropdown(nm); } catch { dd = form.createDropdown(nm); }
                const opts = (f.options && f.options.length) ? f.options : ["Option 1"];
                try { dd.addOptions(opts); } catch(e) {}
                try { if (f.required) dd.enableRequired(); } catch(e) {}
                try { const ddTooltip = resolveAutofillTooltip(f); if (ddTooltip) dd.setToolTip(ddTooltip); } catch(e) {}
                
                let font = helvetica;
                if (f.fontFamily === "times") font = times;
                else if (f.fontFamily === "courier") font = courier;
                else if (f.fontFamily === "helvetica-bold") font = helveticaBold;
                else if (f.fontFamily === "times-italic") font = timesItalic;
                
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
                applyTextFieldAppearance(dd, font, fontSize, f.fontFamily || "helvetica");

            } else if (f.type === "radioGroup") {
                let rg;
                try { rg = form.getRadioGroup(nm); } catch { rg = form.createRadioGroup(nm); }
                const optionValue = f.radioValue || f.value || `option_${f.id}`;
                rg.addOptionToPage(optionValue, page, common);
                if (f.defaultChecked) {
                    try { rg.select(optionValue); } catch(e) {}
                }

            } else if (f.type === "signature") {
                if (f.signatureImage) {
                    // Pre-signed by form creator: embed stamp
                    try {
                        let pngBytes;
                        if (typeof f.signatureImage === "string" && f.signatureImage.startsWith("data:")) {
                            const base64Data = f.signatureImage.split(",")[1];
                            const binaryString = atob(base64Data);
                            pngBytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                pngBytes[i] = binaryString.charCodeAt(i);
                            }
                        } else {
                            pngBytes = f.signatureImage;
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

    if (options && options.flatten) {
        try {
            form.flatten();
        } catch(flattenErr) {
            console.warn("Could not flatten form fields:", flattenErr);
        }
    }

    return await doc.save();
}

export async function downloadAcroForm() {
    try {
        const bytes = await buildPdf();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = state.fileName || "interactive_form.pdf";
        a.click();
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error("PDF Export error:", err);
        showToast("Failed to export PDF: " + err.message, "error");
    }
}
