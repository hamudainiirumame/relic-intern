import { Pin } from "lucide-react";
import { CATEGORY_COLOR, courseById, shortName } from "@/lib/catalog";
import { DAYS, PERIODS, type Course, type Day, type Slots } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  slots: Slots;
  daysOff: Day[];
  pinnedIds: string[];
  onOpen: (course: Course) => void;
}

/** 大学ノートの罫線のような時間割グリッド。セルには短縮名と区分の色だけ */
export function TimetableGrid({ slots, daysOff, pinnedIds, onOpen }: Props) {
  return (
    <div className="notebook rounded-lg border border-rule bg-surface p-2 sm:p-3">
      <div className="grid grid-cols-[20px_repeat(5,minmax(0,1fr))] gap-1">
        <span />
        {DAYS.map((d) => (
          <div key={d} className={cn("pb-1 text-center text-[13px] font-medium", daysOff.includes(d) ? "text-done" : "text-ink-soft")}>
            {d}
          </div>
        ))}
        {PERIODS.map((p) => (
          <div key={p} className="contents">
            <div className="grid place-items-center text-[12px] text-ink-faint tabular-nums">{p}</div>
            {DAYS.map((d) => {
              const course = courseById(slots[`${d}${p}`]);
              if (!course) {
                return (
                  <div
                    key={d}
                    className={cn("h-[60px] rounded-[5px]", daysOff.includes(d) ? "bg-done-tint/70" : "border border-dashed border-rule/80")}
                    aria-label={`${d}曜${p}限 空き`}
                  />
                );
              }
              const pinned = pinnedIds.includes(course.id);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onOpen(course)}
                  className="relative h-[60px] overflow-hidden rounded-[5px] bg-surface pl-2 pr-1 text-left shadow-[inset_3px_0_0_var(--c),0_0_0_1px_rgb(var(--rule))] transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  style={{ "--c": CATEGORY_COLOR[course.category] ?? "#8C959F" } as React.CSSProperties}
                  aria-label={`${d}曜${p}限 ${course.name}`}
                >
                  <span className="line-clamp-3 text-[11px] font-medium leading-[1.3] text-ink sm:text-[12px]">{shortName(course.name, 12)}</span>
                  {pinned && <Pin className="absolute bottom-1 right-1 h-3 w-3 text-brand" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
        <span key={cat} className="flex items-center gap-1 text-[11px] text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          {cat}
        </span>
      ))}
    </div>
  );
}
