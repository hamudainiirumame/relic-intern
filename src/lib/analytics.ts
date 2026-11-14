import { getItem, setItem } from "./storage";

/**
 * 計測。VITE_POSTHOG_KEY があれば PostHog の capture API に送り、なければ console に出す。
 * 検証の主指標：input_start に対して history_confirmed（elapsed_sec <= 180）に到達した割合。
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com").replace(/\/$/, "");
const ID_KEY = "jitanwari:distinct_id";
let cachedId: string | null = null;

export type EventName =
  | "input_start"
  | "profile_done"
  | "screenshot_uploaded"
  | "ocr_done"
  | "ocr_failed"
  | "history_confirmed"
  | "generate_clicked"
  | "result_shown"
  | "regenerate"
  | "course_detail_opened"
  | "reviews_opened"
  | "unipa_list_copied"
  | "drop_off"
  | "reset";

async function distinctId(): Promise<string> {
  if (cachedId) return cachedId;
  let id = await getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
    await setItem(ID_KEY, id);
  }
  cachedId = id;
  return id;
}

export async function track(event: EventName, props: Record<string, unknown> = {}, opts: { beacon?: boolean } = {}) {
  const properties = {
    distinct_id: await distinctId(),
    path: location.hash.replace(/^#/, "") || "/",
    viewport_w: window.innerWidth,
    ...props,
  };
  if (!KEY) {
    console.info(`[track] ${event} ${JSON.stringify(properties)}`);
    return;
  }
  const body = JSON.stringify({ api_key: KEY, event, properties, timestamp: new Date().toISOString() });
  const url = `${HOST}/capture/`;
  if (opts.beacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
