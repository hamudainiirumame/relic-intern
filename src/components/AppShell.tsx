import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetAll } from "@/lib/repository";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function AppShell({ children, wide = false, footer }: { children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
        <div className={cn("mx-auto flex h-14 items-center justify-between px-4", wide ? "max-w-5xl" : "max-w-xl")}>
          <Link to="/" className="flex items-baseline gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <span className="text-[19px] font-bold tracking-tight text-ink">時短割</span>
            <span className="text-[11px] text-ink-faint">β</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="-mr-2 text-[13px]">
            <RotateCcw />
            最初からやり直す
          </Button>
        </div>
      </header>
      <main className={cn("mx-auto px-4 pb-32 pt-5", wide ? "max-w-5xl" : "max-w-xl")}>{children}</main>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur">
          <div className={cn("mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3", wide ? "max-w-5xl" : "max-w-xl")}>{footer}</div>
        </div>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>最初からやり直す？</DialogTitle>
            <DialogDescription>入力した学科・履修済みの授業・条件・作った時間割がすべて消えます。</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              やめておく
            </Button>
            <Button
              onClick={async () => {
                await resetAll();
                track("reset");
                setConfirm(false);
                navigate("/");
              }}
            >
              消してやり直す
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StepHeader({ step, title, lead }: { step: 1 | 2 | 3; title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3" aria-label={`ステップ${step}/3`}>
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-brand" : "bg-rule")} />
          ))}
        </div>
        <span className="text-xs font-medium tabular-nums text-ink-soft">ステップ {step}/3</span>
      </div>
      <h1 className="text-[22px] font-bold leading-snug text-ink">{title}</h1>
      {lead && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-ink-soft">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** 押しやすい選択チップ */
export function Chip({ active, onClick, children, tone = "brand" }: { active: boolean; onClick: () => void; children: ReactNode; tone?: "brand" | "caution" }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? tone === "caution"
            ? "border-caution bg-caution-tint text-caution-dark"
            : "border-brand bg-brand-tint text-brand"
          : "border-rule bg-surface text-ink-soft hover:border-ink-faint",
      )}
    >
      {children}
    </button>
  );
}
