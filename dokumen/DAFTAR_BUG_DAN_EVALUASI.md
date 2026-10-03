# DAFTAR BUG & EVALUASI — Portal CBT DATA NOVA 5.0 (DPKI BRIN)

Status: **✅ SELURUHNYA SUDAH DIPERBAIKI & TERVERIFIKASI (3 Okt 2026)** — lihat `CATATAN_LANJUTAN.md`
Disusun: 1 Oktober 2026 · Diperbarui: 3 Oktober 2026
Basis kode: `index.html` + `backend/google_sheets_webhook.js` v4.3 (live)

> **Catatan status per 3 Okt 2026:** 22/22 item selesai. Backend v4.3 sudah live
> (durasi & kode verifikasi dihitung server). Uji backend 4/4 LULUS, uji browser 9/9 LULUS.
> Daftar di bawah dipertahankan sebagai **rekam jejak audit** (bukti temuan & alasan perbaikan).

---

## RINGKASAN PRIORITAS

| # | Temuan | Kategori | Severity |
|---|--------|----------|----------|
| 1 | Auto-submit terblokir `alert()` saat waktu habis | Bug fungsional | **KRITIS** |
| 2 | Refresh halaman = dapat 4 menit BARU (unlimited time) | Celah keamanan | **KRITIS** |
| 3 | Jawaban hilang total saat refresh (tidak ada restore) | Bug fungsional | **TINGGI** |
| 4 | Strike ke-3 juga terblokir `alert()` | Bug fungsional | **TINGGI** |
| 5 | NIP tidak divalidasi angka (permintaan user) | Bug input | **TINGGI** |
| 6 | Logo di tanda terima cuma kotak teks, bukan logo | Branding | **SEDANG** |
| 7 | File logo BRIN pecah/pixelated + background putih | Branding | **SEDANG** |
| 8 | Kode verifikasi tidak diverifikasi server | Keamanan | **SEDANG** |
| 9 | Label "CBT V2" padahal sistem v4.0 | Kosmetik | **RENDAH** |
| 10 | Durasi & alasan selesai ditentukan klien (bisa dipalsukan) | Keamanan | **SEDANG** |
| 11 | Tidak ada peringatan saat menutup/refresh tab | UX | **SEDANG** |
| 12 | Tailwind via CDN (butuh internet, bisa diblokir) | Ketahanan | **SEDANG** |
| 13 | IP & perangkat tidak akurat / tersimpan placeholder | Data | **RENDAH** |
| 14 | Sisa komentar "SIMULATED QR CODE" | Kosmetik | **RENDAH** |
| 15 | Blokir Ctrl+V bikin peserta tak bisa paste NIP | UX | **RENDAH** |
| 16 | Buka DevTools dicatat tapi tidak dihitung strike | Konsistensi | **RENDAH** |
| 18 | Fullscreen tidak otomatis aktif (dipanggil setelah `await`) | Bug fungsional | **TINGGI** |
| 19 | Watermark HILANG di layar hasil + layar lain | Bug fungsional | **TINGGI** |
| 20 | Screenshot (PrintScreen) tetap bisa di layar hasil | Keamanan | **SEDANG** |

---

## A. BUG FUNGSIONAL

### 1. [KRITIS] Auto-submit terblokir `alert()` — TERBUKTI SAAT UJI REALTIME
**Lokasi:** `index.html` baris 1273–1276 (fungsi `startTimer` → `render`)

```js
if (examState.timeLeft <= 0) {
  ...
  alert("Waktu ujian telah habis! Sistem akan mengumpulkan jawaban Anda secara otomatis.");
  finishExam("SELESAI (Waktu Habis)");   // <-- baru jalan SETELAH tombol OK diklik
}
```

**Masalah:** `alert()` memblokir seluruh JavaScript. `finishExam()` tidak pernah jalan sampai peserta menekan OK. Kalau peserta pergi/menutup layar/menekan tombol lain, jawaban **tidak terkirim** padahal waktu sudah habis.

**Bukti nyata (uji 1 Okt 2026, 14:35):**
- Durasi tercatat **5 mnt 44 dtk** padahal batas **4 menit**
- Status integritas: `MELEBIHI BATAS WAKTU +1 mnt 51 dtk`
- Padahal peserta mengerjakan dengan benar — kesalahan sistem, bukan peserta.

**Dampak:** Peserta bisa tercatat "melebihi batas waktu" atau bahkan **kehilangan jawaban** hanya karena tidak sempat klik OK.

**Usulan perbaikan:** Hapus `alert()`. Panggil `finishExam()` langsung, tampilkan notifikasi non-blocking (banner/modal internal), submit di background.

---

### 2. [KRITIS — CELAH] Refresh halaman setelah waktu habis = dapat 4 menit BARU
**Lokasi:** backend `google_sheets_webhook.js` baris 288–330 (`startSession`)

```js
if (existing && new Date(existing.deadline).getTime() > now.getTime()) {
  // pakai sesi lama
}
var deadline = new Date(now.getTime() + EXAM_DURATION_SECONDS * 1000);  // <-- sesi BARU
```

**Masalah:** Jika peserta me-refresh halaman **setelah** deadline lewat (tapi belum submit), `CHECK_NIP` → `startSession` tidak menemukan sesi aktif yang valid → **membuat sesi baru dengan 4 menit penuh**. Bisa diulang tanpa batas.

**Dampak:** Peserta bisa mengulang ujian tanpa batas waktu dengan sekadar menekan F5. Ini merusak seluruh konsep "4 menit".

**Usulan perbaikan:** Jika sudah ada sesi (status AKTIF/expired) untuk NIP+sesi tersebut, **jangan** buat sesi baru — kembalikan sesi lama apa pun kondisinya (deadline tetap). Hanya buat sesi baru kalau benar-benar belum ada.

---

### 3. [TINGGI] Jawaban hilang total saat refresh — tidak ada restore
**Lokasi:** `index.html` — `saveToLocalStorage()` dipanggil 4× (baris 969, 1059, 1209, 1530) tapi **tidak ada `getItem()` sama sekali** (0 kemunculan).

**Masalah:** Data ditulis ke `localStorage` tapi **tidak pernah dibaca kembali**. Jadi:
- Peserta refresh (sengaja / tidak sengaja / laptop restart) → semua jawaban **hilang**
- Timer server tetap jalan (deadline tidak berubah) → peserta mengerjakan ulang dari nol dengan waktu tersisa sedikit

**Dampak:** Sangat merugikan peserta. Satu refresh tidak sengaja = jawaban lenyap.

**Usulan perbaikan:** Tambahkan `loadFromLocalStorage()` saat halaman dimuat: kalau ada sesi aktif yang belum selesai, tampilkan kembali soal + jawaban + timer yang tersisa.

---

### 4. [TINGGI] Strike ke-3 (diskualifikasi) juga terblokir `alert()`
**Lokasi:** `index.html` baris 1041–1044

```js
if (count >= 3) {
  alert("PERINGATAN TERAKHIR: ...");
  finishExam("DISKUALIFIKASI (3x Pelanggaran Jendela/Tab)");  // <-- setelah OK
}
```

**Masalah:** Sama seperti #1 — submit diskualifikasi tertunda sampai OK diklik.

**Usulan perbaikan:** Submit dulu, baru tampilkan pesan.

---

## B. INPUT & VALIDASI DATA

### 5. [TINGGI — PERMINTAAN USER] NIP harus angka saja
**Lokasi:** `index.html` baris 206

```html
<input type="text" id="regNip" required placeholder="199XXXXXXXXXXXXXXX / email@brin.go.id"
```

**Masalah:** Kolom NIP menerima teks apa pun. Placeholder menyebut "email@brin.go.id" sehingga makin membingungkan.

**Bukti data kotor di database:** `jasndksan`, `827738`, `29232`, `sadssdas`, `1212`, `TEST-PINTAR-01` — semuanya masuk kolom NIP.

**Permintaan user:** "nip itu kalo bisa angka aja inputnya yang lain ga bisa"

**Usulan perbaikan:**
- `inputmode="numeric"` + `pattern="[0-9]*"` + `maxlength="18"`
- Filter JS: tolak/bersihkan karakter non-angka saat mengetik
- Validasi panjang (NIP = 18 digit) sebelum submit
- Ubah label/placeholder: hapus opsi email, tulis "18 digit angka"

**Catatan evaluasi:** Perlu diputuskan — apakah peserta yang belum punya NIP (mis. non-PNS) tetap diizinkan ikut? Kalau ya, perlu jalur khusus (NIK? ID lain?). Kalau tidak, murni angka.

---

### 6. [SEDANG] Nama & Satuan Kerja tanpa validasi
Kolom nama/satker menerima teks apa saja (data kotor: `sadsdsa`, `josjis`, `joajia`). Perlu minimal validasi panjang & tolak karakter aneh.

---

## C. KEAMANAN

### 7. [SEDANG] Kode verifikasi tidak diverifikasi server
**Lokasi:** `index.html` baris 1486–1491

```js
const randomSalt = Math.random().toString(36).substring(2, 7).toUpperCase();
const verifCode = `BRIN-DPKI-CBT-${dateCode}-${randomSalt}`;
```

**Masalah:** Kode dibuat di browser, **tidak dikirim ke server**, tidak dicatat di database. Jadi kode di tanda terima **tidak bisa diverifikasi keasliannya** — siapa pun bisa mengarang kode.

**Usulan perbaikan:** Server yang membuat kode verifikasi, simpan di database, kembalikan ke klien. Atau (kalau QR sudah dihapus permanen) minimal catat kode di kolom spreadsheet.

---

### 8. [SEDANG] Durasi & alasan selesai ditentukan klien
**Lokasi:** backend baris 230 & 219 — `safeCell(data.durasi)` dan `data.completion_reason` dikirim dari browser.

**Masalah:** Peserta teknis bisa mengirim durasi palsu atau alasan "SELESAI NORMAL" meski didiskualifikasi. Server punya `deadline` sendiri (bagus), tapi kolom `Durasi_Pengerjaan` dan `Status_Integritas` sebagian bergantung pada data klien.

**Usulan perbaikan:** Hitung durasi di server dari `start` sesi → `submitted_at`. Abaikan `data.durasi`.

**Limitasi:** Server **tidak bisa** mendeteksi sendiri tab-switch (harus dari klien). Ini keterbatasan fundamental web — dicatat sebagai limitasi, bukan bug.

---

## D. LOGO & BRANDING

### 9. [SEDANG] Logo di tanda terima cuma kotak teks, bukan logo
**Lokasi:** `index.html` baris 407–409

```html
<div class="w-10 h-10 rounded-xl bg-brinNavy flex items-center justify-center text-brinGold font-bold text-base shadow shrink-0">
  BRIN
</div>
```

**Masalah:** Ini hanya `<div>` biru dengan tulisan "BRIN" — **bukan file logo resmi**. Di gambar yang user kirim, terlihat kotak biru + teks emas (bukan logo BRIN sebenarnya).

**Usulan perbaikan:** Ganti dengan `<img src="assets/img/...">` logo resmi.

---

### 10. [SEDANG] File logo BRIN yang dipakai pecah & ada kotak putih
**Lokasi:** `index.html` baris 106 — `assets/img/logo_brin_official.png`

**Hasil inspeksi file:**
| File | Ukuran | Kualitas | Catatan |
|------|--------|----------|---------|
| `logo_brin_official.png` **(dipakai)** | 207 × 80 px | ⚠️ **pixelated**, background putih | emblem merah + teks abu |
| `logo_brin_landscape.png` | **4156 × 1601 px** | ✅ tajam, transparan | emblem merah + teks abu (resmi, latar terang) |
| `logo_brin.png` | 360 × 358 px | ✅ biru + cyan | emblem burung biru |
| `logo_koleksi_official.svg` (dipakai) | SVG vektor | ✅ tajam | OK |

**Masalah:**
- `logo_brin_official.png` beresolusi rendah (207×80) → pecah saat ditampilkan
- Punya **background putih solid** (bukan transparan) → kotak putih di header gelap
- Ada aset **jauh lebih baik**: `logo_brin_landscape.png` (4156×1601, transparan)

**Catatan penting:** Ada 2 varian logo BRIN:
1. **Biru + emas** (kotak biru bulat, teks emas) — untuk latar gelap
2. **Merah + abu-abu** (emblem merah, teks abu) — untuk latar terang

Header saat ini latar gelap (`bg-brinDark`) tapi logo ditaruh di kotak putih (`bg-white`), jadi logo terang masih kebaca. Perlu diputuskan varian mana yang jadi standar.

**Usulan perbaikan:** Pakai `logo_brin_landscape.png`, atau cari/unduh ulang logo resmi beresolusi tinggi dengan background transparan.

---

## E. UX & KETAHANAN

### 11. [SEDANG] Tidak ada peringatan saat menutup/refresh tab
**Lokasi:** Tidak ada `beforeunload` handler di `index.html`.

**Masalah:** Peserta bisa menutup/refresh tab tanpa peringatan. Digabung dengan #3 (tidak ada restore) → jawaban hilang tanpa peringatan apa pun.

**Usulan perbaikan:** Tambah `window.addEventListener('beforeunload', ...)` saat ujian aktif.

---

### 12. [SEDANG] Tailwind CSS lewat CDN
**Lokasi:** `index.html` baris 8 — `<script src="https://cdn.tailwindcss.com"></script>`

**Masalah:**
- Butuh koneksi internet ke server luar (Tailwind)
- Jaringan pemerintah/BRIN bisa memblokir CDN luar → **tampilan rusak total**
- Kalau internet peserta lambat, halaman tampil tanpa gaya

**Usulan perbaikan:** Unduh Tailwind sekali, simpan lokal (`assets/css/tailwind.css`), panggil dari file lokal. Halaman jadi mandiri tanpa internet.

---

### 13. [RENDAH] Blokir Ctrl+V menyusahkan input NIP
**Lokasi:** `index.html` baris 1094 — memblokir Ctrl+C/V/X/A/P/S.

**Masalah:** Peserta tidak bisa paste NIP dari clipboard (padahal NIP 18 digit, rawan salah ketik). Blokir hanya aktif saat ujian (`examState.isActive`), jadi login aman — tapi kalau nanti NIP diminta ulang saat ujian, jadi masalah.

**Usulan perbaikan:** Kecualikan `Ctrl+V` untuk field input, atau hanya blokir copy di area soal.

---

### 14. [RENDAH] Buka DevTools dicatat tapi tidak dihitung strike
**Lokasi:** `index.html` baris 1089 — pakai `recordViolation()` bukan `handleViolationTrigger()`.

**Masalah:** Inkonsistensi: percobaan buka DevTools (F12/Ctrl+Shift+I) tercatat di log tapi **tidak menambah strike**, sedangkan PrintScreen menambah strike. Perlu diputuskan: konsisten dihitung, atau konsisten tidak.

---

## F. DATA & KOSMETIK

### 15. [RENDAH] IP & perangkat tidak akurat
**Lokasi:** `index.html` baris 736–746.

**Masalah:** `api.ipify.org` dipanggil async. Kalau lambat/gagal → tersimpan `"103.178.xxx (Mendeteksi)"` atau `"180.252.xxx (Local/Intranet)"`. Terlihat di database: banyak baris menyimpan placeholder. IP publik juga tidak berguna kalau peserta di belakang NAT (bisa 1 IP untuk banyak orang).

**Usulan perbaikan:** Tunggu hasil IP sebelum submit (timeout 3 detik), atau tandai "Tidak Terdeteksi" dengan jujur. Pertimbangkan hapus kolom ini kalau tidak berguna.

---

### 16. [RENDAH] Sisa komentar "SIMULATED QR CODE"
**Lokasi:** `index.html` baris 398 — `<!-- OFFICIAL VERIFICATION RECEIPT CARD (SIMULATED QR CODE) -->`

**Masalah:** Sisa kode QR yang sudah dihapus. Membingungkan pembaca kode.

---

### 17. [RENDAH] Label "CBT V2" padahal sistem v4.0
**Lokasi:** `index.html` baris 413 — "Tanda Terima Verifikasi Resmi CBT V2"

**Masalah:** Backend sudah v4.0, label masih V2. Perlu disamakan.

---

## G. FULLSCREEN & WATERMARK (temuan tambahan 1 Okt 2026, malam)

### 18. [TINGGI] Layar tidak otomatis fullscreen
**Lokasi:** `index.html` baris 883–950 (`handleStartExam`), khususnya baris 901 & 946.

**Penyebab pasti:** `enterFullscreen()` dipanggil **setelah** `await postWebhook(...)` (baris 901). Browser (Chrome) hanya mengizinkan `requestFullscreen()` di dalam **"user gesture" langsung** — yaitu tepat di dalam event handler klik. Begitu ada `await`, rantai gesture-nya putus, sehingga permintaan fullscreen **ditolak secara diam-diam** (error hanya `console.log`, tidak terlihat peserta).

Bukti: saat uji realtime, halaman **tidak** masuk fullscreen otomatis.

**Usulan perbaikan:**
- Panggil `enterFullscreen()` **segera** di awal `handleStartExam()` (sebelum `await`), atau
- Tampilkan tombol "Masuk Layar Penuh" yang harus diklik peserta (gesture asli), lalu verifikasi `document.fullscreenElement` benar-benar terisi.
- Tambahkan fallback: kalau fullscreen gagal, tampilkan peringatan yang jelas, jangan diam.

---

### 19. [TINGGI] Watermark menghilang di layar hasil & layar lain
**Lokasi:** `index.html` baris 276 — `<div id="watermarkLayer" class="watermark-overlay">` diletakkan **di dalam** `<section id="screenExam">` (baris 273).

**Penyebab pasti:** Watermark adalah **anak dari `screenExam`**. Begitu ujian selesai, `finishExam()` menambahkan class `hidden` ke `screenExam` (baris 1437) → **seluruh isinya termasuk watermark ikut hilang**. Jadi di layar hasil, watermark lenyap.

**Dampak:** Layar hasil menampilkan skor, NIP, satker — tanpa watermark. Justru di layar inilah watermark paling dibutuhkan (bisa difoto/di-screenshot lalu disebar).

**Usulan perbaikan:** Pindahkan `#watermarkLayer` keluar dari `screenExam` → jadikan anak `#appContainer` dengan `position: fixed`, dan **jangan** sembunyikan saat pindah layar. Terapkan juga di layar register & hasil (opsional: watermark hanya selama ujian + layar hasil).

---

### 20. [SEDANG] Screenshot tetap bisa dilakukan di layar hasil
**Lokasi:** `index.html` baris 1070–1098 (keydown interceptor).

**Penyebab pasti:** Semua pertahanan (blokir PrintScreen, blur `screen-scramble`, bersihkan clipboard, blokir klik kanan) digerbangi:
```js
if (!examState.isActive || examState.isFinished) return;
```
Saat ujian selesai, `examState.isFinished = true` → **semua proteksi mati**. Layar hasil (skor + identitas + kode verifikasi) bisa di-screenshot bebas. Ini yang user alami: "saya screenshot malah bisa sekarang".

**Catatan jujur:** Ini juga konsekuensi dari #19 — begitu ujian selesai, watermark hilang + proteksi mati = layar hasil sepenuhnya terbuka.

**Usulan perbaikan:** Tentukan kebijakan:
- Kalau layar hasil **boleh** di-screenshot (untuk arsip peserta) → biarkan, tapi **wajib ada watermark** (lihat #19) supaya tidak bisa disalahgunakan.
- Kalau **tidak boleh** → perpanjang proteksi ke layar hasil.

**Catatan penting:** Blokir PrintScreen di web **tidak 100%** — Win+Shift+S, Snipping Tool, dan kamera HP tetap bisa. Jadi solusi terbaik adalah **watermark yang selalu tampil**, bukan sekadar memblokir tombol.

---

## H. LIMITASI YANG TIDAK BISA DIPERBAIKI (jujur, bukan bug)

1. **Screenshot OS tidak bisa dicegah** — kamera HP, Snipping Tool, Win+Shift+S, tombol screenshot perangkat. Web hanya bisa mendeteksi PrintScreen & memberi watermark.
2. **Deteksi tab-switch bergantung klien** — peserta teknis bisa mematikan event listener. Tidak ada cara web murni untuk mencegahnya.
3. **Sumber soal bisa dibaca** — walau kunci jawaban sudah di server, teks soal tetap bisa dibaca dari browser. Determined user bisa screenshot soal.

---

## REKOMENDASI URUTAN PENGERJAAN

**Tahap 1 — Wajib sebelum hari-H (kritis):**
- #1 Auto-submit tanpa alert
- #2 Tutup celah refresh = waktu baru
- #3 Pemulihan jawaban setelah refresh
- #4 Strike-3 tanpa alert
- #5 NIP angka saja (permintaan user)
- #18 Fullscreen otomatis (panggil sebelum `await`)
- #19 Watermark permanen (keluar dari `screenExam`)

**Tahap 2 — Penting (sebelum uji hari Senin):**
- #9 & #10 Perbaiki logo (tanda terima + header)
- #11 Peringatan sebelum menutup tab
- #12 Tailwind lokal (ketahanan jaringan)
- #7 Kode verifikasi di server
- #8 Durasi dihitung server

**Tahap 3 — Penyempurnaan:**
- #6, #13, #14, #15, #16, #17

---

## PERTANYAAN UNTUK MENTOR / PANITIA

1. **NIP angka saja** — bagaimana dengan peserta non-PNS yang tidak punya NIP 18 digit? Perlu jalur alternatif?
2. **Toleransi keterlambatan** — saat ini 90 detik. Cukup?
3. **Logo resmi** — varian mana yang jadi standar: biru-emas (latar gelap) atau merah-abu (latar terang)?
4. **Hosting** — apakah tersedia hosting resmi BRIN (`s.brin.go.id`)? Wajib HTTPS.
5. **Kode verifikasi** — perlu diverifikasi panitia, atau cukup sebagai nomor arsip?
6. **Ganti ke framework?** — lihat lampiran di bawah. Rekomendasi: **TIDAK** untuk sekarang.

---

## LAMPIRAN 1 — APAKAH KEAMANAN BERUBAH? (penjelasan)

**Pertanyaan user:** "masalah keamanan kenapa berubah? apakah ada yang diubah codenya?"

**Jawaban jujur: TIDAK ada penurunan keamanan. Yang berubah adalah CARA KITA MENGUJI, bukan kodenya.**

### Kronologi yang sebenarnya

| Waktu | Kejadian |
|-------|----------|
| Siang | Peserta Curang (subagent) menguji → **7 dari 11 celah berhasil** ditembus. Keamanan waktu itu **4/10** |
| Sore | Kita perbaiki Priority 1 (kunci jawaban pindah ke server, deadline server, token sesi, anti-duplikat) |
| Sore | Verifikasi ulang: celah Priority 1 **tertutup** |
| **Malam (uji realtime)** | User menguji **sendiri** dengan mata sendiri → menemukan **celah baru yang dulu tidak diuji** |

### Jadi kenapa "terasa" berubah?

**Bukan karena kode diperburuk.** Sebabnya:

1. **Uji malam ini lebih jujur/detail.** Subagent kemarin menguji secara terbatas. Malam ini Anda menguji **langsung, realtime, dengan mata sendiri** — jadi menemukan hal yang kemarin terlewat: fullscreen gagal, watermark hilang, screenshot bisa di layar hasil.

2. **Beberapa celah memang sudah ada sejak awal, belum pernah diperbaiki.** Contoh: `enterFullscreen()` setelah `await` (fullscreen gagal) dan watermark di dalam `screenExam` (hilang) — ini **bug lama**, bukan bug baru. Kemarin belum diuji, jadi belum terlihat.

3. **Konsep "watermark sebagai pertahanan" justru baru jelas sekarang.** Dulu kita mengandalkan blokir tombol screenshot. Uji malam membuktikan blokir tombol tidak cukup → watermark yang selalu tampil lebih penting.

### Yang perlu ditegaskan (jujur)

- Keamanan **tidak bisa 100%** di web murni. Kemarin 4/10 → sekarang lebih baik, tapi tetap **bukan 10/10**.
- Celah yang tersisa sebagian besar adalah **keterbatasan web**, bukan kelalaian kode (lihat Bagian H).
- Yang bisa kita lakukan: **perbaiki yang bisa** (Tahap 1) + **watermark permanen** sebagai jaring terakhir.

### Apakah ada kode yang diubah?

Ya, tapi **ke arah LEBIH AMAN**, bukan sebaliknya:
- `index.html` — tambah `CHECK_NIP`, `SCORE_AND_SUBMIT`, timer deadline server, debounce strike
- `backend/google_sheets_webhook.js` — naik v2 → v3 → **v4.0** (kunci jawaban pindah ke server, token sesi, deadline absolut)
- Backup tersedia: `tests/index_before_priority1.html`, `tests/google_sheets_webhook_before_priority1.js`

---

## LAMPIRAN 2 — PERLU GANTI KE FRAMEWORK? (analisis)

**Pertanyaan user:** "atau kita ganti jangan menggunakan html menggunakan framework saja yang lebih baik?"

### Jawaban singkat: **TIDAK** untuk sekarang. Framework **tidak menyelesaikan** masalah yang kita hadapi.

### Alasan teknis (penting)

Semua celah yang kita temukan adalah **batasan browser/web**, bukan batasan HTML:

| Celah | Apakah framework menyelesaikan? |
|-------|-------------------------------|
| Fullscreen gagal setelah `await` | ❌ Tidak — ini aturan browser, sama di React/Vue/Angular |
| Screenshot bisa (PrintScreen/Win+Shift+S) | ❌ Tidak — framework tidak punya akses ke OS |
| Watermark hilang | ❌ Tidak — cuma salah penempatan elemen |
| Deteksi tab-switch bisa dimatikan | ❌ Tidak — keterbatasan fundamental web |
| Kunci jawaban di server | ✅ **Sudah dilakukan** (tanpa framework) |

**Kesimpulan:** React/Vue/Angular **tidak menambah keamanan satu poin pun** untuk celah-celah ini. Framework adalah soal **cara membangun UI**, bukan soal keamanan.

### Kalau ganti framework, yang terjadi justru:

| Aspek | Dampak |
|-------|--------|
| Waktu | **Mundur** — harus bangun ulang semuanya dari nol |
| Risiko | **Naik** — fitur yang sudah berfungsi bisa rusak |
| Kompleksitas | **Naik** — perlu Node.js, build step, deploy lebih rumit |
| Uji ulang | **Wajib** — semua yang sudah diuji harus diuji lagi |
| Keamanan | **Tidak berubah** — celah yang sama tetap ada |
| Hari-H | **Terancam** — ujian 14 Okt, waktu tidak cukup |

### Kapan framework BARU layak dipertimbangkan?

- Fitur jadi jauh lebih kompleks (ratusan soal, admin panel, analitik)
- Ada tim developer yang mengelola jangka panjang
- Ada anggaran hosting + waktu luang berbulan-bulan

**Untuk CBT 10 soal sekali pakai? Tidak sepadan.**

### Rekomendasi

**Tetap HTML/CSS/JS murni**, lalu:
1. Perbaiki 7 item Tahap 1 (besok)
2. Kuatkan watermark sebagai pertahanan utama
3. Tailwind dipindah lokal (tidak butuh internet)
4. Simpan kunci jawaban & penilaian di server (sudah ✅)

Kalau nanti proyeknya berkembang besar, **baru** pertimbangkan framework — dengan waktu yang cukup.

### Perbandingan jujur

| Kriteria | HTML murni (sekarang) | Framework |
|----------|----------------------|-----------|
| Keamanan CBT | Sama | Sama |
| Kecepatan deploy | ✅ Tinggal upload 1 file | ❌ Perlu build |
| Ketahanan jaringan | ✅ Bisa offline penuh | ⚠️ Lebih berat |
| Ukuran halaman | ✅ Kecil | ❌ Besar |
| Waktu perbaikan | ✅ 1 hari | ❌ Berminggu-minggu |
| Risiko rusak | ✅ Rendah | ❌ Tinggi |
| Cocok untuk 10 soal | ✅ Sangat cocok | ❌ Overkill |

---

## LAMPIRAN 3 — "DICOBA DI BROWSER LAIN, KEAMANANNYA TETAP BISA. MASALAHNYA DI MANA?"

**Pertanyaan user:** "tapi aku mencoba di browser lain keamanannya tetap bisa, jadi masalahnya ada dimana?"

### Jawaban singkat: Masalahnya **BUKAN di browser, BUKAN di kode**. Masalahnya di **ARSITEKTUR-nya**.

Bahwa hasilnya **sama di semua browser** justru **membuktikan** ini bukan bug browser. Kalau ini bug Chrome, ganti ke Edge/Firefox pasti beda. Kenyataannya sama → berarti akarnya di **platform web itu sendiri**.

### Akar masalah: halaman web hidup di dalam "kandang" (sandbox)

```
┌─────────────────────────────────────────────┐
│  SISTEM OPERASI (Windows)                    │
│   ├─ Win+Shift+S  ← screenshot dibuat DI SINI │
│   ├─ Snipping Tool ← DI SINI                  │
│   ├─ Kamera HP    ← DI LUAR komputer         │
│   └─────────────────────────────────────┐    │
│        ┌──────────────────────────┐      │    │
│        │  BROWSER (Chrome/Edge)   │      │    │
│        │   ┌──────────────────┐   │      │    │
│        │   │  HALAMAN WEB     │   │      │    │
│        │   │  (kode kita)     │   │      │    │
│        │   │  ← cuma bisa     │   │      │    │
│        │   │    atur INI      │   │      │    │
│        │   └──────────────────┘   │      │    │
│        └──────────────────────────┘      │    │
│  ← halaman web TIDAK punya akses ke sini ─────┘
└─────────────────────────────────────────────┘
```

Halaman web hanya boleh mengatur **isi halamannya sendiri**. Ia **tidak punya izin** menyentuh:
- Tombol keyboard di level OS
- Aplikasi lain (Snipping Tool, kamera)
- Proses screenshot milik Windows

Jadi saat peserta menekan `Win+Shift+S`, screenshot dibuat oleh **Windows** — bukan oleh browser. Halaman web kita **tidak pernah tahu** itu terjadi.

### Kenapa di browser lain sama saja?

Karena semua browser (Chrome, Edge, Firefox, Opera) **tunduk pada aturan sandbox yang sama**. Ini standar keamanan web global, bukan pilihan Chrome. Tidak ada browser yang boleh melanggar — kalau ada, itu malware.

**Kesimpulan:** Ganti browser = tidak berubah. Ganti framework = tidak berubah. Ganti bahasa pemrograman = tidak berubah. Selama masih "halaman web", batasnya sama.

### Lalu apa yang BISA dilakukan? (3 lapis, jujur)

| Lapis | Cara | Kekuatan | Status |
|-------|------|----------|--------|
| **1. Deterrence** | Watermark permanen, blokir PrintScreen, blur saat terdeteksi | Lemah — hanya menghambat & menakuti | Sebagian ada, perlu diperkuat (#19) |
| **2. Traceability** | Watermark berisi nama+NIP → kalau soal bocor, bisa dilacak siapa | Sedang — tidak mencegah, tapi membuat orang berpikir 2× | Perlu diperbaiki (#19) |
| **3. Enforcement** | Aplikasi pengunci level-OS (**Safe Exam Browser**) | **Kuat** — benar-benar memblokir | Belum dipakai |

### 🔑 SOLUSI NYATA: Safe Exam Browser (SEB)

Kalau panitia **benar-benar** butuh screenshot diblokir, satu-satunya cara yang berhasil adalah **mengunci di level sistem operasi** — bukan dari halaman web.

**Safe Exam Browser (SEB):**
- ✅ **Gratis & open source** (dibuat ETH Zürich, dipakai universitas sedunia)
- ✅ Benar-benar memblokir: screenshot, Alt+Tab, aplikasi lain, keluar fullscreen
- ✅ Komputer jadi "terkunci" hanya untuk halaman ujian
- ✅ Cocok untuk ujian di lab/ruang terkontrol (komputer milik panitia)
- ⚠️ Harus **diinstal di komputer peserta** sebelum ujian
- ⚠️ Kurang cocok kalau peserta pakai laptop sendiri

**Cara kerja:** SEB menggantikan browser biasa. Peserta membuka ujian **lewat SEB**, bukan lewat Chrome. Karena SEB berjalan di level OS, ia bisa melakukan hal yang browser biasa tidak bisa.

### Alternatif kalau tidak bisa pasang SEB

| Cara | Cocok untuk | Catatan |
|------|-------------|---------|
| **Pengawas manusia** | Ujian di ruangan | Cara paling klasik & efektif |
| **Google Form** | Kalau tidak butuh pengawasan ketat | Sederhana, tidak ada anti-cheat |
| **Zoom + kamera** | Ujian jarak jauh | Pengawas virtual |
| **Terima keterbatasan** | Ujian singkat (4 menit) | Karena cuma 4 menit, kesempatan nyontek terbatas |

### Poin penting soal durasi 4 menit

Ujian kita hanya **4 menit**. Ini sebenarnya **pertahanan alami**: sangat sulit bagi peserta untuk screenshot soal, mengirim ke luar, dan menerima jawaban dalam 4 menit. Waktu yang pendek = risiko kebocoran kecil.

Ditambah **soal & pilihan diacak per peserta** → jawaban peserta A tidak berguna untuk peserta B.

### Rekomendasi akhir

1. **Untuk uji hari Senin** (kemungkinan pakai laptop sendiri): cukup **deterrence + watermark permanen + durasi 4 menit**. Terima bahwa screenshot OS tidak bisa 100% diblokir.
2. **Untuk ujian resmi 14 Okt**: tanyakan ke mentor/panitia apakah **SEB bisa diinstal** di komputer peserta, atau apakah ada **pengawas**.
3. **Jangan** ganti browser/framework — tidak menyelesaikan apa pun.
4. **Wajib**: perbaiki #19 (watermark permanen) — ini pertahanan paling nyata yang kita punya.

### Kalimat jujur untuk mentor

> "Anti-screenshot dari halaman web tidak bisa 100% — ini batasan semua browser, bukan bug. Untuk benar-benar memblokir, perlu aplikasi pengunci seperti Safe Exam Browser, atau pengawasan langsung. Yang bisa kami jamin: watermark identitas di layar, soal diacak per peserta, waktu 4 menit, dan penilaian di server."


---

## 🔴 KEPUTUSAN MENTOR — 2 Oktober 2026 (RESMI, MENGIKAT)

| No | Pertanyaan | Keputusan Mentor | Implikasi |
|----|-----------|------------------|-----------|
| 1 | Hosting resmi BRIN | **TIDAK ADA** | Cari hosting alternatif (Netlify / GitHub Pages / Cloudflare) — WAJIB HTTPS |
| 2 | Safe Exam Browser | **TIDAK BISA diinstal** | Anti-screenshot maksimal = watermark + deterrence. Terima limitasi (Lampiran 3) |
| 3 | Jadwal resmi | **Fleksibel**, disesuaikan nanti | `ENFORCE_SCHEDULE` tetap `false` sampai tanggal final ditetapkan |
| 4 | Peserta non-PNS / luar BRIN | **Gunakan NIK** | Field NIP → **"NIP / NIK"**, terima **16–18 digit angka** (NIK=16, NIP=18) |
| 5 | Fitur tambahan | **TIDAK ADA** | Fokus HANYA perbaikan bug Tahap 1. Jangan tambah fitur baru |
| 6 | Logo BRIN | **Varian MERAH-ABU** (latar terang) | Pakai `assets/img/logo_brin_landscape.png` (4156×1601, transparan) |

### Dampak pada daftar bug

- **#5 (NIP angka)** → berubah jadi: terima **16 atau 18 digit angka** (NIP atau NIK). Label & placeholder diperbarui.
- **#9 & #10 (logo)** → putusan: **varian merah-abu**. Ganti aset ke `logo_brin_landscape.png`, termasuk di kartu tanda terima.
- **#12 (Tailwind CDN)** → makin penting, karena hosting belum jelas & jaringan BRIN bisa ketat. Pindahkan ke lokal.
- **Lampiran 3 (SEB)** → **tertutup**: SEB tidak bisa dipakai. Pertahanan = watermark permanen (#19) + durasi 4 menit + pengacakan soal.
- **Hosting** → perlu keputusan: Netlify Drop (paling cepat) vs GitHub Pages vs Cloudflare Pages.

### Yang TIDAK berubah

- Backend tetap Apps Script + Google Sheets (sudah live v4.0).
- Timer 4 menit, soal & pilihan diacak per peserta, penilaian di server.
- 20 temuan bug tetap berlaku; Tahap 1 tetap prioritas.
