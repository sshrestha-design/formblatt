// ── Canvas Interaction, Drag, Resize, Snap & Zoom (js/canvas-controller.js) ─
import { state, setSelectedField, getSelectedField, getFieldsForCurrentPage } from "./state.js";
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

    if (primaryField && state.initialFieldPositions.has(primaryField.id)) {
        const init = state.initialFieldPositions.get(primaryField.id);
        const targetX = init.x + dx;
        const targetY = init.y + dy;

        const otherFields = getFieldsForCurrentPage().filter(f => !state.selectedFieldIds.has(f.id));
        const pageTextBlocks = state.pageTextCache?.get(state.currentPageNum) || [];
        const snaps = checkSnapping(targetX, targetY, primaryField.width, primaryField.height, otherFields, pageTextBlocks);

        snapDx = snaps.snapX;
        snapDy = snaps.snapY;
        showGuides(snaps.guideX, snaps.guideY);
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
    const targetX = Math.max(0, Math.round(x - def.width / 2));
    const targetY = Math.max(0, Math.round(y - def.height / 2));

    const smartName = await inferSmartFieldName(type, targetX, targetY, def.width, def.height);

    const field = {
        id: Date.now(),
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
    const stamp = document.getElementById("floatingToolStamp");
    if (stamp) stamp.style.display = "none";
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

function checkSnapping(x, y, width, height, others, textBlocks = []) {
    let snapX = 0, snapY = 0;
    let guideX = null, guideY = null;

    const left = x, right = x + width, centerX = x + width / 2;
    const top = y, bottom = y + height, centerY = y + height / 2;

    // 1. Snap to other form fields
    for (let o of others) {
        const oLeft = o.x, oRight = o.x + o.width, oCenterX = o.x + o.width / 2;
        const oTop = o.y, oBottom = o.y + o.height, oCenterY = o.y + o.height / 2;

        if (Math.abs(left - oLeft) < SNAP_THRESHOLD) { snapX = oLeft - left; guideX = oLeft; }
        else if (Math.abs(right - oRight) < SNAP_THRESHOLD) { snapX = oRight - right; guideX = oRight; }
        else if (Math.abs(centerX - oCenterX) < SNAP_THRESHOLD) { snapX = oCenterX - centerX; guideX = oCenterX; }

        if (Math.abs(top - oTop) < SNAP_THRESHOLD) { snapY = oTop - top; guideY = oTop; }
        else if (Math.abs(bottom - oBottom) < SNAP_THRESHOLD) { snapY = oBottom - bottom; guideY = oBottom; }
        else if (Math.abs(centerY - oCenterY) < SNAP_THRESHOLD) { snapY = oCenterY - centerY; guideY = oCenterY; }
    }

    // 2. Snap to background document text blocks (column edges & baselines)
    if (guideX === null || guideY === null) {
        for (let tb of textBlocks) {
            const tbLeft = Math.round(tb.x);
            const tbRight = Math.round(tb.x + tb.width);
            const tbTop = Math.round(tb.y);
            const tbBaseline = Math.round(tb.y + tb.height);

            if (guideX === null) {
                if (Math.abs(left - tbLeft) < SNAP_THRESHOLD) { snapX = tbLeft - left; guideX = tbLeft; }
                else if (Math.abs(left - (tbRight + 12)) < SNAP_THRESHOLD) { snapX = (tbRight + 12) - left; guideX = tbRight + 12; }
            }

            if (guideY === null) {
                if (Math.abs(top - tbTop) < SNAP_THRESHOLD) { snapY = tbTop - top; guideY = tbTop; }
                else if (Math.abs(bottom - tbBaseline) < SNAP_THRESHOLD) { snapY = tbBaseline - bottom; guideY = tbBaseline; }
            }
        }
    }

    return { snapX, snapY, guideX, guideY };
}

export function initCanvasController(handlers) {
    const centerCanvas = document.getElementById("centerCanvas");
    const container = document.getElementById("canvasContainer");
    hAlignLine = document.getElementById("hAlignLine");
    vAlignLine = document.getElementById("vAlignLine");
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
        const stamp = document.getElementById("floatingToolStamp");

        const tool = state.activeTool;
        if (!tool || tool === "select" || tool === "hand") {
            document.body.classList.remove("placing-mode");
            if (ghostElement) ghostElement.style.display = "none";
            if (stamp) stamp.style.display = "none";
            hideGuides();
            return;
        }

        const info = TOOL_DISPLAY_INFO[tool] || { name: FIELD_TYPE_LABELS[tool] || "Field", icon: "➕", placeholder: "" };
        const def = DEFAULT_FIELD_SIZES[tool] || { width: 160, height: 28 };

        // 1. Update Global Floating Tool Stamp
        document.body.classList.add("placing-mode");
        if (stamp) {
            stamp.style.display = "flex";
            stamp.style.left = `${e.clientX}px`;
            stamp.style.top = `${e.clientY}px`;
            if (stamp.dataset.currentTool !== tool) {
                stamp.dataset.currentTool = tool;
                stamp.innerHTML = `<span class="stamp-icon">${info.icon}</span> <span>${info.name}</span> <span class="stamp-hint">· Click to place</span>`;
            }
        }

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

        let targetX = Math.round(mouseX - def.width / 2);
        let targetY = Math.round(mouseY - def.height / 2);

        // Keep within page boundaries
        targetX = Math.max(0, Math.min(pageWidth - def.width, targetX));
        targetY = Math.max(0, Math.min(pageHeight - def.height, targetY));

        // Magnetic Snapping for Ghost Placement
        const snap = checkSnapping(targetX, targetY, def.width, def.height, getFieldsForCurrentPage(), []);
        targetX += snap.snapX;
        targetY += snap.snapY;

        if (snap.guideX !== null) showGuide("v", snap.guideX); else hideGuide("v");
        if (snap.guideY !== null) showGuide("h", snap.guideY); else hideGuide("h");

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
            const stamp = document.getElementById("floatingToolStamp");
            if (stamp) stamp.style.display = "none";
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
        }
    });

    // Canvas Background MouseDown
    container?.addEventListener("mousedown", e => {
        if (e.button === 2) return; // Ignore right-click, handled by contextmenu listener

        if (e.target !== container && e.target !== document.getElementById("pdfCanvas") && e.target !== document.getElementById("overlayContainer")) {
            return;
        }

        // Hand tool panning
        if (state.activeTool === "hand" || e.button === 1 || e.spaceKey) {
            startPanning(e);
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
        if (state.isPanning) state.isPanning = false;
        if (state.isDragging) {
            state.isDragging = false;
            hideGuides();
            saveHistory();
            handlers.onFieldUpdated();
        }
        if (state.isResizing) {
            state.isResizing = false;
            saveHistory();
            handlers.onFieldUpdated();
        }
        if (state.isLassoing) {
            state.isLassoing = false;
            if (selectionBox) selectionBox.style.display = "none";
            handlers.onSelectionChange();
        }
    });

    // Initialize Canvas Context Menu
    initContextMenu(handlers);
}

let lastFieldClickTime = 0;
let lastFieldClickId = null;

export function handleFieldMouseDown(e, field, handlers) {
    if (state.activeTool !== "select" && state.activeTool !== "hand") {
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

    e.stopPropagation();
    if (state.activeTool === "hand") return;

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

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (state.selectedFieldIds.has(field.id)) {
            state.selectedFieldIds.delete(field.id);
            if (state.lastSelectedFieldId === field.id) {
                state.lastSelectedFieldId = Array.from(state.selectedFieldIds)[0] || null;
            }
        } else {
            state.selectedFieldIds.add(field.id);
            state.lastSelectedFieldId = field.id;
        }
    } else {
        if (!state.selectedFieldIds.has(field.id)) {
            setSelectedField(field.id);
        } else {
            state.lastSelectedFieldId = field.id;
        }
    }
    handlers.onSelectionChange();

    // Alt + Drag Instant Clone
    if (e.altKey || e.metaKey) {
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

export function handleResizeStart(e, field) {
    state.isResizing = true;
    state.resizeFieldId = field.id;
    state.resizeStartPos = { x: e.clientX, y: e.clientY };
    state.resizeStartDim = { width: field.width, height: field.height };
}

function handleFieldResize(e, handlers) {
    const field = state.fields.find(f => f.id === state.resizeFieldId);
    if (!field) return;
    const dx = (e.clientX - state.resizeStartPos.x) / state.currentScale;
    const dy = (e.clientY - state.resizeStartPos.y) / state.currentScale;

    field.width = Math.max(16, Math.round(state.resizeStartDim.width + dx));
    field.height = Math.max(16, Math.round(state.resizeStartDim.height + dy));

    handlers.onFieldMoving();
}

function duplicateSelectedFields() {
    const clones = [];
    state.selectedFieldIds.forEach(id => {
        const orig = state.fields.find(f => f.id === id);
        if (orig) {
            const clone = JSON.parse(JSON.stringify(orig));
            clone.id = Date.now() + Math.random();
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

function showGuides(x, y) {
    if (vAlignLine) {
        if (x !== null) { vAlignLine.style.left = x + "px"; vAlignLine.style.display = "block"; }
        else { vAlignLine.style.display = "none"; }
    }
    if (hAlignLine) {
        if (y !== null) { hAlignLine.style.top = y + "px"; hAlignLine.style.display = "block"; }
        else { hAlignLine.style.display = "none"; }
    }
}

function hideGuides() {
    if (vAlignLine) vAlignLine.style.display = "none";
    if (hAlignLine) hAlignLine.style.display = "none";
}

function startPanning(e) {
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
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

    if (!menuEl) return;

    const hideContextMenu = () => {
        menuEl.style.display = "none";
    };

    document.addEventListener("click", hideContextMenu);
    document.addEventListener("scroll", hideContextMenu, true);
    window.addEventListener("resize", hideContextMenu);

    window.addEventListener("keydown", e => {
        if (e.key === "Escape") hideContextMenu();
    });

    menuEl.querySelectorAll(".ctx-item").forEach(item => {
        item.addEventListener("click", e => {
            e.stopPropagation();
            hideContextMenu();
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
                document.getElementById("groupSelectedBtn")?.click();
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

    const container = document.getElementById("canvasContainer");
    if (container) {
        container.addEventListener("contextmenu", e => {
            // Guard: Only enable when editor screen is active
            const editorScreen = document.getElementById("appEditorScreen");
            if (!editorScreen || editorScreen.style.display === "none") return;

            e.preventDefault();
            e.stopPropagation();

            const rect = container.getBoundingClientRect();
            lastRightClickPos = {
                x: Math.max(10, Math.round((e.clientX - rect.left) / state.currentScale)),
                y: Math.max(10, Math.round((e.clientY - rect.top) / state.currentScale))
            };

            const overlayTarget = e.target.closest(".field-overlay");
            if (overlayTarget) {
                const idStr = overlayTarget.id.replace("overlay_", "");
                const field = state.fields.find(f => String(f.id) === idStr);
                if (field) {
                    if (!state.selectedFieldIds.has(field.id)) {
                        setSelectedField(field.id);
                        handlers.onSelectionChange();
                    }
                    if (emptyGroup) emptyGroup.style.display = "none";
                    if (fieldGroup) fieldGroup.style.display = "block";
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
}
