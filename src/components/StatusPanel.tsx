import type { Timetable } from "@/types";
import { CATEGORY_COLOR } from "@/lib/catalog";

function Meter({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-soft">{label}</span>
        <span className="text-[17px] font-bold text-ink tabular-nums">{value === null ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${value ?? 0}%` }} />
      </div>
      {note && <p className="mt-1 text-[11px] text-ink-faint">{note}</p>}
    </div>
  );
}

export function StatusPanel({ timetable }: { timetable: Timetable }) {
  const { status } = timetable;
  return (
    <div className="rounded-lg border border-rule bg-surface p-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] text-ink-soft">合計</span>
        <span className="text-[26px] font-bold leading-none text-ink tabular-nums">{timetable.total_credits}</span>
        <span className="text-[13px] text-ink-soft">単位</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Meter label="楽単度" value={status.easiness} />
        <Meter label="興味マッチ率" value={status.interest_match} note={status.interest_match === null ? "興味を選ぶと出ます" : undefined} />
      </div>

      <h3 className="mt-5 text-[14px] font-bold text-ink">卒業要件の進み具合</h3>
      <ul className="mt-2 space-y-3">
        {status.requirements.map((r) => {
          const total = r.earned + r.planned;
          const remain = Math.max(0, r.required - total);
          const pct = (n: number) => `${Math.min(100, (n / r.required) * 100)}%`;
          return (
            <li key={r.category}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[r.category] ?? "#8C959F" }} />
                  {r.category}
                </span>
                <span className={remain === 0 ? "font-medium text-done" : "text-ink-soft"}>
                  {remain === 0 ? "達成" : `あと${remain}単位`}
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-track" aria-label={`${r.category} 取得済み${r.earned}単位、今回${r.planned}単位、必要${r.required}単位`}>
                <div className={remain === 0 ? "bg-done" : "bg-ink-faint"} style={{ width: pct(r.earned) }} />
                <div className={remain === 0 ? "bg-done/60" : "bg-brand"} style={{ width: pct(Math.min(r.planned, Math.max(0, r.required - r.earned))) }} />
              </div>
              <p className="mt-0.5 text-[11px] text-ink-faint tabular-nums">
                取得済み {r.earned}＋今回 {r.planned}／必要 {r.required}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
