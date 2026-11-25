extends RefCounted
## The shared UI look: dark iron plates with gold inlay and ember highlights.
## Frames are nine-patch PNGs from scripts/assets/blender/ui_frames.py (assets/textures/ui/); when one is
## missing the flat StyleBox fallback is used, so the game still runs without the art.

const Items = preload("res://scripts/data/items.gd")

const GOLD := Color(0.89, 0.71, 0.49)
const GOLD_DIM := Color(0.61, 0.42, 0.27)
const EMBER := Color(0.85, 0.33, 0.17)
const INK := Color("#112126f2")
const TEXT := Color(0.88, 0.84, 0.78)
const MUTED := Color(0.62, 0.58, 0.55)
const GOOD := Color(0.45, 0.85, 0.4)
const BAD := Color(0.92, 0.35, 0.3)

## Nine-patch margins, matching MARGINS in scripts/assets/blender/ui_frames.py.
const FRAME_MARGINS := {
	"panel": 24, "header": 20, "well": 12, "well_border": 8, "button": 14, "button_hover": 14,
	"button_pressed": 14, "tab": 14, "tab_active": 14, "tooltip": 14, "bar_tray": 28,
}
const UI_DIR := "res://assets/textures/ui/"
const ITEM_ICONS := "res://assets/textures/icons/items/"
const SKILL_ICONS := "res://assets/textures/icons/skills/"

static var _tex_cache := {}


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


static func _tex(path: String) -> Texture2D:
	if not _tex_cache.has(path):
		_tex_cache[path] = load(path) if ResourceLoader.exists(path) else null
	return _tex_cache[path]


## A nine-patch frame (`name` from FRAME_MARGINS), with `pad` px of content margin; `fallback` if no art.
static func frame(name: String, pad := 12.0, fallback: StyleBox = null) -> StyleBox:
	var t := _tex(UI_DIR + name + ".png")
	if t == null:
		return fallback if fallback else box(INK, GOLD_DIM, 1, 2, int(pad))
	var s := StyleBoxTexture.new()
	s.texture = t
	var m: float = FRAME_MARGINS.get(name, 12)
	s.texture_margin_left = m
	s.texture_margin_right = m
	s.texture_margin_top = m
	s.texture_margin_bottom = m
	s.content_margin_left = pad
	s.content_margin_right = pad
	s.content_margin_top = pad * 0.7
	s.content_margin_bottom = pad * 0.7
	return s


static func make() -> Theme:
	var t := Theme.new()
	t.default_font_size = 17
	var flat := box(INK, Color("#526362"), 1, 2, 18)
	flat.border_width_top = 2
	var panel := frame("panel", 22.0, flat)
	t.set_stylebox("panel", "PanelContainer", panel)
	t.set_stylebox("panel", "Panel", panel)
	t.set_stylebox("normal", "Button", frame("button", 14.0, box(Color("#20343a"), GOLD_DIM, 1, 3, 14)))
	t.set_stylebox("hover", "Button", frame("button_hover", 14.0, box(Color("#345452"), GOLD, 1, 3, 14)))
	t.set_stylebox("pressed", "Button", frame("button_pressed", 14.0, box(Color("#42635b"), EMBER, 1, 3, 14)))
	t.set_stylebox("focus", "Button", box(Color(0, 0, 0, 0), GOLD, 1, 3, 14))
	t.set_stylebox("disabled", "Button", box(Color(0.08, 0.07, 0.09), Color(0.25, 0.2, 0.22), 1, 3, 14))
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", Color(1, 0.92, 0.8))
	t.set_color("font_pressed_color", "Button", Color(1, 0.85, 0.6))
	t.set_color("font_disabled_color", "Button", Color(0.45, 0.4, 0.4))
	t.set_color("font_color", "Label", TEXT)
	t.set_color("font_outline_color", "Label", Color(0, 0, 0, 1))
	t.set_constant("outline_size", "Label", 1)
	t.set_stylebox("panel", "TooltipPanel", frame("tooltip", 12.0, box(Color(0.05, 0.035, 0.06, 0.97), GOLD_DIM, 1, 4, 10)))
	t.set_color("font_color", "TooltipLabel", TEXT)
	t.set_stylebox("background", "ProgressBar", box(Color(0.05, 0.04, 0.06), Color(0.3, 0.22, 0.2), 1, 2, 0))
	t.set_stylebox("fill", "ProgressBar", box(EMBER, Color(0, 0, 0, 0), 0, 2, 0))
	# Tabs (Settings) use the tab frames.
	t.set_stylebox("tab_unselected", "TabContainer", frame("tab", 14.0))
	t.set_stylebox("tab_hovered", "TabContainer", frame("button_hover", 14.0))
	t.set_stylebox("tab_selected", "TabContainer", frame("tab_active", 14.0))
	t.set_stylebox("panel", "TabContainer", box(Color(0, 0, 0, 0.25), Color(0, 0, 0, 0), 0, 2, 14))
	t.set_color("font_selected_color", "TabContainer", GOLD)
	t.set_color("font_unselected_color", "TabContainer", MUTED)
	# Sliders, check boxes and option buttons in the Settings panel.
	t.set_stylebox("slider", "HSlider", box(Color(0.05, 0.04, 0.06), GOLD_DIM, 1, 3, 3))
	t.set_stylebox("grabber_area", "HSlider", box(EMBER.darkened(0.2), Color(0, 0, 0, 0), 0, 3, 3))
	t.set_stylebox("grabber_area_highlight", "HSlider", box(EMBER, Color(0, 0, 0, 0), 0, 3, 3))
	for kind in ["OptionButton", "CheckBox"]:
		t.set_stylebox("normal", kind, frame("button", 12.0))
		t.set_stylebox("hover", kind, frame("button_hover", 12.0))
		t.set_stylebox("pressed", kind, frame("button_pressed", 12.0))
		t.set_color("font_color", kind, TEXT)
	t.set_stylebox("panel", "PopupMenu", frame("tooltip", 10.0))
	return t


static func label(text: String, size := 17, color := TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


## A heading on an ember-lit iron strip.
static func header(text: String, size := 22) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", frame("header", 14.0))
	var l := label(text, size, GOLD)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	p.add_child(l)
	return p


static func well() -> StyleBox:
	return frame("well", 4.0, box(Color(0.03, 0.025, 0.035), Color(0.2, 0.17, 0.17), 1, 2, 4))


static func rarity_color(rarity: int) -> Color:
	return Items.RARITY_COLORS[clampi(rarity, 0, Items.RARITY_COLORS.size() - 1)]


## The icon of an item, or null if it has none.
static func item_icon(item: Dictionary) -> Texture2D:
	var id := str(item.get("icon", ""))
	if id == "":
		id = Items.guess_icon(item)
	return _tex(ITEM_ICONS + id + ".png")


## The icon of a skill or passive id, or null.
static func skill_icon(id: String) -> Texture2D:
	return _tex(SKILL_ICONS + id + ".png") if id != "" else null


static func border_texture() -> Texture2D:
	return _tex(UI_DIR + "well_border.png")
