extends RefCounted
## Every Act I quest, for the quest log (J) and the tracker. A quest's progress is one number in
## Game.progress["quests"][id] (0 = not started); `steps[state]` is the objective shown at that state,
## where {count} and {need} are filled from Game.quest_counter(). The last state means done.
## Story and dialogue: scripts/data/act1_dialogue.gd.

const SOUTHWATCH_KILLS := 8
const KIN_TOKENS := 3

const QUESTS := {
	"silent_bell": {
		"title": "The Silent Bell", "kind": "main", "giver": "Sister Maud", "last": 3,
		"description": "Every night since the Feast of Ashes the bell of St. Aldric's tolls thirteen times, and every night the buried of Hollowmere stir. Sister Maud believes the toll comes from beneath the chapel, from the warden who was meant to guard it.",
		"reward": "Experience and gold",
		"steps": {
			0: "Speak with Sister Maud at the chapel.",
			1: "Descend through the mausoleum gate and silence the toll beneath St. Aldric's.",
			2: "Bring the Black Clapper to Sister Maud.",
			3: "The bell is silent.",
		},
	},
	"lamps": {
		"title": "Lamps Without Oil", "kind": "main", "giver": "The Lamplighter", "last": 3, "after": "silent_bell",
		"description": "With the bell silent, a child with a lamp walks the square at night. Nobody remembers giving them oil.",
		"reward": "The Lamplighter's Wick (unique charm)",
		"steps": {
			0: "A child with a lamp waits in Hollowmere's square. Speak with them.",
			1: "Follow the lamps through the graveyard and dig where the last one burns.",
			2: "Bring the Founders' Charter to Sister Maud.",
			3: "Sister Maud has the charter.",
		},
	},
	"act_end": {
		"title": "The Wells Toll", "kind": "main", "giver": "Sister Maud", "last": 2, "after": "lamps",
		"description": "The charter names the founders who sealed something under Hollowmere. Now every well in town answers the bell, and the undercroft stair behind the chapel stands open.",
		"reward": "Act II",
		"steps": {
			0: "Lamps Without Oil must come first.",
			1: "Go down the undercroft stair behind the chapel door.",
			2: "Act I is complete. The Ossuary of the Thirteen waits below.",
		},
	},
	"wardens": {
		"title": "The Wardens' Oath", "kind": "side", "giver": "Old Corwin", "last": 3,
		"description": "Someone pried the twelve wardens' name-stones off their plinth and threw them into the crypt. Old Corwin wants their names back where the town can see them.",
		"reward": "The Warden's Vigil (unique armour)",
		"steps": {
			1: "Find the wardens' name-stones in the Sunken Crypt ({count}/{need}).",
			2: "Set the name-stones on the plinth by the mausoleum door.",
			3: "The wardens' names are back on their plinth.",
		},
	},
	"southwatch": {
		"title": "The Southwatch Fire", "kind": "side", "giver": "Edda Varge", "last": 4,
		"description": "The keeper of the Southwatch beacon has not come to the forge for three days, and from the town wall the beacon is dark. Things have come up out of the fen. Edda wants the road to her brother's grave safe again.",
		"reward": "A weapon from Edda's forge and 80 gold",
		"steps": {
			1: "Clear the Southwatch Fen of the risen dead ({count}/{need}).",
			2: "Relight the Southwatch Beacon in the fen.",
			3: "Tell Edda the beacon burns again.",
			4: "The beacon burns over the fen road.",
		},
	},
	"kin": {
		"title": "Restless Kin", "kind": "side", "giver": "Old Corwin", "last": 3,
		"description": "The worst of the risen still wear the grave-tokens Corwin pressed into their hands at burial. He wants them back, so he can say their names over the right graves.",
		"reward": "An amulet from the gravedigger's box and 60 gold",
		"steps": {
			1: "Take grave-tokens from elite risen in the fen or the crypt ({count}/{need}).",
			2: "Bring the grave-tokens to Old Corwin.",
			3: "Corwin has said their names again.",
		},
	},
}

## Order in the log and tracker: the main story first, then side quests in the order they're met.
const ORDER := ["silent_bell", "lamps", "act_end", "wardens", "southwatch", "kin"]


static func ids() -> Array:
	return ORDER.duplicate()


static func get_quest(id: String) -> Dictionary:
	return QUESTS.get(id, {})


## A grave-token (Restless Kin): a quest item that can't be worn or sold.
static func grave_token() -> Dictionary:
	return {
		"uid": "grave_token", "name": "Grave-Token", "slot": "quest", "rarity": 0, "ilvl": 1, "stats": {},
		"icon": "ring_coin",
		"lore": "A lead coin stamped with a name, pressed into a dead hand by Old Corwin.",
	}
