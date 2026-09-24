#!/usr/bin/env python3
"""
Independent Third-Party Verification Suite using Python + PyMuPDF (fitz)
Audits Formblatt's auto-detected .jform fields against original AcroForm ground truth.
Generates visual overlay diff images showing AcroForm (Green) vs .jform (Blue).
"""

import os
import json
import math
from pathlib import Path
import fitz  # PyMuPDF

ROOT_DIR = Path(__file__).resolve().parent.parent
IRS_DIR = ROOT_DIR / "dataset_irs_forms"
FLATTENED_DIR = ROOT_DIR / "dataset_irs_flattened"
VISUALS_DIR = FLATTENED_DIR / "visual_audits"
VISUALS_DIR.mkdir(parents=True, exist_ok=True)


def calculate_iou(box_a, box_b):
    xA = max(box_a["x"], box_b["x"])
    yA = max(box_a["y"], box_b["y"])
    xB = min(box_a["x"] + box_a["width"], box_b["x"] + box_b["width"])
    yB = min(box_a["y"] + box_a["height"], box_b["y"] + box_b["height"])

    inter_w = max(0, xB - xA)
    inter_h = max(0, yB - yA)
    inter_area = inter_w * inter_h
    if inter_area == 0:
        return 0.0

    area_a = box_a["width"] * box_a["height"]
    area_b = box_b["width"] * box_b["height"]
    union_area = area_a + area_b - inter_area
    return inter_area / union_area if union_area > 0 else 0.0


def center_distance(box_a, box_b):
    cAx = box_a["x"] + box_a["width"] / 2
    cAy = box_a["y"] + box_a["height"] / 2
    cBx = box_b["x"] + box_b["width"] / 2
    cBy = box_b["y"] + box_b["height"] / 2
    return math.hypot(cAx - cBx, cAy - cBy)


def normalize_type(raw_type):
    t = (raw_type or "").lower()
    if "check" in t or "radio" in t or "btn" in t:
        return "checkBox"
    if "drop" in t or "choice" in t or "combo" in t or "list" in t:
        return "dropdown"
    if "sig" in t:
        return "signature"
    return "textField"


def audit_form(pdf_path, jform_path, generate_image=True):
    code_name = pdf_path.name.split("_")[0].upper()
    doc = fitz.open(pdf_path)

    # 1. Independent Ground Truth Extraction using PyMuPDF C-engine
    gt_fields = []
    for page_idx, page in enumerate(doc):
        for widget in page.widgets():
            rect = widget.rect
            if rect.width <= 2 or rect.height <= 2:
                continue

            gt_fields.append({
                "name": widget.field_name,
                "type": normalize_type(widget.field_type_string),
                "raw_type": widget.field_type_string,
                "page": page_idx + 1,
                "x": round(rect.x0, 1),
                "y": round(rect.y0, 1),
                "width": round(rect.width, 1),
                "height": round(rect.height, 1),
                "rect": rect
            })

    # 2. Read Formblatt .jform File
    with open(jform_path, "r", encoding="utf-8") as f:
        jform_data = json.load(f)

    det_fields = []
    for fld in jform_data.get("fields", []):
        det_fields.append({
            "id": fld.get("id"),
            "name": fld.get("name"),
            "type": normalize_type(fld.get("type")),
            "page": fld.get("page", 1),
            "x": round(float(fld.get("x", 0)), 1),
            "y": round(float(fld.get("y", 0)), 1),
            "width": round(float(fld.get("width", 0)), 1),
            "height": round(float(fld.get("height", 0)), 1)
        })

    # 3. Independent Bipartite Matching
    matched_gt = set()
    matched_det = set()
    matches = []

    for gt_idx, gt in enumerate(gt_fields):
        best_det_idx = -1
        best_score = -1.0
        best_iou = 0.0
        best_dist = 999.0

        for det_idx, det in enumerate(det_fields):
            if det_idx in matched_det:
                continue
            if det["page"] != gt["page"]:
                continue

            iou = calculate_iou(det, gt)
            dist = center_distance(det, gt)
            dw = abs(det["width"] - gt["width"])
            dh = abs(det["height"] - gt["height"])

            is_match = (iou >= 0.20) or (dist <= 25 and dw <= 45 and dh <= 25)
            if is_match:
                score = iou * 10 - dist * 0.1
                if score > best_score:
                    best_score = score
                    best_det_idx = det_idx
                    best_iou = iou
                    best_dist = dist

        if best_det_idx >= 0:
            matched_det.add(best_det_idx)
            matched_gt.add(gt_idx)
            det = det_fields[best_det_idx]
            matches.append({
                "gt": gt,
                "det": det,
                "iou": best_iou,
                "dist": best_dist,
                "type_matches": gt["type"] == det["type"]
            })

    tp = len(matches)
    fp = max(0, len(det_fields) - tp)
    fn = max(0, len(gt_fields) - tp)

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    mean_iou = sum(m["iou"] for m in matches) / tp if tp > 0 else 0.0
    mean_dist = sum(m["dist"] for m in matches) / tp if tp > 0 else 0.0
    type_matches = sum(1 for m in matches if m["type_matches"])
    type_rate = (type_matches / tp * 100) if tp > 0 else 0.0

    # 4. Generate Visual Verification Overlay Images for all pages with form fields
    if generate_image:
        pages_with_fields = sorted(list(set(g["page"] for g in gt_fields) | set(d["page"] for d in det_fields)))
        for p_num in pages_with_fields:
            p_idx = p_num - 1
            if p_idx < 0 or p_idx >= len(doc):
                continue
            page = doc[p_idx]

            annot_doc = fitz.open()
            annot_page = annot_doc.new_page(width=page.rect.width, height=page.rect.height)
            annot_page.show_pdf_page(page.rect, doc, p_idx)

            # Draw Green boxes for original AcroForm Ground Truth
            for gt in [g for g in gt_fields if g["page"] == p_num]:
                r = fitz.Rect(gt["x"], gt["y"], gt["x"] + gt["width"], gt["y"] + gt["height"])
                annot_page.draw_rect(r, color=(0, 0.7, 0), width=1.2)

            # Draw Blue boxes for Formblatt .jform Detected Fields
            for det in [d for d in det_fields if d["page"] == p_num]:
                r = fitz.Rect(det["x"], det["y"], det["x"] + det["width"], det["y"] + det["height"])
                annot_page.draw_rect(r, color=(0, 0.4, 0.9), width=1.0, dashes="[2 2] 0")

            img_out = VISUALS_DIR / f"{code_name.lower()}_page{p_num}_visual_audit.png"
            annot_pix = annot_page.get_pixmap(dpi=150)
            annot_pix.save(img_out)
            annot_doc.close()

    doc.close()

    return {
        "code": code_name,
        "gt": len(gt_fields),
        "det": len(det_fields),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "mean_iou": mean_iou,
        "mean_dist": mean_dist,
        "type_rate": type_rate
    }


def main():
    print("=" * 96)
    print("🐍 PYTHON + PyMuPDF INDEPENDENT VERIFICATION & BENCHMARK AUDITOR")
    print("=" * 96)
    print("   Oracular Engine  : PyMuPDF 1.25+ (MuPDF C-Core, 100% independent of Node.js)")
    print("   Verification Mode: AcroForm Widgets vs Flattened Auto-Detected .jform")
    print("=" * 96 + "\n")

    files = sorted([f for f in os.listdir(IRS_DIR) if f.endswith(".pdf")])
    audits = []

    for f in files:
        code = f.split("_")[0].lower()
        pdf_path = IRS_DIR / f
        jform_path = FLATTENED_DIR / f"{code}.jform"

        if not jform_path.exists():
            continue

        res = audit_form(pdf_path, jform_path, generate_image=True)
        audits.append(res)
        print(f"📄 {res['code']:<9} | AcroForm GT: {res['gt']:>3} | .jform: {res['det']:>3} | TP: {res['tp']:>3} | FP: {res['fp']:>2} | FN: {res['fn']:>2} | Prec: {res['precision']*100:>5.1f}% | Rec: {res['recall']*100:>5.1f}% | F1: {res['f1']*100:>5.1f}% | IoU: {res['mean_iou']*100:>5.1f}% | Dist: {res['mean_dist']:>4.1f}pt")

    total_gt = sum(a["gt"] for a in audits)
    total_det = sum(a["det"] for a in audits)
    total_tp = sum(a["tp"] for a in audits)
    total_fp = sum(a["fp"] for a in audits)
    total_fn = sum(a["fn"] for a in audits)

    overall_prec = (total_tp / (total_tp + total_fp)) if (total_tp + total_fp) > 0 else 0.0
    overall_rec = (total_tp / (total_tp + total_fn)) if (total_tp + total_fn) > 0 else 0.0
    overall_f1 = (2 * overall_prec * overall_rec / (overall_prec + overall_rec)) if (overall_prec + overall_rec) > 0 else 0.0
    overall_iou = sum(a["mean_iou"] * a["tp"] for a in audits) / total_tp if total_tp > 0 else 0.0
    overall_dist = sum(a["mean_dist"] * a["tp"] for a in audits) / total_tp if total_tp > 0 else 0.0
    overall_type = sum(a["type_rate"] * a["tp"] for a in audits) / total_tp if total_tp > 0 else 0.0

    print("\n" + "=" * 96)
    print("📊 PYTHON PyMuPDF AUDIT SUMMARY")
    print("=" * 96)
    print(f"{'Form':<10} | {'GT':<4} | {'Det':<4} | {'TP':<4} | {'FP':<3} | {'FN':<3} | {'Precision':<9} | {'Recall':<9} | {'F1':<7} | {'IoU':<7} | {'Offset':<7} | {'Type Agreement':<14}")
    print("-" * 96)
    for a in audits:
        print(f"{a['code']:<10} | {a['gt']:<4} | {a['det']:<4} | {a['tp']:<4} | {a['fp']:<3} | {a['fn']:<3} | {a['precision']*100:>7.1f}% | {a['recall']*100:>7.1f}% | {a['f1']*100:>5.1f}% | {a['mean_iou']*100:>5.1f}% | {a['mean_dist']:>5.1f}pt | {a['type_rate']:>12.1f}%")
    print("=" * 96)

    print("\n🏆 INDEPENDENT PYTHON AUDIT AGGREGATES:")
    print(f"   • Ground Truth Widgets Extracted by PyMuPDF : {total_gt}")
    print(f"   • Auto-Detected Fields from .jform Files   : {total_det}")
    print(f"   • Independent True Positives (Matches)      : {total_tp}")
    print(f"   • Independent False Positives (Spurious)    : {total_fp}")
    print(f"   • Independent False Negatives (Missed)      : {total_fn}")
    print(f"   • Python-Verified Precision                 : {overall_prec*100:.2f}%")
    print(f"   • Python-Verified Recall                    : {overall_rec*100:.2f}%")
    print(f"   • Python-Verified F1 Score                  : {overall_f1*100:.2f}%")
    print(f"   • Mean Intersection-over-Union (IoU)        : {overall_iou*100:.2f}%")
    print(f"   • Mean Coordinate Center Offset             : {overall_dist:.2f} pt (~{overall_dist * 0.352:.2f} mm)")
    print(f"   • Field Type Classification Agreement       : {overall_type:.2f}%")
    print(f"   • Visual Overlay PNGs Generated in          : {VISUALS_DIR}")
    print("=" * 96 + "\n")


if __name__ == "__main__":
    main()
