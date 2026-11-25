extends Node3D
## A drop on the ground: gold, a draught (potion) or an item. Picked up by walking over it.

const B = preload("res://scripts/world/build.gd")
const Items = preload("res://scripts/data/items.gd")

var world: Node3D
var kind := "gold"  # "gold", "potion", "item"
var gold := 0
var item: Dictionary = {}
var _t := 0.0
var _visual: Node3D
var _full_warned := false


func setup() -> void:
	_visual = Node3D.new()
	add_child(_visual)
	_t = randf() * 5.0
	match kind:
		"gold":
			var m := B.mat(Color(0.95, 0.75, 0.3), 0.3, Color(0.6, 0.4, 0.1), 1.2, 0.9)
			for i in 3:
				B.cylinder(0.14, 0.14, 0.05, m, Vector3(randf_range(-0.15, 0.15), 0.05 + i * 0.05, randf_range(-0.15, 0.15)), _visual, 10)
			_label(B.label("%d gold" % gold, Color(0.95, 0.8, 0.45), Vector3(0, 0.7, 0), self, 28))
		"potion":
			B.cylinder(0.12, 0.16, 0.3, B.mat(Color(0.8, 0.15, 0.15), 0.2, Color(0.7, 0.1, 0.1), 1.5), Vector3(0, 0.2, 0), _visual, 8)
			B.cylinder(0.05, 0.05, 0.12, B.mat(Color(0.3, 0.2, 0.1)), Vector3(0, 0.42, 0), _visual, 6)
			_label(B.label("Grave-moss draught", Color(0.9, 0.45, 0.45), Vector3(0, 0.8, 0), self, 28))
		"item":
			var rarity := int(item.get("rarity", 0))
			var col: Color = Items.RARITY_COLORS[rarity]
			var m := B.mat(col.darkened(0.3), 0.4, col, 0.8 + rarity * 0.6, 0.5)
			match item.get("slot", ""):
				"weapon":
					var w := B.box(Vector3(0.1, 0.06, 1.0), m, Vector3(0, 0.15, 0), _visual)
					w.rotation.y = randf() * TAU
				"chest", "legs", "shoulders", "head", "offhand":
					B.box(Vector3(0.6, 0.25, 0.45), m, Vector3(0, 0.15, 0), _visual)
				_:
					B.sphere(0.16, m, Vector3(0, 0.2, 0), _visual, 8)
			if rarity >= 2:
				var beam := MeshInstance3D.new()
				var cyl := CylinderMesh.new()
				cyl.top_radius = 0.05
				cyl.bottom_radius = 0.25
				cyl.height = 5.0
				beam.mesh = cyl
				var bm := StandardMaterial3D.new()
				bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
				bm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
				bm.albedo_color = Color(col.r, col.g, col.b, 0.25)
				beam.material_override = bm
				beam.position = Vector3(0, 2.5, 0)
				add_child(beam)
			_label(B.label(str(item.get("name", "Item")), col, Vector3(0, 0.75, 0), self, 30))


func _process(delta: float) -> void:
	_t += delta
	if _visual:
		_visual.position.y = 0.1 + sin(_t * 2.5) * 0.06
		_visual.rotation.y += delta * 0.8
	var p: Node3D = world.player if world else null
	if p == null or p.dead:
		return
	var d := Vector2(p.global_position.x - global_position.x, p.global_position.z - global_position.z).length()
	if d > 1.4:
		_full_warned = false
		return
	match kind:
		"gold":
			Game.add_gold(gold)
			ActAudio.cue("inventory", -21.0, null, 120)
			world.pickup_text(global_position, "+%d gold" % gold, Color(0.95, 0.8, 0.45))
			queue_free()
		"potion":
			if int(Game.progress["potions"]) < 9:
				Game.add_potion(1)
				ActAudio.cue("inventory", -19.0, null, 120)
				world.pickup_text(global_position, "+1 draught", Color(0.95, 0.45, 0.45))
				queue_free()
		"item":
			if Game.inventory().size() < Game.INVENTORY_SIZE:
				Game.add_item(item)
				ActAudio.cue("inventory", -18.0, null, 120)
				world.pickup_text(global_position, str(item.get("name", "Item")), Items.RARITY_COLORS[int(item.get("rarity", 0))])
				queue_free()
			elif not _full_warned:
				_full_warned = true
				Game.message.emit("Your pack is full. Salvage something (right-click in the pack, I).", Color(0.9, 0.4, 0.3))


## Loot names show unless the player turned them off (Settings, Gameplay).
func _label(l: Label3D) -> void:
	l.add_to_group("loot_labels")
	l.visible = bool(Settings.get_value("gameplay", "loot_labels"))
