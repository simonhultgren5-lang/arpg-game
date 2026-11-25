extends RefCounted
## The Pyromancer (Mage): an ember-robed hooded caster with a crescent-headed staff. Original design.
## Robe and hood use `body_mat` (hero colour, hurt flash). The staff hangs off the `weapon` pivot and
## keeps its resting tilt (rotation.x = 0.15) and the ember light that player.gd expects.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, body_mat: StandardMaterial3D, weapon: Node3D) -> void:
	parent.scale = Vector3.ONE * 0.84
	weapon.position = Vector3(0.37, 0.99, 0.15)
	weapon.rotation.x = 0.15
	B.surface_grain(body_mat, Vector3.ONE * 1.1)
	var base := body_mat.albedo_color
	var cloth := B.stylized_mat(base.darkened(0.55), Color(1.0, 0.5, 0.25))
	var trim := B.stylized_mat(B.GOLD, Color(1.0, 0.8, 0.5))
	var wood := B.stylized_mat(Color(0.2, 0.12, 0.08), Color(1.0, 0.5, 0.25))
	var iron := B.stylized_mat(Color(0.28, 0.27, 0.3), Color(1.0, 0.5, 0.25))
	var skin := B.stylized_mat(Color(0.72, 0.58, 0.5), Color(1.0, 0.5, 0.3))
	var ember := B.stylized_mat(B.EMBER, B.EMBER, B.EMBER, 5.0)
	var eye := B.stylized_mat(Color(1.0, 0.75, 0.3), Color(1.0, 0.7, 0.3), Color(1.0, 0.6, 0.2), 4.0)

	for side in [-1.0, 1.0]:
		var leg := Node3D.new()
		leg.name = "LeftLeg" if side < 0 else "RightLeg"
		leg.position = Vector3(side * 0.17, 0.85, 0)
		parent.add_child(leg)
		K.add(leg, K.bevel_box(Vector3(0.18, 0.14, 0.35), 0.035), cloth, Vector3(0, -0.77, 0.12))
	# Long robe, flared at the hem, with a trimmed border and a hanging sash.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 0.04), Vector2(0.52, 0.04), Vector2(0.5, 0.3), Vector2(0.38, 0.75),
		Vector2(0.29, 1.1), Vector2(0.33, 1.4), Vector2(0.34, 1.55), Vector2(0.2, 1.66), Vector2(0, 1.68)]), 16), body_mat,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.85))
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.5, 0.04), Vector2(0.54, 0.04), Vector2(0.54, 0.12), Vector2(0.5, 0.12), Vector2(0.5, 0.04)]), 16), trim,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.85))
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.285, 1.06), Vector2(0.315, 1.06), Vector2(0.315, 1.14), Vector2(0.285, 1.14), Vector2(0.285, 1.06)]), 12),
		trim, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.85))
	K.add(parent, K.plate(0.13, 0.7, 0.03, 0.03), cloth, Vector3(0.1, 0.72, 0.31), Vector3(0.05, 0, 0.04))  # sash
	K.add(parent, K.spike(0.07, 0.15, 3), cloth, Vector3(0.1, 0.34, 0.3), Vector3(PI, 0, 0))
	# Shoulder mantle with a glowing clasp.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.17, 1.56), Vector2(0.44, 1.5), Vector2(0.5, 1.56), Vector2(0.4, 1.66), Vector2(0.2, 1.7)]), 14), cloth,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.82))
	K.add(parent, K.spike(0.045, 0.06, 6), ember, Vector3(0, 1.55, 0.3), Vector3(PI * 0.5, 0, 0))

	# Arms in wide flared sleeves; bare hands. The right hand holds the staff pivot.
	for side in [-1.0, 1.0]:
		var hand := K.arm(parent, cloth, Vector3(side * 0.36, 1.52, 0.0), 0.075, 0.075, 0.06,
			0.3, 0.3, Vector3(0.0, 0, side * 0.1), -0.5)
		K.add(hand, K.lathe(PackedVector2Array([
			Vector2(0.06, 0.0), Vector2(0.13, -0.0), Vector2(0.1, 0.22), Vector2(0.06, 0.22), Vector2(0.06, 0.0)]), 10),
			body_mat, Vector3(0, 0.2, 0))  # flared cuff
		K.add(hand, K.bevel_box(Vector3(0.08, 0.1, 0.08), 0.025), skin, Vector3(0, -0.02, 0))

	# Head: pale face under a deep pointed hood, ember eyes, a tight collar.
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0.14, 1.62), Vector2(0.22, 1.62), Vector2(0.19, 1.72), Vector2(0.13, 1.72), Vector2(0.14, 1.62)]), 10), trim)
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.7), Vector2(0.11, 1.7), Vector2(0.15, 1.8), Vector2(0.14, 1.93), Vector2(0, 1.98)]), 10), skin)
	K.add(parent, K.bevel_box(Vector3(0.2, 0.14, 0.04), 0.02), B.stylized_mat(Color(0.04, 0.03, 0.04), Color(0.3, 0.2, 0.2)),
		Vector3(0, 1.84, 0.14))
	for side in [-1.0, 1.0]:
		K.add(parent, K.spike(0.022, 0.06, 4), eye, Vector3(side * 0.055, 1.86, 0.17), Vector3(PI * 0.5, 0, 0))
	K.add(parent, K.lathe(PackedVector2Array([
		Vector2(0, 1.66), Vector2(0.21, 1.66), Vector2(0.27, 1.82), Vector2(0.23, 1.98),
		Vector2(0.1, 2.14), Vector2(0, 2.2)]), 14), body_mat, Vector3(0, 0, -0.07), Vector3.ZERO, Vector3(1, 1, 0.9))
	K.add(parent, K.plate(0.34, 0.22, 0.03, 0.06), body_mat, Vector3(0, 2.0, 0.1), Vector3(-0.3, 0, 0))  # brim
	K.add(parent, K.spike(0.085, 0.38, 5), body_mat, Vector3(0, 2.1, -0.2), Vector3(-1.2, 0, 0))  # hood tail

	# Staff: long shaft, iron collar, crescent claws around a burning orb. Pivot is the grip.
	K.add(weapon, K.limb(0.03, 0.04, 1.9, 8), wood, Vector3(0, 1.25, 0))
	K.add(weapon, K.lathe(PackedVector2Array([
		Vector2(0.05, 1.2), Vector2(0.075, 1.2), Vector2(0.075, 1.27), Vector2(0.05, 1.27), Vector2(0.05, 1.2)]), 8), iron)
	for i in 3:
		var a := TAU * i / 3.0
		K.add(weapon, K.spike(0.035, 0.34, 4), iron,
			Vector3(cos(a) * 0.09, 1.26, sin(a) * 0.09), Vector3(sin(a) * 0.35, 0, -cos(a) * 0.35))
	K.add(weapon, B.sphere(0.13, ember, Vector3.ZERO, null, 10).mesh, ember, Vector3(0, 1.38, 0))
	K.add(weapon, K.spike(0.05, 0.1, 5), trim, Vector3(0, -0.65, 0), Vector3(PI, 0, 0))  # butt cap
	B.omni(B.EMBER, 1.2, 4.0, Vector3(0, 1.45, 0), weapon)
	# A living flame crowns the staff.
	preload("res://scripts/world/spell_fx.gd").ambient_fire(weapon, Vector3(0, 1.4, 0), 0.11, true, false)
