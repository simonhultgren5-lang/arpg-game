extends Node
## Saves frames of the launch intro for review (needs a window):
##   godot --path godot res://tests/intro_shots.tscn -- --out C:/some/folder

func _ready() -> void:
	var out := "user://intro_shots"
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			out = args[i + 1]
	DirAccess.make_dir_recursive_absolute(out)
	var intro: Control = load("res://scripts/ui/logo_intro.gd").new()
	get_tree().root.add_child.call_deferred(intro)
	for t in [1.6, 3.6, 4.6]:
		await get_tree().create_timer(t - (0.0 if t == 1.6 else (1.6 if t == 3.6 else 3.6))).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("%s/intro_%.1f.png" % [out, t])
		print("saved intro ", t)
	get_tree().quit(0)
