extends RefCounted
## The Sunken Crypt: a procedurally assembled level of room and corridor tiles.
##
## The map is a 4x4 grid of slots. A random walk picks a main path of rooms from the entry stairs to
## the bell-pit (boss room); a few side rooms branch off it. Each room uses one of several tile
## templates (hall, pillared nave, ossuary, flooded chapel). Corridors run centre to centre, and props
## never block a room's centre row or column, so every room stays reachable.

const LevelGrid = preload("res://scripts/world/level_grid.gd")
const LevelMesh = preload("res://scripts/world/level_mesh.gd")
const B = preload("res://scripts/world/build.gd")
const Interactable = preload("res://scripts/world/interactable.gd")

const SLOTS := 4
const SLOT := 11
const TEMPLATES := ["hall", "pillars", "ossuary", "flooded"]

var grid: LevelGrid
var rooms: Array = []  # {rect: Rect2i, kind: String, template: String, center: Vector2i}
var spawn := Vector3.ZERO
var stairs_pos := Vector3.ZERO
var boss_pos := Vector3.ZERO
var _flooded := {}


func build(world: Node3D, rng: RandomNumberGenerator) -> void:
	var size := SLOTS * SLOT + 2
	grid = LevelGrid.new(size, size)
	rooms = []
	# ---- choose slots: main path by random walk, then branches
	var used := {}
	var path: Array[Vector2i] = []
	var cur := Vector2i(rng.randi_range(0, SLOTS - 1), SLOTS - 1)
	path.append(cur)
	used[cur] = true
	var want := rng.randi_range(6, 8)
	var guard := 0
	while path.size() < want and guard < 200:
		guard += 1
		var options: Array[Vector2i] = []
		for d in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var n: Vector2i = cur + d
			if n.x >= 0 and n.y >= 0 and n.x < SLOTS and n.y < SLOTS and not used.has(n):
				options.append(n)
		if options.is_empty():
			break
		# Prefer heading north (away from the entry), so the bell-pit is deep.
		options.sort_custom(func(a, b): return a.y < b.y)
		cur = options[0] if rng.randf() < 0.45 else options[rng.randi() % options.size()]
		path.append(cur)
		used[cur] = true
	var links: Array = []
	for i in range(path.size() - 1):
		links.append([path[i], path[i + 1]])
	var branches: Array[Vector2i] = []
	for attempt in 12:
		if branches.size() >= 3:
			break
		var from: Vector2i = path[rng.randi_range(1, path.size() - 2)] if path.size() > 2 else path[0]
		var d: Vector2i = [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN][rng.randi() % 4]
		var n := from + d
		if n.x >= 0 and n.y >= 0 and n.x < SLOTS and n.y < SLOTS and not used.has(n):
			used[n] = true
			branches.append(n)
			links.append([from, n])

	# ---- carve rooms
	var slot_room := {}
	for i in path.size():
		var kind := "normal"
		if i == 0:
			kind = "start"
		elif i == path.size() - 1:
			kind = "boss"
		slot_room[path[i]] = _carve_room(path[i], kind, rng)
	for b in branches:
		slot_room[b] = _carve_room(b, "side", rng)
	# ---- corridors
	for link in links:
		var ra: Dictionary = slot_room[link[0]]
		var rb: Dictionary = slot_room[link[1]]
		_carve_corridor(ra["center"], rb["center"], rng)
	# ---- props (after corridors; never on a room's centre cross)
	for room in rooms:
		_place_props(room, rng)
	grid.build_astar()

	# ---- geometry
	var level := Node3D.new()
	level.name = "Catacomb"
	world.add_child(level)
	var floor_color := func(c: Vector2i) -> Color:
		var n := rng.randf()
		if _flooded.has(c):
			return Color(0.05, 0.07, 0.09).lerp(Color(0.07, 0.1, 0.12), n)
		return Color(0.13, 0.12, 0.13).lerp(Color(0.18, 0.16, 0.16), n)
	var wall_mat := LevelMesh.build(grid, level, 2.6, Color(0.21, 0.18, 0.2), floor_color, rng)
	world.set("wall_material", wall_mat)
	for room in rooms:
		_decorate(level, room, rng)
		_torches(level, room, rng)
	_corridor_torches(level, rng)

	# ---- entry stairs, spawn, boss
	var start: Dictionary = rooms[0]
	var sc: Vector2i = start["center"]
	stairs_pos = grid.center(sc + Vector2i(0, -1))
	spawn = grid.center(sc + Vector2i(0, 1))
	var stairs := Interactable.new()
	stairs.kind = "stairs"
	stairs.display_name = "Stairs to Hollowmere"
	stairs.radius = 2.4
	stairs.position = stairs_pos
	level.add_child(stairs)
	for i in 5:
		B.box(Vector3(1.8, 0.25, 0.45), B.mat(Color(0.2, 0.18, 0.2)), Vector3(0, 0.12 + i * 0.25, -0.2 - i * 0.4 + 0.8), stairs)
	B.omni(Color(0.6, 0.6, 0.85), 1.2, 6.0, Vector3(0, 2.5, -0.5), stairs)
	B.label("Stairs to Hollowmere", B.GOLD, Vector3(0, 2.6, 0), stairs, 36)
	world.call("register_interactable", stairs)
	for room in rooms:
		if room["kind"] == "boss":
			boss_pos = grid.center(room["center"])


func _carve_room(slot: Vector2i, kind: String, rng: RandomNumberGenerator) -> Dictionary:
	var rw: int
	var rh: int
	match kind:
		"boss":
			rw = 9
			rh = 9
		"start":
			rw = 5
			rh = 5
		_:
			rw = rng.randi_range(5, 9)
			rh = rng.randi_range(5, 9)
	var ox := 1 + slot.x * SLOT + 1 + rng.randi_range(0, SLOT - 2 - rw)
	var oy := 1 + slot.y * SLOT + 1 + rng.randi_range(0, SLOT - 2 - rh)
	var rect := Rect2i(ox, oy, rw, rh)
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			grid.set_cell(Vector2i(x, y), LevelGrid.FLOOR)
	var template := "hall"
	if kind == "normal" or kind == "side":
		template = TEMPLATES[rng.randi() % TEMPLATES.size()]
	elif kind == "boss":
		template = "pillars"
	var room := {
		"rect": rect, "kind": kind, "template": template,
		"center": Vector2i(rect.position.x + rw / 2, rect.position.y + rh / 2),
	}
	rooms.append(room)
	return room


func _carve_corridor(a: Vector2i, b: Vector2i, rng: RandomNumberGenerator) -> void:
	var horizontal_first := rng.randf() < 0.5
	var corner := Vector2i(b.x, a.y) if horizontal_first else Vector2i(a.x, b.y)
	_carve_line(a, corner)
	_carve_line(corner, b)


func _carve_line(a: Vector2i, b: Vector2i) -> void:
	var c := a
	var step := Vector2i(signi(b.x - a.x), signi(b.y - a.y))
	while true:
		grid.set_cell(c, LevelGrid.FLOOR)
		# two cells wide
		if step.x != 0:
			grid.set_cell(c + Vector2i(0, 1), LevelGrid.FLOOR)
		else:
			grid.set_cell(c + Vector2i(1, 0), LevelGrid.FLOOR)
		if c == b:
			break
		c += step


func _on_cross(room: Dictionary, c: Vector2i) -> bool:
	var ctr: Vector2i = room["center"]
	return absi(c.x - ctr.x) <= 1 or absi(c.y - ctr.y) <= 1


func _place_props(room: Dictionary, rng: RandomNumberGenerator) -> void:
	var rect: Rect2i = room["rect"]
	match room["template"]:
		"pillars":
			for y in range(rect.position.y + 1, rect.end.y - 1, 3):
				for x in range(rect.position.x + 1, rect.end.x - 1, 3):
					var c := Vector2i(x, y)
					if not _on_cross(room, c) and room["kind"] != "boss":
						grid.set_cell(c, LevelGrid.PROP)
			if room["kind"] == "boss":
				for c in [rect.position + Vector2i(1, 1), Vector2i(rect.end.x - 2, rect.position.y + 1),
						Vector2i(rect.position.x + 1, rect.end.y - 2), rect.end - Vector2i(2, 2)]:
					grid.set_cell(c, LevelGrid.PROP)
		"ossuary":
			for y in range(rect.position.y + 1, rect.end.y - 1):
				for x in range(rect.position.x + 1, rect.end.x - 1):
					var c := Vector2i(x, y)
					if not _on_cross(room, c) and rng.randf() < 0.22:
						grid.set_cell(c, LevelGrid.PROP)
		"flooded":
			for y in range(rect.position.y, rect.end.y):
				for x in range(rect.position.x, rect.end.x):
					_flooded[Vector2i(x, y)] = true


func _decorate(level: Node3D, room: Dictionary, rng: RandomNumberGenerator) -> void:
	var rect: Rect2i = room["rect"]
	var stone := B.mat(Color(0.25, 0.22, 0.24))
	for y in range(rect.position.y, rect.end.y):
		for x in range(rect.position.x, rect.end.x):
			var c := Vector2i(x, y)
			if grid.get_cell(c) != LevelGrid.PROP:
				continue
			var p := grid.center(c)
			match room["template"]:
				"pillars":
					var pillar := preload("res://scripts/models/props_model.gd").asset(level, "crypt_pillar", p)
					if pillar:
						pillar.rotation.y = rng.randi_range(0, 3) * PI * 0.5
					else:
						B.cylinder(0.55, 0.65, 2.6, stone, p + Vector3(0, 1.3, 0), level, 8)
						B.box(Vector3(1.5, 0.3, 1.5), stone, p + Vector3(0, 0.15, 0), level)
				"ossuary":
					var sarc := preload("res://scripts/models/props_model.gd").sarcophagus(level, p)
					sarc.rotation.y = rng.randi_range(0, 1) * PI * 0.5
	# scattered bones and candles
	for i in rng.randi_range(2, 5):
		var c := grid.random_floor_near(room["center"], 3, rng)
		var p := grid.center(c) + Vector3(rng.randf_range(-0.7, 0.7), 0, rng.randf_range(-0.7, 0.7))
		var bone := B.cylinder(0.04, 0.05, 0.5, B.mat(Color(0.7, 0.66, 0.58)), p + Vector3(0, 0.05, 0), level, 5)
		bone.rotation = Vector3(PI * 0.5, rng.randf() * TAU, 0)
	# Dressing on its own RNG so the layout and monster seed never shift.
	var dress := RandomNumberGenerator.new()
	dress.seed = int(room["center"].x) * 7919 + int(room["center"].y) * 104729
	var Props = preload("res://scripts/models/props_model.gd")
	for i in dress.randi_range(1, 3):
		var bc := grid.random_floor_near(room["center"], 4, dress)
		Props.bone_pile(level, grid.center(bc) + Vector3(dress.randf_range(-0.6, 0.6), 0, dress.randf_range(-0.6, 0.6)), dress)
	if room["kind"] != "boss" and rect.size.x * rect.size.y >= 40:
		var bc := grid.random_floor_near(room["center"], 2, dress)
		Props.brazier(level, grid.center(bc), 8.0, 1.8)
	if room["template"] == "flooded":
		var r := rect
		var water_material := ShaderMaterial.new()
		water_material.shader = preload("res://shaders/crypt_water.gdshader")
		var water := B.box(Vector3(r.size.x * LevelGrid.CELL, 0.05, r.size.y * LevelGrid.CELL),
			water_material,
			Vector3((r.position.x + r.size.x * 0.5) * LevelGrid.CELL, 0.03, (r.position.y + r.size.y * 0.5) * LevelGrid.CELL), level)
		water.name = "Water"
	if room["kind"] == "boss":
		# The bell-pit: a ring of candles and a cracked bell.
		var ctr := grid.center(room["center"])
		for i in 10:
			var a := i * TAU / 10.0
			var p := ctr + Vector3(cos(a), 0, sin(a)) * 6.5
			B.cylinder(0.06, 0.06, 0.35, B.mat(Color(0.85, 0.8, 0.7)), p + Vector3(0, 0.18, 0), level, 6)
			B.sphere(0.06, B.mat(B.EMBER, 1.0, B.EMBER, 5.0), p + Vector3(0, 0.4, 0), level, 5)
		B.omni(Color(0.9, 0.3, 0.15), 2.5, 16.0, ctr + Vector3(0, 4, 0), level)
		var bell := preload("res://scripts/models/props_model.gd").founders_bell(level, ctr + Vector3(5.5, 0.9, -5.0))
		bell.rotation = Vector3(0.5, 0.0, 1.2)


func _torches(level: Node3D, room: Dictionary, rng: RandomNumberGenerator) -> void:
	var rect: Rect2i = room["rect"]
	var spots: Array = []
	for x in range(rect.position.x + 1, rect.end.x - 1, 3):
		spots.append([Vector2i(x, rect.position.y), Vector2i.UP])
		spots.append([Vector2i(x, rect.end.y - 1), Vector2i.DOWN])
	for y in range(rect.position.y + 1, rect.end.y - 1, 3):
		spots.append([Vector2i(rect.position.x, y), Vector2i.LEFT])
		spots.append([Vector2i(rect.end.x - 1, y), Vector2i.RIGHT])
	spots.shuffle()
	var count := 4 if room["kind"] == "boss" else rng.randi_range(2, 3)
	var placed := 0
	for s in spots:
		if placed >= count:
			break
		var c: Vector2i = s[0]
		var d: Vector2i = s[1]
		# Only on a real wall (the cell beyond must be solid).
		if grid.get_cell(c + d) != LevelGrid.SOLID or grid.get_cell(c) != LevelGrid.FLOOR:
			continue
		var facing := Vector3(-d.x, 0, -d.y)
		var p := grid.center(c) + Vector3(d.x, 0, d.y) * (LevelGrid.CELL * 0.45) + Vector3(0, 2.0, 0)
		B.torch(level, p, facing, 9.0, 1.7)
		placed += 1


func _corridor_torches(level: Node3D, rng: RandomNumberGenerator) -> void:
	# A dim torch every so often in corridors outside rooms.
	var in_room := func(c: Vector2i) -> bool:
		for room in rooms:
			var r: Rect2i = room["rect"]
			if r.grow(1).has_point(c):
				return true
		return false
	var count := 0
	for y in range(1, grid.h - 1):
		for x in range(1, grid.w - 1):
			var c := Vector2i(x, y)
			if grid.get_cell(c) != LevelGrid.FLOOR or (x + y * 3) % 7 != 0 or rng.randf() > 0.25:
				continue
			if in_room.call(c):
				continue
			for d in [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT]:
				if grid.get_cell(c + d) == LevelGrid.SOLID:
					var p := grid.center(c) + Vector3(d.x, 0, d.y) * (LevelGrid.CELL * 0.45) + Vector3(0, 2.0, 0)
					B.torch(level, p, Vector3(-d.x, 0, -d.y), 6.0, 1.1)
					count += 1
					break
			if count > 14:
				return


## Spawn points for monster packs: {pos: Vector3, count: int, elite: bool} for each non-start room.
func packs(rng: RandomNumberGenerator) -> Array:
	var out: Array = []
	for room in rooms:
		if room["kind"] == "start" or room["kind"] == "boss":
			continue
		var rect: Rect2i = room["rect"]
		var n := clampi(int(rect.size.x * rect.size.y / 12.0) + rng.randi_range(0, 2), 3, 7)
		out.append({"center": room["center"], "count": n, "elite": rng.randf() < 0.3})
	return out
