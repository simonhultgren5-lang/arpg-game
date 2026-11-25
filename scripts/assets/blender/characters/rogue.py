"""The Rogue: a lean knife-saint in hooded leathers, a face mask, a short cloak and twin daggers.
tint_* materials take the player's colour. Builds characters/rogue.glb (+ .blend)."""
import math

import ddk
import humanoid
import materials

ddk.reset()
leather_tex = materials.get("leather")
cloth = materials.get("cloth")
leather = ddk.material("leather_brown", (0.25, 0.16, 0.1), 0.55, 0.0, leather_tex, scale=3.0)
leather_dark = ddk.material("leather_black", (0.08, 0.07, 0.07), 0.5, 0.0, leather_tex, scale=3.0)
tint = ddk.material("tint_hood", (0.3, 0.12, 0.35), 0.85, 0.0, cloth, scale=3.0)
mask = ddk.material("mask", (0.06, 0.05, 0.06), 0.8, 0.0, cloth, scale=3.0)
steel = ddk.material("steel_bright", (0.75, 0.75, 0.8), 0.25, 1.0, materials.get("steel"), scale=2.0)
brass = ddk.material("brass", (0.78, 0.58, 0.3), 0.35, 1.0, materials.get("steel"), scale=2.0)
eyes = ddk.material("rogue_eyes", (0.9, 0.85, 0.6), 0.5, emission=(1.0, 0.9, 0.55), emission_strength=3.0)

arm, body = humanoid.build("rogue", leather_dark, build=0.92)

jerkin = ddk.lathe("jerkin", [(0.0, 1.0), (0.17, 1.0), (0.18, 1.15), (0.205, 1.35), (0.21, 1.47), (0.15, 1.55), (0.0, 1.56)], 28, leather)
jerkin.scale = (1.0, 0.8, 1.0)
humanoid.finish(jerkin, arm, "chest")
for i in range(4):  # cross straps with buckles
    strap = ddk.prim("box", f"strap{i}", (0.035, 0.012, 0.42), (0, -0.165, 1.28), (0, math.radians(35 if i % 2 else -35), 0), mat=leather_dark)
    humanoid.finish(strap, arm, "chest")
belt = ddk.lathe("belt", [(0.18, 1.0), (0.195, 1.01), (0.195, 1.07), (0.18, 1.08)], 28, leather_dark)
belt.scale = (1.0, 0.82, 1.0)
humanoid.finish(belt, arm, "hips")
for i, x in enumerate((-0.14, -0.06, 0.06, 0.14)):  # throwing knives along the belt
    knife = ddk.blade(f"belt_knife{i}", 0.16, 0.025, 0.006, steel)
    knife.location = (x, -0.17, 1.0)
    knife.rotation_euler = (math.radians(180), 0, 0)
    humanoid.finish(knife, arm, "hips")
skirt = humanoid.cloth_panel("skirt_front", 0.32, 0.32, (0, -0.16, 1.02), math.radians(8), leather, waves=2)
humanoid.finish(skirt, arm, "hips")
cloak = humanoid.cloth_panel("cloak", 0.42, 0.85, (0, 0.16, 1.5), math.radians(-12), tint, waves=4)
humanoid.finish(cloak, arm, "chest")

for s, side in ((1, "L"), (-1, "R")):
    bracer = ddk.lathe(f"bracer.{side}", [(0.042, 0.0), (0.05, 0.03), (0.048, 0.17), (0.04, 0.2)], 14, leather_dark)
    bracer.location = humanoid.bone_point(arm, f"forearm.{side}", 0.12)
    bracer.rotation_euler = humanoid.bone_rotation(arm, f"forearm.{side}")
    humanoid.finish(bracer, arm, f"forearm.{side}")
    boot = ddk.prim("box", f"boot.{side}", (0.1, 0.24, 0.07), humanoid.bone_point(arm, f"foot.{side}", 0.5), bevel=0.025, subsurf=1, mat=leather_dark)
    humanoid.finish(boot, arm, f"foot.{side}")
    cuff = ddk.lathe(f"boot_cuff.{side}", [(0.05, 0.0), (0.06, 0.18), (0.068, 0.24)], 14, leather_dark)
    cuff.location = humanoid.bone_point(arm, f"shin.{side}", 0.45)
    cuff.rotation_euler = humanoid.bone_rotation(arm, f"shin.{side}")
    humanoid.finish(cuff, arm, f"shin.{side}")
    pad = ddk.lathe(f"pad.{side}", [(0.0, 0.07), (0.09, 0.04), (0.1, 0.0), (0.09, -0.03)], 16, leather)
    pad.location = (s * 0.2, 0, 1.46)
    pad.rotation_euler = (0, math.radians(-s * 30), 0)
    humanoid.finish(pad, arm, f"upper_arm.{side}")
    # Daggers: a reverse grip in the left hand, forward in the right.
    hand = humanoid.bone_point(arm, f"hand.{side}", 0.5)
    dag = ddk.blade(f"dagger.{side}", 0.34, 0.04, 0.01, steel)
    dag.location = hand + ddk.Vector((0, -0.02, 0.0))
    dag.rotation_euler = (math.radians(-60 if side == "R" else -150), 0, 0)
    humanoid.finish(dag, arm, f"hand.{side}")
    guard = ddk.prim("box", f"dagger_guard.{side}", (0.09, 0.02, 0.02), hand, bevel=0.005, mat=brass)
    humanoid.finish(guard, arm, f"hand.{side}")

head = humanoid.bone_point(arm, "head", 0.0)
hood = ddk.lathe("hood", [(0.0, -0.11), (0.14, -0.09), (0.15, 0.07), (0.125, 0.19), (0.04, 0.27), (0.0, 0.3)], 24, tint)
hood.location = head + ddk.Vector((0, 0.03, 0))
humanoid.open_face(hood)
humanoid.finish(hood, arm, "head")
peak = ddk.prim("cone", "hood_peak", (0.12, 0.12, 0.2), head + ddk.Vector((0, 0.05, 0.3)), (math.radians(-35), 0, 0), 12, mat=tint)
humanoid.finish(peak, arm, "head")
face_mask = ddk.prim("sphere", "mask", (0.18, 0.12, 0.13), head + ddk.Vector((0, -0.06, -0.0)), segments=16, mat=mask)
humanoid.finish(face_mask, arm, "head")
for x in (-0.035, 0.035):
    eye = ddk.prim("sphere", "eye", (0.022, 0.01, 0.01), head + ddk.Vector((x, -0.11, 0.09)), segments=8, mat=eyes)
    humanoid.finish(eye, arm, "head")

ddk.humanoid_clips(arm, "daggers")
ddk.export("characters", "rogue")
ddk.preview("rogue")
