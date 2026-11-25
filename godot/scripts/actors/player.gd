extends CharacterBody3D
## The hero. Left click moves or attacks (hold to keep going), Shift+left click attacks in place,
## right click / 1 / 2 cast skills, 3 and 4 are locked slots, Q drinks a draught, WASD moves directly,
## E talks or uses the nearest thing.

const B = preload("res://scripts/world/build.gd")
const WarriorModel = preload("res://scripts/models/warrior_model.gd")
const Fx = preload("res://scripts/world/fx.gd")
const Projectile = preload("res://scripts/actors/projectile.gd")

var world: Node3D
var cls: Dictionary = {}
var hp := 100.0
var mana := 50.0
var dead := false
var attack_cd := 0.0
var skill_cd := [0.0, 0.0]
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
	hp = Game.max_hp()
	mana = Game.max_mana()
	# The hero's own light: the dark never quite closes in.
	var l := B.omni(Color(1.0, 0.85, 0.7), 0.9, 10.0, Vector3(0, 3.2, 0.5), self, true)
	l.name = "HeroLight"


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
	if Game.hero_class == "warrior":
		WarriorModel.build(_model, _body_mat, _weapon)
		return
	# legs, body, head
	for side in [-0.15, 0.15]:
		B.box(Vector3(0.18, 0.8, 0.2), dark, Vector3(side, 0.4, 0), _model)
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
	if dead or world.ui_blocking():
		return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			_lmb_held = true
			_primary_press()
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			cast_skill(0)
			get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("skill_1"):
		cast_skill(0)
	elif event.is_action_pressed("skill_2"):
		cast_skill(1)
	elif event.is_action_pressed("skill_3") or event.is_action_pressed("skill_4"):
		world.message("That skill slot unlocks in a later act.", Color(0.6, 0.55, 0.6))
	elif event.is_action_pressed("potion"):
		drink_potion()
	elif event.is_action_pressed("interact"):
		var it = world.nearest_interactable(global_position, 3.5)
		if it:
			_target_use = it
			_target_enemy = null


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		_lmb_held = false
		_hold_mode = ""


func _primary_press() -> void:
	if Input.is_key_pressed(KEY_SHIFT):
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
	for i in skill_cd.size():
		skill_cd[i] = maxf(0.0, skill_cd[i] - delta)
	var mhp: float = Game.max_hp()
	var mmana: float = Game.max_mana()
	hp = minf(mhp, hp + mhp * 0.006 * delta)
	mana = minf(mmana, mana + float(cls["mana_regen"]) * delta)
	_hurt = maxf(0.0, _hurt - delta * 3.0)
	_body_mat.emission = Color(1, 0.1, 0.05) * _hurt
	_animate(delta)
	if not _dash.is_empty():
		_dash_step(delta)
		return

	var move := Vector3.ZERO
	var iv := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if iv.length() > 0.1 and not world.ui_blocking():
		_clear_targets()
		_hold_mode = ""
		move = Vector3(iv.x, 0, iv.y).normalized()
	else:
		move = _auto_move(delta)
	velocity = move * Game.move_speed()
	move_and_slide()
	global_position.y = 0.0
	if move.length() > 0.1:
		_face(move, 0.3)
		_step_t += delta * 9.0
	else:
		_step_t = 0.0


func _auto_move(delta: float) -> Vector3:
	var basic: Dictionary = cls["basic"]
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
	_model.position.y = absf(sin(_step_t)) * 0.07


# ------------------------------------------------------------------ combat

func roll_damage(mult: float) -> Array:
	var r: Vector2 = Game.damage_range()
	var amount := randf_range(r.x, r.y) * mult
	var crit := randf() < Game.crit_chance() or crit_buff > 0.0
	if crit:
		amount *= 2.5 if crit_buff > 0.0 else 1.75
		crit_buff = 0.0
	return [amount, crit]


func _basic_attack(at: Vector3) -> void:
	var basic: Dictionary = cls["basic"]
	attack_cd = basic["cooldown"]
	ActAudio.spell(self, basic["id"])
	_swing = 1.0
	var dir := at - global_position
	dir.y = 0.0
	if dir.length() < 0.01:
		dir = facing()
	dir = dir.normalized()
	_face(dir, 1.0)
	match basic["kind"]:
		"arc":
			var hits: int = world.hit_arc(global_position, dir, basic["range"], basic["arc"], basic["mult"], self)
			Fx.slash(world, global_position, dir, basic["range"], basic["arc"], basic["color"])
			if hits > 0:
				mana = minf(Game.max_mana(), mana + float(cls["mana_on_hit"]) * mini(hits, 3))
		"bolt":
			var roll := roll_damage(basic["mult"])
			_projectile(dir, "bolt", basic["speed"], roll[0], roll[1], basic["range"], basic["color"], 0)


func _projectile(dir: Vector3, style: String, spd: float, dmg: float, crit: bool, dist: float, color: Color, pierce: int) -> void:
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
	world.add_child(pr)
	pr.global_position = global_position + Vector3(0, 1.2, 0) + dir * 0.6
	pr.setup()


func cast_skill(i: int) -> void:
	if dead or i >= cls["skills"].size():
		return
	var sk: Dictionary = cls["skills"][i]
	if skill_cd[i] > 0.0:
		return
	if mana < float(sk["mana"]):
		world.message("Not enough %s." % cls["resource"].to_lower(), Color(0.5, 0.55, 0.95))
		return
	var g: Vector3 = world.mouse_ground()
	var dir := g - global_position
	dir.y = 0.0
	var dist := dir.length()
	dir = dir.normalized() if dist > 0.01 else facing()
	mana -= float(sk["mana"])
	ActAudio.spell(self, sk["id"])
	skill_cd[i] = sk["cooldown"]
	_swing = 1.0
	_face(dir, 1.0)
	var color: Color = sk["color"]
	match sk["kind"]:
		"nova":
			world.hit_radius(global_position, sk["radius"], sk["mult"], self, {"stun": sk.get("stun", 0.0), "knockback": sk.get("knockback", 0.0)})
			Fx.ring(world, global_position, sk["radius"], color, 0.4)
			Fx.flash(world, global_position, color, 5.0, sk["radius"] * 2.0)
			world.shake(0.3)
		"rush":
			_clear_targets()
			_dash = {"dir": dir, "left": clampf(dist, 2.0, sk["range"]), "hit": {}, "mult": sk["mult"], "color": color, "speed": 26.0}
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
				_projectile(d, "knife", sk["speed"], roll[0], roll[1], sk["range"], color, 0)
		"blink":
			var to := global_position + dir * minf(dist, sk["range"])
			var c: Vector2i = world.grid.nearest_walkable(world.grid.cell_of(to), 3)
			if c.x < 0:
				return
			var land: Vector3 = to if world.grid.walkable_at(to) else world.grid.center(c)
			Fx.ring(world, global_position, 1.5, color, 0.3)
			global_position = Vector3(land.x, 0, land.z)
			_clear_targets()
			Fx.ring(world, global_position, sk["radius"], color, 0.35)
			Fx.flash(world, global_position, color, 4.0, 6.0)
			world.hit_radius(global_position, sk["radius"], sk["mult"], self, {})
			crit_buff = sk["crit_window"]


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
			e.knockback((e.global_position - global_position).normalized() + _dash["dir"] * 0.5, 1.5)
	if _dash["left"] <= 0.0 or moved < step * 0.3:
		Fx.ring(world, global_position, 2.0, _dash["color"], 0.3)
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
	Game.stats_changed.emit()
	potion_cd = 0.8
	var heal := mhp * 0.45
	hp = minf(mhp, hp + heal)
	Fx.number(world, global_position, "+%d" % int(heal), Color(0.4, 0.95, 0.4))
	Fx.flash(world, global_position, Color(0.9, 0.2, 0.2), 3.0, 4.0)


func take_damage(amount: float) -> void:
	if dead:
		return
	var dealt: float = Game.mitigate(amount)
	hp -= dealt
	_hurt = 1.0
	Fx.number(world, global_position, str(int(ceil(dealt))), Color(1.0, 0.3, 0.25))
	if hp <= 0.0:
		hp = 0.0
		dead = true
		_dash = {}
		var tw := create_tween()
		tw.tween_property(_model, "rotation:x", -PI * 0.5, 0.5).set_trans(Tween.TRANS_BOUNCE)
		world.player_died()


func on_level_up() -> void:
	hp = Game.max_hp()
	mana = Game.max_mana()
	Fx.pillar(world, global_position, 1.2, B.GOLD, 0.9)
	Fx.ring(world, global_position, 3.0, B.GOLD, 0.6)
