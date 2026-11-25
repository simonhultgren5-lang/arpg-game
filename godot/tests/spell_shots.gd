extends Node
## Screenshots of the spell effects in the play camera (needs a window, not --headless):
##   godot --path godot res://tests/spell_shots.tscn -- --out C:/some/folder [--class pyromancer]

const SpellFx = preload("res://scripts/world/spell_fx.gd")
const Projectile = preload("res://scripts/actors/projectile.gd")
var _out := "user://spell_shots"
var _class := "pyromancer"


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
		if args[i] == "--class" and i + 1 < args.size():
			_class = args[i + 1]
	DirAccess.make_dir_recursive_absolute(_out)
	Boot.set_test_hero(_class)
	Boot.character["id"] = "spell-shots"
	await Game.load_hero()
	Game.area = "town"
	get_tree().change_scene_to_file("res://scenes/world.tscn")
	await _frames(60)
	var w = get_tree().current_scene
	w.player.global_position = w.grid.center(Vector2i(16, 12))
	w.player.hp = 99999.0
	await _frames(30)
	var at: Vector3 = w.player.global_position + Vector3(0, 0, 6)
	# a fireball in flight
	var pr = Projectile.new()
	pr.world = w
	pr.dir = Vector3(0, 0, 1)
	pr.speed = 3.0
	pr.max_dist = 40.0
	pr.color = Color(1.0, 0.5, 0.2)
	w.add_child(pr)
	pr.global_position = w.player.global_position + Vector3(0, 1.2, 1.5)
	pr.setup()
	await _frames(40)
	await _shot("1_fireball")
	pr.queue_free()
	SpellFx.explosion(w, at, 4.0, Color(1.0, 0.46, 0.1), 8)
	await _frames(14)
	await _shot("2_explosion")
	await _frames(40)
	SpellFx.burning_ground(w, at, 3.0, 6.0)
	await _frames(70)
	await _shot("3_burning_ground")
	var at2: Vector3 = w.player.global_position + Vector3(-5, 0, 4)
	SpellFx.ground_cracks(w, at2, 4.0, Color(1.0, 0.5, 0.2))
	SpellFx.dust_burst(w, at2, 4.0)
	SpellFx.debris(w, at2, 4.0, 14)
	SpellFx.shockwave(w, at2, 4.0)
	await _frames(24)
	await _shot("4_earthsplitter")
	SpellFx.smoke_cloud(w, w.player.global_position + Vector3(5, 0, 4), 3.0, 4.0, Color(0.3, 0.5, 0.2))
	SpellFx.meteor(w, w.player.global_position + Vector3(2, 0, 7), Color(1.0, 0.4, 0.1), 1.6, 0.6)
	await _frames(24)
	await _shot("5_meteor_cloud")
	get_tree().quit()
