extends SceneTree

func _initialize() -> void:
	run.call_deferred()

func run() -> void:
	change_scene_to_file("res://scenes/main_menu.tscn")
	await scene_changed
	for button in current_scene.find_children("*", "Button", true, false):
		if button.text == "Field guide":
			button.pressed.emit()
			break
	await scene_changed
	var guide = current_scene
	var visited := 0
	for button in guide.find_children("*", "Button", true, false):
		if button.toggle_mode:
			button.pressed.emit()
			if guide._art.texture == null or guide._art.texture.get_size() != Vector2(2160, 3840) or guide._caption.text != button.text:
				quit(1)
				return
			visited += 1
	if visited != 13:
		quit(1)
		return
	guide._back()
	await scene_changed
	print("Verified 13 field guide entries and return to title")
	quit(0)
