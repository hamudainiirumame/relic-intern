import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, RotateCcw, CalendarDays, ImagePlus, Loader2, Pencil, Plus, Trash2, Sparkles, RefreshCw,
  Wand2, SlidersHorizontal, ClipboardList, Copy, Info, X, Pin, PinOff, ChevronDown, Check,
} from "lucide-react";

/* =========================================================
   時短割（プロトタイプ・チャット上で動く版）
   データ・生成ロジック・画面を1ファイルにまとめています。
   授業データと卒業要件はダミーです。
   ========================================================= */

const COURSE_KEYS = ["id", "code", "name", "teacher", "term", "day", "period", "credits", "category", "target_years", "attendance_required", "textbook_required", "exam_materials", "grading", "summary", "interest_tags", "crobas_grade", "crobas_review_count", "crobas_comments"];
const COURSE_ROWS = [["c001", "11201", "商学入門", "青木 透", "前期", "月", 2, 2, "学部基礎科目", [1], false, false, "持ち込み不可", "期末試験70%・小レポート30%", "商学部で学ぶ分野の全体像をつかむ入門講義。", ["マーケティング", "経営戦略"], "B", 14, ["範囲が広いけど講義資料が丁寧", "試験はノート持ち込み不可で暗記多め"]], ["c002", "12302", "会計学入門", "石川 葉子", "前期", "火", 3, 2, "学部基礎科目", [1], true, true, "持ち込み不可", "期末試験60%・課題20%・出席20%", "簿記の基礎から財務諸表の読み方まで。", ["会計"], "C", 11, ["教科書必須。毎回の課題が重い", "出席を毎回取る"]], ["c003", "23103", "経済学の基礎", "上田 誠", "後期", "水", 1, 2, "学部基礎科目", [1], false, false, "持ち込み可", "期末試験80%・課題20%", "ミクロとマクロの基本的な考え方を学ぶ。", ["ファイナンス"], "B", 9, ["1限だけど資料持ち込み可で助かる"]], ["c004", "14204", "英語コミュニケーションⅠ", "Smith, J.", "前期", "木", 2, 1, "外国語科目", [1], true, false, "試験なし", "授業参加50%・発表50%", "少人数で話す練習を中心にした英語の授業。", ["国際ビジネス"], "A", 20, ["発表さえやれば大丈夫", "欠席は3回まで"]], ["c005", "24205", "英語コミュニケーションⅡ", "Smith, J.", "後期", "木", 2, 1, "外国語科目", [1], true, false, "試験なし", "授業参加50%・発表50%", "Ⅰの続き。ディスカッションが増える。", ["国際ビジネス"], "A", 16, ["Ⅰと同じ雰囲気でゆるい"]], ["c006", "25306", "統計学入門", "太田 涼", "後期", "金", 3, 2, "学部基礎科目", [1, 2], false, true, "持ち込み不可", "期末試験100%", "記述統計から仮説検定までの基礎。", ["ファイナンス", "データ分析"], "D", 13, ["試験一発勝負で落とす人多い", "教科書の演習問題をやらないと厳しい"]], ["c007", "15407", "情報リテラシー", "加藤 美咲", "前期", "金", 4, 2, "基幹教育科目", [1], false, false, "試験なし", "課題100%", "表計算やプレゼンなど大学で使うITスキル。", ["データ分析"], "A", 22, ["課題を出せば取れる"]], ["c008", "21408", "哲学への招待", "木村 聡", "後期", "月", 4, 2, "基幹教育科目", [1, 2], false, false, "試験なし", "レポート100%", "身近な問いから哲学的に考える練習。", [], "A", 18, ["レポート1本だけ", "内容も面白い"]], ["c009", "13309", "マーケティング論", "工藤 理沙", "前期", "水", 3, 2, "専門科目", [2, 3, 4], false, false, "持ち込み可", "期末試験60%・リアクションペーパー40%", "4Pや消費者理解など、マーケティングの基本枠組み。", ["マーケティング"], "B", 25, ["事例が多くて面白い", "リアぺを毎回書く"]], ["c010", "12210", "経営学総論", "小林 健", "前期", "火", 2, 2, "専門科目", [2, 3, 4], false, false, "持ち込み不可", "期末試験100%", "組織と戦略の基礎理論を学ぶ。", ["経営戦略"], "C", 19, ["暗記量が多い"]], ["c011", "21211", "消費者行動論", "工藤 理沙", "後期", "月", 2, 2, "専門科目", [3, 4], false, false, "持ち込み可", "レポート60%・小テスト40%", "人がなぜそれを買うのかを心理学の知見から考える。", ["マーケティング"], "A", 17, ["身近な話が多くて興味が持てる", "小テストは授業を聞いていれば解ける"]], ["c012", "22312", "ブランド戦略論", "中村 紗希", "後期", "火", 3, 2, "専門科目", [3, 4], true, false, "試験なし", "グループ発表50%・レポート30%・出席20%", "実在ブランドを題材に、ブランドの作り方をグループで考える。", ["マーケティング", "経営戦略"], "B", 8, ["グループワークがしんどい人には不向き", "発表は楽しい"]], ["c013", "24413", "広告論", "西田 光", "後期", "木", 4, 2, "専門科目", [3, 4], false, false, "持ち込み不可", "期末試験70%・課題30%", "広告の効果測定とメディアの変化を扱う。", ["マーケティング"], "C", 6, ["試験はやや難しい"]], ["c014", "23214", "財務会計論", "石川 葉子", "後期", "水", 2, 2, "専門科目", [3, 4], true, true, "持ち込み不可", "期末試験70%・課題30%", "企業の財務報告の仕組みと会計基準を学ぶ。", ["会計"], "D", 12, ["教科書必須で毎回使う", "資格を目指す人向け"]], ["c015", "25215", "管理会計論", "橋本 学", "後期", "金", 2, 2, "専門科目", [3, 4], false, false, "持ち込み可", "期末試験50%・課題50%", "社内の意思決定に使う会計。原価計算や予算管理。", ["会計", "経営戦略"], "B", 10, ["電卓と資料持ち込み可", "課題を出していればなんとかなる"]], ["c016", "21316", "コーポレートファイナンス", "藤井 亮", "後期", "月", 3, 2, "専門科目", [3, 4], false, true, "持ち込み不可", "期末試験80%・課題20%", "企業価値の評価と資金調達の考え方。", ["ファイナンス"], "C", 9, ["計算問題が多い", "教科書がないと復習できない"]], ["c017", "22417", "証券市場論", "松本 大輔", "後期", "火", 4, 2, "専門科目", [3, 4], false, false, "試験なし", "レポート100%", "株式市場の仕組みと投資家の行動。", ["ファイナンス"], "A", 14, ["レポートのみ", "ニュースの見方が変わる"]], ["c018", "23418", "国際ビジネス論", "Lee, M.", "後期", "水", 4, 2, "専門科目", [3, 4], true, false, "試験なし", "発表40%・レポート40%・出席20%", "海外進出する企業の戦略を事例で学ぶ。", ["国際ビジネス", "経営戦略"], "B", 7, ["英語の資料が少し出る"]], ["c019", "24219", "経営戦略論", "小林 健", "後期", "木", 2, 2, "専門科目", [3, 4], false, false, "持ち込み不可", "期末試験70%・リアクションペーパー30%", "競争優位をどう築くか。代表的な戦略理論を事例で。", ["経営戦略"], "B", 15, ["総論より面白い", "リアぺで出席代わり"]], ["c020", "25320", "組織行動論", "森 恵", "後期", "金", 3, 2, "専門科目", [3, 4], false, false, "持ち込み可", "レポート50%・小テスト50%", "職場の人間関係やモチベーションを科学する。", ["経営戦略"], "A", 11, ["就活の自己分析にも使える"]], ["c021", "21121", "流通システム論", "山口 直樹", "後期", "月", 1, 2, "専門科目", [3, 4], true, false, "持ち込み不可", "期末試験60%・出席40%", "小売と物流の仕組みとその変化。", ["マーケティング"], "C", 5, ["1限で出席必須はきつい"]], ["c022", "23322", "データ分析演習", "太田 涼", "後期", "水", 3, 2, "専門科目", [3, 4], true, false, "試験なし", "課題70%・出席30%", "表計算と簡単なプログラムで実際のデータを分析する。", ["データ分析", "マーケティング"], "B", 9, ["手を動かすので身につく", "課題は毎週ある"]], ["c023", "24323", "税務会計論", "岡田 修", "後期", "木", 3, 2, "専門科目", [3, 4], false, true, "持ち込み不可", "期末試験100%", "法人税の基本的な考え方と計算。", ["会計"], "E", 4, ["かなり難しい"]], ["c024", "25124", "ビジネス英語", "Brown, K.", "後期", "金", 1, 1, "外国語科目", [2, 3, 4], true, false, "試験なし", "授業参加60%・課題40%", "メールや会議など、仕事で使う英語表現。", ["国際ビジネス"], "A", 10, ["出席さえすれば取れる"]], ["c025", "22225", "現代社会と法", "井上 隆", "後期", "火", 2, 2, "基幹教育科目", [2, 3, 4], false, false, "試験なし", "レポート100%", "身近なトラブルから法律の考え方を学ぶ。", [], "A", 21, ["レポート1本", "話がわかりやすい"]], ["c026", "24126", "科学と社会", "清水 綾", "後期", "木", 1, 2, "基幹教育科目", [2, 3, 4], false, false, "持ち込み可", "期末試験50%・小レポート50%", "科学技術が社会に与える影響を考える。", [], "B", 8, []], ["c027", "23527", "ベンチャー企業論", "斎藤 匠", "後期", "水", 5, 2, "専門科目", [3, 4], false, false, "試験なし", "レポート70%・リアクションペーパー30%", "起業家をゲストに招き、事業の立ち上げ方を学ぶ。", ["経営戦略"], "A", 12, ["ゲスト講義が面白い", "5限なのが難点"]], ["c028", "22528", "専門演習Ⅱ", "各担当", "後期", "火", 5, 2, "演習", [3], true, false, "試験なし", "演習への参加", "ゼミ。担当教員のもとで研究を進める。", [], null, 0, []], ["c029", "11329", "消費者心理特論", "工藤 理沙", "前期", "月", 3, 2, "専門科目", [3, 4], false, false, "持ち込み可", "レポート100%", "消費者行動論の応用編。", ["マーケティング"], "A", 6, []], ["c030", "12330", "金融論", "藤井 亮", "前期", "火", 3, 2, "専門科目", [3, 4], false, false, "持ち込み不可", "期末試験100%", "銀行と金融政策の基礎。", ["ファイナンス"], "C", 9, ["試験一発"]], ["c031", "13231", "原価計算論", "橋本 学", "前期", "水", 2, 2, "専門科目", [3, 4], false, true, "持ち込み可", "期末試験60%・課題40%", "製品のコストをどう計算するか。", ["会計"], "B", 7, []], ["c032", "14332", "グローバル経営論", "Lee, M.", "前期", "木", 3, 2, "専門科目", [3, 4], false, false, "試験なし", "レポート100%", "多国籍企業の組織と戦略。", ["国際ビジネス", "経営戦略"], "A", 8, []], ["c033", "12533", "専門演習Ⅰ", "各担当", "前期", "火", 5, 2, "演習", [3], true, false, "試験なし", "演習への参加", "ゼミ。文献を読み、研究テーマを決める。", [], null, 0, []]];
const COURSES = COURSE_ROWS.map((r) => Object.fromEntries(COURSE_KEYS.map((k, i) => [k, r[i]])));

const DEPARTMENTS = ["商学科", "公共経営学科"];
const REQUIREMENTS = [
  ["基幹教育科目", 20], ["外国語科目", 8], ["学部基礎科目", 16], ["専門科目", 56], ["演習", 8],
].map(([category, min_credits]) => ({ category, min_credits }));
const CATEGORIES = REQUIREMENTS.map((r) => r.category);
const CATEGORY_COLOR = { 専門科目: "#2F5FD0", 学部基礎科目: "#7A5AC8", 基幹教育科目: "#2E9AA8", 外国語科目: "#C2477A", 演習: "#7C8A2E" };
const INTEREST_OPTIONS = ["マーケティング", "会計", "ファイナンス", "経営戦略", "国際ビジネス", "データ分析"];
const DAYS = ["月", "火", "水", "木", "金"];
const PERIODS = [1, 2, 3, 4, 5];
const CUTOFFS = [
  ["exclude_textbook_required", "教科書購入必須"],
  ["exclude_attendance_required", "出席必須"],
  ["exclude_closed_book_exam", "テスト持ち込み不可"],
  ["exclude_crobas_c_or_below", "クロバスC以下"],
];
const DEFAULT_PREFS = {
  days_off: [], avoid_first_period: false, easy_priority: 1,
  exclude_textbook_required: false, exclude_attendance_required: false, exclude_closed_book_exam: false, exclude_crobas_c_or_below: false,
  interests: [], interest_free_text: "", target_credits: null, pinned_course_ids: [], excluded_course_ids: [],
};
const EMPTY_STATE = {
  screen: "home", profile: null, taken: [], prefs: DEFAULT_PREFS, timetables: [],
  progress: { input_started_at: null, input_completed: false },
};

/* ---------- 小さな道具 ---------- */
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.normalize("NFKC").replace(/[\s　・]/g, "").toLowerCase();
const courseById = (id) => COURSES.find((c) => c.id === id);
const findCourse = (name) => {
  const n = norm(name);
  return COURSES.find((c) => norm(c.name) === n) || COURSES.find((c) => n.length >= 4 && norm(c.name).includes(n));
};
const guessTerm = () => { const m = new Date().getMonth() + 1; return m >= 2 && m <= 7 ? "前期" : "後期"; };
const academicYear = () => { const d = new Date(); return d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1; };
// 学籍番号の先頭5桁（仮ルール：先頭2桁＝入学年度、3〜5桁目＝学科コード）
const parseStudentId = (p) => {
  if (!/^\d{5}$/.test(p)) return null;
  const year = academicYear() - (2000 + Number(p.slice(0, 2))) + 1;
  return { department: { 210: "商学科", 220: "公共経営学科" }[p.slice(2, 5)] || null, year: year >= 1 && year <= 4 ? year : null };
};

/* ---------- 保存（チャット上の保存領域。使えなければメモリだけ） ---------- */
const STORE_KEY = "jitanwari-state";
async function loadState() {
  try {
    const r = await window.storage.get(STORE_KEY, false);
    return r ? { ...EMPTY_STATE, ...JSON.parse(r.value) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}
async function saveState(state) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(state), false); } catch { /* 保存できなくても動かす */ }
}

/* ---------- 計測（この版では画面の「計測ログ」に表示） ---------- */
const eventLog = [];
function track(event, props = {}) {
  const e = { event, at: new Date().toLocaleTimeString("ja-JP"), ...props };
  eventLog.push(e);
  console.info("[track]", JSON.stringify(e));
}

/* ---------- AI（チャット上ではキーなしで呼べる） ---------- */
const OCR_SYSTEM = `あなたは大学の時間割のスクリーンショットを読み取る係です。
画像に写っている授業名をすべて抜き出し、次のJSONだけを返してください。前置きやコードブロックは不要です。
{"courses":[{"name":"授業名","credits":単位数または null,"category_guess":"区分の推定または null"}]}
- category_guess は次のいずれか：基幹教育科目 / 外国語科目 / 学部基礎科目 / 専門科目 / 演習。判断できなければ null
- 同じ授業が複数の画像に写っていても1回だけ書く
- 授業以外（教室名、教員名、時限の数字）は含めない`;
const REVISION_SYSTEM = `あなたは時間割アプリの修正指示を条件に変換する係です。次のJSONだけを返してください。前置きやコードブロックは不要です。
{"add_days_off":["月"],"remove_days_off":[],"exclude_slots":["月2"],"exclude_course_names":[],"pin_course_names":[],"avoid_first_period":null,"easy_priority":null,"message":"ユーザーへの短い一言"}
- 曜日は 月 火 水 木 金 のみ。時限は1〜5
- exclude_course_names と pin_course_names は、渡された時間割にある授業名だけを使う
- easy_priority は 0（気にしない）1（ふつう）2（楽単重視）または null
- message は先輩のような短く気さくな口調で、何を変えたかを1文で`;

async function callClaude(system, content) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error("AI " + res.status);
  const data = await res.json();
  const text = data.content.map((c) => (c.type === "text" ? c.text : "")).join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function compressImage(file, maxSide = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = url; });
    const s = Math.min(1, maxSide / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

async function readScreenshots(files) {
  const images = await Promise.all(files.slice(0, 8).map(compressImage));
  const content = [
    ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
    { type: "text", text: "これらの時間割に写っている授業を抜き出してください。" },
  ];
  const r = await callClaude(OCR_SYSTEM, content);
  return r.courses || [];
}

const MOCK_OCR = [
  ["商学入門", 2, "学部基礎科目"], ["会計学入門", 2, "学部基礎科目"], ["経済学の基礎", 2, "学部基礎科目"],
  ["英語コミュニケーションⅠ", 1, "外国語科目"], ["英語コミュニケーションⅡ", 1, "外国語科目"], ["中国語Ⅰ", 1, "外国語科目"],
  ["中国語Ⅱ", 1, "外国語科目"], ["統計学入門", 2, "学部基礎科目"], ["情報リテラシー", 2, "基幹教育科目"],
  ["哲学への招待", 2, "基幹教育科目"], ["心理学入門", 2, "基幹教育科目"], ["日本国憲法", 2, "基幹教育科目"],
  ["基礎ゼミナール", 2, "演習"], ["マーケティング論", 2, "専門科目"], ["経営学総論", 2, "専門科目"],
  ["簿記演習", 2, null], ["スポーツ実習", 1, null],
].map(([name, credits, category_guess]) => ({ name, credits, category_guess }));

function ruleRevision(text, slotNames) {
  const t = text.normalize("NFKC");
  const r = { add_days_off: [], remove_days_off: [], exclude_slots: [], exclude_course_names: [], pin_course_names: [], avoid_first_period: null, easy_priority: null, message: "" };
  for (const m of t.matchAll(/([月火水木金])曜?日?\s*([1-5])\s*限?/g)) r.exclude_slots.push(m[1] + m[2]);
  DAYS.forEach((d) => { if (new RegExp(d + "曜?日?.{0,4}(全休|休み|空け)").test(t)) r.add_days_off.push(d); });
  if (/1限.{0,4}(なし|避け|いや|無理|ムリ)/.test(t)) r.avoid_first_period = true;
  if (/(楽|らく)/.test(t)) r.easy_priority = 2;
  Object.values(slotNames).forEach((n) => {
    if (t.includes(n) && /(外|いら|やめ|消)/.test(t)) r.exclude_course_names.push(n);
    if (t.includes(n) && /(固定|残|キープ)/.test(t)) r.pin_course_names.push(n);
  });
  return r;
}

async function interpretRevision(text, slotNames) {
  try {
    const prompt = `現在の時間割（曜日時限: 授業名）: ${JSON.stringify(slotNames)}\n修正指示: ${text.slice(0, 300)}`;
    return { ...ruleRevision("", {}), ...(await callClaude(REVISION_SYSTEM, [{ type: "text", text: prompt }])) };
  } catch {
    return ruleRevision(text, slotNames); // AIが使えないときは簡易ルール
  }
}

const toTaken = (ocr) => ocr.map((o) => {
  const c = findCourse(o.name);
  return { id: uid(), raw_name: o.name, course_id: c ? c.id : null, credits: c ? c.credits : o.credits || 2, category: c ? c.category : o.category_guess || "", status: "passed" };
});

/* ---------- 時間割の生成（AIではなくコード） ---------- */
const GRADE = { A: 100, B: 75, C: 50, D: 25, E: 0 };
function easinessOf(c) {
  let s = c.crobas_grade ? GRADE[c.crobas_grade] : 55;
  if (c.attendance_required) s -= 10;
  if (c.textbook_required) s -= 10;
  if (c.exam_materials === "持ち込み不可") s -= 10;
  if (c.exam_materials === "試験なし") s += 5;
  return Math.max(0, Math.min(100, s));
}
const interestWords = (p) => [...p.interests, ...p.interest_free_text.normalize("NFKC").split(/[\s、,。・/]+/).filter((w) => w.length >= 2)];
const matchesInterest = (c, p) => {
  const ws = interestWords(p);
  const hay = [c.name, c.summary, ...c.interest_tags].join(" ");
  return ws.some((w) => c.interest_tags.includes(w) || hay.includes(w));
};
function exclusionReason(c, p) {
  if (p.excluded_course_ids.includes(c.id)) return "外した授業";
  if (p.days_off.includes(c.day)) return "全休";
  if (p.avoid_first_period && c.period === 1) return "1限";
  if (c.category === "演習") return null; // ゼミは実質必修なので足切りでは外さない
  if (p.exclude_textbook_required && c.textbook_required) return "教科書";
  if (p.exclude_attendance_required && c.attendance_required) return "出席";
  if (p.exclude_closed_book_exam && c.exam_materials === "持ち込み不可") return "持ち込み不可";
  if (p.exclude_crobas_c_or_below && c.crobas_grade && "CDE".includes(c.crobas_grade)) return "クロバス";
  return null;
}
const earnedBy = (taken) => taken.reduce((o, t) => (t.status === "passed" && t.category ? { ...o, [t.category]: (o[t.category] || 0) + t.credits } : o), {});
function candidatesFor(profile, taken) {
  const passedIds = new Set(taken.filter((t) => t.status === "passed").map((t) => t.course_id));
  const passedNames = new Set(taken.filter((t) => t.status === "passed").map((t) => norm(t.raw_name)));
  return COURSES.filter((c) => (c.term === profile.term || c.term === "通年") && c.target_years.includes(profile.year) && !passedIds.has(c.id) && !passedNames.has(norm(c.name)));
}
function computeStatus(ids, taken, prefs) {
  const chosen = ids.map(courseById).filter(Boolean);
  const earned = earnedBy(taken);
  const ws = interestWords(prefs);
  return {
    easiness: chosen.length ? Math.round(chosen.reduce((s, c) => s + easinessOf(c), 0) / chosen.length) : 0,
    interest_match: ws.length && chosen.length ? Math.round((chosen.filter((c) => matchesInterest(c, prefs)).length / chosen.length) * 100) : null,
    requirements: REQUIREMENTS.map((r) => ({
      category: r.category, required: r.min_credits, earned: earned[r.category] || 0,
      planned: chosen.filter((c) => c.category === r.category).reduce((s, c) => s + c.credits, 0),
    })),
  };
}
function generateTimetables(profile, taken, prefs) {
  const earned = earnedBy(taken);
  const deficit = (cat) => { const r = REQUIREMENTS.find((x) => x.category === cat); return r ? Math.max(0, r.min_credits - (earned[cat] || 0)) : 0; };
  const target = prefs.target_credits || 16;
  const all = candidatesFor(profile, taken);
  const pinned = all.filter((c) => prefs.pinned_course_ids.includes(c.id) || (c.category === "演習" && !prefs.excluded_course_ids.includes(c.id)));
  const pool = all.filter((c) => !pinned.includes(c) && !exclusionReason(c, prefs));
  const boost = 0.6 + prefs.easy_priority * 0.3;
  const interested = interestWords(prefs).length > 0;
  const patterns = [["バランス", 0.6, 0.6], ["楽単重視", 1.2, 0.2], ["興味重視", 0.2, 1.2]];
  const out = []; const seen = new Set(); const used = new Set();
  for (const [label, we, wi] of patterns) {
    if (label === "興味重視" && !interested) continue;
    const score = (c) => (deficit(c.category) > 0 ? 40 : 0) + easinessOf(c) * we * boost + (interested && matchesInterest(c, prefs) ? 100 : 0) * wi - (used.has(c.id) ? 12 : 0);
    const slots = {}; let total = 0;
    for (const c of [...pinned, ...[...pool].sort((a, b) => score(b) - score(a))]) {
      const k = c.day + c.period;
      if (slots[k] || (!pinned.includes(c) && total + c.credits > target)) continue;
      slots[k] = c.id; total += c.credits;
    }
    Object.values(slots).forEach((id) => !pinned.some((p) => p.id === id) && used.add(id));
    const sig = Object.entries(slots).sort().join("|");
    if (!total || seen.has(sig)) continue;
    seen.add(sig);
    out.push({ id: uid(), pattern_label: label, slots, total_credits: total, status: computeStatus(Object.values(slots), taken, prefs), created_at: new Date().toISOString() });
  }
  return out;
}

/* ---------- 見た目（ライト／ダーク両対応の色） ---------- */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
.jw { --paper:247 248 250; --surface:255 255 255; --track:234 238 244; --ink:31 35 40; --soft:87 96 106; --faint:140 149 159;
  --rule:220 227 238; --brand:47 95 208; --brand-tint:232 238 251; --on-brand:255 255 255; --caution:232 131 58;
  --caution-tint:253 240 230; --caution-dark:179 90 23; --done:46 158 91; --done-tint:229 245 235; --line:238 242 248;
  font-family:"Noto Sans JP",system-ui,sans-serif; font-feature-settings:"palt" 1; color:rgb(var(--ink)); background:rgb(var(--paper)); color-scheme:light; }
@media (prefers-color-scheme: dark) { .jw { --paper:21 24 29; --surface:30 34 41; --track:44 50 60; --ink:230 234 239; --soft:164 173 184;
  --faint:118 127 138; --rule:54 61 72; --brand:122 160 248; --brand-tint:36 49 82; --on-brand:14 20 34; --caution:240 156 96;
  --caution-tint:66 44 28; --caution-dark:248 186 140; --done:92 196 132; --done-tint:27 56 40; --line:36 41 49; color-scheme:dark; } }
.jw .bg-paper{background:rgb(var(--paper))} .jw .bg-paper95{background:rgb(var(--paper)/.95)} .jw .bg-surface{background:rgb(var(--surface))}
.jw .bg-track{background:rgb(var(--track))} .jw .bg-brand{background:rgb(var(--brand))} .jw .bg-brand-tint{background:rgb(var(--brand-tint))}
.jw .bg-caution{background:rgb(var(--caution))} .jw .bg-caution-tint{background:rgb(var(--caution-tint))} .jw .bg-done{background:rgb(var(--done))}
.jw .bg-done-tint{background:rgb(var(--done-tint))} .jw .bg-ink{background:rgb(var(--ink))} .jw .bg-faint{background:rgb(var(--faint))}
.jw .t-ink{color:rgb(var(--ink))} .jw .t-soft{color:rgb(var(--soft))} .jw .t-faint{color:rgb(var(--faint))} .jw .t-brand{color:rgb(var(--brand))}
.jw .t-on-brand{color:rgb(var(--on-brand))} .jw .t-caution{color:rgb(var(--caution-dark))} .jw .t-done{color:rgb(var(--done))} .jw .t-paper{color:rgb(var(--paper))}
.jw .b-rule{border-color:rgb(var(--rule))} .jw .b-brand{border-color:rgb(var(--brand))} .jw .b-caution{border-color:rgb(var(--caution))} .jw .b-faint{border-color:rgb(var(--faint))}
.jw .notebook{background-color:rgb(var(--surface));background-image:repeating-linear-gradient(to bottom,transparent 0 15px,rgb(var(--line)) 15px 16px)}
.jw .cell{background:rgb(var(--surface));box-shadow:inset 3px 0 0 var(--c),0 0 0 1px rgb(var(--rule))}
.jw .press:hover{filter:brightness(.97)} .jw .press:active{filter:brightness(.93)}
.jw :focus-visible{outline:2px solid rgb(var(--brand));outline-offset:2px}
.jw .pop{animation:jwpop .32s ease-out both} @keyframes jwpop{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.jw .sheet{animation:jwsheet .22s ease-out both} @keyframes jwsheet{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){.jw *{animation:none!important;transition:none!important}}
`;

/* ---------- 部品 ---------- */
function Btn({ kind = "primary", className = "", children, ...p }) {
  const k = {
    primary: "bg-brand t-on-brand",
    outline: "bg-surface t-ink border b-rule",
    ghost: "t-soft",
    soft: "bg-brand-tint t-brand",
  }[kind];
  return (
    <button type="button" className={`press inline-flex items-center justify-center gap-2 rounded-lg font-medium h-11 px-4 text-sm disabled:opacity-50 ${k} ${className}`} {...p}>
      {children}
    </button>
  );
}
function Chip({ active, onClick, tone = "brand", children, className = "" }) {
  const on = tone === "caution" ? "b-caution bg-caution-tint t-caution" : "b-brand bg-brand-tint t-brand";
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-medium ${active ? on : "b-rule bg-surface t-soft"} ${className}`}>
      {children}
    </button>
  );
}
function Field({ className = "", ...p }) {
  return <input className={`h-11 w-full rounded-lg border b-rule bg-surface px-3 text-base t-ink ${className}`} {...p} />;
}
function Section({ title, hint, children }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold t-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-sm t-soft">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
function StepHeader({ step, title, lead }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">{[1, 2, 3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-brand" : "bg-track"}`} />)}</div>
        <span className="text-xs font-medium tabular-nums t-soft">ステップ {step}/3</span>
      </div>
      <h1 className="text-2xl font-bold leading-snug t-ink">{title}</h1>
      {lead && <p className="mt-1.5 text-sm leading-relaxed t-soft">{lead}</p>}
    </div>
  );
}
function Sheet({ open, onClose, title, sub, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.45)" }} onClick={onClose} />
      <div className="sheet relative w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8 sm:rounded-2xl" style={{ maxHeight: "88vh" }}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg t-soft" aria-label="閉じる"><X size={20} /></button>
        <div className="mb-4 pr-10">
          {sub}
          <h3 className="text-lg font-bold leading-snug t-ink">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- 画面：トップ ---------- */
function Home({ hasProgress, onStart, onResume }) {
  const filled = { 月2: ["消費者行動論", "#2F5FD0"], 火2: ["現代社会と法", "#2E9AA8"], 水3: ["データ分析演習", "#2F5FD0"], 木2: ["経営戦略論", "#2F5FD0"], 火5: ["専門演習Ⅱ", "#7C8A2E"] };
  return (
    <>
      <h1 className="text-3xl font-bold leading-snug tracking-tight t-ink">時間割づくり、<br />3分の入力で終わらせよう。</h1>
      <p className="mt-3 text-base leading-relaxed t-soft">UNIPAと授業カタログとクロバスを行き来しなくていい。今までの時間割を送って条件を選べば、卒業要件を満たす時間割ができます。</p>
      <div className="notebook mt-6 rounded-xl border b-rule p-3" aria-hidden="true">
        <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: "18px repeat(5, minmax(0,1fr))" }}>
          <span />
          {DAYS.map((d) => <span key={d} className={`text-center font-medium ${d === "金" ? "t-done" : "t-soft"}`}>{d}</span>)}
          {PERIODS.map((p) => (
            <div key={p} className="contents">
              <span className="grid place-items-center tabular-nums t-faint">{p}</span>
              {DAYS.map((d, di) => {
                const f = filled[d + p];
                return (
                  <div key={d} className={`h-9 rounded ${f ? "cell pop" : d === "金" ? "bg-done-tint" : ""}`}
                    style={f ? { "--c": f[1], animationDelay: `${(di + p) * 90}ms` } : undefined}>
                    {f && <span className="line-clamp-2 block pl-1.5 pt-0.5 t-ink" style={{ fontSize: 10, lineHeight: 1.3 }}>{f[0]}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-xs t-done">金曜は全休</p>
      </div>
      <ol className="mt-7 space-y-4">
        {[["学科と学年を選ぶ", "学籍番号の先頭5桁でもOK"], ["今までの時間割のスクショを送る", "落とした授業にチェックするだけ"], ["条件を選んで生成", "全休の曜日や、避けたい授業の条件"]].map(([t, n], i) => (
          <li key={t} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 b-brand text-sm font-bold t-brand">{i + 1}</span>
            <div><p className="text-base font-medium t-ink">{t}</p><p className="text-sm t-soft">{n}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8 flex items-start gap-2 text-sm leading-relaxed t-soft"><ShieldCheck size={16} className="mt-0.5 shrink-0 t-done" />スクショは読み取りにだけ使い、保存しません。</p>
      <Footer>
        {hasProgress ? (
          <div className="grid grid-cols-2 gap-2"><Btn kind="outline" className="h-12 text-base" onClick={onStart}>はじめから</Btn><Btn className="h-12 text-base" onClick={onResume}>続きから</Btn></div>
        ) : <Btn className="h-12 w-full text-base" onClick={onStart}>はじめる</Btn>}
      </Footer>
    </>
  );
}

function Footer({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t b-rule bg-paper95" style={{ backdropFilter: "blur(8px)" }}>
      <div className="mx-auto max-w-xl px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

/* ---------- 画面：ステップ1 ---------- */
function Setup({ state, update, go }) {
  const p = state.profile;
  const [prefix, setPrefix] = useState(p?.student_id_prefix || "");
  const [department, setDepartment] = useState(p?.department || null);
  const [year, setYear] = useState(p?.year || null);
  const [term, setTerm] = useState(p?.term || guessTerm());
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (!state.progress.input_started_at) {
      update({ progress: { ...state.progress, input_started_at: new Date().toISOString() } });
      track("input_start");
    }
  }, []);

  const onPrefix = (v) => {
    const d = v.normalize("NFKC").replace(/\D/g, "").slice(0, 5);
    setPrefix(d);
    const r = d.length === 5 ? parseStudentId(d) : null;
    if (!r) return setNote(d.length === 5 ? "読み取れなかったので、下から選んでね。" : null);
    if (r.department) setDepartment(r.department);
    if (r.year) setYear(r.year);
    setNote(r.department && r.year ? `${r.department}・${r.year}年生として入れたよ。違ったら下で直してね。` : "一部だけ読み取れたよ。残りは下から選んでね。");
  };

  const next = () => {
    update({ profile: { user_id: null, faculty: "商学部", department, year, term, student_id_prefix: prefix.length === 5 ? prefix : null, created_at: new Date().toISOString() } });
    track("profile_done", { department, year, term });
    go("history");
  };

  return (
    <>
      <StepHeader step={1} title="学科と学年を教えてね" lead="商学部の卒業要件に合わせて時間割をつくります。" />
      <Section title="学籍番号の先頭5桁" hint="入れると学科と学年が自動で埋まります（なくてもOK）">
        <Field inputMode="numeric" placeholder="例：24210" value={prefix} onChange={(e) => onPrefix(e.target.value)} />
        {note && <p className="mt-2 text-sm t-brand">{note}</p>}
      </Section>
      <Section title="学科">
        <div className="flex flex-wrap gap-2">{DEPARTMENTS.map((d) => <Chip key={d} active={department === d} onClick={() => setDepartment(d)}>商学部 {d}</Chip>)}</div>
      </Section>
      <Section title="学年">
        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((y) => <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}年</Chip>)}</div>
      </Section>
      <Section title="つくる時間割">
        <div className="flex items-center justify-between rounded-xl border b-rule bg-surface px-4 py-3">
          <span className="flex items-center gap-2.5 text-base font-medium t-ink"><CalendarDays size={20} className="t-brand" />{term}の時間割</span>
          <Btn kind="soft" onClick={() => setTerm(term === "前期" ? "後期" : "前期")}>{term === "前期" ? "後期" : "前期"}にする</Btn>
        </div>
        <p className="mt-1.5 text-xs t-faint">今日の日付から自動で選んでいます</p>
      </Section>
      <Footer><Btn className="h-12 w-full text-base" disabled={!department || !year} onClick={next}>次へ：時間割のスクショ</Btn></Footer>
    </>
  );
}

/* ---------- 画面：ステップ2 ---------- */
function HowTo() {
  return (
    <svg viewBox="0 0 100 140" className="h-28 w-20 shrink-0 rounded border b-rule bg-surface" aria-hidden="true">
      <rect width="100" height="13" fill="#1F4E9A" />
      {PERIODS.map((p) => DAYS.map((d, i) => (
        <rect key={d + p} x={10 + i * 17.5} y={20 + (p - 1) * 21} width="16" height="19" rx="1.5"
          fill={["月2", "火3", "水4", "木2", "金4", "火2"].includes(d + p) ? "#C9D8F5" : "none"} stroke="#DCE3EE" />
      )))}
      <rect x="2" y="16" width="96" height="110" rx="3" fill="none" stroke="#2E9E5B" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

function History({ state, update, go, toast }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(null);
  const list = state.taken.length ? state.taken : null;
  const setList = (taken) => update({ taken });

  const run = async (source, files = []) => {
    setLoading(true); setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, 2)), 700);
    const t0 = performance.now();
    try {
      track("screenshot_uploaded", { count: files.length, source });
      const ocr = source === "sample" ? (await sleep(1400), MOCK_OCR) : await readScreenshots(files);
      const taken = toTaken(ocr);
      track("ocr_done", { source, courses: taken.length, seconds: Math.round((performance.now() - t0) / 1000) });
      if (!taken.length) return toast("授業が見つからなかった", "時間割の画面全体が写るように撮り直してみてね。");
      setList(taken);
    } catch (e) {
      track("ocr_failed", { source, message: String(e) });
      toast("読み取れなかった", "通信を確認してもう一度。うまくいかなければ「サンプル画像で試す」で流れを体験できます。");
    } finally {
      clearInterval(timer); setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const failed = list ? list.filter((t) => t.status === "failed").length : 0;

  const confirm = () => {
    const pr = state.progress;
    const elapsed = pr.input_started_at ? Math.round((Date.now() - new Date(pr.input_started_at).getTime()) / 1000) : null;
    if (!pr.input_completed) {
      track("history_confirmed", { failed, courses: list.length, elapsed_sec: elapsed, within_3min: elapsed !== null && elapsed <= 180 });
      update({ progress: { ...pr, input_completed: true } });
    }
    go("prefs");
  };

  const patch = (id, p) => setList(list.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { const f = Array.from(e.target.files || []).filter((x) => x.type.startsWith("image/")); if (f.length) run("upload", f); }} />
      {loading ? (
        <>
          <StepHeader step={2} title="読み取っています" />
          <div className="flex flex-col items-center rounded-xl border b-rule bg-surface px-6 py-12 text-center" role="status">
            <Loader2 size={32} className="animate-spin t-brand" />
            <p className="mt-4 text-base font-medium t-ink">{["スクショを読み込み中…", "授業名を読み取り中…", "授業データと照らし合わせ中…"][step]}</p>
            <p className="mt-1 text-sm t-soft">数秒で終わります</p>
          </div>
        </>
      ) : !list ? (
        <>
          <StepHeader step={2} title="今までの時間割のスクショを送ってね" lead="1学期ぶんにつき1枚。UNIPAの時間割画面をそのまま撮ればOKです。" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="press flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed b-brand bg-surface px-6 py-9 text-center">
            <ImagePlus size={32} className="t-brand" />
            <span className="text-base font-bold t-brand">スクショを選ぶ</span>
            <span className="text-sm t-soft">まとめて何枚でも選べます</span>
          </button>
          <div className="mt-5 flex gap-3 rounded-xl border b-rule bg-surface p-3">
            <HowTo />
            <div className="text-sm leading-relaxed t-soft">
              <p className="font-medium t-ink">撮り方の見本</p>
              <p className="mt-1">月〜金と1〜5限が全部入るように撮ってね。1年前期・1年後期・2年前期…と学期ごとに1枚ずつ。</p>
            </div>
          </div>
          <Btn kind="ghost" className="mt-4 w-full" onClick={() => run("sample")}><Sparkles size={18} />サンプル画像で試す</Btn>
        </>
      ) : (
        <>
          <StepHeader step={2} title="落とした授業にだけチェックしてね" lead="何もチェックしなければ、全部取れた扱いになります。" />
          <ul className="overflow-hidden rounded-xl border b-rule bg-surface">
            {list.map((t, i) => {
              const f = t.status === "failed";
              return (
                <li key={t.id} className={`px-3 py-2 ${i ? "border-t b-rule" : ""} ${f ? "bg-caution-tint" : ""}`}>
                  <div className="flex items-center gap-3" style={{ minHeight: 44 }}>
                    <button type="button" role="checkbox" aria-checked={f} aria-label={`${t.raw_name}を落とした`}
                      onClick={() => patch(t.id, { status: f ? "passed" : "failed" })}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded border-2 ${f ? "b-caution bg-caution" : "b-faint bg-surface"}`}>
                      {f && <Check size={16} strokeWidth={3} color="#fff" />}
                    </button>
                    {editing === t.id ? (
                      <Field autoFocus defaultValue={t.raw_name} className="h-10"
                        onBlur={(e) => {
                          const name = e.target.value.trim(); setEditing(null); if (!name) return;
                          const c = findCourse(name);
                          patch(t.id, { raw_name: name, course_id: c ? c.id : null, credits: c ? c.credits : t.credits, category: c ? c.category : t.category });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
                    ) : (
                      <button type="button" className="flex min-w-0 flex-1 flex-col py-1 text-left" onClick={() => patch(t.id, { status: f ? "passed" : "failed" })}>
                        <span className={`text-base ${f ? "t-caution" : "t-ink"}`}>{t.raw_name}</span>
                        <span className="text-xs tabular-nums t-faint">{t.credits}単位{t.category ? "・" + t.category : ""}</span>
                      </button>
                    )}
                    <div className="flex shrink-0">
                      <button type="button" className="grid h-11 w-11 place-items-center t-soft" aria-label={`${t.raw_name}の名前を直す`} onClick={() => setEditing(t.id)}><Pencil size={18} /></button>
                      <button type="button" className="grid h-11 w-11 place-items-center t-soft" aria-label={`${t.raw_name}を消す`} onClick={() => setList(list.filter((x) => x.id !== t.id))}><Trash2 size={18} /></button>
                    </div>
                  </div>
                  {!t.category && (
                    <div className="mb-1 ml-9">
                      <p className="text-xs t-brand">区分を選んでね</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => patch(t.id, { category: c })} className="h-9 rounded-full border b-rule px-3 text-xs t-soft">{c}</button>)}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn kind="outline" onClick={() => { const id = uid(); setList([...list, { id, raw_name: "新しい授業", course_id: null, credits: 2, category: "", status: "passed" }]); setEditing(id); }}><Plus size={18} />授業を追加</Btn>
            <Btn kind="outline" onClick={() => fileRef.current?.click()}><RefreshCw size={18} />送り直す</Btn>
          </div>
          <Footer><Btn className="h-12 w-full text-base" onClick={confirm}>これでOK{failed ? `（落とした授業 ${failed}件）` : ""}</Btn></Footer>
        </>
      )}
    </>
  );
}

/* ---------- 画面：ステップ3 ---------- */
function Prefs({ state, update, go, toast }) {
  const prefs = state.prefs;
  const set = (p) => update({ prefs: { ...prefs, ...p } });
  const { cand, excl } = useMemo(() => {
    const c = candidatesFor(state.profile, state.taken);
    return { cand: c.length, excl: c.filter((x) => exclusionReason(x, prefs)).length };
  }, [state.profile, state.taken, prefs]);

  const generate = () => {
    const tts = generateTimetables(state.profile, state.taken, prefs);
    track("generate_clicked", { days_off: prefs.days_off.length, easy_priority: prefs.easy_priority, patterns: tts.length });
    if (!tts.length) return toast("条件に合う授業がなかった", "全休の曜日や足切り条件を少しゆるめてみてね。");
    update({ timetables: tts });
    go("result");
  };
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <StepHeader step={3} title="条件を選んでね" lead="全部選ばなくても大丈夫。あとから結果画面で直せます。" />
      <Section title="全休にしたい曜日">
        <div className="grid grid-cols-5 gap-2">{DAYS.map((d) => <Chip key={d} className="px-0" active={prefs.days_off.includes(d)} onClick={() => set({ days_off: toggle(prefs.days_off, d) })}>{d}</Chip>)}</div>
        <div className="mt-2"><Chip active={prefs.avoid_first_period} onClick={() => set({ avoid_first_period: !prefs.avoid_first_period })}>1限を避ける</Chip></div>
      </Section>
      <Section title="楽単をどれくらい優先する？">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-track p-1" role="radiogroup">
          {["気にしない", "ふつう", "楽単重視"].map((l, i) => (
            <button key={l} type="button" role="radio" aria-checked={prefs.easy_priority === i} onClick={() => set({ easy_priority: i })}
              className={`h-11 rounded-lg text-sm font-medium ${prefs.easy_priority === i ? "bg-surface t-ink shadow-sm" : "t-soft"}`}>{l}</button>
          ))}
        </div>
      </Section>
      <Section title="これがある授業は入れない" hint="選んだ条件に当てはまる授業は、最初から候補に入れません">
        <div className="flex flex-wrap gap-2">{CUTOFFS.map(([k, l]) => <Chip key={k} tone="caution" active={prefs[k]} onClick={() => set({ [k]: !prefs[k] })}>{l}</Chip>)}</div>
      </Section>
      <Section title="興味のある分野" hint="合う授業を優先して入れます">
        <div className="flex flex-wrap gap-2">{INTEREST_OPTIONS.map((t) => <Chip key={t} active={prefs.interests.includes(t)} onClick={() => set({ interests: toggle(prefs.interests, t) })}>{t}</Chip>)}</div>
        <Field className="mt-3" placeholder="ほかに気になること（例：起業、心理学）" value={prefs.interest_free_text} onChange={(e) => set({ interest_free_text: e.target.value })} />
      </Section>
      <Section title="取りたい単位数" hint="空欄なら16単位を目安にします">
        <div className="flex items-center gap-2">
          <Field inputMode="numeric" className="w-24 text-center tabular-nums" placeholder="16" value={prefs.target_credits ?? ""}
            onChange={(e) => { const n = Number(e.target.value.normalize("NFKC").replace(/\D/g, "")); set({ target_credits: n > 0 ? Math.min(n, 30) : null }); }} />
          <span className="text-base t-soft">単位</span>
        </div>
      </Section>
      <Footer>
        <p className="mb-2 text-center text-xs tabular-nums t-soft">候補 {cand - excl} 授業{excl ? `（条件で ${excl} 授業を外しています）` : ""}</p>
        <Btn className="h-12 w-full text-base" onClick={generate}><Wand2 size={18} />時間割をつくる</Btn>
      </Footer>
    </>
  );
}

/* ---------- 画面：結果 ---------- */
function Grid({ slots, daysOff, pinned, onOpen }) {
  return (
    <div className="notebook rounded-xl border b-rule p-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: "20px repeat(5, minmax(0,1fr))" }}>
        <span />
        {DAYS.map((d) => <div key={d} className={`pb-1 text-center text-sm font-medium ${daysOff.includes(d) ? "t-done" : "t-soft"}`}>{d}</div>)}
        {PERIODS.map((p) => (
          <div key={p} className="contents">
            <div className="grid place-items-center text-xs tabular-nums t-faint">{p}</div>
            {DAYS.map((d) => {
              const c = courseById(slots[d + p]);
              if (!c) return <div key={d} className={`rounded ${daysOff.includes(d) ? "bg-done-tint" : "border border-dashed b-rule"}`} style={{ height: 60 }} />;
              return (
                <button key={d} type="button" onClick={() => onOpen(c)} aria-label={`${d}曜${p}限 ${c.name}`}
                  className="cell press relative overflow-hidden rounded pl-2 pr-1 text-left" style={{ height: 60, "--c": CATEGORY_COLOR[c.category] }}>
                  <span className="line-clamp-3 font-medium t-ink" style={{ fontSize: 11, lineHeight: 1.3 }}>{c.name.length > 12 ? c.name.slice(0, 11) + "…" : c.name}</span>
                  {pinned.includes(c.id) && <Pin size={12} className="absolute bottom-1 right-1 t-brand" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, note }) {
  return (
    <div>
      <div className="flex items-baseline justify-between"><span className="text-sm t-soft">{label}</span><span className="text-lg font-bold tabular-nums t-ink">{value === null ? "—" : value + "%"}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-brand" style={{ width: (value || 0) + "%", transition: "width .5s" }} /></div>
      {note && <p className="mt-1 text-xs t-faint">{note}</p>}
    </div>
  );
}

function Status({ t }) {
  return (
    <div className="rounded-xl border b-rule bg-surface p-4">
      <div className="flex items-baseline gap-1.5"><span className="text-sm t-soft">合計</span><span className="text-3xl font-bold leading-none tabular-nums t-ink">{t.total_credits}</span><span className="text-sm t-soft">単位</span></div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Meter label="楽単度" value={t.status.easiness} />
        <Meter label="興味マッチ率" value={t.status.interest_match} note={t.status.interest_match === null ? "興味を選ぶと出ます" : null} />
      </div>
      <h3 className="mt-5 text-sm font-bold t-ink">卒業要件の進み具合</h3>
      <ul className="mt-2 space-y-3">
        {t.status.requirements.map((r) => {
          const remain = Math.max(0, r.required - r.earned - r.planned);
          const pct = (n) => Math.min(100, (n / r.required) * 100) + "%";
          return (
            <li key={r.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="flex items-center gap-1.5 t-ink"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[r.category] }} />{r.category}</span>
                <span className={remain ? "t-soft" : "font-medium t-done"}>{remain ? `あと${remain}単位` : "達成"}</span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-track">
                <div className={remain ? "bg-faint" : "bg-done"} style={{ width: pct(r.earned) }} />
                <div className="bg-brand" style={{ width: pct(Math.min(r.planned, Math.max(0, r.required - r.earned))) }} />
              </div>
              <p className="mt-0.5 text-xs tabular-nums t-faint">取得済み {r.earned}＋今回 {r.planned}／必要 {r.required}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CourseSheet({ course, pinned, onClose, onPin, onExclude }) {
  const [reviews, setReviews] = useState(false);
  useEffect(() => setReviews(false), [course]);
  if (!course) return null;
  const yn = (v, a, b) => (v === null ? "不明" : v ? a : b);
  const rows = [
    ["評価方法", course.grading, false],
    ["出席", yn(course.attendance_required, "必須", "必須ではない"), course.attendance_required],
    ["教科書", yn(course.textbook_required, "購入必須", "なし・任意"), course.textbook_required],
    ["試験", course.exam_materials || "不明", course.exam_materials === "持ち込み不可"],
    ["時間割コード", course.code, false],
  ];
  return (
    <Sheet open onClose={onClose} title={course.name}
      sub={<p className="mb-1 flex items-center gap-1.5 text-xs t-soft"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[course.category] }} />{course.category}・{course.credits}単位・{course.day}曜{course.period}限・{course.teacher}</p>}>
      <p className="text-sm leading-relaxed t-ink">{course.summary}</p>
      <dl className="mt-3 border-y b-rule">
        {rows.map(([k, v, w], i) => (
          <div key={k} className={`flex justify-between gap-4 py-2 text-sm ${i ? "border-t b-rule" : ""}`}>
            <dt className="shrink-0 t-soft">{k}</dt><dd className={`text-right ${w ? "font-medium t-caution" : "t-ink"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-xl bg-paper">
        <button type="button" aria-expanded={reviews} onClick={() => { if (!reviews) track("reviews_opened", { course_id: course.id }); setReviews(!reviews); }}
          className="flex h-11 w-full items-center justify-between px-3 text-sm font-medium t-ink">
          <span>口コミを見る<span className="ml-2 text-xs font-normal t-soft">{course.crobas_grade ? `クロバス ${course.crobas_grade}・${course.crobas_review_count}件` : "まだ口コミがありません"}</span></span>
          <ChevronDown size={16} style={{ transform: reviews ? "rotate(180deg)" : "none" }} />
        </button>
        {reviews && (
          <div className="px-3 pb-3">
            {course.crobas_comments.length
              ? <ul className="space-y-1.5">{course.crobas_comments.map((c) => <li key={c} className="rounded-lg border b-rule bg-surface px-3 py-2 text-sm t-ink">{c}</li>)}</ul>
              : <p className="text-sm t-soft">表示できる口コミがまだありません。この授業は授業概要の情報で判断しています。</p>}
            <p className="mt-2 text-xs t-faint">※ プロトタイプのためダミーの口コミです</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn kind={pinned ? "soft" : "outline"} onClick={() => onPin(course)}>{pinned ? <PinOff size={18} /> : <Pin size={18} />}{pinned ? "固定をやめる" : "固定する"}</Btn>
        <Btn kind="outline" onClick={() => onExclude(course)}><X size={18} />外す</Btn>
      </div>
    </Sheet>
  );
}

function Result({ state, update, go, toast }) {
  const { profile, taken, prefs, timetables } = state;
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(false);
  const cur = timetables[tab] || timetables[0];

  useEffect(() => { track("result_shown", { patterns: timetables.length, credits: cur?.total_credits }); }, []);

  const regenerate = (next, source) => {
    const tts = generateTimetables(profile, taken, next);
    track("regenerate", { source, patterns: tts.length });
    if (!tts.length) { toast("条件に合う授業がなくなった", "条件を少しゆるめてみてね。"); return false; }
    update({ prefs: next, timetables: tts });
    setTab(0);
    return true;
  };
  const pin = (c) => {
    const on = prefs.pinned_course_ids.includes(c.id);
    setOpen(null);
    if (regenerate({ ...prefs, pinned_course_ids: on ? prefs.pinned_course_ids.filter((x) => x !== c.id) : [...prefs.pinned_course_ids, c.id], excluded_course_ids: prefs.excluded_course_ids.filter((x) => x !== c.id) }, on ? "unpin" : "pin"))
      toast(on ? `「${c.name}」の固定をやめたよ` : `「${c.name}」を固定して組み直したよ`);
  };
  const exclude = (c) => {
    setOpen(null);
    if (regenerate({ ...prefs, excluded_course_ids: [...new Set([...prefs.excluded_course_ids, c.id])], pinned_course_ids: prefs.pinned_course_ids.filter((x) => x !== c.id) }, "exclude"))
      toast(`「${c.name}」を外して組み直したよ`);
  };
  const revise = async () => {
    const t = text.trim(); if (!t || !cur) return;
    setBusy(true);
    try {
      const names = Object.fromEntries(Object.entries(cur.slots).map(([k, id]) => [k, courseById(id)?.name]).filter(([, n]) => n));
      const r = await interpretRevision(t, names);
      const ids = (ns) => COURSES.filter((c) => (ns || []).includes(c.name)).map((c) => c.id);
      const slotIds = (r.exclude_slots || []).map((s) => cur.slots[s]).filter(Boolean);
      const pinIds = ids(r.pin_course_names);
      const exIds = [...slotIds, ...ids(r.exclude_course_names)];
      const changed = (r.add_days_off || []).length + (r.remove_days_off || []).length + exIds.length + pinIds.length > 0 || r.avoid_first_period != null || r.easy_priority != null;
      if (!changed) return toast("うまく読み取れなかった", "「月2を外して」「水曜を全休に」のように書いてみて。");
      const next = {
        ...prefs,
        days_off: [...new Set([...prefs.days_off.filter((d) => !(r.remove_days_off || []).includes(d)), ...(r.add_days_off || [])])],
        avoid_first_period: r.avoid_first_period ?? prefs.avoid_first_period,
        easy_priority: r.easy_priority ?? prefs.easy_priority,
        pinned_course_ids: [...new Set([...prefs.pinned_course_ids.filter((x) => !exIds.includes(x)), ...pinIds])],
        excluded_course_ids: [...new Set([...prefs.excluded_course_ids.filter((x) => !pinIds.includes(x)), ...exIds])],
      };
      if (regenerate(next, "text")) { toast(r.message || "組み直したよ"); setText(""); }
    } finally { setBusy(false); }
  };
  const rows = cur ? DAYS.flatMap((d) => PERIODS.map((p) => courseById(cur.slots[d + p]))).filter(Boolean) : [];
  const copy = async () => {
    try { await navigator.clipboard.writeText(rows.map((c) => `${c.code}\t${c.name}\t${c.day}${c.period}限`).join("\n")); toast("コピーしたよ", "UNIPAで時間割コードを順に入れてね。"); }
    catch { toast("コピーできなかった", "長押しで選んでコピーしてね。"); }
    track("unipa_list_copied", { courses: rows.length });
  };

  if (!cur) return null;
  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold leading-snug t-ink">{profile.term}の時間割ができたよ</h1><p className="mt-0.5 text-sm t-soft">商学部 {profile.department}・{profile.year}年</p></div>
        <Btn kind="ghost" className="-mr-2 shrink-0" onClick={() => go("prefs")}><SlidersHorizontal size={18} />条件</Btn>
      </div>
      {timetables.length > 1 && (
        <div className="mb-3 flex gap-1 rounded-xl bg-track p-1" role="tablist">
          {timetables.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={`h-10 flex-1 rounded-lg text-sm font-medium ${tab === i ? "bg-surface t-ink shadow-sm" : "t-soft"}`}>{t.pattern_label}</button>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div>
          <Grid slots={cur.slots} daysOff={prefs.days_off} pinned={prefs.pinned_course_ids} onOpen={(c) => { setOpen(c); track("course_detail_opened", { course_id: c.id }); }} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(CATEGORY_COLOR).map(([k, v]) => <span key={k} className="flex items-center gap-1 text-xs t-soft"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: v }} />{k}</span>)}
          </div>
          <div className="mt-5">
            <label htmlFor="revise" className="text-sm font-bold t-ink">直したいところを書いてね</label>
            <p className="text-xs t-soft">授業を押すと「固定」「外す」もできます</p>
            <div className="mt-2 flex gap-2">
              <Field id="revise" placeholder="例：月2を別の授業にして" value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && revise()} />
              <Btn className="shrink-0" onClick={revise} disabled={busy || !text.trim()}>{busy && <Loader2 size={18} className="animate-spin" />}組み直す</Btn>
            </div>
          </div>
        </div>
        <Status t={cur} />
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed t-soft"><Info size={16} className="mt-0.5 shrink-0" />最終的な卒業要件はUNIPAと公式の履修要項で確認してね。</p>
      <aside aria-label="広告" className="mt-8 rounded-xl border border-dashed b-rule bg-surface px-4 py-3">
        <p className="text-xs t-faint">PR</p>
        <p className="mt-0.5 text-sm font-medium t-ink">大学近くの定食屋さん｜学生証の提示で大盛り無料</p>
        <p className="text-xs t-soft">ダミーの広告です</p>
      </aside>
      <EventLog />
      <CourseSheet course={open} pinned={!!open && prefs.pinned_course_ids.includes(open.id)} onClose={() => setOpen(null)} onPin={pin} onExclude={exclude} />
      <Sheet open={list} onClose={() => setList(false)} title="UNIPA登録用リスト" sub={<p className="mb-1 text-xs t-soft">上から順に、時間割コードをUNIPAに入れていけばOK</p>}>
        <ol className="rounded-xl border b-rule">
          {rows.map((c, i) => (
            <li key={c.id} className={`flex items-center gap-3 px-3 py-2.5 ${i ? "border-t b-rule" : ""}`}>
              <span className="w-12 shrink-0 text-xs tabular-nums t-soft">{c.day}{c.period}限</span>
              <span className="flex-1 text-sm t-ink">{c.name}</span>
              <span className="select-all font-medium tabular-nums t-ink">{c.code}</span>
            </li>
          ))}
        </ol>
        <Btn className="mt-4 h-12 w-full text-base" onClick={copy}><Copy size={18} />まとめてコピー</Btn>
      </Sheet>
      <Footer><Btn className="h-12 w-full text-base" onClick={() => setList(true)}><ClipboardList size={18} />UNIPA登録用リスト</Btn></Footer>
    </>
  );
}

/* 検証用：この画面で起きた計測イベントを確認できる（本番では外部の分析サービスに送る） */
function EventLog() {
  const [open, setOpen] = useState(false);
  const done = eventLog.find((e) => e.event === "history_confirmed");
  return (
    <details className="mt-6 rounded-xl border b-rule bg-surface px-4 py-2 text-xs t-soft" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer py-2 text-sm font-medium t-ink">
        計測ログ（検証用）{done ? `：入力 ${done.elapsed_sec}秒${done.within_3min ? "・3分以内" : ""}` : ""}
      </summary>
      <ul className="space-y-1 pb-2 tabular-nums">
        {eventLog.map((e, i) => <li key={i}>{e.at} {e.event}{e.elapsed_sec != null ? `（${e.elapsed_sec}秒）` : ""}</li>)}
      </ul>
    </details>
  );
}

/* ---------- アプリ本体 ---------- */
export default function App() {
  const [state, setState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const stateRef = useRef(null);

  useEffect(() => { loadState().then((s) => { stateRef.current = s; setState({ ...s, resumeScreen: s.screen, screen: "home" }); }); }, []);

  const update = (patch) => {
    setState((s) => {
      const next = { ...s, ...patch };
      const { resumeScreen, ...persist } = next;
      saveState(persist);
      return next;
    });
  };
  const go = (screen) => { update({ screen }); window.scrollTo({ top: 0 }); };
  const toast = (title, desc) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, title, desc }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const reset = async () => {
    try { await window.storage.delete(STORE_KEY, false); } catch { /* なくてもよい */ }
    track("reset");
    setState({ ...EMPTY_STATE, resumeScreen: "home" });
    setConfirmReset(false);
  };

  // 入力の途中で画面を離れたら記録（スクショを撮りに行くだけの場合も含む）
  useEffect(() => {
    const onHide = () => {
      const s = stateRef.current;
      if (document.visibilityState === "hidden" && s?.progress.input_started_at && !s.progress.input_completed) track("drop_off", { screen: s.screen });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
  useEffect(() => { stateRef.current = state; }, [state]);

  if (!state) return <div className="jw grid min-h-screen place-items-center"><style>{STYLE}</style><Loader2 className="animate-spin" /></div>;

  const props = { state, update, go, toast };
  const needProfile = ["history", "prefs", "result"].includes(state.screen) && !state.profile;
  const screen = needProfile ? "setup" : state.screen === "result" && !state.timetables.length ? "prefs" : state.screen;
  const resume = state.resumeScreen && state.resumeScreen !== "home" ? state.resumeScreen : null;

  return (
    <div className="jw min-h-screen">
      <style>{STYLE}</style>
      <header className="sticky top-0 z-30 border-b b-rule bg-paper95" style={{ backdropFilter: "blur(8px)" }}>
        <div className={`mx-auto flex h-14 items-center justify-between px-4 ${screen === "result" ? "max-w-5xl" : "max-w-xl"}`}>
          <button type="button" onClick={() => go("home")} className="flex items-baseline gap-1.5"><span className="text-xl font-bold tracking-tight t-ink">時短割</span><span className="text-xs t-faint">β</span></button>
          <Btn kind="ghost" className="-mr-2 text-xs" onClick={() => setConfirmReset(true)}><RotateCcw size={16} />最初からやり直す</Btn>
        </div>
      </header>
      <main className={`mx-auto px-4 pb-40 pt-5 ${screen === "result" ? "max-w-5xl" : "max-w-xl"}`}>
        {screen === "home" && <Home hasProgress={!!resume} onStart={() => go("setup")} onResume={() => go(resume)} />}
        {screen === "setup" && <Setup {...props} />}
        {screen === "history" && <History {...props} />}
        {screen === "prefs" && <Prefs {...props} />}
        {screen === "result" && <Result {...props} />}
      </main>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="最初からやり直す？">
        <p className="mb-4 text-sm t-soft">入力した学科・履修済みの授業・条件・作った時間割がすべて消えます。</p>
        <div className="grid grid-cols-2 gap-2"><Btn kind="outline" onClick={() => setConfirmReset(false)}>やめておく</Btn><Btn onClick={reset}>消してやり直す</Btn></div>
      </Sheet>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-md flex-col gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="sheet rounded-xl bg-ink px-4 py-3 shadow-lg">
            <p className="text-sm font-medium t-paper">{t.title}</p>
            {t.desc && <p className="mt-0.5 text-xs t-paper" style={{ opacity: 0.75 }}>{t.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
