import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarSync } from "lucide-react";
import { AppShell, Chip, Section, StepHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEPARTMENTS } from "@/lib/catalog";
import { getProfile, getProgress, saveProfile, saveProgress } from "@/lib/repository";
import { parseStudentIdPrefix } from "@/lib/studentId";
import { guessTerm } from "@/lib/term";
import { track } from "@/lib/analytics";

export default function Setup() {
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [term, setTerm] = useState<"前期" | "後期">(guessTerm());
  const [autoNote, setAutoNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const progress = await getProgress();
      if (!progress.input_started_at) {
        await saveProgress({ input_started_at: new Date().toISOString() });
        track("input_start");
      }
      await saveProgress({ last_path: "/setup" });
      const p = await getProfile();
      if (p) {
        setDepartment(p.department);
        setYear(p.year);
        setTerm(p.term);
        setPrefix(p.student_id_prefix ?? "");
      }
    })();
  }, []);

  const onPrefix = (v: string) => {
    const digits = v.normalize("NFKC").replace(/\D/g, "").slice(0, 5);
    setPrefix(digits);
    const parsed = digits.length === 5 ? parseStudentIdPrefix(digits) : null;
    if (!parsed) return setAutoNote(digits.length === 5 ? "読み取れなかったので、下から選んでね。" : null);
    if (parsed.department) setDepartment(parsed.department);
    if (parsed.year) setYear(parsed.year);
    setAutoNote(
      parsed.department && parsed.year
        ? `${parsed.department}・${parsed.year}年生として入れたよ。違ったら下で直してね。`
        : "一部だけ読み取れたよ。残りは下から選んでね。",
    );
  };

  const ready = department && year;

  const next = async () => {
    if (!department || !year) return;
    await saveProfile({
      user_id: null,
      faculty: "商学部",
      department,
      year,
      student_id_prefix: prefix.length === 5 ? prefix : null,
      term,
      created_at: new Date().toISOString(),
    });
    track("profile_done", { department, year, term, used_student_id: prefix.length === 5 });
    navigate("/history");
  };

  return (
    <AppShell
      footer={
        <Button size="lg" className="w-full" disabled={!ready} onClick={next}>
          次へ：時間割のスクショ
        </Button>
      }
    >
      <StepHeader step={1} title="学科と学年を教えてね" lead="商学部の卒業要件に合わせて時間割をつくります。" />

      <Section title="学籍番号の先頭5桁" hint="入れると学科と学年が自動で埋まります（なくてもOK）">
        <Input inputMode="numeric" autoComplete="off" placeholder="例：23210" value={prefix} onChange={(e) => onPrefix(e.target.value)} className="tabular-nums" />
        {autoNote && <p className="mt-2 text-[13px] text-brand">{autoNote}</p>}
      </Section>

      <Section title="学科">
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((d) => (
            <Chip key={d} active={department === d} onClick={() => setDepartment(d)}>
              商学部 {d}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="学年">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>
              <span className="w-full text-center">{y}年</span>
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="つくる時間割">
        <div className="flex items-center justify-between rounded-lg border border-rule bg-surface px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CalendarSync className="h-5 w-5 text-brand" />
            <span className="text-[15px] font-medium text-ink">{term}の時間割</span>
          </div>
          <Button variant="soft" size="sm" onClick={() => setTerm(term === "前期" ? "後期" : "前期")}>
            {term === "前期" ? "後期" : "前期"}にする
          </Button>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-faint">今日の日付から自動で選んでいます</p>
      </Section>
    </AppShell>
  );
}
