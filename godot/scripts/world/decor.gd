extends RefCounted
## The set decorator: places models in a level from a data file, and lets the dev console dress the world.
##
## Layouts live in res://data/decor/<area>.json (area = "town" or "catacomb"):
##   {"items":   [{"id": "crate", "x": 12.0, "z": 20.5, "y": 0.0, "yaw": 35, "scale": 1.0}],
##    "scatter": [{"id": "spruce", "x": 60, "z": 100, "radius": 8, "count": 12, "seed": 4, "min": 0.8, "max": 1.3}]}
## x and z are world metres (a cell is 2 m), yaw is degrees, y lifts the model off the ground.
## Dev console: decor list | add <id> [yaw] [scale] | scatter <id> <count> <radius> | undo | save.
## Decor is visual dressing; it has no collision, so keep it off the paths the hero walks.

const TreeKit = preload("res://scripts/models/tree_kit.gd")
const AssetModels = preload("res://scripts/models/asset_models.gd")
const B = preload("res://scripts/world/build.gd")
const DIR := "res://data/decor/"

## Every id the decorator can place: Blender props from assets/models/props, and code-built nature.
const PROPS := ["barrel", "bone_pile", "brazier", "chimney", "crate", "crypt_pillar", "dead_tree", "gravestone_cross",
	"gravestone_round", "gravestone_slab", "handcart", "lamp_post", "sarcophagus", "torch_sconce", "well"]
const NATURE := ["spruce", "oak", "birch", "boulder"]

static var _mesh_cache := {}


static func ids() -> Array:
	return PROPS + NATURE


## Places one model and returns it (null for an unknown id). The node is tagged so it can be saved.
static func place(parent: Node, id: String, pos: Vector3, yaw_deg := 0.0, scale := 1.0) -> Node3D:
	var node: Node3D = null
	if id in PROPS:
		node = AssetModels.prop(id)
	elif id in NATURE:
		var mi := MeshInstance3D.new()
		mi.mesh = _nature_mesh(id)
		if id == "boulder":
			mi.material_override = B.pbr("stone_wall", Color(0.62, 0.6, 0.68), 0.5, 1.0, 0.0, 1.8)
		node = mi
	if node == null:
		return null
	node.position = pos
	node.rotation.y = deg_to_rad(yaw_deg)
	node.scale = Vector3.ONE * scale
	node.set_meta("decor_id", id)
	node.add_to_group("decor")
	parent.add_child(node)
	return node


static func _nature_mesh(id: String) -> Mesh:
	if not _mesh_cache.has(id):
		match id:
			"spruce": _mesh_cache[id] = TreeKit.spruce(101, 6)
			"oak": _mesh_cache[id] = TreeKit.oak(201)
			"birch": _mesh_cache[id] = TreeKit.birch(301)
			_: _mesh_cache[id] = preload("res://scripts/world/fen.gd")._boulder(501)
	return _mesh_cache[id]


## Builds a level's saved layout under a "Decor" node and returns it.
static func load_layout(world: Node3D, area: String) -> Node3D:
	var root := Node3D.new()
	root.name = "Decor"
	world.add_child(root)
	var data := read(area)
	for item in data.get("items", []):
		place(root, str(item.get("id", "")), Vector3(float(item.get("x", 0)), float(item.get("y", 0)), float(item.get("z", 0))),
			float(item.get("yaw", 0)), float(item.get("scale", 1)))
	for rule in data.get("scatter", []):
		scatter(root, str(rule.get("id", "")), Vector2(float(rule.get("x", 0)), float(rule.get("z", 0))), float(rule.get("radius", 4)),
			int(rule.get("count", 6)), int(rule.get("seed", 1)), float(rule.get("min", 0.85)), float(rule.get("max", 1.2)))
	return root


## Drops `count` models in a disc, spaced apart, each with its own turn and size (a copse, a rubble field).
static func scatter(parent: Node, id: String, centre: Vector2, radius: float, count: int, seed_value := 1, lo := 0.85, hi := 1.2) -> Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var spots: Array[Vector2] = []
	var made := []
	var tries := 0
	while spots.size() < count and tries < count * 20:
		tries += 1
		var a := rng.randf() * TAU
		var r := radius * sqrt(rng.randf())
		var p := centre + Vector2(cos(a), sin(a)) * r
		var clear := true
		for q in spots:
			if p.distance_to(q) < maxf(radius * 0.22, 1.2):
				clear = false
		if not clear:
			continue
		spots.append(p)
		var node := place(parent, id, Vector3(p.x, 0, p.y), rng.randf() * 360.0, rng.randf_range(lo, hi))
		if node:
			node.set_meta("from_scatter", true)
			made.append(node)
	return made


static func read(area: String) -> Dictionary:
	var path := DIR + area + ".json"
	if not FileAccess.file_exists(path):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	return parsed if parsed is Dictionary else {}


## Writes every decor node under the world's Decor root (items only; scatter rules are kept from the file).
static func save_layout(world: Node3D, area: String) -> String:
	var root := world.get_node_or_null("Decor")
	if root == null:
		return "no decor to save"
	var data := read(area)
	var items := []
	for n in root.get_children():
		if n.has_meta("decor_id") and not n.has_meta("from_scatter"):
			items.append({"id": n.get_meta("decor_id"), "x": snappedf(n.position.x, 0.01), "y": snappedf(n.position.y, 0.01), "z": snappedf(n.position.z, 0.01),
				"yaw": snappedf(rad_to_deg(n.rotation.y), 0.1), "scale": snappedf(n.scale.x, 0.01)})
	data["items"] = items
	var dir := ProjectSettings.globalize_path(DIR)
	DirAccess.make_dir_recursive_absolute(dir)
	var f := FileAccess.open(DIR + area + ".json", FileAccess.WRITE)
	if f == null:
		return "could not write %s (exported builds are read-only)" % (DIR + area + ".json")
	f.store_string(JSON.stringify(data, "\t"))
	return "saved %d items to %s" % [items.size(), DIR + area + ".json"]
