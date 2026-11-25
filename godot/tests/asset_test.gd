extends Node
## Checks the Blender-made assets (assets/models/, assets/textures/materials/; see /assets.md):
## every model loads, characters have a skeleton and the six clips the game plays, and every
## material texture set is complete. Run: godot --headless --path godot res://tests/asset_test.tscn

const AssetModels = preload("res://scripts/models/asset_models.gd")
const Items = preload("res://scripts/data/items.gd")
const Classes = preload("res://scripts/data/classes.gd")
const Passives = preload("res://scripts/data/passives.gd")
## Nine-patch frames for the interface (scripts/assets/blender/ui_frames.py).
const UI_FRAMES := ["panel", "header", "well", "well_border", "button", "button_hover", "button_pressed",
	"tab", "tab_active", "tooltip", "bar_tray"]
const CLIPS := ["idle", "walk", "attack", "cast", "hit", "death"]
const CHARACTERS := ["warrior", "pyromancer", "rogue", "hollow", "crawler", "archer", "boss"]
const PROPS := ["torch_sconce", "barrel", "crate", "sarcophagus", "crypt_pillar", "gravestone_round",
	"gravestone_cross", "gravestone_slab", "lamp_post",
	# The town's building shells (docs/art/town-architecture-kit.md).
	"house_small", "house_medium", "house_large", "chapel", "mausoleum", "crypt_gate"]
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
	var missing := []
	for icon in Items.all_icons():
		if not ResourceLoader.exists("res://assets/textures/icons/items/%s.png" % icon):
			missing.append(icon)
	_check(missing.is_empty(), "every item base has an icon %s" % ("" if missing.is_empty() else str(missing)))
	missing = []
	for cls in Classes.CLASSES:
		for sk in Classes.skills(cls):
			if not ResourceLoader.exists("res://assets/textures/icons/skills/%s.png" % sk["id"]):
				missing.append(sk["id"])
	for id in Passives.all_ids():
		if not ResourceLoader.exists("res://assets/textures/icons/skills/%s.png" % id):
			missing.append(id)
	_check(missing.is_empty(), "every skill and passive has an icon %s" % ("" if missing.is_empty() else str(missing)))
	for f in UI_FRAMES:
		_check(ResourceLoader.exists("res://assets/textures/ui/%s.png" % f), "UI frame %s" % f)
	print("")
	if _failures.is_empty():
		print("ASSET TEST PASSED")
		get_tree().quit(0)
	else:
		print("ASSET TEST FAILED: ", ", ".join(_failures))
		get_tree().quit(1)
