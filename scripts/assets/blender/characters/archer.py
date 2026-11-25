"""The Bone Archer: a skeleton in a tattered hood with a recurved bow and a quiver of black arrows.
Builds characters/archer.glb (+ .blend)."""
import math

import ddk
import humanoid
import materials

ddk.reset()
bone = ddk.material("bone", (0.82, 0.78, 0.68), 0.65, 0.0, materials.get("bone"), scale=2.5)
rag = ddk.material("archer_hood", (0.16, 0.13, 0.14), 0.95, 0.0, materials.get("cloth"), scale=2.5)
wood = ddk.material("bow_wood", (0.35, 0.22, 0.13), 0.7, 0.0, materials.get("timber"), scale=2.0)
leather = ddk.material("leather_dark", (0.18, 0.12, 0.08), 0.6, 0.0, materials.get("leather"), scale=3.0)
dark = ddk.material("socket_dark", (0.01, 0.01, 0.01), 1.0)
ember = ddk.material("archer_eyes", (1.0, 0.5, 0.2), 0.5, emission=(1.0, 0.45, 0.15), emission_strength=6.0)

# A bony frame: the skin modifier with thin radii gives limbs like long bones with knobbed joints.
joints = {}
for k, (p, rx, ry) in humanoid.JOINTS.items():
    if k in ("pelvis", "belly", "chest"):
        joints[k] = (p, 0.035, 0.035)  # the spine; ribs and pelvis are separate parts
    elif k in ("head", "headtop"):
        joints[k] = (p, rx * 0.9, ry * 0.95)
    elif k in ("elbow.L", "knee.L", "wrist.L", "ankle.L"):
        joints[k] = (p, 0.032, 0.032)
    else:
        joints[k] = (p, min(rx, 0.03), min(ry, 0.03))
arm, body = humanoid.build("archer", bone, joints=joints)

for i in range(6):  # ribs: flattened rings narrowing down the chest
    rib = ddk.prim("torus", f"rib{i}", (0.33 - i * 0.025, 0.22 - i * 0.015, 0.25), (0, -0.01, 1.47 - i * 0.055), segments=24, mat=bone)
    humanoid.finish(rib, arm, "chest")
sternum = ddk.prim("box", "sternum", (0.03, 0.02, 0.26), (0, -0.11, 1.35), bevel=0.006, mat=bone)
humanoid.finish(sternum, arm, "chest")
pelvis = ddk.lathe("pelvis", [(0.08, 0.92), (0.16, 0.96), (0.17, 1.02), (0.12, 1.06)], 16, bone)
pelvis.scale = (1.0, 0.7, 1.0)
humanoid.finish(pelvis, arm, "hips")
for s, side in ((1, "L"), (-1, "R")):
    clav = ddk.prim("cyl", f"clavicle.{side}", (0.025, 0.025, 0.18), (s * 0.1, -0.02, 1.5), (0, math.radians(90), 0), 8, mat=bone)
    humanoid.finish(clav, arm, "chest")

head = humanoid.bone_point(arm, "head", 0.0)
for x in (-0.042, 0.042):
    socket = ddk.prim("sphere", "socket", (0.05, 0.035, 0.045), head + ddk.Vector((x, -0.095, 0.07)), segments=10, mat=dark)
    humanoid.finish(socket, arm, "head")
    eye = ddk.prim("sphere", "eye", (0.016, 0.01, 0.016), head + ddk.Vector((x, -0.115, 0.07)), segments=8, mat=ember)
    humanoid.finish(eye, arm, "head")
jaw = ddk.prim("box", "jaw", (0.1, 0.06, 0.03), head + ddk.Vector((0, -0.06, -0.035)), bevel=0.01, mat=bone)
humanoid.finish(jaw, arm, "head")
hood = ddk.lathe("hood", [(0.0, -0.08), (0.14, -0.06), (0.15, 0.08), (0.12, 0.19), (0.04, 0.26), (0.0, 0.28)], 20, rag)
hood.location = head + ddk.Vector((0, 0.03, 0))
humanoid.open_face(hood)
ddk.displace(hood, 0.01, 0.1, 2)
humanoid.finish(hood, arm, "head")
cape = humanoid.cloth_panel("tatters", 0.36, 0.7, (0, 0.12, 1.5), math.radians(-8), rag, waves=3)
humanoid.finish(cape, arm, "chest")

# The bow, held in the left hand: two recurved limbs (a beveled curve), and the string.
hand = humanoid.bone_point(arm, "hand.L", 0.5)
curve = ddk.bpy.data.curves.new("bow", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 0.014
spline = curve.splines.new("BEZIER")
pts = [(0, 0.06, -0.62), (0, -0.05, -0.3), (0, 0.0, 0.0), (0, -0.05, 0.3), (0, 0.06, 0.62)]
spline.bezier_points.add(len(pts) - 1)
for bp, p in zip(spline.bezier_points, pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = "AUTO"
bow = ddk.link(ddk.bpy.data.objects.new("bow", curve))
bow.location = hand
ddk.select_only(bow)
ddk.bpy.ops.object.convert(target="MESH")
ddk.assign(bow, wood)
humanoid.finish(bow, arm, "hand.L")
string = ddk.prim("cyl", "bowstring", (0.004, 0.004, 1.22), hand + ddk.Vector((0, 0.07, 0)), segments=4, mat=ddk.material("string", (0.8, 0.78, 0.7), 0.8))
humanoid.finish(string, arm, "hand.L")
quiver = ddk.prim("cyl", "quiver", (0.1, 0.1, 0.5), (0.08, 0.14, 1.32), (math.radians(-15), math.radians(20), 0), 12, mat=leather)
humanoid.finish(quiver, arm, "chest")
for i in range(5):
    shaft = ddk.prim("cyl", f"arrow{i}", (0.008, 0.008, 0.6), (0.08 + (i - 2) * 0.015, 0.16, 1.45), (math.radians(-15), math.radians(20), 0), 4, mat=dark)
    humanoid.finish(shaft, arm, "chest")

ddk.humanoid_clips(arm, "bow")
ddk.export("characters", "archer")
ddk.preview("archer")
