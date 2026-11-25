extends CanvasLayer
## In-game HUD: health and mana orbs, skill bar, XP, quest tracker, target bar, messages, and the
## dialogue, pack (inventory), pause and death panels.

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const Orb = preload("res://scripts/ui/orb.gd")
const SkillSlot = preload("res://scripts/ui/skill_slot.gd")
const Items = preload("res://scripts/data/items.gd")

var world: Node3D

var _root: Control
var _hp_orb: Orb
var _mana_orb: Orb
var _slots: Array = []  # [slot, kind, index]
var _xp_bar: ProgressBar
var _xp_label: Label
var _quest_label: Label
var _area_label: Label
var _target_panel: PanelContainer
var _target_name: Label
var _target_bar: ProgressBar
var _banner: Label
var _banner_sub: Label
var _messages: VBoxContainer
var _status: Label
var _help: PanelContainer
var _dlg_art := TextureRect.new()
var _dialogue: PanelContainer
var _dlg_speaker: Label
var _dlg_text: Label
var _dlg_options: VBoxContainer
var _dlg_npc := ""
var _dlg_buttons: Array = []
var _inventory: PanelContainer
var _inv_stats: Label
var _inv_equipped: VBoxContainer
var _inv_list: GridContainer
var _pause: PanelContainer
var _death: PanelContainer
var _boss: Node3D = null
var _banner_tween: Tween


func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UiTheme.make()
	add_child(_root)
	_build_bottom()
	_build_top()
	_build_dialogue()
	_build_inventory()
	_build_pause()
	_build_death()
	Game.message.connect(_on_message)
	Game.quest_changed.connect(_refresh_quest)
	Game.inventory_changed.connect(_refresh_inventory)
	Game.stats_changed.connect(_refresh_inventory)
	SaveSystem.status_changed.connect(_on_save_status)
	_refresh_quest()
	_refresh_inventory()
	_on_save_status(SaveSystem.last_status)


func _exit_tree() -> void:
	get_tree().paused = false


# ------------------------------------------------------------------ building

func _build_bottom() -> void:
	var bar := Control.new()
	bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.position = Vector2(0, -10)
	_root.add_child(bar)
	bar.anchor_left = 0.5
	bar.anchor_right = 0.5
	bar.anchor_top = 1.0
	bar.anchor_bottom = 1.0
	bar.offset_left = -420
	bar.offset_right = 420
	bar.offset_top = -150
	bar.offset_bottom = -8

	_hp_orb = Orb.new()
	_hp_orb.color = Color(0.72, 0.09, 0.1)
	_hp_orb.position = Vector2(0, 6)
	_hp_orb.size = Vector2(130, 130)
	_hp_orb.tooltip_text = "Life. Q drinks a grave-moss draught."
	bar.add_child(_hp_orb)
	_mana_orb = Orb.new()
	_mana_orb.color = Color(0.3, 0.22, 0.75) if Game.hero_class == "pyromancer" else (Color(0.75, 0.38, 0.12) if Game.hero_class == "warrior" else Color(0.35, 0.6, 0.25))
	_mana_orb.position = Vector2(840 - 130, 6)
	_mana_orb.size = Vector2(130, 130)
	_mana_orb.tooltip_text = "%s. Skills spend it." % Game.class_data.get("resource", "Mana")
	bar.add_child(_mana_orb)

	var center := VBoxContainer.new()
	center.position = Vector2(150, 34)
	center.size = Vector2(540, 100)
	center.add_theme_constant_override("separation", 6)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(center)
	var xp_row := Control.new()
	xp_row.custom_minimum_size = Vector2(540, 14)
	xp_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(xp_row)
	_xp_bar = ProgressBar.new()
	_xp_bar.show_percentage = false
	_xp_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
	_xp_bar.mouse_filter = Control.MOUSE_FILTER_PASS
	_xp_bar.add_theme_stylebox_override("fill", UiTheme.box(UiTheme.GOLD, Color(0, 0, 0, 0), 0, 2, 0))
	xp_row.add_child(_xp_bar)
	_xp_label = UiTheme.label("", 12, Color(1, 0.95, 0.85))
	_xp_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_xp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_xp_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	xp_row.add_child(_xp_label)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(row)
	var cls: Dictionary = Game.class_data
	_add_slot(row, "LMB", cls["basic"], "basic", 0)
	_add_slot(row, "RMB/1", cls["skills"][0], "skill", 0)
	_add_slot(row, "2", cls["skills"][1], "skill", 1)
	_add_slot(row, "3", {}, "locked", 2)
	_add_slot(row, "4", {}, "locked", 3)
	var sep := Control.new()
	sep.custom_minimum_size = Vector2(10, 10)
	row.add_child(sep)
	_add_slot(row, "Q", {"name": "Grave-moss Draught", "color": Color(0.8, 0.15, 0.15),
		"desc": "Restores 45% of your life. Edda sells more in Hollowmere."}, "potion", 0)

	_status = UiTheme.label("", 13, Color(0.75, 0.6, 0.55))
	_status.anchor_top = 1.0
	_status.anchor_bottom = 1.0
	_status.offset_left = 16
	_status.offset_top = -30
	_status.offset_bottom = -8
	_root.add_child(_status)


func _add_slot(row: HBoxContainer, key: String, sk: Dictionary, kind: String, index: int) -> void:
	var s := SkillSlot.new()
	s.key_text = key
	if kind == "locked":
		s.locked = true
		s.tooltip_text = "Locked: a new skill joins this slot in a later act."
	else:
		s.title = sk.get("name", "")
		s.color = sk.get("color", UiTheme.GOLD)
		var words: PackedStringArray = s.title.split(" ")
		s.glyph = ""
		for w in words:
			if w.length() > 0 and s.glyph.length() < 2 and w[0] == w[0].to_upper():
				s.glyph += w[0]
		var cost := ""
		if sk.has("mana") and int(sk["mana"]) > 0:
			cost = "\nCost: %d %s" % [int(sk["mana"]), Game.class_data.get("resource", "Mana")]
		var cd := ""
		if sk.has("cooldown") and kind == "skill":
			cd = "  ·  Cooldown: %.1fs" % float(sk["cooldown"])
		s.tooltip_text = "%s\n%s%s%s" % [s.title, sk.get("desc", ""), cost, cd]
	row.add_child(s)
	_slots.append([s, kind, index])


func _build_top() -> void:
	var tl := VBoxContainer.new()
	tl.position = Vector2(20, 16)
	tl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(tl)
	_area_label = UiTheme.label(Game.area_title(), 24, UiTheme.GOLD)
	tl.add_child(_area_label)
	var who := UiTheme.label("%s  ·  %s" % [Boot.character.get("name", "Wanderer"), Game.class_data.get("title", "")], 15, Color(0.75, 0.7, 0.68))
	tl.add_child(who)
	var q := PanelContainer.new()
	q.custom_minimum_size = Vector2(340, 0)
	q.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tl.add_child(q)
	var qv := VBoxContainer.new()
	q.add_child(qv)
	qv.add_child(UiTheme.label("The Silent Bell", 16, UiTheme.EMBER.lightened(0.2)))
	_quest_label = UiTheme.label("", 14)
	_quest_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_quest_label.custom_minimum_size = Vector2(320, 0)
	qv.add_child(_quest_label)

	_target_panel = PanelContainer.new()
	_target_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_target_panel.anchor_left = 0.5
	_target_panel.anchor_right = 0.5
	_target_panel.offset_left = -220
	_target_panel.offset_right = 220
	_target_panel.offset_top = 14
	_target_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_target_panel)
	var tv := VBoxContainer.new()
	_target_panel.add_child(tv)
	_target_name = UiTheme.label("", 17, Color(0.95, 0.88, 0.8))
	_target_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(_target_name)
	_target_bar = ProgressBar.new()
	_target_bar.show_percentage = false
	_target_bar.custom_minimum_size = Vector2(400, 12)
	_target_bar.add_theme_stylebox_override("fill", UiTheme.box(Color(0.65, 0.08, 0.08), Color(0, 0, 0, 0), 0, 2, 0))
	tv.add_child(_target_bar)
	_target_panel.visible = false

	_banner = UiTheme.label("", 46, UiTheme.GOLD)
	_banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_banner.anchor_left = 0.0
	_banner.anchor_right = 1.0
	_banner.offset_top = 150
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_theme_constant_override("outline_size", 8)
	_root.add_child(_banner)
	_banner_sub = UiTheme.label("", 20, Color(0.8, 0.72, 0.66))
	_banner_sub.anchor_left = 0.0
	_banner_sub.anchor_right = 1.0
	_banner_sub.offset_top = 212
	_banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_root.add_child(_banner_sub)

	_messages = VBoxContainer.new()
	_messages.anchor_left = 0.0
	_messages.anchor_right = 1.0
	_messages.anchor_top = 1.0
	_messages.anchor_bottom = 1.0
	_messages.offset_top = -300
	_messages.offset_bottom = -170
	_messages.alignment = BoxContainer.ALIGNMENT_END
	_messages.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_messages)

	_help = PanelContainer.new()
	_help.anchor_left = 1.0
	_help.anchor_right = 1.0
	_help.offset_left = -330
	_help.offset_right = -16
	_help.offset_top = 16
	_help.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_help)
	var hl := UiTheme.label(
		"Left click  move / attack (hold to keep going)\nShift + left click  attack in place\nRight click or 1  skill · 2  skill\nQ  draught · E  talk / use · WASD  move\nI  pack and hero · Esc  menu · Wheel  zoom\nH  hide this help", 14)
	_help.add_child(hl)
	_help.visible = Game.is_new_hero() or Game.area == "town"


func _panel(width: float) -> PanelContainer:
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(width, 0)
	p.visible = false
	_root.add_child(p)
	return p


func _build_dialogue() -> void:
	_dialogue = _panel(760)
	_dialogue.anchor_left = 0.5
	_dialogue.anchor_right = 0.5
	_dialogue.anchor_top = 1.0
	_dialogue.anchor_bottom = 1.0
	_dialogue.offset_left = -380
	_dialogue.offset_right = 380
	_dialogue.offset_top = -480
	_dialogue.offset_bottom = -170
	_dialogue.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	_dialogue.add_child(row)
	_dlg_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_dlg_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_dlg_art.custom_minimum_size = Vector2(146, 228)
	row.add_child(_dlg_art)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(v)
	_dlg_speaker = UiTheme.label("", 22, UiTheme.GOLD)
	v.add_child(_dlg_speaker)
	_dlg_text = UiTheme.label("", 17)
	_dlg_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_dlg_text.custom_minimum_size = Vector2(540, 0)
	v.add_child(_dlg_text)
	_dlg_options = VBoxContainer.new()
	_dlg_options.add_theme_constant_override("separation", 4)
	v.add_child(_dlg_options)


func _build_inventory() -> void:
	_inventory = _panel(440)
	_inventory.anchor_left = 1.0
	_inventory.anchor_right = 1.0
	_inventory.offset_left = -460
	_inventory.offset_right = -16
	_inventory.offset_top = 70
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	_inventory.add_child(v)
	v.add_child(UiTheme.label("Hero", 22, UiTheme.GOLD))
	_inv_stats = UiTheme.label("", 15)
	v.add_child(_inv_stats)
	v.add_child(UiTheme.label("Equipped  (click to take off)", 15, UiTheme.GOLD_DIM.lightened(0.2)))
	_inv_equipped = VBoxContainer.new()
	v.add_child(_inv_equipped)
	v.add_child(UiTheme.label("Pack  (click to equip · right-click to salvage)", 15, UiTheme.GOLD_DIM.lightened(0.2)))
	_inv_list = GridContainer.new()
	_inv_list.columns = 2
	_inv_list.add_theme_constant_override("h_separation", 6)
	_inv_list.add_theme_constant_override("v_separation", 4)
	v.add_child(_inv_list)


func _build_pause() -> void:
	_pause = _panel(340)
	_pause.set_anchors_preset(Control.PRESET_CENTER)
	_pause.offset_left = -170
	_pause.offset_right = 170
	_pause.offset_top = -150
	_pause.offset_bottom = 150
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	_pause.add_child(v)
	var t := UiTheme.label("Paused", 28, UiTheme.GOLD)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	v.add_child(_button("Resume", _toggle_pause))
	v.add_child(_button("Save and return to title", func():
		Game.save()
		get_tree().paused = false
		get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
	))
	v.add_child(_button("Save and quit", func():
		get_tree().paused = false
		Game.quit_game()
	))


func _build_death() -> void:
	_death = _panel(460)
	_death.set_anchors_preset(Control.PRESET_CENTER)
	_death.offset_left = -230
	_death.offset_right = 230
	_death.offset_top = -110
	_death.offset_bottom = 110
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	_death.add_child(v)
	var t := UiTheme.label("You have fallen", 32, Color(0.85, 0.2, 0.15))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var s := UiTheme.label("The dark of Hollowmere keeps a tenth of your gold.", 15)
	s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(s)
	v.add_child(_button("Rise again in Hollowmere", func(): world.respawn_in_town()))


func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(cb)
	return b


# ------------------------------------------------------------------ update

func _process(_delta: float) -> void:
	var p = world.player if world else null
	if p == null:
		return
	var mhp: float = Game.max_hp()
	var mmana: float = Game.max_mana()
	_hp_orb.set_values(p.hp / mhp, "%d / %d" % [int(ceil(p.hp)), int(mhp)])
	_mana_orb.set_values(p.mana / mmana, "%d / %d" % [int(p.mana), int(mmana)])
	var cls: Dictionary = Game.class_data
	for entry in _slots:
		var s = entry[0]
		match entry[1]:
			"basic":
				s.update_state(clampf(p.attack_cd / float(cls["basic"]["cooldown"]), 0.0, 1.0), true)
			"skill":
				var sk: Dictionary = cls["skills"][entry[2]]
				s.update_state(clampf(p.skill_cd[entry[2]] / float(sk["cooldown"]), 0.0, 1.0), p.mana >= float(sk["mana"]))
			"potion":
				var n := int(Game.progress.get("potions", 0))
				s.update_state(0.0, n > 0, n)
	var need := Game.xp_to_next()
	_xp_bar.max_value = need
	_xp_bar.value = int(Game.progress["xp"])
	_xp_label.text = "Level %d  ·  %d / %d XP" % [Game.level(), int(Game.progress["xp"]), need]
	# target bar: the boss once engaged, else whatever is under the cursor
	var t: Node3D = null
	if _boss != null and is_instance_valid(_boss) and not _boss.dead:
		t = _boss
	elif not is_blocking():
		t = world.hovered_enemy()
	if t:
		_target_panel.visible = true
		_target_name.text = "%s  ·  level %d" % [t.display_name, t.level]
		_target_bar.max_value = t.max_hp
		_target_bar.value = maxf(0.0, t.hp)
	else:
		_target_panel.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.physical_keycode == KEY_H:
		_help.visible = not _help.visible
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("inventory"):
		_inventory.visible = not _inventory.visible
		get_viewport().set_input_as_handled()


func _input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if _dialogue.visible:
			close_dialogue()
		elif _inventory.visible:
			_inventory.visible = false
		elif not _death.visible:
			_toggle_pause()
		get_viewport().set_input_as_handled()
		return
	if _dialogue.visible and event is InputEventKey and event.pressed and not event.echo:
		var k: int = event.physical_keycode
		if k >= KEY_1 and k <= KEY_9:
			var idx := k - KEY_1
			if idx < _dlg_buttons.size():
				_dlg_buttons[idx].emit_signal("pressed")
			get_viewport().set_input_as_handled()


func is_blocking() -> bool:
	return _dialogue.visible or _pause.visible or _death.visible


func _toggle_pause() -> void:
	_pause.visible = not _pause.visible
	get_tree().paused = _pause.visible


# ------------------------------------------------------------------ messages & banners

func _on_message(text: String, color: Color) -> void:
	var l := UiTheme.label(text, 18, color)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_messages.add_child(l)
	while _messages.get_child_count() > 5:
		_messages.get_child(0).queue_free()
		_messages.remove_child(_messages.get_child(0))
	var tw := l.create_tween()
	tw.tween_interval(3.5)
	tw.tween_property(l, "modulate:a", 0.0, 1.0)
	tw.tween_callback(l.queue_free)


func banner(title: String, sub := "") -> void:
	_banner.text = title
	_banner_sub.text = sub
	_banner.modulate.a = 0.0
	_banner_sub.modulate.a = 0.0
	if _banner_tween:
		_banner_tween.kill()
	_banner_tween = create_tween()
	_banner_tween.set_parallel(true)
	_banner_tween.tween_property(_banner, "modulate:a", 1.0, 0.6)
	_banner_tween.tween_property(_banner_sub, "modulate:a", 1.0, 0.9)
	_banner_tween.chain().tween_interval(2.2)
	_banner_tween.chain().tween_property(_banner, "modulate:a", 0.0, 1.0)
	_banner_tween.parallel().tween_property(_banner_sub, "modulate:a", 0.0, 1.0)


func _on_save_status(text: String) -> void:
	var online := "Online: %s" % Boot.server_url if Boot.is_online() else "Offline: saved on this PC"
	_status.text = online + ("  ·  " + text if text != "" else "")


func _refresh_quest() -> void:
	_quest_label.text = Game.quest_text()


func show_boss(e: Node3D) -> void:
	_boss = e


func boss_defeated() -> void:
	_boss = null
	banner("The bell is silent", "Hask, the Bell-Warden, is slain")


func show_death() -> void:
	ActAudio.stop_voice(self)
	_dialogue.visible = false
	_inventory.visible = false
	_death.visible = true


# ------------------------------------------------------------------ dialogue

func open_dialogue(npc_id: String) -> void:
	_dlg_npc = npc_id
	_dlg_art.texture = load("res://art/field_guide/previews/%s.jpg" % npc_id)
	_show_node(Game.dialogue_entry(npc_id))


func close_dialogue() -> void:
	ActAudio.stop_voice(self)
	_dialogue.visible = false
	_dlg_npc = ""


func _show_node(id: String) -> void:
	var node: Dictionary = Game.dialogue_node(id)
	if node.is_empty():
		close_dialogue()
		return
	var info: Dictionary = Game.npc_info(node.get("speaker", _dlg_npc))
	_dlg_speaker.text = "%s  ·  %s" % [info.get("name", ""), info.get("title", "")]
	ActAudio.voice(self, id, true)
	_dlg_text.text = node.get("text", "")
	for c in _dlg_options.get_children():
		c.queue_free()
	_dlg_buttons = []
	var n := 0
	for opt in node.get("options", []):
		if not Game.check_condition(str(opt.get("if", ""))):
			continue
		n += 1
		var b := Button.new()
		b.text = "%d.  %s" % [n, opt.get("text", "")]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var next_id: String = opt.get("next", "")
		var action: String = opt.get("action", "")
		b.pressed.connect(func():
			if action != "":
				Game.run_action(action)
			if next_id == "":
				close_dialogue()
			else:
				_show_node(next_id)
		)
		_dlg_options.add_child(b)
		_dlg_buttons.append(b)
	_dialogue.visible = true


# ------------------------------------------------------------------ inventory

func _refresh_inventory() -> void:
	if _inv_stats == null:
		return
	var r: Vector2 = Game.damage_range()
	_inv_stats.text = "%s, level %d %s\nLife %d  ·  %s %d\nDamage %d-%d  ·  Armor %d  ·  Crit %d%%\nMove speed %.1f  ·  Gold %d  ·  Kills %d" % [
		Boot.character.get("name", "Wanderer"), Game.level(), Game.class_data.get("title", ""),
		int(Game.max_hp()), Game.class_data.get("resource", "Mana"), int(Game.max_mana()),
		int(r.x), int(r.y), int(Game.armor()), int(Game.crit_chance() * 100.0),
		Game.move_speed(), int(Game.progress["gold"]), int(Game.progress.get("kills", 0)),
	]
	for c in _inv_equipped.get_children():
		c.queue_free()
	for slot in Items.SLOTS:
		var item = Game.progress["equipped"].get(slot)
		var b := Button.new()
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		if item is Dictionary:
			b.text = "%s: %s" % [Items.SLOT_NAMES[slot], item.get("name", "?")]
			b.add_theme_color_override("font_color", Items.RARITY_COLORS[int(item.get("rarity", 0))])
			b.tooltip_text = Items.describe(item)
			var s: String = slot
			b.pressed.connect(func(): Game.unequip(s))
		else:
			b.text = "%s: (empty)" % Items.SLOT_NAMES[slot]
			b.disabled = true
		_inv_equipped.add_child(b)
	for c in _inv_list.get_children():
		c.queue_free()
	var inv: Array = Game.inventory()
	for i in inv.size():
		var item: Dictionary = inv[i]
		var b := Button.new()
		b.text = str(item.get("name", "?"))
		b.custom_minimum_size = Vector2(200, 0)
		b.clip_text = true
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.add_theme_color_override("font_color", Items.RARITY_COLORS[int(item.get("rarity", 0))])
		b.tooltip_text = Items.describe(item) + ("\n\nQuest item" if item.get("slot") == "quest" else "\n\nClick: equip  ·  Right-click: salvage for %d gold" % Items.value(item))
		var idx := i
		b.pressed.connect(func(): Game.equip(idx))
		b.gui_input.connect(func(ev: InputEvent):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_RIGHT:
				Game.salvage(idx)
		)
		_inv_list.add_child(b)
	if inv.is_empty():
		_inv_list.add_child(UiTheme.label("Empty. The dead carry things worth taking.", 14, Color(0.6, 0.55, 0.55)))
