"""Interface frames: nine-patch PNGs for panels, slots, buttons, tabs and tooltips.

    bun run assets:build -- ui_frames

Everything is drawn with numpy: dark, faintly mottled iron plate with a bevelled rim, rivets at the
corners and a thin gold inlay. The game slices each image with the margins in MARGINS (keep
godot/scripts/ui/ui_theme.gd in step) and stretches the middle, so the middle must be plain enough to
stretch. Files land in godot/assets/textures/ui/.
"""
import os

import bpy
import numpy as np

import ddk

OUT = os.path.join(ddk.ROOT, "godot", "assets", "textures", "ui")
# name: (size, margin). The margin is what ui_theme.gd uses for the nine-patch.
MARGINS = {
    "panel": (128, 24), "header": (128, 20), "well": (64, 12), "well_border": (64, 8),
    "button": (96, 14), "button_hover": (96, 14), "button_pressed": (96, 14),
    "tab": (96, 14), "tab_active": (96, 14), "tooltip": (96, 14), "bar_tray": (128, 28),
}

IRON = np.array([0.075, 0.066, 0.08])
IRON_HI = np.array([0.32, 0.29, 0.3])
GOLD = np.array([0.80, 0.62, 0.38])
EMBER = np.array([0.85, 0.36, 0.16])


def save_rgba(path, rgba):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    h, w = rgba.shape[:2]
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.pixels.foreach_set(np.flipud(np.clip(rgba, 0, 1)).astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    print("  texture", os.path.relpath(path, ddk.ROOT))


def _edge_distance(size):
    """Distance in pixels from each pixel to the nearest edge of a size x size square."""
    y, x = np.mgrid[0:size, 0:size].astype(float) + 0.5
    return np.minimum(np.minimum(x, size - x), np.minimum(y, size - y)), x, y


def _lit_side(size):
    """True where the nearest edge is the top or the left one (light comes from the top-left)."""
    y, x = np.mgrid[0:size, 0:size].astype(float) + 0.5
    near = np.argmin(np.stack([x, y, size - x, size - y]), axis=0)
    return near < 2


def _plate(size, seed, base=IRON, mottle=0.35):
    """A flat, mottled plate that stretches without visible features."""
    n = ddk.fbm(size, cells=3, octaves=3, seed=seed)
    n = (n - n.min()) / max(1e-6, np.ptp(n))
    return base[None, None, :] * (1.0 - mottle * 0.5 + mottle * n[..., None])


def _rim(rgb, size, width, light=IRON_HI, inlay=GOLD, inlay_at=None, inner_shadow=False):
    """A bevelled rim `width` px wide: lit on the top-left, dark on the bottom-right, plus a gold inlay line."""
    d, x, y = _edge_distance(size)
    rim = d < width
    lit = _lit_side(size)
    bevel = np.clip(1.0 - d / max(width, 1), 0, 1)
    shade = np.where(lit, 0.6 + 0.6 * bevel, 0.35 - 0.2 * bevel)
    rgb = np.where(rim[..., None], light[None, None, :] * shade[..., None], rgb)
    if inlay_at is not None:
        line = np.abs(d - inlay_at) < 0.9
        rgb = np.where(line[..., None], inlay[None, None, :], rgb)
    if inner_shadow:
        s = np.clip(1.0 - (d - width) / 8.0, 0, 1) * (d >= width)
        rgb = rgb * (1.0 - 0.55 * s[..., None])
    return rgb


def _rivets(rgb, size, at, r=2.6):
    _, x, y = _edge_distance(size)
    for cx, cy in [(at, at), (size - at, at), (at, size - at), (size - at, size - at)]:
        dd = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        dome = np.clip(1 - dd / r, 0, 1)
        hi = np.clip(1 - np.sqrt((x - cx + r * 0.35) ** 2 + (y - cy + r * 0.35) ** 2) / (r * 0.6), 0, 1)
        col = IRON_HI * (0.4 + 0.8 * dome[..., None]) + 0.35 * hi[..., None]
        rgb = np.where((dd < r)[..., None], col, rgb)
    return rgb


def _alpha(size, value=1.0):
    return np.full((size, size, 1), value)


def panel():
    s, m = MARGINS["panel"]
    rgb = _plate(s, 11, IRON * 0.95)
    rgb = _rim(rgb, s, 9, inlay_at=12.5, inner_shadow=True)
    rgb = _rivets(rgb, s, 4.5)
    return np.concatenate([rgb, _alpha(s, 0.97)], axis=2)


def header():
    s, m = MARGINS["header"]
    rgb = _plate(s, 12, IRON * 1.3)
    _, x, y = _edge_distance(s)
    glow = np.clip(1 - np.abs(y - s / 2) / (s / 2), 0, 1) ** 2
    rgb = rgb + (EMBER * 0.08)[None, None, :] * glow[..., None]
    rgb = _rim(rgb, s, 5, inlay_at=7.5)
    return np.concatenate([rgb, _alpha(s, 0.98)], axis=2)


def well():
    s, m = MARGINS["well"]
    rgb = _plate(s, 13, IRON * 0.55, 0.25)
    d, x, y = _edge_distance(s)
    # Sunk into the plate: dark top-left inner edge, light bottom-right.
    dark = _lit_side(s)
    edge = d < 4
    rgb = np.where(edge[..., None], np.where(dark[..., None], IRON * 0.25, IRON_HI * 0.55), rgb)
    shadow = np.clip(1 - (d - 4) / 10, 0, 1) * (d >= 4)
    rgb = rgb * (1 - 0.5 * shadow[..., None])
    return np.concatenate([rgb, _alpha(s, 1.0)], axis=2)


def well_border():
    """A white frame the game tints by item rarity; transparent inside."""
    s, m = MARGINS["well_border"]
    d, x, y = _edge_distance(s)
    a = np.clip(1.0 - np.abs(d - 2.5) / 2.0, 0, 1)
    rgb = np.ones((s, s, 3)) * (0.75 + 0.25 * np.clip(1 - d / 5, 0, 1))[..., None]
    return np.concatenate([rgb, a[..., None]], axis=2)


def _button(base, rim_light, inlay, pressed=False):
    s, m = MARGINS["button"]
    rgb = _plate(s, 14, base, 0.25)
    _, x, y = _edge_distance(s)
    grad = (1.1 - 0.3 * (y / s)) if not pressed else (0.85 + 0.2 * (y / s))
    rgb = rgb * grad[..., None]
    rgb = _rim(rgb, s, 4, light=rim_light, inlay=inlay, inlay_at=5.5)
    return np.concatenate([rgb, _alpha(s, 1.0)], axis=2)


def button():
    return _button(IRON * 1.8, IRON_HI, GOLD * 0.7)


def button_hover():
    return _button(IRON * 2.6 + EMBER * 0.05, IRON_HI * 1.3, GOLD)


def button_pressed():
    return _button(IRON * 1.4 + EMBER * 0.08, IRON_HI * 0.9, EMBER, pressed=True)


def tab():
    return _button(IRON * 1.2, IRON_HI * 0.8, GOLD * 0.4)


def tab_active():
    return _button(IRON * 2.2 + EMBER * 0.06, IRON_HI * 1.2, GOLD * 1.05)


def tooltip():
    s, m = MARGINS["tooltip"]
    rgb = _plate(s, 15, np.array([0.04, 0.03, 0.045]), 0.2)
    d, _, _ = _edge_distance(s)
    line = np.abs(d - 2.5) < 1.0
    rgb = np.where(line[..., None], GOLD[None, None, :] * 0.75, rgb)
    corner = (d < 1.5)
    rgb = np.where(corner[..., None], IRON_HI * 0.6, rgb)
    return np.concatenate([rgb, _alpha(s, 0.97)], axis=2)


def bar_tray():
    s, m = MARGINS["bar_tray"]
    rgb = _plate(s, 16, IRON * 1.1)
    rgb = _rim(rgb, s, 10, inlay_at=13.5, inner_shadow=True)
    rgb = _rivets(rgb, s, 5)
    return np.concatenate([rgb, _alpha(s, 0.98)], axis=2)


if __name__ == "__main__":
    for name in MARGINS:
        save_rgba(os.path.join(OUT, f"{name}.png"), globals()[name]())
