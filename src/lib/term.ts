import { getMonth } from "date-fns";

/** 次に履修登録する学期を今日の日付から推定する（2〜7月→前期、8〜1月→後期） */
export function guessTerm(today = new Date()): "前期" | "後期" {
  const m = getMonth(today) + 1;
  return m >= 2 && m <= 7 ? "前期" : "後期";
}

/** 学年度（4月始まり） */
export function academicYear(today = new Date()): number {
  const m = getMonth(today) + 1;
  return m >= 4 ? today.getFullYear() : today.getFullYear() - 1;
}
