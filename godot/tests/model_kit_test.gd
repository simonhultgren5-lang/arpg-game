extends Node
## Headless checks for the hand-built models.
##   godot --headless --path godot res://tests/model_kit_test.tscn
## Exits 0 when everything passed, 1 otherwise.

const K = preload("res://scripts/models/mesh_kit.gd")
const B = preload("res://scripts/world/build.gd")

const Player = preload("res://scripts/actors/player.gd")
const Enemy = preload("res://scripts/actors/enemy.gd")
const Props = preload("res://scripts/models/props_model.gd")

var _failures := PackedStringArray()


func _check(cond: bool, what: String) -> void:
	if cond:
		print("  ok   ", what)
	else:
		print("  FAIL ", what)
		_failures.append(what)


func _ready() -> void:
	_test_kit()
	_test_actors()
	_test_props()
	print("")
	if _failures.is_empty():
		print("MODEL KIT TEST PASSED")
		get_tree().quit(0)
	else:
		print("MODEL KIT TEST FAILED: ", _failures.size())
		get_tree().quit(1)


func _test_kit() -> void:
	var meshes := {
		"lathe": K.lathe(PackedVector2Array([Vector2(0, 0), Vector2(0.3, 0), Vector2(0.2, 1), Vector2(0, 1)]), 8),
		"limb": K.limb(0.1, 0.05, 1.0),
		"bevel_box": K.bevel_box(Vector3(1, 1, 1), 0.1),
		"plate": K.plate(0.6, 0.5, 0.05, 0.1),
		"blade": K.blade(1.0, 0.1, 0.03),
		"spike": K.spike(0.1, 0.4),
	}
	for key in meshes:
		var m: ArrayMesh = meshes[key]
		_check(m.get_surface_count() == 1, key + " has one surface")
		_check(m.get_aabb().size.length() > 0.01, key + " has volume")
	var limb: ArrayMesh = meshes["limb"]
	_check(absf(limb.get_aabb().size.y - 1.0) < 0.001, "limb is 1.0 long")
	_check(absf(limb.get_aabb().position.y + 1.0) < 0.001, "limb hangs below the origin")
	var blade: ArrayMesh = meshes["blade"]
	_check(absf(blade.get_aabb().position.y) < 0.001 and absf(blade.get_aabb().end.y - 1.0) < 0.001, "blade runs 0..length up from the hilt")
	_check(B.stylized_mat(Color.RED) is ShaderMaterial, "stylized_mat builds a ShaderMaterial")
	_check(B.styled_unique(Color.RED).rim_enabled, "styled_unique has a rim light")
	# Winding: front faces are clockwise, so geometric normals must point inward of the box.
	var arr := (meshes["bevel_box"] as ArrayMesh).surface_get_arrays(0)
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var normals: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var bad := 0
	for i in range(0, verts.size(), 3):
		var cross := (verts[i + 1] - verts[i]).cross(verts[i + 2] - verts[i])
		var centroid := (verts[i] + verts[i + 1] + verts[i + 2]) / 3.0
		if cross.dot(centroid) > 0.0 or normals[i].dot(centroid) <= 0.0:
			bad += 1
	_check(bad == 0, "bevel_box winding and normals face outward (bad: %d)" % bad)

# Measure vertices after all nested transforms, including the hand and weapon pivots.
func _check_size(root: Node3D, title: String, height: float, min_meshes: int) -> void:
	var meshes := root.find_children("*", "MeshInstance3D", true, false)
	_check(meshes.size() >= min_meshes, title + " mesh count")
	var bottom := INF
	var top := -INF
	for part: MeshInstance3D in meshes:
		for v in part.mesh.get_faces():
			var y := (part.global_transform * v).y - root.global_position.y
			bottom = minf(bottom, y)
			top = maxf(top, y)
	_check(absf(bottom) <= 0.01, "%s grounded (%.3f)" % [title, bottom])
	if height <= 0:
		return
	_check(top <= height + 0.001 and top >= 0.8 * height, "%s height %.3f / %.3f" % [title, top, height])


func _test_actors() -> void:
	var hero := Player.new()
	add_child(hero)
	hero._build_model()
	hero._animate(0.0)
	_check(hero._weapon.find_children("*", "MeshInstance3D", false, false).size() >= 2, "sword attached to swing pivot")
	_check(hero._weapon.get_node_or_null("Blade") is MeshInstance3D, "sword has named Blade")
	_check_size(hero, "warrior", 1.8, 7)
	hero.free()
	for kind in ["hollow", "archer"]:
		for size_factor: float in [0.8, 1.0, 1.25]:
			var foe := Enemy.new()
			add_child(foe)
			foe.kind = kind
			foe.data = Enemy.KINDS[kind]
			foe.elite = is_equal_approx(size_factor, 1.25)
			foe._model = Node3D.new()
			foe.add_child(foe._model)
			foe._build_model(size_factor)
			_check_size(foe, "%s x %s" % [kind, size_factor], 1.6 * size_factor, 7)
			var flashing := 0
			var glowing := 0
			var meshes := foe.find_children("*", "MeshInstance3D", true, false)
			for part: MeshInstance3D in meshes:
				if part.material_override is StandardMaterial3D and part.material_override in foe._mats:
					flashing += 1
				elif part.material_override is ShaderMaterial:
					glowing += 1
			_check(flashing > 6 and glowing == 2 and flashing + glowing == meshes.size(), kind + " body materials registered for flash and tint")
			foe.free()


func _test_props() -> void:
	var prop_root := Node3D.new()
	add_child(prop_root)
	for builder in [Props.sconce, Props.barrel, Props.sarcophagus]:
		var prop: Node3D = builder.call(prop_root, Vector3.ZERO)
		_check_size(prop, builder.get_method(), 0.0, 3)
	var torch := B.torch(prop_root, Vector3.ZERO)
	var light := torch.get_meta("light") as OmniLight3D
	_check(light != null and light.get_parent() == torch, "torch owns its light")
	_check(torch.get_script() == preload("res://scripts/world/flicker.gd") and torch._light == light, "flicker initialized with the torch light")
	prop_root.free()
