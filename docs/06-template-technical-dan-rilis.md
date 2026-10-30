# 06 — Template Technical Design & Rilis (untuk Bayu)

## A. Keputusan Teknis
| Item | Pilihan | Alasan |
|---|---|---|
| Engine | **Godot 4** (disarankan) / Unity | Gratis, ringan, 2D bagus, ekspor PC/Android/Web |
| Bahasa | GDScript / C# | |
| Resolusi & scaling | pixel-perfect, integer scaling | |
| Input | Abstraksi lewat Input Map (keyboard/gamepad/touch) | memudahkan porting |
| Data game | JSON / Godot Resource (`.tres`) untuk item, crop, NPC | mudah diedit tanpa coding |
| Save system | JSON per slot, versi save | |
| Map | TileMap + Tiled/editor bawaan | |

## B. Arsitektur Sistem (garis besar)
```
GameManager (state global, hari, waktu)
 ├─ TimeSystem        ├─ SaveSystem
 ├─ Player (movement, tools, energi)
 ├─ InventorySystem   ├─ ItemDatabase
 ├─ FarmSystem (tile state, crops)
 ├─ NPCManager (jadwal, dialog, hearts)
 ├─ QuestSystem       ├─ ShopSystem
 └─ UIManager         └─ AudioManager
```
Prinsip: **data-driven** (item/crop/NPC di file data), **event/signal** antar sistem, hindari hardcode.

## C. Struktur Folder Proyek
```
game/
  docs/
  project/           (project engine)
    scenes/ scripts/ data/ assets/ ui/ audio/
  builds/            (di-ignore git)
```

## D. Aturan Kode
- Penamaan konsisten (snake_case GDScript), komentar untuk logika rumit.
- Satu sistem = satu skrip/scene mandiri.
- Tidak ada "magic number": taruh di file konfigurasi.

## E. Checklist Rilis per Platform
| Platform | Biaya | Catatan |
|---|---|---|
| **itch.io (PC/Web demo)** | Gratis | Cocok untuk demo & feedback awal |
| **Steam** | US$100 per game (recoupable) | Perlu halaman store, trailer, capsule art; review ±1–5 hari; wishlist penting |
| **Google Play** | US$25 sekali | Perlu UI touch, performa, closed testing 12+ tester/14 hari (akun baru personal) |
| **App Store** | US$99/tahun | Perlu Mac/Xcode, review ketat |
| **Web** | Hosting murah/gratis | Ukuran file & performa terbatas, monetisasi sulit |

## F. QA Checklist Per Build
☐ Game bisa mulai & keluar ☐ Save/load OK ☐ Tidak crash 30 menit main ☐ FPS stabil ☐ Semua P0 jalan ☐ Tidak ada asset placeholder pada build rilis

## G. Template Devlog / Changelog
```
Versi 0.x — tanggal
+ Ditambah:
~ Diubah:
- Diperbaiki:
Masalah diketahui:
Target minggu depan:
```
