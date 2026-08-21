# JustForms — Client-Side Interactive PDF Form Builder & AcroForm Compiler

[![Live Production App](https://img.shields.io/badge/Live%20App-justforms.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://justforms.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-059669?style=for-the-badge)](https://github.com/sshrestha-design/justforms)
[![GitHub Repository](https://img.shields.io/badge/GitHub-sshrestha--design%2Fjustforms-0f172a?style=for-the-badge&logo=github)](https://github.com/sshrestha-design/justforms)

> **Designed by Sagar Shrestha © 2026. 100% Open Source (MIT License).**  
> Live Production URL: **[https://justforms.vercel.app](https://justforms.vercel.app)**  
> GitHub Repository: **[https://github.com/sshrestha-design/justforms](https://github.com/sshrestha-design/justforms)**

---

## 🌟 Overview

**JustForms** is a high-performance, 100% client-side web application for visually designing, editing, and compiling interactive PDF AcroForms. Transform static PDF documents into fully fillable PDF forms with text fields, date pickers, dropdown choice menus, checkboxes, radio groups, and digital signature pads—entirely inside your browser with **zero server storage**.

### ✨ Key Features

- 🔒 **100% Client-Side Privacy**: All processing runs locally in browser memory using PDF.js and PDF-Lib. Your confidential documents never touch any remote server.
- ⚡ **Auto-Detection Engine**: Detects underlying vector lines and form field boxes across 4 detection strategies for 1-click automatic form generation.
- ✍️ **Dual Signature Modes**: Freehand smooth Bezier drawing or real-time cursive handwriting generation.
- 🎯 **Figma-Style Canvas**: Magnetic alignment snapping, marquee lasso selection, `Alt + Drag` field cloning, and 14×14px precision resize handles.
- 📐 **Collapsible Power-User Workspace**: Collapsible sidebars (`Cmd + \` / `Ctrl + \`), 64px edge padding, and transient `Cmd + Z` undo toasts.
- 📄 **Standard ISO 32000 Output**: Exports standard AcroForm PDFs compatible with Adobe Acrobat, Apple Preview, Google Chrome, Edge, and DocuSign.

---

## 📁 Codebase Architecture & Directory Structure

Built with native **ES Modules** and modular CSS:

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
│   ├── auto-detector.js        # 4-engine PDF field auto-detection algorithm
│   ├── signature-pad.js         # Freehand signature canvas & cursive handwriting engine
│   ├── templates-engine.js      # Sample templates (W-9, NDA, Intake, Job) & vector generator
│   ├── landing-controller.js    # Landing page view switcher, interactive dropzone
│   ├── storage-manager.js       # History stack (Undo/Redo), project JSON import/export
│   └── main.js                  # Main application orchestrator & event bus
├── vercel.json                  # Production deployment configuration
├── .vercelignore                # Vercel deployment ignore rules
└── README.md                    # Project documentation
```

---

## 🛠️ Subsystem Breakdown

| Module | Responsibility |
| :--- | :--- |
| **`js/state.js`** | Single source of truth for reactive state: document bytes, current page, active tool, selected fields, zoom, and history stack. |
| **`js/pdf-engine.js`** | Manages PDF.js canvas rendering, page navigation, and debounced 120fps GPU transform zooming. |
| **`js/acroform-builder.js`** | Compiles canvas form elements into standard PDF AcroForm fields and embeds high-resolution PNG signature stamps using `pdf-lib`. |
| **`js/auto-detector.js`** | Runs 4 detection engines (Native AcroForms, Vector Path Analysis, Text Boundary Pairing, & Visual Grid Fallback). |
| **`js/canvas-controller.js`** | Handles mouse & touch interactions: single/multi field dragging, `Option/Alt + Drag` cloning, marquee lasso selection, and magnetic alignment snapping. |
| **`js/overlay-manager.js`** | Generates DOM overlays for placed form elements with live border/fill styles. |
| **`js/layers-panel.js`** | Manages left layer stack, double-click inline renaming, and page badge routing. |
| **`js/properties-panel.js`** | Live data-binding for field names, defaults, autofill tags, required flags, and multi-field horizontal/vertical distribution. |
| **`js/signature-pad.js`** | Signature capture modal supporting smooth freehand bezier drawing and dynamic cursive handwriting generation. |
| **`js/storage-manager.js`** | Handles undo/redo history stacks and complete `.jform` project export/import. |
| **`js/main.js`** | Central application entry point wiring keyboard shortcuts, toolbar actions, and subsystem lifecycles. |

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **`V`** | Select Tool |
| **`H`** or **Hold Spacebar** | Hand Tool (Pan viewport) |
| **`T`** | Text Field Tool |
| **`D`** | Dropdown Tool |
| **`C`** | Checkbox Tool |
| **`R`** | Radio Group Tool |
| **`S`** | Digital Signature Tool |
| **`Cmd / Ctrl + \`** | Toggle Left Workspace Sidebar |
| **`Option / Alt + Drag`** | Instant Field Duplicate (Figma-style) |
| **`Cmd / Ctrl + Z`** | Undo |
| **`Cmd / Ctrl + Shift + Z`** / **`Ctrl + Y`** | Redo |
| **`Backspace`** / **`Delete`** | Delete Selected Field(s) |
| **`[`** / **`PageUp`** | Previous Page |
| **`]`** / **`PageDown`** | Next Page |
| **`?`** or **`Shift + /`** | Open Keyboard Shortcuts Help Modal |

---

## 🚀 Local Development & Deployment

### Local Setup
Run any static web server inside the repository directory:

```bash
# Python 3
python3 -m http.server 3000

# Node.js
npx serve .
```

Open **`http://localhost:3000`** in your browser.

### Deploying to Vercel
```bash
npx vercel --prod
```

---

## 📄 License

Distributed under the **MIT License**. Created by **Sagar Shrestha** © 2026.
