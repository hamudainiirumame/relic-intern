import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Copy, Loader2, SlidersHorizontal, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdSlot } from "@/components/AdSlot";
import { CourseDialog } from "@/components/CourseDialog";
import { StatusPanel } from "@/components/StatusPanel";
import { CategoryLegend, TimetableGrid } from "@/components/TimetableGrid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { COURSES, REQUIREMENTS, courseById } from "@/lib/catalog";
import { interpretRevision } from "@/lib/ai";
import { generateTimetables } from "@/lib/scheduler";
import { getPreferences, getProfile, listTakenCourses, listTimetables, saveProgress, savePreferences, saveTimetables } from "@/lib/repository";
import { track } from "@/lib/analytics";
import { DAYS, PERIODS, type Course, type Preferences, type Profile, type TakenCourse, type Timetable } from "@/types";

export default function Result() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [taken, setTaken] = useState<TakenCourse[]>([]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [tab, setTab] = useState("0");
  const [open, setOpen] = useState<Course | null>(null);
  const [revision, setRevision] = useState("");
  const [revising, setRevising] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (!p) return navigate("/setup", { replace: true });
      const [t, pr, tts] = await Promise.all([listTakenCourses(), getPreferences(), listTimetables()]);
      setProfile(p);
      setTaken(t);
      setPrefs(pr);
      const list = tts.length ? tts : generateTimetables({ courses: COURSES, requirements: REQUIREMENTS, profile: p, taken: t, prefs: pr });
      setTimetables(list);
      if (!tts.length) saveTimetables(list);
      await saveProgress({ last_path: "/result" });
      track("result_shown", { patterns: list.length, credits: list[0]?.total_credits });
    })();
  }, [navigate]);

  const regenerate = useCallback(
    async (nextPrefs: Preferences, source: string) => {
      if (!profile) return;
      await savePreferences(nextPrefs);
      setPrefs(nextPrefs);
      const list = generateTimetables({ courses: COURSES, requirements: REQUIREMENTS, profile, taken, prefs: nextPrefs });
      track("regenerate", { source, patterns: list.length });
      if (!list.length) {
        toast("条件に合う授業がなくなった", "条件を少しゆるめてみてね。");
        return false;
      }
      setTimetables(list);
      setTab("0");
      await saveTimetables(list);
      return true;
    },
    [profile, taken],
  );

  if (!prefs || !profile) {
    return (
      <AppShell wide>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  const current = timetables[Number(tab)] ?? timetables[0];

  const togglePin = async (c: Course) => {
    const pinned = prefs.pinned_course_ids.includes(c.id);
    const next = {
      ...prefs,
      pinned_course_ids: pinned ? prefs.pinned_course_ids.filter((x) => x !== c.id) : [...prefs.pinned_course_ids, c.id],
      excluded_course_ids: prefs.excluded_course_ids.filter((x) => x !== c.id),
    };
    setOpen(null);
    if (await regenerate(next, pinned ? "unpin" : "pin")) toast(pinned ? `「${c.name}」の固定をやめたよ` : `「${c.name}」を固定して組み直したよ`);
  };

  const exclude = async (c: Course) => {
    const next = {
      ...prefs,
      excluded_course_ids: [...new Set([...prefs.excluded_course_ids, c.id])],
      pinned_course_ids: prefs.pinned_course_ids.filter((x) => x !== c.id),
    };
    setOpen(null);
    if (await regenerate(next, "exclude")) toast(`「${c.name}」を外して組み直したよ`);
  };

  const submitRevision = async () => {
    const text = revision.trim();
    if (!text || !current) return;
    setRevising(true);
    try {
      const slotNames: Record<string, string> = {};
      for (const [k, id] of Object.entries(current.slots)) {
        const c = courseById(id);
        if (c) slotNames[k] = c.name;
      }
      const r = await interpretRevision(text, slotNames);
      const idsByName = (names: string[]) => COURSES.filter((c) => names.includes(c.name)).map((c) => c.id);
      const slotIds = r.exclude_slots.map((s) => current.slots[s as keyof typeof current.slots]).filter(Boolean) as string[];
      const changed =
        r.add_days_off.length + r.remove_days_off.length + slotIds.length + r.exclude_course_names.length + r.pin_course_names.length > 0 ||
        r.avoid_first_period !== null ||
        r.easy_priority !== null;
      if (!changed) {
        toast(r.message || "うまく読み取れなかった", "「月2を外して」「水曜を全休に」のように書いてみて。");
        return;
      }
      const pinIds = idsByName(r.pin_course_names);
      const exIds = [...slotIds, ...idsByName(r.exclude_course_names)];
      const next: Preferences = {
        ...prefs,
        days_off: [...new Set([...prefs.days_off.filter((d) => !r.remove_days_off.includes(d)), ...r.add_days_off])],
        avoid_first_period: r.avoid_first_period ?? prefs.avoid_first_period,
        easy_priority: r.easy_priority ?? prefs.easy_priority,
        pinned_course_ids: [...new Set([...prefs.pinned_course_ids.filter((x) => !exIds.includes(x)), ...pinIds])],
        excluded_course_ids: [...new Set([...prefs.excluded_course_ids.filter((x) => !pinIds.includes(x)), ...exIds])],
      };
      if (await regenerate(next, "text")) {
        toast(r.message || "組み直したよ");
        setRevision("");
      }
    } catch {
      toast("組み直せなかった", "通信を確認して、もう一度送ってみてね。");
    } finally {
      setRevising(false);
    }
  };

  const unipaRows = current
    ? DAYS.flatMap((d) => PERIODS.map((p) => courseById(current.slots[`${d}${p}`]))).filter(Boolean) as Course[]
    : [];

  const copyList = async () => {
    const text = unipaRows.map((c) => `${c.code}\t${c.name}\t${c.day}${c.period}限`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("コピーしたよ", "UNIPAで時間割コードを順に入れてね。");
    } catch {
      toast("コピーできなかった", "長押しで選んでコピーしてね。");
    }
    track("unipa_list_copied", { courses: unipaRows.length });
  };

  return (
    <AppShell
      wide
      footer={
        <Button size="lg" className="w-full lg:mx-auto lg:flex lg:max-w-sm" onClick={() => setShowList(true)} disabled={!current}>
          <ClipboardList />
          UNIPA登録用リスト
        </Button>
      }
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-snug text-ink">{profile.term}の時間割ができたよ</h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            商学部 {profile.department}・{profile.year}年
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/preferences")} className="-mr-2 shrink-0">
          <SlidersHorizontal />
          条件
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {timetables.length > 1 && (
          <TabsList>
            {timetables.map((t, i) => (
              <TabsTrigger key={t.id} value={String(i)}>
                {t.pattern_label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        {timetables.map((t, i) => (
          <TabsContent key={t.id} value={String(i)}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <TimetableGrid
                  slots={t.slots}
                  daysOff={prefs.days_off}
                  pinnedIds={prefs.pinned_course_ids}
                  onOpen={(c) => {
                    setOpen(c);
                    track("course_detail_opened", { course_id: c.id });
                  }}
                />
                <CategoryLegend />

                <div className="mt-5">
                  <label htmlFor="revise" className="text-[14px] font-bold text-ink">
                    直したいところを書いてね
                  </label>
                  <p className="text-[12px] text-ink-soft">授業を押すと「固定」「外す」もできます</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="revise"
                      placeholder="例：月2を別の授業にして"
                      value={revision}
                      onChange={(e) => setRevision(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submitRevision()}
                    />
                    <Button onClick={submitRevision} disabled={revising || !revision.trim()} className="shrink-0">
                      {revising ? <Loader2 className="animate-spin" /> : null}
                      組み直す
                    </Button>
                  </div>
                </div>
              </div>
              <StatusPanel timetable={t} />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        最終的な卒業要件はUNIPAと公式の履修要項で確認してね。
      </p>

      <AdSlot />

      <CourseDialog
        course={open}
        pinned={!!open && prefs.pinned_course_ids.includes(open.id)}
        onClose={() => setOpen(null)}
        onTogglePin={togglePin}
        onExclude={exclude}
      />

      <Dialog open={showList} onOpenChange={setShowList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>UNIPA登録用リスト</DialogTitle>
            <DialogDescription>上から順に、時間割コードをUNIPAに入れていけばOK。</DialogDescription>
          </DialogHeader>
          <ol className="divide-y divide-rule rounded-lg border border-rule">
            {unipaRows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-14 shrink-0 text-[12px] text-ink-soft tabular-nums">
                  {c.day}
                  {c.period}限
                </span>
                <span className="flex-1 text-[14px] text-ink">{c.name}</span>
                <span className="select-all font-medium text-ink tabular-nums">{c.code}</span>
              </li>
            ))}
          </ol>
          <Button className="mt-4 w-full" size="lg" onClick={copyList}>
            <Copy />
            まとめてコピー
          </Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
