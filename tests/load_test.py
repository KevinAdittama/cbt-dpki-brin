"""Uji Beban (Load Test) — Portal CBT DATA NOVA 5.0 (DPKI BRIN)

Mensimulasikan N peserta mengerjakan ujian BERSAMAAN lewat backend live,
tanpa browser. Mengukur: tingkat keberhasilan, latensi, dan jenis kegagalan.

Skenario per peserta:
  1. CHECK_NIP  -> dapat token + deadline (membuka sesi 4 menit)
  2. HEARTBEAT  -> refresh sisa waktu
  3. SCORE_AND_SUBMIT -> kirim jawaban, server menilai

Jalankan:  python tests/load_test.py 10
           python tests/load_test.py 25
           python tests/load_test.py 50
"""
import json, sys, time, random, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://script.google.com/macros/s/AKfycbyatiH1UGQROjUS2pO4oiqdQ7fBJEub1Js3b7aCtVs_nMTi-OZ1366SxmmKXqvAKAVBbg/exec"

# Kunci jawaban resmi (teks) — agar skor = 100
KEYS = [
    "Membantu pembaca melihat pola, tren, dan kesimpulan data dengan cepat",
    "Microsoft Excel", "Pivot Chart", "Conditional Formatting (Format Bersyarat)",
    "Diagram Garis (Line Chart)", "Diagram Lingkaran / Donat (Pie / Donut Chart)",
    "Karena 25 irisan membuat grafik terlalu padat dan label nama spesies sulit dibaca",
    "Diagram Batang (Bar / Column Chart)",
    "Perlakuan B terlihat berkali-kali lipat lebih unggul dari A, padahal selisih aslinya hanya 2 kg",
    "Judul Grafik (Chart Title) dan label data yang jelas",
]

def post(payload, timeout=300, maks_coba=6):
    """POST dengan auto-retry saat server membalas busy (meniru perilaku frontend)."""
    data = json.dumps(payload).encode("utf-8")
    t0 = time.time()
    for coba in range(1, maks_coba + 1):
        req = urllib.request.Request(BASE_URL, data=data,
                                     headers={"Content-Type": "text/plain;charset=utf-8"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                res = json.loads(r.read().decode("utf-8"))
        except Exception:
            if coba < maks_coba:
                time.sleep(3); continue
            raise
        if res.get("busy") and coba < maks_coba:
            time.sleep(res.get("retry_after_seconds", 5)); continue
        return res, round(time.time() - t0, 2)
    return res, round(time.time() - t0, 2)

def get(params, timeout=300):
    q = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
    req = urllib.request.Request(f"{BASE_URL}?{q}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")

def bersihkan():
    return get({"action": "clear_database_testing_secret_key_brin"})

def peserta(idx, hasil):
    """Satu peserta lengkap. hasil = list untuk dikumpulkan."""
    nip = f"9{idx:015d}"[:16]  # 16 digit unik
    nama = f"Peserta Beban {idx:02d}"
    rec = {"idx": idx, "nip": nip, "ok": False, "tahap": "", "err": "", "lat": {}}
    try:
        # 1. CHECK_NIP
        t0 = time.time()
        chk, lat = post({"action": "CHECK_NIP", "nip": nip, "sesi": "Pre-Test", "nama": nama})
        rec["lat"]["check"] = lat
        if chk.get("status") != "success" or not chk.get("session", {}).get("token"):
            rec["tahap"] = "CHECK_NIP"; rec["err"] = str(chk)[:200]; return rec
        token = chk["session"]["token"]

        # 2. HEARTBEAT
        hb, lat = post({"action": "HEARTBEAT", "session_token": token})
        rec["lat"]["hb"] = lat
        if hb.get("status") != "success":
            rec["tahap"] = "HEARTBEAT"; rec["err"] = str(hb)[:200]; return rec

        # 3. SCORE_AND_SUBMIT
        answers = [{"question_id": i + 1, "answer": KEYS[i]} for i in range(10)]
        sub, lat = post({
            "action": "SCORE_AND_SUBMIT", "session_token": token, "nip": nip,
            "nama": nama, "satker": "Pusat Riset Uji Beban", "sesi": "Pre-Test",
            "answers": answers, "violations": [], "completion_reason": "SELESAI (Normal)",
            "durasi": "01:00"
        })
        rec["lat"]["submit"] = lat
        if sub.get("status") != "success":
            rec["tahap"] = "SUBMIT"; rec["err"] = str(sub)[:200]; return rec
        rec["skor"] = sub.get("result", {}).get("score")
        rec["vcode"] = sub.get("result", {}).get("verification_code", "")[:24]
        rec["ok"] = True
        rec["tahap"] = "SELESAI"
    except Exception as e:
        rec["tahap"] = rec["tahap"] or "EXCEPTION"
        rec["err"] = f"{type(e).__name__}: {e}"[:200]
    return rec

def jalankan(n):
    print(f"\n{'='*66}")
    print(f"  UJI BEBAN: {n} PESERTA BERSAMAAN")
    print(f"{'='*66}")
    print("Bersihkan database...", bersihkan().strip())
    time.sleep(2)

    hasil = []
    t_mulai = time.time()
    with ThreadPoolExecutor(max_workers=n) as ex:
        futs = [ex.submit(peserta, i + 1, hasil) for i in range(n)]
        for f in as_completed(futs):
            hasil.append(f.result())
    total_detik = round(time.time() - t_mulai, 2)

    sukses = [h for h in hasil if h["ok"]]
    gagal = [h for h in hasil if not h["ok"]]

    def stat(kunci):
        vals = [h["lat"][kunci] for h in sukses if kunci in h["lat"]]
        return (round(sum(vals)/len(vals), 2), round(max(vals), 2)) if vals else (0, 0)

    print(f"\nHASIL:")
    print(f"  Sukses      : {len(sukses)}/{n} ({round(len(sukses)/n*100)}%)")
    print(f"  Gagal       : {len(gagal)}/{n}")
    print(f"  Total waktu : {total_detik} dtk")
    print(f"  Latensi CHECK_NIP (rata2/max): {stat('check')[0]} / {stat('check')[1]} dtk")
    print(f"  Latensi HEARTBEAT (rata2/max): {stat('hb')[0]} / {stat('hb')[1]} dtk")
    print(f"  Latensi SUBMIT    (rata2/max): {stat('submit')[0]} / {stat('submit')[1]} dtk")

    skor_set = set(h.get("skor") for h in sukses)
    vcode_ok = sum(1 for h in sukses if h.get("vcode", "").startswith("BRIN-DPKI-CBT-"))
    print(f"  Skor unik   : {skor_set} (harus {{100}})")
    print(f"  Kode verif server valid: {vcode_ok}/{len(sukses)}")

    if gagal:
        print(f"\n  RINCIAN KEGAGALAN:")
        for g in gagal[:15]:
            print(f"    #{g['idx']:02d} tahap={g['tahap']}: {g['err']}")

    print("\nBersihkan database setelah uji...", bersihkan().strip())
    return {"n": n, "sukses": len(sukses), "gagal": len(gagal),
            "total_detik": total_detik,
            "check": stat("check"), "hb": stat("hb"), "submit": stat("submit"),
            "skor_ok": skor_set == {100}, "vcode_ok": vcode_ok}

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    r = jalankan(n)
    print(f"\n{'='*66}")
    print("RINGKASAN:", json.dumps(r, ensure_ascii=False))
    print(f"{'='*66}")
