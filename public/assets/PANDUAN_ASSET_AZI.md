# 🎨 Panduan Ganti Asset PNG 2D untuk Azi

Game ini sudah memakai **Three.js 2D Orthographic + `NearestFilter` (tajam anti-blur)** persis seperti **Stardew Valley**.  
Saat ini semua grafik menggunakan **Pixel Art Placeholder bawaan** di `src/sprites2d.js`, tetapi kode sudah punya fitur **Auto-Override PNG**!

Artinya: begitu Azi menaruh file `.png` transparan dengan nama yang sesuai di bawah ini, **tanpa perlu Bayu ubah kode**, game langsung mengganti placeholder dengan gambar Azi!

## 📂 Daftar Path & Ukuran PNG (Rekomendasi Pixel Art)

### 1. Tileset Tanah & Lantai (`public/assets/tiles/`) — Ukuran `16x16 px`
- `public/assets/tiles/grass.png` — Rumput dasar kebun/desa/hutan
- `public/assets/tiles/dirt.png` — Tanah cangkulan kering
- `public/assets/tiles/wet_dirt.png` — Tanah cangkulan basah (disiram)
- `public/assets/tiles/water.png` — Air kolam & laut pantai
- `public/assets/tiles/plaza.png` — Jalan setapak & ubin alun-alun desa
- `public/assets/tiles/wood_floor.png` — Lantai kayu dalam rumah
- `public/assets/tiles/wall_indoor.png` — Dinding dalam rumah
- `public/assets/tiles/sand.png` — Pasir pantai selatan
- `public/assets/tiles/cave_floor.png` — Lantai batu Gua Tambang
- `public/assets/tiles/cave_wall.png` — Dinding batu Gua Tambang

### 2. Bangunan (`public/assets/buildings/`)
- `public/assets/buildings/house.png` — Rumah petani (`48x48 px` atau `64x64 px`, transparan)
- `public/assets/buildings/shop.png` — Kios toko Pak Budi (`48x36 px`, transparan)
- `public/assets/buildings/shipping_bin.png` — Kotak jual hasil bumi (`20x20 px` atau `16x16 px`)

### 3. Pohon, Batu Tambang & Dekorasi Crafting (`public/assets/objects/`)
- `public/assets/objects/tree.png` — Pohon (`32x40 px`, bagian akar di tengah bawah)
- `public/assets/objects/rock_stone.png` — Batu biasa (`16x16 px`)
- `public/assets/objects/rock_copper.png` — Batu bijih tembaga (`16x16 px`)
- `public/assets/objects/rock_gold.png` — Batu bijih emas (`16x16 px`)
- `public/assets/objects/rock_amethyst.png` — Batu permata kecubung (`16x16 px`)
- `public/assets/objects/bed.png` — Tempat tidur dalam rumah (`24x32 px`)
- `public/assets/objects/tv.png` — TV ramalan cuaca (`20x20 px`)
- `public/assets/objects/kitchen.png` — Meja dapur memasak (`32x20 px`)
- `public/assets/objects/gate_arch.png` — Gapura gerbang pindah peta (`32x28 px`)
- `public/assets/objects/cave_entrance.png` — Mulut Gua Tambang di Desa (`48x36 px`)
- `public/assets/objects/ladder_up.png` — Tangga keluar Gua Tambang (`16x22 px`)
- `public/assets/objects/npc_house.png` — Rumah warga desa (`40x40 px`)
- `public/assets/objects/quest_board.png` — Papan Misi Desa (`24x24 px`)
- `public/assets/objects/berry_bush.png` — Semak Beri Hutan (`16x16 px`)
- `public/assets/objects/sea_shell.png` — Kerang Pantai (`16x16 px`)
- `public/assets/objects/fence.png` — Pagar kayu (`16x16 px`)
- `public/assets/objects/lamp.png` — Lentera taman (`16x16 px`)
- `public/assets/objects/sprinkler.png` — Sprinkler otomatis (`16x16 px`)
- `public/assets/objects/path.png` — Jalan batu (`16x16 px`)

### 4. Tanaman / Crops (`public/assets/crops/`) — Ukuran `16x16 px`
Setiap tanaman punya 3 tahap (`0` = benih, `1` = tunas tengah, `2` = matang siap panen):
- **Lobak:** `crop_turnip_0.png`, `crop_turnip_1.png`, `crop_turnip_2.png`
- **Tomat:** `crop_tomato_0.png`, `crop_tomato_1.png`, `crop_tomato_2.png`
- **Labu Emas:** `crop_pumpkin_0.png`, `crop_pumpkin_1.png`, `crop_pumpkin_2.png`
