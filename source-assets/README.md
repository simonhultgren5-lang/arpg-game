# Source assets (the art depot)

The editable originals behind the game's assets, organized like a Perforce depot:

```
source-assets/
├── Textures     Photoshop / Krita / Substance files (.psd, .kra, .spp, .sbsar), high-res renders
├── Models       Blender / Maya / 3ds Max scenes (.blend, .ma, .mb, .max), sculpts (.ztl)
├── Animations   Rigs and animation scenes (.blend, .fbx), motion capture
├── Audio        Session files and uncompressed masters (.wav, .flac, .aiff, DAW projects)
└── Cinematics   Film projects, edits and uncompressed renders (.prproj, .kdenlive, .mov)
```

Source code lives in its own folders at the repo root (`godot/scripts`, `launcher`, `electron`, `game-server`, `scripts`).

## How it works

- **Exported, game-ready files** go into `godot/assets/<same group>/` (for example `source-assets/Models/hollow.blend` → `godot/assets/models/hollow.glb`). The game never loads files from here.
- **Everything here is stored with Git LFS**, so the repo stays fast to clone and only the files you check out are downloaded.
- **Exclusive locks, like Perforce checkout.** Source files (`.psd`, `.blend`, `.ma`, `.max`, `.spp`, `.prproj` …) are *lockable*: they arrive read-only. Lock a file before you edit it, so nobody else changes it at the same time (binary files can't be merged):

  ```powershell
  git lfs lock "source-assets/Models/hollow.blend"      # take the file (it becomes writable)
  git lfs locks                                          # who has what
  git lfs unlock "source-assets/Models/hollow.blend"    # give it back after you push
  ```

  Pushing a change to a file someone else has locked is refused.
- **Naming:** `PascalCase` folders here, lowercase with underscores for files: `hollow_warrior.blend`, `maud_portrait.psd`.
- Keep renders and exports out of here unless they are the master copy; the game-ready export belongs in `godot/assets/`.
