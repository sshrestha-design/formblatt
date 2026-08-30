// ── Field Configurations & Constants (js/constants.js) ─────────

export const DEFAULT_FIELD_SIZES = {
    textField:  { width: 200, height: 28 },
    dropdown:   { width: 180, height: 28 },
    checkBox:   { width: 20,  height: 20 },
    radioGroup: { width: 20,  height: 20 },
    radio:      { width: 20,  height: 20 },
    dateField:  { width: 140, height: 28 },
    signature:  { width: 200, height: 55 }
};

export const FIELD_TYPE_LABELS = {
    textField:  "Text Field",
    dropdown:   "Drop Down",
    checkBox:   "Check Box",
    radioGroup: "Radio Group",
    radio:      "Radio Button",
    dateField:  "Date Field",
    signature:  "Signature"
};

export const SNAP_THRESHOLD = 7; // Constant on-screen pixel radius for magnetic alignment (matching Figma/Sketch standard)
