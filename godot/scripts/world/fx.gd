extends RefCounted
## Short-lived visual effects built from primitives: rings, slashes, pillars, telegraphs, numbers.

static func glow_mat(color: Color, alpha := 0.8, additive := true) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if additive:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.albedo_color = Color(color.r, color.g, color.b, alpha)
	m.no_depth_test = false
	return m


static func _fade_free(node: Node3D, mat: StandardMaterial3D, duration: float) -> void:
	var tw := node.create_tween()
	tw.tween_property(mat, "albedo_color:a", 0.0, duration)
	tw.tween_callback(node.queue_free)


## An expanding ring on the ground (novas, impacts).
static func ring(parent: Node, pos: Vector3, radius: float, color: Color, duration := 0.35) -> void:
	var mi := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.82
	torus.outer_radius = 1.0
	torus.rings = 32
	torus.ring_segments = 4
	mi.mesh = torus
	var m := glow_mat(color, 0.9)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = pos + Vector3(0, 0.15, 0)
	mi.scale = Vector3(radius * 0.2, 0.15, radius * 0.2)
	var tw := mi.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mi, "scale", Vector3(radius, 0.15, radius), duration).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(m, "albedo_color:a", 0.0, duration)
	tw.chain().tween_callback(mi.queue_free)


## A flat disc warning of an attack that lands after `duration` seconds. Freed automatically.
static func telegraph(parent: Node, pos: Vector3, radius: float, color: Color, duration: float) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 1.0
	cyl.bottom_radius = 1.0
	cyl.height = 0.02
	cyl.radial_segments = 32
	mi.mesh = cyl
	var m := glow_mat(color, 0.18)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = pos + Vector3(0, 0.06, 0)
	mi.scale = Vector3(radius, 1, radius)
	# inner disc grows to the edge: when it fills, the blow lands
	var inner := MeshInstance3D.new()
	inner.mesh = cyl
	var mi_mat := glow_mat(color, 0.35)
	inner.material_override = mi_mat
	mi.add_child(inner)
	inner.scale = Vector3(0.05, 1.5, 0.05)
	var tw := mi.create_tween()
	tw.tween_property(inner, "scale", Vector3(1, 1.5, 1), duration)
	tw.tween_callback(mi.queue_free)
	return mi


## A fading fan in front of the hero for melee sweeps.
static func slash(parent: Node, origin: Vector3, dir: Vector3, reach: float, arc_deg: float, color: Color) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var base_angle := atan2(dir.x, dir.z)
	var half := deg_to_rad(arc_deg) * 0.5
	var steps := 14
	for i in steps:
		var a0 := base_angle - half + (2.0 * half) * i / steps
		var a1 := base_angle - half + (2.0 * half) * (i + 1) / steps
		var inner := reach * 0.35
		var p0 := Vector3(sin(a0), 0, cos(a0))
		var p1 := Vector3(sin(a1), 0, cos(a1))
		st.add_vertex(p0 * inner)
		st.add_vertex(p0 * reach)
		st.add_vertex(p1 * reach)
		st.add_vertex(p0 * inner)
		st.add_vertex(p1 * reach)
		st.add_vertex(p1 * inner)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := glow_mat(color, 0.55)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	mi.global_position = origin + Vector3(0, 0.9, 0)
	_fade_free(mi, m, 0.18)


## A column of fire or light.
static func pillar(parent: Node, pos: Vector3, radius: float, color: Color, duration := 0.6) -> void:
	var node := Node3D.new()
	parent.add_child(node)
	node.global_position = pos
	var mi := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = radius * 0.6
	cyl.bottom_radius = radius
	cyl.height = 7.0
	cyl.radial_segments = 16
	mi.mesh = cyl
	var m := glow_mat(color, 0.75)
	mi.material_override = m
	mi.position = Vector3(0, 3.5, 0)
	node.add_child(mi)
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = 6.0
	light.omni_range = radius * 4.0
	light.position = Vector3(0, 1.5, 0)
	node.add_child(light)
	var tw := node.create_tween()
	tw.set_parallel(true)
	tw.tween_property(m, "albedo_color:a", 0.0, duration)
	tw.tween_property(light, "light_energy", 0.0, duration)
	tw.tween_property(mi, "scale", Vector3(0.4, 1.2, 0.4), duration)
	tw.chain().tween_callback(node.queue_free)


## A brief flash of light (casts, hits, level ups).
static func flash(parent: Node, pos: Vector3, color: Color, energy := 4.0, light_range := 6.0, duration := 0.3) -> void:
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = energy
	light.omni_range = light_range
	parent.add_child(light)
	light.global_position = pos + Vector3(0, 1.2, 0)
	var tw := light.create_tween()
	tw.tween_property(light, "light_energy", 0.0, duration)
	tw.tween_callback(light.queue_free)


## Floating combat text.
static func number(parent: Node, pos: Vector3, text: String, color: Color, big := false) -> void:
	var l := Label3D.new()
	l.text = text
	l.modulate = color
	l.outline_modulate = Color(0, 0, 0, 1)
	l.outline_size = 12
	l.font_size = 72 if big else 52
	l.pixel_size = 0.01
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	parent.add_child(l)
	l.global_position = pos + Vector3(randf_range(-0.3, 0.3), 2.2, randf_range(-0.2, 0.2))
	var tw := l.create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "position:y", l.position.y + 1.4, 0.8).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(l, "modulate:a", 0.0, 0.8).set_delay(0.3)
	tw.chain().tween_callback(l.queue_free)
