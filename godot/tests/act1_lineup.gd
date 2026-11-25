extends Node3D
## Renders every hero class and every monster of Act I side by side (needs a window):
##   godot --path godot res://tests/act1_lineup.tscn -- --out C:/temp/lineup

const B = preload("res://scripts/world/build.gd")
const Player = preload("res://scripts/actors/player.gd")
const Enemy = preload("res://scripts/actors/enemy.gd")


func _ready() -> void:
	var env := Environment.new()
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#1c1a22")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#c1bcc8")
	env.ambient_light_energy = 0.45
	var camera := Camera3D.new()
	camera.environment = env
	camera.fov = 32
	add_child(camera)
	var focus := Vector3(0, 1.0, 0.3)
	camera.position = focus + Vector3(0, 3.6, 11.5)
	camera.look_at(focus)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38, -35, 0)
	sun.light_color = Color("#ffe6c5")
	sun.shadow_enabled = true
	add_child(sun)
	B.box(Vector3(16, 0.1, 6), B.mat(Color("#2c2a30")), Vector3(0, -0.05, 0), self)
	Boot.set_test_hero("warrior")
	var x := -5.4
	for hero_class in ["warrior", "pyromancer", "rogue"]:
		Game.hero_class = hero_class
		Game.class_data = preload("res://scripts/data/classes.gd").get_class_data(hero_class)
		var hero := Player.new()
		hero.process_mode = Node.PROCESS_MODE_DISABLED
		add_child(hero)
		hero._build_model()
		hero._animate(0.0)
		hero.position = Vector3(x, 0, 1.0)
		hero.rotation.y = 0.2
		x += 1.5
	for kind in ["hollow", "crawler", "archer"]:
		var foe := Enemy.new()
		foe.kind = kind
		foe.process_mode = Node.PROCESS_MODE_DISABLED
		add_child(foe)
		foe.setup()
		foe.position = Vector3(x, 0, 1.0)
		foe.rotation.y = -0.3
		x += 1.5
	var boss := Enemy.new()
	boss.kind = "boss"
	boss.process_mode = Node.PROCESS_MODE_DISABLED
	add_child(boss)
	boss.setup()
	boss.position = Vector3(x + 0.6, 0, -0.6)
	boss.rotation.y = -0.4
	var out := ""
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			out = args[i + 1]
	if out == "":
		return
	get_window().size = Vector2i(1800, 800)
	for f in 20:
		await get_tree().process_frame
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute(out)
	get_viewport().get_texture().get_image().save_png(out.path_join("act1-lineup.png"))
	print("Saved lineup")
	get_tree().quit()
