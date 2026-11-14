import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getProgress, saveProgress } from "@/lib/repository";

const STEPS = [
  { title: "学科と学年を選ぶ", note: "学籍番号の先頭5桁でもOK" },
  { title: "今までの時間割のスクショを送る", note: "落とした授業にチェックするだけ" },
  { title: "条件を選んで生成", note: "全休の曜日や、避けたい授業の条件" },
];

/** 大学ノートの罫線に時間割が埋まっていく見本 */
function NotebookPreview() {
  const filled: Record<string, { name: string; color: string }> = {
    "0-1": { name: "消費者行動論", color: "#2F5FD0" },
    "1-2": { name: "現代社会と法", color: "#2E9AA8" },
    "2-3": { name: "データ分析演習", color: "#2F5FD0" },
    "3-1": { name: "経営戦略論", color: "#2F5FD0" },
    "1-4": { name: "専門演習Ⅱ", color: "#7C8A2E" },
  };
  const days = ["月", "火", "水", "木", "金"];
  return (
    <div className="notebook rounded-lg border border-rule bg-surface p-3" aria-hidden>
      <div className="grid grid-cols-[18px_repeat(5,1fr)] gap-1 text-[11px]">
        <span />
        {days.map((d) => (
          <span key={d} className={`text-center font-medium ${d === "金" ? "text-done" : "text-ink-soft"}`}>
            {d}
          </span>
        ))}
        {[1, 2, 3, 4, 5].map((p) => (
          <div key={p} className="contents">
            <span className="grid place-items-center text-ink-faint tabular-nums">{p}</span>
            {days.map((_, di) => {
              const f = filled[`${di}-${p}`];
              const off = di === 4;
              return (
                <div
                  key={di}
                  className={`h-9 rounded-[4px] px-1 py-0.5 leading-tight ${
                    f ? "preview-pop bg-surface shadow-[inset_3px_0_0_var(--c),0_0_0_1px_rgb(var(--rule))]" : off ? "bg-done-tint" : "bg-transparent"
                  }`}
                  style={f ? ({ "--c": f.color, animationDelay: `${(di + p) * 90}ms` } as React.CSSProperties) : undefined}
                >
                  {f && <span className="line-clamp-2 pl-1 text-[10px] text-ink">{f.name}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-[11px] text-done">金曜は全休</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [resumePath, setResumePath] = useState<string | null>(null);

  useEffect(() => {
    getProgress().then((p) => setResumePath(p.last_path !== "/" ? p.last_path : null));
    saveProgress({ last_path: "/" }).catch(() => {});
  }, []);

  return (
    <AppShell
      footer={
        resumePath ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => navigate("/setup")}>
              はじめから
            </Button>
            <Button size="lg" onClick={() => navigate(resumePath)}>
              続きから
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => navigate("/setup")}>
            はじめる
          </Button>
        )
      }
    >
      <h1 className="text-[28px] font-bold leading-[1.35] tracking-tight text-ink">
        時間割づくり、
        <br />
        3分の入力で終わらせよう。
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        UNIPAと授業カタログとクロバスを行き来しなくていい。今までの時間割を送って条件を選べば、卒業要件を満たす時間割ができます。
      </p>

      <div className="mt-6">
        <NotebookPreview />
      </div>

      <ol className="mt-7 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-brand text-[13px] font-bold text-brand tabular-nums">
              {i + 1}
            </span>
            <div>
              <p className="text-[15px] font-medium text-ink">{s.title}</p>
              <p className="text-[13px] text-ink-soft">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-done" />
        スクショは読み取りにだけ使い、保存しません。
      </p>
    </AppShell>
  );
}
