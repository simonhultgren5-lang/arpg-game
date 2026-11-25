extends RefCounted
## Hollowmere, the cursed town (Act I hub). Laid out from an ASCII map:
##  #  stone wall          .  earth             ,  cobbles
##  H  house               C  St. Aldric's chapel  B  mausoleum   G  crypt gate
##  S  grave               T  dead tree         L  lamp post      W  well
##  M  Sister Maud         K  Edda the smith    D  Old Corwin     P  hero start
##  A  the Lamplighter     U  the unmarked grave                 Y  the wardens' plinth

const LevelGrid = preload("res://scripts/world/level_grid.gd")
const LevelMesh = preload("res://scripts/world/level_mesh.gd")
const B = preload("res://scripts/world/build.gd")
const Interactable = preload("res://scripts/world/interactable.gd")
const TownsfolkModel = preload("res://scripts/models/townsfolk_model.gd")

const Fen = preload("res://scripts/world/fen.gd")

const MAP := [
	"####################################",
	"#T...S.S.S..#CCCCCCCC#..S..S.S..T..#",
	"#...........#CCCCCCCC#.........U...#",
	"#..S.S.S....#CCCCCCCC#..S.BBBB..S..#",
	"#...........#CCCCCCCC#....BBBBY....#",
	"#.T.........#CCCCCCCC#..S..GG...S..#",
	"#...........,CCCCCCCC,.......D.....#",
	"#...L.......,,,,,,,,,,,..S.....S.T.#",
	"#..........,,,,M,,,,,,,,...........#",
	"#..HHHH....,L,,,,,,,,L,,....HHHH...#",
	"#..HHHH....,,,,,WW,,,,,,....HHHH...#",
	"#..HHHH....,,,,,WW,,,,,,....HHHH...#",
	"#..........,,A,,,,,,,,,,...........#",
	"#.T..K.....,L,,,,,,,,L,,......T....#",
	"#..HHHHH....,,,,,,,,,,.....HHHH....#",
	"#..HHHHH.....,,,,,,,,......HHHH....#",
	"#..HHHHH......,,,,,,.......HHHH..T.#",
	"#.............,,,,,,...............#",
	"#..T....HHH...,,,,,,..HHH......T...#",
	"#.......HHH...,L,,L,..HHH..........#",
	"#.............,,,,,,...............#",
	"#.....T.......,,,,,,.........T.....#",
	"#.............,,,,,,...............#",
	"#.............,,,,,,...............#",
	"##############,,,,,,################",
	"^^.............:::...............^^^",
	"^^..............:::.............^^^^",
	"^^^.^^^^^^^.....:::.............^^^^",
	"^^^.^^^^^^^.....:::.............^^^^",
	"^^^^^^^^^^^^.....:::............^^^^",
	"^^^.^^^^^^^:::::::::............^^^^",
	"^^^.^^^^^^^:::::::::............^^^^",
	"^^^.....:::::::::===~~~..........^^^",
	"^^^.....::.....~~===~~~~~~.......^^^",
	"^~......::..~~~~~===~~~~~~~~......^^",
	"^~~~~...::~~~~~~~::....~~~~~~~~...^^",
	"^~~~~~~~==~~~~~:::........~~~~~~~~~^",
	"^.~~~~~~==~~...:::..........~~~~~~~^",
	"^....~~~==....:::..............~~~~^",
	"^.......::....:::.........^^^....^^^",
	"^.......::::::::.........^^^^^...^^^",
	"^.....F.::::::::........^^^^^^^.^^^^",
	"^.......::::::::........^^^^^^^.^^^^",
	"^............:::........^^^^^^^.^^^^",
	"^............:::.........^^^^^..^^^^",
	"^^...........:::P.........^^^...^^^^",
	"^^............:::...............^^^^",
	"^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
	"^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
]
const NPC_CHARS := {"M": "maud", "K": "edda", "D": "corwin", "A": "lamplighter"}
## Lamps Without Oil: the lamps that light up from the Lamplighter to the unmarked grave.
const LAMP_TRAIL := [Vector2i(13, 10), Vector2i(14, 8), Vector2i(19, 7), Vector2i(23, 7), Vector2i(26, 6), Vector2i(30, 5), Vector2i(31, 3)]
## Where the undercroft stair opens, in front of the chapel door.
const UNDERCROFT := Vector2i(18, 7)
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
				".", ",", "P", ":", "=": grid.set_cell(c, LevelGrid.FLOOR)
				_: grid.set_cell(c, LevelGrid.PROP)
			if ch == "P":
				spawn = grid.center(c)
		chars.append(line)
	gate_spawn = grid.center(Vector2i(27, 7))
	grid.build_astar()

	var floor_color := func(c: Vector2i) -> Color:
		var ch: String = chars[c.y][c.x]
		var n := rng.randf()
		if ch in [",", "P", "L", "M", "A", "W"]:
			return Color(0.13, 0.12, 0.14).lerp(Color(0.17, 0.15, 0.15), n)
		if c.x > 21 and c.y < 8:  # graveyard earth
			return Color(0.065, 0.075, 0.055).lerp(Color(0.09, 0.09, 0.07), n)
		return Color(0.08, 0.075, 0.065).lerp(Color(0.11, 0.095, 0.08), n)
	var level := Node3D.new()
	level.name = "Town"
	world.add_child(level)
	var paved := func(c: Vector2i) -> bool: return chars[c.y][c.x] in [",", "P", "L", "M", "A", "W"]
	var wall_mat := LevelMesh.build(grid, level, 3.2, Color(0.24, 0.21, 0.24), floor_color, rng, paved, Fen.START_ROW)
	world.set("wall_material", wall_mat)

	Fen.build(world, level, grid, MAP)
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
				"M", "K", "D", "A": _npc(world, level, NPC_CHARS[ch], p)
				"U": _unmarked_grave(world, level, p, rng)
				"Y": _plinth(world, level, p)
	_lamp_trail(level)
	_undercroft(world, level)
	_dress(level)
	# The road south vanishes into fog.
	var fog_light := B.omni(Color(0.4, 0.38, 0.55), 0.45, 10.0, grid.center(Vector2i(17, 24)) + Vector3(0, 3, 4), level)
	fog_light.name = "RoadGlow"


## Set dressing (visual only, own RNG so the town's layout never shifts): braziers in the square, clutter
## against house walls, a fled cart, fencing round the graveyard and bone piles at its edge.
func _dress(level: Node3D) -> void:
	var Props = preload("res://scripts/models/props_model.gd")
	var r := RandomNumberGenerator.new()
	r.seed = 4242
	for c in [Vector2i(12, 7), Vector2i(21, 7), Vector2i(13, 11), Vector2i(20, 13)]:
		Props.brazier(level, grid.center(c) + Vector3(0, 0, 0.6), 11.0, 2.4)
	for y in chars.size():
		for x in chars[y].size():
			var below := y + 1
			if chars[y][x] != "H" or below >= chars.size() or chars[below][x] not in [".", ","]:
				continue
			if r.randf() > 0.38:
				continue
			var p := grid.center(Vector2i(x, below)) + Vector3(r.randf_range(-0.8, 0.8), 0, -0.7)
			if r.randf() < 0.5:
				Props.barrel(level, p).rotation.y = r.randf() * TAU
			else:
				var crate := Props.asset(level, "crate", p)
				if crate:
					crate.rotation.y = r.randf() * TAU
	Props.cart(level, grid.center(Vector2i(9, 12)), 0.5)
	Props.cart(level, grid.center(Vector2i(25, 17)), -0.8)
	# Graveyard fencing along its open south edge, and bone piles where the soil was turned.
	Props.fence(level, grid.center(Vector2i(22, 8)) + Vector3(-1.5, 0, -1.5), grid.center(Vector2i(34, 8)) + Vector3(0, 0, -1.5), r)
	for i in 6:
		var c := Vector2i(r.randi_range(22, 34), r.randi_range(1, 6))
		if chars[c.y][c.x] == ".":
			Props.bone_pile(level, grid.center(c) + Vector3(r.randf_range(-1, 1), 0, r.randf_range(-1, 1)), r)


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
			var plaster := B.pbr("plaster", Color(0.62, 0.56, 0.52).lerp(Color(0.5, 0.42, 0.42), rng.randf()), 0.45, 1.0, 0.0, 1.4)
			var timber := B.pbr("timber", Color(0.32, 0.26, 0.24), 0.8, 1.0, 0.0, 1.2)
			B.box(Vector3(s.x - 0.4, wall_h, s.z - 0.4), plaster, Vector3(0, wall_h * 0.5, 0), node)
			for corner in [Vector3(-1, 0, -1), Vector3(1, 0, -1), Vector3(-1, 0, 1), Vector3(1, 0, 1)]:
				B.box(Vector3(0.3, wall_h + 0.1, 0.3), timber, Vector3(corner.x * (s.x * 0.5 - 0.25), wall_h * 0.5, corner.z * (s.z * 0.5 - 0.25)), node)
			B.box(Vector3(s.x - 0.3, 0.25, 0.3), timber, Vector3(0, wall_h * 0.55, s.z * 0.5 - 0.2), node)
			var roof := B.prism(Vector3(s.z + 0.8, 2.2, s.x + 0.6), B.pbr("roof_slate", Color(0.42, 0.38, 0.44), 0.6, 1.0, 0.05, 1.5), Vector3(0, wall_h + 1.1, 0), node)
			roof.rotation.y = PI * 0.5
			if s.z > s.x:
				roof.rotation.y = 0.0
				(roof.mesh as PrismMesh).size = Vector3(s.x + 0.8, 2.2, s.z + 0.6)
			# door and windows on the south face
			var front := s.z * 0.5 - 0.2  # the plaster's south face
			if not _kit(node, "house_door", Vector3(-s.x * 0.2, 0, front)):
				B.box(Vector3(1.0, 1.9, 0.12), B.mat(Color(0.07, 0.05, 0.04)), Vector3(-s.x * 0.2, 0.95, s.z * 0.5 - 0.15), node)
			var lit := rng.randf() < 0.55
			var win_mat := B.mat(Color(0.9, 0.55, 0.25), 1.0, Color(1.0, 0.5, 0.2), 2.5) if lit else B.mat(Color(0.03, 0.03, 0.05))
			if not _kit(node, "house_window_lit" if lit else "house_window_dark", Vector3(s.x * 0.22, 2.0, front)):
				B.box(Vector3(0.7, 0.7, 0.1), win_mat, Vector3(s.x * 0.22, 2.0, s.z * 0.5 - 0.15), node)
				var frame_pos := Vector3(s.x * 0.22, 2.0, s.z * 0.5 - 0.06)
				B.box(Vector3(0.08, 0.84, 0.10), timber, frame_pos, node)
				B.box(Vector3(0.85, 0.08, 0.10), timber, frame_pos, node)
				B.box(Vector3(1.04, 0.12, 0.35), timber, frame_pos - Vector3.UP * 0.43, node)
			var chimney_pos := Vector3(-s.x * 0.22, wall_h + 1.9, -s.z * 0.22)
			if not _kit(node, "chimney", chimney_pos - Vector3.UP * 1.12):
				var brick := B.mat(Color("#493c40"))
				B.box(Vector3(0.72, 2.25, 0.68), brick, chimney_pos, node)
				B.box(Vector3(0.89, 0.17, 0.85), brick, chimney_pos + Vector3.UP * 1.07, node)
			if lit:
				B.omni(Color(1.0, 0.55, 0.25), 0.7, 4.5, Vector3(s.x * 0.22, 2.0, s.z * 0.5 + 0.6), node)
		"C":
			var stone := B.pbr("stone_wall", Color(0.62, 0.58, 0.64), 0.28, 1.0, 0.0, 1.6)
			var dark := B.pbr("roof_slate", Color(0.3, 0.27, 0.33), 0.5, 1.0, 0.05, 1.5)
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
			var glass := B.mat(Color(0.28, 0.12, 0.3), 0.3, Color(0.55, 0.2, 0.4), 0.7)
			for wx in [-s.x * 0.32, s.x * 0.32]:
				B.box(Vector3(0.9, 2.4, 0.1), glass, Vector3(wx, 3.6, s.z * 0.5 - 0.25), node)
			B.box(Vector3(1.6, 2.6, 0.15), B.mat(Color(0.12, 0.06, 0.05), 1.0, Color(0.5, 0.2, 0.08), 0.4), Vector3(0, 1.3, s.z * 0.5 - 0.05), node)
			var rose := _kit(node, "rose_window", Vector3(0, 6.0, s.z * 0.5 + 0.03))
			if rose:
				node.get_child(node.get_child_count() - 1).scale = Vector3.ONE * 1.5
			B.omni(Color(0.75, 0.35, 0.6), 1.2, 7.0, Vector3(0, 3.5, s.z * 0.5 + 1.5), node)
			B.torch(node, Vector3(-1.4, 2.3, s.z * 0.5 + 0.1), Vector3(0, 0, 1), 7.0, 1.4)
			B.torch(node, Vector3(1.4, 2.3, s.z * 0.5 + 0.1), Vector3(0, 0, 1), 7.0, 1.4)
		"B":
			var stone := B.pbr("stone_wall", Color(0.5, 0.49, 0.52), 0.3, 1.0, 0.0, 1.6)
			B.box(Vector3(s.x - 0.6, 3.4, s.z - 0.4), stone, Vector3(0, 1.7, 0), node)
			var mroof := B.prism(Vector3(s.z + 0.2, 1.4, s.x), B.pbr("roof_slate", Color(0.34, 0.32, 0.36), 0.5, 1.0, 0.05, 1.5), Vector3(0, 4.1, 0), node)
			mroof.rotation.y = PI * 0.5
			for i in 4:
				B.cylinder(0.22, 0.25, 3.4, stone, Vector3(-s.x * 0.5 + 0.6 + i * (s.x - 1.2) / 3.0, 1.7, s.z * 0.5), node, 8)
			B.label("Mausoleum of the Wardens", B.GOLD, Vector3(0, 5.4, 0), node, 36)
		"W":
			if _kit(node, "well", Vector3.ZERO):
				return
			var stone := B.mat(Color(0.28, 0.26, 0.28))
			B.cylinder(1.3, 1.4, 1.0, stone, Vector3(0, 0.5, 0), node, 12)
			B.cylinder(1.05, 1.05, 1.02, B.mat(Color(0.01, 0.01, 0.02)), Vector3(0, 0.52, 0), node, 12)
			for sx in [-1.1, 1.1]:
				B.box(Vector3(0.2, 2.6, 0.2), B.mat(Color(0.12, 0.08, 0.06)), Vector3(sx, 1.3, 0), node)
			B.prism(Vector3(3.0, 1.0, 1.6), B.mat(Color(0.13, 0.09, 0.11)), Vector3(0, 3.0, 0), node)
		"G":
			pass  # built by _gate


## Hangs a Blender kit piece (assets/models/props/<id>.gltf) on a building; false if it's missing.
func _kit(parent: Node3D, id: String, pos: Vector3) -> bool:
	return preload("res://scripts/models/props_model.gd").asset(parent, id, pos) != null


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
	# The Blender gravestones (three kinds), turned a little; code-built stones if they're missing.
	var kind: String = ["gravestone_round", "gravestone_cross", "gravestone_slab"][rng.randi() % 3]
	var modelled := preload("res://scripts/models/props_model.gd").asset(level, kind, p + Vector3(rng.randf_range(-0.2, 0.2), 0, rng.randf_range(-0.2, 0.2) - 0.4))
	if modelled:
		modelled.rotation.y = rng.randf_range(-0.25, 0.25)  # the carved face looks toward the camera (+Z)
		return
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
	var modelled := preload("res://scripts/models/props_model.gd").asset(level, "dead_tree", p)
	if modelled:  # the Blender tree; the rolls above are still spent so the layout never shifts
		modelled.rotation.y = t.rotation.y
		modelled.scale = Vector3.ONE * (hgt / 5.0)
		t.queue_free()
		return
	B.cylinder(0.12, 0.35, hgt, bark, Vector3(0, hgt * 0.5, 0), t, 6)
	for i in 4:
		var br := B.cylinder(0.03, 0.1, 2.0, bark, Vector3(0, hgt * (0.55 + i * 0.1), 0), t, 5)
		br.rotation = Vector3(rng.randf_range(0.6, 1.1), i * 1.7, 0)
		br.translate_object_local(Vector3(0, 0.9, 0))


func _lamp(level: Node3D, p: Vector3) -> void:
	var post := preload("res://scripts/models/props_model.gd").asset(level, "lamp_post", p)
	if post:
		# The lantern hangs 0.52 m out at 2.2 m; it gets the same flickering light as a torch.
		var glow := Node3D.new()
		glow.position = p + Vector3(0.52, 2.2, 0)
		var light := B.omni(Color(1.0, 0.68, 0.36), 1.8, 10.0, Vector3.ZERO, glow)
		glow.set_meta("light", light)
		glow.set_script(preload("res://scripts/world/flicker.gd"))
		level.add_child(glow)
		return
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
	TownsfolkModel.build(node, npc_id)
	match npc_id:
		"lamplighter":
			node.shown_when = Game.lamplighter_present
		"maud":
			B.omni(Color(0.9, 0.7, 0.45), 0.5, 4.0, Vector3(0.4, 1.8, 0.8), node)
		"edda":
			# Her cold forge: anvil, a barrel of quench water and banked embers.
			var anvil := Node3D.new()
			anvil.position = Vector3(0.95, 0, 0.25)
			node.add_child(anvil)
			var iron := B.stylized_mat(Color(0.14, 0.14, 0.16), Color(1.0, 0.55, 0.3))
			B.box(Vector3(0.36, 0.42, 0.3), iron, Vector3(0, 0.21, 0), anvil)
			B.box(Vector3(0.75, 0.16, 0.32), iron, Vector3(0, 0.5, 0), anvil)
			var horn := B.cylinder(0.0, 0.1, 0.32, iron, Vector3(0.48, 0.5, 0), anvil, 6)
			horn.rotation.z = PI * 0.5
			preload("res://scripts/models/props_model.gd").barrel(node, Vector3(1.25, 0, -0.6))
			B.omni(B.EMBER, 1.4, 5.0, Vector3(-0.8, 0.6, 0.5), node)
			B.sphere(0.25, B.mat(B.EMBER, 1.0, B.EMBER, 3.0), Vector3(-0.9, 0.3, 0.3), node, 6)
	var tall := npc_id != "lamplighter"
	node.marker_height = 2.7 if tall else 2.2
	node.marker = B.label("!", B.GOLD, Vector3(0, node.marker_height, 0), node, 96)
	B.label(info.get("name", npc_id), Color(0.85, 0.82, 0.78), Vector3(0, 2.25 if tall else 1.75, 0), node, 32)
	world.call("register_interactable", node)


# ------------------------------------------------------------------ Act I quest objects

func _quest_label(text: String, node: Node3D, height := 2.2) -> void:
	B.label(text, B.GOLD, Vector3(0, height, 0), node, 34)


## Lamps Without Oil: an unmarked grave in the graveyard's far corner, where the Founders' Charter lies.
func _unmarked_grave(world: Node3D, level: Node3D, p: Vector3, rng: RandomNumberGenerator) -> void:
	var node := Interactable.new()
	node.kind = "grave"
	node.display_name = "Unmarked Grave"
	node.radius = 2.2
	node.position = p
	level.add_child(node)
	var earth := B.mat(Color(0.12, 0.1, 0.08))
	var mound := B.box(Vector3(1.0, 0.3, 1.9), earth, Vector3(0, 0.12, 0), node)
	mound.rotation.y = 0.2
	# Dug open once the charter has been found.
	var hole := B.box(Vector3(0.9, 0.06, 1.7), B.mat(Color(0.02, 0.015, 0.01)), Vector3(0, 0.29, 0), node)
	hole.rotation.y = 0.2
	hole.set_script(preload("res://scripts/world/quest_visibility.gd"))
	hole.set_meta("when", func(): return Game.quest("lamps") >= 2)
	var marker := B.box(Vector3(0.12, 0.7, 0.12), B.mat(Color(0.2, 0.15, 0.1)), Vector3(0.1, 0.4, -0.9), node)
	marker.rotation.z = rng.randf_range(-0.3, 0.3)
	_quest_label("Unmarked Grave", node, 1.4)
	world.call("register_interactable", node)


## Lamps Without Oil: small lamps that burn from the Lamplighter to the grave while the quest is on.
func _lamp_trail(level: Node3D) -> void:
	for c in LAMP_TRAIL:
		var lamp := Node3D.new()
		lamp.position = grid.center(c) + Vector3(0.6, 0, 0.6)
		lamp.set_script(preload("res://scripts/world/quest_visibility.gd"))
		lamp.set_meta("when", func(): return Game.quest("lamps") == 1)
		level.add_child(lamp)
		var iron := B.mat(Color(0.08, 0.07, 0.08), 0.6, Color.BLACK, 1.0, 0.6)
		B.cylinder(0.03, 0.04, 0.9, iron, Vector3(0, 0.45, 0), lamp, 6)
		B.sphere(0.09, B.mat(Color(1, 0.9, 0.6), 1.0, Color(1.0, 0.85, 0.5), 5.0), Vector3(0, 0.98, 0), lamp, 6)
		B.omni(Color(1.0, 0.85, 0.55), 1.2, 4.5, Vector3(0, 1.1, 0), lamp)


## The Wardens' Oath: the plinth by the mausoleum door, where the name-stones go back.
func _plinth(world: Node3D, level: Node3D, p: Vector3) -> void:
	var node := Interactable.new()
	node.kind = "plinth"
	node.display_name = "The Wardens' Plinth"
	node.radius = 2.2
	node.position = p
	level.add_child(node)
	var stone := B.mat(Color(0.26, 0.24, 0.27))
	B.box(Vector3(0.9, 0.9, 0.7), stone, Vector3(0, 0.45, 0), node)
	B.box(Vector3(1.05, 0.12, 0.85), stone, Vector3(0, 0.95, 0), node)
	# The three stones, set back once the oath is kept.
	var set_stones := Node3D.new()
	set_stones.set_script(preload("res://scripts/world/quest_visibility.gd"))
	set_stones.set_meta("when", func(): return Game.quest("wardens") >= 3)
	node.add_child(set_stones)
	for i in 3:
		B.box(Vector3(0.22, 0.3, 0.1), B.mat(Color(0.5, 0.55, 0.65), 0.6, Color(0.35, 0.45, 0.7), 1.2), Vector3(-0.3 + i * 0.3, 1.16, 0), set_stones)
	B.omni(Color(0.55, 0.65, 0.95), 0.9, 3.5, Vector3(0, 1.5, 0.4), set_stones)
	_quest_label("The Wardens' Plinth", node, 1.8)
	world.call("register_interactable", node)


## The end of Act I: Maud opens the stair under the chapel once the wells toll.
func _undercroft(world: Node3D, level: Node3D) -> void:
	var node := Interactable.new()
	node.kind = "undercroft"
	node.display_name = "The Undercroft Stair"
	node.radius = 2.2
	node.position = grid.center(UNDERCROFT)
	node.shown_when = func(): return Game.quest("act_end") >= 1
	level.add_child(node)
	var dark := B.mat(Color(0.02, 0.015, 0.03))
	B.box(Vector3(1.6, 0.05, 1.6), dark, Vector3(0, 0.03, 0), node)
	for i in 4:
		B.box(Vector3(1.4, 0.15, 0.3), B.mat(Color(0.18, 0.16, 0.18)), Vector3(0, 0.02 - i * 0.12, -0.55 + i * 0.32), node)
	B.omni(Color(0.55, 0.75, 0.95), 1.6, 5.0, Vector3(0, -0.3, 0), node)
	_quest_label("The Undercroft Stair", node, 1.6)
	world.call("register_interactable", node)
