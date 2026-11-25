extends PanelContainer
## Skills (K). Top: the six bar slots (LMB, RMB, 1-4); pick one, then pick a skill from the list on the
## left to put there. Right: the chosen skill's four variants (pick one, or none for the plain skill).
## Bottom: three passive slots that open at levels 3, 6 and 10. Changes go through Game.set_bar,
## set_variant and set_passive, which refuse while a foe is within 12 m (the panel says so).

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const Classes = preload("res://scripts/data/classes.gd")
const Passives = preload("res://scripts/data/passives.gd")

const KEYS := ["LMB", "RMB", "1", "2", "3", "4"]

var _slot := 1  # selected bar slot
var _passive := -1  # selected passive slot, or -1 when a bar slot is selected
var _bar_buttons: Array = []
var _passive_buttons: Array = []
var _list: VBoxContainer
var _detail: VBoxContainer
var _lock: Label
var _error: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	add_child(v)
	var top := HBoxContainer.new()
	v.add_child(top)
	var title := UiTheme.label("Skills", 26, UiTheme.GOLD)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(title)
	var close := Button.new()
	close.text = "✕"
	close.tooltip_text = "Close (Esc)"
	close.pressed.connect(func(): visible = false)
	top.add_child(close)
	_lock = UiTheme.label("", 16, UiTheme.BAD)
	v.add_child(_lock)

	var bar := HBoxContainer.new()
	bar.alignment = BoxContainer.ALIGNMENT_CENTER
	bar.add_theme_constant_override("separation", 12)
	v.add_child(bar)
	for k in Game.BAR_SIZE:
		var b := _icon_button(76)
		var i := k
		b.pressed.connect(func(): _select_slot(i))
		bar.add_child(b)
		_bar_buttons.append(b)

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 16)
	v.add_child(body)
	var list_box := PanelContainer.new()
	list_box.add_theme_stylebox_override("panel", UiTheme.frame("well", 10.0))
	list_box.custom_minimum_size = Vector2(330, 420)
	body.add_child(list_box)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_box.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", 4)
	scroll.add_child(_list)
	var detail_box := PanelContainer.new()
	detail_box.add_theme_stylebox_override("panel", UiTheme.frame("well", 14.0))
	detail_box.custom_minimum_size = Vector2(560, 420)
	body.add_child(detail_box)
	_detail = VBoxContainer.new()
	_detail.add_theme_constant_override("separation", 8)
	detail_box.add_child(_detail)

	var pass_row := HBoxContainer.new()
	pass_row.add_theme_constant_override("separation", 12)
	pass_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(pass_row)
	pass_row.add_child(UiTheme.label("Passives", 20, UiTheme.GOLD))
	for k in Passives.SLOT_LEVELS.size():
		var b := _icon_button(64)
		var i := k
		b.pressed.connect(func(): _select_passive(i))
		pass_row.add_child(b)
		_passive_buttons.append(b)
	_error = UiTheme.label("", 15, UiTheme.BAD)
	v.add_child(_error)

	Game.build_changed.connect(refresh)
	Game.leveled_up.connect(func(_lv): refresh())
	visibility_changed.connect(func():
		if visible:
			_error.text = ""
			refresh()
	)
	refresh()


func _process(_delta: float) -> void:
	if visible and Engine.get_process_frames() % 15 == 0:
		var why := locked_reason()
		if _lock.text != why:
			_lock.text = why
			_set_enabled(why == "")


func _icon_button(px: int) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(px, px)
	b.expand_icon = true
	b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.vertical_icon_alignment = VERTICAL_ALIGNMENT_CENTER
	b.add_theme_constant_override("icon_max_width", px - 14)
	return b


## Why skills can't change right now ("" when they can).
func locked_reason() -> String:
	return Game.can_change_build()


## The class's skill ids, in list order.
func skill_ids() -> Array:
	return Classes.skills(Game.hero_class).map(func(s): return s["id"])


func _set_enabled(on: bool) -> void:
	for c in _list.get_children():
		if c is Button:
			c.disabled = not on or c.has_meta("blocked")
	for c in _detail.find_children("*", "Button", true, false):
		c.disabled = not on or c.has_meta("blocked")


func _select_slot(i: int) -> void:
	_slot = i
	_passive = -1
	refresh()


func _select_passive(i: int) -> void:
	if Game.level() < int(Passives.SLOT_LEVELS[i]):
		_error.text = "This passive slot opens at level %d." % int(Passives.SLOT_LEVELS[i])
		return
	_passive = i
	refresh()


func _try(msg: String) -> void:
	_error.text = msg
	refresh()


func refresh() -> void:
	if not is_inside_tree():
		return
	var b: Dictionary = Game.build()
	for k in _bar_buttons.size():
		var btn: Button = _bar_buttons[k]
		var id: String = b["bar"][k]
		btn.icon = UiTheme.skill_icon(id)
		btn.text = "" if id != "" else KEYS[k]
		var sel := _passive < 0 and _slot == k
		btn.modulate = Color(1, 1, 1) if sel else Color(0.75, 0.72, 0.7)
		btn.add_theme_stylebox_override("normal", UiTheme.frame("tab_active" if sel else "button", 10.0))
		btn.tooltip_text = "%s  ·  %s" % [KEYS[k], Game.resolved(id).get("name", "Empty") if id != "" else "Empty"]
	for k in _passive_buttons.size():
		var btn: Button = _passive_buttons[k]
		var id: String = b["passives"][k]
		var open := Game.level() >= int(Passives.SLOT_LEVELS[k])
		btn.icon = UiTheme.skill_icon(id) if open else null
		btn.text = "" if (id != "" and open) else ("Lv %d" % int(Passives.SLOT_LEVELS[k]) if not open else "+")
		var sel := _passive == k
		btn.add_theme_stylebox_override("normal", UiTheme.frame("tab_active" if sel else "button", 10.0))
		btn.modulate = Color(1, 1, 1) if open else Color(0.5, 0.48, 0.48)
		btn.tooltip_text = Passives.find(Game.hero_class, id).get("name", "Empty") if open else "Opens at level %d" % int(Passives.SLOT_LEVELS[k])
	_fill_list()
	_fill_detail()
	var why := locked_reason()
	_lock.text = why
	_set_enabled(why == "")


func _fill_list() -> void:
	for c in _list.get_children():
		c.queue_free()
	if _passive >= 0:
		_list.add_child(UiTheme.label("Choose a passive", 18, UiTheme.GOLD))
		for p in Passives.for_class(Game.hero_class):
			var btn := _row(p["id"], p["name"], p["desc"])
			var pid: String = p["id"]
			btn.pressed.connect(func(): _try(Game.set_passive(_passive, pid)))
			if Game.build()["passives"][_passive] == pid:
				btn.add_theme_stylebox_override("normal", UiTheme.frame("tab_active", 10.0))
			_list.add_child(btn)
		var none := Button.new()
		none.text = "Empty this slot"
		none.pressed.connect(func(): _try(Game.set_passive(_passive, "")))
		_list.add_child(none)
		return
	_list.add_child(UiTheme.label("Skill for %s" % KEYS[_slot], 18, UiTheme.GOLD))
	var bar: Array = Game.build()["bar"]
	for sk in Classes.skills(Game.hero_class):
		var unlocked := Game.level() >= int(sk.get("unlock", 1))
		var note := "Primary" if sk.get("primary", false) else ""
		if not unlocked:
			note = "Unlocks at level %d" % int(sk.get("unlock", 1))
		elif bar.has(sk["id"]):
			note = (note + "  ·  " if note != "" else "") + "on %s" % KEYS[bar.find(sk["id"])]
		var btn := _row(sk["id"], sk["name"], note)
		if _slot == 0 and not sk.get("primary", false):
			btn.set_meta("blocked", true)
			btn.tooltip_text = "The left mouse button takes a primary skill."
		if bar[_slot] == sk["id"]:
			btn.add_theme_stylebox_override("normal", UiTheme.frame("tab_active", 10.0))
		var sid: String = sk["id"]
		btn.pressed.connect(func(): _try(Game.set_bar(_slot, sid)))
		_list.add_child(btn)
	if _slot > 0:
		var none := Button.new()
		none.text = "Empty this slot"
		none.pressed.connect(func(): _try(Game.set_bar(_slot, "")))
		_list.add_child(none)


func _row(id: String, name: String, note: String) -> Button:
	var btn := Button.new()
	btn.icon = UiTheme.skill_icon(id)
	btn.expand_icon = true
	btn.add_theme_constant_override("icon_max_width", 40)
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.text = name + ("\n" + note if note != "" else "")
	btn.custom_minimum_size = Vector2(300, 52)
	btn.autowrap_mode = TextServer.AUTOWRAP_WORD
	return btn


func _fill_detail() -> void:
	for c in _detail.get_children():
		c.queue_free()
	if _passive >= 0:
		var pid: String = Game.build()["passives"][_passive]
		var p := Passives.find(Game.hero_class, pid)
		_detail.add_child(UiTheme.label("Passive slot %d" % (_passive + 1), 22, UiTheme.GOLD))
		var d := UiTheme.label(p["name"] + "\n" + p["desc"] if not p.is_empty() else "Pick a passive on the left. Passives are always on while they sit in an open slot.", 17)
		d.autowrap_mode = TextServer.AUTOWRAP_WORD
		_detail.add_child(d)
		return
	var id: String = Game.build()["bar"][_slot]
	if id == "":
		var t := UiTheme.label("Pick a skill on the left for %s." % KEYS[_slot], 18, UiTheme.MUTED)
		_detail.add_child(t)
		return
	var base := Classes.skill(Game.hero_class, id)
	var now := Game.resolved(id)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 12)
	_detail.add_child(head)
	var icon := TextureRect.new()
	icon.texture = UiTheme.skill_icon(id)
	icon.custom_minimum_size = Vector2(64, 64)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	head.add_child(icon)
	var hv := VBoxContainer.new()
	head.add_child(hv)
	hv.add_child(UiTheme.label(base["name"], 24, UiTheme.GOLD))
	var facts := "Primary  ·  builds %s" % Game.class_data.get("resource", "") if base.get("primary", false) else "Costs %d %s  ·  Cooldown %.1f s" % [
		int(now.get("mana", 0)), Game.class_data.get("resource", "Mana"), float(now.get("cooldown", 0.0)) * Game.cooldown_mult()]
	hv.add_child(UiTheme.label(facts, 14, UiTheme.MUTED))
	var desc := UiTheme.label(base["desc"], 16)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD
	desc.custom_minimum_size = Vector2(520, 0)
	_detail.add_child(desc)
	_detail.add_child(UiTheme.label("Variants", 18, UiTheme.GOLD))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	_detail.add_child(grid)
	var chosen := str(Game.build()["variants"].get(id, ""))
	var vs: Array = base["variants"]
	for i in vs.size():
		var vdata: Dictionary = vs[i]
		var lv := Classes.variant_unlock(base, i)
		var open := Game.level() >= lv
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(266, 92)
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.autowrap_mode = TextServer.AUTOWRAP_WORD
		btn.text = "%s%s\n%s" % [vdata["name"], "" if open else "  (level %d)" % lv, vdata["desc"]]
		if chosen == vdata["id"]:
			btn.add_theme_stylebox_override("normal", UiTheme.frame("tab_active", 12.0))
			btn.add_theme_color_override("font_color", UiTheme.GOLD)
		if not open:
			btn.add_theme_color_override("font_color", UiTheme.MUTED)
			btn.tooltip_text = "Unlocks at level %d. You can choose it now; it takes effect then." % lv
		var vid: String = vdata["id"]
		btn.pressed.connect(func(): _try(Game.set_variant(id, "" if chosen == vid else vid)))
		grid.add_child(btn)
