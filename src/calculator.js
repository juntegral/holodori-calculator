/**
 * holodori-calculator/src/calculator.js
 * hololive Dreams(홀로도리) 비공식 편성 계산기 — 상대비교 시산 전용
 *
 * ⚠️ 절대 스코어 예측 불가. 공식 계산식 미공개(2026-07-29 기준, README 참고).
 * 이 계산기가 포함하는 것: 멤버5명 P/T/S 합 + 리더 의상스킬 조건성립시 배율.
 * 제외하는 것: 스코어서포트 환산, 스페셜/액티브/패시브 수치화, 보드, 커넥트,
 *   메모리, 멤버강화보너스. (horodori.com도 동일 범위만 계산 — README 인용 참조)
 *
 * 구조(2026-07-29 사용자 확인으로 최종 정정): 리더 1명 + 멤버 5명 = 총 6인.
 *   리더는 멤버 5명과 별도 슬롯이며, 리더 자신의 스탯은 3축 합계에 포함되지 않는다.
 *   리더 의상스킬의 발동조건(예: "홀로X 2인 이상")은 멤버 5명끼리만 카운트하며
 *   리더 자신은 그 카운트에 들어가지 않는다 (horodori.com 예시 재검증으로 확인).
 *   ※ 이전 버전(2026-07-29 초반)은 "리더가 5장 중 1명" 5인 모델을 채택했었으나
 *   사용자가 직접 정정: 리더는 별도 슬롯이 맞음 (보드 세부효과는 기본값으로 고정,
 *   이 계산기는 "리더 의상스킬"만 비교 대상으로 삼는다).
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
function checkCondition(conditionText, fiveMembers) {
  if (!conditionText || /무조건/.test(conditionText)) {
    return { met: true, reason: "무조건 발동" };
  }
  const types = ["해피", "퓨어", "큐트"];
  for (const t of types) {
    if (conditionText.includes(t)) {
      const count = fiveMembers.filter((c) => c.type === t).length;
      const need = conditionText.includes("2인") ? 2 : conditionText.includes("3인") ? 3 : 1;
      return {
        met: count >= need,
        reason: `${t} 타입 ${count}/${need}인 (멤버 5명 중, 리더 미포함)`,
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
      reason: `${tag} 소속 ${count}/${need}인 (멤버 5명 중, 리더 미포함)`,
    };
  }
  return { met: null, reason: `자동판정 불가 (조건 원문: "${conditionText}") — 수동 확인 필요` };
}

/**
 * 리더 1명 + 멤버 5명(총 6인) 편성의 시산.
 * leaderId는 fiveMemberIds에 포함되면 안 됨 (별도 슬롯, 6인 구조).
 * 리더 자신의 스탯은 3축 합계에 포함되지 않음 — 오직 코스튬 배율 판정에만 쓰임.
 */
function calcUnitStats(members, leaderId, fiveMemberIds) {
  if (fiveMemberIds.includes(leaderId)) {
    throw new Error("리더는 멤버 5명과 별개 슬롯이어야 함 (6인 구조, 리더 카드를 멤버로 중복 사용 불가)");
  }
  if (fiveMemberIds.length !== 5) {
    throw new Error(`멤버는 정확히 5명이어야 함 (현재 ${fiveMemberIds.length}명)`);
  }
  const leader = findCard(members, leaderId);
  const fiveMembers = fiveMemberIds.map((id) => findCard(members, id));

  const base = { performance: 0, technique: 0, sense: 0 };
  const missingStats = [];
  for (const c of fiveMembers) {
    if (c.stats.performance == null) {
      missingStats.push(c.name_kr);
      continue;
    }
    base.performance += c.stats.performance;
    base.technique += c.stats.technique;
    base.sense += c.stats.sense;
  }

  const costumeCheck = checkCondition(leader.costume?.condition, fiveMembers);
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
    members: fiveMembers.map((c) => c.name_kr),
    base,
    costumeCheck,
    costumeEffect,
    bonus,
    total3axis: totalBase + totalBonus,
    totalBase,
    totalBonus,
    missingStats,
    qualitativeNote: "스코어서포트/스페셜/패시브·액티브 발동효과/보드/커넥트는 위 숫자에 미포함. listSkills()로 별도 확인. 리더 자신의 스탯도 미포함(별도 슬롯).",
  };
}

/** 리더 + 멤버5명의 스페셜/액티브/패시브를 수치화하지 않고 나열만 (참고용). */
function listSkills(members, leaderId, fiveMemberIds) {
  const leader = findCard(members, leaderId);
  const fiveMembers = fiveMemberIds.map((id) => findCard(members, id));
  const all = [{ card: leader, isLeader: true }, ...fiveMembers.map((c) => ({ card: c, isLeader: false }))];
  return all.map(({ card: c, isLeader }) => ({
    name: c.name_kr,
    isLeader,
    special: `SS${c.special?.score_support_pct ?? "?"}% (${c.special?.duration_sec ?? "?"}s) — ${c.special?.activation_condition ?? "미확인"}`,
    active: `${c.active?.probability ?? "?"} ${c.active?.base_pct ?? "?"}%${c.active?.conditional_pct ? "→" + c.active.conditional_pct + "%" : ""} (${c.active?.duration_sec ?? "?"}s/${c.active?.interval_sec ?? "?"}s간격) — ${c.active?.condition ?? "조건없음"}`,
    passive: `${c.passive?.condition ?? "?"} → ${c.passive?.effect ?? "?"}`,
    costumeIfLeader: isLeader ? `${c.costume?.condition ?? "?"} → ${c.costume?.effect ?? "?"} (멤버 미포함 스탯, 리더 전용)` : "(리더 아님, 의상 미적용, 스탯은 3축합계에 포함됨)",
    connect: `${c.connect?.range_tiles ?? "?"}칸 / ${c.connect?.multiplier_pct ?? "?"}%`,
  }));
}

/** 여러 리더+편성을 나란히 비교 (3축 합계 기준, 상대비교 전용). */
function compareFormations(members, formations) {
  return formations.map((f) => ({
    label: f.label,
    ...calcUnitStats(members, f.leaderId, f.fiveMemberIds),
  }));
}

module.exports = { loadMembers, findCard, checkCondition, calcUnitStats, listSkills, compareFormations };
