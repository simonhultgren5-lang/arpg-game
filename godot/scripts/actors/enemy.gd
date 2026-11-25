extends CharacterBody3D
## Catacomb monsters and the Act I boss. One script, data-driven by KINDS.

const B = preload("res://scripts/world/build.gd")
const SpellFx = preload("res://scripts/world/spell_fx.gd")
const Fx = preload("res://scripts/world/fx.gd")
const Projectile = preload("res://scripts/actors/projectile.gd")
const HollowModel = preload("res://scripts/models/hollow_model.gd")
const BoneArcherModel = preload("res://scripts/models/bone_archer_model.gd")
const AssetModels = preload("res://scripts/models/asset_models.gd")
const CrawlerModel = preload("res://scripts/models/crawler_model.gd")
const BossModel = preload("res://scripts/models/boss_model.gd")

const KINDS := {
	"hollow": {"name": "Hollow", "hp": 30, "dmg": 6, "speed": 3.3, "range": 1.6, "cd": 1.3, "windup": 0.45,
		"xp": 12, "color": Color(0.38, 0.42, 0.36), "scale": 1.0, "radius": 0.45},
	"crawler": {"name": "Grave Crawler", "hp": 16, "dmg": 4, "speed": 5.4, "range": 1.3, "cd": 0.9, "windup": 0.28,
		"xp": 8, "color": Color(0.32, 0.27, 0.28), "scale": 0.8, "radius": 0.4},
	"archer": {"name": "Bone Archer", "hp": 20, "dmg": 7, "speed": 3.0, "range": 10.0, "cd": 1.9, "windup": 0.55,
		"xp": 14, "color": Color(0.74, 0.7, 0.6), "scale": 1.0, "radius": 0.4, "ranged": true},
	"boss": {"name": "Hask, the Bell-Warden", "hp": 520, "dmg": 15, "speed": 3.1, "range": 2.9, "cd": 1.7,
		"windup": 0.65, "xp": 320, "color": Color(0.3, 0.25, 0.2), "scale": 1.0, "radius": 1.2, "boss": true},
}

signal died(enemy: Node3D)

## How far a monster follows the hero from where it spawned.
const LEASH_RANGE := 28.0
const FEN_START_ROW: int = preload("res://scripts/world/fen.gd").START_ROW

var world: Node3D
var kind := "hollow"
var level := 1
var elite := false
var data: Dictionary = {}
var display_name := ""
var max_hp := 30.0
var hp := 30.0
var dmg := 6.0
var radius := 0.45
var dead := false
var is_boss := false
var aggro := false

var _cd := 0.0
var _windup := 0.0
var _warning_audio: AudioStreamPlayer3D
var _stun := 0.0
## Slowed (Bone Caltrops): time left and the speed multiplier while it lasts.
var _slow_t := 0.0
var _slow_f := 1.0
var _path := PackedVector3Array()
var _path_i := 0
var _repath := 0.0
var _knock := Vector3.ZERO
var _home := Vector3.ZERO
var _wander_t := 0.0
var _wander_to := Vector3.ZERO
var _model: Node3D
var _mats: Array[StandardMaterial3D] = []
var _flash := 0.0
var _toll_cd := 6.0
var _toll_pending := -1.0
var _summoned := false
var _enraged := false
var _crawler_legs: Array[Node3D] = []
var _crawl_phase := 0.0
var _crawl_weight := 0.0
var _step_t := 0.0


func setup() -> void:
	data = KINDS[kind]
	is_boss = data.get("boss", false)
	var lv_mult := 1.0 + 0.35 * (level - 1)
	max_hp = data["hp"] * lv_mult
	dmg = data["dmg"] * (1.0 + 0.22 * (level - 1))
	radius = data["radius"]
	display_name = data["name"]
	var s: float = data["scale"]
	if elite:
		max_hp *= 2.4
		dmg *= 1.35
		s *= 1.25
		radius *= 1.2
		display_name = "Elite " + display_name
	hp = max_hp
	_home = global_position
	add_to_group("enemies")
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	collision_layer = 4
	collision_mask = 1 | 2 | 4
	var shape := CapsuleShape3D.new()
	shape.radius = radius
	shape.height = maxf(1.6 * s, radius * 2.0 + 0.1)
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = Vector3(0, shape.height * 0.5, 0)
	add_child(cs)
	_model = Node3D.new()
	add_child(_model)
	_build_model(s)
	_build_life_bar(s)
	_cd = randf() * 1.0
	SpellFx.enemy_ambient(self, "boss" if is_boss else kind, 1.2 * s)


var _bar: Node3D
var _bar_fill: MeshInstance3D


## A small life bar over the head, shown when "Always show enemy life bars" is on (Settings, Gameplay).
func _build_life_bar(s: float) -> void:
	_bar = Node3D.new()
	_bar.position = Vector3(0, 2.1 * s + (0.6 if is_boss else 0.0), 0)
	add_child(_bar)
	for part in ["back", "fill"]:
		var mi := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(0.9 if part == "back" else 0.86, 0.1 if part == "back" else 0.065)
		mi.mesh = q
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		m.no_depth_test = true
		m.render_priority = 1 if part == "fill" else 0
		m.albedo_color = Color(0.05, 0.03, 0.04) if part == "back" else (Color(0.9, 0.6, 0.2) if elite else Color(0.75, 0.1, 0.08))
		mi.material_override = m
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_bar.add_child(mi)
		if part == "fill":
			_bar_fill = mi
	_bar.visible = false


func _update_life_bar() -> void:
	if _bar == null:
		return
	var show := bool(Settings.get_value("gameplay", "enemy_bars")) and not dead and (aggro or hp < max_hp)
	_bar.visible = show
	if show:
		var f := clampf(hp / max_hp, 0.0, 1.0)
		_bar_fill.scale.x = maxf(f, 0.001)
		_bar_fill.position.x = -0.43 * (1.0 - f)


func _m(color: Color) -> StandardMaterial3D:
	var m := B.unique_mat(color)
	_mats.append(m)
	return m


## The Blender model's animator (assets/models/characters/<kind>.gltf), or null for code models.
var _anim: Node = null


func _build_model(s: float) -> void:
	var col: Color = data["color"]
	var eye := B.mat(Color(0.6, 0.9, 1.0), 1.0, Color(0.5, 0.9, 1.0), 4.0)
	var asset := AssetModels.character(kind)
	if asset:
		asset.scale = Vector3.ONE * s
		_model.add_child(asset)
		_mats.append_array(AssetModels.prepare(asset))
		_anim = AssetModels.animate(asset)
	match "" if asset else kind:
		"hollow":
			HollowModel.build(_model, s, col, _m)
		"crawler":
			_crawler_legs = CrawlerModel.build(_model, s, col, _m)
		"archer":
			BoneArcherModel.build(_model, s, col, _m)
		"boss":
			BossModel.build(_model, s, col, _m)
	if elite:
		B.omni(Color(0.6, 0.3, 0.9), 1.5, 4.0, Vector3(0, 1.0, 0), _model)
		for m in _mats:
			m.albedo_color = m.albedo_color.lerp(Color(0.4, 0.2, 0.5), 0.35)


func _physics_process(delta: float) -> void:
	_update_life_bar()
	if dead:
		return
	if not _crawler_legs.is_empty():
		# Distance travelled last physics tick also covers wandering and backing away.
		var travel := get_position_delta().length()
		_crawl_weight = move_toward(_crawl_weight, clampf(travel / maxf(delta * 2.0, 0.001), 0, 1), delta * 9)
		_crawl_phase = fmod(_crawl_phase + travel * 4.2, TAU)
		for i in _crawler_legs.size():
			var phase := _crawl_phase + (PI if i % 2 else 0.0)
			var side := -1.0 if i < 3 else 1.0
			_crawler_legs[i].rotation.y = side * sin(phase) * _crawl_weight * 0.31
			_crawler_legs[i].rotation.z = side * maxf(0, cos(phase)) * _crawl_weight * 0.22
	_cd -= delta
	_flash = maxf(0.0, _flash - delta * 4.0)
	for m in _mats:
		m.emission = Color(0.9, 0.75, 0.6) * (_flash * 0.45) if _windup <= 0.0 else Color(1.0, 0.25, 0.1) * 0.6
	_knock = _knock.move_toward(Vector3.ZERO, delta * 18.0)
	if _anim:
		_anim.update(delta, clampf(get_position_delta().length() / maxf(delta * float(data["speed"]), 0.001), 0.0, 1.0))
	if _stun > 0.0:
		if is_instance_valid(_warning_audio):
			_warning_audio.stream_paused = true
		_stun -= delta
		_windup = 0.0
		velocity = _knock
		move_and_slide()
		return
	var p: Node3D = world.player
	if p == null:
		return
	if is_instance_valid(_warning_audio):
		_warning_audio.stream_paused = p.dead
	var to_p := p.global_position - global_position
	to_p.y = 0.0
	var dist := to_p.length()
	if not aggro:
		if dist < (14.0 if is_boss else 11.0) and not p.dead:
			set_aggro()
		else:
			_wander(delta)
			return
	if _leashed(p):
		# Give up the chase, heal and drift back home (the genre's leash).
		aggro = false
		hp = max_hp
		_path = PackedVector3Array()
		return
	if p.dead:
		velocity = _knock
		move_and_slide()
		return
	if is_boss:
		_boss_logic(delta, p, dist)
	# winding up an attack: stand still, then strike
	if _windup > 0.0:
		_windup -= delta
		_face(to_p)
		if _windup <= 0.0:
			_strike(p, dist, to_p)
		velocity = _knock
		move_and_slide()
		return
	var ranged: bool = data.get("ranged", false)
	var reach: float = data["range"] + (0.4 if not ranged else 0.0)
	var can_see: bool = world.grid.has_line(global_position, p.global_position, 0.2)
	var move := Vector3.ZERO
	if dist <= reach and (can_see or not ranged):
		if ranged and dist < 4.0:
			move = -to_p.normalized() * 0.8  # back off
		if _cd <= 0.0:
			_windup = data["windup"]
			ActAudio.cue("tell_" + kind, -15.0, self, 100)
			if _anim:
				_anim.one_shot("attack", _anim.player.get_animation("attack").length / maxf(float(data["windup"]) + 0.25, 0.1) if _anim.player.has_animation("attack") else 1.0)
			_cd = data["cd"] * (0.75 if _enraged else 1.0)
	else:
		move = _chase(delta, p, can_see)
	_slow_t -= delta
	var spd: float = data["speed"] * (1.3 if _enraged else 1.0) * (_slow_f if _slow_t > 0.0 else 1.0)
	velocity = move * spd + _knock
	move_and_slide()
	global_position.y = 0.0
	if move.length() > 0.1:
		_face(move)
		_step_t += delta * spd * 2.0
		_model.position.y = absf(sin(_step_t)) * 0.08
	else:
		_face(to_p)


func _chase(delta: float, p: Node3D, can_see: bool) -> Vector3:
	if can_see:
		_path = PackedVector3Array()
		var d := p.global_position - global_position
		d.y = 0.0
		return d.normalized()
	_repath -= delta
	if _repath <= 0.0 or _path_i >= _path.size():
		_repath = 0.5 + randf() * 0.2
		_path = world.grid.find_path(global_position, p.global_position)
		_path_i = 0
	while _path_i < _path.size():
		var d := _path[_path_i] - global_position
		d.y = 0.0
		if d.length() < 0.4:
			_path_i += 1
			continue
		return d.normalized()
	return Vector3.ZERO


func _wander(delta: float) -> void:
	_wander_t -= delta
	if _wander_t <= 0.0:
		_wander_t = randf_range(2.0, 5.0)
		var c: Vector2i = world.grid.random_floor_near(world.grid.cell_of(_home), 2, world.rng)
		_wander_to = world.grid.center(c)
	var d := _wander_to - global_position
	d.y = 0.0
	if d.length() > 0.4 and world.grid.has_line(global_position, _wander_to):
		velocity = d.normalized() * data["speed"] * 0.35 + _knock
		_face(d)
	else:
		velocity = _knock
	move_and_slide()
	global_position.y = 0.0


func _face(dir: Vector3) -> void:
	if dir.length() < 0.01:
		return
	var target := atan2(dir.x, dir.z)
	_model.rotation.y = lerp_angle(_model.rotation.y, target, 0.2)


func _strike(p: Node3D, dist: float, to_p: Vector3) -> void:
	if data.get("ranged", false):
		var pr := Projectile.new()
		pr.world = world
		pr.team = "enemy"
		pr.style = "arrow"
		pr.color = Color(1.0, 0.5, 0.2)
		pr.speed = 14.0
		pr.damage = dmg
		pr.max_dist = 16.0
		pr.hit_radius = 0.4
		pr.dir = to_p.normalized()
		world.add_child(pr)
		pr.global_position = global_position + Vector3(0, 1.2, 0) + pr.dir * 0.5
		pr.setup()
		return
	var reach: float = data["range"] + 0.6
	var facing := Vector3(sin(_model.rotation.y), 0, cos(_model.rotation.y))
	if dist <= reach + radius and facing.dot(to_p.normalized()) > 0.2:
		p.take_damage(dmg * randf_range(0.85, 1.15))
	if is_boss:
		Fx.slash(world, global_position, facing, reach + 1.0, 120.0, Color(1.0, 0.4, 0.15))
		world.shake(0.25)


func _boss_logic(delta: float, p: Node3D, dist: float) -> void:
	_toll_cd -= delta
	if not _summoned and hp < max_hp * 0.5:
		_summoned = true
		ActAudio.cue("boss_summon", -11.0, self)
		ActAudio.boss_phase(false)
		world.message("Hask strikes his chest. The bell answers, and the dead rise.", Color(0.92, 0.42, 0.18))
		for i in 4:
			var c: Vector2i = world.grid.random_floor_near(world.grid.cell_of(global_position), 4, world.rng)
			var e = world.spawn_enemy("hollow" if i % 2 == 0 else "crawler", world.grid.center(c), level - 1, false)
			e.set_aggro()
	if not _enraged and hp < max_hp * 0.25:
		_enraged = true
		ActAudio.cue("boss_enrage", -11.0, self)
		ActAudio.boss_phase(true)
		world.message("Hask's chest burns white-hot.", Color(1.0, 0.5, 0.2))
	if _toll_pending >= 0.0:
		_toll_pending -= delta
		if _toll_pending < 0.0:
			_toll_pending = -1.0
			ActAudio.cue("boss_release", -6.0, self)
			Fx.ring(world, global_position, 7.0, Color(1.0, 0.45, 0.15), 0.5)
			Fx.flash(world, global_position, Color(1.0, 0.4, 0.15), 8.0, 14.0, 0.5)
			world.shake(0.6)
			if dist < 7.0 and not p.dead:
				p.take_damage(dmg * 1.6)
		return
	if _toll_cd <= 0.0 and _windup <= 0.0:
		_toll_cd = 7.0 if not _enraged else 5.0
		_toll_pending = 1.2
		if _anim:
			_anim.one_shot("cast", 0.6)
		Fx.telegraph(world, global_position, 7.0, Color(1.0, 0.35, 0.1), 1.2)
		world.message("THE BELL TOLLS", Color(1.0, 0.5, 0.25))
		_warning_audio = ActAudio.cue("boss_prepare", -8.0, self)


## Monsters stop chasing when the hero gets far from their home ground or, for the fen's risen, steps
## inside the town wall. The boss holds its arena.
func _leashed(p: Node3D) -> bool:
	if is_boss:
		return false
	if p.global_position.distance_to(_home) > LEASH_RANGE:
		return true
	return str(get_meta("where", "")) == "fen" and world.grid.cell_of(p.global_position).y < FEN_START_ROW


func set_aggro() -> void:
	if aggro or dead:
		return
	aggro = true
	ActAudio.voice(self, kind)
	if is_boss:
		world.boss_engaged(self)
	# wake the rest of the pack
	for e in world.enemies():
		if e != self and not e.aggro and e.global_position.distance_to(global_position) < 9.0:
			e.set_aggro()


func take_damage(amount: float, crit := false, push := Vector3.ZERO) -> void:
	if dead:
		return
	hp -= amount
	ActAudio.cue("hit_" + kind, -13.0, self, 55)
	if crit:
		ActAudio.cue("crit", -9.0, self, 120)
	if _anim and _windup <= 0.0 and hp > 0.0:
		_anim.one_shot("hit")
	_flash = 1.0
	set_aggro()
	world.damage_number(global_position, amount, crit)
	Fx.impact(world, global_position + Vector3.UP * (1.1 if elite else 0.9), push, crit)
	if push.length() > 0.0 and not is_boss:
		_knock += Vector3(push.x, 0, push.z).normalized() * (5.0 if crit else 2.5)
	if hp <= 0.0:
		_die()


func slow(seconds: float, factor: float) -> void:
	if is_boss:
		factor = lerpf(factor, 1.0, 0.5)  # Hask shrugs off half of it
	_slow_t = maxf(_slow_t, seconds)
	_slow_f = clampf(factor, 0.1, 1.0)


func stun(seconds: float) -> void:
	if is_boss:
		seconds *= 0.3
	_stun = maxf(_stun, seconds)


func knockback(dir: Vector3, strength: float) -> void:
	if is_boss:
		return
	_knock += Vector3(dir.x, 0, dir.z).normalized() * strength * 4.0


func _die() -> void:
	dead = true
	if is_instance_valid(_warning_audio):
		_warning_audio.stop()
		_warning_audio.queue_free()
	ActAudio.cue("boss_death" if is_boss else "death_" + kind, -6.0 if is_boss else -14.0, self, 100)
	SpellFx.death_burst(world, global_position, kind, is_boss)
	remove_from_group("enemies")
	collision_layer = 0
	collision_mask = 0
	died.emit(self)
	var tw := create_tween()
	tw.set_parallel(true)
	if _anim:
		_anim.die()
		tw.tween_interval(0.9)
	else:
		tw.tween_property(_model, "rotation:x", -PI * 0.5, 0.35).set_trans(Tween.TRANS_BACK)
		tw.tween_property(_model, "position:y", -0.3, 0.35)
	tw.chain().tween_interval(2.0)
	tw.chain().tween_property(_model, "position:y", -2.0, 1.2)
	tw.chain().tween_callback(queue_free)
