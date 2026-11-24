extends Control
## A health or mana orb: a glass sphere that drains from the top.

var fill := 1.0
var color := Color(0.75, 0.1, 0.1)
var text := ""


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP


func _draw() -> void:
	var r := minf(size.x, size.y) * 0.5
	var c := size * 0.5
	# socket
	draw_circle(c, r + 6.0, Color(0.05, 0.035, 0.06))
	draw_circle(c, r, Color(0.04, 0.02, 0.04))
	# liquid: the part of the circle below the fill line
	var top := c.y + r - 2.0 * r * clampf(fill, 0.0, 1.0)
	var pts := PackedVector2Array()
	for i in 48:
		var a := TAU * i / 48.0
		var p := c + Vector2(cos(a), sin(a)) * (r - 2.0)
		p.y = maxf(p.y, top)
		pts.append(p)
	if fill > 0.005:
		draw_colored_polygon(pts, color)
		# darker core, lighter surface line
		draw_circle(c + Vector2(0, r * 0.35), r * 0.45, Color(color.darkened(0.45), 0.35))
		var half := sqrt(maxf(0.0, r * r - pow(top - c.y, 2)))
		if fill < 0.995:
			draw_line(Vector2(c.x - half + 3, top), Vector2(c.x + half - 3, top), color.lightened(0.35), 2.0)
	# glass highlight and gold rim
	draw_circle(c + Vector2(-r * 0.35, -r * 0.4), r * 0.22, Color(1, 1, 1, 0.08))
	draw_arc(c, r, 0, TAU, 64, Color(0.89, 0.71, 0.49), 3.0, true)
	draw_arc(c, r + 5.0, 0, TAU, 64, Color(0.4, 0.28, 0.2), 2.0, true)
	if text != "":
		var font := get_theme_default_font()
		var fs := 16
		var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
		var pos := Vector2(c.x - w * 0.5, c.y + fs * 0.35)
		draw_string_outline(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(0, 0, 0, 0.9))
		draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.95, 0.9))


func set_values(f: float, t: String) -> void:
	if absf(f - fill) > 0.001 or t != text:
		fill = f
		text = t
		queue_redraw()
