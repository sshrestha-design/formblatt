// ── Universal Geometric Form Field Auto-Detector (js/engines/auto-detector.js) ──
// Pure geometric, typographical, and heuristic-based form field extraction.
// Zero hardcoded document titles, company names, or domain-specific constants.

import { state, generateFieldId } from "../core/state.js";
import { saveHistory } from "../core/storage-manager.js";

// ============================================================================
// 1. GENERIC SEMANTIC RESOLVER
// ============================================================================
export const GENERIC_PATTERNS = [
    // ── Dates (EN, DE, FR, ES, IT, PT, NL, NE/HI) ──
    { regex: /due\s*date|payment\s*due|f[äa]lligkeitsdatum|date\s*d['’]?[eé]ch[eé]ance|fecha\s*de\s*vencimiento|data\s*di\s*scadenza|data\s*de\s*vencimento|vervaldatum/i, id: "due_date", type: "dateField" },
    { regex: /expiration\s*date|exp\s*date|expiry|ablaufdatum|g[üu]ltig\s*bis|date\s*d['’]?expiration|fecha\s*de\s*(?:expiraci[óo]n|caducidad)|data\s*di\s*scadenza|data\s*de\s*validade|verloopdatum/i, id: "expiration_date", type: "dateField" },
    { regex: /date\s*approved|approval\s*date|genehmigungsdatum|date\s*d['’]?approbation|fecha\s*de\s*aprobaci[óo]n|data\s*di\s*approvazione/i, id: "date_approved", type: "dateField" },
    { regex: /birth\s*date|\bdob\b|date\s*of\s*birth|geburtsdatum|date\s*de\s*naissance|fecha\s*de\s*nacimiento|data\s*di\s*nascita|data\s*de\s*nascimento|geboortedatum|जन्म\s*मिति/i, id: "dob", type: "dateField" },
    { regex: /due\s*date|payment\s*due|pay\s*by|f[äa]lligkeitsdatum|date\s*d['’]?[\s]*[ée]ch[ée]ance|fecha\s*de\s*vencimiento|data\s*di\s*scadenza|vervaldatum/i, id: "due_date", type: "dateField" },
    { regex: /\bdate\b|\(yyyy-mm-dd\)|\(mm\/dd\/yyyy\)|yyyy\s*-\s*mm\s*-\s*dd|\(dd\/mm\/yyyy\)|datum\b|date\b|fecha\b|data\b|मिति|मितिः/i, id: "date", type: "dateField" },
    
    // ── Signatures (EN, DE, FR, ES, IT, PT, NL, NE/HI) ──
    { regex: /signature|sign\s*here|signed\s*by|^sign\b|unterschrift|unterschrieben|signatur|signé\s*par|firma\b|firmado\s*por|firmato\s*da|assinatura|assinado\s*por|handtekening|ondertekend|दस्तखत|हस्ताक्षर|सही\s*छाप/i, id: "signature", type: "signature" },

    // ── Financial & Numbers (EN, DE, FR, ES, IT, PT, NL, NE/HI) ──
    { regex: /invoice\s*(?:#|no|number|num)|rechnungs\s*(?:nr|nummer)|(?:n[°o]|num[eé]ro)\s*de\s*facture|n[úu]mero\s*de\s*factura|fattura\s*n\.?|fatura\s*n[°º]|factuurnummer|बिल\s*नं/i, id: "invoice_number", type: "textField", autofill: "invoice_num" },
    { regex: /po\s*(?:#|no|number|num)|purchase\s*order|contract\s*(?:#|no|number|num)|job\s*(?:#|no|number|num)|project\s*(?:#|no|number|num)|work\s*order|bestellnummer|bon\s*de\s*commande|orden\s*de\s*compra|ordine\s*d['’]?acquisto|ordem\s*de\s*compra|inkoopordernummer/i, id: "po_number", type: "textField" },
    { regex: /contractor\s*lic(?:ense)?|lic(?:ense)?\s*(?:#|no|number|num)|trade\s*lic(?:ense)?/i, id: "license_number", type: "textField" },
    { regex: /subtotal|zwischensumme|sous-total|subtotale|sub-total|subtotaal/i, id: "subtotal", type: "textField" },
    { regex: /retainage|retention\s*(?:amount|rate|fee)?/i, id: "retainage", type: "textField" },
    { regex: /\b(?:tax|vat|gst|mwst|ust|tva|iva|imposto|btw)\b|कर|भ्याट/i, id: "tax", type: "textField" },
    { regex: /total|balance\s*due|amount\s*due|gesamtbetrag|endbetrag|solde\s*d[uû]|importe\s*total|totale\s*dovuto|valor\s*total|totaalbedrag|कुल\s*जम्मा|जम्मा/i, id: "total", type: "textField" },
    { regex: /unit\s*price|hourly\s*rate|rate\s*(?:\/|\s*per\s*)hour|unit\s*cost|einzelpreis|prix\s*unitaire|precio\s*unitario|prezzo\s*unitario/i, id: "unit_price", type: "textField" },
    { regex: /\b(?:hours?|hrs?|stunden|heures|horas|ore|uren|घण्टा)\b/i, id: "hours", type: "textField" },
    { regex: /amount|price|rate|cost|\bfees?\b|charge|betrag|preis|kosten|geb[üu]hr|montant|prix|co[uû]t|tarif|importe|precio|tarifa|costo|valore|valor|pre[çc]o|prijs|bedrag|kosten|रकम|मूल्य|दर/i, id: "amount", type: "textField" },
    { regex: /\bqty\b|quantity|units|menge|anzahl|st[üu]ckzahl|quantit[ée]|quantit[àa]|cantidad|unidades|quantidade|aantal|परिमाण|संख्या/i, id: "quantity", type: "textField" },
    { regex: /payment\s*instructions|bank\s*(?:details|info|wire)|wire\s*instructions|zahlungsanweisungen/i, id: "payment_instructions", type: "textField", multiline: true },
    { regex: /routing|iban|swift|bic|bsb|bankleitzahl|blz|code\s*banque|c[óo]digo\s*bancario|खाता\s*नं/i, id: "routing_number", type: "textField" },
    { regex: /account\s*(?:#|no|number|num)|kontonummer|konto-nr|n[°o]\s*de\s*compte|n[úu]mero\s*de\s*cuenta|numero\s*conto|n[úu]mero\s*da\s*conta|rekeningnummer/i, id: "account_number", type: "textField" },
    { regex: /नागरिकता\s*(?:नं|नंबर|प्रमाण)/, id: "citizenship_number", type: "textField" },
    { regex: /ssn|social\s*security|tax\s*id|ein|national\s*id|steuernummer|steuer-id|sozialversicherungsnummer|n[°o]\s*s[eé]curit[eé]\s*sociale|siret|siren|nif|cif|dni|nie|codice\s*fiscale|partita\s*iva|cpf|cnpj|rg|bsn|burgerkrachtnummer|प्यान\s*नं|राष्ट्रिय\s*परिचय/i, id: "ssn", type: "textField" },

    // ── Contact & Identity (EN, DE, FR, ES, IT, PT, NL, NE/HI) ──
    { regex: /first\s*name|given\s*name|forename|vorname|pr[eé]nom|primer\s*nombre|nome\s*proprio|primeiro\s*nome|voornaam|पहिलो\s*नाम/i, id: "first_name", type: "textField", autofill: "given-name" },
    { regex: /last\s*name|surname|family\s*name|nachname|familienname|nom\s*de\s*famille|apellidos?|primer\s*apellido|segundo\s*apellido|cognome|sobrenome|achternaam|थर/i, id: "last_name", type: "textField", autofill: "family-name" },
    { regex: /full\s*name|complete\s*name|vollst[äa]ndiger\s*name|nom\s*complet|nombre\s*completo|nome\s*completo|volledige\s*naam|नाम\s*,?\s*थर|पूरा\s*नाम|आवेदकको\s*नाम|निवेदकको\s*नाम|^name\b|^nom\b|^nombre\b|^naam\b|^नाम\b/i, id: "full_name", type: "textField", autofill: "name" },
    { regex: /e-?mail|courriel|correo\s*electr[óo]nico|e-post|इमेल|ईमेल/i, id: "email", type: "textField", autofill: "email" },
    { regex: /phone|telephone|mobile|cell|fax|tel\b|telefon|handy|mobil|t[eé]l[eé]phone|portable|tel[eé]fono|m[oó]vil|cellulare|telefone|celular|telefoon|टेलिफोन|फोन|मोबाइल|सम्पर्क\s*नं/i, id: "phone", type: "textField", autofill: "tel" },
    { regex: /street\s*address|address\s*line|home\s*address|stra[ßs]e(?:\s*und\s*hausnummer)?|adresse|rue|direcci[óo]n|calle|indirizzo|via|endere[çc]o|rua|straat\s*(?:en\s*huisnummer)?|ठेगाना|घर\s*ठेगाना|टोल/i, id: "street_address", type: "textField", autofill: "address-line1" },
    { regex: /city|ort\b|stadt|ville|ciudad|municipio|citt[àa]|cidade|plaats|stad|नगरपालिका|गाउँपालिका/i, id: "city", type: "textField", autofill: "address-level2" },
    { regex: /state|province|region|bundesland|kanton|r[eé]gion|provincia|estado|provincie|जिल्ला|प्रदेश/i, id: "state", type: "textField", autofill: "address-level1" },
    { regex: /zip|postal\s*code|postcode|plz|postleitzahl|code\s*postal|c[óo]digo\s*postal|cap\b|cep\b|वडा\s*नं|पिन\s*कोड/i, id: "zip_code", type: "textField", autofill: "postal-code" },
    { regex: /country|land\b|pays|pa[íi]s|nazione|paese|देश/i, id: "country", type: "textField", autofill: "country-name" },
    { regex: /company|organization|employer|institution|firma|unternehmen|arbeitgeber|entreprise|soci[eé]t[eé]|employeur|empresa|instituci[óo]n|organiza[çc][ãa]o|bedrijf|werkgever|कार्यालय|कम्पनी|संस्था/i, id: "organization", type: "textField", autofill: "organization" },
    { regex: /title|role|position|designation|profession|occupation|berufsbezeichnung|beruf|funktion|poste|titre|cargo|puesto|profesi[óo]n|ruolo|mansione|profiss[ãa]o|functie|beroep|पद|ओहोदा/i, id: "job_title", type: "textField", autofill: "organization-title" },
    { regex: /department|division|unit|abteilung|bereich|d[eé]partement|service|departamento|secci[óo]n|dipartimento|afdeling|शाखा|विभाग/i, id: "department", type: "textField" },
    
    // ── Table Line Items & Description ──
    { regex: /item\s*description|item\s*details|beschreibung|d[eé]signation|descripci[óo]n|descrizione|descri[çc][ãa]o|omschrijving|विवरण|^description\b/i, id: "item_description", type: "textField" },

    // ── Notes & Multiline Freeform ──
    { regex: /comments|notes|remarks|explanation|justification|feedback|details|bemerkungen|hinweise|anmerkungen|remarques|observations|commentaires|comentarios|observaciones|notas|note\b|commenti|observa[çc][õo]es|opmerkingen|notities|कैफियत|प्रतिक्रिया/i, id: "comments", type: "textField", multiline: true },

    // ── South Asian Identity Details ──
    { regex: /नागरिकता\s*(?:नं|नंबर|प्रमाण)/, id: "citizenship_number", type: "textField" },
    { regex: /परिचय\s*पत्र|राहदानी\s*नं/, id: "id_number", type: "textField" },
    { regex: /संख्या|नं\.?\s*$|नम्बर/, id: "number", type: "textField" }
];

export const SEMANTIC_DIMENSIONS = {
    signature: { width: 200, height: 40, type: "signature" },
    dateField: { width: 110, height: 22, type: "dateField" },
    zip: { width: 85, height: 22, type: "textField" },
    state: { width: 65, height: 22, type: "textField" },
    phone: { width: 130, height: 22, type: "textField" },
    email: { width: 220, height: 22, type: "textField" },
    ssn: { width: 120, height: 22, type: "textField" },
    currency: { width: 100, height: 22, type: "textField" },
    multiline: { width: 340, height: 60, type: "textField", multiline: true }
};

/**
 * Compute 2D horizontal & vertical projection profiles to detect page margins, column boundaries, and gutters.
 */
export function calculateDocumentColumnBoundaries(rawBlocks, pageWidth, pageHeight) {
    if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
        return { margins: { left: 40, right: pageWidth - 40 }, columns: [{ x: 40, width: pageWidth - 80, right: pageWidth - 40 }] };
    }

    const sortedLefts = rawBlocks.map(b => b.x).filter(x => x > 15 && x < pageWidth * 0.4).sort((a, b) => a - b);
    const sortedRights = rawBlocks.map(b => b.x + b.width).filter(x => x > pageWidth * 0.6 && x < pageWidth - 15).sort((a, b) => a - b);

    const marginLeft = sortedLefts.length > 0 ? sortedLefts[Math.floor(sortedLefts.length * 0.1)] : 40;
    const marginRight = sortedRights.length > 0 ? sortedRights[Math.floor(sortedRights.length * 0.9)] : pageWidth - 40;

    const binSize = 10;
    const numBins = Math.ceil(pageWidth / binSize);
    const occupancy = new Uint16Array(numBins);

    for (const b of rawBlocks) {
        const startBin = Math.max(0, Math.floor(b.x / binSize));
        const endBin = Math.min(numBins - 1, Math.floor((b.x + b.width) / binSize));
        for (let bin = startBin; bin <= endBin; bin++) {
            occupancy[bin]++;
        }
    }

    const gutters = [];
    let inGutter = false;
    let gutterStart = 0;

    const searchStartBin = Math.floor(marginLeft / binSize) + 2;
    const searchEndBin = Math.floor(marginRight / binSize) - 2;

    for (let bin = searchStartBin; bin <= searchEndBin; bin++) {
        const isLowOccupancy = occupancy[bin] <= 1;
        if (isLowOccupancy && !inGutter) {
            inGutter = true;
            gutterStart = bin * binSize;
        } else if (!isLowOccupancy && inGutter) {
            inGutter = false;
            const gutterEnd = bin * binSize;
            if (gutterEnd - gutterStart >= 20) {
                gutters.push({ x: gutterStart, width: gutterEnd - gutterStart });
            }
        }
    }

    const columns = [];
    let curX = marginLeft;
    for (const g of gutters) {
        if (g.x - curX >= 100) {
            columns.push({ x: curX, width: g.x - curX, right: g.x });
            curX = g.x + g.width;
        }
    }
    if (marginRight - curX >= 100) {
        columns.push({ x: curX, width: marginRight - curX, right: marginRight });
    }

    if (columns.length === 0) {
        columns.push({ x: marginLeft, width: Math.max(100, marginRight - marginLeft), right: marginRight });
    }

    return {
        margins: { left: marginLeft, right: marginRight },
        columns,
        gutters
    };
}

export function resolveSemanticProps(rawLabel, defaultType = "textField", usedNames = new Set()) {
    const clean = (rawLabel || "").trim().replace(/[:_.\s-]+$/, "");
    let baseId = "";
    let type = defaultType;
    let multiline = false;
    let autofill = "";
    let dataFormat = "text";

    for (const item of GENERIC_PATTERNS) {
        if (item.regex.test(clean)) {
            baseId = item.id;
            if (item.type) type = item.type;
            if (item.multiline) multiline = true;
            if (item.autofill) autofill = item.autofill;
            break;
        }
    }

    // Determine semantic data format
    if (type === "dateField" || /date|dob/i.test(baseId || clean)) {
        dataFormat = "date";
    } else if (/amount|price|subtotal|tax|total|cost|fee|rate/i.test(baseId || clean)) {
        dataFormat = "currency";
    } else if (/qty|quantity|units|hours|miles|number|num|#|ssn|zip|postal/i.test(baseId || clean)) {
        dataFormat = "number";
    } else if (/email/i.test(baseId || clean)) {
        dataFormat = "email";
    } else if (/phone|tel|mobile|cell|fax/i.test(baseId || clean)) {
        dataFormat = "phone";
    }

    if (!baseId) {
        // NOTE: strip only whitespace/punctuation here, never non-Latin
        // letters. A naive `[^a-z0-9\s]` filter treats every non-ASCII
        // script (Devanagari, Arabic, CJK, ...) as noise and erases the
        // label down to "", which is how every unmatched field on a
        // Devanagari form used to collapse to the same generic id. The
        // \p{L}/\p{N} Unicode property classes (with the "u" flag) keep
        // letters/digits from ANY script instead.
        const slugify = (s) => {
            const words = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).slice(0, 3);
            return words.length > 0 && words[0].length > 0 ? words.join("_") : "";
        };
        if (type === "signature") {
            baseId = "signature";
        } else if (type === "checkBox") {
            baseId = slugify(clean) || "checkbox";
        } else if (type === "radioGroup") {
            baseId = slugify(clean) || "option";
        } else if (type === "dateField") {
            baseId = "date";
        } else {
            baseId = slugify(clean) || "field";
        }
    }

    let finalId = baseId;
    let counter = 1;
    while (usedNames.has(finalId)) {
        counter++;
        finalId = `${baseId}_${counter}`;
    }
    usedNames.add(finalId);

    return { name: finalId, type, multiline, autofill, dataFormat };
}

// ============================================================================
// 2. UNIVERSAL STATIC TEXT & BANNER HEURISTICS (Zero Hardcoded Names)
// ============================================================================
function isUniversalStaticText(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // 0. Decorative rule lines / separator symbols (e.g. "------", "======", "******", "━━━━━")
    if (/^[_\-=\*#•·—–─━│┃┌┐└┘├┤┬┴┼░▒▓█\s]+$/.test(clean) && clean.length >= 3) {
        return true;
    }

    // 0.5 Long questions & inquiry sentences (>2 words or >15 chars) are static text, never form fields or field labels.
    // Short 1-2 word column headers (e.g. "Sick?", "Active?", "Yes?", "No?") are valid checkbox/column prompts.
    if (clean.includes("?") && (clean.split(/\s+/).length > 2 || clean.length > 15)) {
        return true;
    }

    const cleanNoColon = clean.replace(/[:ः]$/, "").trim();

    // 1. Form metadata, catalog numbers, OMB numbers, revisions, disclaimers
    if (/^(?:omb\s*no|cat(?:alog)?\.?\s*no|form\s*\d+|rev(?:ision)?\.?|irs\s*use|official\s*use|page\s*\d+|paperwork\s+reduction|privacy\s+act|see\s+instructions?|copyright|all\s+rights\s+reserved|department\s+of|internal\s+revenue|keep\s+for\s+your\s+records|for\s+(?:your\s+)?records|records?|record|voucher|receipt|tear\s+here|cut\s+here|detach\s+here|fold\s+here|do\s+not\s+detach)\b/i.test(cleanNoColon)) {
        return true;
    }

    // 2. Numbered or named section headings, banners & instructional callouts (e.g. "Section 1: General Info", "Part A: Details", "Note:", "Caution:", "Instructions:")
    if (/^(?:section|abschnitt|teil|kapitel|partie|chapitre|secci[óo]n|sezione|parte|deel|hoofdstuk|part|step|item|schedule|table|note|notice|instruction|instructions|disclaimer|summary|caution|warning|tip|important|remember|example|refer|attach|send\s+to|mail\s+to|go\s+to|website|url|http|www|for\s+details|see\s+page|direction|directions|guideline|guidelines|purpose|definition|definitions|future|general|specific|privacy|paperwork|official|requirements|overview|background|penalty|penalties|deadline)\b/i.test(cleanNoColon)) {
        return true;
    }
    if (/^\d+[.)]\s+[\p{L}\s&()/ -]+$/iu.test(cleanNoColon) && cleanNoColon.split(/\s+/).length <= 6) {
        return true;
    }

    // 2.5 Sentences starting with question auxiliary verbs or wh-question words
    if (/^(?:are|is|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might|must|shall|what|where|when|which|why|how|who|whom|whose)\b/i.test(cleanNoColon)) {
        return true;
    }

    // 2.6 Numbered questions or instructions (e.g. "1. Are you sick today?", "10. In the past year...")
    if (/^\s*\d+[\s.)-]+\s*(?:are|is|was|were|do|does|did|have|has|had|can|could|will|would|should|what|where|when|which|why|how|if|in|for|during|has|please)\b/i.test(cleanNoColon)) {
        return true;
    }

    // 2.7 Instructional conditional clauses and contact modes
    if (/^(?:if\s+you|please\s+(?:enter|print|check|indicate|select|provide|consult|refer)|for\s+(?:patients|official|healthcare|office)|in\s+the\s+past|in\s+person|en\s+español|by\s+mail|by\s+phone|online|telephone|toll-free)\b/i.test(cleanNoColon)) {
        return true;
    }

    // 2.8 Long sentences, paragraphs, or legal disclaimer text (high word count)
    if (clean.length > 50 || clean.split(/\s+/).length > 8 || (clean.endsWith(".") && clean.split(/\s+/).length > 4)) {
        return true;
    }

    // 3. Pure instruction in parentheses (e.g. "(Please print clearly)", "(Check all that apply)")
    if (/^\([^)]+\)$/.test(clean)) {
        return true;
    }

    // 4. Pure single numbers or list indices (e.g. "1", "2", "3")
    if (/^\d+$/.test(clean)) {
        return true;
    }

    // 5. Standalone currency symbols
    if (/^[\$\€\£\¥]$/.test(clean)) {
        return true;
    }

    return false;
}

// ============================================================================
// 2.5 EXISTING ACROFORM WIDGET PASSTHROUGH
// ============================================================================
export async function getExistingWidgetFields(page, viewport, pageNum, usedNames = new Set()) {
    let annotations;
    try {
        annotations = await page.getAnnotations({ intent: "display" });
    } catch (err) {
        console.warn("Failed to read annotations on page " + pageNum + ":", err);
        return [];
    }

    if (!Array.isArray(annotations)) return [];
    const widgets = annotations.filter(a => {
        return a.subtype === "Widget" && Array.isArray(a.rect) && a.rect.length === 4 &&
            (a.fieldName || a.alternativeText || a.id);
    });
    const fields = [];

    for (const w of widgets) {
        const [x0, y0, x1, y1] = w.rect;
        const left = Math.min(x0, x1);
        const right = Math.max(x0, x1);
        const top = viewport.height - Math.max(y0, y1);
        const bottom = viewport.height - Math.min(y0, y1);

        const fieldFlags = w.fieldFlags || 0;
        const isRadio = (w.checkBox === false && w.radioButton === true) || (!!(fieldFlags & 32768));
        const isCheckbox = w.checkBox === true || (w.fieldType === "Btn" && !isRadio && !(fieldFlags & 65536));
        const isMultiline = !!(fieldFlags & 4096);

        let type = "textField";
        let options = undefined;
        let defaultValue = undefined;

        if (w.fieldType === "Btn") {
            type = isRadio ? "radioGroup" : "checkBox";
        } else if (w.fieldType === "Sig") {
            type = "signature";
        } else if (w.fieldType === "Ch") {
            type = "dropdown";
            options = Array.isArray(w.options)
                ? w.options.map(o => typeof o === "string" ? o : (o.displayValue || o.exportValue || ""))
                : ["Select...", "Option 1", "Option 2"];
            defaultValue = w.fieldValue || (options.length > 0 ? options[0] : "Select...");
        } else if (/date/i.test(w.fieldName || "")) {
            type = "dateField";
        }

        const sourceName = w.fieldName || w.alternativeText || w.id || "field";
        const semanticNames = isRadio ? new Set() : usedNames;
        const sem = resolveSemanticProps(sourceName, type, semanticNames);
        const fieldName = isRadio
            ? sourceName
            : (usedNames.has(sourceName) ? sem.name : sourceName);
        if (!isRadio) usedNames.add(fieldName);

        fields.push({
            id: generateFieldId(),
            type,
            // Keep the PDF field name when possible. This makes exported
            // fields stable and prevents native viewer autofill from losing
            // the original field identity.
            name: fieldName || sem.name,
            value: w.buttonValue || w.fieldValue || "",
            ...(type === "dropdown" ? { options, defaultValue } : {}),
            ...(isRadio ? {
                radioGroup: sourceName,
                exportValue: w.buttonValue || w.fieldValue || "",
                radioValue: w.buttonValue || w.fieldValue || "",
                defaultChecked: !!(w.fieldValue && w.fieldValue !== "Off")
            } : {}),
            x: Math.max(0, Math.round(left)),
            y: Math.max(0, Math.round(top)),
            width: Math.max(10, Math.round(right - left)),
            height: Math.max(10, Math.round(bottom - top)),
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: isMultiline || sem.multiline || false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            sourcedFrom: "acroform",
            sourceFieldName: sourceName
        });
    }

    return fields;
}

export async function importExistingAcroFormFields(scope = "all") {
    if (!state.pdfDoc) return 0;
    const pagesToScan = scope === "current"
        ? [state.currentPageNum]
        : Array.from({ length: state.totalPages }, (_, i) => i + 1);
    const imported = [];
    const usedNames = new Set(state.fields.map(field => field.name));

    for (const pageNum of pagesToScan) {
        const page = await state.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        imported.push(...await getExistingWidgetFields(page, viewport, pageNum, usedNames));
    }

    const existing = state.fields.filter(field => !pagesToScan.includes(field.page || 1));
    const current = state.fields.filter(field => pagesToScan.includes(field.page || 1));
    const merged = [...existing, ...current];
    for (const field of imported) {
        if (!isOverlapping(field, merged, 0.2)) merged.push(field);
    }
    state.fields = merged;
    return imported.length;
}

function isOverlapping(field, list, threshold = 0.35) {
    return list.some(existing => {
        if (field.id && existing.id && field.id === existing.id) return false;
        if ((existing.page || 1) !== (field.page || 1)) return false;

        const xOverlap = Math.max(0, Math.min(field.x + field.width, existing.x + existing.width) - Math.max(field.x, existing.x));
        const yOverlap = Math.max(0, Math.min(field.y + field.height, existing.y + existing.height) - Math.max(field.y, existing.y));
        const overlapArea = xOverlap * yOverlap;
        if (overlapArea <= 0) return false;

        const fieldArea = field.width * field.height;
        const existingArea = existing.width * existing.height;
        const minArea = Math.min(fieldArea, existingArea);
        const unionArea = fieldArea + existingArea - overlapArea;
        const iou = unionArea > 0 ? overlapArea / unionArea : 0;
        const centerDistance = Math.hypot(
            (field.x + field.width / 2) - (existing.x + existing.width / 2),
            (field.y + field.height / 2) - (existing.y + existing.height / 2)
        );
        const similarSize = field.width / existing.width > 0.65 &&
            field.width / existing.width < 1.5 &&
            field.height / existing.height > 0.65 &&
            field.height / existing.height < 1.5;

        return minArea > 0 && (
            (overlapArea / minArea) > threshold ||
            (iou >= 0.15 && similarSize) ||
            (centerDistance <= 6 && similarSize)
        );
    });
}

// ============================================================================
// 3. NEURAL VISION TEXT BINDING & HYBRID ENRICHMENT
// ============================================================================
export function enrichNeuralFieldsWithText(rawNeuralFields, rawBlocks, usedNames = new Set(), pageNum = 1) {
    if (!Array.isArray(rawNeuralFields) || rawNeuralFields.length === 0) return [];
    const enriched = [];

    for (const nf of rawNeuralFields) {
        // Find nearest text label to the left or above within a reasonable bounding radius
        let closestBlock = null;
        let minDistance = Infinity;

        for (const tb of rawBlocks) {
            // Label is to the left of the field on approximately the same horizontal baseline
            const isLeft = tb.x + tb.width <= nf.x + 10 && (nf.x - (tb.x + tb.width)) <= 180;
            // Label is to the right of the field (common for checkboxes and radio buttons)
            const isRight = tb.x >= nf.x + nf.width - 6 && (tb.x - (nf.x + nf.width)) <= 200;
            const isSameRow = Math.abs((tb.y + tb.height / 2) - (nf.y + nf.height / 2)) <= Math.max(16, tb.height);

            // Label is directly above the field
            const isAbove = tb.y + tb.height <= nf.y + 4 && (nf.y - (tb.y + tb.height)) <= 30;
            const isColumnAligned = tb.x <= nf.x + nf.width && tb.x + tb.width >= nf.x - 20;

            if ((isLeft && isSameRow) || (isRight && isSameRow) || (isAbove && isColumnAligned)) {
                const dist = isLeft
                    ? (nf.x - (tb.x + tb.width))
                    : isRight
                        ? (tb.x - (nf.x + nf.width))
                        : ((nf.y - (tb.y + tb.height)) * 1.5);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestBlock = tb;
                }
            }
        }

        const rawLabel = closestBlock ? closestBlock.str : "";
        const sem = resolveSemanticProps(rawLabel, nf.type, usedNames);

        enriched.push({
            id: nf.id || generateFieldId(),
            type: nf.type || sem.type,
            name: sem.name,
            x: nf.x,
            y: nf.y,
            width: nf.width,
            height: nf.height,
            page: pageNum,
            borderStyle: nf.borderStyle || "solid",
            fillStyle: nf.fillStyle || "white",
            multiline: sem.multiline || false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            detectedBy: "neural_vision",
            confidence: nf.confidence || 0.8
        });
    }

    return enriched;
}

// ============================================================================
// 4. MAIN AUTO-DETECT CONTROLLER (HYBRID & FAST MODES)
// ============================================================================

/**
 * Pure, stateless detection engine that extracts form fields from any PDF.js document proxy.
 * Can be used standalone in Node.js, Web Workers, or Browser UI.
 */
export async function detectFormFieldsFromDoc(pdfDoc, options = {}) {
    if (!pdfDoc) return { fields: [], totalCount: 0, pages: [] };

    const totalPages = pdfDoc.numPages || options.totalPages || 1;
    const pagesToScan = options.pageNumber
        ? (Array.isArray(options.pageNumber) ? options.pageNumber : [options.pageNumber])
        : (options.scope === "all" ? Array.from({ length: totalPages }, (_, i) => i + 1) : [options.currentPageNum || 1]);

    const isHybridMode = options.mode === "hybrid" || options.mode === "deep" || options.useNeural === true;
    const existingFields = options.existingFields || [];
    const usedNames = new Set(existingFields.map(f => f.name));
    const allDetected = [];
    const pageSummaries = [];

    for (let pageNum of pagesToScan) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = (typeof page.getViewport === "function")
                ? page.getViewport({ scale: 1.0 })
                : { width: 612, height: 792 };

            // 1. Authoritative AcroForm passthrough — real widgets are trusted as-is
            const widgetFields = await getExistingWidgetFields(page, viewport, pageNum, usedNames);
            if (widgetFields.length > 0) {
                allDetected.push(...widgetFields);
                pageSummaries.push({
                    pageNumber: pageNum,
                    width: viewport.width,
                    height: viewport.height,
                    fields: widgetFields
                });
                continue;
            }
            const vectorShapes = await extractPdfVectorShapes(page, viewport);
            const boundaryLines = await detectTableGridLines(page);

            let rawBlocks = [];
            if (typeof page.getTextContent === "function") {
                const textContent = await page.getTextContent();
                rawBlocks = (textContent.items || []).map(item => {
                    const tx = item.transform ? item.transform[4] : (item.x || 0);
                    const ty = item.transform ? item.transform[5] : (item.y || 0);
                    const fontHeight = (item.transform && Math.abs(item.transform[3])) || item.height || 12;
                    return {
                        x: Math.round(tx),
                        y: Math.round((viewport.height || 792) - ty - fontHeight),
                        width: Math.round(item.width || 0),
                        height: Math.round(fontHeight),
                        str: (item.str || "").trim()
                    };
                }).filter(tb => tb.str.length > 0);
            }

            // 1.25 Scanned / Flattened PDF Client-Side OCR Fallback
            const isScannedDoc = rawBlocks.length < 5 || (vectorShapes.allRects?.length === 0 && (vectorShapes.paths?.length || 0) < 5);
            if (isScannedDoc && typeof document !== "undefined" && options.enableOcr !== false) {
                try {
                    const { performScannedPageOcr } = await import("./ocr-engine.js");
                    let ocrCanvas = null;
                    const mainCanvas = document.getElementById("pdfCanvas");
                    
                    if (mainCanvas && mainCanvas.width > 0 && pageNum === (options.currentPageNum || 1)) {
                        ocrCanvas = mainCanvas;
                    } else {
                        ocrCanvas = document.createElement("canvas");
                        const ocrScale = 2.0;
                        const ocrViewport = page.getViewport({ scale: ocrScale });
                        ocrCanvas.width = ocrViewport.width;
                        ocrCanvas.height = ocrViewport.height;
                        const ocrCtx = ocrCanvas.getContext("2d", { willReadFrequently: true });
                        await page.render({ canvasContext: ocrCtx, viewport: ocrViewport }).promise;
                    }

                    const ocrResult = await performScannedPageOcr(ocrCanvas, viewport, pageNum, options);
                    if (ocrResult.textBlocks && ocrResult.textBlocks.length > 0) {
                        rawBlocks = [...rawBlocks, ...ocrResult.textBlocks];
                    }
                    if (ocrResult.allRects && ocrResult.allRects.length > 0) {
                        vectorShapes.allRects = [...(vectorShapes.allRects || []), ...ocrResult.allRects];
                    }
                    if (ocrResult.underlines && ocrResult.underlines.length > 0) {
                        vectorShapes.underlines = [...(vectorShapes.underlines || []), ...ocrResult.underlines];
                    }
                } catch (ocrErr) {
                    console.warn("Client-side OCR scanning fallback:", ocrErr);
                }
            }

            // 1.5 Drawn Vector Rectangles & Checkboxes (Exact vector geometry)
            const drawnVectorFields = detectVectorDrawnFields(vectorShapes, rawBlocks, pageNum, usedNames, [...existingFields, ...widgetFields], { clusterRadios: true });

            let pageFields = [];
            if (drawnVectorFields.length > 0) {
                // When explicit vector geometry exists, it is authoritative.
                // Do not pollute real vector forms with synthetic text heuristics (fake table rows, bullet-point radios, etc.)
                pageFields = [...drawnVectorFields];
            } else {
                // Fallback for un-lined, text-only forms without vector boxes
                const latticeResult = await detectLatticeTableFields(page, rawBlocks, pageNum, usedNames, boundaryLines);
                const boundaryFields = boundaryLines[0]
                    ? detectUnderlineFields(boundaryLines[0], rawBlocks, pageNum, usedNames, [...existingFields, ...widgetFields, ...drawnVectorFields])
                    : [];

                const seedFields = [...widgetFields, ...drawnVectorFields, ...latticeResult.fields, ...boundaryFields];
                const geometricFields = detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, seedFields, latticeResult.regions, vectorShapes);
                pageFields = [...latticeResult.fields, ...boundaryFields, ...geometricFields];
            }

            // 3. Optional In-Browser ONNX Neural Vision Detector (Hybrid Mode)
            if (isHybridMode && typeof document !== "undefined") {
                try {
                    const { detectNeuralFieldsOnCanvas } = await import("./onnx-detector.js");
                    const renderCanvas = document.createElement("canvas");
                    renderCanvas.width = viewport.width;
                    renderCanvas.height = viewport.height;
                    const renderCtx = renderCanvas.getContext("2d");
                    await page.render({ canvasContext: renderCtx, viewport }).promise;

                    const rawNeural = await detectNeuralFieldsOnCanvas(renderCanvas, pageNum, viewport);
                    const neuralFields = enrichNeuralFieldsWithText(rawNeural, rawBlocks, usedNames, pageNum);
                    for (const nf of neuralFields) {
                        if (!isOverlapping(nf, pageFields, 0.25)) {
                            pageFields.push(nf);
                        }
                    }
                } catch (neuralErr) {
                    console.warn("Neural vision inference skipped:", neuralErr);
                }
            }
            allDetected.push(...pageFields);
            pageSummaries.push({
                pageNumber: pageNum,
                width: viewport.width,
                height: viewport.height,
                fields: pageFields
            });
        } catch(err) {
            console.error("Auto-detect error on page " + pageNum + ":", err);
        }
    }

    const finalUnique = [];
    for (let f of allDetected) {
        if (!isOverlapping(f, existingFields, 0.35) &&
            !isOverlapping(f, finalUnique, 0.35)) {
            finalUnique.push(f);
        }
    }

    return {
        fields: finalUnique,
        totalCount: finalUnique.length,
        pages: pageSummaries
    };
}

/** Standalone alias for detectFormFieldsFromDoc */
export const detectFormFields = detectFormFieldsFromDoc;

/**
 * Formblatt UI Workflow wrapper — connects pure detection results into reactive application state.
 */
export async function autoDetectFields(scope = "current", options = {}) {
    if (!state.pdfDoc) {
        if (typeof alert === "function") alert("Please load a PDF document first.");
        return 0;
    }

    const pagesToScan = scope === "all"
        ? Array.from({ length: state.totalPages }, (_, i) => i + 1)
        : [state.currentPageNum];

    const preservedFields = state.fields.filter(f => {
        const pageIsScanned = pagesToScan.includes(f.page || 1);
        const isDetectorField = Boolean(f.detectedBy || f.sourcedFrom === "acroform");
        return !pageIsScanned || !isDetectorField;
    });

    const result = await detectFormFieldsFromDoc(state.pdfDoc, {
        ...options,
        pageNumber: pagesToScan,
        totalPages: state.totalPages,
        currentPageNum: state.currentPageNum,
        existingFields: preservedFields
    });

    if (result.fields.length > 0) {
        state.fields = [...preservedFields, ...result.fields];
        state.selectedFieldIds.clear();
        if (state.lastSelectedFieldId === null) {
            state.lastSelectedFieldId = state.fields.find(f => (f.page || 1) === state.currentPageNum)?.id
                || state.fields[0]?.id
                || null;
        }
        saveHistory();
    }

    return result.totalCount;
}


// Shared column-keyword vocabulary, used by both the new lattice
// (ruling-line) table detector and the existing stream (text-position)
// heuristic further down.
const TABLE_COL_DEFS = [
    { regex: /^(?:item\s*(?:#|no|num)?|pos\.?|position|art[íi]culo|artikel|art\.|क्र\.?\s*सं\.?)$/i, id: "item_no", name: "item" },
    { regex: /^(?:sku|part\s*#|code|artikelnr|r[eé]f[eé]rence|c[óo]digo|codice|c[óo]d)$/i, id: "sku", name: "sku" },
    { regex: /description|particulars|details|goods|services|purpose|attendees|beschreibung|bezeichnung|d[eé]signation|descripci[óo]n|descrizione|descri[çc][ãa]o|omschrijving|विवरण|सामानको\s*विवरण/i, id: "description", name: "description" },
    { regex: /^(?:qty|quantity|units|hours|miles|count|menge|anzahl|quantit[ée]|cantidad|quantit[àa]|quantidade|aantal|परिमाण|संख्या)$/i, id: "qty", name: "quantity" },
    { regex: /unit\s*price|price|rate|unit\s*cost|fee|charge|einzelpreis|preis|prix\s*unitaire|prix|precio\s*unitario|precio|prezzo\s*unitario|pre[çc]o\s*unit[áa]rio|eenheidsprijs|prijs|दर|प्रति\s*इकाई/i, id: "unit_price", name: "price" },
    { regex: /^(?:taxable|steuerpflichtig|imposable|imponible|tribut[áa]vel|belastbaar)$/i, id: "taxable", name: "taxable" },
    { regex: /^(?:amount|total|line\s*total|ext\s*price|gesamt|betrag|montant|total|importe|totale|valor|totaal|रकम|जम्मा)$/i, id: "amount", name: "amount" },
    { regex: /category|expense\s*type|kategorie|cat[eé]gorie|categor[íi]a|categoria|वर्गीकरण/i, id: "category", name: "category" },
    { regex: /merchant|vendor|payee|supplier|h[äa]ndler|liefrant|fournisseur|proveedor|fornitore|fornecedor|leverancier|विक्रेता/i, id: "merchant", name: "merchant" },
    { regex: /receipt|quittung|re[çc]u|recibo|ricevuta|रसिद/i, id: "receipt", name: "receipt" },
    { regex: /^(?:date|datum|fecha|data|मिति)$/i, id: "date", name: "date" },
    { regex: /school|institution|college|schule|universit[äa]t|[eé]cole|universit[eé]|escuela|universidad|scuola|escola|school|विद्यालय|क्याम्पस/i, id: "school", name: "school" },
    { regex: /degree|major|diploma|abschluss|dipl[oô]me|t[íi]tulo|laurea|diploma|डिग्री|उपाधि/i, id: "degree", name: "degree" },
    { regex: /graduated|graduation|year|jahr|ann[eé]e|a[ñn]o|anno|ano|jaar|साल|वर्ष/i, id: "year", name: "year" },
    { regex: /gpa|honors|grade|note|calificaci[óo]n|voto|nota|cijfier|श्रेणी|अंक/i, id: "gpa", name: "gpa" },
    { regex: /employer|company|arbeitgeber|firma|employeur|soci[eé]t[eé]|empleador|datore|empregador|werkgever|रोजगारदाता/i, id: "employer", name: "employer" },
    { regex: /position|job\s*title|role|position|funktion|poste|cargo|puesto|ruolo|functie|पद/i, id: "job_title", name: "job_title" },
    { regex: /medication|drug|medicine|medikament|m[eé]dicament|medicamento|medicinale|geneesmiddel|औषधि/i, id: "medication", name: "medication" },
    { regex: /dosage|frequency|dosierung|posologie|dosis|dosaggio|dosering|मात्रा/i, id: "dosage", name: "dosage" },
    { regex: /physician|doctor|arzt|m[eé]decin|m[eé]dico|dottore|arts|डाक्टर|चिकित्सक/i, id: "physician", name: "physician" }
];

function matchColumnKeyword(text) {
    for (const col of TABLE_COL_DEFS) {
        if (col.regex.test(text)) return col;
    }
    return null;
}

export function reconstructTableGridBoxes(hLines, vLines) {
    if (!hLines || !vLines || hLines.length < 2 || vLines.length < 2) return [];

    const cells = [];
    const yMap = new Map();
    hLines.forEach(l => {
        const roundedY = Math.round(l.y);
        let matchY = null;
        for (const existingY of yMap.keys()) {
            if (Math.abs(existingY - roundedY) <= 2) {
                matchY = existingY;
                break;
            }
        }
        if (matchY === null) {
            yMap.set(roundedY, [l]);
        } else {
            yMap.get(matchY).push(l);
        }
    });

    const xMap = new Map();
    vLines.forEach(v => {
        const roundedX = Math.round(v.x);
        let matchX = null;
        for (const existingX of xMap.keys()) {
            if (Math.abs(existingX - roundedX) <= 3) {
                matchX = existingX;
                break;
            }
        }
        if (matchX === null) {
            xMap.set(roundedX, [v]);
        } else {
            xMap.get(matchX).push(v);
        }
    });

    const uniqueYs = Array.from(yMap.keys()).sort((a, b) => a - b);
    const uniqueXs = Array.from(xMap.keys()).sort((a, b) => a - b);

    for (let i = 0; i < uniqueYs.length - 1; i++) {
        const yTop = uniqueYs[i];
        const yBottom = uniqueYs[i + 1];
        const h = yBottom - yTop;
        if (h < 8 || h > 45) continue;

        const colXs = uniqueXs.filter(x => {
            return vLines.some(vl => Math.abs(Math.round(vl.x) - x) <= 3 && vl.y1 <= yTop + 4 && vl.y2 >= yBottom - 4);
        });

        if (colXs.length >= 2) {
            for (let j = 0; j < colXs.length - 1; j++) {
                const xLeft = colXs[j];
                const xRight = colXs[j + 1];
                const w = xRight - xLeft;
                if (w >= 12 && w <= 450) {
                    cells.push({
                        x: xLeft,
                        y: yTop,
                        width: w,
                        height: h
                    });
                }
            }
        }
    }
    return cells;
}

// ============================================================================
// 3.5 VECTOR SHAPE EXTRACTION (Drawn Checkboxes, Input Boxes, & Underlines)
// ============================================================================
export async function extractPdfVectorShapes(pageOrOpList, viewport = { width: 612, height: 792 }) {
    const result = {
        checkboxRects: [],
        inputBoxRects: [],
        allRects: [],
        underlines: []
    };
    if (!pageOrOpList) return result;

    const hLines = [];
    const vLines = [];

    let operatorList;
    if (pageOrOpList.fnArray && pageOrOpList.argsArray) {
        operatorList = pageOrOpList;
    } else if (typeof pageOrOpList.getOperatorList === "function") {
        try {
            operatorList = await pageOrOpList.getOperatorList();
        } catch (err) {
            return result;
        }
    } else {
        return result;
    }

    const OPS = (typeof pdfjsLib !== "undefined" && pdfjsLib.OPS) ? pdfjsLib.OPS : {
        save: 1, restore: 2, transform: 3, moveTo: 13, lineTo: 14, curveTo: 15,
        curveTo2: 16, curveTo3: 17, closePath: 18, rectangle: 19, stroke: 20,
        closeStroke: 21, fill: 22, eoFill: 23, fillStroke: 24, closeFillStroke: 26,
        constructPath: 92
    };

    const stack = [];
    let matrix = [1, 0, 0, 1, 0, 0];
    const multiply = (left, right) => [
        left[0] * right[0] + left[2] * right[1],
        left[1] * right[0] + left[3] * right[1],
        left[0] * right[2] + left[2] * right[3],
        left[1] * right[2] + left[3] * right[3],
        left[0] * right[4] + left[2] * right[5] + left[4],
        left[1] * right[4] + left[3] * right[5] + left[5]
    ];
    const point = (x, y) => {
        const pdfPoint = [
            matrix[0] * x + matrix[2] * y + matrix[4],
            matrix[1] * x + matrix[3] * y + matrix[5]
        ];
        const vp = (viewport && typeof viewport.convertToViewportPoint === "function")
            ? viewport.convertToViewportPoint(...pdfPoint)
            : [pdfPoint[0], (viewport?.height || 792) - pdfPoint[1]];
        return { x: Math.round(vp[0]), y: Math.round(vp[1]) };
    };

    let current = null;
    let pathStart = null;
    let currentPolyline = [];

    const addRectCandidate = (minX, minY, w, h) => {
        if (w >= 6 && w <= 555 && h >= 6 && h <= 120) {
            result.allRects.push({ x: minX, y: minY, width: w, height: h });
        }
        if (w >= 6.5 && w <= 32 && h >= 6.5 && h <= 30 && (w / h >= 0.5 && w / h <= 2.2)) {
            result.checkboxRects.push({ x: minX, y: minY, width: w, height: h });
        } else if (h >= 8 && h <= 85 && w >= 15 && w <= 555) {
            result.inputBoxRects.push({ x: minX, y: minY, width: w, height: h });
        }
    };

    const checkClosedPolylineBox = (poly) => {
        if (!poly || poly.length < 4 || poly.length > 20) return;
        const xs = poly.map(p => p.x);
        const ys = poly.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = maxX - minX;
        const h = maxY - minY;
        if (w >= 8 && h >= 8) {
            // Check that points align near the boundary box (allowing rounded corner arcs up to 8px offset)
            const maxTolerance = (poly.length > 6) ? 8 : 4;
            const isNearBox = poly.every(p => 
                (Math.abs(p.x - minX) <= maxTolerance || Math.abs(p.x - maxX) <= maxTolerance) ||
                (Math.abs(p.y - minY) <= maxTolerance || Math.abs(p.y - maxY) <= maxTolerance)
            );
            if (isNearBox) {
                addRectCandidate(minX, minY, w, h);
            }
        }
    };

    for (let i = 0; i < (operatorList.fnArray || []).length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i] || [];

        if (fn === OPS.save) {
            stack.push([...matrix]);
        } else if (fn === OPS.restore) {
            matrix = stack.pop() || matrix;
        } else if (fn === OPS.transform) {
            matrix = multiply(matrix, args);
        } else if (fn === OPS.moveTo) {
            if (currentPolyline.length >= 4) {
                checkClosedPolylineBox(currentPolyline);
            }
            current = point(args[0], args[1]);
            pathStart = current;
            currentPolyline = [current];
        } else if (fn === OPS.lineTo) {
            const next = point(args[0], args[1]);
            if (current && next) {
                const dx = Math.abs(current.x - next.x);
                const dy = Math.abs(current.y - next.y);
                if (dx >= 15 && dy <= 3) {
                    result.underlines.push({
                        x: Math.round(Math.min(current.x, next.x)),
                        y: Math.round((current.y + next.y) / 2),
                        width: Math.round(dx)
                    });
                    hLines.push({
                        x1: Math.min(current.x, next.x),
                        x2: Math.max(current.x, next.x),
                        y: (current.y + next.y) / 2
                    });
                } else if (dy >= 8 && dx <= 3) {
                    vLines.push({
                        x: (current.x + next.x) / 2,
                        y1: Math.min(current.y, next.y),
                        y2: Math.max(current.y, next.y)
                    });
                }
                currentPolyline.push(next);
            }
            current = next;
        } else if (fn === OPS.curveTo || fn === OPS.curveTo2 || fn === OPS.curveTo3) {
            // Bezier curve approximation: take the endpoint as next point
            const endX = args[args.length - 2];
            const endY = args[args.length - 1];
            const next = point(endX, endY);
            if (current && next) {
                const dx = Math.abs(current.x - next.x);
                const dy = Math.abs(current.y - next.y);
                if (dx >= 20 && dy <= 3) {
                    result.underlines.push({
                        x: Math.round(Math.min(current.x, next.x)),
                        y: Math.round((current.y + next.y) / 2),
                        width: Math.round(dx)
                    });
                }
                currentPolyline.push(next);
            }
            current = next;
        } else if (fn === OPS.closePath || fn === OPS.closeStroke || fn === OPS.closeFillStroke) {
            if (pathStart && current) {
                currentPolyline.push(pathStart);
                checkClosedPolylineBox(currentPolyline);
            }
            currentPolyline = [];
        } else if (fn === OPS.stroke || fn === OPS.fill || fn === OPS.eoFill || fn === OPS.fillStroke) {
            if (currentPolyline.length >= 4) {
                checkClosedPolylineBox(currentPolyline);
            }
            currentPolyline = [];
        } else if (fn === OPS.rectangle) {
            const [rx, ry, rw, rh] = args;
            const p1 = point(rx, ry);
            const p2 = point(rx + rw, ry + rh);
            const minX = Math.round(Math.min(p1.x, p2.x));
            const maxX = Math.round(Math.max(p1.x, p2.x));
            const minY = Math.round(Math.min(p1.y, p2.y));
            const maxY = Math.round(Math.max(p1.y, p2.y));
            const w = maxX - minX;
            const h = maxY - minY;
            addRectCandidate(minX, minY, w, h);
            if (w <= 2.5 && h >= 10) {
                vLines.push({ x: (minX + maxX) / 2, y1: minY, y2: maxY });
            } else if (h <= 2.5 && w >= 20) {
                hLines.push({ x1: minX, x2: maxX, y: (minY + maxY) / 2 });
            } else if (h >= 8 && h <= 30 && w >= 180) {
                hLines.push({ x1: minX, x2: maxX, y: minY });
                hLines.push({ x1: minX, x2: maxX, y: maxY });
            }
            current = p1;
            pathStart = p1;
            currentPolyline = [];
        } else if (fn === OPS.constructPath) {
            const [ops, coords] = args;
            if (Array.isArray(ops) && Array.isArray(coords)) {
                let cIdx = 0;
                for (let op of ops) {
                    if (op === OPS.moveTo) {
                        if (currentPolyline.length >= 4) {
                            checkClosedPolylineBox(currentPolyline);
                        }
                        current = point(coords[cIdx], coords[cIdx + 1]);
                        pathStart = current;
                        currentPolyline = [current];
                        cIdx += 2;
                    } else if (op === OPS.lineTo) {
                        const next = point(coords[cIdx], coords[cIdx + 1]);
                        if (current && next) {
                            const dx = Math.abs(current.x - next.x);
                            const dy = Math.abs(current.y - next.y);
                            if (dx >= 15 && dy <= 3) {
                                result.underlines.push({
                                    x: Math.round(Math.min(current.x, next.x)),
                                    y: Math.round((current.y + next.y) / 2),
                                    width: Math.round(dx)
                                });
                                hLines.push({
                                    x1: Math.min(current.x, next.x),
                                    x2: Math.max(current.x, next.x),
                                    y: (current.y + next.y) / 2
                                });
                            } else if (dy >= 8 && dx <= 3) {
                                vLines.push({
                                    x: (current.x + next.x) / 2,
                                    y1: Math.min(current.y, next.y),
                                    y2: Math.max(current.y, next.y)
                                });
                            }
                            currentPolyline.push(next);
                        }
                        current = next;
                        cIdx += 2;
                    } else if (op === OPS.curveTo) {
                        const next = point(coords[cIdx + 4], coords[cIdx + 5]);
                        if (current && next) {
                            const dx = Math.abs(current.x - next.x);
                            const dy = Math.abs(current.y - next.y);
                            if (dx >= 20 && dy <= 3) {
                                result.underlines.push({
                                    x: Math.round(Math.min(current.x, next.x)),
                                    y: Math.round((current.y + next.y) / 2),
                                    width: Math.round(dx)
                                });
                            }
                            currentPolyline.push(next);
                        }
                        current = next;
                        cIdx += 6;
                    } else if (op === OPS.closePath) {
                        if (pathStart && current) {
                            currentPolyline.push(pathStart);
                            checkClosedPolylineBox(currentPolyline);
                        }
                        currentPolyline = [];
                    } else if (op === OPS.rectangle) {
                        const rx = coords[cIdx], ry = coords[cIdx + 1], rw = coords[cIdx + 2], rh = coords[cIdx + 3];
                        const p1 = point(rx, ry);
                        const p2 = point(rx + rw, ry + rh);
                        const minX = Math.round(Math.min(p1.x, p2.x));
                        const maxX = Math.round(Math.max(p1.x, p2.x));
                        const minY = Math.round(Math.min(p1.y, p2.y));
                        const maxY = Math.round(Math.max(p1.y, p2.y));
                        const w = maxX - minX;
                        const h = maxY - minY;
                        addRectCandidate(minX, minY, w, h);
                        if (w <= 2.5 && h >= 10) {
                            vLines.push({ x: (minX + maxX) / 2, y1: minY, y2: maxY });
                        } else if (h <= 2.5 && w >= 20) {
                            hLines.push({ x1: minX, x2: maxX, y: (minY + maxY) / 2 });
                        } else if (h >= 8 && h <= 30 && w >= 180) {
                            hLines.push({ x1: minX, x2: maxX, y: minY });
                            hLines.push({ x1: minX, x2: maxX, y: maxY });
                        }
                        cIdx += 4;
                    }
                }
            }
        }
    }
    const gridBoxes = reconstructTableGridBoxes(hLines, vLines);
    for (const gBox of gridBoxes) {
        addRectCandidate(gBox.x, gBox.y, gBox.width, gBox.height);
    }
    return result;
}

export function clusterCombBoxes(rects) {
    if (!rects || rects.length < 2) return [];
    // Filter to small boxes suitable for character cells (width 8-36, height 10-36)
    const sorted = rects.filter(r => r.width >= 8 && r.width <= 36 && r.height >= 10 && r.height <= 36)
        .sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 4) return yDiff;
            return a.x - b.x;
        });

    // Deduplicate candidate boxes that share essentially the same origin (multiple vector strokes for same box)
    const candidates = [];
    for (const cand of sorted) {
        const isDupe = candidates.some(d => Math.abs(d.x - cand.x) <= 6 && Math.abs(d.y - cand.y) <= 4);
        if (!isDupe) {
            candidates.push(cand);
        }
    }

    const clusters = [];
    const usedIndices = new Set();

    for (let i = 0; i < candidates.length; i++) {
        if (usedIndices.has(i)) continue;
        const currentCluster = [candidates[i]];
        let lastBox = candidates[i];

        for (let j = i + 1; j < candidates.length; j++) {
            if (usedIndices.has(j)) continue;
            const nextBox = candidates[j];
            if (Math.abs(nextBox.y - lastBox.y) > 4) break;
            if (Math.abs(nextBox.height - lastBox.height) > 4 || Math.abs(nextBox.width - lastBox.width) > 6) continue;
            const gap = nextBox.x - (lastBox.x + lastBox.width);
            
            // Character comb cells can be tall/narrow character slots (w/h < 0.85) or square cells (e.g. 14x14).
            // Allow up to 11.5pt gap between contiguous character slots (e.g. EIN or PIN spacing).
            // (Note: square clusters without comb keywords will be preserved as checkboxes in detectVectorDrawnFields).
            const isSquareOption = (lastBox.width / lastBox.height >= 0.85 && lastBox.width >= 10);
            const maxAllowedGap = isSquareOption ? 11.5 : 8.0;

            if (gap >= -2 && gap <= maxAllowedGap) {
                currentCluster.push(nextBox);
                usedIndices.add(j);
                lastBox = nextBox;
            }
        }

        if (currentCluster.length >= 3) {
            usedIndices.add(i);
            clusters.push(currentCluster);
        }
    }
    return clusters;
}

/**
 * Cluster adjacent, mutually exclusive checkboxes into unified Radio Button Groups.
 */
export function clusterRadioGroups(fields, rawBlocks = [], usedNames = new Set()) {
    if (!Array.isArray(fields) || fields.length < 2) return fields;

    const checkBoxes = fields.filter(f => f.type === "checkBox" && !f.isComb);
    if (checkBoxes.length < 2) return fields;

    // Mutually exclusive value tokens
    const MUTUAL_EXCLUSIVE_SETS = [
        new Set(["yes", "no"]),
        new Set(["yes", "no", "na"]),
        new Set(["yes", "no", "n_a"]),
        new Set(["male", "female"]),
        new Set(["male", "female", "other"]),
        new Set(["single", "married"]),
        new Set(["single", "married", "divorced", "widowed"]),
        new Set(["single", "married", "married_filing_jointly", "head_of_household"]),
        new Set(["individual", "c_corp", "s_corp", "partnership", "trust_estate", "llc", "other"]),
        new Set(["checking", "savings"]),
        new Set(["am", "pm"]),
        new Set(["full_time", "part_time"]),
        new Set(["cash", "check", "credit_card", "debit_card"])
    ];

    const consumed = new Set();
    const clusters = [];

    // 1. Group by Horizontal Baseline (y within 6pt, gap <= 180pt)
    const sortedByY = [...checkBoxes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const cb of sortedByY) {
        if (consumed.has(cb)) continue;
        const row = [cb];
        for (const other of sortedByY) {
            if (other === cb || consumed.has(other) || other.page !== cb.page) continue;
            if (Math.abs(other.y - cb.y) <= 6) {
                const last = row[row.length - 1];
                const gap = other.x - (last.x + last.width);
                if (gap >= 8 && gap <= 180) {
                    row.push(other);
                }
            }
        }
        if (row.length >= 2) {
            row.forEach(b => consumed.add(b));
            clusters.push({ orientation: "horizontal", boxes: row });
        }
    }

    // 2. Group by Vertical Column (x within 6pt, vertical gap <= 32pt)
    const sortedByX = [...checkBoxes].filter(cb => !consumed.has(cb)).sort((a, b) => a.x - b.x || a.y - b.y);
    for (const cb of sortedByX) {
        if (consumed.has(cb)) continue;
        const col = [cb];
        for (const other of sortedByX) {
            if (other === cb || consumed.has(other) || other.page !== cb.page) continue;
            if (Math.abs(other.x - cb.x) <= 6) {
                const last = col[col.length - 1];
                const vGap = other.y - (last.y + last.height);
                if (vGap >= 4 && vGap <= 32) {
                    col.push(other);
                }
            }
        }
        if (col.length >= 2) {
            col.forEach(b => consumed.add(b));
            clusters.push({ orientation: "vertical", boxes: col });
        }
    }

    for (const cluster of clusters) {
        const boxes = cluster.boxes;
        const names = boxes.map(b => (b.name || "").toLowerCase().replace(/_\d+$/, ""));

        // Check if names match a known mutually exclusive set
        const matchesKnownSet = MUTUAL_EXCLUSIVE_SETS.some(set => {
            const overlap = names.filter(n => set.has(n));
            return overlap.length >= 2;
        });

        // Search for a group label
        const minX = Math.min(...boxes.map(b => b.x));
        const minY = Math.min(...boxes.map(b => b.y));
        const maxX = Math.max(...boxes.map(b => b.x + b.width));

        const leftGroupLabel = rawBlocks.find(tb => 
            tb.x + tb.width <= minX + 4 && (minX - (tb.x + tb.width)) <= 120 &&
            Math.abs(tb.y - minY) <= 14 && !/^[—–\-:\._\s]+$/.test(tb.str)
        );

        const topGroupLabel = !leftGroupLabel ? rawBlocks.find(tb =>
            tb.y + tb.height <= minY + 4 && (minY - (tb.y + tb.height)) <= 28 &&
            tb.x >= minX - 40 && tb.x <= maxX + 40 && !/^[—–\-:\._\s]+$/.test(tb.str)
        ) : null;

        const groupPrompt = leftGroupLabel || topGroupLabel;
        const promptText = groupPrompt ? groupPrompt.str.trim() : "";

        const isChoicePrompt = /status|gender|sex|type|class|classification|category|method|mode|option|choice|select\s*one|check\s*one|pay\s*by|terms/i.test(promptText) ||
                               promptText.endsWith(":");

        if (matchesKnownSet || isChoicePrompt) {
            let baseGroupName = "";
            if (promptText && !isUniversalStaticText(promptText)) {
                baseGroupName = resolveSemanticProps(promptText, "radioGroup", new Set()).name;
            } else if (names.includes("yes") && names.includes("no")) {
                baseGroupName = "yes_no_choice";
            } else if (names.includes("male") && names.includes("female")) {
                baseGroupName = "gender";
            } else if (names.includes("single") && names.includes("married")) {
                baseGroupName = "marital_status";
            } else if (names.includes("individual") || names.includes("c_corp")) {
                baseGroupName = "tax_classification";
            } else if (names.includes("checking") || names.includes("savings")) {
                baseGroupName = "account_type";
            } else {
                baseGroupName = "radio_group";
            }

            let groupName = baseGroupName;
            let counter = 1;
            while (usedNames.has(groupName)) {
                counter++;
                groupName = `${baseGroupName}_${counter}`;
            }
            usedNames.add(groupName);

            boxes.forEach((box, idx) => {
                const optSlug = (box.name || `opt_${idx + 1}`).toLowerCase().replace(/_\d+$/, "");
                box.type = "radioGroup";
                box.radioGroup = groupName;
                box.exportValue = optSlug;
                box.value = box.value || optSlug;
            });
        }
    }

    return fields;
}

// Returns true if a rectangle already contains significant text inside it,
// meaning it is a label container, line badge, table header, or pre-filled cell — not a blank input.
function rectContainsSignificantText(rect, textBlocks) {
    if (!textBlocks || textBlocks.length === 0) return false;
    const pad = 3; // small padding tolerance
    const rRight = rect.x + rect.width;
    const rBottom = rect.y + rect.height;

    // Find all text blocks that fall inside, start inside, or significantly overlap the rectangle
    const innerBlocks = textBlocks.filter(tb => {
        const tbRight = tb.x + tb.width;
        const tbBottom = tb.y + tb.height;
        const cx = tb.x + tb.width / 2;
        const cy = tb.y + tb.height / 2;

        // 1. Center of text block is inside rect
        const centerInside = cx >= rect.x - pad && cx <= rRight + pad &&
                             cy >= rect.y - pad && cy <= rBottom + pad;
        if (centerInside) return true;

        // 2. Text block starts inside rect (handles multi-word blocks like "Part I Taxpayer...")
        const startsInside = tb.x >= rect.x - pad && tb.x <= rect.x + Math.max(12, rect.width * 0.7) &&
                             tb.y >= rect.y - pad && tb.y <= rBottom + pad;
        if (startsInside) return true;

        // 3. Significant physical intersection
        const interX = Math.max(0, Math.min(rRight, tbRight) - Math.max(rect.x, tb.x));
        const interY = Math.max(0, Math.min(rBottom, tbBottom) - Math.max(rect.y, tb.y));
        const interArea = interX * interY;
        const tbArea = tb.width * tb.height;
        if (tbArea > 0 && interArea / tbArea >= 0.5) return true;

        return false;
    });

    if (innerBlocks.length === 0) return false;

    const allText = innerBlocks.map(tb => (tb.str || "").trim()).filter(Boolean).join(" ");
    if (!allText) return false;

    // Is it a genuine checked checkbox? (e.g. pre-filled "X", "✓" in a small checkbox)
    const isSmallBox = rect.width <= 24 && rect.height <= 24;
    if (isSmallBox && /^[xX✓✔☑■●•]$/.test(allText.trim())) {
        return false; // Valid checked checkbox!
    }

    // Allow comb formatting separator masks (e.g. "/" in mm/dd/yy or "-" in phone/zip/ssn)
    if (/^[\/\-\—\–\.\s]+$/.test(allText)) {
        return false;
    }

    // Allow currency prefix symbols inside input boxes (e.g. "$", "€", "£", "¥")
    if (/^[$\u20AC\u00A3\u00A5\s]+$/.test(allText)) {
        return false;
    }

    // A: Line number badges: e.g. "1", "1a", "2b", "10", "12a", "Line 1", "1.", "(a)", "b"
    if (/^(?:line\s*)?\(?\d{1,3}[a-z]?\)?[\.\:\)]?$/i.test(allText)) {
        return true; // Line number badge! Suppress!
    }
    if (rect.width <= 36 && rect.height <= 24 && /^[a-z][\.\)]?$/i.test(allText)) {
        return true; // Alphabetical line badge! Suppress!
    }

    // B: Section / Part / Table / Step badges: e.g. "Part I", "Section A", "Schedule 1", "Step 1"
    if (/\b(?:part|section|sec|schedule|step|table|item|box)\b/i.test(allText)) {
        return true; // Section badge! Suppress!
    }

    // Top-anchored internal prompt labels in government/IRS form boxes with clear fillable height below
    if (rect.height >= 18 && rect.width >= 50) {
        const maxTextBottom = Math.max(...innerBlocks.map(tb => tb.y + tb.height));
        const spaceBelow = (rect.y + rect.height) - maxTextBottom;
        if (spaceBelow >= 9 && maxTextBottom <= rect.y + rect.height * 0.65) {
            return false;
        }
    }

    // C: Static label / heading words inside rect (>2 chars or multiple blocks)
    if (innerBlocks.length >= 2 || allText.length >= 3) {
        return true;
    }

    // D: Single short token (1-2 chars) that is not a checkmark symbol in a small box
    // (e.g. "1", "2", "3", "a", "b", "e")
    if (allText.length <= 2 && !isSmallBox) {
        return true;
    }
    if (isSmallBox && !/^[xX✓✔☑■●•]$/.test(allText)) {
        return true;
    }

    return false;
}

function reconstructLinePhrase(closestWord, rawBlocks, direction = "left") {
    if (!closestWord || !Array.isArray(rawBlocks) || rawBlocks.length === 0) return closestWord?.str || "";
    const lineWords = rawBlocks.filter(tb => 
        Math.abs(tb.y - closestWord.y) <= 4 &&
        !/^[—–\-:\._\s]+$/.test(tb.str)
    );
    if (lineWords.length <= 1) return closestWord.str;

    if (direction === "left") {
        const sorted = lineWords
            .filter(w => w.x <= closestWord.x + 2)
            .sort((a, b) => b.x - a.x);
        const phraseWords = [closestWord];
        let currLeft = closestWord.x;
        for (let i = 1; i < sorted.length; i++) {
            const w = sorted[i];
            const gap = currLeft - (w.x + w.width);
            if (gap >= -3 && gap <= 16) {
                phraseWords.unshift(w);
                currLeft = w.x;
            } else {
                break;
            }
        }
        return phraseWords.map(w => w.str).join(" ").trim();
    } else if (direction === "right") {
        const sorted = lineWords
            .filter(w => w.x >= closestWord.x - 2)
            .sort((a, b) => a.x - b.x);
        const phraseWords = [closestWord];
        let currRight = closestWord.x + closestWord.width;
        for (let i = 1; i < sorted.length; i++) {
            const w = sorted[i];
            const gap = w.x - currRight;
            if (gap >= -3 && gap <= 16) {
                phraseWords.push(w);
                currRight = w.x + w.width;
            } else {
                break;
            }
        }
        return phraseWords.map(w => w.str).join(" ").trim();
    }
    return closestWord.str;
}

export function detectVectorDrawnFields(vectorShapes, rawBlocks, pageNum, usedNames, existingFields = [], options = {}) {
    const fields = [];
    if (!vectorShapes) return fields;
    const { checkboxRects = [], inputBoxRects = [], allRects = [] } = vectorShapes;

    const consumedRects = new Set();
    const candidateRects = allRects.length > 0 ? allRects : [...checkboxRects, ...inputBoxRects.filter(b => b.width <= 40)];

    // 1. Detect Comb / Segmented Character Fields (SSN, Date, TIN, Account #)
    const combClusters = clusterCombBoxes(candidateRects);
    for (const cluster of combClusters) {
        const minX = Math.min(...cluster.map(b => b.x));
        const minY = Math.min(...cluster.map(b => b.y));
        const maxX = Math.max(...cluster.map(b => b.x + b.width));
        const maxY = Math.max(...cluster.map(b => b.y + b.height));
        const combWidth = maxX - minX;
        const combHeight = maxY - minY;
        const maxLen = cluster.length;

        // Find label directly to the left or directly above
        const leftLabel = rawBlocks
            .filter(tb => tb.x + tb.width <= minX + 8 && (minX - (tb.x + tb.width)) <= 220 &&
                          Math.abs(tb.y - minY) <= 16 && !/^[—–\-:\._\s]+$/.test(tb.str))
            .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0];

        const topLabel = !leftLabel ? rawBlocks
            .filter(tb => tb.y + tb.height <= minY + 4 && (minY - (tb.y + tb.height)) <= 28 &&
                          (tb.x >= minX - 30 && tb.x <= maxX + 30) && !/^[—–\-:\._\s\/]+$/.test(tb.str))
            .sort((a, b) => (minY - (b.y + b.height)) - (minY - (a.y + a.height)))[0] : null;

        const matchedLabel = leftLabel || topLabel;
        if (!matchedLabel || isUniversalStaticText(matchedLabel.str)) {
            // Comb fields must have an associated prompt or be in the body of the form
            if (minY < 95 || cluster[0].width < 8) {
                continue;
            }
        }
        const labelText = (matchedLabel && !isUniversalStaticText(matchedLabel.str)) ? matchedLabel.str : "comb_field";

        const isCombKeyword = /\b(ssn|social\s*sec|tin|ein|tax\s*id|routing|account|pin|zip|postal|date|birth|dob)\b/i.test(labelText);
        const isSquareCell = (cluster[0].width / cluster[0].height >= 0.85 && cluster[0].width >= 13);
        // Square cell clusters (e.g. 18x18 checkboxes) must have explicit comb keywords to be treated as combs.
        // Otherwise, they are checkbox grids (e.g. OSHA 300 outcome columns) and should remain individual checkboxes.
        if (isSquareCell && !isCombKeyword) {
            continue;
        }

        // Skip if the entire comb box contains significant static text or column headers
        if (rectContainsSignificantText({ x: minX, y: minY, width: combWidth, height: combHeight }, rawBlocks)) {
            continue;
        }

        const sem = resolveSemanticProps(labelText, "textField", usedNames);

        let dataFormat = sem.dataFormat || "text";
        if (/ssn|social\s*sec/i.test(labelText)) dataFormat = "ssn";
        else if (/date|dob|birth/i.test(labelText)) dataFormat = "date";
        else if (/tin|ein|tax\s*id/i.test(labelText)) dataFormat = "tin";
        else if (/zip|postal/i.test(labelText)) dataFormat = "zip";
        else if (/routing/i.test(labelText)) dataFormat = "routingNumber";
        else if (/account/i.test(labelText)) dataFormat = "accountNumber";

        const field = {
            id: generateFieldId(),
            type: "textField",
            name: sem.name,
            x: minX,
            y: minY,
            width: combWidth,
            height: combHeight,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: false,
            autofill: sem.autofill || "",
            dataFormat: dataFormat,
            isComb: true,
            maxLength: maxLen,
            detectedBy: "vector_drawn_comb",
            confidence: 0.98
        };

        if (!isOverlapping(field, existingFields, 0.35) && !isOverlapping(field, fields, 0.35)) {
            fields.push(field);
            cluster.forEach(box => consumedRects.add(box));
        }
    }

    // 2. Match Vector Checkbox Squares (excluding consumed comb boxes)
    for (const cbox of checkboxRects) {
        if (consumedRects.has(cbox)) continue;
        // Skip boxes that already contain label text inside (table header cells, etc.)
        if (rectContainsSignificantText(cbox, rawBlocks)) continue;

        // Find text label directly to the right
        const rightLabel = rawBlocks
            .filter(tb => tb.x >= cbox.x + cbox.width - 2 && (tb.x - (cbox.x + cbox.width)) <= 180 &&
                          Math.abs(tb.y - cbox.y) <= 14)
            .sort((a, b) => a.x - b.x)[0];

        // Find text label directly to the left if none to the right (must be in close proximity <= 45 pt)
        const leftLabel = !rightLabel ? rawBlocks
            .filter(tb => tb.x + tb.width <= cbox.x + 2 && (cbox.x - (tb.x + tb.width)) <= 45 &&
                          Math.abs(tb.y - cbox.y) <= 14 && !/^[—–\-:\._\s]+$/.test(tb.str))
            .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0] : null;

        const matchedLabel = rightLabel || leftLabel;
        // Skip checkboxes labelled with universal static text (section headings, instructions, disclaimers)
        if (matchedLabel && isUniversalStaticText(matchedLabel.str)) {
            continue;
        }
        // Suppress unlabelled checkboxes in the top header/seal area or far page margins
        if (!matchedLabel && (cbox.y < 95 || cbox.x >= 545 || cbox.x <= 25)) {
            continue;
        }

        const label = matchedLabel?.str || "";
        const sem = resolveSemanticProps(label || "checkbox", "checkBox", usedNames);
        const field = {
            id: generateFieldId(),
            type: "checkBox",
            name: sem.name,
            value: label || "Yes",
            x: cbox.x,
            y: cbox.y,
            width: cbox.width,
            height: cbox.height,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: false,
            autofill: "",
            dataFormat: "text",
            detectedBy: "vector_drawn_checkbox",
            confidence: 0.98
        };
        if (!isOverlapping(field, existingFields, 0.35) && !isOverlapping(field, fields, 0.35)) {
            fields.push(field);
        }
    }

    // 3. Match Vector Input Rectangles (excluding consumed comb boxes)
    const sortedInputBoxes = [...inputBoxRects].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const box of sortedInputBoxes) {
        if (consumedRects.has(box)) continue;
        if (box.height > 70 || box.width > 555) continue;
        // Skip horizontal divider bars and shaded section separators
        if (box.height <= 14 && box.width >= 240) continue;
        // Skip top header banners and form title boxes (e.g. wide title frames spanning across header)
        if (box.y < 70 && box.width >= 120 && box.height <= 35) continue;
        // Skip narrow column spacers (e.g. 21.6 pt spacers between columns)
        if (box.width <= 25) continue;
        // Skip boxes that already contain label text inside (table headers, pre-filled cells)
        if (rectContainsSignificantText(box, rawBlocks)) continue;

        // Skip multi-cell composite boxes that contain 2 or more checkboxes inside
        const innerCbs = checkboxRects.filter(cb => 
            cb.x >= box.x - 2 && cb.x + cb.width <= box.x + box.width + 2 &&
            cb.y >= box.y - 2 && cb.y + cb.height <= box.y + box.height + 2
        );
        if (innerCbs.length >= 2) continue;

        const maxLeftReach = box.width <= 85 ? 90 : 200;
        const leftLabel = rawBlocks
            .filter(tb => {
                if (tb.x + tb.width > box.x + 8 || (box.x - (tb.x + tb.width)) > maxLeftReach) return false;
                const vOverlap = Math.max(0, Math.min(box.y + box.height, tb.y + tb.height) - Math.max(box.y, tb.y));
                if (vOverlap < 2) return false;
                if (/^[—–\-:\._\s]+$/.test(tb.str)) return false;
                // Do not steal labels that belong directly to an adjacent checkbox
                if (checkboxRects.some(cb => Math.abs(cb.y - tb.y) <= 8 && tb.x >= cb.x && (tb.x - (cb.x + cb.width)) <= 25)) return false;
                return true;
            })
            .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0];

        const topLabel = !leftLabel ? rawBlocks
            .filter(tb => tb.y + tb.height <= box.y + 6 && (box.y - (tb.y + tb.height)) <= 45 &&
                          (tb.x >= box.x - 60 && tb.x <= box.x + box.width + 60))
            .sort((a, b) => {
                const aOverlap = Math.max(0, Math.min(box.x + box.width, a.x + a.width) - Math.max(box.x, a.x));
                const bOverlap = Math.max(0, Math.min(box.x + box.width, b.x + b.width) - Math.max(box.x, b.x));
                if ((aOverlap > 0) !== (bOverlap > 0)) return bOverlap - aOverlap;

                const aDistX = aOverlap > 0 ? 0 : Math.min(Math.abs(a.x - box.x), Math.abs(a.x + a.width - (box.x + box.width)));
                const bDistX = bOverlap > 0 ? 0 : Math.min(Math.abs(b.x - box.x), Math.abs(b.x + b.width - (box.x + box.width)));
                if (Math.abs(aDistX - bDistX) > 2) return aDistX - bDistX;

                const aDistY = Math.abs(box.y - (a.y + a.height));
                const bDistY = Math.abs(box.y - (b.y + b.height));
                return aDistY - bDistY;
            })[0] : null;

        const rightLabel = (!leftLabel && !topLabel) ? rawBlocks
            .filter(tb => tb.x >= box.x + box.width - 4 && (tb.x - (box.x + box.width)) <= 180 &&
                          Math.abs(tb.y - box.y) <= 18)
            .sort((a, b) => (a.x - (box.x + box.width)) - (b.x - (box.x + box.width)))[0] : null;

        let labelText = "";
        let inheritedCol = null;
        let adjustedBoxY = box.y;
        let adjustedBoxHeight = box.height;

        // Check for in-box top prompt label (common in IRS and government tax forms)
        const inBoxLabels = rawBlocks.filter(tb => 
            tb.x >= box.x - 2 && tb.x + tb.width <= box.x + box.width + 4 &&
            tb.y >= box.y - 2 && tb.y + tb.height <= box.y + box.height * 0.65
        );
        let hasInBoxTopLabel = false;
        if (inBoxLabels.length > 0 && box.height >= 18) {
            const maxTextBottom = Math.max(...inBoxLabels.map(tb => tb.y + tb.height));
            if ((box.y + box.height) - maxTextBottom >= 9) {
                labelText = inBoxLabels.map(tb => tb.str).join(" ").replace(/^(?:\([a-z0-9]+\)|\d+[a-z]?[\.\:]?)\s*/i, "").trim();
                adjustedBoxY = Math.round(maxTextBottom + 1);
                adjustedBoxHeight = Math.round((box.y + box.height) - adjustedBoxY);
                hasInBoxTopLabel = true;
            }
        }

        if (leftLabel && !hasInBoxTopLabel) {
            labelText = reconstructLinePhrase(leftLabel, rawBlocks, "left");
        } else if (topLabel && !hasInBoxTopLabel) {
            labelText = reconstructLinePhrase(topLabel, rawBlocks, "right");
            if (labelText.length < topLabel.str.length) labelText = topLabel.str;
        } else if (rightLabel && !hasInBoxTopLabel) {
            labelText = reconstructLinePhrase(rightLabel, rawBlocks, "right");
        } else if (!hasInBoxTopLabel) {
            // Check column inheritance for table grid rows (stacked boxes in same column)
            const upperColField = fields
                .filter(f => {
                    if (f.page !== pageNum) return false;
                    const fLeft = f.originalBox?.x ?? f.x;
                    const fWidth = f.originalBox?.width ?? f.width;
                    const fTop = f.originalBox?.y ?? f.y;
                    const fHeight = f.originalBox?.height ?? f.height;
                    const fBottom = fTop + fHeight;

                    const hOverlap = Math.max(0, Math.min(box.x + box.width, fLeft + fWidth) - Math.max(box.x, fLeft));
                    if (hOverlap < Math.min(box.width, fWidth) * 0.6) return false;
                    return box.y > fTop && (box.y - fBottom) <= 35 && (box.y - fBottom) >= -2;
                })
                .sort((a, b) => {
                    const aBottom = (a.originalBox?.y ?? a.y) + (a.originalBox?.height ?? a.height);
                    const bBottom = (b.originalBox?.y ?? b.y) + (b.originalBox?.height ?? b.height);
                    return (box.y - bBottom) - (box.y - aBottom);
                })[0];
            if (upperColField) {
                inheritedCol = upperColField;
                labelText = upperColField.columnLabel || upperColField.name;
            }
        }

        // If matched label is universal static text (e.g. section title, instructions, OMB), this is a static container, not an input!
        if (labelText && isUniversalStaticText(labelText)) {
            continue;
        }
        if (!labelText) {
            // Unlabelled vector boxes in calculation columns or banner areas are skipped
            if (box.y < 95 || box.width <= 85 || (box.width >= 200 && box.height <= 30) || box.width > 560 || box.height > 65 || (box.width > 555 && box.height > 40)) {
                continue;
            }
            labelText = "field";
        }
        const sem = resolveSemanticProps(labelText, "textField", usedNames);
        const isSig = sem.type === "signature" || /signature|sign\s*here|authorized\s*signature|employee\s*signature|applicant\s*signature|taxpayer\s*signature|sign\s*below|handtekening|unterschrift|firma/i.test(labelText);
        const isDate = sem.type === "dateField" || /date/i.test(labelText);
        const isQuestionOrCheckbox = sem.type === "checkBox" || /\?$/.test(labelText) || /\b(sick\??|absent\??|yes\??|no\??)\b/i.test(labelText);
        const type = isSig ? "signature" : (isDate ? "dateField" : (isQuestionOrCheckbox || inheritedCol?.type === "checkBox" ? "checkBox" : (inheritedCol?.type || sem.type)));
        
        // Currency symbol proximity ($ € £ ¥ directly left of box or inside left edge)
        const hasCurrencySymbol = rawBlocks.some(tb => 
            /^[$\u20AC\u00A3\u00A5]$/.test(tb.str.trim()) &&
            ((tb.x + tb.width <= box.x + 4 && (box.x - (tb.x + tb.width)) <= 20 && Math.abs(tb.y - box.y) <= 12) ||
             (tb.x >= box.x - 2 && tb.x <= box.x + 18 && tb.y >= box.y - 2 && tb.y <= box.y + box.height + 2))
        );
        const dataFormat = hasCurrencySymbol ? "currency" : (inheritedCol?.dataFormat || sem.dataFormat || "text");

        let fx = box.x;
        let fy = adjustedBoxY;
        let fw = box.width;
        let fh = adjustedBoxHeight;
        if (type === "checkBox" && box.width > 24) {
            fw = 15;
            fh = 15;
            fx = Math.round(box.x + (box.width - fw) / 2);
            fy = Math.round(box.y + (box.height - fh) / 2);
        }

        const dayMatch = rawBlocks.find(tb => 
            tb.y + tb.height <= box.y && (box.y - (tb.y + tb.height)) <= 85 &&
            /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(tb.str.trim())
        );
        let fieldName = sem.name;
        if (dayMatch) {
            const prefix = dayMatch.str.trim().slice(0, 3).toLowerCase() + "_";
            if (!fieldName.startsWith(prefix)) {
                fieldName = prefix + fieldName;
            }
        }

        const field = {
            id: generateFieldId(),
            type: type,
            name: fieldName,
            x: fx,
            y: fy,
            width: fw,
            height: fh,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: type !== "checkBox" && type !== "radioGroup" && (box.height >= 36 || sem.multiline || Boolean(inheritedCol?.multiline)),
            autofill: sem.autofill || "",
            dataFormat: dataFormat,
            columnLabel: labelText,
            originalBox: { x: box.x, y: box.y, width: box.width, height: box.height },
            detectedBy: inheritedCol ? "vector_drawn_table_grid_row" : "vector_drawn_input_box",
            confidence: 0.98
        };

        if (!isOverlapping(field, existingFields, 0.35) && !isOverlapping(field, fields, 0.35)) {
            fields.push(field);
        }
    }

    // 4. Match Vector Underlines (e.g. from scanned docs or vector path underlines)
    const underlineLines = vectorShapes.underlines || [];
    for (const u of underlineLines) {
        if (u.width < 30) continue;
        const uX = u.x;
        const uY = u.y;
        const uW = u.width;
        const uH = 20;
        const fieldY = Math.max(0, uY - 18);

        // Skip underline if text is already written inside or on the field area
        if (rectContainsSignificantText({ x: uX, y: fieldY, width: uW, height: uH }, rawBlocks)) continue;

        // Skip underline if text rests directly on or intersects the underline baseline (e.g. hyperlinks or underlined prose)
        const textOnLine = rawBlocks.filter(tb => 
            tb.x >= uX - 6 && (tb.x + tb.width) <= uX + uW + 6 &&
            Math.abs((tb.y + tb.height) - uY) <= 6
        );
        if (textOnLine.length > 0) continue;

        // Skip underline if near text matches a URL
        const isUrl = rawBlocks.some(tb => 
            Math.abs(tb.y - uY) <= 12 && 
            Math.max(0, Math.min(uX + uW, tb.x + tb.width) - Math.max(uX, tb.x)) > 0 &&
            /https?:\/\/|www\.|\.gov|\.org|\.com|\.html|\.pdf/i.test(tb.str)
        );
        if (isUrl) continue;

        // Find label directly to the left or directly above
        const leftLabel = rawBlocks
            .filter(tb => tb.x + tb.width <= uX + 12 && (uX - (tb.x + tb.width)) <= 240 &&
                          Math.abs(tb.y - (uY - 10)) <= 18 && !/^[—–\-:\._\s]+$/.test(tb.str))
            .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0];

        const topLabel = !leftLabel ? rawBlocks
            .filter(tb => tb.y + tb.height <= uY && (uY - (tb.y + tb.height)) <= 30 &&
                          (tb.x >= uX - 40 && tb.x <= uX + uW + 40))
            .sort((a, b) => {
                const aOverlap = Math.max(0, Math.min(uX + uW, a.x + a.width) - Math.max(uX, a.x));
                const bOverlap = Math.max(0, Math.min(uX + uW, b.x + b.width) - Math.max(uX, b.x));
                if ((aOverlap > 0) !== (bOverlap > 0)) return bOverlap - aOverlap;

                const aDistX = aOverlap > 0 ? 0 : Math.min(Math.abs(a.x - uX), Math.abs(a.x + a.width - (uX + uW)));
                const bDistX = bOverlap > 0 ? 0 : Math.min(Math.abs(b.x - uX), Math.abs(b.x + b.width - (uX + uW)));
                if (Math.abs(aDistX - bDistX) > 2) return aDistX - bDistX;

                const aDistY = Math.abs(uY - (a.y + a.height));
                const bDistY = Math.abs(uY - (b.y + b.height));
                return aDistY - bDistY;
            })[0] : null;

        let labelText = "";
        let inheritedCol = null;

        if (leftLabel) {
            labelText = reconstructLinePhrase(leftLabel, rawBlocks, "left");
        } else if (topLabel) {
            labelText = reconstructLinePhrase(topLabel, rawBlocks, "right");
            if (labelText.length < topLabel.str.length) labelText = topLabel.str;
        } else {
            // Check column inheritance for table grid rows (stacked underlines in same column)
            const upperColField = fields
                .filter(f => f.page === pageNum && Math.abs(f.x - uX) <= 6 && Math.abs(f.width - uW) <= 8 &&
                             uY > f.y && (uY - (f.y + f.height)) <= 35 && (uY - (f.y + f.height)) >= -2)
                .sort((a, b) => (uY - (b.y + b.height)) - (uY - (a.y + a.height)))[0];
            if (upperColField) {
                inheritedCol = upperColField;
                labelText = upperColField.columnLabel || upperColField.name;
            }
        }

        if (labelText && isUniversalStaticText(labelText)) {
            continue;
        }
        if (!labelText) {
            labelText = "field";
        }
        const sem = resolveSemanticProps(labelText, "textField", usedNames);
        const isSig = sem.type === "signature" || /signature|sign\s*here|authorized\s*signature|employee\s*signature|applicant\s*signature|taxpayer\s*signature|sign\s*below|handtekening|unterschrift|firma/i.test(labelText);
        const isDate = sem.type === "dateField" || /date/i.test(labelText);
        const isQuestionOrCheckbox = sem.type === "checkBox" || /\?$/.test(labelText) || /\b(sick\??|absent\??|yes\??|no\??)\b/i.test(labelText);
        const type = isSig ? "signature" : (isDate ? "dateField" : (isQuestionOrCheckbox || inheritedCol?.type === "checkBox" ? "checkBox" : (inheritedCol?.type || sem.type)));
        
        // Currency symbol proximity ($ € £ ¥ directly left of underline)
        const hasCurrencySymbol = rawBlocks.some(tb => 
            /^[$\u20AC\u00A3\u00A5]$/.test(tb.str.trim()) &&
            tb.x + tb.width <= uX + 4 && (uX - (tb.x + tb.width)) <= 20 &&
            Math.abs(tb.y - uY) <= 12
        );
        const dataFormat = hasCurrencySymbol ? "currency" : (inheritedCol?.dataFormat || sem.dataFormat || "text");

        let fx = uX;
        let fy = fieldY;
        let fw = uW;
        let fh = uH;
        if (type === "checkBox" && uW > 24) {
            fw = 15;
            fh = 15;
            fx = Math.round(uX + (uW - fw) / 2);
            fy = Math.round(fieldY + (uH - fh) / 2);
        }

        const dayMatch = rawBlocks.find(tb => 
            tb.y + tb.height <= uY && (uY - (tb.y + tb.height)) <= 85 &&
            /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(tb.str.trim())
        );
        let fieldName = sem.name;
        if (dayMatch) {
            const prefix = dayMatch.str.trim().slice(0, 3).toLowerCase() + "_";
            if (!fieldName.startsWith(prefix)) {
                fieldName = prefix + fieldName;
            }
        }

        const field = {
            id: generateFieldId(),
            type: type,
            name: fieldName,
            x: fx,
            y: fy,
            width: fw,
            height: fh,
            page: pageNum,
            borderStyle: "none",
            fillStyle: "transparent",
            multiline: type !== "checkBox" && (sem.multiline || Boolean(inheritedCol?.multiline) || false),
            autofill: sem.autofill || "",
            dataFormat: dataFormat,
            columnLabel: labelText,
            detectedBy: inheritedCol ? "vector_drawn_table_grid_row" : "vector_drawn_underline"
        };

        if (!isOverlapping(field, existingFields, 0.35) && !isOverlapping(field, fields, 0.35)) {
            fields.push(field);
        }
    }

    if (options && options.clusterRadios) {
        clusterRadioGroups(fields, rawBlocks, usedNames);
    }
    return fields;
}
// The stream/heuristic approach (Affordance 4 below) infers table structure
// purely from text positions — cluster words into rows, guess column
// boundaries, match header keywords. That's inherently approximate: it has
// to guess row spacing, column widths, and vocabulary, and every bug we've
// chased in this file (ghost fields, missing rows, cross-column bleed) traces
// back to one of those guesses being wrong for a particular layout.
//
// Most real tables are drawn with actual ruling lines — that's what the grid
// borders visible on the page ARE. If we detect those lines directly, we get
// exact row/column boundaries with no guessing at all: cell membership
// becomes a simple point-in-rect test instead of a proximity heuristic.
//
// This combines PDF content-stream operators with a rendered-pixel fallback.
// Operators provide precise vector boundaries; raster scanning still catches
// lines emitted through less common PDF constructs.
async function detectTableGridLines(page) {
    const RENDER_SCALE = 2; // enough resolution for thin ruling lines, cheap to scan
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    let canvas, ctx;
    try {
        canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        ctx = canvas.getContext("2d", { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
        console.error("Table-grid render failed, falling back to text-based table detection:", err);
        return [];
    }

    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
        console.error("Could not read rendered pixels for table detection:", err);
        return [];
    }

    const { data, width, height } = imageData;
    const DARK_THRESHOLD = 200; // luminance below this counts as "ink"
    const isDark = (x, y) => {
        const idx = (y * width + x) * 4;
        const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        return luminance < DARK_THRESHOLD;
    };

    // A real ruling line produces one very long contiguous run of dark
    // pixels along its row/column. Scattered text produces many short runs
    // instead, so a length threshold cleanly separates the two.
    const MIN_LINE_RUN = 120 * RENDER_SCALE;
    const MIN_BOUNDARY_RUN = 40 * RENDER_SCALE;

    const rowBestRun = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
        let run = 0, best = 0;
        for (let x = 0; x < width; x++) {
            if (isDark(x, y)) { run++; if (run > best) best = run; }
            else run = 0;
        }
        rowBestRun[y] = best;
    }

    const colBestRun = new Array(width).fill(0);
    for (let x = 0; x < width; x++) {
        let run = 0, best = 0;
        for (let y = 0; y < height; y++) {
            if (isDark(x, y)) { run++; if (run > best) best = run; }
            else run = 0;
        }
        colBestRun[x] = best;
    }

    function findLineSegments(minRun, horizontal) {
        const segments = [];
        const limit = horizontal ? height : width;
        for (let offset = 0; offset < limit; offset++) {
            let bestStart = -1, bestEnd = -1, runStart = -1;
            const span = horizontal ? width : height;
            for (let cursor = 0; cursor <= span; cursor++) {
                const dark = cursor < span && (horizontal ? isDark(cursor, offset) : isDark(offset, cursor));
                if (dark && runStart < 0) runStart = cursor;
                if ((!dark || cursor === span) && runStart >= 0) {
                    if (cursor - runStart > bestEnd - bestStart) {
                        bestStart = runStart;
                        bestEnd = cursor;
                    }
                    runStart = -1;
                }
            }
            if (bestEnd - bestStart >= minRun) {
                segments.push({ offset, start: bestStart, end: bestEnd });
            }
        }

        const merged = [];
        for (const segment of segments) {
            const previous = merged[merged.length - 1];
            if (previous &&
                segment.offset - previous.offset <= 3 &&
                segment.start <= previous.end + 6 &&
                segment.end >= previous.start - 6) {
                previous.offset = Math.round((previous.offset + segment.offset) / 2);
                previous.start = Math.min(previous.start, segment.start);
                previous.end = Math.max(previous.end, segment.end);
            } else {
                merged.push({ ...segment });
            }
        }
        return merged;
    }

    async function getVectorBoundaryLines(page, scale = 2) {
        const result = { horizontal: [], vertical: [] };
        if (!page.getOperatorList || typeof pdfjsLib === "undefined" || !pdfjsLib.OPS) return result;

        let operatorList;
        try {
            operatorList = await page.getOperatorList();
        } catch (err) {
            console.warn("Could not read PDF drawing operators:", err);
            return result;
        }

        const OPS = pdfjsLib.OPS;
        const stack = [];
        let matrix = [1, 0, 0, 1, 0, 0];
        let pathStart = null;
        let current = null;
        const multiply = (left, right) => [
            left[0] * right[0] + left[2] * right[1],
            left[1] * right[0] + left[3] * right[1],
            left[0] * right[2] + left[2] * right[3],
            left[1] * right[2] + left[3] * right[3],
            left[0] * right[4] + left[2] * right[5] + left[4],
            left[1] * right[4] + left[3] * right[5] + left[5]
        ];
        const point = (x, y) => {
            const pdfPoint = [
                matrix[0] * x + matrix[2] * y + matrix[4],
                matrix[1] * x + matrix[3] * y + matrix[5]
            ];
            const viewportPoint = page.getViewport({ scale }).convertToViewportPoint(...pdfPoint);
            return { x: viewportPoint[0], y: viewportPoint[1] };
        };
        const addSegment = (a, b) => {
            if (!a || !b) return;
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);
            if (dx >= 80 && dy <= 3) result.horizontal.push({ offset: Math.round((a.y + b.y) / 2), start: Math.round(Math.min(a.x, b.x)), end: Math.round(Math.max(a.x, b.x)) });
            if (dy >= 80 && dx <= 3) result.vertical.push({ offset: Math.round((a.x + b.x) / 2), start: Math.round(Math.min(a.y, b.y)), end: Math.round(Math.max(a.y, b.y)) });
        };

        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            const args = operatorList.argsArray[i] || [];
            if (fn === OPS.save) stack.push(matrix);
            else if (fn === OPS.restore) matrix = stack.pop() || matrix;
            else if (fn === OPS.transform) matrix = multiply(matrix, args);
            else if (fn === OPS.moveTo) {
                current = point(args[0], args[1]);
                pathStart = current;
            } else if (fn === OPS.lineTo) {
                const next = point(args[0], args[1]);
                addSegment(current, next);
                current = next;
            } else if (fn === OPS.rectangle) {
                const [x, y, w, h] = args;
                const p1 = point(x, y), p2 = point(x + w, y);
                const p3 = point(x + w, y + h), p4 = point(x, y + h);
                addSegment(p1, p2);
                addSegment(p2, p3);
                addSegment(p3, p4);
                addSegment(p4, p1);
                current = p1;
                pathStart = p1;
            } else if (fn === OPS.closePath && current && pathStart) {
                addSegment(current, pathStart);
                current = pathStart;
            }
        }
        return result;
    }

    const horizontalLines = findLineSegments(MIN_BOUNDARY_RUN, true);
    const verticalLines = findLineSegments(MIN_BOUNDARY_RUN, false);
    const vectorLines = await getVectorBoundaryLines(page, RENDER_SCALE);
    if (vectorLines?.horizontal?.length) {
        for (const l of vectorLines.horizontal) horizontalLines.push(l);
    }
    if (vectorLines?.vertical?.length) {
        for (const l of vectorLines.vertical) verticalLines.push(l);
    }

    function mergeAdjacent(candidates, maxGap = 3) {
        const merged = [];
        let clusterStart = null, clusterEnd = null;
        for (const c of candidates) {
            if (clusterStart === null) {
                clusterStart = clusterEnd = c;
            } else if (c - clusterEnd <= maxGap) {
                clusterEnd = c;
            } else {
                merged.push(Math.round((clusterStart + clusterEnd) / 2));
                clusterStart = clusterEnd = c;
            }
        }
        if (clusterStart !== null) merged.push(Math.round((clusterStart + clusterEnd) / 2));
        return merged;
    }

    const hCandidates = [];
    for (let y = 0; y < height; y++) if (rowBestRun[y] >= MIN_LINE_RUN) hCandidates.push(y);
    const vCandidates = [];
    for (let x = 0; x < width; x++) if (colBestRun[x] >= MIN_LINE_RUN) vCandidates.push(x);

    const hLinesPx = mergeAdjacent(hCandidates);
    const vLinesPx = mergeAdjacent(vCandidates);

    // Need at least 2 rows (3 horizontal boundaries) and 2 columns (3
    // vertical boundaries) to call this a real table grid rather than a
    // stray horizontal rule under a title or a single vertical divider.
    if (hLinesPx.length < 3 || vLinesPx.length < 3) {
        return [{ rowsY: [], colsX: [], horizontalLines, verticalLines }];
    }

    // Convert back from render-pixel space to the same viewport-scale-1.0,
    // top-left-origin coordinate space that rawBlocks and fields already use.
    const rowsY = hLinesPx.map(y => y / RENDER_SCALE).sort((a, b) => a - b);
    const colsX = vLinesPx.map(x => x / RENDER_SCALE).sort((a, b) => a - b);

    return [{ rowsY, colsX, horizontalLines, verticalLines }];
}

// Builds fields directly from a detected ruling-line grid: the header row's
// text (row 0) names each column, and every EMPTY cell in the data rows
// below it becomes a field sized exactly to that cell — no guessed spacing,
// no guessed width, because the grid lines already give us the true bounds.
function buildFieldsFromTableGrid(grid, rawBlocks, pageNum, usedNames) {
    const { rowsY, colsX } = grid;
    if (rowsY.length < 3 || colsX.length < 3) return { fields: [], region: null };

    const CELL_PAD = 2;
    const numCols = colsX.length - 1;
    const numRows = rowsY.length - 1;

    // Check robust bounding-box overlap so no static text is covered
    const textInCell = (x0, y0, x1, y1) => rawBlocks.filter(tb => {
        const overlapX = Math.max(0, Math.min(x1, tb.x + tb.width) - Math.max(x0, tb.x));
        const overlapY = Math.max(0, Math.min(y1, tb.y + tb.height) - Math.max(y0, tb.y));
        return (overlapX > 2 && overlapY > 2);
    });

    // Calculate row heights to find the median table row height
    const allRowHeights = [];
    for (let r = 0; r < numRows; r++) {
        const h = rowsY[r + 1] - rowsY[r];
        if (h >= 10 && h <= 80) allRowHeights.push(h);
    }
    allRowHeights.sort((a, b) => a - b);
    const medianRowH = allRowHeights.length > 0 
        ? allRowHeights[Math.floor(allRowHeights.length / 2)]
        : 22;

    // Header row = row 0. Name each column from its header cell's text,
    // matched against the shared keyword vocabulary, falling back to the
    // header's own text (sanitized) so untranslated vocabulary still works.
    const columns = [];
    for (let c = 0; c < numCols; c++) {
        const x0 = colsX[c], x1 = colsX[c + 1];
        const y0 = rowsY[0], y1 = rowsY[1];
        const headerText = textInCell(x0, y0, x1, y1).sort((a, b) => a.x - b.x).map(tb => tb.str).join(" ").trim();
        const known = headerText ? matchColumnKeyword(headerText) : null;
        const cleanName = headerText.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `col_${c + 1}`;
        columns.push({
            id: known ? known.id : cleanName,
            name: known ? known.name : (headerText || `Column ${c + 1}`),
            x0, x1
        });
    }

    const fields = [];
    for (let r = 1; r < numRows; r++) { // skip header row (r=0)
        const y0 = rowsY[r], y1 = rowsY[r + 1];
        const cellH = y1 - y0;

        // GUARD 1: Table row height sanity check
        // If a row is significantly taller than the median row height of the table (e.g. 117px gap vs 20px rows),
        // it is an inter-section layout gap between the table and notes/footer, NOT a table data row!
        if (cellH > Math.max(38, medianRowH * 2.0)) {
            continue;
        }

        for (const col of columns) {
            const x0 = col.x0, x1 = col.x1;
            const cellW = x1 - x0;
            if (cellW < 12 || cellH < 10) continue; // too small to be a usable field

            // GUARD 2: Don't overwrite a cell that has static text (like $ symbol, BALANCE DUE, Tax, etc.)
            const existingText = textInCell(x0, y0, x1, y1);
            if (existingText.some(tb => tb.str.replace(/[\s.,$]/g, "").length > 0)) continue;

            const isCheckboxCol = /^(?:taxable|receipt)$/i.test(col.id) || /^(?:taxable|receipt)$/i.test(col.name);
            const sem = resolveSemanticProps(col.name, isCheckboxCol ? "checkBox" : "textField", usedNames);

            const field = isCheckboxCol ? {
                id: generateFieldId(),
                type: "checkBox",
                name: sem.name,
                x: Math.round(x0 + cellW / 2 - 8),
                y: Math.round(y0 + cellH / 2 - 8),
                width: 16,
                height: 16,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: "",
                dataFormat: "text",
                detectedBy: `affordance4b_lattice_col-${col.id}_row-${r}`
            } : {
                id: generateFieldId(),
                type: "textField",
                name: sem.name,
                x: Math.round(x0 + CELL_PAD),
                y: Math.round(y0 + CELL_PAD),
                width: Math.round(cellW - CELL_PAD * 2),
                height: Math.round(cellH - CELL_PAD * 2),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: sem.autofill || "",
                dataFormat: (col.id === "amount" || col.id === "unit_price") ? "currency" : ((col.id === "qty") ? "number" : "text"),
                detectedBy: `affordance4b_lattice_col-${col.id}_row-${r}`
            };
            fields.push(field);
        }
    }

    const region = {
        xMin: colsX[0] - 5,
        xMax: colsX[colsX.length - 1] + 5,
        yMin: rowsY[0] - 5,
        yMax: rowsY[rowsY.length - 1] + 5
    };

    return { fields, region };
}

async function detectLatticeTableFields(page, rawBlocks, pageNum, usedNames, detectedGrids = null) {
    let grids;
    try {
        grids = detectedGrids || await detectTableGridLines(page);
    } catch (err) {
        console.error("Lattice table detection failed, falling back to text-based table detection:", err);
        return { fields: [], regions: [] };
    }

    const allFields = [];
    const regions = [];
    for (const grid of grids) {
        if (!grid.rowsY?.length || !grid.colsX?.length) continue;
        const { fields, region } = buildFieldsFromTableGrid(grid, rawBlocks, pageNum, usedNames);
        if (fields.length > 0 && region) {
            allFields.push(...fields);
            regions.push(region);
        }
    }
    return { fields: allFields, regions };
}

export function detectUnderlineFields(grid, rawBlocks, pageNum, usedNames, existingFields = []) {
    const fields = [];
    const horizontalLines = grid?.horizontalLines || [];
    const verticalLines = grid?.verticalLines || [];

    for (const line of horizontalLines) {
        const x = line.start / 2;
        const width = (line.end - line.start) / 2;
        const y = line.offset / 2;
        if (width < 40) continue;

        // Table borders have several vertical intersections. A lone rule is
        // more likely to be an underline or a single blank form boundary.
        const intersections = verticalLines.filter(v => {
            const vx = v.offset / 2;
            return vx >= x - 3 && vx <= x + width + 3;
        }).length;
        if (intersections >= 3) continue;

        const pairedBoundary = horizontalLines.find(other =>
            other.offset > line.offset &&
            other.offset - line.offset >= 24 &&
            other.offset - line.offset <= 120 &&
            Math.abs(other.start - line.start) <= 8 &&
            Math.abs(other.end - line.end) <= 8
        );
        const endpointIntersections = verticalLines.filter(v => {
            const vx = v.offset / 2;
            return Math.abs(vx - x) <= 3 || Math.abs(vx - (x + width)) <= 3;
        }).length;
        if (pairedBoundary && endpointIntersections >= 2) {
            // A closed rectangle is one field, not two underline fields.
            if (line.offset > pairedBoundary.offset) continue;
        }

        const isBox = Boolean(pairedBoundary && endpointIntersections >= 2 && (pairedBoundary.offset - line.offset) / 2 <= 65);
        const fieldHeight = isBox
            ? Math.round((pairedBoundary.offset - line.offset) / 2)
            : 22;
        const candidate = {
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(isBox ? y : y - 22)),
            width: Math.round(width),
            height: Math.min(65, Math.max(16, fieldHeight)),
            page: pageNum
        };
        if (candidate.width < 40 || isOverlapping(candidate, existingFields, 0.2) ||
            isOverlapping(candidate, fields, 0.5)) continue;

        const nearbyLabel = rawBlocks
            .filter(tb => tb.y + tb.height <= y + 3 && tb.y + tb.height >= y - 45 &&
                tb.x + tb.width <= x + 12 && x - (tb.x + tb.width) <= 180)
            .sort((a, b) => (y - (a.y + a.height)) - (y - (b.y + b.height)))[0];
        const label = nearbyLabel?.str || "";

        // GUARD: Reject giant container boxes spanning multiple lines or sections
        if (candidate.height > 50 && !/comments|notes|remarks|explanation|feedback|description|allergies|medications|signature/i.test(label)) {
            continue;
        }

        // A standalone decorative rule has no form affordance. Require a
        // nearby, non-banner label unless the pixels clearly form a closed box.
        if (!isBox && (!label || isUniversalStaticText(label))) continue;
        const sem = resolveSemanticProps(label || "field", "textField", usedNames);
        fields.push({
            id: generateFieldId(),
            type: /signature|sign\s*here/i.test(label) ? "signature" : "textField",
            name: sem.name,
            x: candidate.x,
            y: candidate.y,
            width: candidate.width,
            height: candidate.height,
            page: pageNum,
            borderStyle: "solid",
            fillStyle: "white",
            multiline: false,
            autofill: sem.autofill || "",
            dataFormat: sem.dataFormat || "text",
            detectedBy: "boundary_underline"
        });
    }
    return fields;
}

// ============================================================================
// 4. DETECTION PIPELINE
// ============================================================================
export function detectVisualAffordances(rawBlocks, viewport, pageNum, usedNames, existingFields = [], preRegisteredTableRegions = [], vectorShapes = null) {
    const fields = [...existingFields];
    const seedCount = existingFields.length;
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    const textLines = clusterIntoLines(rawBlocks);
    const docLayout = calculateDocumentColumnBoundaries(rawBlocks, pageWidth, pageHeight);

    // ------------------------------------------------------------------------
    // AFFORDANCE 1: Standalone & Labelled Checkboxes & Radios (with Fieldset Groups)
    // ------------------------------------------------------------------------
    const CHECKBOX_CHARS = new Set([
        "☐", "□", "▣", "■", "◻", "◼", "◽", "◾", "⬜", "⬛",
        "☑", "✓", "✔", "☒", "✗", "✘",
        "○", "●", "◯", "◎", "◦", "⬤", "⭕", "⭘", "⭙",
        "", "\uF063", "\uF0A8", "\uF0A9", "\uF0FE", "\uF06F", "\uF071", "\uF073", "\uF074", "\uF0A3", "\uF0B7"
    ]);
    const CHECKBOX_REGEX = /(\[\s*\]|\(\s*\)|[☐□▣■◻◼◽◾⬜⬛☑✓✔☒✗✘○●◯◎◦⬤⭕⭘⭙\uF063\uF0A8\uF0A9\uF0FE\uF06F\uF071\uF073\uF074\uF0A3\uF0B7])/gu;

    for (const line of textLines) {
        // Skip date format placeholder brackets like [ YYYY - MM - DD ]
        if (/\[\s*(?:yyyy|mm|dd)[^\]]*\]/i.test(line.str)) {
            continue;
        }

        // Detect group prompt / legend if line starts with "Prompt:" before choices
        let linePrompt = "";
        const colonIdx = line.str.indexOf(":");
        if (colonIdx !== -1) {
            const beforeColon = line.str.slice(0, colonIdx).trim();
            if (beforeColon.length < 45 && !isUniversalStaticText(beforeColon)) {
                linePrompt = beforeColon;
            }
        }

        let wIdx = 0;
        while (wIdx < line.items.length) {
            const item = line.items[wIdx];
            const str = item.str.trim();

            const isDiscreteSymbol = CHECKBOX_CHARS.has(str);
            const isBracketPair = (str === "[" && wIdx + 1 < line.items.length && line.items[wIdx + 1].str === "]") || /^\[\s*\]$/.test(str);
            const isParenPair = (str === "(" && wIdx + 1 < line.items.length && line.items[wIdx + 1].str === ")") || /^\(\s*\)$/.test(str);

            const isOpen = isDiscreteSymbol || isBracketPair || isParenPair;
            if (isOpen) {
                const markerX = item.x;
                const markerY = item.y;
                const markerType = (str === "(" || str === "○" || str === "●" || str === "◯" || str === "◎" || isParenPair) ? "radioGroup" : "checkBox";

                // Advance index past closing bracket/paren if separate item
                if (wIdx + 1 < line.items.length && (line.items[wIdx + 1].str === ")" || line.items[wIdx + 1].str === "]")) {
                    wIdx++;
                }

                let optLabel = "";
                if (wIdx + 1 < line.items.length && !CHECKBOX_CHARS.has(line.items[wIdx + 1].str) && !["(", "["].includes(line.items[wIdx + 1].str)) {
                    optLabel = line.items[wIdx + 1].str;
                    if (wIdx + 2 < line.items.length && !CHECKBOX_CHARS.has(line.items[wIdx + 2].str) && !["(", "[", ":"].includes(line.items[wIdx + 2].str)) {
                        optLabel += " " + line.items[wIdx + 2].str;
                    }
                } else {
                    optLabel = "option";
                }

                pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, "affordance1_checkbox_radio");
            } else if (str.length > 2) {
                // Embedded matches inside single text span
                const embeddedMatches = [...item.str.matchAll(CHECKBOX_REGEX)];
                for (const m of embeddedMatches) {
                    const markerStr = m[0];
                    const markerType = /^(\(|[○●◯◎◦⬤⭕⭘⭙])/.test(markerStr) ? "radioGroup" : "checkBox";
                    const charFrac = item.str.length > 0 ? (m.index / item.str.length) : 0;
                    const markerX = Math.round(item.x + charFrac * item.width);
                    const markerY = item.y;

                    let optLabel = item.str.slice(m.index + markerStr.length).trim();
                    optLabel = optLabel.split(/\s+/).slice(0, 4).join(" ");
                    if (!optLabel && wIdx + 1 < line.items.length) {
                        optLabel = line.items[wIdx + 1].str;
                    }
                    if (!optLabel) optLabel = "option";

                    pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, "affordance1_checkbox_radio_embedded");
                }
            }
            wIdx++;
        }

        function pushCheckboxOrRadioField(markerType, optLabel, markerX, markerY, detectedBy) {
            if (isUniversalStaticText(optLabel)) return;
            const isRadio = markerType === "radioGroup";
            const effectiveLabel = linePrompt ? (isRadio ? linePrompt : `${linePrompt} ${optLabel}`) : optLabel;
            const sem = resolveSemanticProps(effectiveLabel, isRadio ? "radioGroup" : "checkBox", isRadio ? new Set() : usedNames);

            const newField = {
                id: generateFieldId(),
                type: isRadio ? "radioGroup" : "checkBox",
                name: sem.name,
                value: optLabel,
                ...(isRadio ? {
                    radioGroup: linePrompt || sem.name || "radio_group_1",
                    exportValue: optLabel,
                    radioValue: optLabel
                } : {}),
                x: Math.max(10, markerX),
                y: Math.max(10, markerY),
                width: 15,
                height: 15,
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: false,
                autofill: "",
                dataFormat: "text",
                detectedBy: detectedBy
            };

            if (!isOverlapping(newField, fields, 0.45)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 2: Key-Value Prompts with Colons (Label: _____)
    // ------------------------------------------------------------------------
    for (const line of textLines) {
        const text = line.str.trim();
        if (/^[_\-=\*#•·—–─━│┃┌┐└┘├┤┬┴┼░▒▓█\s]+$/.test(text) || (text.includes("?") && !text.includes(":"))) continue;

        const promptMatches = [
            ...text.matchAll(/([\p{L}\p{N}][\p{L}\p{N}\s/()[\]'’"«»*.,#$&°º-]*?)(?:[:ः]|(?=\s*_{2,}))/gu)
        ].filter(m => m[1].trim().length >= 2)
         .sort((a, b) => a.index - b.index);

        for (let i = 0; i < promptMatches.length; i++) {
            const m = promptMatches[i];
            const cleanLabel = m[1].trim();
            if (isUniversalStaticText(cleanLabel)) continue;

            // Skip questions, instructional clauses, and long phrases before colons
            const textAfterColon = text.slice(m.index + m[0].length).trim();
            const hasExplicitPlaceholder = /_{2,}|[\.]{3,}/.test(textAfterColon);
            const labelWithoutParentheticals = cleanLabel.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
            const maxLabelLen = hasExplicitPlaceholder ? 65 : 40;
            const maxLabelWords = hasExplicitPlaceholder ? 9 : 5;
            if (cleanLabel.includes("?") || labelWithoutParentheticals.length > maxLabelLen || labelWithoutParentheticals.split(/\s+/).length > maxLabelWords) continue;
            if (/^(?:are|is|was|were|do|does|did|have|has|had|can|could|will|would|should|may|what|where|when|which|why|how|if|please|note|notice|caution|warning|section|part|step|item|for|to)\b/i.test(cleanLabel)) continue;
            if (/^\s*\d+[\s.)]/.test(cleanLabel)) continue;

            // 1. Skip if choices (checkboxes/radios) immediately follow
            if (CHECKBOX_REGEX.test(textAfterColon)) {
                CHECKBOX_REGEX.lastIndex = 0;
                if (/^(?:\[\s*\]|\(\s*\)|[☐□▣■◻◼◽◾⬜⬛☑✓✔☒✗✘○●◯◎◦⬤⭕⭘⭙\uF063\uF0A8\uF0A9\uF0FE\uF06F\uF071\uF073\uF074\uF0A3\uF0B7])/.test(textAfterColon)) {
                    continue;
                }
            }
            if (/select\s*all|select\s*one|bitte\s*ausw[äa]hlen|veuillez\s*s[eé]lectionner|seleccione/i.test(cleanLabel)) continue;

            // 2. Skip if this is already-filled static text (e.g. "REF: FRM-7745", "REVISION: 2.4", "STATUS: BLANK")
            const nextPromptInLine = textAfterColon.search(/[\p{L}\p{N}\s/()[\]'’"«»*.,#$&_°º-]+?[:ः]/u);
            const valueChunk = nextPromptInLine !== -1 ? textAfterColon.slice(0, nextPromptInLine).trim() : textAfterColon;
            const isBlankPlaceholder = /^[\s_.\-…·\u2026\u2022]*$/.test(valueChunk);
            const isAlreadyFilledStatic = valueChunk.length > 0 && !isBlankPlaceholder;
            if (isAlreadyFilledStatic) continue;

            const preSem = resolveSemanticProps(cleanLabel);
            const isSig = preSem.type === "signature";
            const isDate = preSem.type === "dateField";
            const isMulti = preSem.multiline;

            // Find physical right edge of THIS specific prompt
            const matchEnd = m.index + m[0].length;
            let charOffset = 0;
            let promptEndX = line.x + line.width;
            for (const it of line.items) {
                const itStart = charOffset;
                const itEnd = charOffset + it.str.length;
                if (matchEnd - 1 >= itStart && matchEnd - 1 <= itEnd) {
                    promptEndX = it.x + it.width;
                    break;
                }
                charOffset += it.str.length + 1;
            }

            const placeholderItem = line.items.find(it => /_{2,}|[\.]{3,}/.test(it.str) && it.x >= promptEndX - 10);
            const targetX = Math.round(placeholderItem && placeholderItem.x >= promptEndX + 2 ? placeholderItem.x : promptEndX + 6);
            let targetY = Math.max(0, Math.round(line.y - (isSig ? 6 : 2)));
            let targetH = isSig ? 38 : (isMulti ? 50 : 20);

            // Strict horizontal collision avoidance: clamp available width against enclosing column and text blocks
            let maxAllowedX = pageWidth - 25;
            if (docLayout && Array.isArray(docLayout.columns)) {
                const currentColumn = docLayout.columns.find(col => targetX >= col.x - 15 && targetX < col.right + 15);
                if (currentColumn && currentColumn.right > targetX + 30) {
                    maxAllowedX = Math.min(maxAllowedX, currentColumn.right - 4);
                }
            }
            for (const tb of rawBlocks) {
                if (/^[_.\s]+$/.test(tb.str)) continue;
                if (tb.x > targetX + 2) {
                    const sameLine = Math.abs(tb.y - line.y) <= Math.max(4, (line.height || 10) * 0.5);
                    if (sameLine) {
                        maxAllowedX = Math.min(maxAllowedX, tb.x);
                    }
                }
            }

            // Skip choice group headers with checkboxes below
            const hasCheckboxesBelow = rawBlocks.some(tb => {
                const isBelow = tb.y > line.y && (tb.y - line.y) <= 22;
                const isAligned = tb.x >= promptEndX - 15 && tb.x < maxAllowedX;
                const isBox = /^[(\[]|[☐□▣■◻◼◽◾⬜⬛☑✓✔☒✗✘○●◯◎◦⬤⭕⭘⭙\uF063\uF0A8\uF0A9\uF0FE\uF06F\uF071\uF073\uF074\uF0A3\uF0B7]/.test(tb.str);
                return isBelow && isAligned && isBox;
            });
            if (hasCheckboxesBelow) continue;

            const availableW = maxAllowedX - targetX - 8;
            if (availableW < 24) {
                // Insufficient space before next column / text; avoid label collision
                continue;
            }

            const sem = resolveSemanticProps(cleanLabel, isSig ? "signature" : (isDate ? "dateField" : "textField"), usedNames);
            const fieldType = isSig ? "signature" : (isDate ? "dateField" : sem.type);
            const fieldName = sem.name;
            const isSingleOnLine = (maxAllowedX >= pageWidth - 45);

            let preferredW = isSig
                ? Math.min(SEMANTIC_DIMENSIONS.signature.width, availableW)
                : (isDate
                    ? Math.min(SEMANTIC_DIMENSIONS.dateField.width, availableW)
                    : (isSingleOnLine ? Math.min(260, availableW) : Math.min(180, availableW)));

            if (fieldName.includes("zip") || fieldName.includes("postal")) {
                preferredW = Math.min(SEMANTIC_DIMENSIONS.zip.width, availableW);
            } else if (fieldName.includes("state")) {
                preferredW = Math.min(SEMANTIC_DIMENSIONS.state.width, availableW);
            } else if (fieldName.includes("phone") || fieldName.includes("tel")) {
                preferredW = Math.min(SEMANTIC_DIMENSIONS.phone.width, availableW);
            } else if (fieldName.includes("ssn") || fieldName.includes("tax_id")) {
                preferredW = Math.min(SEMANTIC_DIMENSIONS.ssn.width, availableW);
            }

            // Check if an explicit vector underline is present next to or under this prompt
            const matchingUnderline = (vectorShapes?.underlines || []).find(u =>
                Math.abs(u.y - (line.y + line.height)) <= 14 &&
                u.x >= promptEndX - 15 && (u.x - promptEndX) <= 50
            );

            const hasTextPlaceholder = /_{2,}|[\.]{3,}/.test(valueChunk) || Boolean(placeholderItem);

            // In forms where explicit vector inputs or underlines exist, ignore arbitrary text colons in paragraphs/instructions
            // UNLESS there is an explicit visual placeholder (underscores or dots) written by the author
            const hasExplicitVectorElements = (vectorShapes?.inputBoxRects?.length || 0) > 0 || (vectorShapes?.underlines?.length || 0) > 0;
            if (hasExplicitVectorElements && !matchingUnderline && !hasTextPlaceholder) {
                continue;
            }

            if (matchingUnderline) {
                preferredW = matchingUnderline.width;
            } else if (placeholderItem) {
                preferredW = Math.max(45, placeholderItem.width);
            }

            const targetW = Math.max(30, Math.min(preferredW, availableW));

            // Strict vertical collision avoidance: clamp targetH against text blocks below in same column
            let maxAllowedY = pageHeight - 25;
            for (const tb of rawBlocks) {
                if (tb.y > targetY + 4) {
                    const hOverlap = Math.max(0, Math.min(targetX + targetW, tb.x + tb.width) - Math.max(targetX, tb.x));
                    if (hOverlap > 6) {
                        maxAllowedY = Math.min(maxAllowedY, tb.y);
                    }
                }
            }

            // Column-aware next line check: only consider lines that share horizontal column overlap
            let nextLineY = null;
            for (const otherLine of textLines) {
                const lineLeft = Math.min(line.x, targetX);
                const lineRight = Math.max(line.x + line.width, targetX + targetW);
                const hOverlap = Math.max(0, Math.min(lineRight, otherLine.x + otherLine.width) - Math.max(lineLeft, otherLine.x));
                if (hOverlap > 6 && otherLine.y > line.y + 2 && (nextLineY === null || otherLine.y < nextLineY)) {
                    nextLineY = otherLine.y;
                }
            }
            if (nextLineY !== null) {
                maxAllowedY = Math.min(maxAllowedY, nextLineY - 2);
            }
            targetH = Math.max(10, Math.min(targetH, Math.max(10, maxAllowedY - targetY - 1)));

            const newField = {
                id: generateFieldId(),
                type: fieldType,
                name: fieldName,
                x: Math.max(10, targetX),
                y: targetY,
                width: Math.round(targetW),
                height: Math.round(targetH),
                page: pageNum,
                borderStyle: "solid",
                fillStyle: "white",
                multiline: isMulti || sem.multiline || false,
                autofill: sem.autofill || "",
                dataFormat: isDate ? "date" : (sem.dataFormat || "text"),
                detectedBy: "affordance2_colon_prompt"
            };

            if (!isOverlapping(newField, fields, 0.35)) {
                fields.push(newField);
            }
        }
    }

    // ------------------------------------------------------------------------
    // AFFORDANCE 3: (Disabled) Open Questions & Inquiries
    // ------------------------------------------------------------------------
    // Arbitrary questions ending in '?' in questionnaires, clinical forms, or
    // surveys are static text and must NOT synthesize phantom text fields.
    // Genuine open input areas require physical vector lines/underlines/boxes.

    // ------------------------------------------------------------------------
    // AFFORDANCE 4: Table Grid Line Items (Invoices, POs, Estimates, Orders)
    // ------------------------------------------------------------------------
    // Guards against detecting the SAME table more than once. Any other line
    // on the page that happens to contain 2+ column keywords (a repeated
    // label, stray text near the table, etc.) would otherwise spin up an
    // independent second "table" with its own guessed boundaries and its own
    // synthetic row spacing — producing stray fields that don't line up with
    // the real grid, floating inside or just past it.
    const processedTableRegions = [...preRegisteredTableRegions];
    const regionsOverlap = (a, b) => {
        const xOverlap = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
        const yOverlap = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
        return xOverlap > 0 && yOverlap > 0;
    };

    for (const line of textLines) {
        const text = line.str.toLowerCase();
        if (line.items.length < 2) continue;

        // Skip lines that are sentences, questions, or paragraphs
        if (/[?!;]/.test(line.str) || line.str.trim().endsWith(".")) continue;
        if (isUniversalStaticText(line.str)) continue;
        const words = line.str.trim().split(/\s+/);
        if (words.length > 8) continue;
        if (/^\s*\d+[\s.)]/.test(line.str)) continue;
        if (/^(?:are|is|was|were|do|does|did|have|has|had|can|could|will|would|should|what|where|when|which|why|how|if|in|for|to|please)\b/i.test(line.str)) continue;

        const tableColDefs = TABLE_COL_DEFS;

        const matchedCols = [];
        for (const item of line.items) {
            const itemTrim = item.str.trim();
            // A column header must be a short phrase (<= 3 words, <= 25 chars)
            if (itemTrim.length > 25 || itemTrim.split(/\s+/).length > 3) continue;
            for (const col of tableColDefs) {
                if (col.regex.test(itemTrim) && !matchedCols.some(m => m.id === col.id)) {
                    matchedCols.push({ ...col, x: item.x, width: item.width, y: item.y, height: item.height });
                    break;
                }
            }
        }

        // A table header line has at least 2 distinct column keywords
        if (matchedCols.length >= 2 && !text.includes(":")) {
            matchedCols.sort((a, b) => a.x - b.x);

            // Skip this header if it falls inside a table region we've
            // already built fields for — this is very likely a stray
            // repeated label rather than a genuinely separate table.
            const candidateRegion = {
                xMin: matchedCols[0].x - 10,
                xMax: matchedCols[matchedCols.length - 1].x + 130,
                yMin: line.y - 5,
                yMax: line.y + 400 // generous: real table body extends well below the header
            };
            if (processedTableRegions.some(r => regionsOverlap(r, candidateRegion))) {
                continue;
            }

            const columns = [];
            for (let c = 0; c < matchedCols.length; c++) {
                const current = matchedCols[c];
                const next = matchedCols[c + 1];
                const colStartX = Math.max(10, current.x - 4);
                const colEndX = next ? Math.max(colStartX + 25, next.x - 6) : Math.min(pageWidth - 25, current.x + 120);
                columns.push({
                    id: current.id,
                    name: current.name,
                    x: colStartX,
                    width: Math.max(25, colEndX - colStartX)
                });
            }

            const tableTopY = line.y + line.height + 4;
            let tableBottomY = pageHeight - 40;

            for (const tb of rawBlocks) {
                if (tb.y > tableTopY + 15) {
                    if (/^(?:subtotal|total|balance|amount\s*due|tax|vat|gst|discount|notes|terms|payment|authorized|signature|thank\s*you|eforms)/i.test(tb.str) || (tb.str.includes(":") && !tb.str.includes("http"))) {
                        tableBottomY = Math.min(tableBottomY, tb.y - 6);
                    }
                }
            }

            const tableHeight = tableBottomY - tableTopY;
            if (tableHeight >= 30) {
                // Record the real bounds of this table now that we know
                // them, so any later header line that overlaps this region
                // gets skipped instead of spawning a competing table.
                processedTableRegions.push({
                    xMin: columns[0].x - 10,
                    xMax: columns[columns.length - 1].x + columns[columns.length - 1].width + 10,
                    yMin: tableTopY - 5,
                    yMax: tableBottomY + 5
                });
                // Find existing row indices or placeholder rows
                const rowMarkers = rawBlocks.filter(tb => {
                    return tb.y >= tableTopY && tb.y <= tableBottomY && (/^\d+$/.test(tb.str) || /^\$\s*0(?:\.00)?$/.test(tb.str) || tb.str === "[");
                });

                let rowYs = [];
                if (rowMarkers.length >= 2) {
                    const sortedY = rowMarkers.map(m => m.y).sort((a, b) => a - b);
                    for (const y of sortedY) {
                        if (!rowYs.some(ry => Math.abs(ry - y) <= 14)) {
                            rowYs.push(y);
                        }
                    }

                    // Filter out any row marker separated by a large gap from the previous table rows
                    if (rowYs.length >= 2) {
                        const cleanedRowYs = [rowYs[0]];
                        const deltas = [];
                        for (let i = 1; i < rowYs.length; i++) {
                            deltas.push(rowYs[i] - rowYs[i - 1]);
                        }
                        deltas.sort((a, b) => a - b);
                        const medianDelta = deltas[Math.floor(deltas.length / 2)] || 22;

                        for (let i = 1; i < rowYs.length; i++) {
                            const gap = rowYs[i] - cleanedRowYs[cleanedRowYs.length - 1];
                            if (gap <= Math.max(34, medianDelta * 1.6)) {
                                cleanedRowYs.push(rowYs[i]);
                            } else {
                                // Table body has ended; stop accepting rows from below
                                break;
                            }
                        }
                        rowYs = cleanedRowYs;
                    }
                }

                if (rowYs.length === 0) {
                    const rowCount = Math.min(8, Math.max(2, Math.floor(tableHeight / 24)));
                    const rowHeight = tableHeight / rowCount;
                    for (let r = 0; r < rowCount; r++) {
                        rowYs.push(Math.round(tableTopY + r * rowHeight));
                    }
                }

                let cellHeight = 18;
                if (rowYs.length >= 2) {
                    const medianRowGap = (rowYs[rowYs.length - 1] - rowYs[0]) / (rowYs.length - 1);
                    cellHeight = Math.min(24, Math.max(15, Math.round(medianRowGap - 4)));
                }

                for (let rIdx = 0; rIdx < rowYs.length; rIdx++) {
                    const rowY = rowYs[rIdx];
                    const rowNum = rIdx + 1;

                    // Never place a field that bleeds past the bottom of the table
                    if (rowY + cellHeight > tableBottomY - 4) {
                        continue;
                    }

                    for (const col of columns) {
                        if (col.id === "item_no") continue;

                        const isCheckboxCol = (col.id === "taxable" || col.id === "receipt");
                        const cellType = isCheckboxCol ? "checkBox" : "textField";
                        const sem = resolveSemanticProps(`${col.name}_${rowNum}`, cellType, usedNames);

                        const cellWidth = isCheckboxCol ? 16 : col.width;
                        const cellX = isCheckboxCol ? Math.round(col.x + Math.max(0, (col.width - 16) / 2)) : col.x;
                        const currentCellH = isCheckboxCol ? 16 : cellHeight;

                        // Static text collision check: never place a field over existing static text
                        const textCollisions = rawBlocks.filter(tb => {
                            const overlapX = Math.max(0, Math.min(cellX + cellWidth, tb.x + tb.width) - Math.max(cellX, tb.x));
                            const overlapY = Math.max(0, Math.min(rowY + currentCellH, tb.y + tb.height) - Math.max(rowY, tb.y));
                            return overlapX > 2 && overlapY > 2;
                        });
                        if (textCollisions.some(tb => tb.str.replace(/[\s.,$]/g, "").length > 0)) {
                            continue;
                        }

                        const cellField = {
                            id: generateFieldId(),
                            type: cellType,
                            name: sem.name,
                            x: cellX,
                            y: rowY,
                            width: cellWidth,
                            height: cellHeight,
                            page: pageNum,
                            borderStyle: "solid",
                            fillStyle: "white",
                            multiline: false,
                            autofill: "",
                            dataFormat: (col.id === "amount" || col.id === "unit_price") ? "currency" : ((col.id === "qty") ? "number" : "text"),
                            detectedBy: `affordance4_table_col-${col.id}_row-${rowNum}`
                        };

                        if (!isOverlapping(cellField, fields, 0.35)) {
                            fields.push(cellField);
                        }
                    }
                }
            }
        }
    }

    return fields.slice(seedCount);
}

// ============================================================================
// 4. LINE CLUSTERING UTILITY (Font-Relative Tolerances)
// ============================================================================
function clusterIntoLines(blocks) {
    if (blocks.length === 0) return [];
    const sorted = [...blocks].sort((a, b) => (Math.abs(a.y - b.y) <= 4 ? a.x - b.x : a.y - b.y));
    const lines = [];
    let currentLine = null;

    for (let b of sorted) {
        const fontH = Math.max(6, b.height || 12);

        if (!currentLine) {
            currentLine = { ...b, items: [b] };
        } else {
            const refFontH = Math.max(6, currentLine.height || fontH);
            const baselineTolerance = Math.max(6, refFontH * 0.5);
            const gapTolerance = Math.max(60, refFontH * 4);

            const sameBaseline = Math.abs(currentLine.y - b.y) <= baselineTolerance;
            const reasonableGap = b.x >= currentLine.x && (b.x - (currentLine.x + currentLine.width)) <= gapTolerance;

            if (sameBaseline && reasonableGap) {
                currentLine.str += " " + b.str;
                currentLine.width = (b.x + b.width) - currentLine.x;
                currentLine.height = Math.max(currentLine.height, b.height);
                currentLine.items.push(b);
            } else {
                lines.push(currentLine);
                currentLine = { ...b, items: [b] };
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}
