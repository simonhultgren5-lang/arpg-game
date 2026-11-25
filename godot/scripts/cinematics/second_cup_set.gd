extends Node3D
## The smith's room, built in metres. The opening in the north wall is the principal light source.
const B = preload("res://scripts/world/build.gd")
const K = preload("res://scripts/models/mesh_kit.gd")
const Folk = preload("res://scripts/models/townsfolk_model.gd")

var edda := Node3D.new()
var brother := Node3D.new()
var latch := Node3D.new()
var casement := Node3D.new()
var head: Node3D
var hand: Node3D
var candle: OmniLight3D
var dawn: OmniLight3D
var flame: MeshInstance3D
var eyes: Array[Node3D] = []
var environment := Environment.new()


func surface(id: String, tiling: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	var base := "res://assets/textures/materials/%s_" % id
	m.albedo_texture = load(base + "albedo.png")
	m.normal_enabled = true
	m.normal_texture = load(base + "normal.png")
	m.roughness_texture = load(base + "roughness.png")
	m.uv1_triplanar = true
	m.uv1_scale = Vector3.ONE * tiling
	return m


func _ready() -> void:
	var wood := surface("timber", 2.0)
	wood.albedo_color = Color("#77655a")
	wood.normal_scale = .36
	var plaster := surface("plaster", 0.8)
	var stone := surface("flagstone", 0.6)
	var iron := B.mat(Color("#343038"), 0.45, Color.BLACK, 0.0, 0.72)
	B.box(Vector3(13, 0.16, 18), stone, Vector3(0,-0.08,-2), self)
	# Three walls frame the window; the south wall is wild for camera access.
	for x in [-2.65, 2.65]:
		B.box(Vector3(3.2,3.1,0.25), plaster, Vector3(x,1.55,-1.65), self)
		B.box(Vector3(0.18,3.1,7), plaster, Vector3(signf(x)*4.2,1.55,1.75), self)
	B.box(Vector3(2.15,0.88,0.25), plaster, Vector3(0,.44,-1.65), self)
	B.box(Vector3(2.15,.74,.25), plaster, Vector3(0,2.74,-1.65), self)
	for x in [-1.05,-.26,1.05]:
		B.box(Vector3(.085,1.56,.13), wood, Vector3(x,1.62,-1.5), self)
	for y in [.91,2.35]:
		B.box(Vector3(2.3,.11,.38), wood, Vector3(0,y,-1.47), self)
	casement.position = Vector3(1.0,1.62,-1.52)
	add_child(casement)
	for x in [-1.20,0.0]:
		B.box(Vector3(.038,1.34,.035),wood,Vector3(x,0,0),casement)
	for y in [-.66,.66]:
		B.box(Vector3(1.22,.035,.04),wood,Vector3(-.60,y,0),casement)
	var glass := StandardMaterial3D.new()
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass.albedo_color = Color(.45,.55,.60,.07)
	glass.roughness = .19
	B.box(Vector3(1.16,1.28,.008),glass,Vector3(-.60,0,0),casement)
	# Narrow iron swivel, mounted to the mullion. The far end is the hand target.
	latch.position = Vector3(-.26,1.22,-1.39)
	add_child(latch)
	B.box(Vector3(.22,.042,.037), iron, Vector3(.10,0,.015), latch)
	B.sphere(.03, iron, Vector3.ZERO, latch)
	B.box(Vector3(2.25,.10,.7), wood, Vector3(-.22,.85,-1.23), self)
	for x in [-1.19,.72]:
		B.box(Vector3(.11,.84,.56), wood, Vector3(x,.42,-1.23), self)
	_cup(Vector3(.27,.902,-1.15), Color("#a47856"))
	_cup(Vector3(.64,.902,-1.29), Color("#597077"))
	B.cylinder(.042,.05,.21,B.mat(Color("#b28c65")),Vector3(-.93,1.01,-1.19),self,16)
	flame = MeshInstance3D.new()  # the candle flame: a real flame sprite, animated by the cinematic through scale.y
	var flame_quad := QuadMesh.new()
	flame_quad.size = Vector2(.05, .04)
	flame_quad.material = preload("res://scripts/world/spell_fx.gd").flame_material(Color(1.0, 0.97, 0.8), Color(1.0, 0.72, 0.32), Color(0.5, 0.15, 0.04), 2.2, 2.2)
	flame.mesh = flame_quad
	flame.position = Vector3(-.93,1.16,-1.19)
	flame.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(flame)
	flame.scale.y = 1.75
	# A second plane of architecture breaks up the mist behind the visitor.
	for i in 6:
		var x := -7.0 + i*2.8
		B.box(Vector3(2.55,2.55,.35),plaster,Vector3(x,1.27,-7.5),self)
		B.box(Vector3(.14,2.7,.4),wood,Vector3(x-.9,1.35,-7.3),self)
		B.box(Vector3(2.9,.18,.6),wood,Vector3(x,2.65,-7.4),self)
		var brace := B.box(Vector3(.12,2.45,.18),wood,Vector3(x,.99,-7.19),self)
		brace.rotation.z = -.49
		B.box(Vector3(.76,1.15,.20),wood,Vector3(x+.38,1.54,-7.16),self)
		var recess := B.mat(Color("#161b22"))
		B.box(Vector3(.62,.98,.05),recess,Vector3(x+.38,1.55,-7.02),self)
		for j in 3:
			B.box(Vector3(.022,.96,.06),iron,Vector3(x+.18+.20*j,1.55,-6.98),self)
	edda.position = Vector3(-.54,0,-.82)
	edda.rotation.y = 2.95
	add_child(edda)
	Folk.build(edda,"edda")
	head = edda.find_child("EddaHead",true,false)
	hand = edda.find_child("EddaLeftHand",true,false)
	# The town's rim shader is designed for the high gameplay camera. Use matte
	# materials on this close-up double so the window and candle can model her face.
	var physical := {}
	for part in edda.find_children("*","MeshInstance3D",true,false):
		var old = part.material_override
		if old is ShaderMaterial:
			if not physical.has(old):
				physical[old] = B.mat(old.get_shader_parameter("albedo"),.74)
			part.material_override = physical[old]
	var umber := B.mat(Color("#382822"))
	for side in [-1.0,1.0]:
		var eye := B.sphere(.018,umber,Vector3(side*.051,.15,.108),head,16)
		eye.scale = Vector3(1.1,.48,.45)
		eyes.append(eye)
		var brow := B.box(Vector3(.049,.008,.013),umber,Vector3(side*.050,.17,.108),head)
		brow.rotation.z = side*.09
	var lip := B.sphere(.029,B.mat(Color("#896557")),Vector3(0,.078,.118),head,16)
	lip.scale = Vector3(1.0,.16,.22)
	brother.position = Vector3(.42,0,-2.85)
	add_child(brother)
	# A clothed human silhouette gives Edda something she can recognize.
	var coat := surface("cloth",3.0)
	coat.albedo_color = Color("#393b42")
	K.add(brother,K.lathe(PackedVector2Array([Vector2(.27,.35),Vector2(.25,.94),
		Vector2(.32,1.36),Vector2(.22,1.48),Vector2(.09,1.5)]),24),coat)
	for side in [-1.0,1.0]:
		K.link(brother,Vector3(.24*side,1.39,0),Vector3(.32*side,.83,.035),.105,.062,coat)
	var face := B.sphere(.155,B.mat(Color("#544c48")),Vector3(0,1.61,.02),brother,24)
	face.scale = Vector3(.83,1.25,.86)
	var cap := B.sphere(.156,coat,Vector3(0,1.71,-.015),brother,24)
	cap.scale = Vector3(.92,.64,1.0)
	K.add(brother,K.lathe(PackedVector2Array([Vector2(.20,1.36),Vector2(.19,1.49),
		Vector2(.123,1.54),Vector2(.11,1.48)]),20),coat)
	var brim := B.sphere(.17,coat,Vector3(.005,1.68,.06),brother,24)
	brim.scale = Vector3(.94,.15,1.0)
	var nose := B.sphere(.034,B.mat(Color("#544c48")),Vector3(.006,1.615,.145),brother,16)
	nose.scale = Vector3(.73,1.20,.8)
	# Backlight keeps his face unresolved, even as the room warms.
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("#253142")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("#b4bdc9")
	environment.ambient_light_energy = .28
	environment.tonemap_mode = Environment.TONE_MAPPER_ACES
	environment.fog_enabled = true
	environment.fog_light_color = Color("#768698")
	environment.fog_density = .032
	environment.volumetric_fog_enabled = RenderingServer.get_current_rendering_method() == "forward_plus"
	environment.volumetric_fog_density = .035
	environment.volumetric_fog_albedo = Color("#a1adbd")
	var sky := WorldEnvironment.new()
	sky.environment = environment
	add_child(sky)
	candle = B.omni(Color("#ffaf74"),1.5,3.4,Vector3(-.86,1.25,-1.11),self,true)
	dawn = B.omni(Color("#96b7e0"),3.1,8,Vector3(.1,2.9,-4.6),self,true)
	B.omni(Color("#dbbb9a"),.62,4,Vector3(1.5,2.1,1.0),self)
	B.omni(Color("#efd4ac"),.68,2.2,Vector3(-.94,1.75,-1.34),self)
	Settings.apply_world(environment,find_children("*","Light3D",true,false))


func _cup(pos: Vector3, tint: Color) -> void:
	var profile := PackedVector2Array([Vector2(0,0),Vector2(.055,0),Vector2(.082,.12),
		Vector2(.081,.14),Vector2(.069,.14),Vector2(.052,.025),Vector2(0,.025)])
	var glaze := B.mat(tint,.29)
	K.add(self,K.lathe(profile,48),glaze,pos)
	B.cylinder(.069,.067,.004,B.mat(Color("#241e19"),.16),pos+Vector3.UP*.108,self,32)
	var ring := TorusMesh.new()
	ring.inner_radius = .027
	ring.outer_radius = .040
	var handle := B.mesh_node(ring,glaze,pos+Vector3(.091,.085,0),self)
	handle.rotation.x = PI/2
	for y in [.113,.124]:
		var band := TorusMesh.new()
		band.inner_radius = .078
		band.outer_radius = .082
		B.mesh_node(band,B.mat(tint.lightened(.17),.36),pos+Vector3.UP*y,self)


## Aim a two-link arm at the swivel. Bend toward the outside of the elbow.
func reach(t: float) -> void:
	var elbow := hand.get_parent() as Node3D
	var shoulder := elbow.get_parent() as Node3D
	var start := shoulder.global_position
	var rest := edda.to_global(Vector3(-.34,.98,.30))
	var grip := latch.to_global(Vector3(.16,0,.02))
	var goal := rest.lerp(grip, t)
	var line := start.direction_to(goal)
	var distance := clampf(start.distance_to(goal), .06, .619)
	var along := (.32*.32 - .30*.30 + distance*distance) / (2*distance)
	var bend := Vector3.RIGHT.slide(line).normalized()
	var joint := start + along*line + sqrt(maxf(0,.32*.32-along*along))*bend
	shoulder.global_basis = Basis(Quaternion(Vector3.DOWN,start.direction_to(joint)))
	elbow.global_basis = Basis(Quaternion(Vector3.DOWN,joint.direction_to(start+distance*line)))
