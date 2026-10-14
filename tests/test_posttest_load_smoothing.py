from pathlib import Path
import re

HTML = Path(r"D:\kerjaan\BRIN\07_pretes_post_tes\VERSI_20_SOAL\posttest20.html")
text = HTML.read_text(encoding="utf-8")


def test_login_uses_random_jitter_queue():
    assert "LOGIN_JITTER_MAX_MS = 20000" in text
    assert "await waitForLoginQueue()" in text
    assert "Antrean verifikasi" in text


def test_answer_click_is_local_only():
    block = re.search(r"function selectOption\(qIndex, selectedText\) \{(.*?)\n    \}", text, re.S)
    assert block, "selectOption tidak ditemukan"
    body = block.group(1)
    assert "saveToLocalStorage()" in body
    assert "scheduleProgressSync()" not in body


def test_server_backup_only_every_five_questions():
    assert "const PROGRESS_SYNC_MILESTONES = [5, 10, 15]" in text
    nav = re.search(r"function navigateQuestion\(step\) \{(.*?)\n    \}", text, re.S)
    assert nav, "navigateQuestion tidak ditemukan"
    assert "syncMilestoneIfNeeded" in nav.group(1)
    timeout = re.search(r"function startQuestionTimer\(\) \{(.*?)\n    \}", text, re.S)
    assert timeout, "startQuestionTimer tidak ditemukan"
    assert "syncMilestoneIfNeeded" in timeout.group(1)


def test_final_submit_keeps_local_data_until_server_success():
    assert "localStorage.removeItem" in text
    success_pos = text.find('serverResult.status !== "success"')
    remove_pos = text.find("localStorage.removeItem", success_pos)
    assert success_pos >= 0 and remove_pos > success_pos
