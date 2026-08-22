// ── Canvas Interaction, Drag, Resize, Snap & Zoom (js/canvas-controller.js) ─
import { state, setSelectedField, getSelectedField, getFieldsForCurrentPage, generateFieldId } from "./state.js";
import { DEFAULT_FIELD_SIZES, SNAP_THRESHOLD } from "./constants.js";
import { setTransformScale, getPageTextBlocks } from "./pdf-engine.js";
import { saveHistory } from "./storage-manager.js";

let hAlignLine, vAlignLine, selectionBox, ghostElement;

const TOOL_DISPLAY_INFO = {
    textField: { name: "Text Field", icon: "🔤", placeholder: "Text Field" },
    checkBox: { name: "Checkbox", icon: "☑", placeholder: "✓" },
    radio: { name: "Radio", icon: "🔘", placeholder: "●" },
    radioGroup: { name: "Radio Group", icon: "🔘", placeholder: "●" },
    dropdown: { name: "Dropdown", icon: "▾", placeholder: "Select..." },
    dateField: { name: "Date Field", icon: "📅", placeholder: "MM/DD/YYYY" },
    signature: { name: "Signature", icon: "✍", placeholder: "Sign here" }
};

const SEMANTIC_DICTIONARY = [
    { regex: /first\s*name/i, id: "first_name_input", title: "First Name" },
    { regex: /last\s*name|surname/i, id: "last_name_input", title: "Last Name" },
    { regex: /full\s*name|^name\b/i, id: "full_name_input", title: "Full Name" },
    { regex: /location|city|ort|standort/i, id: "location_input", title: "Location" },
    { regex: /applied\s*for|applied\s*job|position\s*applied|target\s*role|\bjob\b/i, id: "applied_job_input", title: "Applied Job" },
    { regex: /contract|contract\s*type/i, id: "contract_type_input", title: "Contract Type" },
    { regex: /availability|available\s*from|start\s*date|commence/i, id: "availability_input", title: "Availability" },
    { regex: /department|dept|division/i, id: "department_input", title: "Department" },
    { regex: /skills?|competenc/i, id: "skills_input", title: "Skills" },
    { regex: /proposed\s*salary|desired\s*salary|expected\s*salary|salary|remuneration/i, id: "proposed_salary_input", title: "Proposed Salary" },
    { regex: /degree|qualification|major|bachelor|master|phd|diploma/i, id: "degree_input", title: "Degree / Major" },
    { regex: /university|college|school|institution/i, id: "university_input", title: "University" },
    { regex: /experience|years\s*of\s*experience/i, id: "experience_input", title: "Years of Experience" },
    { regex: /e-?mail/i, id: "email_address_input", title: "Email Address" },
    { regex: /phone|mobile|cell|telephone|tel\b/i, id: "phone_number_input", title: "Phone Number" },
    { regex: /street|address\s*line/i, id: "street_address_input", title: "Street Address" },
    { regex: /address/i, id: "address_input", title: "Address" },
    { regex: /state|province|region/i, id: "state_input", title: "State" },
    { regex: /zip|postal|postcode|plz/i, id: "zip_code_input", title: "Zip Code" },
    { regex: /country|land/i, id: "country_input", title: "Country" },
    { regex: /date\s*of\s*birth|dob|birth\s*date/i, id: "date_of_birth_input", title: "Date of Birth" },
    { regex: /signature|sign\s*here|authorized\s*sign/i, id: "signature_input", title: "Signature" },
    { regex: /^date\b|date\s*signed|today.?s\s*date/i, id: "date_signed_input", title: "Date Signed" },
    { regex: /company|organization|employer/i, id: "company_name_input", title: "Company Name" },
    { regex: /title|position|occupation|role/i, id: "job_title_input", title: "Job Title" },
    { regex: /reference|referee/i, id: "reference_input", title: "Reference" },
    { regex: /comments|notes|remarks|message/i, id: "comments_input", title: "Comments" },
    { regex: /notice\s*period/i, id: "notice_period_input", title: "Notice Period" }
];

async function inferSmartFieldName(type, x, y, width, height) {
    const rawBlocks = await getPageTextBlocks(state.currentPageNum);
    let bestMatch = null;
    let minDistance = Infinity;

    for (let tb of rawBlocks) {
        // Clean off digits, bullet numbering and trailing colons: "2 JOB:" -> "JOB"
        const cleanStr = tb.str.replace(/^\d+[\.\s\)]*/, "").replace(/[:_.\s-]+$/, "").trim();
        if (!cleanStr || cleanStr.length < 2) continue;

        // Skip digit sequences or artifact patterns
        if (/^\d+(_\d+)*$/.test(cleanStr) || (cleanStr.replace(/[^0-9]/g, "").length / cleanStr.length) > 0.4) {
            continue;
        }

        // Check if block is to the left of the new field
        const isLeft = (tb.x + tb.width) <= (x + 10) && (x - (tb.x + tb.width)) <= 160 && Math.abs(tb.y - y) <= 22;
        // Check if block is above the new field
        const isAbove = Math.abs(tb.x - x) <= 50 && tb.y <= y && (y - (tb.y + tb.height)) <= 32;
        // Check if block is inside/intersecting
        const isInside = x >= (tb.x - 20) && x <= (tb.x + tb.width + 20) && Math.abs(tb.y - y) <= 18;

        if (isLeft || isAbove || isInside) {
            const dist = isLeft ? (x - (tb.x + tb.width)) : (isAbove ? (y - (tb.y + tb.height)) : 0);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = cleanStr;
            }
        }
    }

    let baseName = "";
    if (bestMatch) {
        // 1. Check direct dictionary match
        for (let item of SEMANTIC_DICTIONARY) {
            if (item.regex.test(bestMatch)) {
                baseName = item.id;
                break;
            }
        }

        // 2. Test Caesar shifts
        if (!baseName) {
            const cleanLetters = bestMatch.replace(/^[^a-zA-Z]+/, "");
            if (cleanLetters.length >= 3) {
                for (let shift = 1; shift <= 25; shift++) {
                    const decoded = cleanLetters.replace(/[a-zA-Z]/g, c => {
                        const base = c >= "a" ? 97 : 65;
                        return String.fromCharCode(((c.charCodeAt(0) - base + shift + 26) % 26) + base);
                    });
                    for (const item of SEMANTIC_DICTIONARY) {
                        if (item.regex.test(decoded)) {
                            baseName = item.id;
                            break;
                        }
                    }
                    if (baseName) break;
                }
            }
        }

        // 3. Fallback to clean alpha word
        if (!baseName && /^[a-zA-Z]{3,20}$/.test(bestMatch)) {
            const lettersOnly = bestMatch.replace(/[^a-zA-Z]/g, "");
            const vowels = lettersOnly.match(/[aeiouyAEIOUY]/g) || [];
            if (vowels.length / lettersOnly.length >= 0.2) {
                baseName = bestMatch.toLowerCase() + "_input";
            }
        }
    }

    if (!baseName) {
        baseName = `${type}`;
    }

    // Ensure unique ID
    let finalName = baseName;
    let count = 1;
    const existing = new Set(state.fields.map(f => f.name));
    while (existing.has(finalName)) {
        count++;
        finalName = `${baseName}_${count}`;
    }
    return finalName;
}

function handleFieldDrag(e, container, handlers) {
    const dx = (e.clientX - state.dragStart.x) / state.currentScale;
    const dy = (e.clientY - state.dragStart.y) / state.currentScale;

    const primaryField = getSelectedField() || state.fields.find(f => state.selectedFieldIds.has(f.id));
    let snapDx = 0, snapDy = 0;

    // Alt / Option: Holding Alt completely disables magnetic snapping for 100% free smooth precision movement
    if (!e.altKey && primaryField && state.initialFieldPositions.has(primaryField.id)) {
        const init = state.initialFieldPositions.get(primaryField.id);
        const targetX = init.x + dx;
        const targetY = init.y + dy;

        const otherFields = getFieldsForCurrentPage().filter(f => !state.selectedFieldIds.has(f.id));
        const snaps = checkSnapping(targetX, targetY, primaryField.width, primaryField.height, otherFields);

        snapDx = snaps.snapX;
        snapDy = snaps.snapY;
        showGuides(snaps.guideX, snaps.guideY, snaps.snapPointX, snaps.snapPointY);
    } else {
        hideGuides();
    }

    state.selectedFieldIds.forEach(id => {
        const f = state.fields.find(item => item.id === id);
        const init = state.initialFieldPositions.get(id);
        if (f && init) {
            f.x = Math.max(0, Math.round(init.x + dx + snapDx));
            f.y = Math.max(0, Math.round(init.y + dy + snapDy));
        }
    });

    handlers.onFieldMoving();
}

async function createFieldAt(type, x, y, handlers) {
    const def = DEFAULT_FIELD_SIZES[type] || { width: 140, height: 28 };
    const targetX = Math.max(0, Math.round(x));
    const targetY = Math.max(0, Math.round(y));

    const smartName = await inferSmartFieldName(type, targetX, targetY, def.width, def.height);

    const field = {
        id: generateFieldId(),
        type: type,
        name: smartName,
        x: targetX,
        y: targetY,
        width: def.width,
        height: def.height,
        page: state.currentPageNum,
        borderStyle: "solid",
        fillStyle: "white",
        fontSize: (type === "textField" || type === "dropdown") ? 11 : undefined,
        ...(type === "dateField" ? { dateFormat: "MM/DD/YYYY", defaultValue: "MM/DD/YYYY" } : {}),
        ...(type === "dropdown" ? { options: ["Select...", "Option 1", "Option 2", "Option 3"], defaultValue: "Select..." } : {})
    };
    state.fields.push(field);
    setSelectedField(field.id);
    saveHistory();
    handlers.onFieldCreated(field);

    // Switch tool back to select
    state.activeTool = "select";
    document.body.classList.remove("placing-mode");
    if (ghostElement) ghostElement.style.display = "none";
    hideGuides();

    document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
        b.classList.toggle("active", b.dataset.tool === "select");
    });

    // Auto-open signature modal for instant sign
    if (type === "signature") {
        import("./signature-pad.js").then(mod => {
            mod.openSignatureModal(field, () => {
                saveHistory();
                handlers.onFieldUpdated();
            });
        });
    }
}

function checkSnapping(x, y, width, height, others, resizeDir = null) {
    let snapX = 0, snapY = 0;
    let guideX = null, guideY = null;
    let snapPointX = null, snapPointY = null;

    const left = x, right = x + width, centerX = x + width / 2;
    const top = y, bottom = y + height, centerY = y + height / 2;

    let minDiffX = SNAP_THRESHOLD;
    let minDiffY = SNAP_THRESHOLD;

    // During a resize, only the edge actually being dragged participates in snapping
    const xMode = !resizeDir ? "both" : (resizeDir.includes("e") ? "right" : resizeDir.includes("w") ? "left" : "none");
    const yMode = !resizeDir ? "both" : (resizeDir.includes("s") ? "bottom" : resizeDir.includes("n") ? "top" : "none");

    // Clean, intentional field-to-field alignment (edges and centers)
    for (const o of others) {
        const oLeft = o.x, oRight = o.x + o.width, oCenterX = o.x + o.width / 2;
        const oTop = o.y, oBottom = o.y + o.height, oCenterY = o.y + o.height / 2;

        // --- Horizontal Alignments ---
        if (xMode === "both" || xMode === "left") {
            if (Math.abs(left - oLeft) < minDiffX) {
                minDiffX = Math.abs(left - oLeft);
                snapX = oLeft - left;
                guideX = oLeft;
                snapPointX = oLeft;
            }
        }
        if (xMode === "both" || xMode === "right") {
            if (Math.abs(right - oRight) < minDiffX) {
                minDiffX = Math.abs(right - oRight);
                snapX = oRight - right;
                guideX = oRight;
                snapPointX = oRight;
            }
        }
        if (xMode === "both") {
            if (Math.abs(centerX - oCenterX) < minDiffX) {
                minDiffX = Math.abs(centerX - oCenterX);
                snapX = oCenterX - centerX;
                guideX = oCenterX;
                snapPointX = oCenterX;
            }
        }

        // --- Vertical Alignments ---
        if (yMode === "both" || yMode === "top") {
            if (Math.abs(top - oTop) < minDiffY) {
                minDiffY = Math.abs(top - oTop);
                snapY = oTop - top;
                guideY = oTop;
                snapPointY = oTop;
            }
        }
        if (yMode === "both" || yMode === "bottom") {
            if (Math.abs(bottom - oBottom) < minDiffY) {
                minDiffY = Math.abs(bottom - oBottom);
                snapY = oBottom - bottom;
                guideY = oBottom;
                snapPointY = oBottom;
            }
        }
        if (yMode === "both") {
            if (Math.abs(centerY - oCenterY) < minDiffY) {
                minDiffY = Math.abs(centerY - oCenterY);
                snapY = oCenterY - centerY;
                guideY = oCenterY;
                snapPointY = oCenterY;
            }
        }
    }

    return { snapX, snapY, guideX, guideY, snapPointX, snapPointY };
}

let snapPointDot = null;

export function initCanvasController(handlers) {
    const centerCanvas = document.getElementById("centerCanvas");
    const container = document.getElementById("canvasContainer");
    hAlignLine = document.getElementById("hAlignLine");
    vAlignLine = document.getElementById("vAlignLine");
    snapPointDot = document.getElementById("snapPointDot");
    selectionBox = document.getElementById("selectionBox");
    ghostElement = document.getElementById("fieldPlacementGhost");

    // Trackpad Zoom (Wheel with Ctrl or Meta or Alt)
    centerCanvas?.addEventListener("wheel", e => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.005;
            const newScale = state.currentScale * (1 + delta);
            setTransformScale(newScale, handlers.onRerender);
        }
    }, { passive: false });

    // Placement Ghost Real-Time Position & Alignment Updater
    function updatePlacementGhost(e) {
        if (!ghostElement) ghostElement = document.getElementById("fieldPlacementGhost");

        const tool = state.activeTool;
        if (!tool || tool === "select" || tool === "hand") {
            document.body.classList.remove("placing-mode");
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
            return;
        }

        const info = TOOL_DISPLAY_INFO[tool] || { name: FIELD_TYPE_LABELS[tool] || "Field", icon: "➕", placeholder: "" };
        const def = DEFAULT_FIELD_SIZES[tool] || { width: 160, height: 28 };

        document.body.classList.add("placing-mode");

        // 2. Update In-Canvas Placement Silhouette Box
        if (!ghostElement || !container || !state.pdfDoc) return;

        const rect = container.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / state.currentScale;
        const mouseY = (e.clientY - rect.top) / state.currentScale;

        const pageWidth = container.offsetWidth || (rect.width / state.currentScale) || 600;
        const pageHeight = container.offsetHeight || (rect.height / state.currentScale) || 800;

        // If cursor is near the document canvas, show the true-to-scale silhouette
        if (mouseX < -60 || mouseX > pageWidth + 60 || mouseY < -60 || mouseY > pageHeight + 60) {
            ghostElement.style.display = "none";
            hideGuides();
            return;
        }

        let targetX = Math.round(mouseX);
        let targetY = Math.round(mouseY);

        // Keep within page boundaries
        targetX = Math.max(0, Math.min(pageWidth - def.width, targetX));
        targetY = Math.max(0, Math.min(pageHeight - def.height, targetY));

        // Magnetic Snapping for Ghost Placement
        const snap = checkSnapping(targetX, targetY, def.width, def.height, getFieldsForCurrentPage());
        targetX += snap.snapX;
        targetY += snap.snapY;

        if (snap.guideX !== null || snap.guideY !== null) {
            showGuides(snap.guideX, snap.guideY, snap.snapPointX, snap.snapPointY);
        } else {
            hideGuides();
        }

        ghostElement.style.display = "flex";
        ghostElement.style.left = `${targetX}px`;
        ghostElement.style.top = `${targetY}px`;
        ghostElement.style.width = `${def.width}px`;
        ghostElement.style.height = `${def.height}px`;
        ghostElement.classList.toggle("snapped", snap.guideX !== null || snap.guideY !== null);

        if (ghostElement.dataset.currentTool !== tool) {
            ghostElement.dataset.currentTool = tool;
            ghostElement.innerHTML = `
                <div class="ghost-badge">${info.icon} ${info.name} · ${def.width}×${def.height}</div>
                <div class="ghost-center-label">${info.placeholder || info.name}</div>
            `;
        }
    }

    container?.addEventListener("mouseleave", () => {
        if (ghostElement) ghostElement.style.display = "none";
        hideGuides();
    });

    // Escape Key cancels placement tool
    window.addEventListener("keydown", e => {
        if (e.key === "Escape" && state.activeTool !== "select") {
            state.activeTool = "select";
            document.body.classList.remove("placing-mode");
            document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
                b.classList.toggle("active", b.dataset.tool === "select");
            });
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
        }
    });

    // CenterCanvas Background MouseDown (supports dragging from canvas padding & margins)
    centerCanvas?.addEventListener("mousedown", e => {
        if (state.editorMode === "fill") return;
        if (e.button === 2) return; // Right-click handled by contextmenu

        if (state.activeTool === "hand" || isSpacePressed || e.button === 1) {
            e.preventDefault();
            startPanning(e);
            return;
        }

        // Deselect if clicking on empty gray background outside document
        if (e.target === centerCanvas) {
            if (!e.shiftKey) {
                setSelectedField(null);
                handlers.onSelectionChange();
            }
        }
    });

    // Canvas Background MouseDown
    container?.addEventListener("mousedown", e => {
        if (state.editorMode === "fill") return;
        if (e.button === 2) {
            // Right click: do nothing on mousedown, contextmenu event handles opening the menu
            return;
        }

        // Hand tool panning (or middle click / space+drag)
        if (state.activeTool === "hand" || isSpacePressed || e.button === 1) {
            e.preventDefault();
            startPanning(e);
            return;
        }

        if (e.target !== container && e.target !== document.getElementById("pdfCanvas") && e.target !== document.getElementById("overlayContainer")) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / state.currentScale;
        const clickY = (e.clientY - rect.top) / state.currentScale;

        // Creation Tools
        if (state.activeTool !== "select") {
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
            createFieldAt(state.activeTool, clickX, clickY, handlers);
            return;
        }

        // Marquee Lasso Selection
        if (!e.shiftKey) {
            setSelectedField(null);
            handlers.onSelectionChange();
        }
        startLasso(e, container, handlers);
    });

    // Global Mouse Move & Up
    window.addEventListener("mousemove", e => {
        if (state.isPanning) {
            handlePanning(e, centerCanvas);
        } else if (state.isDragging) {
            handleFieldDrag(e, container, handlers);
        } else if (state.isResizing) {
            handleFieldResize(e, handlers);
        } else if (state.isLassoing) {
            handleLassoMove(e, container, handlers);
        } else {
            updatePlacementGhost(e);
        }
    });

    window.addEventListener("mouseup", () => {
        if (state.isPanning) stopPanning();
        if (state.isDragging) {
            state.isDragging = false;
            hideGuides();
            saveHistory(true);
            handlers.onFieldUpdated();
        }
        if (state.isResizing) {
            state.isResizing = false;
            saveHistory(true);
            handlers.onFieldUpdated();
        }
        if (state.isLassoing) {
            state.isLassoing = false;
            if (selectionBox) selectionBox.style.display = "none";
            handlers.onSelectionChange();
        }
    });

    // Spacebar temporary pan listener
    window.addEventListener("keydown", e => {
        const tag = (e.target?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
        if (e.code === "Space" && !isSpacePressed) {
            isSpacePressed = true;
            document.body.classList.add("is-space-panning");
        }
    });

    window.addEventListener("keyup", e => {
        if (e.code === "Space") {
            isSpacePressed = false;
            document.body.classList.remove("is-space-panning");
            if (state.isPanning && state.activeTool !== "hand") {
                stopPanning();
            }
        }
    });

    // Initialize Canvas Context Menu
    initContextMenu(handlers);
}

let isSpacePressed = false;
let lastFieldClickTime = 0;
let lastFieldClickId = null;

export function handleFieldMouseDown(e, field, handlers) {
    if (state.editorMode === "fill") {
        return; // Allow native input focus, typing, and checkbox/radio toggling
    }

    if (e.button === 2) {
        // Right-click on field: select it if not already selected, do NOT initiate drag
        if (!state.selectedFieldIds.has(field.id) && !state.selectedFieldIds.has(String(field.id)) && !state.selectedFieldIds.has(Number(field.id))) {
            setSelectedField(field.id);
            handlers.onSelectionChange();
        }
        return;
    }

    // If Hand tool or spacebar pan is active, initiate pan across field overlays
    if (state.activeTool === "hand" || isSpacePressed || e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        startPanning(e);
        return;
    }

    if (state.activeTool !== "select") {
        // User clicked with a creation tool active on top of an existing overlay
        const container = document.getElementById("canvasContainer");
        if (container) {
            const rect = container.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / state.currentScale;
            const clickY = (e.clientY - rect.top) / state.currentScale;
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
            createFieldAt(state.activeTool, clickX, clickY, handlers);
        }
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const isDoubleClick = (lastFieldClickId === field.id && (now - lastFieldClickTime) < 400);
    lastFieldClickTime = now;
    lastFieldClickId = field.id;

    if (isDoubleClick) {
        state.isDragging = false;
        setSelectedField(field.id);
        handlers.onSelectionChange();
        import("./overlay-manager.js").then(mod => {
            const overlayEl = document.getElementById(`overlay_${field.id}`);
            mod.openFieldQuickDimensionHUD(field, overlayEl, handlers);
        });
        return;
    }

    let selectionChanged = false;
    if (e.shiftKey || e.ctrlKey || (e.metaKey && !e.altKey)) {
        if (state.selectedFieldIds.has(field.id)) {
            state.selectedFieldIds.delete(field.id);
            if (state.lastSelectedFieldId === field.id) {
                state.lastSelectedFieldId = Array.from(state.selectedFieldIds)[0] || null;
            }
        } else {
            state.selectedFieldIds.add(field.id);
            state.lastSelectedFieldId = field.id;
        }
        selectionChanged = true;
    } else {
        if (!state.selectedFieldIds.has(field.id)) {
            setSelectedField(field.id);
            selectionChanged = true;
        } else {
            state.lastSelectedFieldId = field.id;
        }
    }

    if (selectionChanged) {
        handlers.onSelectionChange();
    }

    // Alt + Drag Instant Clone (Option key on Mac / Alt on Windows)
    if (e.altKey) {
        state.isDuplicating = true;
        duplicateSelectedFields();
        handlers.onSelectionChange();
    } else {
        state.isDuplicating = false;
    }

    // Start Dragging
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.initialFieldPositions = new Map();
    state.selectedFieldIds.forEach(id => {
        const f = state.fields.find(item => item.id === id);
        if (f) state.initialFieldPositions.set(id, { x: f.x, y: f.y });
    });
}

export function handleResizeStart(e, field, direction = "se") {
    state.isResizing = true;
    state.resizeFieldId = field.id;
    state.resizeDirection = direction;
    state.resizeStartPos = { x: e.clientX, y: e.clientY };
    state.resizeStartDim = { x: field.x, y: field.y, width: field.width, height: field.height };

    state.initialFieldDims = new Map();
    if (state.selectedFieldIds.has(field.id)) {
        state.selectedFieldIds.forEach(id => {
            const f = state.fields.find(item => item.id === id);
            if (f) state.initialFieldDims.set(id, { x: f.x, y: f.y, width: f.width, height: f.height });
        });
    } else {
        state.initialFieldDims.set(field.id, { x: field.x, y: field.y, width: field.width, height: field.height });
    }
}

function handleFieldResize(e, handlers) {
    const dx = (e.clientX - state.resizeStartPos.x) / state.currentScale;
    const dy = (e.clientY - state.resizeStartPos.y) / state.currentScale;
    const dir = state.resizeDirection || "se";

    const field = state.fields.find(f => f.id === state.resizeFieldId) || getSelectedField();
    if (!field) return;

    const base = state.resizeStartDim || { x: field.x, y: field.y, width: field.width, height: field.height };
    let newX = base.x;
    let newY = base.y;
    let newW = base.width;
    let newH = base.height;

    // Horizontal resize
    if (dir.includes("e")) {
        newW = Math.max(16, Math.round(base.width + dx));
    } else if (dir.includes("w")) {
        const potentialW = Math.round(base.width - dx);
        if (potentialW >= 16) {
            newX = Math.round(base.x + dx);
            newW = potentialW;
        } else {
            newW = 16;
            newX = base.x + base.width - 16;
        }
    }

    // Vertical resize
    if (dir.includes("s")) {
        newH = Math.max(14, Math.round(base.height + dy));
    } else if (dir.includes("n")) {
        const potentialH = Math.round(base.height - dy);
        if (potentialH >= 14) {
            newY = Math.round(base.y + dy);
            newH = potentialH;
        } else {
            newH = 14;
            newY = base.y + base.height - 14;
        }
    }

    // Smart magnetic corner & edge snapping during resize (unless holding Alt)
    if (!e.altKey) {
        const otherFields = getFieldsForCurrentPage().filter(f => f.id !== field.id && !state.selectedFieldIds.has(f.id));
        const snaps = checkSnapping(newX, newY, newW, newH, otherFields, dir);

        if (dir.includes("e") && snaps.guideX !== null) {
            newW = Math.max(16, Math.round(newW + snaps.snapX));
        } else if (dir.includes("w") && snaps.guideX !== null) {
            newX = Math.round(newX + snaps.snapX);
            newW = Math.max(16, Math.round(base.x + base.width - newX));
        }

        if (dir.includes("s") && snaps.guideY !== null) {
            newH = Math.max(14, Math.round(newH + snaps.snapY));
        } else if (dir.includes("n") && snaps.guideY !== null) {
            newY = Math.round(newY + snaps.snapY);
            newH = Math.max(14, Math.round(base.y + base.height - newY));
        }

        showGuides(snaps.guideX, snaps.guideY, snaps.snapPointX, snaps.snapPointY);
    } else {
        hideGuides();
    }

    field.x = newX;
    field.y = newY;
    field.width = newW;
    field.height = newH;

    handlers.onFieldMoving();
}

function duplicateSelectedFields() {
    const clones = [];
    state.selectedFieldIds.forEach(id => {
        const orig = state.fields.find(f => f.id === id);
        if (orig) {
            const clone = JSON.parse(JSON.stringify(orig));
            clone.id = generateFieldId();
            clone.name = (orig.name || "field") + "_copy";
            clone.x += 15;
            clone.y += 15;
            state.fields.push(clone);
            clones.push(clone.id);
        }
    });
    state.selectedFieldIds.clear();
    clones.forEach(id => state.selectedFieldIds.add(id));
}

function showGuides(x, y, activeX = null, activeY = null) {
    if (!snapPointDot) snapPointDot = document.getElementById("snapPointDot");
    const scale = state.currentScale || 1;

    if (vAlignLine) {
        if (x !== null) {
            vAlignLine.style.left = Math.round(x * scale) + "px";
            vAlignLine.style.display = "block";
        } else {
            vAlignLine.style.display = "none";
        }
    }
    if (hAlignLine) {
        if (y !== null) {
            hAlignLine.style.top = Math.round(y * scale) + "px";
            hAlignLine.style.display = "block";
        } else {
            hAlignLine.style.display = "none";
        }
    }

    if (snapPointDot) {
        const posX = activeX !== null ? activeX : x;
        const posY = activeY !== null ? activeY : y;
        if (posX !== null && posY !== null) {
            snapPointDot.style.left = Math.round(posX * scale) + "px";
            snapPointDot.style.top = Math.round(posY * scale) + "px";
            snapPointDot.style.display = "block";
        } else if (posX !== null && y !== null) {
            snapPointDot.style.left = Math.round(posX * scale) + "px";
            snapPointDot.style.top = Math.round(y * scale) + "px";
            snapPointDot.style.display = "block";
        } else if (x !== null && posY !== null) {
            snapPointDot.style.left = Math.round(x * scale) + "px";
            snapPointDot.style.top = Math.round(posY * scale) + "px";
            snapPointDot.style.display = "block";
        } else {
            snapPointDot.style.display = "none";
        }
    }
}

function hideGuides() {
    if (vAlignLine) vAlignLine.style.display = "none";
    if (hAlignLine) hAlignLine.style.display = "none";
    if (snapPointDot) snapPointDot.style.display = "none";
}

function startPanning(e) {
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
    document.body.classList.add("is-panning");
}

function stopPanning() {
    if (state.isPanning) {
        state.isPanning = false;
        document.body.classList.remove("is-panning");
    }
}

function handlePanning(e, centerCanvas) {
    if (!centerCanvas) return;
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    centerCanvas.scrollLeft -= dx;
    centerCanvas.scrollTop -= dy;
    state.panStart = { x: e.clientX, y: e.clientY };
}

function startLasso(e, container, handlers) {
    state.isLassoing = true;
    state.isLassoAdditive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
    state.initialLassoSelectedIds = new Set(state.selectedFieldIds);
    const rect = container.getBoundingClientRect();
    state.lassoStart = {
        x: (e.clientX - rect.left) / state.currentScale,
        y: (e.clientY - rect.top) / state.currentScale
    };
    if (selectionBox) {
        selectionBox.style.left = state.lassoStart.x + "px";
        selectionBox.style.top = state.lassoStart.y + "px";
        selectionBox.style.width = "0px";
        selectionBox.style.height = "0px";
        selectionBox.style.display = "block";
    }
}

function handleLassoMove(e, container, handlers) {
    const rect = container.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / state.currentScale;
    const curY = (e.clientY - rect.top) / state.currentScale;

    const minX = Math.min(state.lassoStart.x, curX);
    const minY = Math.min(state.lassoStart.y, curY);
    const w = Math.abs(curX - state.lassoStart.x);
    const h = Math.abs(curY - state.lassoStart.y);

    if (selectionBox) {
        selectionBox.style.left = minX + "px";
        selectionBox.style.top = minY + "px";
        selectionBox.style.width = w + "px";
        selectionBox.style.height = h + "px";
    }

    if (state.isLassoAdditive && state.initialLassoSelectedIds) {
        state.selectedFieldIds = new Set(state.initialLassoSelectedIds);
    } else {
        state.selectedFieldIds.clear();
    }

    getFieldsForCurrentPage().forEach(f => {
        if (f.x < minX + w && f.x + f.width > minX && f.y < minY + h && f.y + f.height > minY) {
            state.selectedFieldIds.add(f.id);
            state.lastSelectedFieldId = f.id;
        }
    });
    handlers.onSelectionChange();
}

let lastRightClickPos = { x: 50, y: 50 };

export function initContextMenu(handlers) {
    const menuEl = document.getElementById("canvasContextMenu");
    const emptyGroup = document.getElementById("ctxEmptyGroup");
    const fieldGroup = document.getElementById("ctxFieldGroup");
    const multiTools = document.getElementById("ctxMultiTools");
    const groupLabel = document.getElementById("ctxGroupLabel");
    const groupIcon = document.getElementById("ctxGroupIcon");

    if (!menuEl) return;

    let menuJustOpenedAt = 0;

    const hideContextMenu = () => {
        if (Date.now() - menuJustOpenedAt < 150) return;
        menuEl.style.display = "none";
    };

    document.addEventListener("pointerdown", e => {
        if (e.button === 2) return; // Right-click should not close the menu
        if (menuEl.contains(e.target)) return;
        hideContextMenu();
    });
    document.addEventListener("click", e => {
        if (menuEl.contains(e.target)) return;
        hideContextMenu();
    });
    window.addEventListener("resize", () => {
        menuEl.style.display = "none";
    });
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") menuEl.style.display = "none";
    });

    menuEl.querySelectorAll(".ctx-item").forEach(item => {
        item.addEventListener("click", e => {
            e.stopPropagation();
            menuEl.style.display = "none";
            const action = item.dataset.action;

            if (action.startsWith("add-")) {
                const toolType = action.replace("add-", "");
                createFieldAt(toolType, lastRightClickPos.x, lastRightClickPos.y, handlers);
            } else if (action === "auto-detect") {
                document.getElementById("autoDetectBtn")?.click();
            } else if (action === "paste") {
                import("./clipboard-manager.js").then(mod => {
                    const pasted = mod.pasteClipboardFields();
                    if (pasted.length > 0) {
                        saveHistory();
                        handlers.onFieldUpdated();
                    }
                });
            } else if (action === "select-all") {
                const pageFields = state.fields.filter(f => (f.page || 1) === state.currentPageNum);
                if (pageFields.length > 0) {
                    state.selectedFieldIds.clear();
                    pageFields.forEach(f => state.selectedFieldIds.add(f.id));
                    handlers.onSelectionChange();
                }
            } else if (action === "shortcuts") {
                document.getElementById("shortcutsHelpBtn")?.click();
            } else if (action === "edit-field") {
                const selected = getSelectedField();
                if (selected) {
                    import("./overlay-manager.js").then(mod => {
                        const overlayEl = document.getElementById(`overlay_${selected.id}`);
                        mod.openFieldQuickDimensionHUD(selected, overlayEl, handlers);
                    });
                }
            } else if (action === "copy-field") {
                import("./clipboard-manager.js").then(mod => {
                    mod.copySelectedFields();
                });
            } else if (action === "duplicate-field") {
                const dups = duplicateSelectedFields();
                if (dups.length > 0) {
                    saveHistory();
                    handlers.onSelectionChange();
                }
            } else if (action === "group-fields") {
                const selFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                const isAllInGroup = selFields.length > 0 && selFields.every(f => f.groupId);
                if (isAllInGroup) {
                    ungroupSelected();
                } else {
                    createGroupForSelected();
                }
                saveHistory();
                handlers.onSelectionChange();
            } else if (action.startsWith("convert-")) {
                const targetType = action.replace("convert-", "");
                const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                if (sel.length > 0) {
                    sel.forEach(f => {
                        f.type = targetType;
                        if (targetType === "signature") {
                            f.height = Math.max(f.height, 44);
                            f.width = Math.max(f.width, 140);
                        } else if (targetType === "checkBox" || targetType === "radioGroup") {
                            f.width = 16;
                            f.height = 16;
                        } else if (targetType === "dateField") {
                            if (!f.defaultValue) f.defaultValue = "YYYY-MM-DD";
                            f.height = Math.max(f.height, 22);
                        } else if (targetType === "textField") {
                            f.height = Math.max(f.height, 22);
                            if (f.defaultValue === "YYYY-MM-DD") f.defaultValue = "";
                        } else if (targetType === "dropdown") {
                            if (!f.options || f.options.length === 0) {
                                f.options = ["Option 1", "Option 2", "Option 3"];
                            }
                        }
                    });
                    saveHistory(true);
                    handlers.onSelectionChange();
                }
            } else if (action === "align-left") {
                const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                if (sel.length >= 2) {
                    const minX = Math.min(...sel.map(f => f.x));
                    sel.forEach(f => f.x = minX);
                    saveHistory();
                    handlers.onSelectionChange();
                }
            } else if (action === "align-top") {
                const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                if (sel.length >= 2) {
                    const minY = Math.min(...sel.map(f => f.y));
                    sel.forEach(f => f.y = minY);
                    saveHistory();
                    handlers.onSelectionChange();
                }
            } else if (action === "distribute-v") {
                const sel = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                if (sel.length >= 3) {
                    sel.sort((a, b) => a.y - b.y);
                    const first = sel[0];
                    const last = sel[sel.length - 1];
                    const totalSpan = (last.y + last.height) - first.y;
                    const totalItemsHeight = sel.reduce((sum, f) => sum + f.height, 0);
                    const totalGap = totalSpan - totalItemsHeight;
                    const gap = totalGap / (sel.length - 1);
                    
                    let currentY = first.y;
                    for (let i = 0; i < sel.length; i++) {
                        if (i > 0) {
                            currentY += sel[i - 1].height + gap;
                            sel[i].y = Math.round(currentY);
                        }
                    }
                    saveHistory();
                    handlers.onSelectionChange();
                }
            } else if (action === "delete-field") {
                if (state.selectedFieldIds.size > 0) {
                    state.fields = state.fields.filter(f => !state.selectedFieldIds.has(f.id));
                    setSelectedField(null);
                    saveHistory();
                    handlers.onSelectionChange();
                }
            }
        });
    });

    window.addEventListener("contextmenu", e => {
        // Guard: Only enable when editor screen is active
        const editorScreen = document.getElementById("appEditorScreen");
        if (!editorScreen || editorScreen.style.display === "none") return;

        // Allow browser menu on form inputs / textareas / modals / sidebars / landing page
        if (e.target.closest("input, textarea, select, .right-panel, .left-panel, .landing-page, .modal")) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        menuJustOpenedAt = Date.now();

        const container = document.getElementById("canvasContainer");
        if (container) {
            const rect = container.getBoundingClientRect();
            lastRightClickPos = {
                x: Math.max(10, Math.round((e.clientX - rect.left) / state.currentScale)),
                y: Math.max(10, Math.round((e.clientY - rect.top) / state.currentScale))
            };
        }

        const overlayTarget = e.target.closest(".field-overlay");
        if (overlayTarget) {
            const idStr = overlayTarget.id.replace("overlay_", "");
            const field = state.fields.find(f => String(f.id) === idStr);
            if (field) {
                if (!state.selectedFieldIds.has(field.id) && !state.selectedFieldIds.has(String(field.id)) && !state.selectedFieldIds.has(Number(field.id))) {
                    setSelectedField(field.id);
                    handlers.onSelectionChange();
                }
            }
        }

        if (state.selectedFieldIds.size > 0) {
            if (emptyGroup) emptyGroup.style.display = "none";
            if (fieldGroup) fieldGroup.style.display = "block";

            if (multiTools) {
                multiTools.style.display = state.selectedFieldIds.size >= 2 ? "block" : "none";
            }

            if (groupLabel && groupIcon) {
                const selFields = state.fields.filter(f => state.selectedFieldIds.has(f.id));
                const isAllInGroup = selFields.length > 0 && selFields.every(f => f.groupId);
                groupLabel.textContent = isAllInGroup ? "Ungroup Selection" : "Group Selection";
                groupIcon.setAttribute("data-lucide", isAllInGroup ? "folder-minus" : "folder-plus");
            }
        } else {
            if (emptyGroup) emptyGroup.style.display = "block";
            if (fieldGroup) fieldGroup.style.display = "none";
        }

        menuEl.style.display = "block";
        if (typeof lucide !== "undefined") lucide.createIcons();

        const menuW = menuEl.offsetWidth || 210;
        const menuH = menuEl.offsetHeight || 280;
        let posX = e.clientX;
        let posY = e.clientY;

        if (posX + menuW > window.innerWidth - 10) posX = window.innerWidth - menuW - 10;
        if (posY + menuH > window.innerHeight - 10) posY = window.innerHeight - menuH - 10;

        menuEl.style.left = `${posX}px`;
        menuEl.style.top = `${posY}px`;
    });
}
