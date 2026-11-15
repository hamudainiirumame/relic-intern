# 時短割（プロトタイプ）

過去の時間割のスクショを送って条件を選ぶだけで、卒業要件を満たし、足切り条件に引っかかる授業を除いた時間割を自動でつくるアプリのプロトタイプです。対象は大阪公立大学 商学部の3年生。

このプロトタイプで確かめたいのは「入力を始めた人の8割以上が、3分以内に、スクショ送信と落単チェックをやりきるか」です。

## 動かし方

```bash
npm install
cp .env.example .env   # 最初は VITE_AI_MODE=mock のままでOK（APIキー不要）
npm run dev
```

スマホ実機で試すときは `npm run dev -- --host` で同じWi-Fiから開けます。

本物のAIでスクショを読むときは、下の「学生に配る（Vercel 版）」を参照してください。ローカルで `/api/ai` まで動かすなら `vercel dev` を使います。

## Web で開く（1枚のHTML版）

```bash
npm run build:web   # → dist-web/index.html
```

`dist-web/index.html` は画像やCSSまで全部入った1枚のファイルなので、ダブルクリックで開いても、Netlify Drop などの静的ホスティングにそのまま置いても動きます。画面遷移は `#/result` のようなハッシュ形式なので、サーバー側の設定は要りません。

- Claude のチャット上（アーティファクト）で開くと、スクショの読み取りと修正指示に本物のAIが使われ、入力内容もアーティファクトの保存領域に残ります
- それ以外の場所で開くと、AIは使えません。「サンプル画像で試す」と、修正指示の簡易ルール（「月2を外して」「水曜を全休に」など）で動きます。本物のスクショを読ませたいときは、下の Vercel 版を使ってください

## 学生に配る（Vercel 版）

`.env` を `VITE_AI_MODE=server` にしてデプロイし、Vercel の環境変数に `ANTHROPIC_API_KEY` を設定します。APIキーはサーバー側（`api/ai.ts`）にだけ置かれます。

## ページ構成

| パス（`#` の後ろ） | 画面 | 内容 |
| --- | --- | --- |
| `/` | トップ | 一言、3ステップの説明、はじめる／続きから |
| `/setup` | ステップ1 | 学籍番号の先頭5桁 または 学科・学年の選択、前期／後期 |
| `/history` | ステップ2 | 時間割スクショの送信 → 読み取り → 落とした授業にチェック |
| `/preferences` | ステップ3 | 全休の曜日、楽単の優先度、足切り条件、興味、単位数 |
| `/result` | 結果 | 時間割グリッド、パターン切り替え、ステータス、授業詳細、修正、UNIPA登録用リスト、広告枠 |

## ファイル構成

```
api/ai.ts                    AI呼び出しの中継（Vercel Functions）。APIキーはここだけ
data/courses.csv             授業データの元（スプレッドシートから書き出す。無ければ courses.json をそのまま使う）
data/courses.template.csv    courses.csv の列の並びと書き方の例
scripts/import-courses.mjs   courses.csv → src/data/courses.json の変換と入力チェック（build 前に自動実行）
docs/授業データの入れ方.md     無料の道具だけで授業データを入れる手順とAIへの指示文
src/
  types.ts                   型定義
  data/courses.json          授業データ（data/courses.csv から自動生成。今はダミー33件）
  data/interests.json        興味タグの選択肢（画面と CSV チェックで共通）
  data/requirements.json     卒業要件（今はダミー値）
  lib/repository.ts          保存と読み込み ★Supabase移行時に差し替え
  lib/storage.ts             保存先（アーティファクト／localStorage／メモリを自動で切り替え）
  lib/prompts.ts             AIへの指示文（サーバー版とHTML版で共通）
  lib/analytics.ts           計測（PostHog または console）
  lib/ai.ts                  AI呼び出し（mock / server / artifact）
  lib/scheduler.ts           時間割の生成ロジック（AIではなくコード）
  lib/catalog.ts             授業データの読み込み、スクショ結果との照合
  lib/studentId.ts           学籍番号からの学科・学年推定（仮ルール）
  lib/term.ts                前期／後期の自動判定
  lib/image.ts               スクショの縮小（送信前、保存はしない）
  components/ui/             shadcn/ui（Button, Card, Input, Checkbox, Dialog, Tabs, Toast）
  components/                画面共通の部品（AppShell、時間割グリッド、ステータス、授業詳細、広告枠）
  pages/                     各画面
src/assets/howto.svg         スクショの撮り方の見本
```

## 計測イベントと集計方法

`VITE_POSTHOG_KEY` を設定すると PostHog に送られます。未設定ならブラウザの console に `[track]` として出ます。

| イベント | タイミング | 主なプロパティ |
| --- | --- | --- |
| `input_start` | `/setup` を初めて開いた | |
| `profile_done` | ステップ1完了 | department, year, term, used_student_id |
| `screenshot_uploaded` | スクショを選んだ／サンプルを押した | count, source |
| `ocr_done` / `ocr_failed` | 読み取り完了／失敗 | courses, unmatched, seconds |
| `history_confirmed` | 「これでOK」を押した（入力完了） | failed, courses, **elapsed_sec**, **within_3min** |
| `generate_clicked` | 「時間割をつくる」 | days_off, easy_priority, cutoffs, interests, patterns |
| `result_shown` | 結果画面を表示 | patterns, credits |
| `regenerate` | 組み直し | source（text / pin / unpin / exclude） |
| `course_detail_opened` / `reviews_opened` | 授業詳細／口コミを開いた | course_id |
| `unipa_list_copied` | 登録用リストをコピー | courses |
| `drop_off` | 入力完了前に画面が隠れた | screen |

**主指標の出し方（PostHog の Funnel）**：`input_start` → `history_confirmed` のファネルを distinct_id 単位で作り、到達率が80%以上かを見ます。さらに `history_confirmed` を `within_3min = true` で絞った到達率も出します。`source = sample`（サンプルで試した人）は本番の入力ではないので、`screenshot_uploaded` の source でフィルタして除外してください。

`drop_off` はUNIPAにスクショを撮りに行くだけでも記録されます。本当の離脱は「`input_start` があって `history_confirmed` がない人」で数え、`drop_off` の最後の screen を「どこで止まったか」の手がかりとして使ってください。

## Supabase に移すとき

差し替えるのは `src/lib/repository.ts` だけです。関数名（getProfile / saveProfile / listTakenCourses / saveTakenCourses / getPreferences / savePreferences / listTimetables / saveTimetables / resetAll）と戻り値の型はそのままにして、中身を Supabase のクエリに置き換えてください。入力途中の再開用に getProgress / saveProgress も追加しています。型はすでに `user_id` を持っているので、ログインを入れたらそこに入れます。

## 授業データと卒業要件の入れ方

- 授業データは `data/courses.csv`（スプレッドシートから書き出した CSV）で管理します。`npm run build` の前に `scripts/import-courses.mjs` が自動で走り、`src/data/courses.json` に変換します（手動なら `npm run import:courses`）。入力ミスがあると行番号つきで表示してビルドを止めます。`data/courses.csv` が無いあいだは今の `courses.json` がそのまま使われます
- 無料の道具だけで入れる手順（コピー → AI チャットで CSV 化 → GitHub にアップロード）は [docs/授業データの入れ方.md](docs/授業データの入れ方.md) にあります。列の並びの例は `data/courses.template.csv`
- 空欄の足切り項目は「不明」と表示され、足切り条件では除外されません
- `src/data/requirements.json` に学科ごと・区分ごとの必要単位数を入れます。今の数字はダミーなので、必ず履修要項で確認した値に置き換えてください
- `crobas_*` の項目は、クロバスの利用規約の確認と運営者の許可が取れるまでダミー値のままにしてください
- 学籍番号の採番ルールが分かったら `src/lib/studentId.ts` の DEPARTMENT_CODES と読み取り方を直してください

## 仮で決めていること

- 生成の目安は16単位、ゼミなどの「演習」は実質必修として足切り条件に関係なく先に入れます
- 楽単度はクロバス評価と、出席・教科書・持ち込み不可の有無から計算しています（`easinessOf`）
- 前期／後期は「2〜7月なら前期、8〜1月なら後期」で判定しています
