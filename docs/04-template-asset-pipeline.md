# 04 — Template Asset & Art Pipeline (untuk Azi)

## A. Art Bible (WAJIB disepakati sebelum membuat asset)
| Item | Keputusan |
|---|---|
| Ukuran tile | 16×16 _(disarankan, hemat kerja)_ / 32×32 |
| Ukuran karakter | mis. 16×32 px |
| Resolusi game | mis. 320×180 diskala 4× → 1280×720 |
| Palet warna | mis. 32 warna (Lospec: ______) |
| Outline | ada / tidak, warna outline |
| Arah cahaya | kiri-atas |
| Gaya bayangan | |
| Referensi gambar | (moodboard 10–15 gambar) |
| Format file | `.aseprite` (sumber) + `.png` (export) |
| Tool | Aseprite / LibreSprite (gratis) / Pixelorama (gratis) |

## B. Penamaan & Struktur Folder
```
assets/
  characters/player/   player_walk_down.png
  characters/npc/      npc_<nama>_walk.png, npc_<nama>_portrait_happy.png
  tiles/               tileset_farm_spring.png
  objects/             obj_chest.png, obj_fence.png
  crops/               crop_turnip_stage1..5.png
  items/               item_<id>.png
  ui/                  ui_inventory.png, ui_button.png
  fx/                  fx_water_splash.png
  audio/sfx/ audio/bgm/
```
Aturan: `huruf_kecil_underscore`, tanpa spasi, nomor versi di nama sumber (`_v2`).

## C. Daftar Asset (Asset List) — pakai ini sebagai to-do Azi
| ID | Kategori | Nama | Ukuran | Frame/Anim | Prioritas | Status | Catatan |
|---|---|---|---|---|---|---|---|
| A001 | Karakter | Player walk (4 arah) | 16×32 | 4 arah × 4 frame | P0 | ☐ | |
| A002 | Karakter | Player aksi (cangkul, siram, tebang) | 16×32 | 4 arah × 3–4 | P0 | ☐ | |
| A003 | Tileset | Rumput/tanah/air/jalan (musim semi) | 16×16 | autotile | P0 | ☐ | |
| A004 | Crop | 2 tanaman × 5 tahap | 16×16 | – | P0 | ☐ | |
| A005 | Item | Ikon tools & hasil panen | 16×16 | – | P0 | ☐ | |
| A006 | UI | HUD, hotbar, inventory, dialog box | – | – | P0 | ☐ | |
| A007 | Bangunan | Rumah pemain, toko | – | – | P1 | ☐ | |
| A008 | NPC | 3 NPC (sprite + portrait 4 ekspresi) | 16×32 / 48×48 | | P1 | ☐ | |
| A009 | Tileset | Musim panas/gugur/dingin | | | P2 | ☐ | |
| A010 | SFX/BGM | Langkah, cangkul, siram, UI klik, 2 BGM | | | P1 | ☐ | |

**Prioritas:** P0 = dibutuhkan prototype · P1 = vertical slice · P2 = rilis penuh

## D. Alur Serah-Terima (Azi → Bayu)
1. Azi export PNG + sumber `.aseprite` ke folder repo `assets/`.
2. Azi tulis spesifikasi di Asset List (ukuran, jumlah frame, FPS animasi, pivot/origin).
3. Bayu import ke engine, tes, beri feedback (maks 1 putaran revisi kecil).
4. Tandai status ☑ di Asset List.

## E. Placeholder Strategy
Bayu **tidak menunggu** Azi: pakai kotak warna / asset gratis (Kenney.nu, itch.io) sebagai placeholder, lalu diganti.

## F. Audio & Lisensi
- SFX/BGM: buat sendiri, atau gunakan CC0 (Kenney, OpenGameArt, Freesound — cek lisensi).
- Catat semua asset pihak ketiga di `docs/credits-licenses.md`.
