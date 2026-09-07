// ── Formblatt Command Palette Controller (js/command-palette.js) ─────────────
// Fast keyboard-first search and action runner (⌘K / Ctrl+K / ⌘⇧P)
// Active strictly inside the Editor Workbench (not on landing page).

import { state } from "./state.js";
import { triggerHaptic } from "./haptics.js";
import { showToast } from "./toast.js";

/**
 * Check if the Editor Screen is currently active and visible
 */
export function isEditorActive() {
    if (typeof document === "undefined") return false;
    const editor = document.getElementById("appEditorScreen");
    const landing = document.getElementById("landingScreen");
    if (!editor) return false;

    const isLandingHidden = Boolean(landing && (landing.style.display === "none" || landing.hidden));
    const isEditorVisible = Boolean(
        editor.style.display === "flex" || 
        editor.style.display === "block" || 
        document.body.classList.contains("editor-active")
    );

    return isEditorVisible || isLandingHidden;
}

/**
 * Global Command Palette catalog
 */
export const COMMANDS = [
    // ── Tools & Creation ─────────────────────────────────────────────
    {
        id: "tool-select",
        title: "Select & Move Tool",
        category: "Tools & Placement",
        keywords: ["select", "pointer", "cursor", "move", "arrow", "drag"],
        icon: "mouse-pointer",
        kbd: "V",
        action: () => {
            document.querySelector('.tool-btn[data-tool="select"]')?.click();
            showToast("Switched to Select Tool");
        }
    },
    {
        id: "tool-hand",
        title: "Hand / Pan Canvas Tool",
        category: "Tools & Placement",
        keywords: ["hand", "pan", "grab", "scroll", "canvas", "space"],
        icon: "hand",
        kbd: "H",
        action: () => {
            document.querySelector('.tool-btn[data-tool="hand"]')?.click();
            showToast("Switched to Hand Pan Tool");
        }
    },
    {
        id: "tool-text",
        title: "Add Text Field",
        category: "Tools & Placement",
        keywords: ["text", "input", "string", "type", "field", "name", "email", "address"],
        icon: "type",
        kbd: "T",
        action: () => {
            document.querySelector('.tool-btn[data-tool="textField"]')?.click();
            showToast("Text Field placement active");
        }
    },
    {
        id: "tool-dropdown",
        title: "Add Dropdown Menu",
        category: "Tools & Placement",
        keywords: ["dropdown", "select", "choice", "combobox", "options", "menu", "list"],
        icon: "chevron-down-square",
        kbd: "D",
        action: () => {
            document.querySelector('.tool-btn[data-tool="dropdown"]')?.click();
            showToast("Dropdown placement active");
        }
    },
    {
        id: "tool-checkbox",
        title: "Add Checkbox",
        category: "Tools & Placement",
        keywords: ["checkbox", "check", "tick", "boolean", "agree", "terms", "box"],
        icon: "check-square",
        kbd: "C",
        action: () => {
            document.querySelector('.tool-btn[data-tool="checkBox"]')?.click();
            showToast("Checkbox placement active");
        }
    },
    {
        id: "tool-radio",
        title: "Add Radio Button Group",
        category: "Tools & Placement",
        keywords: ["radio", "group", "option", "choice", "single", "circle"],
        icon: "disc",
        kbd: "R",
        action: () => {
            document.querySelector('.tool-btn[data-tool="radioGroup"]')?.click();
            showToast("Radio Group placement active");
        }
    },
    {
        id: "tool-signature",
        title: "Add Digital Signature Field",
        category: "Tools & Placement",
        keywords: ["signature", "sign", "digital", "autograph", "pen", "draw", "cursive"],
        icon: "pen-tool",
        kbd: "S",
        action: () => {
            document.querySelector('.tool-btn[data-tool="signature"]')?.click();
            showToast("Signature placement active");
        }
    },

    // ── Form Intelligence & Automation ───────────────────────────────
    {
        id: "ai-autodetect",
        title: "Run Smart Field Auto-Detector",
        category: "Form Intelligence",
        keywords: ["auto", "detect", "ai", "scan", "magic", "smart", "analyze", "heuristic", "recognize"],
        icon: "sparkles",
        action: () => {
            document.getElementById("autoDetectBtn")?.click();
        }
    },
    {
        id: "ai-guides",
        title: "Toggle Smart Alignment Guides",
        category: "Form Intelligence",
        keywords: ["guides", "snap", "smart", "alignment", "grid", "ruler", "snapping"],
        icon: "grid",
        kbd: "⌘;",
        action: () => {
            document.getElementById("toggleGuidesBtn")?.click();
        }
    },

    // ── Mode & View ──────────────────────────────────────────────────
    {
        id: "mode-design",
        title: "Switch to Design Mode",
        category: "View & Modes",
        keywords: ["design", "edit", "build", "place", "mode", "editor"],
        icon: "edit-3",
        action: () => {
            document.getElementById("modeDesignBtn")?.click();
        }
    },
    {
        id: "mode-fill",
        title: "Switch to Fill & Test Mode",
        category: "View & Modes",
        keywords: ["fill", "test", "preview", "interactive", "form", "try", "play"],
        icon: "play",
        kbd: "⌘P",
        action: () => {
            document.getElementById("modeFillBtn")?.click();
        }
    },
    {
        id: "view-zoom-in",
        title: "Zoom In",
        category: "View & Modes",
        keywords: ["zoom", "in", "magnify", "enlarge", "bigger", "scale"],
        icon: "zoom-in",
        kbd: "⌘+",
        action: () => {
            document.getElementById("zoomInBtn")?.click();
        }
    },
    {
        id: "view-zoom-out",
        title: "Zoom Out",
        category: "View & Modes",
        keywords: ["zoom", "out", "shrink", "smaller", "scale"],
        icon: "zoom-out",
        kbd: "⌘-",
        action: () => {
            document.getElementById("zoomOutBtn")?.click();
        }
    },
    {
        id: "view-zoom-100",
        title: "Zoom to 100% (Actual Size)",
        category: "View & Modes",
        keywords: ["zoom", "100", "actual", "reset", "normal", "scale", "100%"],
        icon: "maximize-2",
        action: () => {
            document.querySelector('.zoom-preset-item[data-zoom="1.0"]')?.click();
        }
    },
    {
        id: "view-zoom-fit-width",
        title: "Zoom to Fit Width",
        category: "View & Modes",
        keywords: ["fit", "width", "zoom", "expand", "horizontal"],
        icon: "stretch-horizontal",
        action: () => {
            document.getElementById("zoomFitWidthBtn")?.click();
        }
    },
    {
        id: "view-zoom-fit-page",
        title: "Zoom to Fit Page",
        category: "View & Modes",
        keywords: ["fit", "page", "entire", "zoom", "full", "screen"],
        icon: "minimize-2",
        action: () => {
            document.getElementById("zoomFitPageBtn")?.click();
        }
    },
    {
        id: "view-toggle-layers",
        title: "Toggle Layers Sidebar",
        category: "View & Modes",
        keywords: ["layers", "sidebar", "panel", "left", "hide", "show", "toggle"],
        icon: "panel-left-close",
        kbd: "⌘\\",
        action: () => {
            document.getElementById("toggleSidebarBtn")?.click();
        }
    },
    {
        id: "view-toggle-inspector",
        title: "Toggle Inspector Sidebar",
        category: "View & Modes",
        keywords: ["inspector", "properties", "sidebar", "right", "hide", "show", "toggle"],
        icon: "panel-right-close",
        kbd: "⌘]",
        action: () => {
            document.getElementById("toggleRightSidebarBtn")?.click();
        }
    },

    // ── Edit & Clipboard ─────────────────────────────────────────────
    {
        id: "edit-undo",
        title: "Undo",
        category: "Edit & Clipboard",
        keywords: ["undo", "revert", "history", "back"],
        icon: "undo-2",
        kbd: "⌘Z",
        action: () => {
            document.getElementById("menuUndoBtn")?.click() || document.getElementById("quickUndoBtn")?.click();
        }
    },
    {
        id: "edit-redo",
        title: "Redo",
        category: "Edit & Clipboard",
        keywords: ["redo", "repeat", "forward", "history"],
        icon: "redo-2",
        kbd: "⌘⇧Z",
        action: () => {
            document.getElementById("menuRedoBtn")?.click() || document.getElementById("quickRedoBtn")?.click();
        }
    },
    {
        id: "edit-cut",
        title: "Cut Selected Fields",
        category: "Edit & Clipboard",
        keywords: ["cut", "clipboard", "move", "remove"],
        icon: "scissors",
        kbd: "⌘X",
        action: () => {
            document.getElementById("menuCutBtn")?.click();
        }
    },
    {
        id: "edit-copy",
        title: "Copy Selected Fields",
        category: "Edit & Clipboard",
        keywords: ["copy", "clipboard", "duplicate"],
        icon: "copy",
        kbd: "⌘C",
        action: () => {
            document.getElementById("menuCopyBtn")?.click();
        }
    },
    {
        id: "edit-paste",
        title: "Paste Field(s)",
        category: "Edit & Clipboard",
        keywords: ["paste", "clipboard", "insert"],
        icon: "clipboard",
        kbd: "⌘V",
        action: () => {
            document.getElementById("menuPasteBtn")?.click();
        }
    },
    {
        id: "edit-duplicate",
        title: "Duplicate Selected Fields",
        category: "Edit & Clipboard",
        keywords: ["duplicate", "clone", "copy", "repeat"],
        icon: "copy-plus",
        kbd: "⌘D",
        action: () => {
            document.getElementById("menuDuplicateBtn")?.click();
        }
    },
    {
        id: "edit-select-all",
        title: "Select All Fields",
        category: "Edit & Clipboard",
        keywords: ["select", "all", "every", "fields"],
        icon: "check-square",
        kbd: "⌘A",
        action: () => {
            document.getElementById("menuSelectAllBtn")?.click();
        }
    },
    {
        id: "edit-deselect-all",
        title: "Deselect All Fields",
        category: "Edit & Clipboard",
        keywords: ["deselect", "clear", "unselect", "none"],
        icon: "square-dashed",
        kbd: "Esc",
        action: () => {
            document.getElementById("menuDeselectAllBtn")?.click();
        }
    },
    {
        id: "edit-delete",
        title: "Delete Selected Fields",
        category: "Edit & Clipboard",
        keywords: ["delete", "remove", "trash", "erase", "clear"],
        icon: "trash-2",
        kbd: "Del",
        action: () => {
            document.getElementById("menuDeleteBtn")?.click() || document.getElementById("quickDeleteBtn")?.click();
        }
    },
    {
        id: "edit-group",
        title: "Group / Ungroup Selected Fields",
        category: "Edit & Clipboard",
        keywords: ["group", "ungroup", "folder", "bundle", "cluster"],
        icon: "folder-plus",
        kbd: "⌘G",
        action: () => {
            document.getElementById("groupSelectedBtn")?.click();
        }
    },

    // ── Alignment & Spacing ──────────────────────────────────────────
    {
        id: "align-left",
        title: "Align Left Edges",
        category: "Alignment & Spacing",
        keywords: ["align", "left", "edges", "arrange", "position"],
        icon: "align-left",
        action: () => {
            document.getElementById("alignLeftBtn")?.click();
        }
    },
    {
        id: "align-center",
        title: "Align Centers Horizontally",
        category: "Alignment & Spacing",
        keywords: ["align", "center", "horizontal", "middle"],
        icon: "align-center",
        action: () => {
            document.getElementById("alignCenterBtn")?.click();
        }
    },
    {
        id: "align-right",
        title: "Align Right Edges",
        category: "Alignment & Spacing",
        keywords: ["align", "right", "edges", "arrange"],
        icon: "align-right",
        action: () => {
            document.getElementById("alignRightBtn")?.click();
        }
    },
    {
        id: "align-top",
        title: "Align Top Edges",
        category: "Alignment & Spacing",
        keywords: ["align", "top", "edges", "vertical", "up"],
        icon: "arrow-up-to-line",
        action: () => {
            document.getElementById("alignTopBtn")?.click();
        }
    },
    {
        id: "align-middle",
        title: "Align Centers Vertically",
        category: "Alignment & Spacing",
        keywords: ["align", "middle", "vertical", "center"],
        icon: "fold-vertical",
        action: () => {
            document.getElementById("alignMiddleBtn")?.click();
        }
    },
    {
        id: "align-bottom",
        title: "Align Bottom Edges",
        category: "Alignment & Spacing",
        keywords: ["align", "bottom", "edges", "down"],
        icon: "arrow-down-to-line",
        action: () => {
            document.getElementById("alignBottomBtn")?.click();
        }
    },
    {
        id: "distribute-h",
        title: "Distribute Horizontal Spacing Evenly",
        category: "Alignment & Spacing",
        keywords: ["distribute", "horizontal", "spacing", "even", "gap", "equal"],
        icon: "align-horizontal-space-between",
        action: () => {
            document.getElementById("distributeHorizontalBtn")?.click();
        }
    },
    {
        id: "distribute-v",
        title: "Distribute Vertical Spacing Evenly",
        category: "Alignment & Spacing",
        keywords: ["distribute", "vertical", "spacing", "even", "gap", "equal"],
        icon: "align-vertical-space-between",
        action: () => {
            document.getElementById("distributeVerticalBtn")?.click();
        }
    },

    // ── Project & Export ─────────────────────────────────────────────
    {
        id: "project-export",
        title: "Export Standard AcroForm PDF",
        category: "Project & Export",
        keywords: ["export", "pdf", "download", "save", "acroform", "generate", "build"],
        icon: "download",
        kbd: "⌘E",
        action: () => {
            document.getElementById("generatePdfBtn")?.click();
        }
    },
    {
        id: "project-save",
        title: "Save Project (.formblatt)",
        category: "Project & Export",
        keywords: ["save", "project", "export", "json", "backup", "formblatt"],
        icon: "save",
        action: () => {
            document.getElementById("saveProjectMenuBtn")?.click();
        }
    },
    {
        id: "project-load",
        title: "Load Project (.formblatt)",
        category: "Project & Export",
        keywords: ["load", "open", "import", "project", "formblatt", "restore"],
        icon: "folder-open",
        action: () => {
            document.getElementById("loadProjectDropdownBtn")?.click();
        }
    },
    {
        id: "project-open-pdf",
        title: "Open PDF Document",
        category: "Project & Export",
        keywords: ["open", "pdf", "upload", "file", "document", "import"],
        icon: "file-up",
        action: () => {
            document.getElementById("openPdfDropdownBtn")?.click();
        }
    },
    {
        id: "project-new-blank",
        title: "New Blank Document",
        category: "Project & Export",
        keywords: ["new", "blank", "document", "create", "fresh", "start"],
        icon: "file-plus",
        action: () => {
            document.getElementById("newBlankDocMenuBtn")?.click();
        }
    },
    {
        id: "project-home",
        title: "Go to Home Dashboard",
        category: "Project & Export",
        keywords: ["home", "dashboard", "landing", "exit", "back"],
        icon: "home",
        action: () => {
            document.getElementById("menuHomeBtn")?.click();
        }
    },

    // ── Help & Community ─────────────────────────────────────────────
    {
        id: "help-shortcuts",
        title: "Keyboard Shortcuts & Help",
        category: "Help & Community",
        keywords: ["shortcuts", "keyboard", "hotkeys", "help", "keys", "cheatsheet"],
        icon: "keyboard",
        kbd: "?",
        action: () => {
            if (typeof window.openShortcutsModal === "function") {
                window.openShortcutsModal();
            } else {
                const modal = document.getElementById("shortcutsModal");
                if (modal) {
                    modal.style.display = "flex";
                    modal.classList.add("active");
                    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
                }
            }
        }
    },
    {
        id: "help-feedback",
        title: "Send Feedback & Review",
        category: "Help & Community",
        keywords: ["feedback", "review", "bug", "report", "suggestion", "contact"],
        icon: "message-square-plus",
        action: () => {
            const modal = document.getElementById("feedbackModal");
            if (modal) {
                modal.style.display = "flex";
                if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
            }
        }
    },
    {
        id: "help-about",
        title: "About Formblatt",
        category: "Help & Community",
        keywords: ["about", "info", "formblatt", "author", "license", "open source"],
        icon: "info",
        action: () => {
            const modal = document.getElementById("aboutModal");
            if (modal) {
                modal.style.display = "flex";
                if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
            }
        }
    }
];

// ── State variables ──────────────────────────────────────────────────
let filteredList = [...COMMANDS];
let selectedIndex = 0;
let isPaletteOpen = false;
let isInitialized = false;

/**
 * Filter available commands based on query
 */
export function filterCommands(query = "") {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
        return [...COMMANDS];
    }

    const tokens = q.split(/\s+/);
    return COMMANDS.filter(cmd => {
        const titleMatch = cmd.title.toLowerCase();
        const catMatch = cmd.category.toLowerCase();
        const kbdMatch = (cmd.kbd || "").toLowerCase();
        const kwMatch = (cmd.keywords || []).join(" ").toLowerCase();

        return tokens.every(token => 
            titleMatch.includes(token) || 
            catMatch.includes(token) || 
            kbdMatch.includes(token) ||
            kwMatch.includes(token)
        );
    });
}

/**
 * Render grouped commands list into DOM
 */
export function renderCommandPaletteList(query = "") {
    const listEl = document.getElementById("commandPaletteList");
    if (!listEl) return;

    filteredList = filterCommands(query);
    if (selectedIndex >= filteredList.length) {
        selectedIndex = Math.max(0, filteredList.length - 1);
    }

    if (filteredList.length === 0) {
        listEl.innerHTML = `
            <div class="command-palette-empty">
                <i data-lucide="search-x" style="width: 28px; height: 28px; color: #94a3b8; margin-bottom: 8px;"></i>
                <div style="font-weight: 600; color: #334155; font-size: 13.5px;">No commands found</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">No matching action for "${escapeHtml(query)}"</div>
            </div>
        `;
        if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
        return;
    }

    // Group items by category
    const grouped = new Map();
    filteredList.forEach((cmd, flatIndex) => {
        if (!grouped.has(cmd.category)) {
            grouped.set(cmd.category, []);
        }
        grouped.get(cmd.category).push({ cmd, flatIndex });
    });

    let html = "";
    grouped.forEach((items, category) => {
        html += `<div class="command-group-heading">${escapeHtml(category)}</div>`;
        items.forEach(({ cmd, flatIndex }) => {
            const isSelected = flatIndex === selectedIndex;
            html += `
                <div class="command-palette-item ${isSelected ? 'active' : ''}" 
                     data-index="${flatIndex}" 
                     data-id="${cmd.id}" 
                     role="option" 
                     aria-selected="${isSelected}">
                    <div class="command-item-icon">
                        <i data-lucide="${cmd.icon}" style="width: 14px; height: 14px;"></i>
                    </div>
                    <div class="command-item-content">
                        <div class="command-item-title">${escapeHtml(cmd.title)}</div>
                    </div>
                    ${cmd.kbd ? `<div class="command-item-kbd"><kbd>${escapeHtml(cmd.kbd)}</kbd></div>` : ''}
                </div>
            `;
        });
    });

    listEl.innerHTML = html;
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();

    // Scroll active item into view smoothly
    const activeEl = listEl.querySelector(`.command-palette-item[data-index="${selectedIndex}"]`);
    if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
    }
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Execute command by ID
 */
export function executeCommand(commandId) {
    const cmd = COMMANDS.find(c => c.id === commandId);
    if (!cmd) return;

    closeCommandPalette();
    triggerHaptic(12);

    try {
        if (typeof cmd.action === "function") {
            cmd.action();
        }
    } catch (err) {
        console.error(`[CommandPalette] Error executing ${commandId}:`, err);
        showToast("Error executing action: " + err.message, "error");
    }
}

/**
 * Open Command Palette Modal (strictly within the Editor workbench)
 */
export function openCommandPalette() {
    if (!isEditorActive()) {
        return;
    }

    const modal = document.getElementById("commandPaletteModal");
    const input = document.getElementById("commandPaletteInput");
    if (!modal) return;

    isPaletteOpen = true;
    selectedIndex = 0;
    if (input) input.value = "";

    modal.style.display = "flex";
    modal.classList.add("active");
    renderCommandPaletteList("");

    setTimeout(() => {
        input?.focus();
        input?.select();
    }, 30);

    triggerHaptic(8);
}

/**
 * Close Command Palette Modal
 */
export function closeCommandPalette() {
    const modal = document.getElementById("commandPaletteModal");
    if (!modal) return;

    isPaletteOpen = false;
    modal.style.display = "none";
    modal.classList.remove("active");
}

/**
 * Toggle Command Palette Modal
 */
export function toggleCommandPalette() {
    if (isPaletteOpen) {
        closeCommandPalette();
    } else {
        openCommandPalette();
    }
}

/**
 * Initialize Command Palette Controller & Event Bindings
 */
export function initCommandPalette() {
    if (isInitialized) return;
    const modal = document.getElementById("commandPaletteModal");
    const input = document.getElementById("commandPaletteInput");
    const listEl = document.getElementById("commandPaletteList");

    if (!modal) return;
    isInitialized = true;

    // 1. Global Keyboard Shortcut: ⌘K, Ctrl+K, or ⌘⇧P / Ctrl⇧P (only in editor)
    const handleGlobalKeydown = e => {
        const isK = (e.key && (e.key.toLowerCase() === "k" || e.code === "KeyK" || e.keyCode === 75));
        const isP = (e.key && (e.key.toLowerCase() === "p" || e.code === "KeyP" || e.keyCode === 80)) && e.shiftKey;
        const isCmdK = (e.metaKey || e.ctrlKey) && (isK || isP);

        if (isCmdK) {
            if (!isEditorActive()) {
                return; // Guard: Do not open on landing page
            }
            e.preventDefault();
            e.stopPropagation();
            toggleCommandPalette();
            return;
        }

        if (isPaletteOpen) {
            if (e.key === "Escape" || e.code === "Escape" || e.keyCode === 27) {
                e.preventDefault();
                e.stopPropagation();
                closeCommandPalette();
                return;
            } else if (e.key === "ArrowDown" || e.code === "ArrowDown" || e.keyCode === 40) {
                e.preventDefault();
                if (filteredList.length > 0) {
                    selectedIndex = (selectedIndex + 1) % filteredList.length;
                    renderCommandPaletteList(input?.value || "");
                }
            } else if (e.key === "ArrowUp" || e.code === "ArrowUp" || e.keyCode === 38) {
                e.preventDefault();
                if (filteredList.length > 0) {
                    selectedIndex = (selectedIndex - 1 + filteredList.length) % filteredList.length;
                    renderCommandPaletteList(input?.value || "");
                }
            } else if (e.key === "Enter" || e.code === "Enter" || e.keyCode === 13) {
                e.preventDefault();
                if (filteredList.length > 0 && filteredList[selectedIndex]) {
                    executeCommand(filteredList[selectedIndex].id);
                }
            }
        }
    };

    window.addEventListener("keydown", handleGlobalKeydown, { capture: true });
    document.addEventListener("keydown", handleGlobalKeydown, { capture: true });

    // 2. Input search filtering
    input?.addEventListener("input", e => {
        selectedIndex = 0;
        renderCommandPaletteList(e.target.value);
    });

    // 3. Click on item
    listEl?.addEventListener("click", e => {
        const item = e.target.closest(".command-palette-item");
        if (item && item.dataset.id) {
            executeCommand(item.dataset.id);
        }
    });

    // 4. Hover updates selected index
    listEl?.addEventListener("mousemove", e => {
        const item = e.target.closest(".command-palette-item");
        if (item && item.dataset.index) {
            const idx = parseInt(item.dataset.index, 10);
            if (!isNaN(idx) && idx !== selectedIndex) {
                selectedIndex = idx;
                listEl.querySelectorAll(".command-palette-item").forEach(el => {
                    el.classList.toggle("active", parseInt(el.dataset.index, 10) === selectedIndex);
                });
            }
        }
    });

    // 5. Click outside container to dismiss
    modal.addEventListener("click", e => {
        if (e.target === modal) {
            closeCommandPalette();
        }
    });

    // 6. Bind toolbar button in editor
    document.getElementById("commandPaletteToolbarBtn")?.addEventListener("click", openCommandPalette);
}

// Global window exposure for robust accessibility and direct HTML bindings
if (typeof window !== "undefined") {
    window.openCommandPalette = openCommandPalette;
    window.closeCommandPalette = closeCommandPalette;
    window.toggleCommandPalette = toggleCommandPalette;
    window.initCommandPalette = initCommandPalette;
}

// Auto-initialize if DOM is ready
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCommandPalette);
    } else {
        initCommandPalette();
    }
}
