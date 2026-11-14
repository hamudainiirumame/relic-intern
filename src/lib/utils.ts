import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 全角・空白・記号ゆれを吸収して授業名を比較する（NFKCでⅡ→II にそろう） */
export function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　・]/g, "")
    .toLowerCase();
}
