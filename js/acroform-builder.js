// ── pdf-lib AcroForm Compiler & Exporter (js/acroform-builder.js) ─
import { state } from "./state.js";

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
        if (!nm || usedNames.has(nm)) {
            nm = `${nm || "field"}_${f.id}`;
        }
        usedNames.add(nm);

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
                const autofillRole = f.autofill || "";
                let autoFillTooltip = f.tooltip;
                if (!autoFillTooltip && autofillRole) {
                    const roleTitles = {
                        name: "Full Name", first_name: "First Name", last_name: "Last Name",
                        email: "Email Address", phone: "Phone Number", address1: "Street Address",
                        city: "City", state: "State / Province", zip: "Zip / Postal Code",
                        country: "Country", company: "Company Name", job_title: "Job Title", dob: "Date of Birth"
                    };
                    autoFillTooltip = `${roleTitles[autofillRole] || autofillRole} (Autofill)`;
                }
                try { tf.setToolTip(autoFillTooltip || f.name.replace(/_/g, " ")); } catch(e) {}

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
                if (f.defaultValue) {
                    try { tf.setText(String(f.defaultValue)); } catch(e) {}
                }

                // Add to page and compile vector appearance
                tf.addToPage(page, common);
                try { tf.updateAppearances(font); } catch(e) {}

            } else if (f.type === "checkBox") {
                let cb;
                try { cb = form.getCheckBox(nm); } catch { cb = form.createCheckBox(nm); }
                try { if (f.readOnly) cb.enableReadOnly(); } catch(e) {}
                try { if (f.required) cb.enableRequired(); } catch(e) {}
                try { if (f.tooltip) cb.setToolTip(f.tooltip); } catch(e) {}
                cb.addToPage(page, common);
                if (f.defaultChecked) {
                    try { cb.check(); } catch(e) {}
                }

            } else if (f.type === "dropdown") {
                let dd;
                try { dd = form.getDropdown(nm); } catch { dd = form.createDropdown(nm); }
                const opts = (f.options && f.options.length) ? f.options : ["Option 1"];
                try { dd.addOptions(opts); } catch(e) {}
                try { if (f.required) dd.enableRequired(); } catch(e) {}
                try { if (f.tooltip) dd.setToolTip(f.tooltip); } catch(e) {}
                
                let font = helvetica;
                if (f.fontFamily === "times") font = times;
                else if (f.fontFamily === "courier") font = courier;
                else if (f.fontFamily === "helvetica-bold") font = helveticaBold;
                else if (f.fontFamily === "times-italic") font = timesItalic;
                
                const fontSize = (f.fontSize && parseInt(f.fontSize) >= 4) ? parseInt(f.fontSize) : 11;
                try { dd.setFontSize(fontSize); } catch(e) {}

                dd.addToPage(page, common);

                try {
                    if (f.defaultValue && opts.includes(f.defaultValue)) dd.select(f.defaultValue);
                    else if (opts.length > 0) dd.select(opts[0]);
                } catch(e) {}

                try { dd.updateAppearances(font); } catch(e) {}

            } else if (f.type === "radioGroup") {
                let rg;
                try { rg = form.getRadioGroup(nm); } catch { rg = form.createRadioGroup(nm); }
                rg.addOptionToPage(f.radioValue || "Option1", page, common);
                if (f.defaultChecked) {
                    try { rg.select(f.radioValue || "Option1"); } catch(e) {}
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
        alert("Failed to export PDF: " + err.message);
    }
}
