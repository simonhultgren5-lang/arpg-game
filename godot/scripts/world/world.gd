extends Node3D
## The playable world: builds Hollowmere or the Sunken Crypt (Game.area), then spawns the hero,
## camera, HUD and monsters, and handles combat queries, loot, interaction and death.

const B = preload("res://scripts/world/build.gd")
const Fx = preload("res://scripts/world/fx.gd")
const Town = preload("res://scripts/world/town.gd")
const Catacomb = preload("res://scripts/world/catacomb.gd")
const Player = preload("res://scripts/actors/player.gd")
const Enemy = preload("res://scripts/actors/enemy.gd")
const Loot = preload("res://scripts/actors/loot.gd")
const CameraRig = preload("res://scripts/world/camera_rig.gd")
const Hud = preload("res://scripts/ui/hud.gd")
const Interactable = preload("res://scripts/world/interactable.gd")
const Items = preload("res://scripts/data/items.gd")

var grid  # LevelGrid
var player: CharacterBody3D
var camera: Camera3D
var hud: CanvasLayer
var wall_material: ShaderMaterial
var rng := RandomNumberGenerator.new()
var boss: Node3D = null
var _interactables: Array = []


func _ready() -> void:
	if not Game.loaded:
		# Started the world scene directly from the editor: use a test hero.
		if Boot.character.is_empty():
			Boot.set_test_hero("warrior")
		await Game.load_hero()
	_build_environment()
	var spawn := Vector3.ZERO
	if Game.area == "catacomb":
		rng.seed = Game.catacomb_seed
		var cat := Catacomb.new()
		cat.build(self, rng)
		grid = cat.grid
		spawn = cat.spawn
		_spawn_monsters(cat)
		_spawn_warden_stones(cat)
	else:
		rng.seed = 1337  # the town looks the same every visit
		var town := Town.new()
		town.build(self, rng)
		grid = town.grid
		spawn = town.gate_spawn if Game.came_from == "catacomb" else town.spawn
	rng.randomize()

	player = Player.new()
	player.name = "Hero"
	player.world = self
	add_child(player)
	player.global_position = spawn
	player.setup()

	camera = CameraRig.new()
	camera.target = player
	add_child(camera)
	camera.current = true

	hud = Hud.new()
	hud.world = self
	add_child(hud)

	Game.leveled_up.connect(_on_level_up)
	Game.story_event.connect(_on_story_event)
	ActAudio.play_area("crypt" if Game.area == "catacomb" else "town")
	hud.banner(Game.area_title(), "Act I · The Tolling of Hollowmere" if Game.area == "town" else "Beneath St. Aldric's")
	if Game.area == "town" and Game.quest_state() == 0:
		message("Sister Maud waits by the chapel. Click her to speak.", B.GOLD)
	elif Game.area == "town" and Game.quest("act_end") == 1:
		message("The wells of Hollowmere are tolling. The undercroft stair is open behind the chapel door.", Color(0.6, 0.75, 0.95))


func _exit_tree() -> void:
	if Game.leveled_up.is_connected(_on_level_up):
		Game.leveled_up.disconnect(_on_level_up)
	if Game.story_event.is_connected(_on_story_event):
		Game.story_event.disconnect(_on_story_event)


func _build_environment() -> void:
	var town := Game.area == "town"
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.03, 0.025, 0.045)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.36, 0.32, 0.5) if town else Color(0.35, 0.28, 0.4)
	env.ambient_light_energy = 0.2 if town else 0.28
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.1
	env.glow_enabled = true
	env.glow_intensity = 0.9
	env.glow_bloom = 0.08
	env.glow_hdr_threshold = 0.9
	env.fog_enabled = true
	env.fog_light_color = Color(0.13, 0.11, 0.18)
	env.fog_density = 0.014 if town else 0.01
	env.ssao_enabled = true
	if town:
		env.volumetric_fog_enabled = true
		env.volumetric_fog_density = 0.012
		env.volumetric_fog_albedo = Color(0.32, 0.3, 0.4)
		env.volumetric_fog_length = 48.0
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	if town:
		var moon := DirectionalLight3D.new()
		moon.light_color = Color(0.55, 0.58, 0.9)
		moon.light_energy = 0.28
		moon.shadow_enabled = true
		moon.rotation = Vector3(deg_to_rad(-55), deg_to_rad(35), 0)
		add_child(moon)


func _process(_delta: float) -> void:
	if wall_material and player:
		wall_material.set_shader_parameter("player_pos", player.global_position)


# ------------------------------------------------------------------ queries

func ui_blocking() -> bool:
	return hud != null and hud.is_blocking()


func enemies() -> Array:
	return get_tree().get_nodes_in_group("enemies")


func mouse_ground() -> Vector3:
	var mp := get_viewport().get_mouse_position()
	var from := camera.project_ray_origin(mp)
	var dir := camera.project_ray_normal(mp)
	var hit = Plane(Vector3.UP, 0.0).intersects_ray(from, dir)
	return hit if hit != null else player.global_position


func _screen_dist(world_pos: Vector3) -> float:
	if camera.is_position_behind(world_pos):
		return INF
	return camera.unproject_position(world_pos).distance_to(get_viewport().get_mouse_position())


func hovered_enemy() -> Node3D:
	var best: Node3D = null
	var best_d := 55.0
	for e in enemies():
		var d := _screen_dist(e.global_position + Vector3(0, 1.0 + (1.0 if e.is_boss else 0.0), 0))
		var limit := 55.0 * (2.2 if e.is_boss else 1.0)
		if d < limit and d < best_d * (2.2 if e.is_boss else 1.0):
			best = e
			best_d = d
	return best


func hovered_interactable() -> Node3D:
	var best: Node3D = null
	var best_d := 60.0
	for it in _interactables:
		if not is_instance_valid(it) or not it.available():
			continue
		var d := _screen_dist(it.global_position + Vector3(0, 1.2, 0))
		if d < best_d:
			best = it
			best_d = d
	return best


func nearest_interactable(pos: Vector3, max_dist: float) -> Node3D:
	var best: Node3D = null
	var best_d := max_dist
	for it in _interactables:
		if not is_instance_valid(it) or not it.available():
			continue
		var d := Vector2(it.global_position.x - pos.x, it.global_position.z - pos.z).length()
		if d < best_d:
			best = it
			best_d = d
	return best


func register_interactable(node: Node3D) -> void:
	_interactables.append(node)


# ------------------------------------------------------------------ combat helpers

## Melee sweep from the hero. Returns how many foes were hit.
func hit_arc(origin: Vector3, dir: Vector3, reach: float, arc_deg: float, mult: float, source: Node3D) -> int:
	var hits := 0
	var cos_half := cos(deg_to_rad(arc_deg) * 0.5)
	for e in enemies():
		var to: Vector3 = e.global_position - origin
		to.y = 0.0
		var d := to.length()
		if d > reach + e.radius:
			continue
		if d > 0.6 and to.normalized().dot(dir) < cos_half:
			continue
		var roll: Array = source.roll_damage(mult)
		e.take_damage(roll[0], roll[1], dir)
		hits += 1
	if hits > 0:
		shake(0.08)
	return hits


func hit_radius(center: Vector3, radius: float, mult: float, source: Node3D, opts: Dictionary) -> int:
	var hits := 0
	for e in enemies():
		var to: Vector3 = e.global_position - center
		to.y = 0.0
		if to.length() > radius + e.radius:
			continue
		var roll: Array = source.roll_damage(mult)
		e.take_damage(roll[0], roll[1], to)
		if float(opts.get("stun", 0.0)) > 0.0 and not e.dead:
			e.stun(opts["stun"])
		if float(opts.get("knockback", 0.0)) > 0.0 and not e.dead:
			e.knockback(to if to.length() > 0.1 else Vector3.FORWARD, opts["knockback"])
		hits += 1
	return hits


## Pyromancer's Pyre: telegraph, blast, then burning ground.
func cast_pyre(at: Vector3, sk: Dictionary, source: Node3D) -> void:
	var color: Color = sk["color"]
	Fx.telegraph(self, at, sk["radius"], color, sk["delay"])
	await get_tree().create_timer(sk["delay"]).timeout
	if not is_instance_valid(source):
		return
	Fx.pillar(self, at, sk["radius"] * 0.6, color, 0.7)
	Fx.ring(self, at, sk["radius"], color, 0.4)
	shake(0.25)
	hit_radius(at, sk["radius"], sk["mult"], source, {})
	var ground := B.cylinder(sk["radius"], sk["radius"], 0.04, Fx.glow_mat(Color(1.0, 0.3, 0.05), 0.35), at + Vector3(0, 0.05, 0), self, 24)
	var burn_light := B.omni(Color(1.0, 0.4, 0.1), 1.5, sk["radius"] * 2.5, at + Vector3(0, 0.8, 0), self)
	var ticks := int(float(sk["burn_time"]) / 0.5)
	for t in ticks:
		await get_tree().create_timer(0.5).timeout
		if not is_instance_valid(source):
			break
		hit_radius(at, sk["radius"], float(sk["burn"]) * 0.5, source, {})
	ground.queue_free()
	burn_light.queue_free()


## Pyromancer's Cinder Rain: burning cinders fall at random spots around `at` over a short time.
func cast_rain(at: Vector3, sk: Dictionary, source: Node3D) -> void:
	var color: Color = sk["color"]
	Fx.telegraph(self, at, sk["radius"], color, float(sk["duration"]))
	var n := int(sk["count"])
	for i in n:
		await get_tree().create_timer(float(sk["duration"]) / n).timeout
		if not is_instance_valid(source):
			return
		var a := rng.randf() * TAU
		var p := at + Vector3(cos(a), 0, sin(a)) * rng.randf_range(0.0, float(sk["radius"]) - 0.6)
		Fx.pillar(self, p, float(sk["impact"]) * 0.5, color, 0.4)
		Fx.ring(self, p, sk["impact"], color, 0.3)
		hit_radius(p, sk["impact"], sk["mult"], source, {})
	shake(0.2)


## Rogue's Bone Caltrops: ground at `at` that slows foes and makes them bleed while it lasts.
func cast_trap(at: Vector3, sk: Dictionary, source: Node3D) -> void:
	var color: Color = sk["color"]
	var ground := B.cylinder(sk["radius"], sk["radius"], 0.04, Fx.glow_mat(color.darkened(0.7), 0.35, false), at + Vector3(0, 0.05, 0), self, 24)
	for i in 14:
		var a := rng.randf() * TAU
		var bone := B.box(Vector3(0.05, 0.05, 0.3), B.mat(Color(0.85, 0.8, 0.7)), at + Vector3(cos(a), 0.06, sin(a)) * rng.randf_range(0.2, float(sk["radius"]) - 0.2), self)
		bone.rotation.y = rng.randf() * TAU
		bone.reparent(ground)
	Fx.ring(self, at, sk["radius"], color, 0.4)
	var ticks := int(float(sk["duration"]) / 0.5)
	for t in ticks:
		for e in enemies():
			if is_instance_valid(e) and not e.dead and Vector2(e.global_position.x - at.x, e.global_position.z - at.z).length() < float(sk["radius"]) + e.radius:
				e.slow(0.6, 1.0 - float(sk["slow"]))
		if is_instance_valid(source):
			hit_radius(at, sk["radius"], float(sk["mult"]), source, {})
		await get_tree().create_timer(0.5).timeout
		if not is_inside_tree():
			return
	ground.queue_free()


func damage_number(pos: Vector3, amount: float, crit: bool) -> void:
	var text := str(int(ceil(amount)))
	if crit:
		text += "!"
	Fx.number(self, pos, text, Color(1.0, 0.85, 0.4) if crit else Color(0.95, 0.92, 0.88), crit)


func pickup_text(pos: Vector3, text: String, color: Color) -> void:
	Fx.number(self, pos, text, color)


func shake(amount: float) -> void:
	if camera:
		camera.shake(amount)


func message(text: String, color := Color(0.9, 0.86, 0.8)) -> void:
	Game.message.emit(text, color)


# ------------------------------------------------------------------ monsters & loot

func _spawn_monsters(cat) -> void:
	var lv: int = Game.monster_level()
	for pack in cat.packs(rng):
		var center: Vector2i = pack["center"]
		for i in int(pack["count"]):
			var roll := rng.randf()
			var kind := "hollow"
			if roll > 0.7:
				kind = "archer"
			elif roll > 0.5:
				kind = "crawler"
			var c: Vector2i = grid.random_floor_near(center, 2, rng)
			var pos: Vector3 = grid.center(c) + Vector3(rng.randf_range(-0.5, 0.5), 0, rng.randf_range(-0.5, 0.5))
			spawn_enemy(kind, pos, lv, pack["elite"] and i == 0)
	boss = spawn_enemy("boss", cat.boss_pos, lv + 2, false)


## The Wardens' Oath: the name-stones still missing lie in rooms of the crypt (one per room).
func _spawn_warden_stones(cat) -> void:
	if Game.quest("wardens") != 1:
		return
	var missing := Game.WARDEN_STONES - Game.warden_stones()
	var rooms: Array = cat.rooms.filter(func(r): return r["kind"] == "normal" or r["kind"] == "side")
	rooms.shuffle()
	for i in mini(missing, rooms.size()):
		var c: Vector2i = grid.random_floor_near(rooms[i]["center"], 2, rng)
		var stone := Interactable.new()
		stone.kind = "stone"
		stone.display_name = "A Warden's Name-Stone"
		stone.radius = 1.8
		add_child(stone)
		stone.global_position = grid.center(c)
		var slab := B.box(Vector3(0.45, 0.6, 0.14), B.mat(Color(0.5, 0.55, 0.65), 0.6, Color(0.35, 0.45, 0.7), 1.4), Vector3(0, 0.3, 0), stone)
		slab.rotation = Vector3(rng.randf_range(-0.4, 0.4), rng.randf() * TAU, rng.randf_range(-0.3, 0.3))
		B.omni(Color(0.55, 0.65, 0.95), 1.0, 3.0, Vector3(0, 0.8, 0), stone)
		B.label("Name-Stone", Color(0.7, 0.78, 0.95), Vector3(0, 1.2, 0), stone, 30)
		register_interactable(stone)


func spawn_enemy(kind: String, pos: Vector3, lv: int, elite: bool) -> Node3D:
	var e := Enemy.new()
	e.world = self
	e.kind = kind
	e.level = maxi(1, lv)
	e.elite = elite
	add_child(e)
	e.global_position = pos
	e.setup()
	e.died.connect(_on_enemy_died)
	return e


func _on_enemy_died(e: Node3D) -> void:
	var lv: int = e.level
	var xp := int(float(e.data["xp"]) * (1.0 + 0.2 * (lv - 1)) * (2.5 if e.elite else 1.0))
	Game.add_xp(xp)
	Game.progress["kills"] = int(Game.progress.get("kills", 0)) + 1
	_on_kill_powers()
	var pos := e.global_position
	if e.is_boss:
		Fx.pillar(self, pos, 2.0, B.EMBER, 1.2)
		shake(0.8)
		for i in 3:
			drop_item(pos, lv + 1, 0.55)
		if not Game.found_unique("hasks_toll") or rng.randf() < 0.2:
			drop_unique(pos, "hasks_toll")
		drop_gold(pos, rng.randi_range(80, 140))
		drop_potion(pos)
		Game.on_boss_slain()
		hud.boss_defeated()
		message("Hask, the Bell-Warden, falls silent.", Color(0.92, 0.42, 0.18))
		ActAudio.play_area("crypt")
		_open_portal(pos)
		Game.save()
		return
	if rng.randf() < 0.55:
		drop_gold(pos, rng.randi_range(2, 7) * lv)
	if rng.randf() < 0.12:
		drop_potion(pos)
	if rng.randf() < (0.65 if e.elite else 0.14):
		drop_item(pos, lv, 0.3 if e.elite else 0.0)
	if e.elite and rng.randf() < 0.08:
		drop_unique(pos, "saints_knuckle")


## Unique powers that react to a kill.
func _on_kill_powers() -> void:
	if player and not player.dead and Game.has_unique("saints_knuckle"):
		player.hp = minf(Game.max_hp(), player.hp + Game.max_hp() * 0.04)


func _scatter(pos: Vector3) -> Vector3:
	for attempt in 8:
		var p := pos + Vector3(rng.randf_range(-1.4, 1.4), 0, rng.randf_range(-1.4, 1.4))
		if grid.walkable_at(p):
			return p
	return pos


func _drop(pos: Vector3, kind: String, gold := 0, item := {}) -> void:
	var l := Loot.new()
	l.world = self
	l.kind = kind
	l.gold = gold
	l.item = item
	add_child(l)
	l.global_position = _scatter(pos)
	l.setup()


func drop_gold(pos: Vector3, amount: int) -> void:
	_drop(pos, "gold", amount)


func drop_potion(pos: Vector3) -> void:
	_drop(pos, "potion")


func drop_item(pos: Vector3, ilvl: int, bias: float) -> void:
	_drop(pos, "item", 0, Game.roll_loot(ilvl, bias))


func drop_unique(pos: Vector3, id: String) -> void:
	Game.mark_unique_found(id)
	_drop(pos, "item", 0, Items.make_unique(id))
	message("Something unique glimmers on the ground.", Items.RARITY_COLORS[Items.UNIQUE])


func _open_portal(pos: Vector3) -> void:
	var portal := Interactable.new()
	portal.kind = "portal"
	portal.display_name = "Portal to Hollowmere"
	portal.radius = 2.2
	add_child(portal)
	portal.global_position = _scatter(pos + Vector3(0, 0, -2.5))
	var ring := B.cylinder(1.0, 1.0, 2.6, Fx.glow_mat(Color(0.55, 0.35, 0.95), 0.4), Vector3(0, 1.3, 0), portal, 20)
	ring.scale = Vector3(1, 1, 0.15)
	B.omni(Color(0.6, 0.4, 1.0), 2.5, 7.0, Vector3(0, 1.5, 0.6), portal)
	B.label("Portal to Hollowmere", Color(0.75, 0.65, 1.0), Vector3(0, 3.2, 0), portal, 36)
	register_interactable(portal)


# ------------------------------------------------------------------ events

func interact(it: Node3D) -> void:
	match it.kind:
		"npc":
			hud.open_dialogue(it.npc_id)
		"gate":
			if Game.quest_state() == 0:
				message("The gate is chained shut. Perhaps Sister Maud has the key.", Color(0.8, 0.7, 0.6))
			else:
				Game.enter_area("catacomb")
		"stairs", "portal":
			Game.enter_area("town")
		"grave":
			if Game.dig_grave() == "dug":
				Fx.ring(self, it.global_position, 2.0, Color(1.0, 0.85, 0.55), 0.5)
			elif Game.quest("lamps") >= 2:
				message("Only an empty hole, and the smell of old lead.", Color(0.8, 0.75, 0.7))
		"plinth":
			if Game.place_warden_stones():
				Fx.pillar(self, it.global_position, 1.2, Color(0.55, 0.65, 0.95), 1.2)
				hud.banner("The Wardens' Oath", "Twelve names, spoken aloud. Below, twelve wardens lie down.")
			elif Game.quest("wardens") == 1:
				message("The plinth waits for its stones (%d/%d)." % [Game.warden_stones(), Game.WARDEN_STONES], Color(0.75, 0.8, 0.9))
			elif Game.quest("wardens") == 0:
				message("A plinth, its niches empty. Old Corwin might know why.", Color(0.8, 0.75, 0.7))
		"stone":
			Game.take_warden_stone()
			Fx.ring(self, it.global_position, 1.5, Color(0.55, 0.65, 0.95), 0.4)
			_interactables.erase(it)
			it.queue_free()
		"undercroft":
			if Game.descend_undercroft() or Game.quest("act_end") >= 2:
				hud.show_act_complete()


func boss_engaged(e: Node3D) -> void:
	hud.show_boss(e)
	ActAudio.play_area("boss")
	message("Hask, the Bell-Warden, turns toward you. The clapper in his chest begins to swing.", Color(0.92, 0.42, 0.18))


func player_died() -> void:
	hud.show_death()


func respawn_in_town() -> void:
	var lost := int(int(Game.progress["gold"]) * 0.1)
	Game.progress["gold"] = int(Game.progress["gold"]) - lost
	if lost > 0:
		message("You lost %d gold in the dark." % lost, Color(0.8, 0.5, 0.4))
	Game.enter_area("town")


func _on_story_event(id: String) -> void:
	match id:
		"wells_toll":
			ActAudio.toll(self)
			shake(0.4)
			hud.banner("The Wells Toll", "Far below the water, every well in Hollowmere answers the bell")


func _on_level_up(lv: int) -> void:
	if player:
		player.on_level_up()
	hud.banner("Level %d" % lv, "Your strength grows. The dark notices.")
