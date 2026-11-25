"""The Pyromancer: an ash-sworn caster in a long robe and deep hood, a staff with a caged ember.
tint_* materials take the player's colour. Builds characters/pyromancer.glb (+ .blend)."""
import math

import ddk
import humanoid
import materials

ddk.reset()
cloth = materials.get("cloth")
robe_mat = ddk.material("tint_robe", (0.5, 0.14, 0.1), 0.9, 0.0, cloth, scale=3.0)
under = ddk.material("robe_under", (0.12, 0.1, 0.1), 0.9, 0.0, cloth, scale=3.0)
leather = ddk.material("leather_dark", (0.18, 0.12, 0.08), 0.6, 0.0, materials.get("leather"), scale=3.0)
wood = ddk.material("staff_wood", (0.55, 0.42, 0.32), 0.8, 0.0, materials.get("timber"), scale=2.0)
iron = ddk.material("iron", (0.3, 0.3, 0.33), 0.45, 0.9, materials.get("steel"), scale=2.0)
gold = ddk.material("gold", (0.85, 0.62, 0.3), 0.3, 1.0, materials.get("steel"), scale=2.0)
ember = ddk.material("ember", (1.0, 0.45, 0.12), 0.4, 0.0, emission=(1.0, 0.42, 0.1), emission_strength=6.0)
shadow = ddk.material("hood_shadow", (0.01, 0.008, 0.01), 1.0)

arm, body = humanoid.build("pyromancer", under, build=0.95)

robe = ddk.lathe("robe", [(0.0, 1.5), (0.19, 1.5), (0.21, 1.3), (0.2, 1.1), (0.24, 0.7), (0.31, 0.25), (0.36, 0.02), (0.33, 0.0)], 32, robe_mat, closed_top=False)
robe.scale = (1.0, 0.82, 1.0)
ddk.displace(robe, 0.02, 0.15, 3)
humanoid.finish(robe, arm, "hips")
mantle = ddk.lathe("mantle", [(0.09, 1.58), (0.2, 1.53), (0.3, 1.38), (0.27, 1.3)], 28, under)
humanoid.finish(mantle, arm, "chest")
sash = ddk.lathe("sash", [(0.2, 1.04), (0.215, 1.05), (0.215, 1.13), (0.2, 1.14)], 28, leather)
sash.scale = (1.0, 0.82, 1.0)
humanoid.finish(sash, arm, "hips")
for i, x in enumerate((-0.12, 0.13)):
    pouch = ddk.prim("box", f"pouch{i}", (0.08, 0.05, 0.09), (x, -0.18, 1.0), bevel=0.015, subsurf=1, mat=leather)
    humanoid.finish(pouch, arm, "hips")
for s, side in ((1, "L"), (-1, "R")):
    sleeve = ddk.lathe(f"sleeve.{side}", [(0.05, 0.0), (0.06, 0.12), (0.09, 0.26), (0.085, 0.28)], 16, robe_mat)
    sleeve.location = humanoid.bone_point(arm, f"forearm.{side}", 0.0)
    sleeve.rotation_euler = humanoid.bone_rotation(arm, f"forearm.{side}")
    humanoid.finish(sleeve, arm, f"forearm.{side}")

# Deep hood: a shell around the head, open at the front, with a shadowed face and two ember eyes.
head = humanoid.bone_point(arm, "head", 0.0)
hood = ddk.lathe("hood", [(0.0, -0.1), (0.15, -0.08), (0.16, 0.08), (0.13, 0.2), (0.06, 0.28), (0.0, 0.33)], 24, robe_mat)
hood.location = head + ddk.Vector((0, 0.03, 0))
hood.scale = (1.0, 1.12, 1.0)
humanoid.open_face(hood)
humanoid.finish(hood, arm, "head")
face = ddk.prim("sphere", "face_shadow", (0.17, 0.08, 0.2), head + ddk.Vector((0, -0.1, 0.05)), segments=16, mat=shadow)
humanoid.finish(face, arm, "head")
for x in (-0.035, 0.035):
    eye = ddk.prim("sphere", "eye", (0.02, 0.01, 0.012), head + ddk.Vector((x, -0.145, 0.07)), segments=8, mat=ember)
    humanoid.finish(eye, arm, "head")
tip = ddk.prim("cone", "hood_tip", (0.1, 0.1, 0.22), head + ddk.Vector((0, 0.12, 0.25)), (math.radians(-50), 0, 0), 12, mat=robe_mat)
humanoid.finish(tip, arm, "head")

# The staff, held upright in the right hand: knotted wood, an iron cage of claws around an ember.
hand = humanoid.bone_point(arm, "hand.R", 0.5)
shaft = ddk.prim("cyl", "staff", (0.04, 0.04, 1.75), hand + ddk.Vector((0, 0, 0.1)), segments=10, mat=wood)
ddk.displace(shaft, 0.006, 0.05, 7, subdivide=1)
humanoid.finish(shaft, arm, "hand.R")
top = hand + ddk.Vector((0, 0, 0.98))
core = ddk.prim("sphere", "staff_ember", (0.1, 0.1, 0.12), top + ddk.Vector((0, 0, 0.06)), segments=16, mat=ember)
humanoid.finish(core, arm, "hand.R")
for i in range(4):
    a = i * math.pi / 2 + math.pi / 4
    claw = ddk.prim("cone", f"claw{i}", (0.03, 0.03, 0.22), top + ddk.Vector((math.cos(a) * 0.06, math.sin(a) * 0.06, 0.08)), (math.sin(a) * 0.4, -math.cos(a) * 0.4, 0), 8, mat=iron)
    humanoid.finish(claw, arm, "hand.R")
collar = ddk.lathe("staff_collar", [(0.03, 0.0), (0.05, 0.02), (0.05, 0.05), (0.03, 0.07)], 12, gold, loc=top + ddk.Vector((0, 0, -0.06)))
humanoid.finish(collar, arm, "hand.R")

ddk.humanoid_clips(arm, "staff")
ddk.export("characters", "pyromancer")
ddk.preview("pyromancer")
