extends Node3D
## An Act I cold open. This scene owns its camera, lights, performers and audio.
const Set = preload("res://scripts/cinematics/second_cup_set.gd")
const UI = preload("res://scripts/ui/ui_theme.gd")
const WORLD := "res://scenes/world.tscn"
const DURATION := 32.0
# End time, camera in, camera out, sightline in, sightline out, vertical FOV.
const SHOTS := [
	[5.0,Vector3(.91,1.23,-.34),Vector3(.68,1.19,-.48),Vector3(.49,1.01,-1.23),Vector3(.44,1.01,-1.23),33.0],
	[10.5,Vector3(1.77,1.53,1.05),Vector3(1.47,1.57,.76),Vector3(-.51,1.35,-.91),Vector3(-.47,1.52,-1.03),39.0],
	[16.0,Vector3(.02,1.58,.31),Vector3(.09,1.6,-.14),Vector3(.44,1.51,-2.85),Vector3(.42,1.54,-2.85),33.0],
	[21.0,Vector3(-.74,1.65,-2.10),Vector3(-.70,1.66,-2.02),Vector3(-.53,1.61,-.81),Vector3(-.52,1.65,-.83),32.0],
	[27.0,Vector3(.77,1.06,-.89),Vector3(.68,1.09,-.94),Vector3(-.16,1.22,-1.38),Vector3(-.20,1.28,-1.39),33.0],
	[32.0,Vector3(1.81,2.23,1.70),Vector3(2.40,2.82,2.64),Vector3(-.12,1.36,-1.55),Vector3(-.06,1.25,-1.50),42.0],
]
# Edda speaks as a witness remembering the night. The visible mouth stays at rest.
const CAPTIONS := [
	[6.0,9.2,"Edda: Same as every town. People died and we buried them."],
	[9.2,11.75,"Difference is, ours don't stay put."],
	[11.75,14.75,"My brother came back three nights after we buried him."],
	[14.75,16.92,"Stood outside my window till dawn."],
	[16.92,18.67,"Didn't knock. Just stood."],
]
var stage := Set.new()
var camera := Camera3D.new()
var clock := 0.0
var finished := false
var shot := 0
var caption: Label
var title: Label
var shade := ColorRect.new()
var wind := AudioStreamPlayer.new()
var score := AudioStreamPlayer.new()


func _ready() -> void:
	add_child(stage)
	add_child(camera)
	camera.near = .035
	camera.current = true
	ActAudio.play_area("opening")
	_track(wind,preload("res://assets/audio/hollowmere/ambience/wind.wav"),"Ambience",-26.0)
	_track(score,preload("res://assets/audio/hollowmere/music/hollowmere.wav"),"Music",-23.0)
	_overlay()
	_pose(0.0)


func _track(player: AudioStreamPlayer, asset: AudioStreamWAV, bus: String, db: float) -> void:
	# Duplicate before setting loop points because area music also references this imported stream.
	var stream := asset.duplicate() as AudioStreamWAV
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_end = roundi(stream.get_length()*stream.mix_rate)
	player.stream = stream
	player.bus = bus
	player.volume_db = db
	add_child(player)
	player.play()


func _overlay() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var frame := Control.new()
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(frame)
	for lower in [false,true]:
		var bar := ColorRect.new()
		bar.color = Color.BLACK
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		frame.add_child(bar)
		bar.anchor_right = 1
		bar.anchor_top = .88 if lower else 0.0
		bar.anchor_bottom = 1 if lower else .12
	caption = UI.label("",27)
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	frame.add_child(caption)
	caption.anchor_left = .13
	caption.anchor_right = .87
	caption.anchor_top = .875
	caption.anchor_bottom = .99
	title = UI.label("ACT I\nThe Tolling of Hollowmere",37,UI.GOLD)
	frame.add_child(title)
	title.anchor_left = .08
	title.anchor_top = .64
	frame.add_child(shade)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var skip := Button.new()
	skip.visible = not OS.has_feature("movie")
	skip.text = "Skip opening  ·  Esc"
	frame.add_child(skip)
	skip.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	skip.offset_left = -230
	skip.offset_right = -28
	skip.offset_top = 18
	skip.offset_bottom = 66
	skip.pressed.connect(_finish)


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		_finish()


func _process(delta: float) -> void:
	if finished:
		return
	var before := clock
	clock = minf(clock + delta,DURATION)
	for marker in [[2.15,"inventory",-25.0],[23.85,"equipment",-21.0]]:
		if before < marker[0] and clock >= marker[0]:
			var player := AudioStreamPlayer.new()
			player.stream = load("res://assets/audio/hollowmere/sfx/%s.wav" % marker[1])
			player.bus = "Effects"
			player.volume_db = marker[2]
			add_child(player)
			player.finished.connect(player.queue_free)
			player.play()
	if before < 6.0 and clock >= 6.0:
		ActAudio.voice(self,"edda_lore",true)
	_pose(clock)
	if clock >= DURATION:
		_finish()


func _pose(t: float) -> void:
	shot = 0
	while shot < SHOTS.size()-1 and t >= float(SHOTS[shot][0]):
		shot += 1
	var cut: Array = SHOTS[shot]
	var start := 0.0 if shot == 0 else float(SHOTS[shot-1][0])
	var weight := smoothstep(start,float(cut[0]),t)
	camera.position = (cut[1] as Vector3).lerp(cut[2],weight)
	camera.look_at((cut[3] as Vector3).lerp(cut[4],weight),Vector3.UP)
	camera.fov = cut[5]
	var morning := smoothstep(18.8,26.4,t)
	stage.dawn.light_color = Color("#96b7e0").lerp(Color("#efc698"),morning)
	stage.dawn.light_energy = 3.1 + 1.2*morning
	stage.candle.light_energy = (1.5 + .07*sin(t*8.7) + .03*sin(t*13.4))*(1-.45*morning)
	stage.flame.scale.y = 1.75 + .13*sin(t*8.7)
	stage.brother.visible = t >= 10.5 and t < 21.0
	stage.head.rotation.y = .06 + .35*smoothstep(7.1,10.4,t) - .28*smoothstep(19.0,22.9,t)
	stage.head.rotation.x = .07 - .16*smoothstep(9.0,11.5,t) + .13*smoothstep(19.0,21.8,t)
	var blink := sin(PI * clampf((t-18.72)/.26,0.0,1.0))
	for eye in stage.eyes:
		eye.scale.y = .48*(1.0-.94*blink)
	stage.edda.scale.y = 1.0 + .004*sin(t*2.0)*(1.0-smoothstep(15.5,17.0,t))
	stage.latch.rotation.z = 1.18*smoothstep(23.85,24.65,t)
	stage.casement.rotation.y = -.12*smoothstep(24.7,27.0,t)
	stage.reach(smoothstep(21.2,23.75,t)*(1.0-smoothstep(24.8,26.6,t)))
	score.volume_db = -23.0 - 32.0*smoothstep(5.2,9.6,t) + 31.0*smoothstep(24.7,28.3,t)
	wind.volume_db = -26.0 - 5.0*smoothstep(6.0,9.0,t) + 6.0*smoothstep(19.0,24.0,t)
	caption.text = ""
	for line in CAPTIONS:
		if t >= line[0] and t < line[1]:
			caption.text = line[2]
	title.visible = t >= 27.6
	title.modulate.a = smoothstep(27.6,28.7,t)
	shade.color = Color(0,0,0,maxf(1.0-smoothstep(0.0,1.0,t),smoothstep(31.0,DURATION,t)))


func _finish() -> void:
	if finished:
		return
	finished = true
	ActAudio.stop_voice(self)
	if Game.loaded:
		Game.flags()["saw_second_cup"] = true
		Game.save()
	get_tree().change_scene_to_file(WORLD)
