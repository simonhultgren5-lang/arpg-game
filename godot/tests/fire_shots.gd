extends Node
## Close-ups of the level's fires (torches, braziers, forge, watchfire): needs a window.
##   godot --path godot res://tests/fire_shots.tscn -- --out C:/some/folder
var _out := "user://fire_shots"


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
	Boot.character["id"] = "fire-shots"
	await Game.load_hero()
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(60)
	var w = get_tree().current_scene
	for spot in [["a_square", Vector2i(16, 9)], ["b_watchfire", Vector2i(7, 41)], ["c_forge", Vector2i(6, 13)]]:
		w.player.global_position = w.grid.center(spot[1])
		w.player.hp = 99999.0
		await _frames(50)
		await _shot(spot[0])
	get_tree().quit()
