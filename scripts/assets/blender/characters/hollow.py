"""The Hollow: a risen townsman, gaunt and hunched, in the rags of his burial shroud, long clawed
hands hanging. Builds characters/hollow.glb (+ .blend). The game tints it for elites."""
import math

import ddk
import humanoid
import materials

ddk.reset()
flesh = ddk.material("hollow_flesh", (0.42, 0.45, 0.38), 0.7, 0.0, materials.get("skin"), scale=2.0)
shroud = ddk.material("shroud", (0.32, 0.29, 0.25), 0.95, 0.0, materials.get("cloth"), scale=2.5)
bone = ddk.material("claw_bone", (0.75, 0.7, 0.6), 0.6, 0.0, materials.get("bone"), scale=3.0)
eyes = ddk.material("hollow_eyes", (0.6, 0.9, 1.0), 0.5, emission=(0.5, 0.9, 1.0), emission_strength=5.0)
dark = ddk.material("hollow_dark", (0.02, 0.02, 0.02), 1.0)

# Hunched: chest, neck and head lean forward and down; the bones follow the same curve.
lean = {"chest": (0, -0.12, -0.06), "neck": (0, -0.26, -0.14), "head": (0, -0.33, -0.2), "headtop": (0, -0.37, -0.22),
        "shoulder.L": (0, -0.11, -0.07), "elbow.L": (0, -0.14, -0.08), "wrist.L": (0, -0.14, -0.1), "hand.L": (0, -0.14, -0.12)}
joints = {}
for k, (p, rx, ry) in humanoid.JOINTS.items():
    off = lean.get(k, (0, 0, 0))
    thin = 0.78 if k not in ("head", "headtop") else 0.9
    joints[k] = ((p[0] + off[0], p[1] + off[1], p[2] + off[2]), rx * thin, ry * thin)
# Longer arms: hands hang to the knees.
for k, dz in (("wrist.L", -0.08), ("hand.L", -0.12)):
    p, rx, ry = joints[k]
    joints[k] = ((p[0], p[1], p[2] + dz), rx, ry)
bones = humanoid.leaned_bones({"chest": (0, -0.12, -0.06), "neck": (0, -0.26, -0.14), "head": (0, -0.33, -0.2),
                               "shoulder.L": (0, -0.11, -0.07), "upper_arm.L": (0, -0.14, -0.08), "forearm.L": (0, -0.14, -0.1),
                               "hand.L": (0, -0.14, -0.12)})
arm, body = humanoid.build("hollow", flesh, joints=joints, bones=bones)

robe = ddk.lathe("shroud_skirt", [(0.0, 1.08), (0.18, 1.08), (0.2, 0.9), (0.26, 0.5), (0.32, 0.12), (0.0, 0.12)], 24, shroud, closed_top=False)
robe.scale = (1.0, 0.85, 1.0)
ddk.displace(robe, 0.05, 0.12, 4, subdivide=1)
humanoid.finish(robe, arm, "hips")
wrap = ddk.lathe("shoulder_wrap", [(0.08, 1.52), (0.19, 1.46), (0.22, 1.3), (0.18, 1.2)], 20, shroud)
wrap.location = (0, -0.12, -0.06)
ddk.displace(wrap, 0.02, 0.1, 9)
humanoid.finish(wrap, arm, "chest")

head = humanoid.bone_point(arm, "head", 0.0)
for x in (-0.04, 0.04):
    socket = ddk.prim("sphere", "socket", (0.045, 0.03, 0.04), head + ddk.Vector((x, -0.1, 0.08)), segments=10, mat=dark)
    humanoid.finish(socket, arm, "head")
    eye = ddk.prim("sphere", "eye", (0.018, 0.01, 0.018), head + ddk.Vector((x, -0.118, 0.08)), segments=8, mat=eyes)
    humanoid.finish(eye, arm, "head")
jaw = ddk.prim("box", "jaw", (0.12, 0.08, 0.05), head + ddk.Vector((0, -0.07, -0.02)), (math.radians(20), 0, 0), bevel=0.015, subsurf=1, mat=flesh)
humanoid.finish(jaw, arm, "head")
for s, side in ((1, "L"), (-1, "R")):
    hand = humanoid.bone_point(arm, f"hand.{side}", 0.6)
    for i in range(3):
        claw = ddk.prim("cone", f"claw{i}.{side}", (0.022, 0.022, 0.12), hand + ddk.Vector(((i - 1) * 0.025, -0.02, -0.06)), (math.radians(180 + 15), 0, 0), 6, mat=bone)
        humanoid.finish(claw, arm, f"hand.{side}")

ddk.humanoid_clips(arm, "claws", heavy=1.15)
ddk.export("characters", "hollow")
ddk.preview("hollow")
