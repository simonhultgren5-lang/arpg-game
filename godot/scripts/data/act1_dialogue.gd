extends RefCounted
## Act I dialogue: "The Silent Bell". See godot/story/ACTS.md for the wider story.
## Each node: speaker, text, options [{text, next ("" closes), action?, if?}].
## Quest "silent_bell" states: 0 not started, 1 accepted, 2 Hask slain (bring the clapper back), 3 done.

const NPCS := {
	"maud": {"name": "Sister Maud", "title": "Last Sister of St. Aldric's"},
	"edda": {"name": "Edda Varge", "title": "Smith"},
	"corwin": {"name": "Old Corwin", "title": "Gravedigger"},
}

const NODES := {
	# ------------------------------------------------------------ Sister Maud
	"maud_0": {
		"speaker": "maud",
		"text": "Another one walks out of the fog. You have the look of someone who should have kept walking.\n\nListen. Do you hear it? No? Wait for midnight. The bell of St. Aldric's will toll thirteen times, as it has every night since the Feast of Ashes.",
		"options": [
			{"text": "A bell that tolls. Why does that frighten you?", "next": "maud_0b"},
			{"text": "I have no business with your bells.", "next": "maud_0x"},
		],
	},
	"maud_0b": {
		"speaker": "maud",
		"text": "Because we cut the rope, child. Then we took the bell down and broke it with hammers, and sank the pieces in the mere.\n\nIt tolls still. From beneath the chapel. And every night it tolls, the dead of Hollowmere get up a little straighter in their graves.",
		"options": [
			{"text": "What lies beneath the chapel?", "next": "maud_0c"},
		],
	},
	"maud_0c": {
		"speaker": "maud",
		"text": "The Sunken Crypt. Our wardens were buried there for three hundred years. The last of them, Warden Hask, went into the earth holding the old bell's clapper, as penance for a sin no one will name.\n\nI think he is ringing it. Go down through the mausoleum gate by the graveyard. Find what tolls. Silence it.",
		"options": [
			{"text": "I will go down. [Accept: The Silent Bell]", "next": "maud_accept", "action": "accept_quest"},
			{"text": "Not yet.", "next": ""},
		],
	},
	"maud_0x": {
		"speaker": "maud",
		"text": "No one has business here any more. And yet here you stand. The road behind you is fog, and the fog does not give back what it takes. Come back when you are ready to listen.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_accept": {
		"speaker": "maud",
		"text": "Take this key. It opens the chain on the mausoleum gate, east of here past the graves.\n\nCorwin dug most of those graves; he may know what waits below. Edda has draughts of grave-moss if you have coin. And pray, if you still remember how.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_1": {
		"speaker": "maud",
		"text": "The gate is east, past the graves. Hask is below, I am sure of it. Bring me the clapper, and we may yet sleep through one night.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_2": {
		"speaker": "maud",
		"text": "You are alive. And you have it... the clapper. Give it here.\n\nIt is warm. It should not be warm. Hold still, child, it is... whispering. Names. Thirteen names.",
		"options": [{"text": "Whose names?", "next": "maud_2b"}],
	},
	"maud_2b": {
		"speaker": "maud",
		"text": "The thirteen saints of the Ossuary, who were walled up beneath Hollowmere when the town was young. Hask was not ringing to wake the town. He was ringing to wake them.\n\nAnd something below him was ringing back.",
		"options": [{"text": "Then it is not over. [Complete: The Silent Bell]", "next": "maud_2c", "action": "complete_quest"}],
	},
	"maud_2c": {
		"speaker": "maud",
		"text": "No. It is only quieter. Take this for your trouble; St. Aldric's has no use for gold now.\n\nRest while you can. The catacombs go deeper than any map, and I fear the next toll will come from much further down.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"maud_3": {
		"speaker": "maud",
		"text": "The nights are silent. I hate them more than the tolling. Silence means something is listening.\n\n(The Ossuary Below, Act II, waits beyond this slice.)",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Edda the smith
	"edda_0": {
		"speaker": "edda",
		"text": "Forge is cold. Nothing to burn but coffin wood, and that smokes wrong. If you want steel, find it on the dead; they've no more use for it.\n\nI brew grave-moss draughts now. Bitter, but they close wounds. Twenty-five gold.",
		"options": [
			{"text": "Buy a grave-moss draught (25 gold)", "next": "edda_buy", "action": "buy_potion", "if": "gold_25"},
			{"text": "What happened to this town?", "next": "edda_lore"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"edda_buy": {
		"speaker": "edda",
		"text": "Drink it fast. Don't smell it first.",
		"options": [
			{"text": "Buy another (25 gold)", "next": "edda_buy", "action": "buy_potion", "if": "gold_25"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"edda_lore": {
		"speaker": "edda",
		"text": "Same as every town. People died and we buried them. Difference is, ours don't stay put.\n\nMy brother came back three nights after we buried him. Stood outside my window till dawn. Didn't knock. Just stood.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	# ------------------------------------------------------------ Old Corwin
	"corwin_0": {
		"speaker": "corwin",
		"text": "Mind the soft earth, stranger. Some of these graves are... newer than they look. Dug 'em myself, then dug 'em again when they came up empty.",
		"options": [
			{"text": "Tell me about the crypt.", "next": "corwin_crypt"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"corwin_crypt": {
		"speaker": "corwin",
		"text": "The Sunken Crypt. Floods every spring, never drains. The wardens are down there in their armor, standing up, the way they wanted.\n\nHask was the big one. They had to bury him in the bell-pit, he wouldn't fit a coffin. If you're going down, take my lantern-charm. It kept the dark off me for forty years.",
		"options": [
			{"text": "I'll take it. Thank you. [Receive: Gravedigger's Lantern]", "next": "corwin_gift", "action": "corwin_gift", "if": "no_corwin_gift"},
			{"text": "[Leave]", "next": ""},
		],
	},
	"corwin_gift": {
		"speaker": "corwin",
		"text": "Don't thank me. Bring it back if you can. And if you see Hask... tell him the hole's still open for him.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
	"corwin_after": {
		"speaker": "corwin",
		"text": "Bell's quiet. Graves are quiet. I don't trust it. Quiet's just the dark holding its breath.",
		"options": [{"text": "[Leave]", "next": ""}],
	},
}


## Which node an NPC opens with, given the quest state and flags.
static func entry(npc_id: String, quest_state: int, flags: Dictionary) -> String:
	match npc_id:
		"maud":
			return "maud_%d" % clampi(quest_state, 0, 3)
		"edda":
			return "edda_0"
		"corwin":
			if quest_state >= 3:
				return "corwin_after"
			if flags.get("corwin_gift", false):
				return "corwin_0"
			return "corwin_0"
	return ""
