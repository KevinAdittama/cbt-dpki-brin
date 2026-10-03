# STATUS PEKERJAAN — Portal CBT DATA NOVA 5.0 (DPKI BRIN)

**Diperbarui:** 3 Oktober 2026, 19:40 WIB
**Metode verifikasi:** audit langsung ke kode + uji live ke backend (tanpa browser)

---

## 1. SUDAH SELESAI (terverifikasi)

### A. 22 Perbaikan Prioritas 1 — SEMUA ADA DI KODE

| Kelompok | Item | Bukti verifikasi |
|---|---|---|
| Anti-blokir | #1 auto-submit tanpa alert | ✅ tidak ada `alert()` di alur timer |
| Sesi | #2 celah refresh tertutup | ✅ `findActiveSessionFor` pakai sesi lama |
| Sesi | #3 pemulihan jawaban | ✅ `bacaSesiLokal()` + SAVE_PROGRESS/RESUME |
| Integritas | #4 strike-3 tanpa alert | ✅ modal non-blocking |
| Validasi | #5 NIP/NIK 16/18 digit | ✅ `validateNipNik()` |
| Validasi | #6 nama & unit kerja | ✅ `validateIdentityText()` (min 3 char) |
| Otoritas server | #7 kode verifikasi server | ✅ `BRIN-DPKI-CBT-YYYYMMDD-XXXXXX` |
| Otoritas server | #8 durasi dihitung server | ✅ klien kirim "999 mnt" → server balas "0 mnt 4 dtk" |
| UX | #11 peringatan tutup tab | ✅ `beforeunload` |
| Ketahanan | #12 Tailwind lokal | ✅ `assets/js/tailwindcss.min.js` (407 KB) + fallback |
| UX | #13 Ctrl+V di field input | ✅ dikecualikan khusus INPUT/TEXTAREA |
| Keamanan | #14 DevTools = strike | ✅ F12/Ctrl+Shift+I → `INSPECT_ELEMENT_ATTEMPT` |
| Kejujuran data | #15 IP jujur | ✅ fallback "Tidak Terdeteksi" |
| Kebersihan | #16 komentar QR palsu | ✅ dihapus |
| Konsistensi | #17 label CBT V4 | ✅ |
| Fullscreen | #18 fullscreen otomatis | ✅ dipanggil sebelum `await` |
| Watermark | #19 watermark permanen | ✅ `position: fixed` di luar `#screenExam` |
| Hasil | #20 proteksi layar hasil | ✅ blur + bersihkan clipboard |
| Timer | #SYNC-TIMER | ✅ selisih 16 dtk → 1 dtk (kompensasi RTT/2) |
| Sesi | #READONLY-CHECK | ✅ GET check_nip tidak buat sesi |
| Logo | #LOGO | ✅ logo BRIN merah-abu 4156×1601 |
| Database | #SESI | ✅ Sheet1 & Sesi_Aktif = 1 baris header |

### B. Pengujian yang sudah lulus

| Uji | Hasil | Bukti |
|---|---|---|
| Backend (4 suite) | ✅ 4/4 LULUS | `tests/hasil/HASIL_UJI_BACKEND_V43.md` |
| Browser (9 skenario) | ✅ 9/9 LULUS | `tests/hasil/HASIL_UJI_BROWSER_TAHAP2.md` |
| Beban 40 peserta serentak | ✅ 40/40 (100%) | `tests/hasil/HASIL_UJI_BEBAN.md` |
| Anti-duplikat lintas sesi (L8) | ✅ LULUS (3 Okt 19:36) | Pre-Test selesai → Post-Test tetap boleh |

---

## 2. BELUM SELESAI / BELUM DIPERBAIKI

### 🔴 KRITIS — WAJIB sebelum hari-H

| # | Masalah | Risiko | Perbaikan |
|---|---|---|---|
| **C1** | **Endpoint debug masih hidup di backend produksi** (`?action=clear_database_testing_secret_key_brin` dan `?action=list_all_sheets`) | **SIAPAPUN yang tahu URL bisa MENGHAPUS SELURUH DATABASE NILAI.** Tidak perlu login. | Hapus kedua endpoint dari `backend/google_sheets_webhook.js`, lalu deploy ulang sebagai **Versi baru** |

> Terbukti: `curl "...exec?action=clear_database_testing_secret_key_brin"` → `DATABASE BERHASIL DIBERSIHKAN!`

### 🟡 PRIORITAS 1 — blokir pelaksanaan (butuh Kevin)

| # | Tugas | Kenapa | Estimasi |
|---|---|---|---|
| **L1** | Hosting HTTPS | Belum ada hosting resmi BRIN. Tanpa ini peserta tidak bisa akses. | 30–60 mnt |
| **L2** | `ENFORCE_SCHEDULE = true` + tanggal final | Sekarang `false` (mode uji) — ujian bisa dibuka kapan saja | 15 mnt + deploy |
| **L4** | Uji lintas perangkat (HP/tablet/Edge/Firefox) | Peserta bisa pakai HP — perlu pastikan responsif & fullscreen jalan | 30 mnt |

### 🟡 PRIORITAS 2 — penting (bisa saya kerjakan sekarang)

| # | Tugas | Estimasi |
|---|---|---|
| **L5** | Backup final paket siap-kirim (folder bertanggal) | 10 mnt |
| **L6** | Panduan panitia 1 halaman (cara monitor Sheets, reset peserta, tangani gagal submit) | 20 mnt |
| **L7** | Dokumen hasil uji untuk mentor (PDF) | 20 mnt |

### 🟢 PRIORITAS 3 — penyempurnaan opsional

| # | Tugas |
|---|---|
| L9 | Halaman "Terima kasih" / auto-close setelah tanda terima |
| L10 | Ekspor rekap hasil ke Excel otomatis |
| L11 | Mode latihan (tanpa catat nilai) untuk gladi bersih |
| L12 | Notifikasi Telegram ke panitia saat ada submit baru |

---

## 3. CATATAN OPERASIONAL HARI-H

1. **Deploy backend berikutnya:** pilih **"Versi baru"** di *Kelola deployment* — JANGAN "Deployment baru", agar URL `/exec` tidak berubah.
2. **Login bertahap** (kelompok 5–10 orang), jangan serentak — CHECK_NIP bisa lambat saat 25+ serentak (konsekuensi Apps Script, bukan bug).
3. **Batas aman:** ~40 peserta bersamaan dengan login bertahap.
4. **Jangan uji dengan Chrome kerja Kevin** — pakai Chrome terisolasi (profil + port debug 9333).
5. **Kuota Apps Script** akun `akuntumbal7662@gmail.com` terbatas per hari.
6. **Kolom P (`Kode_Verifikasi`)** otomatis muncul saat submit pertama setelah deploy v4.3.

---

## 4. URUTAN YANG SAYA SARANKAN

1. **C1** — hapus endpoint debug (KRITIS, 10 menit) ← saya bisa kerjakan sekarang
2. **L5 + L6 + L7** — backup, panduan panitia, dokumen mentor (bisa sekarang, tanpa mentor)
3. **L1** — hosting (butuh keputusan Kevin: Netlify / GitHub Pages / Cloudflare)
4. **L4** — uji lintas perangkat (butuh HP Kevin)
5. **L2** — nyalakan jadwal (tunggu tanggal final dari mentor)
