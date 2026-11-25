extends Node
## Plays a Blender character's clips (idle, walk, attack, cast, hit, death; see /assets.md):
## idle or walk follow how fast the actor moves, one-shots play over them and then hand back,
## and death holds its last frame.
##
##   var anim = AssetModels.animate(model)         # null if the model has no AnimationPlayer
##   anim.update(delta, stride)                    # every frame; stride 0..1 = standing..full walk
##   anim.one_shot("attack")

var player: AnimationPlayer
var _busy := 0.0
var _dead := false
var _base := ""


## Called by AssetModels.animate(); takes over the model's AnimationPlayer.
func setup(ap: AnimationPlayer) -> void:
	player = ap
	for loop_name in ["idle", "walk"]:
		if ap.has_animation(loop_name):
			ap.get_animation(loop_name).loop_mode = Animation.LOOP_LINEAR
	_play_base("idle")


func _play_base(clip: String) -> void:
	if _base == clip or not player.has_animation(clip):
		return
	_base = clip
	if _busy <= 0.0:
		player.play(clip, 0.2)


func update(delta: float, stride: float) -> void:
	if _dead:
		return
	if _busy > 0.0:
		_busy -= delta
		if _busy <= 0.0:
			var back := _base
			_base = ""
			_play_base(back)
		return
	_play_base("walk" if stride > 0.2 else "idle")
	# Walk faster or slower with the actual speed, so feet don't slide.
	player.speed_scale = lerpf(0.7, 1.25, clampf(stride, 0.0, 1.0)) if _base == "walk" else 1.0


func one_shot(clip: String, speed := 1.0) -> void:
	if _dead or not player.has_animation(clip):
		return
	player.speed_scale = speed
	player.play(clip, 0.08)
	player.seek(0.0, true)
	_busy = player.get_animation(clip).length / maxf(speed, 0.01)


func die() -> void:
	if _dead:
		return
	_dead = true
	if player.has_animation("death"):
		player.speed_scale = 1.0
		player.play("death", 0.1)


func is_dead() -> bool:
	return _dead
