extends Node3D
## Shows this node only while the Callable in meta "when" returns true (quest objects that come and go).

var _when: Callable


func _ready() -> void:
	if has_meta("when"):
		_when = get_meta("when")
	_update()


func _process(_delta: float) -> void:
	_update()


func _update() -> void:
	if _when.is_valid():
		visible = bool(_when.call())
