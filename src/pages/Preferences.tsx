import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { AppShell, Chip, Section, StepHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COURSES, INTEREST_OPTIONS, REQUIREMENTS } from "@/lib/catalog";
import { candidatesFor, exclusionReason, generateTimetables } from "@/lib/scheduler";
import { getPreferences, getProfile, listTakenCourses, saveProgress, savePreferences, saveTimetables } from "@/lib/repository";
import { track } from "@/lib/analytics";
import { DAYS, DEFAULT_PREFERENCES, type Preferences as Prefs, type Profile, type TakenCourse } from "@/types";
import { toast } from "@/components/ui/toast";

const CUTOFFS: { key: keyof Prefs; label: string }[] = [
  { key: "exclude_textbook_required", label: "教科書購入必須" },
  { key: "exclude_attendance_required", label: "出席必須" },
  { key: "exclude_closed_book_exam", label: "テスト持ち込み不可" },
  { key: "exclude_crobas_c_or_below", label: "クロバスC以下" },
];
const EASY_LABELS = ["気にしない", "ふつう", "楽単重視"] as const;

export default function Preferences() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFERENCES);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [taken, setTaken] = useState<TakenCourse[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (!p) return navigate("/setup", { replace: true });
      setProfile(p);
      setTaken(await listTakenCourses());
      setPrefs(await getPreferences());
      await saveProgress({ last_path: "/preferences" });
    })();
  }, [navigate]);

  const set = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
  };

  // 条件で外れる授業の数（その場でわかるように）
  const { candidateCount, excludedCount } = useMemo(() => {
    if (!profile) return { candidateCount: 0, excludedCount: 0 };
    const cands = candidatesFor({ courses: COURSES, requirements: REQUIREMENTS, profile, taken, prefs });
    return { candidateCount: cands.length, excludedCount: cands.filter((c) => exclusionReason(c, prefs)).length };
  }, [profile, taken, prefs]);

  const generate = async () => {
    if (!profile) return;
    const tts = generateTimetables({ courses: COURSES, requirements: REQUIREMENTS, profile, taken, prefs });
    track("generate_clicked", {
      days_off: prefs.days_off.length,
      easy_priority: prefs.easy_priority,
      cutoffs: CUTOFFS.filter((c) => prefs[c.key]).map((c) => c.label),
      interests: prefs.interests.length + (prefs.interest_free_text ? 1 : 0),
      patterns: tts.length,
    });
    if (!tts.length) {
      toast("条件に合う授業がなかった", "全休の曜日や足切り条件を少しゆるめてみてね。");
      return;
    }
    await saveTimetables(tts);
    navigate("/result");
  };

  return (
    <AppShell
      footer={
        <div>
          <p className="mb-2 text-center text-[12px] text-ink-soft tabular-nums">
            候補 {candidateCount - excludedCount} 授業{excludedCount > 0 ? `（条件で ${excludedCount} 授業を外しています）` : ""}
          </p>
          <Button size="lg" className="w-full" onClick={generate}>
            <Wand2 />
            時間割をつくる
          </Button>
        </div>
      }
    >
      <StepHeader step={3} title="条件を選んでね" lead="全部選ばなくても大丈夫。あとから結果画面で直せます。" />

      <Section title="全休にしたい曜日">
        <div className="grid grid-cols-5 gap-2">
          {DAYS.map((d) => (
            <Chip
              key={d}
              active={prefs.days_off.includes(d)}
              onClick={() => set({ days_off: prefs.days_off.includes(d) ? prefs.days_off.filter((x) => x !== d) : [...prefs.days_off, d] })}
            >
              <span className="w-full text-center">{d}</span>
            </Chip>
          ))}
        </div>
        <div className="mt-2">
          <Chip active={prefs.avoid_first_period} onClick={() => set({ avoid_first_period: !prefs.avoid_first_period })}>
            1限を避ける
          </Chip>
        </div>
      </Section>

      <Section title="楽単をどれくらい優先する？">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-track p-1" role="radiogroup" aria-label="楽単の優先度">
          {EASY_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={prefs.easy_priority === i}
              onClick={() => set({ easy_priority: i as 0 | 1 | 2 })}
              className={`h-11 rounded-md text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                prefs.easy_priority === i ? "bg-surface text-ink shadow-[0_1px_2px_rgba(31,35,40,0.08)]" : "text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="これがある授業は入れない" hint="選んだ条件に当てはまる授業は、最初から候補に入れません">
        <div className="flex flex-wrap gap-2">
          {CUTOFFS.map((c) => (
            <Chip key={c.key} tone="caution" active={Boolean(prefs[c.key])} onClick={() => set({ [c.key]: !prefs[c.key] } as Partial<Prefs>)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="興味のある分野" hint="合う授業を優先して入れます">
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((t) => (
            <Chip
              key={t}
              active={prefs.interests.includes(t)}
              onClick={() => set({ interests: prefs.interests.includes(t) ? prefs.interests.filter((x) => x !== t) : [...prefs.interests, t] })}
            >
              {t}
            </Chip>
          ))}
        </div>
        <Input
          className="mt-2.5"
          placeholder="ほかに気になること（例：起業、心理学）"
          value={prefs.interest_free_text}
          onChange={(e) => set({ interest_free_text: e.target.value })}
        />
      </Section>

      <Section title="取りたい単位数" hint="空欄なら16単位を目安にします">
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            className="w-24 text-center tabular-nums"
            placeholder="16"
            value={prefs.target_credits ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value.normalize("NFKC").replace(/\D/g, ""));
              set({ target_credits: n > 0 ? Math.min(n, 30) : null });
            }}
          />
          <span className="text-[15px] text-ink-soft">単位</span>
        </div>
      </Section>
    </AppShell>
  );
}
