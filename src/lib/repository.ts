/**
 * 保存と読み込みの窓口。画面からはこのファイルの関数だけを使う。
 * 保存先は storage.ts（アーティファクト／localStorage／メモリを自動で切り替え）。
 * Supabase に移すときは、このファイルの中身だけを差し替える（関数名と型はそのまま）。
 */
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  type Profile,
  type Progress,
  type TakenCourse,
  type Timetable,
} from "@/types";
import { getItem, removeItem, setItem } from "./storage";

const KEY = {
  profile: "jitanwari:profile",
  taken: "jitanwari:taken",
  prefs: "jitanwari:preferences",
  timetables: "jitanwari:timetables",
  progress: "jitanwari:progress",
} as const;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

export async function getProfile(): Promise<Profile | null> {
  return await read<Profile | null>(KEY.profile, null);
}
export async function saveProfile(profile: Profile): Promise<Profile> {
  await write(KEY.profile, profile);
  return profile;
}

export async function listTakenCourses(): Promise<TakenCourse[]> {
  return await read<TakenCourse[]>(KEY.taken, []);
}
export async function saveTakenCourses(courses: TakenCourse[]): Promise<TakenCourse[]> {
  await write(KEY.taken, courses);
  return courses;
}

export async function getPreferences(): Promise<Preferences> {
  return { ...DEFAULT_PREFERENCES, ...(await read<Partial<Preferences>>(KEY.prefs, {})) };
}
export async function savePreferences(prefs: Preferences): Promise<Preferences> {
  await write(KEY.prefs, prefs);
  return prefs;
}

export async function listTimetables(): Promise<Timetable[]> {
  return await read<Timetable[]>(KEY.timetables, []);
}
export async function saveTimetables(timetables: Timetable[]): Promise<Timetable[]> {
  await write(KEY.timetables, timetables);
  return timetables;
}

/** 入力途中の再開用（プロンプトの関数一覧に追加したもの） */
export async function getProgress(): Promise<Progress> {
  return await read<Progress>(KEY.progress, { last_path: "/", input_started_at: null, input_completed: false });
}
export async function saveProgress(patch: Partial<Progress>): Promise<Progress> {
  const next = { ...(await getProgress()), ...patch };
  await write(KEY.progress, next);
  return next;
}

export async function resetAll(): Promise<void> {
  await Promise.all(Object.values(KEY).map((k) => removeItem(k)));
}
