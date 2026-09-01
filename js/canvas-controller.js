// ── Canvas Interaction, Drag, Resize, Snap & Zoom (js/canvas-controller.js) ─
import { state, setSelectedField, getSelectedField, getFieldsForCurrentPage, generateFieldId, createGroupForSelected, ungroupSelected } from "./state.js";
import { DEFAULT_FIELD_SIZES, SNAP_THRESHOLD } from "./constants.js";
import { setTransformScale, getPageTextBlocks } from "./pdf-engine.js";
import { saveHistory } from "./storage-manager.js";

let hAlignLine, vAlignLine, selectionBox, ghostElement;
let isDrawingField = false;
let drawStart = null;

const TOOL_DISPLAY_INFO = {
    textField: { name: "Text Field", icon: "", placeholder: "Text Field" },
    checkBox: { name: "Checkbox", icon: "", placeholder: "" },
    radio: { name: "Radio", icon: "", placeholder: "" },
    radioGroup: { name: "Radio Group", icon: "", placeholder: "" },
    dropdown: { name: "Dropdown", icon: "", placeholder: "Select..." },
    dateField: { name: "Date Field", icon: "", placeholder: "MM/DD/YYYY" },
    signature: { name: "Signature", icon: "", placeholder: "Sign here" }
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
        const pageTextBlocks = state.pageTextCache?.get(state.currentPageNum) || [];
        const pageWidth = container ? container.offsetWidth : null;
        const pageHeight = container ? container.offsetHeight : null;
        const snaps = checkSnapping(targetX, targetY, primaryField.width, primaryField.height, otherFields, pageTextBlocks, pageWidth, pageHeight);

        snapDx = snaps.snapX;
        snapDy = snaps.snapY;
        showGuides(snaps.guidesX, snaps.guidesY, snaps.snapPointX, snaps.snapPointY, snaps.spacingX, snaps.spacingY, pageWidth, pageHeight);
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

export function getAdaptiveFieldDimensions(type, x, y, rawBlocks) {
    const defaultDef = DEFAULT_FIELD_SIZES[type] || { width: 140, height: 26 };
    if (!rawBlocks || rawBlocks.length === 0) {
        return {
            width: defaultDef.width,
            height: defaultDef.height,
            fontSize: (type === "textField" || type === "dropdown" || type === "dateField") ? 11 : undefined
        };
    }

    // Find the nearest text block near the cursor position
    let nearestBlock = null;
    let minDistance = Infinity;

    for (const tb of rawBlocks) {
        if (!tb.str || tb.str.trim().length === 0) continue;
        const vDelta = Math.abs((tb.y + tb.height / 2) - y);
        
        // 1. Label on the same line to the left (e.g. "Full Name: [   ]")
        const isSameLineLeft = (tb.x + tb.width <= x + 20) && (x - (tb.x + tb.width) <= 220) && vDelta <= 24;
        // 2. Label directly above (e.g. "ADDRESS\n[   ]")
        const isAbove = Math.abs(tb.x - x) <= 100 && tb.y <= y && (y - (tb.y + tb.height)) <= 40;
        // 3. Text directly overlapping/under cursor
        const isUnder = x >= (tb.x - 15) && x <= (tb.x + tb.width + 15) && vDelta <= 20;

        if (isSameLineLeft || isAbove || isUnder) {
            const dist = isSameLineLeft ? (x - (tb.x + tb.width)) : (isAbove ? (y - (tb.y + tb.height)) : vDelta);
            if (dist < minDistance) {
                minDistance = dist;
                nearestBlock = tb;
            }
        }
    }

    if (!nearestBlock || !nearestBlock.height) {
        return {
            width: defaultDef.width,
            height: defaultDef.height,
            fontSize: (type === "textField" || type === "dropdown" || type === "dateField") ? 11 : undefined
        };
    }

    const fontPt = Math.max(7.5, Math.min(36, nearestBlock.fontHeight || nearestBlock.height));

    if (type === "checkBox" || type === "radioGroup" || type === "radio") {
        const side = Math.round(Math.max(12, Math.min(22, fontPt * 1.3)));
        return { width: side, height: side, fontSize: undefined };
    }

    if (type === "signature") {
        const sigHeight = Math.round(Math.max(30, Math.min(64, fontPt * 3.0)));
        const sigWidth = Math.round(Math.max(140, Math.min(260, fontPt * 13)));
        return { width: sigWidth, height: sigHeight, fontSize: undefined };
    }

    // Text Field, Date Field, Dropdown
    const fieldHeight = Math.round(Math.max(18, Math.min(50, fontPt * 1.55 + 5)));
    const fieldFontSize = Math.round(Math.max(8, Math.min(24, fontPt)));
    
    let fieldWidth = defaultDef.width;
    if (fontPt >= 14) fieldWidth = Math.round(defaultDef.width * 1.25);
    else if (fontPt <= 8.5) fieldWidth = Math.round(defaultDef.width * 0.9);

    return {
        width: fieldWidth,
        height: fieldHeight,
        fontSize: fieldFontSize
    };
}

async function createFieldAt(type, x, y, handlers, customWidth, customHeight, customX, customY, isAltHeld = false) {
    const pageTextBlocks = state.pageTextCache?.get(state.currentPageNum) || [];
    const adaptive = getAdaptiveFieldDimensions(type, x, y, pageTextBlocks);

    const width = (customWidth && customWidth >= 10) ? Math.round(customWidth) : adaptive.width;
    const height = (customHeight && customHeight >= 10) ? Math.round(customHeight) : adaptive.height;
    const detectedFontSize = (type === "textField" || type === "dropdown" || type === "dateField") ? (adaptive.fontSize || (height < 22 ? 9.5 : 11)) : undefined;

    let targetX = (customX !== undefined) ? Math.round(customX) : Math.max(0, Math.round(x));
    let targetY = (customY !== undefined) ? Math.round(customY) : Math.max(0, Math.round(y - height));

    // Keep strictly within page boundaries
    const container = document.getElementById("canvasContainer");
    const pageWidth = container?.offsetWidth || 600;
    const pageHeight = container?.offsetHeight || 800;
    targetX = Math.max(0, Math.min(pageWidth - width, targetX));
    targetY = Math.max(0, Math.min(pageHeight - height, targetY));

    const smartName = await inferSmartFieldName(type, targetX, targetY, width, height);

    const field = {
        id: generateFieldId(),
        type: type,
        name: smartName,
        x: targetX,
        y: targetY,
        width: width,
        height: height,
        page: state.currentPageNum,
        borderStyle: "solid",
        fillStyle: "white",
        fontSize: detectedFontSize,
        textAlignment: "left",
        ...(type === "dateField" ? { dateFormat: "MM/DD/YYYY", defaultValue: "MM/DD/YYYY" } : {}),
        ...(type === "dropdown" ? { options: ["Select...", "Option 1", "Option 2", "Option 3"], defaultValue: "Select..." } : {})
    };
    state.fields.push(field);
    setSelectedField(field.id);
    saveHistory();
    handlers.onFieldCreated(field);

    hideGuides();
    if (ghostElement) {
        ghostElement.classList.remove("is-drawing");
    }

    // Auto-switch back to Select tool with new field selected, unless Alt/Option is held for rapid multi-placement
    if (!isAltHeld) {
        state.activeTool = "select";
        document.body.classList.remove("placing-mode");
        document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
            b.classList.toggle("active", b.dataset.tool === "select");
        });
        if (ghostElement) ghostElement.style.display = "none";
        const stamp = document.getElementById("floatingToolStamp");
        if (stamp) stamp.style.display = "none";
    }

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

// Finds the nearest same-row (for axis 'x') or same-column (for axis 'y')
// neighbors on either side of the dragged field, and reports it as an
// "equal spacing" match when the two gaps are (almost) equal — this is the
// signature Photoshop/Figma "distribution" guide: a small gap-size label
// shown when you're evenly spaced between two neighbors. Visual-only: it
// does not itself move the field, so it can never destabilize the tested
// edge/center magnetic-snap math above.
function findSpacingMatch(mainStart, mainEnd, crossStart, crossEnd, others, axis) {
    let prev = null, prevGap = Infinity;
    let next = null, nextGap = Infinity;

    for (const o of others) {
        const oMainStart = axis === "x" ? o.x : o.y;
        const oMainEnd = axis === "x" ? o.x + o.width : o.y + o.height;
        const oCrossStart = axis === "x" ? o.y : o.x;
        const oCrossEnd = axis === "x" ? o.y + o.height : o.x + o.width;

        const crossOverlap = Math.min(crossEnd, oCrossEnd) - Math.max(crossStart, oCrossStart);
        if (crossOverlap <= 2) continue; // not in the same row/column

        if (oMainEnd <= mainStart) {
            const gap = mainStart - oMainEnd;
            if (gap < prevGap) { prevGap = gap; prev = { start: oMainStart, end: oMainEnd }; }
        } else if (oMainStart >= mainEnd) {
            const gap = oMainStart - mainEnd;
            if (gap < nextGap) { nextGap = gap; next = { start: oMainStart, end: oMainEnd }; }
        }
    }

    if (prev && next && Math.abs(prevGap - nextGap) <= 3) {
        return {
            gap: Math.round((prevGap + nextGap) / 2),
            seg1: { from: prev.end, to: mainStart },
            seg2: { from: mainEnd, to: next.start },
            crossMid: (crossStart + crossEnd) / 2
        };
    }
    return null;
}

function checkSnapping(x, y, width, height, others, textBlocks = [], pageWidth = null, pageHeight = null) {
    if (state.guidesEnabled === false) {
        return {
            snapX: 0, snapY: 0,
            guideX: null, guideY: null,
            guidesX: [], guidesY: [],
            snapPointX: null, snapPointY: null,
            spacingX: null, spacingY: null
        };
    }

    const scale = state.currentScale || 1;
    // Scale-independent snap threshold in PDF document points so magnetic snapping feels identically precise at 25% to 400% zoom
    const effectiveSnapThreshold = Math.max(1.5, SNAP_THRESHOLD / scale);

    const left = x, right = x + width, centerX = x + width / 2;
    const top = y, bottom = y + height, centerY = y + height / 2;

    // Collect candidate edge alignments within threshold per axis
    const candidatesX = [];
    const candidatesY = [];

    const pushX = (edge, myPos, otherPos) => {
        const diff = Math.abs(myPos - otherPos);
        if (diff < effectiveSnapThreshold) candidatesX.push({ edge, otherPos, diff });
    };
    const pushY = (edge, myPos, otherPos) => {
        const diff = Math.abs(myPos - otherPos);
        if (diff < effectiveSnapThreshold) candidatesY.push({ edge, otherPos, diff });
    };

    // 1. Pure Edge & Center Snapping to other form fields (Left, Right, Center, Top, Bottom, Middle)
    for (const o of others) {
        const oLeft = o.x, oRight = o.x + o.width, oCenterX = o.x + o.width / 2;
        const oTop = o.y, oBottom = o.y + o.height, oCenterY = o.y + o.height / 2;

        // Primary Column Alignments
        pushX("left", left, oLeft);
        pushX("right", right, oRight);
        pushX("left", left, oRight);
        pushX("right", right, oLeft);
        pushX("center", centerX, oCenterX);

        // Primary Row Alignments
        pushY("top", top, oTop);
        pushY("bottom", bottom, oBottom);
        pushY("top", top, oBottom);
        pushY("bottom", bottom, oTop);
        pushY("center", centerY, oCenterY);
    }

    // Page Center Snapping
    if (pageWidth && pageWidth > 0) {
        pushX("center", centerX, pageWidth / 2);
    }
    if (pageHeight && pageHeight > 0) {
        pushY("center", centerY, pageHeight / 2);
    }

    // 2. Snap to background document text blocks (column edges & baseline guides)
    const hadFieldMatchX = candidatesX.length > 0;
    const hadFieldMatchY = candidatesY.length > 0;
    if (!hadFieldMatchX || !hadFieldMatchY) {
        for (const tb of textBlocks) {
            const tbLeft = Math.round(tb.x);
            const tbRight = Math.round(tb.x + tb.width);
            const tbTop = Math.round(tb.y);
            const tbBottom = Math.round(tb.y + tb.height);

            if (!hadFieldMatchX) {
                pushX("left", left, tbLeft);
                pushX("left", left, tbRight + 6);
                pushX("right", right, tbRight);
            }
            if (!hadFieldMatchY) {
                pushY("top", top, tbTop);
                pushY("bottom", bottom, tbBottom);
                pushY("top", top, tbBottom + 4);
            }
        }
    }

    // Pick the closest edge candidate per axis to compute magnetic snap offset
    let bestX = null, bestY = null;
    for (const c of candidatesX) if (!bestX || c.diff < bestX.diff) bestX = c;
    for (const c of candidatesY) if (!bestY || c.diff < bestY.diff) bestY = c;

    let snapX = 0, snapY = 0;
    if (bestX) {
        const myPos = bestX.edge === "left" ? left : (bestX.edge === "right" ? right : centerX);
        snapX = bestX.otherPos - myPos;
    }
    if (bestY) {
        const myPos = bestY.edge === "top" ? top : (bestY.edge === "bottom" ? bottom : centerY);
        snapY = bestY.otherPos - myPos;
    }

    // Re-derive final resting edges after edge snapping
    const finalLeft = left + snapX, finalRight = right + snapX, finalCenterX = centerX + snapX;
    const finalTop = top + snapY, finalBottom = bottom + snapY, finalCenterY = centerY + snapY;

    const EPS = Math.max(0.5, 1.5 / scale);
    const guidesX = [];
    const seenX = new Set();
    for (const c of candidatesX) {
        const myFinalPos = c.edge === "left" ? finalLeft : (c.edge === "right" ? finalRight : finalCenterX);
        if (Math.abs(myFinalPos - c.otherPos) <= EPS) {
            const key = Math.round(c.otherPos);
            if (!seenX.has(key)) { seenX.add(key); guidesX.push(c.otherPos); }
        }
    }
    const guidesY = [];
    const seenY = new Set();
    for (const c of candidatesY) {
        const myFinalPos = c.edge === "top" ? finalTop : (c.edge === "bottom" ? finalBottom : finalCenterY);
        if (Math.abs(myFinalPos - c.otherPos) <= EPS) {
            const key = Math.round(c.otherPos);
            if (!seenY.has(key)) { seenY.add(key); guidesY.push(c.otherPos); }
        }
    }

    // 4. Equal-spacing / distribution guides (visual hint only).
    const spacingX = findSpacingMatch(finalLeft, finalRight, finalTop, finalBottom, others, "x");
    const spacingY = findSpacingMatch(finalTop, finalBottom, finalLeft, finalRight, others, "y");

    return {
        snapX, snapY,
        guideX: guidesX.length ? guidesX[0] : null,
        guideY: guidesY.length ? guidesY[0] : null,
        guidesX, guidesY,
        snapPointX: bestX ? bestX.otherPos : null,
        snapPointY: bestY ? bestY.otherPos : null,
        spacingX, spacingY
    };
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
        const stamp = document.getElementById("floatingToolStamp");

        const tool = state.activeTool;
        if (!tool || tool === "select" || tool === "hand") {
            document.body.classList.remove("placing-mode");
            if (ghostElement) ghostElement.style.display = "none";
            if (stamp) stamp.style.display = "none";
            hideGuides();
            return;
        }

        const info = TOOL_DISPLAY_INFO[tool] || { name: FIELD_TYPE_LABELS[tool] || "Field", icon: "", placeholder: "" };
        const pageTextBlocks = state.pageTextCache?.get(state.currentPageNum) || [];

        // 1. Update Global Floating Tool Stamp
        document.body.classList.add("placing-mode");
        if (stamp) {
            stamp.style.display = "flex";
            stamp.style.left = `${e.clientX}px`;
            stamp.style.top = `${e.clientY}px`;
            if (stamp.dataset.currentTool !== tool) {
                stamp.dataset.currentTool = tool;
                stamp.innerHTML = `<span class="stamp-icon">${info.icon}</span> <span>${info.name}</span> <span class="stamp-hint">· Click to place (Press Esc or V when done)</span>`;
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

        // Adapt box dimensions and font size to the text under or adjacent to cursor
        const adaptive = getAdaptiveFieldDimensions(tool, mouseX, mouseY, pageTextBlocks);
        const def = {
            width: adaptive.width,
            height: adaptive.height,
            fontSize: adaptive.fontSize
        };

        let targetX = Math.round(mouseX);
        let targetY = Math.round(mouseY - def.height);

        // Keep within page boundaries
        targetX = Math.max(0, Math.min(pageWidth - def.width, targetX));
        targetY = Math.max(0, Math.min(pageHeight - def.height, targetY));

        // Magnetic Snapping for Ghost Placement
        const snap = checkSnapping(targetX, targetY, def.width, def.height, getFieldsForCurrentPage(), [], pageWidth, pageHeight);
        targetX += snap.snapX;
        targetY += snap.snapY;

        if (snap.guidesX.length || snap.guidesY.length) {
            showGuides(snap.guidesX, snap.guidesY, snap.snapPointX, snap.snapPointY, snap.spacingX, snap.spacingY, pageWidth, pageHeight);
        } else {
            hideGuides();
        }

        ghostElement.style.display = "flex";
        ghostElement.style.left = `${targetX}px`;
        ghostElement.style.top = `${targetY}px`;
        ghostElement.style.width = `${def.width}px`;
        ghostElement.style.height = `${def.height}px`;
        ghostElement.classList.toggle("snapped", snap.guidesX.length > 0 || snap.guidesY.length > 0);
        ghostElement.classList.remove("is-drawing");

        const sizeBadge = def.fontSize ? `${def.width}×${def.height} px · ${def.fontSize}pt` : `${def.width}×${def.height} px`;
        const lastSignatureKey = `${tool}_${def.width}_${def.height}`;
        if (ghostElement.dataset.lastSignatureKey !== lastSignatureKey || !ghostElement.querySelector(".ghost-origin-dot")) {
            ghostElement.dataset.lastSignatureKey = lastSignatureKey;
            ghostElement.dataset.currentTool = tool;
            ghostElement.innerHTML = `
                <div class="ghost-origin-dot"></div>
                <div class="ghost-badge">${info.icon} ${info.name} · ${sizeBadge}</div>
                <div class="ghost-center-label">${info.placeholder || info.name}</div>
            `;
        }
    }

    function handleFieldDrawMove(e, container, handlers) {
        if (!ghostElement) ghostElement = document.getElementById("fieldPlacementGhost");
        const rect = container.getBoundingClientRect();
        const curX = (e.clientX - rect.left) / state.currentScale;
        const curY = (e.clientY - rect.top) / state.currentScale;

        const tool = state.activeTool;
        const info = TOOL_DISPLAY_INFO[tool] || { name: FIELD_TYPE_LABELS[tool] || "Field", icon: "", placeholder: "" };
        const pageWidth = container.offsetWidth || 600;
        const pageHeight = container.offsetHeight || 800;

        let minX = Math.min(drawStart.x, curX);
        let minY = Math.min(drawStart.y, curY);
        let w = Math.abs(curX - drawStart.x);
        let h = Math.abs(curY - drawStart.y);

        // Keep aspect ratio 1:1 for choice fields or when Shift is held
        if (tool === "checkBox" || tool === "radioGroup" || tool === "radio" || e.shiftKey) {
            const side = Math.max(w, h);
            w = side;
            h = side;
            if (curX < drawStart.x) minX = drawStart.x - side;
            if (curY < drawStart.y) minY = drawStart.y - side;
        }

        // Keep within page boundaries
        minX = Math.max(0, Math.min(pageWidth - w, minX));
        minY = Math.max(0, Math.min(pageHeight - h, minY));

        // Magnetic Snapping for Drawn Box
        const snap = checkSnapping(minX, minY, w, h, getFieldsForCurrentPage(), [], pageWidth, pageHeight);
        minX += snap.snapX;
        minY += snap.snapY;

        if (snap.guidesX.length || snap.guidesY.length) {
            showGuides(snap.guidesX, snap.guidesY, snap.snapPointX, snap.snapPointY, snap.spacingX, snap.spacingY, pageWidth, pageHeight);
        } else {
            hideGuides();
        }

        if (ghostElement) {
            ghostElement.style.display = "flex";
            ghostElement.style.left = `${minX}px`;
            ghostElement.style.top = `${minY}px`;
            ghostElement.style.width = `${Math.max(w, 4)}px`;
            ghostElement.style.height = `${Math.max(h, 4)}px`;
            ghostElement.classList.add("is-drawing");
            ghostElement.classList.toggle("snapped", snap.guidesX.length > 0 || snap.guidesY.length > 0);

            const badge = ghostElement.querySelector(".ghost-badge");
            if (badge) {
                badge.innerHTML = `${info.icon} ${info.name} · ${Math.round(w)} × ${Math.round(h)} px`;
            }
            const label = ghostElement.querySelector(".ghost-center-label");
            if (label) {
                label.textContent = (w > 60 && h > 20) ? (info.placeholder || info.name) : "";
            }
        }
    }

    container?.addEventListener("mouseleave", () => {
        if (!isDrawingField) {
            if (ghostElement) ghostElement.style.display = "none";
            hideGuides();
        }
    });

    // Escape key: cancel current action, switch to Select tool, and deselect
    // V key: switch directly to Select tool
    window.addEventListener("keydown", e => {
        const tag = (e.target?.tagName || "").toLowerCase();
        const isEditing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;

        if (e.key === "Escape") {
            e.preventDefault();

            // 1. Cancel in-progress drawing, drag, resize, lasso, or temporary panning
            isDrawingField = false;
            drawStart = null;
            state.isDragging = false;
            state.isResizing = false;
            state.isLassoing = false;
            if (state.isPanning && state.activeTool !== "hand") stopPanning();

            // 2. Switch tool back to Select tool without clearing the active field selection
            state.activeTool = "select";
            document.body.classList.remove("placing-mode");
            document.body.classList.remove("tool-hand");
            document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
                b.classList.toggle("active", b.dataset.tool === "select");
            });
            const stamp = document.getElementById("floatingToolStamp");
            if (stamp) stamp.style.display = "none";
            if (ghostElement) {
                ghostElement.style.display = "none";
                ghostElement.classList.remove("is-drawing");
            }
            if (selectionBox) selectionBox.style.display = "none";
            hideGuides();

            // 3. If focused in an input, blur it; otherwise keep the current field selection
            //    so the properties panel remains bound to the last active field.
            if (isEditing && e.target && typeof e.target.blur === "function") {
                e.target.blur();
            }
        } else if (!isEditing && (e.key === "v" || e.key === "V") && !e.metaKey && !e.ctrlKey && !e.altKey) {
            if (state.activeTool !== "select") {
                isDrawingField = false;
                drawStart = null;
                state.activeTool = "select";
                document.body.classList.remove("placing-mode");
                document.querySelectorAll(".tool-btn[data-tool]").forEach(b => {
                    b.classList.toggle("active", b.dataset.tool === "select");
                });
                const stamp = document.getElementById("floatingToolStamp");
                if (stamp) stamp.style.display = "none";
                if (ghostElement) {
                    ghostElement.style.display = "none";
                    ghostElement.classList.remove("is-drawing");
                }
                hideGuides();
            }
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

        // Creation Tools (Drag-to-Draw or Click-to-Place)
        if (state.activeTool !== "select" && state.activeTool !== "hand") {
            isDrawingField = true;
            drawStart = { x: clickX, y: clickY };

            if (!ghostElement) ghostElement = document.getElementById("fieldPlacementGhost");
            if (ghostElement) {
                ghostElement.classList.add("is-drawing");
                ghostElement.style.display = "flex";
                ghostElement.style.left = `${clickX}px`;
                ghostElement.style.top = `${clickY}px`;
                ghostElement.style.width = "4px";
                ghostElement.style.height = "4px";
            }
            const stamp = document.getElementById("floatingToolStamp");
            if (stamp) stamp.style.display = "none";
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
        if (isDrawingField && drawStart && state.activeTool !== "select") {
            handleFieldDrawMove(e, container, handlers);
        } else if (state.isPanning) {
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

    window.addEventListener("mouseup", e => {
        if (state.isPanning) stopPanning();

        // Finalize Drag-to-Draw Field Creation
        if (isDrawingField && drawStart && state.activeTool !== "select") {
            const rect = container.getBoundingClientRect();
            const curX = (e.clientX - rect.left) / state.currentScale;
            const curY = (e.clientY - rect.top) / state.currentScale;

            const tool = state.activeTool;
            let minX = Math.min(drawStart.x, curX);
            let minY = Math.min(drawStart.y, curY);
            let w = Math.abs(curX - drawStart.x);
            let h = Math.abs(curY - drawStart.y);

            if (tool === "checkBox" || tool === "radioGroup" || tool === "radio" || e.shiftKey) {
                const side = Math.max(w, h);
                w = side;
                h = side;
                if (curX < drawStart.x) minX = drawStart.x - side;
                if (curY < drawStart.y) minY = drawStart.y - side;
            }

            const isDragDrawn = (w >= 16 && h >= 12);
            isDrawingField = false;
            drawStart = null;

            if (ghostElement) {
                ghostElement.style.display = "none";
                ghostElement.classList.remove("is-drawing");
            }
            hideGuides();

            if (isDragDrawn) {
                createFieldAt(tool, minX, minY, handlers, w, h, minX, minY, e.altKey);
            } else {
                createFieldAt(tool, minX, minY, handlers, undefined, undefined, undefined, undefined, e.altKey);
            }
            return;
        }

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

    if (state.activeTool !== "select" && state.activeTool !== "hand") {
        // User clicked with a creation tool active on top of an existing overlay
        const container = document.getElementById("canvasContainer");
        if (container) {
            const rect = container.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / state.currentScale;
            const clickY = (e.clientY - rect.top) / state.currentScale;

            isDrawingField = true;
            drawStart = { x: clickX, y: clickY };

            if (!ghostElement) ghostElement = document.getElementById("fieldPlacementGhost");
            if (ghostElement) {
                ghostElement.classList.add("is-drawing");
                ghostElement.style.display = "flex";
                ghostElement.style.left = `${clickX}px`;
                ghostElement.style.top = `${clickY}px`;
                ghostElement.style.width = "4px";
                ghostElement.style.height = "4px";
            }
            const stamp = document.getElementById("floatingToolStamp");
            if (stamp) stamp.style.display = "none";
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
    if (e.altKey && !field.locked) {
        state.isDuplicating = true;
        duplicateSelectedFields();
        handlers.onSelectionChange();
    } else {
        state.isDuplicating = false;
    }

    // Start Dragging (Ignore if field is locked)
    if (field.locked) {
        state.isDragging = false;
        return;
    }
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.initialFieldPositions = new Map();
    state.selectedFieldIds.forEach(id => {
        const f = state.fields.find(item => item.id === id);
        if (f && !f.locked) state.initialFieldPositions.set(id, { x: f.x, y: f.y });
    });
}

export function handleResizeStart(e, field, direction = "se") {
    if (field.locked) return;
    state.isResizing = true;
    state.resizeFieldId = field.id;
    state.resizeDirection = direction;
    state.resizeStartPos = { x: e.clientX, y: e.clientY };
    state.resizeStartDim = { x: field.x, y: field.y, width: field.width, height: field.height };

    state.initialFieldDims = new Map();
    if (state.selectedFieldIds.has(field.id)) {
        state.selectedFieldIds.forEach(id => {
            const f = state.fields.find(item => item.id === id);
            if (f && !f.locked) state.initialFieldDims.set(id, { x: f.x, y: f.y, width: f.width, height: f.height });
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
    if (!field || field.locked) return;

    const dimsMap = (state.initialFieldDims && state.initialFieldDims.size > 0)
        ? state.initialFieldDims
        : new Map([[field.id, state.resizeStartDim]]);

    let primaryNewX, primaryNewY, primaryNewW, primaryNewH;

    // Pass 1: resize every selected field by the same drag delta, each
    // anchored on its own fixed edge (so a "w" drag keeps each field's
    // right edge in place, etc.)
    dimsMap.forEach((base, id) => {
        const f = state.fields.find(item => item.id === id);
        if (!f || f.locked) return;

        let newX = base.x, newY = base.y, newW = base.width, newH = base.height;

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

        // Shift-key aspect ratio locking on corner handles or square fields
        if ((e.shiftKey || f.type === "checkBox" || f.type === "radioGroup") && (dir === "nw" || dir === "ne" || dir === "se" || dir === "sw")) {
            const aspect = (f.type === "checkBox" || f.type === "radioGroup") ? 1.0 : (base.width / base.height);
            if (aspect > 0) {
                const adjustedH = Math.max(14, Math.round(newW / aspect));
                if (dir.includes("n")) {
                    newY = base.y + base.height - adjustedH;
                }
                newH = adjustedH;
            }
        }

        f.x = newX;
        f.y = newY;
        f.width = newW;
        f.height = newH;

        if (id === field.id) {
            primaryNewX = newX; primaryNewY = newY; primaryNewW = newW; primaryNewH = newH;
        }
    });

    // Pass 2: magnetic snapping, still computed off the handle-owning field
    // against fields OUTSIDE the selection (unchanged single-field feel),
    // then the resulting nudge is re-applied to every selected field so the
    // whole group snaps together instead of just the primary one.
    if (!e.altKey) {
        const otherFields = getFieldsForCurrentPage().filter(f => !state.selectedFieldIds.has(f.id) && f.id !== field.id);
        const pageTextBlocks = state.pageTextCache?.get(state.currentPageNum) || [];
        const container = document.getElementById("canvasContainer");
        const pageWidth = container ? container.offsetWidth : null;
        const pageHeight = container ? container.offsetHeight : null;
        const snaps = checkSnapping(primaryNewX, primaryNewY, primaryNewW, primaryNewH, otherFields, pageTextBlocks, pageWidth, pageHeight);

        let snapDX = 0, snapDW = 0, snapDY = 0, snapDH = 0;
        if (dir.includes("e") && snaps.guideX !== null) {
            snapDW = snaps.snapX;
        } else if (dir.includes("w") && snaps.guideX !== null) {
            snapDX = snaps.snapX;
            snapDW = -snaps.snapX;
        }
        if (dir.includes("s") && snaps.guideY !== null) {
            snapDH = snaps.snapY;
        } else if (dir.includes("n") && snaps.guideY !== null) {
            snapDY = snaps.snapY;
            snapDH = -snaps.snapY;
        }

        if (snapDX || snapDW || snapDY || snapDH) {
            dimsMap.forEach((base, id) => {
                const f = state.fields.find(item => item.id === id);
                if (!f) return;
                if (snapDX) f.x = Math.round(f.x + snapDX);
                if (snapDW) f.width = Math.max(16, Math.round(f.width + snapDW));
                if (snapDY) f.y = Math.round(f.y + snapDY);
                if (snapDH) f.height = Math.max(14, Math.round(f.height + snapDH));
            });
        }

        showGuides(snaps.guidesX, snaps.guidesY, snaps.snapPointX, snaps.snapPointY, snaps.spacingX, snaps.spacingY, pageWidth, pageHeight);
    } else {
        hideGuides();
    }

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

let vGuideEls = [];
let hGuideEls = [];
let spacingBadgeEls = [];
let guideContainer = null;

function getGuideContainer() {
    if (!guideContainer) guideContainer = document.getElementById("smartGuides") || document.getElementById("canvasContainer");
    return guideContainer;
}

function getPooledEl(pool, index, className) {
    if (pool[index]) return pool[index];
    // Reuse the original single #vAlignLine/#hAlignLine for index 0 so any
    // other code still referencing those IDs keeps working; create extra
    // elements on demand for additional simultaneous guides.
    let el;
    if (index === 0 && className.includes("vertical") && vAlignLine) el = vAlignLine;
    else if (index === 0 && className.includes("horizontal") && hAlignLine) el = hAlignLine;
    else {
        el = document.createElement("div");
        const parent = getGuideContainer();
        if (parent) parent.appendChild(el);
    }
    el.className = className;
    pool[index] = el;
    return el;
}

// Renders every simultaneous alignment guide at once (not just one per
// axis) — this is the core "modern design tool" behavior: your left edge
// can match one object while your right edge matches a different one, both
// shown together, instead of the closer match silently hiding the other.
function showGuides(guidesXInput, guidesYInput, activeX = null, activeY = null, spacingX = null, spacingY = null, pageWidth = null, pageHeight = null) {
    if (!snapPointDot) snapPointDot = document.getElementById("snapPointDot");
    const scale = state.currentScale || 1;
    const invScale = 1 / scale;
    const lineWidth = Math.max(0.75, 1.5 * invScale);

    // Back-compat: callers may still pass a single number instead of an array.
    const guidesX = Array.isArray(guidesXInput) ? guidesXInput : (guidesXInput !== null && guidesXInput !== undefined ? [guidesXInput] : []);
    const guidesY = Array.isArray(guidesYInput) ? guidesYInput : (guidesYInput !== null && guidesYInput !== undefined ? [guidesYInput] : []);

    guidesX.forEach((gx, i) => {
        const isCenter = pageWidth != null && Math.abs(gx - pageWidth / 2) < 0.5;
        const el = getPooledEl(vGuideEls, i, `align-line vertical${isCenter ? " center-guide" : ""}`);
        el.style.left = Math.round(gx) + "px";
        el.style.width = lineWidth + "px";
        el.style.display = "block";
    });
    for (let i = guidesX.length; i < vGuideEls.length; i++) {
        if (vGuideEls[i]) vGuideEls[i].style.display = "none";
    }

    guidesY.forEach((gy, i) => {
        const isCenter = pageHeight != null && Math.abs(gy - pageHeight / 2) < 0.5;
        const el = getPooledEl(hGuideEls, i, `align-line horizontal${isCenter ? " center-guide" : ""}`);
        el.style.top = Math.round(gy) + "px";
        el.style.height = lineWidth + "px";
        el.style.display = "block";
    });
    for (let i = guidesY.length; i < hGuideEls.length; i++) {
        if (hGuideEls[i]) hGuideEls[i].style.display = "none";
    }

    if (snapPointDot) {
        const posX = activeX !== null ? activeX : guidesX[0];
        const posY = activeY !== null ? activeY : guidesY[0];
        if (posX !== undefined && posX !== null && posY !== undefined && posY !== null) {
            snapPointDot.style.left = Math.round(posX) + "px";
            snapPointDot.style.top = Math.round(posY) + "px";
            snapPointDot.style.transform = `translate(-50%, -50%) scale(${invScale})`;
            snapPointDot.style.display = "block";
        } else {
            snapPointDot.style.display = "none";
        }
    }

    // Equal-spacing (distribution) badges — Photoshop/Figma-style pixel-gap
    // labels shown when evenly spaced between two neighbors.
    const spacings = [spacingX, spacingY].filter(Boolean);
    spacings.forEach((sp, i) => {
        const isX = sp === spacingX;
        let badge = spacingBadgeEls[i];
        if (!badge) {
            badge = document.createElement("div");
            badge.className = "spacing-badge";
            const parent = getGuideContainer();
            if (parent) parent.appendChild(badge);
            spacingBadgeEls[i] = badge;
        }
        badge.textContent = sp.gap + "px";
        if (isX) {
            const midGapX = (sp.seg1.to + sp.seg2.from) / 2;
            badge.style.left = Math.round(midGapX) + "px";
            badge.style.top = Math.round(sp.crossMid) + "px";
        } else {
            const midGapY = (sp.seg1.to + sp.seg2.from) / 2;
            badge.style.left = Math.round(sp.crossMid) + "px";
            badge.style.top = Math.round(midGapY) + "px";
        }
        badge.style.transform = `translate(-50%, -50%) scale(${invScale})`;
        badge.style.display = "block";
    });
    for (let i = spacings.length; i < spacingBadgeEls.length; i++) {
        if (spacingBadgeEls[i]) spacingBadgeEls[i].style.display = "none";
    }
}

function hideGuides() {
    vGuideEls.forEach(el => { if (el) el.style.display = "none"; });
    hGuideEls.forEach(el => { if (el) el.style.display = "none"; });
    spacingBadgeEls.forEach(el => { if (el) el.style.display = "none"; });
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
            } else if (action === "toggle-guides") {
                document.getElementById("toggleGuidesBtn")?.click();
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

        const ctxGuidesText = document.getElementById("ctxGuidesText");
        if (ctxGuidesText) {
            ctxGuidesText.textContent = state.guidesEnabled !== false ? "Snap Guides: ON" : "Snap Guides: OFF";
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
