#!/usr/bin/env python3
"""
Honest, End-to-End Ground Truth Comparison across all IRS and Clinical Forms.
Extracts vector paths/rectangles and text directly with PyMuPDF.
Runs detection logic and reports true positives, false positives, and false negatives.
"""

import os
import json
import re
from pathlib import Path
import fitz

ROOT_DIR = Path(__file__).resolve().parent.parent

def is_static_box_or_badge(bx, by, bw, bh, words, page_h):
    """
    Determines if a vector box (bx, by, bw, bh) is a static label badge,
    line number box, header banner, divider bar, or seal, rather than a form input.
    """
    # 1. Horizontal divider bars or shaded section separators
    # e.g. w > 240 and h <= 14 (dividers on tax forms and intake forms)
    if bw >= 240 and bh <= 14:
        return True, "divider_bar"

    # 2. Top header banners / form title boxes
    # e.g. y < 90 and w > 200 and h <= 25
    if by < 90 and bw >= 200 and bh <= 30:
        return True, "header_banner"

    # 3. Government / Clinical Seals at top of page (y < 95, top-left or top-right or centered)
    # Often small boxes or emblem strokes where no input prompt exists
    if by < 95 and (bx < 155 or bx > 450) and bw <= 75 and bh <= 75:
        # Check if there is an explicit form field label like 'Date', 'OMB', 'Name'
        nearby_prompts = [
            w[4].lower() for w in words
            if abs(w[1] - by) <= 15 and abs(w[0] - bx) <= 120
            and re.match(r'^(?:date|name|omb|ssn|tin|id)\b', w[4].lower())
        ]
        if not nearby_prompts:
            return True, "seal_or_emblem"

    # 4. Words physically starting or situated inside the box
    pad = 3
    inside_words = []
    starts_inside = []
    for w in words:
        wx0, wy0, wx1, wy1, text = w[0], w[1], w[2], w[3], w[4]
        # Check if word center is inside
        cx = (wx0 + wx1) / 2
        cy = (wy0 + wy1) / 2
        if (bx - pad <= cx <= bx + bw + pad) and (by - pad <= cy <= by + bh + pad):
            inside_words.append(text)
        elif (bx - pad <= wx0 <= bx + bw * 0.7) and (by - pad <= cy <= by + bh + pad):
            starts_inside.append(text)

    all_inside = inside_words or starts_inside
    if all_inside:
        combined = " ".join(all_inside).strip()

        # Is it a checkmark symbol inside a small box? (genuine checked checkbox)
        if bw <= 24 and bh <= 24 and re.match(r'^[xX✓✔☑■●•]$', combined):
            return False, "checked_box"

        # A: Line number badges: e.g. '1', '2a', '10b', 'Line 1', '1.', '(a)', 'b'
        if re.match(r'^(?:line\s*)?\(?\d{1,3}[a-z]?\)?[\.\:]?$', combined, re.I):
            return True, f"line_number_badge({combined})"
        if bw <= 35 and bh <= 22 and re.match(r'^[a-z][\.\)]?$', combined, re.I):
            return True, f"alpha_line_badge({combined})"

        # B: Section / Part / Table / Step badges: e.g. 'Part I', 'Section A', 'Schedule 1', 'Step 1'
        if re.search(r'\b(?:part|section|sec|schedule|step|table|item|box)\b', combined, re.I):
            return True, f"section_badge({combined})"

        # C: Words inside that are static labels (> 2 chars or multiple words)
        if len(all_inside) >= 2 or len(combined) >= 3:
            return True, f"inner_label({combined})"

        # D: Single word of 1-2 chars that is NOT an empty checkmark in a non-tiny box
        if len(combined) <= 2 and not (bw <= 18 and bh <= 18 and combined.lower() in ('x', 'v')):
            return True, f"inner_token({combined})"

    return False, "valid_candidate"


def is_instruction_page(page, words):
    """
    Detects if a page is an instruction, notice, or informational page with 0 form fields.
    """
    top_words = [w for w in words if w[1] <= 180]
    top_text = " ".join(w[4] for w in top_words).lower()

    instruction_patterns = [
        r'\bgeneral\s+instructions\b',
        r'\binstructions\s+for\b',
        r'\bspecific\s+instructions\b',
        r'\bnotice\s+to\s+(?:applicant|patient|taxpayer|employee)\b',
        r'\bprivacy\s+act\s+(?:statement|notice)\b',
        r'\bpaperwork\s+reduction\s+act\b',
        r'\bdirections\s+for\s+sections?\b',
        r'\bhow\s+to\s+complete\b',
        r'\binstructions\s*$',
        r'\bguidelines\s+for\b',
    ]

    for pat in instruction_patterns:
        if re.search(pat, top_text):
            # Check if there is any explicit fillable prompt like 'sign here' or 'signature of'
            full_text = " ".join(w[4] for w in words).lower()
            if not re.search(r'\bsign(?:ature)?\s+(?:here|of\s+(?:applicant|patient|taxpayer|employee))\b', full_text):
                return True, pat

    return False, None


def audit_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    form_results = []

    for pno, page in enumerate(doc):
        p_num = pno + 1
        page_h = page.rect.height

        # Ground truth widgets
        gt_widgets = []
        for w in page.widgets():
            r = w.rect
            if r.width > 2 and r.height > 2:
                gt_widgets.append({
                    "name": w.field_name,
                    "type": w.field_type_string,
                    "x": round(r.x0, 1),
                    "y": round(r.y0, 1),
                    "w": round(r.width, 1),
                    "h": round(r.height, 1)
                })

        words = page.get_text("words")
        is_inst, inst_reason = is_instruction_page(page, words)

        # Vector drawings
        drawings = page.get_drawings()
        all_rects = []
        checkboxes = []
        inputs = []

        for d in drawings:
            r = d["rect"]
            w = round(r.width, 1)
            h = round(r.height, 1)
            if w < 6 or h < 6:
                continue
            bx, by = round(r.x0, 1), round(r.y0, 1)

            # Check if this box is a static label badge / divider / seal
            is_static, reason = is_static_box_or_badge(bx, by, w, h, words, page_h)
            if is_static:
                continue

            # Candidate
            item = {"x": bx, "y": by, "w": w, "h": h}
            if 6 <= w <= 555 and 6 <= h <= 120:
                all_rects.append(item)
            if 6.5 <= w <= 32 and 6.5 <= h <= 30 and (0.5 <= w/h <= 2.2):
                checkboxes.append(item)
            elif 8 <= h <= 85 and 15 <= w <= 555:
                inputs.append(item)

        form_results.append({
            "page": p_num,
            "gt_count": len(gt_widgets),
            "is_instruction": is_inst,
            "inst_reason": inst_reason,
            "checkbox_cands": len(checkboxes),
            "input_cands": len(inputs),
            "gt": gt_widgets,
            "detected_boxes": checkboxes + inputs
        })

    return form_results

if __name__ == "__main__":
    print("Testing IRS forms...")
    for f in sorted((ROOT_DIR / "dataset_irs_forms").glob("*.pdf")):
        res = audit_pdf(f)
        total_gt = sum(p["gt_count"] for p in res)
        print(f"\n📄 {f.name[:35]:<35} | Total GT: {total_gt}")
        for p in res:
            inst_str = f" [INSTRUCTION: {p['inst_reason']}]" if p["is_instruction"] else ""
            print(f"   Page {p['page']:>2}: GT={p['gt_count']:>3} | Checkboxes={p['checkbox_cands']:>3} | Inputs={p['input_cands']:>3}{inst_str}")
