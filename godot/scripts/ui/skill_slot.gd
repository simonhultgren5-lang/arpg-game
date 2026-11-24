extends Control
## One slot on the skill bar: key hint, a simple glyph, cooldown sweep and a tooltip.

var key_text := ""
var title := ""
var glyph := ""
var color := Color(0.89, 0.71, 0.49)
var cooldown := 0.0  # 0..1 of the cooldown left
var locked := false
var usable := true
var count := -1  # shows a number (potions) when >= 0


func _ready() -> void:
	custom_minimum_size = Vector2(62, 62)
	mouse_filter = Control.MOUSE_FILTER_STOP


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	draw_rect(r, Color(0.06, 0.04, 0.07))
	var inner := r.grow(-4)
	if locked:
		draw_rect(inner, Color(0.09, 0.08, 0.1))
		draw_line(inner.position, inner.end, Color(0.25, 0.2, 0.22), 2.0)
		draw_line(Vector2(inner.end.x, inner.position.y), Vector2(inner.position.x, inner.end.y), Color(0.25, 0.2, 0.22), 2.0)
	else:
		var bg := color.darkened(0.7)
		draw_rect(inner, bg)
		draw_circle(inner.get_center(), inner.size.x * 0.32, color.darkened(0.25) if usable else Color(0.2, 0.2, 0.3))
		var font := get_theme_default_font()
		var fs := 22
		var gw := font.get_string_size(glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string_outline(font, inner.get_center() + Vector2(-gw * 0.5, fs * 0.35), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(0, 0, 0))
		draw_string(font, inner.get_center() + Vector2(-gw * 0.5, fs * 0.35), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.95, 0.85))
		if cooldown > 0.0:
			var h := inner.size.y * cooldown
			draw_rect(Rect2(inner.position + Vector2(0, inner.size.y - h), Vector2(inner.size.x, h)), Color(0, 0, 0, 0.65))
		if not usable:
			draw_rect(inner, Color(0.05, 0.05, 0.25, 0.35))
	draw_rect(r, Color(0.89, 0.71, 0.49) if not locked else Color(0.3, 0.24, 0.24), false, 2.0)
	var f := get_theme_default_font()
	draw_string_outline(f, Vector2(5, 16), key_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, 3, Color(0, 0, 0))
	draw_string(f, Vector2(5, 16), key_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(0.95, 0.85, 0.65))
	if count >= 0:
		var t := str(count)
		draw_string_outline(f, Vector2(size.x - 16, size.y - 6), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, 3, Color(0, 0, 0))
		draw_string(f, Vector2(size.x - 16, size.y - 6), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 1, 1))


func update_state(cd: float, can_use: bool, n := -1) -> void:
	if absf(cd - cooldown) > 0.005 or can_use != usable or n != count:
		cooldown = cd
		usable = can_use
		count = n
		queue_redraw()
