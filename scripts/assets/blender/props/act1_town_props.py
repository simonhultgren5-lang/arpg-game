"""Act I town and crypt dressing: brazier, bone pile, handcart, dead tree.
Same rules as act1_props.py: props/<name>.gltf (+ .blend), origin on the floor at the centre.
Each has a code-built fallback in godot/scripts/models/props_model.gd, so these can land at any time."""
import math

import ddk
import materials


def mats():
    return {
        "wood": ddk.material("wood", (0.9, 0.85, 0.8), 0.8, 0.0, materials.get("timber"), scale=1.0),
        "iron": ddk.material("iron", (0.28, 0.27, 0.29), 0.5, 0.9, materials.get("steel"), scale=1.5),
        "bone": ddk.material("bone", (0.8, 0.76, 0.66), 0.65, 0.0, materials.get("bone"), scale=2.0),
        "ember": ddk.material("ember", (1.0, 0.4, 0.12), 0.6, emission=(1.0, 0.35, 0.08), emission_strength=1.6),
        "bark": ddk.material("bark", (0.2, 0.17, 0.15), 0.95, 0.0, materials.get("timber"), scale=1.5),
    }


def done(name):
    for o in list(ddk.bpy.data.objects):
        if o.type == "MESH":
            ddk.select_only(o)
            ddk.bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            ddk.apply_modifiers(o)
            ddk.uv_unwrap(o, 1.0)
    ddk.export("props", name)
    ddk.preview(name, distance=3.2, height=0.9, target_z=0.7)


# ---------------------------------------------------------------------------- brazier (~1.2 m, 1.5 k tris)
ddk.reset()
m = mats()
for i in range(3):
    a = i * math.tau / 3
    ddk.prim("cyl", f"leg{i}", (0.035, 0.035, 0.95), (math.cos(a) * 0.26, math.sin(a) * 0.26, 0.47),
             (math.sin(a) * 0.28, -math.cos(a) * 0.28, 0), 8, mat=m["iron"])
ddk.lathe("bowl", [(0.0, 0.0), (0.2, 0.02), (0.42, 0.22), (0.46, 0.27), (0.4, 0.27), (0.2, 0.1), (0.0, 0.08)], 20, m["iron"], loc=(0, 0, 0.86))
ddk.lathe("rim_ring", [(0.44, 0.0), (0.48, 0.02), (0.48, 0.06), (0.44, 0.05)], 20, m["iron"], loc=(0, 0, 1.1))
ddk.lathe("coals", [(0.0, 0.0), (0.36, 0.0), (0.38, 0.05), (0.0, 0.1)], 14, m["ember"], loc=(0, 0, 1.04))
# The flame itself is animated in the game (shaders/torch_flame.gdshader), so only the coals are modelled.
done("brazier")

# ---------------------------------------------------------------------------- bone pile (~0.9 m wide)
ddk.reset()
m = mats()
import random
r = random.Random(7)
for i in range(9):
    a = r.random() * math.tau
    d = r.uniform(0.05, 0.4)
    ddk.prim("cyl", f"long_bone{i}", (0.03, 0.03, r.uniform(0.35, 0.55)), (math.cos(a) * d, math.sin(a) * d, 0.05 + r.random() * 0.08),
             (math.pi / 2 + r.uniform(-0.2, 0.2), r.uniform(-0.2, 0.2), r.random() * math.tau), 8, bevel=0.005, mat=m["bone"])
    for end in (-1, 1):
        ddk.prim("sphere", f"knuckle{i}_{end}", (0.045, 0.045, 0.045), (math.cos(a) * d + end * 0.2 * math.cos(a), math.sin(a) * d + end * 0.2 * math.sin(a), 0.07), segments=8, mat=m["bone"])
ddk.prim("sphere", "skull", (0.12, 0.15, 0.13), (0.05, 0.02, 0.14), segments=14, mat=m["bone"])
ddk.prim("box", "jaw", (0.09, 0.1, 0.03), (0.05, -0.1, 0.07), bevel=0.01, mat=m["bone"])
for ribs in range(5):
    ddk.prim("torus", f"rib{ribs}", (0.14, 0.14, 0.14), (-0.3 + ribs * 0.04, 0.25, 0.1), (math.pi / 2, 0, 0.4 * ribs), segments=10, mat=m["bone"])
done("bone_pile")

# ---------------------------------------------------------------------------- broken handcart (~1.6 m long)
ddk.reset()
m = mats()
ddk.prim("box", "bed", (1.5, 0.9, 0.1), (0, 0, 0.55), bevel=0.015, mat=m["wood"])
for s in (-1, 1):
    ddk.prim("box", f"side{s}", (1.5, 0.07, 0.34), (0, s * 0.45, 0.76), bevel=0.01, mat=m["wood"])
    ddk.prim("box", f"shaft{s}", (1.7, 0.06, 0.07), (-1.15, s * 0.3, 0.18), (0, math.radians(-10), 0), bevel=0.01, mat=m["wood"])
ddk.prim("box", "tailgate", (0.07, 0.9, 0.34), (0.72, 0, 0.76), bevel=0.01, mat=m["wood"])
ddk.lathe("wheel", [(0.0, -0.04), (0.5, -0.04), (0.5, 0.04), (0.0, 0.04)], 18, m["wood"], loc=(0, 0.52, 0.5), rot=(math.pi / 2, 0, 0))
ddk.lathe("tire", [(0.5, -0.05), (0.54, -0.05), (0.54, 0.05), (0.5, 0.05)], 18, m["iron"], loc=(0, 0.52, 0.5), rot=(math.pi / 2, 0, 0))
done("handcart")

# ---------------------------------------------------------------------------- dead tree (~5 m)
ddk.reset()
m = mats()
trunk = ddk.lathe("trunk", [(0.0, 0.0), (0.4, 0.0), (0.3, 0.8), (0.2, 2.2), (0.12, 4.2), (0.0, 5.0)], 12, m["bark"])
ddk.displace(trunk, 0.05, 0.4, seed=3)
for i in range(5):
    a = i * 2.4
    z = 2.4 + i * 0.5
    ddk.prim("cone", f"branch{i}", (0.1, 0.1, 1.8 - i * 0.2), (math.cos(a) * 0.55, math.sin(a) * 0.55, z + 0.4),
             (math.sin(a) * 1.0, -math.cos(a) * 1.0, 0), 6, mat=m["bark"])
done("dead_tree")


# =============================================================================== building kit
# Pieces the town hangs on its blocky houses, chapel and well. Front faces -Y (Godot +Z).
def kit_mats():
    m = mats()
    m["stone"] = ddk.material("stone", (0.62, 0.6, 0.6), 0.8, 0.0, materials.get("stone_wall"), scale=0.6)
    m["brick"] = ddk.material("brick", (0.55, 0.42, 0.42), 0.9, 0.0, materials.get("stone_wall"), scale=1.2)
    m["pane_lit"] = ddk.material("pane_lit", (1.0, 0.6, 0.25), 0.4, emission=(1.0, 0.5, 0.2), emission_strength=3.0)
    m["pane_dark"] = ddk.material("pane_dark", (0.03, 0.03, 0.05), 0.2)
    m["rope"] = ddk.material("rope", (0.45, 0.38, 0.28), 0.95, 0.0, materials.get("cloth"), scale=3.0)
    m["glass"] = ddk.material("rose_glass", (0.5, 0.2, 0.5), 0.3, emission=(0.7, 0.25, 0.45), emission_strength=2.0)
    return m


def kit_done(name, dist=4.0, h=1.0, tz=1.0):
    for o in list(ddk.bpy.data.objects):
        if o.type == "MESH":
            ddk.select_only(o)
            ddk.bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            ddk.apply_modifiers(o)
            ddk.uv_unwrap(o, 1.0)
    ddk.export("props", name)
    ddk.preview(name, distance=dist, height=h, target_z=tz)


def window(name, pane):
    ddk.reset()
    m = kit_mats()
    ddk.prim("box", "pane", (0.62, 0.04, 0.62), (0, -0.01, 0), mat=m[pane])
    for s in (-1, 1):
        ddk.prim("box", f"jamb{s}", (0.08, 0.12, 0.82), (s * 0.36, -0.03, 0), bevel=0.01, mat=m["wood"])
        ddk.prim("box", f"shutter{s}", (0.3, 0.05, 0.78), (s * 0.58, -0.08, 0), (0, 0, math.radians(s * 4)), bevel=0.008, mat=m["wood"])
        ddk.prim("box", f"shutter_slat{s}", (0.26, 0.06, 0.03), (s * 0.58, -0.1, 0.1), bevel=0.004, mat=m["wood"])
    ddk.prim("box", "head", (0.86, 0.12, 0.08), (0, -0.03, 0.4), bevel=0.01, mat=m["wood"])
    ddk.prim("box", "sill", (1.04, 0.3, 0.1), (0, -0.12, -0.43), bevel=0.015, mat=m["stone"])
    ddk.prim("box", "mullion_v", (0.04, 0.08, 0.64), (0, -0.04, 0), mat=m["wood"])
    ddk.prim("box", "mullion_h", (0.64, 0.08, 0.04), (0, -0.04, 0), mat=m["wood"])
    kit_done(name, 2.6, 0.2, 0.0)


window("house_window_lit", "pane_lit")
window("house_window_dark", "pane_dark")

# ---------------------------------------------------------------------------- house door (origin at threshold)
ddk.reset()
m = kit_mats()
ddk.prim("box", "door", (0.96, 0.08, 1.9), (0, -0.04, 0.95), bevel=0.01, mat=m["wood"])
for i in range(5):
    ddk.prim("box", f"plank_gap{i}", (0.015, 0.09, 1.86), (-0.38 + i * 0.19, -0.05, 0.95), mat=m["iron"])
for z in (0.4, 1.5):
    ddk.prim("box", f"strap{z}", (0.9, 0.1, 0.07), (0, -0.07, z), bevel=0.005, mat=m["iron"])
ddk.prim("sphere", "ring_pull", (0.05, 0.02, 0.05), (0.3, -0.12, 1.0), segments=8, mat=m["iron"])
for s in (-1, 1):
    ddk.prim("box", f"post{s}", (0.14, 0.2, 2.05), (s * 0.58, -0.05, 1.02), bevel=0.015, mat=m["wood"])
ddk.prim("box", "lintel", (1.5, 0.22, 0.16), (0, -0.06, 2.08), bevel=0.02, mat=m["stone"])
ddk.prim("box", "step", (1.3, 0.5, 0.12), (0, -0.3, 0.06), bevel=0.02, mat=m["stone"])
kit_done("house_door", 3.4, 0.9, 1.0)

# ---------------------------------------------------------------------------- chimney (origin at base; ~2.3 m)
ddk.reset()
m = kit_mats()
shaft = ddk.prim("box", "stack", (0.72, 0.68, 2.25), (0, 0, 1.12), bevel=0.02, mat=m["brick"])
ddk.displace(shaft, 0.012, 0.25, seed=2, subdivide=2)
ddk.prim("box", "cap", (0.9, 0.86, 0.17), (0, 0, 2.3), bevel=0.02, mat=m["brick"])
for x in (-0.17, 0.17):
    ddk.lathe(f"pot{x}", [(0.1, 0.0), (0.12, 0.15), (0.1, 0.28), (0.12, 0.3)], 12, m["brick"], loc=(x, 0, 2.38))
kit_done("chimney", 4.0, 1.4, 1.1)

# ---------------------------------------------------------------------------- the well (origin at centre, ~3.0 m tall)
ddk.reset()
m = kit_mats()
ring = ddk.lathe("curb", [(0.98, 0.0), (1.34, 0.0), (1.4, 0.5), (1.38, 1.0), (1.3, 1.04), (1.0, 1.04), (0.98, 0.5)], 18, m["stone"])
ddk.displace(ring, 0.02, 0.3, seed=5, subdivide=0)
ddk.lathe("water", [(0.0, 0.0), (0.99, 0.0)], 18, m["pane_dark"], loc=(0, 0, 0.6), closed_top=False)
for s in (-1, 1):
    ddk.prim("box", f"post{s}", (0.2, 0.2, 2.6), (s * 1.1, 0, 1.3), bevel=0.02, mat=m["wood"])
    ddk.prim("box", f"brace{s}", (0.1, 0.1, 0.8), (s * 0.95, 0, 2.2), (0, math.radians(s * 45), 0), bevel=0.01, mat=m["wood"])
ddk.prim("cyl", "windlass", (0.09, 0.09, 2.3), (0, 0, 2.15), (0, math.pi / 2, 0), 10, mat=m["wood"])
ddk.prim("cyl", "crank", (0.04, 0.04, 0.5), (1.3, 0, 2.15), (0, 0, 0), 6, mat=m["iron"])
ddk.prim("cyl", "rope", (0.02, 0.02, 1.2), (0, 0.08, 1.55), (0, 0, 0), 6, mat=m["rope"])
ddk.lathe("bucket", [(0.0, 0.0), (0.12, 0.0), (0.15, 0.25), (0.0, 0.25)], 10, m["wood"], loc=(0, 0.08, 0.85))
for s in (-1, 1):
    ddk.prim("box", f"roof_plank{s}", (3.0, 1.0, 0.07), (0, s * 0.5, 3.0 - 0.0), (math.radians(-s * 32), 0, 0), bevel=0.01, mat=m["wood"])
kit_done("well", 7.0, 2.5, 1.4)

# ---------------------------------------------------------------------------- chapel rose window (origin at its centre)
ddk.reset()
m = kit_mats()
ddk.lathe("glass", [(0.0, 0.0), (0.8, 0.0)], 24, m["glass"], rot=(math.pi / 2, 0, 0), closed_top=False)
ddk.lathe("ring_outer", [(0.8, -0.1), (0.95, -0.1), (0.95, 0.06), (0.8, 0.06)], 24, m["stone"], rot=(math.pi / 2, 0, 0))
for i in range(8):
    a = i * math.pi / 8
    ddk.prim("box", f"spoke{i}", (0.05, 0.06, 1.6), (0, -0.03, 0), (0, a, 0), mat=m["stone"])
ddk.lathe("hub", [(0.0, -0.09), (0.18, -0.09), (0.18, 0.04), (0.0, 0.04)], 16, m["stone"], rot=(math.pi / 2, 0, 0))
kit_done("rose_window", 4.0, 0.0, 0.0)
