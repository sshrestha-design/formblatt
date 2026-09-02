// ── PDF.js Rendering & Navigation Pipeline (js/pdf-engine.js) ─
import { state, updateDocumentTitle } from "./state.js";

let renderTask = null;
let currentRenderPage = null;
let lastRasterScale = 1.0;
let rasterDebounceTimer = null;

export async function renderPage(forceRerender = false) {
    if (!state.pdfDoc) return;
    const canvas = document.getElementById("pdfCanvas");
    const container = document.getElementById("canvasContainer");
    if (!canvas || !container) return;

    if (renderTask) {
        try { renderTask.cancel(); } catch(e) {}
    }

    try {
        currentRenderPage = await state.pdfDoc.getPage(state.currentPageNum);
        const baseViewport = currentRenderPage.getViewport({ scale: 1.0 });
        state.pdfViewport = baseViewport;

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";
        container.style.display = "block";

        container.style.width = baseViewport.width + "px";
        container.style.height = baseViewport.height + "px";

        const rasterScale = state.currentScale * (window.devicePixelRatio || 1);
        lastRasterScale = rasterScale;
        const viewport = currentRenderPage.getViewport({ scale: rasterScale });

        // Double-Buffered Offscreen Render to eliminate canvas blanking/flicker
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext("2d");

        renderTask = currentRenderPage.render({ canvasContext: offscreenCtx, viewport: viewport });
        await renderTask.promise;

        // Atomic swap to visible canvas without any white flash
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = baseViewport.width + "px";
        canvas.style.height = baseViewport.height + "px";
        const ctx = canvas.getContext("2d");
        ctx.drawImage(offscreenCanvas, 0, 0);
    } catch(err) {
        if (err.name !== "RenderingCancelledException") {
            console.error("PDF Render error:", err);
        }
    }
}

let zoomHudTimer = null;
export function showZoomHud(text) {
    if (typeof document === "undefined") return;
    const hud = document.getElementById("canvasZoomHud");
    const hudText = document.getElementById("canvasZoomHudText");
    if (!hud) return;
    if (hudText) hudText.textContent = text;
    hud.classList.add("visible");
    if (zoomHudTimer) clearTimeout(zoomHudTimer);
    zoomHudTimer = setTimeout(() => {
        hud.classList.remove("visible");
    }, 1200);
}

export function setTransformScale(newScale, onRerender) {
    state.currentScale = Math.min(Math.max(newScale, 0.25), 4.0);
    const centerCanvas = document.getElementById("centerCanvas");
    centerCanvas?.classList.remove("fit-page-view");
    const container = document.getElementById("canvasContainer");
    if (container) {
        container.style.marginTop = "";
        container.style.marginLeft = "";
        container.style.transform = `scale(${state.currentScale})`;
        const baseWidth = container.offsetWidth;
        const baseHeight = container.offsetHeight;
        container.style.marginRight = `${Math.max(0, (state.currentScale - 1) * baseWidth)}px`;
        container.style.marginBottom = `${Math.max(0, (state.currentScale - 1) * baseHeight)}px`;
    }

    const pctText = Math.round(state.currentScale * 100) + "%";
    const zoomDisplay = document.getElementById("zoomLevelDisplay");
    if (zoomDisplay) zoomDisplay.textContent = pctText;
    showZoomHud(pctText);

    // Hide any active guides during zoom
    document.querySelectorAll(".align-line, .spacing-badge, .snap-point-dot").forEach(el => {
        el.style.display = "none";
    });

    clearTimeout(rasterDebounceTimer);
    rasterDebounceTimer = setTimeout(() => {
        if (Math.abs(lastRasterScale - (state.currentScale * (window.devicePixelRatio || 1))) > 0.05) {
            renderPage(true);
        }
    }, 200);
}

export function fitToWidth(onRerender) {
    const wrapper = document.querySelector(".canvas-workbench") || document.getElementById("canvasContainer")?.parentElement;
    if (!wrapper) return;
    const availableWidth = Math.max(200, wrapper.clientWidth - 64);
    const docWidth = state.pdfViewport ? state.pdfViewport.width : 595.28;
    const newScale = Math.min(Math.max(availableWidth / docWidth, 0.25), 3.0);
    setTransformScale(newScale, onRerender);
}

export function fitToPage(onRerender) {
    const wrapper = document.querySelector(".canvas-workbench") || document.getElementById("canvasContainer")?.parentElement;
    if (!wrapper) return;
    const availableWidth = Math.max(200, wrapper.clientWidth - 64);
    const availableHeight = Math.max(200, wrapper.clientHeight - 64);
    const docWidth = state.pdfViewport ? state.pdfViewport.width : 595.28;
    const docHeight = state.pdfViewport ? state.pdfViewport.height : 841.89;
    const scaleX = availableWidth / docWidth;
    const scaleY = availableHeight / docHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 3.0);
    setTransformScale(newScale, onRerender);
    const centerCanvas = document.getElementById("centerCanvas");
    const container = document.getElementById("canvasContainer");
    if (centerCanvas && container && window.matchMedia("(max-width: 767px)").matches) {
        const visualHeight = container.offsetHeight * state.currentScale;
        const visualWidth = container.offsetWidth * state.currentScale;
        const availableHeight = centerCanvas.clientHeight
            - parseFloat(getComputedStyle(centerCanvas).paddingTop)
            - parseFloat(getComputedStyle(centerCanvas).paddingBottom);
        const availableWidth = centerCanvas.clientWidth
            - parseFloat(getComputedStyle(centerCanvas).paddingLeft)
            - parseFloat(getComputedStyle(centerCanvas).paddingRight);
        centerCanvas.scrollLeft = 0;
        container.style.marginLeft = `${Math.max(0, (availableWidth - visualWidth) / 2)}px`;
        container.style.marginTop = `${Math.max(0, (availableHeight - visualHeight) / 2)}px`;
        centerCanvas.classList.add("fit-page-view");
    }
}

export async function goToPage(pageNum, onPageChange) {
    if (!state.pdfDoc || pageNum < 1 || pageNum > state.totalPages) return;
    state.currentPageNum = pageNum;
    updatePageNavDisplay();
    await renderPage(true);
    if (onPageChange) onPageChange();
}

export function updatePageNavDisplay() {
    const pageNumDisplay = document.getElementById("currentPageNumDisplay");
    const totalDisplay = document.getElementById("totalPagesDisplay");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    if (pageNumDisplay) pageNumDisplay.textContent = state.currentPageNum;
    if (totalDisplay) totalDisplay.textContent = state.totalPages;
    if (prevBtn) prevBtn.disabled = state.currentPageNum <= 1;
    if (nextBtn) nextBtn.disabled = state.currentPageNum >= state.totalPages;
}

export async function getPageTextBlocks(pageNum = state.currentPageNum) {
    if (!state.pdfDoc) return [];
    if (!state.pageTextCache) state.pageTextCache = new Map();
    if (state.pageTextCache.has(pageNum)) {
        return state.pageTextCache.get(pageNum);
    }
    try {
        const page = await state.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        const rawBlocks = textContent.items.map(item => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            const fontHeight = Math.abs(item.transform[3]) || item.height || 12;
            const x = tx;
            const y = viewport.height - ty - fontHeight;
            const width = item.width;
            const height = fontHeight;
            const str = (item.str || "").trim();
            return { x, y, width, height, str };
        }).filter(tb => tb.str.length > 0);
        state.pageTextCache.set(pageNum, rawBlocks);
        return rawBlocks;
    } catch(err) {
        console.error("Failed to load page text blocks:", err);
        return [];
    }
}

export async function analyzePdfDocument() {
    if (!state.pdfDoc || !state.originalPdfBytes) return;

    // 1. SHA-256 Fingerprint
    try {
        const hashBuffer = await crypto.subtle.digest("SHA-256", state.originalPdfBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        state.pdfHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch(e) {
        state.pdfHash = "pdf_" + Date.now();
    }

    // 2. Metadata Extraction (Title, Author)
    try {
        const metadata = await state.pdfDoc.getMetadata();
        if (metadata && metadata.info && metadata.info.Title && (!state.fileName || state.fileName === "interactive_form.pdf")) {
            const rawTitle = metadata.info.Title.trim();
            if (rawTitle && !rawTitle.toLowerCase().includes("untitled") && rawTitle.length > 2) {
                state.fileName = rawTitle.endsWith(".pdf") ? rawTitle : rawTitle + ".pdf";
            }
        }
    } catch(metaErr) {}

    // 3. Category Auto-Detection via Page 1 Text Search
    let category = "General Form";
    try {
        const page1 = await state.pdfDoc.getPage(1);
        const textContent = await page1.getTextContent();
        const fullText = textContent.items.map(item => item.str).join(" ").toLowerCase();

        if (/w-9|w9|taxpayer|1099|irs|tax id/i.test(fullText)) {
            category = "Tax Form";
        } else if (/nondisclosure|non-disclosure|confidentiality|agreement|contract/i.test(fullText)) {
            category = "NDA & Contract";
        } else if (/tenant|landlord|lease|rental|premises|rent/i.test(fullText)) {
            category = "Lease Agreement";
        } else if (/invoice|bill to|total due|payment|receipt/i.test(fullText)) {
            category = "Invoice & Billing";
        } else if (/application|employment|applicant|resume/i.test(fullText)) {
            category = "Application Form";
        }
    } catch(textErr) {}

    state.docCategory = category;

    // 4. Update UI Elements
    updateTopBarDocInfo();
}

export function updateTopBarDocInfo() {
    const titleInline = document.getElementById("docTitleInline");
    const titleInput = document.getElementById("docTitleInlineInput");
    const categoryBadge = document.getElementById("docCategoryBadge");
    const metaDetails = document.getElementById("docMetaDetails");
    const autosaveBadge = document.getElementById("docAutosaveBadge");

    const currentName = state.fileName || "interactive_form.pdf";
    if (titleInline) titleInline.textContent = currentName;
    if (titleInput) titleInput.value = currentName;
    updateDocumentTitle(currentName);

    if (categoryBadge) {
        categoryBadge.textContent = state.docCategory || "Document";
    }

    if (metaDetails) {
        const pageText = `${state.totalPages || 1} Page${(state.totalPages || 1) > 1 ? "s" : ""}`;
        const bytes = state.originalPdfBytes ? state.originalPdfBytes.byteLength : 0;
        let sizeText = "0 KB";
        if (bytes >= 1048576) {
            sizeText = (bytes / 1048576).toFixed(1) + " MB";
        } else if (bytes > 0) {
            sizeText = Math.round(bytes / 1024) + " KB";
        }
        metaDetails.textContent = `${pageText} • ${sizeText}`;
    }

    if (autosaveBadge) {
        autosaveBadge.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #059669; display: inline-block; box-shadow: 0 0 6px rgba(5, 150, 105, 0.6);"></span>
            <span>Saved to Browser Storage</span>
        `;
    }
}
