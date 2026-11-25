extends RefCounted
## Models made in Blender (assets/models/, built by scripts/assets/build.mjs; see /assets.md).
##
##   var hero := AssetModels.character("warrior")   # a Node3D, or null when there's no model yet
##   var mats := AssetModels.prepare(hero, tint)    # per-instance materials, tint_* recoloured
##
## Actors fall back to their code-built models when a model is missing, so a model can be added
## (or removed) without touching gameplay code.

const CHARACTERS := "res://assets/models/characters/%s.gltf"
const PROPS := "res://assets/models/props/%s.gltf"
const CharacterAnimator = preload("res://scripts/models/character_animator.gd")

static var _scenes := {}


static func _scene(path: String) -> PackedScene:
	if not _scenes.has(path):
		_scenes[path] = load(path) if ResourceLoader.exists(path) else null
	return _scenes[path]


static func character(id: String) -> Node3D:
	var s := _scene(CHARACTERS % id)
	return s.instantiate() as Node3D if s else null


static func prop(id: String) -> Node3D:
	var s := _scene(PROPS % id)
	return s.instantiate() as Node3D if s else null


static func has_prop(id: String) -> bool:
	return _scene(PROPS % id) != null


## Gives every surface its own copy of its material (so hit flashes and elite tints don't leak to
## other monsters), recolours materials named tint_* with `tint` (when it isn't transparent black),
## and turns emission on so flashes can use it. Returns the materials, tinted ones first.
static func prepare(root: Node, tint := Color(0, 0, 0, 0)) -> Array[StandardMaterial3D]:
	var tinted: Array[StandardMaterial3D] = []
	var plain: Array[StandardMaterial3D] = []
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var mesh_instance := mi as MeshInstance3D
		for i in mesh_instance.get_surface_override_material_count():
			var base := mesh_instance.get_active_material(i) as StandardMaterial3D
			if base == null:
				continue
			var m := base.duplicate() as StandardMaterial3D
			var is_tint := base.resource_name.begins_with("tint_")
			if is_tint and tint.a > 0.0:
				m.albedo_color = tint
			if not m.emission_enabled:
				m.emission_enabled = true
				m.emission = Color.BLACK
			mesh_instance.set_surface_override_material(i, m)
			(tinted if is_tint else plain).append(m)
	tinted.append_array(plain)
	return tinted


## Adds a CharacterAnimator to a character model, or returns null when it has no animations.
static func animate(model: Node) -> Node:
	var ap := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if ap == null:
		return null
	var a := CharacterAnimator.new()
	a.name = "CharacterAnimator"
	model.add_child(a)
	a.setup(ap)
	return a
