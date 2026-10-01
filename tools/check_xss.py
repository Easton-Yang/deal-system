#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
사용자 입력이 escape 없이 화면에 들어가는 곳을 전수 검사합니다.

쓰는 법 (프로젝트 폴더에서):
    python3 tools/check_xss.py

왜 필요한가
    이 프로젝트는 화면을 템플릿 문자열(`...${값}...`)로 만들어 innerHTML 에
    넣습니다. 딜명·메모·파일명처럼 밖에서 들어온 글자에 HTML 태그가 섞여
    있으면 그대로 실행됩니다. 눈으로 훑으면 빠뜨리기 쉬워서 자동 검사를
    둡니다. 화면 코드를 고친 뒤 이 스크립트를 돌려 0건인지 확인하세요.

검사 방법
    HTML 안의 모든 ${...} 치환부를 찾아, DB에서 온 텍스트 필드를
    참조하면서 escapeHtml() 등 안전한 처리를 거치지 않은 것을 찾아냅니다.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILES = ['index.html', 'deals.html', 'deal-new.html',
         'deal-detail.html', 'portfolio.html', 'login.html', 'admin.html']

# DB·사용자에서 오는 텍스트 필드
USER_FIELDS = [
    'deal_name', 'introducer_gp', 'assigned_to', 'intake_channel',
    'asset_class', 'current_stage', 'final_result', 'first_opinion',
    'note_text', 'author', 'changed_by', 'file_name', 'uploaded_by',
    'file_path', 'full_name', 'username', 'email', 'intake_date', 'deal_size',
]

# 이미 안전한 처리를 거치는 형태
SAFE_WRAPPERS = [
    'escapeHtml(',          # HTML 특수문자 변환
    'formatCurrency(', 'formatDate(', 'formatDateTime(', 'fileSize(',
    'stageBadge(', 'assetBadge(', 'resultBadge(',   # 고정 문자열만 반환
    'fileIcon(',                                    # 고정 CSS 클래스만 반환
    'stageProgressHTML(',   # 인자는 비교에만 쓰고, 출력은 STAGES 상수뿐
    '.toLowerCase(', '.length',
]

# 값을 출력하지 않고 '비교'에만 쓰는 형태
#   예) ${deal.asset_class===a?'selected':''}  → 출력은 selected 또는 빈 문자열
COMPARISON_ONLY = re.compile(
    r"(===|!==|==|!=).*\?\s*'[^']*'\s*:\s*'[^']*'\s*$"
)


def main():
    findings = []
    checked = 0

    for name in FILES:
        path = os.path.join(ROOT, name)
        if not os.path.isfile(path):
            print('  건너뜀: %s 없음' % name)
            continue
        src = io.open(path, encoding='utf-8').read()
        checked += 1

        for m in re.finditer(r'\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', src):
            expr = m.group(1)
            line = src[:m.start()].count('\n') + 1

            hits = [f for f in USER_FIELDS if f in expr]
            if not hits:
                continue
            if any(w in expr for w in SAFE_WRAPPERS):
                continue
            if COMPARISON_ONLY.search(expr.strip()):
                continue

            findings.append((name, line, expr.strip()[:90], hits))

    print('검사 파일 %d개 / 사용자 필드 %d종\n' % (checked, len(USER_FIELDS)))

    if findings:
        print('escape 되지 않은 출력 %d건:' % len(findings))
        for name, line, expr, hits in findings:
            print('  %s:%d  [%s]' % (name, line, ', '.join(hits)))
            print('      %s' % expr)
        print('\n→ 해당 위치를 escapeHtml(...) 로 감싸세요.')
        print('  속성(onclick 등)에 값을 끼워 넣는 경우에는 data-* 속성 +')
        print('  이벤트 위임으로 바꾸는 편이 안전합니다 (deals.html 삭제 버튼 참고).')
        return 1

    print('escape 누락 0건 — 사용자 입력이 모두 처리되고 있습니다.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
