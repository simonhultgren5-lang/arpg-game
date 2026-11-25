"""Material library: tileable PBR texture sets, synthesized with numpy.

    get("stone_wall")  -> {"albedo": path, "normal": path, "roughness": path}

Textures are generated the first time they're asked for in a build (or always with DDK_REBUILD=1)
and land in godot/assets/textures/materials/. The world uses them directly (scripts/world/), and the
model scripts use them through ddk.material(..., textures=get(...)).

Each recipe below is a small function of a seed: change the numbers and rebuild to restyle a material.
"""
import os

import numpy as np

import ddk

WORLD = 1024  # floors and walls fill the screen
DETAIL = 512  # character and prop detail
_made = {}


def _paths(name):
    return {k: os.path.join(ddk.GAME_TEXTURES, f"{name}_{k}.png") for k in ("albedo", "normal", "roughness")}


def get(name):
    if name in _made:
        return _made[name]
    paths = _paths(name)
    if os.environ.get("DDK_REBUILD") or not all(os.path.exists(p) for p in paths.values()):
        print(f"  making {name}")
        albedo, height, rough, strength = RECIPES[name]()
        ddk.save_material_set(name, albedo, height, rough, strength)
    _made[name] = paths
    return paths


# ---------------------------------------------------------------------------- world

def stone_wall():
    """Rough ashlar: courses of uneven blocks, chipped edges, damp at the base of each course."""
    s = WORLD
    ys, xs = np.mgrid[0:s, 0:s] / s
    rows = 6
    row = np.floor(ys * rows)
    offset = (row % 2) * 0.5 + ddk.value_noise(s, 8, 3)[:, :1] * 0.1
    cols = 3 + (row % 3 == 1)
    u = (xs * cols + offset) % 1.0
    v = (ys * rows) % 1.0
    block_id = np.floor(xs * cols + offset) + row * 13
    edge = np.minimum(np.minimum(u, 1 - u) * (1.0 / cols) * rows, np.minimum(v, 1 - v))
    chip = ddk.fbm(s, 8, 5, 11)
    mortar = np.clip((edge - 0.035 - chip * 0.05) / 0.04, 0, 1)
    rnd = np.vectorize(lambda i: (np.sin(i * 12.9898) * 43758.5453) % 1.0)(block_id)
    face = ddk.fbm(s, 6, 6, 5) * 0.6 + ddk.fbm(s, 32, 4, 9) * 0.4
    height = mortar * (0.55 + face * 0.45) + mortar * rnd * 0.08
    tone = 0.25 + rnd * 0.35 + face * 0.4
    albedo = ddk.colorize(tone, [(0, (0.12, 0.11, 0.12)), (0.5, (0.27, 0.25, 0.26)), (1, (0.42, 0.39, 0.37))])
    damp = np.clip(1 - v * 2.2, 0, 1)[..., None] * 0.35
    albedo = albedo * (1 - damp) + np.array([0.08, 0.09, 0.07]) * damp
    albedo = albedo * (0.35 + 0.65 * mortar[..., None])
    rough = 0.72 + 0.2 * (1 - mortar) + 0.06 * face
    return albedo, height, rough, 5.0


def flagstone():
    """The crypt floor: broad worn slabs in a running bond, cracked, with grime in the joints."""
    s = WORLD
    ys, xs = np.mgrid[0:s, 0:s] / s
    rows = 4
    row = np.floor(ys * rows)
    offset = (row % 2) * 0.37
    u = (xs * 2 + offset) % 1.0
    v = (ys * rows) % 1.0
    slab = np.floor(xs * 2 + offset) + row * 7
    edge = np.minimum(np.minimum(u, 1 - u) / 2 * rows, np.minimum(v, 1 - v))
    wear = ddk.fbm(s, 5, 6, 21)
    joint = np.clip((edge - 0.02 - wear * 0.03) / 0.03, 0, 1)
    d1, d2, _ = ddk.cells(s, 40, 77)
    crack = np.clip(1 - (d2 - d1) / 0.006, 0, 1) * (ddk.fbm(s, 4, 3, 5) > 0.55)
    rnd = np.vectorize(lambda i: (np.sin(i * 78.233) * 43758.5453) % 1.0)(slab)
    grain = ddk.fbm(s, 64, 3, 31)
    height = joint * (0.6 + wear * 0.3 + grain * 0.1) - crack * 0.3
    tone = 0.3 + rnd * 0.25 + wear * 0.35 + grain * 0.1
    albedo = ddk.colorize(tone, [(0, (0.13, 0.12, 0.12)), (0.6, (0.3, 0.28, 0.27)), (1, (0.42, 0.4, 0.38))])
    albedo *= (0.3 + 0.7 * joint[..., None]) * (1 - 0.6 * crack[..., None])
    rough = 0.65 + 0.25 * wear + 0.1 * (1 - joint)
    return albedo, height, rough, 4.0


def cobble():
    """Hollowmere's streets: rounded setts packed in dark soil."""
    s = WORLD
    d1, d2, nid = ddk.cells(s, 110, 5, jitter=0.75)
    stone = np.clip((d2 - d1) / 0.035, 0, 1)
    dome = np.sqrt(stone)
    rnd = (np.sin(nid * 12.9898) * 43758.5453) % 1.0
    face = ddk.fbm(s, 24, 4, 8)
    height = dome * (0.8 + face * 0.2)
    tone = 0.3 + rnd * 0.4 + face * 0.3
    stone_col = ddk.colorize(tone, [(0, (0.15, 0.14, 0.15)), (0.5, (0.27, 0.25, 0.27)), (1, (0.4, 0.38, 0.38))])
    soil = np.array([0.07, 0.06, 0.05])
    m = np.clip(stone * 1.6, 0, 1)[..., None]
    albedo = stone_col * m + soil * (1 - m)
    rough = 0.55 + 0.35 * (1 - stone) + 0.1 * face
    return albedo, height, rough, 6.0


def earth():
    """Trodden mud with pebbles and the odd dead grass tuft."""
    s = WORLD
    base = ddk.fbm(s, 6, 6, 41)
    d1, d2, _ = ddk.cells(s, 260, 9, jitter=1.0)
    pebble = np.clip(1 - d1 / 0.012, 0, 1) * (ddk.value_noise(s, 16, 3) > 0.5)
    grass = np.clip((ddk.fbm(s, 12, 5, 77) - 0.58) * 6, 0, 1) * (ddk.fbm(s, 128, 2, 7) > 0.5)
    height = base * 0.6 + pebble * 0.5 + grass * 0.3
    albedo = ddk.colorize(base, [(0, (0.05, 0.04, 0.03)), (1, (0.14, 0.11, 0.08))])
    albedo = albedo * (1 - pebble[..., None]) + np.array([0.24, 0.22, 0.2]) * pebble[..., None]
    albedo = albedo * (1 - grass[..., None]) + np.array([0.16, 0.15, 0.08]) * grass[..., None]
    rough = 0.85 + 0.1 * base
    return albedo, height, rough, 3.0


def timber():
    """Dark weathered planks with grain, knots and gaps."""
    s = DETAIL
    ys, xs = np.mgrid[0:s, 0:s] / s
    planks = 5
    p = np.floor(xs * planks)
    u = (xs * planks) % 1.0
    rnd = (np.sin(p * 91.7) * 43758.5453) % 1.0
    grain = ddk.value_noise(s, 64, 13)
    stretch = np.sin((u * 40 + ddk.fbm(s, 4, 4, 2) * 12 + rnd * 9) + ys * 3) * 0.5 + 0.5
    gap = np.clip(np.minimum(u, 1 - u) / 0.04, 0, 1)
    height = gap * (0.7 + stretch * 0.2 + grain * 0.1)
    tone = 0.3 + stretch * 0.35 + rnd * 0.25
    albedo = ddk.colorize(tone, [(0, (0.06, 0.04, 0.03)), (0.6, (0.17, 0.11, 0.07)), (1, (0.27, 0.18, 0.11))])
    albedo *= (0.25 + 0.75 * gap[..., None])
    rough = 0.75 + 0.2 * stretch
    return albedo, height, rough, 3.0


def plaster():
    """Old lime plaster: uneven, cracked, stained by rain."""
    s = DETAIL
    base = ddk.fbm(s, 4, 6, 71)
    d1, d2, _ = ddk.cells(s, 24, 99)
    crack = np.clip(1 - (d2 - d1) / 0.01, 0, 1) * (ddk.fbm(s, 3, 3, 1) > 0.6)
    ys = np.mgrid[0:s, 0:s][0] / s
    stain = np.clip(ddk.fbm(s, 8, 4, 12) * (1 - ys) * 1.4 - 0.4, 0, 1)
    height = base * 0.5 - crack * 0.4
    albedo = ddk.colorize(base, [(0, (0.33, 0.3, 0.26)), (1, (0.5, 0.46, 0.4))])
    albedo = albedo * (1 - stain[..., None] * 0.5) * (1 - crack[..., None] * 0.6)
    rough = 0.9 - base * 0.05
    return albedo, height, rough, 2.0


def roof_slate():
    """Overlapping slate shingles in staggered rows."""
    s = DETAIL
    ys, xs = np.mgrid[0:s, 0:s] / s
    rows = 8
    row = np.floor(ys * rows)
    u = (xs * 6 + (row % 2) * 0.5) % 1.0
    v = (ys * rows) % 1.0
    tile = np.floor(xs * 6 + (row % 2) * 0.5) + row * 17
    rnd = (np.sin(tile * 37.1) * 43758.5453) % 1.0
    edge = np.clip(np.minimum(u, 1 - u) / 0.05, 0, 1)
    height = v * 0.8 * edge + ddk.fbm(s, 16, 4, 3) * 0.2
    tone = 0.3 + rnd * 0.4 + ddk.fbm(s, 32, 3, 8) * 0.3
    albedo = ddk.colorize(tone, [(0, (0.06, 0.06, 0.08)), (1, (0.2, 0.19, 0.23))]) * (0.4 + 0.6 * edge[..., None]) * (0.6 + 0.4 * v[..., None])
    rough = 0.6 + rnd * 0.2
    return albedo, height, rough, 5.0


# ---------------------------------------------------------------------------- characters and props

def steel():
    """Worn blackened steel: fine scratches, pitting, rust in the low spots (pair with metallic=1)."""
    s = DETAIL
    ys, xs = np.mgrid[0:s, 0:s] / s
    scratches = np.zeros((s, s))
    rng = np.random.default_rng(5)
    for _ in range(140):
        a = rng.random() * np.pi
        c = rng.random(2)
        d = np.abs((xs - c[0]) * np.sin(a) - (ys - c[1]) * np.cos(a))
        along = np.abs((xs - c[0]) * np.cos(a) + (ys - c[1]) * np.sin(a))
        scratches = np.maximum(scratches, np.clip(1 - d / 0.0018, 0, 1) * (along < rng.random() * 0.2) * rng.random())
    pits = np.clip((ddk.fbm(s, 32, 3, 9) - 0.62) * 8, 0, 1)
    rust = np.clip((ddk.fbm(s, 6, 5, 33) - 0.6) * 4, 0, 1)
    height = 0.5 - pits * 0.3 - scratches * 0.15
    albedo = np.full((s, s, 3), 0.55) + scratches[..., None] * 0.25
    albedo = albedo * (1 - rust[..., None]) + np.array([0.3, 0.13, 0.06]) * rust[..., None]
    rough = 0.38 + pits * 0.3 + rust * 0.45 - scratches * 0.15
    return albedo, height, rough, 2.0


def leather():
    """Pebbled leather with wear on the high spots."""
    s = DETAIL
    d1, d2, _ = ddk.cells(s, 900, 4, jitter=1.0)
    pebble = np.clip((d2 - d1) / 0.01, 0, 1)
    wear = ddk.fbm(s, 6, 4, 2)
    height = pebble * 0.6 + wear * 0.4
    albedo = np.full((s, s, 3), 0.6) * (0.75 + 0.25 * pebble[..., None]) * (0.8 + 0.3 * wear[..., None])
    rough = 0.55 + 0.3 * (1 - pebble)
    return albedo, height, rough, 2.5


def cloth():
    """Coarse wool weave with frayed patches (light grey, tinted per material)."""
    s = DETAIL
    ys, xs = np.mgrid[0:s, 0:s] / s
    n = 40  # a broad, soft wool weave: finer reads as moire (knitted rope) at game distance
    warp = np.sin(xs * n * 2 * np.pi) * 0.5 + 0.5
    weft = np.sin(ys * n * 2 * np.pi) * 0.5 + 0.5
    over = ((np.floor(xs * n) + np.floor(ys * n)) % 2)[..., None][..., 0]
    weave = np.where(over > 0, warp, weft)
    fuzz = ddk.fbm(s, 64, 3, 5)
    worn = np.clip((ddk.fbm(s, 5, 4, 9) - 0.6) * 3, 0, 1)
    height = weave * 0.6 + fuzz * 0.4 - worn * 0.3
    albedo = np.full((s, s, 3), 0.62) * (0.84 + 0.16 * weave[..., None]) * (0.9 + 0.2 * fuzz[..., None]) * (1 - worn[..., None] * 0.3)
    rough = 0.92 - weave * 0.05
    return albedo, height, rough, 1.1


def skin():
    """Pale, slightly mottled skin (tinted per material)."""
    s = DETAIL
    m = ddk.fbm(s, 8, 5, 3)
    pores = ddk.value_noise(s, 256, 7)
    height = m * 0.3 + pores * 0.2
    albedo = np.full((s, s, 3), 0.8) * (0.85 + 0.15 * m[..., None])
    rough = 0.55 + 0.15 * pores
    return albedo, height, rough, 1.0


def bone():
    """Old bone: porous, yellowed, with dark cracks."""
    s = DETAIL
    m = ddk.fbm(s, 6, 6, 61)
    d1, d2, _ = ddk.cells(s, 14, 3)
    crack = np.clip(1 - (d2 - d1) / 0.004, 0, 1) * (ddk.fbm(s, 4, 3, 2) > 0.62)
    pores = np.clip((ddk.value_noise(s, 128, 5) - 0.7) * 5, 0, 1)
    height = m * 0.5 - crack * 0.4 - pores * 0.2
    albedo = ddk.colorize(m, [(0, (0.55, 0.5, 0.4)), (1, (0.8, 0.76, 0.66))]) * (1 - crack[..., None] * 0.7) * (1 - pores[..., None] * 0.3)
    rough = 0.55 + pores * 0.25 + m * 0.1
    return albedo, height, rough, 1.4


RECIPES = {
    "stone_wall": stone_wall, "flagstone": flagstone, "cobble": cobble, "earth": earth,
    "timber": timber, "plaster": plaster, "roof_slate": roof_slate,
    "steel": steel, "leather": leather, "cloth": cloth, "skin": skin, "bone": bone,
}


if __name__ == "__main__":
    # Blender runs this file directly to (re)make every texture set.
    ddk.reset()
    for name in RECIPES:
        get(name)
