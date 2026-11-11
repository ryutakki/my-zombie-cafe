#!/usr/bin/env python3
"""Converts the 11 animated characters in assets/personagens_novos into game-ready sheets.

  python3 tools/build-chars.py

Reads   assets/personagens_novos/<grupo>/<personagem>/spritesheets/{ataque,trabalhando,andando_prato}.png
        (6 columns of time x 4 rows of direction, 256x256 cells, anchor 128,240) and animacoes.json.
Writes  assets/chars/<id>/{attack,work,walk}.png  (cells reduced to 128x128, faint stray pixels removed)
        js/chars-manifest.js                      (ids, sizes, anchors, per-frame durations)

Rows are front-left, front-right, back-left, back-right. The game's four grid directions map to them in js/assets.js.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'personagens_novos')
OUT = os.path.join(ROOT, 'assets', 'chars')
CELL, COLS, ROWS, SMALL = 256, 6, 4, 128

CHARS = {  # id -> (group, folder, display name)
    'z_padrao': ('zumbis', 'zumbi_padrao', 'Zumbi padrão'),
    'z_mulher': ('zumbis', 'zumbi_mulher', 'Zumbi mulher'),
    'z_idoso': ('zumbis', 'zumbi_idoso', 'Zumbi idoso'),
    'z_adolescente': ('zumbis', 'zumbi_adolescente', 'Zumbi adolescente'),
    'z_grandalhao': ('zumbis', 'zumbi_grandalhao', 'Zumbi grandalhão'),
    'z_careca': ('zumbis', 'zumbi_careca', 'Zumbi careca'),
    'c_classico': ('chefs_humanos', 'chef_classico', 'Chef clássico'),
    'c_mulher': ('chefs_humanos', 'chef_mulher', 'Chef mulher'),
    'c_veterano': ('chefs_humanos', 'chef_veterano', 'Chef veterano'),
    'c_barbudo': ('chefs_humanos', 'chef_barbudo', 'Chef barbudo'),
    'c_jovem': ('chefs_humanos', 'chef_jovem', 'Chef jovem'),
}
SHEETS = {'ataque': 'attack', 'trabalhando': 'work', 'andando_prato': 'walk'}


def label(mask):
    """Connected components (4-neighbour) of a boolean array, without scipy. Returns (labels, sizes)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        cnt = 0
        while stack:
            y, x = stack.pop()
            cnt += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
        sizes.append(cnt)
    return lab, sizes


def clean_cell(cell):
    """Keeps the character (big opaque blobs) and a thin rim around it; drops faint halos and specks."""
    a = np.array(cell)[:, :, 3]
    solid = a > 140
    lab, sizes = label(solid)
    keep = np.zeros_like(solid)
    for i in range(1, len(sizes)):
        if sizes[i] >= 350:
            keep |= lab == i
    rim = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    rim = np.array(rim) > 0
    arr = np.array(cell)
    arr[:, :, 3] = np.where(rim, arr[:, :, 3], 0)
    # a rim pixel that is almost transparent stays almost transparent; everything outside is gone
    return Image.fromarray(arr)


def shrink(img):
    """Half-size with premultiplied alpha so the edges do not pick up a dark fringe."""
    a = np.array(img).astype(np.float32)
    al = a[:, :, 3:4] / 255.0
    pm = np.concatenate([a[:, :, :3] * al, a[:, :, 3:4]], axis=2)
    im = Image.fromarray(pm.clip(0, 255).astype(np.uint8), 'RGBA').resize((img.width // 2, img.height // 2), Image.LANCZOS)
    b = np.array(im).astype(np.float32)
    al2 = np.maximum(b[:, :, 3:4], 1) / 255.0
    rgb = (b[:, :, :3] / al2).clip(0, 255)
    return Image.fromarray(np.concatenate([rgb, b[:, :, 3:4]], axis=2).astype(np.uint8), 'RGBA')


def main():
    manifest = {}
    total = 0
    for cid, (grp, folder, name) in CHARS.items():
        base = os.path.join(SRC, grp, folder)
        meta = json.load(open(os.path.join(base, 'animacoes.json'), encoding='utf-8'))
        out_dir = os.path.join(OUT, cid)
        os.makedirs(out_dir, exist_ok=True)
        entry = {'name': name, 'fw': SMALL, 'fh': SMALL, 'ax': meta['anchor'][0] // 2, 'ay': meta['anchor'][1] // 2, 'cols': COLS, 'sheets': {}}
        for pt, en in SHEETS.items():
            sheet = Image.open(os.path.join(base, 'spritesheets', pt + '.png')).convert('RGBA')
            out = Image.new('RGBA', (COLS * SMALL, ROWS * SMALL), (0, 0, 0, 0))
            for r in range(ROWS):
                for c in range(COLS):
                    cell = clean_cell(sheet.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)))
                    out.paste(shrink(cell), (c * SMALL, r * SMALL))
            path = os.path.join(out_dir, en + '.png')
            # 256 colours with alpha keeps the files small; the art is flat colour with thin outlines
            q = out.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
            q.save(path, optimize=True)
            total += os.path.getsize(path)
            a = meta['animations'][pt]
            entry['sheets'][en] = {'ms': a['frame_durations_ms'], 'loop': a['loop'], 'impact': a['impact_frame']}
        manifest[cid] = entry
        print(cid, 'ok')
    with open(os.path.join(ROOT, 'js', 'chars-manifest.js'), 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build-chars.py - do not edit by hand.\nwindow.CHARS = ' + json.dumps(manifest, indent=1, ensure_ascii=False) + ';\n')
    print('total', total // 1024, 'KB')


if __name__ == '__main__':
    sys.exit(main())
