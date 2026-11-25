extends Node3D
## Renders Sister Maud, Edda and Old Corwin side by side (needs a window):
##   godot --path godot res://tests/townsfolk_gallery.tscn -- --out C:/temp/townsfolk

const B = preload("res://scripts/world/build.gd")
const TownsfolkModel = preload("res://scripts/models/townsfolk_model.gd")


func _ready() -> void:
	var env := Environment.new()
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#1c1a22")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#c1bcc8")
	env.ambient_light_energy = 0.4
	var camera := Camera3D.new()
	camera.environment = env
	camera.fov = 30
	add_child(camera)
	var focus := Vector3(0, 0.9, 0)
	camera.position = focus + Vector3(0, 2.2, 6.5)
	camera.look_at(focus)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-35, -40, 0)
	sun.light_color = Color("#ffe6c5")
	sun.light_energy = 0.8
	sun.shadow_enabled = true
	add_child(sun)
	B.box(Vector3(8, 0.1, 4), B.mat(Color("#2c2a30")), Vector3(0, -0.05, 0), self)
	var ids := ["maud", "edda", "corwin"]
	for i in ids.size():
		var n := Node3D.new()
		n.position = Vector3(-1.5 + 1.5 * i, 0, 0)
		n.rotation.y = 0.25
		add_child(n)
		TownsfolkModel.build(n, ids[i])
	var out := ""
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			out = args[i + 1]
	if out != "":
		get_window().size = Vector2i(1400, 900)
		for f in 20:
			await get_tree().process_frame
		await RenderingServer.frame_post_draw
		DirAccess.make_dir_recursive_absolute(out)
		get_viewport().get_texture().get_image().save_png(out + "/townsfolk.png")
		get_tree().quit()
