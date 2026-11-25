extends Node
## Screenshots of the southern fen at the play camera and from above (needs a window, not --headless):
##   godot --path godot res://tests/fen_shots.tscn -- --out C:/some/folder

var _out := "user://fen_shots"


func _ready() -> void:
	if has_meta("runner"):
		_run()
		return
	var runner := Node.new()
	runner.set_script(get_script())
	runner.set_meta("runner", true)
	get_tree().root.add_child.call_deferred(runner)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [_out, name])
	print("saved ", name)


func _run() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			_out = args[i + 1]
	DirAccess.make_dir_recursive_absolute(_out)
	Boot.set_test_hero("warrior")
	Boot.character["id"] = "fen-shots"
	await Game.load_hero()
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(60)
	var w = get_tree().current_scene
	for spot in [["a_road", Vector2i(17, 29)], ["b_river", Vector2i(16, 34)], ["c_ridge", Vector2i(30, 42)], ["d_west", Vector2i(6, 37)]]:
		w.player.global_position = w.grid.center(spot[1])
		await _frames(50)
		await _shot(spot[0])
	var cam: Camera3D = w.camera
	cam.set_process(false)
	cam.projection = Camera3D.PROJECTION_PERSPECTIVE
	cam.fov = 60
	cam.global_position = Vector3(36, 60, 108)
	cam.look_at(Vector3(36, 0, 82), Vector3.UP)
	await _frames(10)
	await _shot("e_overview")
	var CinematicPlayer = preload("res://scripts/cinematics/shot_player.gd")
	var player = CinematicPlayer.play(w, "southwatch")
	print("cinematic started: ", player != null)
	await get_tree().create_timer(3.0).timeout
	await _shot("f_cinematic")
	get_tree().quit()
