# holodori-calculator

[🇯🇵 日本語版はこちら / Japanese version](./README.ja.md)

hololive Dreams(홀로도리) 개인용 비공식 편성 계산기. 사쿠라 미코 오시 계정 최적화용.

## ⚠️ 먼저 읽기: 이 계산기가 할 수 없는 것

**공식 스코어 계산식은 2026-07-29 현재 어디에도 공개되지 않았습니다.** 공식 사이트,
JP 공략위키(gamerch/appmedia/game8), 가장 상세한 비공식 팬사이트(horodori.com),
데이터마인/APK역해석 커뮤니티까지 전부 확인했으나 발견하지 못했습니다.

horodori.com이 유일하게 "편성 시뮬레이터"(계산 도구)를 만들었지만, 그 사이트조차
스스로 다음을 계산에서 제외한다고 명시합니다:

> 換算式が未確定のスコアサポートは未算入で、開花・ボード・ライブ中の発動も含めていないため、実ゲームの獲得スコアや厳密な最適解を示すものではありません。
>
> (번역: 환산식이 미확정인 스코어서포트는 미포함, 개화·보드·라이브 중 발동도 포함하지 않으므로, 실제 게임 획득 스코어나 엄밀한 최적해를 나타내는 것이 아닙니다.)
>
> — [horodori.com/members/deck-builder](https://www.horodori.com/members/deck-builder) (2026-07-29 확인)

**이 계산기도 같은 범위만 계산합니다.** "절대 점수 예측"이 아니라 "편성 A vs 편성 B
상대 비교용 시산값"으로만 쓰세요. 실전 확정은 게임 내 실측(유닛스코어 미리보기 +
실제 플레이 점수)이 여전히 유일하게 정확한 방법입니다.

## 계산에 포함되는 것 / 제외되는 것

| 포함 (숫자로 계산) | 제외 (조건만 표시, 수치 미반영) |
|---|---|
| 멤버 5명의 Performance/Technique/Sense 합 (리더 본인 스탯 제외) | 스코어서포트 (환산식 자체가 미확정) |
| 리더 의상스킬의 파라미터 UP% (조건 성립 시) | 스페셜 스킬 (발동 순서/타이밍 미확정) |
| | 액티브/패시브 스킬 효과량 (조건 성립 여부만 표시) |
| | 홀로멘보드, 커넥트, 메모리, 멤버강화보너스 |

이 범위 구분은 horodori.com의 계산 모델을 그대로 따른 것입니다(출처 위와 동일).

## 구조: 리더 1명 + 멤버 5명 = 총 6인 (2026-07-29 사용자 확인으로 최종 정정)

- **확정된 구조**: 리더는 멤버 5명과 **별도 슬롯**이며, 리더 자신의 스탯은 3축 합계에
  포함되지 않습니다(오직 코스튬 배율 판정에만 쓰임). 리더의 의상스킬 발동조건(예:
  "holoX 2인 이상")은 **멤버 5명끼리만** 카운트하며, 리더 자신은 그 카운트에 들어가지
  않습니다(예: 라플라스(리더, holoX)를 리더로 쓸 때 "holoX 2인 이상" 조건을
  충족하려면 리더를 제외한 멤버 5명 중 2명이 holoX여야 함, 라플라스 자신은 카운트
  안 됨).
- **출처**: horodori.com/members/deck-builder의 편성 예시를 재검증해보면, 예시 조건이
  "3期生が2人以上"일 때 3期生 리더 자신은 카운트되지 않고 멤버 5명 중 3期生 2명만
  카운트되는 것으로 확인됨 — horodori.com의 "ユニットはリーダー1人＋メンバー5人の6人編成"
  문구와 일치.
- **이전 오류 정정**: 본 레포는 2026-07-29 초반에 "실기기 스크린샷으로 5인 구조를
  검증했다"고 잘못 기록하고 있었으며, 이로 인해 리더의 스탯이 3축합계에 잘못 포함되고 조건 판정 시
  리더가 자신의 조건에 카운트되는 버그가 있었습니다. 사용자의 직접 지적으로 정정되었으며,
  이로 인해 예를 들어 "큐트타입 카드 2장만 보유한 상태에서 해당 큐트 카드를 리더로 쓰면
  자신의 "큐트 2인 이상" 코스튬이 발동 실패하는" 등의 결론이 바뀌었습니다.
- **불일치 발견 시**: 실제 게임 내 표시값과 이 계산기 결과가 다르면, 게임 내 표시가
  항상 우선입니다. 이 계산기는 참고용 도구일 뿐입니다.

## 폴더 구조

```
holodori-calculator/
├── README.md          이 파일
├── STATUS.md           데이터 수집 현황 (59장 중 몇 장 확보했는지)
├── data/
│   └── members.json    ★5 카드 데이터베이스 (2026-07-29 기준 59/59장, 100% 완료)
└── src/
    └── calculator.js    계산 로직 (Node.js, 외부 의존성 없음)
```

## 사용법

```js
const { loadMembers, calcUnitStats, listSkills, compareFormations } = require("./src/calculator.js");
const members = loadMembers();

// 예: 라플라스를 리더로, 나머지 5명을 멤버로 시산 (리더는 멤버 배열에 포함하면 안 됨)
const result = calcUnitStats(
  members,
  "laplus_sakusen",
  ["koyori_labo", "iroha_chikurin", "azki_sakihokoru", "kobo_amefuri", "kiara_phoenix"]
);
console.log(result);

// 스킬 목록(정성적, 수치 미반영)
console.log(listSkills(members, "laplus_sakusen", [...]));

// 여러 편성 비교
console.log(compareFormations(members, [
  { label: "라플라스 리더", leaderId: "laplus_sakusen", fiveMemberIds: ["koyori_labo","iroha_chikurin","azki_sakihokoru","kobo_amefuri","kiara_phoenix"] },
  { label: "코보 리더", leaderId: "kobo_amefuri", fiveMemberIds: ["noel_kazekaoru","koyori_labo","ririka_ceo","laplus_sakusen","iroha_chikurin"] },
]));
```

## 데이터 출처

카드별 출처는 `data/members.json`의 각 항목 `source` 필드에 URL과 확인 방법
(`verified_direct_fetch` = 이 세션에서 직접 페이지 열람 확인 / `verified_subagent` =
서브에이전트가 열람, 원문 인용 있음)이 기록되어 있습니다.

주요 출처:
- JP 공략위키 gamerch: https://gamerch.com/hololive-dreams/ (카드 개별 페이지, 최강카드랭킹)
- JP 공략위키 appmedia: https://appmedia.jp/hololive-dreams (최강리더랭킹)
- 비공식 팬사이트 horodori.com: https://www.horodori.com/ (계산 모델 출처, 스코어 공략 가이드)
- 공식 사이트: https://www.hololive-dreams.com/
- 공식 X: https://x.com/hololive_dreams

## 알려진 한계 / 정확도 관련 주의사항

1. **조건 자동판정(`checkCondition`)은 단순 문자열 매칭** — "3人以上", "2人" 같은
   자연어 조건 텍스트를 정규식으로 파싱하는 수준이라 예외 케이스(복합조건 등)는
   수동 확인 필요.
2. **스코어서포트/스페셜/패시브·액티브 효과량은 계산에 전혀 반영되지 않음** — 이는
   버그가 아니라 의도된 설계(공식 환산식이 없기 때문). `listSkills()`로 정성적 정보만
   확인 가능.
3. **전체 59장 수록 완료, 검증 과정에서 오타 5건 발견/수정함** (P+T+S 산술 불일치 4건 +
   스바루수영복 타입오류 1건) — 상세는 `STATUS.md` 참고. 전체 59장의 P+T+S 총합이 정확히
   5개 값 중 하나라는 패턴을 발견해서 검증에 활용함.
4. **구조 오류 정정 이력(2026-07-29)**: 초기 버전은 "리더가 멤버 5명 중 1명"이라는
   잘못된 5인 구조를 채택하고 있었고, 이로 인해 리더 스탯이 3축합계에 잘못 포함되거나
   리더가 자신의 코스튬 조건에 스스로 카운트되는 오류가 있었습니다. 사용자 직접 지적으로
   "리더1+멤버5=6인, 리더는 조건 카운트에서도 제외"로 정정되었습니다. 이 정정으로 일부
   리더 후보(예: 보유 큐트타입 카드가 2장뿐인 상태에서 그중 하나를 리더로 쓰는 경우)의
   코스튬 발동 가능 여부가 바뀌었습니다.
