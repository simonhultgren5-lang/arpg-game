extends Node3D
## Something the hero can click or press E next to: an NPC, the crypt gate, the stairs up, a portal.

## "npc", "gate", "stairs" or "portal"
var kind := "npc"
var npc_id := ""
var display_name := ""
## How close the hero must stand to use it.
var radius := 2.4
## Optional "!" label shown when the NPC has something new to say.
var marker: Label3D = null
var _t := 0.0


func _ready() -> void:
	add_to_group("interactables")


func _process(delta: float) -> void:
	_t += delta
	if marker:
		marker.visible = kind == "npc" and Game.npc_has_news(npc_id)
		marker.position.y = 2.7 + sin(_t * 3.0) * 0.08
