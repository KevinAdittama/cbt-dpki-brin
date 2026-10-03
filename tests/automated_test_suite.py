"""
Automated Test Suite for CBT Visualisasi Data DPKI BRIN
Tests all backend API contracts, server-side scoring, anti-tamper, duplicate guard,
timer synchronization, and resume capability WITHOUT GUI / browser dependencies.
"""

import urllib.request
import json
import time
import sys

BASE_URL = "https://script.google.com/macros/s/AKfycbyatiH1UGQROjUS2pO4oiqdQ7fBJEub1Js3b7aCtVs_nMTi-OZ1366SxmmKXqvAKAVBbg/exec"

# 10 Soal Kunci Jawaban Resmi Server
OFFICIAL_ANSWERS = [
    {"question_id": 1, "answer": "Membantu pembaca melihat pola, tren, dan kesimpulan data dengan cepat"},
    {"question_id": 2, "answer": "Microsoft Excel"},
    {"question_id": 3, "answer": "Pivot Chart"},
    {"question_id": 4, "answer": "Conditional Formatting (Format Bersyarat)"},
    {"question_id": 5, "answer": "Diagram Garis (Line Chart)"},
    {"question_id": 6, "answer": "Diagram Lingkaran / Donat (Pie / Donut Chart)"},
    {"question_id": 7, "answer": "Karena 25 irisan membuat grafik terlalu padat dan label nama spesies sulit dibaca"},
    {"question_id": 8, "answer": "Diagram Batang (Bar / Column Chart)"},
    {"question_id": 9, "answer": "Perlakuan B terlihat berkali-kali lipat lebih unggul dari A, padahal selisih aslinya hanya 2 kg"},
    {"question_id": 10, "answer": "Judul Grafik (Chart Title) dan label data yang jelas"}
]

def post(payload, timeout=60):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(BASE_URL, data=data, headers={"Content-Type": "text/plain;charset=utf-8"})
    for attempt in range(3):
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                rtt = time.time() - t0
                raw = resp.read().decode("utf-8")
                res = json.loads(raw)
                res["_rtt_seconds"] = round(rtt, 3)
                return res
        except Exception as e:
            if attempt == 2:
                raise e
            time.sleep(2)

def get(params, timeout=30):
    query = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items()) if isinstance(params, dict) else params
    url = f"{BASE_URL}?{query}"
    t0 = time.time()
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        rtt = time.time() - t0
        raw = resp.read().decode("utf-8")
        try:
            res = json.loads(raw)
        except Exception as e:
            print("RAW RESPONSE FROM SERVER:", raw)
            raise e
        res["_rtt_seconds"] = round(rtt, 3)
        return res

import urllib.parse

def run_test_normal_flow():
    print("\n--- [UJI 1] Alur Peserta Normal (10/10 Benar) ---")
    nip = "199501012022031001"
    nama = "Dr. Bambang Setiawan, M.Sc."
    
    # 1. Login / Check NIP
    print("1. Melakukan CHECK_NIP...")
    chk = post({"action": "CHECK_NIP", "nip": nip, "sesi": "pre-test", "nama": nama})
    assert chk.get("status") == "success", f"Check NIP gagal: {chk}"
    assert chk.get("allowed") is True, f"Check NIP tidak diizinkan: {chk}"
    token = chk["session"]["token"]
    print(f"   ✓ Sesi berhasil dimulai, Token: {token[:12]}..., RTT: {chk['_rtt_seconds']}s")
    
    # 2. Heartbeat
    print("2. Mengirim HEARTBEAT...")
    hb = post({"action": "HEARTBEAT", "session_token": token})
    assert hb.get("status") == "success", f"Heartbeat gagal: {hb}"
    assert "remaining_seconds" in hb, "Tidak ada remaining_seconds"
    print(f"   ✓ Heartbeat sukses, sisa waktu server: {hb['remaining_seconds']}s")
    
    # 3. Submit Answers
    print("3. Mengirim 10 Jawaban Benar...")
    sub = post({
        "action": "SCORE_AND_SUBMIT",
        "session_token": token,
        "nip": nip,
        "nama": nama,
        "sesi": "pre-test",
        "satker": "Pusat Riset Data dan Komputasi BRIN",
        "answers": OFFICIAL_ANSWERS,
        "violations": [],
        "completion_reason": "SELESAI (Normal)",
        "durasi": "02:15"
    })
    assert sub.get("status") == "success", f"Submit gagal: {sub}"
    res = sub.get("result", {})
    assert res.get("score") == 100, f"Skor harus 100, tetapi dapat: {res.get('score')}"
    assert res.get("correct") == 10, f"Benar harus 10, dapat: {res.get('correct')}"
    assert res.get("wrong") == 0, f"Salah harus 0, dapat: {res.get('wrong')}"
    assert "integrity_status" in res, "Tidak ada integrity_status"
    print(f"   ✓ Nilai Server: {res['score']}/100 (Benar: {res['correct']}, Salah: {res['wrong']})")
    print(f"   ✓ Status Integritas: {res['integrity_status']}")
    
    # 4. Anti-Duplicate Test
    print("4. Menguji Proteksi Duplikat (Mencoba Login Ulang)...")
    re_chk = post({"action": "CHECK_NIP", "nip": nip, "sesi": "pre-test", "nama": nama})
    assert re_chk.get("allowed") is False, "NIP yang sudah selesai HARUS DITOLAK!"
    print(f"   ✓ Proteksi Duplikat Berhasil: {re_chk.get('message')}")
    return True

def run_test_anti_tamper():
    print("\n--- [UJI 2] Proteksi Manipulasi & Keamanan Backend ---")
    nip = "199002022020121002"
    nama = "Penyerang Injeksi Skor"
    
    # 1. Login
    chk = post({"action": "CHECK_NIP", "nip": nip, "sesi": "pre-test", "nama": nama})
    token = chk["session"]["token"]
    
    # 2. Coba manipulasi dengan mengirim jawaban salah, tetapi mengklaim skor 100 di payload
    print("1. Menguji Penilaian Murni Sisi Server (Jawaban Salah tapi Klaim 100)...")
    wrong_answers = [{"question_id": i, "answer": "Jawaban Asal Ngawur"} for i in range(1, 11)]
    sub = post({
        "action": "SCORE_AND_SUBMIT",
        "session_token": token,
        "nip": nip,
        "nama": nama,
        "sesi": "pre-test",
        "satker": "Laboratorium Keamanan Komputasi",
        "answers": wrong_answers,
        "score": 100, # manipulasi klien
        "correct": 10,
        "wrong": 0,
        "violations": [],
        "completion_reason": "SELESAI (Normal)"
    })
    assert sub.get("status") == "success"
    res = sub.get("result", {})
    assert res.get("score") == 0, f"Server HARUS menghitung ulang skor menjadi 0, bukan {res.get('score')}!"
    assert res.get("correct") == 0
    assert res.get("wrong") == 10
    print(f"   ✓ Penilaian Server Aman: Server mengabaikan klaim klien dan menghitung nilai asli: {res.get('score')}")
    
    # 3. Coba kirim dengan token palsu
    print("2. Menguji Penolakan Token Sesi Palsu...")
    fake_sub = post({
        "action": "SCORE_AND_SUBMIT",
        "session_token": "FAKE_TOKEN_INJECTION_9999",
        "nip": "999999999999999999",
        "nama": "Fake User",
        "sesi": "pre-test",
        "satker": "Laboratorium",
        "answers": OFFICIAL_ANSWERS
    })
    assert fake_sub.get("status") == "rejected"
    print(f"   ✓ Token palsu ditolak: {fake_sub.get('message')}")
    return True

def run_test_timer_and_readonly():
    print("\n--- [UJI 3] Verifikasi check_nip Read-Only & Resume Progress ---")
    nip = "1234567890123456" # NIK 16 digit
    nama = "Peserta NIK Non-PNS"
    
    # 1. GET check_nip (Harus Read-Only)
    print("1. Menguji GET check_nip...")
    chk_get = get({"action": "check_nip", "nip": nip, "sesi": "pre-test"})
    assert chk_get.get("status") == "success"
    assert chk_get.get("read_only") is True, f"GET check_nip HARUS read_only:true, tetapi dapat: {chk_get}"
    assert "session" not in chk_get, "GET check_nip TIDAK BOLEH membuat sesi!"
    print("   ✓ GET check_nip berstatus read-only murni (tidak membuat tiket sesi).")
    
    # 2. Start Session
    chk_post = post({"action": "CHECK_NIP", "nip": nip, "sesi": "pre-test", "nama": nama})
    token = chk_post["session"]["token"]
    
    # 3. Save Progress
    print("2. Menyimpan Progress Parsial (SAVE_PROGRESS)...")
    partial_answers = [OFFICIAL_ANSWERS[0], OFFICIAL_ANSWERS[1]]
    save_res = post({
        "action": "SAVE_PROGRESS",
        "session_token": token,
        "answers": partial_answers,
        "question_order": [{"id": 1}, {"id": 2}]
    })
    assert save_res.get("status") == "success"
    print("   ✓ Progress berhasil disimpan di server.")
    
    # 4. Resume
    print("3. Memulihkan Sesi (RESUME)...")
    resume_res = post({"action": "RESUME", "nip": nip, "sesi": "pre-test"})
    assert resume_res.get("status") == "success"
    assert resume_res.get("can_resume") is True
    assert resume_res["session"]["token"] == token
    assert len(resume_res.get("answers", [])) == 2, "Jawaban tersimpan harus ada 2"
    print(f"   ✓ Sesi berhasil dipulihkan: Token={token[:10]}..., Sisa={resume_res['session']['remaining_seconds']}s")
    print(f"   ✓ Jawaban terpulihkan: {len(resume_res['answers'])} butir soal tersimpan.")
    return True

def run_test_server_authority():
    print("\n--- [UJI 4] Otoritas Server: Durasi & Kode Verifikasi (#7 & #8) ---")
    nip = "5566778899001122"  # NIK 16 digit
    nama = "Peserta Uji Otoritas Server"

    chk = post({"action": "CHECK_NIP", "nip": nip, "sesi": "pre-test", "nama": nama})
    token = chk["session"]["token"]

    # Kirim durasi & kode verifikasi PALSU dari klien -> harus diabaikan server.
    print("1. Mengirim durasi & kode verifikasi PALSU dari klien...")
    sub = post({
        "action": "SCORE_AND_SUBMIT",
        "session_token": token,
        "nip": nip,
        "nama": nama,
        "sesi": "pre-test",
        "satker": "Pusat Riset Uji",
        "answers": OFFICIAL_ANSWERS,
        "violations": [],
        "completion_reason": "SELESAI (Normal)",
        "durasi": "999 mnt 999 dtk",                      # palsu
        "verification_code": "BRIN-DPKI-CBT-PALSU-000000" # palsu
    })
    assert sub.get("status") == "success", f"Submit gagal: {sub}"
    res = sub.get("result", {})

    # #8: durasi dihitung server (bukan 999 mnt 999 dtk)
    durasi = res.get("durasi", "")
    assert durasi != "999 mnt 999 dtk", f"Durasi klien TIDAK BOLEH diterima! dapat: {durasi}"
    assert "mnt" in durasi and "dtk" in durasi, f"Format durasi server tidak valid: {durasi}"
    print(f"   ✓ Durasi dihitung server (abaikan klien): '{durasi}'")

    # #7: kode verifikasi dibuat server, format resmi, bukan milik klien
    vcode = res.get("verification_code", "")
    assert vcode.startswith("BRIN-DPKI-CBT-"), f"Kode verifikasi server tidak valid: {vcode}"
    assert vcode != "BRIN-DPKI-CBT-PALSU-000000", "Kode verifikasi klien TIDAK BOLEH diterima!"
    assert len(vcode) >= 24, f"Kode verifikasi terlalu pendek: {vcode}"
    print(f"   ✓ Kode verifikasi dibuat server: '{vcode}'")
    return True

if __name__ == "__main__":
    t_start = time.time()
    try:
        run_test_normal_flow()
        run_test_anti_tamper()
        run_test_timer_and_readonly()
        run_test_server_authority()
        print(f"\n==========================================")
        print(f"✅ SEMUA 4 PENGUJIAN LULUS 100% DALAM {round(time.time() - t_start, 2)} DETIK!")
        print(f"==========================================")
    except AssertionError as e:
        print(f"\n❌ PENGUJIAN GAGAL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR TAK TERDUGA: {e}")
        sys.exit(1)
