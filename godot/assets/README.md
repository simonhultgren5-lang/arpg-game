# Game assets (game-ready)

Everything the game loads, in the same groups AAA depots use. These are the **exported, game-ready** files.
The editable originals (Blender, Photoshop, audio masters, film projects) live in [`/source-assets`](../../source-assets/README.md).

| Folder | What goes here | Formats |
| --- | --- | --- |
| `textures/` | Images: UI art and portraits (`field_guide/`), branding (`branding/`: emblem, boot splash), and later material textures | `.png`, `.jpg`, `.svg`, `.webp`, `.exr` |
| `models/` | Imported 3D models. Act I's characters and props are built in code today (`scripts/models/`), so this starts empty | `.glb` (preferred), `.gltf`, `.fbx` |
| `animations/` | Animation libraries and clips for imported models | `.glb`, `.res`, `.tres` |
| `audio/` | Sound: `spells/` (skill sounds, three variations each), `voice/` (spoken lines) | `.wav` for short sounds, `.ogg` for music and ambience |
| `cinematics/` | In-game cutscenes and videos | `.ogv` (Godot plays Theora), `.webm` |

- Binary files here are stored with **Git LFS** (see `/.gitattributes`): clone with `git lfs install` done once, and they download like any file.
- File names are lowercase with underscores (`grave_cleave_2.wav`). Godot writes an `.import` file next to each asset; commit it.
- Load assets by their `res://assets/...` path. Moving a file in the Godot editor updates references; moving it outside means updating the paths in `scripts/`.
- The launcher's Act I film is a launcher file (`launcher/assets/act-i.mp4`), not part of the game.
