# 🌱 Cozy Valley 2.5D — Beta Template (Bayu & Azi)

Template game **Farming & Life Sim 2.5D** berbasis **Three.js + Vite** yang ringan, tanpa ketergantungan asset berat (100% procedural chibi/voxel siap jalan), dan siap di-deploy ke **Vercel** untuk Beta Tester di Desktop maupun Mobile Browser.

## ✨ Fitur Beta Saat Ini
- **Player & Kustomisasi Karakter (`P`)**: Ubah nama, warna kulit, baju, celana, dan gaya topi/rambut secara real-time (tersimpan di `localStorage`).
- **3 NPC Interaktif (`E`)**:
  - **Pak Budi** (Pedagang Bibit Lobak, Tomat, Labu Emas)
  - **Mbak Sari** (Penambang & Tips Crafting)
  - **Kek Wiryo** (Tetua Desa)
- **Farming Loop Lengkap**: Cangkul rumput → Tanam bibit → Siram tiap hari (atau otomatis saat hujan / pakai Sprinkler) → Panen → Jual di *Shipping Bin* atau makan untuk tambah Energi.
- **Mining & Menebang Pohon**: Area tambang khusus di Timur Laut berisi Batu, Bijih Tembaga, dan Bijih Emas; pepohonan bisa ditebang menjadi Kayu.
- **Inventory & Crafting (`I` / `C`)**: 8 slot Hotbar + 12 slot Tas, serta sistem Crafting untuk merakit **Pagar Kayu**, **Jalan Batu**, **Lentera Taman (menyala malam hari)**, **Sprinkler Otomatis 3x3**, dan **Sup Kebun**.
- **Siklus Waktu, Cuaca & Tidur**: Jam berjalan dari pagi ke malam dengan transisi pencahayaan otomatis, cuaca Cerah/Hujan, dan fitur Tidur ke hari berikutnya.
- **Dukungan Desktop & Mobile**: Keyboard + Klik Mouse Raycasting di PC, serta Virtual D-Pad + tombol aksi di layar sentuh HP.

## 🚀 Cara Menjalankan Lokal (Untuk Bayu)
```bash
npm install
npm run dev
```
Build produksi untuk Vercel:
```bash
npm run build
```

## 🎨 Panduan Menambah Konten & Asset (Untuk Azi & Bayu)
- **`src/data.js`**: Tambah tanaman baru, item baru, resep crafting, dialog NPC, dan palet warna kustomisasi cukup dari satu file data ini.
- **`src/meshes.js`**: Tempat seluruh bentuk 3D/2.5D karakter, pohon, batu, tanaman, dan bangunan. Azi bisa menaruh sprite PNG pixel art di `public/assets/` lalu dipasang memakai `THREE.TextureLoader()` atau `THREE.Sprite`.
