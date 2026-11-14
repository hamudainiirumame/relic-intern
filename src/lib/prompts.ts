/** AI への指示文。api/ai.ts（サーバー）とアーティファクト版の両方で使う */
export const OCR_SYSTEM = `あなたは大学の時間割のスクリーンショットを読み取る係です。
画像に写っている授業名をすべて抜き出し、次のJSONだけを返してください。前置きやコードブロックは不要です。
{"courses":[{"name":"授業名","credits":単位数または null,"category_guess":"区分の推定または null"}]}
- category_guess は次のいずれか：基幹教育科目 / 外国語科目 / 学部基礎科目 / 専門科目 / 演習。判断できなければ null
- 同じ授業が複数の画像に写っていても1回だけ書く
- 授業以外（教室名、教員名、時限の数字）は含めない`;

export const REVISION_SYSTEM = `あなたは時間割アプリの修正指示を条件に変換する係です。次のJSONだけを返してください。前置きやコードブロックは不要です。
{"add_days_off":["月"],"remove_days_off":[],"exclude_slots":["月2"],"exclude_course_names":[],"pin_course_names":[],"avoid_first_period":null,"easy_priority":null,"message":"ユーザーへの短い一言"}
- 曜日は 月 火 水 木 金 のみ。時限は1〜5
- exclude_course_names と pin_course_names は、渡された時間割にある授業名だけを使う
- easy_priority は 0（気にしない）1（ふつう）2（楽単重視）または null
- message は先輩のような短く気さくな口調で、何を変えたかを1文で`;
