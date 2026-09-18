// ── Client-Side Neural Vision Detector (js/onnx-detector.js) ──
// 100% in-browser, zero-upload neural object detector using onnxruntime-web (WASM / WebGPU).
// Evaluates FFDNet / FFDetr models locally on user device.

import { generateFieldId } from "./state.js";

// Model configuration constants
export const ONNX_CONFIG = {
    // CDN endpoints for onnxruntime-web with fallback
    ortCdn: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.all.min.js",
    modelUrl: "/models/ffdnet_s_quantized.onnx",
    inputSize: 640,
    confThreshold: 0.30,
    iouThreshold: 0.45,
    classes: [
        { id: 0, type: "textField", label: "Text Input" },
        { id: 1, type: "checkBox", label: "Choice Button" },
        { id: 2, type: "signature", label: "Signature" }
    ]
};

let ortSession = null;
let isInitializing = false;

/**
 * Dynamically load ONNX Runtime Web script if not already present.
 */
export async function loadOnnxRuntime() {
    if (typeof window === "undefined") return null;
    if (window.ort) return window.ort;

    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src*="onnxruntime"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve(window.ort));
            existing.addEventListener("error", reject);
            return;
        }

        const script = document.createElement("script");
        script.src = ONNX_CONFIG.ortCdn;
        script.async = true;
        script.onload = () => {
            if (window.ort) {
                // Configure WASM paths for optimal web performance
                window.ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
                window.ort.env.wasm.simd = true;
                resolve(window.ort);
            } else {
                reject(new Error("ONNX Runtime loaded but window.ort is undefined"));
            }
        };
        script.onerror = () => reject(new Error("Failed to load onnxruntime-web script"));
        document.head.appendChild(script);
    });
}

/**
 * Initialize or retrieve the cached ONNX inference session.
 */
export async function getOnnxSession(modelPath = ONNX_CONFIG.modelUrl) {
    if (ortSession) return ortSession;
    if (isInitializing) {
        while (isInitializing) await new Promise(r => setTimeout(r, 50));
        return ortSession;
    }

    isInitializing = true;
    try {
        const ort = await loadOnnxRuntime();
        if (!ort) throw new Error("ONNX runtime unavailable in this environment");

        // Prefer WebGPU for hardware acceleration if available, fall back to WebAssembly
        const executionProviders = [];
        if (typeof navigator !== "undefined" && navigator.gpu) {
            executionProviders.push("webgpu");
        }
        executionProviders.push("wasm");

        ortSession = await ort.InferenceSession.create(modelPath, {
            executionProviders,
            graphOptimizationLevel: "all"
        });
        return ortSession;
    } catch (err) {
        console.warn("Could not initialize local ONNX neural model session:", err);
        return null;
    } finally {
        isInitializing = false;
    }
}

/**
 * Preprocess an HTML Canvas into a normalized Float32Array RGB tensor (1, 3, 640, 640).
 */
export function preprocessCanvasToTensor(sourceCanvas, targetSize = ONNX_CONFIG.inputSize) {
    const offscreen = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!offscreen) return null;

    offscreen.width = targetSize;
    offscreen.height = targetSize;
    const ctx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Scale and letterbox canvas
    const scale = Math.min(targetSize / sourceCanvas.width, targetSize / sourceCanvas.height);
    const scaledWidth = Math.round(sourceCanvas.width * scale);
    const scaledHeight = Math.round(sourceCanvas.height * scale);
    const dx = Math.round((targetSize - scaledWidth) / 2);
    const dy = Math.round((targetSize - scaledHeight) / 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(sourceCanvas, dx, dy, scaledWidth, scaledHeight);

    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const data = imageData.data;
    const floatArray = new Float32Array(3 * targetSize * targetSize);

    const channelSize = targetSize * targetSize;
    for (let i = 0; i < channelSize; i++) {
        const r = data[i * 4] / 255.0;
        const g = data[i * 4 + 1] / 255.0;
        const b = data[i * 4 + 2] / 255.0;

        floatArray[i] = r;
        floatArray[channelSize + i] = g;
        floatArray[2 * channelSize + i] = b;
    }

    return {
        tensorData: floatArray,
        scale,
        dx,
        dy,
        originalWidth: sourceCanvas.width,
        originalHeight: sourceCanvas.height
    };
}

/**
 * Calculate IoU between two bounding boxes [x, y, width, height].
 */
export function calculateBoxIoU(boxA, boxB) {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea <= 0) return 0;

    const areaA = boxA.width * boxA.height;
    const areaB = boxB.width * boxB.height;
    const unionArea = areaA + areaB - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Non-Maximum Suppression (NMS) on raw detected bounding box predictions.
 */
export function nonMaximumSuppression(boxes, iouThreshold = ONNX_CONFIG.iouThreshold) {
    const sorted = [...boxes].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const selected = [];

    for (const box of sorted) {
        let keep = true;
        for (const existing of selected) {
            if (calculateBoxIoU(box, existing) > iouThreshold) {
                keep = false;
                break;
            }
        }
        if (keep) selected.push(box);
    }

    return selected;
}

/**
 * Run client-side neural vision inference on a rendered PDF page canvas.
 * Returns an array of detected form field candidates with bounding coordinates.
 */
export async function detectNeuralFieldsOnCanvas(pageCanvas, pageNum = 1, viewport = null) {
    if (!pageCanvas) return [];

    try {
        const session = await getOnnxSession();
        if (!session || typeof window === "undefined" || !window.ort) {
            return [];
        }

        const preprocessed = preprocessCanvasToTensor(pageCanvas);
        if (!preprocessed) return [];

        const { tensorData, scale, dx, dy, originalWidth, originalHeight } = preprocessed;
        const inputTensor = new window.ort.Tensor("float32", tensorData, [1, 3, ONNX_CONFIG.inputSize, ONNX_CONFIG.inputSize]);
        const feeds = { [session.inputNames[0]]: inputTensor };
        const results = await session.run(feeds);
        const output = results[session.outputNames[0]];

        if (!output || !output.data) return [];

        const candidates = [];
        const [batch, numChannels, numBoxes] = output.dims; // e.g. [1, 7, 8400]
        const data = output.data;

        // Decode YOLO/RT-DETR box format [cx, cy, w, h, classScores...]
        for (let i = 0; i < numBoxes; i++) {
            const cx = data[0 * numBoxes + i];
            const cy = data[1 * numBoxes + i];
            const w = data[2 * numBoxes + i];
            const h = data[3 * numBoxes + i];

            let bestScore = 0;
            let bestClassId = 0;

            for (let c = 4; c < numChannels; c++) {
                const score = data[c * numBoxes + i];
                if (score > bestScore) {
                    bestScore = score;
                    bestClassId = c - 4;
                }
            }

            if (bestScore >= ONNX_CONFIG.confThreshold) {
                // Map coordinates from letterbox space back to original page coordinates
                const unscaledX = (cx - w / 2 - dx) / scale;
                const unscaledY = (cy - h / 2 - dy) / scale;
                const unscaledW = w / scale;
                const unscaledH = h / scale;

                const classDef = ONNX_CONFIG.classes[bestClassId] || ONNX_CONFIG.classes[0];

                candidates.push({
                    id: generateFieldId(),
                    type: classDef.type,
                    x: Math.max(0, Math.round(unscaledX)),
                    y: Math.max(0, Math.round(unscaledY)),
                    width: Math.max(12, Math.round(unscaledW)),
                    height: Math.max(12, Math.round(unscaledH)),
                    page: pageNum,
                    confidence: bestScore,
                    detectedBy: "neural_vision",
                    borderStyle: "solid",
                    fillStyle: "white"
                });
            }
        }

        return nonMaximumSuppression(candidates);
    } catch (err) {
        console.warn("Neural vision inference encountered an error:", err);
        return [];
    }
}
