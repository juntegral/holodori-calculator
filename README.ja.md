# holodori-calculator

[🇰🇷 한국어版はこちら / Korean version](./README.md)

hololive Dreams(ホロドリ)個人用の非公式編成計算機です。推しは さくらみこ。

## ⚠️ 最初にお読みください: この計算機にできないこと

**公式のスコア計算式は2026-07-29時点でどこにも公開されていません。** 公式サイト、
JP攻略Wiki(gamerch/appmedia/game8)、最も詳細な非公式ファンサイト(horodori.com)、
データマイン/APK解析コミュニティまで確認しましたが、見つかりませんでした。

horodori.comが唯一「編成シミュレーター」(計算ツール)を作っていますが、そのサイト自身が
以下を計算対象から除外すると明記しています:

> 換算式が未確定のスコアサポートは未算入で、開花・ボード・ライブ中の発動も含めていないため、実ゲームの獲得スコアや厳密な最適解を示すものではありません。
>
> — [horodori.com/members/deck-builder](https://www.horodori.com/members/deck-builder) (2026-07-29確認)

**この計算機も同じ範囲だけを計算します。** 「絶対スコア予測」ではなく「編成A vs 編成B の
相対比較用の試算値」として使ってください。実戦での確定は、ゲーム内実測(ユニットスコア
プレビュー + 実際のプレイスコア)が今のところ唯一正確な方法です。

## 計算に含まれるもの / 含まれないもの

| 含まれる(数値で計算) | 含まれない(条件のみ表示、数値未反映) |
|---|---|
| カード5枚のPerformance/Technique/Senseの合計 | スコアサポート(換算式自体が未確定) |
| リーダー衣装スキルのパラメータUP%(条件成立時) | スペシャルスキル(発動順序/タイミング未確定) |
| | アクティブ/パッシブスキルの効果量(条件成立の有無のみ表示) |
| | ホロメンボード、コネクト、メモリー、メンバー強化ボーナス |

この区分はhorodori.comの計算モデルをそのまま踏襲したものです(出典は上記と同じ)。

## ⚠️ 構造の食い違い: 「5人編成」 vs 「6人編成」 — 本レポは5人モデルを採用

- **horodori.comのモデル**: 「ユニットはリーダー1人＋メンバー5人の6人編成」— リーダーが
  カード5枚とは別枠の6人構造。(出典: horodori.com/members/deck-builder, 「メンバーの基本」セクション)
- **ユーザー実機スクリーンショットによる検証結果**(本プロジェクト以前のセッションで直接確認):
  編成画面は**合計5枠**で、リーダーはその5枠のうち1つにスポットライトが当たる構造。
  カード5枚 = リーダー1 + メンバー4。
- 公式の事前登録/リリース前資料の一部も「1+5=6人」と表記していた経緯があり、混同の
  原因と推測されます。**本計算機は実機スクリーンショット(直接観察という最も信頼性の高い
  根拠)に従い5人構造を採用**します。つまりリーダーのステータスも5枚の合計に含まれ、
  リーダーの衣装スキル発動条件の判定でもリーダー自身が条件カウントに入ります(例: ノエル
  (リーダー、ハッピー) + みこ(ハッピー) = 「ハッピー2人以上」の条件成立、リーダー込みで
  カウント)。
- **不一致が見つかった場合**: 実際のゲーム内表示値とこの計算機の結果が異なる場合、ゲーム内
  表示が常に優先されます。この計算機はあくまで参考用ツールです。

## フォルダ構成

```
holodori-calculator/
├── README.md          韓国語版(オリジナル)
├── README.ja.md        このファイル(日本語版)
├── STATUS.md           データ収集状況
├── data/
│   └── members.json    ★5カードデータベース(2026-07-29時点で59/59枚、100%完了)
└── src/
    └── calculator.js    計算ロジック(Node.js、外部依存なし)
```

## 使い方

```js
const { loadMembers, calcUnitStats, listSkills, compareFormations } = require("./src/calculator.js");
const members = loadMembers();

// 例: ラプラスリーダー編成の試算
const result = calcUnitStats(
  members,
  ["laplus_sakusen", "koyori_labo", "iroha_chikurin", "azki_sakihokoru", "kobo_amefuri"],
  "laplus_sakusen"
);
console.log(result);

// スキル一覧(定性的情報、数値は未反映)
console.log(listSkills(members, [...], "laplus_sakusen"));

// 複数編成の比較
console.log(compareFormations(members, [
  { label: "ノエルリーダー", fiveCardIds: ["noel_kazekaoru","miko_sakura_bloom","azki_sakihokoru","koyori_labo","haato_oyatsu"], leaderId: "noel_kazekaoru" },
]));
```

## データ出典

カードごとの出典は `data/members.json` の各項目の `source` フィールドにURLと確認方法
(`verified_direct_fetch` = 本セッションで直接ページを閲覧して確認 / `verified_subagent` =
サブエージェントが閲覧、原文引用あり)が記録されています。

主な出典:
- JP攻略Wiki gamerch: https://gamerch.com/hololive-dreams/ (カード個別ページ、最強カードランキング)
- JP攻略Wiki appmedia: https://appmedia.jp/hololive-dreams (最強リーダーランキング)
- 非公式ファンサイト horodori.com: https://www.horodori.com/ (計算モデルの出典、スコア攻略ガイド)
- 公式サイト: https://www.hololive-dreams.com/
- 公式X: https://x.com/hololive_dreams

## 既知の制限事項・精度に関する注意

1. **条件自動判定(`checkCondition`)は単純な文字列マッチング** — 自然言語の条件文を
   正規表現でパースするレベルのため、複合条件などの例外ケースは手動確認が必要です。
2. **スコアサポート/スペシャル/パッシブ・アクティブの効果量は計算に一切反映されません**
   — これはバグではなく意図的な設計です(公式の換算式が存在しないため)。`listSkills()`で
   定性的情報のみ確認可能です。
3. **全59枚を収録完了、検証過程で誤記5件を発見・修正**(P+T+S算術不一致4件 +
   スバル水着版のタイプ誤り1件) — 詳細は`STATUS.md`参照。全59枚のP+T+S合計が正確に
   5つの値のうちいずれか1つになるというパターンを発見し、検証に活用しました。

---

*このファイルは韓国語版README.mdを元に翻訳したものです。内容に食い違いがある場合は
韓国語版が正となります。翻訳・データの誤りを見つけた場合はIssueで教えていただけると
助かります。*
