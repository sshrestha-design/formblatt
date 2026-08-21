# JustForms

[![Live App](https://img.shields.io/badge/Live_App-justforms.vercel.app-2563eb?style=flat-square&logo=vercel&logoColor=white)](https://justforms.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-059669?style=flat-square)](https://github.com/sshrestha-design/justforms)
[![GitHub](https://img.shields.io/badge/GitHub-sshrestha--design%2Fjustforms-0f172a?style=flat-square&logo=github&logoColor=white)](https://github.com/sshrestha-design/justforms)

> **Client-Side Interactive PDF Form Builder & ISO 32000 AcroForm Compiler**  
> Designed by Sagar Shrestha © 2026. Released under the MIT License.  
> Production App: **[justforms.vercel.app](https://justforms.vercel.app)** | Repository: **[github.com/sshrestha-design/justforms](https://github.com/sshrestha-design/justforms)**

---

## 📄 Overview

**JustForms** is a high-performance, 100% client-side web application for designing, editing, and compiling interactive PDF AcroForms. Transform static PDF documents into fillable forms with text fields, date pickers, choice dropdowns, checkboxes, radio groups, and digital signature pads—processed entirely inside your browser with **zero server storage**.

### Key Capabilities

- **Client-Side Privacy**: All processing runs locally in browser memory using PDF.js and PDF-Lib. Documents and form data never touch external servers.
- **Auto-Detection Engine**: Analyzes underlying vector paths and text boundaries across 4 detection strategies for 1-click automatic form generation.
- **Dual Signature Modes**: Supports freehand smooth Bezier drawing and real-time cursive handwriting generation.
- **Canvas Authoring**: Features magnetic alignment snapping, marquee lasso selection, `Alt + Drag` field cloning, and 14×14px precision resize handles.
- **Workspace Customization**: Includes collapsible sidebars (`Cmd + \` / `Ctrl + \`), 64px edge padding, and transient deletion undo toasts.
- **ISO 32000 Compliance**: Exports standard AcroForm PDFs compatible with Adobe Acrobat, Apple Preview, Chrome, Edge, and DocuSign.

---

## 🛠️ Architecture

Built with native **ES Modules** and modular CSS:

```
pdf_form_builder_web/
├── index.html                   # Semantic HTML shell and UI layout
├── styles/                      # Domain-specific stylesheets
│   ├── base.css                 # CSS variables, design tokens, and resets
│   ├── landing.css              # Landing page hero, dropzone, and templates
│   ├── editor.css               # Workspace layout and panel styles
│   ├── canvas.css               # Viewport, field overlays, and guides
│   ├── modals.css               # Live PDF preview and signature pad
│   └── main.css                 # Master stylesheet import
├── js/                          # Native ES Module architecture
│   ├── constants.js             # Default field sizes and schemas
│   ├── state.js                 # Central application state management
│   ├── pdf-engine.js            # PDF.js rendering and page scaling
│   ├── acroform-builder.js      # pdf-lib AcroForm compilation engine
│   ├── canvas-controller.js     # Drag, resize, snapping, and pan/zoom
│   ├── overlay-manager.js       # Field overlay rendering and handles
│   ├── layers-panel.js          # Layer stack management and renaming
│   ├── properties-panel.js      # Field property inspector and alignment
│   ├── auto-detector.js         # PDF field auto-detection algorithm
│   ├── signature-pad.js         # Freehand drawing and cursive engine
│   ├── templates-engine.js      # Vector document generator presets
│   ├── landing-controller.js    # View router and dropzone controller
│   ├── storage-manager.js       # History stack (Undo/Redo) and project I/O
│   └── main.js                  # Application orchestrator and key bindings
├── vercel.json                  # Production deployment configuration
├── .vercelignore                # Vercel ignore rules
└── README.md                    # Project documentation
```

---

## 🧩 Subsystem Reference

| Subsystem | Primary Responsibility |
| :--- | :--- |
| **`js/state.js`** | Single source of truth for reactive state (document bytes, page index, tools, selected fields, zoom). |
| **`js/pdf-engine.js`** | Manages PDF.js canvas rendering, page navigation, and GPU transform scaling. |
| **`js/acroform-builder.js`** | Compiles canvas form elements into standard PDF AcroForm fields using `pdf-lib`. |
| **`js/auto-detector.js`** | Runs 4 detection engines (Native AcroForms, Vector Analysis, Text Pairing, Grid Fallback). |
| **`js/canvas-controller.js`** | Handles canvas interactions (dragging, cloning, lasso marquee, magnetic snapping). |
| **`js/overlay-manager.js`** | Renders DOM overlays for placed form elements with live styling. |
| **`js/layers-panel.js`** | Manages the left layer list and inline field renaming. |
| **`js/properties-panel.js`** | Manages field properties, autofill tags, required flags, and distribution tools. |
| **`js/signature-pad.js`** | Controls signature capture with freehand drawing and cursive font generation. |
| **`js/storage-manager.js`** | Manages undo/redo history stacks and `.jform` project file export/import. |
| **`js/main.js`** | Central entry point wiring global events, shortcuts, and application initialization. |

---

## ⌨️ Shortcuts Reference

| Hotkey | Command |
| :---: | :--- |
| `<kbd>V</kbd>` | Select Tool |
| `<kbd>H</kbd>` or `<kbd>Space</kbd>` | Hand Tool (Pan Viewport) |
| `<kbd>T</kbd>` | Text Field Tool |
| `<kbd>D</kbd>` | Dropdown Tool |
| `<kbd>C</kbd>` | Checkbox Tool |
| `<kbd>R</kbd>` | Radio Group Tool |
| `<kbd>S</kbd>` | Digital Signature Tool |
| `<kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>\</kbd>` | Toggle Left Workspace Sidebar |
| `<kbd>Option</kbd> / <kbd>Alt</kbd> + Drag` | Duplicate Selected Field |
| `<kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Z</kbd>` | Undo Action |
| `<kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>` | Redo Action |
| `<kbd>Del</kbd>` / `<kbd>Backspace</kbd>` | Delete Selected Field(s) |
| `<kbd>[</kbd>` / `<kbd>PageUp</kbd>` | Previous Document Page |
| `<kbd>]</kbd>` / `<kbd>PageDown</kbd>` | Next Document Page |
| `<kbd>?</kbd>` or `<kbd>Shift</kbd> + <kbd>/</kbd>` | Open Shortcuts Help Modal |

---

## 🚀 Setup & Deployment

### Local Development
Run any static HTTP server inside the repository directory:

```bash
# Python 3
python3 -m http.server 3000

# Node.js
npx serve .
```

Open `http://localhost:3000` in your web browser.

### Production Deployment
Deploy to Vercel production:

```bash
npx vercel --prod
```

---

## 📄 License

Distributed under the **MIT License**. Designed & Developed by **Sagar Shrestha** © 2026.
