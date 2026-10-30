# 03 — Template Gameplay & Core Mechanics

## A. Core Loop (isi dulu, ini jantung game)
```
Bangun pagi → Urus farm (siram/panen) → Eksplorasi / kumpulkan resource
→ Jual / berinteraksi dengan NPC → Upgrade / beli → Tidur (simpan, hari baru)
```
**Loop 30 detik:** _tindakan kecil (tanam, siram, tebang)_
**Loop 1 hari:** _..._
**Loop 1 musim:** _..._
**Loop jangka panjang:** _..._

## B. Daftar Mekanik (prioritas MoSCoW)
| # | Mekanik | Prioritas | Deskripsi | Aturan / angka | Asset dibutuhkan | Status |
|---|---|---|---|---|---|---|
| 1 | Gerak 4 arah + animasi | **Must** | | speed: _ px/s | sprite walk 4 arah | ☐ |
| 2 | Waktu & hari (jam, siang/malam) | **Must** | 1 menit nyata = _ menit game | hari 06:00–02:00 | UI jam, overlay malam | ☐ |
| 3 | Inventory & hotbar | **Must** | slot: _ | stack: _ | ikon item, UI | ☐ |
| 4 | Tools (cangkul, siram, kapak, pickaxe, sabit) | **Must** | | energi per pakai | sprite aksi | ☐ |
| 5 | Farming (tanam, siram, tumbuh, panen) | **Must** | | hari tumbuh per tanaman | tahap tumbuh tiap crop | ☐ |
| 6 | Energi / stamina | **Must** | max: _ | | bar energi | ☐ |
| 7 | Jual-beli (shop, shipping bin) | **Must** | | harga | UI shop | ☐ |
| 8 | Save / Load | **Must** | auto-save saat tidur | | – | ☐ |
| 9 | Musim & cuaca | Should | 4 musim × _ hari | hujan = auto siram | tileset per musim | ☐ |
| 10 | NPC + dialog + jadwal | Should | | | sprite, portrait | ☐ |
| 11 | Hubungan (hearts) & hadiah | Should | | +poin hadiah | | ☐ |
| 12 | Crafting | Should | | resep | | ☐ |
| 13 | Quest / Goal | Should | | | | ☐ |
| 14 | Hewan ternak | Could | | | | ☐ |
| 15 | Mancing | Could | minigame | | | ☐ |
| 16 | Tambang / combat | Could | | | | ☐ |
| 17 | Pernikahan / multiplayer | Won't (v1) | | | | – |

## C. Template Detail Mekanik (salin per mekanik)
```
Nama mekanik:
Tujuan (kenapa menyenangkan?):
Input pemain (keyboard / gamepad / touch):
Aturan & rumus:
Kondisi sukses / gagal:
Edge case:
Data yang disimpan (save):
UI terkait:
Asset terkait:
Kriteria selesai (Definition of Done):
```

## D. Template Data Item
| ID | Nama | Tipe | Stack | Harga beli | Harga jual | Deskripsi | Ikon |
|---|---|---|---|---|---|---|---|
| crop_turnip | Lobak | Hasil panen | 99 | – | 35 | | |

## E. Template Data Tanaman
| ID | Musim | Hari tumbuh | Tahap visual | Regrow? | Harga benih | Harga jual |
|---|---|---|---|---|---|---|
| turnip | Semi | 4 | 5 sprite | tidak | 20 | 35 |

## F. Ekonomi & Progresi
- Uang awal: _ · Pendapatan hari 1: _ · Hari 7: _ · Akhir musim 1: _
- Upgrade tools: _ tier (basic → tembaga → besi)
- Unlock area: _ (syarat: uang / quest / hari)
- Rumus: harga jual = harga benih × _ (≈ margin)

## G. Kontrol
| Aksi | Keyboard | Gamepad | Touch (jika mobile) |
|---|---|---|---|
| Gerak | WASD | Stick kiri | Joystick virtual |
| Pakai tool | J / Klik kiri | A | Tap |
| Interaksi | E | X | Tap objek |
| Inventory | I / Tab | Y | Tombol |

## H. UI/UX Screen List
HUD · Inventory · Shop · Dialog box · Pause/Menu · Save slot · Map · Quest log · Settings
