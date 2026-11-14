import { academicYear } from "./term";

/**
 * 学籍番号の先頭5桁から学科と学年を推定する。
 * ※ 仮のルール。実際の採番ルールを確認したらここだけ書き換える。
 *   先頭2桁：入学年度の下2桁 / 3〜5桁目：学科コード
 */
const DEPARTMENT_CODES: Record<string, string> = {
  "210": "商学科",
  "220": "公共経営学科",
};

export function parseStudentIdPrefix(
  prefix: string,
): { department: string | null; year: number | null } | null {
  const p = prefix.normalize("NFKC").trim();
  if (!/^\d{5}$/.test(p)) return null;
  const entry = 2000 + Number(p.slice(0, 2));
  const year = academicYear() - entry + 1;
  return {
    department: DEPARTMENT_CODES[p.slice(2, 5)] ?? null,
    year: year >= 1 && year <= 6 ? year : null,
  };
}
