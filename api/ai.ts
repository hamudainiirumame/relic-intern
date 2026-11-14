/**
 * Vercel Functions：AI 呼び出しの中継。APIキーはサーバーの環境変数 ANTHROPIC_API_KEY に置く。
 * 画像は読み取りに使うだけで、どこにも保存しない。
 *   POST /api/ai { task: "read_timetable", images: [{ data, media_type }] }
 *   POST /api/ai { task: "interpret_revision", text, slots }
 */
type Req = { method?: string; body: any };
type Res = { status: (code: number) => Res; json: (body: unknown) => void };

import { OCR_SYSTEM, REVISION_SYSTEM } from "../src/lib/prompts";

const MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

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
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.map((c) => c.text ?? "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body.task === "read_timetable") {
      const images = (body.images ?? []).slice(0, 8);
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
      const text = `現在の時間割（曜日時限: 授業名）: ${JSON.stringify(body.slots)}\n修正指示: ${String(body.text).slice(0, 300)}`;
      return res.status(200).json(await callClaude(REVISION_SYSTEM, [{ type: "text", text }]));
    }
    return res.status(400).json({ error: "unknown task" });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "failed" });
  }
}
