/**
 * Vercel Functions：AI 呼び出しの中継。APIキーはサーバーの環境変数 ANTHROPIC_API_KEY に置く。
 * 画像は読み取りに使うだけで、どこにも保存しない。
 *   POST /api/ai { task: "read_timetable", images: [{ data, media_type }] }
 *   POST /api/ai { task: "interpret_revision", text, slots }
 *
 * 誰でも呼べる URL で API キーを使うので、次の対策を入れている（料金の上限は Anthropic Console 側でも必ず設定する）
 * - 送信元チェック：このサイトの画面からの呼び出しだけ受け付ける（Origin / Referer がこのサイトか ALLOWED_ORIGINS）
 * - 回数制限：IP ごとに RATE_LIMIT 回 / 10分（既定 20）。サーバーのインスタンスごとの簡易な制限なので、完全ではない
 * - サイズ上限：画像は8枚・1枚あたり約2MBまで、JPEG/PNG/WebP/GIF のみ。修正指示は300文字まで
 */
type Req = { method?: string; body: any; headers: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => Res; json: (body: unknown) => void };

import { OCR_SYSTEM, REVISION_SYSTEM } from "../src/lib/prompts";

const MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

const MAX_IMAGES = 8;
const MAX_IMAGE_BASE64 = 2_800_000; // 約2MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 20);
const hits = new Map<string, number[]>();

const header = (req: Req, name: string) => {
  const v = req.headers?.[name];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

/** このサイトの画面からの呼び出しか（ブラウザ以外からの直接呼び出しを減らす） */
function isAllowedOrigin(req: Req) {
  const source = header(req, "origin") || header(req, "referer");
  if (!source) return false;
  let host: string;
  try {
    host = new URL(source).host;
  } catch {
    return false;
  }
  const allowed = [header(req, "x-forwarded-host") || header(req, "host"), ...(process.env.ALLOWED_ORIGINS ?? "").split(",")]
    .map((h) => h.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .filter(Boolean);
  return allowed.includes(host);
}

/** IP ごとの簡易な回数制限（超えたら true） */
function isRateLimited(req: Req) {
  const ip = header(req, "x-forwarded-for").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // メモリを使いすぎないように
  return recent.length > RATE_LIMIT;
}

async function callClaude(system: string, content: unknown[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    console.error(`Anthropic ${res.status}: ${await res.text()}`); // 詳細はサーバーのログにだけ出す
    throw new Error("AI の呼び出しに失敗しました");
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.map((c) => c.text ?? "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です" });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: "このサイトの画面から使ってください" });
  if (isRateLimited(req)) return res.status(429).json({ error: "短い時間に使いすぎです。10分ほど待ってからもう一度試してください" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body.task === "read_timetable") {
      const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
      if (images.length === 0) return res.status(400).json({ error: "画像がありません" });
      for (const img of images) {
        if (!IMAGE_TYPES.includes(img?.media_type) || typeof img?.data !== "string")
          return res.status(400).json({ error: "対応していない画像です" });
        if (img.data.length > MAX_IMAGE_BASE64) return res.status(413).json({ error: "画像が大きすぎます" });
      }
      const content = [
        ...images.map((img: { data: string; media_type: string }) => ({
          type: "image",
          source: { type: "base64", media_type: img.media_type, data: img.data },
        })),
        { type: "text", text: "これらの時間割に写っている授業を抜き出してください。" },
      ];
      return res.status(200).json(await callClaude(OCR_SYSTEM, content));
    }
    if (body.task === "interpret_revision") {
      const slots = JSON.stringify(body.slots ?? {}).slice(0, 2000);
      const text = `現在の時間割（曜日時限: 授業名）: ${slots}\n修正指示: ${String(body.text ?? "").slice(0, 300)}`;
      return res.status(200).json(await callClaude(REVISION_SYSTEM, [{ type: "text", text }]));
    }
    return res.status(400).json({ error: "unknown task" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "読み取りに失敗しました。もう一度試してください" });
  }
}
