/**
 * AI の呼び出し窓口。VITE_AI_MODE で切り替える。
 *   mock     … AI を呼ばずにダミー結果（既定。VITE_USE_MOCK_AI=true と同じ）
 *   server   … /api/ai（Vercel Functions）を経由。APIキーはサーバー側だけに置く
 *   artifact … Claude のアーティファクト上で動かすとき。キーなしで Anthropic API を直接呼べる
 */
import type { Day } from "@/types";
import { DAYS } from "@/types";
import { compressImage } from "./image";
import { OCR_SYSTEM, REVISION_SYSTEM } from "./prompts";
import { sleep } from "./utils";

type Mode = "mock" | "server" | "artifact";
export const AI_MODE: Mode =
  (import.meta.env.VITE_AI_MODE as Mode | undefined) ??
  (String(import.meta.env.VITE_USE_MOCK_AI ?? "true") === "true" ? "mock" : "server");

export interface OcrCourse {
  name: string;
  credits: number | null;
  category_guess: string | null;
}

export interface Revision {
  add_days_off: Day[];
  remove_days_off: Day[];
  exclude_slots: string[]; // 例 "月2"
  exclude_course_names: string[];
  pin_course_names: string[];
  avoid_first_period: boolean | null;
  easy_priority: 0 | 1 | 2 | null;
  message: string; // ユーザーへの一言
}

/** アーティファクト上で Anthropic API を直接呼ぶ（APIキーは環境側で処理される） */
async function callArtifact<T>(system: string, content: unknown[]): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text) as T;
}

async function callApi<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  return (await res.json()) as T;
}

/** 時間割スクショから授業名を読み取る */
export async function readTimetableScreenshots(files: File[]): Promise<OcrCourse[]> {
  if (AI_MODE === "mock") return mockOcr();
  const images = await Promise.all(files.slice(0, 8).map((f) => compressImage(f)));
  if (AI_MODE === "artifact") {
    const content = [
      ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } })),
      { type: "text", text: "これらの時間割に写っている授業を抜き出してください。" },
    ];
    const { courses } = await callArtifact<{ courses: OcrCourse[] }>(OCR_SYSTEM, content);
    return courses;
  }
  const { courses } = await callApi<{ courses: OcrCourse[] }>({ task: "read_timetable", images });
  return courses;
}

/** 「サンプル画像で試す」用。モード設定に関係なくダミーを返す */
export async function mockOcr(): Promise<OcrCourse[]> {
  await sleep(1400);
  return MOCK_OCR;
}

/** 「月2を別の授業にして」などの修正指示を条件に変換する */
export async function interpretRevision(text: string, slotNames: Record<string, string>): Promise<Revision> {
  if (AI_MODE === "mock") {
    await sleep(600);
    return mockRevision(text, slotNames);
  }
  if (AI_MODE === "artifact") {
    const prompt = `現在の時間割（曜日時限: 授業名）: ${JSON.stringify(slotNames)}\n修正指示: ${text.slice(0, 300)}`;
    try {
      const r = await callArtifact<Partial<Revision>>(REVISION_SYSTEM, [{ type: "text", text: prompt }]);
      return { ...mockRevision("", {}), ...r, message: r.message ?? "組み直したよ。" };
    } catch {
      return mockRevision(text, slotNames); // AIが使えない環境では簡易ルールで読む
    }
  }
  return callApi<Revision>({ task: "interpret_revision", text, slots: slotNames });
}

const MOCK_OCR: OcrCourse[] = [
  { name: "商学入門", credits: 2, category_guess: "学部基礎科目" },
  { name: "会計学入門", credits: 2, category_guess: "学部基礎科目" },
  { name: "経済学の基礎", credits: 2, category_guess: "学部基礎科目" },
  { name: "英語コミュニケーションⅠ", credits: 1, category_guess: "外国語科目" },
  { name: "英語コミュニケーションⅡ", credits: 1, category_guess: "外国語科目" },
  { name: "中国語Ⅰ", credits: 1, category_guess: "外国語科目" },
  { name: "中国語Ⅱ", credits: 1, category_guess: "外国語科目" },
  { name: "統計学入門", credits: 2, category_guess: "学部基礎科目" },
  { name: "情報リテラシー", credits: 2, category_guess: "基幹教育科目" },
  { name: "哲学への招待", credits: 2, category_guess: "基幹教育科目" },
  { name: "心理学入門", credits: 2, category_guess: "基幹教育科目" },
  { name: "日本国憲法", credits: 2, category_guess: "基幹教育科目" },
  { name: "基礎ゼミナール", credits: 2, category_guess: "演習" },
  { name: "マーケティング論", credits: 2, category_guess: "専門科目" },
  { name: "経営学総論", credits: 2, category_guess: "専門科目" },
  { name: "簿記演習", credits: 2, category_guess: null },
  { name: "スポーツ実習", credits: 1, category_guess: null },
];

function mockRevision(text: string, slotNames: Record<string, string>): Revision {
  const t = text.normalize("NFKC");
  const r: Revision = {
    add_days_off: [],
    remove_days_off: [],
    exclude_slots: [],
    exclude_course_names: [],
    pin_course_names: [],
    avoid_first_period: null,
    easy_priority: null,
    message: "",
  };
  for (const m of t.matchAll(/([月火水木金])曜?日?\s*([1-5])\s*限?/g)) r.exclude_slots.push(`${m[1]}${m[2]}`);
  for (const d of DAYS) {
    if (new RegExp(`${d}曜?日?.{0,4}(全休|休み|空け)`).test(t)) r.add_days_off.push(d);
  }
  if (/1限.{0,4}(なし|避け|いや|無理|ムリ)/.test(t)) r.avoid_first_period = true;
  if (/(楽|らく)/.test(t)) r.easy_priority = 2;
  for (const name of Object.values(slotNames)) {
    if (t.includes(name) && /(外|いら|やめ|消)/.test(t)) r.exclude_course_names.push(name);
    if (t.includes(name) && /(固定|残|キープ)/.test(t)) r.pin_course_names.push(name);
  }
  const changed =
    r.add_days_off.length + r.exclude_slots.length + r.exclude_course_names.length + r.pin_course_names.length > 0 ||
    r.avoid_first_period !== null ||
    r.easy_priority !== null;
  r.message = changed ? "その条件で組み直したよ。" : "うまく読み取れなかった。「月2を外して」「水曜を全休に」のように書いてみて。";
  return r;
}
