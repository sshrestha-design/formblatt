# JustForms — Client-Side Interactive PDF Form Builder

> **Designed by Sagar Shrestha © 2026. All rights reserved.**  
> Live Production URL: **[https://justforms.vercel.app](https://justforms.vercel.app)**  
> GitHub Repository: **[https://github.com/sshrestha-design/justforms](https://github.com/sshrestha-design/justforms)**

---

## 🌟 Overview

**JustForms** is a high-performance, client-side visual PDF form builder and AcroForm compiler. It allows users to transform static PDF documents into interactive, fillable PDF forms with text fields, date pickers, dropdowns, checkboxes, radio groups, and freehand/typed digital signatures directly inside the browser.

---

## 📁 Codebase Architecture & Directory Structure

The project is architected with clear separation of concerns using native **ES Modules** and modular stylesheets:

```
pdf_form_builder_web/
├── index.html                   # Semantic HTML shell & UI entry point
├── styles/                      # Modular domain-specific stylesheets
│   ├── base.css                 # CSS variables, typography, reset, design tokens
│   ├── landing.css              # Landing page hero, dropzone, template gallery, bento grid
│   ├── editor.css               # Workspace layout, toolbar, left layers, right properties
│   ├── canvas.css               # Canvas viewport, field overlays, snapping guides, handles
│   ├── modals.css               # Live PDF preview iframe modal, digital signature pad
│   └── main.css                 # Master stylesheet importing all modular CSS files
├── js/                          # Native ES Module architecture
│   ├── constants.js             # Default field sizes, type schemas, snap thresholds
│   ├── state.js                 # Central reactive application state (fields, active tool, zoom)
│   ├── pdf-engine.js            # PDF.js rasterizer, page navigation & high-DPI scaling
│   ├── acroform-builder.js      # pdf-lib AcroForm compiler & PDF download handler
│   ├── canvas-controller.js     # Drag, resize, marquee lasso, magnetic snapping, pan & zoom
│   ├── overlay-manager.js       # Field overlays rendering, badges, resize handles
│   ├── layers-panel.js          # Layers panel list, selection sync, inline renaming
│   ├── properties-panel.js      # Right-side property inspector & multi-field alignment
│   ├── signature-pad.js         # Freehand signature canvas & cursive handwriting engine
│   ├── templates-engine.js      # Sample templates (W-9, NDA, Intake, Job) & vector generator
│   ├── landing-controller.js    # Landing page view switcher, interactive dropzone
│   ├── storage-manager.js       # History stack (Undo/Redo), project JSON import/export
│   └── main.js                  # Main application orchestrator & event bus
├── vercel.json                  # Production deployment configuration
├── .vercelignore                # Vercel deployment ignore rules
└── README.md                    # System architecture documentation
```

---

## 🛠️ Module Descriptions

| Module | Responsibility |
| :--- | :--- |
| **`js/state.js`** | Single source of truth for reactive state: document bytes, current page, active tool, selected fields, zoom, and history stack. |
| **`js/pdf-engine.js`** | Manages PDF.js canvas rendering, page navigation, and debounced 120fps GPU transform zooming. |
| **`js/acroform-builder.js`** | Compiles canvas form elements into standard PDF AcroForm fields and embeds high-resolution PNG signature stamps using `pdf-lib`. |
| **`js/canvas-controller.js`** | Handles mouse and touch events: single/multi field dragging, Figma-style **Option/Alt + Drag** cloning, marquee lasso selection, and magnetic alignment snapping. |
| **`js/overlay-manager.js`** | Generates DOM overlays for placed form elements with live border/fill styles. |
| **`js/layers-panel.js`** | Manages the left layer stack, double-click inline renaming, and page badge routing. |
| **`js/properties-panel.js`** | Live data-binding for field names, defaults, autofill tags, required flags, and multi-field horizontal/vertical distribution. |
| **`js/signature-pad.js`** | Signature capture modal supporting smooth freehand bezier drawing and dynamic cursive handwriting generation. |
| **`js/templates-engine.js`** | Generates official vector PDF documents for W-9, NDA, Client Intake, and Job Application presets. |
| **`js/storage-manager.js`** | Handles undo/redo history stacks and complete `.json` project export/import. |
| **`js/main.js`** | Central application entry point wiring keyboard shortcuts, toolbar actions, and subsystem lifecycles. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`V`** | Select Tool |
| **`H`** or **Hold Spacebar** | Hand Tool (Pan viewport) |
| **`T`** | Text Field Tool |
| **`A`** | Date Picker Tool |
| **`D`** | Dropdown Tool |
| **`C`** | Checkbox Tool |
| **`R`** | Radio Group Tool |
| **`S`** | Digital Signature Tool |
| **`Option / Alt + Drag`** | Instant Field Duplicate (Figma-style) |
| **`Cmd / Ctrl + Z`** | Undo |
| **`Cmd / Ctrl + Shift + Z`** / **`Ctrl + Y`** | Redo |
| **`Backspace`** / **`Delete`** | Delete Selected Field(s) |
| **`[`** / **`PageUp`** | Previous Page |
| **`]`** / **`PageDown`** | Next Page |

---

## 🚀 Running Locally & Deploying

### Local Development
Run any standard static HTTP server in the project directory:
```bash
# Python
python3 -m http.server 3000

# Node / npx
npx serve .
```
Visit **`http://localhost:3000`** in any modern web browser.

### Deploying to Vercel
```bash
npx vercel --prod
```
