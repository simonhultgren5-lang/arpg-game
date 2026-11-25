extends RefCounted
## The shared UI look: purple-black panels with gold trim and ember highlights.

const GOLD := Color(0.89, 0.71, 0.49)
const GOLD_DIM := Color(0.61, 0.42, 0.27)
const EMBER := Color(0.85, 0.33, 0.17)
const INK := Color("#112126f2")
const TEXT := Color(0.88, 0.84, 0.78)


static func box(bg: Color, border: Color, width := 1, radius := 4, pad := 10) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(width)
	s.set_corner_radius_all(radius)
	s.content_margin_left = pad
	s.content_margin_right = pad
	s.content_margin_top = pad * 0.6
	s.content_margin_bottom = pad * 0.6
	return s


static func make() -> Theme:
	var t := Theme.new()
	t.default_font_size = 17
	var frame := box(INK, Color("#526362"), 1, 2, 18)
	frame.border_width_top = 2
	frame.shadow_size = 5
	frame.shadow_color = Color(0, 0, 0, 0.32)
	t.set_stylebox("panel", "PanelContainer", frame)
	t.set_stylebox("panel", "Panel", frame)
	t.set_stylebox("normal", "Button", box(Color("#20343a"), GOLD_DIM, 1, 3, 14))
	t.set_stylebox("hover", "Button", box(Color("#345452"), GOLD, 1, 3, 14))
	t.set_stylebox("pressed", "Button", box(Color("#42635b"), EMBER, 1, 3, 14))
	t.set_stylebox("focus", "Button", box(Color(0, 0, 0, 0), GOLD, 1, 3, 14))
	t.set_stylebox("disabled", "Button", box(Color(0.08, 0.07, 0.09), Color(0.25, 0.2, 0.22), 1, 3, 14))
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", Color(1, 0.92, 0.8))
	t.set_color("font_pressed_color", "Button", Color(1, 0.85, 0.6))
	t.set_color("font_disabled_color", "Button", Color(0.45, 0.4, 0.4))
	t.set_color("font_color", "Label", TEXT)
	t.set_color("font_outline_color", "Label", Color(0, 0, 0, 1))
	t.set_constant("outline_size", "Label", 1)
	t.set_stylebox("panel", "TooltipPanel", box(Color(0.05, 0.035, 0.06, 0.97), GOLD_DIM, 1, 4, 10))
	t.set_color("font_color", "TooltipLabel", TEXT)
	t.set_stylebox("background", "ProgressBar", box(Color(0.05, 0.04, 0.06), Color(0.3, 0.22, 0.2), 1, 2, 0))
	t.set_stylebox("fill", "ProgressBar", box(EMBER, Color(0, 0, 0, 0), 0, 2, 0))
	return t


static func label(text: String, size := 17, color := TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l
