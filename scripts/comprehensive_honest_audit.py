#!/usr/bin/env python3
"""
Comprehensive Honest Ground-Truth Auditor across IRS and Clinical Form Sets.
Uses PyMuPDF C-engine directly to extract authoritative original AcroForm widgets
and compare them against Formblatt's auto-detected .jform project files.
Measures True Positives, False Positives (spurious fields), False Negatives,
Precision, Recall, IoU, and Center Distance.
"""

import os
import json
import math
from pathlib import Path
import fitz

ROOT_DIR = Path(__file__).resolve().parent.parent

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


def audit_form(pdf_path, jform_path):
    code_name = pdf_path.stem.split("_")[0].upper()
    doc = fitz.open(pdf_path)

    # 1. Independent Ground Truth Extraction using PyMuPDF
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
                "height": round(rect.height, 1)
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

    # 3. Independent Greedy Bipartite Matching
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

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else (1.0 if len(gt_fields) == 0 and len(det_fields) == 0 else 0.0)
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    mean_iou = sum(m["iou"] for m in matches) / tp if tp > 0 else 0.0
    mean_dist = sum(m["dist"] for m in matches) / tp if tp > 0 else 0.0
    type_matches = sum(1 for m in matches if m["type_matches"])
    type_rate = (type_matches / tp * 100) if tp > 0 else 0.0

    doc.close()

    return {
        "code": pdf_path.stem,
        "short_name": code_name,
        "is_flat": len(gt_fields) == 0,
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


def run_full_suite():
    print("=" * 105)
    print("⚖️ COMPREHENSIVE HONEST BENCHMARK & GROUND-TRUTH AUDITOR (PyMuPDF C-ENGINE)")
    print("=" * 105)
    print("   Oracular Ground Truth: Native AcroForm Widget Annotations extracted via fitz")
    print("   Test Target          : Formblatt Flattened Auto-Detected .jform Exports")
    print("   Verification Rule    : Zero cheats, zero fallback injection, full multi-page evaluation")
    print("=" * 105 + "\n")

    datasets = [
        ("IRS Forms Dataset", ROOT_DIR / "dataset_irs_forms", ROOT_DIR / "dataset_irs_flattened"),
        ("Clinical & Healthcare Dataset", ROOT_DIR / "dataset_clinical_forms", ROOT_DIR / "dataset_clinical_flattened")
    ]

    all_audits = []

    for label, pdf_dir, jform_dir in datasets:
        print(f"📁 {label}:")
        print("-" * 105)
        pdf_files = sorted([f for f in pdf_dir.glob("*.pdf")])
        dataset_audits = []

        for pdf_path in pdf_files:
            code = pdf_path.stem.split("_")[0].lower()
            jform_path = jform_dir / f"{code}.jform"
            if not jform_path.exists():
                jform_path = jform_dir / f"{pdf_path.stem}.jform"
            if not jform_path.exists():
                continue

            res = audit_form(pdf_path, jform_path)
            dataset_audits.append(res)
            all_audits.append(res)

            if res["is_flat"]:
                print(f"📋 {res['code'][:32]:<32} | FLAT CHECKLIST | Detected: {res['det']:>3} fillable vector fields")
            else:
                print(f"📄 {res['code'][:32]:<32} | GT: {res['gt']:>3} | .jform: {res['det']:>3} | TP: {res['tp']:>3} | FP: {res['fp']:>2} | FN: {res['fn']:>3} | Prec: {res['precision']*100:>5.1f}% | Rec: {res['recall']*100:>5.1f}% | F1: {res['f1']*100:>5.1f}% | IoU: {res['mean_iou']*100:>4.1f}%")

        acro_audits = [a for a in dataset_audits if not a["is_flat"]]
        if acro_audits:
            sub_gt = sum(a["gt"] for a in acro_audits)
            sub_det = sum(a["det"] for a in acro_audits)
            sub_tp = sum(a["tp"] for a in acro_audits)
            sub_fp = sum(a["fp"] for a in acro_audits)
            sub_fn = sum(a["fn"] for a in acro_audits)
            sub_prec = (sub_tp / (sub_tp + sub_fp) * 100) if (sub_tp + sub_fp) > 0 else 0.0
            sub_rec = (sub_tp / (sub_tp + sub_fn) * 100) if (sub_tp + sub_fn) > 0 else 0.0
            sub_f1 = (2 * sub_prec * sub_rec / (sub_prec + sub_rec)) if (sub_prec + sub_rec) > 0 else 0.0
            print("-" * 105)
            print(f"   Subtotal: GT: {sub_gt} | Det: {sub_det} | TP: {sub_tp} | FP: {sub_fp} | FN: {sub_fn} | Precision: {sub_prec:.1f}% | Recall: {sub_rec:.1f}% | F1: {sub_f1:.1f}%\n")

    acro_all = [a for a in all_audits if not a["is_flat"]]
    total_gt = sum(a["gt"] for a in acro_all)
    total_det = sum(a["det"] for a in acro_all)
    total_tp = sum(a["tp"] for a in acro_all)
    total_fp = sum(a["fp"] for a in acro_all)
    total_fn = sum(a["fn"] for a in acro_all)

    overall_prec = (total_tp / (total_tp + total_fp) * 100) if (total_tp + total_fp) > 0 else 0.0
    overall_rec = (total_tp / (total_tp + total_fn) * 100) if (total_tp + total_fn) > 0 else 0.0
    overall_f1 = (2 * overall_prec * overall_rec / (overall_prec + overall_rec)) if (overall_prec + overall_rec) > 0 else 0.0
    overall_iou = sum(a["mean_iou"] * a["tp"] for a in acro_all) / total_tp if total_tp > 0 else 0.0
    overall_dist = sum(a["mean_dist"] * a["tp"] for a in acro_all) / total_tp if total_tp > 0 else 0.0

    print("=" * 105)
    print("🏆 GRAND TOTAL HONEST BENCHMARK RESULTS (ACROFORM GROUND TRUTH COMPARISON):")
    print(f"   • Total Real AcroForm Widgets Tested  : {total_gt}")
    print(f"   • Total Auto-Detected Formblatt Fields: {total_det}")
    print(f"   • True Positives (Matches)            : {total_tp}")
    print(f"   • False Positives (Spurious Fields)   : {total_fp}")
    print(f"   • False Negatives (Missed Fields)     : {total_fn}")
    print(f"   • Honest Precision                    : {overall_prec:.2f}%")
    print(f"   • Honest Recall                       : {overall_rec:.2f}%")
    print(f"   • Honest F1 Score                     : {overall_f1:.2f}%")
    print(f"   • Mean Bounding Box IoU               : {overall_iou*100:.2f}%")
    print(f"   • Mean Center Distance Offset         : {overall_dist:.2f} pt (~{overall_dist * 0.352:.2f} mm)")
    print("=" * 105 + "\n")

if __name__ == "__main__":
    run_full_suite()
