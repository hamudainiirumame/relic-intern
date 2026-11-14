/**
 * 時間割の生成。AI ではなくコードで行う（卒業要件の計算ミスを避けるため）。
 * 足切り条件で除外 → 取得済み・時間の重なりを除外 → 卒業要件の不足区分を優先
 * → 楽単度と興味でスコア付け → 上位から組み合わせる。重みを変えて最大3パターン出す。
 */
import type {
  Course,
  Preferences,
  Profile,
  Requirement,
  RequirementProgress,
  Slots,
  TakenCourse,
  Timetable,
  TimetableStatus,
} from "@/types";
import { normalizeName, uuid } from "./utils";

const GRADE_SCORE = { A: 100, B: 75, C: 50, D: 25, E: 0 } as const;

export function easinessOf(c: Course): number {
  let s: number = c.crobas_grade ? GRADE_SCORE[c.crobas_grade] : 55;
  if (c.attendance_required) s -= 10;
  if (c.textbook_required) s -= 10;
  if (c.exam_materials === "持ち込み不可") s -= 10;
  if (c.exam_materials === "試験なし") s += 5;
  return Math.max(0, Math.min(100, s));
}

function interestWords(p: Preferences): string[] {
  const free = p.interest_free_text
    .normalize("NFKC")
    .split(/[\s、,。・/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  return [...p.interests, ...free];
}

export function matchesInterest(c: Course, p: Preferences): boolean {
  const words = interestWords(p);
  if (words.length === 0) return false;
  const hay = [c.name, c.summary, ...c.interest_tags].join(" ");
  return words.some((w) => c.interest_tags.includes(w) || hay.includes(w));
}

export function hasInterests(p: Preferences) {
  return interestWords(p).length > 0;
}

/** 足切り条件などで外れる理由（外れないなら null） */
export function exclusionReason(c: Course, p: Preferences): string | null {
  if (p.excluded_course_ids.includes(c.id)) return "外した授業";
  if (p.days_off.includes(c.day)) return `${c.day}曜は全休`;
  if (p.avoid_first_period && c.period === 1) return "1限を避ける";
  // ゼミなどの演習は実質必修なので、足切り条件では外さない
  if (c.category === "演習") return null;
  if (p.exclude_textbook_required && c.textbook_required) return "教科書購入必須";
  if (p.exclude_attendance_required && c.attendance_required) return "出席必須";
  if (p.exclude_closed_book_exam && c.exam_materials === "持ち込み不可") return "テスト持ち込み不可";
  if (p.exclude_crobas_c_or_below && c.crobas_grade && "CDE".includes(c.crobas_grade)) return "クロバスC以下";
  return null;
}

export function earnedByCategory(taken: TakenCourse[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of taken) {
    if (t.status !== "passed" || !t.category) continue;
    out[t.category] = (out[t.category] ?? 0) + t.credits;
  }
  return out;
}

export interface GenerateInput {
  courses: Course[];
  requirements: Requirement[];
  profile: Profile;
  taken: TakenCourse[];
  prefs: Preferences;
}

export function candidatesFor({ courses, profile, taken }: GenerateInput): Course[] {
  const passedIds = new Set(taken.filter((t) => t.status === "passed" && t.course_id).map((t) => t.course_id));
  const passedNames = new Set(taken.filter((t) => t.status === "passed").map((t) => normalizeName(t.raw_name)));
  return courses.filter(
    (c) =>
      (c.term === profile.term || c.term === "通年") &&
      c.target_years.includes(profile.year) &&
      !passedIds.has(c.id) &&
      !passedNames.has(normalizeName(c.name)),
  );
}

const PATTERNS = [
  { label: "バランス", easy: 0.6, interest: 0.6 },
  { label: "楽単重視", easy: 1.2, interest: 0.2 },
  { label: "興味重視", easy: 0.2, interest: 1.2 },
];

export function generateTimetables(input: GenerateInput): Timetable[] {
  const { requirements, profile, taken, prefs } = input;
  const reqs = requirements.filter((r) => r.department === profile.department);
  const earned = earnedByCategory(taken);
  const deficit = (cat: string) => {
    const r = reqs.find((x) => x.category === cat);
    return r ? Math.max(0, r.min_credits - (earned[cat] ?? 0)) : 0;
  };
  const target = prefs.target_credits ?? 16;
  const all = candidatesFor(input);
  // 固定した授業と、ゼミなどの演習（実質必修）は先に入れる
  const pinned = all.filter(
    (c) => prefs.pinned_course_ids.includes(c.id) || (c.category === "演習" && !prefs.excluded_course_ids.includes(c.id)),
  );
  const pool = all.filter((c) => !pinned.includes(c) && exclusionReason(c, prefs) === null);
  const easyBoost = 0.6 + prefs.easy_priority * 0.3;
  const interested = hasInterests(prefs);

  const results: Timetable[] = [];
  const seen = new Set<string>();
  const usedBefore = new Set<string>();
  for (const pat of PATTERNS) {
    if (pat.label === "興味重視" && !interested) continue;
    const score = (c: Course) =>
      (deficit(c.category) > 0 ? 40 : 0) +
      (c.category === "演習" ? 30 : 0) +
      easinessOf(c) * pat.easy * easyBoost +
      (interested && matchesInterest(c, prefs) ? 100 : 0) * pat.interest -
      // 2つ目以降は、点差が小さい授業を入れ替えた「迷う組み合わせ」を出す
      (usedBefore.has(c.id) ? 12 : 0);
    const sorted = [...pool].sort((a, b) => score(b) - score(a));
    const slots: Slots = {};
    let total = 0;
    for (const c of [...pinned, ...sorted]) {
      const key = `${c.day}${c.period}` as const;
      if (slots[key]) continue;
      if (!pinned.includes(c) && total + c.credits > target) continue;
      slots[key] = c.id;
      total += c.credits;
    }
    Object.values(slots).forEach((id) => id && !pinned.some((p) => p.id === id) && usedBefore.add(id));
    const sig = Object.entries(slots).sort().join("|");
    if (seen.has(sig) || total === 0) continue;
    seen.add(sig);
    results.push({
      id: uuid(),
      pattern_label: pat.label,
      slots,
      total_credits: total,
      status: computeStatus(Object.values(slots) as string[], input),
      created_at: new Date().toISOString(),
    });
  }
  return results;
}

export function computeStatus(courseIds: string[], { courses, requirements, profile, taken, prefs }: GenerateInput): TimetableStatus {
  const chosen = courseIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean) as Course[];
  const earned = earnedByCategory(taken);
  const reqs: RequirementProgress[] = requirements
    .filter((r) => r.department === profile.department)
    .map((r) => ({
      category: r.category,
      required: r.min_credits,
      earned: earned[r.category] ?? 0,
      planned: chosen.filter((c) => c.category === r.category).reduce((s, c) => s + c.credits, 0),
    }));
  const easiness = chosen.length ? Math.round(chosen.reduce((s, c) => s + easinessOf(c), 0) / chosen.length) : 0;
  const interest_match =
    hasInterests(prefs) && chosen.length
      ? Math.round((chosen.filter((c) => matchesInterest(c, prefs)).length / chosen.length) * 100)
      : null;
  return { easiness, interest_match, requirements: reqs };
}
