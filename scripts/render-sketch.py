#!/usr/bin/env python3
"""Rasterise a whiteboard sketch (the draw_on_whiteboard / visuals shape
schema on a 100x100 grid) to a PNG, the way the browser draws it, so a
diagram can be checked without a browser.

  python3 scripts/render-sketch.py shapes.json out.png
  python3 scripts/render-sketch.py data/probability/visuals/<id>.json out.png [--step N]

A visuals file renders its diagram plus the shapes of steps 1..N.
"""
import json
import math
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 800
INK = (122, 90, 166)
PAPER = (255, 254, 248)


def font(size):
    for name in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def X(v):
    return v / 100 * W


def Y(v):
    return v / 100 * H


def draw_shapes(shapes, out):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    f = font(24)
    for sh in shapes:
        kind, x, y, w, h = sh["kind"], sh["x"], sh["y"], sh.get("w", 0), sh.get("h", 0)
        text = (sh.get("text") or "").strip()
        if kind == "label":
            d.text((X(x), Y(y) - 24), text, fill=INK, font=f)
            continue
        if kind in ("arrow", "line"):
            a, b = (X(x), Y(y)), (X(x + w), Y(y + h))
            d.line([a, b], fill=INK, width=3)
            if kind == "arrow":
                ang = math.atan2(b[1] - a[1], b[0] - a[0])
                for s in (-0.45, 0.45):
                    d.line(
                        [b, (b[0] - 16 * math.cos(ang + s), b[1] - 16 * math.sin(ang + s))],
                        fill=INK,
                        width=3,
                    )
            continue
        if kind == "circle":
            box = [X(x), Y(y), X(x + w), Y(y + h)]
            d.ellipse(box, outline=INK, width=3)
        else:
            box = [X(x), Y(y), X(x + w), Y(y + h)]
            d.rectangle(box, outline=INK, width=3)
        if text:
            cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            tw = d.textlength(text, font=f)
            d.text((cx - tw / 2, cy - 12), text, fill=INK, font=f)
    im.save(out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    step = None
    if "--step" in sys.argv:
        step = int(sys.argv[sys.argv.index("--step") + 1])
    src, out = args[0], args[1]
    data = json.load(open(src))
    if isinstance(data, list):
        shapes = data
    elif "shapes" in data:
        shapes = data["shapes"]
    else:
        shapes = list((data.get("diagram") or {}).get("shapes") or [])
        n = len(data.get("steps") or []) if step is None else step
        for st in (data.get("steps") or [])[:n]:
            shapes += st.get("shapes") or []
    draw_shapes(shapes, out)
    print(f"{out}: {len(shapes)} shapes")


if __name__ == "__main__":
    main()
