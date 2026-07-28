/**
 * holodori-calculator/src/calculator.js
 * hololive Dreams(홀로도리) 비공식 편성 계산기 — 상대비교 시산 전용
 *
 * ⚠️ 절대 스코어 예측 불가. 공식 계산식 미공개(2026-07-29 기준, README 참고).
 * 이 계산기가 포함하는 것: 카드5장 P/T/S 합 + 리더 의상스킬 조건성립시 배율.
 * 제외하는 것: 스코어서포트 환산, 스페셜/액티브/패시브 수치화, 보드, 커넥트,
 *   메모리, 멤버강화보너스. (horodori.com도 동일 범위만 계산 — README 인용 참조)
 *
 * 구조: 카드 5장, 리더는 그 5장 중 1장 (유저 실기기 스크린샷으로 검증된 구조).
 *   horodori.com은 "리더+멤버5=6인" 모델을 쓰는데 이는 실기 스샷과 충돌 —
 *   이 계산기는 검증된 5장 구조를 채택함 (README "구조 충돌" 섹션 참고).
 */

const fs = require("fs");
const path = require("path");

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

/**
 * 리더 의상스킬 조건이 5장 편성 내에서 성립하는지 판정.
 * 조건 문자열 패턴: "무조건", "{타입} 2인 이상", "{기생} 2인 이상" 등.
 * 매우 단순한 파서 — condition 필드가 자연어라 완벽 매칭은 아님. 필요시 수동 확인.
 */
function checkCondition(conditionText, fiveCards) {
  if (!conditionText || /무조건/.test(conditionText)) {
    return { met: true, reason: "무조건 발동" };
  }
  const types = ["해피", "퓨어", "큐트"];
  for (const t of types) {
    if (conditionText.includes(t)) {
      const count = fiveCards.filter((c) => c.type === t).length;
      const need = conditionText.includes("2인") ? 2 : conditionText.includes("3인") ? 3 : 1;
      return {
        met: count >= need,
        reason: `${t} 타입 ${count}/${need}인 (편성: ${fiveCards.map((c) => c.type).join(",")})`,
      };
    }
  }
  // 기생/소속 태그 조건 (예: "3期生 2인 이상", "holoX 2인 이상", "0期生 2인")
  const tagMatch = conditionText.match(/([^\s]+期生|holoX|ReGLOSS|Promise|Advent|Myth|ID\d期生)/);
  if (tagMatch) {
    const tag = tagMatch[1];
    const count = fiveCards.filter((c) => c.generation_tag === tag).length;
    const need = conditionText.includes("2인") ? 2 : conditionText.includes("3인") ? 3 : 1;
    return {
      met: count >= need,
      reason: `${tag} 소속 ${count}/${need}인 (편성: ${fiveCards.map((c) => c.generation_tag).join(",")})`,
    };
  }
  return { met: null, reason: `자동판정 불가 (조건 원문: "${conditionText}") — 수동 확인 필요` };
}

/**
 * 5장 편성의 P/T/S 합 + 리더 의상스킬 배율 적용 시산.
 * leaderId는 fiveCardIds 중 하나여야 함 (리더=5장 중 1명, README 구조결정 참고).
 */
function calcUnitStats(members, fiveCardIds, leaderId) {
  if (!fiveCardIds.includes(leaderId)) {
    throw new Error("리더는 반드시 5장 편성 안에 포함되어야 함 (검증된 5인 구조)");
  }
  if (fiveCardIds.length !== 5) {
    throw new Error(`편성은 정확히 5장이어야 함 (현재 ${fiveCardIds.length}장)`);
  }
  const cards = fiveCardIds.map((id) => findCard(members, id));
  const leader = findCard(members, leaderId);

  const base = { performance: 0, technique: 0, sense: 0 };
  const missingStats = [];
  for (const c of cards) {
    if (c.stats.performance == null) {
      missingStats.push(c.name_kr);
      continue;
    }
    base.performance += c.stats.performance;
    base.technique += c.stats.technique;
    base.sense += c.stats.sense;
  }

  const costumeCheck = checkCondition(leader.costume?.condition, cards);
  const bonus = { performance: 0, technique: 0, sense: 0 };
  const costumeEffect = leader.costume?.effect || "";
  if (costumeCheck.met) {
    const pctMatch = costumeEffect.match(/(\d+)%/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) / 100 : 0;
    if (/퍼포먼스/.test(costumeEffect) || /전파라미터/.test(costumeEffect)) bonus.performance += base.performance * pct;
    if (/테크닉/.test(costumeEffect) || /전파라미터/.test(costumeEffect)) bonus.technique += base.technique * pct;
    if (/센스/.test(costumeEffect) || /전파라미터/.test(costumeEffect)) bonus.sense += base.sense * pct;
  }

  const totalBase = base.performance + base.technique + base.sense;
  const totalBonus = bonus.performance + bonus.technique + bonus.sense;

  return {
    leader: leader.name_kr,
    members: cards.map((c) => c.name_kr),
    base,
    costumeCheck,
    costumeEffect,
    bonus,
    total3axis: totalBase + totalBonus,
    totalBase,
    totalBonus,
    missingStats,
    // 수치화하지 않는 정성 정보 (README/horodori.com과 동일하게 "제외" 처리, 참고용으로만 표기)
    qualitativeNote: "스코어서포트/스페셜/패시브·액티브 발동효과/보드/커넥트는 위 숫자에 미포함. listSkills()로 별도 확인.",
  };
}

/** 5장 편성의 스페셜/액티브/패시브를 수치화하지 않고 나열만 (참고용). */
function listSkills(members, fiveCardIds, leaderId) {
  const cards = fiveCardIds.map((id) => findCard(members, id));
  return cards.map((c) => ({
    name: c.name_kr,
    isLeader: c.id === leaderId,
    special: `SS${c.special?.score_support_pct ?? "?"}% (${c.special?.duration_sec ?? "?"}s) — ${c.special?.activation_condition ?? "미확인"}`,
    active: `${c.active?.probability ?? "?"} ${c.active?.base_pct ?? "?"}%${c.active?.conditional_pct ? "→" + c.active.conditional_pct + "%" : ""} (${c.active?.duration_sec ?? "?"}s/${c.active?.interval_sec ?? "?"}s간격) — ${c.active?.condition ?? "조건없음"}`,
    passive: `${c.passive?.condition ?? "?"} → ${c.passive?.effect ?? "?"}`,
    costumeIfLeader: c.id === leaderId ? `${c.costume?.condition ?? "?"} → ${c.costume?.effect ?? "?"}` : "(리더 아님, 의상 미적용)",
    connect: `${c.connect?.range_tiles ?? "?"}칸 / ${c.connect?.multiplier_pct ?? "?"}%`,
  }));
}

/** 두 편성을 나란히 비교 (3축 합계 기준, 상대비교 전용). */
function compareFormations(members, formations) {
  return formations.map((f) => ({
    label: f.label,
    ...calcUnitStats(members, f.fiveCardIds, f.leaderId),
  }));
}

module.exports = { loadMembers, findCard, checkCondition, calcUnitStats, listSkills, compareFormations };
