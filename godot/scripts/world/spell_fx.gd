extends RefCounted
## Realistic spell and character effects: volumetric-looking fire and smoke (turbulent noise sprites),
## fireballs with flame, smoke and ember trails, explosions with shockwave refraction, burning ground,
## cracking earth with flying debris, poison and shadow clouds, auras, and per-class / per-monster ambience.
## Everything is built from shader sprites and particles (shaders/flame, smoke, shock_distort), no textures.
## Particle counts follow the graphics quality (Settings), and every effect frees itself.

const Fx = preload("res://scripts/world/fx.gd")
const B = preload("res://scripts/world/build.gd")

static var _flame_shader: Shader
static var _smoke_shader: Shader
static var _shock_shader: Shader
static var _shrink: Curve


## 0.5 on Low, 0.8 on Medium, 1.0 on High, 1.4 on Ultra: scales particle counts.
static func quality() -> float:
	var tree := Engine.get_main_loop() as SceneTree
	var settings = tree.root.get_node_or_null("Settings") if tree else null
	if settings == null:
		return 1.0
	return {"low": 0.5, "medium": 0.8, "high": 1.0, "ultra": 1.4}.get(str(settings.get_value("graphics", "quality")), 1.0)


## A node's world position, or its local one while it is still being built outside the tree.
static func _at(node: Node3D) -> Vector3:
	return node.global_position if node.is_inside_tree() else node.position


static func _n(count: int) -> int:
	return maxi(1, int(round(count * quality())))


static func flame_material(hot := Color(1.0, 0.93, 0.62), mid := Color(1.0, 0.46, 0.1), cool := Color(0.42, 0.05, 0.02), strength := 1.7, rise := 1.5) -> ShaderMaterial:
	if _flame_shader == null:
		_flame_shader = load("res://shaders/flame.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _flame_shader
	m.set_shader_parameter("hot", hot)
	m.set_shader_parameter("mid", mid)
	m.set_shader_parameter("cool", cool)
	m.set_shader_parameter("strength", strength)
	m.set_shader_parameter("rise", rise)
	return m


## A fire palette built around one spell colour: orange stays orange, other hues keep a hot white core.
static func flame_for(color: Color, strength := 1.7) -> ShaderMaterial:
	return flame_material(color.lerp(Color(1.0, 0.95, 0.75), 0.7), color, color.darkened(0.7), strength)


static func smoke_material(tint := Color(0.36, 0.34, 0.36), lit := Color(0.68, 0.66, 0.68), opacity := 0.55) -> ShaderMaterial:
	if _smoke_shader == null:
		_smoke_shader = load("res://shaders/smoke.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _smoke_shader
	m.set_shader_parameter("tint", tint)
	m.set_shader_parameter("lit", lit)
	m.set_shader_parameter("opacity", opacity)
	return m


static func _quad(size: float, material: Material) -> QuadMesh:
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = material
	return q


static func _shrink_curve() -> Curve:
	if _shrink == null:
		_shrink = Curve.new()
		_shrink.add_point(Vector2(0, 1.0))
		_shrink.add_point(Vector2(0.55, 0.8))
		_shrink.add_point(Vector2(1, 0.15))
	return _shrink


static func _grow_curve() -> Curve:
	var c := Curve.new()
	c.add_point(Vector2(0, 0.35))
	c.add_point(Vector2(1, 1.0))
	return c


## A CPU particle emitter with sensible defaults for sprite effects.
static func _emitter(parent: Node, pos: Vector3, mesh: Mesh, amount: int, lifetime: float, one_shot := true) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.emitting = false
	p.mesh = mesh
	p.amount = amount
	p.lifetime = lifetime
	p.one_shot = one_shot
	p.local_coords = false
	p.direction = Vector3.UP
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1, 1, 1, 1))
	ramp.set_color(1, Color(1, 1, 1, 0))
	p.color_ramp = ramp
	parent.add_child(p)
	if p.is_inside_tree():
		p.global_position = pos
	else:
		p.position = pos  # the parent is still being built; callers then set the local position
	if one_shot:
		p.finished.connect(p.queue_free)
	if p.is_inside_tree():
		p.emitting = true
	else:
		p.tree_entered.connect(func(): p.emitting = true, CONNECT_ONE_SHOT)  # particles need the tree to start
	return p


## A single flame tongue that grows, flickers and burns out.
static func flame_puff(parent: Node, pos: Vector3, size: float, color := Color(1.0, 0.46, 0.1), duration := 0.6) -> void:
	var mat := flame_for(color)
	var mi := MeshInstance3D.new()
	mi.mesh = _quad(1.0, mat)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = pos + Vector3(0, size * 0.4, 0)
	mi.scale = Vector3.ONE * size * 0.5
	var tw := mi.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mi, "scale", Vector3.ONE * size, duration).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_method(func(v: float): mat.set_shader_parameter("manual_age", v), 0.0, 1.0, duration)
	tw.chain().tween_callback(mi.queue_free)


## A light that flickers like real fire until `duration` passes, then fades.
static func fire_light(parent: Node, pos: Vector3, color: Color, energy: float, light_range: float, duration: float) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = color
	l.light_energy = energy
	l.omni_range = light_range
	l.omni_attenuation = 1.3
	parent.add_child(l)
	l.global_position = pos
	var tw := l.create_tween()
	var steps := maxi(2, int(duration / 0.07))
	for i in steps:
		tw.tween_property(l, "light_energy", energy * randf_range(0.65, 1.15) * (1.0 - float(i) / steps * 0.6), 0.07)
	tw.tween_property(l, "light_energy", 0.0, 0.2)
	tw.tween_callback(l.queue_free)
	return l


## Puffs of smoke that billow and thin out.
static func smoke_burst(parent: Node, pos: Vector3, size: float, tint := Color(0.36, 0.34, 0.36), amount := 7, lifetime := 1.6, rise := 0.6) -> void:
	var p := _emitter(parent, pos, _quad(size, smoke_material(tint, tint.lightened(0.55))), _n(amount), lifetime)
	p.explosiveness = 0.8
	p.spread = 70.0
	p.gravity = Vector3(0, rise, 0)
	p.initial_velocity_min = 0.3
	p.initial_velocity_max = 1.4
	p.scale_amount_min = 0.7
	p.scale_amount_max = 1.5
	p.scale_amount_curve = _grow_curve()
	p.damping_min = 0.8
	p.damping_max = 1.6


## Hot sparks that fly out and arc down, cooling from white to red.
static func sparks(parent: Node, pos: Vector3, direction: Vector3, count := 18, speed := 5.0, spread := 70.0) -> void:
	var m := Fx.soft_mat(Color(1.0, 0.72, 0.34))
	var p := _emitter(parent, pos, _quad(0.09, m), _n(count), 0.75)
	p.explosiveness = 0.95
	p.direction = direction
	p.spread = spread
	p.gravity = Vector3(0, -9.0, 0)
	p.initial_velocity_min = speed * 0.4
	p.initial_velocity_max = speed
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.4
	p.scale_amount_curve = _shrink_curve()
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1.0, 0.95, 0.7, 1))
	ramp.set_color(1, Color(0.9, 0.2, 0.05, 0))
	p.color_ramp = ramp


static var _fire_cache := {}


## Fire that burns in place for as long as the level lives (torches, braziers, forges, candles): two layers of
## turbulent flame (a body and a hotter core), a soft glow, drifting embers and optional smoke.
## `size` is the flame's base width in metres; the flame stands about 2.4 times that tall.
static func ambient_fire(parent: Node, pos: Vector3, size := 0.4, embers := true, smoke := false, color := Color(1.0, 0.5, 0.12)) -> Node3D:
	var root := Node3D.new()
	root.name = "Fire"
	root.position = pos
	parent.add_child(root)
	var key := color.to_html()
	if not _fire_cache.has(key):
		_fire_cache[key] = [flame_for(color, 2.0), flame_material(Color(1.0, 0.98, 0.85), Color(1.0, 0.8, 0.4), color, 2.4, 1.9)]
	var body := MeshInstance3D.new()
	var bq := QuadMesh.new()
	bq.size = Vector2(size * 1.3, size * 2.4)
	bq.material = _fire_cache[key][0]
	body.mesh = bq
	body.position = Vector3(0, size * 1.0, 0)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(body)
	var core := MeshInstance3D.new()
	var cq := QuadMesh.new()
	cq.size = Vector2(size * 0.75, size * 1.6)
	cq.material = _fire_cache[key][1]
	core.mesh = cq
	core.position = Vector3(size * 0.04, size * 0.7, size * 0.02)
	core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(core)
	var halo_mat := Fx.soft_mat(Color(color.r, color.g * 0.7, color.b * 0.4, 0.3))
	halo_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	var halo := MeshInstance3D.new()
	halo.mesh = _quad(size * 4.2, halo_mat)
	halo.position = Vector3(0, size * 0.9, 0)
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(halo)
	if embers and quality() > 0.5:
		var e := _emitter(root, pos, _quad(maxf(size * 0.14, 0.03), Fx.soft_mat(Color(1.0, 0.65, 0.28))), _n(5), 1.7, false)
		e.position = Vector3(0, size * 1.2, 0)
		e.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
		e.emission_sphere_radius = size * 0.35
		e.spread = 30.0
		e.gravity = Vector3(0, 1.0, 0)
		e.initial_velocity_min = 0.1
		e.initial_velocity_max = 0.5
		e.scale_amount_curve = _shrink_curve()
	if smoke and quality() > 0.5:
		var s := _emitter(root, pos, _quad(size * 2.0, smoke_material(Color(0.08, 0.07, 0.08), Color(0.28, 0.25, 0.25), 0.3)), _n(3), 2.6, false)
		s.position = Vector3(0, size * 2.2, 0)
		s.gravity = Vector3(0, 0.6, 0)
		s.spread = 25.0
		s.initial_velocity_min = 0.05
		s.initial_velocity_max = 0.25
		s.scale_amount_curve = _grow_curve()
	var phase := randf() * 0.1
	var start_sway := func():
		var sway := root.create_tween().set_loops()
		sway.tween_property(body, "scale", Vector3(1.04, 1.1, 1.0), 0.09 + phase)
		sway.tween_property(body, "scale", Vector3(0.96, 0.93, 1.0), 0.11 + phase)
	if root.is_inside_tree():
		start_sway.call()
	else:
		root.tree_entered.connect(start_sway, CONNECT_ONE_SHOT)  # tweens need the tree; the prop is still being built
	return root


## A fireball's body: a flickering flame core with flame, smoke and ember trails and a living light.
## Attach to a moving Node3D (the projectile); the trail emitters leave particles behind in world space.
static func fireball(owner: Node3D, color: Color, size := 0.95) -> void:
	var core := MeshInstance3D.new()
	core.mesh = _quad(1.0, flame_for(color, 2.1))
	core.scale = Vector3.ONE * size
	core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	owner.add_child(core)
	var halo := MeshInstance3D.new()
	var halo_mat := Fx.soft_mat(Color(color.r, color.g * 0.8, color.b * 0.6, 0.55))
	halo_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	halo.mesh = _quad(1.0, halo_mat)
	halo.scale = Vector3.ONE * size * 2.6
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	owner.add_child(halo)
	var flame := _emitter(owner, _at(owner), _quad(size * 0.9, flame_for(color, 1.5)), _n(26), 0.5, false)
	flame.spread = 25.0
	flame.direction = Vector3.UP
	flame.gravity = Vector3(0, 1.8, 0)
	flame.initial_velocity_min = 0.1
	flame.initial_velocity_max = 0.7
	flame.scale_amount_curve = _shrink_curve()
	flame.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	flame.emission_sphere_radius = size * 0.22
	var smoke := _emitter(owner, _at(owner), _quad(size * 1.1, smoke_material(Color(0.12, 0.1, 0.1), Color(0.35, 0.3, 0.3), 0.5)), _n(10), 1.1, false)
	smoke.spread = 40.0
	smoke.gravity = Vector3(0, 0.7, 0)
	smoke.initial_velocity_min = 0.1
	smoke.initial_velocity_max = 0.5
	smoke.scale_amount_curve = _grow_curve()
	var embers := _emitter(owner, _at(owner), _quad(0.07, Fx.soft_mat(Color(1.0, 0.7, 0.3))), _n(14), 0.8, false)
	embers.spread = 100.0
	embers.gravity = Vector3(0, -1.5, 0)
	embers.initial_velocity_min = 0.3
	embers.initial_velocity_max = 1.6
	embers.scale_amount_curve = _shrink_curve()
	var light := OmniLight3D.new()
	light.light_color = color.lerp(Color(1, 0.8, 0.5), 0.3)
	light.light_energy = 3.0
	light.omni_range = 6.5
	light.omni_attenuation = 1.3
	owner.add_child(light)
	var tw := light.create_tween().set_loops()
	tw.tween_property(light, "light_energy", 2.4, 0.06)
	tw.tween_property(light, "light_energy", 3.5, 0.05)
	tw.tween_property(light, "light_energy", 2.8, 0.07)
	var pulse := core.create_tween().set_loops()
	pulse.tween_property(core, "scale", Vector3.ONE * size * 1.12, 0.08)
	pulse.tween_property(core, "scale", Vector3.ONE * size * 0.92, 0.09)


## A thrown blade's glint: a short fading streak behind it.
static func blade_trail(owner: Node3D, color := Color(0.75, 0.82, 1.0)) -> void:
	var m := Fx.soft_mat(color)
	var p := _emitter(owner, _at(owner), _quad(0.14, m), _n(16), 0.28, false)
	p.spread = 4.0
	p.initial_velocity_min = 0.0
	p.initial_velocity_max = 0.2
	p.scale_amount_curve = _shrink_curve()


## A fiery explosion: white flash, billowing fireball, shock ring with refraction, sparks, smoke and light.
static func explosion(parent: Node, pos: Vector3, radius: float, color := Color(1.0, 0.46, 0.1), debris_amount := 0) -> void:
	var at := pos + Vector3(0, 0.15, 0)
	var puffs := clampi(int(radius * 2.2), 3, 10)
	for i in puffs:
		var a := randf() * TAU
		var r := randf() * radius * 0.45
		flame_puff(parent, at + Vector3(cos(a) * r, randf() * radius * 0.2, sin(a) * r), radius * randf_range(0.9, 1.5), color, randf_range(0.45, 0.8))
	flame_puff(parent, at, radius * 1.9, color.lerp(Color.WHITE, 0.5), 0.35)
	fire_light(parent, at + Vector3(0, 1.0, 0), color, 7.0, radius * 3.2, 0.7)
	shockwave(parent, pos, radius * 1.1)
	sparks(parent, at, Vector3.UP, int(10 + radius * 5.0), 3.0 + radius * 1.2, 80.0)
	smoke_burst(parent, at, radius * 1.1, Color(0.16, 0.14, 0.14), int(4 + radius), 2.0, 1.0)
	if debris_amount > 0:
		debris(parent, pos, radius, debris_amount)


## A refracting ring of displaced air that races outward over the ground.
static func shockwave(parent: Node, pos: Vector3, radius: float) -> void:
	if _shock_shader == null:
		_shock_shader = load("res://shaders/shock_distort.gdshader")
	var m := ShaderMaterial.new()
	m.shader = _shock_shader
	var plane := PlaneMesh.new()
	plane.size = Vector2(radius * 2.4, radius * 2.4)
	var mi := MeshInstance3D.new()
	mi.mesh = plane
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = pos + Vector3(0, 0.6, 0)
	var tw := mi.create_tween()
	tw.tween_method(func(v: float): m.set_shader_parameter("progress", v), 0.0, 1.0, 0.55)
	tw.tween_callback(mi.queue_free)


## A pool of fire on the ground: rising flames across a disc, drifting smoke, a flickering light and embers.
## Returns a node to free early (it also frees itself after `duration`).
static func burning_ground(parent: Node, pos: Vector3, radius: float, duration: float, color := Color(1.0, 0.42, 0.08)) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.global_position = pos
	var area := radius * radius
	var flames := _emitter(root, pos, _quad(1.5, flame_for(color, 1.6)), _n(int(clampf(area * 4.5, 30, 140))), 0.9, false)
	flames.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	flames.emission_sphere_radius = radius * 0.85
	flames.spread = 12.0
	flames.gravity = Vector3(0, 1.6, 0)
	flames.initial_velocity_min = 0.2
	flames.initial_velocity_max = 0.9
	flames.scale_amount_min = 0.6
	flames.scale_amount_max = 1.5
	flames.scale_amount_curve = _shrink_curve()
	var smoke := _emitter(root, pos + Vector3(0, 0.6, 0), _quad(1.6, smoke_material(Color(0.1, 0.09, 0.09), Color(0.3, 0.26, 0.26), 0.45)), _n(int(clampf(area, 8, 30))), 2.2, false)
	smoke.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	smoke.emission_sphere_radius = radius * 0.7
	smoke.gravity = Vector3(0, 0.9, 0)
	smoke.scale_amount_curve = _grow_curve()
	var embers := _emitter(root, pos, _quad(0.08, Fx.soft_mat(Color(1.0, 0.65, 0.25))), _n(int(clampf(area * 1.5, 10, 50))), 1.4, false)
	embers.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	embers.emission_sphere_radius = radius * 0.85
	embers.gravity = Vector3(0, 1.2, 0)
	embers.initial_velocity_min = 0.2
	embers.initial_velocity_max = 1.0
	embers.scale_amount_curve = _shrink_curve()
	var glow := MeshInstance3D.new()
	glow.mesh = _quad(radius * 2.4, Fx.soft_mat(Color(color.r, color.g * 0.6, color.b * 0.3, 0.5)))
	glow.rotation.x = -PI * 0.5
	glow.position = Vector3(0, 0.07, 0)
	var glow_mat := Fx.soft_mat(Color(color.r, color.g * 0.6, color.b * 0.3, 0.5))
	glow_mat.billboard_mode = BaseMaterial3D.BILLBOARD_DISABLED
	glow.mesh = _quad(radius * 2.4, glow_mat)
	glow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(glow)
	fire_light(root, pos + Vector3(0, 0.9, 0), color, 2.4, radius * 2.8, duration)
	var tw := root.create_tween()
	tw.tween_interval(duration)
	tw.tween_callback(func():
		for e in [flames, smoke, embers]:
			e.emitting = false)
	tw.tween_interval(2.2)
	tw.tween_callback(root.queue_free)
	return root


## Earth bursting: a dust cloud ring rolling outward.
static func dust_burst(parent: Node, pos: Vector3, radius: float, tint := Color(0.34, 0.3, 0.26)) -> void:
	var p := _emitter(parent, pos + Vector3(0, 0.15, 0), _quad(1.0, smoke_material(tint, tint.lightened(0.6), 0.85)), _n(int(12 + radius * 4.0)), 1.4)
	p.explosiveness = 1.0
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_RING
	p.emission_ring_axis = Vector3.UP
	p.emission_ring_radius = radius * 0.5
	p.emission_ring_inner_radius = radius * 0.3
	p.emission_ring_height = 0.1
	p.direction = Vector3.UP
	p.spread = 35.0
	p.gravity = Vector3(0, 0.25, 0)
	p.initial_velocity_min = radius * 0.5
	p.initial_velocity_max = radius * 1.1
	p.scale_amount_min = 1.0
	p.scale_amount_max = 2.0
	p.scale_amount_curve = _grow_curve()
	p.damping_min = 1.2
	p.damping_max = 2.2


## Rubble thrown up by a blow: chunks that tumble through a real arc, bounce once and settle.
static func debris(parent: Node, pos: Vector3, radius: float, count := 10) -> void:
	var rock := B.pbr("stone_wall", Color(0.5, 0.48, 0.5), 1.0, 1.0, 0.0, 1.2)
	for i in _n(count):
		var chunk := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(randf_range(0.1, 0.28), randf_range(0.08, 0.2), randf_range(0.1, 0.26))
		chunk.mesh = box
		chunk.material_override = rock
		parent.add_child(chunk)
		var a := randf() * TAU
		var start := pos + Vector3(cos(a), 0.2, sin(a)) * randf_range(0.2, radius * 0.4)
		chunk.global_position = start
		var land := pos + Vector3(cos(a), 0.0, sin(a)) * randf_range(radius * 0.5, radius * 1.15)
		land.y = 0.1
		var peak := randf_range(1.2, 2.6)
		var spin := Vector3(randf_range(-9, 9), randf_range(-9, 9), randf_range(-9, 9))
		var t_air := randf_range(0.55, 0.85)
		var tw := chunk.create_tween()
		tw.tween_method(func(u: float):
			var flat := start.lerp(land, u)
			chunk.global_position = Vector3(flat.x, lerpf(start.y, land.y, u) + sin(u * PI) * peak, flat.z)
			chunk.rotation += spin * 0.016, 0.0, 1.0, t_air)
		tw.tween_interval(randf_range(0.8, 1.6))
		tw.tween_property(chunk, "scale", Vector3.ONE * 0.01, 0.5)
		tw.tween_callback(chunk.queue_free)


## Cracks splitting the ground outward from the caster, glowing and cooling.
static func ground_cracks(parent: Node, pos: Vector3, radius: float, color := Color(1.0, 0.5, 0.2)) -> void:
	var root := Node3D.new()
	parent.add_child(root)
	root.global_position = pos + Vector3(0, 0.06, 0)
	var glow := Fx.glow_mat(color, 0.9)
	var scorch := Fx.glow_mat(Color(0.02, 0.015, 0.015), 0.85, false)
	var arms := 9
	for i in arms:
		var a := TAU * i / arms + randf_range(-0.2, 0.2)
		var length := radius * randf_range(0.8, 1.15)
		var seg_count := 5
		var at := Vector3.ZERO
		var heading := a
		for s in seg_count:
			var seg_len := length / seg_count
			heading += randf_range(-0.35, 0.35)
			var d := Vector3(cos(heading), 0, sin(heading))
			var seg := MeshInstance3D.new()
			var box := BoxMesh.new()
			var w := lerpf(0.22, 0.05, float(s) / seg_count)
			box.size = Vector3(w, 0.02, seg_len * 1.05)
			seg.mesh = box
			seg.material_override = scorch
			root.add_child(seg)
			seg.position = at + d * seg_len * 0.5
			seg.rotation.y = atan2(d.x, d.z)
			var core := MeshInstance3D.new()
			var cbox := BoxMesh.new()
			cbox.size = Vector3(w * 0.4, 0.025, seg_len * 1.05)
			core.mesh = cbox
			core.material_override = glow
			seg.add_child(core)
			core.position.y = 0.012
			at += d * seg_len
	var tw := root.create_tween()
	tw.tween_property(glow, "albedo_color:a", 0.0, 1.4).set_delay(0.2)
	tw.tween_property(scorch, "albedo_color:a", 0.0, 1.8).set_delay(0.6)
	tw.tween_callback(root.queue_free)


## A lingering cloud (shadow, poison, rot): many slow, large smoke sprites over a disc.
static func smoke_cloud(parent: Node, pos: Vector3, radius: float, duration: float, tint: Color) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.global_position = pos
	var p := _emitter(root, pos + Vector3(0, 0.4, 0), _quad(radius * 0.9, smoke_material(tint.darkened(0.4), tint.lightened(0.25), 0.5)), _n(int(clampf(radius * radius * 1.2, 10, 40))), 2.8, false)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = radius * 0.75
	p.gravity = Vector3(0, 0.25, 0)
	p.initial_velocity_min = 0.1
	p.initial_velocity_max = 0.45
	p.scale_amount_curve = _grow_curve()
	var tw := root.create_tween()
	tw.tween_interval(duration)
	tw.tween_callback(func(): p.emitting = false)
	tw.tween_interval(2.8)
	tw.tween_callback(root.queue_free)
	return root


## A meteor: a streaking fireball dropping from the sky onto `target`, exploding on arrival.
static func meteor(parent: Node, target: Vector3, color: Color, impact_radius: float, fall_time := 0.35) -> void:
	var m := Node3D.new()
	parent.add_child(m)
	var start := target + Vector3(randf_range(-2.5, 2.5), 11.0, randf_range(-2.5, 2.5))
	m.global_position = start
	fireball(m, color, 0.8)
	var tw := m.create_tween()
	tw.tween_property(m, "global_position", target + Vector3(0, 0.3, 0), fall_time).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_callback(func():
		explosion(parent, target, impact_radius, color)
		m.queue_free())


## Embers or wisps circling a character while a buff or ward lasts.
static func aura(owner: Node3D, color: Color, duration: float, radius := 0.7) -> void:
	var p := _emitter(owner, _at(owner) + Vector3(0, 0.1, 0), _quad(0.1, Fx.soft_mat(color)), _n(30), 1.3, false)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_RING
	p.emission_ring_axis = Vector3.UP
	p.emission_ring_radius = radius
	p.emission_ring_inner_radius = radius * 0.8
	p.emission_ring_height = 0.4
	p.gravity = Vector3(0, 1.6, 0)
	p.initial_velocity_min = 0.1
	p.initial_velocity_max = 0.5
	p.scale_amount_curve = _shrink_curve()
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = 1.4
	light.omni_range = 4.0
	owner.add_child(light)
	light.position = Vector3(0, 1.0, 0)
	var tw := owner.create_tween()
	tw.tween_interval(duration)
	tw.tween_callback(func():
		if is_instance_valid(p):
			p.emitting = false
			p.get_tree().create_timer(1.5).timeout.connect(p.queue_free)
		if is_instance_valid(light):
			light.queue_free())


## Dust kicked up by a footstep.
static func footstep(parent: Node, pos: Vector3) -> void:
	smoke_burst(parent, pos + Vector3(0, 0.05, 0), 0.35, Color(0.3, 0.27, 0.24), 2, 0.7, 0.2)


## The hero's own ambience: embers on a pyromancer, shadow wisps on a rogue, forge sparks off a warrior's steel.
static func class_ambient(hero: Node3D, hero_class: String) -> void:
	match hero_class:
		"pyromancer":
			var p := _emitter(hero, _at(hero) + Vector3(0, 1.0, 0), _quad(0.08, Fx.soft_mat(Color(1.0, 0.55, 0.2))), _n(10), 1.6, false)
			p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
			p.emission_sphere_radius = 0.45
			p.gravity = Vector3(0, 0.7, 0)
			p.initial_velocity_min = 0.05
			p.initial_velocity_max = 0.3
			p.scale_amount_curve = _shrink_curve()
			p.position = Vector3(0, 1.0, 0)
		"rogue":
			var p := _emitter(hero, _at(hero) + Vector3(0, 0.9, 0), _quad(0.7, smoke_material(Color(0.04, 0.04, 0.06), Color(0.16, 0.16, 0.22), 0.3)), _n(6), 2.0, false)
			p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
			p.emission_sphere_radius = 0.4
			p.gravity = Vector3(0, 0.2, 0)
			p.initial_velocity_min = 0.05
			p.initial_velocity_max = 0.2
			p.scale_amount_curve = _grow_curve()
			p.position = Vector3(0, 0.9, 0)
		_:
			var p := _emitter(hero, _at(hero) + Vector3(0, 1.1, 0), _quad(0.05, Fx.soft_mat(Color(1.0, 0.8, 0.5))), _n(3), 2.4, false)
			p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
			p.emission_sphere_radius = 0.5
			p.gravity = Vector3(0, 0.3, 0)
			p.initial_velocity_min = 0.05
			p.initial_velocity_max = 0.2
			p.position = Vector3(0, 1.1, 0)


## A monster's ambience: cold breath from the hollow, ghost-light from the archer, drips from the crawler,
## and a corona of embers and heat around the Bell-Warden.
static func enemy_ambient(foe: Node3D, kind: String, height := 1.2) -> void:
	var p: CPUParticles3D = null
	match kind:
		"hollow":
			p = _emitter(foe, _at(foe), _quad(0.6, smoke_material(Color(0.1, 0.16, 0.2), Color(0.35, 0.5, 0.58), 0.28)), _n(5), 1.8, false)
			p.gravity = Vector3(0, 0.3, 0)
		"archer":
			p = _emitter(foe, _at(foe), _quad(0.14, Fx.soft_mat(Color(0.5, 0.85, 1.0))), _n(5), 1.6, false)
			p.gravity = Vector3(0, 0.5, 0)
			p.scale_amount_curve = _shrink_curve()
		"crawler":
			p = _emitter(foe, _at(foe), _quad(0.1, Fx.soft_mat(Color(0.5, 1.0, 0.3))), _n(5), 1.0, false)
			p.gravity = Vector3(0, -2.5, 0)
			p.scale_amount_curve = _shrink_curve()
		"boss":
			p = _emitter(foe, _at(foe), _quad(0.12, Fx.soft_mat(Color(1.0, 0.5, 0.18))), _n(26), 2.0, false)
			p.gravity = Vector3(0, 1.4, 0)
			p.scale_amount_curve = _shrink_curve()
			p.emission_sphere_radius = 1.2
			var heat := _emitter(foe, _at(foe), _quad(1.6, flame_for(Color(1.0, 0.3, 0.08), 0.9)), _n(8), 1.2, false)
			heat.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
			heat.emission_sphere_radius = 1.0
			heat.gravity = Vector3(0, 1.0, 0)
			heat.position = Vector3(0, height * 0.5, 0)
	if p == null:
		return
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	if kind != "boss":
		p.emission_sphere_radius = 0.4
	p.initial_velocity_min = 0.05
	p.initial_velocity_max = 0.3
	p.position = Vector3(0, height, 0)


## A monster's death: a kind-specific burst (ash, ectoplasm, acid, or a firestorm for the boss).
static func death_burst(parent: Node, pos: Vector3, kind: String, boss := false) -> void:
	if boss:
		explosion(parent, pos, 5.5, Color(1.0, 0.4, 0.1), 14)
		dust_burst(parent, pos, 5.0, Color(0.3, 0.26, 0.24))
		return
	match kind:
		"hollow":
			smoke_burst(parent, pos + Vector3(0, 0.8, 0), 1.0, Color(0.1, 0.15, 0.2), 6, 1.6, 0.5)
			sparks(parent, pos + Vector3(0, 1.0, 0), Vector3.UP, 8, 2.5, 90.0)
		"archer":
			smoke_burst(parent, pos + Vector3(0, 0.8, 0), 0.9, Color(0.18, 0.25, 0.3), 5, 1.4, 0.8)
			var m := Fx.soft_mat(Color(0.5, 0.85, 1.0))
			var p := _emitter(parent, pos + Vector3(0, 1.0, 0), _quad(0.16, m), _n(16), 1.2)
			p.explosiveness = 1.0
			p.spread = 180.0
			p.gravity = Vector3(0, 1.0, 0)
			p.initial_velocity_min = 0.5
			p.initial_velocity_max = 2.0
			p.scale_amount_curve = _shrink_curve()
		_:
			smoke_burst(parent, pos + Vector3(0, 0.4, 0), 0.9, Color(0.14, 0.2, 0.08), 5, 1.4, 0.4)
			var m := Fx.soft_mat(Color(0.55, 1.0, 0.3))
			var p := _emitter(parent, pos + Vector3(0, 0.4, 0), _quad(0.14, m), _n(14), 0.9)
			p.explosiveness = 1.0
			p.spread = 90.0
			p.gravity = Vector3(0, -6.0, 0)
			p.initial_velocity_min = 1.0
			p.initial_velocity_max = 3.0
			p.scale_amount_curve = _shrink_curve()
