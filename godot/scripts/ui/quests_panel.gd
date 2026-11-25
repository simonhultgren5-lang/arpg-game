extends PanelContainer
## Quest log (J). Left: every quest the hero has met, grouped Main, Side and Completed. Right: the chosen
## quest's story, who gave it, the current objective and the reward. Data: Game.quest_log().

const UiTheme = preload("res://scripts/ui/ui_theme.gd")

var _list: VBoxContainer
var _detail: VBoxContainer
var _selected := ""
var _entries := 0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	var top := HBoxContainer.new()
	v.add_child(top)
	var title := UiTheme.label("Quest Log", 26, UiTheme.GOLD)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(title)
	var close := Button.new()
	close.text = "✕"
	close.tooltip_text = "Close (Esc)"
	close.pressed.connect(func(): visible = false)
	top.add_child(close)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 16)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(body)
	var list_box := PanelContainer.new()
	list_box.add_theme_stylebox_override("panel", UiTheme.frame("well", 10.0))
	list_box.custom_minimum_size = Vector2(320, 480)
	body.add_child(list_box)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_box.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", 4)
	scroll.add_child(_list)
	var detail_box := PanelContainer.new()
	detail_box.add_theme_stylebox_override("panel", UiTheme.frame("well", 18.0))
	detail_box.custom_minimum_size = Vector2(520, 480)
	body.add_child(detail_box)
	_detail = VBoxContainer.new()
	_detail.add_theme_constant_override("separation", 10)
	detail_box.add_child(_detail)
	Game.quest_changed.connect(refresh)
	visibility_changed.connect(func():
		if visible:
			refresh()
	)
	refresh()


## How many quests the log lists (tests).
func entry_count() -> int:
	return _entries


func refresh() -> void:
	if not is_inside_tree():
		return
	for c in _list.get_children():
		c.queue_free()
	var log: Array = Game.quest_log()
	_entries = log.size()
	if _selected == "" or not log.any(func(e): return e["id"] == _selected):
		var active := log.filter(func(e): return not e["done"])
		_selected = (active[0]["id"] if not active.is_empty() else (log[0]["id"] if not log.is_empty() else ""))
	for group in [["Main story", func(e): return e["kind"] == "main" and not e["done"]],
			["Side quests", func(e): return e["kind"] == "side" and not e["done"]],
			["Completed", func(e): return e["done"]]]:
		var items := log.filter(group[1])
		if items.is_empty():
			continue
		_list.add_child(UiTheme.label(group[0], 17, UiTheme.GOLD_DIM.lightened(0.25)))
		for e in items:
			var b := Button.new()
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.text = ("✓  " if e["done"] else ("◆  " if e["kind"] == "main" else "◇  ")) + str(e["title"])
			b.custom_minimum_size = Vector2(290, 40)
			if e["done"]:
				b.add_theme_color_override("font_color", UiTheme.MUTED)
			if e["id"] == _selected:
				b.add_theme_stylebox_override("normal", UiTheme.frame("tab_active", 10.0))
				b.add_theme_color_override("font_color", UiTheme.GOLD)
			var id: String = e["id"]
			b.pressed.connect(func():
				_selected = id
				refresh()
			)
			_list.add_child(b)
	_fill_detail(log)


func _fill_detail(log: Array) -> void:
	for c in _detail.get_children():
		c.queue_free()
	var found := log.filter(func(e): return e["id"] == _selected)
	if found.is_empty():
		_detail.add_child(UiTheme.label("No quests yet. Speak with the people of Hollowmere.", 17, UiTheme.MUTED))
		return
	var e: Dictionary = found[0]
	_detail.add_child(UiTheme.label(str(e["title"]), 26, UiTheme.GOLD))
	var kind := "Main story" if e["kind"] == "main" else "Side quest"
	_detail.add_child(UiTheme.label("%s  ·  from %s%s" % [kind, e["giver"], "  ·  completed" if e["done"] else ""], 14, UiTheme.MUTED))
	var story := UiTheme.label(str(e["description"]), 16)
	story.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	story.custom_minimum_size = Vector2(480, 0)
	_detail.add_child(story)
	_detail.add_child(UiTheme.label("Objective", 18, UiTheme.GOLD))
	var obj := UiTheme.label(("✓  " if e["done"] else "◆  ") + str(e["objective"]), 17, UiTheme.MUTED if e["done"] else Color(1, 0.95, 0.85))
	obj.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	obj.custom_minimum_size = Vector2(480, 0)
	_detail.add_child(obj)
	_detail.add_child(UiTheme.label("Reward", 18, UiTheme.GOLD))
	_detail.add_child(UiTheme.label(str(e["reward"]), 16, Color(0.95, 0.8, 0.45)))
