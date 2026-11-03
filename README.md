# 🌱 Cozy Valley 2D Pixel Art — Beta Template (Bayu & Azi)

Template game **Farming & Life Sim 2D Top-Down (Stardew Valley Style)** berbasis **Three.js (`OrthographicCamera` + `NearestFilter` Pixel Art) + Vite**. Siap dimainkan langsung tanpa asset eksternal, dan sudah mendukung **Auto-Swap PNG** begitu Azi menaruh file gambar di `public/assets/`.

## ✨ Fitur Beta 2D
- **Kamera 2D Top-Down Murni + Y-Sorting**: Perspektif persis *Stardew Valley* — karakter otomatis berada di belakang pohon/rumah saat jalan lewat utara, dan tampil di depan saat jalan di selatannya.
- **Sprite Pixel Art 4 Arah + Kustomisasi (`P`)**: Karakter 16x24 pixel art menghadap Atas/Bawah/Kiri/Kanan lengkap animasi langkah kaki, ayunan alat, serta kustomisasi warna kulit, baju, celana, dan topi/rambut.
- **3 NPC Interaktif (`E`)**: Pak Budi (Toko Bibit), Mbak Sari (Penambang), dan Kek Wiryo (Tetua Desa).
- **Farming, Mining & Tebang Kayu**: Cangkul rumput (`1`), siram (`2`), beliung batu/tembaga/emas di bukit timur laut (`3`), kapak pohon (`4`), tanam bibit (`5`/`6`), panen & jual di *Shipping Bin*.
- **Inventory & Crafting (`I` / `C`)**: Buat **Pagar Kayu**, **Jalan Batu**, **Lentera Taman** (berpendar hangat saat malam), **Sprinkler Otomatis 3x3**, dan **Sup Kebun**.
- **Auto-Override Asset PNG untuk Azi**: Lihat daftar nama file di [`public/assets/PANDUAN_ASSET_AZI.md`](./public/assets/PANDUAN_ASSET_AZI.md).

## 📚 Dokumen Referensi Pengembangan
- **Google Docs Utama (Bayu & Azi):** https://docs.google.com/document/d/1hZQqSvziRkJN5OSQjgMbAjU09b6Flq1LRzu64obnsUo/edit?usp=sharing
- **Daftar Link & Referensi Tim:** [`docs/00-referensi-dan-link.md`](./docs/00-referensi-dan-link.md)

## 🚀 Cara Menjalankan Lokal
```bash
npm install
npm run dev
```
