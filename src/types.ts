export type Term = "前期" | "後期" | "通年";
export type Day = "月" | "火" | "水" | "木" | "金";
export const DAYS: Day[] = ["月", "火", "水", "木", "金"];
export const PERIODS = [1, 2, 3, 4, 5] as const;
export type Period = (typeof PERIODS)[number];

export type CrobasGrade = "A" | "B" | "C" | "D" | "E";

/** 授業（運営者が授業カタログを基に事前入力） */
export interface Course {
  id: string;
  code: string; // 時間割コード
  name: string;
  teacher: string;
  term: Term;
  day: Day;
  period: Period;
  credits: number;
  category: string; // 卒業要件上の区分
  target_years: number[];
  attendance_required: boolean | null;
  textbook_required: boolean | null;
  exam_materials: "持ち込み可" | "持ち込み不可" | "試験なし" | null;
  grading: string;
  summary: string;
  interest_tags: string[];
  crobas_grade: CrobasGrade | null;
  crobas_review_count: number;
  crobas_comments: string[];
}

/** 卒業要件 */
export interface Requirement {
  department: string;
  category: string;
  min_credits: number;
  max_credits: number | null;
  note: string;
}

export interface Profile {
  user_id: string | null;
  faculty: "商学部";
  department: string;
  year: number;
  student_id_prefix: string | null;
  term: "前期" | "後期";
  created_at: string;
}

/** 履修済み（スクショから読み取ったもの） */
export interface TakenCourse {
  id: string;
  raw_name: string;
  course_id: string | null;
  credits: number;
  category: string;
  status: "passed" | "failed";
}

export interface Preferences {
  days_off: Day[];
  avoid_first_period: boolean;
  easy_priority: 0 | 1 | 2;
  exclude_textbook_required: boolean;
  exclude_attendance_required: boolean;
  exclude_closed_book_exam: boolean;
  exclude_crobas_c_or_below: boolean;
  interests: string[];
  interest_free_text: string;
  target_credits: number | null;
  /** 結果画面で「固定」「外す」した授業（プロンプト外の追加項目） */
  pinned_course_ids: string[];
  excluded_course_ids: string[];
}

export interface RequirementProgress {
  category: string;
  required: number;
  earned: number; // 取得済み
  planned: number; // 今回の時間割
}

export interface TimetableStatus {
  easiness: number; // 0-100
  interest_match: number | null; // 0-100。興味を選んでいなければ null
  requirements: RequirementProgress[];
}

export type Slots = Partial<Record<`${Day}${Period}`, string>>;

export interface Timetable {
  id: string;
  pattern_label: string;
  slots: Slots;
  total_credits: number;
  status: TimetableStatus;
  created_at: string;
}

/** 入力途中の再開用（プロンプト外の追加項目） */
export interface Progress {
  last_path: string;
  input_started_at: string | null;
  input_completed: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  days_off: [],
  avoid_first_period: false,
  easy_priority: 1,
  exclude_textbook_required: false,
  exclude_attendance_required: false,
  exclude_closed_book_exam: false,
  exclude_crobas_c_or_below: false,
  interests: [],
  interest_free_text: "",
  target_credits: null,
  pinned_course_ids: [],
  excluded_course_ids: [],
};
