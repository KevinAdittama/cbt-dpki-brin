# RENCANA LANJUTAN — Portal CBT DATA NOVA 5.0 (DPKI BRIN)

**Dibuat:** 3 Oktober 2026, 01:40 WIB
**Status saat ini:** ✅ Semua 22 perbaikan selesai & terverifikasi (kode + backend v4.3 live)
**Yang belum ada:** Hosting HTTPS, jadwal final, uji coba beban, uji lintas perangkat

---

## 🔴 PRIORITAS 1 — WAJIB SEBELUM HARI-H (blokir pelaksanaan)

| # | Tugas | Kenapa penting | Estimasi | Butuh siapa |
|---|-------|----------------|----------|-------------|
| **L1** | **Siapkan hosting HTTPS** | Belum ada hosting resmi BRIN. Tanpa ini, peserta tidak bisa akses web. Wajib HTTPS (bukan `file://` / IP lokal). | 30–60 mnt | Kevin (akun sendiri) |
| **L2** | **Set `ENFORCE_SCHEDULE = true` + tanggal final** | Gerbang jadwal sekarang `false` (mode uji). Harus dinyalakan agar ujian hanya bisa diakses pada jam resmi. | 15 mnt + deploy | Kevin (tunggu tanggal mentor) |
| **L3** | ~~Uji coba beban (load test) beberapa peserta bersamaan~~ | ✅ **SELESAI 3 Okt** — menemukan & memperbaiki masalah kritis (25 peserta serentak hanya 32% → sekarang **100%**). Lihat `tests/hasil/HASIL_UJI_BEBAN.md` | — | Agent (tanpa browser) |
| **L4** | **Uji lintas perangkat & browser** | Peserta bisa pakai HP/tablet/Edge/Firefox. Perlu pastikan tampilan & fungsi jalan (responsif, fullscreen, watermark). | 30 mnt | Kevin + Agent |

---

## 🟡 PRIORITAS 2 — PENTING (kualitas & keamanan operasional)

| # | Tugas | Kenapa penting | Estimasi |
|---|-------|----------------|----------|
| **L5** | **Backup final paket siap-kirim** | Arsipkan `index.html` + `backend/*.js` + aset ke satu folder bertanggal (mis. `FINAL_SIAP_KIRIM_2026-10-14/`). | 10 mnt |
| **L6** | **Panduan panitia (1 halaman)** | Cara buka/monitor Google Sheets, cara reset peserta, cara tangani peserta gagal submit. | 20 mnt |
| **L7** | **Dokumen hasil uji untuk mentor** | Rangkum 4/4 + 9/9 uji + bukti perbaikan #7/#8 dalam 1 dokumen rapi (PDF). | 20 mnt |
| **L8** | **Verifikasi email/NIP duplikat lintas sesi** | Pastikan peserta yang ikut Pre-Test bisa ikut Post-Test (anti-duplikat saat ini per-sesi — perlu dipastikan tidak salah blokir). | 15 mnt |

---

## 🟢 PRIORITAS 3 — PENYEMPURNAAN (jika ada waktu)

| # | Tugas | Estimasi |
|---|-------|----------|
| **L9** | Halaman "Terima kasih" / auto-close setelah tanda terima | 15 mnt |
| **L10** | Ekspor rekap hasil ke Excel otomatis (skrip dari Sheets) | 30 mnt |
| **L11** | Mode latihan (tanpa catat nilai) untuk gladi bersih | 20 mnt |
| **L12** | Notifikasi Telegram ke panitia saat ada submit baru | 30 mnt |

---

## 📋 REKOMENDASI URUTAN (jawaban singkat)

**Yang paling masuk akal dikerjakan SEKARANG (malam ini, tanpa perlu mentor):**

1. ~~**L3 — Uji coba beban**~~ ✅ **SELESAI** (25 peserta serentak 32% → 100%; backend v4.4 live)
2. **L5 — Backup final** ✅ cepat, aman, bisa saya lakukan sekarang.
3. **L6 + L7 — Panduan panitia & dokumen mentor** ✅ bisa saya siapkan sekarang.
4. **L8 — Verifikasi anti-duplikat lintas sesi (Pre vs Post-Test)** ✅ bisa saya uji sekarang.

**Yang BUTUH keputusan/aksi Kevin dulu:**
- **L1 (hosting)** → butuh akun & pilihan platform (Netlify / GitHub Pages / Cloudflare). Saya bisa pandu langkah demi langkah, atau kerjakan via kontrol desktop kalau Kevin sudah login.
- **L2 (jadwal)** → tunggu tanggal final dari mentor.

**Yang perlu Kevin hadir (uji di HP-nya sendiri):**
- **L4 (lintas perangkat)** → Kevin buka dari HP, saya verifikasi via CDP kalau diizinkan.

---

## ❓ Keputusan yang dibutuhkan

1. **Hosting mana?** Netlify Drop (paling cepat, drag-and-drop) / GitHub Pages / Cloudflare Pages
2. **Kapan jadwal resmi?** (untuk L2)
3. **Mau saya kerjakan L3 + L5 + L6 + L7 sekarang?**

---

## 📌 Catatan Teknis Penting (jangan lupa saat hari-H)

- **Deploy backend berikutnya:** SELALU pilih **"Versi baru"** di *Kelola deployment* (JANGAN "Deployment baru") agar URL `/exec` tidak berubah → kalau berubah, frontend harus di-update.
- **Cek kuota Apps Script:** akun `akuntumbal7662@gmail.com` — kuota harian trigger/runtime terbatas. Untuk 1 sesi ujian singkat biasanya cukup, tapi uji beban (L3) akan memberi angka pasti.
- **Jangan uji dengan browser yang sama dengan Chrome kerja Kevin** → pakai Chrome terisolasi (profil + port debug) seperti yang sudah terbukti aman.
- **Kolom P (`Kode_Verifikasi`)** hanya muncul otomatis saat submit pertama setelah deploy v4.3. Sudah diverifikasi ada.
