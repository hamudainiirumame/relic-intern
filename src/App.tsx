import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import Home from "@/pages/Home";
import Setup from "@/pages/Setup";
import History from "@/pages/History";
import Preferences from "@/pages/Preferences";
import Result from "@/pages/Result";
import { getProgress } from "@/lib/repository";
import { track } from "@/lib/analytics";

/** 入力を始めたのに送りきる前に画面を離れたら drop_off を記録する（スクショを撮りに行くだけの離脱も含む） */
function useDropOffTracking() {
  useEffect(() => {
    const onHide = async () => {
      if (document.visibilityState !== "hidden") return;
      const p = await getProgress();
      if (p.input_started_at && !p.input_completed) {
        track("drop_off", { screen: location.hash.replace(/^#/, "") || "/" }, { beacon: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
}

export default function App() {
  useDropOffTracking();
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/history" element={<History />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
