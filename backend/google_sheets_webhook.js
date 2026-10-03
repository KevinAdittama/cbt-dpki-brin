/**
 * ============================================================================
 * BACKEND CBT DATA NOVA 5.0 — DPKI BRIN
 * Versi 4.0
 * ============================================================================
 * Perubahan dari v3.0:
 * 1. BATAS WAKTU DITENTUKAN SERVER (session token + deadline absolut).
 *    Klien tidak lagi menjadi penentu durasi ujian.
 * 2. Sesi ujian dicatat di sheet "Sesi_Aktif" (dibuat otomatis).
 * 3. Kelebihan waktu dicatat & dilaporkan sebagai pelanggaran integritas.
 * 4. Penilaian, kunci jawaban, gerbang jadwal, dan anti-duplikat tetap di server.
 *
 * CARA DEPLOY (WAJIB dibaca):
 * ----------------------------------------------------------------------------
 * 1. Buka spreadsheet DATABASE_CBT_DATANOVA_BRIN > menu Extensions/Ekstensi >
 *    Apps Script.
 * 2. Hapus SEMUA kode lama di editor, tempelkan SELURUH FILE INI.
 * 3. Klik Simpan (ikon disket).
 * 4. Klik "Deploy" > "Manage deployments" > ikon Pensil (Edit) >
 *    pada "Version" pilih "New version" > klik "Deploy".
 *    (JANGAN membuat deployment baru — cukup versi baru, agar URL tetap sama.)
 * 5. Pastikan "Who has access" tetap "Anyone".
 * 6. Opsional: jalankan fungsi runSelfCheck() sekali untuk uji internal.
 *
 * CATATAN: sheet "Sesi_Aktif" akan dibuat otomatis saat peserta pertama login.
 * ============================================================================
 */

var SHEET_NAME = "Hasil_Ujian";
var SESSION_SHEET_NAME = "Sesi_Aktif";

// ---- DURASI UJIAN (SATU-SATUNYA SUMBER KEBENARAN) -------------------------
var EXAM_DURATION_SECONDS = 4 * 60; // 4 menit. Ubah di sini bila perlu.
var SUBMIT_GRACE_SECONDS = 90;      // Toleransi keterlambatan jaringan saat submit.

// ---- GERBANG JADWAL --------------------------------------------------------
// false = mode uji coba (gerbang selalu terbuka). Set true saat hari-H.
var ENFORCE_SCHEDULE = false;
var EXAM_START_ISO = "2026-10-14T02:00:00.000Z"; // 09.00 WIB / 10.00 WITA / 11.00 WIT
var EXAM_END_ISO = "2026-10-14T02:30:00.000Z";   // 09.30 WIB / 10.30 WITA / 11.30 WIT

// ---- KUNCI JAWABAN (HANYA DI SERVER) --------------------------------------
var ANSWER_KEYS = {
  "1": "Membantu pembaca melihat pola, tren, dan kesimpulan data dengan cepat",
  "2": "Microsoft Excel",
  "3": "Pivot Chart",
  "4": "Conditional Formatting (Format Bersyarat)",
  "5": "Diagram Garis (Line Chart)",
  "6": "Diagram Lingkaran / Donat (Pie / Donut Chart)",
  "7": "Karena 25 irisan membuat grafik terlalu padat dan label nama spesies sulit dibaca",
  "8": "Diagram Batang (Bar / Column Chart)",
  "9": "Perlakuan B terlihat berkali-kali lipat lebih unggul dari A, padahal selisih aslinya hanya 2 kg",
  "10": "Judul Grafik (Chart Title) dan label data yang jelas"
};

/**
 * Endpoint POST utama.
 */
function doPost(e) {
  var data = parseRequestBody(e);
  var action = String(data.action || "").toUpperCase();

  // ---------------------------------------------------------------------------
  // OPTIMASI BEBAN (uji 3 Okt 2026): request yang HANYA MEMBACA tidak perlu
  // mengantre di lock global. Sebelumnya 25 peserta bersamaan -> 8/25 sukses
  // karena semua request diserialisasi satu kunci ("Server sibuk").
  // HEARTBEAT hanya membaca sisa waktu -> aman dijalankan tanpa lock.
  // ---------------------------------------------------------------------------
  if (action === "HEARTBEAT") {
    try {
      var ssHb = SpreadsheetApp.getActiveSpreadsheet();
      return createJsonResponse(handleHeartbeat(ssHb, data));
    } catch (errHb) {
      return createJsonResponse({ status: "error", message: "Gagal heartbeat: " + errHb.toString() });
    }
  }

  var lock = LockService.getScriptLock();
  // Tunggu lebih lama agar antrean peserta yang submit hampir bersamaan tertampung.
  if (!lock.tryLock(240000)) {
    return createJsonResponse({
      status: "error",
      message: "Server sibuk. Silakan coba lagi.",
      retry_after_seconds: 5,
      busy: true
    });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resultSheet = getOrCreateSheet(ss, SHEET_NAME);

    if (action === "CHECK_NIP") {
      ensureResultSheetHeader(resultSheet);
      return createJsonResponse(handleCheckNip(ss, resultSheet, data));
    }

    if (action === "SCORE_AND_SUBMIT") {
      ensureResultSheetHeader(resultSheet);
      return createJsonResponse(handleScoreAndSubmit(ss, resultSheet, data));
    }

    if (action === "SAVE_PROGRESS") {
      return createJsonResponse(handleSaveProgress(ss, data));
    }

    if (action === "RESUME") {
      return createJsonResponse(handleResume(ss, data));
    }

    if (action === "SUBMIT_EXAM") {
      return createJsonResponse({
        status: "rejected",
        message: "Versi klien lama ditolak. Muat ulang halaman agar penilaian dilakukan server."
      });
    }

    return createJsonResponse({ status: "error", message: "Aksi tidak dikenali." });
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Terjadi kesalahan server: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint GET untuk uji koneksi & cek NIP dari browser.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || "").toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "check_nip") {
    return createJsonResponse(handleCheckNip(ss, getOrCreateSheet(ss, SHEET_NAME), params, true));
  }

  if (action === "server_status") {
    return createJsonResponse({
      status: "success",
      server_time_iso: new Date().toISOString(),
      server_epoch_ms: new Date().getTime(),
      exam_duration_seconds: EXAM_DURATION_SECONDS,
      schedule_enforced: ENFORCE_SCHEDULE,
      access: getScheduleAccess()
    });
  }

  return ContentService.createTextOutput(
    "SERVER DATABASE CBT DATA NOVA 5.0 (BRIN) AKTIF!\n" +
    "Waktu Server Saat Ini: " + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss") + " WIB\n" +
    "Durasi Ujian: " + Math.round(EXAM_DURATION_SECONDS / 60) + " menit"
  );
}

/**
 * ---------------------------------------------------------------------------
 * AKSI: CHECK_NIP  ->  validasi identitas + buka sesi ujian berbatas waktu
 * ---------------------------------------------------------------------------
 */
function handleCheckNip(ss, resultSheet, data, readOnly) {
  var nip = normalizeText(data.nip);
  var sesi = normalizeText(data.sesi).toLowerCase();
  var nama = normalizeText(data.nama);

  if (!nip) {
    return { status: "rejected", message: "NIP wajib diisi." };
  }

  var existing = findExistingSubmission(resultSheet, nip, sesi);
  var access = getScheduleAccess();

  if (existing.exists) {
    return {
      status: "success",
      result: existing,
      access: access,
      allowed: false,
      message: "NIP sudah pernah menyelesaikan sesi ini pada " + existing.timestamp + "."
    };
  }

  if (!access.allowed) {
    return { status: "success", result: existing, access: access, allowed: false, message: access.message };
  }

  // Jika panggilan bersifat read-only (mis. dari GET / probe / cek awal), jangan buat tiket sesi baru.
  if (readOnly || data.read_only === true || data.read_only === "true") {
    return {
      status: "success",
      result: existing,
      access: access,
      allowed: true,
      read_only: true,
      message: "NIP valid dan gerbang jadwal terbuka."
    };
  }

  var session = startSession(ss, nip, nama, sesi);
  return {
    status: "success",
    result: existing,
    access: access,
    allowed: true,
    session: session,
    message: "Gerbang ujian terbuka. Sesi " + (data.sesi || "-") + " dimulai."
  };
}

/**
 * ---------------------------------------------------------------------------
 * AKSI: SCORE_AND_SUBMIT  ->  nilai di server, tolak duplikat, catat kelebihan waktu
 * ---------------------------------------------------------------------------
 */
function handleScoreAndSubmit(ss, resultSheet, data) {
  var nip = normalizeText(data.nip);
  var sesi = normalizeText(data.sesi).toLowerCase();
  var token = normalizeText(data.session_token);

  var satker = normalizeText(data.satker) || normalizeText(data.unit);

  if (!nip || !sesi || !normalizeText(data.nama) || !satker) {
    return { status: "rejected", message: "Identitas peserta tidak lengkap." };
  }

  var sessionSheet = getOrCreateSessionSheet(ss);
  var sessionRow = findSessionRow(sessionSheet, token);

  if (!sessionRow) {
    return { status: "rejected", message: "Sesi ujian tidak dikenal atau sudah dibersihkan. Muat ulang halaman." };
  }
  if (sessionRow.status === "SELESAI") {
    return { status: "rejected", message: "Sesi ini sudah dikirim sebelumnya." };
  }
  if (sessionRow.nip !== nip) {
    return { status: "rejected", message: "Token sesi tidak cocok dengan identitas peserta." };
  }

  var existing = findExistingSubmission(resultSheet, nip, sesi);
  if (existing.exists) {
    return {
      status: "rejected",
      message: "NIP sudah tercatat pernah submit pada sesi ini.",
      data: existing
    };
  }

  var scored = scoreAnswers(data.answers);
  if (!scored.valid) {
    return { status: "rejected", message: scored.message };
  }

  // ---- Pemeriksaan batas waktu oleh SERVER (bukan jam peserta) ----
  var now = new Date();
  var deadline = new Date(sessionRow.deadline);
  var overrunSeconds = Math.round((now.getTime() - deadline.getTime()) / 1000);
  if (overrunSeconds < 0) overrunSeconds = 0;

  // ---- #8: DURASI DIHITUNG SERVER (abaikan data.durasi dari klien) ----
  // Durasi resmi = waktu submit server - waktu mulai sesi (dari sheet Sesi_Aktif).
  // Klien tidak lagi bisa memalsukan durasi pengerjaan.
  var startMs = sessionRow.start ? new Date(sessionRow.start).getTime() : now.getTime();
  var serverDurasiSeconds = Math.max(0, Math.round((now.getTime() - startMs) / 1000));
  if (!isFinite(serverDurasiSeconds) || serverDurasiSeconds > 86400) {
    serverDurasiSeconds = Math.max(0, Math.min(EXAM_DURATION_SECONDS, EXAM_DURATION_SECONDS + overrunSeconds));
  }
  var serverDurasiStr = formatDuration(serverDurasiSeconds);

  var violations = Array.isArray(data.violations) ? data.violations : [];
  var violationCount = violations.length;
  var integrityStatus = buildIntegrityStatus(violationCount, data.completion_reason, overrunSeconds, SUBMIT_GRACE_SECONDS);

  // ---- #7: KODE VERIFIKASI DIBUAT SERVER (bukan di browser) ----
  // Kode ini dicatat di database sehingga keasliannya bisa diverifikasi panitia.
  var verifCode = buildVerificationCode(now, nip);

  resultSheet.appendRow([
    now,
    "'" + nip,
    safeCell(data.nama),
    safeCell(data.satker),
    safeCell(data.sesi),
    scored.score,
    scored.correct,
    scored.wrong,
    safeCell(serverDurasiStr),
    violationCount,
    integrityStatus,
    safeCell(data.ip_address || "Tidak Terdeteksi"),
    safeCell(data.os || "-"),
    safeCell(data.browser || "-"),
    safeCell(data.resolusi || "-"),
    verifCode
  ]);

  markSessionFinished(sessionSheet, sessionRow.rowNumber, scored.score, now);

  return {
    status: "success",
    message: "Jawaban dinilai server dan hasil berhasil disimpan.",
    result: {
      score: scored.score,
      correct: scored.correct,
      wrong: scored.wrong,
      total: scored.total,
      integrity_status: integrityStatus,
      overrun_seconds: overrunSeconds,
      durasi: serverDurasiStr,
      verification_code: verifCode,
      submitted_at: now.toISOString()
    }
  };
}

/**
 * #7: Bangun kode verifikasi resmi di sisi server.
 * Format: BRIN-DPKI-CBT-YYYYMMDD-XXXXXX (6 karakter dari hash NIP+waktu).
 * Deterministik per submit, dicatat di database -> dapat diverifikasi panitia.
 */
function buildVerificationCode(dateObj, nip) {
  var ymd = Utilities.formatDate(dateObj, "Asia/Jakarta", "yyyyMMdd");
  var seed = String(nip) + "|" + dateObj.getTime() + "|" + Utilities.getUuid();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, seed, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] + 256) % 256;
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  var salt = hex.substring(0, 6).toUpperCase();
  return "BRIN-DPKI-CBT-" + ymd + "-" + salt;
}

/**
 * ---------------------------------------------------------------------------
 * AKSI: HEARTBEAT  ->  klien meminta sisa waktu resmi dari server
 * ---------------------------------------------------------------------------
 */
function handleHeartbeat(ss, data) {
  var token = normalizeText(data.session_token);
  var sessionSheet = getOrCreateSessionSheet(ss);
  var sessionRow = findSessionRow(sessionSheet, token);

  if (!sessionRow) {
    return { status: "rejected", message: "Sesi tidak ditemukan." };
  }

  var now = new Date();
  var deadline = new Date(sessionRow.deadline);
  var remaining = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000));

  return {
    status: "success",
    server_epoch_ms: now.getTime(),
    deadline_iso: deadline.toISOString(),
    remaining_seconds: remaining,
    finished: sessionRow.status === "SELESAI"
  };
}

/**
 * AKSI: SAVE_PROGRESS -> simpan jawaban + urutan soal peserta ke sheet Sesi_Aktif.
 * Berguna untuk memulihkan jawaban bila peserta refresh / koneksi putus.
 */
function handleSaveProgress(ss, data) {
  var token = normalizeText(data.session_token);
  var sessionSheet = getOrCreateSessionSheet(ss);
  var sessionRow = findSessionRow(sessionSheet, token);

  if (!sessionRow) {
    return { status: "rejected", message: "Sesi tidak ditemukan." };
  }
  if (sessionRow.status === "SELESAI") {
    return { status: "rejected", message: "Sesi sudah selesai." };
  }

  var answersJson = JSON.stringify(data.answers || {});
  var orderJson = JSON.stringify(data.question_order || []);
  var violationsJson = JSON.stringify(data.violations || []);

  // Kolom 10 = Jawaban_JSON, 11 = Urutan_Soal, 12 = Pelanggaran_JSON
  sessionSheet.getRange(sessionRow.rowNumber, 10).setValue(safeCell(answersJson));
  sessionSheet.getRange(sessionRow.rowNumber, 11).setValue(safeCell(orderJson));
  sessionSheet.getRange(sessionRow.rowNumber, 12).setValue(safeCell(violationsJson));

  return { status: "success", message: "Progres disimpan." };
}

/**
 * AKSI: RESUME -> kembalikan sesi + jawaban tersimpan untuk NIP+sesi.
 * Klien memakai ini untuk memulihkan ujian setelah refresh.
 */
function handleResume(ss, data) {
  var nip = normalizeText(data.nip);
  var sesi = normalizeText(data.sesi).toLowerCase();
  var resultSheet = getOrCreateSheet(ss, SHEET_NAME);

  if (!nip || !sesi) {
    return { status: "rejected", message: "NIP dan sesi wajib diisi." };
  }

  // Kalau sudah submit final, tidak perlu resume.
  var existing = findExistingSubmission(resultSheet, nip, sesi);
  if (existing.exists) {
    return { status: "success", can_resume: false, already_finished: true, result: existing };
  }

  var sessionSheet = getOrCreateSessionSheet(ss);
  var row = findSessionForResume(sessionSheet, nip, sesi);
  if (!row) {
    return { status: "success", can_resume: false, message: "Tidak ada sesi tersimpan." };
  }

  var now = new Date();
  var deadlineMs = new Date(row.deadline).getTime();
  var remaining = Math.max(0, Math.round((deadlineMs - now.getTime()) / 1000));

  var raw = sessionSheet.getRange(row.rowNumber, 1, 1, 12).getValues()[0];
  var answers = {};
  var order = [];
  var violations = [];
  try { answers = JSON.parse(raw[9] || "{}"); } catch (e) { answers = {}; }
  try { order = JSON.parse(raw[10] || "[]"); } catch (e) { order = []; }
  try { violations = JSON.parse(raw[11] || "[]"); } catch (e) { violations = []; }

  return {
    status: "success",
    can_resume: true,
    session: {
      token: row.token,
      deadline_iso: new Date(deadlineMs).toISOString(),
      remaining_seconds: remaining,
      server_epoch_ms: now.getTime(),
      expired: deadlineMs <= now.getTime()
    },
    answers: answers,
    question_order: order,
    violations: violations,
    status_sesi: row.status
  };
}

/**
 * ---------------------------------------------------------------------------
 * SESI UJIAN BERBATAS WAKTU
 * ---------------------------------------------------------------------------
 */
function startSession(ss, nip, nama, sesi) {
  var sheet = getOrCreateSessionSheet(ss);
  var existing = findActiveSessionFor(sheet, nip, sesi);
  var now = new Date();

  // PENTING (anti-refresh): pakai ulang sesi yang SUDAH ADA untuk NIP+sesi ini
  // meskipun deadline-nya sudah lewat. JANGAN buat sesi baru.
  // Kalau tidak, peserta bisa menekan F5 setelah waktu habis untuk dapat 4 menit lagi.
  if (existing) {
    var deadlineMs = new Date(existing.deadline).getTime();
    var expired = deadlineMs <= now.getTime();
    return {
      token: existing.token,
      start_iso: existing.start,
      deadline_iso: new Date(deadlineMs).toISOString(),
      duration_seconds: EXAM_DURATION_SECONDS,
      server_epoch_ms: now.getTime(),
      server_time_iso: now.toISOString(),
      resumed: true,
      expired: expired,
      remaining_seconds: Math.max(0, Math.round((deadlineMs - now.getTime()) / 1000))
    };
  }

  var deadline = new Date(now.getTime() + EXAM_DURATION_SECONDS * 1000);
  var token = Utilities.getUuid();

  sheet.appendRow([
    token,
    "'" + nip,
    safeCell(nama || "-"),
    safeCell(sesi || "-"),
    now,
    deadline,
    "AKTIF",
    "",
    ""
  ]);

  return {
    token: token,
    start_iso: now.toISOString(),
    deadline_iso: deadline.toISOString(),
    duration_seconds: EXAM_DURATION_SECONDS,
    server_epoch_ms: now.getTime(),
    server_time_iso: now.toISOString(),
    resumed: false,
    expired: false,
    remaining_seconds: EXAM_DURATION_SECONDS
  };
}

function getOrCreateSessionSheet(ss) {
  var sheet = ss.getSheetByName(SESSION_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SESSION_SHEET_NAME);
  }
  var HEADERS = ["Token", "NIP", "Nama", "Sesi", "Mulai", "Deadline", "Status", "Skor", "Selesai",
                 "Jawaban_JSON", "Urutan_Soal", "Pelanggaran_JSON"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  } else {
    // Pastikan kolom 10-12 ada (untuk upgrade dari versi lama yang hanya 9 kolom).
    var lastCol = sheet.getLastColumn();
    if (lastCol < HEADERS.length) {
      for (var c = lastCol + 1; c <= HEADERS.length; c++) {
        sheet.getRange(1, c).setValue(HEADERS[c - 1]).setFontWeight("bold");
      }
    }
  }
  return sheet;
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.getActiveSheet();
}

/**
 * #7: Pastikan header lembar hasil punya kolom "Kode_Verifikasi" (kolom P).
 * Header lama (A-O) dipertahankan; hanya menambah kolom baru bila belum ada.
 */
function ensureResultSheetHeader(sheet) {
  var HEADERS = [
    "Timestamp", "NIP", "Nama_Lengkap", "Unit_Kerja", "Sesi_Ujian",
    "Skor_Akhir", "Jumlah_Benar", "Jumlah_Salah", "Durasi_Pengerjaan",
    "Pelanggaran_Tab", "Status_Integritas", "IP_Address", "Sistem_Operasi",
    "Peramban_Browser", "Resolusi_Layar", "Kode_Verifikasi"
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    return;
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol < HEADERS.length) {
    for (var c = lastCol + 1; c <= HEADERS.length; c++) {
      sheet.getRange(1, c).setValue(HEADERS[c - 1]).setFontWeight("bold");
    }
  }
}

function findSessionRow(sheet, token) {
  if (!token || sheet.getLastRow() <= 1) return null;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === token) {
      return {
        rowNumber: i + 2,
        token: String(values[i][0]).trim(),
        nip: String(values[i][1]).replace(/['"]/g, "").trim(),
        nama: values[i][2],
        sesi: String(values[i][3]).trim().toLowerCase(),
        start: values[i][4],
        deadline: values[i][5],
        status: String(values[i][6] || "").trim().toUpperCase(),
        skor: values[i][7]
      };
    }
  }
  return null;
}

function findActiveSessionFor(sheet, nip, sesi) {
  if (sheet.getLastRow() <= 1) return null;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  for (var i = 0; i < values.length; i++) {
    var rowNip = String(values[i][1]).replace(/['"]/g, "").trim();
    var rowSesi = String(values[i][3]).trim().toLowerCase();
    var rowStatus = String(values[i][6] || "").trim().toUpperCase();
    // PENTING: kembalikan sesi apa pun untuk NIP+sesi ini KECUALI yang sudah SELESAI.
    // Termasuk sesi yang sudah kedaluwarsa -> mencegah peserta refresh untuk dapat 4 menit baru.
    if (rowNip === nip && rowSesi === sesi && rowStatus !== "SELESAI") {
      return {
        rowNumber: i + 2,
        token: String(values[i][0]).trim(),
        start: values[i][4],
        deadline: values[i][5],
        status: rowStatus
      };
    }
  }
  return null;
}

/**
 * Cari sesi TERAKHIR (baris paling bawah) untuk NIP+sesi, apa pun statusnya.
 * Dipakai untuk memulihkan jawaban setelah refresh (RESUME).
 */
function findSessionForResume(sheet, nip, sesi) {
  if (sheet.getLastRow() <= 1) return null;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var found = null;
  for (var i = 0; i < values.length; i++) {
    var rowNip = String(values[i][1]).replace(/['"]/g, "").trim();
    var rowSesi = String(values[i][3]).trim().toLowerCase();
    if (rowNip === nip && rowSesi === sesi) {
      found = {
        rowNumber: i + 2,
        token: String(values[i][0]).trim(),
        nip: rowNip,
        nama: values[i][2],
        sesi: rowSesi,
        start: values[i][4],
        deadline: values[i][5],
        status: String(values[i][6] || "").trim().toUpperCase()
      };
    }
  }
  return found;
}

function markSessionFinished(sheet, rowNumber, skor, when) {
  sheet.getRange(rowNumber, 7).setValue("SELESAI");
  sheet.getRange(rowNumber, 8).setValue(skor);
  sheet.getRange(rowNumber, 9).setValue(when);
}

/**
 * ---------------------------------------------------------------------------
 * GERBANG JADWAL (waktu SERVER)
 * ---------------------------------------------------------------------------
 */
function getScheduleAccess(nowOverride) {
  var now = nowOverride ? new Date(nowOverride) : new Date();
  var start = new Date(EXAM_START_ISO);
  var end = new Date(EXAM_END_ISO);

  if (!ENFORCE_SCHEDULE) {
    return {
      allowed: true,
      mode: "trial",
      message: "Gerbang server terbuka dalam mode uji coba.",
      server_time: now.toISOString()
    };
  }

  var allowed = now >= start && now <= end;
  return {
    allowed: allowed,
    mode: "scheduled",
    message: allowed
      ? "Gerbang ujian terbuka."
      : "Gerbang ujian tertutup. Akses hanya 09.00-09.30 WIB / 10.00-10.30 WITA / 11.00-11.30 WIT.",
    server_time: now.toISOString(),
    opens_at: start.toISOString(),
    closes_at: end.toISOString()
  };
}

/**
 * ---------------------------------------------------------------------------
 * PENILAIAN & INTEGRITAS
 * ---------------------------------------------------------------------------
 */
function scoreAnswers(answers) {
  if (!Array.isArray(answers)) {
    return { valid: false, message: "Format jawaban tidak valid." };
  }

  var submitted = {};
  answers.forEach(function(item) {
    if (item && item.question_id !== undefined) {
      submitted[String(item.question_id)] = String(item.answer || "");
    }
  });

  var ids = Object.keys(ANSWER_KEYS);
  var correct = 0;
  ids.forEach(function(id) {
    if (submitted[id] === ANSWER_KEYS[id]) correct++;
  });

  return {
    valid: true,
    total: ids.length,
    correct: correct,
    wrong: ids.length - correct,
    score: Math.round((correct / ids.length) * 100)
  };
}

function buildIntegrityStatus(count, completionReason, overrunSeconds, graceSeconds) {
  var reason = normalizeText(completionReason) || "SELESAI NORMAL";
  var notes = [];

  if (overrunSeconds > graceSeconds) {
    notes.push("MELEBIHI BATAS WAKTU +" + formatDuration(overrunSeconds));
  } else if (overrunSeconds > 5) {
    notes.push("Toleransi waktu " + formatDuration(overrunSeconds));
  }

  var base;
  if (count >= 3 || reason.indexOf("DISKUALIFIKASI") !== -1) {
    base = "GUGUR - " + count + " pelanggaran tercatat";
  } else if (count > 0) {
    base = "PERINGATAN - " + count + " pelanggaran tercatat";
  } else {
    base = reason + " - LULUS BERSIH";
  }

  return notes.length ? base + " | " + notes.join(" | ") : base;
}

function formatDuration(totalSeconds) {
  var s = Math.max(0, Math.round(totalSeconds));
  var m = Math.floor(s / 60);
  return m + " mnt " + (s % 60) + " dtk";
}

/**
 * ---------------------------------------------------------------------------
 * PENCARIAN & UTILITAS
 * ---------------------------------------------------------------------------
 */
function findExistingSubmission(sheet, targetNip, targetSesi) {
  var nip = normalizeText(targetNip);
  var sesi = normalizeText(targetSesi).toLowerCase();
  var lastRow = sheet.getLastRow();
  if (!nip || lastRow <= 1) return { exists: false };

  var values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  for (var i = 0; i < values.length; i++) {
    var rowNip = String(values[i][1]).replace(/['"]/g, "").trim();
    var rowSesi = String(values[i][4]).trim().toLowerCase();
    if (rowNip === nip && (rowSesi === sesi || sesi === "")) {
      return {
        exists: true,
        timestamp: values[i][0]
          ? Utilities.formatDate(new Date(values[i][0]), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss")
          : "-",
        skor: values[i][5],
        correct: values[i][6],
        wrong: values[i][7],
        durasi: values[i][8],
        integrity_status: values[i][10],
        verification_code: values[i][15] || "",
        rowNumber: i + 2
      };
    }
  }
  return { exists: false };
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Body permintaan kosong.");
  return JSON.parse(e.postData.contents);
}

function normalizeText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function safeCell(value) {
  var text = normalizeText(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Uji internal. Jalankan sekali dari editor Apps Script untuk memastikan logika benar.
 */
function runSelfCheck() {
  var allCorrect = Object.keys(ANSWER_KEYS).map(function(id) {
    return { question_id: Number(id), answer: ANSWER_KEYS[id] };
  });
  var scored = scoreAnswers(allCorrect);
  if (!scored.valid || scored.score !== 100 || scored.correct !== 10) {
    throw new Error("Self-check penilaian gagal: " + JSON.stringify(scored));
  }

  var clean = buildIntegrityStatus(0, "SELESAI NORMAL", 0, SUBMIT_GRACE_SECONDS);
  if (clean.indexOf("LULUS BERSIH") === -1) throw new Error("Self-check integritas gagal: " + clean);

  var late = buildIntegrityStatus(0, "SELESAI NORMAL", 600, SUBMIT_GRACE_SECONDS);
  if (late.indexOf("MELEBIHI BATAS WAKTU") === -1) throw new Error("Self-check keterlambatan gagal: " + late);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sessionSheet = getOrCreateSessionSheet(ss);
  Logger.log("SELF-CHECK PASS | skor=" + scored.score +
             " | sheet sesi=" + sessionSheet.getName() +
             " | durasi=" + EXAM_DURATION_SECONDS + " dtk");
}


/**
 * ⚠️ FUNGSI ADMIN — HANYA UNTUK DIJALANKAN MANUAL DARI EDITOR APPS SCRIPT ⚠️
 *
 * Membersihkan seluruh data uji (Sheet1 + Sesi_Aktif) sebelum ujian sesungguhnya.
 * Cara pakai: buka editor Apps Script -> pilih fungsi ini di dropdown -> klik "Jalankan".
 *
 * 🔴 JANGAN PERNAH memanggil fungsi ini dari doGet/doPost atau mengeksposnya lewat HTTP.
 *    Siapa pun yang memiliki URL /exec bisa menghapus seluruh nilai peserta tanpa login.
 *    (Endpoint `?action=clear_database_testing_secret_key_brin` sudah DIHAPUS karena alasan ini.)
 */
function clearDatabaseForTesting() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    if (s.getLastRow() > 1) {
      s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
    }
  }
  Logger.log("DATABASE BERHASIL DIBERSIHKAN!");
}
