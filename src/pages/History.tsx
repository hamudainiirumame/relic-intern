import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { AppShell, StepHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { CATEGORIES, findCourseByName, toTakenCourses } from "@/lib/catalog";
import { AI_MODE, mockOcr, readTimetableScreenshots } from "@/lib/ai";
import { getProfile, getProgress, listTakenCourses, saveProgress, saveTakenCourses } from "@/lib/repository";
import { track } from "@/lib/analytics";
import { cn, uuid } from "@/lib/utils";
import type { TakenCourse } from "@/types";
import howtoImg from "@/assets/howto.svg";

const LOADING_STEPS = ["スクショを読み込み中…", "授業名を読み取り中…", "授業データと照らし合わせ中…"];

export default function History() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<TakenCourse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!(await getProfile())) return navigate("/setup", { replace: true });
      await saveProgress({ last_path: "/history" });
      const saved = await listTakenCourses();
      setList(saved.length ? saved : null);
    })();
  }, [navigate]);

  // 一覧を変えるたびに保存（リロードしても続きから）
  const update = (next: TakenCourse[]) => {
    setList(next);
    saveTakenCourses(next);
  };

  const runOcr = async (source: "upload" | "sample", files: File[] = []) => {
    setLoading(true);
    setLoadingStep(0);
    const timer = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 700);
    const started = performance.now();
    try {
      track("screenshot_uploaded", { count: files.length, source });
      const ocr = source === "sample" ? await mockOcr() : await readTimetableScreenshots(files);
      const taken = toTakenCourses(ocr);
      track("ocr_done", {
        source,
        courses: taken.length,
        unmatched: taken.filter((t) => !t.course_id).length,
        seconds: Math.round((performance.now() - started) / 1000),
      });
      if (!taken.length) {
        toast("授業が見つからなかった", "時間割の画面全体が写るように撮り直してみてね。");
        return;
      }
      update(taken);
    } catch (e) {
      track("ocr_failed", { source, message: e instanceof Error ? e.message : String(e) });
      toast("読み取れなかった", "通信を確認して、もう一度送ってみてね。");
    } finally {
      clearInterval(timer);
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFiles = (fl: FileList | null) => {
    const files = Array.from(fl ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) runOcr("upload", files);
  };

  const failedCount = list?.filter((t) => t.status === "failed").length ?? 0;
  const needsCategory = list?.filter((t) => !t.category).length ?? 0;

  const confirm = async () => {
    if (!list) return;
    const progress = await getProgress();
    const elapsed = progress.input_started_at ? Math.round((Date.now() - new Date(progress.input_started_at).getTime()) / 1000) : null;
    await saveTakenCourses(list);
    if (!progress.input_completed) {
      track("history_confirmed", {
        failed: failedCount,
        courses: list.length,
        elapsed_sec: elapsed,
        within_3min: elapsed !== null && elapsed <= 180,
      });
      await saveProgress({ input_completed: true });
    }
    navigate("/preferences");
  };

  return (
    <AppShell
      footer={
        list && !loading ? (
          <Button size="lg" className="w-full" onClick={confirm}>
            これでOK{failedCount > 0 ? `（落とした授業 ${failedCount}件）` : ""}
          </Button>
        ) : undefined
      }
    >
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />

      {loading ? (
        <>
          <StepHeader step={2} title="読み取っています" />
          <div className="flex flex-col items-center rounded-lg border border-rule bg-surface px-6 py-12 text-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="mt-4 text-[15px] font-medium text-ink">{LOADING_STEPS[loadingStep]}</p>
            <p className="mt-1 text-[13px] text-ink-soft">数秒で終わります</p>
          </div>
        </>
      ) : !list ? (
        <>
          <StepHeader step={2} title="今までの時間割のスクショを送ってね" lead="1学期ぶんにつき1枚。UNIPAの時間割画面をそのまま撮ればOKです。" />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-brand/40 bg-surface px-6 py-9 text-center transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ImagePlus className="h-8 w-8 text-brand" />
            <span className="text-[16px] font-bold text-brand">スクショを選ぶ</span>
            <span className="text-[13px] text-ink-soft">まとめて何枚でも選べます</span>
          </button>

          <div className="mt-5 flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-rule">
            <img src={howtoImg} alt="撮り方の見本：時間割画面の曜日と時限が全部写っている状態" className="h-28 w-20 shrink-0 rounded-[4px] ring-1 ring-rule" />
            <div className="text-[13px] leading-relaxed text-ink-soft">
              <p className="font-medium text-ink">撮り方の見本</p>
              <p className="mt-1">月〜金と1〜5限が全部入るように撮ってね。1年前期・1年後期・2年前期…と学期ごとに1枚ずつ。</p>
            </div>
          </div>

          {AI_MODE !== "mock" && (
            <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
              スクショは時間割の読み取りにだけ使い、保存しません（読み取りには Anthropic 社の AI を使います）。
            </p>
          )}

          <Button variant="ghost" className="mt-4 w-full" onClick={() => runOcr("sample")}>
            <Sparkles />
            サンプル画像で試す
          </Button>
        </>
      ) : (
        <>
          <StepHeader step={2} title="落とした授業にだけチェックしてね" lead="何もチェックしなければ、全部取れた扱いになります。" />

          <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
            {list.map((t) => {
              const failed = t.status === "failed";
              return (
                <li key={t.id} className={cn("px-3 py-2", failed && "bg-caution-tint/60")}>
                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id={`f-${t.id}`}
                      checked={failed}
                      onCheckedChange={(v) => update(list.map((x) => (x.id === t.id ? { ...x, status: v ? "failed" : "passed" } : x)))}
                      aria-label={`${t.raw_name}を落とした`}
                    />
                    {editingId === t.id ? (
                      <Input
                        autoFocus
                        defaultValue={t.raw_name}
                        className="h-10"
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          setEditingId(null);
                          if (!name) return;
                          const c = findCourseByName(name);
                          update(list.map((x) => (x.id === t.id ? { ...x, raw_name: name, course_id: c?.id ?? null, credits: c?.credits ?? x.credits, category: c?.category ?? x.category } : x)));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      />
                    ) : (
                      <label htmlFor={`f-${t.id}`} className="flex min-w-0 flex-1 cursor-pointer flex-col py-1">
                        <span className={cn("text-[15px] text-ink", failed && "text-caution-dark")}>{t.raw_name}</span>
                        <span className="text-[12px] text-ink-faint tabular-nums">
                          {t.credits}単位{t.category ? `・${t.category}` : ""}
                        </span>
                      </label>
                    )}
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" aria-label={`${t.raw_name}の名前を直す`} onClick={() => setEditingId(t.id)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`${t.raw_name}を消す`} onClick={() => update(list.filter((x) => x.id !== t.id))}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {!t.category && (
                    <div className="mb-1 ml-9">
                      <p className="text-[12px] text-brand">区分を選んでね</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => update(list.map((x) => (x.id === t.id ? { ...x, category: c } : x)))}
                            className="h-9 rounded-full border border-rule px-3 text-[12px] text-ink-soft hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {needsCategory > 0 && <p className="mt-2 text-[12px] text-ink-faint">区分がわからなければ、そのままでも進めます（卒業要件の計算から外れます）。</p>}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const id = uuid();
                update([...list, { id, raw_name: "新しい授業", course_id: null, credits: 2, category: "", status: "passed" }]);
                setEditingId(id);
              }}
            >
              <Plus />
              授業を追加
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <RefreshCw />
              スクショを送り直す
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
