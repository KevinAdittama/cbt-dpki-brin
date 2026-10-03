# PANDUAN DEPLOY BACKEND CBT DATA NOVA 5.0

**Untuk:** Panitia / Pengelola CBT DPKI BRIN
**Terakhir diperbarui:** 1 Oktober 2026
**Berkas backend:** `backend/google_sheets_webhook.js` (Versi 4.0)

---

## ✅ STATUS SAAT INI (1 Oktober 2026, 14.10 WIB)

Backend Versi 4.0 **SUDAH DI-DEPLOY** ke Apps Script dan **sudah terverifikasi live**:

- Deployment aktif: **Versi 2, 1 Okt 2026 pukul 14.10**
- ID Penerapan: `AKfycbyYaDjQM0yL76bRB_OkIcN9GRgbD_1zMBI1jFM9VgyTU9zWk2nq_BOgAhROYdX3fwdnsw`
- Uji `?action=server_status` → `exam_duration_seconds: 240` ✅
- Uji end-to-end browser → login dapat token sesi, submit dinilai server (skor 100), tersimpan ✅
- Uji anti-duplikat → NIP kedua ditolak (`allowed: false`) ✅
- Uji token palsu → ditolak ("Sesi ujian tidak dikenal") ✅

**Yang masih perlu dilakukan sebelum hari-H:** ubah `ENFORCE_SCHEDULE` menjadi `true`
lalu deploy ulang (lihat bagian "Checklist Hari-H" di bawah).

---

## ⚠️ BILA BACKEND BELUM DI-DEPLOY

Versi frontend terbaru **tidak akan bisa dipakai** sebelum backend di-deploy ulang.
Gejalanya: peserta menekan "Mulai Ujian" lalu muncul pesan
_"Server belum mengeluarkan sesi ujian…"_.

Backend harus diperbarui agar:

1. membuka **sesi ujian berbatas waktu** (server yang menentukan 4 menit),
2. menilai jawaban di server,
3. menolak percobaan kedua,
4. mencatat kelebihan waktu.

---

## Langkah Deploy (±3 menit)

### 1. Buka Apps Script

1. Buka spreadsheet **DATABASE_CBT_DATANOVA_BRIN** di Google Sheets.
2. Menu **Ekstensi** → **Apps Script**.
3. Editor Apps Script akan terbuka di tab baru.

### 2. Ganti seluruh kode

1. Di editor, klik area kode.
2. **Ctrl+A** (pilih semua kode lama).
3. **Delete**.
4. Buka berkas `backend/google_sheets_webhook.js` dari proyek ini, salin **seluruh isinya**.
5. Tempelkan ke editor Apps Script.
6. **Ctrl+S** (Simpan).

### 3. Terbitkan versi baru (JANGAN buat deployment baru)

1. Klik tombol **Deploy** (kanan atas) → **Manage deployments**.
2. Pada deployment yang ada, klik ikon **Pensil (✏️) Edit**.
3. Pada bagian **Version**, pilih **New version**.
4. Klik **Deploy**.

> **Kenapa "New version" dan bukan deployment baru?**
> Agar **URL webhook tetap sama**. Frontend sudah menunjuk ke URL lama.
> Kalau membuat deployment baru, URL berubah dan frontend harus diedit juga.

### 4. Pastikan akses

Pada konfigurasi deployment, pastikan:

- **Execute as:** `Me` (email Anda)
- **Who has access:** `Anyone`

### 5. Uji (opsional tapi disarankan)

Di editor Apps Script, pilih fungsi **`runSelfCheck`** pada dropdown, lalu klik **Run**.
Bila berhasil, log akan menampilkan:

```
SELF-CHECK PASS | skor=100 | sheet sesi=Sesi_Aktif | durasi=240 dtk
```

### 6. Verifikasi dari browser

Buka URL berikut (ganti `<URL_WEBHOOK>` dengan URL deployment Anda):

```
<URL_WEBHOOK>?action=server_status
```

Harus muncul balasan JSON seperti:

```json
{
  "status": "success",
  "server_time_iso": "2026-10-01T...",
  "exam_duration_seconds": 240,
  "schedule_enforced": false,
  "access": { "allowed": true, "mode": "trial" }
}
```

Kalau `exam_duration_seconds` **tidak muncul**, berarti deploy belum berhasil — ulangi langkah 3.

---

## Yang Baru di Versi 4.0

| Fitur | Keterangan |
|---|---|
| **Sesi berbatas waktu** | Server membuat token + deadline absolut saat peserta login. |
| **Timer tunduk server** | Klien hanya menampilkan; server yang menentukan waktu habis. |
| **Heartbeat** | Klien menyinkronkan sisa waktu ke server tiap 30 detik. |
| **Deteksi kelebihan waktu** | Submit melewati batas + toleransi ditandai di kolom Status_Integritas. |
| **Sheet `Sesi_Aktif`** | Dibuat otomatis; mencatat token, mulai, deadline, status. |

### Pengaturan di bagian atas berkas

```js
var EXAM_DURATION_SECONDS = 4 * 60;  // Durasi ujian (detik). Ubah di sini saja.
var SUBMIT_GRACE_SECONDS  = 90;      // Toleransi keterlambatan jaringan.
var ENFORCE_SCHEDULE      = false;   // true = gerbang jadwal aktif (hari-H).
```

| Pengaturan | Mode Uji Coba (sekarang) | Hari-H Pelatihan |
|---|---|---|
| `ENFORCE_SCHEDULE` | `false` | **`true`** |
| `EXAM_START_ISO` | (tidak dipakai) | `2026-10-14T02:00:00.000Z` |
| `EXAM_END_ISO` | (tidak dipakai) | `2026-10-14T02:30:00.000Z` |

> **Catatan waktu:** `02:00Z` = 09.00 WIB = 10.00 WITA = 11.00 WIT.
> Satu waktu absolut untuk seluruh Indonesia — tidak bergantung jam laptop peserta.

---

## Kolom Baru di Sheet `Hasil_Ujian`

Tidak ada kolom baru — tetap 15 kolom (A–O). Yang berubah hanya **isi** kolom K
(`Status_Integritas`), kini bisa memuat keterangan tambahan:

| Contoh isi | Arti |
|---|---|
| `SELESAI NORMAL - LULUS BERSIH` | Selesai wajar, tanpa pelanggaran |
| `PERINGATAN - 2 pelanggaran tercatat` | Ada pelanggaran tab/fullscreen |
| `GUGUR - 3 pelanggaran tercatat` | Didiskualifikasi |
| `SELESAI NORMAL - LULUS BERSIH \| MELEBIHI BATAS WAKTU +5 mnt 12 dtk` | Submit lewat batas |
| `SELESAI NORMAL - LULUS BERSIH \| Toleransi waktu 0 mnt 40 dtk` | Lewat sedikit, masih wajar |

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Peserta lihat "Server belum mengeluarkan sesi ujian" | Backend belum di-deploy | Ulangi langkah 3 |
| `?action=server_status` tidak menampilkan `exam_duration_seconds` | Versi lama masih aktif | Ulangi langkah 3, pastikan pilih **New version** |
| Peserta bisa mengerjakan 2× | Backend lama | Deploy ulang |
| Sheet `Sesi_Aktif` tidak muncul | Belum ada peserta login | Normal — dibuat otomatis saat login pertama |
| Peserta ditolak padahal belum ikut | NIP sama dengan data uji | Hapus baris uji di `Hasil_Ujian` |

---

## Checklist Hari-H (14 Oktober 2026)

- [ ] Backend versi 4.0 sudah di-deploy
- [ ] `?action=server_status` menampilkan `exam_duration_seconds: 240`
- [ ] `ENFORCE_SCHEDULE` diubah menjadi `true` lalu deploy ulang
- [ ] Baris data uji (`TEST-*`) dihapus dari `Hasil_Ujian`
- [ ] Uji coba 1 peserta dari setiap zona waktu (WIB/WITA/WIT)
- [ ] Pastikan sheet `Sesi_Aktif` terisi saat peserta login
- [ ] Siapkan 1 laptop cadangan + hotspot
