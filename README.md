# JustForms

> **Client-Side Interactive PDF Form Builder & ISO 32000 AcroForm Compiler**  
> Designed by Sagar Shrestha © 2026. Released under the MIT License.  
> Live App: [justforms.vercel.app](https://justforms.vercel.app) | Repository: [github.com/sshrestha-design/justforms](https://github.com/sshrestha-design/justforms)

---

## Overview

**JustForms** is a high-performance, client-side web application for designing, editing, and compiling interactive PDF AcroForms. Transform static PDF documents into fillable PDF forms with text fields, date pickers, dropdown menus, checkboxes, radio groups, and digital signature pads—processed entirely inside the browser with no server storage.

### Key Capabilities

- **Client-Side Privacy**: Processing runs locally in browser memory using PDF.js and PDF-Lib. Documents and form data are never uploaded to external servers.
- **Auto-Detection Engine**: Analyzes underlying vector lines and text boundaries across 4 detection strategies for automatic form field generation.
- **Dual Signature Modes**: Supports freehand Bezier drawing and real-time cursive handwriting generation.
- **Canvas Authoring**: Features magnetic alignment snapping, marquee lasso selection, `Alt + Drag` field cloning, and precision resize handles.
- **Workspace Customization**: Includes collapsible sidebars (`Cmd + \` / `Ctrl + \`), margin padding, and transient deletion undo actions.
- **Standard ISO 32000 Output**: Exports AcroForm PDFs compatible with Adobe Acrobat, Apple Preview, Google Chrome, Edge, and DocuSign.

---

## Codebase Architecture

The project is structured using native ES Modules and modular CSS:

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

## Subsystem Reference

| Module | Responsibility |
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

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`V`** | Select Tool |
| **`H`** or **Spacebar** | Hand Tool (Pan Viewport) |
| **`T`** | Text Field Tool |
| **`D`** | Dropdown Tool |
| **`C`** | Checkbox Tool |
| **`R`** | Radio Group Tool |
| **`S`** | Digital Signature Tool |
| **`Cmd / Ctrl + \`** | Toggle Workspace Sidebar |
| **`Option / Alt + Drag`** | Duplicate Field |
| **`Cmd / Ctrl + Z`** | Undo |
| **`Cmd / Ctrl + Shift + Z`** / **`Ctrl + Y`** | Redo |
| **`Backspace`** / **`Delete`** | Delete Selected Field(s) |
| **`[`** / **`PageUp`** | Previous Page |
| **`]`** / **`PageDown`** | Next Page |
| **`?`** or **`Shift + /`** | Open Shortcuts Modal |

---

## Development & Deployment

### Local Setup
Run any static HTTP server in the repository directory:

```bash
# Python 3
python3 -m http.server 3000

# Node.js
npx serve .
```

Open `http://localhost:3000` in your web browser.

### Deployment
Deploy to Vercel production:

```bash
npx vercel --prod
```

---

## License

Distributed under the MIT License. Created by Sagar Shrestha © 2026.
