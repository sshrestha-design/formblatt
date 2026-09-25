import fitz, json, sys

path = sys.argv[1]
doc = fitz.open(path)
out = []
for page in doc:
    chk, inp, h_l, v_l, uln, all_r = [], [], [], [], [], []
    for d in page.get_drawings():
        fill = d.get('fill')
        color = d.get('color')
        if (fill in [(1,1,1),[1,1,1]]) and (color in [(1,1,1),[1,1,1],None]):
            continue
        r = d['rect']
        w = round(r.width, 1)
        h = round(r.height, 1)
        if w < 4 or h < 0.3:
            continue
        item = {'x': round(r.x0, 1), 'y': round(r.y0, 1), 'width': w, 'height': h}
        all_r.append(item)
        if 6 <= w <= 26 and 6 <= h <= 26 and abs(w - h) <= 5:
            chk.append(item)
        elif 8 <= h <= 85 and 15 <= w <= 570:
            inp.append(item)
        for it in d.get('items', []):
            if it[0] != 'l':
                continue
            p1, p2 = it[1], it[2]
            if abs(p1.y - p2.y) < 1.0 and abs(p1.x - p2.x) >= 15:
                x1 = round(min(p1.x, p2.x), 1)
                x2 = round(max(p1.x, p2.x), 1)
                y  = round((p1.y + p2.y) / 2, 1)
                uln.append({'x': x1, 'y': y - 2, 'width': round(x2 - x1, 1), 'height': 2})
                h_l.append({'x1': x1, 'x2': x2, 'y': y})
            elif abs(p1.x - p2.x) < 1.0 and abs(p1.y - p2.y) >= 8:
                x  = round((p1.x + p2.x) / 2, 1)
                y1 = round(min(p1.y, p2.y), 1)
                y2 = round(max(p1.y, p2.y), 1)
                v_l.append({'x': x, 'y1': y1, 'y2': y2})
    words = []
    for w2 in page.get_text('words'):
        words.append({
            'str': w2[4],
            'x': round(w2[0], 1), 'y': round(w2[1], 1),
            'width': round(w2[2] - w2[0], 1), 'height': round(w2[3] - w2[1], 1)
        })
    out.append({
        'shapes': {
            'checkboxRects': chk, 'inputBoxRects': inp, 'allRects': all_r,
            'underlines': uln, 'hLines': h_l, 'vLines': v_l
        },
        'textBlocks': words
    })
print(json.dumps(out))
