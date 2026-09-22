# Formblatt

[![Production](https://img.shields.io/badge/Production-formblatt.dpdns.org-2563eb?style=flat-square&logo=vercel&logoColor=white)](https://formblatt.dpdns.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-059669?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-sshrestha--design%2Fformblatt-0f172a?style=flat-square&logo=github&logoColor=white)](https://github.com/sshrestha-design/formblatt)
[![Tests](https://img.shields.io/badge/Tests-155%20Passing-10b981?style=flat-square)](tests/test_suite.js)
[![PWA](https://img.shields.io/badge/PWA-Offline-7c3aed?style=flat-square)](site.webmanifest)

Formblatt is a browser-based PDF editor for creating fillable forms and AcroForms. All document rendering, field detection, and PDF compilation run locally in browser memory without sending files to an external server.

- Production: [formblatt.dpdns.org](https://formblatt.dpdns.org)
- Repository: [github.com/sshrestha-design/formblatt](https://github.com/sshrestha-design/formblatt)

---

## Features

- **Local Processing**: PDF.js and PDF-Lib render and compile documents directly in the browser.
- **Formula Builder**: Configure sum, product, tax, and discount calculations using field chips or direct canvas selection. Exports standard AcroForm `/AA` calculation scripts.
- **Field Detection**: Locate table grids, underlines, checkboxes, and input boxes with 2D geometry analysis, OCR line detection, or local ONNX vision models.
- **Signatures**: Draw vector signatures, type with cursive web fonts, or upload signature images.
- **Canvas Tools**: Alignment guides, snapping, box selection, duplicate on drag, and undo history.
- **Standard AcroForms**: Exports ISO 32000 compliant PDF forms that work in Adobe Acrobat, Apple Preview, and web browsers.
- **Offline Support**: Caches static assets via Service Worker for offline use.

---

## Directory Structure

```
pdf_form_builder_web/
├── index.html                  # Single-page application shell
├── favicon.svg                 # Application favicon
├── site.webmanifest            # PWA web app manifest
├── sw.js                       # Service Worker offline cache manifest
├── server.cjs                  # Local development server
├── package.json                # Project manifest and test runner scripts
├── vercel.json                 # Vercel deployment routes and security headers
├── robots.txt                  # Search engine crawler directives
├── sitemap.xml                 # XML sitemap
├── llms.txt & llms-full.txt    # LLM discovery context documentation
├── README.md                   # Project overview and instructions
├── LICENSE                     # MIT license
│
├── docs/                       # Project Documentation
│   ├── DOCUMENTATION.md        # Technical architecture and API specification
│   └── ROADMAP.md              # Project roadmap and milestone tracker
│
├── js/                         # JavaScript Application Modules (ESM)
│   ├── main.js                 # Application entry point and event wireup
│   │
│   ├── core/                   # State, Storage & Data Management
│   │   ├── state.js            # Reactive application state and formula evaluation
│   │   ├── constants.js        # Default dimensions, schemas, and enums
│   │   ├── storage-manager.js  # Undo/redo stack and project serialization
│   │   └── data-exporter.js    # CSV and JSON form data import/export
│   │
│   ├── engines/                # Document & Processing Engines
│   │   ├── pdf-engine.js       # PDF.js rendering and page navigation
│   │   ├── acroform-builder.js # PDF-Lib AcroForm and flatten compiler
│   │   ├── auto-detector.js    # Geometric and typography field detector
│   │   ├── onnx-detector.js    # In-browser ONNX neural vision detector
│   │   ├── ocr-engine.js       # Scanned document OCR and line segmenter
│   │   └── templates-engine.js # Vector starter template generator
│   │
│   ├── controllers/            # Workflow & Screen Orchestrators
│   │   ├── editor-app.js       # Editor workbench and toolbar manager
│   │   └── landing-controller.js # Landing page UX, dropzone, and templates
│   │
│   ├── ui/                     # UI Components & Canvas Controllers
│   │   ├── canvas-controller.js# Viewport zoom/pan, dragging, and snapping
│   │   ├── overlay-manager.js  # Interactive field widgets and handles
│   │   ├── properties-panel.js # Inspector panel and calculation builder
│   │   ├── layers-panel.js     # Layer hierarchy, grouping, and ordering
│   │   ├── command-palette.js  # Command palette (Cmd+K / Ctrl+K)
│   │   ├── signature-pad.js    # Vector signature canvas and cursive engine
│   │   ├── onboarding-tour.js  # Guided walkthrough tour
│   │   └── gradient-waves.js   # Hero canvas visual animation
│   │
│   └── utils/                  # Utilities
│       ├── toast.js            # Toast notifications
│       ├── tooltip.js          # Accessible floating tooltips
│       └── haptics.js          # Vibration feedback
│
├── styles/                     # Modular CSS Stylesheets
│   ├── base.css                # CSS variables, reset, and layout foundations
│   ├── fonts.css               # Local font definitions
│   ├── landing.css             # Landing page styles and template cards
│   ├── editor.css              # Inspector sidebar and toolbar styles
│   ├── canvas.css              # Canvas viewport, guides, and field overlays
│   └── modals.css              # Dialogs, command palette, and modal sheets
│
├── assets/                     # Media, screenshots, and video assets
├── fonts/                      # Self-hosted Carlito WebFonts (.woff2)
├── vendor/                     # Self-hosted vendor libraries (PDF.js, PDF-Lib, Lucide)
└── tests/                      # Automated Verification & Benchmarks
    ├── test_suite.js           # Automated regression test suite (154 tests)
    ├── benchmark_speed.js      # Latency and throughput benchmark suite
    ├── evaluate_detector_cli.js# Field detection precision/recall benchmark
    ├── generate_test_pdfs.js   # Synthetic test form generator
    └── evaluate.html           # Interactive benchmark evaluation studio
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select Tool |
| `H` or `Space` | Hand Tool (Pan Viewport) |
| `T` | Text Field Tool |
| `A` | Static Text / Label Tool |
| `D` | Dropdown Menu Tool |
| `C` | Checkbox Tool |
| `R` | Radio Button Tool |
| `S` | Digital Signature Tool |
| `Cmd + K` / `Ctrl + K` | Command Palette |
| `Cmd + \` / `Ctrl + \` | Toggle Left Layers Sidebar |
| `Option + Drag` / `Alt + Drag` | Duplicate Selected Field(s) |
| `Cmd + Z` / `Ctrl + Z` | Undo |
| `Cmd + Shift + Z` / `Ctrl + Y` | Redo |
| `Cmd + ;` / `Ctrl + ;` | Toggle Smart Alignment Guides |
| `Del` / `Backspace` | Delete Selected Field(s) |
| `[` / `PageUp` | Previous Page |
| `]` / `PageDown` | Next Page |
| `?` / `Shift + /` | Open Keyboard Shortcuts Modal |

---

## Development

### Start Local Server

```bash
npm start
```

Open `http://localhost:3000` in your browser.

### Run Tests

```bash
# Automated regression test suite
npm test

# Performance benchmarks
npm run bench

# Field detector evaluation
npm run test:detector

# Run FUNSD scanned form benchmark
npm run test:funsd

# Run CommonForms hybrid vector benchmark
npm run test:commonforms
```

---

## 📊 Form Detection Benchmarks & Ongoing Refinements

Formblatt includes continuous automated evaluation against standard public datasets (such as **FUNSD** - *Form Understanding in Noisy Scanned Documents*) to track and improve client-side field recognition accuracy.

### 🧪 Scanned Form Detection Scorecard (FUNSD Test Suite)

Our hybrid client-side detection pipeline (combining 2D vector analysis, pixel binarization, line segmenting, and ONNX neural vision) is continuously evaluated against **50 real-world noisy scanned forms**:

| Metric | Score / Count | Description |
| :--- | :--- | :--- |
| 🎯 **Ground-Truth Fields** | `1,898` | Total annotated form fields in the benchmark dataset |
| ✅ **True Positives (TP)** | `1,098` | Correctly identified form inputs & choice controls |
| ⚠️ **False Positives (FP)** | `2,666` | Candidate contours extracted prior to secondary filtering |
| 🔍 **Recall** | **`57.85%`** | Ratio of ground-truth fields successfully captured |
| 🎯 **Precision** | **`29.17%`** | Ratio of valid field detections among extracted boxes |
| ⚡ **Overall F1-Score** | **`38.78%`** | Current baseline scanned detection score |

> 🛠️ **Active Work in Progress**: We are actively refining Non-Maximum Suppression (NMS) thresholds, text-density filters, and WebGPU quantized neural models to eliminate false positives and push F1 precision higher while maintaining **100% private, client-side execution**.

---

## Deployment

Deploy to Vercel:

```bash
npx vercel --prod
```

---

## 🙏 Acknowledgements & Open-Source Foundations

Formblatt stands on the shoulders of fantastic open-source research, datasets, and engine repositories:

* **[jbarrow/commonforms](https://github.com/jbarrow/commonforms)** (*CommonForms / FFDNet*) – Ground-truth schemas, vector form rules, and detection benchmarks that guided Formblatt's field auto-detector heuristics and evaluation pipeline.
* **[docling-project/docling](https://github.com/docling-project/docling)** (*Docling*) – Document layout analysis concepts and multi-column parsing architectures.
* **[mozilla/pdf.js](https://github.com/mozilla/pdf.js)** (*PDF.js*) – High-performance client-side PDF canvas rendering and text block extraction.
* **[Hopding/pdf-lib](https://github.com/Hopding/pdf-lib)** (*pdf-lib*) – ISO 32000 compliant AcroForm compilation and PDF flattening.
* **[microsoft/onnxruntime-web](https://github.com/microsoft/onnxruntime-web)** (*ONNX Runtime Web*) – Client-side WebGPU & WASM neural vision execution.
* **[lucide-icons/lucide](https://github.com/lucide-icons/lucide)** (*Lucide*) – Clean, accessible open-source iconography.

---

## License

MIT
