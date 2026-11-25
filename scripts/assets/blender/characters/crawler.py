"""The Grave Crawler: a long, low carrion thing with a segmented bony back, six jointed legs and a
mandibled head. Its own rig: body, head and three pairs of two-part legs; a tripod gait (front and
back legs of one side move with the middle leg of the other). Builds characters/crawler.glb."""
import math

import ddk
import materials

ddk.reset()
hide = ddk.material("crawler_hide", (0.3, 0.25, 0.25), 0.7, 0.0, materials.get("skin"), scale=2.0)
plate = ddk.material("crawler_plate", (0.55, 0.5, 0.44), 0.6, 0.0, materials.get("bone"), scale=2.0)
eyes = ddk.material("crawler_eyes", (1.0, 0.3, 0.2), 0.5, emission=(1.0, 0.2, 0.1), emission_strength=6.0)

LEGS = [("front", -0.35), ("mid", 0.0), ("back", 0.35)]
bones = [("root", (0, 0, 0), (0, 0, 0.2), None), ("body", (0, 0.45, 0.42), (0, -0.4, 0.42), "root"),
         ("head", (0, -0.4, 0.42), (0, -0.7, 0.4), "body")]
for name, y in LEGS:
    bones.append((f"leg_{name}.L", (0.16, y, 0.42), (0.5, y - 0.05, 0.55), "body"))
    bones.append((f"foot_{name}.L", (0.5, y - 0.05, 0.55), (0.72, y - 0.08, 0.0), f"leg_{name}.L"))
arm = ddk.armature("crawler_rig", bones)

joints = {"tail": ((0, 0.6, 0.35), 0.1, 0.08), "rear": ((0, 0.35, 0.42), 0.2, 0.16), "mid": ((0, 0.0, 0.45), 0.24, 0.17),
          "front": ((0, -0.33, 0.43), 0.19, 0.15), "neck": ((0, -0.48, 0.42), 0.11, 0.1), "head": ((0, -0.62, 0.4), 0.13, 0.11),
          "snout": ((0, -0.76, 0.36), 0.07, 0.06)}
edges = [("tail", "rear"), ("rear", "mid"), ("mid", "front"), ("front", "neck"), ("neck", "head"), ("head", "snout")]
for name, y in LEGS:
    for s, side in ((1, "L"), (-1, "R")):
        joints[f"hip_{name}.{side}"] = ((s * 0.16, y, 0.42), 0.06, 0.06)
        joints[f"knee_{name}.{side}"] = ((s * 0.5, y - 0.05, 0.55), 0.045, 0.045)
        joints[f"toe_{name}.{side}"] = ((s * 0.72, y - 0.08, 0.02), 0.02, 0.02)
        edges += [("mid" if name == "mid" else ("front" if name == "front" else "rear"), f"hip_{name}.{side}"),
                  (f"hip_{name}.{side}", f"knee_{name}.{side}"), (f"knee_{name}.{side}", f"toe_{name}.{side}")]
body = ddk.skin_body("crawler_body", joints, edges, hide)
ddk.uv_unwrap(body, 2.0)
ddk.bind_body(body, arm)


def bind(obj, bone):
    ddk.select_only(obj)
    ddk.bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ddk.apply_modifiers(obj)
    ddk.uv_unwrap(obj, 2.0)
    ddk.attach(obj, arm, bone)


for i in range(5):  # overlapping bony plates down the back
    y = 0.45 - i * 0.2
    p = ddk.lathe(f"plate{i}", [(0.0, 0.12), (0.18, 0.08), (0.24, 0.0), (0.22, -0.03)], 20, plate)
    p.location = (0, y, 0.52 - abs(i - 2) * 0.02)
    p.scale = (1.0, 0.65, 1.0)
    bind(p, "body")
    spike = ddk.prim("cone", f"spine{i}", (0.06, 0.06, 0.14), (0, y + 0.03, 0.66), (math.radians(30), 0, 0), 6, mat=plate)
    bind(spike, "body")
for s in (1, -1):
    for k in range(2):
        eye = ddk.prim("sphere", "eye", (0.035, 0.03, 0.03), (s * (0.06 + k * 0.035), -0.7 + k * 0.04, 0.47 - k * 0.02), segments=8, mat=eyes)
        bind(eye, "head")
    mand = ddk.prim("cone", "mandible", (0.05, 0.05, 0.2), (s * 0.07, -0.84, 0.32), (math.radians(-80), 0, math.radians(s * 25)), 6, mat=plate)
    bind(mand, "head")

# ---- animation: legs swing forward/back (Z) and lift (Y) in two alternating tripods.
def legs(phase_fn, lift_fn, length, steps=8):
    keys = {}
    for name, _ in LEGS:
        for s, side in ((1, "L"), (-1, "R")):
            group = (name == "mid") == (side == "L")  # tripod A or B
            off = 0 if group else math.pi
            keys[f"leg_{name}.{side}"] = ddk.sine_track(length, steps, lambda p, off=off, s=s: (0, s * lift_fn(p + off), phase_fn(p + off)))
            keys[f"foot_{name}.{side}"] = ddk.sine_track(length, steps, lambda p, off=off, s=s: (0, -s * lift_fn(p + off) * 0.6, 0))
    return keys


walk = legs(lambda p: 22 * math.sin(p), lambda p: max(0, 18 * math.cos(p)), 0.6)
walk["body"] = ddk.sine_track(0.6, 8, lambda p: (0, 3 * math.sin(p * 2), 2 * math.sin(p)))
ddk.clip(arm, "walk", 0.6, walk, loop=True)
idle = legs(lambda p: 3 * math.sin(p), lambda p: 2 * math.sin(p), 2.0, 4)
idle["head"] = ddk.sine_track(2.0, 4, lambda p: (4 * math.sin(p), 0, 6 * math.sin(p * 0.5)))
ddk.clip(arm, "idle", 2.0, idle, loop=True)
ddk.clip(arm, "attack", 0.5, {
    "body": [(0, (0, 0, 0)), (0.15, (-12, 0, 0)), (0.25, (10, 0, 0)), (0.5, (0, 0, 0))],
    "head": [(0, (0, 0, 0)), (0.15, (-25, 0, 0)), (0.25, (20, 0, 0)), (0.5, (0, 0, 0))],
    "root@loc": [(0, (0, 0, 0)), (0.25, (0, -0.25, 0)), (0.5, (0, 0, 0))],
})
ddk.clip(arm, "cast", 0.5, {"head": [(0, (0, 0, 0)), (0.25, (-20, 0, 0)), (0.5, (0, 0, 0))]})
ddk.clip(arm, "hit", 0.35, {"body": [(0, (0, 0, 0)), (0.1, (8, 0, 6)), (0.35, (0, 0, 0))], "root@loc": [(0, (0, 0, 0)), (0.1, (0, 0, 0.05)), (0.35, (0, 0, 0))]})
death = {"root": [(0, (0, 0, 0)), (0.5, (0, 170, 0)), (0.8, (0, 180, 0))], "root@loc": [(0, (0, 0, 0)), (0.4, (0, 0, 0.3)), (0.8, (0, 0, 0.45))]}
for name, _ in LEGS:
    for s, side in ((1, "L"), (-1, "R")):
        death[f"leg_{name}.{side}"] = [(0, (0, 0, 0)), (0.8, (0, s * 40, 10))]
        death[f"foot_{name}.{side}"] = [(0, (0, 0, 0)), (0.8, (0, -s * 60, 0))]
ddk.clip(arm, "death", 0.8, death)

ddk.export("characters", "crawler")
ddk.preview("crawler", distance=3.4, height=1.2, target_z=0.3)
