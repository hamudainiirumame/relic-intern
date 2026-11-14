import { useState } from "react";
import { ChevronDown, Pin, PinOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_COLOR } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import type { Course } from "@/types";

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-[14px]">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className={warn ? "text-right font-medium text-caution-dark" : "text-right text-ink"}>{value}</dd>
    </div>
  );
}

const yn = (v: boolean | null, yes: string, no: string) => (v === null ? "不明" : v ? yes : no);

interface Props {
  course: Course | null;
  pinned: boolean;
  onClose: () => void;
  onTogglePin: (c: Course) => void;
  onExclude: (c: Course) => void;
}

export function CourseDialog({ course, pinned, onClose, onTogglePin, onExclude }: Props) {
  const [showReviews, setShowReviews] = useState(false);
  return (
    <Dialog
      open={!!course}
      onOpenChange={(o) => {
        if (!o) {
          setShowReviews(false);
          onClose();
        }
      }}
    >
      {course && (
        <DialogContent>
          <DialogHeader>
            <p className="flex items-center gap-1.5 text-[12px] text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[course.category] }} />
              {course.category}・{course.credits}単位
            </p>
            <DialogTitle>{course.name}</DialogTitle>
            <DialogDescription>
              {course.day}曜{course.period}限・{course.teacher}
            </DialogDescription>
          </DialogHeader>

          <p className="text-[14px] leading-relaxed text-ink">{course.summary}</p>

          <dl className="mt-3 divide-y divide-rule border-y border-rule">
            <Row label="評価方法" value={course.grading} />
            <Row label="出席" value={yn(course.attendance_required, "必須", "必須ではない")} warn={!!course.attendance_required} />
            <Row label="教科書" value={yn(course.textbook_required, "購入必須", "なし・任意")} warn={!!course.textbook_required} />
            <Row label="試験" value={course.exam_materials ?? "不明"} warn={course.exam_materials === "持ち込み不可"} />
            <Row label="時間割コード" value={course.code} />
          </dl>

          <div className="mt-3 rounded-lg bg-paper">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-lg px-3 text-[14px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-expanded={showReviews}
              onClick={() => {
                if (!showReviews) track("reviews_opened", { course_id: course.id });
                setShowReviews(!showReviews);
              }}
            >
              <span>
                口コミを見る
                <span className="ml-2 text-[12px] font-normal text-ink-soft">
                  {course.crobas_grade ? `クロバス ${course.crobas_grade}・${course.crobas_review_count}件` : "まだ口コミがありません"}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showReviews ? "rotate-180" : ""}`} />
            </button>
            {showReviews && (
              <div className="px-3 pb-3">
                {course.crobas_comments.length ? (
                  <ul className="space-y-1.5">
                    {course.crobas_comments.map((c) => (
                      <li key={c} className="rounded-md bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink ring-1 ring-rule">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-ink-soft">表示できる口コミがまだありません。この授業は授業概要の情報で判断しています。</p>
                )}
                <p className="mt-2 text-[11px] text-ink-faint">※ プロトタイプのためダミーの口コミです</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant={pinned ? "soft" : "outline"} onClick={() => onTogglePin(course)}>
              {pinned ? <PinOff /> : <Pin />}
              {pinned ? "固定をやめる" : "固定する"}
            </Button>
            <Button variant="outline" onClick={() => onExclude(course)}>
              <X />
              外す
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
