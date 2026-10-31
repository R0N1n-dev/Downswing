#!/usr/bin/env python3
"""Render the legacy (API 24-25) launcher PNGs for the sticker-bolt mark.

The adaptive icon is vector-only; pre-26 launchers need real PNGs at five densities.
Same art as drawable/ic_launcher_foreground.xml on the flat butter background:
an open ink progress ring (gap at the top) around a mint speed bolt that carries its
own ink outline and a hard offset shadow — the sticker language the app is built on.
"""
import math
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
SS = 4  # supersample factor for clean antialiasing
K = 1.45  # adaptive icons crop to the inner 72/108; the full-bleed square matches that crop

BUTTER = (0xFF, 0xF3, 0xB0)
INK = (0x0E, 0x0E, 0x10)
MINT = (0xA8, 0xE6, 0xCF)

BOLT = [(56.2, 32), (34.2, 58.4), (54, 58.4), (51.8, 76), (73.8, 49.6), (54, 49.6)]


def make_icon(size, circle):
    big = size * SS
    s = big / 108.0 * K
    c = big / 2.0

    def X(x):
        return c + (x - 54) * s

    def pts(path, dx=0.0, dy=0.0):
        return [(X(x + dx), X(y + dy)) for x, y in path]

    base = Image.new("RGBA", (big, big), BUTTER + (255,))
    d = ImageDraw.Draw(base)

    # Open ink ring: r 27, stroke 9, gap at the top, round caps.
    r = 27 * s
    w = 4.5 * s
    d.arc([c - r, c - r, c + r, c + r], start=298, end=602, fill=INK + (255,), width=round(2 * w))
    for ang in (298, 242):
        rad = math.radians(ang)
        x, y = c + r * math.cos(rad), c + r * math.sin(rad)
        d.ellipse([x - w, y - w, x + w, y + w], fill=INK + (255,))

    # Hard offset shadow, then the mint bolt with its ink outline.
    d.polygon(pts(BOLT, 3.5, 3.5), fill=INK + (255,))
    d.polygon(pts(BOLT), fill=MINT + (255,), outline=INK + (255,), width=max(1, round(3.5 * s)))

    if circle:
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, big - 1, big - 1], fill=255)
        base.putalpha(mask)
    return base.resize((size, size), Image.LANCZOS)


def main():
    for density, size in SIZES.items():
        folder = os.path.join(OUT, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        make_icon(size, circle=False).save(os.path.join(folder, "ic_launcher.png"))
        make_icon(size, circle=True).save(os.path.join(folder, "ic_launcher_round.png"))
        print(f"{density}: {size}px ok")


if __name__ == "__main__":
    main()
