extends Node
## Checks the Blender-made assets (assets/models/, assets/textures/materials/; see /assets.md):
## every model loads, characters have a skeleton and the six clips the game plays, and every
## material texture set is complete. Run: godot --headless --path godot res://tests/asset_test.tscn

const AssetModels = preload("res://scripts/models/asset_models.gd")
const CLIPS := ["idle", "walk", "attack", "cast", "hit", "death"]
const CHARACTERS := ["warrior", "pyromancer", "rogue", "hollow", "crawler", "archer", "boss"]
const PROPS := ["torch_sconce", "barrel", "crate", "sarcophagus", "crypt_pillar", "gravestone_round",
	"gravestone_cross", "gravestone_slab", "lamp_post"]
const MATERIALS := ["stone_wall", "flagstone", "cobble", "earth", "timber", "plaster", "roof_slate",
	"steel", "leather", "cloth", "skin", "bone"]

var _failures := PackedStringArray()


func _check(ok: bool, what: String) -> void:
	print("  ok   " if ok else "  FAIL ", what)
	if not ok:
		_failures.append(what)


func _ready() -> void:
	for id in CHARACTERS:
		var m := AssetModels.character(id)
		_check(m != null, "character %s loads" % id)
		if m == null:
			continue
		var skel := m.find_children("*", "Skeleton3D", true, false)
		_check(skel.size() == 1 and skel[0].get_bone_count() >= 10, "%s has a skeleton" % id)
		var ap := m.find_child("AnimationPlayer", true, false) as AnimationPlayer
		var missing := CLIPS.filter(func(c): return ap == null or not ap.has_animation(c))
		_check(missing.is_empty(), "%s has every clip %s" % [id, "" if missing.is_empty() else "(missing %s)" % ", ".join(missing)])
		var tinted := AssetModels.prepare(m, Color.RED)
		_check(not tinted.is_empty(), "%s has materials" % id)
		m.free()
	for id in PROPS:
		var p := AssetModels.prop(id)
		_check(p != null and p.find_children("*", "MeshInstance3D", true, false).size() > 0, "prop %s loads" % id)
		if p:
			p.free()
	for name in MATERIALS:
		var ok := true
		for part in ["albedo", "normal", "roughness"]:
			ok = ok and ResourceLoader.exists("res://assets/textures/materials/%s_%s.png" % [name, part])
		_check(ok, "texture set %s" % name)
	print("")
	if _failures.is_empty():
		print("ASSET TEST PASSED")
		get_tree().quit(0)
	else:
		print("ASSET TEST FAILED: ", ", ".join(_failures))
		get_tree().quit(1)
