extends Node
## Renders a few screenshots of the slice (needs a window, not --headless):
##   godot --path godot res://tests/screenshots.tscn -- --out C:/some/folder [--class rogue]

var _out := "user://screenshots"
var _class := "warrior"


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
	var img := get_viewport().get_texture().get_image()
	img.save_png("%s/%s.png" % [_out, name])
	print("saved ", name)


func _run() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			_out = args[i + 1]
		if args[i] == "--class" and i + 1 < args.size():
			_class = args[i + 1]
	DirAccess.make_dir_recursive_absolute(_out)
	get_window().size = Vector2i(ProjectSettings.get_setting("display/window/size/viewport_width"),
		ProjectSettings.get_setting("display/window/size/viewport_height"))
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
	await _frames(30)
	await _shot("0_menu")
	Boot.set_test_hero(_class)
	Boot.character["id"] = "shots-" + _class
	await Game.load_hero()
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(90)
	await _shot("1_town")
	var w = get_tree().current_scene
	# The square, with the chapel and houses, and the graveyard with the mausoleum and the crypt gate.
	for spot in [["1b_square", Vector2i(17, 12)], ["1c_graveyard", Vector2i(27, 8)]]:
		w.player.global_position = w.grid.center(spot[1])
		await _frames(45)
		await _shot(spot[0])
	w.hud.open_dialogue("maud")
	await _frames(5)
	await _shot("2_dialogue")
	Game.run_action("accept_quest")
	w.hud.close_dialogue()
	Game.enter_area("catacomb")
	await _frames(90)
	w = get_tree().current_scene
	await _shot("3_crypt")
	w.hud.toggle_map()
	await _frames(3)
	await _shot("3_area_map")
	w.hud.toggle_map()
	# fight in the boss room
	w.player.global_position = w.boss.global_position + Vector3(0, 0, 5)
	w.boss.set_aggro()
	w.player.hp = 99999.0
	await _frames(40)
	w.player.mana = 999.0
	w.player.cast_skill(0)
	await _frames(8)
	await _shot("4_boss")
	w.player.hp = 99999.0
	for kind in ["weapon", "head", "chest", "hands", "feet", "ring", "amulet", "offhand", "legs", "belt"]:
		Game.add_item(Game.roll_loot(5, 0.9, kind))
	for k in ["head", "chest", "ring"]:
		for i in Game.inventory().size():
			if Game.inventory()[i]["slot"] == k:
				Game.equip_to(i)
				break
	Game.progress["level"] = 10
	Game.leveled_up.emit(10)
	w.hud.open_panel("character")
	await _frames(20)
	await _shot("5_character")
	w.hud.open_panel("skills")
	await _frames(5)
	await _shot("6_skills")
	w.hud.open_panel("settings")
	await _frames(5)
	await _shot("7_settings")
	w.hud.close_panels()
	await _frames(5)
	await _shot("8_hotbar")
	get_tree().quit(0)
