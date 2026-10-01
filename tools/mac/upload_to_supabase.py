#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
js/seed-data.js 의 딜 247건과 단계 이력을 Supabase 로 직접 업로드합니다.
서비스 롤 키를 써서 RLS 를 우회하므로, Supabase 대시보드에서 RLS 를 끄지 않아도 됩니다.

사용법:  python3 tools/mac/upload_to_supabase.py

[주의] 이 스크립트는 service_role 키(DB 전체 권한)를 씁니다.
  - 키는 .service_role_key 파일에 한 줄로 두세요 (.gitignore 처리됨).
  - 업로드가 끝나면 그 키 파일은 지우는 편이 안전합니다.
  - 로그인한 사용자로 업로드하려면 admin.html 의 '데이터 업로드' 버튼을 쓰세요.
    그쪽은 service_role 키가 필요 없습니다.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "js" / "config.js"
SEED = ROOT / "js" / "seed-data.js"
# service_role 키는 브라우저가 불러가지 않는 이 파일에만 둡니다 (.gitignore 처리됨).
KEYFILE = ROOT / ".service_role_key"

DEAL_KEYS = [
    "id", "deal_name", "intake_channel", "intake_date", "asset_class",
    "assigned_to", "deal_size", "introducer_gp", "current_stage",
    "first_opinion", "final_result", "created_at", "updated_at",
]
HISTORY_KEYS = ["id", "deal_id", "stage", "changed_at", "changed_by"]


def read_const(text, name):
    """config.js 에서 const NAME = '...' 값을 읽습니다."""
    m = re.search(r"const\s+%s\s*=\s*'([^']*)'" % name, text)
    if not m:
        sys.exit("config.js 에서 %s 를 찾을 수 없습니다." % name)
    return m.group(1)


def read_array(text, name, keys):
    """seed-data.js 의 const NAME = [ ... ]; 를 파이썬 리스트로 바꿉니다."""
    start = text.index("const %s = [" % name) + len("const %s = " % name)
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                raw = text[start:i + 1]
                break
    else:
        sys.exit("%s 배열의 끝을 찾을 수 없습니다." % name)

    # 따옴표 없는 키(deal_name: 등)를 JSON 형식("deal_name":)으로 바꿉니다.
    for key in keys:
        raw = re.sub(r"([{,])%s:" % re.escape(key), r'\1"%s":' % key, raw)
    # JS 는 허용하지만 JSON 은 허용하지 않는 마지막 쉼표를 제거합니다.
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)
    return json.loads(raw)


def post(url, key, table, rows):
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        "%s/rest/v1/%s" % (url, table),
        data=body,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Content-Profile": "public",
            # 같은 id 가 이미 있으면 덮어씁니다. 여러 번 실행해도 안전합니다.
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status, ""
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def count(url, key, table):
    req = urllib.request.Request(
        "%s/rest/v1/%s?select=id" % (url, table),
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.headers.get("Content-Range", "?").split("/")[-1]


def upload(url, key, table, rows, batch=50):
    print("\n[%s] %d건 업로드" % (table, len(rows)))
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        status, err = post(url, key, table, chunk)
        if status >= 300:
            print("  실패 (%d~%d번째): HTTP %d\n  %s" % (i + 1, i + len(chunk), status, err))
            sys.exit(1)
        print("  %d / %d 완료" % (i + len(chunk), len(rows)))


def main():
    cfg = CONFIG.read_text(encoding="utf-8")
    url = read_const(cfg, "SUPABASE_URL").rstrip("/")
    if not KEYFILE.exists():
        sys.exit("%s 파일이 없습니다. Supabase 대시보드 > Settings > API 의\n"
                 "service_role 키를 한 줄로 저장해 주세요." % KEYFILE)
    key = KEYFILE.read_text(encoding="utf-8").strip()

    seed = SEED.read_text(encoding="utf-8")
    deals = read_array(seed, "DEMO_DEALS_SEED", DEAL_KEYS)
    history = read_array(seed, "DEMO_STAGE_HISTORY_SEED", HISTORY_KEYS)
    # 이력의 id 는 "h1" 같은 임시 값이어서 UUID 컬럼에 넣을 수 없습니다.
    # id 를 빼고 보내 DB 가 UUID 를 직접 만들게 합니다.
    for row in history:
        row.pop("id", None)
    print("읽어온 데이터: 딜 %d건, 단계 이력 %d건" % (len(deals), len(history)))

    before = count(url, key, "deal_stage_history")
    if before != "0":
        sys.exit("deal_stage_history 에 이미 %s건이 있습니다. 중복을 막기 위해 중단합니다." % before)

    upload(url, key, "deals", deals)
    upload(url, key, "deal_stage_history", history)

    print("\n업로드 후 DB 건수")
    for table in ("deals", "deal_stage_history", "deal_notes"):
        print("  %-20s %s건" % (table, count(url, key, table)))


if __name__ == "__main__":
    main()
