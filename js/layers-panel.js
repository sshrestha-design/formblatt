// ── Left Layers Panel Manager (js/layers-panel.js) ───────────
import { 
    state, 
    setSelectedField, 
    createGroupForSelected, 
    ungroupSelected, 
    ungroupGroup, 
    toggleGroupCollapsed, 
    selectGroup, 
    deleteGroupAndFields,
    cleanupEmptyGroups
} from "./state.js";
import { goToPage } from "./pdf-engine.js";
import { saveHistory } from "./storage-manager.js";
import { formatFieldDisplayName } from "./overlay-manager.js";

const FIELD_TYPE_STYLES = {
    textField: {
        symbol: "T",
        label: "Text Field"
    },
    signature: {
        symbol: "S",
        label: "Signature"
    },
    dropdown: {
        symbol: "▾",
        label: "Dropdown"
    },
    checkBox: {
        symbol: "✓",
        label: "Checkbox"
    },
    radioGroup: {
        symbol: "○",
        label: "Radio Group"
    },
    dateField: {
        symbol: "D",
        label: "Date Field"
    }
};

let currentDraggedFieldIds = [];

export function renderLayers(onSelect, onRerender) {
    const list = document.getElementById("layersList");
    if (!list) return;
    list.innerHTML = "";

    cleanupEmptyGroups();

    if (state.fields.length === 0) {
        list.innerHTML = '<p class="empty-msg" style="padding: 16px; color: #94a3b8; font-size: 12px; text-align: center;">No fields added yet.</p>';
        return;
    }

    const groups = state.groups || [];
    const groupedFieldIds = new Set();

    // ── 1. Render Group Sections ──────────────────────────────────────
    groups.forEach(g => {
        const groupFields = state.fields.filter(f => f.groupId === g.id);
        if (groupFields.length === 0) return;

        groupFields.forEach(f => groupedFieldIds.add(f.id));

        const isGroupAllSelected = groupFields.length > 0 && groupFields.every(f => state.selectedFieldIds.has(f.id));
        const groupContainer = document.createElement("div");
        groupContainer.className = "layer-group";
        groupContainer.dataset.groupId = g.id;

        const header = document.createElement("div");
        header.className = "layer-group-header" + (isGroupAllSelected ? " selected" : "");

        const isCollapsed = !!g.collapsed;
        header.innerHTML = `
            <button type="button" class="group-toggle-btn" title="${isCollapsed ? 'Expand Group' : 'Collapse Group'}" style="flex-shrink: 0;">
                <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 13px; height: 13px;"></i>
            </button>
            <i data-lucide="${isCollapsed ? 'folder' : 'folder-open'}" class="group-folder-icon" style="width: 14px; height: 14px; color: ${isGroupAllSelected ? '#0284c7' : '#64748b'}; flex-shrink: 0;"></i>
            <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; overflow: hidden;">
                <span class="group-name" title="${g.name || 'Group'} (Double-click to rename)" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; cursor: pointer;">${g.name || 'Group'}</span>
                <button type="button" class="layer-rename-btn" title="Rename Group" style="flex-shrink: 0;">
                    <i data-lucide="pencil" style="width: 11px; height: 11px;"></i>
                </button>
            </div>
            <span style="font-size: 10px; color: #64748b; background: #e2e8f0; padding: 1px 6px; border-radius: 9999px; font-weight: 600; flex-shrink: 0;">${groupFields.length}</span>
            <button type="button" class="group-action-btn" title="Ungroup (Release fields)" style="margin-left: 2px; flex-shrink: 0;">
                <i data-lucide="folder-minus" style="width: 12px; height: 12px;"></i>
            </button>
            <button type="button" class="group-action-btn danger" title="Delete Group & Fields" style="flex-shrink: 0;">
                <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
            </button>
        `;

        // Toggle Collapse on chevron
        header.querySelector(".group-toggle-btn")?.addEventListener("click", e => {
            e.stopPropagation();
            toggleGroupCollapsed(g.id);
            renderLayers(onSelect, onRerender);
        });

        // Select all fields in group on header click
        header.addEventListener("click", e => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            selectGroup(g.id);
            updateLayerSelectionDOM();
            if (onSelect) onSelect(groupFields[0]);
        });

        // ── Drag over group header: Drop to add to group ──────────────
        // A depth counter avoids flicker: native dragenter/dragleave fire
        // when the cursor crosses onto/off of child elements (icons, the
        // rename button, the name span) inside the header, not just when
        // truly leaving it — a plain dragover/dragleave toggle strobes the
        // highlight on/off as the cursor moves across those children.
        let groupDragDepth = 0;
        header.addEventListener("dragenter", e => {
            e.preventDefault();
            groupDragDepth++;
            header.classList.add("drag-over-group");
        });

        header.addEventListener("dragover", e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        });

        header.addEventListener("dragleave", () => {
            groupDragDepth = Math.max(0, groupDragDepth - 1);
            if (groupDragDepth === 0) header.classList.remove("drag-over-group");
        });

        header.addEventListener("drop", e => {
            e.preventDefault();
            e.stopPropagation();
            groupDragDepth = 0;
            header.classList.remove("drag-over-group");

            if (currentDraggedFieldIds.length > 0) {
                currentDraggedFieldIds.forEach(id => {
                    const fld = state.fields.find(f => f.id === id);
                    if (fld) fld.groupId = g.id;
                });
                g.collapsed = false;
                saveHistory();
                renderLayers(onSelect, onRerender);
                if (onRerender) onRerender();
            }
        });

        // Ungroup button click
        header.querySelector(".group-action-btn[title*='Ungroup']")?.addEventListener("click", e => {
            e.stopPropagation();
            ungroupGroup(g.id);
            saveHistory();
            renderLayers(onSelect, onRerender);
            if (onRerender) onRerender();
        });

        // Delete group click
        header.querySelector(".group-action-btn.danger")?.addEventListener("click", e => {
            e.stopPropagation();
            if (confirm(`Delete group "${g.name}" and all its ${groupFields.length} fields?`)) {
                deleteGroupAndFields(g.id);
                saveHistory();
                renderLayers(onSelect, onRerender);
                if (onRerender) onRerender();
            }
        });

        // In-place Rename for Group
        const startGroupRename = () => {
            const nameSpan = header.querySelector(".group-name");
            if (!nameSpan || header.querySelector(".inline-rename-input")) return;

            header.classList.add("is-renaming");
            const input = document.createElement("input");
            input.type = "text";
            input.className = "inline-rename-input";
            input.value = g.name || "Group";
            
            input.addEventListener("click", ev => ev.stopPropagation());
            input.addEventListener("dblclick", ev => ev.stopPropagation());
            input.addEventListener("mousedown", ev => ev.stopPropagation());

            nameSpan.replaceWith(input);
            input.focus();
            input.select();

            let finished = false;
            const finishRename = () => {
                if (finished) return;
                finished = true;
                header.classList.remove("is-renaming");
                const newName = input.value.trim();
                if (newName) g.name = newName;
                saveHistory();
                renderLayers(onSelect, onRerender);
            };

            input.addEventListener("blur", finishRename);
            input.addEventListener("keydown", ev => {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    finishRename();
                }
                if (ev.key === "Escape") {
                    ev.preventDefault();
                    finished = true;
                    header.classList.remove("is-renaming");
                    renderLayers(onSelect, onRerender);
                }
            });
        };

        header.querySelector(".group-name")?.addEventListener("dblclick", e => {
            e.stopPropagation();
            startGroupRename();
        });

        header.querySelector(".layer-rename-btn")?.addEventListener("click", e => {
            e.stopPropagation();
            startGroupRename();
        });

        groupContainer.appendChild(header);

        // Render fields inside group if not collapsed
        if (!isCollapsed) {
            const itemsContainer = document.createElement("div");
            itemsContainer.className = "layer-group-items";

            groupFields.forEach(f => {
                const item = createFieldLayerItem(f, onSelect, onRerender);
                itemsContainer.appendChild(item);
            });

            groupContainer.appendChild(itemsContainer);
        }

        list.appendChild(groupContainer);
    });

    // ── 2. Render Ungrouped Fields ────────────────────────────────────
    const ungroupedFields = state.fields.filter(f => !groupedFieldIds.has(f.id));
    if (ungroupedFields.length > 0) {
        if (groups.length > 0) {
            const ungrHeader = document.createElement("div");
            ungrHeader.style.cssText = "padding: 8px 12px 4px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;";
            ungrHeader.textContent = "Ungrouped Fields";
            list.appendChild(ungrHeader);
        }

        ungroupedFields.forEach(f => {
            const item = createFieldLayerItem(f, onSelect, onRerender);
            list.appendChild(item);
        });
    }

    // ── 3. Drop Zone to Remove From Group ─────────────────────────────
    if (groupedFieldIds.size > 0) {
        const dropzone = document.createElement("div");
        dropzone.className = "layer-ungroup-dropzone";
        dropzone.innerHTML = `
            <i data-lucide="folder-minus" style="width: 12px; height: 12px;"></i>
            <span>Drag here to remove from group</span>
        `;

        dropzone.addEventListener("dragover", e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            dropzone.classList.add("drag-over-ungroup");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("drag-over-ungroup");
        });

        dropzone.addEventListener("drop", e => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("drag-over-ungroup");

            if (currentDraggedFieldIds.length > 0) {
                currentDraggedFieldIds.forEach(id => {
                    const fld = state.fields.find(f => f.id === id);
                    if (fld) delete fld.groupId;
                });
                cleanupEmptyGroups();
                saveHistory();
                renderLayers(onSelect, onRerender);
                if (onRerender) onRerender();
            }
        });

        list.appendChild(dropzone);
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
}

function createFieldLayerItem(f, onSelect, onRerender) {
    const isSelected = state.selectedFieldIds.has(f.id);
    const item = document.createElement("div");
    item.className = "layer-item" + (isSelected ? " selected" : "") + (f.locked ? " is-locked" : "") + (f.hidden ? " is-hidden" : "");
    item.dataset.fieldId = f.id;
    item.draggable = true;

    const style = FIELD_TYPE_STYLES[f.type] || FIELD_TYPE_STYLES.textField;
    const globalIdx = state.fields.findIndex(item => item.id === f.id) + 1;

    item.innerHTML = `
        <span class="layer-grip-handle" title="Drag to reorder"><i data-lucide="grip-vertical" style="width: 12px; height: 12px;"></i></span>
        <span class="layer-index" style="font-size: 11px; color: ${isSelected ? '#0284c7' : '#94a3b8'}; width: 14px; font-weight: ${isSelected ? '600' : '400'}; flex-shrink: 0; text-align: right;">${globalIdx}</span>
        <span class="layer-type-tag" title="${style.label}">${style.symbol}</span>
        <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; overflow: hidden;">
            <span class="layer-name" title="${f.name || style.label} (Double-click to rename)" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${isSelected ? '600' : '500'}; cursor: grab;">${formatFieldDisplayName(f)}</span>
            <button type="button" class="layer-rename-btn" title="Rename Field" style="flex-shrink: 0;">
                <i data-lucide="pencil" style="width: 11px; height: 11px;"></i>
            </button>
        </div>
        <div style="display: flex; align-items: center; gap: 2px; flex-shrink: 0;">
            <button type="button" class="layer-action-btn layer-vis-btn" title="${f.hidden ? 'Show on canvas' : 'Hide from canvas'}">
                <i data-lucide="${f.hidden ? 'eye-off' : 'eye'}" style="width: 12px; height: 12px; color: ${f.hidden ? '#ef4444' : '#64748b'};"></i>
            </button>
            <button type="button" class="layer-action-btn layer-lock-btn" title="${f.locked ? 'Unlock field' : 'Lock field'}">
                <i data-lucide="${f.locked ? 'lock' : 'unlock'}" style="width: 12px; height: 12px; color: ${f.locked ? '#d97706' : '#94a3b8'};"></i>
            </button>
        </div>
    `;

    item.querySelector(".layer-vis-btn")?.addEventListener("click", e => {
        e.stopPropagation();
        f.hidden = !f.hidden;
        saveHistory();
        renderLayers(onSelect, onRerender);
        if (onRerender) onRerender();
    });

    item.querySelector(".layer-lock-btn")?.addEventListener("click", e => {
        e.stopPropagation();
        f.locked = !f.locked;
        saveHistory();
        renderLayers(onSelect, onRerender);
        if (onRerender) onRerender();
    });

    if (isSelected && state.selectedFieldIds.size === 1) {
        setTimeout(() => {
            item.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 10);
    }

    // ── Drag & Drop Handlers for Layer Item ────────────────────────────
    item.addEventListener("dragstart", e => {
        if (state.selectedFieldIds.has(f.id)) {
            currentDraggedFieldIds = Array.from(state.selectedFieldIds);
        } else {
            currentDraggedFieldIds = [f.id];
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", JSON.stringify(currentDraggedFieldIds));
        setTimeout(() => item.classList.add("is-dragging"), 0);
    });

    item.addEventListener("dragend", () => {
        item.classList.remove("is-dragging");
        itemDragDepth = 0;
        currentDraggedFieldIds = [];
        document.querySelectorAll(".drag-over-group, .drag-over-ungroup, .drag-over-item").forEach(el => {
            el.classList.remove("drag-over-group", "drag-over-ungroup", "drag-over-item");
        });
    });

    let itemDragDepth = 0;
    item.addEventListener("dragenter", e => {
        e.preventDefault();
        itemDragDepth++;
        item.classList.add("drag-over-item");
    });

    item.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("dragleave", () => {
        itemDragDepth = Math.max(0, itemDragDepth - 1);
        if (itemDragDepth === 0) item.classList.remove("drag-over-item");
    });

    item.addEventListener("drop", e => {
        e.preventDefault();
        e.stopPropagation();
        itemDragDepth = 0;
        item.classList.remove("drag-over-item");

        if (currentDraggedFieldIds.length > 0 && !currentDraggedFieldIds.includes(f.id)) {
            // Assign same groupId as target item (or remove if target is ungrouped)
            currentDraggedFieldIds.forEach(id => {
                const fld = state.fields.find(item => item.id === id);
                if (fld) {
                    if (f.groupId) fld.groupId = f.groupId;
                    else delete fld.groupId;
                }
            });

            // Reorder dragged items to sit right before target item
            const targetIdx = state.fields.findIndex(item => item.id === f.id);
            const draggedObjs = state.fields.filter(item => currentDraggedFieldIds.includes(item.id));
            state.fields = state.fields.filter(item => !currentDraggedFieldIds.includes(item.id));
            const newTargetIdx = state.fields.findIndex(item => item.id === f.id);
            state.fields.splice(newTargetIdx, 0, ...draggedObjs);

            cleanupEmptyGroups();
            saveHistory();
            renderLayers(onSelect, onRerender);
            if (onRerender) onRerender();
        }
    });

    item.addEventListener("click", async e => {
        if (e.target.closest("button") || e.target.closest("input")) return;
        e.stopPropagation();
        if (f.page && f.page !== state.currentPageNum) {
            await goToPage(f.page, onRerender);
        }

        const allItems = Array.from(document.querySelectorAll("#layersList .layer-item"));
        const allIds = allItems.map(el => el.dataset.fieldId);
        const currentIdStr = String(f.id);

        if (e.shiftKey) {
            // ── Range Selection with Shift + Click ──
            const anchorIdStr = state.lastSelectedFieldId !== null ? String(state.lastSelectedFieldId) : null;
            let fromIdx = anchorIdStr !== null ? allIds.indexOf(anchorIdStr) : -1;
            let toIdx = allIds.indexOf(currentIdStr);

            if (fromIdx !== -1 && toIdx !== -1) {
                const start = Math.min(fromIdx, toIdx);
                const end = Math.max(fromIdx, toIdx);
                const rangeIds = allIds.slice(start, end + 1);

                if (!e.ctrlKey && !e.metaKey) {
                    state.selectedFieldIds.clear();
                }
                rangeIds.forEach(idStr => {
                    const matchF = state.fields.find(fld => String(fld.id) === String(idStr));
                    if (matchF) state.selectedFieldIds.add(matchF.id);
                });
                state.lastSelectedFieldId = f.id;
            } else {
                state.selectedFieldIds.add(f.id);
                state.lastSelectedFieldId = f.id;
            }
        } else if (e.ctrlKey || e.metaKey) {
            // ── Toggle Individual Selection with Ctrl/Cmd + Click ──
            if (state.selectedFieldIds.has(f.id)) {
                state.selectedFieldIds.delete(f.id);
                if (state.lastSelectedFieldId === f.id) {
                    state.lastSelectedFieldId = Array.from(state.selectedFieldIds)[0] || null;
                }
            } else {
                state.selectedFieldIds.add(f.id);
                state.lastSelectedFieldId = f.id;
            }
        } else {
            // ── Standard Single Selection ──
            setSelectedField(f.id);
        }

        updateLayerSelectionDOM();
        if (onSelect) onSelect(f);
    });

    // In-place Rename for Field
    const startFieldRename = () => {
        const nameSpan = item.querySelector(".layer-name");
        if (!nameSpan || item.querySelector(".inline-rename-input")) return;

        item.classList.add("is-renaming");
        const currentName = f.name || style.label;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "inline-rename-input";
        input.value = currentName;

        input.addEventListener("click", ev => ev.stopPropagation());
        input.addEventListener("dblclick", ev => ev.stopPropagation());
        input.addEventListener("mousedown", ev => ev.stopPropagation());

        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        let finished = false;
        const finishRename = () => {
            if (finished) return;
            finished = true;
            item.classList.remove("is-renaming");
            const newName = input.value.trim();
            if (newName) f.name = newName;
            saveHistory();
            renderLayers(onSelect, onRerender);
            if (onRerender) onRerender();
        };

        input.addEventListener("blur", finishRename);
        input.addEventListener("keydown", ev => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                finishRename();
            }
            if (ev.key === "Escape") {
                ev.preventDefault();
                finished = true;
                item.classList.remove("is-renaming");
                renderLayers(onSelect, onRerender);
            }
        });
    };

    item.querySelector(".layer-name")?.addEventListener("dblclick", e => {
        e.stopPropagation();
        startFieldRename();
    });

    item.querySelector(".layer-rename-btn")?.addEventListener("click", e => {
        e.stopPropagation();
        startFieldRename();
    });

    return item;
}

export function updateLayerSelectionDOM() {
    const list = document.getElementById("layersList");
    if (!list) return;

    list.querySelectorAll(".layer-item").forEach(item => {
        const rawId = item.dataset.fieldId;
        const numId = Number(rawId);
        const floatId = parseFloat(rawId);
        const isSelected = state.selectedFieldIds.has(rawId) || state.selectedFieldIds.has(numId) || state.selectedFieldIds.has(floatId);
        item.classList.toggle("selected", isSelected);
        
        const f = state.fields.find(fld => String(fld.id) === String(rawId));
        if (f) {
            const tag = item.querySelector(".layer-type-tag");
            if (tag) {
                tag.style.color = isSelected ? "#0284c7" : "#94a3b8";
            }
            const idxEl = item.querySelector(".layer-index");
            if (idxEl) {
                idxEl.style.color = isSelected ? "#0284c7" : "#94a3b8";
                idxEl.style.fontWeight = isSelected ? "600" : "400";
            }
            const nameEl = item.querySelector(".layer-name");
            if (nameEl) {
                nameEl.style.fontWeight = isSelected ? "600" : "500";
            }
        }

        if (isSelected && state.selectedFieldIds.size === 1) {
            item.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    });

    list.querySelectorAll(".layer-group").forEach(grpEl => {
        const gid = grpEl.dataset.groupId;
        const groupFields = state.fields.filter(f => f.groupId === gid);
        const isGroupAllSelected = groupFields.length > 0 && groupFields.every(f => 
            state.selectedFieldIds.has(f.id) || state.selectedFieldIds.has(String(f.id)) || state.selectedFieldIds.has(Number(f.id))
        );
        const header = grpEl.querySelector(".layer-group-header");
        if (header) {
            header.classList.toggle("selected", isGroupAllSelected);
            const icon = header.querySelector(".group-folder-icon");
            if (icon) icon.style.color = isGroupAllSelected ? "#0284c7" : "#64748b";
        }
    });
}
