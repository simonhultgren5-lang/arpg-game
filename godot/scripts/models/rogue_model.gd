extends RefCounted
## The Rogue: a lean, masked cutthroat in a peaked hood and tattered cloak. Original design.
## Leather, bracers and cloak use `body_mat` where it matters (the hero colour and the hurt flash);
## the rest is static banded-light material. Both daggers hang off the `weapon` pivot so the
## swing animation in player.gd keeps working (the off-hand dagger sits 0.74 to the left).

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, body_mat: StandardMaterial3D, weapon: Node3D) -> void:
	parent.scale = Vector3.ONE * 0.84
	weapon.position = Vector3(0.37, 0.99, 0.15)
	B.surface_grain(body_mat, Vector3.ONE * 1.1)
	var base := body_mat.albedo_color
	var leather := B.stylized_mat(base.darkened(0.6), Color(1.0, 0.5, 0.25))
	var dark := B.stylized_mat(base.darkened(0.8), Color(0.9, 0.45, 0.25))
	var strap := B.stylized_mat(Color(0.3, 0.2, 0.12), Color(1.0, 0.5, 0.25))
	var steel := B.stylized_mat(Color(0.7, 0.72, 0.8), Color(1.0, 0.7, 0.4))
	var brass := B.stylized_mat(B.GOLD.darkened(0.2), Color(1.0, 0.8, 0.5))
	var glow := B.stylized_mat(Color(0.8, 1.0, 0.5), Color(0.8, 1.0, 0.5), Color(0.7, 1.0, 0.4), 4.0)

	# Legs: slim thighs, shin wraps, cuffed boots.
	for side in [-1.0, 1.0]:
		var foot := K.arm(parent, dark, Vector3(side * 0.13, 0.95, 0), 0.09, 0.07, 0.055, 0.46, 0.46,
			Vector3.ZERO, 0.0)
		K.add(foot, K.bevel_box(Vector3(0.13, 0.08, 0.28), 0.03), leather, Vector3(0, -0.005, 0.06))
		K.add(parent, K.lathe(PackedVector2Array([
			Vector2(0.075, 0.28), Vector2(0.105, 0.28), Vector2(0.1, 0.46), Vector2(0.08, 0.46), Vector2(0.075, 0.28)]), 8),
			leather, Vector3(side * 0.13, 0.0, 0.0))  # boot shaft
		K.add(parent, K.bevel_box(Vector3(0.16, 0.05, 0.05), 0.012), strap, Vector3(side * 0.13, 0.4, 0.07))
	K.add(parent, K.bevel_box(Vector3(0.46, 0.24, 0.3), 0.05), dark, Vector3(0, 0.96, 0))  # hips
	# Layered leather jerkin: slim waist, broader chest.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.02), Vector2(0.24, 1.02), Vector2(0.25, 1.2), Vector2(0.31, 1.42),
		Vector2(0.32, 1.54), Vector2(0.2, 1.64), Vector2(0, 1.66)]), 12), body_mat,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.74))
	for i in 3:
		K.add(parent, K.bevel_box(Vector3(0.44 - i * 0.03, 0.05, 0.05), 0.012), strap,
			Vector3(0, 1.1 + i * 0.15, 0.2))  # chest straps
	K.add(parent, K.bevel_box(Vector3(0.05, 0.5, 0.05), 0.012), strap, Vector3(0.13, 1.4, 0.21), Vector3(0, 0, 0.35))  # bandolier
	# Belt, buckle and a hip pouch.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.245, 1.02), Vector2(0.27, 1.02), Vector2(0.27, 1.09), Vector2(0.245, 1.09), Vector2(0.245, 1.02)]), 10),
		strap, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.74))
	K.add(parent, K.bevel_box(Vector3(0.07, 0.07, 0.04), 0.01), brass, Vector3(0, 1.055, 0.2))
	K.add(parent, K.bevel_box(Vector3(0.14, 0.16, 0.1), 0.03), strap, Vector3(-0.27, 0.9, 0.04))

	# Arms with steel-studded bracers; hands end at the dagger pivots.
	for side in [-1.0, 1.0]:
		var hand := K.arm(parent, leather, Vector3(side * 0.34, 1.54, 0.0), 0.06, 0.05, 0.045,
			0.3, 0.3, Vector3(0.0, 0, side * 0.1), -0.5)
		K.add(hand, K.lathe(PackedVector2Array([
			Vector2(0.055, 0.0), Vector2(0.07, 0.0), Vector2(0.075, 0.2), Vector2(0.055, 0.2), Vector2(0.055, 0.0)]), 8),
			steel, Vector3(0, 0.22, 0))  # bracer
		K.add(hand, K.bevel_box(Vector3(0.09, 0.09, 0.09), 0.025), dark)  # glove
		K.add(parent, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.15, 0), Vector2(0.17, 0.05), Vector2(0.11, 0.13), Vector2(0, 0.15)]), 8),
			dark, Vector3(side * 0.36, 1.52, 0), Vector3(0, 0, -side * 0.3))  # shoulder cap

	# Head: dark mask with glowing eyes under a tall peaked hood and a neck scarf.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.13, 1.6), Vector2(0.2, 1.6), Vector2(0.18, 1.7), Vector2(0.12, 1.7), Vector2(0.13, 1.6)]), 10), strap)
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.7), Vector2(0.12, 1.7), Vector2(0.16, 1.8), Vector2(0.15, 1.92), Vector2(0, 1.98)]), 10), dark)
	K.add(parent, K.bevel_box(Vector3(0.22, 0.12, 0.05), 0.02), B.stylized_mat(Color(0.03, 0.03, 0.04), Color(0.4, 0.4, 0.5)),
		Vector3(0, 1.84, 0.15))  # mask
	for side in [-1.0, 1.0]:
		K.add(parent, K.spike(0.022, 0.07, 4), glow, Vector3(side * 0.06, 1.87, 0.18), Vector3(PI * 0.5, 0, side * 0.3))
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.66), Vector2(0.2, 1.66), Vector2(0.25, 1.8), Vector2(0.22, 1.96),
		Vector2(0.1, 2.08), Vector2(0, 2.1)]), 14), body_mat, Vector3(0, 0, -0.07), Vector3.ZERO, Vector3(1, 1, 0.9))
	K.add(parent, K.plate(0.34, 0.2, 0.03, 0.06), body_mat, Vector3(0, 2.0, 0.1), Vector3(-0.25, 0, 0))  # hood brim
	K.add(parent, K.spike(0.09, 0.4, 5), body_mat, Vector3(0, 2.04, -0.2), Vector3(-1.15, 0, 0))  # hood tail

	# Tattered cloak behind with a ragged hem.
	K.add(parent, K.plate(0.66, 1.15, 0.03, 0.08), body_mat, Vector3(0, 1.08, -0.27), Vector3(0.1, 0, 0))
	for i in 5:
		K.add(parent, K.spike(0.065, 0.22, 3), body_mat,
			Vector3(-0.26 + i * 0.13, 0.5 - absf(i - 2) * 0.03, -0.31), Vector3(PI + 0.1, 0, 0))

	# Twin curved daggers: main hand at the pivot, off-hand 0.74 to the left.
	for x in [0.0, -0.74]:
		K.add(weapon, K.limb(0.022, 0.022, 0.2, 6), strap, Vector3(x, 0.03, 0))
		K.add(weapon, K.bevel_box(Vector3(0.2, 0.04, 0.06), 0.012), brass, Vector3(x, 0.045, 0))
		K.add(weapon, K.spike(0.035, 0.05, 5), brass, Vector3(x, -0.2, 0), Vector3(PI, 0, 0))
		var blade := K.add(weapon, K.blade(0.58, 0.1, 0.03), steel, Vector3(x, 0.06, 0), Vector3(0, 0, -0.08))
		blade.name = "Blade"
		K.add(weapon, K.blade(0.2, 0.07, 0.02), steel, Vector3(x + 0.03, 0.55, 0), Vector3(0, 0, -0.55))  # hooked tip
