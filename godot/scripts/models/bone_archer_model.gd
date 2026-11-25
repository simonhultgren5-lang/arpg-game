extends RefCounted
## The Bone Archer: a hooded skeleton with a hooped ribcage and a recurve bow.
## Original design. Bone surfaces use `mat_for` (flash / elite tint); eyes use the glow material.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func _hoop(r_in: float, r_out: float, y0: float, y1: float) -> ArrayMesh:
	return K.lathe(PackedVector2Array([
		Vector2(r_out, y0), Vector2(r_out, y1), Vector2(r_in, y1), Vector2(r_in, y0), Vector2(r_out, y0)]), 12)


static func build(parent: Node3D, s: float, col: Color, mat_for: Callable) -> void:
	var bone: Material = mat_for.call(col)
	var dark_bone: Material = mat_for.call(col.darkened(0.3))
	var cloth: Material = mat_for.call(Color(0.15, 0.12, 0.14))
	var wood: Material = mat_for.call(Color(0.28, 0.18, 0.1))
	B.surface_grain(cloth, Vector3(1.3, 0.55, 1.3))
	var eye := B.stylized_mat(Color(1, 0.6, 0.2), Color(1, 0.5, 0.2), Color(1, 0.45, 0.15), 4.0)
	var knee := SphereMesh.new()
	knee.radius = 0.055
	knee.height = 0.11
	knee.radial_segments = 6
	knee.rings = 3
	var root := Node3D.new()
	root.scale = Vector3.ONE * s * 0.73
	parent.add_child(root)

	# Legs: femur, shin, foot.
	for side in [-1.0, 1.0]:
		var foot := K.arm(root, bone, Vector3(side * 0.13, 0.765, 0), 0.06, 0.045, 0.035, 0.38, 0.38,
			Vector3.ZERO, 0.0)
		K.add(foot, K.bevel_box(Vector3(0.09, 0.05, 0.2), 0.012), dark_bone, Vector3(0, 0.02, 0.06))
		K.add(root, knee, bone, Vector3(side * 0.13, 0.4, 0))
	# Pelvis and spine.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.0, 0.7), Vector2(0.2, 0.7), Vector2(0.24, 0.8), Vector2(0.15, 0.9), Vector2(0, 0.9)]), 8), bone,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.7))
	K.add(root, K.limb(0.04, 0.045, 0.6, 6), bone, Vector3(0, 1.55, -0.04))
	# Hooped ribcage, narrowing upward, with a breastbone.
	for i in 5:
		var y := 1.0 + i * 0.1
		var w := 0.24 - absf(i - 1.5) * 0.025
		K.add(root, _hoop(w - 0.03, w, y, y + 0.045), bone, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.7))
	K.add(root, K.limb(0.025, 0.02, 0.4, 5), bone, Vector3(0, 1.4, 0.17))
	# Shoulders and clavicle.
	K.add(root, K.limb(0.03, 0.03, 0.6, 5), bone, Vector3(-0.3, 1.52, 0.0), Vector3(0, 0, PI * 0.5))
	for side in [-1.0, 1.0]:
		K.add(root, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.14, 0), Vector2(0.15, 0.05), Vector2(0.09, 0.13), Vector2(0, 0.15)]), 8),
			cloth, Vector3(side * 0.3, 1.5, 0), Vector3(0, 0, -side * 0.3))
	# Arms: left holds the bow forward, right pulls back.
	var hand_l := K.arm(root, bone, Vector3(-0.3, 1.5, 0.0), 0.04, 0.035, 0.03, 0.3, 0.3,
		Vector3(-1.2, 0, -0.1), -0.2)
	var hand_r := K.arm(root, bone, Vector3(0.3, 1.5, 0.0), 0.04, 0.035, 0.03, 0.3, 0.3,
		Vector3(-0.5, 0, 0.3), -1.0)
	K.add(hand_r, K.bevel_box(Vector3(0.06, 0.06, 0.05), 0.01), bone)
	# Recurve bow in the left hand: grip, two curved limbs and the string.
	var bow := Node3D.new()
	hand_l.add_child(bow)
	bow.global_basis = root.global_basis
	var upper_tip := Vector3(-0.48, 0.38, -0.1)
	var lower_tip := Vector3(0.48, -0.38, -0.1)
	for tip in [upper_tip, lower_tip]:
		var knee_pos: Vector3 = tip * 0.64 + Vector3(0, 0, 0.13)
		K.link(bow, Vector3.ZERO, knee_pos, 0.036, 0.029, wood)
		K.link(bow, knee_pos, tip, 0.029, 0.012, wood)
	K.link(bow, upper_tip, lower_tip, 0.008, 0.008, dark_bone)
	# Skull under a ragged hood.
	var head := Node3D.new()
	head.position = Vector3(0, 1.62, 0.04)
	root.add_child(head)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.09, 0), Vector2(0.15, 0.07), Vector2(0.17, 0.2),
		Vector2(0.12, 0.31), Vector2(0, 0.34)]), 8), bone, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 1.1))
	K.add(head, K.bevel_box(Vector3(0.13, 0.07, 0.12), 0.02), dark_bone, Vector3(0, 0.01, 0.1))  # jaw
	for side in [-1.0, 1.0]:
		K.add(head, K.plate(0.11, 0.08, 0.035, 0.018), dark_bone, Vector3(side * 0.065, 0.175, 0.145), Vector3(0, side * 0.25, side * 0.19))
		K.add(head, K.spike(0.04, 0.05, 4), eye, Vector3(side * 0.065, 0.17, 0.15), Vector3(PI * 0.5, 0, 0))
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.0, 1.5), Vector2(0.22, 1.5), Vector2(0.26, 1.7), Vector2(0.2, 1.95),
		Vector2(0.08, 2.08), Vector2(0, 2.1)]), 10), cloth, Vector3(0, 0, -0.05), Vector3(-0.1, 0, 0), Vector3(1, 1, 1.05))
	K.add(root, K.spike(0.07, 0.3, 4), cloth, Vector3(0, 2.0, -0.2), Vector3(-1.1, 0, 0))  # hood tail
	for side in [-1.0, 1.0]:
		K.add(head, K.spike(0.06, 0.22, 5), dark_bone, Vector3(side * 0.14, 0.21, 0),
			Vector3(-0.4, 0, -side * 0.75))
	# Ragged cloak strips hanging from the shoulders.
	for i in 4:
		K.add(root, K.plate(0.1, 0.5 - i * 0.04, 0.02, 0.01), cloth,
			Vector3(-0.15 + i * 0.1, 1.3, -0.17), Vector3(0.12, 0, (i - 1.5) * 0.05))
