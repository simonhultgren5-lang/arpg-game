extends Node3D

const B = preload("res://scripts/world/build.gd")
const Fx = preload("res://scripts/world/fx.gd")
const Player = preload("res://scripts/actors/player.gd")
const Enemy = preload("res://scripts/actors/enemy.gd")

func _ready() -> void:
	var env := Environment.new()
	env.ssao_enabled = true
	env.ssao_radius = 0.45
	env.ssao_intensity = 2.5
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#20202a")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#c1bcc8")
	env.ambient_light_energy = 0.45
	var camera := Camera3D.new()
	camera.environment = env
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 5.0
	add_child(camera)
	var focus := Vector3(0, 0.7, 0)
	camera.position = focus + Vector3(0, 14.5, 11)
	camera.look_at(focus)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-39, -50, 0)
	sun.light_color = Color("#ffe6c5")
	sun.shadow_enabled = true
	add_child(sun)
	B.omni(B.GOLD, 1.3, 9, Vector3(-2, 3, 2), self)
	for z in range(-4, 5):
		for x in range(-5, 6):
			var color := Color("#302e36").lightened(posmod(x * 7 + z * 3, 5) * 0.009)
			var stone := B.mat(color)
			B.surface_grain(stone, Vector3.ONE * 0.55)
			stone.uv1_world_triplanar = true
			B.box(Vector3(1.78, 0.12, 0.88), stone,
				Vector3(x * 1.8 + posmod(z, 2) * 0.9, -0.061, z * 0.9), self)
	var hero := Player.new()
	hero.process_mode = Node.PROCESS_MODE_DISABLED
	add_child(hero)
	hero._build_model()
	hero._animate(0.0)
	hero.position = Vector3(-2.7, 0, -0.85)
	hero.rotation.y = -0.22
	var kinds := ["hollow", "archer", "hollow"]
	for i in kinds.size():
		var foe := Enemy.new()
		foe.kind = kinds[i]
		foe.elite = i == 2
		foe.process_mode = Node.PROCESS_MODE_DISABLED
		add_child(foe)
		foe.setup()
		foe.position = Vector3(-0.9 + 1.8 * i, 0, -0.85)
		foe.rotation.y = 0.28
	var props := preload("res://scripts/models/props_model.gd")
	var mount := Vector3(-2.1, 0, 1.25)
	B.box(Vector3(0.55, 1.0, 0.35), B.mat(Color("#3f3940")), mount + Vector3.UP * 0.5, self)
	B.torch(self, mount + Vector3(0, 0.85, 0.19), Vector3.BACK, 3.2, 0.65)
	props.barrel(self, Vector3(-0.5, 0, 1.28))
	props.sarcophagus(self, Vector3(1.62, 0, 1.25)).rotation.y = 1.08
	var args := OS.get_cmdline_user_args()
	var index := args.find("--out")
	if index < 0:
		return
	if index + 1 == args.size():
		push_error("--out requires a directory")
		get_tree().quit(1)
		return
	var dir := ProjectSettings.globalize_path(args[index + 1])
	var err := DirAccess.make_dir_recursive_absolute(dir)
	if err == OK:
		for i in 8:
			await get_tree().process_frame
		if "--effects" in args:
			var direction := hero.position.direction_to(Vector3(-0.9, 0, -0.85))
			hero.rotation.y = atan2(direction.x, direction.z)
			hero._swing = 0.65
			hero._animate(0)
			Fx.slash(self, hero.position, direction, 1.72, 105, B.GOLD)
			Fx.impact(self, Vector3(-1.13, 0.96, -0.8), direction, true)
			await get_tree().create_timer(0.095).timeout
		await RenderingServer.frame_post_draw
		var path := dir.path_join("combat-effects.png" if "--effects" in args else "model-gallery.png")
		err = get_viewport().get_texture().get_image().save_png(path)
		if err == OK:
			print("Saved ", path)
	if err != OK:
		push_error(error_string(err))
	get_tree().quit(0 if err == OK else 1)
