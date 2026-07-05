#!/usr/bin/env python3
"""
Stealth Raider — icon generator.

Draws the flying-wing (B-21-style) silhouette on a dark "cockpit HUD"
background and writes PNG icons at the sizes Chrome requires. Pure standard
library (zlib + struct), so it runs anywhere without Pillow.

Usage:  python3 tools/generate-icons.py
Output: src/assets/icons/icon{16,32,48,128}.png
"""

import os
import zlib
import struct
import math

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "icons")

# ---- Cockpit / stealth palette -------------------------------------------------
BG_OUTER = (10, 14, 18)      # near-black hull
BG_INNER = (18, 30, 34)      # deep cockpit teal
HUD_RING = (34, 211, 168)    # phosphor green-teal HUD glow
WING_FILL = (198, 214, 220)  # brushed-titanium skin
WING_EDGE = (108, 208, 190)  # lit leading edge

# Flying-wing silhouette (normalized 0..1, y grows downward).
WING = [
    (0.500, 0.150),   # nose
    (0.940, 0.660),   # right wingtip
    (0.700, 0.600),
    (0.600, 0.740),   # right trailing crank
    (0.500, 0.660),   # centre trailing notch
    (0.400, 0.740),   # left trailing crank
    (0.300, 0.600),
    (0.060, 0.660),   # left wingtip
]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def point_in_poly(px, py, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (
            px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def min_edge_dist(px, py, poly):
    n = len(poly)
    return min(
        dist_to_segment(px, py, poly[i][0], poly[i][1],
                        poly[(i + 1) % n][0], poly[(i + 1) % n][1])
        for i in range(n)
    )


def render(size):
    scale = 4  # supersample for smooth edges
    S = size * scale
    poly = [(x * S, y * S) for (x, y) in WING]
    cx, cy = S / 2.0, S / 2.0
    maxr = S / 2.0
    ring_r = S * 0.46
    ring_w = max(1.0, S * 0.022)
    edge_w = S * 0.010

    buf = bytearray(S * S * 4)
    for y in range(S):
        for x in range(S):
            r = math.hypot(x - cx, y - cy) / maxr  # 0..~1
            # Radial cockpit background.
            col = list(lerp(BG_INNER, BG_OUTER, min(1.0, r)))
            a = 255

            # Circular hull mask (rounded badge).
            if r > 0.99:
                a = 0

            # HUD ring.
            ring_d = abs(math.hypot(x - cx, y - cy) - ring_r)
            if ring_d < ring_w:
                g = 1.0 - (ring_d / ring_w)
                col = [round(col[i] + (HUD_RING[i] - col[i]) * (0.55 * g))
                       for i in range(3)]

            # Wing body + lit leading edge.
            if point_in_poly(x, y, poly):
                d = min_edge_dist(x, y, poly)
                if d < edge_w:
                    col = list(WING_EDGE)
                else:
                    col = list(WING_FILL)
                a = 255

            i = (y * S + x) * 4
            buf[i], buf[i + 1], buf[i + 2], buf[i + 3] = col[0], col[1], col[2], a

    # Downsample (box filter) to target size with alpha.
    out = bytearray(size * size * 4)
    for oy in range(size):
        for ox in range(size):
            rs = gs = bs = as_ = 0
            for sy in range(scale):
                for sx in range(scale):
                    i = ((oy * scale + sy) * S + (ox * scale + sx)) * 4
                    al = buf[i + 3]
                    rs += buf[i] * al
                    gs += buf[i + 1] * al
                    bs += buf[i + 2] * al
                    as_ += al
            o = (oy * size + ox) * 4
            if as_ > 0:
                out[o] = rs // as_
                out[o + 1] = gs // as_
                out[o + 2] = bs // as_
            out[o + 3] = as_ // (scale * scale)
    return bytes(out)


def write_png(path, size, rgba):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        raw += rgba[y * size * 4:(y + 1) * size * 4]
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" +
           chunk(b"IHDR", ihdr) +
           chunk(b"IDAT", zlib.compress(bytes(raw), 9)) +
           chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (16, 32, 48, 128):
        rgba = render(size)
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        write_png(path, size, rgba)
        print(f"wrote {os.path.relpath(path)}")


if __name__ == "__main__":
    main()
