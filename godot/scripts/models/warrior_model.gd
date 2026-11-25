extends RefCounted
## The Warrior: a broad-shouldered grave knight. Original design.
## The cuirass, shield face and cloak use `body_mat` (the hero's chosen colour, and the hurt flash);
## everything else is static banded-light material. The sword hangs off the `weapon` pivot so the
## swing animation in player.gd keeps working.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, body_mat: StandardMaterial3D, weapon: Node3D) -> void:
	parent.scale = Vector3.ONE * 0.815
	weapon.position = Vector3(0.54, 1.04, 0.21)
	B.surface_grain(body_mat, Vector3.ONE * 1.1)
	var base := body_mat.albedo_color
	var steel := B.stylized_mat(Color(0.58, 0.6, 0.68), Color(1.0, 0.6, 0.3))
	var dark_steel := B.stylized_mat(Color(0.3, 0.31, 0.36), Color(1.0, 0.5, 0.25))
	var leather := B.stylized_mat(base.darkened(0.6), Color(1.0, 0.5, 0.25))
	var gold := B.stylized_mat(B.GOLD, Color(1.0, 0.8, 0.5))
	var glow := B.stylized_mat(Color(1, 0.6, 0.2), Color(1, 0.6, 0.2), Color(1.0, 0.5, 0.15), 4.0)

	# Legs: tassets, thighs, knee cops, greaves, boots.
	for side in [-1.0, 1.0]:
		var foot := K.arm(parent, leather, Vector3(side * 0.16, 0.95, 0), 0.11, 0.09, 0.075, 0.45, 0.45,
			Vector3.ZERO, 0.0)
		K.add(foot, K.bevel_box(Vector3(0.17, 0.09, 0.32), 0.03), dark_steel, Vector3(0, -0.005, 0.07))
		K.add(parent, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.11, 0), Vector2(0.12, 0.05), Vector2(0.08, 0.12), Vector2(0, 0.13)]), 8),
			steel, Vector3(side * 0.16, 0.44, 0.04), Vector3(PI * 0.5, 0, 0))  # knee cop
		K.add(parent, K.limb(0.085, 0.07, 0.4, 8), steel, Vector3(side * 0.16, 0.45, 0.0))  # greave
	K.add(parent, K.bevel_box(Vector3(0.56, 0.3, 0.34), 0.05), leather, Vector3(0, 0.95, 0))  # hips
	for side in [-1.0, 1.0]:
		K.add(parent, K.plate(0.22, 0.34, 0.04, 0.03), dark_steel,
			Vector3(side * 0.2, 0.78, 0.17), Vector3(0.1, 0, side * 0.12))  # tasset
	# Belt with a gold buckle.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.27, 1.06), Vector2(0.3, 1.06), Vector2(0.3, 1.14), Vector2(0.27, 1.14), Vector2(0.27, 1.06)]), 10),
		leather, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.75))
	K.add(parent, K.bevel_box(Vector3(0.12, 0.1, 0.05), 0.015), gold, Vector3(0, 1.1, 0.24))

	# Cuirass: lathed barrel chest, widest at the shoulders, with a gorget.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.06), Vector2(0.27, 1.06), Vector2(0.31, 1.2), Vector2(0.38, 1.4),
		Vector2(0.41, 1.52), Vector2(0.27, 1.64), Vector2(0, 1.66)]), 12), body_mat,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.78))
	K.add(parent, K.bevel_box(Vector3(0.08, 0.5, 0.05), 0.015), gold, Vector3(0, 1.38, 0.31))  # breastplate ridge
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.17, 1.6), Vector2(0.22, 1.6), Vector2(0.2, 1.72), Vector2(0.15, 1.72), Vector2(0.17, 1.6)]), 10), dark_steel)

	# Arms and pauldrons with spikes. The right hand ends at the weapon pivot.
	for side in [-1.0, 1.0]:
		var hand := K.arm(parent, dark_steel, Vector3(side * 0.42, 1.52, 0.0), 0.075, 0.065, 0.06,
			0.32, 0.32, Vector3(0.0, 0, side * 0.1), -0.5)
		K.add(hand, K.bevel_box(Vector3(0.12, 0.12, 0.12), 0.03), steel)  # gauntlet
		K.add(parent, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.2, 0), Vector2(0.23, 0.06), Vector2(0.17, 0.17), Vector2(0, 0.2)]), 10),
			steel, Vector3(side * 0.44, 1.5, 0), Vector3(0, 0, -side * 0.28))
		K.add(parent, K.spike(0.06, 0.26, 5), steel,
			Vector3(side * 0.5, 1.7, 0), Vector3(0, 0, -side * 0.55))
		K.add(parent, K.lathe(PackedVector2Array([
			Vector2(0.22, 1.5), Vector2(0.26, 1.5), Vector2(0.26, 1.54), Vector2(0.22, 1.54), Vector2(0.22, 1.5)]), 8),
			gold, Vector3(side * 0.44, 0, 0))

	# Great helm with a glowing T-slit, a crest and swept horns.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.72), Vector2(0.17, 1.72), Vector2(0.22, 1.82), Vector2(0.22, 1.98),
		Vector2(0.16, 2.1), Vector2(0, 2.13)]), 24), steel)
	K.add(parent, K.plate(0.36, 0.24, 0.045, 0.04), dark_steel, Vector3(0, 1.89, 0.18))
	K.add(parent, K.bevel_box(Vector3(0.3, 0.045, 0.04), 0.01), glow, Vector3(0, 1.9, 0.245))
	K.add(parent, K.bevel_box(Vector3(0.045, 0.2, 0.04), 0.01), glow, Vector3(0, 1.82, 0.245))
	K.add(parent, K.bevel_box(Vector3(0.05, 0.12, 0.34), 0.015), dark_steel, Vector3(0, 2.14, -0.02))  # crest
	for side in [-1.0, 1.0]:
		K.add(parent, K.spike(0.045, 0.3, 5), gold,
			Vector3(side * 0.2, 2.0, -0.02), Vector3(0, 0, -side * 1.15))

	# Short tattered cloak hanging behind.
	K.add(parent, K.plate(0.62, 1.05, 0.03, 0.05), body_mat, Vector3(0, 1.1, -0.3), Vector3(0.12, 0, 0))
	for i in 4:
		K.add(parent, K.spike(0.07, 0.18, 3), body_mat,
			Vector3(-0.22 + i * 0.147, 0.56, -0.34), Vector3(PI + 0.12, 0, 0))

	# Kite shield on the left arm.
	var shield := Node3D.new()
	shield.position = Vector3(-0.51, 1.12, 0.22)
	shield.rotation.y = -0.52
	parent.add_child(shield)
	K.add(shield, K.plate(0.59, 0.89, 0.045, 0.07), gold, Vector3(0, 0, -0.035))
	K.add(shield, K.plate(0.55, 0.85, 0.07, 0.07), body_mat)
	K.add(shield, K.plate(0.4, 0.2, 0.05, 0.06), dark_steel, Vector3(0, 0.46, 0.0))
	K.add(shield, K.spike(0.2, 0.18, 3), dark_steel, Vector3(0, -0.42, 0), Vector3(PI, 0, 0))
	K.add(shield, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.1, 0), Vector2(0.08, 0.06), Vector2(0, 0.09)]), 8), gold,
		Vector3(0, 0.05, 0.12), Vector3(PI * 0.5, 0, 0))

	# Split chevrons frame the shield boss.
	for side in [-1.0, 1.0]:
		K.link(shield, Vector3(side * 0.21, 0.27, 0.071), Vector3(side * 0.048, 0.09, 0.12), 0.023, 0.015, gold)
		K.link(shield, Vector3(side * 0.18, -0.02, 0.085), Vector3(0, -0.29, 0.12), 0.018, 0.009, gold)
	# Broadsword: grip, pommel, crossguard and a pointed blade. Hilt sits on the weapon pivot.
	K.add(weapon, K.limb(0.028, 0.028, 0.26, 6), leather, Vector3(0, 0.03, 0))
	K.add(weapon, K.spike(0.05, 0.08, 6), gold, Vector3(0, -0.23, 0), Vector3(PI, 0, 0))
	K.add(weapon, K.bevel_box(Vector3(0.42, 0.06, 0.09), 0.02), gold, Vector3(0, 0.04, 0))
	var blade := K.add(weapon, K.blade(1.04, 0.15, 0.045), steel, Vector3(0, 0.07, 0))
	blade.name = "Blade"

	# Cant the sword around the grip, leaving the gameplay swing pivot free.
	var cant := Basis(Vector3.BACK, -0.44)
	for piece: Node3D in weapon.get_children():
		piece.transform = Transform3D(cant * piece.basis, cant * piece.position)
