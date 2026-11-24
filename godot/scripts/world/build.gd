extends RefCounted
## Helpers that make the placeholder low-poly meshes, materials and lights used everywhere.

const GOLD := Color(0.89, 0.71, 0.49)
const EMBER := Color(1.0, 0.45, 0.16)
const STONE := Color(0.20, 0.18, 0.22)

static var _mat_cache := {}


static func mat(color: Color, roughness := 0.9, emission := Color.BLACK, energy := 1.0, metallic := 0.0) -> StandardMaterial3D:
	var key := "%s|%.2f|%s|%.2f|%.2f" % [color.to_html(), roughness, emission.to_html(), energy, metallic]
	if _mat_cache.has(key):
		return _mat_cache[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	m.metallic = metallic
	if emission != Color.BLACK:
		m.emission_enabled = true
		m.emission = emission
		m.emission_energy_multiplier = energy
	_mat_cache[key] = m
	return m


static func unique_mat(color: Color, roughness := 0.8) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	m.emission_enabled = true
	m.emission = Color.BLACK
	return m


static func mesh_node(mesh: Mesh, material: Material, pos := Vector3.ZERO, parent: Node = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	if parent:
		parent.add_child(mi)
	return mi


static func box(size: Vector3, material: Material, pos := Vector3.ZERO, parent: Node = null) -> MeshInstance3D:
	var m := BoxMesh.new()
	m.size = size
	return mesh_node(m, material, pos, parent)


static func cylinder(radius_top: float, radius_bottom: float, height: float, material: Material, pos := Vector3.ZERO, parent: Node = null, segments := 10) -> MeshInstance3D:
	var m := CylinderMesh.new()
	m.top_radius = radius_top
	m.bottom_radius = radius_bottom
	m.height = height
	m.radial_segments = segments
	m.rings = 1
	return mesh_node(m, material, pos, parent)


static func sphere(radius: float, material: Material, pos := Vector3.ZERO, parent: Node = null, segments := 10) -> MeshInstance3D:
	var m := SphereMesh.new()
	m.radius = radius
	m.height = radius * 2.0
	m.radial_segments = segments
	m.rings = maxi(4, segments / 2)
	return mesh_node(m, material, pos, parent)


static func capsule(radius: float, height: float, material: Material, pos := Vector3.ZERO, parent: Node = null) -> MeshInstance3D:
	var m := CapsuleMesh.new()
	m.radius = radius
	m.height = height
	m.radial_segments = 10
	m.rings = 3
	return mesh_node(m, material, pos, parent)


static func prism(size: Vector3, material: Material, pos := Vector3.ZERO, parent: Node = null) -> MeshInstance3D:
	var m := PrismMesh.new()
	m.size = size
	return mesh_node(m, material, pos, parent)


static func omni(color: Color, energy: float, light_range: float, pos := Vector3.ZERO, parent: Node = null, shadows := false) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = color
	l.light_energy = energy
	l.omni_range = light_range
	l.omni_attenuation = 1.4
	l.shadow_enabled = shadows
	l.position = pos
	if parent:
		parent.add_child(l)
	return l


static func label(text: String, color: Color, pos: Vector3, parent: Node, font_size := 48, pixel := 0.01) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.modulate = color
	l.outline_modulate = Color(0, 0, 0, 0.9)
	l.outline_size = 10
	l.font_size = font_size
	l.pixel_size = pixel
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.fixed_size = false
	l.position = pos
	parent.add_child(l)
	return l


## A flickering wall or post torch: bracket, flame and a warm light.
static func torch(parent: Node, pos: Vector3, facing := Vector3.ZERO, light_range := 8.0, energy := 1.6) -> Node3D:
	var t := Node3D.new()
	t.position = pos
	cylinder(0.05, 0.08, 0.5, mat(Color(0.15, 0.1, 0.08)), Vector3(0, -0.2, 0), t, 6)
	sphere(0.14, mat(EMBER, 1.0, EMBER, 4.0), Vector3(0, 0.12, 0), t, 6)
	sphere(0.08, mat(Color(1, 0.85, 0.5), 1.0, Color(1, 0.8, 0.4), 6.0), Vector3(0, 0.2, 0), t, 6)
	var l := omni(Color(1.0, 0.58, 0.28), energy, light_range, Vector3(0, 0.3, 0) + facing * 0.4, t)
	t.set_meta("light", l)
	t.set_script(preload("res://scripts/world/flicker.gd"))
	parent.add_child(t)
	return t
