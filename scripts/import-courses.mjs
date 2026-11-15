#!/usr/bin/env node
/**
 * data/courses.csv（スプレッドシートから書き出した授業一覧）を src/data/courses.json に変換する。
 *
 *   npm run import:courses
 *
 * `npm run build` の前にも自動で実行されるので、Vercel では CSV を GitHub に置くだけで反映される。
 * - data/courses.csv が無ければ何もしない（今の courses.json をそのまま使う）
 * - 入力ミスがあれば行番号つきで全部表示して失敗する（Vercel では前の公開版がそのまま残る）
 * 列の意味と入れ方は docs/授業データの入れ方.md を参照。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "data/courses.csv");
const OUT_PATH = path.join(ROOT, "src/data/courses.json");
const REQ_PATH = path.join(ROOT, "src/data/requirements.json");
const INTEREST_PATH = path.join(ROOT, "src/data/interests.json");

const COLUMNS = {
  code: "時間割コード",
  name: "授業名",
  teacher: "教員",
  term: "学期",
  day: "曜日",
  period: "時限",
  credits: "単位数",
  category: "区分",
  target_years: "対象学年",
  attendance_required: "出席必須",
  textbook_required: "教科書購入必須",
  exam_materials: "試験の持ち込み",
  grading: "成績評価",
  summary: "概要",
  interest_tags: "興味タグ",
};
const REQUIRED = ["code", "name", "teacher", "term", "day", "period", "credits", "category"];

/** RFC 4180 の CSV を読む（ダブルクォート・改行入りのセル・BOM・CRLF に対応） */
export function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** 全角英数字・全角スペースを半角にして前後の空白を落とす */
const norm = (s) =>
  String(s ?? "")
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .trim();

const splitList = (s) =>
  norm(s)
    .split(/[、,，・/／\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function parseTerm(v) {
  const s = norm(v).replace(/学期$/, "");
  if (/^前(期)?$/.test(s)) return "前期";
  if (/^後(期)?$/.test(s)) return "後期";
  if (/^通年$/.test(s)) return "通年";
  return undefined;
}

function parseDay(v) {
  const m = norm(v).match(/^([月火水木金])(曜日?)?$/);
  return m ? m[1] : undefined;
}

function parsePeriod(v) {
  const m = norm(v).match(/^([1-5])(限|時限)?$/);
  return m ? Number(m[1]) : undefined;
}

function parseBool(v) {
  const s = norm(v);
  if (s === "") return null;
  if (/^(はい|必須|あり|有|○|〇|yes|true|1)$/i.test(s)) return true;
  if (/^(いいえ|不要|なし|無|×|no|false|0)$/i.test(s)) return false;
  return undefined;
}

function parseExam(v) {
  const s = norm(v);
  if (s === "") return null;
  if (/^(持ち込み)?不可$/.test(s)) return "持ち込み不可";
  if (/^(持ち込み)?可$/.test(s)) return "持ち込み可";
  if (/^(試験)?なし$/.test(s)) return "試験なし";
  return undefined;
}

function parseYears(v) {
  const s = norm(v);
  if (s === "") return null;
  const years = new Set();
  for (const part of s.replace(/年(生)?/g, "").split(/[、,，・/／\s]+/).filter(Boolean)) {
    const range = part.match(/^([1-4])[-~〜～]([1-4])$/);
    if (range) for (let y = Number(range[1]); y <= Number(range[2]); y++) years.add(y);
    else if (/^[1-4]$/.test(part)) years.add(Number(part));
    else return undefined;
  }
  return years.size ? [...years].sort() : undefined;
}

export function convert(csvText, { categories, interests }) {
  const errors = [];
  const warnings = [];
  const rows = parseCsv(csvText);
  if (rows.length === 0) return { courses: [], errors: ["CSV が空です"], warnings };

  const header = rows[0].map(norm);
  const index = {};
  for (const [key, label] of Object.entries(COLUMNS)) {
    const i = header.indexOf(label);
    if (i >= 0) index[key] = i;
    else if (REQUIRED.includes(key)) errors.push(`1行目：必須の列「${label}」がありません`);
  }
  if (errors.length) return { courses: [], errors, warnings };

  const courses = [];
  const seen = new Map();
  let unknownCutoff = 0;
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => norm(c) === "")) return; // 空行は飛ばす
    const get = (key) => (index[key] === undefined ? "" : cells[index[key]] ?? "");
    const err = (label, msg) => errors.push(`${line}行目「${label}」：${msg}`);

    for (const key of REQUIRED) if (norm(get(key)) === "") err(COLUMNS[key], "空欄です（必須）");

    const code = norm(get("code"));
    const name = norm(get("name"));
    const term = parseTerm(get("term"));
    if (norm(get("term")) && !term) err(COLUMNS.term, `「${get("term")}」は 前期／後期／通年 のどれかにしてください`);
    const day = parseDay(get("day"));
    if (norm(get("day")) && !day) err(COLUMNS.day, `「${get("day")}」は 月〜金 のどれかにしてください`);
    const period = parsePeriod(get("period"));
    if (norm(get("period")) && !period) err(COLUMNS.period, `「${get("period")}」は 1〜5 の数字にしてください`);
    const credits = Number(norm(get("credits")));
    if (norm(get("credits")) && !(credits > 0 && credits <= 8)) err(COLUMNS.credits, `「${get("credits")}」は 1〜8 の数字にしてください`);
    const category = norm(get("category"));
    if (category && !categories.includes(category))
      err(COLUMNS.category, `「${category}」は次のどれかにしてください：${categories.join("／")}`);

    let years = parseYears(get("target_years"));
    if (years === undefined) {
      err(COLUMNS.target_years, `「${get("target_years")}」は 2,3,4 や 2-4 のように書いてください`);
      years = [1, 2, 3, 4];
    } else if (years === null) {
      warnings.push(`${line}行目「${name}」：対象学年が空欄なので全学年として扱います`);
      years = [1, 2, 3, 4];
    }

    const attendance = parseBool(get("attendance_required"));
    if (attendance === undefined) err(COLUMNS.attendance_required, `「${get("attendance_required")}」は はい／いいえ／空欄 にしてください`);
    const textbook = parseBool(get("textbook_required"));
    if (textbook === undefined) err(COLUMNS.textbook_required, `「${get("textbook_required")}」は はい／いいえ／空欄 にしてください`);
    const exam = parseExam(get("exam_materials"));
    if (exam === undefined) err(COLUMNS.exam_materials, `「${get("exam_materials")}」は 持ち込み可／持ち込み不可／試験なし／空欄 にしてください`);
    if (attendance === null || textbook === null || exam === null) unknownCutoff++;

    const tags = splitList(get("interest_tags"));
    for (const t of tags) if (!interests.includes(t)) err(COLUMNS.interest_tags, `「${t}」は次のどれかにしてください：${interests.join("／")}`);

    if (code) {
      const n = (seen.get(code) ?? 0) + 1;
      seen.set(code, n);
      if (n > 1) warnings.push(`${line}行目：時間割コード ${code} が重複しています（別のコマとして扱います）`);
    }

    courses.push({
      id: seen.get(code) > 1 ? `${code}-${seen.get(code)}` : code,
      code,
      name,
      teacher: norm(get("teacher")),
      term,
      day,
      period,
      credits,
      category,
      target_years: years,
      attendance_required: attendance ?? null,
      textbook_required: textbook ?? null,
      exam_materials: exam ?? null,
      grading: norm(get("grading")),
      summary: norm(get("summary")),
      interest_tags: tags,
      crobas_grade: null,
      crobas_review_count: 0,
      crobas_comments: [],
    });
  });

  if (courses.length === 0 && errors.length === 0) errors.push("授業が1件もありません");
  if (unknownCutoff) warnings.push(`出席・教科書・試験のどれかが空欄の授業が ${unknownCutoff} 件あります（「不明」と表示され、足切り条件では除外されません）`);
  return { courses, errors, warnings };
}

/** Google スプレッドシートは UTF-8、Excel は Shift_JIS で書き出すことがあるので両方読む */
function readText(file) {
  const buf = fs.readFileSync(file);
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("\uFFFD")) return utf8;
  try {
    return new TextDecoder("shift_jis").decode(buf);
  } catch {
    return utf8;
  }
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.log("[import:courses] data/courses.csv が無いので、今の src/data/courses.json をそのまま使います");
    return;
  }
  const categories = [...new Set(JSON.parse(fs.readFileSync(REQ_PATH, "utf8")).map((r) => r.category))];
  const interests = JSON.parse(fs.readFileSync(INTEREST_PATH, "utf8"));
  const { courses, errors, warnings } = convert(readText(CSV_PATH), { categories, interests });

  for (const w of warnings) console.warn(`[import:courses] 注意 ${w}`);
  if (errors.length) {
    console.error(`[import:courses] data/courses.csv に ${errors.length} 件の入力ミスがあります。直してからもう一度実行してください。`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(courses, null, 2) + "\n");
  console.log(`[import:courses] ${courses.length} 件の授業を src/data/courses.json に書き出しました`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
