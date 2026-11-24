extends RefCounted
## Hollowmere, the cursed town (Act I hub). Laid out from an ASCII map:
##  #  stone wall          .  earth             ,  cobbles
##  H  house               C  St. Aldric's chapel  B  mausoleum   G  crypt gate
##  S  grave               T  dead tree         L  lamp post      W  well
##  M  Sister Maud         K  Edda the smith    D  Old Corwin     P  hero start

const LevelGrid = preload("res://scripts/world/level_grid.gd")
const LevelMesh = preload("res://scripts/world/level_mesh.gd")
const B = preload("res://scripts/world/build.gd")
const Interactable = preload("res://scripts/world/interactable.gd")

const MAP := [
	"####################################",
	"#T...S.S.S..#CCCCCCCC#..S..S.S..T..#",
	"#...........#CCCCCCCC#.............#",
	"#..S.S.S....#CCCCCCCC#..S.BBBB..S..#",
	"#...........#CCCCCCCC#....BBBB.....#",
	"#.T.........#CCCCCCCC#..S..GG...S..#",
	"#...........,CCCCCCCC,.......D.....#",
	"#...L.......,,,,,,,,,,,..S.....S.T.#",
	"#..........,,,,M,,,,,,,,...........#",
	"#..HHHH....,L,,,,,,,,L,,....HHHH...#",
	"#..HHHH....,,,,,WW,,,,,,....HHHH...#",
	"#..HHHH....,,,,,WW,,,,,,....HHHH...#",
	"#..........,,,,,,,,,,,,,...........#",
	"#.T..K.....,L,,,,,,,,L,,......T....#",
	"#..HHHHH....,,,,,,,,,,.....HHHH....#",
	"#..HHHHH.....,,,,,,,,......HHHH....#",
	"#..HHHHH......,,,,,,.......HHHH..T.#",
	"#.............,,,,,,...............#",
	"#..T....HHH...,,,,,,..HHH......T...#",
	"#.......HHH...,L,,L,..HHH..........#",
	"#.............,,,,,,...............#",
	"#.....T.......,,,,,,.........T.....#",
	"#.............,,P,,,...............#",
	"#.............,,,,,,...............#",
	"####################################",
]
const NPC_CHARS := {"M": "maud", "K": "edda", "D": "corwin"}
const NPC_COLORS := {
	"maud": Color(0.12, 0.1, 0.14), "edda": Color(0.35, 0.22, 0.16), "corwin": Color(0.25, 0.24, 0.2),
}

var grid: LevelGrid
var spawn := Vector3.ZERO
var gate_spawn := Vector3.ZERO
var chars: Array = []


func build(world: Node3D, rng: RandomNumberGenerator) -> void:
	var h := MAP.size()
	var w := 0
	for row in MAP:
		w = maxi(w, String(row).length())
	grid = LevelGrid.new(w, h)
	chars = []
	for y in h:
		var line := PackedStringArray()
		var row: String = MAP[y]
		for x in w:
			var ch := row[x] if x < row.length() else "#"
			line.append(ch)
			var c := Vector2i(x, y)
			match ch:
				"#": grid.set_cell(c, LevelGrid.SOLID)
				".", ",", "P": grid.set_cell(c, LevelGrid.FLOOR)
				_: grid.set_cell(c, LevelGrid.PROP)
			if ch == "P":
				spawn = grid.center(c)
		chars.append(line)
	gate_spawn = grid.center(Vector2i(27, 7))
	grid.build_astar()

	var floor_color := func(c: Vector2i) -> Color:
		var ch: String = chars[c.y][c.x]
		var n := rng.randf()
		if ch == ",":
			return Color(0.13, 0.12, 0.14).lerp(Color(0.17, 0.15, 0.15), n)
		if c.x > 21 and c.y < 8:  # graveyard earth
			return Color(0.065, 0.075, 0.055).lerp(Color(0.09, 0.09, 0.07), n)
		return Color(0.08, 0.075, 0.065).lerp(Color(0.11, 0.095, 0.08), n)
	var level := Node3D.new()
	level.name = "Town"
	world.add_child(level)
	var wall_mat := LevelMesh.build(grid, level, 3.2, Color(0.24, 0.21, 0.24), floor_color, rng)
	world.set("wall_material", wall_mat)

	var done := {}
	for y in h:
		for x in w:
			var ch: String = chars[y][x]
			var c := Vector2i(x, y)
			var p := grid.center(c)
			match ch:
				"H", "C", "B", "W", "G":
					if done.has(c):
						continue
					var rect := _region(c, ch, done)
					_building(level, ch, rect, rng)
					if ch == "G":
						_gate(world, level, rect)
				"S": _grave(level, p, rng)
				"T": _tree(level, p, rng)
				"L": _lamp(level, p)
				"M", "K", "D": _npc(world, level, NPC_CHARS[ch], p)
	# The road south vanishes into fog.
	var fog_light := B.omni(Color(0.4, 0.38, 0.55), 0.45, 10.0, grid.center(Vector2i(17, 24)) + Vector3(0, 3, 4), level)
	fog_light.name = "RoadGlow"


func _region(start: Vector2i, ch: String, done: Dictionary) -> Rect2i:
	var stack: Array[Vector2i] = [start]
	var minc := start
	var maxc := start
	done[start] = true
	while not stack.is_empty():
		var c: Vector2i = stack.pop_back()
		minc = Vector2i(mini(minc.x, c.x), mini(minc.y, c.y))
		maxc = Vector2i(maxi(maxc.x, c.x), maxi(maxc.y, c.y))
		for d in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var n: Vector2i = c + d
			if grid.inside(n) and not done.has(n) and chars[n.y][n.x] == ch:
				done[n] = true
				stack.append(n)
	return Rect2i(minc, maxc - minc + Vector2i.ONE)


func _rect_world(rect: Rect2i) -> Array:
	var cell := LevelGrid.CELL
	var center := Vector3((rect.position.x + rect.size.x * 0.5) * cell, 0, (rect.position.y + rect.size.y * 0.5) * cell)
	var size := Vector3(rect.size.x * cell, 0, rect.size.y * cell)
	return [center, size]


func _building(level: Node3D, ch: String, rect: Rect2i, rng: RandomNumberGenerator) -> void:
	var rw := _rect_world(rect)
	var c: Vector3 = rw[0]
	var s: Vector3 = rw[1]
	var node := Node3D.new()
	node.position = c
	level.add_child(node)
	match ch:
		"H":
			var wall_h := 3.0 + rng.randf() * 0.8
			var plaster := B.mat(Color(0.30, 0.27, 0.25).lerp(Color(0.24, 0.2, 0.2), rng.randf()))
			var timber := B.mat(Color(0.11, 0.08, 0.07))
			B.box(Vector3(s.x - 0.4, wall_h, s.z - 0.4), plaster, Vector3(0, wall_h * 0.5, 0), node)
			for corner in [Vector3(-1, 0, -1), Vector3(1, 0, -1), Vector3(-1, 0, 1), Vector3(1, 0, 1)]:
				B.box(Vector3(0.3, wall_h + 0.1, 0.3), timber, Vector3(corner.x * (s.x * 0.5 - 0.25), wall_h * 0.5, corner.z * (s.z * 0.5 - 0.25)), node)
			B.box(Vector3(s.x - 0.3, 0.25, 0.3), timber, Vector3(0, wall_h * 0.55, s.z * 0.5 - 0.2), node)
			var roof := B.prism(Vector3(s.z + 0.8, 2.2, s.x + 0.6), B.mat(Color(0.13, 0.09, 0.11)), Vector3(0, wall_h + 1.1, 0), node)
			roof.rotation.y = PI * 0.5
			if s.z > s.x:
				roof.rotation.y = 0.0
				(roof.mesh as PrismMesh).size = Vector3(s.x + 0.8, 2.2, s.z + 0.6)
			# door and windows on the south face
			B.box(Vector3(1.0, 1.9, 0.12), B.mat(Color(0.07, 0.05, 0.04)), Vector3(-s.x * 0.2, 0.95, s.z * 0.5 - 0.15), node)
			var lit := rng.randf() < 0.55
			var win_mat := B.mat(Color(0.9, 0.55, 0.25), 1.0, Color(1.0, 0.5, 0.2), 2.5) if lit else B.mat(Color(0.03, 0.03, 0.05))
			B.box(Vector3(0.7, 0.7, 0.1), win_mat, Vector3(s.x * 0.22, 2.0, s.z * 0.5 - 0.15), node)
			if lit:
				B.omni(Color(1.0, 0.55, 0.25), 0.7, 4.5, Vector3(s.x * 0.22, 2.0, s.z * 0.5 + 0.6), node)
		"C":
			var stone := B.mat(Color(0.25, 0.22, 0.26))
			var dark := B.mat(Color(0.09, 0.07, 0.1))
			B.box(Vector3(s.x - 0.6, 6.0, s.z - 0.6), stone, Vector3(0, 3.0, 0), node)
			var roof := B.prism(Vector3(s.x + 0.2, 3.4, s.z + 0.2), dark, Vector3(0, 7.7, 0), node)
			roof.rotation.y = 0.0
			# buttresses
			for i in 4:
				var x := -s.x * 0.5 + 1.0 + i * (s.x - 2.0) / 3.0
				B.box(Vector3(0.6, 4.0, 0.9), stone, Vector3(x, 2.0, s.z * 0.5 - 0.1), node)
			# bell tower over the door
			B.box(Vector3(3.2, 11.0, 3.2), stone, Vector3(0, 5.5, s.z * 0.5 - 1.6), node)
			B.box(Vector3(2.0, 2.2, 3.4), B.mat(Color(0.02, 0.01, 0.03)), Vector3(0, 9.4, s.z * 0.5 - 1.6), node)
			var spire := B.cylinder(0.0, 2.4, 5.0, dark, Vector3(0, 13.5, s.z * 0.5 - 1.6), node, 4)
			spire.rotation.y = PI * 0.25
			# stained glass and door
			var glass := B.mat(Color(0.5, 0.2, 0.5), 1.0, Color(0.7, 0.25, 0.45), 2.0)
			for wx in [-s.x * 0.32, s.x * 0.32]:
				B.box(Vector3(0.9, 2.4, 0.1), glass, Vector3(wx, 3.6, s.z * 0.5 - 0.25), node)
			B.box(Vector3(1.6, 2.6, 0.15), B.mat(Color(0.12, 0.06, 0.05), 1.0, Color(0.5, 0.2, 0.08), 0.4), Vector3(0, 1.3, s.z * 0.5 - 0.05), node)
			B.omni(Color(0.75, 0.35, 0.6), 1.2, 7.0, Vector3(0, 3.5, s.z * 0.5 + 1.5), node)
			B.torch(node, Vector3(-1.4, 2.3, s.z * 0.5 + 0.1), Vector3(0, 0, 1), 7.0, 1.4)
			B.torch(node, Vector3(1.4, 2.3, s.z * 0.5 + 0.1), Vector3(0, 0, 1), 7.0, 1.4)
		"B":
			var stone := B.mat(Color(0.2, 0.19, 0.21))
			B.box(Vector3(s.x - 0.6, 3.4, s.z - 0.4), stone, Vector3(0, 1.7, 0), node)
			var mroof := B.prism(Vector3(s.z + 0.2, 1.4, s.x), B.mat(Color(0.1, 0.09, 0.11)), Vector3(0, 4.1, 0), node)
			mroof.rotation.y = PI * 0.5
			for i in 4:
				B.cylinder(0.22, 0.25, 3.4, stone, Vector3(-s.x * 0.5 + 0.6 + i * (s.x - 1.2) / 3.0, 1.7, s.z * 0.5), node, 8)
			B.label("Mausoleum of the Wardens", B.GOLD, Vector3(0, 5.4, 0), node, 36)
		"W":
			var stone := B.mat(Color(0.28, 0.26, 0.28))
			B.cylinder(1.3, 1.4, 1.0, stone, Vector3(0, 0.5, 0), node, 12)
			B.cylinder(1.05, 1.05, 1.02, B.mat(Color(0.01, 0.01, 0.02)), Vector3(0, 0.52, 0), node, 12)
			for sx in [-1.1, 1.1]:
				B.box(Vector3(0.2, 2.6, 0.2), B.mat(Color(0.12, 0.08, 0.06)), Vector3(sx, 1.3, 0), node)
			B.prism(Vector3(3.0, 1.0, 1.6), B.mat(Color(0.13, 0.09, 0.11)), Vector3(0, 3.0, 0), node)
		"G":
			pass  # built by _gate


func _gate(world: Node3D, level: Node3D, rect: Rect2i) -> void:
	var rw := _rect_world(rect)
	var c: Vector3 = rw[0]
	var s: Vector3 = rw[1]
	var node := Interactable.new()
	node.kind = "gate"
	node.display_name = "Mausoleum Gate"
	node.radius = 2.6
	node.position = c + Vector3(0, 0, -0.6)
	level.add_child(node)
	var iron := B.mat(Color(0.08, 0.07, 0.08), 0.5, Color.BLACK, 1.0, 0.7)
	for i in 9:
		B.cylinder(0.05, 0.05, 2.8, iron, Vector3(-s.x * 0.4 + i * s.x * 0.1, 1.4, 0), node, 6)
	B.box(Vector3(s.x * 0.85, 0.12, 0.12), iron, Vector3(0, 2.6, 0), node)
	B.box(Vector3(s.x * 0.85, 0.12, 0.12), iron, Vector3(0, 0.4, 0), node)
	# Stairs down, glowing from below.
	for i in 4:
		B.box(Vector3(s.x * 0.8, 0.2, 0.5), B.mat(Color(0.06, 0.05, 0.07)), Vector3(0, -0.1 - i * 0.15, -0.5 - i * 0.45), node)
	B.omni(B.EMBER, 2.0, 5.0, Vector3(0, 0.4, -1.4), node)
	B.label("Mausoleum Gate", B.GOLD, Vector3(0, 3.4, 0), node, 40)
	world.call("register_interactable", node)


func _grave(level: Node3D, p: Vector3, rng: RandomNumberGenerator) -> void:
	var stone := B.mat(Color(0.3, 0.29, 0.3).lerp(Color(0.2, 0.2, 0.22), rng.randf()))
	var g := Node3D.new()
	g.position = p + Vector3(rng.randf_range(-0.3, 0.3), 0, rng.randf_range(-0.3, 0.3))
	g.rotation = Vector3(rng.randf_range(-0.15, 0.15), rng.randf_range(-0.3, 0.3), rng.randf_range(-0.12, 0.12))
	level.add_child(g)
	if rng.randf() < 0.3:
		B.box(Vector3(0.15, 1.3, 0.15), stone, Vector3(0, 0.65, -0.5), g)
		B.box(Vector3(0.75, 0.15, 0.15), stone, Vector3(0, 0.95, -0.5), g)
	else:
		B.box(Vector3(0.8, 1.0, 0.22), stone, Vector3(0, 0.5, -0.5), g)
	B.box(Vector3(0.9, 0.25, 1.6), B.mat(Color(0.1, 0.09, 0.07)), Vector3(0, 0.1, 0.3), g)


func _tree(level: Node3D, p: Vector3, rng: RandomNumberGenerator) -> void:
	var bark := B.mat(Color(0.1, 0.08, 0.08))
	var t := Node3D.new()
	t.position = p
	t.rotation.y = rng.randf() * TAU
	level.add_child(t)
	var hgt := rng.randf_range(4.0, 6.0)
	B.cylinder(0.12, 0.35, hgt, bark, Vector3(0, hgt * 0.5, 0), t, 6)
	for i in 4:
		var br := B.cylinder(0.03, 0.1, 2.0, bark, Vector3(0, hgt * (0.55 + i * 0.1), 0), t, 5)
		br.rotation = Vector3(rng.randf_range(0.6, 1.1), i * 1.7, 0)
		br.translate_object_local(Vector3(0, 0.9, 0))


func _lamp(level: Node3D, p: Vector3) -> void:
	var iron := B.mat(Color(0.07, 0.06, 0.07), 0.6, Color.BLACK, 1.0, 0.6)
	B.cylinder(0.08, 0.12, 3.2, iron, p + Vector3(0, 1.6, 0), level, 6)
	B.box(Vector3(0.7, 0.08, 0.08), iron, p + Vector3(0.3, 3.1, 0), level)
	B.torch(level, p + Vector3(0.6, 2.9, 0), Vector3.ZERO, 10.0, 1.8)


func _npc(world: Node3D, level: Node3D, npc_id: String, p: Vector3) -> void:
	var info: Dictionary = Game.npc_info(npc_id)
	var node := Interactable.new()
	node.kind = "npc"
	node.npc_id = npc_id
	node.display_name = info.get("name", npc_id)
	node.radius = 2.4
	node.position = p
	level.add_child(node)
	var robe := B.mat(NPC_COLORS.get(npc_id, Color(0.2, 0.2, 0.2)))
	B.cylinder(0.25, 0.5, 1.5, robe, Vector3(0, 0.75, 0), node, 10)
	B.sphere(0.24, B.mat(Color(0.55, 0.45, 0.4)), Vector3(0, 1.72, 0), node, 10)
	match npc_id:
		"maud":
			B.cylinder(0.18, 0.32, 0.7, robe, Vector3(0, 1.85, -0.05), node, 10)  # veil
			B.box(Vector3(0.06, 0.4, 0.06), B.mat(B.GOLD, 0.4, B.GOLD, 0.6, 0.8), Vector3(0, 1.2, 0.36), node)
			B.box(Vector3(0.24, 0.06, 0.06), B.mat(B.GOLD, 0.4, B.GOLD, 0.6, 0.8), Vector3(0, 1.28, 0.36), node)
			B.omni(Color(0.9, 0.7, 0.45), 0.8, 4.0, Vector3(0.4, 1.5, 0.6), node)
		"edda":
			B.box(Vector3(0.8, 0.5, 0.4), B.mat(Color(0.1, 0.1, 0.11), 0.4, Color.BLACK, 1.0, 0.8), Vector3(0.9, 0.45, 0.2), node)  # anvil
			B.box(Vector3(0.6, 0.06, 0.5), B.mat(Color(0.3, 0.18, 0.1)), Vector3(0, 1.0, 0.27), node)  # apron
			B.omni(B.EMBER, 1.4, 5.0, Vector3(-0.8, 0.6, 0.5), node)
			B.sphere(0.25, B.mat(B.EMBER, 1.0, B.EMBER, 3.0), Vector3(-0.9, 0.3, 0.3), node, 6)
		"corwin":
			B.cylinder(0.03, 0.03, 1.8, B.mat(Color(0.2, 0.14, 0.08)), Vector3(0.45, 0.9, 0.1), node, 5)  # spade
			B.box(Vector3(0.3, 0.4, 0.05), B.mat(Color(0.3, 0.3, 0.32), 0.5, Color.BLACK, 1.0, 0.6), Vector3(0.45, 0.1, 0.1), node)
			B.torch(node, Vector3(-0.45, 1.2, 0.2), Vector3.ZERO, 5.0, 1.0)
	node.marker = B.label("!", B.GOLD, Vector3(0, 2.7, 0), node, 96)
	B.label(info.get("name", npc_id), Color(0.85, 0.82, 0.78), Vector3(0, 2.25, 0), node, 32)
	world.call("register_interactable", node)
