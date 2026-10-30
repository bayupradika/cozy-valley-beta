# 05 — Pembagian Peran, Task Board & Aturan Tim

## A. Pembagian Peran
| Area | Penanggung jawab utama | Pendukung |
|---|---|---|
| Programming (semua sistem) | **Bayu** | – |
| Pixel art: karakter, tile, UI, ikon | **Azi** | Bayu (spesifikasi teknis) |
| Audio (SFX/BGM) | _tentukan_ | |
| Game design (mekanik, balance) | **Bayu + Azi (diskusi, Bayu final soal teknis)** | |
| Story & dialog | _tentukan (saran: Azi tulis draf, Bayu implementasi)_ | |
| Level / map design (Tiled / TileMap) | Bayu susun, Azi gambar | |
| QA / testing | Bergantian (+ 3–5 teman) | |
| Marketing, sosmed, devlog | _tentukan (saran: Azi, karena visual)_ | |
| Legal, akun store, keuangan | _tentukan_ | |

**Aturan keputusan:** keputusan kreatif → disepakati berdua; jika buntu, pemegang area yang memutuskan; revisi besar hanya di awal milestone.

## B. Template Task (Kanban: Backlog → To Do → Doing → Review → Done)
```
[ID] Judul singkat
Tipe: Code / Art / Design / Audio / Bug
Owner:
Prioritas: P0 / P1 / P2
Estimasi: _ jam
Deskripsi & kriteria selesai:
Dependensi: (mis. butuh asset A001)
```
Tool gratis: **Trello**, **Notion**, atau **GitHub Projects**.

## C. Aturan Kerja
- **Version control:** Git + GitHub (private). Asset besar → Git LFS. Commit kecil & sering.
- **Branch:** `main` (stabil), `dev`, `feature/<nama>`.
- **Sync mingguan** 30–60 menit: demo build, review asset, rencana minggu depan.
- **Build mingguan:** selalu ada versi yang bisa dimainkan.
- **Backup:** repo + cloud drive untuk file sumber.
- **Dokumen hidup:** perubahan keputusan dicatat di `docs/decision-log.md`.

## D. Decision Log (template)
| Tanggal | Keputusan | Alasan | Diputuskan oleh |
|---|---|---|---|
| | Platform: PC dulu | | |

## E. Risiko & Mitigasi
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Scope terlalu besar | Game tidak selesai | Vertical slice dulu, daftar "Out of Scope" |
| Salah satu kehabisan waktu/motivasi | Proyek berhenti | Target kecil mingguan, jadwal realistis |
| Asset terlambat | Dev terhenti | Placeholder |
| Beda visi | Konflik | One-pager + pillar desain |
| Masalah kepemilikan/uang | Konflik | Kesepakatan tertulis bagi hasil & hak IP |

## F. Kesepakatan Tim (isi & tanda tangan informal)
- Bagi hasil (mis. 50/50?): _
- Kepemilikan IP: _
- Jam kerja per minggu masing-masing: Bayu _ jam · Azi _ jam
- Jika salah satu keluar: _
- Kredit di game: _
