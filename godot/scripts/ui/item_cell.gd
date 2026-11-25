extends Control
## One cell holding an item: a bag cell (`bag_index` >= 0) or a worn gear slot (`slot` != "").
## Draws a sunken well, the item icon and a rarity border; drags and drops through its panel
## (character_panel.gd drop()), right-click wears / takes off, Shift + right-click salvages.

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const Items = preload("res://scripts/data/items.gd")
const ItemTooltip = preload("res://scripts/ui/item_tooltip.gd")

var panel: Node  # character_panel.gd
var bag_index := -1
var slot := ""
var item: Dictionary = {}
var hover := false
## A faint hint drawn in an empty gear slot ("Head").
var empty_text := ""


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	mouse_entered.connect(func(): hover = true; queue_redraw())
	mouse_exited.connect(func(): hover = false; queue_redraw())


func set_item(it: Dictionary) -> void:
	item = it
	tooltip_text = "item" if not it.is_empty() else (Items.SLOT_NAMES.get(slot, "") if slot != "" else "")
	queue_redraw()


func target() -> Dictionary:
	return {"slot": slot} if slot != "" else {"bag": bag_index}


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	draw_style_box(UiTheme.well(), r)
	if item.is_empty():
		if empty_text != "":
			var f := get_theme_default_font()
			var fs := 12
			var w := f.get_string_size(empty_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			draw_string(f, Vector2((size.x - w) * 0.5, size.y * 0.5 + 4), empty_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0.45, 0.4, 0.38, 0.8))
	else:
		var rarity := int(item.get("rarity", 0))
		var col := UiTheme.rarity_color(rarity)
		if rarity > 0:
			draw_rect(r.grow(-4), Color(col.r, col.g, col.b, 0.09 + 0.03 * rarity))
		var icon := UiTheme.item_icon(item)
		if icon:
			draw_texture_rect(icon, r.grow(-3), false)
		var border := UiTheme.border_texture()
		if border and rarity > 0:
			draw_texture_rect(border, r, false, Color(col.r, col.g, col.b, 0.9))
	if hover:
		draw_rect(r.grow(-1), Color(1, 0.85, 0.55, 0.12))
		draw_rect(r.grow(-1), Color(0.95, 0.75, 0.45, 0.7), false, 1.5)


func _make_custom_tooltip(_for_text: String) -> Object:
	if item.is_empty():
		return null
	return panel.tooltip_control(target())


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT and not item.is_empty():
		panel.quick_use(target(), event.shift_pressed)
		accept_event()


func _get_drag_data(_at: Vector2) -> Variant:
	if item.is_empty():
		return null
	var icon := TextureRect.new()
	icon.texture = UiTheme.item_icon(item)
	icon.size = size
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.modulate = Color(1, 1, 1, 0.85)
	var holder := Control.new()
	holder.add_child(icon)
	icon.position = -size * 0.5
	set_drag_preview(holder)
	return target()


func _can_drop_data(_at: Vector2, data: Variant) -> bool:
	return data is Dictionary and panel.can_drop(target(), data)


func _drop_data(_at: Vector2, data: Variant) -> void:
	panel.drop(target(), data)
