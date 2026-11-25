extends Area3D
class_name HollowmereAudioZone
## Add a CollisionShape3D and set collision_mask to the hero's layer. Overlapping
## zones use Area3D.priority (higher wins). Leave a field blank to inherit it.

## Footstep surface: stone, dirt, wood, grass or snow (blank inherits). A plain string, because
## @export_enum can't offer an empty choice.
@export var surface: String = ""
## Ambience bed: wind, drips, cave, forest or rain (blank inherits).
@export var bed: String = ""
@export var thunder_enabled := false


func _ready() -> void:
	add_to_group("audio_zones")
