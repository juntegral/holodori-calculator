/**
 * holodori-calculator/src/calculator.js
 * hololive Dreams(홀로도리) 비공식 편성 계산기 — 상대비교 시산 전용
 *
 * ⚠️ 절대 스코어 예측 불가. 공식 계산식 미공개(2026-07-29 기준, README 참고).
 * 이 계산기가 포함하는 것: 멤버5명 P/T/S 합 + 리더 의상스킬 조건성립시 배율.
 * 제외하는 것: 스코어서포트 환산, 스페셜/액티브/패시브 수치화, 보드, 커넥트,
 *   메모리, 멤버강화보너스. (horodori.com도 동일 범위만 계산 — README 인용 참조)
 *
 * 구조(2026-07-29 사용자 확인, 2차 정정 포함): 리더 1 + 멤버 카드 5장.
 *   리더는 "캐릭터+의상" 슬롯이고, 멤버 5장은 카드 슬롯이다. 둘은 서로 독립이며,
 *   리더와 같은 캐릭터의 카드를 멤버 5장 안에 넣는 것도 가능하다
 *   (2026-07-29 사용자 실편성으로 확인: 노엘 리더 + 멤버에도 노엘 카드).
 *   리더 슬롯 자체는 스탯/조건 카운트에 기여하지 않지만, 같은 캐릭터의 카드가
 *   멤버로 들어가 있으면 그 멤버 카드는 정상적으로 스탯/조건에 카운트된다.
 *   리더 의상스킬의 발동조건(예: "홀로X 2인 이상")은 멤버 카드 5장 기준으로 판정.
 *   (보드 세부효과는 기본값으로 고정, 이 계산기는 "리더 의상스킬"만 비교 대상.)
 */

const fs = require("fs");
const path = require("path");
const { toJa, UI } = require("./i18n.js");

function loadMembers() {
  const p = path.join(__dirname, "..", "data", "members.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  return raw.members;
}

function findCard(members, id) {
  const c = members.find((m) => m.id === id);
  if (!c) throw new Error(`카드 id를 찾을 수 없음: ${id}`);
  return c;
}

/** 카드 객체에서 언어에 맞는 이름을 골라낸다. lang='ja'면 name_jp, 아니면 name_kr. */
function nameOf(card, lang) {
  return lang === "ja" ? card.name_jp || card.name_kr : card.name_kr;
}

/**
 * 리더 의상스킬 조건이 5장 편성 내에서 성립하는지 판정.
 * 조건 문자열 패턴: "무조건", "{타입} 2인 이상", "{기생} 2인 이상" 등.
 * 매우 단순한 파서 — condition 필드가 자연어라 완벽 매칭은 아님. 필요시 수동 확인.
 */
function checkCondition(conditionText, fiveMembers, lang = "ko") {
  const t18 = UI[lang] || UI.ko;
  if (!conditionText || /무조건/.test(conditionText)) {
    return { met: true, reason: t18.unconditional };
  }
  const types = ["해피", "퓨어", "큐트"];
  for (const t of types) {
    if (conditionText.includes(t)) {
      const count = fiveMembers.filter((c) => c.type === t).length;
      const need = conditionText.includes("2인") ? 2 : conditionText.includes("3인") ? 3 : 1;
      return {
        met: count >= need,
        reason: t18.typeReason(t, count, need),
      };
    }
  }
  // 기생/소속 태그 조건 (예: "3期生 2인 이상", "holoX 2인 이상", "0期生 2인")
  const tagMatch = conditionText.match(/([^\s]+期生|holoX|ReGLOSS|Promise|Advent|Myth|ID\d期生|ゲーマーズ)/);
  if (tagMatch) {
    const tag = tagMatch[1];
    const count = fiveMembers.filter((c) => c.generation_tag === tag || (c.generation_tag || "").includes(tag)).length;
    const need = conditionText.includes("2인") ? 2 : conditionText.includes("3인") ? 3 : 1;
    return {
      met: count >= need,
      reason: t18.tagReason(tag, count, need),
    };
  }
  return { met: null, reason: t18.cannotAutoJudge(conditionText) };
}

/**
 * 리더 1 + 멤버 카드 5장 편성의 시산.
 * 리더는 캐릭터/의상 슬롯이므로 리더와 같은 카드를 fiveMemberIds에 넣어도 됨.
 * 리더 슬롯 자체의 스탯 기여는 없음 — 오직 코스튬 배율 판정에만 쓰임.
 * (같은 캐릭터 카드가 멤버로 들어있으면 그 카드는 멤버로서 정상 카운트됨.)
 */
function calcUnitStats(members, leaderId, fiveMemberIds, options = {}) {
  const lang = options.lang === "ja" ? "ja" : "ko";
  const t18 = UI[lang] || UI.ko;
  // 참고: 리더와 같은 카드가 멤버 5장에 포함되는 것은 허용 (리더=캐릭터/의상 슬롯,
  // 멤버=카드 슬롯으로 서로 독립. 2026-07-29 사용자 실편성으로 확인되어 기존 금지 체크 제거).
  if (fiveMemberIds.length !== 5) {
    throw new Error(t18.errNotFiveMembers(fiveMemberIds.length));
  }
  const leader = findCard(members, leaderId);
  const fiveMembers = fiveMemberIds.map((id) => findCard(members, id));

  const base = { performance: 0, technique: 0, sense: 0 };
  const missingStats = [];
  for (const c of fiveMembers) {
    if (c.stats.performance == null) {
      missingStats.push(nameOf(c, lang));
      continue;
    }
    base.performance += c.stats.performance;
    base.technique += c.stats.technique;
    base.sense += c.stats.sense;
  }

  const costumeCheck = checkCondition(leader.costume?.condition, fiveMembers, lang);
  const bonus = { performance: 0, technique: 0, sense: 0 };
  const costumeEffectKo = leader.costume?.effect || "";
  if (costumeCheck.met) {
    const pctMatch = costumeEffectKo.match(/(\d+)%/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) / 100 : 0;
    if (/퍼포먼스/.test(costumeEffectKo) || /전파라미터/.test(costumeEffectKo)) bonus.performance += base.performance * pct;
    if (/테크닉/.test(costumeEffectKo) || /전파라미터/.test(costumeEffectKo)) bonus.technique += base.technique * pct;
    if (/센스/.test(costumeEffectKo) || /전파라미터/.test(costumeEffectKo)) bonus.sense += base.sense * pct;
  }

  const totalBase = base.performance + base.technique + base.sense;
  const totalBonus = bonus.performance + bonus.technique + bonus.sense;

  return {
    leader: nameOf(leader, lang),
    members: fiveMembers.map((c) => nameOf(c, lang)),
    base,
    costumeCheck,
    costumeEffect: lang === "ja" ? toJa(costumeEffectKo) : costumeEffectKo,
    bonus,
    total3axis: totalBase + totalBonus,
    totalBase,
    totalBonus,
    missingStats,
    qualitativeNote: t18.qualitativeNote,
  };
}

/** 리더 + 멤버5명의 스페셜/액티브/패시브를 수치화하지 않고 나열만 (참고용). lang='ja'면 이름/스킬텍스트를 일본어로 반환. */
function listSkills(members, leaderId, fiveMemberIds, lang = "ko") {
  const t18 = UI[lang] || UI.ko;
  const tr = (koText) => (lang === "ja" ? toJa(koText) : koText);
  const leader = findCard(members, leaderId);
  const fiveMembers = fiveMemberIds.map((id) => findCard(members, id));
  const all = [{ card: leader, isLeader: true }, ...fiveMembers.map((c) => ({ card: c, isLeader: false }))];
  return all.map(({ card: c, isLeader }) => ({
    name: nameOf(c, lang),
    isLeader,
    special: t18.specialLine(
      c.special?.score_support_pct ?? t18.unknownMark,
      c.special?.duration_sec ?? t18.unknownMark,
      tr(c.special?.activation_condition) ?? t18.unknownMark
    ),
    active: t18.activeLine(
      tr(c.active?.probability) ?? t18.unknownMark,
      c.active?.base_pct ?? t18.unknownMark,
      c.active?.conditional_pct ? "→" + c.active.conditional_pct + "%" : "",
      c.active?.duration_sec ?? t18.unknownMark,
      c.active?.interval_sec ?? t18.unknownMark,
      tr(c.active?.condition) ?? t18.noCondition
    ),
    passive: t18.passiveLine(tr(c.passive?.condition) ?? t18.unknownMark, tr(c.passive?.effect) ?? t18.unknownMark),
    costumeIfLeader: isLeader
      ? t18.costumeLeaderLine(tr(c.costume?.condition) ?? t18.unknownMark, tr(c.costume?.effect) ?? t18.unknownMark)
      : t18.notLeaderLine,
    connect: t18.connectLine(c.connect?.range_tiles ?? t18.unknownMark, c.connect?.multiplier_pct ?? t18.unknownMark),
  }));
}

/** 여러 리더+편성을 나란히 비교 (3축 합계 기준, 상대비교 전용). formations의 각 항목에 lang 지정 가능(미지정 시 'ko'). */
function compareFormations(members, formations) {
  return formations.map((f) => ({
    label: f.label,
    ...calcUnitStats(members, f.leaderId, f.fiveMemberIds, { lang: f.lang }),
  }));
}

module.exports = { loadMembers, findCard, checkCondition, calcUnitStats, listSkills, compareFormations };
