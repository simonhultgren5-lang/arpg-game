extends Node

const Opening = preload("res://scenes/act1_opening.tscn")
const Menu = preload("res://scenes/main_menu.tscn")
var failures := 0


func _ready() -> void:
	# Keep this runner across the real menu/cinematic/world scene changes.
	if not has_meta("runner"):
		var runner := Node.new()
		runner.set_script(get_script())
		runner.set_meta("runner",true)
		get_tree().root.add_child.call_deferred(runner)
		return
	call_deferred("_run")


func check(value: bool, label: String) -> void:
	if not value:
		failures += 1
		push_error("FAIL opening: " + label)


func _run() -> void:
	Boot.set_test_hero("rogue")
	Boot.character["id"] = "opening-test-" + str(Time.get_ticks_usec())
	get_tree().change_scene_to_packed(Menu)
	await get_tree().scene_changed
	get_tree().current_scene._start()
	await get_tree().scene_changed
	var film = get_tree().current_scene
	check(film.scene_file_path == Opening.resource_path,"new hero enters opening")
	if failures:
		get_tree().quit(1)
		return
	film.set_process(false)
	var capture := "--capture-boards" in OS.get_cmdline_user_args()
	var board := Image.create_empty(1440,540,false,Image.FORMAT_RGB8) if capture else null
	for i in 6:
		var t: float = [2.5,8.0,13.2,17.4,24.25,29.0][i]
		film._process(t-film.clock)
		check(film.shot == i,"shot %d cut" % (i+1))
		check(film.camera.current,"cinematic camera active")
		if i == 2:
			check(film.stage.brother.visible and film.caption.text != "","reveal and subtitle")
		if i == 4:
			check(not film.stage.brother.visible and film.stage.latch.rotation.z > 0,"dawn ellipsis and latch")
		if board:
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var still := get_viewport().get_texture().get_image()
			still.resize(480,270,Image.INTERPOLATE_LANCZOS)
			still.convert(Image.FORMAT_RGB8)
			board.blit_rect(still,Rect2i(0,0,480,270),Vector2i(i%3*480,floori(i/3.0)*270))
	if board:
		var path := ProjectSettings.globalize_path("res://../docs/act1-opening-storyboard.png")
		check(board.save_png(path) == OK,"save six storyboard panels")
	film._process(3.0)
	await get_tree().scene_changed
	check(Game.flags().get("saw_second_cup",false),"completion persists for this hero")
	check(Game.quest_state() == 0 and get_tree().current_scene.player != null,"handoff before quest acceptance")
	await SaveSystem.flush()
	get_tree().change_scene_to_packed(Menu)
	await get_tree().scene_changed
	get_tree().current_scene._start()
	await get_tree().scene_changed
	check(get_tree().current_scene.scene_file_path.ends_with("world.tscn"),"seen hero bypasses opening")
	get_tree().change_scene_to_packed(Opening)
	await get_tree().scene_changed
	var escape := InputEventAction.new()
	escape.action = "ui_cancel"
	escape.pressed = true
	get_tree().current_scene._input(escape)
	await get_tree().scene_changed
	check(get_tree().current_scene.scene_file_path.ends_with("world.tscn"),"skip hands off immediately")
	await SaveSystem.flush()
	var save := "user://saves/%s.json" % Boot.character["id"]
	if FileAccess.file_exists(save):
		DirAccess.remove_absolute(save)
	print("OPENING TEST PASSED" if failures == 0 else "OPENING TEST FAILED")
	get_tree().quit(0 if failures == 0 else 1)
