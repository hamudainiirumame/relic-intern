import coursesJson from "@/data/courses.json";
import requirementsJson from "@/data/requirements.json";
import interestsJson from "@/data/interests.json";
import type { Course, Requirement, TakenCourse } from "@/types";
import type { OcrCourse } from "./ai";
import { normalizeName, uuid } from "./utils";

export const COURSES = coursesJson as Course[];
export const REQUIREMENTS = requirementsJson as Requirement[];
export const DEPARTMENTS = [...new Set(REQUIREMENTS.map((r) => r.department))];
export const CATEGORIES = [...new Set(REQUIREMENTS.map((r) => r.category))];
export const INTEREST_OPTIONS = interestsJson as string[];

export const courseById = (id: string | null | undefined) => COURSES.find((c) => c.id === id);

/** 区分ごとの色（時間割セルの左の帯） */
export const CATEGORY_COLOR: Record<string, string> = {
  専門科目: "#2F5FD0",
  学部基礎科目: "#7A5AC8",
  基幹教育科目: "#2E9AA8",
  外国語科目: "#C2477A",
  演習: "#7C8A2E",
};

export function findCourseByName(name: string) {
  const n = normalizeName(name);
  return COURSES.find((c) => normalizeName(c.name) === n) ?? COURSES.find((c) => n.length >= 4 && normalizeName(c.name).includes(n));
}

/** AI の読み取り結果を、授業データと照合して履修済みリストにする */
export function toTakenCourses(ocr: OcrCourse[]): TakenCourse[] {
  return ocr.map((o) => {
    const c = findCourseByName(o.name);
    return {
      id: uuid(),
      raw_name: o.name,
      course_id: c?.id ?? null,
      credits: c?.credits ?? o.credits ?? 2,
      category: c?.category ?? o.category_guess ?? "",
      status: "passed",
    };
  });
}

export function shortName(name: string, max = 7) {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}
