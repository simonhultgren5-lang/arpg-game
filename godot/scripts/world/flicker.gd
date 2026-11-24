extends Node3D
## Makes the OmniLight stored in meta "light" flicker like a flame.

var _light: OmniLight3D
var _base := 1.0
var _t := 0.0


func _ready() -> void:
	if has_meta("light"):
		_light = get_meta("light")
		_base = _light.light_energy
	_t = randf() * 10.0


func _process(delta: float) -> void:
	if _light == null:
		return
	_t += delta
	_light.light_energy = _base * (0.85 + 0.1 * sin(_t * 9.0) + 0.08 * sin(_t * 23.0 + 1.3) + randf() * 0.04)
