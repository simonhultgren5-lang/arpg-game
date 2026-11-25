extends Node
## Scene-owned playback stops with the actor, dialogue panel or guide that started it.

var _voice: AudioStreamPlayer
var _next_bark := 0
var _last_take := {}
var _repeat_after := {}
var _rng := RandomNumberGenerator.new()


func stop_voice(owner_node: Node) -> void:
	if is_instance_valid(_voice) and _voice.get_parent() == owner_node:
		_voice.stop()
		_voice.queue_free()
		_voice = null


func voice(owner_node: Node, id: String, interrupt := false) -> void:
	var now := Time.get_ticks_msec()
	if not interrupt and (now < _next_bark or now < _repeat_after.get(id, 0) or (is_instance_valid(_voice) and _voice.playing)):
		return
	if is_instance_valid(_voice):
		stop_voice(_voice.get_parent())
	_voice = _play(owner_node, "voice", id, -3.0)
	_next_bark = now + _rng.randi_range(6500, 10000)
	_repeat_after[id] = now + _rng.randi_range(16000, 23000)


func spell(owner_node: Node, id: String) -> void:
	# Pick one of the other two recorded mixes so adjacent casts sound different.
	var take := (int(_last_take.get(id, _rng.randi_range(0, 2))) + _rng.randi_range(1, 2)) % 3
	_last_take[id] = take
	var clip := id if take == 0 else "%s_%d" % [id, take + 1]
	_play(owner_node, "spells", clip, _rng.randf_range(-8.5, -7.0))
	voice(owner_node, id)


func _play(owner_node: Node, folder: String, id: String, volume: float) -> AudioStreamPlayer:
	var player := AudioStreamPlayer.new()
	player.stream = load("res://assets/audio/%s/%s.wav" % [folder, id])
	player.volume_db = volume
	owner_node.add_child(player)
	player.finished.connect(player.queue_free)
	player.play()
	return player
