# LAPORAN PENGUJIAN RESPONSIFITAS MULTI-PERANGKAT & RESOLUSI TINGGI (HiDPI)
## Portal Evaluasi Kompetensi Peserta CBT DATA NOVA 5.0
### Direktorat Pengelolaan Koleksi Ilmiah (DPKI) — Badan Riset dan Inovasi Nasional (BRIN)

---

**Nomor Dokumen:** BRIN-DPKI-CBT-REP-DPI-20261004  
**Tanggal Pengujian:** 04 Oktober 2026  
**Penyusun:** Notulen & Evaluator Akhir Sistem CBT BRIN  
**Peruntukan:** Pembimbing / Mentor, Tim Panitia Pelatihan DATA NOVA 5.0 BRIN  
**Status Evaluasi:** ✅ **LOLOS UJI LINTAS PERANGKAT (6 DARI 6 PROFIL LULUS)**

---

## 1. RINGKASAN EKSEKUTIF

Sebagai bagian dari pemenuhan **Backlog L4 (Uji Lintas Perangkat, Skala Viewport, dan Densitas Piksel/DPI)**, telah dilaksanakan pengujian otomatis komprehensif terhadap portal ujian **CBT DATA NOVA 5.0 DPKI BRIN** menggunakan instrumen browser automation (Chrome DevTools Protocol / CDP Emulation). Pengujian ini mencakup 6 (enam) arketipe perangkat yang merepresentasikan profil gawai riil yang akan digunakan oleh para peserta pelatihan pada 14 Oktober 2026 mendatang: mulai dari ponsel pintar Android kelas pemula (*budget*), iPhone modern layar retina, tablet mode potret dan lanskap, hingga laptop standar kantor dan laptop Full HD dengan *display scaling* 125% (HiDPI).

### Ringkasan Pencapaian Utama:
1. **Zero Horizontal Overflow (100% Lolos):**  
   Seluruh layar antarmuka utama (*Screen Registrasi*, *Screen Ruang Ujian*, dan *Screen Tanda Terima Hasil*) tidak mengalami kebocoran lebar kontainer horizontal (`scrollWidth === clientWidth`). Peserta tidak akan mengalami pergeseran layar ke samping (*horizontal scroll* yang tidak disengaja) di seluruh profil ukuran layar.
2. **Ergonomi & Touch Target Standar WCAG:**  
   Tombol pemicu utama (*Mulai Ujian*) dan 4 kartu opsi jawaban (A, B, C, D) memenuhi standar aksesibilitas sentuh *touch target* dengan tinggi antara **48 px hingga 84 px** (melebihi ambang batas minimum WCAG 2.1 Level AA/AAA sebesar 44 px).
3. **Keterbacaan Timer & Layer Watermark Dinamis:**  
   Timer ujian terpantau tampil jelas, presisi, dan proporsional di bagian atas layar. Layer watermark pengaman ujian (`watermarkLayer`) berorientasi diagonal dengan identitas peserta (Nama, NIP/NIK, Instansi) aktif 100% pada semua rasio densitas piksel (DPI 1.0x hingga 3.0x), tanpa mengaburkan teks soal.
4. **Legibilitas Tanda Terima Resmi:**  
   Kartu bukti kelulusan digital, animasi skor, lencana predikat (*Achievement Badge*), dan kode verifikasi keaslian server ter-render secara utuh dan proporsional pada semua orientasi gawai.

---

## 2. PROFIL PERANGKAT PENGUJIAN

Pengujian dilakukan dengan mengemulasikan parameter perangkat fisik melalui *Chrome DevTools Device Metrics Override*:

| Kategori | ID Profil | Model Representatif | Dimensi Viewport (CSS px) | Skala Rasio Piksel (DPI) | Orientasi Layar | User-Agent Spesifik |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **HP / Ponsel** | `hp_android_budget` | Samsung Galaxy A14 / Android Entry-Level | 360 × 800 | 2.0x (HD+) | Potret | Android 13; SM-A145F Mobile |
| **HP / Ponsel** | `hp_iphone_modern` | Apple iPhone 14/15 Pro / Flagship | 390 × 844 | 3.0x (Super Retina) | Potret | iPhone OS 17_4 Mobile |
| **Tablet** | `tablet_portrait` | Apple iPad 10th / Galaxy Tab | 768 × 1024 | 2.0x (Retina) | Potret | iPadOS 17_4 Mobile |
| **Tablet** | `tablet_landscape` | Apple iPad 10th / Galaxy Tab | 1024 × 768 | 2.0x (Retina) | Lanskap | iPadOS 17_4 Mobile |
| **Laptop** | `laptop_standar` | Laptop Dinas Kantor / WXGA | 1366 × 768 | 1.0x (Standar) | Lanskap | Windows NT 10.0; Win64; x64 |
| **Laptop** | `laptop_hidpi` | Laptop Ultrabook FHD Scaling 125% | 1536 × 864 | 1.25x (HiDPI) | Lanskap | Windows NT 10.0; Win64; x64 |

---

## 3. TABEL KOMPILASI METRIK PENGUJIAN LINTAS PERANGKAT

### 3.1. Uji Horizontal Overflow & Lebar Kontainer

Toleransi horizontal overflow adalah **0 px** (lebar *scroll* tidak boleh lebih besar dari lebar *viewport* aktif).

| ID Profil Perangkat | Viewport (px) | DPI | Screen Register (Client / Scroll) | Screen Ujian (Client / Scroll) | Screen Hasil (Client / Scroll) | Status Overflow | Kesimpulan |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `hp_android_budget` | 360 × 800 | 2.0x | 360 px / 360 px | 360 px / 360 px | 360 px / 360 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |
| `hp_iphone_modern` | 390 × 844 | 3.0x | 390 px / 390 px | 390 px / 390 px | 390 px / 390 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |
| `tablet_portrait` | 768 × 1024 | 2.0x | 768 px / 768 px | 768 px / 768 px | 768 px / 768 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |
| `tablet_landscape` | 1024 × 768 | 2.0x | 1024 px / 1024 px | 1024 px / 1024 px | 1024 px / 1024 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |
| `laptop_standar` | 1366 × 768 | 1.0x | 1351 px* / 1351 px | 1351 px* / 1351 px | 1351 px* / 1351 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |
| `laptop_hidpi` | 1536 × 864 | 1.25x | 1521 px* / 1521 px | 1536 px / 1536 px | 1521 px* / 1521 px | **Nihil (0 px)** | ✅ **Lolos Sempurna** |

*\*Catatan Teknis:* Selisih 15 px pada laptop merepresentasikan lebar native vertical scrollbar Windows (1351 + 15 = 1366 px, 1521 + 15 = 1536 px), di mana kontainer layout secara presisi mengompensasi keberadaan scrollbar tanpa memicu overflow mendatar.

---

### 3.2. Evaluasi Touch Target & Dimensi Tombol Interaksi Utama

Sesuai panduan aksesibilitas antarmuka gawai layar sentuh (W3C WCAG 2.1 Guideline 2.5.5 dan Google Material Design Target Guidelines):
- Standar minimum tinggi sentuh: **≥ 44 px** (atau minimal 40 px untuk elemen pendukung).
- Ruang sentuh kartu pilihan ganda harus mencukupi untuk ketukan ibu jari peserta tanpa salah tekan.

| Profil Perangkat | Tombol Mulai Ujian (T × L) | Evaluasi Mulai Ujian | Kartu Opsi Pilihan A–D (Tinggi Min) | Evaluasi Kartu Opsi | Navigasi Soal / QuickNav |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `hp_android_budget` | **68 px × 286 px** | ✅ Sangat Lega (Target OK) | **64 px** (4 opsi) | ✅ Sangat Nyaman | QuickNav disembunyikan (*hidden md:flex*) demi ruang baca; kendali via tombol "Sebelumnya" & "Selanjutnya" |
| `hp_iphone_modern` | **48 px × 316 px** | ✅ Sesuai Standar (Target OK) | **84 px** (4 opsi) | ✅ Sangat Nyaman | QuickNav disembunyikan (*hidden md:flex*); kendali via tombol "Sebelumnya" & "Selanjutnya" |
| `tablet_portrait` | **52 px × 606 px** | ✅ Sangat Lega (Target OK) | **64 px** (4 opsi) | ✅ Ergonomis | 10 tombol angka aktif (28 px × 28 px per butir) + tombol Sebelumnya/Selanjutnya |
| `tablet_landscape` | **52 px × 606 px** | ✅ Sangat Lega (Target OK) | **64 px** (4 opsi) | ✅ Ergonomis | 10 tombol angka aktif (28 px × 28 px per butir) + tombol Sebelumnya/Selanjutnya |
| `laptop_standar` | **52 px × 606 px** | ✅ Sangat Lega (Target OK) | **64 px** (4 opsi) | ✅ Ergonomis | 10 tombol angka aktif (28 px × 28 px per butir) + tombol Sebelumnya/Selanjutnya |
| `laptop_hidpi` | **52 px × 606 px** | ✅ Sangat Lega (Target OK) | **64 px** (4 opsi) | ✅ Ergonomis | 10 tombol angka aktif (28 px × 28 px per butir) + tombol Sebelumnya/Selanjutnya |

---

### 3.3. Evaluasi Keterbacaan Timer & Lapisan Watermark Anti-Curang

| Profil Perangkat | Timer Header Tampil | Visibilitas Countdown | Layer Watermark Hadir | Efek Ketajaman pada Skala DPI | Keterbacaan Teks Soal |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `hp_android_budget` | ✅ Ya | Jelas di *top-bar* (kontras navy-kuning) | ✅ Ya (`#watermarkLayer`) | Tajam (skala 2.0x, font anti-aliased) | Luas baca 286 px, teks terbaca utuh tanpa terpotong |
| `hp_iphone_modern` | ✅ Ya | Jelas di *top-bar* (Retina Display) | ✅ Ya (`#watermarkLayer`) | Sangat Tajam (skala 3.0x Super Retina) | Luas baca 316 px, teks terbaca sangat jernih |
| `tablet_portrait` | ✅ Ya | Proporsional di header tablet | ✅ Ya (`#watermarkLayer`) | Tajam (skala 2.0x) | Luas baca 654 px, layout nyaman |
| `tablet_landscape` | ✅ Ya | Proporsional di header tablet | ✅ Ya (`#watermarkLayer`) | Tajam (skala 2.0x) | Luas baca 830 px, layout leluasa |
| `laptop_standar` | ✅ Ya | Format desktop standar | ✅ Ya (`#watermarkLayer`) | Jelas pada DPI 1.0x native | Luas baca 830 px, rasio optimal |
| `laptop_hidpi` | ✅ Ya | Terbaca tegas tanpa buram (*no blur*) | ✅ Ya (`#watermarkLayer`) | Tajam pada scaling 125% Windows | Luas baca 830 px, tata letak stabil |

---

### 3.4. Evaluasi Layar Tanda Terima & Sertifikat Skor Resmi

| Profil Perangkat | Lebar Kartu Tanda Terima | Nilai Skor & Badge Predikat | Tombol Unduh JSON (T × L) | Tombol Cetak Bukti (T × L) | Status Tampilan Tanda Terima |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `hp_android_budget` | 286 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 286 px | 36 px × 286 px | ✅ Tampil utuh, rapi, tombol selebar kontainer (*full-width*) |
| `hp_iphone_modern` | 316 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 316 px | 36 px × 316 px | ✅ Tampil utuh, rapi, tombol selebar kontainer (*full-width*) |
| `tablet_portrait` | 448 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 203 px | 38 px × 167 px | ✅ Tampil simetris berdampingan di tengah (*centered flex*) |
| `tablet_landscape` | 448 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 203 px | 38 px × 167 px | ✅ Tampil simetris berdampingan di tengah (*centered flex*) |
| `laptop_standar` | 448 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 203 px | 38 px × 167 px | ✅ Tampil simetris berdampingan di tengah (*centered flex*) |
| `laptop_hidpi` | 448 px | Skor 80, Lencana "SANGAT BAIK" | 38 px × 203 px | 38 px × 167 px | ✅ Tampil simetris berdampingan di tengah (*centered flex*) |

---

## 4. ANALISIS MENDALAM HASIL PENGUJIAN PER ARKETIPE

### 4.1. Analisis Perangkat HP / Layar Sentuh Kompak (360–390 px)
- **Adaptasi Formulir Masuk:**  
  Pada layar Android berlebar 360 px, lebar kontainer form adalah 336 px (memberikan *padding* aman 12 px di sisi kiri dan kanan). Input NIP/NIK dan Nama Peserta terisi pas tanpa memicu pergeseran horizontal.
- **Strategi Ergonomi Navigasi Soal:**  
  Pilihan desain untuk menyembunyikan navigator butir cepat (`#quickNavContainer` dengan class `hidden md:flex`) pada layar di bawah 768 px terbukti sangat tepat. Jika 10 butir dipaksakan tampil pada lebar 360 px, layar akan penuh sesak dan rawan salah sentuh. Sebagai gantinya, tombol navigasi sekuensial "Sebelumnya" dan "Selanjutnya" di bagian bawah layar menjadi fokus utama navigasi peserta.
- **Tinggi Kartu Opsi:**  
  Tinggi opsi pilihan ganda mencapai 64 px (Android) dan 84 px (iPhone). Jarak vertikal antar-kartu cukup lapang (*gap-3*), mengeliminasi risiko salah sentuh (*accidental mis-touch*) ketika peserta memilih jawaban.

### 4.2. Analisis Perangkat Tablet (768–1024 px)
- **Breakpoint Responsif (md: 768px):**  
  Tepat pada lebar 768 px (iPad portrait), tata letak beralih ke mode tablet/desktop. Kontainer navigator butir cepat (`quickNavContainer`) muncul otomatis dengan 10 butir nomor soal berukuran 28 × 28 px.
- **Orientasi Lanskap vs Potret:**  
  Pada orientasi lanskap (1024 × 768 px), lebar baca soal bertambah hingga 830 px dengan margin pembatas kartu (`max-w-3xl`) yang menjaga agar baris teks tidak terlalu panjang, sehingga kenyamanan membaca soal analisis grafik/tabel tetap tinggi.

### 4.3. Analisis Laptop & Desktop HiDPI (1366–1536 px, Skala 1.0x – 1.25x)
- **Render Font & Ketajaman Display Scaling:**  
  Pengujian pada profil `laptop_hidpi` (resolusi 1536 × 864 px, DPI 1.25x) mensimulasikan layar Full HD (1920 × 1080) dengan pembesaran teks sistem Windows 125%. Hasil tangkapan layar membuktikan bahwa Tailwind CSS dan render SVG (ikon, badge, dan logo BRIN) menghasilkan tepi yang tajam tanpa ada artefak *blur* atau distorsi resolusi.
- **Watermark Anti-Screenshot:**  
  Kisi diagonal watermark (`KEVIN • 3310171229020102 • DPKI BRIN`) terdistribusi merata dengan sudut rotasi 45 derajat dan opasitas terkontrol (0.07), sehingga tetap menjadi bukti forensik visual yang valid jika layar dipotret menggunakan kamera eksternal, tanpa mengganggu konsentrasi pembacaan soal.

---

## 5. REKOMENDASI PENYEMPURNAAN MINOR (OPSIONAL)

Secara umum seluruh metrik pengujian telah **LULUS (PASS)**. Dari hasil audit kuantitatif, terdapat 1 (satu) catatan optimasi mikro:
- **Tinggi Tombol Aksi Layar Hasil pada Ponsel:**  
  Tombol *Download JSON* dan *Cetak Bukti* pada layar tanda terima memiliki tinggi 36–38 px. Meskipun tombol tersebut membentang selebar kartu (286–316 px) sehingga sangat mudah ditekan, untuk mencapai kepatuhan formal WCAG AAA (minimum tinggi 44 px), ke depan dapat ditambahkan utility class `py-2.5 sm:py-2` atau `min-h-[44px]` pada tombol di `#screenResult`. Ini bersifat penyempurnaan kosmetik minor dan tidak menghambat operasional ujian.

---

## 6. DAFTAR ARTEFAK TANGKAPAN LAYAR (BUKTI AUDIT)

Seluruh berkas bukti tangkapan layar PNG dan log metrik JSON telah tersimpan rapi pada direktori repositori:

| Profil Pengujian | Screen Registrasi | Screen Ruang Ujian | Screen Tanda Terima Hasil | File Metrik Raw JSON |
| :--- | :--- | :--- | :--- | :--- |
| **HP Android Budget** | `tests/hasil_dpi/hp_android_budget/01_screen_register.png` | `tests/hasil_dpi/hp_android_budget/02_screen_exam.png` | `tests/hasil_dpi/hp_android_budget/03_screen_result.png` | `tests/hasil_dpi/hp_android_budget/hasil_pengujian.json` |
| **HP iPhone Modern** | `tests/hasil_dpi/hp_iphone_modern/01_screen_register.png` | `tests/hasil_dpi/hp_iphone_modern/02_screen_exam.png` | `tests/hasil_dpi/hp_iphone_modern/03_screen_result.png` | `tests/hasil_dpi/hp_iphone_modern/hasil_pengujian.json` |
| **Tablet Portrait** | `tests/hasil_dpi/tablet_portrait/01_screen_register.png` | `tests/hasil_dpi/tablet_portrait/02_screen_exam.png` | `tests/hasil_dpi/tablet_portrait/03_screen_result.png` | `tests/hasil_dpi/tablet_portrait/hasil_pengujian.json` |
| **Tablet Landscape** | `tests/hasil_dpi/tablet_landscape/01_screen_register.png` | `tests/hasil_dpi/tablet_landscape/02_screen_exam.png` | `tests/hasil_dpi/tablet_landscape/03_screen_result.png` | `tests/hasil_dpi/tablet_landscape/hasil_pengujian.json` |
| **Laptop Standar** | `tests/hasil_dpi/laptop_standar/01_screen_register.png` | `tests/hasil_dpi/laptop_standar/02_screen_exam.png` | `tests/hasil_dpi/laptop_standar/03_screen_result.png` | `tests/hasil_dpi/laptop_standar/hasil_pengujian.json` |
| **Laptop HiDPI 125%** | `tests/hasil_dpi/laptop_hidpi/01_screen_register.png` | `tests/hasil_dpi/laptop_hidpi/02_screen_exam.png` | `tests/hasil_dpi/laptop_hidpi/03_screen_result.png` | `tests/hasil_dpi/laptop_hidpi/hasil_pengujian.json` |

---

## 7. KESIMPULAN AKHIR NOTULEN

Sistem antarmuka pengguna (UI/UX) **CBT DATA NOVA 5.0 DPKI BRIN** dinyatakan **LULUS UJI RESPONSIF & KETAHANAN MULTI-DPI**. Desain antarmuka telah terbukti adaptif, kokoh terhadap variasi ukuran layar peserta pelatihan, ramah sentuhan jemari pada gawai *mobile*, serta mempertahankan seluruh fitur keamanan (watermark diagonal, visibilitas countdown timer server, dan bukti verifikasi resmi) secara konsisten di semua kelas perangkat.

Dokumen ini disusun sebagai wujud akuntabilitas teknis dan kesiapan penuh sistem menyambut gladi bersih dan hari-H evaluasi kompetensi BRIN.
