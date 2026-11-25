extends RefCounted
## The people of Hollowmere: Sister Maud, Edda the smith and Old Corwin. Original designs that
## follow their Field guide portraits (art/field_guide/maud.jpg, edda.jpg, corwin.jpg).
## Built with the same mesh kit and stylized rim-light materials as the hero and monsters.
## Each model stands with its feet at y = 0, about 1.75 units tall, facing +Z.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")


static func build(parent: Node3D, npc_id: String) -> void:
	var root := Node3D.new()
	root.name = "Townsfolk"
	parent.add_child(root)
	match npc_id:
		"maud": _maud(root)
		"edda": _edda(root)
		"corwin": _corwin(root)


# ------------------------------------------------------------------ shared parts

static func _skin() -> Material:
	return B.stylized_mat(Color(0.74, 0.58, 0.48), Color(1.0, 0.62, 0.35))


static func _head(parent: Node3D, pos: Vector3, skin: Material) -> Node3D:
	var head := Node3D.new()
	head.position = pos
	parent.add_child(head)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.08, 0.0), Vector2(0.12, 0.06), Vector2(0.13, 0.16),
		Vector2(0.1, 0.25), Vector2(0, 0.28)]), 10), skin)
	K.add(head, K.spike(0.025, 0.05, 4), skin, Vector3(0, 0.12, 0.12), Vector3(PI * 0.5, 0, 0))  # nose
	return head


## A lantern hanging from `hand`: iron cage, warm glass and a real light.
static func _lantern(hand: Node3D, offset := Vector3(0, -0.22, 0.04)) -> void:
	var iron := B.stylized_mat(Color(0.16, 0.14, 0.13), Color(1.0, 0.6, 0.3))
	var glow := B.stylized_mat(Color(1.0, 0.7, 0.35), Color(1, 0.7, 0.4), Color(1.0, 0.6, 0.25), 3.5)
	var lantern := Node3D.new()
	lantern.position = offset
	hand.add_child(lantern)
	K.add(lantern, K.limb(0.006, 0.006, 0.1, 4), iron, Vector3(0, 0.1, 0))  # bail
	K.add(lantern, K.lathe(PackedVector2Array([
		Vector2(0, 0.0), Vector2(0.03, 0.0), Vector2(0.075, -0.04), Vector2(0.0, -0.05)]), 6), iron)  # cap
	K.add(lantern, K.limb(0.05, 0.05, 0.14, 6), glow, Vector3(0, -0.05, 0))
	for i in 4:
		var a := TAU * i / 4.0 + PI * 0.25
		K.add(lantern, K.limb(0.008, 0.008, 0.16, 4), iron, Vector3(cos(a) * 0.055, -0.04, sin(a) * 0.055))
	K.add(lantern, K.bevel_box(Vector3(0.13, 0.03, 0.13), 0.01), iron, Vector3(0, -0.2, 0))
	B.omni(Color(1.0, 0.65, 0.32), 1.1, 4.5, Vector3(0, -0.12, 0.05), lantern)


# ------------------------------------------------------------------ Sister Maud

## Elderly abbess in a deep-red hooded habit with a cream embroidered panel, a gold cross,
## a lantern held high in her right hand and a ring of keys at her belt.
static func _maud(root: Node3D) -> void:
	var habit := B.stylized_mat(Color(0.34, 0.1, 0.12), Color(1.0, 0.55, 0.3))
	var habit_dark := B.stylized_mat(Color(0.22, 0.06, 0.08), Color(1.0, 0.5, 0.25))
	var linen := B.stylized_mat(Color(0.72, 0.64, 0.5), Color(1.0, 0.75, 0.5))
	var gold := B.stylized_mat(B.GOLD, Color(1.0, 0.8, 0.5))
	var leather := B.stylized_mat(Color(0.3, 0.19, 0.11), Color(1.0, 0.55, 0.3))
	var skin := _skin()
	# Floor-length habit, flared at the hem.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0.0), Vector2(0.42, 0.0), Vector2(0.38, 0.25), Vector2(0.3, 0.7),
		Vector2(0.27, 1.05), Vector2(0.3, 1.3), Vector2(0.26, 1.45), Vector2(0, 1.48)]), 14), habit,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.82))
	# Cream scapular panel down the front with a cross near the hem.
	K.add(root, K.plate(0.18, 1.1, 0.02, 0.05), linen, Vector3(0, 0.62, 0.3), Vector3(-0.08, 0, 0))
	K.add(root, K.bevel_box(Vector3(0.025, 0.14, 0.02), 0.004), habit_dark, Vector3(0, 0.22, 0.34))
	K.add(root, K.bevel_box(Vector3(0.09, 0.025, 0.02), 0.004), habit_dark, Vector3(0, 0.25, 0.34))
	# Cord belt, keys and a satchel on the left hip.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.27, 1.02), Vector2(0.29, 1.02), Vector2(0.29, 1.06), Vector2(0.27, 1.06), Vector2(0.27, 1.02)]), 12),
		linen, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.82))
	var keys := B.stylized_mat(Color(0.5, 0.45, 0.35), Color(1.0, 0.7, 0.4))
	for i in 3:
		K.add(root, K.limb(0.012, 0.012, 0.12, 4), keys, Vector3(-0.1 + i * 0.03, 0.98, 0.25), Vector3(0, 0, 0.2 - i * 0.2))
	K.add(root, K.bevel_box(Vector3(0.2, 0.18, 0.08), 0.03), leather, Vector3(-0.3, 0.85, 0.12), Vector3(0, -0.4, 0))
	# Mantle over the shoulders, open at the front.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 1.15), Vector2(0.4, 1.15), Vector2(0.36, 1.32), Vector2(0.22, 1.47), Vector2(0, 1.5)]), 14),
		habit_dark, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.8))
	K.add(root, K.limb(0.01, 0.01, 0.16, 4), gold, Vector3(0, 1.42, 0.25))  # cross chain
	K.add(root, K.bevel_box(Vector3(0.025, 0.12, 0.02), 0.005), gold, Vector3(0, 1.22, 0.27))
	K.add(root, K.bevel_box(Vector3(0.08, 0.025, 0.02), 0.005), gold, Vector3(0, 1.25, 0.27))
	# Head, wimple and hood.
	var head := _head(root, Vector3(0, 1.47, 0.03), skin)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0.06, -0.06), Vector2(0.16, -0.02), Vector2(0.15, 0.05), Vector2(0.1, 0.06)]), 10), linen)  # wimple
	# Hood: a shell behind the head that frames the face instead of covering it.
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0.17, -0.04), Vector2(0.18, 0.12), Vector2(0.16, 0.26), Vector2(0.09, 0.35), Vector2(0, 0.37)]), 12),
		habit, Vector3(0, 0, -0.1), Vector3(-0.1, 0, 0), Vector3(1.05, 1, 0.75))
	for side in [-1.0, 1.0]:
		K.add(head, K.plate(0.1, 0.36, 0.025, 0.04), habit, Vector3(side * 0.15, 0.12, 0.02), Vector3(0, side * 0.35, 0))
	K.add(head, K.plate(0.3, 0.45, 0.02, 0.12), habit, Vector3(0, 0.0, -0.16), Vector3(0.25, 0, 0))  # drape
	# Left hand at the belt; right hand holds the lantern out in front at chest height.
	var shoulder_l := Vector3(-0.27, 1.38, 0.02)
	var elbow_l := Vector3(-0.3, 1.12, 0.12)
	var hand_l := Vector3(-0.12, 1.02, 0.28)
	K.link(root, shoulder_l, elbow_l, 0.08, 0.075, habit)
	K.link(root, elbow_l, hand_l, 0.075, 0.07, habit)
	K.add(root, K.bevel_box(Vector3(0.08, 0.09, 0.07), 0.02), skin, hand_l)
	var shoulder_r := Vector3(0.27, 1.38, 0.02)
	var elbow_r := Vector3(0.36, 1.18, 0.22)
	var hand_r := Vector3(0.3, 1.34, 0.46)
	K.link(root, shoulder_r, elbow_r, 0.08, 0.075, habit)
	K.link(root, elbow_r, hand_r, 0.075, 0.07, habit)
	K.add(root, K.bevel_box(Vector3(0.08, 0.09, 0.07), 0.02), skin, hand_r)
	var grip := Node3D.new()
	grip.position = hand_r
	root.add_child(grip)
	_lantern(grip, Vector3(0, -0.06, 0.0))


# ------------------------------------------------------------------ Edda the smith

## Broad-shouldered smith with a long braid, rolled shirt sleeves, a scarred leather apron,
## bracers, a tool pouch and a heavy hammer hanging from her right hand.
static func _edda(root: Node3D) -> void:
	var shirt := B.stylized_mat(Color(0.48, 0.43, 0.36), Color(1.0, 0.6, 0.35))
	var apron := B.stylized_mat(Color(0.28, 0.16, 0.09), Color(1.0, 0.5, 0.25))
	var strap := B.stylized_mat(Color(0.2, 0.12, 0.07), Color(1.0, 0.5, 0.25))
	var hair := B.stylized_mat(Color(0.36, 0.15, 0.08), Color(1.0, 0.55, 0.3))
	var iron := B.stylized_mat(Color(0.3, 0.3, 0.33), Color(1.0, 0.55, 0.3))
	var brass := B.stylized_mat(Color(0.72, 0.5, 0.25), Color(1.0, 0.75, 0.45))
	var trousers := B.stylized_mat(Color(0.16, 0.13, 0.12), Color(1.0, 0.5, 0.25))
	var skin := _skin()
	# Legs and boots.
	for side in [-1.0, 1.0]:
		var foot := K.arm(root, trousers, Vector3(side * 0.13, 0.86, 0), 0.1, 0.085, 0.07, 0.42, 0.42,
			Vector3.ZERO, 0.0)
		K.add(foot, K.bevel_box(Vector3(0.14, 0.09, 0.28), 0.03), strap, Vector3(0, 0.0, 0.06))
	# Torso: shirt with a broad chest.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0.84), Vector2(0.25, 0.84), Vector2(0.27, 1.0), Vector2(0.33, 1.3),
		Vector2(0.36, 1.42), Vector2(0.22, 1.52), Vector2(0, 1.53)]), 12), shirt,
		Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.75))
	# Long apron: bib, skirt to the shins, wide belt with a brass ring and a hanging rag.
	K.add(root, K.plate(0.4, 0.42, 0.03, 0.12), apron, Vector3(0, 1.22, 0.21), Vector3(-0.05, 0, 0))
	K.add(root, K.plate(0.52, 0.72, 0.03, 0.16), apron, Vector3(0, 0.62, 0.21), Vector3(0.08, 0, 0))
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.27, 0.95), Vector2(0.295, 0.95), Vector2(0.295, 1.04), Vector2(0.27, 1.04), Vector2(0.27, 0.95)]), 12),
		strap, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.8))
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.03, 0), Vector2(0.045, 0), Vector2(0.045, 0.012), Vector2(0.03, 0.012), Vector2(0.03, 0)]), 10),
		brass, Vector3(-0.08, 0.88, 0.25), Vector3(PI * 0.5, 0, 0))
	K.add(root, K.plate(0.13, 0.32, 0.015, 0.05), shirt, Vector3(0.12, 0.84, 0.25), Vector3(0.05, 0, 0.12))  # rag
	K.add(root, K.bevel_box(Vector3(0.12, 0.2, 0.08), 0.02), strap, Vector3(0.29, 0.86, 0.08), Vector3(0, 0.3, 0))  # tool pouch
	for i in 3:
		K.add(root, K.limb(0.01, 0.012, 0.16, 4), iron, Vector3(0.27 + i * 0.025, 1.0, 0.08))
	for side in [-1.0, 1.0]:
		K.add(root, K.limb(0.018, 0.018, 0.5, 4), strap, Vector3(side * 0.13, 1.5, 0.15), Vector3(0.2, 0, -side * 0.15))  # bib straps
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0), Vector2(0.035, 0), Vector2(0.035, 0.01), Vector2(0, 0.012)]), 10),
		brass, Vector3(0.12, 1.36, 0.24), Vector3(PI * 0.5, 0, 0))  # badge
	# Head with a long braid over the right shoulder.
	var head := _head(root, Vector3(0, 1.52, 0.02), skin)
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0.135, 0.06), Vector2(0.14, 0.18), Vector2(0.11, 0.27), Vector2(0, 0.3)]), 10), hair,
		Vector3(0, 0, -0.02))
	for i in 6:
		K.add(root, K.lathe(PackedVector2Array([
			Vector2(0, 0), Vector2(0.04, 0.01), Vector2(0.045, 0.05), Vector2(0.03, 0.09), Vector2(0, 0.1)]), 6),
			hair, Vector3(0.12 - i * 0.004, 1.52 - i * 0.085, 0.13 + i * 0.012))
	# Rolled sleeves, bare forearms, bracers; hammer in the right hand.
	for side in [-1.0, 1.0]:
		var hand := K.arm(root, shirt, Vector3(side * 0.36, 1.42, 0.0), 0.085, 0.075, 0.06, 0.32, 0.3,
			Vector3(0.05, 0, side * 0.16), -0.25 if side > 0 else -0.9)
		K.add(hand, K.limb(0.065, 0.065, 0.12, 6), strap, Vector3(0, 0.15, 0))  # bracer
		K.add(hand, K.bevel_box(Vector3(0.09, 0.1, 0.08), 0.02), skin)
		if side > 0:
			K.add(hand, K.limb(0.022, 0.026, 0.62, 6), strap, Vector3(0, -0.02, 0.02), Vector3(0.2, 0, 0))
			K.add(hand, K.bevel_box(Vector3(0.12, 0.13, 0.24), 0.02), iron, Vector3(0, -0.6, 0.15), Vector3(0.2, 0, 0))


# ------------------------------------------------------------------ Old Corwin

## Bent old gravedigger: slouch hat, long patched coat, scarf, white beard, both hands
## folded on a tall staff and a small lantern hanging at his hip.
static func _corwin(root: Node3D) -> void:
	var coat := B.stylized_mat(Color(0.2, 0.19, 0.16), Color(1.0, 0.55, 0.3))
	var patch := B.stylized_mat(Color(0.3, 0.22, 0.15), Color(1.0, 0.55, 0.3))
	var hat := B.stylized_mat(Color(0.16, 0.13, 0.11), Color(1.0, 0.55, 0.3))
	var scarf := B.stylized_mat(Color(0.4, 0.17, 0.12), Color(1.0, 0.55, 0.3))
	var beard := B.stylized_mat(Color(0.82, 0.8, 0.76), Color(1.0, 0.85, 0.7))
	var wood := B.stylized_mat(Color(0.34, 0.24, 0.15), Color(1.0, 0.6, 0.3))
	var leather := B.stylized_mat(Color(0.26, 0.17, 0.1), Color(1.0, 0.5, 0.25))
	var skin := _skin()
	# Boots peeking out under a long coat.
	for side in [-1.0, 1.0]:
		K.add(root, K.bevel_box(Vector3(0.14, 0.1, 0.27), 0.03), leather, Vector3(side * 0.13, 0.05, 0.06))
	# Bent posture: everything above the hips leans forward.
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0, 0.08), Vector2(0.37, 0.08), Vector2(0.33, 0.5), Vector2(0.28, 0.95), Vector2(0, 0.98)]), 12),
		coat, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.85))
	var upper := Node3D.new()
	upper.position = Vector3(0, 0.95, 0)
	upper.rotation.x = 0.28
	root.add_child(upper)
	K.add(upper, K.lathe(PackedVector2Array([
		Vector2(0, 0.0), Vector2(0.28, 0.0), Vector2(0.31, 0.2), Vector2(0.33, 0.4),
		Vector2(0.22, 0.52), Vector2(0, 0.54)]), 12), coat, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.82))
	# Patches and belt.
	K.add(root, K.plate(0.14, 0.14, 0.015, 0.03), patch, Vector3(-0.2, 0.55, 0.24), Vector3(0, -0.3, 0))
	K.add(upper, K.plate(0.12, 0.12, 0.015, 0.03), patch, Vector3(0.18, 0.25, 0.22), Vector3(0, 0.4, 0))
	K.add(root, K.lathe(PackedVector2Array([
		Vector2(0.285, 0.86), Vector2(0.305, 0.86), Vector2(0.305, 0.92), Vector2(0.285, 0.92), Vector2(0.285, 0.86)]), 12),
		leather, Vector3.ZERO, Vector3.ZERO, Vector3(1, 1, 0.85))
	K.add(root, K.bevel_box(Vector3(0.18, 0.16, 0.08), 0.03), leather, Vector3(-0.32, 0.72, 0.05), Vector3(0, -0.5, 0))  # satchel
	# Scarf, with one tail hanging down the chest.
	K.add(upper, K.lathe(PackedVector2Array([
		Vector2(0.12, 0.44), Vector2(0.2, 0.46), Vector2(0.18, 0.55), Vector2(0.11, 0.56)]), 10), scarf)
	K.add(upper, K.plate(0.09, 0.42, 0.02, 0.03), scarf, Vector3(0.1, 0.25, 0.25), Vector3(0, 0, 0.08))
	# Head: beard, slouch hat.
	var head := _head(upper, Vector3(0, 0.55, 0.06), skin)
	head.rotation.x = -0.2
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, -0.1), Vector2(0.06, -0.08), Vector2(0.1, 0.0), Vector2(0.11, 0.08), Vector2(0.0, 0.1)]), 8),
		beard, Vector3(0, -0.01, 0.06), Vector3.ZERO, Vector3(1, 1, 0.8))
	K.add(head, K.lathe(PackedVector2Array([
		Vector2(0, 0.2), Vector2(0.27, 0.19), Vector2(0.28, 0.21), Vector2(0.14, 0.24),
		Vector2(0.15, 0.36), Vector2(0.08, 0.4), Vector2(0, 0.4)]), 12), hat, Vector3.ZERO, Vector3(0.12, 0, 0.06))
	# Tall staff planted in front, both hands folded on its top.
	var staff_top := Vector3(0.06, 1.3, 0.42)
	K.link(root, staff_top + Vector3(0, 0.08, 0), Vector3(0.08, 0.0, 0.48), 0.028, 0.032, wood)
	for side in [-1.0, 1.0]:
		var shoulder := Vector3(side * 0.3, 1.38, 0.1)
		var elbow := Vector3(side * 0.28, 1.1, 0.26)
		var hand := staff_top + Vector3(side * 0.03, 0.02 * (side + 1), 0)
		K.link(root, shoulder, elbow, 0.08, 0.07, coat)
		K.link(root, elbow, hand, 0.07, 0.06, coat)
		K.add(root, K.bevel_box(Vector3(0.09, 0.07, 0.1), 0.02), skin, hand + Vector3(0, 0.02, 0))
	# Lantern at the hip.
	var hip := Node3D.new()
	hip.position = Vector3(-0.22, 0.86, 0.22)
	root.add_child(hip)
	_lantern(hip, Vector3(0, -0.05, 0))
