/** 広告枠（今はダミー）。時間割の操作の邪魔にならないよう、結果の下に控えめに置く */
export function AdSlot() {
  return (
    <aside aria-label="広告" className="mt-8 rounded-lg border border-dashed border-rule bg-surface px-4 py-3">
      <p className="text-[11px] text-ink-faint">PR</p>
      <p className="mt-0.5 text-[14px] font-medium text-ink">大学近くの定食屋さん｜学生証の提示で大盛り無料</p>
      <p className="text-[12px] text-ink-soft">ダミーの広告です</p>
    </aside>
  );
}
