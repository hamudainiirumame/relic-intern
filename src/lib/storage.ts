/**
 * 端末内の保存先。repository.ts と analytics.ts からだけ使う。
 * 1. Claude のアーティファクト上では window.storage（永続ストレージAPI）
 * 2. ふつうのブラウザでは localStorage
 * 3. どちらも使えなければメモリ（リロードで消える）
 */
type ArtifactStorage = {
  get: (key: string, shared?: boolean) => Promise<{ value: string } | null>;
  set: (key: string, value: string, shared?: boolean) => Promise<unknown>;
  delete: (key: string, shared?: boolean) => Promise<unknown>;
};

const memory = new Map<string, string>();
const artifact = (globalThis as { storage?: ArtifactStorage }).storage;

function local(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    const probe = "__jitanwari_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}
const ls = artifact ? null : local();

export async function getItem(key: string): Promise<string | null> {
  if (artifact) {
    try {
      const r = await artifact.get(key, false);
      return r?.value ?? null;
    } catch {
      return null; // キーがないと例外になる
    }
  }
  if (ls) return ls.getItem(key);
  return memory.get(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (artifact) await artifact.set(key, value, false);
    else if (ls) ls.setItem(key, value);
    else memory.set(key, value);
  } catch {
    memory.set(key, value);
  }
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
  try {
    if (artifact) await artifact.delete(key, false);
    else ls?.removeItem(key);
  } catch {
    // 消せなくても画面は動かす
  }
}
