# PANDUAN PANITIA — CBT DATA NOVA 5.0 (DPKI BRIN)

**Untuk:** Panitia/Pengawas ujian Pre-Test & Post-Test
**Tanggal ujian:** 14 Oktober 2026, 09.00–09.30 WIB
**Durasi pengerjaan:** 4 menit per peserta
**Jumlah soal:** 10 butir (bank soal sama untuk Pre-Test & Post-Test, urutan diacak per peserta)

---

## 1. SEBELUM UJIAN DIMULAI (H-1 dan pagi hari-H)

### 1.1 Cek backend masih hidup
Buka URL berikut di browser (ganti `[URL_EXEC]` dengan URL deployment yang berlaku):

```
[URL_EXEC]
```

Harus muncul tulisan:
> `SERVER DATABASE CBT DATA NOVA 5.0 (BRIN) AKTIF!`

Jika **tidak muncul** → backend mati / URL berubah. Hubungi Kevin.

### 1.2 Pastikan database kosong (bersih dari data uji)
Buka spreadsheet **DATABASE_CBT_DATANOVA_BRIN** → pastikan:
- Tab `Sheet1` → hanya baris 1 (judul kolom), tidak ada data peserta
- Tab `Sesi_Aktif` → hanya baris 1 (judul kolom)

Jika masih ada data uji → lihat **Bagian 4: Reset Data** di bawah.

### 1.3 Pastikan jadwal sudah dinyalakan
Backend harus sudah di-set `ENFORCE_SCHEDULE = true` dengan tanggal 14 Oktober 2026.
Cek: buka `[URL_EXEC]?action=server_status` → perhatikan `schedule_enforced` harus `true`.

### 1.4 Cek kuota Apps Script
- Login akun `akuntumbal7662@gmail.com`
- Buka https://script.google.com → proyek CBT → menu **Eksekusi**
- Pastikan tidak ada lonjakan error. Kuota harian akun gratis terbatas; **jangan** jalankan beberapa sesi besar berturut-turut tanpa jeda.

---

## 2. SAAT UJIAN BERLANGSUNG

### 2.1 Cara peserta masuk
1. Peserta buka link ujian (URL hosting) di browser (Chrome/Edge lebih disarankan)
2. Isi **Nama Lengkap**, **NIP atau NIK** (16 digit NIK / 18 digit NIP, angka saja), dan **Unit Kerja**
3. Klik **Mulai Ujian** → layar otomatis fullscreen, timer 4 menit mulai berjalan

### 2.2 ⚠️ PENTING — Login bertahap, jangan serentak
**Minta peserta masuk berkelompok (5–10 orang sekaligus), jangan semua serentak.**

Alasan: server Apps Script memproses antrean. Hasil uji beban:
- 5 orang serentak → lancar
- 25 orang serentak → CHECK_NIP bisa lambat (~44 detik), tapi **semua tetap berhasil** (100%)
- 40 orang serentak → berhasil 100%, tapi latensi naik (~73 detik)

**Batas aman: ~40 peserta bersamaan dengan login bertahap.**

### 2.3 Apa yang terjadi kalau peserta melakukan pelanggaran
| Pelanggaran | Deteksi | Akibat |
|---|---|---|
| Pindah tab / Alt+Tab / window blur | Otomatis (debounce 2,5 detik) | Strike +1 |
| Tekan PrintScreen | Otomatis | Strike +1, clipboard dibersihkan |
| Buka Developer Tools (F12) | Otomatis | Strike +1 |
| Keluar dari fullscreen | Otomatis | Strike +1 |

**3 strike → peserta otomatis didiskualifikasi.**

### 2.4 Memantau peserta secara langsung
Buka spreadsheet → tab `Sesi_Aktif`. Kolom yang berguna:

| Kolom | Isi |
|---|---|
| A | Token sesi |
| B | NIP |
| C | Nama |
| D | Sesi (pre-test / post-test) |
| F | **Deadline** (kapan waktu peserta habis) |
| H | Status (`AKTIF` / `SELESAI`) |
| J | Jawaban tersimpan (JSON) |

Peserta yang sedang mengerjakan akan terlihat di sini.

---

## 3. SETELAH UJIAN

### 3.1 Lihat hasil
Buka spreadsheet → tab **`Hasil_Ujian`** (Sheet1). Kolom A–P:

| Kol | Isi |
|---|---|
| A | Timestamp submit |
| B | NIP |
| C | Nama Lengkap |
| D | Unit Kerja |
| E | Sesi Ujian |
| F | **Skor Akhir** (0–100) |
| G | Jumlah Benar |
| H | Jumlah Salah |
| I | Durasi Pengerjaan (dihitung server) |
| J | Pelanggaran Tab |
| K | Status Integritas |
| L | IP Address |
| M | Sistem Operasi |
| N | Peramban Browser |
| O | Resolusi Layar |
| P | Kode Verifikasi (`BRIN-DPKI-CBT-YYYYMMDD-XXXXXX`) |

### 3.2 Arti Status Integritas
| Status | Arti |
|---|---|
| `LULUS BERSIH` | Tidak ada pelanggaran, submit dalam waktu |
| `MELEBIHI BATAS WAKTU +X mnt Y dtk` | Submit melewati deadline (masih diterima, diberi tanda) |
| `DISKUALIFIKASI` | 3× pelanggaran |

### 3.3 Ekspor hasil ke Excel
1. Buka spreadsheet → tab `Hasil_Ujian`
2. **File → Download → Microsoft Excel (.xlsx)**
3. Simpan sebagai arsip resmi kegiatan

### 3.4 Verifikasi keaslian kode
Kode verifikasi dibuat **oleh server** (bukan browser peserta), format `BRIN-DPKI-CBT-YYYYMMDD-XXXXXX`.
Kode ini tercatat di kolom P dan hanya bisa dihasilkan oleh backend resmi → bukti hasil tidak dipalsukan.

---

## 4. RESET DATA (PENTING — HATI-HATI)

### Kapan perlu reset?
- Sebelum ujian sesungguhnya (membersihkan data uji coba)
- Setelah gladi bersih

### Cara reset yang BENAR (via editor Apps Script)
1. Buka https://script.google.com → proyek CBT
2. Di dropdown fungsi (dekat tombol **Jalankan**), pilih `clearDatabaseForTesting`
3. Klik **Jalankan** → tunggu sampai muncul `DATABASE BERHASIL DIBERSIHKAN!` di log
4. Cek spreadsheet → `Sheet1` dan `Sesi_Aktif` harus tinggal 1 baris header

### 🔴 JANGAN reset lewat URL/HTTP
Endpoint HTTP untuk reset sudah **sengaja dihapus** demi keamanan. Siapa pun yang punya URL `/exec` bisa menghapus seluruh nilai peserta jika endpoint itu ada. **Reset hanya boleh lewat editor Apps Script.**

### Cara reset manual (alternatif, lewat Google Sheets)
1. Buka tab `Hasil_Ujian` → klik sel A2
2. Tekan `Ctrl + Shift + End` → semua data terpilih
3. Tekan `Delete`
4. Ulangi untuk tab `Sesi_Aktif`
5. **Pastikan baris 1 (judul kolom) TIDAK ikut terhapus**

---

## 5. PENANGANAN MASALAH

| Masalah | Penyebab | Solusi |
|---|---|---|
| Peserta tidak bisa mulai: "NIP sudah pernah menyelesaikan sesi ini" | NIP sudah submit untuk sesi yang sama | Cek kolom B di `Hasil_Ujian`. Jika ini peserta sah yang perlu mengulang → hapus barisnya (lihat Bagian 4) |
| "Server sibuk. Silakan coba lagi" | Terlalu banyak request serentak | Tunggu — sistem sudah auto-retry otomatis. Suruh peserta login bertahap |
| Peserta bilang jawaban hilang setelah refresh | Tidak terjadi (sudah diperbaiki) | Minta refresh lagi — sistem memulihkan jawaban & sisa waktu otomatis |
| Peserta kehabisan waktu | Timer 4 menit habis | Ujian tersubmit otomatis, tidak perlu tindakan |
| Peserta tiba-tiba didiskualifikasi | 3× pelanggaran (pindah tab/screenshot/F12) | Sesuai aturan. Catat nama di berita acara |
| Layar tidak fullscreen | Browser memblokir, atau peserta keluar fullscreen | Minta klik Mulai Ujian lagi; jangan keluar fullscreen |
| Hasil tidak masuk ke Sheets | Backend mati / URL salah | Cek Bagian 1.1, hubungi Kevin |

---

## 6. KONTAK DARURAT

| Peran | Nama | Kontak |
|---|---|---|
| Teknis / pembuat sistem | Kevin | _isi_ |
| Koordinator kegiatan | _isi_ | _isi_ |

---

## 7. CHECKLIST HARI-H (cetak & centang)

**Sebelum ujian:**
- [ ] Backend hidup (cek URL → "SERVER ... AKTIF!")
- [ ] Database bersih (Sheet1 & Sesi_Aktif hanya header)
- [ ] `schedule_enforced = true`
- [ ] Kuota Apps Script cukup
- [ ] Link ujian diuji dari 1 HP + 1 laptop
- [ ] Peserta sudah tahu: NIP/NIK angka saja, login bertahap, jangan pindah tab

**Selama ujian:**
- [ ] Peserta login bertahap (5–10 orang)
- [ ] Pantau tab `Sesi_Aktif`
- [ ] Catat peserta yang didiskualifikasi

**Setelah ujian:**
- [ ] Semua peserta muncul di `Hasil_Ujian`
- [ ] Ekspor ke .xlsx
- [ ] Verifikasi jumlah peserta = jumlah kehadiran
- [ ] Arsipkan hasil
