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

## 📐 2026-08-05更新: 判定・コンボ・発動率・スコアレートの算出式を発見(非公式・部分)

**公式(COVER/QualiArts)のスコア計算式は依然としてどこにも公開されていません。**
ただし2026-08-05の定期チェックで、horodori.comよりもはるかに具体的な数値を
公開している非公式ファンサイト**dreams.wf-calc.net**(「ホロドリ研究室」/Holodori
Lab)を新たに発見しました:

> PERFECT：基本スコアの100%。GREAT：基本スコアの80%。AUTO：GREATと同じく、基本スコアの
> 80%。GOOD：基本スコアの50%。BAD：0点。ライフが50減少します。MISS：0点。ライフが100
> 減少します。... 1回のスコアは、`基本スコア × スコアアップ合計 × （100%＋スコアサポート
> 合計）` で計算されます。乗算中の小数は保持し、最終的にスコアを算出するときに小数を
> 切り上げます。コンボ数によるボーナスも加算されます。100コンボから+1%、200コンボから
> +2%となり、100コンボごとに+1%ずつ増加します。+10%が最大です。... アクティブスキルの
> 発動率は、高確率が約55%、中確率が約45%、低確率が約35%です。スキル発動率UPは、効果％を
> 合計してから乗算で適用します。たとえば、元の発動率が45%で★5 Irysのスペシャルスキル
> (+45%)が発動中の場合、`45% × (1 + 0.45) = 65.25%`になります。... ホロメンのスコア
> レート = そのホロメンでの上位3曲のレートの合計。楽曲のスコアレート = ⌈ハイスコア÷5000⌉
>
> — [dreams.wf-calc.net/wiki/live](https://dreams.wf-calc.net/wiki/live?lang=ja) (2026-08-05確認)

このサイトも自らを「非公式データベース＆ツールサイト」とだけ紹介しており、データ
マインか実測テストかは明示していないため、horodori.comと同様に**ファンの推定値**
として扱う必要があります。ただし「未検証の推測」と「確定値」をサイト自身が区別して
表記しており(例: ノートタイプ別のスコア差はないと明記しつつ、難易度別の満点が同一か
どうかは別途「未検証」と表記)、horodori.comよりやや信頼度が高いと判断しました。

src/calculator.jsに上記の式をそのまま実装した**独立ユーティリティ関数**を追加しました:
calcNoteScore、calcComboBonusPct、calcActiveSkillRate、calcSongScoreRate、
calcHolomemScoreRate、JUDGMENT_SCORE_RATIO、ACTIVE_SKILL_BASE_RATE_PCT。既存の
calcUnitStats()/listSkills()の動作とAPIは**一切変更していません** — これらの新規
関数はまだdata/members.jsonのカード別数値と自動連携しておらず(スコアUPとパラメータ
UPのスキーマ区分がまだ不明確)、値を直接入力して計算する手動ユーティリティです。

## 計算に含まれるもの / 含まれないもの

| 含まれる(数値で計算) | 含まれない(条件のみ表示、数値未反映) |
|---|---|
| メンバー5人のPerformance/Technique/Senseの合計(リーダー自身のステータスは除く) | スコアサポート(換算式自体が未確定) |
| リーダー衣装スキルのパラメータUP%(条件成立時) | スペシャルスキル(発動順序/タイミング未確定) |
| | アクティブ/パッシブスキルの効果量(条件成立の有無のみ表示) |
| | ホロメンボード、コネクト、メモリー、メンバー強化ボーナス |

この区分はhorodori.comの計算モデルをそのまま踏襲したものです(出典は上記と同じ)。

## 構造: リーダー1 + メンバーカード5枚 (2026-07-29 ユーザー確認、2次訂正含む)

- **確定した構造**: リーダーは「キャラクター+衣装」の枠であり、メンバー5枚はカードの枠で、**互いに独立**しています。**リーダーと同じキャラクターのカードをメンバー5枚の中に入れることも可能**です(2026-07-29 ユーザーの実編成で確認: ノエルリーダー + メンバーにもノエルカード)。リーダー枠自体はステータス/条件カウントに寄与しません(衣装スキルの発動判定にのみ使用)が、同じキャラクターのカードがメンバーに入っていればそのメンバーカードは通常どおりカウントされます。リーダーの衣装スキル発動条件(例:「holoX2人以上」)はメンバーカード5枚を基準に判定されます。(出典: horodori.com/members/deck-builder, 「メンバーの基本」セクション)
- **以前の設定の訂正**: 本レポは2026-07-29初頭に「実機スクリーンショットで5人構造を検証した」と誤って記載していましたが、ユーザー本人の指摘により訂正されました。
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

// 例: ラプラスをリーダーに、メンバー5枚を試算 (リーダーと同じキャラクターのカードをメンバーに入れることも可能)
const result = calcUnitStats(
  members,
  "laplus_sakusen",
  ["koyori_labo", "iroha_chikurin", "azki_sakihokoru", "kobo_amefuri", "kiara_phoenix"]
);
console.log(result);

// 日本語出力もサポート: 4番目の引数に { lang: "ja" } を渡すと、カード名・条件文・
// ステータスメッセージが全て日本語で返ります(data/members.json実収録の91種のスキル/条件文を
// src/i18n.jsで全数翻訳済み)。デフォルトは韓国語("ko")です。
const resultJa = calcUnitStats(
  members,
  "laplus_sakusen",
  ["koyori_labo", "iroha_chikurin", "azki_sakihokoru", "kobo_amefuri", "kiara_phoenix"],
  { lang: "ja" }
);
console.log(resultJa.leader); // "ラプラス・ダークネス"
console.log(resultJa.costumeEffect); // "全員の全パラメータが50%UP"

// スキル一覧(定性的情報、数値は未反映) — listSkillsも4番目の引数でlang指定可能
console.log(listSkills(members, "laplus_sakusen", [...], "ja"));

// 複数編成の比較
console.log(compareFormations(members, [
  { label: "ラプラスリーダー", leaderId: "laplus_sakusen", fiveMemberIds: ["koyori_labo","iroha_chikurin","azki_sakihokoru","kobo_amefuri","kiara_phoenix"] },
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
   (2026-08-05更新: dreams.wf-calc.net発の判定/コンボ/発動率/スコアレート計算式は
   `calcNoteScore`/`calcComboBonusPct`/`calcActiveSkillRate`/`calcSongScoreRate`/
   `calcHolomemScoreRate`ユーティリティ関数として別途実装しましたが、`calcUnitStats()`には
   まだ自動連携していません — 上記「2026-08-05更新」セクション参照。)
3. **全59枚を収録完了、検証過程で誤記5件を発見・修正**(P+T+S算術不一致4件 +
   スバル水着版のタイプ誤り1件) — 詳細は`STATUS.md`参照。全59枚のP+T+S合計が正確に
   5つの値のうちいずれか1つになるというパターンを発見し、検証に活用しました。

---

*このファイルは韓国語版README.mdを元に翻訳したものです。内容に食い違いがある場合は
韓国語版が正となります。翻訳・データの誤りを見つけた場合はIssueで教えていただけると
助かります。*
