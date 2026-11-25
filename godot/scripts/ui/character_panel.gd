extends PanelContainer
## Character and bag (C or I). Left page: the hero turning slowly in the middle of 13 gear slots, then
## their stats. Right page: the 10 x 6 bag and gold. Drag items between bag and slots, right-click to
## wear or take off, Shift + right-click in the bag to salvage. Everything goes through Game
## (equip_to, unequip, move_item, salvage), so the panel only shows and asks.

const UiTheme = preload("res://scripts/ui/ui_theme.gd")
const Items = preload("res://scripts/data/items.gd")
const ItemCell = preload("res://scripts/ui/item_cell.gd")
const ItemTooltip = preload("res://scripts/ui/item_tooltip.gd")
const AssetModels = preload("res://scripts/models/asset_models.gd")

const CELL := 46
const COLS := 10
const SLOT := 62
## Where each gear slot sits on the paper doll (top-left of a SLOT-sized cell), around the hero.
const DOLL_SIZE := Vector2(440, 446)
const LAYOUT := {
	"head": Vector2(189, 0),
	"shoulders": Vector2(14, 44), "chest": Vector2(14, 122), "wrists": Vector2(14, 200), "hands": Vector2(14, 278),
	"amulet": Vector2(364, 44), "belt": Vector2(364, 122), "legs": Vector2(364, 200), "feet": Vector2(364, 278),
	"weapon": Vector2(52, 376), "ring_1": Vector2(146, 376), "ring_2": Vector2(232, 376), "offhand": Vector2(326, 376),
}

var _slots := {}
var _bag: Array = []
var _gold: Label
var _title: Label
var _stats: Label
var _details: Label
var _details_btn: Button
var _model_root: Node3D
var _viewport: SubViewport


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 10)
	add_child(outer)
	var top := HBoxContainer.new()
	outer.add_child(top)
	_title = UiTheme.label("", 24, UiTheme.GOLD)
	_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(_title)
	var close := Button.new()
	close.text = "✕"
	close.tooltip_text = "Close (Esc)"
	close.pressed.connect(func(): visible = false)
	top.add_child(close)

	var pages := HBoxContainer.new()
	pages.add_theme_constant_override("separation", 22)
	outer.add_child(pages)

	# ---- left page: paper doll and stats
	var left := VBoxContainer.new()
	left.add_theme_constant_override("separation", 8)
	pages.add_child(left)
	var doll := Control.new()
	doll.custom_minimum_size = DOLL_SIZE
	left.add_child(doll)
	_build_model_view(doll)
	for slot in Items.SLOTS:
		var c := ItemCell.new()
		c.panel = self
		c.slot = slot
		c.empty_text = Items.SLOT_NAMES[slot]
		c.position = LAYOUT[slot]
		c.size = Vector2(SLOT, SLOT)
		doll.add_child(c)
		_slots[slot] = c
	var stats_box := PanelContainer.new()
	stats_box.add_theme_stylebox_override("panel", UiTheme.frame("well", 12.0))
	left.add_child(stats_box)
	var sv := VBoxContainer.new()
	stats_box.add_child(sv)
	_stats = UiTheme.label("", 15)
	sv.add_child(_stats)
	_details = UiTheme.label("", 14, UiTheme.MUTED)
	_details.visible = false
	sv.add_child(_details)
	_details_btn = Button.new()
	_details_btn.text = "Details ▾"
	_details_btn.pressed.connect(func():
		_details.visible = not _details.visible
		_details_btn.text = "Details ▴" if _details.visible else "Details ▾"
	)
	sv.add_child(_details_btn)

	# ---- right page: bag
	var right := VBoxContainer.new()
	right.add_theme_constant_override("separation", 8)
	pages.add_child(right)
	right.add_child(UiTheme.header("Bag", 20))
	var grid := GridContainer.new()
	grid.columns = COLS
	grid.add_theme_constant_override("h_separation", 2)
	grid.add_theme_constant_override("v_separation", 2)
	right.add_child(grid)
	for i in Game.INVENTORY_SIZE:
		var c := ItemCell.new()
		c.panel = self
		c.bag_index = i
		c.custom_minimum_size = Vector2(CELL, CELL)
		grid.add_child(c)
		_bag.append(c)
	_gold = UiTheme.label("", 18, Color(0.95, 0.8, 0.45))
	right.add_child(_gold)
	var hint := UiTheme.label("Drag to wear or move  ·  Right-click: wear / take off\nShift + right-click: salvage for gold", 13, UiTheme.MUTED)
	right.add_child(hint)

	Game.inventory_changed.connect(refresh)
	Game.stats_changed.connect(refresh)
	visibility_changed.connect(func():
		if visible:
			refresh()
		if _viewport:
			_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS if visible else SubViewport.UPDATE_DISABLED
	)
	refresh()


## The hero model, idle and turning, in its own little world behind the slots.
func _build_model_view(doll: Control) -> void:
	var holder := SubViewportContainer.new()
	holder.stretch = true
	holder.position = Vector2(92, 56)
	holder.size = Vector2(256, 314)
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	doll.add_child(holder)
	_viewport = SubViewport.new()
	_viewport.own_world_3d = true
	_viewport.transparent_bg = true
	_viewport.msaa_3d = Viewport.MSAA_4X
	_viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	holder.add_child(_viewport)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_CLEAR_COLOR
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.45, 0.42, 0.5)
	env.environment.ambient_light_energy = 0.6
	env.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	_viewport.add_child(env)
	var cam := Camera3D.new()
	cam.position = Vector3(0, 1.05, 3.3)
	cam.fov = 34.0
	cam.look_at_from_position(cam.position, Vector3(0, 0.95, 0))
	_viewport.add_child(cam)
	var key := DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.82, 0.62)
	key.light_energy = 1.6
	key.rotation_degrees = Vector3(-35, 30, 0)
	_viewport.add_child(key)
	var rim := OmniLight3D.new()
	rim.light_color = Color(0.5, 0.6, 1.0)
	rim.light_energy = 2.5
	rim.omni_range = 6.0
	rim.position = Vector3(-1.5, 2.2, -1.6)
	_viewport.add_child(rim)
	_model_root = Node3D.new()
	_viewport.add_child(_model_root)
	var m := AssetModels.character(Game.hero_class)
	if m:
		_model_root.add_child(m)
		AssetModels.prepare(m, Color.html(str(Boot.character.get("color", "#8d3430"))))
		var anim = AssetModels.animate(m)
		if anim:
			anim.update(0.0, 0.0)


func _process(delta: float) -> void:
	if visible and _model_root:
		_model_root.rotation.y += delta * 0.35


func refresh() -> void:
	if not is_inside_tree():
		return
	_title.text = "%s  ·  level %d %s" % [Boot.character.get("name", "Wanderer"), Game.level(), Game.class_data.get("title", "")]
	var eq: Dictionary = Game.progress["equipped"]
	for slot in _slots:
		_slots[slot].set_item(eq.get(slot) if eq.get(slot) is Dictionary else {})
	var bag: Array = Game.inventory()
	for i in _bag.size():
		_bag[i].set_item(bag[i] if i < bag.size() else {})
	_gold.text = "%d gold" % int(Game.progress.get("gold", 0))
	var r: Vector2 = Game.damage_range()
	var res: String = Game.class_data.get("resource", "Mana")
	_stats.text = "Life  %d        %s  %d\nDamage  %d–%d        Armor  %d\nCritical chance  %d%%        Critical damage  %d%%" % [
		int(Game.max_hp()), res, int(Game.max_mana()), int(r.x), int(r.y), int(Game.armor()),
		int(round(Game.crit_chance() * 100.0)), int(round(Game.crit_damage() * 100.0))]
	var mitig := 1.0 - Game.mitigate(100.0) / 100.0
	_details.text = "Damage taken reduced by armor  %d%%\nAttack speed  +%d%%        Cooldowns  -%d%%\nMovement speed  %.1f        Life per second  %.1f\nGold  %d        Kills  %d" % [
		int(round(mitig * 100.0)), int(round((Game.attack_speed() - 1.0) * 100.0)),
		int(round((1.0 - Game.cooldown_mult()) * 100.0)), Game.move_speed(),
		Game.max_hp() * 0.006 + Game.life_regen(), int(Game.progress.get("gold", 0)), int(Game.progress.get("kills", 0))]


## How many bag cells the panel shows.
func bag_cells() -> int:
	return _bag.size()


func _item_at(t: Dictionary) -> Dictionary:
	if t.has("slot"):
		var it = Game.progress["equipped"].get(t["slot"])
		return it if it is Dictionary else {}
	var i := int(t.get("bag", -1))
	return Game.inventory()[i] if i >= 0 and i < Game.inventory().size() else {}


## What `item` would replace if worn.
func _worn_for(item: Dictionary) -> Dictionary:
	var kind: String = item.get("slot", "")
	var eq: Dictionary = Game.progress["equipped"]
	if kind == "ring":
		var r = eq.get("ring_1") if eq.get("ring_1") is Dictionary else eq.get("ring_2")
		return r if r is Dictionary else {}
	var it = eq.get(kind)
	return it if it is Dictionary else {}


func tooltip_control(t: Dictionary) -> Control:
	var item := _item_at(t)
	if item.is_empty():
		return null
	var hint := ""
	if t.has("slot"):
		return ItemTooltip.build(item, {}, "Worn  ·  Right-click or drag to the bag to take off")
	if item.get("slot") == "quest":
		hint = "A quest item."
	else:
		hint = "Right-click: wear  ·  Shift + right-click: salvage for %d gold" % Items.value(item)
	return ItemTooltip.build(item, _worn_for(item), hint)


## The tooltip as plain text (tests and screen readers).
func tooltip_for(t: Dictionary) -> String:
	var item := _item_at(t)
	return Items.describe(item) if not item.is_empty() else ""


func quick_use(t: Dictionary, shift: bool) -> void:
	if t.has("slot"):
		Game.unequip(t["slot"])
	elif shift:
		Game.salvage(int(t["bag"]))
	else:
		Game.equip_to(int(t["bag"]))


func can_drop(to: Dictionary, from: Dictionary) -> bool:
	var item := _item_at(from)
	if item.is_empty() or from == to:
		return false
	if to.has("slot"):
		return Items.slot_kind(to["slot"]) == item.get("slot", "")
	if from.has("slot"):
		var there := _item_at(to)
		return there.is_empty() or there.get("slot", "") == Items.slot_kind(from["slot"]) or Game.inventory().size() < Game.INVENTORY_SIZE
	return true


## Moves an item from `from` to `to` ({"bag": i} or {"slot": name}). True if anything moved.
func drop(to: Dictionary, from: Dictionary) -> bool:
	if not can_drop(to, from):
		return false
	var ok := false
	if from.has("bag") and to.has("slot"):
		ok = Game.equip_to(int(from["bag"]), to["slot"])
	elif from.has("slot") and to.has("bag"):
		var j := int(to["bag"])
		var there := _item_at(to)
		if not there.is_empty() and there.get("slot", "") == Items.slot_kind(from["slot"]):
			ok = Game.equip_to(j, from["slot"])  # swap with the item dropped on
		else:
			ok = Game.unequip(from["slot"])
	elif from.has("bag") and to.has("bag"):
		Game.move_item(int(from["bag"]), int(to["bag"]))
		ok = true
	elif from.has("slot") and to.has("slot"):
		# Only the two rings can trade places.
		var eq: Dictionary = Game.progress["equipped"]
		var a = eq[from["slot"]]
		eq[from["slot"]] = eq[to["slot"]]
		eq[to["slot"]] = a
		Game.inventory_changed.emit()
		ok = true
	refresh()
	return ok
