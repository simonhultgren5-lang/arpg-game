extends CharacterBody3D
## The hero. Left click moves or attacks with the LMB skill (hold to keep going), Shift+left click attacks
## in place, right click and 1-4 cast the skills on the bar (hold to repeat), Q drinks a draught, WASD moves
## directly, E talks or uses the nearest thing. The bar and variants are Game.build() (Skills panel, S).

const B = preload("res://scripts/world/build.gd")
const SpellFx = preload("res://scripts/world/spell_fx.gd")
const WarriorModel = preload("res://scripts/models/warrior_model.gd")
const AssetModels = preload("res://scripts/models/asset_models.gd")
const RogueModel = preload("res://scripts/models/rogue_model.gd")
const MageModel = preload("res://scripts/models/mage_model.gd")
const Fx = preload("res://scripts/world/fx.gd")
const Projectile = preload("res://scripts/actors/projectile.gd")
const Classes = preload("res://scripts/data/classes.gd")

var world: Node3D
var cls: Dictionary = {}
var hp := 100.0
var mana := 50.0
var dead := false
var attack_cd := 0.0
## Cooldowns left, by skill id, so moving a skill on the bar never resets it.
var _cds := {}
## Bar slots whose key or button is held down (they recast whenever ready).
var _held := [false, false, false, false, false, false]
## Damage the hero can take before losing life (Ashen Ward, the Warden's Vigil).
var ward := 0.0
var ward_t := 0.0
## Grave Roar: time left, damage bonus and damage reduction.
var buff_t := 0.0
var _buff := {}
var _whirl := {}
var _toll_count := 0
var _vigil_cd := 0.0
var potion_cd := 0.0
var crit_buff := 0.0

var _path := PackedVector3Array()
var _path_i := 0
var _target_enemy: Node3D = null
var _target_use: Node3D = null
var _lmb_held := false
var _hold_mode := ""  # "move", "attack", "force"
var _repath := 0.0
var _dash: Dictionary = {}
var _model: Node3D
var _weapon: Node3D
var _swing := 0.0
var _hurt := 0.0
var _body_mat: StandardMaterial3D
var _legs: Array[Node3D] = []
## The Blender model's animator (assets/models/characters/<class>.gltf), or null for code models.
var _anim: Node = null
var _breath_phase := 0.0
var _stride := 0.0
var _step_t := 0.0


func setup() -> void:
	cls = Game.class_data
	ActAudio.voice(self, Game.hero_class)
	add_to_group("player")
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	collision_layer = 2
	collision_mask = 1 | 4
	var shape := CapsuleShape3D.new()
	shape.radius = 0.4
	shape.height = 1.8
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = Vector3(0, 0.9, 0)
	add_child(cs)
	_build_model()
	_legs.assign([_model.get_node("LeftLeg"), _model.get_node("RightLeg")])
	hp = Game.max_hp()
	mana = Game.max_mana()
	# The hero's own light: the dark never quite closes in.
	var l := B.omni(Color(1.0, 0.85, 0.7), 0.9, 10.0, Vector3(0, 3.2, 0.5), self, true)
	l.name = "HeroLight"
	SpellFx.class_ambient(self, Game.hero_class)


func _build_model() -> void:
	_model = Node3D.new()
	_model.name = "Model"
	add_child(_model)
	var armor_color := Color.html(str(Boot.character.get("color", "#8d3430")))
	_body_mat = B.unique_mat(armor_color, 0.6)
	var dark := B.mat(armor_color.darkened(0.55))
	var skin := B.mat(Color(0.72, 0.58, 0.5))
	var steel := B.mat(Color(0.7, 0.7, 0.75), 0.3, Color.BLACK, 1.0, 0.85)
	var gold := B.mat(B.GOLD, 0.35, Color.BLACK, 1.0, 0.8)
	_weapon = Node3D.new()
	_weapon.position = Vector3(0.38, 1.25, 0.05)
	_model.add_child(_weapon)
	# The Blender model, when there is one: tint_* surfaces take the hero's armour colour.
	var asset := AssetModels.character(Game.hero_class)
	if asset:
		_model.add_child(asset)
		var mats := AssetModels.prepare(asset, armor_color)
		if not mats.is_empty():
			_body_mat = mats[0]
		_anim = AssetModels.animate(asset)
		for side in [-0.11, 0.11]:  # where footfalls land
			var leg := Node3D.new()
			leg.name = "LeftLeg" if side > 0 else "RightLeg"
			leg.position = Vector3(side, 0.8, 0)
			_model.add_child(leg)
		return
	match Game.hero_class:
		"warrior":
			WarriorModel.build(_model, _body_mat, _weapon)
			return
		"rogue":
			RogueModel.build(_model, _body_mat, _weapon)
			return
		"pyromancer":
			MageModel.build(_model, _body_mat, _weapon)
			return
	# legs, body, head
	for side in [-0.15, 0.15]:
		var leg := Node3D.new()
		leg.name = "LeftLeg" if side < 0 else "RightLeg"
		leg.position = Vector3(side, 0.8, 0)
		_model.add_child(leg)
		B.box(Vector3(0.18, 0.8, 0.2), dark, Vector3(0, -0.4, 0), leg)
		B.box(Vector3(0.19, 0.13, 0.29), dark, Vector3(0, -0.73, 0.05), leg)
	B.capsule(0.32, 1.0, _body_mat, Vector3(0, 1.15, 0), _model)
	B.sphere(0.21, skin, Vector3(0, 1.82, 0), _model, 10)
	B.box(Vector3(0.5, 0.08, 0.35), gold, Vector3(0, 0.88, 0), _model)  # belt
	match Game.hero_class:
		"pyromancer":
			B.cylinder(0.0, 0.3, 0.55, _body_mat, Vector3(0, 2.0, -0.03), _model, 10)  # hood
			B.cylinder(0.32, 0.48, 0.9, _body_mat, Vector3(0, 0.55, 0), _model, 10)  # robe
			B.cylinder(0.03, 0.04, 1.9, B.mat(Color(0.2, 0.12, 0.08)), Vector3(0, 0.3, 0), _weapon, 6)
			B.sphere(0.13, B.mat(B.EMBER, 1.0, B.EMBER, 5.0), Vector3(0, 1.3, 0), _weapon, 8)
			B.omni(B.EMBER, 1.2, 4.0, Vector3(0, 1.4, 0), _weapon)
			_weapon.rotation.x = 0.15
		"rogue":
			B.cylinder(0.0, 0.3, 0.5, _body_mat, Vector3(0, 2.0, -0.05), _model, 10)
			var cape := B.box(Vector3(0.6, 1.2, 0.05), dark, Vector3(0, 1.1, -0.3), _model)
			cape.rotation.x = 0.12
			B.box(Vector3(0.05, 0.55, 0.1), steel, Vector3(0, 0.3, 0), _weapon)
			B.box(Vector3(0.05, 0.55, 0.1), steel, Vector3(-0.76, 0.3, 0), _weapon)


# ------------------------------------------------------------------ input

func _unhandled_input(event: InputEvent) -> void:
	if dead:
		return
	# With a panel open the mouse belongs to the panel, but keys (skills, draughts) still work.
	if event is InputEventMouseButton and world.ui_blocking():
		return
	if not (event is InputEventMouseButton) and world.keys_blocked():
		return
	if event.is_action_pressed("bar_1"):
		_lmb_held = true
		_primary_press()
		get_viewport().set_input_as_handled()
		return
	for k in range(1, Game.BAR_SIZE):
		if event.is_action_pressed("bar_%d" % (k + 1)):
			_held[k] = true
			cast_slot(k)
			get_viewport().set_input_as_handled()
			return
	if event.is_action_pressed("potion"):
		drink_potion()
	elif event.is_action_pressed("interact"):
		var it = world.nearest_interactable(global_position, 3.5)
		if it:
			_target_use = it
			_target_enemy = null


func _input(event: InputEvent) -> void:
	if event.is_action_released("bar_1"):
		_lmb_held = false
		_hold_mode = ""
	for k in range(1, Game.BAR_SIZE):
		if event.is_action_released("bar_%d" % (k + 1)):
			_held[k] = false


func _primary_press() -> void:
	if Input.is_action_pressed("force_attack"):
		_hold_mode = "force"
		_clear_targets()
		return
	var e = world.hovered_enemy()
	if e:
		_hold_mode = "attack"
		_target_enemy = e
		_target_use = null
		_path = PackedVector3Array()
		return
	var it = world.hovered_interactable()
	if it:
		_hold_mode = ""
		_target_use = it
		_target_enemy = null
		_path_to(it.global_position)
		return
	_hold_mode = "move"
	_clear_targets()
	_path_to(world.mouse_ground())


## Stops walking, attacking and holding (a panel just opened over the world).
func stop() -> void:
	_clear_targets()
	_lmb_held = false
	_hold_mode = ""


func _clear_targets() -> void:
	_target_enemy = null
	_target_use = null
	_path = PackedVector3Array()


func _path_to(p: Vector3) -> void:
	if world.grid.has_line(global_position, p, 0.35):
		_path = PackedVector3Array([Vector3(p.x, 0, p.z)])
	else:
		_path = world.grid.find_path(global_position, p)
	_path_i = 0


# ------------------------------------------------------------------ update

func _physics_process(delta: float) -> void:
	if dead:
		return
	attack_cd -= delta
	potion_cd -= delta
	crit_buff -= delta
	for id in _cds:
		_cds[id] = maxf(0.0, _cds[id] - delta)
	if not world.keys_blocked():
		for k in range(1, Game.BAR_SIZE):
			if _held[k]:
				cast_slot(k, false)
	_vigil_cd -= delta
	buff_t -= delta
	ward_t -= delta
	if ward_t <= 0.0:
		ward = 0.0
	_whirl_step(delta)
	# The Lamplighter's Wick widens the hero's light.
	var light := get_node_or_null("HeroLight") as OmniLight3D
	if light:
		light.omni_range = 14.0 if Game.has_unique("lamplighters_wick") else 10.0
	var mhp: float = Game.max_hp()
	var mmana: float = Game.max_mana()
	hp = minf(mhp, hp + (mhp * 0.006 + Game.life_regen()) * delta)
	mana = minf(mmana, mana + float(cls["mana_regen"]) * (1.0 + Game.passive_bonus("resource_regen")) * delta)
	_hurt = maxf(0.0, _hurt - delta * 3.0)
	_body_mat.emission = Color(1, 0.1, 0.05) * _hurt
	_animate(delta)
	if not _dash.is_empty():
		_dash_step(delta)
		return

	var move := Vector3.ZERO
	var iv := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if iv.length() > 0.1 and not world.keys_blocked():
		_clear_targets()
		_hold_mode = ""
		move = Vector3(iv.x, 0, iv.y).normalized()
	else:
		move = _auto_move(delta)
	velocity = move * Game.move_speed() * (1.0 + (float(_buff.get("speed_bonus", 0.0)) if buff_t > 0.0 else 0.0))
	move_and_slide()
	global_position.y = 0.0
	if move.length() > 0.1:
		_face(move, 0.3)
	var distance_moved := get_position_delta().length()
	_stride = move_toward(_stride, clampf(distance_moved / maxf(delta * Game.move_speed(), 0.001), 0, 1), delta * 8)
	var old_step := floori(_step_t / PI)
	_step_t += distance_moved * 1.8
	if floori(_step_t / PI) != old_step:
		var foot := _legs[old_step % 2]
		ActAudio.cue("step_%s_%d" % [world.step_surface(global_position), old_step % 3 + 1], -17.5, self)
		if old_step % 2 == 0:
			ActAudio.cue("gear", -24.0, self)
		Fx.footfall(world, Vector3(foot.global_position.x, 0.035, foot.global_position.z), _model.rotation.y)
		SpellFx.footstep(world, Vector3(foot.global_position.x, 0.0, foot.global_position.z))


func _auto_move(delta: float) -> Vector3:
	var basic: Dictionary = lmb_skill()
	# Holding left mouse: keep following / attacking.
	if _lmb_held:
		_repath -= delta
		match _hold_mode:
			"move":
				if _repath <= 0.0:
					_repath = 0.15
					var g: Vector3 = world.mouse_ground()
					if g.distance_to(global_position) > 0.6:
						_path_to(g)
			"force":
				var g: Vector3 = world.mouse_ground()
				_face(g - global_position, 1.0)
				if attack_cd <= 0.0:
					_basic_attack(g)
				return Vector3.ZERO
			"attack":
				if _target_enemy == null or not is_instance_valid(_target_enemy) or _target_enemy.dead:
					var e = world.hovered_enemy()
					_target_enemy = e
	# Attacking a target.
	if _target_enemy != null:
		if not is_instance_valid(_target_enemy) or _target_enemy.dead:
			_target_enemy = null
			return Vector3.ZERO
		var to_e := _target_enemy.global_position - global_position
		to_e.y = 0.0
		var reach: float = basic["range"] + float(_target_enemy.radius)
		if basic["kind"] == "bolt":
			reach = basic["range"] * 0.85
		var clear: bool = basic["kind"] != "bolt" or world.grid.has_line(global_position, _target_enemy.global_position, 0.1)
		if to_e.length() <= reach and clear:
			_face(to_e, 1.0)
			if attack_cd <= 0.0:
				_basic_attack(_target_enemy.global_position)
				if not _lmb_held:
					pass  # a single click attacks until the target dies
			return Vector3.ZERO
		_repath -= delta
		if _repath <= 0.0 or _path_i >= _path.size():
			_repath = 0.3
			_path_to(_target_enemy.global_position)
	# Walking to something to use.
	if _target_use != null:
		if not is_instance_valid(_target_use):
			_target_use = null
		else:
			var to_u := _target_use.global_position - global_position
			to_u.y = 0.0
			if to_u.length() <= float(_target_use.radius):
				var it := _target_use
				_clear_targets()
				_face(to_u, 1.0)
				world.interact(it)
				return Vector3.ZERO
			if _path_i >= _path.size():
				_path_to(_target_use.global_position)
	# Follow the path.
	while _path_i < _path.size():
		var d := _path[_path_i] - global_position
		d.y = 0.0
		if d.length() < 0.3:
			_path_i += 1
			continue
		return d.normalized()
	return Vector3.ZERO


func _face(dir: Vector3, weight: float) -> void:
	dir.y = 0.0
	if dir.length() < 0.01:
		return
	_model.rotation.y = lerp_angle(_model.rotation.y, atan2(dir.x, dir.z), weight)


func facing() -> Vector3:
	return Vector3(sin(_model.rotation.y), 0, cos(_model.rotation.y))


func _animate(delta: float) -> void:
	_swing = maxf(0.0, _swing - delta * 5.0)
	if _anim:
		_anim.update(delta, _stride)
		_breath_phase = fmod(_breath_phase + delta * 2.1, TAU)
		return
	var s := sin((1.0 - _swing) * PI) if _swing > 0.0 else 0.0
	match Game.hero_class:
		"warrior":
			_weapon.rotation.x = -0.3 + s * 1.65
			_weapon.rotation.z = s * 0.65
		"pyromancer":
			_weapon.rotation.x = 0.15 - s * 0.9
		_:
			_weapon.rotation.x = -0.3 - s * 1.4
			_weapon.rotation.z = s * 0.9
	var step := sin(_step_t) * _stride
	_legs[0].rotation.x = step * 0.48
	_legs[1].rotation.x = -step * 0.48
	_weapon.rotation.x += step * 0.09 * (1.0 - _swing)
	_model.rotation.z = step * 0.028
	_breath_phase = fmod(_breath_phase + delta * 2.1, TAU)
	var breath := sin(_breath_phase) * (1.0 - _stride)
	_model.position.y = absf(step) * 0.065 + breath * 0.012
	_model.rotation.x = breath * 0.008 - s * 0.08


# ------------------------------------------------------------------ combat

func roll_damage(mult: float) -> Array:
	var r: Vector2 = Game.damage_range()
	var amount := randf_range(r.x, r.y) * mult * (1.0 + Game.passive_bonus("damage"))
	if buff_t > 0.0:
		amount *= 1.0 + float(_buff.get("damage", 0.0))
	if Game.has_unique("lamplighters_wick"):
		amount *= 1.12
	var crit := randf() < Game.crit_chance() or crit_buff > 0.0
	if crit:
		amount *= Game.crit_damage() + (0.75 if crit_buff > 0.0 else 0.0)
		crit_buff = 0.0
	return [amount, crit]


## The skill on the LMB slot (the class's first primary if the slot is empty).
func lmb_skill() -> Dictionary:
	var id: String = Game.build()["bar"][0]
	if id == "":
		id = Classes.skills(Game.hero_class)[0]["id"]
	return Game.resolved(id)


func _basic_attack(at: Vector3) -> void:
	_primary_attack(lmb_skill(), at)


## A primary skill: costs nothing, builds the class resource on hits.
func _primary_attack(basic: Dictionary, at: Vector3) -> void:
	attack_cd = float(basic["cooldown"]) / Game.attack_speed()
	if _anim:
		_anim.one_shot("cast" if basic["kind"] in ["bolt", "fan"] and Game.hero_class == "pyromancer" else "attack", 1.4)
	ActAudio.spell(self, basic["id"])
	if basic["id"] == "grave_cleave":
		var weapon = Game.progress["equipped"].get("weapon")
		var icon := str(weapon.get("icon", "")) if weapon is Dictionary else ""
		ActAudio.cue("axe" if icon in ["axe", "maul"] else "sword", -19.0, self)
	_swing = 1.0
	var dir := at - global_position
	dir.y = 0.0
	if dir.length() < 0.01:
		dir = facing()
	dir = dir.normalized()
	_face(dir, 1.0)
	var fx := Classes.effects_of(basic)
	var color: Color = basic["color"]
	match basic["kind"]:
		"arc":
			var hits: int = world.hit_arc(global_position, dir, basic["range"], basic["arc"], basic["mult"], self, fx)
			Fx.slash(world, global_position, dir, basic["range"], basic["arc"], color)
			if hits > 0:
				var gain := float(cls["mana_on_hit"]) * float(basic.get("gain", 1.0)) * (1.0 + Game.passive_bonus("gain"))
				mana = minf(Game.max_mana(), mana + gain * mini(hits, 3))
		"bolt", "fan":
			var n := int(basic.get("count", 1))
			var spread := deg_to_rad(float(basic.get("spread", 0.0)))
			for k in n:
				var a := 0.0 if n <= 1 else -spread * 0.5 + spread * k / float(n - 1)
				var roll := roll_damage(basic["mult"])
				_projectile(dir.rotated(Vector3.UP, a), basic.get("style", "bolt"), basic["speed"], roll[0], roll[1],
					basic["range"], color, int(basic.get("pierce", 0)), fx)
	# Hask's Toll: every fifth attack strikes everything around the hero.
	if Game.has_unique("hasks_toll"):
		_toll_count += 1
		if _toll_count >= 5:
			_toll_count = 0
			world.hit_radius(global_position, 4.0, 1.2, self, {"knockback": 1.5})
			Fx.ring(world, global_position, 4.0, Color(1.0, 0.55, 0.2), 0.45)
			world.shake(0.25)


func _projectile(dir: Vector3, style: String, spd: float, dmg: float, crit: bool, dist: float, color: Color, pierce: int, effects := {}) -> void:
	var pr := Projectile.new()
	pr.world = world
	pr.team = "player"
	pr.style = style
	pr.dir = dir
	pr.speed = spd
	pr.damage = dmg
	pr.crit = crit
	pr.max_dist = dist
	pr.color = color
	pr.pierce = pierce
	pr.effects = effects
	world.add_child(pr)
	pr.global_position = global_position + Vector3(0, 1.2, 0) + dir * 0.6
	pr.setup()


## The skill in bar slot `k` (0 = LMB), resolved with its variant; {} for an empty slot.
func slot_skill(k: int) -> Dictionary:
	var id: String = Game.build()["bar"][k]
	return {} if id == "" else Game.resolved(id)


## Older callers: skill i is bar slot i + 1 (RMB, 1, 2, 3).
func skill_unlocked(i: int) -> bool:
	var id: String = Game.build()["bar"][i + 1]
	return id != "" and Game.skill_unlocked_for(id)


func cast_skill(i: int) -> void:
	cast_slot(i + 1)


func cooldown_left(id: String) -> float:
	return float(_cds.get(id, 0.0))


## 0..1 of the cooldown left on skill `id` (primaries: the attack timer).
func cooldown_frac(id: String) -> float:
	var sk := Game.resolved(id)
	if sk.is_empty():
		return 0.0
	if sk.get("primary", false):
		return clampf(attack_cd / maxf(float(sk["cooldown"]) / Game.attack_speed(), 0.01), 0.0, 1.0)
	return clampf(cooldown_left(id) / maxf(float(sk["cooldown"]) * Game.cooldown_mult(), 0.01), 0.0, 1.0)


## Cooldown left on bar slot k + 1 (tests).
func slot_cd(k: int) -> float:
	var id: String = Game.build()["bar"][k + 1]
	return cooldown_left(id)


func reset_cooldowns() -> void:
	_cds.clear()
	attack_cd = 0.0


## What a skill costs after passives.
func skill_cost(sk: Dictionary) -> float:
	return float(sk.get("mana", 0)) * (1.0 - Game.passive_bonus("cost"))


## Uses bar slot `slot_i`. `loud`: say why it can't (a fresh press, not a held key repeating).
func cast_slot(slot_i: int, loud := true) -> void:
	if dead or slot_i < 0 or slot_i >= Game.BAR_SIZE:
		return
	var sk := slot_skill(slot_i)
	if sk.is_empty():
		return
	if not Game.skill_unlocked_for(sk["id"]):
		if loud:
			world.message("%s unlocks at level %d." % [sk["name"], int(sk.get("unlock", 1))], Color(0.6, 0.55, 0.6))
		return
	if sk.get("primary", false):
		if attack_cd <= 0.0:
			_primary_attack(sk, world.mouse_ground())
		return
	if cooldown_left(sk["id"]) > 0.0:
		return
	var cost := skill_cost(sk)
	if mana < cost:
		if loud:
			world.message("Not enough %s." % cls["resource"].to_lower(), Color(0.5, 0.55, 0.95))
		return
	var g: Vector3 = world.mouse_ground()
	var dir := g - global_position
	dir.y = 0.0
	var dist := dir.length()
	dir = dir.normalized() if dist > 0.01 else facing()
	mana -= cost
	ActAudio.spell(self, sk["id"])
	_cds[sk["id"]] = float(sk["cooldown"]) * Game.cooldown_mult()
	var fx := Classes.effects_of(sk)
	if _anim:
		_anim.one_shot("cast" if Game.hero_class == "pyromancer" or sk["kind"] in ["nova", "ward", "buff"] else "attack", 1.2)
	_swing = 1.0
	_face(dir, 1.0)
	var color: Color = sk["color"]
	match sk["kind"]:
		"nova":
			world.hit_radius(global_position, sk["radius"], sk["mult"], self, fx)
			match Game.hero_class:
				"warrior":
					Fx.ring(world, global_position, sk["radius"], color, 0.4)
					SpellFx.ground_cracks(world, global_position, sk["radius"], color)
					SpellFx.dust_burst(world, global_position, sk["radius"])
					SpellFx.debris(world, global_position, sk["radius"], 14)
					SpellFx.shockwave(world, global_position, sk["radius"])
				"pyromancer":
					SpellFx.explosion(world, global_position, sk["radius"] * 0.8, color)
				_:
					SpellFx.smoke_burst(world, global_position, sk["radius"] * 0.5, Color(0.2, 0.2, 0.26), 8, 1.4, 0.5)
					Fx.ring(world, global_position, sk["radius"], color, 0.4)
			Fx.flash(world, global_position, color, 5.0, sk["radius"] * 2.0)
			world.shake(0.3)
		"rush":
			_clear_targets()
			_dash = {"dir": dir, "left": clampf(dist, 2.0, sk["range"]), "hit": {}, "mult": sk["mult"], "color": color, "speed": 26.0, "fx": fx}
		"pyre":
			var at := global_position + dir * minf(dist, sk["range"])
			world.cast_pyre(at, sk, self)
		"fan":
			var n: int = sk["count"]
			var spread := deg_to_rad(sk["spread"])
			for k in n:
				var a := -spread * 0.5 + spread * k / maxf(1.0, n - 1)
				var d := dir.rotated(Vector3.UP, a)
				var roll := roll_damage(sk["mult"])
				_projectile(d, "bolt" if Game.hero_class == "pyromancer" else "knife", sk["speed"], roll[0], roll[1], sk["range"], color, int(sk.get("pierce", 0)), fx)
		"blink":
			var to := global_position + dir * minf(dist, sk["range"])
			var c: Vector2i = world.grid.nearest_walkable(world.grid.cell_of(to), 3)
			if c.x < 0:
				return
			var land: Vector3 = to if world.grid.walkable_at(to) else world.grid.center(c)
			Fx.ring(world, global_position, 1.5, color, 0.3)
			_blink_fx(global_position, color)
			global_position = Vector3(land.x, 0, land.z)
			_clear_targets()
			_blink_fx(global_position, color)
			Fx.ring(world, global_position, sk["radius"], color, 0.35)
			Fx.flash(world, global_position, color, 4.0, 6.0)
			world.hit_radius(global_position, sk["radius"], sk["mult"], self, fx)
			crit_buff = maxf(crit_buff, float(sk["crit_window"]))
		"buff":
			buff_t = sk["duration"]
			_buff = {"damage": sk["damage"], "guard": sk["guard"], "speed_bonus": sk.get("speed_bonus", 0.0), "dodge": sk.get("dodge", 0.0)}
			if sk.has("radius"):
				world.hit_radius(global_position, sk["radius"], sk.get("mult", 0.0), self, fx)
				Fx.ring(world, global_position, sk["radius"], color, 0.4)
			Fx.ring(world, global_position, 3.0, color, 0.5)
			Fx.flash(world, global_position, color, 5.0, 6.0, 0.5)
			SpellFx.aura(self, color, float(sk["duration"]))
			world.shake(0.2)
		"whirl":
			_whirl = {"left": sk["duration"], "tick": 0.0, "every": sk["tick"], "radius": sk["radius"], "mult": sk["mult"], "color": color, "fx": fx}
		"ward":
			ward = maxf(ward, Game.max_hp() * float(sk["absorb"]))
			ward_t = sk["duration"]
			if sk.has("radius"):
				world.hit_radius(global_position, sk["radius"], sk.get("mult", 0.0), self, fx)
				Fx.ring(world, global_position, sk["radius"], color, 0.4)
			Fx.ring(world, global_position, 1.6, color, 0.6)
			Fx.flash(world, global_position, color, 3.0, 4.0, 0.4)
			SpellFx.aura(self, color, float(sk["duration"]), 0.8)
		"rain":
			var at := global_position + dir * minf(dist, sk["range"])
			world.cast_rain(at, sk, self)
		"trap":
			var at := global_position + dir * minf(dist, sk["range"])
			world.cast_trap(at, sk, self)
		"flurry":
			_flurry(sk)


func _dash_step(delta: float) -> void:
	var step: float = _dash["speed"] * delta
	var before := global_position
	velocity = _dash["dir"] * _dash["speed"]
	move_and_slide()
	global_position.y = 0.0
	var moved := global_position.distance_to(before)
	_dash["left"] -= step
	for e in world.enemies():
		if _dash["hit"].has(e):
			continue
		if e.global_position.distance_to(global_position) < 1.5 + e.radius:
			_dash["hit"][e] = true
			var roll := roll_damage(_dash["mult"])
			e.take_damage(roll[0], roll[1], _dash["dir"])
			world.apply_effects(e, _dash["dir"], _dash.get("fx", {}), roll[0], self)
			if is_instance_valid(e) and not e.dead:
				e.knockback((e.global_position - global_position).normalized() + _dash["dir"] * 0.5, 1.5)
	SpellFx.footstep(world, global_position)
	if _dash["left"] <= 0.0 or moved < step * 0.3:
		Fx.ring(world, global_position, 2.0, _dash["color"], 0.3)
		SpellFx.dust_burst(world, global_position, 1.6)
		world.shake(0.2)
		_dash = {}


func drink_potion() -> void:
	if potion_cd > 0.0 or dead:
		return
	if int(Game.progress["potions"]) <= 0:
		world.message("No draughts left. Edda in Hollowmere sells them.", Color(0.9, 0.45, 0.45))
		return
	var mhp: float = Game.max_hp()
	if hp >= mhp:
		return
	Game.progress["potions"] = int(Game.progress["potions"]) - 1
	ActAudio.cue("potion", -16.0, self)
	Game.stats_changed.emit()
	potion_cd = 0.8
	var heal := mhp * 0.45
	hp = minf(mhp, hp + heal)
	Fx.number(world, global_position, "+%d" % int(heal), Color(0.4, 0.95, 0.4))
	Fx.flash(world, global_position, Color(0.9, 0.2, 0.2), 3.0, 4.0)


func take_damage(amount: float) -> void:
	if dead or Dev.god_mode:
		return
	if buff_t > 0.0 and randf() < float(_buff.get("dodge", 0.0)):
		Fx.number(world, global_position, "dodged", Color(0.7, 0.7, 0.8))
		return
	var dealt: float = Game.mitigate(amount)
	if buff_t > 0.0:
		dealt *= 1.0 - float(_buff.get("guard", 0.0))
	# The Warden's Vigil: a blow that would leave the hero below a third of their life calls the oath.
	if Game.has_unique("wardens_vigil") and _vigil_cd <= 0.0 and hp - dealt < Game.max_hp() / 3.0:
		_vigil_cd = 45.0
		ward = maxf(ward, Game.max_hp() * 0.4)
		ward_t = 10.0
		Fx.pillar(world, global_position, 0.9, Color(0.55, 0.65, 0.95), 0.6)
		world.message("The wardens' oath holds.", Color(0.6, 0.7, 0.95))
	if ward > 0.0:
		var absorbed := minf(ward, dealt)
		ward -= absorbed
		dealt -= absorbed
		if dealt <= 0.0:
			Fx.number(world, global_position, "warded", Color(0.6, 0.7, 0.95))
			return
	hp -= dealt
	ActAudio.cue("hurt", -11.0, self, 140)
	_hurt = 1.0
	Fx.number(world, global_position, str(int(ceil(dealt))), Color(1.0, 0.3, 0.25))
	if hp <= 0.0:
		hp = 0.0
		dead = true
		_dash = {}
		if _anim:
			_anim.die()
		else:
			var tw := create_tween()
			tw.tween_property(_model, "rotation:x", -PI * 0.5, 0.5).set_trans(Tween.TRANS_BOUNCE)
		world.player_died()


## Sexton's Whirl: hits all around every tick while it lasts.
func _whirl_step(delta: float) -> void:
	if _whirl.is_empty():
		return
	_whirl["left"] -= delta
	_whirl["tick"] -= delta
	_model.rotation.y += delta * 18.0
	if _whirl["tick"] <= 0.0:
		_whirl["tick"] = _whirl["every"]
		world.hit_radius(global_position, _whirl["radius"], _whirl["mult"], self, _whirl.get("fx", {}))
		Fx.ring(world, global_position, _whirl["radius"], _whirl["color"], 0.2)
		SpellFx.sparks(world, global_position + Vector3(0, 1.0, 0), Vector3.UP, 8, 5.0, 120.0)
		SpellFx.dust_burst(world, global_position, _whirl["radius"] * 0.6)
	if _whirl["left"] <= 0.0:
		_whirl = {}


## Death Flurry: strike up to N nearby foes in turn, appearing next to each.
func _flurry(sk: Dictionary) -> void:
	var foes: Array = []
	for e in world.enemies():
		if is_instance_valid(e) and not e.dead and e.global_position.distance_to(global_position) <= float(sk["range"]):
			foes.append(e)
	foes.sort_custom(func(a, b): return a.global_position.distance_to(global_position) < b.global_position.distance_to(global_position))
	if foes.is_empty():
		Fx.ring(world, global_position, 1.5, sk["color"], 0.3)
		return
	_clear_targets()
	for e in foes.slice(0, int(sk["targets"])):
		if not is_instance_valid(e) or e.dead or dead:
			continue
		var side: Vector3 = (global_position - e.global_position)
		side.y = 0.0
		var land: Vector3 = e.global_position + (side.normalized() if side.length() > 0.1 else Vector3.BACK) * (float(e.radius) + 0.7)
		if world.grid.walkable_at(land):
			Fx.ring(world, global_position, 1.0, sk["color"], 0.2)
			global_position = Vector3(land.x, 0, land.z)
		_face(e.global_position - global_position, 1.0)
		_swing = 1.0
		var roll := roll_damage(sk["mult"])
		e.take_damage(roll[0], roll[1], e.global_position - global_position)
		world.apply_effects(e, e.global_position - global_position, Classes.effects_of(sk), roll[0], self)
		Fx.slash(world, global_position, (e.global_position - global_position).normalized(), 1.6, 120.0, sk["color"])
		await get_tree().create_timer(0.12).timeout
		if not is_inside_tree():
			return


## Departure and arrival of a blink: smoke for the rogue, flame for the pyromancer, thrown earth otherwise.
func _blink_fx(at: Vector3, color: Color) -> void:
	match Game.hero_class:
		"rogue":
			SpellFx.smoke_burst(world, at, 1.1, Color(0.12, 0.12, 0.17), 7, 1.5, 0.4)
		"pyromancer":
			SpellFx.flame_puff(world, at, 2.2, color, 0.5)
			SpellFx.sparks(world, at + Vector3(0, 0.5, 0), Vector3.UP, 12, 3.5, 90.0)
		_:
			SpellFx.dust_burst(world, at, 2.0)
			SpellFx.debris(world, at, 1.6, 6)


func on_level_up() -> void:
	hp = Game.max_hp()
	mana = Game.max_mana()
	Fx.pillar(world, global_position, 1.2, B.GOLD, 0.9)
	Fx.ring(world, global_position, 3.0, B.GOLD, 0.6)
