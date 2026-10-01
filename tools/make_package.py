#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IT 전달 패키지(IT전달패키지_v1.0/01_src) 재생성 스크립트 — 맥·리눅스·윈도 공통

쓰는 법 (프로젝트 폴더에서):
    python3 tools/make_package.py

하는 일
    1. 루트의 HTML을 01_src/ 로 복사하면서 CDN 주소를 vendor/ 로컬 경로로 바꿉니다.
    2. css/style.css, js/common.js, js/seed-data.js 를 그대로 복사합니다.
    3. 01_src/js/config.js 는 운영용 템플릿이므로 '덮어쓰지 않습니다'.
    4. 치환되지 않고 남은 외부 주소가 있으면 오류로 알려줍니다
       (인터넷이 없는 내부망에서 화면이 깨지는 것을 막기 위함).

왜 필요한가
    tools/windows/ 의 스크립트는 PowerShell·COM 전용이라 맥에서 돌지 않습니다.
    소스를 고칠 때마다 손으로 주소 5~7개를 바꾸면 빠뜨리기 쉽습니다.
"""

import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_OUT = os.path.join(ROOT, 'IT전달패키지_v1.0', '01_src')

# 복사할 HTML (login.html, admin.html 포함 — 인증이 생겼으므로 반드시 들어가야 합니다)
HTML_FILES = [
    'login.html', 'admin.html', 'index.html', 'deals.html',
    'deal-new.html', 'deal-detail.html', 'portfolio.html',
]

# 그대로 복사할 파일
COPY_AS_IS = [
    ('css/style.css', 'css/style.css'),
    ('js/common.js', 'js/common.js'),
    ('js/seed-data.js', 'js/seed-data.js'),
]

# 덮어쓰면 안 되는 파일 (운영용 설정 템플릿)
DO_NOT_OVERWRITE = ['js/config.js']

# CDN 주소 → 패키지 내부 vendor 경로
CDN_MAP = {
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2':
        'vendor/supabase/supabase.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css':
        'vendor/bootstrap/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css':
        'vendor/bootstrap/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js':
        'vendor/bootstrap/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js':
        'vendor/bootstrap/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js':
        'vendor/chartjs/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css':
        'vendor/fontawesome/css/all.min.css',
}

# 치환 후에도 남아도 되는 주소 (화면 동작과 무관한 설명·주석용)
ALLOWED_REMAINING = ()


def read(path):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def main():
    if not os.path.isdir(SRC_OUT):
        print('오류: %s 폴더가 없습니다.' % SRC_OUT)
        return 1

    problems = []
    print('IT 전달 패키지 소스를 다시 만듭니다.\n')

    # 1) HTML 복사 + CDN 치환
    for name in HTML_FILES:
        src = os.path.join(ROOT, name)
        if not os.path.isfile(src):
            problems.append('루트에 %s 가 없습니다.' % name)
            continue

        text = read(src)
        replaced = 0
        # 긴 주소부터 바꿔야 짧은 주소에 먹히지 않습니다.
        for url in sorted(CDN_MAP, key=len, reverse=True):
            if url in text:
                replaced += text.count(url)
                text = text.replace(url, CDN_MAP[url])

        # 남은 외부 주소 점검 (내부망에서는 전부 끊깁니다)
        leftovers = [u for u in re.findall(r'https?://[^\s"\'<>]+', text)
                     if not u.startswith(ALLOWED_REMAINING)] if ALLOWED_REMAINING \
            else re.findall(r'https?://[^\s"\'<>]+', text)
        if leftovers:
            problems.append('%s: 치환되지 않은 외부 주소 %d건 → %s'
                            % (name, len(leftovers), ', '.join(sorted(set(leftovers))[:3])))

        write(os.path.join(SRC_OUT, name), text)
        print('  복사+치환  %-18s (주소 %d건 치환)' % (name, replaced))

    # 2) 그대로 복사
    for rel_src, rel_dst in COPY_AS_IS:
        src = os.path.join(ROOT, rel_src)
        if not os.path.isfile(src):
            problems.append('루트에 %s 가 없습니다.' % rel_src)
            continue
        dst = os.path.join(SRC_OUT, rel_dst)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        print('  그대로복사 %-18s' % rel_src)

    # 3) 덮어쓰지 않는 파일 안내
    for rel in DO_NOT_OVERWRITE:
        print('  건너뜀     %-18s (운영용 템플릿이라 유지)' % rel)

    print()
    if problems:
        print('※ 확인이 필요한 항목:')
        for p in problems:
            print('   - ' + p)
        return 1

    print('완료. 외부 인터넷 주소가 남지 않았습니다.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
