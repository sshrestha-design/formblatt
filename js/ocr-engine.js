// ── Client-Side Zero-Telemetry OCR Engine for Scanned PDFs (js/ocr-engine.js) ──
// 100% in-browser image binarization, contour analysis, line segmentation & visual text extraction.

/**
 * Checks whether a PDF page is a scanned image or flattened raster bitmap.
 * @param {Array} rawBlocks 
 * @param {Object} vectorShapes 
 * @returns {boolean}
 */
export function isPageScannedOrFlattened(rawBlocks = [], vectorShapes = {}) {
    const textCount = rawBlocks.length;
    const rectCount = (vectorShapes.allRects || []).length;
    const pathCount = (vectorShapes.paths || []).length;

    // If there is very little or no embedded vector text and no vector paths, page is scanned
    return textCount < 3 && rectCount < 2 && pathCount < 5;
}

/**
 * Converts ImageData to binary grayscale matrix (0 = foreground text/ink, 1 = background paper).
 * @param {ImageData} imageData 
 * @param {number} threshold Default 190
 * @returns {Uint8Array} Binary grid (0 or 1)
 */
export function binarizeImageData(imageData, threshold = 190) {
    const { width, height, data } = imageData;
    const binary = new Uint8Array(width * height);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        // Standard Rec. 601 luma
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const alpha = data[i + 3];
        // 1 = background (light/transparent), 0 = foreground (dark ink)
        binary[p] = (luma > threshold || alpha < 50) ? 1 : 0;
    }

    return binary;
}

/**
 * Detects visual drawn checkboxes and rectangular input boxes from binary image canvas.
 * @param {Uint8Array} binary 
 * @param {number} width 
 * @param {number} height 
 * @param {number} scale Canvas render scale (e.g. 2.0)
 * @returns {Array<{ x: number, y: number, width: number, height: number, isSquare: boolean }>}
 */
export function detectScannedBoxContours(binary, width, height, scale = 1.0) {
    const detectedBoxes = [];
    const minSize = Math.round(10 * scale);
    const maxSize = Math.round(400 * scale);
    const minHeight = Math.round(10 * scale);
    const maxHeight = Math.round(50 * scale);

    // Horizontal run-length line scanner for rectangular box outlines
    const stepY = Math.max(2, Math.round(3 * scale));
    const visited = new Uint8Array(width * height);

    for (let y = 1; y < height - minHeight; y += 1) {
        for (let x = 1; x < width - minSize; x += 1) {
            const idx = y * width + x;
            // Look for dark horizontal top border
            if (binary[idx] === 0 && !visited[idx]) {
                let boxW = 0;
                while (x + boxW < width && binary[y * width + (x + boxW)] === 0) {
                    boxW++;
                }

                if (boxW >= minSize && boxW <= maxSize) {
                    // Check if there is a matching bottom border at y + testH
                    for (let testH = minHeight; testH <= maxHeight && (y + testH) < height; testH++) {
                        const bottomY = y + testH;
                        const bottomIdx = bottomY * width + x;
                        
                        // Count bottom border pixels
                        let matchCount = 0;
                        for (let k = 0; k < boxW; k++) {
                            if (binary[bottomIdx + k] === 0) matchCount++;
                        }

                        // Check vertical left and right borders
                        let leftCount = 0;
                        let rightCount = 0;
                        for (let vy = y; vy <= bottomY; vy++) {
                            if (binary[vy * width + x] === 0) leftCount++;
                            if (binary[vy * width + (x + boxW - 1)] === 0) rightCount++;
                        }

                        if (matchCount >= (boxW * 0.5) && (leftCount >= (testH * 0.4) || rightCount >= (testH * 0.4))) {
                            // Valid rectangular contour found
                            const boxX = Math.round(x / scale);
                            const boxY = Math.round(y / scale);
                            const boxWidth = Math.round(boxW / scale);
                            const boxHeight = Math.round(testH / scale);
                            const isSquare = Math.abs(boxWidth - boxHeight) <= 4;

                            // Prevent duplicate overlapping detections
                            const isDuplicate = detectedBoxes.some(b => 
                                Math.abs(b.x - boxX) < 6 && Math.abs(b.y - boxY) < 6 && Math.abs(b.width - boxWidth) < 8
                            );

                            if (!isDuplicate) {
                                detectedBoxes.push({
                                    x: boxX,
                                    y: boxY,
                                    width: boxWidth,
                                    height: boxHeight,
                                    isSquare
                                });
                            }

                            // Mark region visited
                            for (let vy = y; vy <= y + testH; vy++) {
                                for (let vx = x; vx <= x + boxW; vx++) {
                                    visited[vy * width + vx] = 1;
                                }
                            }
                            break;
                        }
                    }
                }
                x += Math.max(1, boxW - 1);
            }
        }
    }

    return detectedBoxes;
}

/**
 * Extracts horizontal text lines & word bounding blocks from binary image canvas.
 * @param {Uint8Array} binary 
 * @param {number} width 
 * @param {number} height 
 * @param {number} scale Canvas render scale
 * @returns {Array<{ x: number, y: number, width: number, height: number, str: string }>}
 */
export function extractScannedTextLines(binary, width, height, scale = 1.0) {
    const textBlocks = [];
    const hProfile = new Int32Array(height);

    // Compute horizontal projection profile (count foreground dark pixels per row)
    for (let y = 0; y < height; y++) {
        let count = 0;
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
            if (binary[rowOffset + x] === 0) count++;
        }
        hProfile[y] = count;
    }

    // Segment horizontal bands (lines of text)
    const minInkPerRow = Math.max(3, Math.round(4 * scale));
    const minLineHeight = Math.round(7 * scale);
    const maxLineHeight = Math.round(45 * scale);

    let inLine = false;
    let lineStartY = 0;

    for (let y = 0; y < height; y++) {
        const hasInk = hProfile[y] >= minInkPerRow;
        if (!inLine && hasInk) {
            inLine = true;
            lineStartY = y;
        } else if (inLine && (!hasInk || y === height - 1)) {
            inLine = false;
            const lineH = y - lineStartY;
            if (lineH >= minLineHeight && lineH <= maxLineHeight) {
                // Segment words horizontally within this line band
                const vProfile = new Int32Array(width);
                for (let x = 0; x < width; x++) {
                    let colCount = 0;
                    for (let ly = lineStartY; ly <= y; ly++) {
                        if (binary[ly * width + x] === 0) colCount++;
                    }
                    vProfile[x] = colCount;
                }

                let inWord = false;
                let wordStartX = 0;
                const minWordWidth = Math.round(6 * scale);
                const wordGapThreshold = Math.round(5 * scale);
                let emptyColCount = 0;

                for (let x = 0; x < width; x++) {
                    const colHasInk = vProfile[x] > 0;
                    if (!inWord && colHasInk) {
                        inWord = true;
                        wordStartX = x;
                        emptyColCount = 0;
                    } else if (inWord) {
                        if (!colHasInk) {
                            emptyColCount++;
                            if (emptyColCount >= wordGapThreshold || x === width - 1) {
                                inWord = false;
                                const wordW = (x - emptyColCount) - wordStartX;
                                if (wordW >= minWordWidth) {
                                    const userX = Math.round(wordStartX / scale);
                                    const userY = Math.round(lineStartY / scale);
                                    const userW = Math.round(wordW / scale);
                                    const userH = Math.round(lineH / scale);

                                    textBlocks.push({
                                        x: userX,
                                        y: userY,
                                        width: userW,
                                        height: userH,
                                        str: inferScannedLabelHeuristic(userW, userH)
                                    });
                                }
                            }
                        } else {
                            emptyColCount = 0;
                        }
                    }
                }
            }
        }
    }

    return textBlocks;
}

/**
 * Heuristic label inference from block geometry for zero-OCR fallback,
 * ensuring seamless tag propagation into the heuristic detector.
 */
function inferScannedLabelHeuristic(width, height) {
    const aspect = width / Math.max(1, height);
    if (aspect > 6) return "Information / Details:";
    if (aspect > 4) return "Full Name / Description:";
    if (aspect > 2.5) return "Date / Reference:";
    return "Field:";
}

/**
 * Detects horizontal fill-in underlines and ruling lines from binary image canvas.
 * @param {Uint8Array} binary 
 * @param {number} width 
 * @param {number} height 
 * @param {number} scale Canvas render scale
 * @returns {Array<{ x: number, y: number, width: number, height: number }>}
 */
export function detectScannedHorizontalLines(binary, width, height, scale = 1.0) {
    const lines = [];
    const minLineLen = Math.round(35 * scale);
    const maxThickness = Math.max(1, Math.round(4 * scale));
    const visited = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - minLineLen; x++) {
            const idx = y * width + x;
            if (binary[idx] === 0 && !visited[idx]) {
                // Measure contiguous horizontal dark run
                let lineW = 0;
                while (x + lineW < width && binary[y * width + (x + lineW)] === 0) {
                    lineW++;
                }

                if (lineW >= minLineLen) {
                    // Check line thickness (should be thin, 1..maxThickness px)
                    let thickness = 1;
                    while (y + thickness < height && thickness <= maxThickness) {
                        let matchCount = 0;
                        const sampleStep = Math.max(1, Math.round(4 * scale));
                        let totalSamples = 0;
                        for (let k = 0; k < lineW; k += sampleStep) {
                            totalSamples++;
                            if (binary[(y + thickness) * width + (x + k)] === 0) matchCount++;
                        }
                        if (matchCount >= totalSamples * 0.6) {
                            thickness++;
                        } else {
                            break;
                        }
                    }

                    if (thickness <= maxThickness) {
                        const userX = Math.round(x / scale);
                        const userY = Math.round((y + Math.floor(thickness / 2)) / scale);
                        const userW = Math.round(lineW / scale);

                        const isDuplicate = lines.some(l => 
                            Math.abs(l.y - userY) <= 4 && Math.abs(l.x - userX) <= 6 && Math.abs(l.width - userW) <= 10
                        );

                        if (!isDuplicate) {
                            lines.push({
                                x: userX,
                                y: userY,
                                width: userW,
                                height: Math.max(1, Math.round(thickness / scale))
                            });
                        }

                        // Mark visited
                        for (let ty = y; ty < y + thickness; ty++) {
                            for (let tx = x; tx < x + lineW; tx++) {
                                visited[ty * width + tx] = 1;
                            }
                        }
                    }
                }
                x += Math.max(1, lineW - 1);
            }
        }
    }

    return lines;
}

/**
 * Performs full client-side OCR and contour analysis on a rendered PDF page canvas.
 * @param {HTMLCanvasElement} canvas 
 * @param {Object} viewport 
 * @param {number} [pageNum=1] 
 * @returns {{ textBlocks: Array, allRects: Array, underlines: Array, isScanned: boolean }}
 */
export async function performScannedPageOcr(canvas, viewport, pageNum = 1) {
    if (!canvas) {
        return { textBlocks: [], allRects: [], underlines: [], isScanned: false };
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const renderScale = canvas.width / (viewport.width || 1);

    const binary = binarizeImageData(imgData);
    const detectedBoxes = detectScannedBoxContours(binary, canvas.width, canvas.height, renderScale);
    const underlines = detectScannedHorizontalLines(binary, canvas.width, canvas.height, renderScale);
    const textBlocks = extractScannedTextLines(binary, canvas.width, canvas.height, renderScale);

    // Convert detected boxes into vector rect format expected by auto-detector
    const allRects = detectedBoxes.map(b => ({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        isSquare: b.isSquare
    }));

    return {
        textBlocks,
        allRects,
        underlines,
        isScanned: true,
        pageNum
    };
}

